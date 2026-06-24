import fs from 'node:fs/promises';
import path from 'node:path';
import type { CleanTarget } from './types';
import { localAppData, roamingAppData } from '../fsx';

const LOCAL = localAppData();
const ROAMING = roamingAppData();

const CHROMIUM_CACHE_SUBDIRS = [
  'Cache',
  'Code Cache',
  'GPUCache',
  'DawnCache',
  'DawnGraphiteCache',
  'GraphiteDawnCache',
  'GrShaderCache',
  'ShaderCache',
  path.join('Service Worker', 'CacheStorage'),
  path.join('Service Worker', 'ScriptCache'),
];

const CHROMIUM_COOKIE_FILES = [path.join('Network', 'Cookies'), path.join('Network', 'Cookies-journal')];
const CHROMIUM_HISTORY_FILES = [
  'History',
  'History-journal',
  'Visited Links',
  'Top Sites',
  'Web Data',
  'Web Data-journal',
  'Shortcuts',
];
const CHROMIUM_PASSWORD_FILES = ['Login Data', 'Login Data-journal', 'Login Data For Account'];
const CHROMIUM_SESSION_FILES = ['Current Session', 'Current Tabs', 'Last Session', 'Last Tabs'];

interface ChromiumBrowser {
  id: string;
  label: string;
  process: string;
  userData: string;
}

const CHROMIUM_BROWSERS: ChromiumBrowser[] = [
  { id: 'chrome', label: 'Google Chrome', process: 'chrome.exe', userData: path.join(LOCAL, 'Google', 'Chrome', 'User Data') },
  { id: 'edge', label: 'Microsoft Edge', process: 'msedge.exe', userData: path.join(LOCAL, 'Microsoft', 'Edge', 'User Data') },
  { id: 'brave', label: 'Brave', process: 'brave.exe', userData: path.join(LOCAL, 'BraveSoftware', 'Brave-Browser', 'User Data') },
  { id: 'vivaldi', label: 'Vivaldi', process: 'vivaldi.exe', userData: path.join(LOCAL, 'Vivaldi', 'User Data') },
];

async function chromiumProfiles(userData: string): Promise<string[]> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(userData, { withFileTypes: true });
  } catch {
    return [];
  }
  const profiles = entries
    .filter((e) => e.isDirectory() && /^(Default|Profile \d+)$/.test(e.name))
    .map((e) => path.join(userData, e.name));
  return profiles.length ? profiles : [path.join(userData, 'Default')];
}

function chromiumTargets(b: ChromiumBrowser): CleanTarget[] {
  const dirsFrom = (subs: string[]) => async () => {
    const profiles = await chromiumProfiles(b.userData);
    return profiles.flatMap((p) => subs.map((s) => path.join(p, s)));
  };
  const filesFrom = (names: string[]) => async () => {
    const profiles = await chromiumProfiles(b.userData);
    return profiles.flatMap((p) => names.map((n) => path.join(p, n)));
  };
  return [
    {
      id: `${b.id}-cache`,
      name: 'Cache',
      description: `${b.label} web, code, GPU and service-worker caches. Safe — re-downloads as needed.`,
      group: 'browsers',
      risk: 'safe',
      requiresAdmin: false,
      defaultSelected: true,
      appLabel: b.label,
      icon: 'Globe',
      process: b.process,
      resolveDirs: dirsFrom(CHROMIUM_CACHE_SUBDIRS),
    },
    {
      id: `${b.id}-cookies`,
      name: 'Cookies',
      description: `${b.label} cookies. Clearing them logs you out of websites.`,
      group: 'browsers',
      risk: 'caution',
      requiresAdmin: false,
      defaultSelected: false,
      appLabel: b.label,
      icon: 'Cookie',
      process: b.process,
      resolveFiles: filesFrom(CHROMIUM_COOKIE_FILES),
    },
    {
      id: `${b.id}-history`,
      name: 'History & autofill',
      description: `${b.label} browsing history, visited links and saved form data.`,
      group: 'browsers',
      risk: 'caution',
      requiresAdmin: false,
      defaultSelected: false,
      appLabel: b.label,
      icon: 'History',
      process: b.process,
      resolveFiles: filesFrom(CHROMIUM_HISTORY_FILES),
    },
    {
      id: `${b.id}-sessions`,
      name: 'Open tabs / session',
      description: `${b.label} saved session. Clearing it loses your currently open tabs.`,
      group: 'browsers',
      risk: 'caution',
      requiresAdmin: false,
      defaultSelected: false,
      appLabel: b.label,
      icon: 'AppWindow',
      process: b.process,
      resolveFiles: filesFrom(CHROMIUM_SESSION_FILES),
    },
    {
      id: `${b.id}-passwords`,
      name: 'Saved passwords',
      description: `${b.label} saved passwords. This permanently deletes them — make sure they’re synced or saved elsewhere first.`,
      group: 'browsers',
      risk: 'risky',
      requiresAdmin: false,
      defaultSelected: false,
      appLabel: b.label,
      icon: 'KeyRound',
      process: b.process,
      resolveFiles: filesFrom(CHROMIUM_PASSWORD_FILES),
    },
  ];
}

interface OperaBrowser {
  id: string;
  label: string;
  profile: string;
  cache: string;
}

const OPERA_BROWSERS: OperaBrowser[] = [
  {
    id: 'opera',
    label: 'Opera',
    profile: path.join(ROAMING, 'Opera Software', 'Opera Stable'),
    cache: path.join(LOCAL, 'Opera Software', 'Opera Stable', 'Cache'),
  },
  {
    id: 'opera-gx',
    label: 'Opera GX',
    profile: path.join(ROAMING, 'Opera Software', 'Opera GX Stable'),
    cache: path.join(LOCAL, 'Opera Software', 'Opera GX Stable', 'Cache'),
  },
];

function operaTargets(b: OperaBrowser): CleanTarget[] {
  return [
    {
      id: `${b.id}-cache`,
      name: 'Cache',
      description: `${b.label} browser cache. Safe — re-downloads as needed.`,
      group: 'browsers',
      risk: 'safe',
      requiresAdmin: false,
      defaultSelected: true,
      appLabel: b.label,
      icon: 'Globe',
      process: 'opera.exe',
      resolveDirs: () => [
        b.cache,
        path.join(b.profile, 'Code Cache'),
        path.join(b.profile, 'GPUCache'),
        path.join(b.profile, 'Service Worker', 'CacheStorage'),
      ],
    },
    {
      id: `${b.id}-cookies`,
      name: 'Cookies',
      description: `${b.label} cookies. Clearing them logs you out of websites.`,
      group: 'browsers',
      risk: 'caution',
      requiresAdmin: false,
      defaultSelected: false,
      appLabel: b.label,
      icon: 'Cookie',
      process: 'opera.exe',
      resolveFiles: () => [
        path.join(b.profile, 'Network', 'Cookies'),
        path.join(b.profile, 'Cookies'),
      ],
    },
    {
      id: `${b.id}-history`,
      name: 'History & autofill',
      description: `${b.label} browsing history and saved form data.`,
      group: 'browsers',
      risk: 'caution',
      requiresAdmin: false,
      defaultSelected: false,
      appLabel: b.label,
      icon: 'History',
      process: 'opera.exe',
      resolveFiles: () => [
        path.join(b.profile, 'History'),
        path.join(b.profile, 'Visited Links'),
        path.join(b.profile, 'Top Sites'),
        path.join(b.profile, 'Web Data'),
      ],
    },
  ];
}

async function firefoxProfiles(root: string): Promise<string[]> {
  const profilesDir = path.join(root, 'Mozilla', 'Firefox', 'Profiles');
  try {
    const entries = await fs.readdir(profilesDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => path.join(profilesDir, e.name));
  } catch {
    return [];
  }
}

const FIREFOX_TARGETS: CleanTarget[] = [
  {
    id: 'firefox-cache',
    name: 'Cache',
    description: 'Firefox disk and startup cache. Safe — re-downloads as needed.',
    group: 'browsers',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    appLabel: 'Mozilla Firefox',
    icon: 'Globe',
    process: 'firefox.exe',
    resolveDirs: async () => {
      const profiles = await firefoxProfiles(LOCAL);
      return profiles.flatMap((p) => [path.join(p, 'cache2'), path.join(p, 'startupCache')]);
    },
  },
  {
    id: 'firefox-cookies',
    name: 'Cookies',
    description: 'Firefox cookies. Clearing them logs you out of websites.',
    group: 'browsers',
    risk: 'caution',
    requiresAdmin: false,
    defaultSelected: false,
    appLabel: 'Mozilla Firefox',
    icon: 'Cookie',
    process: 'firefox.exe',
    resolveFiles: async () => {
      const profiles = await firefoxProfiles(ROAMING);
      return profiles.flatMap((p) => [path.join(p, 'cookies.sqlite'), path.join(p, 'cookies.sqlite-wal')]);
    },
  },
  {
    id: 'firefox-sessions',
    name: 'Open tabs / session',
    description: 'Firefox saved session. Clearing it loses your currently open tabs.',
    group: 'browsers',
    risk: 'caution',
    requiresAdmin: false,
    defaultSelected: false,
    appLabel: 'Mozilla Firefox',
    icon: 'AppWindow',
    process: 'firefox.exe',
    resolveFiles: async () => {
      const profiles = await firefoxProfiles(ROAMING);
      return profiles.flatMap((p) => [path.join(p, 'sessionstore.jsonlz4')]);
    },
  },
  {
    id: 'firefox-passwords',
    name: 'Saved passwords',
    description:
      'Firefox saved logins (logins.json + key4.db). Permanent — make sure they’re synced or saved elsewhere first.',
    group: 'browsers',
    risk: 'risky',
    requiresAdmin: false,
    defaultSelected: false,
    appLabel: 'Mozilla Firefox',
    icon: 'KeyRound',
    process: 'firefox.exe',
    resolveFiles: async () => {
      const profiles = await firefoxProfiles(ROAMING);
      return profiles.flatMap((p) => [path.join(p, 'logins.json'), path.join(p, 'key4.db')]);
    },
  },
];

export const BROWSER_TARGETS: CleanTarget[] = [
  ...CHROMIUM_BROWSERS.flatMap(chromiumTargets),
  ...OPERA_BROWSERS.flatMap(operaTargets),
  ...FIREFOX_TARGETS,
];
