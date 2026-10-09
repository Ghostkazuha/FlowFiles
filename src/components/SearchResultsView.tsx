import React, { useState, useMemo } from 'react';
import {
  Search,
  FolderOpen,
  Filter,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import {
  SearchResultEntry,
  FileCategory,
  SizeFilter,
  DateFilter,
  SortDirection,
  SortField,
} from '../types/filesystem';
import { FileIcon } from './FileIcon';
import { formatBytes, formatDate } from '../utils/fileUtils';
import { getDisplayName } from '../utils/appSettings';

interface SearchResultsViewProps {
  query: string;
  results: SearchResultEntry[];
  isLoading: boolean;
  error: string | null;
  inaccessiblePaths: { path: string; error: string }[];
  showFileExtensions: boolean;
  singleClickOpen: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onOpen: (entry: SearchResultEntry) => void;
  onOpenFolder: (item: SearchResultEntry) => void;
  onContextMenu: (e: React.MouseEvent, item?: SearchResultEntry) => void;
  onClearSearch: () => void;
  categoryFilter?: FileCategory | 'all';
  onCategoryFilterChange: (cat: FileCategory | 'all') => void;
  sizeFilter?: SizeFilter;
  onSizeFilterChange: (size: SizeFilter) => void;
  dateFilter?: DateFilter;
  onDateFilterChange?: (date: DateFilter) => void;
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  query,
  results,
  isLoading,
  error,
  inaccessiblePaths,
  showFileExtensions,
  singleClickOpen,
  sortField,
  sortDirection,
  selectedIds,
  onSelectionChange,
  onOpen,
  onOpenFolder,
  onContextMenu,
  onClearSearch,
  categoryFilter = 'all',
  onCategoryFilterChange,
  sizeFilter = 'all',
  onSizeFilterChange,
  dateFilter = 'all',
  onDateFilterChange,
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const sortedResults = useMemo(() => {
    const sorted = [...results];
    sorted.sort((left, right) => {
      if (left.isDirectory !== right.isDirectory) return left.isDirectory ? -1 : 1;
      let leftValue: string | number = left.name.toLocaleLowerCase();
      let rightValue: string | number = right.name.toLocaleLowerCase();
      if (sortField === 'modifiedDate') {
        leftValue = left.modifiedDate;
        rightValue = right.modifiedDate;
      } else if (sortField === 'type') {
        leftValue = left.extension || left.category;
        rightValue = right.extension || right.category;
      } else if (sortField === 'size') {
        leftValue = left.size;
        rightValue = right.size;
      }
      if (leftValue < rightValue) return sortDirection === 'asc' ? -1 : 1;
      if (leftValue > rightValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [results, sortField, sortDirection]);

  // Filter counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: sortedResults.length,
      document: 0,
      code: 0,
      image: 0,
      video: 0,
      audio: 0,
      archive: 0,
      folder: 0,
    };
    sortedResults.forEach((r) => {
      if (counts[r.category] !== undefined) {
        counts[r.category]++;
      }
    });
    return counts;
  }, [sortedResults]);

  // Highlight helper
  const renderHighlighted = (text: string, term: string) => {
    if (!term.trim()) return text;
    const parts = text.split(new RegExp(`(${term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <mark key={i} className="bg-sky-500/30 text-sky-200 px-0.5 rounded-xs font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Search Header Banner */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-col gap-2 shrink-0 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Search className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex items-baseline gap-2">
              <span className="text-xs font-semibold text-slate-100 truncate">
                Search results for &ldquo;{query}&rdquo;
              </span>
              <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                ({sortedResults.length} {sortedResults.length === 1 ? 'match' : 'matches'})
              </span>
              <span className="text-[10px] text-slate-500">Names · current folder + subfolders</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClearSearch}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills row */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'document', label: 'Documents' },
            { id: 'code', label: 'Code' },
            { id: 'image', label: 'Images' },
            { id: 'video', label: 'Videos' },
            { id: 'audio', label: 'Audio' },
            { id: 'archive', label: 'Archives' },
          ].map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            if (cat.id !== 'all' && count === 0) return null;
            const isSelected = categoryFilter === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => onCategoryFilterChange(cat.id as FileCategory | 'all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0 border ${
                  isSelected
                    ? 'bg-sky-500/20 text-sky-200 border-sky-500/40 font-semibold'
                    : 'bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-750/60'
                }`}
              >
                <span>{cat.label}</span>
                <span className="font-mono text-[10px] opacity-70 tabular-nums">
                  {count}
                </span>
              </button>
            );
          })}

          <div className="w-px h-3.5 bg-slate-800 mx-1 shrink-0" />

          {/* Quick size filter */}
          <select
            value={sizeFilter}
            onChange={(e) => onSizeFilterChange(e.target.value as SizeFilter)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-0.5 text-[11px] outline-none cursor-pointer"
          >
            <option value="all">Any Size</option>
            <option value="tiny">Tiny (&lt; 10 KB)</option>
            <option value="small">Small (10 KB – 1 MB)</option>
            <option value="medium">Medium (1 – 128 MB)</option>
            <option value="large">Large (&gt; 128 MB)</option>
            <option value="huge">Huge (&gt; 1 GB)</option>
          </select>

          {/* Quick date filter */}
          <select
            value={dateFilter}
            onChange={(e) => onDateFilterChange?.(e.target.value as DateFilter)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-0.5 text-[11px] outline-none cursor-pointer"
          >
            <option value="all">Any Date</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-900/80 p-2 text-xs">
        {error && (
          <div className="m-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200">
            <div className="font-semibold">Search could not complete</div>
            <div className="mt-1 break-words text-rose-200/80">{error}</div>
          </div>
        )}
        {!error && inaccessiblePaths.length > 0 && (
          <div className="m-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
            Search finished with {inaccessiblePaths.length} inaccessible folder
            {inaccessiblePaths.length === 1 ? '' : 's'}; results may be incomplete.
            <ul className="mt-1 max-h-20 overflow-auto text-[11px] text-amber-100/80">
              {inaccessiblePaths.slice(0, 5).map((item) => (
                <li key={item.path} className="break-all">{item.path}: {item.error}</li>
              ))}
            </ul>
          </div>
        )}
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            <span>Searching file and folder names...</span>
          </div>
        ) : error ? null : sortedResults.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
            <Search className="w-10 h-10 text-slate-600 mb-1" />
            <span className="font-semibold text-slate-300 text-sm">
              {inaccessiblePaths.length > 0 ? 'No matches in accessible folders' : 'No matching files or folders'}
            </span>
            <span className="text-xs max-w-sm leading-relaxed">
              {inaccessiblePaths.length > 0
                ? `No accessible entries matched “${query}”. Some folders could not be searched.`
                : `Nothing named “${query}” was found in this folder or its subfolders.`}
            </span>
          </div>
        ) : (
          sortedResults.map((item) => {
            const isSelected = selectedIdSet.has(item.id);

            return (
              <div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectionChange([item.id]);
                  if (singleClickOpen) onOpen(item);
                }}
                onDoubleClick={singleClickOpen ? undefined : () => onOpen(item)}
                onContextMenu={(e) => {
                  e.stopPropagation();
                  if (!isSelected) onSelectionChange([item.id]);
                  onContextMenu(e, item);
                }}
                className={`p-2.5 rounded-lg transition-colors cursor-pointer group flex items-start justify-between gap-3 border ${
                  isSelected
                    ? 'bg-sky-600/20 border-sky-500/40 text-white'
                    : 'bg-slate-900/30 hover:bg-slate-900 border-transparent hover:border-slate-800/80 text-slate-300'
                }`}
              >
                {/* Left: Icon and details */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="pt-0.5">
                    <FileIcon
                      category={item.category}
                      extension={item.extension}
                      isDirectory={item.isDirectory}
                      thumbnailUrl={item.thumbnailUrl}
                      className="w-5 h-5 shrink-0"
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-100 group-hover:text-white truncate">
                        {renderHighlighted(
                          getDisplayName(
                            item.name,
                            item.extension,
                            item.isDirectory,
                            showFileExtensions
                          ),
                          query
                        )}
                      </span>

                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                        {item.isDirectory ? 'Folder' : item.extension || item.category}
                      </span>
                    </div>

                    {/* Path and folder jumping */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono truncate">
                      <span className="truncate">{item.path}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Date, Size & Jump Action */}
                <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFolder(item);
                      }}
                      className="px-2 py-1 bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white rounded text-[11px] flex items-center gap-1 transition-colors border border-slate-700/60"
                      title="Open Containing Folder"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                      <span className="hidden sm:inline">Open Folder</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 tabular-nums font-mono space-y-0.5">
                    <div>{formatBytes(item.size)}</div>
                    <div className="text-[10px] text-slate-500">
                      {formatDate(item.modifiedDate)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
