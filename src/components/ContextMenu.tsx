import React, { useEffect, useRef } from 'react';
import {
  ExternalLink,
  FolderOpen,
  Scissors,
  Copy,
  Clipboard,
  Trash2,
  Edit2,
  Pin,
  FileCode,
  Info,
  RotateCw,
  FolderPlus,
  FileText,
  Undo2,
  SlidersHorizontal,
  LayoutGrid,
  Columns,
} from 'lucide-react';
import { FileEntry, ViewMode, SortField } from '../types/filesystem';
import { formatShortcutForDisplay, ShortcutBindings } from '../utils/keyboardShortcuts';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ContextMenuProps {
  position: ContextMenuPosition | null;
  targetItem: FileEntry | null;
  selectedItems: FileEntry[];
  currentPath: string;
  hasClipboard: boolean;
  isRecycleBin: boolean;
  shortcutBindings: ShortcutBindings;
  onClose: () => void;
  // Item actions
  onOpen: (item: FileEntry) => void;
  onOpenWithDefault: (item: FileEntry) => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onRename: (item: FileEntry) => void;
  onDelete: () => void;
  onToggleFavorite: (path: string, name: string) => void;
  onCopyPath: (item: FileEntry) => void;
  onProperties: (item?: FileEntry) => void;
  // Background actions
  onNewFolder: () => void;
  onNewFile: () => void;
  onRefresh: () => void;
  onViewChange: (mode: ViewMode) => void;
  onSortChange: (field: SortField) => void;
  onRestoreRecycleItem?: (item: FileEntry) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  targetItem,
  selectedItems,
  currentPath,
  hasClipboard,
  isRecycleBin,
  shortcutBindings,
  onClose,
  onOpen,
  onOpenWithDefault,
  onCut,
  onCopy,
  onPaste,
  onRename,
  onDelete,
  onToggleFavorite,
  onCopyPath,
  onProperties,
  onNewFolder,
  onNewFile,
  onRefresh,
  onViewChange,
  onSortChange,
  onRestoreRecycleItem,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!position) return null;

  // Window bounds check
  const menuWidth = 240;
  const menuHeight = targetItem ? 340 : 300;
  const x = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const y = Math.min(position.y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      style={{ left: `${x}px`, top: `${y}px` }}
      className="fixed z-50 w-60 bg-slate-900/95 backdrop-blur-md border border-slate-750/90 rounded-lg shadow-2xl py-1 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* When clicking an item */}
      {targetItem ? (
        <>
          {isRecycleBin ? (
            <>
              <button
                onClick={() => {
                  onRestoreRecycleItem?.(targetItem);
                  onClose();
                }}
                className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Undo2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium">Restore</span>
                </div>
              </button>
              <button
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="w-full px-3 py-1.5 hover:bg-rose-500/20 text-rose-300 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Delete Permanently</span>
                </div>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  onOpen(targetItem);
                  onClose();
                }}
                className="context-menu-item-primary w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left font-semibold text-white"
              >
                <div className="flex items-center gap-2.5">
                  <FolderOpen className="w-4 h-4 text-sky-400" />
                  <span>Open</span>
                </div>
                <span className="text-[10px] text-slate-500">Enter</span>
              </button>

              {!targetItem.isDirectory && (
                <button
                  onClick={() => {
                    onOpenWithDefault(targetItem);
                    onClose();
                  }}
                  className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left text-slate-300 hover:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <span>Open with Default App</span>
                  </div>
                </button>
              )}

              {targetItem.isDirectory && (
                <button
                  onClick={() => {
                    onToggleFavorite(targetItem.path, targetItem.name);
                    onClose();
                  }}
                  className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left text-slate-300 hover:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <Pin className="w-4 h-4 text-amber-400 rotate-45" />
                    <span>Pin to Favorites</span>
                  </div>
                </button>
              )}

              <div className="my-1 border-t border-slate-800" />

              <button
                onClick={() => {
                  onCut();
                  onClose();
                }}
                className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Scissors className="w-4 h-4 text-slate-400" />
                  <span>Cut</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onCopy();
                  onClose();
                }}
                className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copy</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onCopyPath(targetItem);
                  onClose();
                }}
                className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Copy as path</span>
                </div>
              </button>

              <div className="my-1 border-t border-slate-800" />

              <button
                onClick={() => {
                  onRename(targetItem);
                  onClose();
                }}
                className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Edit2 className="w-4 h-4 text-slate-400" />
                  <span>Rename</span>
                </div>
                {shortcutBindings['rename-item'] && (
                  <span className="text-[10px] text-slate-500 font-mono">{formatShortcutForDisplay(shortcutBindings['rename-item'])}</span>
                )}
              </button>

              <button
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="w-full px-3 py-1.5 hover:bg-rose-500/20 text-rose-300 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Recycle</span>
                </div>
                {shortcutBindings['recycle-selected'] && (
                  <span className="text-[10px] text-slate-500 font-mono">{formatShortcutForDisplay(shortcutBindings['recycle-selected'])}</span>
                )}
              </button>
            </>
          )}

          <div className="my-1 border-t border-slate-800" />

          <button
            onClick={() => {
              onProperties(targetItem);
              onClose();
            }}
            className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-slate-400" />
              <span>Properties</span>
            </div>
            {shortcutBindings['show-properties'] && (
              <span className="text-[10px] text-slate-500 font-mono">{formatShortcutForDisplay(shortcutBindings['show-properties'])}</span>
            )}
          </button>
        </>
      ) : (
        /* When right clicking empty area background */
        <>
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Folder Menu
          </div>

          <button
            onClick={() => {
              onNewFolder();
              onClose();
            }}
            className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left font-medium text-white"
          >
            <div className="flex items-center gap-2.5">
              <FolderPlus className="w-4 h-4 text-amber-400" />
              <span>New folder</span>
            </div>
            {shortcutBindings['create-folder'] && (
              <span className="text-[10px] text-slate-500 font-mono">{formatShortcutForDisplay(shortcutBindings['create-folder'])}</span>
            )}
          </button>

          <button
            onClick={() => {
              onNewFile();
              onClose();
            }}
            className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>New text document</span>
            </div>
          </button>

          <div className="my-1 border-t border-slate-800" />

          <button
            onClick={() => {
              onPaste();
              onClose();
            }}
            disabled={!hasClipboard}
            className="w-full px-3 py-1.5 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2.5">
              <Clipboard className="w-4 h-4 text-sky-400" />
              <span>Paste</span>
            </div>
          </button>

          <button
            onClick={() => {
              onRefresh();
              onClose();
            }}
            className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2.5">
              <RotateCw className="w-4 h-4 text-slate-400" />
              <span>Refresh</span>
            </div>
            {shortcutBindings.refresh && (
              <span className="text-[10px] text-slate-500 font-mono">{formatShortcutForDisplay(shortcutBindings.refresh)}</span>
            )}
          </button>

          <div className="my-1 border-t border-slate-800" />

          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400">
            View Layout
          </div>
          <div className="grid grid-cols-3 gap-1 px-2 py-1">
            <button
              onClick={() => {
                onViewChange('details');
                onClose();
              }}
              className="px-2 py-1 bg-slate-800/60 hover:bg-slate-800 rounded text-center text-[11px]"
            >
              Details
            </button>
            <button
              onClick={() => {
                onViewChange('grid');
                onClose();
              }}
              className="px-2 py-1 bg-slate-800/60 hover:bg-slate-800 rounded text-center text-[11px]"
            >
              Grid
            </button>
            <button
              onClick={() => {
                onViewChange('list');
                onClose();
              }}
              className="px-2 py-1 bg-slate-800/60 hover:bg-slate-800 rounded text-center text-[11px]"
            >
              List
            </button>
          </div>

          <div className="my-1 border-t border-slate-800" />

          <button
            onClick={() => {
              onProperties();
              onClose();
            }}
            className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-slate-400" />
              <span>Folder Properties</span>
            </div>
          </button>
        </>
      )}
    </div>
  );
};
