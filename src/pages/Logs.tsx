import { useEffect, useRef, useState } from 'react';
import { Eraser, ScrollText } from 'lucide-react';
import type { LogEntry } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';

const LEVEL_COLOR: Record<LogEntry['level'], string> = {
  info: 'text-indigo-300',
  success: 'text-emerald-300',
  warn: 'text-amber-300',
  error: 'text-red-300',
};

export function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.krypt.logs.get().then(setLogs).catch(() => {});
    const off = window.krypt.logs.onNew((entry) => setLogs((prev) => [entry, ...prev].slice(0, 500)));
    return off;
  }, []);

  const clear = async () => {
    await window.krypt.logs.clear();
    setLogs([]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Safety"
        title="Action log"
        description="Every clean, optimization and backup Krypt runs is recorded here. Nothing leaves your PC."
        action={
          <Button variant="ghost" size="sm" icon={<Eraser size={14} />} onClick={clear}>
            Clear log
          </Button>
        }
      />

      <Card variant="strong" className="p-0 overflow-hidden">
        <div ref={scroller} className="max-h-[64vh] overflow-y-auto divide-y divide-white/5">
          {logs.map((l) => (
            <div key={l.id} className="flex items-start gap-3 px-5 py-2.5 hover:bg-white/[0.02]">
              <span className="text-[11px] text-white/30 font-mono tabular-nums shrink-0 mt-0.5 w-16">
                {new Date(l.ts).toLocaleTimeString()}
              </span>
              <span
                className={cn(
                  'text-[10px] uppercase tracking-wider font-semibold shrink-0 mt-0.5 w-14',
                  LEVEL_COLOR[l.level]
                )}
              >
                {l.level}
              </span>
              <span className="text-[11px] text-white/40 font-mono shrink-0 mt-0.5 w-20 truncate">
                {l.source}
              </span>
              <span className="text-sm text-white/80 leading-relaxed min-w-0">{l.message}</span>
            </div>
          ))}
          {!logs.length && (
            <div className="py-16 text-center text-sm text-white/40 flex flex-col items-center gap-2">
              <ScrollText size={22} className="text-white/20" />
              No actions yet — run a clean or optimization to see it logged here.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
