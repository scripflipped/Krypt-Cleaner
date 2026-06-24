import {
  AppWindow,
  Boxes,
  CalendarClock,
  CopyCheck,
  Gauge,
  Globe,
  HardDrive,
  HeartPulse,
  History,
  LayoutDashboard,
  PieChart,
  ScrollText,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import kryptLogo from '@/assets/krypt.png';
import { cn } from '@/lib/cn';
import type { Route } from '@/App';

interface Item {
  id: Route;
  label: string;
  icon: LucideIcon;
  section: string;
}

const ITEMS: Item[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Overview' },
  { id: 'health', label: 'Health Check', icon: HeartPulse, section: 'Overview' },

  { id: 'cleaner', label: 'Smart Cleaner', icon: Trash2, section: 'Clean' },
  { id: 'browsers', label: 'Browsers', icon: Globe, section: 'Clean' },
  { id: 'apps', label: 'Apps & Games', icon: AppWindow, section: 'Clean' },
  { id: 'privacy', label: 'Privacy', icon: Sparkles, section: 'Clean' },

  { id: 'optimizer', label: 'Disk Optimizer', icon: Gauge, section: 'Disk' },
  { id: 'analyzer', label: 'Disk Analyzer', icon: PieChart, section: 'Disk' },
  { id: 'duplicates', label: 'Duplicate Finder', icon: CopyCheck, section: 'Disk' },
  { id: 'old-files', label: 'Old Files', icon: CalendarClock, section: 'Disk' },
  { id: 'drive-health', label: 'Drive Health', icon: HardDrive, section: 'Disk' },

  { id: 'backups', label: 'Backups', icon: History, section: 'Safety' },
  { id: 'logs', label: 'Action log', icon: ScrollText, section: 'Safety' },
];

export function Sidebar({ active, onChange }: { active: Route; onChange: (r: Route) => void }) {
  const sections = ITEMS.reduce<Record<string, Item[]>>((acc, item) => {
    (acc[item.section] ??= []).push(item);
    return acc;
  }, {});

  return (
    <aside className="w-60 shrink-0 h-full border-r border-white/5 bg-black/30 backdrop-blur-md flex flex-col">
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 shadow-glow flex items-center justify-center overflow-hidden">
            <img
              src={kryptLogo}
              alt="Krypt"
              className="w-8 h-8 object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]"
              draggable={false}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight">
              <span className="krypt-wordmark">Krypt</span>
              <span className="text-white"> Cleaner</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/40">v1.0 · krypt.cc</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            <div className="px-3 pb-2 text-[10px] uppercase tracking-[0.22em] text-white/30 font-semibold">
              {section}
            </div>
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onChange(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group relative',
                      isActive
                        ? 'bg-white/[0.06] text-white border border-white/10 shadow-glow-sm'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-indigo-400 via-purple-400 to-pink-400" />
                    )}
                    <Icon size={16} className={cn(isActive && 'text-purple-300')} />
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/5">
        <a
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            window.krypt.shell.openExternal('https://krypt.cc/tools');
          }}
        >
          <Boxes size={14} />
          <div className="flex-1">
            <div className="font-semibold">More Krypt tools</div>
            <div className="text-[10px] text-white/40">Free · no ads · no telemetry</div>
          </div>
        </a>
      </div>
    </aside>
  );
}
