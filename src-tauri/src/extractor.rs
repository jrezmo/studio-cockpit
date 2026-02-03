use serde::{Deserialize, Serialize};
use walkdir::WalkDir;
use std::fs;
use quick_xml::de::from_str;
use tauri::{AppHandle, Manager, State};
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use md5;

// Structs to match the SessionStats types in the frontend
#[derive(Debug, Serialize, Clone)]
struct SessionStatsPluginInstance {
    #[serde(rename = "pluginId")]
    plugin_id: String,
    name: String,
    vendor: String,
    version: String,
    slot: String,
    active: bool,
}

#[derive(Debug, Serialize, Clone)]
struct SessionStatsTrack {
    id: String,
    name: String,
    #[serde(rename = "type")]
    track_type: String,
    plugins: Vec<SessionStatsPluginInstance>,
}

#[derive(Debug, Serialize, Clone)]
struct SessionStatsPluginUsage {
    #[serde(rename = "pluginId")]
    plugin_id: String,
    name: String,
    vendor: String,
    version: String,
    count: u32,
    #[serde(rename = "trackCount")]
    track_count: u32,
}

#[derive(Debug, Serialize, Clone)]
struct SessionStatsSessionSource {
    #[serde(rename = "type")]
    source_type: String,
    path: String,
    #[serde(rename = "ingestedAt")]
    ingested_at: String,
    extractor: String,
}

#[derive(Debug, Serialize, Clone)]
struct SessionStatsSession {
    id: String,
    fingerprint: String,
    name: String,
    path: String,
    #[serde(rename = "sampleRate")]
    sample_rate: f64,
    #[serde(rename = "bitDepth")]
    bit_depth: u32,
    bpm: f64,
    tracks: Vec<SessionStatsTrack>,
    plugins: Vec<SessionStatsPluginUsage>,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
    sources: Vec<SessionStatsSessionSource>,
}


// Internal structs for deserializing the .ptx XML
#[derive(Debug, Deserialize)]
struct PtxPlugin {
    #[serde(rename = "@_PLUGIN_ID")]
    plugin_id: String,
    #[serde(rename = "@_PLUGIN_NAME")]
    name: String,
    #[serde(rename = "@_VENDOR_NAME")]
    vendor: String,
    #[serde(rename = "@_VERSION")]
    version: String,
    #[serde(rename = "@_SLOT")]
    slot: String,
    #[serde(rename = "@_ACTIVE")]
    active: String,
}

#[derive(Debug, Deserialize)]
struct PtxPluginList {
    #[serde(rename = "PLUGIN", default)]
    plugins: Vec<PtxPlugin>,
}

#[derive(Debug, Deserialize)]
struct PtxTrack {
    #[serde(rename = "@_TRACK_ID")]
    id: String,
    #[serde(rename = "NAME")]
    name: String,
    #[serde(rename = "@_TRACK_TYPE")]
    track_type: String,
    #[serde(rename = "PLUGIN_LIST")]
    plugin_list: Option<PtxPluginList>,
}

#[derive(Debug, Deserialize)]
struct PtxTempo {
    #[serde(rename = "@_BPM")]
    bpm: f64,
}

#[derive(Debug, Deserialize)]
struct PtxSessionData {
    #[serde(rename = "PRO_TOOLS_SESSION")]
    session: PtxSession,
}

#[derive(Debug, Deserialize)]
struct PtxSession {
    #[serde(rename = "@_SESSION_NAME")]
    name: String,
    #[serde(rename = "@_SAMPLE_RATE")]
    sample_rate: f64,
    #[serde(rename = "@_BIT_DEPTH")]
    bit_depth: u32,
    #[serde(rename = "master_Tempo")]
    master_tempo: Option<PtxTempo>,
    #[serde(rename = "TRACK", default)]
    tracks: Vec<PtxTrack>,
}


fn parse_ptx_file(path: &Path) -> Result<SessionStatsSession, String> {
    let xml_data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let ptx: PtxSessionData = from_str(&xml_data).map_err(|e| e.to_string())?;
    let ptx_session = ptx.session;

    let tracks: Vec<SessionStatsTrack> = ptx_session.tracks.into_iter().map(|t| {
        let plugins = t.plugin_list.map_or(vec![], |pl| {
            pl.plugins.into_iter().map(|p| SessionStatsPluginInstance {
                plugin_id: p.plugin_id,
                name: p.name,
                vendor: p.vendor,
                version: p.version,
                slot: p.slot,
                active: p.active == "Yes",
            }).collect()
        });
        SessionStatsTrack { id: t.id, name: t.name, track_type: t.track_type, plugins }
    }).collect();

    let mut plugin_usage_map: HashMap<String, SessionStatsPluginUsage> = HashMap::new();
    for track in &tracks {
        let mut track_plugins: HashMap<String, bool> = HashMap::new();
        for plugin in &track.plugins {
            let usage = plugin_usage_map.entry(plugin.plugin_id.clone()).or_insert(SessionStatsPluginUsage {
                plugin_id: plugin.plugin_id.clone(),
                name: plugin.name.clone(),
                vendor: plugin.vendor.clone(),
                version: plugin.version.clone(),
                count: 0,
                track_count: 0,
            });
            usage.count += 1;
            track_plugins.insert(plugin.plugin_id.clone(), true);
        }
        for plugin_id in track_plugins.keys() {
            if let Some(usage) = plugin_usage_map.get_mut(plugin_id) {
                usage.track_count += 1;
            }
        }
    }

    let stats = fs::metadata(path).map_err(|e| e.to_string())?;
    let file_buffer = fs::read(path).map_err(|e| e.to_string())?;
    let fingerprint = format!("{:x}", md5::compute(&file_buffer));


    Ok(SessionStatsSession {
        id: format!("{:x}", md5::compute(path.to_str().unwrap_or(""))),
        fingerprint,
        name: ptx_session.name,
        path: path.to_string_lossy().into_owned(),
        sample_rate: ptx_session.sample_rate,
        bit_depth: ptx_session.bit_depth,
        bpm: ptx_session.master_tempo.map_or(0.0, |t| t.bpm),
        tracks,
        plugins: plugin_usage_map.values().cloned().collect(),
        created_at: stats.created().map_or("".to_string(), |t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs().to_string()),
        updated_at: stats.modified().map_or("".to_string(), |t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs().to_string()),
        sources: vec![SessionStatsSessionSource {
            source_type: "protools".to_string(),
            path: path.to_string_lossy().into_owned(),
            ingested_at: chrono::Utc::now().to_rfc3339(),
            extractor: "internal-ptx-extractor".to_string(),
        }],
    })
}

#[tauri::command]
pub fn extract_sessions_from_folder(app: AppHandle, path: String) {
    let walker = WalkDir::new(path).into_iter();
    let mut count = 0;
    for entry in walker.filter_map(Result::ok) {
        if entry.file_type().is_file() {
            if let Some(extension) = entry.path().extension() {
                if extension == "ptx" {
                    match parse_ptx_file(entry.path()) {
                        Ok(session_info) => {
                            app.emit_all("session:extracted", Some(session_info)).unwrap();
                            count += 1;
                        }
                        Err(e) => {
                             app.emit_all("session:error", Some(e)).unwrap();
                        }
                    }
                }
            }
        }
    }
    app.emit_all("session:finished", Some(format!("Extraction finished. Found {} sessions.", count))).unwrap();
}