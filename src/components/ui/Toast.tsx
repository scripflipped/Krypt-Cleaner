import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, Info, TriangleAlert, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastKind = 'success' | 'error' | 'warn' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  detail?: string;
}

interface ToastApi {
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  warn: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const ICONS: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 size={16} className="text-emerald-400" />,
  error: <XCircle size={16} className="text-red-400" />,
  warn: <TriangleAlert size={16} className="text-amber-400" />,
  info: <Info size={16} className="text-indigo-300" />,
};

const ACCENT: Record<ToastKind, string> = {
  success: 'border-emerald-500/30',
  error: 'border-red-500/30',
  warn: 'border-amber-500/30',
  info: 'border-indigo-500/30',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, detail?: string) => {
      const id = ++seq.current;
      setToasts((cur) => [...cur, { id, kind, title, detail }].slice(-5));
      setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4200);
    },
    [dismiss]
  );

  const api: ToastApi = {
    success: (t, d) => push('success', t, d),
    error: (t, d) => push('error', t, d),
    warn: (t, d) => push('warn', t, d),
    info: (t, d) => push('info', t, d),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-12 right-4 z-[100] flex flex-col gap-2 w-[340px] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto animate-fade-in rounded-xl border bg-krypt-void/95 backdrop-blur-md shadow-glow-sm px-4 py-3 flex items-start gap-3',
              ACCENT[t.kind]
            )}
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.kind]}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white leading-snug">{t.title}</div>
              {t.detail && (
                <div className="text-xs text-white/55 mt-0.5 leading-relaxed break-words">
                  {t.detail}
                </div>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-white/30 hover:text-white/70 transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
