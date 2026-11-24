mod porting;

use std::path::Path;

use porting::finding::Finding;
use porting::parsers::sarif::parse_sarif_to_finding;
use porting::pipeline;
use porting::process::ToolCheck;

/// Legge un file di finding già pronto (JSON di prova o SARIF).
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

/// Stato di Maven, SpotBugs e del plugin.
#[tauri::command]
async fn check_tools() -> Vec<ToolCheck> {
    tauri::async_runtime::spawn_blocking(pipeline::check_tools)
        .await
        .unwrap_or_default()
}

/// Pipeline su una cartella Maven o su un .jar.
#[tauri::command]
async fn scan_project(input: String) -> Result<Vec<Finding>, String> {
    tauri::async_runtime::spawn_blocking(move || pipeline::scan(Path::new(&input)))
        .await
        .map_err(|e| format!("Internal error: {e}"))?
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
