import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { AppSettings, CleanHistoryEntry } from '../../shared/types';

const FILE = 'app-settings.json';
const MAX_HISTORY = 30;

const DEFAULTS: AppSettings = {
  onboardingComplete: false,
  lifetimeBytesFreed: 0,
  cleanHistory: [],
  lastSelection: [],
  launchOnStartup: true,
  startMinimized: true,
  kryptUsername: '',
};

let cache: AppSettings | null = null;

function storePath(): string {
  return path.join(app.getPath('userData'), FILE);
}

export function load(): AppSettings {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(storePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    cache = {
      ...DEFAULTS,
      ...parsed,
      cleanHistory: Array.isArray(parsed.cleanHistory) ? parsed.cleanHistory : [],
      lastSelection: Array.isArray(parsed.lastSelection) ? parsed.lastSelection : [],
    };
  } catch {
    cache = structuredClone(DEFAULTS);
  }
  return cache;
}

export function save(next: AppSettings): AppSettings {
  cache = next;
  try {
    const dir = path.dirname(storePath());
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${storePath()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
    fs.renameSync(tmp, storePath());
  } catch (err) {
    console.error('[settings-store] failed to persist settings', err);
  }
  return cache;
}

export function patch(p: Partial<AppSettings>): AppSettings {
  return save({ ...load(), ...p });
}

export function recordClean(entry: CleanHistoryEntry): AppSettings {
  const cur = load();
  const cleanHistory = [entry, ...cur.cleanHistory].slice(0, MAX_HISTORY);
  return save({
    ...cur,
    cleanHistory,
    lifetimeBytesFreed: cur.lifetimeBytesFreed + entry.bytesFreed,
  });
}
