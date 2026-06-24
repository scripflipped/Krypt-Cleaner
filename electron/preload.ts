import { contextBridge, ipcRenderer } from 'electron';
import type {
  AnalyzeProgress,
  AnalyzeResult,
  AppSettings,
  BackupMeta,
  CleanResult,
  CleanTargetMeta,
  ComponentStoreReport,
  DriveInfo,
  DriveReliability,
  DuplicateProgress,
  DuplicateResult,
  LiveMetrics,
  LogEntry,
  MediaType,
  OldFilesProgress,
  OldFilesResult,
  OptimizeAction,
  OptimizeResult,
  RestoreBackupResult,
  ScanResult,
  SystemInfo,
  TrashResult,
} from '../shared/types';

const invoke = ipcRenderer.invoke.bind(ipcRenderer);

const api = {
  system: {
    info: (): Promise<SystemInfo> => invoke('system:info'),
    metrics: (): Promise<LiveMetrics> => invoke('system:metrics'),
    isAdmin: (): Promise<boolean> => invoke('system:isAdmin'),
    relaunchAsAdmin: (): Promise<{ ok: boolean; message?: string }> =>
      invoke('system:relaunchAsAdmin'),
  },
  clean: {
    targets: (): Promise<CleanTargetMeta[]> => invoke('clean:targets'),
    scan: (ids?: string[]): Promise<ScanResult[]> => invoke('clean:scan', ids),
    run: (ids: string[]): Promise<CleanResult[]> => invoke('clean:run', ids),
    deleteFiles: (paths: string[]): Promise<{ removed: number; bytes: number }> =>
      invoke('clean:deleteFiles', paths),
    onScanResult: (cb: (r: ScanResult) => void) => {
      const listener = (_e: unknown, r: ScanResult) => cb(r);
      ipcRenderer.on('clean:scan:result', listener);
      return () => {
        ipcRenderer.off('clean:scan:result', listener);
      };
    },
  },
  disk: {
    drives: (): Promise<DriveInfo[]> => invoke('disk:drives'),
    optimize: (
      letter: string,
      action: OptimizeAction,
      mediaType: MediaType
    ): Promise<OptimizeResult> => invoke('disk:optimize', letter, action, mediaType),
    analyzeStore: (): Promise<ComponentStoreReport> => invoke('disk:analyzeStore'),
    cleanStore: (resetBase: boolean): Promise<{ ok: boolean; message: string }> =>
      invoke('disk:cleanStore', resetBase),
  },
  analyzer: {
    run: (root: string): Promise<AnalyzeResult> => invoke('analyzer:run', root),
    onProgress: (cb: (p: AnalyzeProgress) => void) => {
      const listener = (_e: unknown, p: AnalyzeProgress) => cb(p);
      ipcRenderer.on('analyzer:progress', listener);
      return () => {
        ipcRenderer.off('analyzer:progress', listener);
      };
    },
  },
  duplicates: {
    run: (root: string, minSizeBytes: number): Promise<DuplicateResult> =>
      invoke('duplicates:run', root, minSizeBytes),
    onProgress: (cb: (p: DuplicateProgress) => void) => {
      const listener = (_e: unknown, p: DuplicateProgress) => cb(p);
      ipcRenderer.on('duplicates:progress', listener);
      return () => {
        ipcRenderer.off('duplicates:progress', listener);
      };
    },
  },
  oldfiles: {
    run: (
      root: string,
      olderThan: number,
      minSizeBytes: number
    ): Promise<OldFilesResult> => invoke('oldfiles:run', root, olderThan, minSizeBytes),
    onProgress: (cb: (p: OldFilesProgress) => void) => {
      const listener = (_e: unknown, p: OldFilesProgress) => cb(p);
      ipcRenderer.on('oldfiles:progress', listener);
      return () => {
        ipcRenderer.off('oldfiles:progress', listener);
      };
    },
  },
  files: {
    trash: (paths: string[]): Promise<TrashResult> => invoke('files:trash', paths),
  },
  health: {
    drives: (): Promise<DriveReliability[]> => invoke('health:drives'),
  },
  backups: {
    create: (name?: string): Promise<BackupMeta> => invoke('backups:create', name),
    list: (): Promise<BackupMeta[]> => invoke('backups:list'),
    delete: (id: string): Promise<boolean> => invoke('backups:delete', id),
    restore: (id: string): Promise<RestoreBackupResult> => invoke('backups:restore', id),
  },
  settings: {
    get: (): Promise<AppSettings> => invoke('settings:get'),
    completeOnboarding: (): Promise<AppSettings> => invoke('settings:completeOnboarding'),
    setStartup: (opts: {
      launchOnStartup?: boolean;
      startMinimized?: boolean;
    }): Promise<AppSettings> => invoke('settings:setStartup', opts),
    setKryptUsername: (username: string): Promise<AppSettings> =>
      invoke('settings:setKryptUsername', username),
  },
  logs: {
    get: (): Promise<LogEntry[]> => invoke('logs:get'),
    clear: (): Promise<boolean> => invoke('logs:clear'),
    onNew: (cb: (entry: LogEntry) => void) => {
      const listener = (_e: unknown, entry: LogEntry) => cb(entry);
      ipcRenderer.on('log:new', listener);
      return () => {
        ipcRenderer.off('log:new', listener);
      };
    },
  },
  dialog: {
    confirm: (opts: {
      title: string;
      message: string;
      detail?: string;
      destructive?: boolean;
    }): Promise<boolean> => invoke('dialog:confirm', opts),
    pickFolder: (): Promise<string | null> => invoke('dialog:pickFolder'),
  },
  shell: {
    openExternal: (url: string) => invoke('shell:openExternal', url),
    reveal: (path: string) => invoke('shell:reveal', path),
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggleMaximize'),
    close: () => ipcRenderer.send('window:close'),
  },
  discord: {
    setActivity: (patch: { details?: string; state?: string }) =>
      invoke('discord:setActivity', patch),
  },
};

contextBridge.exposeInMainWorld('krypt', api);

export type KryptApi = typeof api;
