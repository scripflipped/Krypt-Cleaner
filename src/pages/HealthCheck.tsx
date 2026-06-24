import { useMemo } from 'react';
import { RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import type { CleanGroup } from '@shared/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminBanner } from '@/components/AdminBanner';
import { useCleaner } from '@/state/cleaner';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Route } from '@/App';

const GROUP_LABEL: Record<CleanGroup, string> = {
  system: 'System junk',
  browsers: 'Browser caches',
  apps: 'App & game caches',
  privacy: 'Privacy traces',
};

export function HealthCheck({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const { targets, scans, results, isAdmin, scanning, cleaning, rescan, runIds } = useCleaner();

  const safe = useMemo(
    () =>
      targets.filter(
        (t) => t.risk === 'safe' && !(t.requiresAdmin && !isAdmin) && scans[t.id]?.present !== false
      ),
    [targets, scans, isAdmin]
  );
  const safeIds = safe.map((t) => t.id);
  const reclaimable = safeIds.reduce((s, id) => s + (scans[id]?.bytes ?? 0), 0);

  const byGroup = useMemo(() => {
    const m: Record<string, { bytes: number; count: number }> = {};
    for (const t of safe) {
      const b = scans[t.id]?.bytes ?? 0;
      if (b <= 0) continue;
      (m[t.group] ??= { bytes: 0, count: 0 });
      m[t.group].bytes += b;
      m[t.group].count += 1;
    }
    return m;
  }, [safe, scans]);

  const freedTotal = results
    ? safeIds.reduce((s, id) => s + (results[id]?.bytesFreed ?? 0), 0)
    : 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Overview"
        title="Health Check"
        description="One click scans every safe cleaning target on your PC and tells you exactly how much you can reclaim — then clears it. Nothing risky runs here."
        action={
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} loading={scanning} onClick={rescan}>
            Re-scan
          </Button>
        }
      />

      <AdminBanner targets={targets} />

      <Card variant="strong" className="p-8">
        <div className="flex items-center gap-10">
          <div className="relative w-44 h-44 shrink-0">
            <div
              className={cn(
                'absolute inset-0 rounded-full',
                scanning && 'animate-spin-slow'
              )}
              style={{
                background:
                  'conic-gradient(from 180deg, #6366F1, #A855F7, #EC4899, #6366F1)',
                mask: 'radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))',
                WebkitMask:
                  'radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))',
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                {scanning ? 'Scanning' : freedTotal > 0 ? 'Freed' : 'Reclaimable'}
              </div>
              <div className="text-2xl font-bold text-white tabular-nums mt-0.5">
                {scanning ? '…' : formatBytes(freedTotal > 0 ? freedTotal : reclaimable)}
              </div>
              <div className="text-[11px] text-white/40 mt-0.5">{safe.length} targets</div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(GROUP_LABEL) as CleanGroup[]).map((g) => {
                const data = byGroup[g];
                return (
                  <div
                    key={g}
                    className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                  >
                    <div className="text-xs text-white/50">{GROUP_LABEL[g]}</div>
                    <div className="text-lg font-semibold text-white mt-0.5 tabular-nums">
                      {data ? formatBytes(data.bytes) : '0 B'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 mt-5">
              <Button
                variant="gradient"
                icon={<Trash2 size={15} />}
                loading={cleaning}
                disabled={!safeIds.length || reclaimable <= 0}
                onClick={() => runIds(safeIds)}
              >
                Clean all safe ({formatBytes(reclaimable)})
              </Button>
              <Button variant="ghost" icon={<Sparkles size={14} />} onClick={() => onNavigate('cleaner')}>
                Customize
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {freedTotal > 0 && (
        <div className="flex items-center gap-2 text-sm text-emerald-300">
          <Badge tone="green">Done</Badge>
          Reclaimed {formatBytes(freedTotal)} across {safeIds.length} targets.
        </div>
      )}

      <div className="text-xs text-white/40 leading-relaxed max-w-2xl">
        Want more? The <button onClick={() => onNavigate('cleaner')} className="text-purple-300 hover:underline">Smart Cleaner</button>,{' '}
        <button onClick={() => onNavigate('browsers')} className="text-purple-300 hover:underline">Browsers</button> and{' '}
        <button onClick={() => onNavigate('privacy')} className="text-purple-300 hover:underline">Privacy</button> pages
        let you include caution/risky items like browser cookies, the Recycle Bin and saved passwords.
      </div>
    </div>
  );
}
