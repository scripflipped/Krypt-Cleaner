import path from 'node:path';
import type { CleanTarget } from './types';
import { localAppData, localLow, programData, roamingAppData } from '../fsx';
import { reg } from '../shell';

const LOCAL = localAppData();
const ROAMING = roamingAppData();
const LOCALLOW = localLow();
const PROGRAMDATA = programData();

async function steamPath(): Promise<string> {
  const res = await reg(['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], 8000);
  const m = res.stdout.match(/SteamPath\s+REG_SZ\s+(.+)/i);
  const p = m?.[1]?.trim();
  return p && p.length ? p.replace(/\//g, '\\') : 'C:\\Program Files (x86)\\Steam';
}

export const APP_TARGETS: CleanTarget[] = [
  {
    id: 'discord-cache',
    name: 'Discord cache',
    description: 'Discord image, code and GPU caches. Your login and settings stay.',
    group: 'apps',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    appLabel: 'Discord',
    icon: 'MessageCircle',
    process: 'Discord.exe',
    resolveDirs: () =>
      ['discord', 'discordcanary', 'discordptb'].flatMap((d) => [
        path.join(ROAMING, d, 'Cache'),
        path.join(ROAMING, d, 'Code Cache'),
        path.join(ROAMING, d, 'GPUCache'),
      ]),
  },
  {
    id: 'spotify-cache',
    name: 'Spotify cache',
    description: 'Spotify streamed-audio and image cache. Re-downloads on demand.',
    group: 'apps',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    appLabel: 'Spotify',
    icon: 'Music',
    process: 'Spotify.exe',
    resolveDirs: () => [
      path.join(LOCAL, 'Spotify', 'Storage'),
      path.join(LOCAL, 'Spotify', 'Data'),
    ],
  },
  {
    id: 'slack-cache',
    name: 'Slack cache',
    description: 'Slack caches (service-worker cache can grow to multiple GB).',
    group: 'apps',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    appLabel: 'Slack',
    icon: 'Hash',
    process: 'slack.exe',
    resolveDirs: () => [
      path.join(ROAMING, 'Slack', 'Cache'),
      path.join(ROAMING, 'Slack', 'Code Cache'),
      path.join(ROAMING, 'Slack', 'GPUCache'),
      path.join(ROAMING, 'Slack', 'Service Worker', 'CacheStorage'),
    ],
  },
  {
    id: 'teams-cache',
    name: 'Microsoft Teams cache',
    description: 'Classic Teams Chromium caches. Login and chats stay.',
    group: 'apps',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    appLabel: 'Microsoft Teams',
    icon: 'Users',
    process: 'Teams.exe',
    resolveDirs: () => [
      path.join(ROAMING, 'Microsoft', 'Teams', 'Cache'),
      path.join(ROAMING, 'Microsoft', 'Teams', 'Code Cache'),
      path.join(ROAMING, 'Microsoft', 'Teams', 'GPUCache'),
      path.join(ROAMING, 'Microsoft', 'Teams', 'Service Worker', 'CacheStorage'),
    ],
  },
  {
    id: 'steam-cache',
    name: 'Steam cache',
    description: 'Steam HTML cache and shader cache. Shaders regenerate per game.',
    group: 'apps',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    appLabel: 'Steam',
    icon: 'Gamepad2',
    process: 'steam.exe',
    resolveDirs: async () => {
      const root = await steamPath();
      return [
        path.join(root, 'steamapps', 'shadercache'),
        path.join(root, 'appcache', 'httpcache'),
        path.join(root, 'config', 'htmlcache'),
      ];
    },
  },
  {
    id: 'epic-cache',
    name: 'Epic Games cache',
    description: 'Epic Games Launcher web cache and logs.',
    group: 'apps',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    appLabel: 'Epic Games',
    icon: 'Gamepad2',
    process: 'EpicGamesLauncher.exe',
    resolveDirs: () => [
      path.join(LOCAL, 'EpicGamesLauncher', 'Saved', 'webcache'),
      path.join(LOCAL, 'EpicGamesLauncher', 'Saved', 'webcache_4147'),
      path.join(LOCAL, 'EpicGamesLauncher', 'Saved', 'Logs'),
    ],
  },
  {
    id: 'nvidia-shader-cache',
    name: 'NVIDIA shader cache',
    description: 'NVIDIA DX/GL/Vulkan shader caches. Games regenerate them.',
    group: 'apps',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    appLabel: 'NVIDIA',
    icon: 'Cpu',
    resolveDirs: () => [
      path.join(LOCAL, 'NVIDIA', 'DXCache'),
      path.join(LOCAL, 'NVIDIA', 'GLCache'),
      path.join(LOCAL, 'NVIDIA Corporation', 'NV_Cache'),
      path.join(LOCALLOW, 'NVIDIA', 'PerDriverVersion', 'DXCache'),
      path.join(PROGRAMDATA, 'NVIDIA Corporation', 'NV_Cache'),
    ],
  },
  {
    id: 'amd-shader-cache',
    name: 'AMD shader cache',
    description: 'AMD DirectX/Vulkan/GL shader caches. Games regenerate them.',
    group: 'apps',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    appLabel: 'AMD',
    icon: 'Cpu',
    resolveDirs: () => [
      path.join(LOCAL, 'AMD', 'DxCache'),
      path.join(LOCAL, 'AMD', 'DXCache'),
      path.join(LOCAL, 'AMD', 'VkCache'),
      path.join(LOCAL, 'AMD', 'GLCache'),
    ],
  },
  {
    id: 'intel-shader-cache',
    name: 'Intel shader cache',
    description: 'Intel graphics shader cache. Regenerates on demand.',
    group: 'apps',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    appLabel: 'Intel',
    icon: 'Cpu',
    resolveDirs: () => [path.join(LOCAL, 'Intel', 'ShaderCache')],
  },
  {
    id: 'vscode-cache',
    name: 'VS Code cache',
    description: 'VS Code caches and logs. Settings and extensions are untouched.',
    group: 'apps',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    appLabel: 'Visual Studio Code',
    icon: 'Code',
    process: 'Code.exe',
    resolveDirs: () => [
      path.join(ROAMING, 'Code', 'Cache'),
      path.join(ROAMING, 'Code', 'CachedData'),
      path.join(ROAMING, 'Code', 'Code Cache'),
      path.join(ROAMING, 'Code', 'GPUCache'),
      path.join(ROAMING, 'Code', 'logs'),
    ],
  },
  {
    id: 'adobe-cache',
    name: 'Adobe media cache',
    description: 'Adobe Media Cache and Camera Raw cache. Rebuilds on demand.',
    group: 'apps',
    risk: 'safe',
    requiresAdmin: false,
    defaultSelected: true,
    appLabel: 'Adobe',
    icon: 'Palette',
    resolveDirs: () => [
      path.join(ROAMING, 'Adobe', 'Common', 'Media Cache'),
      path.join(ROAMING, 'Adobe', 'Common', 'Media Cache Files'),
      path.join(LOCAL, 'Adobe', 'CameraRaw', 'Cache'),
    ],
  },
  {
    id: 'office-cache',
    name: 'Office document cache',
    description:
      'Microsoft Office upload cache. Clear only when Office is closed and uploads have synced.',
    group: 'apps',
    risk: 'caution',
    requiresAdmin: false,
    defaultSelected: false,
    appLabel: 'Microsoft Office',
    icon: 'FileText',
    resolveDirs: () => [
      path.join(LOCAL, 'Microsoft', 'Office', '16.0', 'OfficeFileCache'),
    ],
  },
  {
    id: 'onedrive-logs',
    name: 'OneDrive logs',
    description:
      'OneDrive diagnostic logs only. Your synced files are never touched.',
    group: 'apps',
    risk: 'caution',
    requiresAdmin: false,
    defaultSelected: false,
    appLabel: 'OneDrive',
    icon: 'Cloud',
    resolveDirs: () => [
      path.join(LOCAL, 'Microsoft', 'OneDrive', 'logs'),
      path.join(LOCAL, 'Microsoft', 'OneDrive', 'setup', 'logs'),
    ],
  },
];
