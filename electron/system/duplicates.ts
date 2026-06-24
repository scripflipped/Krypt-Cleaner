import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import type {
  DuplicateGroup,
  DuplicateProgress,
  DuplicateResult,
} from '../../shared/types';

const TIME_BUDGET_MS = 90_000;
const MAX_FILES = 300_000;
const SIG_CHUNK = 16 * 1024;

interface FileRec {
  path: string;
  name: string;
  size: number;
  mtime: number;
}

async function collect(
  root: string,
  minSize: number,
  ctx: { count: number; start: number; truncated: boolean; onProgress: (n: number) => void }
): Promise<FileRec[]> {
  const out: FileRec[] = [];
  const stack = [root];
  let lastEmit = 0;
  while (stack.length) {
    if (Date.now() - ctx.start > TIME_BUDGET_MS || ctx.count > MAX_FILES) {
      ctx.truncated = true;
      break;
    }
    const dir = stack.pop()!;
    let entries: import('node:fs').Dirent[] = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        ctx.count += 1;
        try {
          const st = await fs.stat(full);
          if (st.size >= minSize) {
            out.push({ path: full, name: entry.name, size: st.size, mtime: st.mtimeMs });
          }
        } catch {
        }
        const now = Date.now();
        if (now - lastEmit > 250) {
          lastEmit = now;
          ctx.onProgress(ctx.count);
        }
      }
    }
  }
  return out;
}

async function quickSig(rec: FileRec): Promise<string> {
  const hash = crypto.createHash('sha1');
  hash.update(String(rec.size));
  let fh: fs.FileHandle | null = null;
  try {
    fh = await fs.open(rec.path, 'r');
    const head = Buffer.alloc(Math.min(SIG_CHUNK, rec.size));
    await fh.read(head, 0, head.length, 0);
    hash.update(head);
    if (rec.size > SIG_CHUNK) {
      const tail = Buffer.alloc(Math.min(SIG_CHUNK, rec.size));
      await fh.read(tail, 0, tail.length, Math.max(0, rec.size - tail.length));
      hash.update(tail);
    }
  } catch {
    return `err:${rec.path}`;
  } finally {
    await fh?.close();
  }
  return hash.digest('hex');
}

async function fullHash(p: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  let fh: fs.FileHandle | null = null;
  try {
    fh = await fs.open(p, 'r');
    const buf = Buffer.alloc(1024 * 1024);
    let pos = 0;
    while (true) {
      const { bytesRead } = await fh.read(buf, 0, buf.length, pos);
      if (bytesRead <= 0) break;
      hash.update(buf.subarray(0, bytesRead));
      pos += bytesRead;
    }
  } catch {
    return `err:${p}`;
  } finally {
    await fh?.close();
  }
  return hash.digest('hex');
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}

export async function findDuplicates(
  root: string,
  minSizeBytes: number,
  onProgress: (p: DuplicateProgress) => void
): Promise<DuplicateResult> {
  const start = Date.now();
  const ctx = {
    count: 0,
    start,
    truncated: false,
    onProgress: (n: number) =>
      onProgress({ phase: 'sizing', scanned: n, candidates: 0, groups: 0 }),
  };

  const files = await collect(root, Math.max(1, minSizeBytes), ctx);

  const bySize = groupBy(files, (f) => String(f.size));
  const sizeCandidates = [...bySize.values()].filter((g) => g.length > 1).flat();

  onProgress({ phase: 'hashing', scanned: files.length, candidates: sizeCandidates.length, groups: 0 });

  const sigOf = new Map<string, string>();
  let done = 0;
  for (const rec of sizeCandidates) {
    if (Date.now() - start > TIME_BUDGET_MS) {
      ctx.truncated = true;
      break;
    }
    sigOf.set(rec.path, await quickSig(rec));
    done += 1;
    if (done % 64 === 0) {
      onProgress({ phase: 'hashing', scanned: files.length, candidates: sizeCandidates.length, groups: done });
    }
  }
  const bySig = groupBy(
    sizeCandidates.filter((r) => sigOf.has(r.path)),
    (r) => sigOf.get(r.path)!
  );
  const sigCandidates = [...bySig.values()].filter((g) => g.length > 1);

  const groups: DuplicateGroup[] = [];
  for (const cand of sigCandidates) {
    if (Date.now() - start > TIME_BUDGET_MS) {
      ctx.truncated = true;
      break;
    }
    const byFull = new Map<string, FileRec[]>();
    for (const rec of cand) {
      const h = await fullHash(rec.path);
      const arr = byFull.get(h);
      if (arr) arr.push(rec);
      else byFull.set(h, [rec]);
    }
    for (const [h, recs] of byFull) {
      if (recs.length < 2 || h.startsWith('err:')) continue;
      const size = recs[0].size;
      groups.push({
        hash: h.slice(0, 16),
        size,
        files: recs
          .sort((a, b) => a.mtime - b.mtime)
          .map((r) => ({ path: r.path, name: r.name, mtime: r.mtime })),
        wastedBytes: size * (recs.length - 1),
      });
    }
  }

  groups.sort((a, b) => b.wastedBytes - a.wastedBytes);
  const wastedBytes = groups.reduce((s, g) => s + g.wastedBytes, 0);

  onProgress({ phase: 'done', scanned: files.length, candidates: sizeCandidates.length, groups: groups.length });

  return {
    groups: groups.slice(0, 500),
    totalGroups: groups.length,
    wastedBytes,
    durationMs: Date.now() - start,
    truncated: ctx.truncated,
  };
}
