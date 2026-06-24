import os from 'node:os';
import path from 'node:path';
import type { CleanTarget, TargetClean, TargetScan } from './types';
import { dirSize, localAppData, programData, systemRoot } from '../fsx';
import { powershell, run } from '../shell';

const SYS = systemRoot();
const LOCAL = localAppData();
const PROGRAMDATA = programData();

export const SYSTEM_TARGETS: CleanTarget[] = [
  {
    id: 'user-temp',
    name: 'User temp files',
    description: 'Per-user temporary files in %TEMP%. The classic junk pile.',
    group: 'system',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    icon: 'FileX',
    resolveDirs: () => [os.tmpdir()],
  },
  {
    id: 'windows-temp',
    name: 'Windows temp files',
    description: 'Machine-wide temporary files in C:\\Windows\\Temp.',
    group: 'system',
    risk: 'safe',
    requiresAdmin: true,
    defaultSelected: true,
    icon: 'FileX',
    resolveDirs: () => [path.join(SYS, 'Temp')],
  },
  {
    id: 'thumbnail-cache',
    name: 'Thumbnail cache',
    description: 'Explorer thumbnail database. Rebuilds automatically.',
    group: 'system',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    icon: 'Image',
    resolveDirs: () => [path.join(LOCAL, 'Microsoft', 'Windows', 'Explorer')],
    fileMatch: (n) => n.startsWith('thumbcache_'),
  },
  {
    id: 'icon-cache',
    name: 'Icon cache',
    description: 'Explorer icon cache. Rebuilds automatically.',
    group: 'system',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    icon: 'Image',
    resolveDirs: () => [path.join(LOCAL, 'Microsoft', 'Windows', 'Explorer')],
    fileMatch: (n) => n.startsWith('iconcache_'),
    resolveFiles: () => [path.join(LOCAL, 'IconCache.db')],
  },
  {
    id: 'dx-shader-cache',
    name: 'DirectX shader cache',
    description: 'OS-level D3D shader cache. Games regenerate it on demand.',
    group: 'system',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    icon: 'Cpu',
    resolveDirs: () => [path.join(LOCAL, 'D3DSCache')],
  },
  {
    id: 'crash-dumps',
    name: 'App crash dumps',
    description: 'Per-application .dmp crash dumps in %LOCALAPPDATA%\\CrashDumps.',
    group: 'system',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    icon: 'Bug',
    resolveDirs: () => [path.join(LOCAL, 'CrashDumps')],
  },
  {
    id: 'wer-reports',
    name: 'Error reports (WER)',
    description: 'Queued Windows Error Reporting crash reports.',
    group: 'system',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    icon: 'TriangleAlert',
    resolveDirs: () => [
      path.join(LOCAL, 'Microsoft', 'Windows', 'WER'),
      path.join(PROGRAMDATA, 'Microsoft', 'Windows', 'WER'),
    ],
  },
  {
    id: 'delivery-optimization',
    name: 'Delivery Optimization cache',
    description: 'Peer-to-peer Windows Update cache. Can grow to many GB.',
    group: 'system',
    risk: 'safe',
    requiresAdmin: true,
    defaultSelected: true,
    icon: 'Download',
    resolveDirs: () => [
      path.join(SYS, 'SoftwareDistribution', 'DeliveryOptimization'),
    ],
  },
  {
    id: 'dns-cache',
    name: 'DNS resolver cache',
    description: 'Flushes cached DNS lookups. Fixes some "site won’t load" issues.',
    group: 'system',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    icon: 'Globe',
    customScan: async (): Promise<TargetScan> => ({
      bytes: 0,
      files: 0,
      present: true,
      note: 'Flushes the resolver cache (no disk space reported).',
    }),
    customClean: async (): Promise<TargetClean> => {
      const res = await run('ipconfig.exe', ['/flushdns'], { timeout: 10000 });
      return res.ok
        ? { bytes: 0, files: 0 }
        : { bytes: 0, files: 0, error: 'Could not flush DNS cache.' };
    },
  },
  {
    id: 'prefetch',
    name: 'Prefetch',
    description:
      'App-launch accelerator files. Safe to clear; the next launch of each app is slightly slower while it rebuilds.',
    group: 'system',
    risk: 'safe',
    requiresAdmin: true,
    defaultSelected: false,
    icon: 'Rocket',
    resolveDirs: () => [path.join(SYS, 'Prefetch')],
  },
  {
    id: 'font-cache',
    name: 'Font cache',
    description: 'Rebuilds the Windows font cache. Fixes blurry/garbled fonts.',
    group: 'system',
    risk: 'safe',
    requiresAdmin: true,
    defaultSelected: false,
    icon: 'Type',
    customScan: async (): Promise<TargetScan> => {
      const dir = path.join(
        SYS,
        'ServiceProfiles',
        'LocalService',
        'AppData',
        'Local',
        'FontCache'
      );
      const r = await dirSize(dir);
      return { bytes: r.bytes, files: r.files, present: r.files > 0 };
    },
    customClean: async (): Promise<TargetClean> => {
      const dir = path.join(
        SYS,
        'ServiceProfiles',
        'LocalService',
        'AppData',
        'Local',
        'FontCache'
      );
      const before = await dirSize(dir);
      const res = await powershell(
        "Stop-Service -Name FontCache -Force -ErrorAction SilentlyContinue; " +
          `Remove-Item -Path '${dir}\\*' -Recurse -Force -ErrorAction SilentlyContinue; ` +
          `Remove-Item -Path '${path.join(SYS, 'System32', 'FNTCACHE.DAT')}' -Force -ErrorAction SilentlyContinue; ` +
          'Start-Service -Name FontCache -ErrorAction SilentlyContinue',
        45000
      );
      return res.ok || res.code === 0
        ? { bytes: before.bytes, files: before.files }
        : { bytes: before.bytes, files: before.files, error: 'Font cache partially cleared.' };
    },
  },
  {
    id: 'cbs-logs',
    name: 'Windows servicing logs',
    description: 'Component Based Servicing (CBS) and DISM log files.',
    group: 'system',
    risk: 'safe',
    requiresAdmin: true,
    defaultSelected: false,
    icon: 'ScrollText',
    resolveDirs: () => [
      path.join(SYS, 'Logs', 'CBS'),
      path.join(SYS, 'Logs', 'DISM'),
    ],
  },
  {
    id: 'memory-dumps',
    name: 'System crash dumps',
    description:
      'BSOD minidumps and the full MEMORY.DMP (can be gigabytes). Only needed for diagnosing blue screens.',
    group: 'system',
    risk: 'caution',
    requiresAdmin: true,
    defaultSelected: false,
    icon: 'HardDriveDownload',
    resolveDirs: () => [path.join(SYS, 'Minidump')],
    resolveFiles: () => [path.join(SYS, 'MEMORY.DMP')],
  },
  {
    id: 'windows-update-cache',
    name: 'Windows Update cache',
    description:
      'Downloaded update installers in SoftwareDistribution. Forces a re-download of any in-flight update.',
    group: 'system',
    risk: 'caution',
    requiresAdmin: true,
    defaultSelected: false,
    icon: 'Download',
    customScan: async (): Promise<TargetScan> => {
      const dir = path.join(SYS, 'SoftwareDistribution', 'Download');
      const r = await dirSize(dir);
      return { bytes: r.bytes, files: r.files, present: r.files > 0 };
    },
    customClean: async (): Promise<TargetClean> => {
      const dir = path.join(SYS, 'SoftwareDistribution', 'Download');
      const before = await dirSize(dir);
      const res = await powershell(
        'Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue; ' +
          'Stop-Service -Name bits -Force -ErrorAction SilentlyContinue; ' +
          `Remove-Item -Path '${dir}\\*' -Recurse -Force -ErrorAction SilentlyContinue; ` +
          'Start-Service -Name wuauserv -ErrorAction SilentlyContinue; ' +
          'Start-Service -Name bits -ErrorAction SilentlyContinue',
        60000
      );
      return res.ok
        ? { bytes: before.bytes, files: before.files }
        : { bytes: before.bytes, files: before.files, error: 'Update cache partially cleared.' };
    },
  },
  {
    id: 'defender-cache',
    name: 'Defender scan history',
    description: 'Old Windows Defender scan history. Definitions are untouched.',
    group: 'system',
    risk: 'safe',
    requiresAdmin: true,
    defaultSelected: false,
    icon: 'Shield',
    resolveDirs: () => [
      path.join(PROGRAMDATA, 'Microsoft', 'Windows Defender', 'Scans', 'History', 'Results'),
      path.join(PROGRAMDATA, 'Microsoft', 'Windows Defender', 'Scans', 'History', 'Service'),
    ],
  },
  {
    id: 'clipboard',
    name: 'Clipboard',
    description: 'Clears whatever is currently on the clipboard.',
    group: 'system',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: false,
    icon: 'Clipboard',
    customScan: async (): Promise<TargetScan> => ({
      bytes: 0,
      files: 0,
      present: true,
      note: 'Clears current clipboard contents.',
    }),
    customClean: async (): Promise<TargetClean> => {
      const res = await run('cmd.exe', ['/c', 'echo off | clip'], {
        timeout: 8000,
        shell: false,
      });
      return res.ok ? { bytes: 0, files: 0 } : { bytes: 0, files: 0 };
    },
  },
  {
    id: 'store-cache',
    name: 'Microsoft Store cache',
    description: 'Resets the Store download cache (wsreset). Fixes broken downloads.',
    group: 'system',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: false,
    icon: 'Store',
    customScan: async (): Promise<TargetScan> => ({
      bytes: 0,
      files: 0,
      present: true,
      note: 'Runs wsreset; the Store window may briefly open.',
    }),
    customClean: async (): Promise<TargetClean> => {
      const res = await run('wsreset.exe', ['-i'], { timeout: 20000 });
      return res.ok || res.code === 0
        ? { bytes: 0, files: 0 }
        : { bytes: 0, files: 0 };
    },
  },
  {
    id: 'recycle-bin',
    name: 'Recycle Bin',
    description: 'Permanently deletes everything in the Recycle Bin on all drives.',
    group: 'system',
    risk: 'risky',
    requiresAdmin: false,
    defaultSelected: false,
    icon: 'Trash2',
    customScan: async (): Promise<TargetScan> => {
      const res = await powershell(
        "$ErrorActionPreference='SilentlyContinue';" +
          "(New-Object -ComObject Shell.Application).NameSpace(0xA).Items() | " +
          'Measure-Object -Property Size -Sum | Select-Object -ExpandProperty Sum',
        20000
      );
      const bytes = parseInt(res.stdout.trim(), 10);
      return {
        bytes: Number.isFinite(bytes) ? bytes : 0,
        files: 0,
        present: true,
        note: 'Permanent deletion — files cannot be recovered afterwards.',
      };
    },
    customClean: async (): Promise<TargetClean> => {
      const before = await powershell(
        "$ErrorActionPreference='SilentlyContinue';" +
          "(New-Object -ComObject Shell.Application).NameSpace(0xA).Items() | " +
          'Measure-Object -Property Size -Sum | Select-Object -ExpandProperty Sum',
        20000
      );
      const bytes = parseInt(before.stdout.trim(), 10);
      const res = await powershell(
        'Clear-RecycleBin -Force -ErrorAction SilentlyContinue; $true',
        30000
      );
      return res.ok
        ? { bytes: Number.isFinite(bytes) ? bytes : 0, files: 0 }
        : { bytes: 0, files: 0, error: 'Recycle Bin could not be emptied.' };
    },
  },
  {
    id: 'event-logs',
    name: 'Windows event logs',
    description:
      'Clears all Windows event logs. Destroys the troubleshooting/forensic trail — only for a fresh start.',
    group: 'system',
    risk: 'risky',
    requiresAdmin: true,
    defaultSelected: false,
    icon: 'ScrollText',
    customScan: async (): Promise<TargetScan> => ({
      bytes: 0,
      files: 0,
      present: true,
      note: 'Clears all event logs — requires Administrator.',
    }),
    customClean: async (): Promise<TargetClean> => {
      const res = await powershell(
        'wevtutil el | ForEach-Object { wevtutil cl "$_" 2>$null }',
        60000
      );
      return res.ok
        ? { bytes: 0, files: 0 }
        : { bytes: 0, files: 0, error: 'Some event logs could not be cleared (need Administrator).' };
    },
  },
];
