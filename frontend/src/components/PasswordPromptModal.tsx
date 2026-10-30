import React, { useState } from 'react';
import { Lock, KeyRound, X } from 'lucide-react';

interface PasswordPromptModalProps {
  isOpen: boolean;
  title: string;
  isPassphrase?: boolean;
  onConfirm: (password: string, remember: boolean) => void;
  onCancel: () => void;
}

export const PasswordPromptModal: React.FC<PasswordPromptModalProps> = ({
  isOpen,
  title,
  isPassphrase = false,
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState('');
  const [remember, setRemember] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value) return;
    onConfirm(value, remember);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#09090b] border border-[#27272a] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden text-zinc-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a] bg-[#121214]">
          <div className="flex items-center gap-2">
            {isPassphrase ? (
              <KeyRound className="w-4 h-4 text-zinc-300" />
            ) : (
              <Lock className="w-4 h-4 text-zinc-300" />
            )}
            <h3 className="font-semibold text-xs text-zinc-100">
              {isPassphrase ? 'Key Passphrase Required' : 'SSH Authentication Required'}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <p className="text-xs text-zinc-300 leading-relaxed font-mono">
            {title}
          </p>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              {isPassphrase ? 'Passphrase' : 'Password'}
            </label>
            <input
              type="password"
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={isPassphrase ? 'Enter passphrase...' : 'Enter password...'}
              className="w-full bg-[#121214] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="promptRemember"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="rounded bg-[#121214] border-[#27272a] accent-zinc-500"
            />
            <label htmlFor="promptRemember" className="text-xs text-zinc-400 cursor-pointer select-none">
              Remember with <strong className="text-zinc-200">Windows DPAPI</strong>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value}
              className="px-3.5 py-1 rounded text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 disabled:opacity-40 transition shadow-xs cursor-pointer"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
