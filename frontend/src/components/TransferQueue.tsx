import React from 'react';
import { ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';
import { TransferItem } from '../types';
import { formatBytes } from '../utils/format';

interface TransferQueueProps {
  isOpen: boolean;
  onClose: () => void;
  transfers: TransferItem[];
  onClearCompleted: () => void;
}

export const TransferQueue: React.FC<TransferQueueProps> = ({
  isOpen,
  onClose,
  transfers,
  onClearCompleted,
}) => {
  if (!isOpen || transfers.length === 0) return null;

  return (
    <div className="absolute bottom-6.5 left-0 right-0 z-20 bg-[#121214] border-t border-[#27272a] shadow-2xl text-zinc-200 max-h-56 flex flex-col font-mono text-xs">
      
      {/* Drawer Header */}
      <div className="px-3 py-1.5 border-b border-[#27272a] bg-[#09090b] flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-200">
          <span>Transfer Queue & History</span>
          <span className="text-zinc-500 font-normal">({transfers.length} total)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClearCompleted}
            className="text-[10px] text-zinc-400 hover:text-zinc-100 px-2 py-0.5 rounded hover:bg-zinc-800 transition cursor-pointer"
          >
            Clear Finished
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Transfer Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {transfers.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-between bg-[#09090b] border border-[#27272a] rounded p-2 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {item.direction === 'upload' ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
              ) : (
                <ArrowDownLeft className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium text-zinc-200 truncate text-[11px]">{item.fileName}</div>
                <div className="text-[10px] text-zinc-500 truncate">
                  {item.sourcePath} &rarr; {item.destPath}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 pl-3">
              <div className="text-right">
                <div className="text-[11px] text-zinc-300 font-tabular">
                  {formatBytes(item.bytesTransferred)} / {formatBytes(item.bytesTotal)}
                </div>
                <div className="text-[9px] text-zinc-500">
                  {item.status === 'completed' && <span className="text-zinc-300 font-medium">Completed</span>}
                  {item.status === 'error' && <span className="text-red-400">{item.errorMessage || 'Failed'}</span>}
                  {item.status === 'transferring' && <span>{item.percentage.toFixed(0)}%</span>}
                </div>
              </div>

              <div className="w-20 bg-zinc-800 rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full ${
                    item.status === 'error' ? 'bg-red-500' : 'bg-zinc-100'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
