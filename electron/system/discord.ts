const RPC: any = require('discord-rpc');

import { resolveSessionMeta } from './runtime-meta';

const meta = resolveSessionMeta();
const CLIENT_ID = meta.clientId;
const START_TIMESTAMP = Math.floor(Date.now() / 1000);

let client: any = null;
let connected = false;
let reconnectTimer: NodeJS.Timeout | null = null;
let heartbeat: NodeJS.Timeout | null = null;
let kryptUsername = '';
const RECONNECT_MS = 15_000;
const HEARTBEAT_MS = 60_000;

interface Activity {
  details?: string;
  state?: string;
  largeImageKey?: string;
  largeImageText?: string;
  buttons?: Array<{ label: string; url: string }>;
}

function buildButtons(): Activity['buttons'] {
  const base = meta.rpc.buttons;
  if (kryptUsername) {
    return [
      { label: 'My Profile', url: `https://krypt.cc/${encodeURIComponent(kryptUsername)}` },
      ...base.slice(1),
    ];
  }
  return base;
}

const DEFAULT_ACTIVITY: Activity = {
  details: meta.rpc.details,
  state: meta.rpc.stateIdle,
  largeImageKey: 'krypt',
  largeImageText: meta.rpc.largeText,
  buttons: buildButtons(),
};

let currentActivity: Activity = DEFAULT_ACTIVITY;

export async function startDiscordRpc(): Promise<void> {
  ensureHeartbeat();
  if (client) return;
  try {
    RPC.register?.(CLIENT_ID);
  } catch {
  }
  client = new RPC.Client({ transport: 'ipc' });

  client.on('ready', () => {
    connected = true;
    pushActivity();
  });

  client.on('disconnected', () => {
    connected = false;
    client = null;
    scheduleReconnect();
  });

  try {
    await client.login({ clientId: CLIENT_ID });
  } catch {
    connected = false;
    client = null;
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startDiscordRpc().catch(() => {
    });
  }, RECONNECT_MS);
}

function ensureHeartbeat() {
  if (heartbeat) return;
  heartbeat = setInterval(() => {
    if (connected) pushActivity();
    else if (!client && !reconnectTimer) startDiscordRpc().catch(() => {});
  }, HEARTBEAT_MS);
}

function pushActivity() {
  if (!client || !connected) return;
  client
    .setActivity({
      ...currentActivity,
      startTimestamp: START_TIMESTAMP,
      instance: false,
    })
    .catch(() => {
    });
}

export function updateDiscordActivity(patch: Partial<Activity>): void {
  currentActivity = { ...currentActivity, ...patch };
  pushActivity();
}

export function setKryptUsername(username: string): void {
  kryptUsername = (username || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^krypt\.cc\//i, '')
    .replace(/^@+/, '')
    .trim();
  currentActivity = { ...currentActivity, buttons: buildButtons() };
  pushActivity();
}

export function stopDiscordRpc(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (heartbeat) {
    clearInterval(heartbeat);
    heartbeat = null;
  }
  if (client) {
    try {
      client.destroy();
    } catch {
    }
    client = null;
  }
  connected = false;
}
