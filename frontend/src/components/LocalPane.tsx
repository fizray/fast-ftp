import React, { useState } from 'react';
import {
  Folder,
  File,
  HardDrive,
  ArrowUp,
  RefreshCw,
  FolderPlus,
  Trash2,
  Edit2,
  Upload,
  Search,
  FileText,
  FileCode,
  Image,
  Archive,
  FolderOpen,
  AlertTriangle
} from 'lucide-react';
import { models } from '../../wailsjs/go/models';
import { formatBytes, formatDate } from '../utils/format';
import { SegmentedBreadcrumb } from './SegmentedBreadcrumb';

interface LocalPaneProps {
  currentPath: string;
  files: models.FileItem[];
  selectedFiles: string[];
  drives: models.DriveInfo[];
  currentDrive: string;
  isLoading: boolean;
  localError: string | null;
  onNavigate: (path: string) => void;
  onDriveChange: (drive: string) => void;
  onBrowseFolder: () => void;
  onSelect: (paths: string[], isMulti: boolean) => void;
  onUpload: (localFilePaths: string[]) => void;
  onCreateFolder: (name: string) => void;
  onDelete: (path: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  onRefresh: () => void;
}

export const LocalPane: React.FC<LocalPaneProps> = ({
  currentPath,
  files,
  selectedFiles,
  drives,
  currentDrive,
  isLoading,
  localError,
  onNavigate,
  onDriveChange,
  onBrowseFolder,
  onSelect,
  onUpload,
  onCreateFolder,
  onDelete,
  onRename,
  onRefresh,
}) => {
  const [filter, setFilter] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: models.FileItem } | null>(null);

  const handleGoUp = () => {
    const parts = currentPath.replace(/\\+$/, '').split(/\\+/);
    if (parts.length > 1) {
      parts.pop();
      let parent = parts.join('\\');
      if (parent.length === 2 && parent.endsWith(':')) {
        parent += '\\';
      }
      onNavigate(parent);
    } else if (parts.length === 1 && parts[0].length === 2 && parts[0].endsWith(':')) {
      onNavigate(parts[0] + '\\');
    }
  };

  const getFileIcon = (file: models.FileItem) => {
    if (file.isDir) return <Folder className="w-3.5 h-3.5 text-zinc-300 shrink-0" />;
    const ext = file.extension.toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) {
      return <Image className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
    }
    if (['.zip', '.tar', '.gz', '.7z', '.rar'].includes(ext)) {
      return <Archive className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
    }
    if (['.js', '.ts', '.tsx', '.go', '.py', '.json', '.html', '.css', '.rs', '.c', '.cpp', '.sql'].includes(ext)) {
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
    }
  };

  const handleDragStart = (e: React.DragEvent, file: models.FileItem) => {
    const items = selectedFiles.includes(file.path) ? selectedFiles : [file.path];
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'local', items }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()));
  const rowPadding = 'py-1 px-2.5';

  return (
    <div
      className="flex-1 flex flex-col h-full bg-[#09090b] border-r border-[#27272a] select-none overflow-hidden"
      onClick={() => setContextMenu(null)}
    >
      {/* Pane Toolbar Header */}
      <div className="p-2 border-b border-[#27272a] bg-[#121214] flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-zinc-300" />
            <span className="text-xs font-semibold text-zinc-200">Local Disk</span>
            
            {/* Drive selector dropdown */}
            <select
              value={currentDrive}
              onChange={e => onDriveChange(e.target.value)}
              className="bg-[#09090b] border border-[#27272a] rounded px-1.5 py-0.5 text-[11px] text-zinc-200 font-mono focus:outline-none focus:border-zinc-500 cursor-pointer"
              title="Select drive"
            >
              {drives.map(d => (
                <option key={d.letter} value={d.letter}>
                  {d.label || d.letter}
                </option>
              ))}
            </select>

            {/* Folder Picker dialog button */}
            <button
              onClick={onBrowseFolder}
              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition flex items-center gap-1 text-[11px] cursor-pointer"
              title="Browse folder via Windows dialog"
            >
              <FolderOpen className="w-3.5 h-3.5 text-zinc-300" />
              <span className="hidden sm:inline text-[10px]">Browse</span>
            </button>
          </div>

          <div className="flex items-center gap-0.5">
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
                const name = prompt('Enter new folder name:');
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
            isWindows={true}
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

      {/* Error notification banner if any */}
      {localError && (
        <div className="bg-zinc-900 border-b border-red-900/60 px-3 py-1.5 text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="truncate">{localError}</span>
        </div>
      )}

      {/* File List Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#121214] sticky top-0 border-b border-[#27272a] text-[10px] uppercase font-mono tracking-wider text-zinc-400 select-none z-10">
            <tr>
              <th className="py-1.5 px-2.5 font-medium">Name</th>
              <th className="py-1.5 px-2.5 font-medium text-right w-20">Size</th>
              <th className="py-1.5 px-2.5 font-medium w-36">Modified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272a]/40 font-mono text-[11px]">
            {/* Parent Directory Row */}
            <tr
              onDoubleClick={handleGoUp}
              className={`hover:bg-zinc-900/80 cursor-pointer text-zinc-400 ${rowPadding}`}
            >
              <td colSpan={3} className={`${rowPadding} flex items-center gap-2`}>
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
                  <td className={`${rowPadding} text-zinc-500 truncate shrink-0 font-tabular text-[10px]`}>
                    {formatDate(file.modTime)}
                  </td>
                </tr>
              );
            })}

            {filteredFiles.length === 0 && !isLoading && !localError && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-zinc-500 italic text-xs">
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
          className="fixed z-50 bg-[#18181b] border border-[#27272a] rounded-lg shadow-2xl py-1 text-xs w-44 text-zinc-200"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onUpload(selectedFiles.length > 0 ? selectedFiles : [contextMenu.file.path]);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 hover:text-white flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload to Server &rarr;
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
              if (confirm(`Delete "${contextMenu.file.name}"?`)) {
                onDelete(contextMenu.file.path);
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
