import { cn } from '@/lib/cn';

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  disabled,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <span
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      className={cn(
        'mt-0.5 w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center transition-all shrink-0',
        disabled
          ? 'border-white/10 bg-white/5 opacity-50 cursor-not-allowed'
          : 'cursor-pointer',
        checked || indeterminate
          ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border-transparent'
          : 'border-white/20 bg-white/5 hover:border-white/40'
      )}
    >
      {indeterminate ? (
        <span className="w-2 h-0.5 rounded-full bg-white" />
      ) : checked ? (
        <svg width="11" height="11" viewBox="0 0 10 10">
          <path
            d="M1.5 5L4 7.5L8.5 2.5"
            stroke="white"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}
