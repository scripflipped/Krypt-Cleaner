import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import type { BackupMeta, RestoreBackupResult } from '../../shared/types';
import { PRIVACY_REG_KEYS } from './clean-targets';
import { reg } from './shell';

function backupsDir(): string {
  return path.join(app.getPath('userData'), 'backups');
}

async function ensureDir(): Promise<string> {
  const dir = backupsDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function safeName(key: string): string {
  return key.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
}

export async function createPrivacyBackup(name?: string): Promise<BackupMeta> {
  const root = await ensureDir();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const dir = path.join(root, id);
  await fs.mkdir(dir, { recursive: true });

  const label = (name ?? `Privacy snapshot`).slice(0, 80);
  let entryCount = 0;
  let sizeBytes = 0;
  const exported: string[] = [];

  for (const key of PRIVACY_REG_KEYS) {
    const file = path.join(dir, `${safeName(key)}.reg`);
    const res = await reg(['export', key, file, '/y'], 15000);
    if (res.ok) {
      try {
        const st = await fs.stat(file);
        sizeBytes += st.size;
        entryCount += 1;
        exported.push(path.basename(file));
      } catch {
      }
    }
  }

  const meta = {
    id,
    name: label,
    createdAt: Date.now(),
    keys: PRIVACY_REG_KEYS,
    files: exported,
  };
  await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');

  return {
    id,
    name: label,
    createdAt: meta.createdAt,
    path: dir,
    entryCount,
    sizeBytes,
  };
}

export async function listBackups(): Promise<BackupMeta[]> {
  const root = await ensureDir();
  let dirs: import('node:fs').Dirent[] = [];
  try {
    dirs = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: BackupMeta[] = [];
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const dir = path.join(root, d.name);
    try {
      const meta = JSON.parse(await fs.readFile(path.join(dir, 'meta.json'), 'utf8'));
      let sizeBytes = 0;
      let entryCount = 0;
      for (const f of meta.files ?? []) {
        try {
          const st = await fs.stat(path.join(dir, f));
          sizeBytes += st.size;
          entryCount += 1;
        } catch {
        }
      }
      out.push({
        id: meta.id,
        name: meta.name,
        createdAt: meta.createdAt,
        path: dir,
        entryCount,
        sizeBytes,
      });
    } catch {
    }
  }
  out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}

export async function deleteBackup(id: string): Promise<boolean> {
  const dir = path.join(backupsDir(), id);
  try {
    await fs.rm(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export async function restoreBackup(id: string): Promise<RestoreBackupResult> {
  const dir = path.join(backupsDir(), id);
  let meta: { files?: string[] };
  try {
    meta = JSON.parse(await fs.readFile(path.join(dir, 'meta.json'), 'utf8'));
  } catch {
    return { ok: false, restored: 0, deleted: 0, failed: 1, failures: [{ key: id, message: 'Backup not found.' }] };
  }

  const failures: Array<{ key: string; message: string }> = [];
  let restored = 0;
  for (const f of meta.files ?? []) {
    const file = path.join(dir, f);
    const res = await reg(['import', file], 15000);
    if (res.ok) restored += 1;
    else failures.push({ key: f, message: (res.stderr || res.stdout || 'import failed').slice(0, 160) });
  }

  return {
    ok: failures.length === 0,
    restored,
    deleted: 0,
    failed: failures.length,
    failures,
  };
}
