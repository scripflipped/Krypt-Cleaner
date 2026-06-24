import { cn } from '@/lib/cn';

export function Progress({
  value,
  indeterminate,
  className,
}: {
  value?: number;
  indeterminate?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-white/5 overflow-hidden', className)}>
      <div
        className={cn(
          'h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500',
          indeterminate ? 'w-1/3 animate-[gradient-x_1.4s_ease_infinite]' : 'transition-[width] duration-300'
        )}
        style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
      />
    </div>
  );
}
