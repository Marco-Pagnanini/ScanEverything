mod porting;
use porting::finding::Finding;

// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

#[tauri::command]
fn load_findings(path:String) -> Result<Vec<Finding>, String>{
    let text = std::fs::read_to_string(&path)
        .map_err(|e| format!("Can't read the file{path}: {e}"))?;

    let mut findings: Vec<Finding> =
        serde_json::from_str(&text).map_err(|e| format!("JSON non valido: {e}"))?;

    findings.sort_by_key(|f| f.severity);

    Ok(findings)
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![load_findings])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
