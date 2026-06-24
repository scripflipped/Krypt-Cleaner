import fsp from 'node:fs/promises';
import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import type {
  AnalyzeResult,
  AppSettings,
  BackupMeta,
  CleanResult,
  ComponentStoreReport,
  DriveInfo,
  DriveReliability,
  DuplicateResult,
  LiveMetrics,
  LogEntry,
  MediaType,
  OldFilesResult,
  OptimizeAction,
  OptimizeResult,
  RestoreBackupResult,
  ScanResult,
  SystemInfo,
  TrashResult,
} from '../shared/types';
import { isAdmin, relaunchAsAdmin } from './system/admin';
import { setKryptUsername, updateDiscordActivity } from './system/discord';
import { getLiveMetrics, getSystemInfo } from './system/sysinfo';
import { cleanTargets, listTargetMeta, scanTargets } from './system/cleaner';
import {
  analyzeComponentStore,
  cleanComponentStore,
  listDrives,
  optimizeVolume,
} from './system/disk';
import { analyzeDirectory } from './system/analyzer';
import { findDuplicates } from './system/duplicates';
import { findOldFiles } from './system/oldfiles';
import { listDriveHealth } from './system/health';
import {
  createPrivacyBackup,
  deleteBackup,
  listBackups,
  restoreBackup,
} from './system/restore';
import { removeFiles } from './system/fsx';
import { applyStartup } from './system/startup';
import * as settingsStore from './system/settings-store';

const logs: LogEntry[] = [];

function log(level: LogEntry['level'], source: string, message: string) {
  const entry: LogEntry = {
    id: Math.random().toString(36).slice(2),
    ts: Date.now(),
    level,
    source,
    message,
  };
  logs.unshift(entry);
  if (logs.length > 500) logs.length = 500;
  const win = BrowserWindow.getAllWindows()[0];
  win?.webContents.send('log:new', entry);
}

function handle<T extends (...args: any[]) => Promise<unknown> | unknown>(
  channel: string,
  fn: T
) {
  ipcMain.handle(channel, async (_evt, ...args: unknown[]) => fn(...(args as any)));
}

export function registerIpc(): void {
  handle('system:info', async (): Promise<SystemInfo> => getSystemInfo());
  handle('system:metrics', async (): Promise<LiveMetrics> => getLiveMetrics());
  handle('system:isAdmin', async () => isAdmin());
  handle('system:relaunchAsAdmin', async () => relaunchAsAdmin());

  handle('clean:targets', async () => listTargetMeta());
  ipcMain.handle('clean:scan', async (evt, ids?: string[]): Promise<ScanResult[]> => {
    const sender = evt.sender;
    return scanTargets(ids, (r) => {
      if (!sender.isDestroyed()) sender.send('clean:scan:result', r);
    });
  });
  handle('clean:run', async (ids: string[]): Promise<CleanResult[]> => {
    const metas = listTargetMeta();
    const hasPrivacy = ids.some(
      (id) => metas.find((m) => m.id === id)?.group === 'privacy'
    );
    if (hasPrivacy) {
      try {
        const b = await createPrivacyBackup('Auto — before privacy clean');
        log('info', 'backup', `Snapshot saved before privacy clean (${b.entryCount} keys).`);
      } catch {
        log('warn', 'backup', 'Could not snapshot privacy keys before cleaning.');
      }
    }
    const results = await cleanTargets(ids);
    const bytes = results.reduce((s, r) => s + r.bytesFreed, 0);
    const files = results.reduce((s, r) => s + r.filesRemoved, 0);
    const errors = results.filter((r) => r.error);
    settingsStore.recordClean({
      ts: Date.now(),
      bytesFreed: bytes,
      filesRemoved: files,
      targets: ids.length,
    });
    settingsStore.patch({ lastSelection: ids });
    log(
      errors.length ? 'warn' : 'success',
      'clean',
      `Freed ${(bytes / 1048576).toFixed(1)} MB · ${files} files across ${ids.length} targets` +
        (errors.length ? ` (${errors.length} with issues)` : '') + '.'
    );
    return results;
  });
  handle('clean:deleteFiles', async (paths: string[]) => {
    const r = await removeFiles(paths);
    log('success', 'clean', `Deleted ${r.files} files (${(r.bytes / 1048576).toFixed(1)} MB).`);
    return { removed: r.files, bytes: r.bytes };
  });

  handle('disk:drives', async (): Promise<DriveInfo[]> => listDrives());
  handle(
    'disk:optimize',
    async (letter: string, action: OptimizeAction, mediaType: MediaType): Promise<OptimizeResult> => {
      const res = await optimizeVolume(letter, action, mediaType);
      log(res.ok ? 'success' : 'error', 'disk', res.message);
      return res;
    }
  );
  handle('disk:analyzeStore', async (): Promise<ComponentStoreReport> => analyzeComponentStore());
  handle('disk:cleanStore', async (resetBase: boolean) => {
    const res = await cleanComponentStore(resetBase);
    log(res.ok ? 'success' : 'error', 'disk', res.message);
    return res;
  });

  ipcMain.handle('analyzer:run', async (evt, root: string): Promise<AnalyzeResult> => {
    const sender = evt.sender;
    log('info', 'analyzer', `Analyzing ${root}…`);
    const res = await analyzeDirectory(root, (p) => {
      if (!sender.isDestroyed()) sender.send('analyzer:progress', p);
    });
    log(
      'success',
      'analyzer',
      `Analyzed ${root}: ${res.totalFiles} files, ${(res.totalBytes / 1073741824).toFixed(1)} GB` +
        (res.truncated ? ' (stopped at time budget).' : '.')
    );
    return res;
  });

  ipcMain.handle(
    'duplicates:run',
    async (evt, root: string, minSizeBytes: number): Promise<DuplicateResult> => {
      const sender = evt.sender;
      log('info', 'duplicates', `Scanning ${root} for duplicates…`);
      const res = await findDuplicates(root, minSizeBytes, (p) => {
        if (!sender.isDestroyed()) sender.send('duplicates:progress', p);
      });
      log(
        'success',
        'duplicates',
        `Found ${res.totalGroups} duplicate groups · ${(res.wastedBytes / 1048576).toFixed(1)} MB reclaimable.`
      );
      return res;
    }
  );

  ipcMain.handle(
    'oldfiles:run',
    async (evt, root: string, olderThan: number, minSizeBytes: number): Promise<OldFilesResult> => {
      const sender = evt.sender;
      log('info', 'old-files', `Scanning ${root} for old files…`);
      const res = await findOldFiles(root, { olderThan, minSizeBytes }, (p) => {
        if (!sender.isDestroyed()) sender.send('oldfiles:progress', p);
      });
      log(
        'success',
        'old-files',
        `Found ${res.totalMatched} old files · ${(res.totalBytes / 1073741824).toFixed(1)} GB reclaimable` +
          (res.truncated ? ' (stopped at budget).' : '.')
      );
      return res;
    }
  );

  handle('files:trash', async (paths: string[]): Promise<TrashResult> => {
    let trashed = 0;
    let bytes = 0;
    let failed = 0;
    for (const p of paths) {
      let size = 0;
      try {
        size = (await fsp.stat(p)).size;
      } catch {
      }
      try {
        await shell.trashItem(p);
        trashed += 1;
        bytes += size;
      } catch {
        failed += 1;
      }
    }
    log(
      failed ? 'warn' : 'success',
      'old-files',
      `Moved ${trashed} files to the Recycle Bin (${(bytes / 1048576).toFixed(1)} MB)` +
        (failed ? ` · ${failed} could not be moved.` : '.')
    );
    return { trashed, bytes, failed };
  });

  handle('health:drives', async (): Promise<DriveReliability[]> => listDriveHealth());

  handle('backups:create', async (name?: string): Promise<BackupMeta> => {
    const b = await createPrivacyBackup(name);
    log('success', 'backup', `Backup saved: ${b.name} (${b.entryCount} keys).`);
    return b;
  });
  handle('backups:list', async (): Promise<BackupMeta[]> => listBackups());
  handle('backups:delete', async (id: string): Promise<boolean> => deleteBackup(id));
  handle('backups:restore', async (id: string): Promise<RestoreBackupResult> => {
    const res = await restoreBackup(id);
    log(
      res.ok ? 'success' : 'warn',
      'backup',
      res.ok
        ? `Backup restored (${res.restored} keys).`
        : `Backup restored with ${res.failed} failure(s).`
    );
    return res;
  });

  handle('settings:get', async (): Promise<AppSettings> => settingsStore.load());
  handle('settings:completeOnboarding', async (): Promise<AppSettings> =>
    settingsStore.patch({ onboardingComplete: true })
  );
  handle(
    'settings:setStartup',
    async (opts: {
      launchOnStartup?: boolean;
      startMinimized?: boolean;
    }): Promise<AppSettings> => {
      const next = settingsStore.patch(opts);
      applyStartup(next.launchOnStartup);
      log(
        'info',
        'startup',
        next.launchOnStartup
          ? `Launch on Windows startup enabled${next.startMinimized ? ' (minimized)' : ''}.`
          : 'Launch on Windows startup disabled.'
      );
      return next;
    }
  );
  handle('settings:setKryptUsername', async (username: string): Promise<AppSettings> => {
    const clean = (username || '')
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^krypt\.cc\//i, '')
      .replace(/^@+/, '')
      .replace(/\s+/g, '')
      .slice(0, 40);
    const next = settingsStore.patch({ kryptUsername: clean });
    setKryptUsername(clean);
    log(
      'info',
      'discord',
      clean ? `Krypt profile linked on Rich Presence: ${clean}` : 'Krypt profile link cleared.'
    );
    return next;
  });

  handle('logs:get', async () => logs);
  handle('logs:clear', async () => {
    logs.length = 0;
    return true;
  });

  handle('shell:reveal', async (p: string) => {
    shell.showItemInFolder(p);
  });
  ipcMain.handle('shell:openExternal', async (_e, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.on('window:minimize', (e) =>
    BrowserWindow.fromWebContents(e.sender)?.minimize()
  );
  ipcMain.on('window:toggleMaximize', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return;
    w.isMaximized() ? w.unmaximize() : w.maximize();
  });
  ipcMain.on('window:close', (e) =>
    BrowserWindow.fromWebContents(e.sender)?.close()
  );

  ipcMain.handle(
    'dialog:confirm',
    async (
      e,
      opts: { title: string; message: string; detail?: string; destructive?: boolean }
    ) => {
      const win = BrowserWindow.fromWebContents(e.sender);
      if (!win) return false;
      const result = await dialog.showMessageBox(win, {
        type: opts.destructive ? 'warning' : 'question',
        title: opts.title,
        message: opts.message,
        detail: opts.detail,
        buttons: ['Cancel', opts.destructive ? 'Proceed' : 'Confirm'],
        defaultId: opts.destructive ? 0 : 1,
        cancelId: 0,
      });
      return result.response === 1;
    }
  );

  ipcMain.handle('dialog:pickFolder', async (e): Promise<string | null> => {
    const win = BrowserWindow.fromWebContents(e.sender) ?? undefined;
    const result = await dialog.showOpenDialog(win!, {
      title: 'Choose a folder to scan',
      properties: ['openDirectory'],
    });
    return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
  });

  ipcMain.handle(
    'discord:setActivity',
    async (_e, patch: { details?: string; state?: string }) => {
      updateDiscordActivity(patch);
    }
  );
}

export { log };
