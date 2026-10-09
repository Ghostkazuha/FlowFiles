import React from 'react';
import {
  List,
  LayoutGrid,
  PanelRight,
  HardDrive,
} from 'lucide-react';
import { ViewMode, DriveInfo } from '../types/filesystem';
import { formatBytes } from '../utils/fileUtils';

interface StatusBarProps {
  totalItems: number;
  selectedCount: number;
  selectedBytes: number;
  currentDrive?: DriveInfo;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isDetailsOpen: boolean;
  onToggleDetails: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  totalItems,
  selectedCount,
  selectedBytes,
  currentDrive,
  viewMode,
  onViewModeChange,
  isDetailsOpen,
  onToggleDetails,
}) => {
  return (
    <footer className="h-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-3 text-[11px] text-slate-400 select-none shrink-0 z-30">
      {/* Left: Item counts & Selected size */}
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="tabular-nums font-mono whitespace-nowrap">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </span>

        {selectedCount > 0 && (
          <>
            <span className="text-slate-600">|</span>
            <span className="tabular-nums font-mono text-sky-400 whitespace-nowrap">
              {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected{' '}
              {selectedBytes > 0 && `(${formatBytes(selectedBytes)})`}
            </span>
          </>
        )}

        {currentDrive && (
          <>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <div className="hidden sm:flex items-center gap-1.5 tabular-nums text-slate-400 truncate">
              <HardDrive className="w-3 h-3 text-slate-500 shrink-0" />
              <span>
                {currentDrive.name}: {formatBytes(currentDrive.freeSpace)} free of {formatBytes(currentDrive.totalSpace)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right: Layout shortcuts */}
      <div className="flex items-center shrink-0">
        <button
          onClick={() => onViewModeChange('details')}
          data-status-control
          data-active={viewMode === 'details'}
          aria-pressed={viewMode === 'details'}
          className={`p-1 rounded hover:bg-slate-800 transition-colors ${
            viewMode === 'details' ? 'text-sky-400 bg-slate-800/80' : 'text-slate-500'
          }`}
          title="Details View"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onViewModeChange('grid')}
          data-status-control
          data-active={viewMode === 'grid'}
          aria-pressed={viewMode === 'grid'}
          className={`p-1 rounded hover:bg-slate-800 transition-colors ${
            viewMode === 'grid' ? 'text-sky-400 bg-slate-800/80' : 'text-slate-500'
          }`}
          title="Grid View"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onToggleDetails}
          data-status-control
          data-active={isDetailsOpen}
          aria-pressed={isDetailsOpen}
          className={`p-1 rounded hover:bg-slate-800 transition-colors ${
            isDetailsOpen ? 'text-sky-400 bg-slate-800/80' : 'text-slate-500'
          }`}
          title="Toggle Details Panel"
        >
          <PanelRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};
