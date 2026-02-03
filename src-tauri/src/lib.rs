mod ingest;
mod extractor;

use ingest::{start_ingest_watcher, stop_ingest_watcher, IngestWatcherState};
use extractor::extract_sessions_from_folder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(IngestWatcherState::default())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      start_ingest_watcher,
      stop_ingest_watcher,
      extract_sessions_from_folder
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
