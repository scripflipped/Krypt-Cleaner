import { Minus, Square, X } from 'lucide-react';
import kryptLogo from '@/assets/krypt.png';

export function Titlebar() {
  return (
    <div className="app-drag relative h-10 flex items-center justify-between px-4 border-b border-white/5 bg-black/30 backdrop-blur-sm">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-2 pr-2">
          <img
            src={kryptLogo}
            alt="Krypt"
            className="w-5 h-5 rounded-[4px] object-contain drop-shadow-[0_0_10px_rgba(168,85,247,0.45)]"
            draggable={false}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className="text-[13px] font-semibold tracking-tight">
            <span className="krypt-wordmark">Krypt</span>
            <span className="text-white/80"> Cleaner</span>
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/30 font-medium border-l border-white/10 pl-3">
          krypt.cc
        </span>
      </div>

      <div className="app-no-drag flex items-center">
        <button
          onClick={() => window.krypt.window.minimize()}
          className="w-10 h-10 flex items-center justify-center text-white/50 hover:bg-white/5 hover:text-white/90 transition-colors"
          aria-label="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.krypt.window.toggleMaximize()}
          className="w-10 h-10 flex items-center justify-center text-white/50 hover:bg-white/5 hover:text-white/90 transition-colors"
          aria-label="Maximize"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => window.krypt.window.close()}
          className="w-10 h-10 flex items-center justify-center text-white/60 hover:bg-red-500/80 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
