mod porting;

use std::path::Path;

use porting::finding::Finding;
use porting::parsers::sarif::parse_sarif_to_finding;
use porting::pipeline::{self, ScanReport};
use porting::process::ToolCheck;

#[tauri::command]
fn load_findings(path: String) -> Result<Vec<Finding>, String> {
    let text = std::fs::read_to_string(&path)
        .map_err(|e| format!("Can't read the file {path}: {e}"))?;

    let mut findings: Vec<Finding> = if path.ends_with(".sarif") {
        parse_sarif_to_finding(&text)?
    } else {
        serde_json::from_str(&text).map_err(|e| format!("Invalid JSON: {e}"))?
    };

    findings.sort_by_key(|f| (!f.security, f.severity));
    Ok(findings)
}

#[tauri::command]
async fn check_tools() -> Vec<ToolCheck> {
    tauri::async_runtime::spawn_blocking(pipeline::check_tools)
        .await
        .unwrap_or_default()
}

#[tauri::command]
async fn scan_project(input: String, tools: Vec<String>) -> Result<ScanReport, String> {
    tauri::async_runtime::spawn_blocking(move || pipeline::scan(Path::new(&input), &tools))
        .await
        .map_err(|e| format!("Internal error: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_findings,
            check_tools,
            scan_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
