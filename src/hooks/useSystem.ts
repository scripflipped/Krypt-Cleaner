import { useEffect, useState } from 'react';
import type { LiveMetrics, SystemInfo } from '@shared/types';

export function useSystemInfo(): SystemInfo | null {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  useEffect(() => {
    let alive = true;
    window.krypt.system
      .info()
      .then((i) => alive && setInfo(i))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return info;
}

export function useLiveMetrics(intervalMs = 2000): LiveMetrics | null {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = () =>
      window.krypt.system
        .metrics()
        .then((m) => alive && setMetrics(m))
        .catch(() => {});
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);
  return metrics;
}
