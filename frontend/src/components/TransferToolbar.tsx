import React from 'react';
import {
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Terminal
} from 'lucide-react';

interface TransferToolbarProps {
  canUpload: boolean;
  canDownload: boolean;
  onUpload: () => void;
  onDownload: () => void;
  onRefreshAll: () => void;
  onLaunchTerminal: () => void;
}

export const TransferToolbar: React.FC<TransferToolbarProps> = ({
  canUpload,
  canDownload,
  onUpload,
  onDownload,
  onRefreshAll,
  onLaunchTerminal,
}) => {
  return (
    <div className="w-10 bg-[#09090b] flex flex-col items-center py-2.5 border-r border-[#27272a] gap-1.5 shrink-0 select-none z-10">
      
      {/* Upload button */}
      <button
        onClick={onUpload}
        disabled={!canUpload}
        className="p-1.5 rounded bg-zinc-200 hover:bg-white text-zinc-950 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer shadow-xs"
        title="Upload selected local files to remote (&rarr;)"
      >
        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* Download button */}
      <button
        onClick={onDownload}
        disabled={!canDownload}
        className="p-1.5 rounded bg-zinc-200 hover:bg-white text-zinc-950 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer shadow-xs"
        title="Download selected remote files to local (&larr;)"
      >
        <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <div className="w-4 h-px bg-[#27272a] my-1" />

      {/* Refresh both */}
      <button
        onClick={onRefreshAll}
        className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition cursor-pointer"
        title="Refresh both panes"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>

      {/* Terminal button */}
      <button
        onClick={onLaunchTerminal}
        className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition cursor-pointer"
        title="Open Windows Terminal SSH session"
      >
        <Terminal className="w-3.5 h-3.5" />
      </button>

    </div>
  );
};
