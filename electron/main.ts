import { app, BrowserWindow, Menu, nativeImage, shell, Tray } from 'electron';
import path from 'node:path';
import { registerIpc } from './ipc';
import { setKryptUsername, startDiscordRpc, stopDiscordRpc } from './system/discord';
import {
  applyStartup,
  RELAUNCH_MINIMIZED_FLAG,
  wasLaunchedAtStartup,
  wasRelaunchedMinimized,
} from './system/startup';
import * as settingsStore from './system/settings-store';

process.env.DIST_ELECTRON = __dirname;
process.env.DIST = path.join(__dirname, '..', 'dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(__dirname, '..', 'public');

app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let hasHintedTray = false;

const COUNT_FLAG = '--krypt-relaunch-count=';
const MAX_AUTO_RELAUNCH = 5;
const launchTime = Date.now();
const relaunchCount = (() => {
  const arg = process.argv.find((a) => a.startsWith(COUNT_FLAG));
  return arg ? Number(arg.slice(COUNT_FLAG.length)) || 0 : 0;
})();

function relaunchMinimized(reason: string): void {
  if (isQuitting) return;
  const uptime = Date.now() - launchTime;
  const chain = uptime > 5 * 60_000 ? 0 : relaunchCount;
  if (uptime < 10_000) {
    console.error(`[krypt] skip auto-relaunch (${reason}): crashed ${uptime}ms after launch.`);
    return;
  }
  if (chain >= MAX_AUTO_RELAUNCH) {
    console.error(`[krypt] giving up auto-relaunch (${reason}) after ${chain} attempts.`);
    return;
  }
  isQuitting = true;
  app.relaunch({ args: [RELAUNCH_MINIMIZED_FLAG, `${COUNT_FLAG}${chain + 1}`] });
  app.exit(0);
}

function createWindow(): void {
  const iconPath = path.join(__dirname, '..', 'resources', 'krypt.png');
  const icon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0A0A0F',
    show: false,
    frame: false,
    transparent: false,
    titleBarStyle: 'hidden',
    icon: icon.isEmpty() ? undefined : icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
    if (!app.isPackaged) mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(process.env.DIST!, 'index.html'));
  }

  const isInternalUrl = (url: string) =>
    url.startsWith('file://') || (!!devUrl && url.startsWith(devUrl));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isInternalUrl(url)) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  });
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));

  const startHidden =
    wasRelaunchedMinimized() ||
    (wasLaunchedAtStartup() && settingsStore.load().startMinimized);
  mainWindow.once('ready-to-show', () => {
    if (!startHidden) mainWindow?.show();
  });

  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow?.hide();
    if (!hasHintedTray) {
      hasHintedTray = true;
      tray?.displayBalloon({
        title: 'Krypt Cleaner is still running',
        content: "It's tucked away in your system tray. Right-click the icon to quit.",
      });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  if (tray) return;
  const iconPath = path.join(__dirname, '..', 'resources', 'krypt.ico');
  const image = nativeImage.createFromPath(iconPath);
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image);
  tray.setToolTip('Krypt Cleaner');

  const showWindow = () => {
    if (!mainWindow) {
      createWindow();
      return;
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  };

  tray.on('click', showWindow);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Krypt Cleaner', click: showWindow },
      { type: 'separator' },
      {
        label: 'Quit Krypt Cleaner',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ])
  );
}

app.whenReady().then(() => {
  applyStartup(settingsStore.load().launchOnStartup);
  registerIpc();
  createWindow();
  createTray();
  setKryptUsername(settingsStore.load().kryptUsername);
  startDiscordRpc().catch(() => {
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  stopDiscordRpc();
  if (process.platform !== 'darwin') app.quit();
});

app.on('render-process-gone', (_event, _contents, details) => {
  if (details.reason === 'crashed' || details.reason === 'oom') {
    relaunchMinimized(`renderer ${details.reason}`);
  }
});

const ELEVATE_FLAG = '--krypt-elevate-relaunch';
const isElevateRelaunch = process.argv.includes(ELEVATE_FLAG);

function installSecondInstanceHandler(): void {
  app.on('second-instance', (_event, argv) => {
    if (argv.includes(ELEVATE_FLAG)) {
      app.quit();
      return;
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function tryAcquireLockWithRetry(deadlineMs: number): void {
  const start = Date.now();
  const attempt = () => {
    if (app.requestSingleInstanceLock()) {
      installSecondInstanceHandler();
      return;
    }
    if (Date.now() - start > deadlineMs) {
      app.quit();
      return;
    }
    setTimeout(attempt, 200);
  };
  attempt();
}

if (isElevateRelaunch) {
  tryAcquireLockWithRetry(10_000);
} else if (app.requestSingleInstanceLock()) {
  installSecondInstanceHandler();
} else {
  app.quit();
}
