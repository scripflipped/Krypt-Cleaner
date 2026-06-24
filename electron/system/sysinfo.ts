import os from 'node:os';
import si from 'systeminformation';
import type { LiveMetrics, SystemInfo } from '../../shared/types';
import { isAdmin } from './admin';

function inferWindowsVersion(release: string, build: string): 10 | 11 | 0 {
  const buildNum = parseInt(build, 10);
  if (!Number.isFinite(buildNum)) return 0;
  if (buildNum >= 22000) return 11;
  if (buildNum >= 10240) return 10;
  return 0;
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const [osData, cpu, mem, disks, admin] = await Promise.all([
    si.osInfo(),
    si.cpu(),
    si.mem(),
    si.fsSize(),
    isAdmin(),
  ]);

  const build = osData.build ?? '';
  const version = inferWindowsVersion(osData.release ?? '', build);

  return {
    hostname: os.hostname(),
    username: os.userInfo().username,
    isAdmin: admin,
    os: {
      platform: osData.platform,
      distro: osData.distro,
      release: osData.release,
      build,
      arch: osData.arch,
      version,
    },
    cpu: {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
      speed: cpu.speed,
    },
    memory: {
      total: mem.total,
      available: mem.available,
      used: mem.used,
    },
    disks: disks
      .filter((d) => d.size > 0)
      .map((d) => ({
        device: d.fs,
        type: d.type,
        size: d.size,
        used: d.used,
        mount: d.mount,
      })),
  };
}

export async function getLiveMetrics(): Promise<LiveMetrics> {
  const [load, mem] = await Promise.all([si.currentLoad(), si.mem()]);
  return {
    cpu: load.currentLoad,
    memory: (mem.used / mem.total) * 100,
    uptime: os.uptime(),
  };
}
