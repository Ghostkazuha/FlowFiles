import { FileCategory } from '../types/filesystem';

/**
 * Standardizes Windows path separators and formats
 */
export function normalizePath(path: string): string {
  if (!path) return 'C:\\';
  // Replace forward slashes with Windows backslashes
  let normalized = path.replace(/\//g, '\\');
  // Collapse multiple backslashes (except the drive root C:\)
  normalized = normalized.replace(/\\+/g, '\\');
  
  // If drive root like "C:", add trailing slash "C:\"
  if (/^[A-Za-z]:$/.test(normalized)) {
    normalized += '\\';
  }
  // Trim trailing backslash if not root e.g. "C:\Users\" -> "C:\Users"
  if (normalized.length > 3 && normalized.endsWith('\\')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function getParentPath(path: string): string {
  const norm = normalizePath(path);
  // Root drive e.g. "C:\" has no parent
  if (/^[A-Za-z]:\\?$/.test(norm)) {
    return 'This PC';
  }
  if (norm === 'This PC' || norm === '::RecycleBin') {
    return 'Home';
  }
  const lastSlash = norm.lastIndexOf('\\');
  if (lastSlash <= 2) {
    // Parent is root e.g. "C:\Users" -> "C:\"
    return norm.slice(0, 3);
  }
  return norm.slice(0, lastSlash);
}

export function joinPath(parent: string, child: string): string {
  const p = normalizePath(parent);
  if (p.endsWith('\\')) {
    return `${p}${child}`;
  }
  return `${p}\\${child}`;
}

export function getBaseName(path: string): string {
  if (path === '::RecycleBin') return 'Recycle Bin';
  if (path === 'This PC') return 'This PC';
  if (path === 'Home') return 'Home';
  const norm = normalizePath(path);
  if (/^[A-Za-z]:\\?$/.test(norm)) {
    return norm;
  }
  const parts = norm.split('\\').filter(Boolean);
  return parts[parts.length - 1] || path;
}

export function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) return '';
  return fileName.slice(dotIndex + 1).toLowerCase();
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0) return `${bytes} B`;
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    // Windows style formatting: MM/DD/YYYY HH:MM AM/PM
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    return date.toLocaleDateString(undefined, options);
  } catch {
    return isoString;
  }
}

export function determineCategory(extension: string, isDirectory: boolean): FileCategory {
  if (isDirectory) return 'folder';
  const ext = extension.toLowerCase();
  
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff'].includes(ext)) {
    return 'image';
  }
  if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
    return 'video';
  }
  if (['mp3', 'flac', 'wav', 'aac', 'ogg', 'm4a', 'wma'].includes(ext)) {
    return 'audio';
  }
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'csv'].includes(ext)) {
    return 'document';
  }
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'rs', 'py', 'java', 'c', 'cpp', 'h', 'go', 'toml', 'yaml', 'yml', 'md', 'sh', 'sql'].includes(ext)) {
    return 'code';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'].includes(ext)) {
    return 'archive';
  }
  if (['exe', 'msi', 'bat', 'cmd', 'ps1', 'vbs', 'sh'].includes(ext)) {
    return 'executable';
  }
  return 'unknown';
}

export function getMimeType(extension: string): string {
  const map: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    js: 'text/javascript',
    ts: 'text/typescript',
    tsx: 'text/typescript-jsx',
    html: 'text/html',
    css: 'text/css',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    zip: 'application/zip',
    exe: 'application/x-msdownload',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return map[extension.toLowerCase()] || 'application/octet-stream';
}

export function validateFileName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'File name cannot be empty.' };
  }
  // Windows invalid file name characters: \ / : * ? " < > |
  const invalidChars = /[\\/:*?"<>|]/;
  if (invalidChars.test(name)) {
    return { valid: false, error: 'A file name cannot contain any of the following characters: \\ / : * ? " < > |' };
  }
  // Reserved Windows names
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const nameWithoutExt = name.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    return { valid: false, error: `"${nameWithoutExt}" is a reserved system name in Windows.` };
  }
  return { valid: true };
}

/**
 * Splits path into breadcrumb items
 */
export interface BreadcrumbSegment {
  name: string;
  path: string;
}

export function getBreadcrumbs(path: string): BreadcrumbSegment[] {
  if (path === 'This PC') {
    return [{ name: 'This PC', path: 'This PC' }];
  }
  if (path === 'Home') {
    return [{ name: 'Home', path: 'Home' }];
  }
  if (path === '::RecycleBin') {
    return [{ name: 'Recycle Bin', path: '::RecycleBin' }];
  }

  const norm = normalizePath(path);
  const parts = norm.split('\\').filter(Boolean);
  const breadcrumbs: BreadcrumbSegment[] = [];

  // Always prepend This PC
  breadcrumbs.push({ name: 'This PC', path: 'This PC' });

  let cumulative = '';
  parts.forEach((part, index) => {
    if (index === 0) {
      cumulative = part + '\\';
      breadcrumbs.push({ name: part, path: cumulative });
    } else {
      cumulative = cumulative.endsWith('\\') ? `${cumulative}${part}` : `${cumulative}\\${part}`;
      breadcrumbs.push({ name: part, path: cumulative });
    }
  });

  return breadcrumbs;
}
