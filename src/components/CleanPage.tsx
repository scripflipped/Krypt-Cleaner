import { useMemo } from 'react';
import { ShieldAlert, Sparkles, Trash2 } from 'lucide-react';
import type { CleanGroup } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { CleanList } from '@/components/CleanList';
import { AdminBanner } from '@/components/AdminBanner';
import { useCleaner } from '@/state/cleaner';
import { formatBytes } from '@/lib/format';

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  groups: CleanGroup[];
  groupByApp?: boolean;
  hideAbsent?: boolean;
}

export function CleanPage({ eyebrow, title, description, groups, groupByApp, hideAbsent }: Props) {
  const { targets, selected, estimatedBytes, runIds, cleaning, selectDefaults } = useCleaner();

  const shown = useMemo(
    () => targets.filter((t) => groups.includes(t.group)),
    [targets, groups]
  );
  const selectedShown = useMemo(
    () => shown.filter((t) => selected.has(t.id)).map((t) => t.id),
    [shown, selected]
  );
  const bytes = estimatedBytes(selectedShown);
  const hasRisky = shown.some((t) => selected.has(t.id) && t.risk === 'risky');

  const clean = async () => {
    if (!selectedShown.length) return;
    if (hasRisky) {
      const ok = await window.krypt.dialog.confirm({
        title: 'Run a risky clean?',
        message: 'Some selected items permanently delete data.',
        detail:
          'Items marked “Risky” (e.g. Recycle Bin, saved passwords, event logs) cannot be undone. Continue?',
        destructive: true,
      });
      if (!ok) return;
    }
    await runIds(selectedShown);
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={
          <Button variant="ghost" size="sm" icon={<Sparkles size={14} />} onClick={selectDefaults}>
            Reset to safe defaults
          </Button>
        }
      />

      <AdminBanner targets={shown} />

      <CleanList targets={shown} groupByApp={groupByApp} hideAbsent={hideAbsent} />

      <div className="sticky bottom-0 -mx-10 px-10 pt-3">
        <div className="rounded-2xl border border-white/10 bg-krypt-void/90 backdrop-blur-md shadow-glow-sm px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="text-sm text-white/60">
            <span className="text-white font-semibold">{selectedShown.length}</span> selected
            {bytes > 0 && (
              <>
                {' · '}
                <span className="text-white font-semibold">{formatBytes(bytes)}</span> to free
              </>
            )}
            {hasRisky && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-300/90 text-xs">
                <ShieldAlert size={12} /> includes risky items
              </span>
            )}
          </div>
          <Button
            variant="gradient"
            icon={<Trash2 size={15} />}
            loading={cleaning}
            disabled={!selectedShown.length}
            onClick={clean}
          >
            Clean selected
          </Button>
        </div>
      </div>
    </div>
  );
}
