import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarClock, FolderOpen, Search, Trash2, TriangleAlert } from 'lucide-react';
import type { OldFilesProgress, OldFilesResult } from '@shared/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { PageHeader } from '@/components/ui/PageHeader';
import { Progress } from '@/components/ui/Progress';
import { useToast } from '@/components/ui/Toast';
import { formatBytes, formatCount, formatRelative } from '@/lib/format';

const DAY = 24 * 60 * 60 * 1000;
const AGES = [
  { label: '6 months', ms: 182 * DAY },
  { label: '1 year', ms: 365 * DAY },
  { label: '2 years', ms: 730 * DAY },
  { label: '5 years', ms: 1825 * DAY },
];
const SIZES = [
  { label: '10 MB+', bytes: 10 * 1024 * 1024 },
  { label: '100 MB+', bytes: 100 * 1024 * 1024 },
  { label: '500 MB+', bytes: 500 * 1024 * 1024 },
  { label: '1 GB+', bytes: 1024 * 1024 * 1024 },
];

type DeleteMode = 'trash' | 'permanent';
type Sort = 'size' | 'age';

export function OldFiles() {
  const toast = useToast();
  const [root, setRoot] = useState('');
  const [ageMs, setAgeMs] = useState(AGES[1].ms);
  const [minSize, setMinSize] = useState(SIZES[1].bytes);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<OldFilesProgress | null>(null);
  const [result, setResult] = useState<OldFilesResult | null>(null);
  const [toDelete, setToDelete] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>('size');
  const [mode, setMode] = useState<DeleteMode>('trash');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const off = window.krypt.oldfiles.onProgress(setProgress);
    return off;
  }, []);

  const pick = async () => {
    const p = await window.krypt.dialog.pickFolder();
    if (p) setRoot(p);
  };

  const scan = async () => {
    if (!root) {
      toast.warn('Pick a folder first', 'Choose where to look for old files.');
      return;
    }
    setScanning(true);
    setResult(null);
    setToDelete(new Set());
    setProgress(null);
    try {
      const res = await window.krypt.oldfiles.run(root, Date.now() - ageMs, minSize);
      setResult(res);
      if (res.totalMatched === 0) toast.success('Nothing stale here', 'No old files matched those filters.');
      else
        toast.success(
          `${formatCount(res.totalMatched)} old files`,
          `${formatBytes(res.totalBytes)} reclaimable.`
        );
    } catch (e) {
      toast.error('Scan failed', (e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const files = useMemo(() => {
    const list = [...(result?.files ?? [])];
    list.sort((a, b) => (sort === 'size' ? b.size - a.size : a.mtime - b.mtime));
    return list;
  }, [result, sort]);

  const toggle = (path: string) =>
    setToDelete((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  const allSelected = files.length > 0 && files.every((f) => toDelete.has(f.path));
  const toggleAll = () =>
    setToDelete(allSelected ? new Set() : new Set(files.map((f) => f.path)));

  const selectedBytes = files
    .filter((f) => toDelete.has(f.path))
    .reduce((s, f) => s + f.size, 0);

  const deleteSelected = async () => {
    if (!toDelete.size) return;
    const recycle = mode === 'trash';
    const ok = await window.krypt.dialog.confirm({
      title: recycle
        ? `Move ${toDelete.size} files to the Recycle Bin?`
        : `Permanently delete ${toDelete.size} files?`,
      message: `This affects about ${formatBytes(selectedBytes)} across ${toDelete.size} files.`,
      detail: recycle
        ? 'Files go to the Recycle Bin — you can restore them from there. Space is fully freed once you empty the bin.'
        : 'Files are permanently deleted (not sent to the Recycle Bin). This cannot be undone — make sure you no longer need them.',
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const paths = [...toDelete];
      let removed = 0;
      let bytes = 0;
      if (recycle) {
        const r = await window.krypt.files.trash(paths);
        removed = r.trashed;
        bytes = r.bytes;
      } else {
        const r = await window.krypt.clean.deleteFiles(paths);
        removed = r.removed;
        bytes = r.bytes;
      }
      toast.success(
        recycle ? 'Moved to Recycle Bin' : 'Files deleted',
        `${removed} files · ${formatBytes(bytes)}.`
      );
      setResult((r) => (r ? { ...r, files: r.files.filter((f) => !toDelete.has(f.path)) } : r));
      setToDelete(new Set());
    } catch (e) {
      toast.error('Delete failed', (e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const capped = result && result.totalMatched > result.files.length;

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        eyebrow="Disk"
        title="Old Files"
        description="Find big files you haven’t touched in years — dead tools, stale builds, forgotten archives. Sorted by size and age so you can reclaim the most space fastest. Age is based on each file’s last-modified date; nothing is auto-selected and nothing is deleted until you choose."
      />

      <Card variant="strong" className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 min-w-0">
            <FolderOpen size={15} className="text-white/40 shrink-0" />
            <input
              value={root}
              onChange={(e) => setRoot(e.target.value)}
              spellCheck={false}
              placeholder="Pick a folder to scan (e.g. your projects or Downloads)…"
              className="bg-transparent outline-none text-sm text-white/90 font-mono flex-1 min-w-0"
            />
          </div>
          <Button variant="secondary" icon={<FolderOpen size={14} />} onClick={pick}>
            Browse
          </Button>
          <Button variant="gradient" icon={<Search size={15} />} loading={scanning} onClick={scan}>
            Find
          </Button>
        </div>

        <div className="flex items-center gap-6 flex-wrap mt-3">
          <Filter label="Older than">
            {AGES.map((a) => (
              <Chip key={a.ms} active={ageMs === a.ms} onClick={() => setAgeMs(a.ms)}>
                {a.label}
              </Chip>
            ))}
          </Filter>
          <Filter label="Larger than">
            {SIZES.map((s) => (
              <Chip key={s.bytes} active={minSize === s.bytes} onClick={() => setMinSize(s.bytes)}>
                {s.label}
              </Chip>
            ))}
          </Filter>
        </div>

        {scanning && (
          <div className="mt-3">
            <Progress indeterminate />
            <div className="text-[11px] text-white/40 mt-1.5 font-mono truncate">
              {progress
                ? `${formatCount(progress.scanned)} scanned · ${formatCount(progress.matched)} matched · ${formatBytes(progress.bytes)} · ${progress.current}`
                : 'Starting…'}
            </div>
          </div>
        )}
      </Card>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <CalendarClock size={15} className="text-purple-300" />
              <span className="text-white font-semibold">{formatCount(result.totalMatched)}</span> old files ·{' '}
              <span className="text-white font-semibold">{formatBytes(result.totalBytes)}</span> reclaimable
              {result.truncated && <Badge tone="amber">capped at budget</Badge>}
              {capped && (
                <span className="text-white/40 text-xs">
                  showing largest {formatCount(result.files.length)}
                </span>
              )}
            </div>
            {files.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-white/35">Sort</span>
                <div className="flex rounded-lg border border-white/10 overflow-hidden">
                  <SortBtn active={sort === 'size'} onClick={() => setSort('size')}>
                    Largest
                  </SortBtn>
                  <SortBtn active={sort === 'age'} onClick={() => setSort('age')}>
                    Oldest
                  </SortBtn>
                </div>
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {allSelected ? 'Clear all' : 'Select all'}
                </Button>
              </div>
            )}
          </div>

          {files.length > 0 ? (
            <Card variant="strong" className="p-2">
              {files.map((f) => (
                <div
                  key={f.path}
                  onClick={() => toggle(f.path)}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] cursor-pointer group"
                >
                  <Checkbox checked={toDelete.has(f.path)} onChange={() => toggle(f.path)} />
                  <span className="text-sm font-mono text-white/70 tabular-nums w-20 shrink-0">
                    {formatBytes(f.size)}
                  </span>
                  <span className="text-xs text-white/40 tabular-nums w-28 shrink-0">
                    {formatRelative(f.mtime)}
                  </span>
                  <span className="flex-1 min-w-0 text-sm text-white/80 truncate font-mono" title={f.path}>
                    {f.path}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.krypt.shell.reveal(f.path);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-xs text-white/50 hover:text-white transition-opacity shrink-0"
                  >
                    Reveal
                  </button>
                </div>
              ))}
            </Card>
          ) : (
            <Card variant="flat" className="py-12 text-center border-dashed text-sm text-white/50">
              No files matched — try a smaller size or a shorter age. 🎉
            </Card>
          )}
        </div>
      )}

      {result && files.length > 0 && (
        <div className="sticky bottom-0 -mx-10 px-10 pt-3">
          <div className="rounded-2xl border border-white/10 bg-krypt-void/90 backdrop-blur-md shadow-glow-sm px-5 py-3.5 flex items-center justify-between gap-4">
            <div className="text-sm text-white/60">
              <span className="text-white font-semibold">{toDelete.size}</span> marked
              {selectedBytes > 0 && (
                <>
                  {' · '}
                  <span className="text-white font-semibold">{formatBytes(selectedBytes)}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-white/10 overflow-hidden">
                <SortBtn active={mode === 'trash'} onClick={() => setMode('trash')}>
                  Recycle Bin
                </SortBtn>
                <SortBtn active={mode === 'permanent'} onClick={() => setMode('permanent')}>
                  Permanent
                </SortBtn>
              </div>
              <Button
                variant="destructive"
                icon={mode === 'permanent' ? <Trash2 size={15} /> : <TriangleAlert size={15} />}
                loading={deleting}
                disabled={!toDelete.size}
                onClick={deleteSelected}
              >
                {mode === 'permanent' ? 'Delete selected' : 'Move to Recycle Bin'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-wider text-white/35">{label}</span>
      <div className="flex rounded-lg border border-white/10 overflow-hidden">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'px-3 py-1.5 text-xs transition-colors ' +
        (active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white')
      }
    >
      {children}
    </button>
  );
}

function SortBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'px-3 py-1.5 text-xs transition-colors ' +
        (active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white')
      }
    >
      {children}
    </button>
  );
}
