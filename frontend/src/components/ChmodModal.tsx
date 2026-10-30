import React, { useState, useEffect } from 'react';
import { Shield, X, Check } from 'lucide-react';
import { models } from '../../wailsjs/go/models';

interface ChmodModalProps {
  isOpen: boolean;
  file: models.FileItem | null;
  onClose: () => void;
  onSave: (path: string, mode: number) => Promise<void>;
}

export const ChmodModal: React.FC<ChmodModalProps> = ({
  isOpen,
  file,
  onClose,
  onSave,
}) => {
  const [ownerR, setOwnerR] = useState(false);
  const [ownerW, setOwnerW] = useState(false);
  const [ownerX, setOwnerX] = useState(false);

  const [groupR, setGroupR] = useState(false);
  const [groupW, setGroupW] = useState(false);
  const [groupX, setGroupX] = useState(false);

  const [otherR, setOtherR] = useState(false);
  const [otherW, setOtherW] = useState(false);
  const [otherX, setOtherX] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (file) {
      const mode = file.numericMode || 0;
      setOwnerR((mode & 0o400) !== 0);
      setOwnerW((mode & 0o200) !== 0);
      setOwnerX((mode & 0o100) !== 0);

      setGroupR((mode & 0o040) !== 0);
      setGroupW((mode & 0o020) !== 0);
      setGroupX((mode & 0o010) !== 0);

      setOtherR((mode & 0o004) !== 0);
      setOtherW((mode & 0o002) !== 0);
      setOtherX((mode & 0o001) !== 0);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const calculateNumericMode = (): number => {
    let mode = 0;
    if (ownerR) mode |= 0o400;
    if (ownerW) mode |= 0o200;
    if (ownerX) mode |= 0o100;

    if (groupR) mode |= 0o040;
    if (groupW) mode |= 0o020;
    if (groupX) mode |= 0o010;

    if (otherR) mode |= 0o004;
    if (otherW) mode |= 0o002;
    if (otherX) mode |= 0o001;
    return mode;
  };

  const octalString = '0' + calculateNumericMode().toString(8).padStart(3, '0');

  const handleApply = async () => {
    try {
      setIsSaving(true);
      await onSave(file.path, calculateNumericMode());
      onClose();
    } catch (err) {
      alert(`Failed to change permissions: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#09090b] border border-[#27272a] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden text-zinc-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a] bg-[#121214]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-zinc-300" />
            <h3 className="font-semibold text-xs text-zinc-100">Permissions (Chmod)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5">
          <div className="bg-[#121214] p-2.5 rounded border border-[#27272a] text-[11px] font-mono truncate text-zinc-300">
            {file.path}
          </div>

          {/* Matrix */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="text-zinc-500 font-mono text-[10px] text-left uppercase">Class</div>
            <div className="text-zinc-400 font-medium text-[11px]">Read (r)</div>
            <div className="text-zinc-400 font-medium text-[11px]">Write (w)</div>
            <div className="text-zinc-400 font-medium text-[11px]">Exec (x)</div>

            {/* Owner */}
            <div className="text-left font-mono text-xs text-zinc-300">Owner</div>
            <div>
              <input
                type="checkbox"
                checked={ownerR}
                onChange={e => setOwnerR(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-[#121214] border-[#27272a] accent-zinc-500"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={ownerW}
                onChange={e => setOwnerW(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-[#121214] border-[#27272a] accent-zinc-500"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={ownerX}
                onChange={e => setOwnerX(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-[#121214] border-[#27272a] accent-zinc-500"
              />
            </div>

            {/* Group */}
            <div className="text-left font-mono text-xs text-zinc-300">Group</div>
            <div>
              <input
                type="checkbox"
                checked={groupR}
                onChange={e => setGroupR(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-[#121214] border-[#27272a] accent-zinc-500"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={groupW}
                onChange={e => setGroupW(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-[#121214] border-[#27272a] accent-zinc-500"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={groupX}
                onChange={e => setGroupX(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-[#121214] border-[#27272a] accent-zinc-500"
              />
            </div>

            {/* Others */}
            <div className="text-left font-mono text-xs text-zinc-300">Others</div>
            <div>
              <input
                type="checkbox"
                checked={otherR}
                onChange={e => setOtherR(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-[#121214] border-[#27272a] accent-zinc-500"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={otherW}
                onChange={e => setOtherW(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-[#121214] border-[#27272a] accent-zinc-500"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={otherX}
                onChange={e => setOtherX(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-[#121214] border-[#27272a] accent-zinc-500"
              />
            </div>
          </div>

          {/* Octal display */}
          <div className="flex items-center justify-between bg-[#121214] px-3 py-1.5 rounded border border-[#27272a]">
            <span className="text-xs text-zinc-400 font-mono">Octal Value:</span>
            <span className="font-mono text-xs font-semibold text-zinc-100">{octalString}</span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 disabled:opacity-50 transition cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
