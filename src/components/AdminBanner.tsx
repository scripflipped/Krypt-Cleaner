import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { CleanTargetMeta } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { useCleaner } from '@/state/cleaner';
import { useToast } from '@/components/ui/Toast';

export function AdminBanner({ targets }: { targets?: CleanTargetMeta[] }) {
  const { isAdmin } = useCleaner();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (isAdmin) return null;
  if (targets && !targets.some((t) => t.requiresAdmin)) return null;

  const relaunch = async () => {
    setBusy(true);
    try {
      const res = await window.krypt.system.relaunchAsAdmin();
      if (!res.ok && res.message) toast.warn('Could not relaunch', res.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-start gap-2.5 min-w-0">
        <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-amber-200">Not running as Administrator</div>
          <div className="text-xs text-amber-200/70 mt-0.5 leading-relaxed">
            Items marked “Admin” (Windows temp, Prefetch, update caches, disk optimization) are
            locked until you relaunch with elevated rights.
          </div>
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        icon={<ShieldAlert size={14} />}
        loading={busy}
        onClick={relaunch}
        className="shrink-0"
      >
        Relaunch as Admin
      </Button>
    </div>
  );
}
