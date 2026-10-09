import React from 'react';
import {
  X,
  Folder,
  Copy,
  ExternalLink,
  Trash2,
  Calendar,
  HardDrive,
  FileText,
  Hash,
  Clock,
  Layers,
  FileCheck,
  Check,
} from 'lucide-react';
import { FileEntry, FileMetadata } from '../types/filesystem';
import { FileIcon } from './FileIcon';
import { formatBytes, formatDate } from '../utils/fileUtils';
import { getDisplayName } from '../utils/appSettings';

interface DetailsPanelProps {
  selectedItems: FileEntry[];
  currentPath: string;
  totalFolderItems: number;
  totalFolderSize: number;
  metadata: FileMetadata | null;
  isOpen: boolean;
  showFileExtensions: boolean;
  onClose: () => void;
  onOpen: (item: FileEntry) => void;
  onDelete: () => void;
}

export const DetailsPanel: React.FC<DetailsPanelProps> = ({
  selectedItems,
  currentPath,
  totalFolderItems,
  totalFolderSize,
  metadata,
  isOpen,
  showFileExtensions,
  onClose,
  onOpen,
  onDelete,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const selectedItem = selectedItems.length === 1 ? selectedItems[0] : null;

  return (
    <aside className="w-72 lg:w-80 bg-slate-900/95 border-l border-slate-800 flex flex-col text-xs text-slate-200 select-none overflow-y-auto no-scrollbar shrink-0 z-20">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900">
        <span className="font-semibold text-slate-100">Details & Preview</span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Close details panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-4">
        {/* Single File / Item Selected */}
        {selectedItem && (
          <>
            {/* Visual Preview Box */}
            <div className="w-full h-48 bg-slate-950 rounded-lg border border-slate-800 flex flex-col items-center justify-center p-2.5 overflow-hidden relative group">
              {selectedItem.thumbnailUrl && selectedItem.category === 'image' ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-900/50 rounded overflow-hidden">
                  <img
                    src={selectedItem.thumbnailUrl}
                    alt={selectedItem.name}
                    referrerPolicy="no-referrer"
                    className="max-w-full max-h-full object-contain rounded drop-shadow-md"
                  />
                </div>
              ) : selectedItem.previewContent ? (
                <div className="w-full h-full flex flex-col text-left font-mono text-[10px] text-slate-300 bg-slate-950 rounded select-text overflow-hidden">
                  <div className="flex items-center justify-between px-2 py-1 bg-slate-900 border-b border-slate-800 text-slate-400 text-[9px] uppercase tracking-wider shrink-0 font-sans">
                    <span className="font-semibold text-slate-300">
                      {selectedItem.extension ? `.${selectedItem.extension.toUpperCase()} PREVIEW` : 'FILE PREVIEW'}
                    </span>
                    <span>{metadata?.lineCount || 1} lines</span>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar p-2 font-mono leading-relaxed bg-slate-950/80">
                    {selectedItem.previewContent.split('\n').slice(0, 15).map((line, idx) => (
                      <div key={idx} className="flex gap-2 text-slate-300">
                        <span className="text-slate-600 select-none w-5 text-right font-mono text-[9px]">
                          {idx + 1}
                        </span>
                        <span className="break-all whitespace-pre-wrap">{line || ' '}</span>
                      </div>
                    ))}
                    {selectedItem.previewContent.split('\n').length > 15 && (
                      <div className="text-slate-500 text-[9px] italic mt-1 pl-7">
                        ... ({selectedItem.previewContent.split('\n').length - 15} more lines)
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <FileIcon
                    category={selectedItem.category}
                    extension={selectedItem.extension}
                    isDirectory={selectedItem.isDirectory}
                    className="w-14 h-14"
                  />
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                    {selectedItem.extension ? `.${selectedItem.extension} file` : selectedItem.category}
                  </span>
                </div>
              )}
            </div>

            {/* Title and quick actions */}
            <div>
              <h3 className="font-semibold text-sm text-slate-100 break-words leading-snug">
                {getDisplayName(
                  selectedItem.name,
                  selectedItem.extension,
                  selectedItem.isDirectory,
                  showFileExtensions
                )}
              </h3>
              <p className="text-slate-400 text-[11px] mt-0.5 capitalize">
                {selectedItem.isDirectory
                  ? 'File folder'
                  : `${selectedItem.category} document`}
              </p>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => onOpen(selectedItem)}
                  className="flex-1 py-1.5 px-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open</span>
                </button>
                <button
                  onClick={() => handleCopyPath(selectedItem.path)}
                  className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center justify-center gap-1 transition-colors border border-slate-700"
                  title="Copy full path"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={onDelete}
                  className="py-1.5 px-2 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 rounded text-xs flex items-center justify-center transition-colors border border-slate-700"
                  title="Send to Recycle Bin"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                </button>
              </div>
            </div>

            {/* Properties List */}
            <div className="border-t border-slate-800 pt-3 space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Properties
              </div>

              {!selectedItem.isDirectory && (
                <div className="flex justify-between items-baseline py-0.5">
                  <span className="text-slate-400">Size:</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {formatBytes(selectedItem.size)}
                  </span>
                </div>
              )}

              {selectedItem.isDirectory && selectedItem.itemCount !== undefined && (
                <div className="flex justify-between items-baseline py-0.5">
                  <span className="text-slate-400">Contains:</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {selectedItem.itemCount} items
                  </span>
                </div>
              )}

              {metadata?.dimensions && (
                <div className="flex justify-between items-baseline py-0.5">
                  <span className="text-slate-400">Dimensions:</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {metadata.dimensions.width} × {metadata.dimensions.height} px
                  </span>
                </div>
              )}

              {metadata?.lineCount && (
                <div className="flex justify-between items-baseline py-0.5">
                  <span className="text-slate-400">Lines:</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {metadata.lineCount} lines
                  </span>
                </div>
              )}

              {metadata?.duration && (
                <div className="flex justify-between items-baseline py-0.5">
                  <span className="text-slate-400">Duration:</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {metadata.duration}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-slate-400">Modified:</span>
                <span className="text-slate-200 tabular-nums">
                  {formatDate(selectedItem.modifiedDate)}
                </span>
              </div>

              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-slate-400">Created:</span>
                <span className="text-slate-200 tabular-nums">
                  {formatDate(selectedItem.createdDate || '')}
                </span>
              </div>

              <div className="py-1">
                <span className="text-slate-400 block mb-1">Path:</span>
                <div className="p-1.5 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-slate-300 break-all select-text">
                  {selectedItem.path}
                </div>
              </div>

              {/* Attributes badges */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-slate-400 block mb-1.5">Attributes:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedItem.isReadOnly && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded text-[10px]">
                      Read-only
                    </span>
                  )}
                  {selectedItem.isHidden && (
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded text-[10px]">
                      Hidden
                    </span>
                  )}
                  {selectedItem.isSystem && (
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded text-[10px]">
                      System
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded text-[10px]">
                    NTFS Archive (A)
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Multiple Items Selected */}
        {selectedItems.length > 1 && (
          <div className="space-y-4">
            <div className="w-full h-32 bg-slate-950 rounded-lg border border-slate-800 flex flex-col items-center justify-center gap-2">
              <Layers className="w-10 h-10 text-sky-400" />
              <div className="text-sm font-semibold text-slate-100">
                {selectedItems.length} items selected
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-3">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Total size:</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {formatBytes(selectedItems.reduce((acc, c) => acc + c.size, 0))}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Folders:</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {selectedItems.filter((i) => i.isDirectory).length}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Files:</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {selectedItems.filter((i) => !i.isDirectory).length}
                </span>
              </div>
            </div>

            <button
              onClick={onDelete}
              className="w-full py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Send {selectedItems.length} items to Recycle Bin</span>
            </button>
          </div>
        )}

        {/* No Item Selected: Current Directory Summary */}
        {selectedItems.length === 0 && (
          <div className="space-y-4">
            <div className="w-full h-28 bg-slate-950 rounded-lg border border-slate-800 flex flex-col items-center justify-center gap-2">
              <Folder className="w-10 h-10 text-sky-400 fill-sky-400/20" />
              <span className="text-xs font-semibold text-slate-300 truncate max-w-[200px]">
                {currentPath}
              </span>
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Folder Overview
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Item count:</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {totalFolderItems} items
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Visible size:</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {formatBytes(totalFolderSize)}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
              Select any file or folder to inspect its full metadata, attributes, dimensions, line counts, and content preview.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
