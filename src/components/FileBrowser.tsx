import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  FolderPlus,
  Inbox,
  ArrowUpDown,
  HardDrive,
} from 'lucide-react';
import {
  FileEntry,
  ViewMode,
  GridSize,
  SortField,
  SortDirection,
} from '../types/filesystem';
import { FileIcon } from './FileIcon';
import { formatBytes, formatDate, validateFileName } from '../utils/fileUtils';
import { getDisplayName } from '../utils/appSettings';

interface FileBrowserProps {
  entries: FileEntry[];
  currentPath: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onOpen: (entry: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent, item?: FileEntry) => void;
  viewMode: ViewMode;
  gridSize: GridSize;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  onRenameSubmit: (oldPath: string, newName: string) => Promise<void>;
  onDropMove?: (sourcePaths: string[], destPath: string) => void;
  onNewFolder: () => void;
  searchActive?: boolean;
  isLoading?: boolean;
  showFileExtensions: boolean;
  singleClickOpen: boolean;
  compactDensity: boolean;
  externalRenamingId?: string | null;
  onRenamingComplete?: () => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  entries,
  currentPath,
  selectedIds,
  onSelectionChange,
  onOpen,
  onContextMenu,
  viewMode,
  gridSize,
  sortField,
  sortDirection,
  onSortChange,
  onRenameSubmit,
  onDropMove,
  onNewFolder,
  searchActive,
  isLoading,
  showFileExtensions,
  singleClickOpen,
  compactDensity,
  externalRenamingId,
  onRenamingComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Marquee drag selection
  const [isMarqueeDragging, setIsMarqueeDragging] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<{ x: number; y: number } | null>(null);

  // Drag and drop of files
  const [draggedIds, setDraggedIds] = useState<string[]>([]);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Focus rename input and select base name
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      const dotIndex = renameValue.lastIndexOf('.');
      if (dotIndex > 0) {
        renameInputRef.current.setSelectionRange(0, dotIndex);
      } else {
        renameInputRef.current.select();
      }
    }
  }, [renamingId]);

  // Start inline rename
  const handleStartRename = useCallback((entry: FileEntry) => {
    setRenamingId(entry.id);
    setRenameValue(entry.name);
    setRenameError(null);
  }, []);

  // Listen to external rename trigger (e.g. Toolbar button or context menu)
  useEffect(() => {
    if (externalRenamingId) {
      const item = entries.find((e) => e.id === externalRenamingId);
      if (item) handleStartRename(item);
    }
  }, [externalRenamingId, entries, handleStartRename]);

  const handleFinishRename = async () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    const entry = entries.find((e) => e.id === renamingId);
    if (!entry) {
      setRenamingId(null);
      onRenamingComplete?.();
      return;
    }

    if (trimmed === entry.name) {
      setRenamingId(null);
      onRenamingComplete?.();
      return;
    }

    const validation = validateFileName(trimmed);
    if (!validation.valid) {
      setRenameError(validation.error || 'Invalid name');
      return;
    }

    try {
      await onRenameSubmit(entry.path, trimmed);
      setRenamingId(null);
      setRenameError(null);
      onRenamingComplete?.();
    } catch (err: unknown) {
      setRenameError(err instanceof Error ? err.message : 'Rename failed');
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (renamingId) {
      if (e.key === 'Escape') {
        setRenamingId(null);
        setRenameError(null);
      }
      return;
    }

    if (e.key === 'Enter' && selectedIds.length === 1) {
      const entry = entries.find((item) => item.id === selectedIds[0]);
      if (entry) onOpen(entry);
      return;
    }

    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSelectionChange(entries.map((item) => item.id));
      return;
    }

    // Arrow keys navigation
    if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault();
      if (entries.length === 0) return;

      const currentIndex = entries.findIndex((item) => item.id === selectedIds[0]);
      let nextIndex = 0;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        nextIndex = currentIndex === -1 ? 0 : Math.min(entries.length - 1, currentIndex + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        nextIndex = currentIndex === -1 ? 0 : Math.max(0, currentIndex - 1);
      }

      onSelectionChange([entries[nextIndex].id]);
    }
  };

  // Selection handlers
  const handleItemClick = (e: React.MouseEvent, item: FileEntry) => {
    e.stopPropagation();

    if (singleClickOpen && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      onSelectionChange([item.id]);
      onOpen(item);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      if (selectedIdSet.has(item.id)) {
        onSelectionChange(selectedIds.filter((id) => id !== item.id));
      } else {
        onSelectionChange([...selectedIds, item.id]);
      }
    } else if (e.shiftKey && selectedIds.length > 0) {
      // Range selection
      const lastSelectedId = selectedIds[selectedIds.length - 1];
      const lastIndex = entries.findIndex((e) => e.id === lastSelectedId);
      const currentIndex = entries.findIndex((e) => e.id === item.id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = entries.slice(start, end + 1).map((e) => e.id);
        onSelectionChange(rangeIds);
      }
    } else {
      // Normal single selection
      onSelectionChange([item.id]);
    }
  };

  // Background click: deselect
  const handleBackgroundClick = () => {
    onSelectionChange([]);
    if (renamingId) {
      handleFinishRename();
    }
  };

  // Sort toggle on header click
  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
  };

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, item: FileEntry) => {
    const idsToDrag = selectedIds.includes(item.id) ? selectedIds : [item.id];
    setDraggedIds(idsToDrag);
    e.dataTransfer.setData('text/plain', JSON.stringify(idsToDrag));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e: React.DragEvent, item?: FileEntry) => {
    e.preventDefault();
    if (item && item.isDirectory && !draggedIds.includes(item.id)) {
      setDragOverTargetId(item.id);
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragLeave = () => {
    setDragOverTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetFolder: FileEntry) => {
    e.preventDefault();
    setDragOverTargetId(null);
    if (!targetFolder.isDirectory) return;

    try {
      const data = e.dataTransfer.getData('text/plain');
      const ids: string[] = JSON.parse(data);
      if (ids && ids.length > 0 && onDropMove) {
        onDropMove(ids, targetFolder.path);
      }
    } catch {
      // ignore
    }
  };

  // Marquee drag selection handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    if (e.target !== containerRef.current && !(e.target as HTMLElement).classList.contains('bg-surface-drop')) {
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsMarqueeDragging(true);
    const startPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setMarqueeStart(startPt);
    setMarqueeCurrent(startPt);
    onSelectionChange([]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMarqueeDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMarqueeCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseUp = () => {
    setIsMarqueeDragging(false);
    setMarqueeStart(null);
    setMarqueeCurrent(null);
  };

  // Render Loading State
  if (isLoading) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-slate-400 font-medium">Reading directory...</span>
      </div>
    );
  }

  // Render Empty State
  if (entries.length === 0) {
    return (
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={handleBackgroundClick}
        onContextMenu={(e) => onContextMenu(e)}
        className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-6 text-center outline-none select-none relative overflow-y-auto"
      >
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-500 shadow-inner">
          <Inbox className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-semibold text-slate-300">
          {searchActive ? 'No items match your search' : 'This folder is empty'}
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          {searchActive
            ? 'Try checking your spelling or search across all drives.'
            : 'You can create a new folder, add text files, or paste copied items here.'}
        </p>
        {!searchActive && (
          <button
            onClick={onNewFolder}
            className="mt-4 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-md flex items-center gap-2 transition-colors shadow-xs"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Create new folder</span>
          </button>
        )}
      </div>
    );
  }

  // Calculate marquee rectangle
  const marqueeRect =
    isMarqueeDragging && marqueeStart && marqueeCurrent
      ? {
          left: Math.min(marqueeStart.x, marqueeCurrent.x),
          top: Math.min(marqueeStart.y, marqueeCurrent.y),
          width: Math.abs(marqueeCurrent.x - marqueeStart.x),
          height: Math.abs(marqueeCurrent.y - marqueeStart.y),
        }
      : null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={handleBackgroundClick}
      onContextMenu={(e) => onContextMenu(e)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="flex-1 bg-slate-950 flex flex-col outline-none overflow-y-auto select-none relative"
    >
      {/* Marquee Selection Rectangle Overlay */}
      {marqueeRect && marqueeRect.width > 4 && marqueeRect.height > 4 && (
        <div
          className="absolute border border-sky-400 bg-sky-500/15 pointer-events-none z-40 rounded-xs"
          style={{
            left: `${marqueeRect.left}px`,
            top: `${marqueeRect.top}px`,
            width: `${marqueeRect.width}px`,
            height: `${marqueeRect.height}px`,
          }}
        />
      )}

      {/* 1. DETAILS VIEW */}
      {viewMode === 'details' && (
        <div className="w-full text-xs">
          {/* Header Row */}
          <div onClick={(e) => e.stopPropagation()} className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold grid grid-cols-12 px-3 py-2 text-[11px]">
            <button
              onClick={() => handleSortToggle('name')}
              className="col-span-6 sm:col-span-5 text-left flex items-center gap-1 hover:text-slate-200 transition-colors"
            >
              <span>Name</span>
              {sortField === 'name' ? (
                sortDirection === 'asc' ? (
                  <ChevronUp className="w-3 h-3 text-sky-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-sky-400" />
                )
              ) : (
                <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
              )}
            </button>

            <button
              onClick={() => handleSortToggle('modifiedDate')}
              className="col-span-3 sm:col-span-3 text-left flex items-center gap-1 hover:text-slate-200 transition-colors"
            >
              <span>Date modified</span>
              {sortField === 'modifiedDate' ? (
                sortDirection === 'asc' ? (
                  <ChevronUp className="w-3 h-3 text-sky-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-sky-400" />
                )
              ) : (
                <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
              )}
            </button>

            <button
              onClick={() => handleSortToggle('type')}
              className="hidden sm:flex col-span-2 text-left items-center gap-1 hover:text-slate-200 transition-colors"
            >
              <span>Type</span>
              {sortField === 'type' ? (
                sortDirection === 'asc' ? (
                  <ChevronUp className="w-3 h-3 text-sky-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-sky-400" />
                )
              ) : (
                <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
              )}
            </button>

            <button
              onClick={() => handleSortToggle('size')}
              className="col-span-3 sm:col-span-2 text-right flex items-center justify-end gap-1 hover:text-slate-200 transition-colors"
            >
              <span>Size</span>
              {sortField === 'size' ? (
                sortDirection === 'asc' ? (
                  <ChevronUp className="w-3 h-3 text-sky-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-sky-400" />
                )
              ) : (
                <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
              )}
            </button>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-900/60 p-1">
            {entries.map((item) => {
              const isSelected = selectedIdSet.has(item.id);
              const isRenaming = renamingId === item.id;
              const isDragTarget = dragOverTargetId === item.id;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragOver={(e) => handleDragOver(e, item)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, item)}
                  onClick={(e) => handleItemClick(e, item)}
                  onDoubleClick={singleClickOpen ? undefined : () => onOpen(item)}
                  onContextMenu={(e) => {
                    e.stopPropagation();
                    if (!isSelected) {
                      onSelectionChange([item.id]);
                    }
                    onContextMenu(e, item);
                  }}
                  className={`file-entry-row grid grid-cols-12 items-center px-2 ${compactDensity ? 'py-0.5' : 'py-1.5'} rounded transition-colors cursor-pointer group ${
                    isDragTarget
                      ? 'bg-sky-500/30 border border-sky-400'
                      : isSelected
                      ? 'bg-sky-600/25 text-white border border-sky-500/40'
                      : 'hover:bg-slate-900/90 text-slate-300 border border-transparent'
                  }`}
                >
                  {/* Name Column */}
                  <div className="col-span-6 sm:col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
                    <FileIcon
                      category={item.category}
                      extension={item.extension}
                      isDirectory={item.isDirectory}
                      thumbnailUrl={item.thumbnailUrl}
                      className="w-4 h-4 shrink-0"
                    />

                    {isRenaming ? (
                      <div className="flex-1 flex flex-col min-w-0">
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameValue}
                          onChange={(e) => {
                            setRenameValue(e.target.value);
                            setRenameError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleFinishRename();
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          onBlur={handleFinishRename}
                          className="bg-slate-900 border border-sky-400 text-white px-1.5 py-0.5 rounded text-xs outline-none w-full font-sans"
                        />
                        {renameError && (
                          <span className="text-[10px] text-rose-400 mt-0.5 font-sans">
                            {renameError}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="truncate text-xs font-normal group-hover:text-white">
                        {getDisplayName(item.name, item.extension, item.isDirectory, showFileExtensions)}
                      </span>
                    )}
                  </div>

                  {/* Date Modified */}
                  <div className="col-span-3 sm:col-span-3 text-slate-400 tabular-nums truncate text-[11px]">
                    {formatDate(item.modifiedDate)}
                  </div>

                  {/* Type */}
                  <div className="hidden sm:block col-span-2 text-slate-400 truncate text-[11px] capitalize">
                    {item.isDirectory
                      ? 'File folder'
                      : item.extension
                      ? `${item.extension.toUpperCase()} File`
                      : item.category}
                  </div>

                  {/* Size */}
                  <div className="col-span-3 sm:col-span-2 text-right font-mono tabular-nums text-slate-400 text-[11px]">
                    {item.isDirectory
                      ? item.itemCount !== undefined
                        ? `${item.itemCount} items`
                        : ''
                      : formatBytes(item.size)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. GRID / ICONS VIEW */}
      {viewMode === 'grid' && (
        <div
          className={`p-4 grid gap-3 content-start ${
            gridSize === 'compact'
              ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8'
              : gridSize === 'large'
              ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6'
          }`}
        >
          {entries.map((item) => {
            const isSelected = selectedIdSet.has(item.id);
            const isRenaming = renamingId === item.id;
            const isDragTarget = dragOverTargetId === item.id;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragOver={(e) => handleDragOver(e, item)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item)}
                onClick={(e) => handleItemClick(e, item)}
                onDoubleClick={singleClickOpen ? undefined : () => onOpen(item)}
                onContextMenu={(e) => {
                  e.stopPropagation();
                  if (!isSelected) onSelectionChange([item.id]);
                  onContextMenu(e, item);
                }}
                className={`flex flex-col items-center p-2.5 rounded-lg border transition-all cursor-pointer group text-center relative ${
                  isDragTarget
                    ? 'bg-sky-500/30 border-sky-400 shadow-md'
                    : isSelected
                    ? 'bg-sky-600/25 border-sky-500/40 text-white shadow-xs'
                    : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700 text-slate-300'
                }`}
              >
                {/* Thumbnail / Large Icon Box */}
                <div
                  className={`w-full flex items-center justify-center rounded-md mb-2 overflow-hidden ${
                    gridSize === 'large' ? 'h-24' : 'h-16'
                  }`}
                >
                  <FileIcon
                    category={item.category}
                    extension={item.extension}
                    isDirectory={item.isDirectory}
                    thumbnailUrl={item.thumbnailUrl}
                    className={gridSize === 'large' ? 'w-16 h-16' : 'w-10 h-10'}
                  />
                </div>

                {/* Name & Rename */}
                {isRenaming ? (
                  <div className="w-full">
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishRename();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onBlur={handleFinishRename}
                      className="bg-slate-900 border border-sky-400 text-white px-1.5 py-0.5 rounded text-xs outline-none w-full text-center"
                    />
                  </div>
                ) : (
                  <span className="text-xs break-all line-clamp-2 max-w-full font-medium leading-tight group-hover:text-white">
                    {getDisplayName(item.name, item.extension, item.isDirectory, showFileExtensions)}
                  </span>
                )}

                {/* Secondary metadata */}
                <span className="text-[10px] text-slate-500 font-mono tabular-nums mt-1">
                  {item.isDirectory
                    ? item.itemCount !== undefined
                      ? `${item.itemCount} items`
                      : 'Folder'
                    : formatBytes(item.size)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. LIST VIEW */}
      {viewMode === 'list' && (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 content-start">
          {entries.map((item) => {
            const isSelected = selectedIdSet.has(item.id);
            const isRenaming = renamingId === item.id;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onClick={(e) => handleItemClick(e, item)}
                onDoubleClick={singleClickOpen ? undefined : () => onOpen(item)}
                onContextMenu={(e) => {
                  e.stopPropagation();
                  if (!isSelected) onSelectionChange([item.id]);
                  onContextMenu(e, item);
                }}
                className={`file-entry-row flex items-center gap-2 px-2.5 ${compactDensity ? 'py-0.5' : 'py-1.5'} rounded transition-colors cursor-pointer border ${
                  isSelected
                    ? 'bg-sky-600/25 border-sky-500/40 text-white'
                    : 'bg-slate-900/30 border-transparent hover:bg-slate-900 text-slate-300'
                }`}
              >
                <FileIcon
                  category={item.category}
                  extension={item.extension}
                  isDirectory={item.isDirectory}
                  thumbnailUrl={item.thumbnailUrl}
                  className="w-4 h-4 shrink-0"
                />
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onBlur={handleFinishRename}
                    className="bg-slate-900 border border-sky-400 text-white px-1.5 py-0.5 rounded text-xs outline-none w-full"
                  />
                ) : (
                  <span className="truncate text-xs flex-1">{getDisplayName(item.name, item.extension, item.isDirectory, showFileExtensions)}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
