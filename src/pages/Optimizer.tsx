import { useEffect, useState } from 'react';
import { Gauge, HardDrive, Layers, RefreshCw, Search, Snowflake, Zap } from 'lucide-react';
import type { ComponentStoreReport, DriveInfo, OptimizeResult } from '@shared/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminBanner } from '@/components/AdminBanner';
import { useToast } from '@/components/ui/Toast';
import { formatBytes, formatGB } from '@/lib/format';

export function Optimizer() {
  const toast = useToast();
  const [drives, setDrives] = useState<DriveInfo[] | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [last, setLast] = useState<Record<string, OptimizeResult>>({});

  const [store, setStore] = useState<ComponentStoreReport | null>(null);
  const [storeBusy, setStoreBusy] = useState(false);

  const load = () =>
    window.krypt.disk
      .drives()
      .then(setDrives)
      .catch((e) => toast.error('Could not list drives', (e as Error).message));

  useEffect(() => {
    load();
  }, []);

  const setDriveBusy = (letter: string, v: boolean) =>
    setBusy((b) => ({ ...b, [letter]: v }));

  const run = async (d: DriveInfo, action: 'analyze' | 'optimize') => {
    const effective =
      action === 'analyze' ? 'analyze' : d.mediaType === 'HDD' ? 'defrag' : 'retrim';
    setDriveBusy(d.letter, true);
    try {
      const res = await window.krypt.disk.optimize(d.letter, effective, d.mediaType);
      setLast((l) => ({ ...l, [d.letter]: res }));
      if (res.ok) toast.success(`${d.letter}:`, res.message);
      else toast.warn(`${d.letter}:`, res.message);
      load();
    } finally {
      setDriveBusy(d.letter, false);
    }
  };

  const analyzeStore = async () => {
    setStoreBusy(true);
    try {
      const r = await window.krypt.disk.analyzeStore();
      setStore(r);
      toast.info(
        'Component store analyzed',
        r.recommended ? 'Windows recommends a cleanup.' : 'No cleanup needed right now.'
      );
    } catch (e) {
      toast.error('Analyze failed', (e as Error).message);
    } finally {
      setStoreBusy(false);
    }
  };

  const cleanStore = async (resetBase: boolean) => {
    if (resetBase) {
      const ok = await window.krypt.dialog.confirm({
        title: 'Reset the update base?',
        message: 'This permanently removes all superseded Windows components.',
        detail:
          'After /ResetBase you can no longer uninstall currently-installed Windows updates. The cleanup itself is safe, but irreversible.',
        destructive: true,
      });
      if (!ok) return;
    }
    setStoreBusy(true);
    try {
      const r = await window.krypt.disk.cleanStore(resetBase);
      if (r.ok) toast.success('Component store cleaned', r.message);
      else toast.warn('Cleanup incomplete', r.message);
    } finally {
      setStoreBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Disk"
        title="Disk Optimizer"
        description="Krypt detects each drive’s type and does the right thing — TRIM for SSDs (never a mechanical defrag), classic defragmentation only for spinning HDDs. Optimization needs Administrator."
        action={
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={load}>
            Refresh
          </Button>
        }
      />

      <AdminBanner />

      <div className="space-y-3">
        {drives?.length === 0 && (
          <Card variant="flat" className="py-12 text-center border-dashed text-sm text-white/50">
            No fixed drives detected.
          </Card>
        )}
        {drives?.map((d) => {
          const frag = last[d.letter]?.fragmentationPct;
          const isSSD = d.mediaType === 'SSD';
          return (
            <Card key={d.letter} variant="strong" className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center text-purple-300 shrink-0">
                  <HardDrive size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-white">
                      {d.letter}: {d.label && <span className="text-white/50 font-normal">{d.label}</span>}
                    </span>
                    <Badge tone={isSSD ? 'indigo' : d.mediaType === 'HDD' ? 'purple' : 'muted'}>
                      {isSSD ? <Zap size={10} /> : <Snowflake size={10} />}
                      {d.mediaType}
                    </Badge>
                    {d.busType && <Badge tone="muted">{d.busType}</Badge>}
                    <Badge tone={d.health === 'Healthy' ? 'green' : 'amber'}>{d.health}</Badge>
                  </div>
                  <div className="text-xs text-white/50 mt-1 tabular-nums">
                    {formatGB(d.sizeBytes - d.freeBytes)} used · {formatGB(d.freeBytes)} free of{' '}
                    {formatGB(d.sizeBytes)}
                    {typeof frag === 'number' && <> · {frag}% fragmented</>}
                  </div>
                  <div className="h-1.5 mt-2 rounded-full bg-white/5 overflow-hidden max-w-md">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                      style={{
                        width: `${Math.min(100, ((d.sizeBytes - d.freeBytes) / d.sizeBytes) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Search size={14} />}
                    loading={busy[d.letter]}
                    onClick={() => run(d, 'analyze')}
                  >
                    Analyze
                  </Button>
                  <Button
                    variant="gradient"
                    size="sm"
                    icon={isSSD ? <Zap size={14} /> : <Gauge size={14} />}
                    loading={busy[d.letter]}
                    onClick={() => run(d, 'optimize')}
                  >
                    {isSSD ? 'TRIM' : 'Optimize'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
        {!drives && (
          <Card variant="flat" className="py-12 text-center text-sm text-white/40">
            Reading drives…
          </Card>
        )}
      </div>

      <Card className="p-6">
        <CardHeader
          icon={<Layers size={16} />}
          title="Windows component store (WinSxS)"
          subtitle="Superseded update components pile up over time. Analyze first, then clean. Needs Administrator."
        />
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="secondary" size="sm" icon={<Search size={14} />} loading={storeBusy} onClick={analyzeStore}>
            Analyze store
          </Button>
          <Button variant="secondary" size="sm" loading={storeBusy} onClick={() => cleanStore(false)}>
            Clean store
          </Button>
          <Button variant="destructive" size="sm" loading={storeBusy} onClick={() => cleanStore(true)}>
            Clean + reset base
          </Button>
          {store && (
            <div className="text-xs text-white/55 ml-1">
              {store.reclaimableBytes != null && (
                <>Store size ≈ {formatBytes(store.reclaimableBytes)} · </>
              )}
              <span className={store.recommended ? 'text-amber-300' : 'text-emerald-300'}>
                {store.recommended ? 'cleanup recommended' : 'no cleanup needed'}
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
