import type {
  ComponentStoreReport,
  DriveInfo,
  MediaType,
  OptimizeAction,
  OptimizeResult,
} from '../../shared/types';
import { powershell, run } from './shell';

function normaliseMedia(mediaType: string, busType: string): MediaType {
  const m = (mediaType || '').toString().toLowerCase();
  const b = (busType || '').toString().toLowerCase();
  if (m.includes('ssd')) return 'SSD';
  if (m.includes('hdd')) return 'HDD';
  if (b.includes('nvme')) return 'SSD';
  return 'Unknown';
}

export async function listDrives(): Promise<DriveInfo[]> {
  const script = `
$ErrorActionPreference='SilentlyContinue'
$vols = Get-Volume | Where-Object { $_.DriveLetter -and $_.DriveType -eq 'Fixed' }
$out = foreach ($v in $vols) {
  $pd = $null
  try {
    $part = Get-Partition -DriveLetter $v.DriveLetter -ErrorAction Stop
    $pd = $part | Get-Disk | Get-PhysicalDisk -ErrorAction Stop | Select-Object -First 1
  } catch {}
  [pscustomobject]@{
    Letter     = [string]$v.DriveLetter
    Label      = [string]$v.FileSystemLabel
    FileSystem = [string]$v.FileSystem
    Size       = [double]$v.Size
    Free       = [double]$v.SizeRemaining
    MediaType  = if ($pd) { [string]$pd.MediaType } else { 'Unknown' }
    BusType    = if ($pd) { [string]$pd.BusType } else { '' }
    Health     = [string]$v.HealthStatus
  }
}
@($out) | ConvertTo-Json -Depth 3
`;
  const res = await powershell(script, 30000);
  let parsed: any[] = [];
  try {
    const json = JSON.parse(res.stdout.trim() || '[]');
    parsed = Array.isArray(json) ? json : [json];
  } catch {
    parsed = [];
  }
  return parsed
    .filter((d) => d && d.Letter)
    .map((d): DriveInfo => ({
      letter: String(d.Letter),
      label: String(d.Label ?? ''),
      fileSystem: String(d.FileSystem ?? ''),
      sizeBytes: Number(d.Size) || 0,
      freeBytes: Number(d.Free) || 0,
      mediaType: normaliseMedia(String(d.MediaType ?? ''), String(d.BusType ?? '')),
      busType: String(d.BusType ?? ''),
      health: String(d.Health ?? 'Unknown'),
    }));
}

export async function optimizeVolume(
  letter: string,
  action: OptimizeAction,
  mediaType: MediaType
): Promise<OptimizeResult> {
  const started = Date.now();
  const L = letter.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (!L) {
    return { letter, action, ok: false, message: 'Invalid drive letter.', durationMs: 0 };
  }

  let effective = action;
  if (action === 'defrag' && mediaType !== 'HDD') {
    effective = 'retrim';
  }

  if (effective === 'analyze') {
    const res = await run('defrag.exe', [`${L}:`, '/A', '/V'], { timeout: 120000 });
    const out = `${res.stdout}\n${res.stderr}`;
    const m = out.match(/fragmented[^=]*=\s*(\d+)\s*%/i) || out.match(/(\d+)\s*%\s*fragment/i);
    const frag = m ? parseInt(m[1], 10) : null;
    return {
      letter: L,
      action: 'analyze',
      ok: res.ok,
      message: res.ok
        ? frag != null
          ? `${L}: is ${frag}% fragmented.`
          : `Analyzed ${L}:.`
        : 'Analyze failed — Administrator required.',
      fragmentationPct: frag,
      durationMs: Date.now() - started,
    };
  }

  const flag = effective === 'retrim' ? '-ReTrim' : '-Defrag';
  const res = await powershell(
    `Optimize-Volume -DriveLetter ${L} ${flag} -ErrorAction Stop; 'OK'`,
    600000
  );
  const ok = res.ok && /OK/.test(res.stdout);
  const label = effective === 'retrim' ? 'TRIM' : 'Defragmentation';
  return {
    letter: L,
    action: effective,
    ok,
    message: ok
      ? `${label} of ${L}: complete.`
      : `${label} of ${L}: failed — Administrator required (or volume busy).`,
    durationMs: Date.now() - started,
  };
}

function parseSizeToBytes(text: string): number | null {
  const m = text.match(/([\d.]+)\s*(KB|MB|GB|TB)/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  const mult: Record<string, number> = {
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  };
  return Math.round(n * (mult[unit] ?? 1));
}

export async function analyzeComponentStore(): Promise<ComponentStoreReport> {
  const res = await run(
    'dism.exe',
    ['/Online', '/Cleanup-Image', '/AnalyzeComponentStore'],
    { timeout: 180000 }
  );
  const out = res.stdout || res.stderr;
  const recommended = /Cleanup Recommended\s*:\s*Yes/i.test(out);
  const reclaimLine =
    out.match(/Actual Size of Component Store\s*:\s*([\d.]+\s*\wB)/i)?.[1] ?? '';
  const reclaimableBytes = reclaimLine ? parseSizeToBytes(reclaimLine) : null;
  return {
    reclaimableBytes,
    recommended,
    raw: out.split(/\r?\n/).filter((l) => l.trim()).slice(-16).join('\n'),
  };
}

export async function cleanComponentStore(
  resetBase: boolean
): Promise<{ ok: boolean; message: string }> {
  const args = ['/Online', '/Cleanup-Image', '/StartComponentCleanup'];
  if (resetBase) args.push('/ResetBase');
  const res = await run('dism.exe', args, { timeout: 1_200_000 });
  const out = `${res.stdout}\n${res.stderr}`;
  const ok = res.ok && /completed successfully/i.test(out);
  return {
    ok,
    message: ok
      ? resetBase
        ? 'Component store cleaned (base reset).'
        : 'Component store cleaned.'
      : 'DISM cleanup failed — Administrator required.',
  };
}
