import React from 'react';
import {
  Server,
  Minus,
  Square,
  X,
  Zap
} from 'lucide-react';
import {
  WindowMinimise,
  WindowToggleMaximise,
  WindowClose
} from '../../wailsjs/go/main/App';

interface HeaderProps {
  onOpenSiteManager: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSiteManager,
}) => {
  return (
    <header className="h-10 bg-[#09090b] border-b border-[#27272a] flex items-center justify-between select-none shrink-0 z-30 wails-drag">
      
      {/* Brand & Site Manager */}
      <div className="flex items-center gap-2 pl-3 wails-no-drag">
        <div className="flex items-center gap-1.5 font-semibold text-xs tracking-tight text-zinc-100">
          <Zap className="w-3.5 h-3.5 text-zinc-200" />
          <span className="font-mono font-bold">fast-ftp</span>
        </div>

        <div className="w-px h-3.5 bg-zinc-800 mx-1.5" />

        <button
          onClick={onOpenSiteManager}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 transition shadow-xs cursor-pointer"
        >
          <Server className="w-3.5 h-3.5 text-zinc-400" />
          Site Manager
        </button>
      </div>

      {/* Center Draggable Window Region */}
      <div className="flex-1 h-full" />

      {/* Window Controls (Frameless) */}
      <div className="flex items-center h-full wails-no-drag">
        <button
          onClick={() => WindowMinimise()}
          className="h-full px-3 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 hover:bg-zinc-800/80 flex items-center justify-center transition"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => WindowToggleMaximise()}
          className="h-full px-3 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 hover:bg-zinc-800/80 flex items-center justify-center transition"
          title="Maximize / Restore"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={() => WindowClose()}
          className="h-full px-3.5 text-zinc-400 hover:text-white hover:bg-red-900/60 flex items-center justify-center transition"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

    </header>
  );
};
