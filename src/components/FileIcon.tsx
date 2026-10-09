import React from 'react';
import {
  Folder,
  FileText,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  Film,
  Music as MusicIcon,
  Archive,
  HardDrive,
  Cpu,
  File,
  Terminal,
} from 'lucide-react';
import { FileCategory } from '../types/filesystem';

interface FileIconProps {
  category: FileCategory;
  extension?: string;
  isDirectory?: boolean;
  thumbnailUrl?: string;
  className?: string;
  isDrive?: boolean;
}

export const FileIcon: React.FC<FileIconProps> = ({
  category,
  extension,
  isDirectory,
  thumbnailUrl,
  className = 'w-5 h-5',
  isDrive,
}) => {
  // If thumbnail exists, render thumbnail preview
  if (thumbnailUrl && category === 'image') {
    return (
      <img
        src={thumbnailUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={`${className} object-cover rounded shadow-xs border border-white/10`}
      />
    );
  }

  if (isDrive) {
    return <HardDrive className={`${className} text-sky-400 shrink-0`} />;
  }

  if (isDirectory) {
    return <Folder className={`${className} text-amber-400 fill-amber-400/20 shrink-0`} />;
  }

  const ext = extension?.toLowerCase();

  switch (category) {
    case 'image':
      return <ImageIcon className={`${className} text-pink-400 shrink-0`} />;
    case 'video':
      return <Film className={`${className} text-purple-400 shrink-0`} />;
    case 'audio':
      return <MusicIcon className={`${className} text-emerald-400 shrink-0`} />;
    case 'code':
      if (ext === 'sh' || ext === 'bat' || ext === 'ps1') {
        return <Terminal className={`${className} text-emerald-400 shrink-0`} />;
      }
      return <FileCode className={`${className} text-cyan-400 shrink-0`} />;
    case 'archive':
      return <Archive className={`${className} text-orange-400 shrink-0`} />;
    case 'executable':
      return <Cpu className={`${className} text-violet-400 shrink-0`} />;
    case 'document':
      if (['xls', 'xlsx', 'csv'].includes(ext || '')) {
        return <FileSpreadsheet className={`${className} text-emerald-500 shrink-0`} />;
      }
      if (['pdf'].includes(ext || '')) {
        return <FileText className={`${className} text-rose-500 shrink-0`} />;
      }
      return <FileText className={`${className} text-blue-400 shrink-0`} />;
    default:
      return <File className={`${className} text-slate-400 shrink-0`} />;
  }
};
