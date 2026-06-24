import type { CleanResult, CleanTargetMeta, ScanResult } from '../../shared/types';
import { ALL_TARGETS, getTarget, type CleanTarget } from './clean-targets';
import {
  cleanDirs,
  dirSize,
  pathExists,
  removeFiles,
  removeMatchingFiles,
  rmDirContents,
  sizeFiles,
  sizeMatchingFiles,
} from './fsx';
import { isProcessRunning } from './shell';

export function listTargetMeta(): CleanTargetMeta[] {
  return ALL_TARGETS.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    group: t.group,
    risk: t.risk,
    requiresAdmin: t.requiresAdmin,
    defaultSelected: t.defaultSelected,
    appLabel: t.appLabel,
    icon: t.icon,
    process: t.process,
  }));
}

async function runningNote(t: CleanTarget): Promise<string | undefined> {
  if (!t.process) return undefined;
  if (await isProcessRunning(t.process)) {
    return `${t.appLabel ?? t.name} is running — close it for a complete clean.`;
  }
  return undefined;
}

async function scanOne(t: CleanTarget): Promise<ScanResult> {
  try {
    if (t.customScan) {
      const r = await t.customScan();
      const note = r.note ?? (await runningNote(t));
      return { id: t.id, bytes: r.bytes, files: r.files, present: r.present, note };
    }

    let bytes = 0;
    let files = 0;
    let present = false;

    if (t.resolveDirs) {
      const dirs = await t.resolveDirs();
      for (const d of dirs) {
        if (await pathExists(d)) present = true;
        const r = t.fileMatch
          ? await sizeMatchingFiles(d, t.fileMatch)
          : await dirSize(d);
        bytes += r.bytes;
        files += r.files;
      }
    }

    if (t.resolveFiles) {
      const list = await t.resolveFiles();
      for (const f of list) {
        if (await pathExists(f)) present = true;
      }
      const r = await sizeFiles(list);
      bytes += r.bytes;
      files += r.files;
    }

    const note = await runningNote(t);
    return { id: t.id, bytes, files, present, note };
  } catch (err) {
    return { id: t.id, bytes: 0, files: 0, present: false, note: (err as Error).message };
  }
}

async function cleanOne(t: CleanTarget): Promise<CleanResult> {
  try {
    if (t.customClean) {
      const r = await t.customClean();
      return { id: t.id, bytesFreed: r.bytes, filesRemoved: r.files, error: r.error };
    }

    let bytes = 0;
    let files = 0;

    if (t.resolveDirs) {
      const dirs = await t.resolveDirs();
      if (t.fileMatch) {
        for (const d of dirs) {
          const r = await removeMatchingFiles(d, t.fileMatch);
          bytes += r.bytes;
          files += r.files;
        }
      } else {
        const r = await cleanDirs(dirs);
        bytes += r.bytes;
        files += r.files;
      }
    }

    if (t.resolveFiles) {
      const list = await t.resolveFiles();
      const r = await removeFiles(list);
      bytes += r.bytes;
      files += r.files;
    }

    return { id: t.id, bytesFreed: bytes, filesRemoved: files };
  } catch (err) {
    return { id: t.id, bytesFreed: 0, filesRemoved: 0, error: (err as Error).message };
  }
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function scanTargets(
  ids?: string[],
  onResult?: (r: ScanResult) => void
): Promise<ScanResult[]> {
  const targets = (ids ?? ALL_TARGETS.map((t) => t.id))
    .map(getTarget)
    .filter((t): t is CleanTarget => Boolean(t));
  return mapPool(targets, 6, async (t) => {
    const r = await scanOne(t);
    onResult?.(r);
    return r;
  });
}

export async function cleanTargets(ids: string[]): Promise<CleanResult[]> {
  const out: CleanResult[] = [];
  for (const id of ids) {
    const t = getTarget(id);
    if (!t) {
      out.push({ id, bytesFreed: 0, filesRemoved: 0, error: 'Unknown target.' });
      continue;
    }
    out.push(await cleanOne(t));
  }
  return out;
}
