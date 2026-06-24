import { app, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { run } from './shell';

export async function isAdmin(): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  const result = await run('net.exe', ['session'], { timeout: 5000 });
  return result.code === 0;
}

export interface RelaunchResult {
  ok: boolean;
  message?: string;
}

const ELEVATE_FLAG = '--krypt-elevate-relaunch';

export async function relaunchAsAdmin(): Promise<RelaunchResult> {
  if (process.platform !== 'win32') {
    return { ok: false, message: 'Elevation is only supported on Windows.' };
  }

  if (!app.isPackaged) {
    const batPath = path.resolve(__dirname, '..', 'run-as-admin.bat');
    if (!fs.existsSync(batPath)) {
      await dialog.showMessageBox({
        type: 'error',
        title: 'Cannot relaunch as Administrator',
        message: 'run-as-admin.bat is missing.',
        detail:
          `Expected it at:\n    ${batPath}\n\n` +
          `Stop "npm run dev" and start it again from an elevated terminal.`,
        buttons: ['OK'],
      });
      return { ok: false, message: 'run-as-admin.bat not found.' };
    }

    const res = await run(
      'powershell.exe',
      [
        '-NoProfile',
        '-WindowStyle',
        'Hidden',
        '-Command',
        `Start-Process -FilePath '${batPath.replace(/'/g, "''")}' -Verb RunAs`,
      ],
      { timeout: 60000 }
    );

    if (res.ok) {
      setImmediate(() => app.quit());
      return { ok: true, message: 'Relaunching with administrator rights…' };
    }

    const combined = `${res.stdout}\n${res.stderr}`.toLowerCase();
    if (
      combined.includes('the operation was canceled') ||
      combined.includes('operation was cancelled')
    ) {
      return { ok: false, message: 'UAC prompt was cancelled.' };
    }
    return {
      ok: false,
      message: (res.stderr || res.stdout || 'Could not start elevated dev server.').slice(0, 240),
    };
  }

  const exe = process.execPath;
  const forwarded = process.argv.slice(1).filter((a) => a !== ELEVATE_FLAG);
  const args = [...forwarded, ELEVATE_FLAG];
  const argList = args.map((a) => `'${a.replace(/'/g, "''")}'`).join(',');
  const script = `Start-Process -FilePath '${exe.replace(/'/g, "''")}' -ArgumentList @(${argList}) -Verb RunAs -WindowStyle Normal`;

  const res = await run(
    'powershell.exe',
    ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', script],
    { timeout: 20000 }
  );

  if (res.ok) {
    setImmediate(() => app.quit());
    return { ok: true };
  }

  const combined = `${res.stdout}\n${res.stderr}`.toLowerCase();
  if (
    combined.includes('the operation was canceled') ||
    combined.includes('operation was cancelled')
  ) {
    return { ok: false, message: 'UAC prompt was cancelled.' };
  }
  return {
    ok: false,
    message: (res.stderr || res.stdout || 'Unknown error').slice(0, 240),
  };
}
