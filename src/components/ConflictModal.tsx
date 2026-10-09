import React, { useState } from 'react';
import { AlertTriangle, Replace, Copy, SkipForward, ArrowRight } from 'lucide-react';
import { ConflictDialogState, ConflictResolution } from '../types/filesystem';
import { FileIcon } from './FileIcon';
import { formatBytes, formatDate } from '../utils/fileUtils';

interface ConflictModalProps {
  conflict: ConflictDialogState | null;
  onClose: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  conflict,
  onClose,
}) => {
  const [applyToAll, setApplyToAll] = useState(false);

  if (!conflict || !conflict.isOpen) return null;

  const { sourceItem, existingItem, onResolve } = conflict;

  const handleAction = (resolution: ConflictResolution) => {
    onResolve(resolution, applyToAll);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-750 rounded-xl shadow-2xl overflow-hidden text-slate-200 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-950/60 border-b border-slate-800">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              File Conflict Detected
            </h3>
            <p className="text-xs text-slate-400">
              The destination already contains a file with this name.
            </p>
          </div>
        </div>

        {/* Content: Side-by-side comparison */}
        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            {/* Source / Incoming file */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-sky-400 font-semibold block">
                Source (Incoming)
              </span>
              <div className="flex items-center gap-2">
                <FileIcon
                  category={sourceItem.category}
                  extension={sourceItem.extension}
                  isDirectory={sourceItem.isDirectory}
                  thumbnailUrl={sourceItem.thumbnailUrl}
                  className="w-5 h-5 shrink-0"
                />
                <span className="font-medium text-slate-200 truncate block">
                  {sourceItem.name}
                </span>
              </div>
              <div className="text-slate-400 space-y-0.5 text-[11px]">
                <div className="tabular-nums">Size: {formatBytes(sourceItem.size)}</div>
                <div className="tabular-nums">Date: {formatDate(sourceItem.modifiedDate)}</div>
              </div>
            </div>

            {/* Destination existing file */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold block">
                Destination (Already Exists)
              </span>
              <div className="flex items-center gap-2">
                <FileIcon
                  category={existingItem.category}
                  extension={existingItem.extension}
                  isDirectory={existingItem.isDirectory}
                  thumbnailUrl={existingItem.thumbnailUrl}
                  className="w-5 h-5 shrink-0"
                />
                <span className="font-medium text-slate-200 truncate block">
                  {existingItem.name}
                </span>
              </div>
              <div className="text-slate-400 space-y-0.5 text-[11px]">
                <div className="tabular-nums">Size: {formatBytes(existingItem.size)}</div>
                <div className="tabular-nums">Date: {formatDate(existingItem.modifiedDate)}</div>
              </div>
            </div>
          </div>

          {/* Action options */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleAction('replace')}
              className="w-full p-2.5 bg-slate-800 hover:bg-slate-750 text-left rounded-lg flex items-center justify-between transition-colors border border-slate-700/80 group"
            >
              <div className="flex items-center gap-2.5">
                <Replace className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="font-medium text-slate-200 group-hover:text-white">
                    Replace the file in the destination
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Overwrites the existing file with the new incoming version.
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0" />
            </button>

            <button
              onClick={() => handleAction('keep_both')}
              className="w-full p-2.5 bg-slate-800 hover:bg-slate-750 text-left rounded-lg flex items-center justify-between transition-colors border border-slate-700/80 group"
            >
              <div className="flex items-center gap-2.5">
                <Copy className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <div className="font-medium text-slate-200 group-hover:text-white">
                    Keep both files (auto-rename)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Incoming file will be saved as &ldquo;{sourceItem.name.replace(/(\.[^.]+)$/, ' (1)$1')}&rdquo;.
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0" />
            </button>

            <button
              onClick={() => handleAction('skip')}
              className="w-full p-2.5 bg-slate-800 hover:bg-slate-750 text-left rounded-lg flex items-center justify-between transition-colors border border-slate-700/80 group"
            >
              <div className="flex items-center gap-2.5">
                <SkipForward className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <div className="font-medium text-slate-200 group-hover:text-white">
                    Skip this file
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Leave the existing file untouched and continue operation.
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0" />
            </button>
          </div>

          {/* Do for all checkbox */}
          <div className="pt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="applyToAll"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
            />
            <label htmlFor="applyToAll" className="text-xs text-slate-400 cursor-pointer">
              Apply this choice to all remaining conflicts
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
