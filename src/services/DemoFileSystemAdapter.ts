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
  SearchResultEntry,
  SearchResponse,
  SearchOptions,
  FileCategory,
} from '../types/filesystem';
import {
  normalizePath,
  getParentPath,
  joinPath,
  getBaseName,
  getExtension,
  determineCategory,
  getMimeType,
  validateFileName,
} from '../utils/fileUtils';

// Initial Mock Seed Data
function createInitialEntries(): Map<string, FileEntry> {
  const map = new Map<string, FileEntry>();

  const add = (
    path: string,
    isDirectory: boolean,
    size: number,
    modifiedDate: string,
    extra: Partial<FileEntry> = {}
  ) => {
    const norm = normalizePath(path);
    const name = getBaseName(norm);
    const ext = isDirectory ? undefined : getExtension(name);
    const entry: FileEntry = {
      id: norm,
      name,
      path: norm,
      isDirectory,
      size,
      modifiedDate,
      createdDate: '2026-01-15T09:00:00Z',
      extension: ext,
      category: determineCategory(ext || '', isDirectory),
      ...extra,
    };
    map.set(norm, entry);
  };

  // C: Root & System
  add('C:\\Windows', true, 0, '2026-03-01T14:20:00Z', { isSystem: true });
  add('C:\\Windows\\System32', true, 0, '2026-03-01T14:20:00Z', { isSystem: true });
  add('C:\\Windows\\System32\\cmd.exe', false, 324608, '2026-03-01T14:20:00Z', { isSystem: true });
  add('C:\\Windows\\System32\\drivers', true, 0, '2026-03-01T14:20:00Z', { isSystem: true });
  add('C:\\Windows\\Fonts', true, 0, '2026-01-10T10:00:00Z');
  add('C:\\Windows\\win.ini', false, 1024, '2026-02-12T11:00:00Z', {
    previewContent: '; for 16-bit app support\n[fonts]\n[extensions]\n[mci extensions]\n[files]\n[Mail]\nMAPI=1',
  });

  add('C:\\Program Files', true, 0, '2026-02-14T08:30:00Z');
  add('C:\\Program Files\\FlowFiles', true, 0, '2026-10-08T18:00:00Z');
  add('C:\\Program Files\\FlowFiles\\FlowFiles.exe', false, 48234496, '2026-10-08T18:00:00Z');
  add('C:\\Program Files\\FlowFiles\\resources.pak', false, 18454912, '2026-10-08T18:00:00Z');
  add('C:\\Program Files\\Microsoft VS Code', true, 0, '2026-09-20T12:00:00Z');
  add('C:\\Program Files\\Git', true, 0, '2026-08-11T10:15:00Z');
  add('C:\\Program Files\\Nodejs', true, 0, '2026-09-02T16:40:00Z');

  // C:\Users\Alex Hierarchy
  add('C:\\Users', true, 0, '2026-01-15T09:00:00Z');
  add('C:\\Users\\Alex', true, 0, '2026-01-15T09:00:00Z');

  // Desktop
  add('C:\\Users\\Alex\\Desktop', true, 0, '2026-10-08T20:15:00Z');
  add('C:\\Users\\Alex\\Desktop\\FlowFiles_Roadmap.md', false, 3420, '2026-10-08T20:15:00Z', {
    previewContent: '# FlowFiles Milestone 1\n\n- [x] FileSystemAdapter Interface\n- [x] Browser Demo In-Memory Sandbox\n- [x] Windows 11 Fluent UI Layout\n- [x] Tabs & Split Pane\n- [x] Search & Sorting\n- [ ] Tauri 2 Rust Native Backend',
  });
  add('C:\\Users\\Alex\\Desktop\\Q4_Product_Strategy.docx', false, 145000, '2026-10-05T14:30:00Z');
  add('C:\\Users\\Alex\\Desktop\\Terminal_Shortcut.lnk', false, 1240, '2026-09-12T11:00:00Z');

  // Documents
  add('C:\\Users\\Alex\\Documents', true, 0, '2026-10-07T16:00:00Z');
  add('C:\\Users\\Alex\\Documents\\Contracts', true, 0, '2026-09-15T11:00:00Z');
  add('C:\\Users\\Alex\\Documents\\Contracts\\Consulting_Agreement_2026.docx', false, 48500, '2026-09-15T11:00:00Z');
  add('C:\\Users\\Alex\\Documents\\Contracts\\Mutual_NDA_AcmeCorp.pdf', false, 240000, '2026-08-20T09:30:00Z', {
    previewContent: '%PDF-1.7\nNON-DISCLOSURE AGREEMENT\nBetween Acme Corporation and Alex Dev...\nSigned and verified electronically.',
  });

  add('C:\\Users\\Alex\\Documents\\Financial', true, 0, '2026-10-02T10:00:00Z');
  add('C:\\Users\\Alex\\Documents\\Financial\\Budget_Forecast_2026.xlsx', false, 68000, '2026-10-02T10:00:00Z');
  add('C:\\Users\\Alex\\Documents\\Financial\\Tax_Receipts_2025.zip', false, 12400000, '2026-04-14T17:00:00Z');

  add('C:\\Users\\Alex\\Documents\\Architecture_Spec.md', false, 8920, '2026-10-07T15:20:00Z', {
    previewContent: '# Architecture Overview\n\nFlowFiles isolates UI views from OS storage through `FileSystemAdapter`.\nTauri 2 invokes Rust commands (`tauri::command`) with zero runtime overhead.\nNo Node.js runtime required in the final native build.',
  });
  add('C:\\Users\\Alex\\Documents\\Meeting_Notes_October.txt', false, 4120, '2026-10-07T16:00:00Z', {
    previewContent: 'Meeting Notes - Oct 7, 2026:\n1. Open source Windows Explorer replacement release target: Q4\n2. Memory footprint target: < 65MB RAM\n3. Fast fuzzy drive indexer with SQLite or sled database.',
  });

  // Downloads
  add('C:\\Users\\Alex\\Downloads', true, 0, '2026-10-09T01:10:00Z');
  add('C:\\Users\\Alex\\Downloads\\tauri-v2.1.0-x64-setup.exe', false, 14200000, '2026-10-08T22:45:00Z');
  add('C:\\Users\\Alex\\Downloads\\ubuntu-24.04.1-desktop-amd64.iso', false, 4920000000, '2026-10-06T18:00:00Z');
  add('C:\\Users\\Alex\\Downloads\\node-v22.14.0-x64.msi', false, 32100000, '2026-10-05T09:20:00Z');
  add('C:\\Users\\Alex\\Downloads\\mountain_sunset_wallpaper_4k.png', false, 8420000, '2026-10-08T12:00:00Z', {
    dimensions: { width: 3840, height: 2160 },
    thumbnailUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="%23fdba74"/><stop offset="50%" stop-color="%23f97316"/><stop offset="100%" stop-color="%23431407"/></linearGradient></defs><rect width="300" height="200" fill="url(%23g)"/><polygon points="0,200 80,120 160,200" fill="%231e293b"/><polygon points="110,200 200,90 300,200" fill="%230f172a"/><circle cx="150" cy="80" r="30" fill="%23fef08a"/></svg>',
  });
  add('C:\\Users\\Alex\\Downloads\\project_backup_20261001.zip', false, 128000000, '2026-10-01T23:30:00Z');
  add('C:\\Users\\Alex\\Downloads\\Invoice_INV-8921.pdf', false, 184000, '2026-10-09T01:10:00Z', {
    previewContent: 'INVOICE #8921\nAmount Due: $1,450.00\nPayment Terms: Net 30\nStatus: Paid',
  });

  // Pictures
  add('C:\\Users\\Alex\\Pictures', true, 0, '2026-10-06T14:00:00Z');
  add('C:\\Users\\Alex\\Pictures\\Wallpapers', true, 0, '2026-09-28T19:00:00Z');
  add('C:\\Users\\Alex\\Pictures\\Wallpapers\\alpine_dawn.png', false, 6800000, '2026-09-28T19:00:00Z', {
    dimensions: { width: 3840, height: 2160 },
    thumbnailUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="%2338bdf8"/><stop offset="100%" stop-color="%23e0e7ff"/></linearGradient></defs><rect width="300" height="200" fill="url(%23sky)"/><polygon points="20,200 120,60 220,200" fill="%2364748b"/><polygon points="140,200 230,80 300,200" fill="%23475569"/></svg>',
  });
  add('C:\\Users\\Alex\\Pictures\\Wallpapers\\cyberpunk_city.png', false, 7200000, '2026-09-28T19:00:00Z', {
    dimensions: { width: 3840, height: 2160 },
    thumbnailUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23090d16"/><line x1="20" y1="0" x2="20" y2="200" stroke="%23ec4899" stroke-width="2"/><line x1="120" y1="0" x2="120" y2="200" stroke="%2306b6d4" stroke-width="4"/><line x1="220" y1="0" x2="220" y2="200" stroke="%238b5cf6" stroke-width="3"/></svg>',
  });
  add('C:\\Users\\Alex\\Pictures\\Screenshots', true, 0, '2026-10-06T14:00:00Z');
  add('C:\\Users\\Alex\\Pictures\\Screenshots\\flowfiles_preview_dark.png', false, 1850000, '2026-10-06T14:00:00Z', {
    dimensions: { width: 1920, height: 1080 },
    thumbnailUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23020617"/><rect x="10" y="10" width="280" height="20" rx="4" fill="%231e293b"/><rect x="10" y="35" width="60" height="155" rx="4" fill="%230f172a"/><rect x="75" y="35" width="215" height="155" rx="4" fill="%231e293b"/></svg>',
  });
  add('C:\\Users\\Alex\\Pictures\\flowfiles_icon.svg', false, 3400, '2026-10-01T10:00:00Z', {
    dimensions: { width: 512, height: 512 },
    previewContent: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>',
    thumbnailUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="%230284c7"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>',
  });

  // Videos
  add('C:\\Users\\Alex\\Videos', true, 0, '2026-09-25T11:00:00Z');
  add('C:\\Users\\Alex\\Videos\\FlowFiles_Feature_Demo.mp4', false, 84200000, '2026-09-25T11:00:00Z', {
    duration: '04:12',
  });
  add('C:\\Users\\Alex\\Videos\\Release_Teaser_1080p.mkv', false, 215000000, '2026-08-30T16:20:00Z', {
    duration: '01:45',
  });

  // Music
  add('C:\\Users\\Alex\\Music', true, 0, '2026-09-18T14:00:00Z');
  add('C:\\Users\\Alex\\Music\\Chopin_Nocturne_Op9_No2.mp3', false, 5840000, '2026-09-18T14:00:00Z', {
    duration: '04:30',
  });
  add('C:\\Users\\Alex\\Music\\Synthwave_Drive_Midnight.flac', false, 36200000, '2026-08-14T20:00:00Z', {
    duration: '05:14',
  });

  // Projects
  add('C:\\Users\\Alex\\Projects', true, 0, '2026-10-09T02:00:00Z');
  add('C:\\Users\\Alex\\Projects\\flowfiles', true, 0, '2026-10-09T02:00:00Z');
  add('C:\\Users\\Alex\\Projects\\flowfiles\\package.json', false, 1420, '2026-10-09T02:00:00Z', {
    previewContent: '{\n  "name": "flowfiles",\n  "version": "1.0.0",\n  "private": true,\n  "scripts": {\n    "dev": "vite",\n    "build": "tsc && vite build"\n  }\n}',
  });
  add('C:\\Users\\Alex\\Projects\\flowfiles\\Cargo.toml', false, 820, '2026-10-09T01:50:00Z', {
    previewContent: '[package]\nname = "flowfiles"\nversion = "1.0.0"\nedition = "2021"\n\n[dependencies]\ntauri = { version = "2.0.0" }\nserde = { version = "1.0", features = ["derive"] }',
  });
  add('C:\\Users\\Alex\\Projects\\flowfiles\\README.md', false, 2400, '2026-10-09T02:00:00Z', {
    previewContent: '# FlowFiles\n\nA modern, open-source Windows File Explorer alternative built with React, TypeScript, Tailwind CSS, and Tauri 2.',
  });

  // D: Data Drive
  add('D:\\Backups', true, 0, '2026-10-01T04:00:00Z');
  add('D:\\Backups\\Windows_System_Image_2026.vhdx', false, 48200000000, '2026-10-01T04:00:00Z');
  add('D:\\Backups\\PostgreSQL_Prod_Dump.sql', false, 842000000, '2026-10-01T02:15:00Z');
  add('D:\\VirtualMachines', true, 0, '2026-09-10T12:00:00Z');
  add('D:\\VirtualMachines\\Ubuntu_Server_24.vmdk', false, 24600000000, '2026-09-10T12:00:00Z');
  add('D:\\Large_Datasets', true, 0, '2026-08-22T15:00:00Z');
  add('D:\\Large_Datasets\\geospatial_telemetry.parquet', false, 680000000, '2026-08-22T15:00:00Z');

  // E: USB Drive
  add('E:\\Portable_Apps', true, 0, '2026-09-12T10:00:00Z');
  add('E:\\Portable_Apps\\VSCode_Portable.exe', false, 128000000, '2026-09-12T10:00:00Z');
  add('E:\\Portable_Apps\\PuTTY.exe', false, 3400000, '2026-09-12T10:00:00Z');
  add('E:\\Field_Data', true, 0, '2026-10-04T16:30:00Z');
  add('E:\\Field_Data\\Survey_Report_Oct2026.pdf', false, 3800000, '2026-10-04T16:30:00Z');
  add('E:\\Field_Data\\Sensor_Readings.csv', false, 1450000, '2026-10-04T16:30:00Z', {
    previewContent: 'timestamp,sensor_id,temperature,pressure,vibration\n2026-10-04T10:00:00Z,SNS-01,23.4,101.3,0.02\n2026-10-04T10:05:00Z,SNS-01,23.5,101.3,0.02',
  });

  return map;
}

export class DemoFileSystemAdapter implements FileSystemAdapter {
  readonly isNative = false;
  readonly adapterName = 'Browser Demo (Isolated In-Memory Sandbox)';

  private drives: DriveInfo[] = [
    {
      id: 'C',
      name: 'Local Disk (C:)',
      mountPoint: 'C:\\',
      label: 'Windows OS',
      totalSpace: 512 * 1024 * 1024 * 1024, // 512 GB
      freeSpace: 184 * 1024 * 1024 * 1024, // 184 GB
      driveType: 'fixed',
      fileSystem: 'NTFS',
    },
    {
      id: 'D',
      name: 'Data (D:)',
      mountPoint: 'D:\\',
      label: 'Storage & VM',
      totalSpace: 1024 * 1024 * 1024 * 1024, // 1 TB
      freeSpace: 612 * 1024 * 1024 * 1024, // 612 GB
      driveType: 'fixed',
      fileSystem: 'NTFS',
    },
    {
      id: 'E',
      name: 'USB Drive (E:)',
      mountPoint: 'E:\\',
      label: 'Kingston 64GB',
      totalSpace: 64 * 1024 * 1024 * 1024, // 64 GB
      freeSpace: 42 * 1024 * 1024 * 1024, // 42 GB
      driveType: 'removable',
      fileSystem: 'exFAT',
    },
  ];

  private entries: Map<string, FileEntry> = createInitialEntries();
  private recycleBin: Map<string, RecycleBinItem> = new Map();

  async list_drives(): Promise<DriveInfo[]> {
    // Artificial small delay for realistic asynchronous UI feel
    await new Promise((res) => setTimeout(res, 30));
    return [...this.drives];
  }

  async get_known_folders(): Promise<KnownFolders> {
    return {
      home: 'C:\\Users\\Alex',
      folders: [
        { name: 'Desktop', path: 'C:\\Users\\Alex\\Desktop' },
        { name: 'Downloads', path: 'C:\\Users\\Alex\\Downloads' },
        { name: 'Documents', path: 'C:\\Users\\Alex\\Documents' },
        { name: 'Pictures', path: 'C:\\Users\\Alex\\Pictures' },
        { name: 'Videos', path: 'C:\\Users\\Alex\\Videos' },
        { name: 'Music', path: 'C:\\Users\\Alex\\Music' },
      ],
    };
  }

  async read_directory(path: string, options?: ReadDirOptions): Promise<DirectoryListing> {
    await new Promise((res) => setTimeout(res, 40));

    if (path === 'This PC') {
      // Virtual listing of all drives
      const driveEntries: FileEntry[] = this.drives.map((d) => ({
        id: d.mountPoint,
        name: d.name,
        path: d.mountPoint,
        isDirectory: true,
        size: d.totalSpace - d.freeSpace,
        modifiedDate: new Date().toISOString(),
        createdDate: new Date().toISOString(),
        category: 'folder',
      }));
      return {
        path: 'This PC',
        entries: driveEntries,
        totalItems: driveEntries.length,
        totalSize: driveEntries.reduce((acc, cur) => acc + cur.size, 0),
      };
    }

    if (path === 'Home') {
      // Virtual Quick Access / Home listing
      const shortcuts = [
        'C:\\Users\\Alex\\Desktop',
        'C:\\Users\\Alex\\Documents',
        'C:\\Users\\Alex\\Downloads',
        'C:\\Users\\Alex\\Pictures',
        'C:\\Users\\Alex\\Videos',
        'C:\\Users\\Alex\\Music',
        'C:\\Users\\Alex\\Projects',
      ];
      const entries: FileEntry[] = [];
      for (const p of shortcuts) {
        const item = this.entries.get(p);
        if (item) entries.push(item);
      }
      return {
        path: 'Home',
        entries,
        totalItems: entries.length,
        totalSize: 0,
      };
    }

    if (path === '::RecycleBin') {
      const entries: FileEntry[] = Array.from(this.recycleBin.values()).map(
        (rb) => ({
          ...rb.entry,
          path: `::RecycleBin\\${rb.id}`,
        })
      );
      return {
        path: '::RecycleBin',
        entries,
        totalItems: entries.length,
        totalSize: entries.reduce((acc, c) => acc + c.size, 0),
      };
    }

    const normTarget = normalizePath(path);
    const directChildren: FileEntry[] = [];

    for (const [entryPath, entry] of this.entries.entries()) {
      if (entryPath === normTarget) continue;
      const parent = getParentPath(entryPath);
      if (parent.toLowerCase() === normTarget.toLowerCase()) {
        if (!options?.showHidden && entry.isHidden) continue;
        
        // Count sub items if folder
        let itemCount: number | undefined = undefined;
        if (entry.isDirectory) {
          let count = 0;
          for (const p of this.entries.keys()) {
            if (getParentPath(p).toLowerCase() === entryPath.toLowerCase()) {
              count++;
            }
          }
          itemCount = count;
        }

        directChildren.push({
          ...entry,
          itemCount,
        });
      }
    }

    return {
      path: normTarget,
      entries: directChildren,
      totalItems: directChildren.length,
      totalSize: directChildren.reduce((acc, cur) => acc + cur.size, 0),
    };
  }

  async get_file_metadata(path: string): Promise<FileMetadata> {
    await new Promise((res) => setTimeout(res, 30));
    const norm = normalizePath(path);
    const entry = this.entries.get(norm);

    if (!entry) {
      // Check if drive
      const drive = this.drives.find(
        (d) => d.mountPoint.toLowerCase() === norm.toLowerCase()
      );
      if (drive) {
        return {
          id: drive.mountPoint,
          name: drive.name,
          path: drive.mountPoint,
          isDirectory: true,
          size: drive.totalSpace,
          modifiedDate: new Date().toISOString(),
          createdDate: new Date().toISOString(),
          category: 'folder',
          sizeOnDisk: drive.totalSpace,
          attributes: { readOnly: false, system: false, hidden: false },
        };
      }
      throw new Error(`File or directory not found: ${path}`);
    }

    const metadata: FileMetadata = {
      ...entry,
      sizeOnDisk: Math.ceil((entry.size || 4096) / 4096) * 4096,
      permissions: 'Read, Write, Execute',
      attributes: {
        archive: true,
        hidden: entry.isHidden || false,
        readOnly: entry.isReadOnly || false,
        system: entry.isSystem || false,
      },
      mimeType: entry.extension ? getMimeType(entry.extension) : undefined,
    };

    if (entry.category === 'code' || entry.category === 'document') {
      metadata.lineCount = entry.previewContent
        ? entry.previewContent.split('\n').length
        : Math.max(1, Math.floor(entry.size / 60));
    }

    return metadata;
  }

  async create_directory(parentPath: string, name: string): Promise<FileEntry> {
    const val = validateFileName(name);
    if (!val.valid) throw new Error(val.error);

    const normParent = normalizePath(parentPath);
    const newPath = joinPath(normParent, name);

    if (this.entries.has(newPath)) {
      throw new Error(`A folder or file named "${name}" already exists in this directory.`);
    }

    const now = new Date().toISOString();
    const newEntry: FileEntry = {
      id: newPath,
      name,
      path: newPath,
      isDirectory: true,
      size: 0,
      modifiedDate: now,
      createdDate: now,
      category: 'folder',
      itemCount: 0,
    };

    this.entries.set(newPath, newEntry);
    return newEntry;
  }

  async create_file(parentPath: string, name: string, content = ''): Promise<FileEntry> {
    const val = validateFileName(name);
    if (!val.valid) throw new Error(val.error);

    const normParent = normalizePath(parentPath);
    const newPath = joinPath(normParent, name);

    if (this.entries.has(newPath)) {
      throw new Error(`A file named "${name}" already exists in this directory.`);
    }

    const now = new Date().toISOString();
    const ext = getExtension(name);
    const newEntry: FileEntry = {
      id: newPath,
      name,
      path: newPath,
      isDirectory: false,
      size: content.length,
      modifiedDate: now,
      createdDate: now,
      extension: ext,
      category: determineCategory(ext, false),
      previewContent: content,
    };

    this.entries.set(newPath, newEntry);
    return newEntry;
  }

  async rename_path(oldPath: string, newName: string): Promise<FileEntry> {
    const val = validateFileName(newName);
    if (!val.valid) throw new Error(val.error);

    const normOld = normalizePath(oldPath);
    const entry = this.entries.get(normOld);
    if (!entry) throw new Error(`Path does not exist: ${oldPath}`);

    const parent = getParentPath(normOld);
    const normNew = joinPath(parent, newName);

    if (normNew.toLowerCase() !== normOld.toLowerCase() && this.entries.has(normNew)) {
      throw new Error(`An item named "${newName}" already exists in this location.`);
    }

    // Update entry
    const ext = entry.isDirectory ? undefined : getExtension(newName);
    const updatedEntry: FileEntry = {
      ...entry,
      id: normNew,
      name: newName,
      path: normNew,
      extension: ext,
      category: entry.isDirectory ? 'folder' : determineCategory(ext || '', false),
      modifiedDate: new Date().toISOString(),
    };

    this.entries.delete(normOld);
    this.entries.set(normNew, updatedEntry);

    // If directory, also recursively update all children paths
    if (entry.isDirectory) {
      const prefix = normOld + '\\';
      const toUpdate: { oldP: string; newP: string; item: FileEntry }[] = [];
      for (const [p, child] of this.entries.entries()) {
        if (p.startsWith(prefix)) {
          const suffix = p.slice(prefix.length);
          const childNewPath = `${normNew}\\${suffix}`;
          toUpdate.push({
            oldP: p,
            newP: childNewPath,
            item: { ...child, id: childNewPath, path: childNewPath },
          });
        }
      }
      for (const u of toUpdate) {
        this.entries.delete(u.oldP);
        this.entries.set(u.newP, u.item);
      }
    }

    return updatedEntry;
  }

  async copy_paths(
    sourcePaths: string[],
    destinationPath: string,
    onProgress?: (progress: OperationProgress) => void
  ): Promise<OperationResult> {
    const normDest = normalizePath(destinationPath);
    const successful: string[] = [];
    const failed: { path: string; error: string }[] = [];

    const total = sourcePaths.length;
    let processed = 0;

    for (const src of sourcePaths) {
      const normSrc = normalizePath(src);
      const entry = this.entries.get(normSrc);

      if (!entry) {
        failed.push({ path: src, error: 'Source not found' });
        continue;
      }

      // Compute new path
      let destName = entry.name;
      let targetPath = joinPath(normDest, destName);

      // Handle duplicate naming in demo if already exists
      if (this.entries.has(targetPath)) {
        const ext = entry.extension ? `.${entry.extension}` : '';
        const rawName = entry.extension
          ? entry.name.slice(0, entry.name.length - ext.length)
          : entry.name;
        destName = `${rawName} - Copy${ext}`;
        targetPath = joinPath(normDest, destName);
      }

      // Simulate progress notification
      if (onProgress) {
        onProgress({
          id: `copy-${Date.now()}`,
          type: 'copy',
          title: `Copying items to ${getBaseName(normDest)}`,
          currentItem: entry.name,
          processedItems: processed,
          totalItems: total,
          percent: Math.round(((processed + 0.5) / total) * 100),
          bytesTransferred: entry.size,
          totalBytes: entry.size * total,
          status: 'running',
          speed: '124 MB/s',
        });
        await new Promise((res) => setTimeout(res, 80));
      }

      const copyEntry: FileEntry = {
        ...entry,
        id: targetPath,
        name: destName,
        path: targetPath,
        modifiedDate: new Date().toISOString(),
      };
      this.entries.set(targetPath, copyEntry);
      successful.push(targetPath);

      // If directory, copy recursively
      if (entry.isDirectory) {
        const prefix = normSrc + '\\';
        for (const [p, child] of Array.from(this.entries.entries())) {
          if (p.startsWith(prefix)) {
            const rel = p.slice(prefix.length);
            const childDest = `${targetPath}\\${rel}`;
            this.entries.set(childDest, {
              ...child,
              id: childDest,
              path: childDest,
            });
          }
        }
      }

      processed++;
    }

    if (onProgress) {
      onProgress({
        id: `copy-${Date.now()}`,
        type: 'copy',
        title: 'Copy completed',
        currentItem: 'Finished',
        processedItems: total,
        totalItems: total,
        percent: 100,
        bytesTransferred: 1000000,
        totalBytes: 1000000,
        status: 'completed',
      });
    }

    return {
      success: failed.length === 0,
      successful,
      failed,
    };
  }

  async move_paths(
    sourcePaths: string[],
    destinationPath: string,
    onProgress?: (progress: OperationProgress) => void
  ): Promise<OperationResult> {
    const copyResult = await this.copy_paths(sourcePaths, destinationPath, onProgress);
    // Delete original items
    for (const src of sourcePaths) {
      const normSrc = normalizePath(src);
      this.entries.delete(normSrc);
      // Delete children if folder
      const prefix = normSrc + '\\';
      for (const p of Array.from(this.entries.keys())) {
        if (p.startsWith(prefix)) {
          this.entries.delete(p);
        }
      }
    }
    return copyResult;
  }

  async send_to_recycle_bin(paths: string[]): Promise<OperationResult> {
    const recycled: string[] = [];
    const failed: { path: string; error: string }[] = [];

    for (const p of paths) {
      const norm = normalizePath(p);
      const entry = this.entries.get(norm);
      if (!entry) {
        failed.push({ path: p, error: 'File does not exist' });
        continue;
      }

      const id = `rb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      this.recycleBin.set(id, {
        id,
        originalPath: norm,
        deletedDate: new Date().toISOString(),
        entry: { ...entry },
      });

      this.entries.delete(norm);
      // Remove children if folder
      if (entry.isDirectory) {
        const prefix = norm + '\\';
        for (const childPath of Array.from(this.entries.keys())) {
          if (childPath.startsWith(prefix)) {
            this.entries.delete(childPath);
          }
        }
      }

      recycled.push(norm);
    }

    return {
      success: failed.length === 0,
      successful: recycled,
      failed,
    };
  }

  async restore_from_recycle_bin(ids: string[]): Promise<OperationResult> {
    const restored: string[] = [];
    const failed: { path: string; error: string }[] = [];

    for (const id of ids) {
      const item = this.recycleBin.get(id);
      if (!item) {
        failed.push({ path: id, error: 'Item not found in Recycle Bin' });
        continue;
      }

      this.entries.set(item.originalPath, item.entry);
      this.recycleBin.delete(id);
      restored.push(item.originalPath);
    }

    return {
      success: failed.length === 0,
      successful: restored,
      failed,
    };
  }

  async empty_recycle_bin(): Promise<boolean> {
    this.recycleBin.clear();
    return true;
  }

  async get_recycle_bin_items(): Promise<RecycleBinItem[]> {
    return Array.from(this.recycleBin.values());
  }

  async open_with_default_app(path: string): Promise<{ appName?: string; success: boolean; message: string }> {
    const norm = normalizePath(path);
    const entry = this.entries.get(norm);
    if (!entry) {
      return { success: false, message: `Could not find file: ${path}` };
    }

    const ext = entry.extension?.toLowerCase() || '';
    let appName = 'Notepad';
    if (['jpg', 'png', 'svg', 'webp'].includes(ext)) appName = 'Windows Photos';
    else if (['mp4', 'mkv', 'webm'].includes(ext)) appName = 'Media Player';
    else if (['mp3', 'flac'].includes(ext)) appName = 'Windows Media Player';
    else if (['pdf'].includes(ext)) appName = 'Microsoft Edge';
    else if (['docx', 'doc'].includes(ext)) appName = 'Microsoft Word';
    else if (['xlsx', 'xls'].includes(ext)) appName = 'Microsoft Excel';
    else if (['ts', 'tsx', 'js', 'json', 'rs', 'py'].includes(ext)) appName = 'Visual Studio Code';

    return {
      success: true,
      appName,
      message: `Simulated launching "${entry.name}" with default handler [${appName}]. In Tauri native build, this invokes windows::shell::ShellExecute.`,
    };
  }

  async search(
    query: string,
    searchPath: string,
    options?: SearchOptions,
    signal?: AbortSignal
  ): Promise<SearchResponse> {
    if (!query.trim()) return { results: [], inaccessiblePaths: [] };
    if (signal?.aborted) throw new Error('Search cancelled.');
    
    // Quick artificial yield to keep UI responsive
    await new Promise((res) => setTimeout(res, 20));

    const q = query.trim().toLowerCase();
    const results: SearchResultEntry[] = [];
    const normSearchPath = normalizePath(searchPath);
    if (normSearchPath.toLowerCase() === 'this pc' || normSearchPath === '::RecycleBin') {
      throw new Error('Search requires an open folder. Choose a drive or folder first.');
    }

    const targetCategory =
      options?.category && options.category !== 'all' ? options.category : null;

    const now = new Date().getTime();
    const normalizedRoot = normSearchPath.toLowerCase().replace(/[\\/]+$/, '');
    const isVirtualHome = normSearchPath.toLowerCase() === 'home';
    const searchRoots =
      isVirtualHome
        ? [
            'C:\\Users\\Alex\\Desktop',
            'C:\\Users\\Alex\\Documents',
            'C:\\Users\\Alex\\Downloads',
            'C:\\Users\\Alex\\Pictures',
            'C:\\Users\\Alex\\Videos',
            'C:\\Users\\Alex\\Music',
            'C:\\Users\\Alex\\Projects',
          ].map((path) => path.toLowerCase())
        : [normalizedRoot];

    for (const [p, entry] of this.entries.entries()) {
      if (signal?.aborted) throw new Error('Search cancelled.');
      const normalizedEntryPath = p.toLowerCase();
      const withinSearchScope = searchRoots.some(
        (root) =>
          (isVirtualHome && normalizedEntryPath === root) ||
          normalizedEntryPath.startsWith(`${root}\\`)
      );
      if (!withinSearchScope) {
        continue;
      }
      if (!options?.showHidden && (entry.isHidden || entry.isSystem)) continue;

      // 2. Category filter
      if (targetCategory && entry.category !== targetCategory) {
        continue;
      }

      // 4. Size filter
      if (options?.sizeFilter && options.sizeFilter !== 'all') {
        const s = entry.size;
        if (options.sizeFilter === 'tiny' && s >= 10 * 1024) continue;
        if (options.sizeFilter === 'small' && (s < 10 * 1024 || s >= 1024 * 1024)) continue;
        if (options.sizeFilter === 'medium' && (s < 1024 * 1024 || s >= 128 * 1024 * 1024)) continue;
        if (options.sizeFilter === 'large' && (s < 128 * 1024 * 1024 || s >= 1024 * 1024 * 1024)) continue;
        if (options.sizeFilter === 'huge' && s < 1024 * 1024 * 1024) continue;
      }

      // 5. Date filter
      if (options?.dateFilter && options.dateFilter !== 'all') {
        const fileTime = new Date(entry.modifiedDate).getTime();
        const diffDays = (now - fileTime) / (1000 * 60 * 60 * 24);
        if (options.dateFilter === 'today' && diffDays > 1) continue;
        if (options.dateFilter === 'week' && diffDays > 7) continue;
        if (options.dateFilter === 'month' && diffDays > 30) continue;
        if (options.dateFilter === 'year' && diffDays > 365) continue;
      }

      const lowerName = entry.name.toLowerCase();
      if (lowerName.includes(q)) {
        results.push({
          ...entry,
          matchedIn: 'name',
          containingFolderPath: getParentPath(entry.path),
        });
      }
    }

    results.sort((a, b) => a.name.localeCompare(b.name));

    return { results, inaccessiblePaths: [] };
  }
}
