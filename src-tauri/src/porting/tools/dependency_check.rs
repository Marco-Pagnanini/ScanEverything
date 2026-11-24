use std::path::Path;

use crate::porting::finding::Finding;
use crate::porting::parsers::sarif::parse_sarif_to_finding;
use crate::porting::process::{ToolCheck, check_tool, last_lines, run};

fn nvd_api_key() -> Option<String> {
    std::env::var("NVD_API_KEY")
        .ok()
        .filter(|key| !key.trim().is_empty())
}

pub fn check() -> Vec<ToolCheck> {
    let key = match nvd_api_key() {
        Some(_) => ToolCheck {
            tool: "dependency-check".to_string(),
            name: "NVD API key".to_string(),
            ok: true,
            detail: "NVD_API_KEY is set".to_string(),
        },
        None => ToolCheck {
            tool: "dependency-check".to_string(),
            name: "NVD API key".to_string(),
            ok: false,
            detail: "NVD_API_KEY is not set".to_string(),
        },
    };

    vec![
        check_tool("dependency-check", "Dependency-Check", "dependency-check", "--version"),
        key,
    ]
}

pub fn analyze(deps: &Path, out_dir: &Path, project_name: &str) -> Result<Vec<Finding>, String> {
    let key = nvd_api_key().ok_or("NVD_API_KEY is not set".to_string())?;

    std::fs::create_dir_all(out_dir)
        .map_err(|e| format!("Cannot create {}: {e}", out_dir.display()))?;
    let sarif = out_dir.join("dependency-check-report.sarif");
    let _ = std::fs::remove_file(&sarif);

    let deps_arg = deps.display().to_string();
    let out_arg = out_dir.display().to_string();

    let out = run(
        "dependency-check",
        &[
            "--project",
            project_name,
            "--scan",
            &deps_arg,
            "--format",
            "SARIF",
            "--out",
            &out_arg,
            "--nvdApiKey",
            &key,
            "--disableOssIndex",
        ],
        out_dir,
    )?;

    let text = std::fs::read_to_string(&sarif).map_err(|_| {
        format!(
            "Dependency-Check did not write the SARIF file (exit code {:?}):\n{}",
            out.code,
            last_lines(&format!("{}{}", out.stdout, out.stderr), 25)
        )
    })?;

    parse_sarif_to_finding(&text)


}
