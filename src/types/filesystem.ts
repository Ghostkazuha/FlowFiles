export type DriveType = 'fixed' | 'removable' | 'network' | 'optical';

export interface DriveInfo {
  id: string;
  name: string;
  mountPoint: string; // e.g. "C:\"
  label: string;
  totalSpace: number; // in bytes
  freeSpace: number; // in bytes
  driveType: DriveType;
  fileSystem: string; // e.g. "NTFS", "FAT32"
}

export interface KnownFolders {
  home: string;
  folders: { name: string; path: string }[];
}

export type FileCategory = 
  | 'folder'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'code'
  | 'archive'
  | 'executable'
  | 'unknown';

export interface FileEntry {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  size: number; // in bytes (0 for directories)
  modifiedDate: string; // ISO string
  createdDate?: string; // ISO string
  extension?: string;
  category: FileCategory;
  isHidden?: boolean;
  isSystem?: boolean;
  isReadOnly?: boolean;
  mimeType?: string;
  thumbnailUrl?: string;
  previewContent?: string; // Text snippet or preview data
  dimensions?: { width: number; height: number }; // for images
  duration?: string; // for audio/video e.g. "04:30"
  // For folders
  itemCount?: number;
}

export interface FileMetadata extends FileEntry {
  sizeOnDisk?: number;
  permissions?: string;
  attributes?: {
    archive?: boolean;
    hidden?: boolean;
    readOnly?: boolean;
    system?: boolean;
  };
  dimensions?: { width: number; height: number }; // for images
  lineCount?: number; // for text/code
  wordCount?: number; // for documents
  duration?: string; // for audio/video e.g. "03:42"
  sha256?: string;
}

export interface DirectoryListing {
  path: string;
  entries: FileEntry[];
  totalItems: number;
  totalSize: number;
}

export type OperationType = 'copy' | 'move' | 'delete' | 'restore';

export type OperationStatus = 'queued' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';

export interface OperationProgress {
  id: string;
  type: OperationType;
  title: string;
  currentItem: string;
  processedItems: number;
  totalItems: number;
  percent: number;
  bytesTransferred: number;
  totalBytes: number;
  status: OperationStatus;
  speed?: string;
  error?: string;
}

export type ConflictResolution = 'replace' | 'keep_both' | 'skip';

export interface ConflictDialogState {
  isOpen: boolean;
  sourceItem: FileEntry;
  existingItem: FileEntry;
  destinationPath: string;
  operationType: OperationType;
  onResolve: (resolution: ConflictResolution, applyToAll: boolean) => void;
  applyToAllChecked?: boolean;
}

export interface RecycleBinItem {
  id: string;
  originalPath: string;
  deletedDate: string;
  entry: FileEntry;
}

export type ViewMode = 'details' | 'grid' | 'list';
export type GridSize = 'compact' | 'medium' | 'large';

export type SortField = 'name' | 'modifiedDate' | 'type' | 'size';
export type SortDirection = 'asc' | 'desc';

export interface SearchResultEntry extends FileEntry {
  matchedIn: 'name';
  containingFolderPath: string;
}

export interface SearchResponse {
  results: SearchResultEntry[];
  inaccessiblePaths: { path: string; error: string }[];
}

export type SizeFilter = 'all' | 'tiny' | 'small' | 'medium' | 'large' | 'huge';
export type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year';

export interface SearchOptions {
  category?: FileCategory | 'all';
  sizeFilter?: SizeFilter;
  dateFilter?: DateFilter;
  showHidden?: boolean;
}

export interface TabState {
  id: string;
  title: string;
  currentPath: string;
  history: string[];
  historyIndex: number;
  viewMode: ViewMode;
  gridSize: GridSize;
  sortField: SortField;
  sortDirection: SortDirection;
  searchQuery: string;
  searchCategoryFilter?: FileCategory | 'all';
  searchSizeFilter?: SizeFilter;
  searchDateFilter?: DateFilter;
  selectedIds: string[];
  scrollPosition?: number;
}
