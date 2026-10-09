import type { FileSystemAdapter } from './FileSystemAdapter';
import { DemoFileSystemAdapter } from './DemoFileSystemAdapter';
import { TauriFileSystemAdapter, isTauriAvailable } from './TauriFileSystemAdapter';

let activeAdapter: FileSystemAdapter;

if (isTauriAvailable()) {
  activeAdapter = new TauriFileSystemAdapter();
} else {
  // Browser preview mode: strictly use DemoFileSystemAdapter
  activeAdapter = new DemoFileSystemAdapter();
}

export function getFileSystemAdapter(): FileSystemAdapter {
  return activeAdapter;
}

export {
  DemoFileSystemAdapter,
  TauriFileSystemAdapter,
  isTauriAvailable,
};
export type { FileSystemAdapter };

