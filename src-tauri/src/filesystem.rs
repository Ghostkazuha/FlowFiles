use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::SystemTime;
use time::OffsetDateTime;
use time::format_description::well_known::Rfc3339;

#[derive(Default)]
struct SearchRegistry {
    running: HashMap<String, Arc<AtomicBool>>,
}

static SEARCH_REGISTRY: OnceLock<Mutex<SearchRegistry>> = OnceLock::new();

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveInfo {
    id: String,
    name: String,
    mount_point: String,
    label: String,
    total_space: u64,
    free_space: u64,
    drive_type: String,
    file_system: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    id: String,
    name: String,
    path: String,
    is_directory: bool,
    size: u64,
    modified_date: String,
    created_date: Option<String>,
    extension: Option<String>,
    category: &'static str,
    is_hidden: bool,
    is_system: bool,
    is_read_only: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryListing {
    path: String,
    entries: Vec<FileEntry>,
    total_items: usize,
    total_size: u64,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadDirOptions {
    show_hidden: Option<bool>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchOptions {
    category: Option<String>,
    size_filter: Option<String>,
    date_filter: Option<String>,
    show_hidden: Option<bool>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResponse {
    results: Vec<SearchResultEntry>,
    inaccessible_paths: Vec<SearchPathError>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenResult {
    success: bool,
    message: String,
    app_name: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchResultEntry {
    #[serde(flatten)]
    entry: FileEntry,
    matched_in: &'static str,
    containing_folder_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchPathError {
    path: String,
    error: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnownFolders {
    home: String,
    folders: Vec<KnownFolder>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct KnownFolder {
    name: &'static str,
    path: String,
}

#[tauri::command]
pub fn list_drives() -> Result<Vec<DriveInfo>, String> {
    list_windows_drives()
}

#[tauri::command]
pub fn get_known_folders() -> Result<KnownFolders, String> {
    resolve_known_folders()
}

#[tauri::command]
pub async fn read_directory(
    path: String,
    options: Option<ReadDirOptions>,
) -> Result<DirectoryListing, String> {
    tauri::async_runtime::spawn_blocking(move || read_directory_sync(path, options))
        .await
        .map_err(|error| format!("Directory read task failed: {error}"))?
}

#[tauri::command]
pub async fn search_files(
    query: String,
    search_path: String,
    options: Option<SearchOptions>,
    request_id: String,
) -> Result<SearchResponse, String> {
    let cancellation = Arc::new(AtomicBool::new(false));
    {
        let mut registry = search_registry()
            .lock()
            .map_err(|_| "File search registry is unavailable.".to_string())?;
        registry
            .running
            .insert(request_id.clone(), cancellation.clone());
    }

    let result = tauri::async_runtime::spawn_blocking(move || {
        search_files_with_cancellation(query, search_path, options, cancellation)
    })
    .await
    .map_err(|error| format!("File search task failed: {error}"))
    .and_then(|result| result);
    let mut registry = search_registry()
        .lock()
        .map_err(|_| "File search registry is unavailable.".to_string())?;
    registry.running.remove(&request_id);
    result
}

#[tauri::command]
pub fn cancel_file_search(request_id: String) -> Result<(), String> {
    let registry = search_registry()
        .lock()
        .map_err(|_| "File search registry is unavailable.".to_string())?;
    if let Some(cancellation) = registry.running.get(&request_id) {
        cancellation.store(true, Ordering::Relaxed);
    }
    Ok(())
}

fn search_registry() -> &'static Mutex<SearchRegistry> {
    SEARCH_REGISTRY.get_or_init(|| Mutex::new(SearchRegistry::default()))
}

#[cfg(test)]
fn search_files_sync(
    query: String,
    search_path: String,
    options: Option<SearchOptions>,
) -> Result<SearchResponse, String> {
    search_files_with_cancellation(
        query,
        search_path,
        options,
        Arc::new(AtomicBool::new(false)),
    )
}

fn search_files_with_cancellation(
    query: String,
    search_path: String,
    options: Option<SearchOptions>,
    cancellation: Arc<AtomicBool>,
) -> Result<SearchResponse, String> {
    let query = query.trim().to_lowercase();
    if query.is_empty() {
        return Ok(SearchResponse {
            results: Vec::new(),
            inaccessible_paths: Vec::new(),
        });
    }

    let root = if search_path.eq_ignore_ascii_case("home") {
        PathBuf::from(resolve_known_folders()?.home)
    } else if search_path.eq_ignore_ascii_case("this pc")
        || search_path.eq_ignore_ascii_case("::recyclebin")
    {
        return Err(
            "Search requires an open filesystem folder. Choose a drive or folder first."
                .to_string(),
        );
    } else {
        PathBuf::from(&search_path)
    };
    let root_metadata =
        fs::metadata(&root).map_err(|error| format_io_error("search folder", &root, &error))?;
    if !root_metadata.is_dir() {
        return Err(format!("Search path '{}' is not a folder.", root.display()));
    }
    let options = options.unwrap_or(SearchOptions {
        category: None,
        size_filter: None,
        date_filter: None,
        show_hidden: None,
    });
    let show_hidden = options.show_hidden.unwrap_or(false);
    let mut pending = vec![root.clone()];
    let mut results = Vec::new();
    let mut inaccessible_paths = Vec::new();

    while let Some(directory_path) = pending.pop() {
        if cancellation.load(Ordering::Relaxed) {
            return Err("Search cancelled.".to_string());
        }
        let entries = match fs::read_dir(&directory_path) {
            Ok(entries) => entries,
            Err(error) if directory_path == root => {
                return Err(format_io_error("search folder", &directory_path, &error));
            }
            Err(error) if error.kind() == io::ErrorKind::NotFound => continue,
            Err(error) => {
                inaccessible_paths.push(SearchPathError {
                    path: directory_path.to_string_lossy().into_owned(),
                    error: error.to_string(),
                });
                continue;
            }
        };
        for entry in entries {
            if cancellation.load(Ordering::Relaxed) {
                return Err("Search cancelled.".to_string());
            }
            let entry = match entry {
                Ok(entry) => entry,
                Err(error) => {
                    inaccessible_paths.push(SearchPathError {
                        path: directory_path.to_string_lossy().into_owned(),
                        error: error.to_string(),
                    });
                    continue;
                }
            };
            let path = entry.path();
            let file_type = match entry.file_type() {
                Ok(file_type) => file_type,
                Err(error) if error.kind() == io::ErrorKind::NotFound => continue,
                Err(error) => {
                    inaccessible_paths.push(SearchPathError {
                        path: path.to_string_lossy().into_owned(),
                        error: error.to_string(),
                    });
                    continue;
                }
            };
            if file_type.is_symlink() {
                continue;
            }

            let metadata = match entry.metadata() {
                Ok(metadata) => metadata,
                Err(error) if error.kind() == io::ErrorKind::NotFound => continue,
                Err(error) => {
                    inaccessible_paths.push(SearchPathError {
                        path: path.to_string_lossy().into_owned(),
                        error: error.to_string(),
                    });
                    continue;
                }
            };
            let (is_hidden, is_system, _) = file_flags(&metadata);
            if !show_hidden && (is_hidden || is_system) {
                continue;
            }

            let is_directory = metadata.is_dir();
            if is_directory && !is_reparse_point(&metadata) {
                pending.push(path.clone());
            }

            if !entry
                .file_name()
                .to_string_lossy()
                .to_lowercase()
                .contains(&query)
            {
                continue;
            }

            let file = match file_entry(path.clone(), metadata) {
                Ok(file) => file,
                Err(error) => {
                    inaccessible_paths.push(SearchPathError {
                        path: path.to_string_lossy().into_owned(),
                        error,
                    });
                    continue;
                }
            };
            if !matches_search_filters(&file, &options) {
                continue;
            }

            results.push(SearchResultEntry {
                containing_folder_path: path
                    .parent()
                    .unwrap_or(&root)
                    .to_string_lossy()
                    .into_owned(),
                entry: file,
                matched_in: "name",
            });
        }
    }

    results.sort_by(|left, right| {
        right
            .entry
            .is_directory
            .cmp(&left.entry.is_directory)
            .then_with(|| {
                left.entry
                    .name
                    .to_lowercase()
                    .cmp(&right.entry.name.to_lowercase())
            })
    });

    Ok(SearchResponse {
        results,
        inaccessible_paths,
    })
}

fn matches_search_filters(entry: &FileEntry, options: &SearchOptions) -> bool {
    if options
        .category
        .as_deref()
        .filter(|category| *category != "all")
        .is_some_and(|category| category != entry.category)
    {
        return false;
    }

    let size_matches = match options.size_filter.as_deref().unwrap_or("all") {
        "tiny" => entry.size < 10 * 1024,
        "small" => (10 * 1024..1024 * 1024).contains(&entry.size),
        "medium" => (1024 * 1024..128 * 1024 * 1024).contains(&entry.size),
        "large" => (128 * 1024 * 1024..1024 * 1024 * 1024).contains(&entry.size),
        "huge" => entry.size >= 1024 * 1024 * 1024,
        _ => true,
    };
    if !size_matches {
        return false;
    }

    let age_limit = match options.date_filter.as_deref().unwrap_or("all") {
        "today" => Some(24 * 60 * 60),
        "week" => Some(7 * 24 * 60 * 60),
        "month" => Some(30 * 24 * 60 * 60),
        "year" => Some(365 * 24 * 60 * 60),
        _ => None,
    };
    age_limit.is_none_or(|seconds| {
        OffsetDateTime::parse(&entry.modified_date, &Rfc3339)
            .ok()
            .is_some_and(|modified| {
                modified.unix_timestamp() >= OffsetDateTime::now_utc().unix_timestamp() - seconds
            })
    })
}

fn read_directory_sync(
    path: String,
    options: Option<ReadDirOptions>,
) -> Result<DirectoryListing, String> {
    if path.eq_ignore_ascii_case("this pc") {
        let drives = list_drives()?;
        let entries: Vec<FileEntry> = drives
            .into_iter()
            .map(|drive| FileEntry {
                id: drive.mount_point.clone(),
                name: drive.name,
                path: drive.mount_point,
                is_directory: true,
                size: 0,
                modified_date: String::new(),
                created_date: None,
                extension: None,
                category: "folder",
                is_hidden: false,
                is_system: false,
                is_read_only: false,
            })
            .collect();
        return Ok(DirectoryListing {
            path,
            total_items: entries.len(),
            total_size: 0,
            entries,
        });
    }

    let directory_path = if path.eq_ignore_ascii_case("home") {
        PathBuf::from(resolve_known_folders()?.home)
    } else {
        PathBuf::from(&path)
    };

    let directory = fs::read_dir(&directory_path)
        .map_err(|error| format_io_error("read folder", &directory_path, &error))?;
    let show_hidden = options
        .and_then(|read_options| read_options.show_hidden)
        .unwrap_or(false);
    let mut entries = Vec::new();

    for result in directory {
        let entry = result
            .map_err(|error| format_io_error("read folder entry in", &directory_path, &error))?;
        let metadata = entry
            .metadata()
            .map_err(|error| format_io_error("read metadata for", &entry.path(), &error))?;
        let (is_hidden, is_system, _) = file_flags(&metadata);
        if !show_hidden && (is_hidden || is_system) {
            continue;
        }
        entries.push(file_entry(entry.path(), metadata)?);
    }

    entries.sort_by(|left, right| {
        right
            .is_directory
            .cmp(&left.is_directory)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });

    let total_size = entries
        .iter()
        .fold(0u64, |total, entry| total.saturating_add(entry.size));
    Ok(DirectoryListing {
        path: directory_path.to_string_lossy().into_owned(),
        total_items: entries.len(),
        total_size,
        entries,
    })
}

#[cfg(windows)]
fn resolve_known_folders() -> Result<KnownFolders, String> {
    use std::os::windows::ffi::OsStringExt;
    use windows_sys::Win32::System::Com::CoTaskMemFree;
    use windows_sys::Win32::UI::Shell::{
        FOLDERID_Desktop, FOLDERID_Documents, FOLDERID_Downloads, FOLDERID_Music,
        FOLDERID_Pictures, FOLDERID_Profile, FOLDERID_Videos, KF_FLAG_DONT_VERIFY,
        SHGetKnownFolderPath,
    };

    fn known_folder_path(id: &windows_sys::core::GUID, name: &str) -> Result<String, String> {
        let mut path = std::ptr::null_mut();
        let result = unsafe {
            SHGetKnownFolderPath(
                id,
                KF_FLAG_DONT_VERIFY as u32,
                std::ptr::null_mut(),
                &mut path,
            )
        };
        if result < 0 {
            return Err(format!(
                "Could not resolve the Windows {name} known folder (HRESULT 0x{:08X}).",
                result as u32
            ));
        }
        if path.is_null() {
            return Err(format!(
                "Windows returned no path for the {name} known folder."
            ));
        }

        let mut length = 0;
        unsafe {
            while *path.add(length) != 0 {
                length += 1;
            }
        }
        let resolved =
            unsafe { std::ffi::OsString::from_wide(std::slice::from_raw_parts(path, length)) }
                .to_string_lossy()
                .into_owned();
        unsafe { CoTaskMemFree(path.cast()) };
        Ok(resolved)
    }

    let home = known_folder_path(&FOLDERID_Profile, "user profile")?;
    let folders = [
        ("Desktop", &FOLDERID_Desktop),
        ("Downloads", &FOLDERID_Downloads),
        ("Documents", &FOLDERID_Documents),
        ("Pictures", &FOLDERID_Pictures),
        ("Videos", &FOLDERID_Videos),
        ("Music", &FOLDERID_Music),
    ]
    .into_iter()
    .map(|(name, id)| {
        Ok(KnownFolder {
            name,
            path: known_folder_path(id, name)?,
        })
    })
    .collect::<Result<Vec<_>, String>>()?;

    Ok(KnownFolders { home, folders })
}

#[cfg(not(windows))]
fn resolve_known_folders() -> Result<KnownFolders, String> {
    Err("Windows known folders are only available in the Windows desktop app.".to_string())
}

#[tauri::command]
pub fn get_file_metadata(path: String) -> Result<FileEntry, String> {
    let file_path = PathBuf::from(path);
    let metadata = fs::metadata(&file_path)
        .map_err(|error| format_io_error("read metadata for", &file_path, &error))?;
    file_entry(file_path, metadata)
}

#[tauri::command]
pub fn open_with_default_app(path: String) -> Result<OpenResult, String> {
    open_path_with_default_app(Path::new(&path))
}

#[cfg(windows)]
fn open_path_with_default_app(path: &Path) -> Result<OpenResult, String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let metadata = fs::metadata(path).map_err(|error| format_io_error("open", path, &error))?;
    if metadata.is_dir() {
        return Err(format!("'{}' is a folder, not a file.", path.display()));
    }

    let operation: Vec<u16> = std::ffi::OsStr::new("open")
        .encode_wide()
        .chain(Some(0))
        .collect();
    let file: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    let result = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            operation.as_ptr(),
            file.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        )
    } as usize;
    if result <= 32 {
        return Err(format!(
            "Windows could not open '{}': ShellExecuteW returned {result}.",
            path.display()
        ));
    }

    Ok(OpenResult {
        success: true,
        message: format!("Opened '{}' with its default application.", path.display()),
        app_name: None,
    })
}

#[cfg(not(windows))]
fn open_path_with_default_app(path: &Path) -> Result<OpenResult, String> {
    Err(format!(
        "Opening files with the Windows default application is unavailable for '{}'.",
        path.display()
    ))
}

fn file_entry(path: PathBuf, metadata: fs::Metadata) -> Result<FileEntry, String> {
    let modified = metadata
        .modified()
        .map_err(|error| format_io_error("read modification date for", &path, &error))?;
    let modified_date = format_system_time(modified, &path)?;
    let created_date = metadata
        .created()
        .ok()
        .and_then(|created| format_system_time(created, &path).ok());
    let name = path
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string_lossy().into_owned());
    let extension = path
        .extension()
        .map(|extension| extension.to_string_lossy().to_lowercase());
    let is_directory = metadata.is_dir();
    let (is_hidden, is_system, is_read_only) = file_flags(&metadata);
    let category = category(extension.as_deref(), is_directory);
    let path = path.to_string_lossy().into_owned();

    Ok(FileEntry {
        id: path.clone(),
        name,
        path,
        is_directory,
        size: if is_directory { 0 } else { metadata.len() },
        modified_date,
        created_date,
        extension,
        category,
        is_hidden,
        is_system,
        is_read_only,
    })
}

fn format_system_time(value: SystemTime, path: &Path) -> Result<String, String> {
    OffsetDateTime::from(value)
        .format(&Rfc3339)
        .map_err(|error| {
            format!(
                "Could not format file date for '{}': {error}",
                path.display()
            )
        })
}

fn format_io_error(action: &str, path: &Path, error: &io::Error) -> String {
    match error.kind() {
        io::ErrorKind::PermissionDenied => {
            format!(
                "Permission denied: could not {action} '{}'.",
                path.display()
            )
        }
        io::ErrorKind::NotFound => {
            format!(
                "Folder or drive not found or unavailable: '{}'.",
                path.display()
            )
        }
        _ => format!("Could not {action} '{}': {error}", path.display()),
    }
}

fn category(extension: Option<&str>, is_directory: bool) -> &'static str {
    if is_directory {
        return "folder";
    }
    match extension.unwrap_or_default() {
        "png" | "jpg" | "jpeg" | "gif" | "svg" | "webp" | "bmp" | "ico" | "tiff" => "image",
        "mp4" | "mkv" | "avi" | "mov" | "wmv" | "flv" | "webm" => "video",
        "mp3" | "flac" | "wav" | "aac" | "ogg" | "m4a" | "wma" => "audio",
        "pdf" | "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" | "txt" | "rtf" | "odt"
        | "csv" => "document",
        "ts" | "tsx" | "js" | "jsx" | "json" | "html" | "css" | "rs" | "py" | "java" | "c"
        | "cpp" | "h" | "go" | "toml" | "yaml" | "yml" | "md" | "sh" | "sql" => "code",
        "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz" | "iso" => "archive",
        "exe" | "msi" | "bat" | "cmd" | "ps1" | "vbs" => "executable",
        _ => "unknown",
    }
}

#[cfg(windows)]
fn file_flags(metadata: &fs::Metadata) -> (bool, bool, bool) {
    use std::os::windows::fs::MetadataExt;

    let attributes = metadata.file_attributes();
    (
        attributes & 0x2 != 0,
        attributes & 0x4 != 0,
        attributes & 0x1 != 0,
    )
}

#[cfg(windows)]
fn is_reparse_point(metadata: &fs::Metadata) -> bool {
    use std::os::windows::fs::MetadataExt;

    metadata.file_attributes() & 0x400 != 0
}

#[cfg(not(windows))]
fn file_flags(metadata: &fs::Metadata) -> (bool, bool, bool) {
    (false, false, metadata.permissions().readonly())
}

#[cfg(not(windows))]
fn is_reparse_point(_: &fs::Metadata) -> bool {
    false
}

#[cfg(windows)]
fn list_windows_drives() -> Result<Vec<DriveInfo>, String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        GetDiskFreeSpaceExW, GetDriveTypeW, GetLogicalDrives, GetVolumeInformationW,
    };

    let drive_mask = unsafe { GetLogicalDrives() };
    if drive_mask == 0 {
        return Err(format!(
            "Could not list Windows drives: {}",
            io::Error::last_os_error()
        ));
    }

    let mut drives = Vec::new();
    for (index, letter) in ('A'..='Z').enumerate() {
        if drive_mask & (1 << index) == 0 {
            continue;
        }

        let mount_point = format!("{letter}:\\");
        let wide_path: Vec<u16> = std::ffi::OsStr::new(&mount_point)
            .encode_wide()
            .chain(Some(0))
            .collect();
        let drive_type_code = unsafe { GetDriveTypeW(wide_path.as_ptr()) };
        let drive_type = match drive_type_code {
            2 => "removable",
            3 => "fixed",
            4 => "network",
            5 => "optical",
            _ => "fixed",
        };

        let mut volume_label = [0u16; 261];
        let mut file_system_name = [0u16; 261];
        let mut serial_number = 0;
        let mut max_component_length = 0;
        let mut file_system_flags = 0;
        let volume_info_ok = unsafe {
            GetVolumeInformationW(
                wide_path.as_ptr(),
                volume_label.as_mut_ptr(),
                volume_label.len() as u32,
                &mut serial_number,
                &mut max_component_length,
                &mut file_system_flags,
                file_system_name.as_mut_ptr(),
                file_system_name.len() as u32,
            )
        } != 0;
        let label = if volume_info_ok {
            String::from_utf16_lossy(
                &volume_label[..volume_label
                    .iter()
                    .position(|character| *character == 0)
                    .unwrap_or(volume_label.len())],
            )
        } else {
            String::new()
        };
        let file_system = if volume_info_ok {
            String::from_utf16_lossy(
                &file_system_name[..file_system_name
                    .iter()
                    .position(|character| *character == 0)
                    .unwrap_or(file_system_name.len())],
            )
        } else {
            String::new()
        };

        let mut available_bytes = 0u64;
        let mut total_space = 0u64;
        let mut free_space = 0u64;
        let space_info_ok = unsafe {
            GetDiskFreeSpaceExW(
                wide_path.as_ptr(),
                &mut available_bytes,
                &mut total_space,
                &mut free_space,
            )
        } != 0;

        let name = if label.is_empty() {
            format!("Local Disk ({letter}:)")
        } else {
            format!("{label} ({letter}:)")
        };
        drives.push(DriveInfo {
            id: format!("{letter}:"),
            name,
            mount_point,
            label,
            total_space: if space_info_ok { total_space } else { 0 },
            free_space: if space_info_ok { free_space } else { 0 },
            drive_type: drive_type.to_string(),
            file_system,
        });
    }

    Ok(drives)
}

#[cfg(not(windows))]
fn list_windows_drives() -> Result<Vec<DriveInfo>, String> {
    Err("Windows drive listing is only available in the Windows desktop app.".to_string())
}

#[cfg(all(test, windows))]
mod tests {
    use super::{
        ReadDirOptions, SearchOptions, list_drives, read_directory_sync, resolve_known_folders,
        search_files_sync,
    };
    use std::collections::HashSet;
    use std::fs;
    use std::path::PathBuf;

    #[test]
    fn home_listing_contains_only_entries_from_the_real_user_profile() {
        let profile = PathBuf::from(std::env::var_os("USERPROFILE").unwrap());
        let actual_names: HashSet<_> = fs::read_dir(&profile)
            .unwrap()
            .map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned())
            .collect();

        let listing = read_directory_sync(
            "Home".to_string(),
            Some(ReadDirOptions {
                show_hidden: Some(true),
            }),
        )
        .unwrap();

        assert_eq!(
            PathBuf::from(listing.path),
            profile,
            "Home must resolve to the real Windows user profile"
        );
        assert!(
            listing
                .entries
                .iter()
                .all(|entry| actual_names.contains(&entry.name))
        );
    }

    #[test]
    fn this_pc_listing_matches_the_detected_windows_drives() {
        let drives = list_drives().unwrap();
        let listing = read_directory_sync("This PC".to_string(), None).unwrap();

        assert_eq!(listing.entries.len(), drives.len());
        for drive in drives {
            assert!(listing.entries.iter().any(|entry| {
                entry.path == drive.mount_point && entry.name == drive.name && entry.is_directory
            }));
        }
    }

    #[test]
    fn missing_folder_returns_a_clear_unavailable_path_error() {
        let path = std::env::temp_dir().join(format!(
            "FlowFiles_missing_folder_test_{}",
            std::process::id()
        ));
        assert!(!path.exists());

        let error = match read_directory_sync(path.to_string_lossy().into_owned(), None) {
            Ok(_) => panic!("a missing folder must not return a directory listing"),
            Err(error) => error,
        };

        assert!(error.contains("Folder or drive not found or unavailable"));
        assert!(error.contains(&path.to_string_lossy().to_string()));
    }

    #[test]
    fn known_folders_resolve_to_current_windows_locations() {
        let known_folders = resolve_known_folders().unwrap();
        assert_eq!(
            PathBuf::from(&known_folders.home),
            PathBuf::from(std::env::var_os("USERPROFILE").unwrap())
        );

        for folder in known_folders.folders {
            let path = PathBuf::from(folder.path);
            assert!(
                path.is_absolute(),
                "{} must be an absolute path",
                folder.name
            );
            if path.is_dir() {
                let listing = read_directory_sync(
                    path.to_string_lossy().into_owned(),
                    Some(ReadDirOptions {
                        show_hidden: Some(true),
                    }),
                )
                .unwrap();
                eprintln!("{}: {} entries", folder.name, listing.entries.len());
            }
        }
    }

    #[test]
    fn refreshed_listing_includes_a_new_temporary_folder() {
        let parent =
            std::env::temp_dir().join(format!("FlowFiles_refresh_test_{}", std::process::id()));
        let test_folder = parent.join("created-before-refresh");
        fs::create_dir_all(&test_folder).unwrap();

        let listing = read_directory_sync(
            parent.to_string_lossy().into_owned(),
            Some(ReadDirOptions {
                show_hidden: Some(true),
            }),
        )
        .unwrap();
        let found = listing
            .entries
            .iter()
            .any(|entry| entry.name == "created-before-refresh" && entry.is_directory);
        fs::remove_dir_all(&parent).unwrap();

        assert!(
            found,
            "the refreshed listing must include the newly created folder"
        );
    }

    #[test]
    fn recursive_search_matches_partial_case_insensitive_unicode_names() {
        let root =
            std::env::temp_dir().join(format!("FlowFiles_search_test_{}", std::process::id()));
        let folder = root.join("Quarterly Reports");
        fs::create_dir_all(&folder).unwrap();
        fs::write(folder.join("Résumé Forecast 2026.PDF"), b"search fixture").unwrap();
        fs::write(folder.join("unrelated.txt"), b"not a match").unwrap();

        let response = search_files_sync(
            "rÉsumé fore".to_string(),
            root.to_string_lossy().into_owned(),
            Some(SearchOptions {
                category: None,
                size_filter: None,
                date_filter: None,
                show_hidden: Some(true),
            }),
        )
        .unwrap();

        assert_eq!(response.results.len(), 1);
        assert_eq!(response.results[0].entry.name, "Résumé Forecast 2026.PDF");
        assert_eq!(response.results[0].entry.extension.as_deref(), Some("pdf"));
        assert!(response.results[0].entry.modified_date.contains('T'));
        assert!(
            response.results[0]
                .entry
                .path
                .ends_with("Résumé Forecast 2026.PDF")
        );
        assert_eq!(
            PathBuf::from(&response.results[0].containing_folder_path),
            folder
        );
        assert!(response.inaccessible_paths.is_empty());
        let serialized = serde_json::to_value(&response).unwrap();
        assert_eq!(
            serialized["results"][0]["matchedIn"],
            serde_json::Value::String("name".to_string())
        );
        assert!(serialized["results"][0]["path"].is_string());
        assert!(serialized["results"][0]["containingFolderPath"].is_string());
        assert!(serialized["inaccessiblePaths"].is_array());

        let folder_match = search_files_sync(
            "quarterly rep".to_string(),
            root.to_string_lossy().into_owned(),
            None,
        )
        .unwrap();
        assert_eq!(folder_match.results.len(), 1);
        assert_eq!(folder_match.results[0].entry.name, "Quarterly Reports");

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn recursive_search_observes_cancellation() {
        use super::search_files_with_cancellation;
        use std::sync::Arc;
        use std::sync::atomic::AtomicBool;

        let root = std::env::temp_dir().join(format!(
            "FlowFiles_search_cancel_test_{}",
            std::process::id()
        ));
        fs::create_dir_all(&root).unwrap();
        let result = search_files_with_cancellation(
            "match".to_string(),
            root.to_string_lossy().into_owned(),
            None,
            Arc::new(AtomicBool::new(true)),
        );
        fs::remove_dir_all(root).unwrap();

        assert!(matches!(result, Err(error) if error == "Search cancelled."));
    }

    #[test]
    fn recursive_search_reports_a_missing_root_instead_of_empty_results() {
        let root = std::env::temp_dir().join(format!(
            "FlowFiles_missing_search_root_{}",
            std::process::id()
        ));
        assert!(!root.exists());

        let result = search_files_sync(
            "missing".to_string(),
            root.to_string_lossy().into_owned(),
            None,
        );
        assert!(matches!(
            result,
            Err(error)
                if error.contains("Folder or drive not found or unavailable")
                    && error.contains(&root.to_string_lossy().to_string())
        ));
    }
}
