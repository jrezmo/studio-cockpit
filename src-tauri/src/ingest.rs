use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::{
  collections::HashMap,
  fs,
  io::{self},
  path::{Path, PathBuf},
  sync::{Arc, Mutex},
  time::{Duration, Instant},
};
use tauri::{AppHandle, Manager, State};
use walkdir::WalkDir;
use zip::ZipArchive;

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestProjectConfig {
  pub id: String,
  pub artist_name: String,
  pub project_name: String,
  pub folder_path: String,
  pub updated_at: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestConfig {
  pub downloads_path: String,
  pub artist_folders_path: String,
  pub active_project_id: Option<String>,
  pub projects: Vec<IngestProjectConfig>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestEvent {
  pub file_name: String,
  pub source_path: String,
  pub dest_path: String,
  pub file_type: String,
  pub status: String,
  pub size_bytes: u64,
  pub message: Option<String>,
}

#[derive(Default)]
pub struct IngestWatcherState {
  watcher: Mutex<Option<WatcherHandle>>,
}

struct WatcherHandle {
  watcher: RecommendedWatcher,
  watch_path: PathBuf,
}

struct RecentTracker {
  seen: HashMap<PathBuf, Instant>,
}

impl RecentTracker {
  fn new() -> Self {
    Self {
      seen: HashMap::new(),
    }
  }

  fn should_process(&mut self, path: &Path) -> bool {
    let now = Instant::now();
    if let Some(last) = self.seen.get(path) {
      if now.duration_since(*last) < Duration::from_secs(2) {
        return false;
      }
    }
    self.seen.insert(path.to_path_buf(), now);
    self.seen.retain(|_, timestamp| now.duration_since(*timestamp) < Duration::from_secs(30));
    true
  }
}

fn normalize(input: &str) -> String {
  let mut out = String::with_capacity(input.len());
  for ch in input.chars() {
    if ch.is_ascii_alphanumeric() {
      out.push(ch.to_ascii_lowercase());
    }
  }
  out
}

fn expand_tilde(input: &str) -> String {
  if input == "~" || input.starts_with("~/") {
    let home = std::env::var("HOME")
      .or_else(|_| std::env::var("USERPROFILE"))
      .unwrap_or_default();
    if !home.is_empty() {
      if input == "~" {
        return home;
      }
      return format!("{}{}", home, &input[1..]);
    }
  }
  input.to_string()
}

fn should_ignore(path: &Path) -> bool {
  let name = path
    .file_name()
    .and_then(|value| value.to_str())
    .unwrap_or("")
    .to_lowercase();
  if name.is_empty() || name.starts_with('.') {
    return true;
  }
  [
    ".crdownload",
    ".part",
    ".tmp",
    ".download",
    ".swp",
    ".partial",
  ]
  .iter()
  .any(|suffix| name.ends_with(suffix))
}

fn wait_for_stable_size(path: &Path) -> Option<u64> {
  let mut last_size = None;
  for _ in 0..8 {
    if let Ok(meta) = fs::metadata(path) {
      let size = meta.len();
      if Some(size) == last_size {
        return Some(size);
      }
      last_size = Some(size);
    }
    std::thread::sleep(Duration::from_millis(350));
  }
  last_size
}

fn match_project(file_name: &str, config: &IngestConfig) -> Option<IngestProjectConfig> {
  let normalized_file = normalize(file_name);
  let mut artist_match: Option<IngestProjectConfig> = None;

  for project in &config.projects {
    let project_norm = normalize(&project.project_name);
    if !project_norm.is_empty() && normalized_file.contains(&project_norm) {
      return Some(project.clone());
    }
    let artist_norm = normalize(&project.artist_name);
    if artist_match.is_none()
      && !artist_norm.is_empty()
      && normalized_file.contains(&artist_norm)
    {
      artist_match = Some(project.clone());
    }
  }

  if artist_match.is_some() {
    return artist_match;
  }

  if let Some(active_id) = &config.active_project_id {
    return config
      .projects
      .iter()
      .find(|project| &project.id == active_id)
      .cloned();
  }

  None
}

fn route_subfolder(extension: &str) -> &'static str {
  match extension {
    "wav" | "aif" | "aiff" => "Audio Files",
    "ptx" | "ptf" => "Sessions",
    "mp3" | "m4a" => "References",
    _ => "Imports",
  }
}

fn move_file(source: &Path, dest: &Path) -> io::Result<()> {
  if let Some(parent) = dest.parent() {
    fs::create_dir_all(parent)?;
  }
  match fs::rename(source, dest) {
    Ok(()) => Ok(()),
    Err(_) => {
      fs::copy(source, dest)?;
      fs::remove_file(source)?;
      Ok(())
    }
  }
}

fn emit_event(app: &AppHandle, event: IngestEvent) {
  let _ = app.emit_all("ingest:event", event);
}

fn build_error_event(path: &Path, extension: &str, message: &str) -> IngestEvent {
  IngestEvent {
    file_name: path
      .file_name()
      .and_then(|value| value.to_str())
      .unwrap_or("unknown")
      .to_string(),
    source_path: path.to_string_lossy().to_string(),
    dest_path: String::new(),
    file_type: extension.to_string(),
    status: "error".to_string(),
    size_bytes: fs::metadata(path).map(|meta| meta.len()).unwrap_or(0),
    message: Some(message.to_string()),
  }
}

fn route_file(
  path: &Path,
  base_folder: &Path,
  extension: &str,
) -> Result<IngestEvent, String> {
  let file_name = path
    .file_name()
    .and_then(|value| value.to_str())
    .ok_or_else(|| "Missing file name".to_string())?
    .to_string();

  let dest_dir = base_folder.join(route_subfolder(extension));
  let dest_path = dest_dir.join(&file_name);
  move_file(path, &dest_path).map_err(|error| error.to_string())?;

  let size_bytes = fs::metadata(&dest_path)
    .map(|meta| meta.len())
    .unwrap_or(0);

  Ok(IngestEvent {
    file_name,
    source_path: path.to_string_lossy().to_string(),
    dest_path: dest_path.to_string_lossy().to_string(),
    file_type: extension.to_string(),
    status: "success".to_string(),
    size_bytes,
    message: None,
  })
}

fn extract_zip(zip_path: &Path, dest_dir: &Path) -> Result<(), String> {
  let file = fs::File::open(zip_path).map_err(|error| error.to_string())?;
  let mut archive = ZipArchive::new(file).map_err(|error| error.to_string())?;

  for i in 0..archive.len() {
    let mut file = archive.by_index(i).map_err(|error| error.to_string())?;
    let outpath = dest_dir.join(file.mangled_name());

    if file.is_dir() {
      fs::create_dir_all(&outpath).map_err(|error| error.to_string())?;
    } else {
      if let Some(parent) = outpath.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
      }
      let mut outfile = fs::File::create(&outpath).map_err(|error| error.to_string())?;
      io::copy(&mut file, &mut outfile).map_err(|error| error.to_string())?;
    }
  }

  Ok(())
}

fn handle_zip(
  app: &AppHandle,
  path: &Path,
  config: &IngestConfig,
  project: &IngestProjectConfig,
) {
  let file_stem = path
    .file_stem()
    .and_then(|value| value.to_str())
    .unwrap_or("archive");
  let base_folder = PathBuf::from(&project.folder_path);
  let import_dir = base_folder.join("Imports").join(file_stem);

  if let Err(error) = fs::create_dir_all(&import_dir) {
    emit_event(app, build_error_event(path, "zip", &error.to_string()));
    return;
  }

  if let Err(error) = extract_zip(path, &import_dir) {
    emit_event(app, build_error_event(path, "zip", &error));
    return;
  }

  let _ = fs::remove_file(path);

  emit_event(
    app,
    IngestEvent {
      file_name: path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("archive.zip")
        .to_string(),
      source_path: path.to_string_lossy().to_string(),
      dest_path: import_dir.to_string_lossy().to_string(),
      file_type: "zip".to_string(),
      status: "success".to_string(),
      size_bytes: fs::metadata(path).map(|meta| meta.len()).unwrap_or(0),
      message: None,
    },
  );

  for entry in WalkDir::new(&import_dir)
    .follow_links(false)
    .into_iter()
    .filter_map(Result::ok)
  {
    if !entry.file_type().is_file() {
      continue;
    }
    let ext = entry
      .path()
      .extension()
      .and_then(|value| value.to_str())
      .unwrap_or("")
      .to_lowercase();
    if ext.is_empty() {
      continue;
    }
    match route_file(entry.path(), &base_folder, &ext) {
      Ok(event) => emit_event(app, event),
      Err(error) => emit_event(app, build_error_event(entry.path(), &ext, &error)),
    }
  }
}

fn process_path(app: &AppHandle, config: &IngestConfig, path: PathBuf) {
  if should_ignore(&path) {
    return;
  }
  if path.is_dir() {
    return;
  }
  let file_name = path
    .file_name()
    .and_then(|value| value.to_str())
    .unwrap_or("")
    .to_string();
  if file_name.is_empty() {
    return;
  }

  let extension = path
    .extension()
    .and_then(|value| value.to_str())
    .unwrap_or("")
    .to_lowercase();
  if extension.is_empty() {
    return;
  }

  if wait_for_stable_size(&path).is_none() {
    emit_event(
      app,
      build_error_event(&path, &extension, "File is still being written."),
    );
    return;
  }

  let project = match_project(&file_name, config);
  let Some(project) = project else {
    emit_event(
      app,
      build_error_event(&path, &extension, "No matching project found."),
    );
    return;
  };

  if extension == "zip" {
    handle_zip(app, &path, config, &project);
    return;
  }

  let base_folder = PathBuf::from(&project.folder_path);
  match route_file(&path, &base_folder, &extension) {
    Ok(event) => emit_event(app, event),
    Err(error) => emit_event(app, build_error_event(&path, &extension, &error)),
  }
}

#[tauri::command]
pub fn start_ingest_watcher(
  app: AppHandle,
  state: State<IngestWatcherState>,
  config: IngestConfig,
) -> Result<(), String> {
  let mut config = config;
  config.downloads_path = expand_tilde(&config.downloads_path);
  config.artist_folders_path = expand_tilde(&config.artist_folders_path);
  config.projects = config
    .projects
    .into_iter()
    .map(|mut project| {
      project.folder_path = expand_tilde(&project.folder_path);
      project
    })
    .collect();

  let watch_path = PathBuf::from(&config.downloads_path);
  if !watch_path.exists() {
    return Err("Downloads path does not exist.".to_string());
  }

  if let Some(handle) = state.watcher.lock().map_err(|_| "Lock error")?.take() {
    let _ = handle.watcher.unwatch(&handle.watch_path);
  }

  let config = Arc::new(config);
  let recent = Arc::new(Mutex::new(RecentTracker::new()));
  let app_handle = app.clone();

  let mut watcher = notify::recommended_watcher(move |res| {
    let app = app_handle.clone();
    let config = config.clone();
    let recent = recent.clone();
    let event = match res {
      Ok(event) => event,
      Err(error) => {
        emit_event(
          &app,
          IngestEvent {
            file_name: "watcher".to_string(),
            source_path: String::new(),
            dest_path: String::new(),
            file_type: "watcher".to_string(),
            status: "error".to_string(),
            size_bytes: 0,
            message: Some(error.to_string()),
          },
        );
        return;
      }
    };

    match event.kind {
      EventKind::Create(_) | EventKind::Modify(_) => {
        for path in event.paths {
          let app = app.clone();
          let config = config.clone();
          let recent = recent.clone();
          std::thread::spawn(move || {
            let should_process = recent
              .lock()
              .map(|mut tracker| tracker.should_process(&path))
              .unwrap_or(true);
            if should_process {
              process_path(&app, &config, path);
            }
          });
        }
      }
      _ => {}
    }
  })
  .map_err(|error| error.to_string())?;

  watcher
    .watch(&watch_path, RecursiveMode::Recursive)
    .map_err(|error| error.to_string())?;

  state
    .watcher
    .lock()
    .map_err(|_| "Lock error")?
    .replace(WatcherHandle { watcher, watch_path });

  Ok(())
}

#[tauri::command]
pub fn stop_ingest_watcher(state: State<IngestWatcherState>) -> Result<(), String> {
  if let Some(handle) = state.watcher.lock().map_err(|_| "Lock error")?.take() {
    let _ = handle.watcher.unwatch(&handle.watch_path);
  }
  Ok(())
}
