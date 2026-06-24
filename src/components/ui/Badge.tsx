import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { CleanRisk } from '@shared/types';

export type BadgeTone =
  | 'default'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'green'
  | 'amber'
  | 'red'
  | 'muted';

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-tight border',
        tone === 'default' && 'bg-white/5 text-white/70 border-white/10',
        tone === 'indigo' && 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
        tone === 'purple' && 'bg-purple-500/10 text-purple-300 border-purple-500/30',
        tone === 'pink' && 'bg-pink-500/10 text-pink-300 border-pink-500/30',
        tone === 'green' && 'bg-green-500/10 text-green-300 border-green-500/30',
        tone === 'amber' && 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        tone === 'red' && 'bg-red-500/10 text-red-300 border-red-500/30',
        tone === 'muted' && 'bg-white/[0.03] text-white/50 border-white/5',
        className
      )}
    >
      {children}
    </span>
  );
}

const RISK_MAP: Record<CleanRisk, { tone: BadgeTone; label: string }> = {
  safe: { tone: 'green', label: 'Safe' },
  caution: { tone: 'amber', label: 'Caution' },
  risky: { tone: 'red', label: 'Risky' },
};

export function RiskBadge({ risk }: { risk: CleanRisk }) {
  const info = RISK_MAP[risk];
  return <Badge tone={info.tone}>{info.label}</Badge>;
}
