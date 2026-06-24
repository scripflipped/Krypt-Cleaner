import { app } from 'electron';

export const STARTUP_FLAG = '--krypt-autostart';

export const RELAUNCH_MINIMIZED_FLAG = '--krypt-relaunch-min';

export function wasLaunchedAtStartup(): boolean {
  return process.argv.includes(STARTUP_FLAG);
}

export function wasRelaunchedMinimized(): boolean {
  return process.argv.includes(RELAUNCH_MINIMIZED_FLAG);
}

export function applyStartup(enabled: boolean): void {
  if (process.platform !== 'win32') return;
  if (!app.isPackaged) return;
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath,
    args: enabled ? [STARTUP_FLAG] : [],
  });
}
