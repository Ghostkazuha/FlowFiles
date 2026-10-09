import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Search,
  X,
  FolderPlus,
  Scissors,
  Copy,
  Clipboard,
  Trash2,
  Edit2,
  Columns,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ChevronRight,
  Copy as CopyIcon,
  Settings,
  PanelRight,
  Check,
  HardDrive,
  Folder,
  Sparkles,
  History,
} from 'lucide-react';
import {
  ViewMode,
  GridSize,
  SortField,
  SortDirection,
} from '../types/filesystem';
import { getBreadcrumbs, normalizePath, getParentPath } from '../utils/fileUtils';
import {
  formatShortcutForDisplay,
  formatShortcutTitle,
  ShortcutBindings,
} from '../utils/keyboardShortcuts';
import { PortalDropdown } from './PortalDropdown';

interface NavigationBarProps {
  currentPath: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoUp: () => void;
  onRefresh: () => void;
  onNavigate: (path: string) => void;
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  // View & Sort
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  gridSize: GridSize;
  onGridSizeChange: (size: GridSize) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  // Quick Actions
  onNewFolder: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  hasClipboard: boolean;
  selectedCount: number;
  onRename: () => void;
  onDelete: () => void;
  // Split pane & Details panel
  isSplitPane: boolean;
  onToggleSplitPane: () => void;
  isDetailsOpen: boolean;
  onToggleDetails: () => void;
  onOpenSettings: () => void;
  shortcutBindings: ShortcutBindings;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  currentPath,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onGoUp,
  onRefresh,
  onNavigate,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  gridSize,
  onGridSizeChange,
  sortField,
  sortDirection,
  onSortChange,
  onNewFolder,
  onCut,
  onCopy,
  onPaste,
  hasClipboard,
  selectedCount,
  onRename,
  onDelete,
  isSplitPane,
  onToggleSplitPane,
  isDetailsOpen,
  onToggleDetails,
  onOpenSettings,
  shortcutBindings,
}) => {
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [pathInput, setPathInput] = useState(currentPath);
  const [openDropdown, setOpenDropdown] = useState<'sort' | 'view' | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const pathInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const viewButtonRef = useRef<HTMLButtonElement>(null);
  const closeDropdown = useCallback(() => setOpenDropdown(null), []);

  useEffect(() => {
    setPathInput(currentPath);
  }, [currentPath]);

  useEffect(() => {
    if (isEditingPath && pathInputRef.current) {
      pathInputRef.current.focus();
      pathInputRef.current.select();
    }
  }, [isEditingPath]);

  useEffect(() => {
    const focusAddress = () => setIsEditingPath(true);
    const focusSearch = () => searchInputRef.current?.focus();
    window.addEventListener('flowfiles:focus-address', focusAddress);
    window.addEventListener('flowfiles:focus-search', focusSearch);
    return () => {
      window.removeEventListener('flowfiles:focus-address', focusAddress);
      window.removeEventListener('flowfiles:focus-search', focusSearch);
    };
  }, []);

  // Click outside to close menus and search suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingPath(false);
    if (pathInput.trim()) {
      onNavigate(pathInput.trim());
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(currentPath);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 1500);
  };

  const breadcrumbs = getBreadcrumbs(currentPath);
  const canGoUpState = currentPath !== 'This PC' && currentPath !== 'Home' && currentPath !== '::RecycleBin';
  const sortFieldLabel =
    sortField === 'modifiedDate'
      ? 'Date modified'
      : sortField.charAt(0).toUpperCase() + sortField.slice(1);
  const viewModeLabel =
    viewMode === 'details' ? 'Details' : viewMode === 'grid' ? 'Grid' : 'List';

  const quickSuggestions = [
    { label: 'Roadmap', query: 'roadmap', hint: 'Doc' },
    { label: 'Architecture', query: 'architecture', hint: 'Spec' },
    { label: 'Contracts', query: 'contract', hint: 'Name' },
    { label: 'Budget 2026', query: 'budget', hint: 'Excel' },
    { label: 'Wallpapers', query: 'wallpaper', hint: 'Name' },
    { label: 'Tauri Apps', query: 'tauri', hint: 'Code' },
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800 flex flex-col text-xs text-slate-200 select-none shrink-0">
      {/* Row 1: Nav buttons, Address bar, Search */}
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        {/* Navigation history controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onGoBack}
            disabled={!canGoBack}
            className="w-7 h-7 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title={formatShortcutTitle('Back', shortcutBindings['go-back'])}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onGoForward}
            disabled={!canGoForward}
            className="w-7 h-7 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title={formatShortcutTitle('Forward', shortcutBindings['go-forward'])}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onGoUp}
            disabled={!canGoUpState}
            className="w-7 h-7 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title={formatShortcutTitle('Up one folder', shortcutBindings['go-up'])}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={onRefresh}
            className="w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title={formatShortcutTitle('Refresh', shortcutBindings.refresh)}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Interactive Address Bar */}
        <div
          className="flex-1 min-w-[180px] h-7 bg-slate-950/80 hover:bg-slate-950 border border-slate-750/70 hover:border-slate-600 rounded flex items-center px-2 text-xs transition-colors overflow-hidden group cursor-text relative"
          onClick={() => {
            if (!isEditingPath) {
              setIsEditingPath(true);
            }
          }}
        >
          {isEditingPath ? (
            <form onSubmit={handlePathSubmit} className="flex-1 flex items-center">
              <input
                ref={pathInputRef}
                type="text"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                onBlur={() => setIsEditingPath(false)}
                className="w-full bg-transparent text-slate-100 outline-none text-xs font-mono"
              />
            </form>
          ) : (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 py-0.5">
              <Folder className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              {breadcrumbs.map((crumb, idx) => (
                <div key={crumb.path} className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(crumb.path);
                    }}
                    className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors font-medium"
                  >
                    {crumb.name}
                  </button>
                  {idx < breadcrumbs.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Copy path shortcut */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyPath();
            }}
            className="w-5 h-5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 flex items-center justify-center transition-colors ml-1 shrink-0"
            title="Copy path"
          >
            {copiedNotification ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <CopyIcon className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Search Bar Container */}
        <div ref={searchContainerRef} className="relative shrink-0">
          <div
            className={`w-60 md:w-72 h-7 bg-slate-950/80 border rounded flex items-center px-2 gap-1.5 text-xs text-slate-300 transition-all ${
              isSearchFocused
                ? 'border-sky-500 ring-1 ring-sky-500/30 bg-slate-950'
                : 'border-slate-750/70 hover:border-slate-600'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search names in this folder..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 outline-none text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="text-slate-500 hover:text-slate-300 shrink-0"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            <span
              className="text-[10px] text-slate-500 whitespace-nowrap"
              title="Searches names in this folder and its subfolders. File contents and other drives are not searched."
            >
              Folder + subfolders
            </span>
          </div>

          {/* Search Suggestions & Tips Popover */}
          {isSearchFocused && !searchQuery && (
            <div className="absolute right-0 mt-1 w-72 bg-slate-900 border border-slate-750 rounded-lg shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-800">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  <span>Suggested Searches</span>
                </span>
                <span className="font-mono text-[10px] text-slate-500">Name search</span>
              </div>

              <div className="py-1 space-y-0.5">
                {quickSuggestions.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      onSearchChange(item.query);
                      setIsSearchFocused(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 flex items-center justify-between text-slate-300 hover:text-white transition-colors"
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {item.hint}
                    </span>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-800 mt-1 pt-1.5 px-2 text-[10px] text-slate-400">
                Searches file and folder names recursively. File contents are not searched.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Action Toolbar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-900/60 border-t border-slate-800/60 gap-2 overflow-x-auto no-scrollbar">
        {/* Left operations group */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onNewFolder}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
            title={formatShortcutTitle('New Folder', shortcutBindings['create-folder'])}
          >
            <FolderPlus className="w-4 h-4 text-amber-400" />
            <span className="font-medium">New</span>
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          <button
            onClick={onCut}
            disabled={selectedCount === 0}
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition-colors"
            title="Cut"
          >
            <Scissors className="w-4 h-4" />
          </button>
          <button
            onClick={onCopy}
            disabled={selectedCount === 0}
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition-colors"
            title="Copy"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onPaste}
            disabled={!hasClipboard}
            className="relative p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition-colors"
            title="Paste"
          >
            <Clipboard className="w-4 h-4 text-sky-400" />
            {hasClipboard && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sky-400" />
            )}
          </button>
          <button
            onClick={onRename}
            disabled={selectedCount !== 1}
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition-colors"
            title={formatShortcutTitle('Rename', shortcutBindings['rename-item'])}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={selectedCount === 0}
            className="p-1.5 rounded hover:bg-red-500/20 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-red-300 transition-colors"
            title={formatShortcutTitle('Recycle', shortcutBindings['recycle-selected'])}
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
          </button>
        </div>

        {/* Right view, sort, split-pane & settings group */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Split-pane toggle */}
          <button
            onClick={onToggleSplitPane}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-xs font-medium ${
              isSplitPane
                ? 'bg-sky-600/20 text-sky-300 border border-sky-500/30'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title={formatShortcutTitle('Toggle Split Pane', shortcutBindings['toggle-split-pane'])}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split Pane</span>
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          {/* Sort dropdown */}
          <div>
            <button
              ref={sortButtonRef}
              onClick={() =>
                setOpenDropdown((current) => (current === 'sort' ? null : 'sort'))
              }
              aria-haspopup="menu"
              aria-expanded={openDropdown === 'sort'}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Sort items"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>{sortFieldLabel}</span>
              {sortDirection === 'asc' ? (
                <ArrowUp className="w-3 h-3 text-sky-400" />
              ) : (
                <ArrowDown className="w-3 h-3 text-sky-400" />
              )}
            </button>

            <PortalDropdown
              anchorRef={sortButtonRef}
              isOpen={openDropdown === 'sort'}
              onClose={closeDropdown}
            >
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-800">
                  Sort By
                </div>
                {(['name', 'modifiedDate', 'type', 'size'] as SortField[]).map((field) => (
                  <button
                    key={field}
                    onClick={() => {
                      onSortChange(field, sortDirection);
                      closeDropdown();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-slate-300 hover:text-white"
                  >
                    <span className="capitalize">{field === 'modifiedDate' ? 'Date modified' : field}</span>
                    {sortField === field && <Check className="w-3.5 h-3.5 text-sky-400" />}
                  </button>
                ))}
                <div className="my-1 border-t border-slate-800" />
                <button
                  onClick={() => {
                    onSortChange(sortField, 'asc');
                    closeDropdown();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-slate-300 hover:text-white"
                >
                  <span>Ascending</span>
                  {sortDirection === 'asc' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>
                <button
                  onClick={() => {
                    onSortChange(sortField, 'desc');
                    closeDropdown();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-slate-300 hover:text-white"
                >
                  <span>Descending</span>
                  {sortDirection === 'desc' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>
            </PortalDropdown>
          </div>

          {/* View mode dropdown */}
          <div>
            <button
              ref={viewButtonRef}
              onClick={() =>
                setOpenDropdown((current) => (current === 'view' ? null : 'view'))
              }
              aria-haspopup="menu"
              aria-expanded={openDropdown === 'view'}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Change view layout"
            >
              {viewMode === 'details' && <List className="w-3.5 h-3.5 text-slate-400" />}
              {viewMode === 'grid' && <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />}
              {viewMode === 'list' && <List className="w-3.5 h-3.5 text-slate-400" />}
              <span>{viewModeLabel}</span>
            </button>

            <PortalDropdown
              anchorRef={viewButtonRef}
              isOpen={openDropdown === 'view'}
              onClose={closeDropdown}
            >
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-800">
                  View Layout
                </div>
                <button
                  onClick={() => {
                    onViewModeChange('details');
                    closeDropdown();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-slate-300 hover:text-white"
                >
                  <div className="flex items-center gap-2">
                    <List className="w-3.5 h-3.5 text-sky-400" />
                    <span>Details view</span>
                  </div>
                  {viewMode === 'details' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>
                <button
                  onClick={() => {
                    onViewModeChange('grid');
                    onGridSizeChange('medium');
                    closeDropdown();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-slate-300 hover:text-white"
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                    <span>Grid / Icons</span>
                  </div>
                  {viewMode === 'grid' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>
                <button
                  onClick={() => {
                    onViewModeChange('list');
                    closeDropdown();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-slate-300 hover:text-white"
                >
                  <div className="flex items-center gap-2">
                    <List className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Compact list</span>
                  </div>
                  {viewMode === 'list' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>
            </PortalDropdown>
          </div>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          {/* Details panel toggle */}
          <button
            onClick={onToggleDetails}
            className={`p-1.5 rounded transition-colors ${
              isDetailsOpen
                ? 'bg-sky-600/20 text-sky-300 border border-sky-500/30'
                : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={formatShortcutTitle('Details & Preview panel', shortcutBindings['toggle-details'])}
          >
            <PanelRight className="w-4 h-4" />
          </button>

          {/* Settings modal trigger */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={formatShortcutTitle('Settings', shortcutBindings['open-settings'])}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
