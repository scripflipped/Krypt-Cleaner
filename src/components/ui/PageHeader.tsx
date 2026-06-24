import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-6">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-[0.22em] text-purple-300/80 font-medium mb-1.5">
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl font-bold text-white tracking-tight title-glow">{title}</h1>
        {description && (
          <p className="text-sm text-white/55 mt-2 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
