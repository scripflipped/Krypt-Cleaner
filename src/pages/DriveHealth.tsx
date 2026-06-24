import { useEffect, useState, type ReactNode } from 'react';
import { Activity, HardDrive, RefreshCw, ShieldAlert, Snowflake, Thermometer, Zap } from 'lucide-react';
import type { DriveReliability } from '@shared/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { formatGB } from '@/lib/format';
import { cn } from '@/lib/cn';

export function DriveHealth() {
  const toast = useToast();
  const [drives, setDrives] = useState<DriveReliability[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    window.krypt.system.isAdmin().then(setIsAdmin).catch(() => {});
  }, []);

  const countersMissing =
    !!drives &&
    drives.length > 0 &&
    drives.every((d) => d.wearPct == null && d.temperatureC == null && d.powerOnHours == null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await window.krypt.health.drives();
      setDrives(d);
    } catch (e) {
      toast.error('Could not read drive health', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const elevate = async () => {
    try {
      const res = await window.krypt.system.relaunchAsAdmin();
      if (!res.ok) toast.error('Could not relaunch as Administrator', res.message);
    } catch (e) {
      toast.error('Could not relaunch as Administrator', (e as Error).message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Disk"
        title="Drive Health"
        description="SMART-style health for every physical disk: overall status, SSD wear, temperature, power-on hours and error counters. Read-only — Krypt never writes to your drives here."
        action={
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} loading={loading} onClick={load}>
            Refresh
          </Button>
        }
      />

      {!isAdmin && countersMissing && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-start gap-2.5 min-w-0">
            <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/80 leading-relaxed">
              Health status is shown, but <span className="font-semibold">SSD wear, temperature and
              power-on hours need Administrator</span> — Windows only exposes the reliability
              counters to elevated processes.
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<ShieldAlert size={14} />}
            className="shrink-0"
            onClick={elevate}
          >
            Relaunch as Admin
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {drives?.map((d, i) => {
          const healthy = d.health === 'Healthy';
          const wear = d.wearPct;
          return (
            <Card key={i} variant="strong" className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center text-purple-300 shrink-0">
                  <HardDrive size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate" title={d.friendlyName}>
                    {d.friendlyName}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge tone={d.mediaType === 'SSD' ? 'indigo' : d.mediaType === 'HDD' ? 'purple' : 'muted'}>
                      {d.mediaType === 'SSD' ? <Zap size={10} /> : <Snowflake size={10} />}
                      {d.mediaType}
                    </Badge>
                    {d.busType && <Badge tone="muted">{d.busType}</Badge>}
                    <Badge tone={healthy ? 'green' : 'amber'}>{d.health}</Badge>
                  </div>
                </div>
                <div className="text-right text-xs text-white/50 shrink-0">{formatGB(d.sizeBytes)}</div>
              </div>

              {wear != null && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/50">Endurance used</span>
                    <span className="text-white/80 tabular-nums">{wear}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        wear > 80 ? 'bg-red-500' : wear > 50 ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      )}
                      style={{ width: `${Math.min(100, wear)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <Metric icon={<Thermometer size={13} />} label="Temp" value={d.temperatureC != null ? `${d.temperatureC}°C` : '—'} />
                <Metric icon={<Activity size={13} />} label="Power-on" value={d.powerOnHours != null ? `${d.powerOnHours}h` : '—'} />
                <Metric
                  icon={<Activity size={13} />}
                  label="Errors"
                  value={
                    d.readErrorsTotal != null || d.writeErrorsTotal != null
                      ? `${(d.readErrorsTotal ?? 0) + (d.writeErrorsTotal ?? 0)}`
                      : '—'
                  }
                />
              </div>
            </Card>
          );
        })}
      </div>

      {drives && drives.length === 0 && (
        <Card variant="flat" className="py-12 text-center border-dashed text-sm text-white/50">
          No physical disks reported. Some virtualized or USB drives don’t expose SMART data.
        </Card>
      )}
      {!drives && (
        <Card variant="flat" className="py-12 text-center text-sm text-white/40">Reading drive health…</Card>
      )}

      <div className="text-xs text-white/35 leading-relaxed max-w-2xl">
        Reliability counters come from Windows’ storage stack and depend on your drive and driver —
        many consumer drives report only a subset. A status other than “Healthy” or rising error
        counts are your cue to back up and plan a replacement.
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] py-2">
      <div className="flex items-center justify-center gap-1 text-white/40 text-[10px] uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold text-white mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}
