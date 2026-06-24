import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  ChevronRight,
  CopyCheck,
  Gauge,
  HardDrive,
  HeartPulse,
  Search,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  UserRound,
} from 'lucide-react';
import type { AppSettings } from '@shared/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { useLiveMetrics, useSystemInfo } from '@/hooks/useSystem';
import { useCleaner } from '@/state/cleaner';
import { formatBytes, formatGB, formatRelative, formatUptime } from '@/lib/format';
import type { Route } from '@/App';

export function Dashboard({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const info = useSystemInfo();
  const live = useLiveMetrics();
  const toast = useToast();
  const { targets, scans, scanning, isAdmin, rescan } = useCleaner();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [elevating, setElevating] = useState(false);
  const [username, setUsername] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    window.krypt.settings
      .get()
      .then((s) => {
        setSettings(s);
        setUsername(s.kryptUsername ?? '');
      })
      .catch(() => {});
  }, []);

  const lastClean = settings?.cleanHistory[0];

  const reclaimable = useMemo(
    () =>
      targets
        .filter(
          (t) =>
            t.risk === 'safe' &&
            !(t.requiresAdmin && !isAdmin) &&
            scans[t.id]?.present !== false
        )
        .reduce((sum, t) => sum + (scans[t.id]?.bytes ?? 0), 0),
    [targets, scans, isAdmin]
  );

  const elevate = async () => {
    setElevating(true);
    try {
      const res = await window.krypt.system.relaunchAsAdmin();
      if (!res.ok) toast.error('Could not relaunch as Administrator', res.message);
    } catch (e) {
      toast.error('Could not relaunch as Administrator', (e as Error).message);
    } finally {
      setElevating(false);
    }
  };

  const saveUsername = async () => {
    setSavingProfile(true);
    try {
      const next = await window.krypt.settings.setKryptUsername(username);
      setSettings(next);
      setUsername(next.kryptUsername);
      toast.success(
        next.kryptUsername ? 'Profile linked' : 'Profile link cleared',
        next.kryptUsername
          ? `Your Discord button now opens krypt.cc/${next.kryptUsername}.`
          : 'Your Discord button links to krypt.cc.'
      );
    } catch (e) {
      toast.error('Could not save profile', (e as Error).message);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Welcome back"
        title={info ? `Hey, ${info.username}` : 'Hey'}
        description="Free up space, clear the junk and keep your drives healthy — all in one place."
        action={
          <div className="flex items-center gap-2">
            <Badge tone={isAdmin ? 'green' : 'amber'}>
              {isAdmin ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
              {isAdmin ? 'Administrator' : 'User mode'}
            </Badge>
            {!isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                icon={<ShieldAlert size={14} />}
                loading={elevating}
                onClick={elevate}
              >
                Relaunch as Admin
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        <Card variant="strong" className="col-span-8 p-6 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_circle_at_10%_-20%,rgba(168,85,247,0.22),transparent_60%)]" />
          <div className="relative flex items-center justify-between gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                Lifetime cleaned
              </div>
              <div className="text-4xl font-bold text-white mt-1 tabular-nums title-glow">
                {settings ? formatBytes(settings.lifetimeBytesFreed) : '—'}
              </div>
              <div className="text-xs text-white/50 mt-2">
                {lastClean
                  ? `Last clean freed ${formatBytes(lastClean.bytesFreed)} · ${formatRelative(
                      lastClean.ts
                    )}`
                  : 'No cleans yet — run a Health Check to get started.'}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                {scanning ? 'Scanning…' : 'Ready to free'}
              </div>
              <div className="text-2xl font-bold text-white mt-1 tabular-nums">
                {scanning ? '…' : reclaimable > 0 ? formatBytes(reclaimable) : '—'}
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button
                  variant="gradient"
                  size="sm"
                  icon={<Search size={14} />}
                  loading={scanning}
                  onClick={rescan}
                >
                  {scanning ? 'Scanning' : reclaimable > 0 ? 'Re-scan' : 'Scan now'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<HeartPulse size={14} />}
                  onClick={() => onNavigate('health')}
                >
                  {reclaimable > 0 ? 'Review & clean' : 'Health Check'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="strong" className="col-span-4 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">System</div>
            {live && (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-300/80">
                <Activity size={11} className="animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {info ? `Windows ${info.os.version || info.os.release}` : 'Loading…'}
          </div>
          <div className="text-xs text-white/50 mt-0.5">
            Build {info?.os.build ?? '—'} · {info?.os.arch ?? '—'}
            {live ? ` · up ${formatUptime(live.uptime)}` : ''}
          </div>

          <div className="mt-4 space-y-3">
            <div className="text-[11px] text-white/55 truncate" title={info?.cpu.brand}>
              {info?.cpu.brand ?? '—'}
            </div>
            <MetricBar label="CPU" pct={live ? live.cpu : null} />
            <MetricBar
              label="RAM"
              pct={live ? live.memory : null}
              caption={
                info ? `${formatGB(info.memory.used)} / ${formatGB(info.memory.total)}` : undefined
              }
            />
          </div>
        </Card>
      </div>

      {info && info.disks.length > 0 && (
        <Card className="p-6">
          <CardHeader icon={<HardDrive size={16} />} title="Drives" subtitle="Usage per fixed volume." />
          <div className="space-y-3">
            {info.disks.map((d) => {
              const pct = d.size ? (d.used / d.size) * 100 : 0;
              return (
                <div key={d.mount}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/80 font-medium">
                      {d.mount} <span className="text-white/40 ml-1">{d.type}</span>
                    </span>
                    <span className="text-white/50 tabular-nums">
                      {formatGB(d.used)} / {formatGB(d.size)} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-[width] duration-700"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <CardHeader
          icon={<UserRound size={16} />}
          title="Krypt profile"
          subtitle="Share your Krypt profile through Discord Rich Presence — friends can open it straight from your status."
        />
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center rounded-lg border border-white/10 bg-black/40 px-3 py-2 min-w-0">
            <span className="text-sm text-white/40 font-mono shrink-0">krypt.cc/</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveUsername();
              }}
              spellCheck={false}
              placeholder="yourusername"
              className="bg-transparent outline-none text-sm text-white/90 font-mono flex-1 min-w-0"
            />
          </div>
          <Button variant="secondary" loading={savingProfile} onClick={saveUsername}>
            Save
          </Button>
        </div>
        <div className="text-xs text-white/45 mt-2">
          {settings?.kryptUsername ? (
            <>
              Your Rich Presence button reads{' '}
              <span className="text-white/70 font-medium">“My Profile”</span> and opens{' '}
              <span className="text-purple-300">krypt.cc/{settings.kryptUsername}</span>.
            </>
          ) : (
            <>Leave blank to link to krypt.cc. Add your username and the button becomes “My Profile”.</>
          )}
        </div>
      </Card>

      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 mb-3">Quick actions</div>
        <div className="grid grid-cols-4 gap-4">
          <Quick icon={<Trash2 size={18} />} title="Smart Cleaner" desc="Temp files, caches, junk." onClick={() => onNavigate('cleaner')} />
          <Quick icon={<Gauge size={18} />} title="Optimize disks" desc="TRIM SSDs, defrag HDDs." onClick={() => onNavigate('optimizer')} />
          <Quick icon={<CopyCheck size={18} />} title="Find duplicates" desc="Reclaim wasted space." onClick={() => onNavigate('duplicates')} />
          <Quick icon={<Sparkles size={18} />} title="Privacy" desc="Wipe usage traces." onClick={() => onNavigate('privacy')} />
        </div>
      </div>
    </div>
  );
}

function MetricBar({
  label,
  pct,
  caption,
}: {
  label: string;
  pct: number | null;
  caption?: string;
}) {
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const tone =
    pct == null
      ? 'from-white/15 to-white/15'
      : p < 60
        ? 'from-emerald-500 to-teal-400'
        : p < 85
          ? 'from-amber-500 to-orange-400'
          : 'from-rose-500 to-red-400';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-white/40 uppercase tracking-wider font-medium">{label}</span>
        <span className="text-white/85 tabular-nums">
          {pct == null ? '—' : `${Math.round(p)}%`}
          {caption && <span className="text-white/40 ml-1.5 normal-case">{caption}</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r transition-[width] duration-500 ${tone}`}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}

function Quick({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <Card interactive className="p-5 cursor-pointer group" onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center text-purple-300 group-hover:text-white transition-colors">
          {icon}
        </div>
        <ChevronRight size={16} className="text-white/30 group-hover:text-white/70 transition-colors" />
      </div>
      <div className="mt-4">
        <div className="text-sm font-semibold text-white tracking-tight">{title}</div>
        <div className="text-xs text-white/50 mt-1 leading-relaxed">{desc}</div>
      </div>
    </Card>
  );
}
