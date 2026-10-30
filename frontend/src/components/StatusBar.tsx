import React from 'react';
import {
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { TransferItem } from '../types';

interface StatusBarProps {
  activeHostName: string | null;
  activeRemotePath: string | null;
  showHidden: boolean;
  onToggleHidden: () => void;
  transfers: TransferItem[];
  isTransferDrawerOpen: boolean;
  onToggleTransferDrawer: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  activeHostName,
  activeRemotePath,
  showHidden,
  onToggleHidden,
  transfers,
  isTransferDrawerOpen,
  onToggleTransferDrawer,
}) => {
  const activeTransfers = transfers.filter(t => t.status === 'transferring' || t.status === 'pending');
  const latestTransfer = activeTransfers[activeTransfers.length - 1];

  return (
    <footer className="h-6.5 bg-[#09090b] border-t border-[#27272a] flex items-center justify-between px-3 text-[11px] select-none shrink-0 z-30 font-mono text-zinc-400">
      
      {/* Left side: Active Connection Status */}
      <div className="flex items-center gap-2">
        {activeHostName ? (
          <div className="flex items-center gap-1.5 text-zinc-300 truncate max-w-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-semibold text-zinc-200">{activeHostName}</span>
            {activeRemotePath && (
              <span className="text-zinc-500 truncate hidden sm:inline">({activeRemotePath})</span>
            )}
          </div>
        ) : (
          <span className="text-zinc-500 italic">No Active Connection</span>
        )}
      </div>

      {/* Right side: Transfers & Hidden Files Toggle */}
      <div className="flex items-center gap-3">
        
        {/* Transfer Indicator */}
        {transfers.length > 0 && (
          <button
            onClick={onToggleTransferDrawer}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition cursor-pointer ${
              activeTransfers.length > 0
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                : 'hover:bg-zinc-800 text-zinc-400'
            }`}
          >
            {activeTransfers.length > 0 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-200 animate-pulse" />
                <span>
                  {latestTransfer?.direction === 'upload' ? 'Upload' : 'Download'}: {latestTransfer?.percentage.toFixed(0)}%
                </span>
                {isTransferDrawerOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </>
            ) : (
              <span>Queue ({transfers.length})</span>
            )}
          </button>
        )}

        {transfers.length > 0 && <div className="w-px h-3 bg-zinc-800" />}

        {/* Hidden Files Toggle */}
        <button
          onClick={onToggleHidden}
          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition cursor-pointer ${
            showHidden ? 'text-zinc-200 bg-zinc-800 border border-zinc-700/60' : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title="Toggle hidden files"
        >
          {showHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>{showHidden ? 'Hidden Files: On' : 'Hidden Files: Off'}</span>
        </button>

      </div>

    </footer>
  );
};
