export type CleanRisk = 'safe' | 'caution' | 'risky';

export type CleanGroup = 'system' | 'browsers' | 'apps' | 'privacy';

export interface CleanTargetMeta {
  id: string;
  name: string;
  description: string;
  group: CleanGroup;
  risk: CleanRisk;
  requiresAdmin: boolean;
  defaultSelected: boolean;
  appLabel?: string;
  icon?: string;
  process?: string;
}

export interface ScanResult {
  id: string;
  bytes: number;
  files: number;
  present: boolean;
  note?: string;
}

export interface CleanResult {
  id: string;
  bytesFreed: number;
  filesRemoved: number;
  error?: string;
}

export interface SystemInfo {
  hostname: string;
  username: string;
  isAdmin: boolean;
  os: {
    platform: string;
    distro: string;
    release: string;
    build: string;
    arch: string;
    version: 10 | 11 | 0;
  };
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
    physicalCores: number;
    speed: number;
  };
  memory: {
    total: number;
    available: number;
    used: number;
  };
  disks: Array<{
    device: string;
    type: string;
    size: number;
    used: number;
    mount: string;
  }>;
}

export interface LiveMetrics {
  cpu: number;
  memory: number;
  uptime: number;
}

export type MediaType = 'SSD' | 'HDD' | 'Unknown';

export interface DriveInfo {
  letter: string;
  label: string;
  fileSystem: string;
  sizeBytes: number;
  freeBytes: number;
  mediaType: MediaType;
  busType: string;
  health: string;
}

export type OptimizeAction = 'analyze' | 'retrim' | 'defrag';

export interface OptimizeResult {
  letter: string;
  action: OptimizeAction;
  ok: boolean;
  message: string;
  fragmentationPct?: number | null;
  durationMs: number;
}

export interface ComponentStoreReport {
  reclaimableBytes: number | null;
  recommended: boolean;
  raw: string;
}

export interface TreeNode {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  children?: TreeNode[];
  hiddenChildren?: number;
}

export interface LargeFile {
  path: string;
  name: string;
  size: number;
  mtime: number;
}

export interface AnalyzeProgress {
  phase: 'walking' | 'done';
  scannedDirs: number;
  scannedFiles: number;
  bytes: number;
  current: string;
}

export interface AnalyzeResult {
  root: TreeNode;
  largest: LargeFile[];
  totalBytes: number;
  totalFiles: number;
  durationMs: number;
  truncated: boolean;
}

export interface DuplicateFileRef {
  path: string;
  name: string;
  mtime: number;
}

export interface DuplicateGroup {
  hash: string;
  size: number;
  files: DuplicateFileRef[];
  wastedBytes: number;
}

export interface DuplicateProgress {
  phase: 'sizing' | 'hashing' | 'done';
  scanned: number;
  candidates: number;
  groups: number;
}

export interface DuplicateResult {
  groups: DuplicateGroup[];
  totalGroups: number;
  wastedBytes: number;
  durationMs: number;
  truncated: boolean;
}

export interface OldFileRef {
  path: string;
  name: string;
  size: number;
  mtime: number;
}

export interface OldFilesProgress {
  phase: 'walking' | 'done';
  scanned: number;
  matched: number;
  bytes: number;
  current: string;
}

export interface OldFilesResult {
  files: OldFileRef[];
  totalMatched: number;
  totalBytes: number;
  scannedFiles: number;
  durationMs: number;
  truncated: boolean;
}

export interface TrashResult {
  trashed: number;
  bytes: number;
  failed: number;
}

export interface DriveReliability {
  friendlyName: string;
  mediaType: MediaType;
  busType: string;
  sizeBytes: number;
  health: string;
  wearPct: number | null;
  temperatureC: number | null;
  powerOnHours: number | null;
  readErrorsTotal: number | null;
  writeErrorsTotal: number | null;
  serial?: string;
}

export interface BackupMeta {
  id: string;
  name: string;
  createdAt: number;
  path: string;
  entryCount: number;
  sizeBytes: number;
}

export interface RestoreBackupResult {
  ok: boolean;
  restored: number;
  deleted: number;
  failed: number;
  failures: Array<{ key: string; message: string }>;
}

export interface LogEntry {
  id: string;
  ts: number;
  level: 'info' | 'success' | 'warn' | 'error';
  source: string;
  message: string;
}

export interface CleanHistoryEntry {
  ts: number;
  bytesFreed: number;
  filesRemoved: number;
  targets: number;
}

export interface AppSettings {
  onboardingComplete: boolean;
  lifetimeBytesFreed: number;
  cleanHistory: CleanHistoryEntry[];
  lastSelection: string[];
  kryptUsername: string;
}
