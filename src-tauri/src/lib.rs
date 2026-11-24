mod porting;
use porting::finding::Finding;
use porting::sarif::parse_sarif_to_finding;

#[tauri::command]
fn load_findings(path:String) -> Result<Vec<Finding>, String>{
    let text = std::fs::read_to_string(&path)
        .map_err(|e| format!("Can't read the file{path}: {e}"))?;

    let mut findings:Vec<Finding> = if path.ends_with(".sarif") {
        parse_sarif_to_finding(&text)?
    }else{
        serde_json::from_str(&text).map_err(|e| format!("JSON non valido: {e}"))?
    };

    findings.sort_by_key(|f| (!f.security, f.severity));

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
