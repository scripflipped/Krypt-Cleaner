import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'strong' | 'flat';
  interactive?: boolean;
  children: ReactNode;
}

export function Card({
  children,
  className,
  variant = 'default',
  interactive,
  ...rest
}: CardProps) {
  return (
    <div
      {...rest}
      className={cn(
        'relative rounded-2xl border transition-all duration-300',
        variant === 'default' && 'bg-white/[0.02] border-white/10',
        variant === 'strong' &&
          'bg-white/[0.035] border-white/10 shadow-glow-sm backdrop-blur-md',
        variant === 'flat' && 'bg-transparent border-white/5',
        interactive &&
          'hover:border-white/20 hover:bg-white/[0.04] hover:shadow-glow-sm cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center text-purple-300">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white tracking-tight truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
