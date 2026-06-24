import { useEffect, useState } from 'react';
import { CopyCheck, FolderOpen, Search, Trash2 } from 'lucide-react';
import type { DuplicateProgress, DuplicateResult } from '@shared/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { PageHeader } from '@/components/ui/PageHeader';
import { Progress } from '@/components/ui/Progress';
import { useToast } from '@/components/ui/Toast';
import { formatBytes, formatCount } from '@/lib/format';

const MIN_SIZES = [
  { label: '1 MB+', bytes: 1024 * 1024 },
  { label: '10 MB+', bytes: 10 * 1024 * 1024 },
  { label: '100 MB+', bytes: 100 * 1024 * 1024 },
];

export function Duplicates() {
  const toast = useToast();
  const [root, setRoot] = useState('');
  const [minSize, setMinSize] = useState(MIN_SIZES[0].bytes);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<DuplicateProgress | null>(null);
  const [result, setResult] = useState<DuplicateResult | null>(null);
  const [toDelete, setToDelete] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const off = window.krypt.duplicates.onProgress(setProgress);
    return off;
  }, []);

  const pick = async () => {
    const p = await window.krypt.dialog.pickFolder();
    if (p) setRoot(p);
  };

  const scan = async () => {
    if (!root) {
      toast.warn('Pick a folder first', 'Choose where to look for duplicates.');
      return;
    }
    setScanning(true);
    setResult(null);
    setToDelete(new Set());
    setProgress(null);
    try {
      const res = await window.krypt.duplicates.run(root, minSize);
      setResult(res);
      toast.success(
        `${res.totalGroups} duplicate groups`,
        `${formatBytes(res.wastedBytes)} reclaimable.`
      );
    } catch (e) {
      toast.error('Scan failed', (e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const toggle = (path: string) =>
    setToDelete((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  const keepOne = (paths: string[]) =>
    setToDelete((prev) => {
      const next = new Set(prev);
      paths.slice(1).forEach((p) => next.add(p));
      return next;
    });

  const selectedBytes = (result?.groups ?? [])
    .flatMap((g) => g.files.map((f) => ({ path: f.path, size: g.size })))
    .filter((f) => toDelete.has(f.path))
    .reduce((s, f) => s + f.size, 0);

  const deleteSelected = async () => {
    if (!toDelete.size) return;
    const ok = await window.krypt.dialog.confirm({
      title: `Delete ${toDelete.size} duplicate files?`,
      message: `This frees about ${formatBytes(selectedBytes)}.`,
      detail: 'Files are permanently deleted (not sent to the Recycle Bin). Make sure you kept at least one copy of each.',
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await window.krypt.clean.deleteFiles([...toDelete]);
      toast.success('Duplicates removed', `${res.removed} files · ${formatBytes(res.bytes)} freed.`);
      setResult((r) =>
        r
          ? {
              ...r,
              groups: r.groups
                .map((g) => ({ ...g, files: g.files.filter((f) => !toDelete.has(f.path)) }))
                .filter((g) => g.files.length > 1),
            }
          : r
      );
      setToDelete(new Set());
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        eyebrow="Disk"
        title="Duplicate Finder"
        description="Finds byte-for-byte identical files using a fast size → signature → full-hash pass, so only true matches are reported. Krypt never auto-deletes — you choose which copy to keep."
      />

      <Card variant="strong" className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 min-w-0">
            <FolderOpen size={15} className="text-white/40 shrink-0" />
            <input
              value={root}
              onChange={(e) => setRoot(e.target.value)}
              spellCheck={false}
              placeholder="Pick a folder to scan…"
              className="bg-transparent outline-none text-sm text-white/90 font-mono flex-1 min-w-0"
            />
          </div>
          <Button variant="secondary" icon={<FolderOpen size={14} />} onClick={pick}>
            Browse
          </Button>
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {MIN_SIZES.map((m) => (
              <button
                key={m.bytes}
                onClick={() => setMinSize(m.bytes)}
                className={
                  'px-3 py-2 text-xs transition-colors ' +
                  (minSize === m.bytes ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white')
                }
              >
                {m.label}
              </button>
            ))}
          </div>
          <Button variant="gradient" icon={<Search size={15} />} loading={scanning} onClick={scan}>
            Find
          </Button>
        </div>
        {scanning && (
          <div className="mt-3">
            <Progress indeterminate />
            <div className="text-[11px] text-white/40 mt-1.5 font-mono">
              {progress
                ? `${progress.phase} · ${formatCount(progress.scanned)} scanned · ${formatCount(
                    progress.candidates
                  )} candidates`
                : 'Starting…'}
            </div>
          </div>
        )}
      </Card>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <CopyCheck size={15} className="text-purple-300" />
            <span className="text-white font-semibold">{result.groups.length}</span> groups ·{' '}
            <span className="text-white font-semibold">{formatBytes(result.wastedBytes)}</span> reclaimable
            {result.truncated && <Badge tone="amber">capped at time budget</Badge>}
          </div>

          {result.groups.map((g) => (
            <Card key={g.hash} variant="strong" className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-white/80">
                  <span className="font-semibold">{g.files.length}×</span> {formatBytes(g.size)}
                  <span className="text-white/40 ml-2 font-mono text-xs">{g.hash}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="green">save {formatBytes(g.wastedBytes)}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => keepOne(g.files.map((f) => f.path))}>
                    Keep oldest
                  </Button>
                </div>
              </div>
              <div className="space-y-0.5">
                {g.files.map((f) => (
                  <div
                    key={f.path}
                    onClick={() => toggle(f.path)}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] cursor-pointer group"
                  >
                    <Checkbox checked={toDelete.has(f.path)} onChange={() => toggle(f.path)} />
                    <span className="flex-1 min-w-0 text-sm text-white/80 truncate font-mono" title={f.path}>
                      {f.path}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.krypt.shell.reveal(f.path);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-xs text-white/50 hover:text-white transition-opacity"
                    >
                      Reveal
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {!result.groups.length && (
            <Card variant="flat" className="py-12 text-center border-dashed text-sm text-white/50">
              No duplicates found in this folder. 🎉
            </Card>
          )}
        </div>
      )}

      {result && result.groups.length > 0 && (
        <div className="sticky bottom-0 -mx-10 px-10 pt-3">
          <div className="rounded-2xl border border-white/10 bg-krypt-void/90 backdrop-blur-md shadow-glow-sm px-5 py-3.5 flex items-center justify-between gap-4">
            <div className="text-sm text-white/60">
              <span className="text-white font-semibold">{toDelete.size}</span> marked for deletion
              {selectedBytes > 0 && (
                <>
                  {' · '}
                  <span className="text-white font-semibold">{formatBytes(selectedBytes)}</span>
                </>
              )}
            </div>
            <Button
              variant="destructive"
              icon={<Trash2 size={15} />}
              loading={deleting}
              disabled={!toDelete.size}
              onClick={deleteSelected}
            >
              Delete selected
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
