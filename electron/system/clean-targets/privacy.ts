import path from 'node:path';
import type { CleanTarget, TargetClean, TargetScan } from './types';
import { dirSize, roamingAppData } from '../fsx';
import { reg } from '../shell';

const ROAMING = roamingAppData();

export const PRIVACY_REG_KEYS: string[] = [
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RecentDocs',
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RunMRU',
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\WordWheelQuery',
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\TypedPaths',
  'HKCU\\Software\\Microsoft\\Internet Explorer\\TypedURLs',
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\ComDlg32\\LastVisitedPidlMRU',
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\ComDlg32\\OpenSavePidlMRU',
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist',
];

async function keyHasContent(key: string): Promise<boolean> {
  const res = await reg(['query', key], 8000);
  if (!res.ok) return false;
  const lines = res.stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.length > 1;
}

function regTarget(opts: {
  id: string;
  name: string;
  description: string;
  deleteKeys?: string[];
  clearValueKeys?: string[];
  probeKeys: string[];
}): CleanTarget {
  return {
    id: opts.id,
    name: opts.name,
    description: opts.description,
    group: 'privacy',
    risk: 'caution',
    requiresAdmin: false,
    defaultSelected: false,
    icon: 'EyeOff',
    customScan: async (): Promise<TargetScan> => {
      let present = false;
      for (const k of opts.probeKeys) {
        if (await keyHasContent(k)) {
          present = true;
          break;
        }
      }
      return { bytes: 0, files: 0, present, note: 'Privacy trace (no disk space reported).' };
    },
    customClean: async (): Promise<TargetClean> => {
      let ok = true;
      for (const k of opts.deleteKeys ?? []) {
        const res = await reg(['delete', k, '/f'], 8000);
        if (!res.ok && !/cannot find|unable to find|not exist/i.test(res.stderr + res.stdout)) {
          ok = false;
        }
      }
      for (const k of opts.clearValueKeys ?? []) {
        const res = await reg(['delete', k, '/va', '/f'], 8000);
        if (!res.ok && !/cannot find|unable to find|not exist/i.test(res.stderr + res.stdout)) {
          ok = false;
        }
      }
      return ok ? { bytes: 0, files: 0 } : { bytes: 0, files: 0, error: 'Some keys could not be cleared.' };
    },
  };
}

export const PRIVACY_TARGETS: CleanTarget[] = [
  {
    id: 'recent-items',
    name: 'Recent files & jump lists',
    description: 'Recently-opened file shortcuts and taskbar jump lists.',
    group: 'privacy',
    risk: 'caution',
    requiresAdmin: false,
    defaultSelected: false,
    icon: 'Clock',
    resolveDirs: () => [
      path.join(ROAMING, 'Microsoft', 'Windows', 'Recent'),
      path.join(ROAMING, 'Microsoft', 'Windows', 'Recent', 'AutomaticDestinations'),
      path.join(ROAMING, 'Microsoft', 'Windows', 'Recent', 'CustomDestinations'),
    ],
  },
  regTarget({
    id: 'recent-docs-mru',
    name: 'Recent documents history',
    description: 'Windows’ list of recently opened documents (RecentDocs).',
    deleteKeys: ['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RecentDocs'],
    probeKeys: ['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RecentDocs'],
  }),
  regTarget({
    id: 'run-mru',
    name: 'Run dialog history',
    description: 'Commands typed into the Win+R Run box.',
    clearValueKeys: ['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RunMRU'],
    probeKeys: ['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RunMRU'],
  }),
  regTarget({
    id: 'explorer-search-mru',
    name: 'Explorer search history',
    description: 'Search terms typed into the File Explorer search box.',
    clearValueKeys: ['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\WordWheelQuery'],
    probeKeys: ['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\WordWheelQuery'],
  }),
  regTarget({
    id: 'typed-paths-urls',
    name: 'Typed paths & URLs',
    description: 'Addresses typed into the Explorer / Internet Explorer address bar.',
    deleteKeys: ['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\TypedPaths'],
    clearValueKeys: ['HKCU\\Software\\Microsoft\\Internet Explorer\\TypedURLs'],
    probeKeys: [
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\TypedPaths',
      'HKCU\\Software\\Microsoft\\Internet Explorer\\TypedURLs',
    ],
  }),
  regTarget({
    id: 'dialog-mru',
    name: 'Open/Save dialog history',
    description: 'Recently used folders in file Open/Save dialogs.',
    deleteKeys: [
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\ComDlg32\\LastVisitedPidlMRU',
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\ComDlg32\\OpenSavePidlMRU',
    ],
    probeKeys: [
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\ComDlg32\\LastVisitedPidlMRU',
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\ComDlg32\\OpenSavePidlMRU',
    ],
  }),
  regTarget({
    id: 'userassist',
    name: 'Program launch history',
    description: 'Windows’ record of which programs you launch (UserAssist).',
    deleteKeys: [
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist\\{CEBFF5CD-ACE2-4F4F-9178-9926F41749EA}\\Count',
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist\\{F4E57C4B-2036-45F0-A9AB-443BCFE33D9F}\\Count',
    ],
    probeKeys: [
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist\\{CEBFF5CD-ACE2-4F4F-9178-9926F41749EA}\\Count',
    ],
  }),
];
