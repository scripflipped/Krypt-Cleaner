import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CleanResult, CleanTargetMeta, ScanResult } from '@shared/types';
import { useToast } from '@/components/ui/Toast';

interface CleanerState {
  targets: CleanTargetMeta[];
  scans: Record<string, ScanResult>;
  selected: Set<string>;
  results: Record<string, CleanResult> | null;
  scanning: boolean;
  cleaning: boolean;
  isAdmin: boolean;
  ready: boolean;
  toggle: (id: string) => void;
  setSelected: (ids: string[], on: boolean) => void;
  selectDefaults: () => void;
  rescan: () => Promise<void>;
  runIds: (ids: string[]) => Promise<CleanResult[]>;
  estimatedBytes: (ids: string[]) => number;
}

const Ctx = createContext<CleanerState | null>(null);

export function useCleaner(): CleanerState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCleaner must be used within <CleanerProvider>');
  return ctx;
}

export function CleanerProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [targets, setTargets] = useState<CleanTargetMeta[]>([]);
  const [scans, setScans] = useState<Record<string, ScanResult>>({});
  const [selected, setSelectedState] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, CleanResult> | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const didInit = useRef(false);

  const rescan = useCallback(async () => {
    setScanning(true);
    setScans({});
    const unsub = window.krypt.clean.onScanResult((r) => {
      setScans((prev) => ({ ...prev, [r.id]: r }));
    });
    try {
      await window.krypt.clean.scan();
    } catch (err) {
      toast.error('Scan failed', (err as Error).message);
    } finally {
      unsub();
      setScanning(false);
    }
  }, [toast]);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    (async () => {
      try {
        const [meta, admin, settings] = await Promise.all([
          window.krypt.clean.targets(),
          window.krypt.system.isAdmin(),
          window.krypt.settings.get(),
        ]);
        setTargets(meta);
        setIsAdmin(admin);

        const knownIds = new Set(meta.map((t) => t.id));
        const saved = (settings.lastSelection ?? []).filter((id) => knownIds.has(id));
        if (saved.length > 0) {
          setSelectedState(new Set(saved));
        } else {
          setSelectedState(new Set(meta.filter((t) => t.defaultSelected).map((t) => t.id)));
        }

        setReady(true);
        await rescan();
      } catch (err) {
        toast.error('Could not load cleaner', (err as Error).message);
        setReady(true);
      }
    })();
  }, [rescan, toast]);

  const toggle = useCallback((id: string) => {
    setSelectedState((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setSelected = useCallback((ids: string[], on: boolean) => {
    setSelectedState((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const selectDefaults = useCallback(() => {
    setSelectedState(new Set(targets.filter((t) => t.defaultSelected).map((t) => t.id)));
  }, [targets]);

  const estimatedBytes = useCallback(
    (ids: string[]) => ids.reduce((s, id) => s + (scans[id]?.bytes ?? 0), 0),
    [scans]
  );

  const runIds = useCallback(
    async (ids: string[]): Promise<CleanResult[]> => {
      if (!ids.length) return [];
      setCleaning(true);
      try {
        const res = await window.krypt.clean.run(ids);
        setResults((prev) => ({
          ...(prev ?? {}),
          ...Object.fromEntries(res.map((r) => [r.id, r])),
        }));
        const bytes = res.reduce((s, r) => s + r.bytesFreed, 0);
        const files = res.reduce((s, r) => s + r.filesRemoved, 0);
        const errors = res.filter((r) => r.error);
        if (errors.length) {
          toast.warn(
            `Cleaned with ${errors.length} issue${errors.length > 1 ? 's' : ''}`,
            `Freed ${(bytes / 1048576).toFixed(1)} MB · ${files} files. Some items need Administrator or a closed app.`
          );
        } else {
          toast.success(
            `Freed ${(bytes / 1048576).toFixed(1)} MB`,
            `${files} files removed across ${ids.length} target${ids.length > 1 ? 's' : ''}.`
          );
        }
        await rescan();
        return res;
      } catch (err) {
        toast.error('Clean failed', (err as Error).message);
        return [];
      } finally {
        setCleaning(false);
      }
    },
    [rescan, toast]
  );

  const value = useMemo<CleanerState>(
    () => ({
      targets,
      scans,
      selected,
      results,
      scanning,
      cleaning,
      isAdmin,
      ready,
      toggle,
      setSelected,
      selectDefaults,
      rescan,
      runIds,
      estimatedBytes,
    }),
    [
      targets,
      scans,
      selected,
      results,
      scanning,
      cleaning,
      isAdmin,
      ready,
      toggle,
      setSelected,
      selectDefaults,
      rescan,
      runIds,
      estimatedBytes,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
