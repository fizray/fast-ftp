import React, { useState, useEffect, useRef } from 'react';
import { FileCode, Save, X, RefreshCw, Check, AlertCircle } from 'lucide-react';

interface RemoteEditorModalProps {
  isOpen: boolean;
  filePath: string;
  initialContent: string;
  onClose: () => void;
  onSave: (path: string, content: string) => Promise<void>;
  onReload: (path: string) => Promise<string>;
}

export const RemoteEditorModal: React.FC<RemoteEditorModalProps> = ({
  isOpen,
  filePath,
  initialContent,
  onClose,
  onSave,
  onReload,
}) => {
  const [content, setContent] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(initialContent);
    setIsDirty(false);
    setStatusMessage(null);
  }, [initialContent, filePath, isOpen]);

  // Handle Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, content, filePath]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setStatusMessage(null);
      await onSave(filePath, content);
      setIsDirty(false);
      setStatusMessage({ text: 'Saved to remote server', type: 'success' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to save: ${err}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReload = async () => {
    if (isDirty && !confirm('Discard unsaved changes and reload from server?')) {
      return;
    }
    try {
      setIsReloading(true);
      const reloaded = await onReload(filePath);
      setContent(reloaded);
      setIsDirty(false);
      setStatusMessage({ text: 'Reloaded from server', type: 'success' });
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to reload: ${err}`, type: 'error' });
    } finally {
      setIsReloading(false);
    }
  };

  const handleClose = () => {
    if (isDirty && !confirm('You have unsaved changes. Close anyway?')) {
      return;
    }
    onClose();
  };

  // Support indentation with Tab key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      setIsDirty(true);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const lines = content.split('\n');
  const lineCount = lines.length;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#09090b] border border-[#27272a] rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden text-zinc-200">
        
        {/* Editor Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#27272a] bg-[#121214]">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileCode className="w-4 h-4 text-zinc-300 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-zinc-100 font-mono truncate">
                  {filePath.split('/').pop() || filePath}
                </span>
                {isDirty && (
                  <span className="text-[10px] bg-zinc-800 text-zinc-200 border border-zinc-700 px-1.5 py-0.5 rounded font-mono">
                    modified *
                  </span>
                )}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 truncate">
                {filePath}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {statusMessage && (
              <div className={`text-xs px-2.5 py-1 rounded flex items-center gap-1.5 font-mono ${
                statusMessage.type === 'success' ? 'text-zinc-200 bg-zinc-800' : 'text-red-400 bg-red-950/60'
              }`}>
                {statusMessage.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {statusMessage.text}
              </div>
            )}

            <button
              onClick={handleReload}
              disabled={isReloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-750 transition cursor-pointer"
              title="Reload file from server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
              Reload
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white shadow-xs transition disabled:opacity-50 cursor-pointer"
              title="Save to server (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save (Ctrl+S)'}
            </button>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 ml-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 flex overflow-hidden bg-[#09090b] relative">
          
          {/* Line Numbers */}
          <div className="w-14 py-3 bg-[#09090b] select-none text-right pr-3 font-mono text-xs text-zinc-600 border-r border-[#27272a] overflow-hidden font-tabular">
            {lines.map((_, idx) => (
              <div key={idx} className="leading-6">
                {idx + 1}
              </div>
            ))}
          </div>

          {/* Textarea Code Body */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => {
              setContent(e.target.value);
              setIsDirty(true);
            }}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="flex-1 p-3 bg-transparent text-zinc-100 font-mono text-xs leading-6 resize-none focus:outline-none overflow-auto whitespace-pre"
          />
        </div>

        {/* Editor Status Bar */}
        <div className="px-4 py-2 border-t border-[#27272a] bg-[#121214] text-[11px] font-mono text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>Lines: {lineCount}</span>
            <span>Length: {content.length} chars</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Encoding: UTF-8</span>
            <span>Shortcut: Ctrl+S</span>
          </div>
        </div>

      </div>
    </div>
  );
};
