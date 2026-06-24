import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export interface SizeTally {
  bytes: number;
  files: number;
}

export function expandEnv(p: string): string {
  return p.replace(/%([^%]+)%/g, (_, name) => process.env[name] ?? `%${name}%`);
}

export function localAppData(): string {
  return process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local');
}

export function roamingAppData(): string {
  return process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
}

export function localLow(): string {
  return path.join(os.homedir(), 'AppData', 'LocalLow');
}

export function programData(): string {
  return process.env.ProgramData ?? 'C:\\ProgramData';
}

export function systemRoot(): string {
  return process.env.SystemRoot ?? process.env.windir ?? 'C:\\Windows';
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function dirSize(dir: string): Promise<SizeTally> {
  let bytes = 0;
  let files = 0;
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return { bytes: 0, files: 0 };
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        const nested = await dirSize(full);
        bytes += nested.bytes;
        files += nested.files;
      } else if (entry.isFile()) {
        const st = await fs.stat(full);
        bytes += st.size;
        files += 1;
      }
    } catch {
    }
  }
  return { bytes, files };
}

export async function rmDirContents(dir: string): Promise<SizeTally> {
  let bytes = 0;
  let files = 0;
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return { bytes: 0, files: 0 };
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      try {
        await fs.unlink(full);
      } catch {
      }
      continue;
    }
    try {
      if (entry.isDirectory()) {
        const nested = await rmDirContents(full);
        bytes += nested.bytes;
        files += nested.files;
        try {
          await fs.rmdir(full);
        } catch {
        }
      } else if (entry.isFile()) {
        const st = await fs.stat(full);
        try {
          await fs.unlink(full);
          bytes += st.size;
          files += 1;
        } catch {
        }
      }
    } catch {
    }
  }
  return { bytes, files };
}

export async function removeMatchingFiles(
  dir: string,
  test: (name: string) => boolean
): Promise<SizeTally> {
  let bytes = 0;
  let files = 0;
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return { bytes: 0, files: 0 };
  }
  for (const entry of entries) {
    if (!entry.isFile() || !test(entry.name)) continue;
    const full = path.join(dir, entry.name);
    try {
      const st = await fs.stat(full);
      await fs.unlink(full);
      bytes += st.size;
      files += 1;
    } catch {
    }
  }
  return { bytes, files };
}

export async function sizeMatchingFiles(
  dir: string,
  test: (name: string) => boolean
): Promise<SizeTally> {
  let bytes = 0;
  let files = 0;
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return { bytes: 0, files: 0 };
  }
  for (const entry of entries) {
    if (!entry.isFile() || !test(entry.name)) continue;
    try {
      const st = await fs.stat(path.join(dir, entry.name));
      bytes += st.size;
      files += 1;
    } catch {
    }
  }
  return { bytes, files };
}

export async function sizeFiles(paths: string[]): Promise<SizeTally> {
  let bytes = 0;
  let files = 0;
  for (const p of paths) {
    try {
      const st = await fs.stat(p);
      if (st.isFile()) {
        bytes += st.size;
        files += 1;
      }
    } catch {
    }
  }
  return { bytes, files };
}

export async function removeFiles(paths: string[]): Promise<SizeTally> {
  let bytes = 0;
  let files = 0;
  for (const p of paths) {
    try {
      const st = await fs.stat(p);
      if (!st.isFile()) continue;
      await fs.unlink(p);
      bytes += st.size;
      files += 1;
    } catch {
    }
  }
  return { bytes, files };
}

export async function sumSizes(dirs: string[]): Promise<SizeTally> {
  let bytes = 0;
  let files = 0;
  for (const d of dirs) {
    const r = await dirSize(d);
    bytes += r.bytes;
    files += r.files;
  }
  return { bytes, files };
}

export async function cleanDirs(dirs: string[]): Promise<SizeTally> {
  let bytes = 0;
  let files = 0;
  for (const d of dirs) {
    const r = await rmDirContents(d);
    bytes += r.bytes;
    files += r.files;
  }
  return { bytes, files };
}
