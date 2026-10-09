/**
 * TauriFileSystemAdapter
 * 
 * Bridges FlowFiles frontend to Tauri 2 Rust Native Backend.
 * Uses Tauri 2 custom commands:
 * - `list_drives`
 * - `read_directory`
 * - `search_files`
 * - `cancel_file_search`
 * - `get_file_metadata`
 * - `open_with_default_app`
 */

import { invoke } from '@tauri-apps/api/core';
import {
  FileSystemAdapter,
  ReadDirOptions,
  OperationResult,
} from './FileSystemAdapter';
import {
  DriveInfo,
  KnownFolders,
  DirectoryListing,
  FileEntry,
  FileMetadata,
  OperationProgress,
  RecycleBinItem,
  SearchResponse,
  SearchOptions,
} from '../types/filesystem';

// Check if running inside real Tauri 2 desktop window
export function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export class TauriFileSystemAdapter implements FileSystemAdapter {
  readonly isNative = true;
  readonly adapterName = 'Tauri 2 Native Windows Backend';

  private async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    if (!isTauriAvailable()) {
      throw new Error(
        `Tauri native IPC not detected. To use the native filesystem backend, build and launch FlowFiles with Tauri 2 desktop runtime ("cargo tauri dev" or "cargo tauri build").`
      );
    }

    return await invoke<T>(command, args);
  }

  async list_drives(): Promise<DriveInfo[]> {
    return await this.invoke<DriveInfo[]>('list_drives');
  }

  async get_known_folders(): Promise<KnownFolders> {
    return await this.invoke<KnownFolders>('get_known_folders');
  }

  async read_directory(path: string, options?: ReadDirOptions): Promise<DirectoryListing> {
    return await this.invoke<DirectoryListing>('read_directory', { path, options });
  }

  async get_file_metadata(path: string): Promise<FileMetadata> {
    return await this.invoke<FileMetadata>('get_file_metadata', { path });
  }

  async create_directory(parentPath: string, name: string): Promise<FileEntry> {
    return await this.invoke<FileEntry>('create_directory', { parentPath, name });
  }

  async create_file(parentPath: string, name: string, content = ''): Promise<FileEntry> {
    return await this.invoke<FileEntry>('create_file', { parentPath, name, content });
  }

  async rename_path(oldPath: string, newName: string): Promise<FileEntry> {
    return await this.invoke<FileEntry>('rename_path', { oldPath, newName });
  }

  async copy_paths(
    sourcePaths: string[],
    destinationPath: string,
    onProgress?: (progress: OperationProgress) => void
  ): Promise<OperationResult> {
    // Progress is streamed via Tauri events in native build
    return await this.invoke<OperationResult>('copy_paths', { sourcePaths, destinationPath });
  }

  async move_paths(
    sourcePaths: string[],
    destinationPath: string,
    onProgress?: (progress: OperationProgress) => void
  ): Promise<OperationResult> {
    return await this.invoke<OperationResult>('move_paths', { sourcePaths, destinationPath });
  }

  async send_to_recycle_bin(paths: string[]): Promise<OperationResult> {
    return await this.invoke<OperationResult>('send_to_recycle_bin', { paths });
  }

  async restore_from_recycle_bin(ids: string[]): Promise<OperationResult> {
    return await this.invoke<OperationResult>('restore_from_recycle_bin', { ids });
  }

  async empty_recycle_bin(): Promise<boolean> {
    return await this.invoke<boolean>('empty_recycle_bin');
  }

  async get_recycle_bin_items(): Promise<RecycleBinItem[]> {
    return await this.invoke<RecycleBinItem[]>('get_recycle_bin_items');
  }

  async open_with_default_app(path: string): Promise<{ appName?: string; success: boolean; message: string }> {
    return await this.invoke<{ appName?: string; success: boolean; message: string }>('open_with_default_app', { path });
  }

  async search(
    query: string,
    searchPath: string,
    options?: SearchOptions,
    signal?: AbortSignal
  ): Promise<SearchResponse> {
    const requestId = crypto.randomUUID();
    if (signal?.aborted) throw new Error('Search cancelled.');
    const cancelSearch = () => {
      this.invoke<void>('cancel_file_search', { requestId }).catch((error: unknown) => {
        console.error('Could not cancel native file search.', error);
      });
    };
    signal?.addEventListener('abort', cancelSearch, { once: true });
    try {
      return await this.invoke<SearchResponse>('search_files', {
        query,
        searchPath,
        options,
        requestId,
      });
    } finally {
      signal?.removeEventListener('abort', cancelSearch);
    }
  }
}
