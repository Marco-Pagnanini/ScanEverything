use std::path::{Path, PathBuf};

use crate::porting::finding::Finding;
use crate::porting::parsers::sarif::parse_sarif_to_finding;
use crate::porting::process::{ToolCheck, check_tool, last_lines, run};

const FSB_PLUGIN: &str = "tools/findsecbugs-plugin-1.14.0.jar";

fn fsb_plugin_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME is not set".to_string())?;
    let path = Path::new(&home).join(FSB_PLUGIN);
    if path.is_file() {
        Ok(path)
    } else {
        Err(format!(
            "Find Security Bugs plugin not found at {}",
            path.display()
        ))
    }
}

pub fn check() -> Vec<ToolCheck> {
    let plugin = match fsb_plugin_path() {
        Ok(path) => ToolCheck {
            name: "Find Security Bugs".to_string(),
            ok: true,
            detail: path.display().to_string(),
        },
        Err(e) => ToolCheck {
            name: "Find Security Bugs".to_string(),
            ok: false,
            detail: e,
        },
    };

    vec![check_tool("SpotBugs", "spotbugs", "-version"), plugin]
}

pub fn analyze(classes: &Path, out_dir: &Path) -> Result<Vec<Finding>, String> {
    if !classes.exists() {
        return Err(format!("Nothing to analyze at {}", classes.display()));
    }

    let plugin = fsb_plugin_path()?;
    std::fs::create_dir_all(out_dir)
        .map_err(|e| format!("Cannot create {}: {e}", out_dir.display()))?;
    let sarif = out_dir.join("spotbugs.sarif");

    // Cancella un eventuale risultato vecchio: così leggiamo solo quello di adesso.
    let _ = std::fs::remove_file(&sarif);

    let plugin_arg = plugin.display().to_string();
    let sarif_arg = format!("-sarif={}", sarif.display());
    let classes_arg = classes.display().to_string();

    let out = run(
        "spotbugs",
        &[
            "-textui",
            "-effort:max",
            "-low",
            "-pluginList",
            &plugin_arg,
            &sarif_arg,
            &classes_arg,
        ],
        out_dir,
    )?;

    let text = std::fs::read_to_string(&sarif).map_err(|_| {
        format!(
            "SpotBugs did not write the SARIF file (exit code {:?}):\n{}",
            out.code,
            last_lines(&out.stderr, 25)
        )
    })?;

    parse_sarif_to_finding(&text)
}
