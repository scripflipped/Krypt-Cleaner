import { useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  FolderOpen,
  Home,
  PieChart,
  Search,
  ShieldAlert,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import type { AnalyzeProgress, AnalyzeResult, DriveInfo, TreeNode } from '@shared/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Progress } from '@/components/ui/Progress';
import { useToast } from '@/components/ui/Toast';
import { formatBytes, formatCount, formatDuration } from '@/lib/format';
import { cn } from '@/lib/cn';

const TILE_COLORS = [
  'from-indigo-500/30 to-indigo-500/10 border-indigo-400/30',
  'from-purple-500/30 to-purple-500/10 border-purple-400/30',
  'from-pink-500/30 to-pink-500/10 border-pink-400/30',
  'from-fuchsia-500/25 to-fuchsia-500/10 border-fuchsia-400/30',
];

export function Analyzer() {
  const toast = useToast();
  const [root, setRoot] = useState('C:\\');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<AnalyzeProgress | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [stack, setStack] = useState<TreeNode[]>([]);
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    const off = window.krypt.analyzer.onProgress(setProgress);
    window.krypt.disk.drives().then(setDrives).catch(() => {});
    window.krypt.system.isAdmin().then(setIsAdmin).catch(() => {});
    return off;
  }, []);

  const rootDrive = drives.find((d) => d.letter.toUpperCase() === root[0]?.toUpperCase());
  const usedBytes = rootDrive ? rootDrive.sizeBytes - rootDrive.freeBytes : 0;
  const coverage = result && usedBytes > 0 ? result.totalBytes / usedBytes : null;
  const isWholeDrive = !!rootDrive && /^[a-z]:[\\/]?$/i.test(root);
  const lowCoverage = isWholeDrive && coverage != null && coverage < 0.9;

  const pick = async () => {
    const p = await window.krypt.dialog.pickFolder();
    if (p) setRoot(p);
  };

  const scan = async () => {
    setScanning(true);
    setResult(null);
    setProgress(null);
    try {
      const res = await window.krypt.analyzer.run(root);
      setResult(res);
      setStack([res.root]);
      if (res.truncated)
        toast.warn('Stopped early', 'This folder is huge — results were capped at the time budget.');
      else toast.success('Scan complete', `${formatCount(res.totalFiles)} files · ${formatBytes(res.totalBytes)}.`);
    } catch (e) {
      toast.error('Scan failed', (e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const current = stack[stack.length - 1];
  const children = (current?.children ?? []).filter((c) => c.size > 0);

  const drill = (node: TreeNode) => {
    if (node.isDir && node.children?.length) setStack((s) => [...s, node]);
  };
  const goTo = (i: number) => setStack((s) => s.slice(0, i + 1));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Disk"
        title="Disk Analyzer"
        description="See exactly what’s eating your disk. Krypt walks the folder you choose and maps it as a treemap, with the biggest files called out. A whole 1 TB drive takes a few minutes; run as Administrator for full coverage of protected system folders."
      />

      <Card variant="strong" className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 min-w-0">
            <FolderOpen size={15} className="text-white/40 shrink-0" />
            <input
              value={root}
              onChange={(e) => setRoot(e.target.value)}
              spellCheck={false}
              className="bg-transparent outline-none text-sm text-white/90 font-mono flex-1 min-w-0"
              placeholder="C:\"
            />
          </div>
          <Button variant="secondary" icon={<FolderOpen size={14} />} onClick={pick}>
            Browse
          </Button>
          <Button variant="gradient" icon={<Search size={15} />} loading={scanning} onClick={scan}>
            Analyze
          </Button>
        </div>
        {scanning && (
          <div className="mt-3">
            <Progress indeterminate />
            <div className="text-[11px] text-white/40 mt-1.5 font-mono truncate">
              {progress
                ? `${formatCount(progress.scannedFiles)} files · ${formatBytes(progress.bytes)} · ${progress.current}`
                : 'Starting…'}
            </div>
          </div>
        )}
      </Card>

      {result && current && (
        <>
          {rootDrive && (
            <div
              className={cn(
                'rounded-xl border px-4 py-3 flex items-start gap-2.5',
                lowCoverage || result.truncated
                  ? 'border-amber-500/30 bg-amber-500/[0.06]'
                  : 'border-white/10 bg-white/[0.02]'
              )}
            >
              {lowCoverage || result.truncated ? (
                <TriangleAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <PieChart size={16} className="text-purple-300 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 text-xs leading-relaxed">
                <span className="text-white/90 font-semibold">
                  Scanned {formatBytes(result.totalBytes)} of {formatBytes(usedBytes)} used on{' '}
                  {rootDrive.letter}:
                </span>{' '}
                {coverage != null && (
                  <span className={lowCoverage ? 'text-amber-300' : 'text-white/55'}>
                    ({Math.round(coverage * 100)}% coverage)
                  </span>
                )}
                {(lowCoverage || result.truncated) && (
                  <div className="text-amber-200/80 mt-1 flex items-center gap-3 flex-wrap">
                    {result.truncated
                      ? 'The scan hit its 5-minute cap before finishing.'
                      : 'Some folders couldn’t be read.'}{' '}
                    {!isAdmin && (
                      <button
                        onClick={async () => {
                          await window.krypt.system.relaunchAsAdmin();
                        }}
                        className="inline-flex items-center gap-1 text-amber-200 hover:text-white underline"
                      >
                        <ShieldAlert size={12} /> Relaunch as Admin for full access
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 text-sm min-w-0 overflow-hidden">
              <button onClick={() => goTo(0)} className="text-white/50 hover:text-white shrink-0">
                <Home size={14} />
              </button>
              {stack.map((n, i) => (
                <span key={i} className="flex items-center gap-1 min-w-0">
                  <ChevronRight size={13} className="text-white/25 shrink-0" />
                  <button
                    onClick={() => goTo(i)}
                    className={cn(
                      'truncate hover:text-white transition-colors',
                      i === stack.length - 1 ? 'text-white font-medium' : 'text-white/50'
                    )}
                  >
                    {n.name}
                  </button>
                </span>
              ))}
            </div>
            <Badge tone="purple">{formatBytes(current.size)}</Badge>
          </div>

          <Card variant="strong" className="p-3">
            <div className="flex flex-wrap gap-1.5 h-72 content-start">
              {children.map((c, i) => {
                const pct = (c.size / Math.max(1, current.size)) * 100;
                return (
                  <button
                    key={c.path}
                    onClick={() => drill(c)}
                    title={`${c.path} — ${formatBytes(c.size)}`}
                    style={{ flexGrow: c.size, flexBasis: 90, height: pct > 25 ? '100%' : pct > 8 ? '48%' : '31%' }}
                    className={cn(
                      'min-w-[88px] rounded-lg border bg-gradient-to-br p-2.5 text-left overflow-hidden transition-transform hover:scale-[1.01]',
                      TILE_COLORS[i % TILE_COLORS.length],
                      c.isDir && c.children?.length ? 'cursor-pointer' : 'cursor-default'
                    )}
                  >
                    <div className="text-xs font-semibold text-white/90 truncate flex items-center gap-1">
                      {c.isDir && <FolderOpen size={11} className="shrink-0 text-white/60" />}
                      {c.name}
                    </div>
                    <div className="text-[11px] text-white/60 font-mono mt-0.5">{formatBytes(c.size)}</div>
                  </button>
                );
              })}
            </div>
            {current.hiddenChildren ? (
              <div className="text-[11px] text-white/35 mt-2 px-1">
                + {current.hiddenChildren} smaller items not shown
              </div>
            ) : null}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <PieChart size={15} className="text-purple-300" />
              <h3 className="text-sm font-semibold text-white">Largest files</h3>
              <span className="text-[11px] text-white/35">
                {formatCount(result.totalFiles)} scanned in {formatDuration(result.durationMs)}
              </span>
            </div>
            <div className="space-y-1">
              {result.largest.slice(0, 25).map((f) => (
                <LargeRow key={f.path} path={f.path} name={f.name} size={f.size} onToast={toast} />
              ))}
              {!result.largest.length && (
                <div className="text-xs text-white/40 py-4 text-center">No files over 50 MB found.</div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function LargeRow({
  path,
  name,
  size,
  onToast,
}: {
  path: string;
  name: string;
  size: number;
  onToast: ReturnType<typeof useToast>;
}) {
  const [gone, setGone] = useState(false);
  const busy = useRef(false);
  if (gone) return null;

  const del = async () => {
    if (busy.current) return;
    const ok = await window.krypt.dialog.confirm({
      title: 'Delete this file?',
      message: name,
      detail: `${path}\n\nThis permanently deletes the file (it does not go to the Recycle Bin).`,
      destructive: true,
    });
    if (!ok) return;
    busy.current = true;
    const res = await window.krypt.clean.deleteFiles([path]);
    if (res.removed > 0) {
      onToast.success('Deleted', `${name} (${formatBytes(res.bytes)})`);
      setGone(true);
    } else {
      onToast.warn('Could not delete', 'The file may be locked or in use.');
    }
    busy.current = false;
  };

  return (
    <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] group">
      <span className="text-sm font-mono text-white/70 tabular-nums w-20 shrink-0">{formatBytes(size)}</span>
      <span className="flex-1 min-w-0 text-sm text-white/85 truncate" title={path}>
        {name}
        <span className="text-white/30 ml-2 text-xs">{path}</span>
      </span>
      <button
        onClick={() => window.krypt.shell.reveal(path)}
        className="opacity-0 group-hover:opacity-100 text-xs text-white/50 hover:text-white transition-opacity shrink-0"
      >
        Reveal
      </button>
      <button
        onClick={del}
        className="opacity-0 group-hover:opacity-100 text-red-300/70 hover:text-red-300 transition-opacity shrink-0"
        aria-label="Delete"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
