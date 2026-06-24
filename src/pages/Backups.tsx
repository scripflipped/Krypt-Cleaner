import { useEffect, useState } from 'react';
import { Database, Info, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { BackupMeta } from '@shared/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { formatBytes, formatRelative } from '@/lib/format';

export function Backups() {
  const toast = useToast();
  const [backups, setBackups] = useState<BackupMeta[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => window.krypt.backups.list().then(setBackups).catch(() => setBackups([]));
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setBusy(true);
    try {
      const b = await window.krypt.backups.create();
      toast.success('Snapshot saved', `${b.entryCount} privacy registry keys captured.`);
      load();
    } catch (e) {
      toast.error('Backup failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const restore = async (b: BackupMeta) => {
    const ok = await window.krypt.dialog.confirm({
      title: 'Restore this snapshot?',
      message: b.name,
      detail: 'This re-imports the captured registry privacy keys, putting those values back the way they were when the snapshot was taken.',
    });
    if (!ok) return;
    const res = await window.krypt.backups.restore(b.id);
    if (res.ok) toast.success('Snapshot restored', `${res.restored} keys re-imported.`);
    else toast.warn('Restored with issues', `${res.restored} keys re-imported, ${res.failed} failed.`);
  };

  const del = async (b: BackupMeta) => {
    const ok = await window.krypt.dialog.confirm({
      title: 'Delete this snapshot?',
      message: b.name,
      detail: 'The snapshot file is removed. This does not change any current settings.',
      destructive: true,
    });
    if (!ok) return;
    await window.krypt.backups.delete(b.id);
    toast.info('Snapshot deleted');
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Safety"
        title="Backups"
        description="Privacy registry traces are snapshotted before they’re cleared, so you can roll them back. You can also take a manual snapshot any time."
        action={
          <Button variant="gradient" size="sm" icon={<Plus size={14} />} loading={busy} onClick={create}>
            New snapshot
          </Button>
        }
      />

      <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/[0.05] px-4 py-3 flex items-start gap-2.5">
        <Info size={16} className="text-indigo-300 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-100/80 leading-relaxed">
          Snapshots only cover <span className="font-semibold">registry privacy keys</span> (recent
          docs, Run history, typed URLs, etc.). Deleted files — temp, caches — are gone for good and
          can’t be restored, which is exactly why those caches are safe to remove.
        </div>
      </div>

      <div className="space-y-2">
        {backups?.map((b) => (
          <Card key={b.id} variant="strong" className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center text-purple-300 shrink-0">
                <Database size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">{b.name}</div>
                <div className="text-xs text-white/50 mt-0.5">
                  {formatRelative(b.createdAt)} · <Badge tone="muted">{b.entryCount} keys</Badge>{' '}
                  <span className="ml-1">{formatBytes(b.sizeBytes)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="secondary" size="sm" icon={<RotateCcw size={14} />} onClick={() => restore(b)}>
                  Restore
                </Button>
                <Button variant="ghost" size="sm" onClick={() => del(b)} aria-label="Delete">
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {backups?.length === 0 && (
          <Card variant="flat" className="py-12 text-center border-dashed text-sm text-white/50">
            No snapshots yet. One is created automatically the first time you clean a privacy item.
          </Card>
        )}
        {!backups && (
          <Card variant="flat" className="py-12 text-center text-sm text-white/40">Loading…</Card>
        )}
      </div>
    </div>
  );
}
