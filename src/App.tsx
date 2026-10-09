import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { NavigationBar } from './components/NavigationBar';
import { Sidebar } from './components/Sidebar';
import { FileBrowser } from './components/FileBrowser';
import { DetailsPanel } from './components/DetailsPanel';
import { StatusBar } from './components/StatusBar';
import { ContextMenu, ContextMenuPosition } from './components/ContextMenu';
import { CommandPalette, CommandItem } from './components/CommandPalette';
import { ConflictModal } from './components/ConflictModal';
import { OperationQueueModal } from './components/OperationQueueModal';
import { PropertiesModal } from './components/PropertiesModal';
import { SettingsModal, AppSettings } from './components/SettingsModal';
import { DemoBanner } from './components/DemoBanner';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import { SearchResultsView } from './components/SearchResultsView';
import { NamePromptModal, NamePromptState } from './components/NamePromptModal';

import {
  TabState,
  FileEntry,
  FileMetadata,
  DriveInfo,
  ViewMode,
  GridSize,
  SortField,
  SortDirection,
  ConflictDialogState,
  OperationProgress,
  SearchResultEntry,
  SizeFilter,
  DateFilter,
  FileCategory,
  KnownFolders,
} from './types/filesystem';
import { getFileSystemAdapter } from './services';
import {
  applyAppAppearance,
  loadAppSettings,
  SETTINGS_STORAGE_KEY,
} from './utils/appSettings';
import {
  normalizePath,
  getParentPath,
  joinPath,
  getBaseName,
} from './utils/fileUtils';
import {
  DEFAULT_SHORTCUT_BINDINGS,
  formatShortcutForDisplay,
  isShortcutAvailable,
  matchesShortcut,
  SHORTCUT_ACTIONS,
  ShortcutId,
} from './utils/keyboardShortcuts';
import {
  Folder,
  Sliders,
  Columns,
  LayoutGrid,
  List,
  FolderPlus,
  Trash2,
  Settings,
  HelpCircle,
  HardDrive,
  FileText,
  RotateCw,
  Sun,
  Moon,
  Monitor,
  Pin,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Search,
  Keyboard,
} from 'lucide-react';

interface ClipboardState {
  items: FileEntry[];
  isCut: boolean;
  sourcePath: string;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}

export default function App() {
  const adapter = useMemo(() => getFileSystemAdapter(), []);
  const initialPath = adapter.isNative ? 'This PC' : 'C:\\Users\\Alex\\Documents';

  // Settings
  const [settings, setSettings] = useState<AppSettings>(loadAppSettings);

  // Apply appearance and follow system theme changes while in System mode.
  useLayoutEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    const updateAppearance = () => applyAppAppearance(settings);
    updateAppearance();
    preference.addEventListener('change', updateAppearance);
    return () => preference.removeEventListener('change', updateAppearance);
  }, [settings]);

  // Drives & Recycle Bin count
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [recycleBinCount, setRecycleBinCount] = useState(0);
  const [knownFolders, setKnownFolders] = useState<KnownFolders | null>(null);

  // Favorites
  const [favorites, setFavorites] = useState<{ name: string; path: string }[]>(adapter.isNative ? [] : [
    { name: 'Projects', path: 'C:\\Users\\Alex\\Projects' },
    { name: 'Wallpapers', path: 'C:\\Users\\Alex\\Pictures\\Wallpapers' },
  ]);

  // Recent locations
  const [recentPaths, setRecentPaths] = useState<string[]>(adapter.isNative ? [] : [
    'C:\\Users\\Alex\\Downloads',
    'C:\\Users\\Alex\\Documents\\Contracts',
  ]);

  // Primary Pane Tabs
  const [tabs, setTabs] = useState<TabState[]>([
    {
      id: 'tab-1',
      title: adapter.isNative ? 'This PC' : 'Documents',
      currentPath: initialPath,
      history: [initialPath],
      historyIndex: 0,
      viewMode: 'details',
      gridSize: 'medium',
      sortField: 'name',
      sortDirection: 'asc',
      searchQuery: '',
      searchCategoryFilter: 'all',
      searchSizeFilter: 'all',
      selectedIds: [],
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  // Secondary Pane (Split-Pane Mode)
  const [isSplitPane, setIsSplitPane] = useState(false);
  const [splitTabs, setSplitTabs] = useState<TabState[]>([
    {
      id: 'split-tab-1',
      title: adapter.isNative ? 'This PC' : 'Downloads',
      currentPath: adapter.isNative ? 'This PC' : 'C:\\Users\\Alex\\Downloads',
      history: [adapter.isNative ? 'This PC' : 'C:\\Users\\Alex\\Downloads'],
      historyIndex: 0,
      viewMode: 'grid',
      gridSize: 'medium',
      sortField: 'modifiedDate',
      sortDirection: 'desc',
      searchQuery: '',
      searchCategoryFilter: 'all',
      searchSizeFilter: 'all',
      selectedIds: [],
    },
  ]);
  const [activeSplitTabId, setActiveSplitTabId] = useState<string>('split-tab-1');
  const [focusedPane, setFocusedPane] = useState<'primary' | 'secondary'>('primary');

  // Active Pane State Helpers
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0];
  }, [tabs, activeTabId]);

  const activeSplitTab = useMemo(() => {
    return splitTabs.find((t) => t.id === activeSplitTabId) || splitTabs[0];
  }, [splitTabs, activeSplitTabId]);

  const currentActiveTab = focusedPane === 'primary' ? activeTab : activeSplitTab;

  // Directory entries cache
  const [primaryEntries, setPrimaryEntries] = useState<FileEntry[]>([]);
  const [splitEntries, setSplitEntries] = useState<FileEntry[]>([]);
  const [primaryLoading, setPrimaryLoading] = useState(false);
  const [splitLoading, setSplitLoading] = useState(false);

  // Search results cache
  const [primarySearchResults, setPrimarySearchResults] = useState<SearchResultEntry[]>([]);
  const [splitSearchResults, setSplitSearchResults] = useState<SearchResultEntry[]>([]);
  const [primarySearchError, setPrimarySearchError] = useState<string | null>(null);
  const [splitSearchError, setSplitSearchError] = useState<string | null>(null);
  const [primarySearchWarnings, setPrimarySearchWarnings] = useState<{ path: string; error: string }[]>([]);
  const [splitSearchWarnings, setSplitSearchWarnings] = useState<{ path: string; error: string }[]>([]);
  const [isSearchingPrimary, setIsSearchingPrimary] = useState(false);
  const [isSearchingSplit, setIsSearchingSplit] = useState(false);
  const directoryRequestIds = useRef({ primary: 0, split: 0 });
  const searchRequestIds = useRef({ primary: 0, split: 0 });
  const metadataRequestId = useRef(0);

  // Metadata for selected item
  const [selectedMetadata, setSelectedMetadata] = useState<FileMetadata | null>(null);

  // Clipboard
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);

  // Name Prompt Modal state (for validated folder creation & renaming)
  const [namePromptState, setNamePromptState] = useState<NamePromptState | null>(null);

  // Panels & Modals
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOperationQueueOpen, setIsOperationQueueOpen] = useState(false);
  const [propertiesItem, setPropertiesItem] = useState<{ item: FileEntry | null; meta: FileMetadata | null; path: string } | null>(null);

  // Context Menu state
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);
  const [contextMenuItem, setContextMenuItem] = useState<FileEntry | null>(null);

  // Conflict Modal state
  const [conflictState, setConflictState] = useState<ConflictDialogState | null>(null);

  // Operation Queue state
  const [operations, setOperations] = useState<OperationProgress[]>([]);

  // Notifications Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const activeShortcutBindings = useMemo(
    () => ({
      ...settings.shortcutBindings,
      ...(adapter.isNative ? { 'create-folder': '', 'rename-item': '', 'recycle-selected': '' } : {}),
      ...(currentActiveTab.currentPath === '::RecycleBin' ? { 'recycle-selected': '' } : {}),
    }),
    [adapter.isNative, currentActiveTab.currentPath, settings.shortcutBindings]
  );

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string, title?: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message, title }]);
    const timer = setTimeout(() => {
      toastTimers.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
    toastTimers.current.set(id, timer);
  }, []);

  useEffect(() => () => {
    toastTimers.current.forEach(clearTimeout);
    toastTimers.current.clear();
    directoryRequestIds.current.primary++;
    directoryRequestIds.current.split++;
    searchRequestIds.current.primary++;
    searchRequestIds.current.split++;
    metadataRequestId.current++;
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Could not save FlowFiles settings.', error);
      addToast('error', 'Settings could not be saved on this device.', 'Settings Error');
    }
  }, [settings, addToast]);

  const dismissToast = (id: string) => {
    const timer = toastTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load drives & initial stats
  useEffect(() => {
    let isCurrent = true;
    adapter.get_known_folders()
      .then((folders) => {
        if (isCurrent) setKnownFolders(folders);
      })
      .catch((err: unknown) => {
        if (isCurrent) {
          addToast('error', errorMessage(err, 'Could not resolve Windows user folders'), 'Folder Resolution Error');
        }
      });
    adapter.list_drives()
      .then((res) => {
        if (isCurrent) setDrives(res);
      })
      .catch((err: unknown) => {
        if (isCurrent) {
          addToast('error', errorMessage(err, 'Could not list Windows drives'), 'Drive Listing Error');
        }
      });
    if (!adapter.isNative && adapter.get_recycle_bin_items) {
      adapter.get_recycle_bin_items()
        .then((items) => {
          if (isCurrent) setRecycleBinCount(items.length);
        })
        .catch((err: unknown) => {
          if (isCurrent) {
            addToast('error', errorMessage(err, 'Could not read Recycle Bin'), 'Recycle Bin Error');
          }
        });
    }
    return () => {
      isCurrent = false;
    };
  }, [adapter, addToast]);

  // Load Directory helper
  const loadDirectory = useCallback(
    async (path: string, isSplit = false) => {
      const pane = isSplit ? 'split' : 'primary';
      const requestId = ++directoryRequestIds.current[pane];
      const setLoading = isSplit ? setSplitLoading : setPrimaryLoading;
      const setEnts = isSplit ? setSplitEntries : setPrimaryEntries;

      setLoading(true);
      try {
        const listing = await adapter.read_directory(path, {
          showHidden: settings.showHiddenFiles,
        });
        if (directoryRequestIds.current[pane] !== requestId) return;
        setEnts(listing.entries);
        if (path.toLowerCase() === 'home' && listing.path.toLowerCase() !== 'home') {
          const setTabsForPane = isSplit ? setSplitTabs : setTabs;
          setTabsForPane((previousTabs) =>
            previousTabs.map((tab) => {
              if (tab.currentPath.toLowerCase() !== 'home') return tab;
              const history = [...tab.history];
              history[tab.historyIndex] = listing.path;
              return {
                ...tab,
                currentPath: listing.path,
                history,
                title: getBaseName(listing.path),
              };
            })
          );
        }

        // Update recent paths
        if (path !== 'This PC' && path !== 'Home' && path !== '::RecycleBin') {
          setRecentPaths((prev) => {
            const filtered = prev.filter((p) => p.toLowerCase() !== path.toLowerCase());
            return [path, ...filtered].slice(0, 8);
          });
        }
      } catch (err: unknown) {
        if (directoryRequestIds.current[pane] !== requestId) return;
        setEnts([]);
        addToast('error', errorMessage(err, 'Failed to read directory'), 'Navigation Error');
      } finally {
        if (directoryRequestIds.current[pane] === requestId) setLoading(false);
      }
    },
    [adapter, settings.showHiddenFiles, addToast]
  );

  // Load active directories on path or hidden settings change
  useEffect(() => {
    if (activeTab?.currentPath) {
      loadDirectory(activeTab.currentPath, false);
    }
  }, [activeTab?.currentPath, settings.showHiddenFiles, loadDirectory]);

  useEffect(() => {
    if (isSplitPane && activeSplitTab?.currentPath) {
      loadDirectory(activeSplitTab.currentPath, true);
    }
  }, [isSplitPane, activeSplitTab?.currentPath, settings.showHiddenFiles, loadDirectory]);

  // Search Execution Effect for Primary Tab
  useEffect(() => {
    const requestId = ++searchRequestIds.current.primary;
    const q = activeTab?.searchQuery?.trim();
    if (!q) {
      setPrimarySearchResults([]);
      setPrimarySearchError(null);
      setPrimarySearchWarnings([]);
      setIsSearchingPrimary(false);
      return;
    }

    setPrimarySearchResults([]);
    setPrimarySearchError(null);
    setPrimarySearchWarnings([]);
    setIsSearchingPrimary(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      adapter
        .search(q, activeTab.currentPath, {
          category: activeTab.searchCategoryFilter,
          sizeFilter: activeTab.searchSizeFilter,
          dateFilter: activeTab.searchDateFilter,
          showHidden: settings.showHiddenFiles,
        }, controller.signal)
        .then((response) => {
          if (searchRequestIds.current.primary !== requestId) return;
          setPrimarySearchResults(response.results);
          setPrimarySearchWarnings(response.inaccessiblePaths);
          setIsSearchingPrimary(false);
        })
        .catch((err: unknown) => {
          if (searchRequestIds.current.primary !== requestId) return;
          setPrimarySearchResults([]);
          setPrimarySearchError(errorMessage(err, 'Search failed'));
          setIsSearchingPrimary(false);
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
      if (searchRequestIds.current.primary === requestId) {
        searchRequestIds.current.primary++;
      }
    };
  }, [
    activeTab?.searchQuery,
    activeTab?.searchCategoryFilter,
    activeTab?.searchSizeFilter,
    activeTab?.searchDateFilter,
    activeTab?.currentPath,
    settings.showHiddenFiles,
    adapter,
  ]);

  // Search Execution Effect for Split Tab
  useEffect(() => {
    const requestId = ++searchRequestIds.current.split;
    if (!isSplitPane) {
      setIsSearchingSplit(false);
      return;
    }
    const q = activeSplitTab?.searchQuery?.trim();
    if (!q) {
      setSplitSearchResults([]);
      setSplitSearchError(null);
      setSplitSearchWarnings([]);
      setIsSearchingSplit(false);
      return;
    }

    setSplitSearchResults([]);
    setSplitSearchError(null);
    setSplitSearchWarnings([]);
    setIsSearchingSplit(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      adapter
        .search(q, activeSplitTab.currentPath, {
          category: activeSplitTab.searchCategoryFilter,
          sizeFilter: activeSplitTab.searchSizeFilter,
          dateFilter: activeSplitTab.searchDateFilter,
          showHidden: settings.showHiddenFiles,
        }, controller.signal)
        .then((response) => {
          if (searchRequestIds.current.split !== requestId) return;
          setSplitSearchResults(response.results);
          setSplitSearchWarnings(response.inaccessiblePaths);
          setIsSearchingSplit(false);
        })
        .catch((err: unknown) => {
          if (searchRequestIds.current.split !== requestId) return;
          setSplitSearchResults([]);
          setSplitSearchError(errorMessage(err, 'Search failed'));
          setIsSearchingSplit(false);
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
      if (searchRequestIds.current.split === requestId) {
        searchRequestIds.current.split++;
      }
    };
  }, [
    isSplitPane,
    activeSplitTab?.searchQuery,
    activeSplitTab?.searchCategoryFilter,
    activeSplitTab?.searchSizeFilter,
    activeSplitTab?.searchDateFilter,
    activeSplitTab?.currentPath,
    settings.showHiddenFiles,
    adapter,
  ]);

  // Load metadata when single selection changes
  useEffect(() => {
    const requestId = ++metadataRequestId.current;
    const activeSelectedIds = currentActiveTab.selectedIds;
    const currentList = focusedPane === 'primary' ? primaryEntries : splitEntries;

    if (activeSelectedIds.length === 1) {
      const entry = currentList.find((e) => e.id === activeSelectedIds[0]);
      if (entry) {
        if (adapter.isNative) {
          setSelectedMetadata(entry);
          return;
        }
        setSelectedMetadata(null);
        adapter
          .get_file_metadata(entry.path)
          .then((meta) => {
            if (metadataRequestId.current === requestId) setSelectedMetadata(meta);
          })
          .catch((err: unknown) => {
            if (metadataRequestId.current !== requestId) return;
            setSelectedMetadata(null);
            addToast('error', errorMessage(err, 'Could not read file metadata'), 'Metadata Error');
          });
      } else {
        setSelectedMetadata(null);
      }
    } else {
      setSelectedMetadata(null);
    }
  }, [currentActiveTab.selectedIds, focusedPane, primaryEntries, splitEntries, adapter, addToast]);

  // Tab State update helper
  const updateTab = useCallback(
    (tabId: string, updates: Partial<TabState>, isSplit = false) => {
      const setter = isSplit ? setSplitTabs : setTabs;
      setter((prev) =>
        prev.map((t) => {
          if (t.id === tabId) {
            return { ...t, ...updates };
          }
          return t;
        })
      );
    },
    []
  );

  // Navigation handlers
  const handleNavigate = useCallback(
    (newPath: string, isSplit = focusedPane === 'secondary') => {
      const targetTab = isSplit ? activeSplitTab : activeTab;
      const norm = normalizePath(
        newPath.toLowerCase() === 'home' ? knownFolders?.home ?? newPath : newPath
      );

      if (norm.toLowerCase() === targetTab.currentPath.toLowerCase()) {
        if (targetTab.searchQuery || targetTab.selectedIds.length > 0) {
          updateTab(targetTab.id, { searchQuery: '', selectedIds: [] }, isSplit);
        }
        return;
      }

      // Append to history
      const newHistory = targetTab.history.slice(0, targetTab.historyIndex + 1);
      newHistory.push(norm);

      updateTab(
        targetTab.id,
        {
          currentPath: norm,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          selectedIds: [],
          searchQuery: '',
          title: getBaseName(norm),
        },
        isSplit
      );
    },
    [focusedPane, activeSplitTab, activeTab, knownFolders, updateTab]
  );

  const handleGoBack = useCallback(
    (isSplit = focusedPane === 'secondary') => {
      const targetTab = isSplit ? activeSplitTab : activeTab;
      if (targetTab.historyIndex > 0) {
        const nextIndex = targetTab.historyIndex - 1;
        const targetPath = targetTab.history[nextIndex];
        updateTab(
          targetTab.id,
          {
            currentPath: targetPath,
            historyIndex: nextIndex,
            selectedIds: [],
            title: getBaseName(targetPath),
          },
          isSplit
        );
      }
    },
    [focusedPane, activeSplitTab, activeTab, updateTab]
  );

  const handleGoForward = useCallback(
    (isSplit = focusedPane === 'secondary') => {
      const targetTab = isSplit ? activeSplitTab : activeTab;
      if (targetTab.historyIndex < targetTab.history.length - 1) {
        const nextIndex = targetTab.historyIndex + 1;
        const targetPath = targetTab.history[nextIndex];
        updateTab(
          targetTab.id,
          {
            currentPath: targetPath,
            historyIndex: nextIndex,
            selectedIds: [],
            title: getBaseName(targetPath),
          },
          isSplit
        );
      }
    },
    [focusedPane, activeSplitTab, activeTab, updateTab]
  );

  const handleGoUp = useCallback(
    (isSplit = focusedPane === 'secondary') => {
      const targetTab = isSplit ? activeSplitTab : activeTab;
      const parent = getParentPath(targetTab.currentPath);
      handleNavigate(parent, isSplit);
    },
    [focusedPane, activeSplitTab, activeTab, handleNavigate]
  );

  const handleRefresh = useCallback(() => {
    loadDirectory(activeTab.currentPath, false);
    if (isSplitPane) {
      loadDirectory(activeSplitTab.currentPath, true);
    }
    adapter.list_drives()
      .then((res) => setDrives(res))
      .catch((err: unknown) => {
        addToast('error', errorMessage(err, 'Could not list Windows drives'), 'Drive Listing Error');
      });
    if (!adapter.isNative && adapter.get_recycle_bin_items) {
      adapter.get_recycle_bin_items()
        .then((items) => setRecycleBinCount(items.length))
        .catch((err: unknown) => {
          addToast('error', errorMessage(err, 'Could not read Recycle Bin'), 'Recycle Bin Error');
        });
    }
    addToast('info', 'Folder refreshed', 'Refresh');
  }, [loadDirectory, activeTab.currentPath, isSplitPane, activeSplitTab?.currentPath, adapter, addToast]);

  // Tab management
  const handleNewTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: TabState = {
      id: newId,
      title: 'This PC',
      currentPath: 'This PC',
      history: ['This PC'],
      historyIndex: 0,
      viewMode: 'details',
      gridSize: 'medium',
      sortField: 'name',
      sortDirection: 'asc',
      searchQuery: '',
      searchCategoryFilter: 'all',
      searchSizeFilter: 'all',
      selectedIds: [],
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleOpenContainingFolder = useCallback(
    (folderPath: string, itemId?: string, isSplit = focusedPane === 'secondary') => {
      handleNavigate(folderPath, isSplit);
      const targetTab = isSplit ? activeSplitTab : activeTab;
      if (itemId) {
        updateTab(
          targetTab.id,
          { selectedIds: [itemId], searchQuery: '' },
          isSplit
        );
      } else {
        updateTab(
          targetTab.id,
          { searchQuery: '' },
          isSplit
        );
      }
    },
    [handleNavigate, updateTab, focusedPane, activeSplitTab, activeTab]
  );

  const handleCloseTab = (id: string) => {
    if (tabs.length <= 1) return;
    const nextTabs = tabs.filter((t) => t.id !== id);
    setTabs(nextTabs);
    if (activeTabId === id) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  const openWithDefaultApp = useCallback(
    async (path: string) => {
      try {
        const result = await adapter.open_with_default_app(path);
        if (!result.success) {
          addToast('error', result.message, 'Open Failed');
        }
      } catch (err: unknown) {
        addToast('error', err instanceof Error ? err.message : 'Failed to launch application');
      }
    },
    [adapter, addToast]
  );

  // Open item (Double click or Enter)
  const handleOpenItem = useCallback(
    async (entry: FileEntry) => {
      if (entry.isDirectory) {
        handleNavigate(entry.path);
      } else {
        await openWithDefaultApp(entry.path);
      }
    },
    [handleNavigate, openWithDefaultApp]
  );

  // File Operations: Create folder
  const handleNewFolder = () => {
    const parentPath = currentActiveTab.currentPath;
    if (parentPath === 'This PC' || parentPath === 'Home' || parentPath === '::RecycleBin') {
      addToast('error', 'Cannot create folders in this virtual location.');
      return;
    }

    // Generate unique suggestion name e.g. "New Folder", "New Folder (2)"
    let baseName = 'New folder';
    let folderName = baseName;
    let count = 2;
    const currentList = focusedPane === 'primary' ? primaryEntries : splitEntries;
    const existingNames = currentList.map((e) => e.name);

    while (existingNames.some((n) => n.toLowerCase() === folderName.toLowerCase())) {
      folderName = `${baseName} (${count})`;
      count++;
    }

    setNamePromptState({
      isOpen: true,
      mode: 'create_folder',
      title: 'Create New Folder',
      initialValue: folderName,
      existingNames,
      onSubmit: async (chosenName: string) => {
        try {
          const created = await adapter.create_directory(parentPath, chosenName);
          await loadDirectory(parentPath, focusedPane === 'secondary');
          updateTab(currentActiveTab.id, { selectedIds: [created.id] }, focusedPane === 'secondary');
          addToast('success', `Created folder "${chosenName}"`);
        } catch (err: unknown) {
          addToast('error', err instanceof Error ? err.message : 'Failed to create folder');
          throw err;
        }
      },
    });
  };

  const handleStartRenameItem = (entry: FileEntry) => {
    const currentList = focusedPane === 'primary' ? primaryEntries : splitEntries;
    const existingNames = currentList.filter((e) => e.id !== entry.id).map((e) => e.name);

    setNamePromptState({
      isOpen: true,
      mode: 'rename',
      title: `Rename "${entry.name}"`,
      initialValue: entry.name,
      existingNames,
      onSubmit: async (newName: string) => {
        await handleRenameSubmit(entry.path, newName);
      },
    });
  };

  // File Operations: Create text file
  const handleNewFile = async () => {
    const parentPath = currentActiveTab.currentPath;
    if (!adapter.create_file) return;

    let baseName = 'New Text Document.txt';
    let fileName = baseName;
    let count = 2;
    const currentList = focusedPane === 'primary' ? primaryEntries : splitEntries;
    while (currentList.some((e) => e.name.toLowerCase() === fileName.toLowerCase())) {
      fileName = `New Text Document (${count}).txt`;
      count++;
    }

    try {
      const created = await adapter.create_file(parentPath, fileName, '');
      await loadDirectory(parentPath, focusedPane === 'secondary');
      updateTab(currentActiveTab.id, { selectedIds: [created.id] }, focusedPane === 'secondary');
      addToast('success', `Created file "${fileName}"`);
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Failed to create text document');
    }
  };

  // File Operations: Rename
  const handleRenameSubmit = async (oldPath: string, newName: string) => {
    try {
      const updated = await adapter.rename_path(oldPath, newName);
      await loadDirectory(currentActiveTab.currentPath, focusedPane === 'secondary');
      updateTab(currentActiveTab.id, { selectedIds: [updated.id] }, focusedPane === 'secondary');
      addToast('success', `Renamed to "${newName}"`);
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Rename failed');
      throw err;
    }
  };

  // Clipboard Operations: Cut & Copy
  const handleCut = () => {
    const currentList = focusedPane === 'primary' ? primaryEntries : splitEntries;
    const selected = currentList.filter((e) => currentActiveTab.selectedIds.includes(e.id));
    if (selected.length === 0) return;

    setClipboard({
      items: selected,
      isCut: true,
      sourcePath: currentActiveTab.currentPath,
    });
    addToast('info', `Cut ${selected.length} item(s) to clipboard`);
  };

  const handleCopy = () => {
    const currentList = focusedPane === 'primary' ? primaryEntries : splitEntries;
    const selected = currentList.filter((e) => currentActiveTab.selectedIds.includes(e.id));
    if (selected.length === 0) return;

    setClipboard({
      items: selected,
      isCut: false,
      sourcePath: currentActiveTab.currentPath,
    });
    addToast('info', `Copied ${selected.length} item(s) to clipboard`);
  };

  // Clipboard Operations: Paste
  const handlePaste = async () => {
    if (!clipboard || clipboard.items.length === 0) return;
    const destPath = currentActiveTab.currentPath;

    if (destPath === 'This PC' || destPath === 'Home' || destPath === '::RecycleBin') {
      addToast('error', 'Cannot paste into this system directory.');
      return;
    }

    const currentList = focusedPane === 'primary' ? primaryEntries : splitEntries;
    const sourcePaths = clipboard.items.map((i) => i.path);

    // Conflict Check: does an item with same name already exist?
    const conflictingItem = clipboard.items.find((item) =>
      currentList.some((e) => e.name.toLowerCase() === item.name.toLowerCase())
    );

    if (conflictingItem) {
      const existing = currentList.find((e) => e.name.toLowerCase() === conflictingItem.name.toLowerCase())!;
      // Open conflict dialog
      setConflictState({
        isOpen: true,
        sourceItem: conflictingItem,
        existingItem: existing,
        destinationPath: destPath,
        operationType: clipboard.isCut ? 'move' : 'copy',
        onResolve: async (resolution) => {
          if (resolution === 'skip') {
            addToast('info', 'File paste skipped.');
            return;
          }
          await executePaste(sourcePaths, destPath, clipboard.isCut);
        },
      });
      return;
    }

    await executePaste(sourcePaths, destPath, clipboard.isCut);
  };

  const executePaste = async (sourcePaths: string[], destPath: string, isCut: boolean) => {
    const opId = `op_${Date.now()}`;
    const initialProgress: OperationProgress = {
      id: opId,
      type: isCut ? 'move' : 'copy',
      title: `${isCut ? 'Moving' : 'Copying'} ${sourcePaths.length} item(s)`,
      currentItem: 'Initializing...',
      processedItems: 0,
      totalItems: sourcePaths.length,
      percent: 0,
      bytesTransferred: 0,
      totalBytes: 100000,
      status: 'running',
    };
    setOperations((prev) => [initialProgress, ...prev]);

    try {
      const method = isCut ? adapter.move_paths : adapter.copy_paths;
      const res = await method.call(adapter, sourcePaths, destPath, (p) => {
        setOperations((prev) => prev.map((o) => (o.id === opId ? { ...o, ...p } : o)));
      });

      if (res.success) {
        addToast('success', `${isCut ? 'Moved' : 'Copied'} ${res.successful.length} item(s)`);
        if (isCut) setClipboard(null);
      } else {
        addToast('error', `Some items could not be copied: ${res.failed.map((f) => f.error).join(', ')}`);
      }
      await loadDirectory(destPath, focusedPane === 'secondary');
      if (isCut && clipboard?.sourcePath) {
        await loadDirectory(clipboard.sourcePath, false);
      }
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Operation failed');
    }
  };

  // Delete / Send to Recycle Bin
  const handleDelete = async () => {
    const currentList = focusedPane === 'primary' ? primaryEntries : splitEntries;
    const selected = currentList.filter((e) => currentActiveTab.selectedIds.includes(e.id));
    if (selected.length === 0) return;

    if (currentActiveTab.currentPath === '::RecycleBin') {
      // Empty or delete permanently confirmation
      if (adapter.empty_recycle_bin) {
        await adapter.empty_recycle_bin();
        setRecycleBinCount(0);
        await loadDirectory('::RecycleBin', focusedPane === 'secondary');
        addToast('success', 'Recycle Bin emptied');
      }
      return;
    }

    try {
      const paths = selected.map((s) => s.path);
      const res = await adapter.send_to_recycle_bin(paths);
      if (res.success) {
        addToast('success', `Moved ${res.successful.length} item(s) to Recycle Bin`);
        if (adapter.get_recycle_bin_items) {
          const items = await adapter.get_recycle_bin_items();
          setRecycleBinCount(items.length);
        }
      }
      await loadDirectory(currentActiveTab.currentPath, focusedPane === 'secondary');
      updateTab(currentActiveTab.id, { selectedIds: [] }, focusedPane === 'secondary');
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Failed to recycle');
    }
  };

  // Restore from Recycle Bin
  const handleRestoreRecycleItem = async (item: FileEntry) => {
    if (!adapter.restore_from_recycle_bin) return;
    const rbId = item.path.split('\\').pop() || item.id;
    try {
      await adapter.restore_from_recycle_bin([rbId]);
      await loadDirectory('::RecycleBin', focusedPane === 'secondary');
      if (adapter.get_recycle_bin_items) {
        const items = await adapter.get_recycle_bin_items();
        setRecycleBinCount(items.length);
      }
      addToast('success', `Restored "${item.name}"`);
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Restore failed');
    }
  };

  // Favorites toggle
  const handleToggleFavorite = (path: string, name: string) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.path.toLowerCase() === path.toLowerCase());
      if (exists) {
        addToast('info', `Unpinned "${name}" from Favorites`);
        return prev.filter((f) => f.path.toLowerCase() !== path.toLowerCase());
      } else {
        addToast('success', `Pinned "${name}" to Favorites`);
        return [...prev, { name, path }];
      }
    });
  };

  // Context Menu trigger
  const handleContextMenu = (e: React.MouseEvent, item?: FileEntry) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setContextMenuItem(item || null);
  };

  // Drag and Drop move between directories
  const handleDropMove = async (sourcePaths: string[], destPath: string) => {
    try {
      await adapter.move_paths(sourcePaths, destPath);
      addToast('success', `Moved items to ${getBaseName(destPath)}`);
      await loadDirectory(currentActiveTab.currentPath, focusedPane === 'secondary');
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Move failed');
    }
  };

  // Keyboard shortcuts are dispatched through the shared registry and saved bindings.
  useEffect(() => {
    const shortcutActions: Record<ShortcutId, () => void | boolean> = {
      'go-back': handleGoBack,
      'go-forward': handleGoForward,
      'go-up': handleGoUp,
      refresh: handleRefresh,
      'new-tab': handleNewTab,
      'close-tab': () => handleCloseTab(activeTabId),
      'create-folder': handleNewFolder,
      'rename-item': () => {
        const selectedId = currentActiveTab.selectedIds[0];
        const currentList = focusedPane === 'primary' ? primaryEntries : splitEntries;
        const item = currentList.find((entry) => entry.id === selectedId);
        if (!item || currentActiveTab.searchQuery.trim()) return false;
        handleStartRenameItem(item);
        return true;
      },
      'recycle-selected': () => {
        if (currentActiveTab.currentPath === '::RecycleBin' || currentActiveTab.selectedIds.length === 0) {
          return false;
        }
        const currentList = focusedPane === 'primary' ? primaryEntries : splitEntries;
        if (!currentList.some((entry) => currentActiveTab.selectedIds.includes(entry.id))) return false;
        void handleDelete();
        return true;
      },
      'focus-search': () => window.dispatchEvent(new Event('flowfiles:focus-search')),
      'focus-address': () => window.dispatchEvent(new Event('flowfiles:focus-address')),
      'switch-view': () => updateTab(
        currentActiveTab.id,
        { viewMode: currentActiveTab.viewMode === 'grid' ? 'list' : 'grid' },
        focusedPane === 'secondary'
      ),
      'toggle-details': () => setIsDetailsOpen((previous) => !previous),
      'toggle-split-pane': () => setIsSplitPane((previous) => !previous),
      'open-command-palette': () => setIsCommandPaletteOpen(true),
      'open-settings': () => setIsSettingsOpen(true),
      'show-properties': () => {
        const currentList = focusedPane === 'primary' ? primaryEntries : splitEntries;
        const item = currentList.find((entry) => entry.id === currentActiveTab.selectedIds[0]) || null;
        setPropertiesItem({
          item,
          meta: selectedMetadata,
          path: currentActiveTab.currentPath,
        });
      },
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      const target = e.target;
      const isEditable =
        target instanceof HTMLElement &&
        (        target.isContentEditable ||
        target.closest('input, textarea, select, [contenteditable="true"]'));
      if (target instanceof HTMLElement && target.closest('[data-shortcut-recorder="true"]')) return;

      for (const action of SHORTCUT_ACTIONS) {
        if (!isShortcutAvailable(action.id, adapter.isNative)) continue;
        if (isEditable && !('allowInEditable' in action && action.allowInEditable)) continue;
        if (!matchesShortcut(e, settings.shortcutBindings[action.id] || '')) continue;
        if (shortcutActions[action.id]() === false) continue;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    activeTabId,
    currentActiveTab,
    focusedPane,
    primaryEntries,
    splitEntries,
    tabs.length,
    selectedMetadata,
    handleNewTab,
    handleCloseTab,
    handleRefresh,
    handleGoUp,
    handleGoBack,
    handleGoForward,
    handleNewFolder,
    handleStartRenameItem,
    handleDelete,
    adapter.isNative,
    settings.shortcutBindings,
    updateTab,
  ]);

  // Command palette items
  const commandList = useMemo<CommandItem[]>(
    () => ([
      {
        id: 'cmd-back',
        title: 'Go Back',
        category: 'Navigation',
        icon: ArrowLeft,
        shortcut: formatShortcutForDisplay(settings.shortcutBindings['go-back']),
        action: handleGoBack,
      },
      {
        id: 'cmd-forward',
        title: 'Go Forward',
        category: 'Navigation',
        icon: ArrowRight,
        shortcut: formatShortcutForDisplay(settings.shortcutBindings['go-forward']),
        action: handleGoForward,
      },
      {
        id: 'cmd-up',
        title: 'Go Up One Folder',
        category: 'Navigation',
        icon: ArrowUp,
        shortcut: formatShortcutForDisplay(settings.shortcutBindings['go-up']),
        action: handleGoUp,
      },
      {
        id: 'cmd-refresh',
        title: 'Refresh Directory',
        category: 'Navigation',
        icon: RotateCw,
        shortcut: formatShortcutForDisplay(settings.shortcutBindings.refresh),
        action: handleRefresh,
      },
      {
        id: 'cmd-newtab',
        title: 'Open New Tab',
        category: 'Tabs',
        icon: Folder,
        shortcut: formatShortcutForDisplay(settings.shortcutBindings['new-tab']),
        action: handleNewTab,
      },
      {
        id: 'cmd-closetab',
        title: 'Close Current Tab',
        category: 'Tabs',
        icon: Folder,
        shortcut: formatShortcutForDisplay(settings.shortcutBindings['close-tab']),
        action: () => handleCloseTab(activeTabId),
      },
      {
        id: 'cmd-focus-search',
        title: 'Focus File Search',
        category: 'Search',
        icon: Search,
        shortcut: formatShortcutForDisplay(settings.shortcutBindings['focus-search']),
        action: () => window.dispatchEvent(new Event('flowfiles:focus-search')),
      },
      {
        id: 'cmd-focus-address',
        title: 'Focus Address Bar',
        category: 'Navigation',
        icon: Keyboard,
        shortcut: formatShortcutForDisplay(settings.shortcutBindings['focus-address']),
        action: () => window.dispatchEvent(new Event('flowfiles:focus-address')),
      },
      {
        id: 'cmd-home',
        title: 'Go to Home',
        category: 'Navigation',
        icon: Folder,
        action: () => handleNavigate('Home'),
      },
      {
        id: 'cmd-pc',
        title: 'Go to This PC (All Drives)',
        category: 'Navigation',
        icon: Monitor,
        action: () => handleNavigate('This PC'),
      },
      {
        id: 'cmd-downloads',
        title: 'Go to Downloads',
        category: 'Navigation',
        icon: Folder,
        action: () => handleNavigate('C:\\Users\\Alex\\Downloads'),
      },
      {
        id: 'cmd-docs',
        title: 'Go to Documents',
        category: 'Navigation',
        icon: FileText,
        action: () => handleNavigate('C:\\Users\\Alex\\Documents'),
      },
      {
        id: 'cmd-pictures',
        title: 'Go to Pictures',
        category: 'Navigation',
        icon: Folder,
        action: () => handleNavigate('C:\\Users\\Alex\\Pictures'),
      },
      {
        id: 'cmd-recycle',
        title: 'Go to Recycle Bin',
        category: 'Navigation',
        icon: Trash2,
        action: () => handleNavigate('::RecycleBin'),
      },
      {
        id: 'cmd-newfolder',
        title: 'Create New Folder',
        category: 'Actions',
        icon: FolderPlus,
        shortcut: adapter.isNative ? undefined : formatShortcutForDisplay(settings.shortcutBindings['create-folder']),
        action: handleNewFolder,
      },
      {
        id: 'cmd-splitpane',
        title: 'Toggle Split-Pane Dual View',
        category: 'View & Layout',
        icon: Columns,
        shortcut: formatShortcutForDisplay(settings.shortcutBindings['toggle-split-pane']),
        action: () => setIsSplitPane((prev) => !prev),
      },
      {
        id: 'cmd-detailsview',
        title: 'Switch to Details View',
        category: 'View & Layout',
        icon: List,
        action: () => updateTab(currentActiveTab.id, { viewMode: 'details' }, focusedPane === 'secondary'),
      },
      {
        id: 'cmd-gridview',
        title: 'Switch to Grid View',
        category: 'View & Layout',
        icon: LayoutGrid,
        action: () => updateTab(currentActiveTab.id, { viewMode: 'grid' }, focusedPane === 'secondary'),
      },
      {
        id: 'cmd-switchview',
        title: 'Toggle list/grid view',
        category: 'View & Layout',
        icon: LayoutGrid,
        shortcut: formatShortcutForDisplay(settings.shortcutBindings['switch-view']),
        action: () =>
          updateTab(
            currentActiveTab.id,
            { viewMode: currentActiveTab.viewMode === 'grid' ? 'list' : 'grid' },
            focusedPane === 'secondary'
          ),
      },
      {
        id: 'cmd-details-panel',
        title: 'Toggle Details Panel',
        category: 'View & Layout',
        icon: Sliders,
        shortcut: formatShortcutForDisplay(settings.shortcutBindings['toggle-details']),
        action: () => setIsDetailsOpen((previous) => !previous),
      },
      {
        id: 'cmd-rename',
        title: 'Rename Selected Item',
        category: 'Actions',
        icon: FileText,
        shortcut: adapter.isNative ? undefined : formatShortcutForDisplay(settings.shortcutBindings['rename-item']),
        action: () => {
          const currentList = focusedPane === 'primary' ? primaryEntries : splitEntries;
          const selected = currentList.find((entry) => entry.id === currentActiveTab.selectedIds[0]);
          if (selected) handleStartRenameItem(selected);
        },
      },
      {
        id: 'cmd-properties',
        title: 'Show File Properties',
        category: 'Actions',
        icon: FileText,
        shortcut: formatShortcutForDisplay(settings.shortcutBindings['show-properties']),
        action: () => {
          const currentList = focusedPane === 'primary' ? primaryEntries : splitEntries;
          const item = currentList.find((entry) => entry.id === currentActiveTab.selectedIds[0]) || null;
          setPropertiesItem({ item, meta: selectedMetadata, path: currentActiveTab.currentPath });
        },
      },
      {
        id: 'cmd-opqueue',
        title: 'View Operations Queue',
        category: 'Actions',
        icon: Sliders,
        action: () => setIsOperationQueueOpen(true),
      },
      {
        id: 'cmd-settings',
        title: 'Open Settings',
        category: 'System',
        icon: Settings,
        shortcut: formatShortcutForDisplay(settings.shortcutBindings['open-settings']),
        action: () => setIsSettingsOpen(true),
      },
      {
        id: 'cmd-theme',
        title: 'Toggle Theme (Dark / Light)',
        category: 'System',
        icon: settings.theme === 'dark' ? Sun : Moon,
        action: () => setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' })),
      },
    ] satisfies CommandItem[]).filter((command) =>
      (!adapter.isNative || (command.id !== 'cmd-newfolder' && command.id !== 'cmd-rename')) &&
      (command.id !== 'cmd-rename' ||
        (currentActiveTab.selectedIds.length === 1 && !currentActiveTab.searchQuery.trim() && currentActiveTab.currentPath !== '::RecycleBin')) &&
      (command.id !== 'cmd-closetab' || tabs.length > 1)
    ),
    [
      handleNavigate,
      handleNewFolder,
      handleGoBack,
      handleGoForward,
      handleGoUp,
      handleRefresh,
      handleNewTab,
      handleCloseTab,
      handleStartRenameItem,
      activeTabId,
      tabs.length,
      currentActiveTab,
      focusedPane,
      primaryEntries,
      splitEntries,
      selectedMetadata,
      updateTab,
      settings.theme,
      settings.shortcutBindings,
      adapter.isNative,
    ]
  );

  // Filtered entries according to current active tab search
  const filteredPrimaryEntries = useMemo(() => {
    let list = [...primaryEntries];
    if (activeTab.searchQuery.trim()) {
      const q = activeTab.searchQuery.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    // Sorting
    list.sort((a, b) => {
      // Folders first
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      let valA: string | number = a.name;
      let valB: string | number = b.name;

      if (activeTab.sortField === 'modifiedDate') {
        valA = a.modifiedDate;
        valB = b.modifiedDate;
      } else if (activeTab.sortField === 'type') {
        valA = a.extension || a.category;
        valB = b.extension || b.category;
      } else if (activeTab.sortField === 'size') {
        valA = a.size;
        valB = b.size;
      }

      if (valA < valB) return activeTab.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return activeTab.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [primaryEntries, activeTab.searchQuery, activeTab.sortField, activeTab.sortDirection]);

  const filteredSplitEntries = useMemo(() => {
    let list = [...splitEntries];
    if (activeSplitTab.searchQuery.trim()) {
      const q = activeSplitTab.searchQuery.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      let valA: string | number = a.name;
      let valB: string | number = b.name;
      if (activeSplitTab.sortField === 'modifiedDate') {
        valA = a.modifiedDate;
        valB = b.modifiedDate;
      } else if (activeSplitTab.sortField === 'type') {
        valA = a.extension || a.category;
        valB = b.extension || b.category;
      } else if (activeSplitTab.sortField === 'size') {
        valA = a.size;
        valB = b.size;
      }
      if (valA < valB) return activeSplitTab.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return activeSplitTab.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [splitEntries, activeSplitTab.searchQuery, activeSplitTab.sortField, activeSplitTab.sortDirection]);

  // Selected items calculation
  const selectedPrimaryItems = useMemo(
    () => primaryEntries.filter((e) => activeTab.selectedIds.includes(e.id)),
    [primaryEntries, activeTab.selectedIds]
  );
  const selectedSplitItems = useMemo(
    () => splitEntries.filter((e) => activeSplitTab.selectedIds.includes(e.id)),
    [splitEntries, activeSplitTab.selectedIds]
  );

  const activeSelectedItems = focusedPane === 'primary' ? selectedPrimaryItems : selectedSplitItems;
  const currentEntries = focusedPane === 'primary' ? primaryEntries : splitEntries;
  const currentTotalBytes = currentEntries.reduce((acc, c) => acc + c.size, 0);
  const selectedTotalBytes = activeSelectedItems.reduce((acc, c) => acc + c.size, 0);

  // Current drive
  const currentDrive = useMemo(() => {
    const rootLetter = currentActiveTab.currentPath.slice(0, 2).toUpperCase();
    return drives.find((d) => d.mountPoint.toUpperCase().startsWith(rootLetter));
  }, [drives, currentActiveTab.currentPath]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* 1. Title bar with tabs */}
      <TitleBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={handleCloseTab}
        onNewTab={handleNewTab}
        shortcutBindings={activeShortcutBindings}
      />

      {/* 2. Demo banner */}
      {!adapter.isNative && (
        <DemoBanner />
      )}

      {/* 3. Navigation Bar */}
      <NavigationBar
        currentPath={currentActiveTab.currentPath}
        canGoBack={currentActiveTab.historyIndex > 0}
        canGoForward={currentActiveTab.historyIndex < currentActiveTab.history.length - 1}
        onGoBack={() => handleGoBack()}
        onGoForward={() => handleGoForward()}
        onGoUp={() => handleGoUp()}
        onRefresh={handleRefresh}
        onNavigate={(p) => handleNavigate(p)}
        searchQuery={currentActiveTab.searchQuery}
        onSearchChange={(q) =>
          updateTab(currentActiveTab.id, { searchQuery: q }, focusedPane === 'secondary')
        }
        viewMode={currentActiveTab.viewMode}
        onViewModeChange={(m) =>
          updateTab(currentActiveTab.id, { viewMode: m }, focusedPane === 'secondary')
        }
        gridSize={currentActiveTab.gridSize}
        onGridSizeChange={(s) =>
          updateTab(currentActiveTab.id, { gridSize: s }, focusedPane === 'secondary')
        }
        sortField={currentActiveTab.sortField}
        sortDirection={currentActiveTab.sortDirection}
        onSortChange={(f, d) =>
          updateTab(currentActiveTab.id, { sortField: f, sortDirection: d }, focusedPane === 'secondary')
        }
        onNewFolder={handleNewFolder}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
        hasClipboard={Boolean(clipboard && clipboard.items.length > 0)}
        selectedCount={currentActiveTab.selectedIds.length}
        onRename={() => {
          const currentList = focusedPane === 'primary' ? primaryEntries : splitEntries;
          const item = currentList.find((e) => currentActiveTab.selectedIds[0] === e.id);
          if (item) handleStartRenameItem(item);
        }}
        onDelete={handleDelete}
        isSplitPane={isSplitPane}
        onToggleSplitPane={() => setIsSplitPane((prev) => !prev)}
        isDetailsOpen={isDetailsOpen}
        onToggleDetails={() => setIsDetailsOpen((prev) => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        shortcutBindings={activeShortcutBindings}
      />

      {/* 4. Main workspace area (Sidebar + Browsers + Details) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          currentPath={currentActiveTab.currentPath}
          onNavigate={(p) => handleNavigate(p)}
          drives={drives}
          recycleBinCount={recycleBinCount}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          recentPaths={recentPaths}
          knownFolders={knownFolders}
        />

        {/* Central Browsers Container (Single or Split Pane) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Primary File Browser */}
          <div
            onClick={() => setFocusedPane('primary')}
            className={`flex-1 flex flex-col overflow-hidden transition-all ${
              isSplitPane && focusedPane === 'primary' ? 'ring-1 ring-sky-500/40 z-10' : ''
            }`}
          >
            {isSplitPane && (
              <div className="h-6 bg-slate-900/90 border-b border-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-medium text-slate-300">Left Pane: {activeTab.title}</span>
                <span className="text-[10px] text-slate-500 font-mono">{activeTab.currentPath}</span>
              </div>
            )}

            {activeTab.searchQuery.trim() ? (
              <SearchResultsView
                query={activeTab.searchQuery}
                results={primarySearchResults}
                isLoading={isSearchingPrimary}
                error={primarySearchError}
                inaccessiblePaths={primarySearchWarnings}
                showFileExtensions={settings.showFileExtensions}
                singleClickOpen={settings.singleClickOpen}
                sortField={activeTab.sortField}
                sortDirection={activeTab.sortDirection}
                selectedIds={activeTab.selectedIds}
                onSelectionChange={(ids) => updateTab(activeTab.id, { selectedIds: ids }, false)}
                onOpen={handleOpenItem}
                onOpenFolder={(item) => handleOpenContainingFolder(item.containingFolderPath, item.id, false)}
                onContextMenu={(e, item) => handleContextMenu(e, item)}
                onClearSearch={() => updateTab(activeTab.id, { searchQuery: '' }, false)}
                categoryFilter={activeTab.searchCategoryFilter}
                onCategoryFilterChange={(cat) => updateTab(activeTab.id, { searchCategoryFilter: cat }, false)}
                sizeFilter={activeTab.searchSizeFilter}
                onSizeFilterChange={(sz) => updateTab(activeTab.id, { searchSizeFilter: sz }, false)}
                dateFilter={activeTab.searchDateFilter}
                onDateFilterChange={(df) => updateTab(activeTab.id, { searchDateFilter: df }, false)}
              />
            ) : (
              <FileBrowser
                entries={filteredPrimaryEntries}
                currentPath={activeTab.currentPath}
                selectedIds={activeTab.selectedIds}
                onSelectionChange={(ids) => updateTab(activeTab.id, { selectedIds: ids }, false)}
                onOpen={handleOpenItem}
                onContextMenu={(e, item) => handleContextMenu(e, item)}
                viewMode={activeTab.viewMode}
                gridSize={activeTab.gridSize}
                sortField={activeTab.sortField}
                sortDirection={activeTab.sortDirection}
                onSortChange={(f, d) => updateTab(activeTab.id, { sortField: f, sortDirection: d }, false)}
                onRenameSubmit={handleRenameSubmit}
                onDropMove={handleDropMove}
                onNewFolder={handleNewFolder}
                searchActive={false}
                isLoading={primaryLoading}
                showFileExtensions={settings.showFileExtensions}
                singleClickOpen={settings.singleClickOpen}
                compactDensity={settings.compactDensity}
              />
            )}
          </div>

          {/* Secondary Split Pane */}
          {isSplitPane && (
            <div
              onClick={() => setFocusedPane('secondary')}
              className={`flex-1 flex flex-col border-l border-slate-800 overflow-hidden transition-all ${
                focusedPane === 'secondary' ? 'ring-1 ring-sky-500/40 z-10' : ''
              }`}
            >
              <div className="h-6 bg-slate-900/90 border-b border-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-medium text-slate-300">Right Pane: {activeSplitTab.title}</span>
                <span className="text-[10px] text-slate-500 font-mono">{activeSplitTab.currentPath}</span>
              </div>

              {activeSplitTab.searchQuery.trim() ? (
                <SearchResultsView
                  query={activeSplitTab.searchQuery}
                  results={splitSearchResults}
                  isLoading={isSearchingSplit}
                  error={splitSearchError}
                  inaccessiblePaths={splitSearchWarnings}
                  showFileExtensions={settings.showFileExtensions}
                  singleClickOpen={settings.singleClickOpen}
                  sortField={activeSplitTab.sortField}
                  sortDirection={activeSplitTab.sortDirection}
                  selectedIds={activeSplitTab.selectedIds}
                  onSelectionChange={(ids) => updateTab(activeSplitTab.id, { selectedIds: ids }, true)}
                  onOpen={handleOpenItem}
                  onOpenFolder={(item) => handleOpenContainingFolder(item.containingFolderPath, item.id, true)}
                  onContextMenu={(e, item) => handleContextMenu(e, item)}
                  onClearSearch={() => updateTab(activeSplitTab.id, { searchQuery: '' }, true)}
                  categoryFilter={activeSplitTab.searchCategoryFilter}
                  onCategoryFilterChange={(cat) => updateTab(activeSplitTab.id, { searchCategoryFilter: cat }, true)}
                  sizeFilter={activeSplitTab.searchSizeFilter}
                  onSizeFilterChange={(sz) => updateTab(activeSplitTab.id, { searchSizeFilter: sz }, true)}
                  dateFilter={activeSplitTab.searchDateFilter}
                  onDateFilterChange={(df) => updateTab(activeSplitTab.id, { searchDateFilter: df }, true)}
                />
              ) : (
                <FileBrowser
                  entries={filteredSplitEntries}
                  currentPath={activeSplitTab.currentPath}
                  selectedIds={activeSplitTab.selectedIds}
                  onSelectionChange={(ids) => updateTab(activeSplitTab.id, { selectedIds: ids }, true)}
                  onOpen={handleOpenItem}
                  onContextMenu={(e, item) => handleContextMenu(e, item)}
                  viewMode={activeSplitTab.viewMode}
                  gridSize={activeSplitTab.gridSize}
                  sortField={activeSplitTab.sortField}
                  sortDirection={activeSplitTab.sortDirection}
                  onSortChange={(f, d) => updateTab(activeSplitTab.id, { sortField: f, sortDirection: d }, true)}
                  onRenameSubmit={handleRenameSubmit}
                  onDropMove={handleDropMove}
                  onNewFolder={handleNewFolder}
                  searchActive={false}
                  isLoading={splitLoading}
                  showFileExtensions={settings.showFileExtensions}
                  singleClickOpen={settings.singleClickOpen}
                  compactDensity={settings.compactDensity}
                />
              )}
            </div>
          )}
        </div>

        {/* Right Details & Preview Panel */}
        <DetailsPanel
          selectedItems={activeSelectedItems}
          currentPath={currentActiveTab.currentPath}
          totalFolderItems={currentEntries.length}
          totalFolderSize={currentTotalBytes}
          metadata={selectedMetadata}
          isOpen={isDetailsOpen}
          showFileExtensions={settings.showFileExtensions}
          onClose={() => setIsDetailsOpen(false)}
          onOpen={handleOpenItem}
          onDelete={handleDelete}
        />
      </div>

      {/* 5. Status bar */}
      <StatusBar
        totalItems={currentEntries.length}
        selectedCount={activeSelectedItems.length}
        selectedBytes={selectedTotalBytes}
        currentDrive={currentDrive}
        viewMode={currentActiveTab.viewMode}
        onViewModeChange={(m) =>
          updateTab(currentActiveTab.id, { viewMode: m }, focusedPane === 'secondary')
        }
        isDetailsOpen={isDetailsOpen}
        onToggleDetails={() => setIsDetailsOpen((prev) => !prev)}
      />

      {/* 6. Modals and Overlays */}
      {/* Context Menu */}
      <ContextMenu
        position={contextMenuPos}
        targetItem={contextMenuItem}
        selectedItems={activeSelectedItems}
        currentPath={currentActiveTab.currentPath}
        hasClipboard={Boolean(clipboard && clipboard.items.length > 0)}
        isRecycleBin={currentActiveTab.currentPath === '::RecycleBin'}
        shortcutBindings={activeShortcutBindings}
        onClose={() => setContextMenuPos(null)}
        onOpen={handleOpenItem}
        onOpenWithDefault={(item) => openWithDefaultApp(item.path)}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onRename={(item) => {
          const currentList = focusedPane === 'primary' ? primaryEntries : splitEntries;
          const target = item || currentList.find((e) => currentActiveTab.selectedIds[0] === e.id);
          if (target) handleStartRenameItem(target);
        }}
        onDelete={handleDelete}
        onToggleFavorite={handleToggleFavorite}
        onCopyPath={(item) => {
          navigator.clipboard.writeText(item.path);
          addToast('success', `Copied "${item.path}" to clipboard`);
        }}
        onProperties={(item) => {
          setPropertiesItem({
            item: item || null,
            meta: selectedMetadata,
            path: currentActiveTab.currentPath,
          });
        }}
        onNewFolder={handleNewFolder}
        onNewFile={handleNewFile}
        onRefresh={handleRefresh}
        onViewChange={(m) =>
          updateTab(currentActiveTab.id, { viewMode: m }, focusedPane === 'secondary')
        }
        onSortChange={(f) =>
          updateTab(
            currentActiveTab.id,
            { sortField: f, sortDirection: currentActiveTab.sortDirection === 'asc' ? 'desc' : 'asc' },
            focusedPane === 'secondary'
          )
        }
        onRestoreRecycleItem={handleRestoreRecycleItem}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commandList}
      />

      {/* Conflict Modal */}
      <ConflictModal
        conflict={conflictState}
        onClose={() => setConflictState(null)}
      />

      {/* Operation Queue Modal */}
      <OperationQueueModal
        isOpen={isOperationQueueOpen}
        onClose={() => setIsOperationQueueOpen(false)}
        operations={operations}
        onCancelOperation={(id) => {
          setOperations((prev) =>
            prev.map((o) => (o.id === id ? { ...o, status: 'cancelled' } : o))
          );
        }}
        onTogglePauseOperation={(id) => {
          setOperations((prev) =>
            prev.map((o) =>
              o.id === id
                ? { ...o, status: o.status === 'paused' ? 'running' : 'paused' }
                : o
            )
          );
        }}
        onClearCompleted={() => {
          setOperations((prev) =>
            prev.filter((o) => o.status === 'running' || o.status === 'paused')
          );
        }}
      />

      {/* Properties Modal */}
      <PropertiesModal
        isOpen={Boolean(propertiesItem)}
        onClose={() => setPropertiesItem(null)}
        item={propertiesItem?.item || null}
        metadata={propertiesItem?.meta || null}
        currentPath={propertiesItem?.path || currentActiveTab.currentPath}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newS) => setSettings((s) => ({ ...s, ...newS }))}
        isNative={adapter.isNative}
        onResetAllShortcuts={() =>
          setSettings((current) => ({
            ...current,
            shortcutBindings: { ...DEFAULT_SHORTCUT_BINDINGS },
          }))
        }
      />

      {/* Name Prompt Modal (Folder Creation & Renaming with Validation) */}
      <NamePromptModal
        promptState={namePromptState}
        onClose={() => setNamePromptState(null)}
      />

      {/* Notification Toasts */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
