import type { CleanTargetMeta } from '../../../shared/types';

export interface TargetScan {
  bytes: number;
  files: number;
  present: boolean;
  note?: string;
}

export interface TargetClean {
  bytes: number;
  files: number;
  error?: string;
}

export interface CleanTarget extends CleanTargetMeta {
  resolveDirs?: () => string[] | Promise<string[]>;
  fileMatch?: (name: string) => boolean;
  resolveFiles?: () => string[] | Promise<string[]>;
  customScan?: () => Promise<TargetScan>;
  customClean?: () => Promise<TargetClean>;
}

export function meta(m: CleanTargetMeta): CleanTargetMeta {
  return m;
}
