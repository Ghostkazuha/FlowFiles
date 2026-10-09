import React, { useState } from 'react';
import { X, HardDrive, FileText, Check } from 'lucide-react';
import { FileEntry, FileMetadata } from '../types/filesystem';
import { FileIcon } from './FileIcon';
import { formatBytes, formatDate } from '../utils/fileUtils';

interface PropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FileEntry | null;
  metadata: FileMetadata | null;
  currentPath: string;
}

export const PropertiesModal: React.FC<PropertiesModalProps> = ({
  isOpen,
  onClose,
  item,
  metadata,
  currentPath,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'details'>('general');
  const [isReadOnly, setIsReadOnly] = useState(item?.isReadOnly || false);
  const [isHidden, setIsHidden] = useState(item?.isHidden || false);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const targetName = item ? item.name : currentPath.split('\\').pop() || currentPath;
  const targetCategory = item ? item.category : 'folder';
  const targetSize = item ? item.size : metadata?.size || 0;
  const targetModified = item ? item.modifiedDate : new Date().toISOString();
  const targetCreated = item ? item.createdDate || '' : new Date().toISOString();
  const targetPath = item ? item.path : currentPath;

  const handleApply = () => {
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-750 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200 animate-in zoom-in-95 duration-150">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/70 border-b border-slate-800">
          <span className="text-xs font-semibold text-slate-200 truncate">
            {targetName} Properties
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-slate-800 bg-slate-900 text-xs">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-3 py-1.5 font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Details
          </button>
        </div>

        {/* Tab content */}
        <div className="p-5 space-y-4 text-xs max-h-96 overflow-y-auto">
          {activeTab === 'general' ? (
            <>
              {/* Header with icon and name */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <FileIcon
                  category={targetCategory}
                  extension={item?.extension}
                  isDirectory={item?.isDirectory || !item}
                  thumbnailUrl={item?.thumbnailUrl}
                  className="w-10 h-10 shrink-0"
                />
                <input
                  type="text"
                  readOnly
                  value={targetName}
                  className="bg-slate-950 border border-slate-800 text-slate-100 px-2.5 py-1 rounded w-full font-medium"
                />
              </div>

              {/* Type and location */}
              <div className="space-y-2 pb-3 border-b border-slate-800">
                <div className="grid grid-cols-3">
                  <span className="text-slate-400">Type of file:</span>
                  <span className="col-span-2 text-slate-200 capitalize">
                    {item?.isDirectory
                      ? 'File folder'
                      : item?.extension
                      ? `${item.extension.toUpperCase()} document (.${item.extension})`
                      : 'File'}
                  </span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-400">Location:</span>
                  <span className="col-span-2 font-mono text-[11px] text-slate-300 break-all">
                    {targetPath}
                  </span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-400">Size:</span>
                  <span className="col-span-2 font-mono tabular-nums text-slate-200">
                    {formatBytes(targetSize)} ({targetSize.toLocaleString()} bytes)
                  </span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-400">Size on disk:</span>
                  <span className="col-span-2 font-mono tabular-nums text-slate-200">
                    {formatBytes(Math.ceil((targetSize || 4096) / 4096) * 4096)}
                  </span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="space-y-2 pb-3 border-b border-slate-800">
                <div className="grid grid-cols-3">
                  <span className="text-slate-400">Created:</span>
                  <span className="col-span-2 text-slate-200 tabular-nums">
                    {formatDate(targetCreated)}
                  </span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-400">Modified:</span>
                  <span className="col-span-2 text-slate-200 tabular-nums">
                    {formatDate(targetModified)}
                  </span>
                </div>
              </div>

              {/* Attributes Checkboxes */}
              <div className="space-y-2">
                <span className="text-slate-400 block font-semibold text-[11px] uppercase tracking-wider">
                  Attributes:
                </span>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isReadOnly}
                      onChange={(e) => setIsReadOnly(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-sky-500"
                    />
                    <span>Read-only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHidden}
                      onChange={(e) => setIsHidden(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-sky-500"
                    />
                    <span>Hidden</span>
                  </label>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Extended Metadata
              </div>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">MIME Type:</span>
                  <span className="font-mono text-slate-200">{metadata?.mimeType || 'application/octet-stream'}</span>
                </div>
                {metadata?.dimensions && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Dimensions:</span>
                    <span className="font-mono text-slate-200">
                      {metadata.dimensions.width} × {metadata.dimensions.height} px
                    </span>
                  </div>
                )}
                {metadata?.lineCount && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Line Count:</span>
                    <span className="font-mono text-slate-200">{metadata.lineCount} lines</span>
                  </div>
                )}
                {metadata?.duration && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-mono text-slate-200">{metadata.duration}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Permissions:</span>
                  <span className="text-slate-200">NTFS Full Control (SYSTEM, Admin, Alex)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium flex items-center gap-1.5"
          >
            {isSaved ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{isSaved ? 'Applied' : 'OK'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
