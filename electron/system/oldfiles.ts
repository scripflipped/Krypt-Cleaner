import fs from 'node:fs/promises';
import path from 'node:path';
import type { OldFileRef, OldFilesProgress, OldFilesResult } from '../../shared/types';

const TIME_BUDGET_MS = 120_000;
const MAX_FILES = 1_000_000;
const MAX_RESULTS = 2_000;

export interface OldFilesQuery {
  olderThan: number;
  minSizeBytes: number;
}

export async function findOldFiles(
  root: string,
  query: OldFilesQuery,
  onProgress: (p: OldFilesProgress) => void
): Promise<OldFilesResult> {
  const start = Date.now();
  const minSize = Math.max(1, query.minSizeBytes);
  const cutoff = query.olderThan;

  const matches: OldFileRef[] = [];
  let scanned = 0;
  let totalMatched = 0;
  let totalBytes = 0;
  let truncated = false;
  let lastEmit = 0;

  const stack = [root];
  while (stack.length) {
    if (Date.now() - start > TIME_BUDGET_MS || scanned > MAX_FILES) {
      truncated = true;
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
        scanned += 1;
        try {
          const st = await fs.stat(full);
          if (st.size >= minSize && st.mtimeMs <= cutoff) {
            totalMatched += 1;
            totalBytes += st.size;
            matches.push({ path: full, name: entry.name, size: st.size, mtime: st.mtimeMs });
            if (matches.length > MAX_RESULTS * 2) {
              matches.sort((a, b) => b.size - a.size);
              matches.length = MAX_RESULTS;
            }
          }
        } catch {
        }
        const now = Date.now();
        if (now - lastEmit > 200) {
          lastEmit = now;
          onProgress({ phase: 'walking', scanned, matched: totalMatched, bytes: totalBytes, current: dir });
        }
      }
    }
  }

  matches.sort((a, b) => b.size - a.size);

  onProgress({ phase: 'done', scanned, matched: totalMatched, bytes: totalBytes, current: '' });

  return {
    files: matches.slice(0, MAX_RESULTS),
    totalMatched,
    totalBytes,
    scannedFiles: scanned,
    durationMs: Date.now() - start,
    truncated,
  };
}
