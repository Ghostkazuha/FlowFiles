import {
  DriveInfo,
  KnownFolders,
  DirectoryListing,
  FileEntry,
  FileMetadata,
  OperationProgress,
  RecycleBinItem,
  SearchResultEntry,
  SearchResponse,
  SearchOptions,
} from '../types/filesystem';

export interface ReadDirOptions {
  showHidden?: boolean;
}

export interface OperationResult {
  success: boolean;
  successful: string[];
  failed: { path: string; error: string }[];
}

export interface FileSystemAdapter {
  readonly isNative: boolean;
  readonly adapterName: string;

  /**
   * Lists all available storage drives / partitions on the system.
   */
  list_drives(): Promise<DriveInfo[]>;

  /**
   * Resolves the current user's Home and standard folders.
   */
  get_known_folders(): Promise<KnownFolders>;

  /**
   * Reads contents of a directory.
   */
  read_directory(path: string, options?: ReadDirOptions): Promise<DirectoryListing>;

  /**
   * Retrieves detailed metadata and properties of a file or directory.
   */
  get_file_metadata(path: string): Promise<FileMetadata>;

  /**
   * Creates a new directory at the specified parent path.
   */
  create_directory(parentPath: string, name: string): Promise<FileEntry>;

  /**
   * Creates a new text file at the specified parent path.
   */
  create_file?(parentPath: string, name: string, content?: string): Promise<FileEntry>;

  /**
   * Renames a file or directory.
   */
  rename_path(oldPath: string, newName: string): Promise<FileEntry>;

  /**
   * Copies one or multiple files/directories to the destination folder.
   */
  copy_paths(
    sourcePaths: string[],
    destinationPath: string,
    onProgress?: (progress: OperationProgress) => void
  ): Promise<OperationResult>;

  /**
   * Moves one or multiple files/directories to the destination folder.
   */
  move_paths(
    sourcePaths: string[],
    destinationPath: string,
    onProgress?: (progress: OperationProgress) => void
  ): Promise<OperationResult>;

  /**
   * Safely sends items to the Windows Recycle Bin (does NOT permanently delete).
   */
  send_to_recycle_bin(paths: string[]): Promise<OperationResult>;

  /**
   * Restores items from the Recycle Bin to their original paths.
   */
  restore_from_recycle_bin?(ids: string[]): Promise<OperationResult>;

  /**
   * Empties the Recycle Bin.
   */
  empty_recycle_bin?(): Promise<boolean>;

  /**
   * Gets items in the Recycle Bin.
   */
  get_recycle_bin_items?(): Promise<RecycleBinItem[]>;

  /**
   * Simulates or invokes opening a file with the system default application.
   */
  open_with_default_app(path: string): Promise<{ appName?: string; success: boolean; message: string }>;

  /**
   * Searches for files/folders matching a query string with rich options.
   */
  search(
    query: string,
    searchPath: string,
    options?: SearchOptions,
    signal?: AbortSignal
  ): Promise<SearchResponse>;
}
