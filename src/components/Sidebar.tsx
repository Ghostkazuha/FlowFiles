import React, { useState } from 'react';
import {
  Home,
  Star,
  Monitor,
  Download,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  HardDrive,
  Trash2,
  ChevronDown,
  ChevronRight,
  Network,
  Pin,
  Clock,
} from 'lucide-react';
import { DriveInfo, KnownFolders } from '../types/filesystem';
import { formatBytes } from '../utils/fileUtils';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  drives: DriveInfo[];
  recycleBinCount: number;
  favorites: { name: string; path: string }[];
  onToggleFavorite: (path: string, name: string) => void;
  recentPaths: string[];
  knownFolders: KnownFolders | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  drives,
  recycleBinCount,
  favorites,
  onToggleFavorite,
  recentPaths,
  knownFolders,
}) => {
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(true);
  const [isDrivesOpen, setIsDrivesOpen] = useState(true);
  const [isRecentOpen, setIsRecentOpen] = useState(true);

  const folderIcons = {
    Desktop: { icon: Monitor, color: 'text-sky-400' },
    Downloads: { icon: Download, color: 'text-emerald-400' },
    Documents: { icon: FileText, color: 'text-blue-400' },
    Pictures: { icon: ImageIcon, color: 'text-pink-400' },
    Videos: { icon: Film, color: 'text-purple-400' },
    Music: { icon: Music, color: 'text-amber-400' },
  };
  const standardFolders = (knownFolders?.folders ?? []).map((folder) => ({
    ...folder,
    ...(folderIcons[folder.name as keyof typeof folderIcons] ?? folderIcons.Documents),
  }));

  const isCurrent = (p: string) => currentPath.toLowerCase() === p.toLowerCase();

  return (
    <aside className="w-56 lg:w-60 bg-slate-900/95 border-r border-slate-800 flex flex-col select-none text-xs text-slate-300 overflow-y-auto no-scrollbar shrink-0">
      <div className="p-2 space-y-4">
        {/* Home / Quick Access section */}
        <div>
          <button
            onClick={() => onNavigate(knownFolders?.home ?? 'Home')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-colors font-medium ${
              isCurrent(knownFolders?.home ?? 'Home')
                ? 'bg-sky-500/20 text-sky-200 font-semibold'
                : 'hover:bg-slate-800/80 text-slate-200'
            }`}
          >
            <Home className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="truncate">Home</span>
          </button>
        </div>

        {/* Standard Library Folders */}
        <div className="space-y-0.5">
          {standardFolders.map((item) => {
            const Icon = item.icon;
            const active = isCurrent(item.path);
            return (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-colors ${
                  active
                    ? 'bg-sky-500/20 text-sky-200 font-semibold'
                    : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${item.color} shrink-0`} />
                <span className="truncate">{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* Favorites Section */}
        <div>
          <button
            onClick={() => setIsFavoritesOpen(!isFavoritesOpen)}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200"
          >
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>Favorites</span>
            </div>
            {isFavoritesOpen ? (
              <ChevronDown className="w-3 h-3 text-slate-500" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-500" />
            )}
          </button>

          {isFavoritesOpen && (
            <div className="mt-1 space-y-0.5 pl-1">
              {favorites.map((fav) => {
                const active = isCurrent(fav.path);
                return (
                  <div
                    key={fav.path}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-500/20 text-sky-200 font-semibold'
                        : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                    }`}
                    onClick={() => onNavigate(fav.path)}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Pin className="w-3.5 h-3.5 text-amber-400/80 shrink-0 rotate-45" />
                      <span className="truncate">{fav.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(fav.path, fav.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 text-slate-500 transition-opacity"
                      title="Unpin from Favorites"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {favorites.length === 0 && (
                <div className="px-3 py-1.5 text-[11px] text-slate-500 italic">
                  Right-click any folder to pin here
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Locations Section */}
        {recentPaths.length > 0 && (
          <div>
            <button
              onClick={() => setIsRecentOpen(!isRecentOpen)}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200"
            >
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Recent</span>
              </div>
              {isRecentOpen ? (
                <ChevronDown className="w-3 h-3 text-slate-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-500" />
              )}
            </button>

            {isRecentOpen && (
              <div className="mt-1 space-y-0.5 pl-1">
                {recentPaths.slice(0, 5).map((path) => {
                  const name = path.split('\\').filter(Boolean).pop() || path;
                  const active = isCurrent(path);
                  return (
                    <button
                      key={path}
                      onClick={() => onNavigate(path)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1 rounded-md text-left transition-colors truncate ${
                        active
                          ? 'bg-sky-500/20 text-sky-200 font-medium'
                          : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                      title={path}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span className="truncate text-xs">{name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* This PC & Connected Drives */}
        <div>
          <button
            onClick={() => setIsDrivesOpen(!isDrivesOpen)}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200"
          >
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-sky-400" />
              <span>This PC</span>
            </div>
            {isDrivesOpen ? (
              <ChevronDown className="w-3 h-3 text-slate-500" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-500" />
            )}
          </button>

          {isDrivesOpen && (
            <div className="mt-1 space-y-1 pl-1">
              <button
                onClick={() => onNavigate('This PC')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors ${
                  isCurrent('This PC')
                    ? 'bg-sky-500/20 text-sky-200 font-semibold'
                    : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="truncate font-medium">All Drives</span>
              </button>

              {drives.map((drive) => {
                const used = drive.totalSpace - drive.freeSpace;
                const percentUsed =
                  drive.totalSpace > 0
                    ? Math.round((used / drive.totalSpace) * 100)
                    : 0;
                const active = isCurrent(drive.mountPoint);

                return (
                  <button
                    key={drive.id}
                    onClick={() => onNavigate(drive.mountPoint)}
                    className={`w-full flex flex-col gap-1 px-2.5 py-1.5 rounded-md text-left transition-colors ${
                      active
                        ? 'bg-sky-500/20 text-sky-200 font-semibold'
                        : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <HardDrive
                          className={`w-4 h-4 shrink-0 ${
                            drive.driveType === 'removable'
                              ? 'text-emerald-400'
                              : 'text-sky-400'
                          }`}
                        />
                        <span className="truncate text-xs font-medium">
                          {drive.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {percentUsed}%
                      </span>
                    </div>

                    {/* Storage Bar */}
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentUsed > 85 ? 'bg-rose-500' : 'bg-sky-500'
                        }`}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>

                    <div className="text-[10px] text-slate-400 tabular-nums">
                      {formatBytes(drive.freeSpace)} free of {formatBytes(drive.totalSpace)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Network & Recycle Bin */}
        <div className="border-t border-slate-800 pt-2 space-y-0.5">
          <button
            onClick={() => onNavigate('::RecycleBin')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors ${
              isCurrent('::RecycleBin')
                ? 'bg-sky-500/20 text-sky-200 font-semibold'
                : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Recycle Bin</span>
            </div>
            {recycleBinCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {recycleBinCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-slate-500 cursor-not-allowed">
            <Network className="w-4 h-4 shrink-0" />
            <span className="text-xs">Network (Workgroup)</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
