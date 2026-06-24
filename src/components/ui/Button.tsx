import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'gradient';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { children, className, variant = 'secondary', size = 'md', icon, loading, disabled, ...rest },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        {...rest}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 font-medium tracking-tight',
          'rounded-lg transition-all duration-200 select-none',
          'disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-purple-500/50',
          size === 'sm' && 'px-3 py-1.5 text-xs',
          size === 'md' && 'px-4 py-2 text-sm',
          size === 'lg' && 'px-5 py-2.5 text-base',
          variant === 'primary' &&
            'bg-white/10 text-white border border-white/15 hover:bg-white/15 hover:border-white/25',
          variant === 'secondary' &&
            'bg-white/[0.04] text-white/80 border border-white/10 hover:bg-white/[0.08] hover:text-white hover:border-white/20',
          variant === 'ghost' &&
            'text-white/70 hover:text-white hover:bg-white/[0.05] border border-transparent',
          variant === 'destructive' &&
            'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 hover:border-red-500/50',
          variant === 'gradient' &&
            'krypt-gradient-btn text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 border-0',
          className
        )}
      >
        {loading && (
          <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        )}
        {!loading && icon && <span className="flex items-center">{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
