import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  File,
  Server,
  ArrowUp,
  RefreshCw,
  FolderPlus,
  Trash2,
  Edit2,
  Download,
  Search,
  FileText,
  FileCode,
  Image,
  Archive,
  Shield,
  ArrowLeft,
  Save,
  Check,
  ChevronDown,
  Terminal,
  Settings,
  PowerOff,
  Copy
} from 'lucide-react';
import { models } from '../../wailsjs/go/models';
import { formatBytes, formatDate, isTextFile } from '../utils/format';
import { SegmentedBreadcrumb } from './SegmentedBreadcrumb';

interface RemotePaneProps {
  sessionProfile: models.ConnectionProfile;
  currentPath: string;
  files: models.FileItem[];
  selectedFiles: string[];
  isLoading: boolean;
  onNavigate: (path: string) => void;
  onSelect: (paths: string[], isMulti: boolean) => void;
  onDownload: (remoteFilePaths: string[]) => void;
  onChmod: (file: models.FileItem) => void;
  onCreateFolder: (name: string) => void;
  onDelete: (path: string, isDir: boolean) => void;
  onRename: (oldPath: string, newName: string) => void;
  onRefresh: () => void;
  onDropLocalFiles: (localPaths: string[]) => void;

  // Host Menu actions
  onDisconnect: () => void;
  onEditHost: () => void;
  onLaunchTerminal: () => void;

  // In-place Editor props
  editingFile: { path: string; content: string } | null;
  onOpenEditor: (file: models.FileItem) => void;
  onCloseEditor: () => void;
  onSaveEditor: (path: string, content: string) => Promise<void>;
  onReloadEditor: (path: string) => Promise<string>;
}

export const RemotePane: React.FC<RemotePaneProps> = ({
  sessionProfile,
  currentPath,
  files,
  selectedFiles,
  isLoading,
  onNavigate,
  onSelect,
  onDownload,
  onChmod,
  onCreateFolder,
  onDelete,
  onRename,
  onRefresh,
  onDropLocalFiles,
  onDisconnect,
  onEditHost,
  onLaunchTerminal,
  editingFile,
  onOpenEditor,
  onCloseEditor,
  onSaveEditor,
  onReloadEditor,
}) => {
  const [filter, setFilter] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: models.FileItem } | null>(null);

  // Host dropdown menu state
  const [isHostMenuOpen, setIsHostMenuOpen] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);
  const hostMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (hostMenuRef.current && !hostMenuRef.current.contains(e.target as Node)) {
        setIsHostMenuOpen(false);
      }
    };
    if (isHostMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isHostMenuOpen]);

  // Editor internal state
  const [editorContent, setEditorContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [editorStatus, setEditorStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingFile) {
      setEditorContent(editingFile.content);
      setIsDirty(false);
      setEditorStatus(null);
    }
  }, [editingFile]);

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+S / Cmd+S save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleTriggerSave();
      return;
    }
    // Tab key indent
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const next = val.substring(0, start) + '  ' + val.substring(end);
      setEditorContent(next);
      setIsDirty(true);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleTriggerSave = async () => {
    if (!editingFile || isSaving) return;
    try {
      setIsSaving(true);
      setEditorStatus(null);
      await onSaveEditor(editingFile.path, editorContent);
      setIsDirty(false);
      setEditorStatus({ text: 'Saved to remote server', type: 'success' });
      setTimeout(() => setEditorStatus(null), 3000);
    } catch (err: any) {
      setEditorStatus({ text: `Failed: ${err?.message || err}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerReload = async () => {
    if (!editingFile || isReloading) return;
    if (isDirty && !confirm('Discard unsaved changes and reload from remote server?')) {
      return;
    }
    try {
      setIsReloading(true);
      const fresh = await onReloadEditor(editingFile.path);
      setEditorContent(fresh);
      setIsDirty(false);
      setEditorStatus({ text: 'Reloaded from server', type: 'success' });
      setTimeout(() => setEditorStatus(null), 2500);
    } catch (err: any) {
      setEditorStatus({ text: `Reload failed: ${err?.message || err}`, type: 'error' });
    } finally {
      setIsReloading(false);
    }
  };

  const handleGoUp = () => {
    if (currentPath === '/' || currentPath === '') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parent = '/' + parts.join('/');
    onNavigate(parent);
  };

  const getFileIcon = (file: models.FileItem) => {
    if (file.isDir) return <Folder className="w-3.5 h-3.5 text-zinc-300 shrink-0" />;
    const ext = file.extension.toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) {
      return <Image className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
    }
    if (['.zip', '.tar', '.gz', '.7z', '.rar', '.bz2', '.xz'].includes(ext)) {
      return <Archive className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
    }
    if (['.js', '.ts', '.tsx', '.go', '.py', '.json', '.html', '.css', '.yaml', '.yml', '.sh', '.bash', '.conf', '.env', '.rs', '.c', '.cpp', '.sql'].includes(ext)) {
      return <FileCode className="w-3.5 h-3.5 text-zinc-300 shrink-0" />;
    }
    if (['.txt', '.md', '.log', '.doc', '.pdf'].includes(ext)) {
      return <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
    }
    return <File className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
  };

  const handleRowClick = (e: React.MouseEvent, file: models.FileItem) => {
    if (e.ctrlKey || e.metaKey) {
      const exists = selectedFiles.includes(file.path);
      const next = exists ? selectedFiles.filter(p => p !== file.path) : [...selectedFiles, file.path];
      onSelect(next, true);
    } else if (e.shiftKey && selectedFiles.length > 0) {
      const lastIndex = files.findIndex(f => f.path === selectedFiles[selectedFiles.length - 1]);
      const curIndex = files.findIndex(f => f.path === file.path);
      if (lastIndex !== -1 && curIndex !== -1) {
        const start = Math.min(lastIndex, curIndex);
        const end = Math.max(lastIndex, curIndex);
        const range = files.slice(start, end + 1).map(f => f.path);
        onSelect(Array.from(new Set([...selectedFiles, ...range])), true);
      }
    } else {
      onSelect([file.path], false);
    }
  };

  const handleDoubleClick = (file: models.FileItem) => {
    if (file.isDir) {
      onNavigate(file.path);
    } else if (isTextFile(file.extension, file.name)) {
      onOpenEditor(file);
    }
  };

  const handleDragStart = (e: React.DragEvent, file: models.FileItem) => {
    const items = selectedFiles.includes(file.path) ? selectedFiles : [file.path];
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'remote', items }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const payload = JSON.parse(raw);
        if (payload.type === 'local' && Array.isArray(payload.items) && payload.items.length > 0) {
          onDropLocalFiles(payload.items);
        }
      }
    } catch (err) {
      console.error('Failed to parse drag drop event:', err);
    }
  };

  // --- In-place Remote Editor View ---
  if (editingFile) {
    const fileName = editingFile.path.split('/').pop() || editingFile.path;
    const lines = editorContent.split('\n');

    return (
      <div className="flex-1 flex flex-col h-full bg-[#09090b] select-none overflow-hidden">
        {/* Editor Toolbar Header */}
        <div className="p-2 border-b border-[#27272a] bg-[#121214] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => {
                if (isDirty && !confirm('Close editor and discard unsaved changes?')) {
                  return;
                }
                onCloseEditor();
              }}
              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition flex items-center gap-1 text-xs cursor-pointer"
              title="Return to file browser"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="text-[11px] font-mono">Back</span>
            </button>

            <div className="w-px h-3.5 bg-zinc-800 mx-0.5" />

            <FileCode className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
            <div className="flex items-baseline gap-1.5 min-w-0 truncate">
              <span className="text-xs font-semibold text-zinc-100 font-mono truncate">{fileName}</span>
              <span className="text-[10px] text-zinc-500 font-mono truncate hidden md:inline">({editingFile.path})</span>
            </div>

            {isDirty && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                Unsaved
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {editorStatus && (
              <div className={`text-[11px] font-mono flex items-center gap-1 ${
                editorStatus.type === 'success' ? 'text-zinc-300' : 'text-red-400'
              }`}>
                {editorStatus.type === 'success' ? <Check className="w-3 h-3 text-zinc-200" /> : null}
                <span>{editorStatus.text}</span>
              </div>
            )}

            <button
              onClick={handleTriggerReload}
              disabled={isReloading}
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
              title="Reload from server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleTriggerSave}
              disabled={isSaving || !isDirty}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-200 hover:bg-white text-zinc-950 font-medium text-xs disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-xs"
              title="Save to remote server (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Editor Body with Line Numbers */}
        <div className="flex-1 flex overflow-hidden font-mono text-xs bg-[#09090b]">
          {/* Gutter / Line Numbers */}
          <div className="w-12 py-2 pr-2 text-right select-none text-zinc-600 bg-[#09090b] border-r border-[#27272a] shrink-0 overflow-hidden font-tabular">
            {lines.map((_, i) => (
              <div key={i} className="leading-5 text-[11px]">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={editorContent}
            onChange={e => {
              setEditorContent(e.target.value);
              setIsDirty(true);
            }}
            onKeyDown={handleEditorKeyDown}
            spellCheck={false}
            className="flex-1 p-2 bg-transparent text-zinc-100 leading-5 resize-none focus:outline-none overflow-auto whitespace-pre font-mono"
          />
        </div>

        {/* Editor Status Bar */}
        <div className="px-3 py-1 border-t border-[#27272a] bg-[#121214] text-[10px] font-mono text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>Lines: {lines.length}</span>
            <span>Chars: {editorContent.length}</span>
          </div>
          <div>
            <span>UTF-8 | Remote File</span>
          </div>
        </div>
      </div>
    );
  }

  // --- Normal File Explorer View ---
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()));
  const rowPadding = 'py-1 px-2.5';

  return (
    <div
      className={`flex-1 flex flex-col h-full bg-[#09090b] select-none overflow-hidden transition ${
        isDragOver ? 'ring-1 ring-zinc-400 bg-zinc-900/40' : ''
      }`}
      onClick={() => setContextMenu(null)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Pane Toolbar Header */}
      <div className="p-2 border-b border-[#27272a] bg-[#121214] flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          {/* Hoverable and Clickable Host Badge with Action Menu */}
          <div className="relative" ref={hostMenuRef}>
            <button
              type="button"
              onClick={() => setIsHostMenuOpen(prev => !prev)}
              className="group flex items-center gap-2 px-2 py-1 rounded bg-[#09090b] hover:bg-zinc-800/80 border border-[#27272a] hover:border-zinc-700 transition cursor-pointer text-left"
              title="Click for host actions (Disconnect, Edit Host, Open Terminal...)"
            >
              <div className="relative flex items-center justify-center">
                <Server className="w-3.5 h-3.5 text-zinc-300 shrink-0 transition group-hover:scale-105" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-zinc-200 ring-2 ring-[#121214]" />
              </div>

              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                  {sessionProfile.name || sessionProfile.host}
                </span>
                <span className="text-[11px] font-mono text-zinc-400 group-hover:text-zinc-300 truncate hidden sm:inline">
                  ({sessionProfile.user ? `${sessionProfile.user}@` : ''}{sessionProfile.host})
                </span>
              </div>

              <ChevronDown className={`w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-transform duration-200 ${isHostMenuOpen ? 'rotate-180 text-zinc-300' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isHostMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#18181b] border border-[#27272a] rounded-lg shadow-2xl py-1 z-50 font-sans">
                {/* Host Info Header */}
                <div className="px-3 py-1.5 border-b border-[#27272a] flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span className="truncate">{sessionProfile.user || 'user'}@{sessionProfile.host}:{sessionProfile.port || 22}</span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[9px] border border-zinc-700 font-medium tracking-wide">
                    CONNECTED
                  </span>
                </div>

                {/* Open SSH Terminal */}
                <button
                  type="button"
                  onClick={() => {
                    setIsHostMenuOpen(false);
                    onLaunchTerminal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition text-left cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <div className="flex-1 truncate">
                    <div className="font-medium text-zinc-200">Open SSH Terminal</div>
                    <div className="text-[10px] text-zinc-500">Windows Terminal / PowerShell</div>
                  </div>
                </button>

                {/* Edit Host Settings */}
                <button
                  type="button"
                  onClick={() => {
                    setIsHostMenuOpen(false);
                    onEditHost();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition text-left cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <div className="flex-1 truncate">
                    <div className="font-medium text-zinc-200">Edit Host Settings</div>
                    <div className="text-[10px] text-zinc-500">Configure credentials & keys</div>
                  </div>
                </button>

                {/* Copy Host Address */}
                <button
                  type="button"
                  onClick={() => {
                    const addr = `${sessionProfile.user ? sessionProfile.user + '@' : ''}${sessionProfile.host}`;
                    navigator.clipboard.writeText(addr);
                    setCopiedHost(true);
                    setTimeout(() => {
                      setCopiedHost(false);
                      setIsHostMenuOpen(false);
                    }, 800);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition text-left cursor-pointer"
                >
                  {copiedHost ? <Check className="w-3.5 h-3.5 text-zinc-200 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                  <div className="flex-1 truncate">
                    <div className="font-medium text-zinc-200">{copiedHost ? 'Copied to Clipboard!' : 'Copy Host Address'}</div>
                  </div>
                </button>

                {/* Refresh Files */}
                <button
                  type="button"
                  onClick={() => {
                    setIsHostMenuOpen(false);
                    onRefresh();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition text-left cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <div className="flex-1 truncate">
                    <div className="font-medium text-zinc-200">Refresh Files</div>
                  </div>
                </button>

                <div className="my-1 border-t border-[#27272a]" />

                {/* Disconnect */}
                <button
                  type="button"
                  onClick={() => {
                    setIsHostMenuOpen(false);
                    onDisconnect();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-200 hover:bg-red-950/40 transition text-left cursor-pointer"
                >
                  <PowerOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <div className="flex-1 truncate">
                    <div className="font-medium text-red-400">Disconnect</div>
                    <div className="text-[10px] text-red-400/70">Close SFTP session</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={handleGoUp}
              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
              title="Parent directory (..)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRefresh}
              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                const name = prompt('Enter new remote folder name:');
                if (name) onCreateFolder(name);
              }}
              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
              title="New Folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Segmented Breadcrumb & Quick Filter */}
        <div className="flex items-center gap-2 bg-[#09090b] border border-[#27272a] rounded px-2 py-0.5">
          <SegmentedBreadcrumb
            currentPath={currentPath}
            isWindows={false}
            onNavigate={onNavigate}
          />

          <div className="relative w-28 shrink-0">
            <Search className="w-3 h-3 absolute left-1.5 top-1.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Filter..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full bg-transparent pl-5 pr-1 py-0.5 text-[11px] text-zinc-200 focus:outline-none placeholder:text-zinc-600 font-mono"
            />
          </div>
        </div>
      </div>

      {/* File List Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#121214] sticky top-0 border-b border-[#27272a] text-[10px] uppercase font-mono tracking-wider text-zinc-400 select-none z-10">
            <tr>
              <th className="py-1.5 px-2.5 font-medium">Name</th>
              <th className="py-1.5 px-2.5 font-medium text-right w-20">Size</th>
              <th className="py-1.5 px-2.5 font-medium w-20">Rights</th>
              <th className="py-1.5 px-2.5 font-medium w-36">Modified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272a]/40 font-mono text-[11px]">
            {/* Parent Directory Row */}
            <tr
              onDoubleClick={handleGoUp}
              className={`hover:bg-zinc-900/80 cursor-pointer text-zinc-400 ${rowPadding}`}
            >
              <td colSpan={4} className={`${rowPadding} flex items-center gap-2`}>
                <Folder className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>..</span>
              </td>
            </tr>

            {filteredFiles.map(file => {
              const isSelected = selectedFiles.includes(file.path);
              return (
                <tr
                  key={file.path}
                  draggable
                  onDragStart={e => handleDragStart(e, file)}
                  onClick={e => handleRowClick(e, file)}
                  onDoubleClick={() => handleDoubleClick(file)}
                  onContextMenu={e => {
                    e.preventDefault();
                    if (!selectedFiles.includes(file.path)) {
                      onSelect([file.path], false);
                    }
                    setContextMenu({ x: e.clientX, y: e.clientY, file });
                  }}
                  className={`cursor-pointer transition select-none ${
                    isSelected
                      ? 'bg-zinc-800 text-white font-medium border-l-2 border-zinc-200'
                      : 'hover:bg-zinc-900/60 text-zinc-300'
                  }`}
                >
                  <td className={`${rowPadding} flex items-center gap-2 truncate`}>
                    {getFileIcon(file)}
                    <span className="truncate">{file.name}</span>
                  </td>
                  <td className={`${rowPadding} text-right text-zinc-400 shrink-0 font-tabular`}>
                    {file.isDir ? '<DIR>' : formatBytes(file.size)}
                  </td>
                  <td className={`${rowPadding} text-zinc-400 shrink-0 font-tabular text-[10px]`}>
                    {file.octalMode || file.mode}
                  </td>
                  <td className={`${rowPadding} text-zinc-500 truncate shrink-0 font-tabular text-[10px]`}>
                    {formatDate(file.modTime)}
                  </td>
                </tr>
              );
            })}

            {filteredFiles.length === 0 && !isLoading && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-zinc-500 italic text-xs">
                  Directory is empty
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pane Footer Info */}
      <div className="px-2.5 py-1 border-t border-[#27272a] bg-[#121214] text-[10px] font-mono text-zinc-500 flex items-center justify-between">
        <span>{filteredFiles.length} items</span>
        <span>{selectedFiles.length} selected</span>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#18181b] border border-[#27272a] rounded-lg shadow-2xl py-1 text-xs w-48 text-zinc-200"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          {isTextFile(contextMenu.file.extension, contextMenu.file.name) && (
            <button
              onClick={() => {
                onOpenEditor(contextMenu.file);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 hover:text-white flex items-center gap-2 cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-zinc-400" />
              Edit File in Place
            </button>
          )}

          <button
            onClick={() => {
              onDownload(selectedFiles.length > 0 ? selectedFiles : [contextMenu.file.path]);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 hover:text-white flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            &larr; Download to Local
          </button>

          <button
            onClick={() => {
              onChmod(contextMenu.file);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 hover:text-white flex items-center gap-2 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-zinc-400" />
            Permissions (Chmod)
          </button>

          <div className="h-px bg-[#27272a] my-1" />

          <button
            onClick={() => {
              const newName = prompt('Rename item to:', contextMenu.file.name);
              if (newName && newName !== contextMenu.file.name) {
                onRename(contextMenu.file.path, newName);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 hover:text-white flex items-center gap-2 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Rename
          </button>

          <button
            onClick={() => {
              if (confirm(`Delete "${contextMenu.file.name}" on remote server?`)) {
                onDelete(contextMenu.file.path, contextMenu.file.isDir);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-red-950/40 text-red-400 hover:text-red-200 flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};
