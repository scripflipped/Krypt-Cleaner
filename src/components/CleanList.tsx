import { useMemo } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { CleanTargetMeta } from '@shared/types';
import { Badge, RiskBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { DynIcon } from '@/components/ui/DynIcon';
import { useCleaner } from '@/state/cleaner';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/cn';

interface Props {
  targets: CleanTargetMeta[];
  groupByApp?: boolean;
  hideAbsent?: boolean;
}

export function CleanList({ targets, groupByApp, hideAbsent }: Props) {
  const { scans, selected, results, isAdmin, toggle, setSelected } = useCleaner();

  const visible = useMemo(
    () =>
      targets.filter((t) => {
        if (!hideAbsent) return true;
        const s = scans[t.id];
        return !s || s.present;
      }),
    [targets, scans, hideAbsent]
  );

  if (!visible.length) {
    return (
      <Card variant="flat" className="py-14 text-center border-dashed">
        <div className="text-sm text-white/50">Nothing here on this machine.</div>
      </Card>
    );
  }

  const sections = groupByApp ? groupSections(visible) : [{ label: '', items: visible }];

  return (
    <div className="space-y-5">
      {sections.map((section) => {
        const ids = section.items.map((t) => t.id);
        const selectable = section.items.filter((t) => !(t.requiresAdmin && !isAdmin)).map((t) => t.id);
        const selCount = selectable.filter((id) => selected.has(id)).length;
        const allSel = selectable.length > 0 && selCount === selectable.length;
        const someSel = selCount > 0 && !allSel;
        const sectionBytes = ids.reduce((s, id) => s + (scans[id]?.bytes ?? 0), 0);

        return (
          <div key={section.label || 'all'}>
            {section.label && (
              <div className="flex items-center gap-3 px-1 mb-2">
                <Checkbox
                  checked={allSel}
                  indeterminate={someSel}
                  onChange={() => setSelected(selectable, !allSel)}
                />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                  {section.label}
                </span>
                <span className="text-[11px] text-white/30 font-mono">
                  {formatBytes(sectionBytes)}
                </span>
              </div>
            )}
            <Card variant="strong" className="overflow-hidden">
              {section.items.map((t, i) => {
                const s = scans[t.id];
                const r = results?.[t.id];
                const adminLocked = t.requiresAdmin && !isAdmin;
                const isSel = selected.has(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => !adminLocked && toggle(t.id)}
                    className={cn(
                      'flex items-start gap-3.5 px-5 py-3.5 border-b border-white/5 last:border-b-0 transition-colors',
                      adminLocked ? 'opacity-60' : 'cursor-pointer hover:bg-white/[0.02]',
                      i === 0 && section.label === '' && 'rounded-t-2xl'
                    )}
                  >
                    <Checkbox checked={isSel} disabled={adminLocked} onChange={() => toggle(t.id)} />
                    <DynIcon
                      name={t.icon}
                      size={17}
                      className={cn('mt-0.5 shrink-0', isSel ? 'text-purple-300' : 'text-white/40')}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{t.name}</span>
                        {t.risk !== 'safe' && <RiskBadge risk={t.risk} />}
                        {adminLocked && (
                          <Badge tone="amber">
                            <ShieldAlert size={10} /> Admin
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5 leading-relaxed">
                        {t.description}
                      </div>
                      {s?.note && s.present && (
                        <div className="text-[11px] text-amber-300/80 mt-1">{s.note}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-right pt-0.5 min-w-[84px]">
                      {r ? (
                        r.error ? (
                          <Badge tone="red" className="max-w-[160px] truncate">
                            {r.error.slice(0, 36)}
                          </Badge>
                        ) : (
                          <Badge tone="green">Freed {formatBytes(r.bytesFreed)}</Badge>
                        )
                      ) : s ? (
                        <span className="text-sm font-mono text-white/70">
                          {s.bytes > 0 ? formatBytes(s.bytes) : s.present ? '—' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-white/30">scanning…</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        );
      })}
    </div>
  );
}

function groupSections(items: CleanTargetMeta[]): Array<{ label: string; items: CleanTargetMeta[] }> {
  const map = new Map<string, CleanTargetMeta[]>();
  for (const t of items) {
    const key = t.appLabel ?? 'Other';
    (map.get(key) ?? map.set(key, []).get(key)!).push(t);
  }
  return [...map.entries()].map(([label, items]) => ({ label, items }));
}
