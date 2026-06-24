import type { DriveReliability, MediaType } from '../../shared/types';
import { powershell } from './shell';

function normaliseMedia(mediaType: string, busType: string): MediaType {
  const m = (mediaType || '').toLowerCase();
  const b = (busType || '').toLowerCase();
  if (m.includes('ssd')) return 'SSD';
  if (m.includes('hdd')) return 'HDD';
  if (b.includes('nvme')) return 'SSD';
  return 'Unknown';
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function listDriveHealth(): Promise<DriveReliability[]> {
  const script = `
$ErrorActionPreference='SilentlyContinue'
$disks = Get-PhysicalDisk
$out = foreach ($d in $disks) {
  $rc = $d | Get-StorageReliabilityCounter -ErrorAction SilentlyContinue
  [pscustomobject]@{
    FriendlyName     = [string]$d.FriendlyName
    MediaType        = [string]$d.MediaType
    BusType          = [string]$d.BusType
    Size             = [double]$d.Size
    Health           = [string]$d.HealthStatus
    Wear             = $rc.Wear
    Temperature      = $rc.Temperature
    PowerOnHours     = $rc.PowerOnHours
    ReadErrorsTotal  = $rc.ReadErrorsTotal
    WriteErrorsTotal = $rc.WriteErrorsTotal
    Serial           = [string]$d.SerialNumber
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
    .filter(Boolean)
    .map((d): DriveReliability => ({
      friendlyName: String(d.FriendlyName ?? 'Unknown drive'),
      mediaType: normaliseMedia(String(d.MediaType ?? ''), String(d.BusType ?? '')),
      busType: String(d.BusType ?? ''),
      sizeBytes: Number(d.Size) || 0,
      health: String(d.Health ?? 'Unknown'),
      wearPct: num(d.Wear),
      temperatureC: num(d.Temperature),
      powerOnHours: num(d.PowerOnHours),
      readErrorsTotal: num(d.ReadErrorsTotal),
      writeErrorsTotal: num(d.WriteErrorsTotal),
      serial: d.Serial ? String(d.Serial).trim() : undefined,
    }));
}
