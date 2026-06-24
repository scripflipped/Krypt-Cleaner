import fs from 'node:fs/promises';
import path from 'node:path';
import type { AnalyzeProgress, AnalyzeResult, LargeFile, TreeNode } from '../../shared/types';

const MAX_DEPTH = 4;
const TOP_CHILDREN = 14;
const LARGE_FILE_MIN = 50 * 1024 * 1024;
const STAT_CHUNK = 128;
const TIME_BUDGET_MS = 300_000;

interface Ctx {
  start: number;
  scannedDirs: number;
  scannedFiles: number;
  bytes: number;
  largest: LargeFile[];
  truncated: boolean;
  onProgress: (p: AnalyzeProgress) => void;
  lastEmit: number;
}

function pushLarge(ctx: Ctx, file: LargeFile) {
  if (file.size < LARGE_FILE_MIN) return;
  ctx.largest.push(file);
  if (ctx.largest.length > 400) {
    ctx.largest.sort((a, b) => b.size - a.size);
    ctx.largest.length = 200;
  }
}

function emit(ctx: Ctx, current: string, force = false) {
  const now = Date.now();
  if (!force && now - ctx.lastEmit < 200) return;
  ctx.lastEmit = now;
  ctx.onProgress({
    phase: 'walking',
    scannedDirs: ctx.scannedDirs,
    scannedFiles: ctx.scannedFiles,
    bytes: ctx.bytes,
    current,
  });
}

const overBudget = (ctx: Ctx) => Date.now() - ctx.start > TIME_BUDGET_MS;

async function walk(dir: string, depth: number, ctx: Ctx): Promise<TreeNode> {
  ctx.scannedDirs += 1;
  emit(ctx, dir);

  let entries: import('node:fs').Dirent[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return { name: path.basename(dir) || dir, path: dir, size: 0, isDir: true };
  }

  const fileEntries: import('node:fs').Dirent[] = [];
  const dirEntries: import('node:fs').Dirent[] = [];
  for (const e of entries) {
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) dirEntries.push(e);
    else if (e.isFile()) fileEntries.push(e);
  }

  let total = 0;
  const childNodes: TreeNode[] = [];

  for (let i = 0; i < fileEntries.length; i += STAT_CHUNK) {
    if (overBudget(ctx)) {
      ctx.truncated = true;
      break;
    }
    const slice = fileEntries.slice(i, i + STAT_CHUNK);
    const stats = await Promise.all(
      slice.map(async (e) => {
        const full = path.join(dir, e.name);
        try {
          const st = await fs.stat(full);
          return { name: e.name, path: full, size: st.size, mtime: st.mtimeMs };
        } catch {
          return null;
        }
      })
    );
    for (const s of stats) {
      if (!s) continue;
      total += s.size;
      ctx.bytes += s.size;
      ctx.scannedFiles += 1;
      pushLarge(ctx, { path: s.path, name: s.name, size: s.size, mtime: s.mtime });
      childNodes.push({ name: s.name, path: s.path, size: s.size, isDir: false });
    }
    emit(ctx, dir);
  }

  for (const e of dirEntries) {
    if (overBudget(ctx)) {
      ctx.truncated = true;
      break;
    }
    const full = path.join(dir, e.name);
    const node = await walk(full, depth + 1, ctx);
    total += node.size;
    childNodes.push(
      depth + 1 < MAX_DEPTH ? node : { name: e.name, path: full, size: node.size, isDir: true }
    );
  }

  childNodes.sort((a, b) => b.size - a.size);
  const kept = childNodes.slice(0, TOP_CHILDREN);
  const hidden = childNodes.length - kept.length;

  return {
    name: path.basename(dir) || dir,
    path: dir,
    size: total,
    isDir: true,
    children: kept.length ? kept : undefined,
    hiddenChildren: hidden > 0 ? hidden : undefined,
  };
}

export async function analyzeDirectory(
  root: string,
  onProgress: (p: AnalyzeProgress) => void
): Promise<AnalyzeResult> {
  const ctx: Ctx = {
    start: Date.now(),
    scannedDirs: 0,
    scannedFiles: 0,
    bytes: 0,
    largest: [],
    truncated: false,
    onProgress,
    lastEmit: 0,
  };

  const tree = await walk(root, 0, ctx);
  ctx.largest.sort((a, b) => b.size - a.size);

  onProgress({
    phase: 'done',
    scannedDirs: ctx.scannedDirs,
    scannedFiles: ctx.scannedFiles,
    bytes: ctx.bytes,
    current: '',
  });

  return {
    root: tree,
    largest: ctx.largest.slice(0, 60),
    totalBytes: ctx.bytes,
    totalFiles: ctx.scannedFiles,
    durationMs: Date.now() - ctx.start,
    truncated: ctx.truncated,
  };
}
