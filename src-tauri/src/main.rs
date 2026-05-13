#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn project_has_knotic(path: String) -> bool {
    let p = PathBuf::from(&path).join(".knotic");
    p.exists() && p.is_dir()
}

#[tauri::command]
fn create_knotic_dir(path: String, knowledge: String) -> Result<String, String> {
    let root = PathBuf::from(&path).join(".knotic");
    fs::create_dir_all(root.join("spec")).map_err(|e| e.to_string())?;
    fs::write(root.join("global-knowledge.md"), knowledge).map_err(|e| e.to_string())?;
    Ok(root.to_string_lossy().into_owned())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![project_has_knotic, create_knotic_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
