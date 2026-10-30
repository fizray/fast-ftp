import React, { useState, useEffect } from 'react';
import { ChevronRight, Edit3, Check, X } from 'lucide-react';

interface SegmentedBreadcrumbProps {
  currentPath: string;
  isWindows?: boolean;
  onNavigate: (path: string) => void;
}

export const SegmentedBreadcrumb: React.FC<SegmentedBreadcrumbProps> = ({
  currentPath,
  isWindows = false,
  onNavigate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [rawInput, setRawInput] = useState(currentPath);

  useEffect(() => {
    setRawInput(currentPath);
  }, [currentPath]);

  // Parse segments
  const segments = React.useMemo(() => {
    if (!currentPath) return [];

    if (isWindows) {
      // E.g. C:\Users\fiz\projects
      const parts = currentPath.split(/\\+/).filter(Boolean);
      return parts.map((part, index) => {
        const pathUpTo = parts.slice(0, index + 1).join('\\') + (index === 0 && part.endsWith(':') ? '\\' : '');
        return { name: part, path: pathUpTo };
      });
    } else {
      // Linux/Unix e.g. /home/robin/code
      const parts = currentPath.split(/\/+/).filter(Boolean);
      const rootItem = { name: '/', path: '/' };
      const rest = parts.map((part, index) => {
        const pathUpTo = '/' + parts.slice(0, index + 1).join('/');
        return { name: part, path: pathUpTo };
      });
      return [rootItem, ...rest];
    }
  }, [currentPath, isWindows]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rawInput.trim()) {
      onNavigate(rawInput.trim());
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-1.5 min-w-0">
        <input
          type="text"
          autoFocus
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          onBlur={() => setIsEditing(false)}
          className="flex-1 bg-[#09090b] border border-zinc-600 focus:border-zinc-300 rounded px-2.5 py-0.5 text-xs text-zinc-100 font-mono focus:outline-none"
        />
        <button
          type="submit"
          onMouseDown={e => e.preventDefault()}
          className="p-1 rounded text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </form>
    );
  }

  return (
    <div className="flex-1 flex items-center gap-0.5 overflow-x-auto min-w-0 py-0.5 scrollbar-none group">
      <div className="flex items-center gap-0.5 min-w-0">
        {segments.map((seg, idx) => {
          const isLast = idx === segments.length - 1;
          return (
            <React.Fragment key={seg.path + idx}>
              <button
                type="button"
                onClick={() => onNavigate(seg.path)}
                className={`px-1.5 py-0.5 rounded text-xs font-mono transition truncate max-w-44 cursor-pointer ${
                  isLast
                    ? 'text-zinc-100 font-medium bg-zinc-800/80'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
                title={seg.path}
              >
                {seg.name}
              </button>
              {!isLast && (
                <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0 select-none" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          setRawInput(currentPath);
          setIsEditing(true);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 transition ml-1 shrink-0 cursor-pointer"
        title="Edit address manually"
      >
        <Edit3 className="w-3 h-3" />
      </button>
    </div>
  );
};
