import { spawn, SpawnOptions } from 'node:child_process';
import path from 'node:path';

const SYSTEM_BINS = new Set<string>([
  'powershell.exe',
  'powershell',
  'reg.exe',
  'reg',
  'sc.exe',
  'sc',
  'net.exe',
  'net',
  'ipconfig.exe',
  'ipconfig',
  'wevtutil.exe',
  'wevtutil',
  'dism.exe',
  'dism',
  'defrag.exe',
  'defrag',
  'fsutil.exe',
  'fsutil',
  'cleanmgr.exe',
  'cleanmgr',
  'wsreset.exe',
  'wsreset',
  'tasklist.exe',
  'tasklist',
  'where.exe',
  'where',
  'cmd.exe',
  'cmd',
]);

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
  ok: boolean;
  ms: number;
}

export function systemBin(exe: string): string {
  if (process.platform !== 'win32') return exe;
  const root = process.env.SystemRoot || process.env.windir || 'C:\\Windows';
  const file = /\.exe$/i.test(exe) ? exe : `${exe}.exe`;
  const lower = file.toLowerCase();

  if (lower === 'pwsh.exe') {
    return path.join(
      process.env.ProgramFiles ?? 'C:\\Program Files',
      'PowerShell',
      '7',
      'pwsh.exe'
    );
  }

  if (lower === 'powershell.exe') {
    return path.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  }

  return path.join(root, 'System32', file);
}

export function run(
  cmd: string,
  args: string[] = [],
  opts: { timeout?: number; shell?: boolean; cwd?: string } = {}
): Promise<RunResult> {
  const started = Date.now();
  return new Promise((resolve) => {
    const options: SpawnOptions = {
      shell: opts.shell ?? false,
      cwd: opts.cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    };
    let stdout = '';
    let stderr = '';
    let child;
    const resolved =
      process.platform === 'win32' && SYSTEM_BINS.has(cmd.toLowerCase())
        ? systemBin(cmd)
        : cmd;
    try {
      child = spawn(resolved, args, options);
    } catch (err) {
      resolve({
        code: -1,
        stdout: '',
        stderr: (err as Error).message,
        ok: false,
        ms: Date.now() - started,
      });
      return;
    }

    const timer = opts.timeout
      ? setTimeout(() => {
          try {
            child.kill('SIGKILL');
          } catch {
          }
        }, opts.timeout)
      : null;

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      resolve({
        code: -1,
        stdout,
        stderr: stderr + '\n' + err.message,
        ok: false,
        ms: Date.now() - started,
      });
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({
        code: code ?? -1,
        stdout,
        stderr,
        ok: code === 0,
        ms: Date.now() - started,
      });
    });
  });
}

export async function powershell(script: string, timeout = 30000): Promise<RunResult> {
  return run(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-WindowStyle',
      'Hidden',
      '-Command',
      script,
    ],
    { timeout }
  );
}

export async function reg(args: string[], timeout = 15000): Promise<RunResult> {
  return run('reg.exe', args, { timeout });
}

export async function isProcessRunning(image: string): Promise<boolean> {
  const res = await run('tasklist.exe', ['/FI', `IMAGENAME eq ${image}`, '/NH'], {
    timeout: 8000,
  });
  if (!res.ok) return false;
  return res.stdout.toLowerCase().includes(image.toLowerCase());
}
