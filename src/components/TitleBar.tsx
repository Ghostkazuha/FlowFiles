import React from 'react';
import { Folder, Plus, X, FolderTree } from 'lucide-react';
import { TabState } from '../types/filesystem';
import { getBaseName } from '../utils/fileUtils';
import {
  formatShortcutTitle,
  ShortcutBindings,
} from '../utils/keyboardShortcuts';

interface TitleBarProps {
  tabs: TabState[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  shortcutBindings: ShortcutBindings;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  shortcutBindings,
}) => {
  return (
    <div className="h-10 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 flex items-center select-none text-xs text-slate-300 px-2 z-30 shrink-0">
      {/* Brand & Tabs container */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 h-full py-1">
        {/* App Wordmark */}
        <div className="flex items-center gap-2 px-2.5 py-1 text-slate-100 font-semibold tracking-tight shrink-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-xs shadow-sky-500/20">
            <FolderTree className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span className="text-[13px] font-bold text-slate-100 dark:text-white tracking-wide">FlowFiles</span>
        </div>

        {/* Tab strip */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar h-full">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const tabTitle = getBaseName(tab.currentPath) || tab.title;

            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                data-active={isActive}
                className={`titlebar-tab group relative flex items-center gap-2 px-3 py-1 rounded-t-md h-8 cursor-pointer transition-all border-t border-x ${
                  isActive
                    ? 'bg-slate-800/90 text-slate-100 border-slate-700/80 shadow-xs font-medium'
                    : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-transparent'
                }`}
                style={{ maxWidth: '200px', minWidth: '110px' }}
                title={tab.currentPath}
              >
                <Folder
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? 'text-sky-400 fill-sky-400/20' : 'text-slate-500'
                  }`}
                />
                <span className="truncate text-xs flex-1">{tabTitle}</span>
                
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className="w-4 h-4 rounded hover:bg-slate-700/80 flex items-center justify-center text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title={formatShortcutTitle('Close tab', shortcutBindings['close-tab'])}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                {/* Active tab bottom indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-t" />
                )}
              </div>
            );
          })}

          {/* New tab button */}
          <button
            onClick={onNewTab}
            className="w-7 h-7 rounded-md hover:bg-slate-800/60 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors shrink-0"
            title={formatShortcutTitle('New tab', shortcutBindings['new-tab'])}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
