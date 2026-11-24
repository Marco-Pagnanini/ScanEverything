use std::collections::HashMap;
use std::path::Path;

use crate::porting::finding::Finding;
use crate::porting::manifest::{OutputFormat, ToolManifest, expand, expand_all};
use crate::porting::parsers::sarif::parse_sarif_to_finding;
use crate::porting::process::{ToolCheck, check_tool, last_lines, run};

pub fn base_vars() -> HashMap<String, String> {
    let home = std::env::var("HOME").unwrap_or_default();
    HashMap::from([("home".to_string(), home)])
}

pub fn check(manifest: &ToolManifest, vars: &HashMap<String, String>) -> Vec<ToolCheck> {
    let id = manifest.id.as_str();
    let args: Vec<&str> = manifest.check.args.iter().map(String::as_str).collect();
    let mut checks = vec![check_tool(id, &manifest.name, &manifest.check.program, &args)];

    for name in &manifest.check.env {
        let ok = std::env::var(name).is_ok_and(|value| !value.trim().is_empty());
        let detail = if ok {
            format!("{name} is set")
        } else {
            format!("{name} is not set")
        };
        checks.push(ToolCheck::new(id, name, ok, detail));
    }

    for template in &manifest.check.files {
        let label = template.rsplit('/').next().unwrap_or(template);
        checks.push(match expand(template, vars) {
            Ok(path) if Path::new(&path).is_file() => ToolCheck::new(id, label, true, path),
            Ok(path) => ToolCheck::new(id, label, false, format!("{path} not found")),
            Err(e) => ToolCheck::new(id, label, false, e),
        });
    }

    checks
}

pub fn analyze(
    manifest: &ToolManifest,
    vars: &HashMap<String, String>,
    out_dir: &Path,
) -> Result<Vec<Finding>, String> {
    std::fs::create_dir_all(out_dir)
        .map_err(|e| format!("Cannot create {}: {e}", out_dir.display()))?;
    let output = out_dir.join(&manifest.output.file);
    let _ = std::fs::remove_file(&output);

    let args = expand_all(&manifest.run.args, vars)?;
    let args: Vec<&str> = args.iter().map(String::as_str).collect();
    let out = run(&manifest.run.program, &args, out_dir)?;

    let text = std::fs::read_to_string(&output).map_err(|_| {
        format!(
            "{} did not write {} (exit code {:?}):\n{}",
            manifest.name,
            output.display(),
            out.code,
            last_lines(&format!("{}{}", out.stdout, out.stderr), 25)
        )
    })?;

    match manifest.output.format {
        OutputFormat::Sarif => parse_sarif_to_finding(&text),
    }
}

/*
    Tests
*/

#[cfg(test)]
mod tests {
    use super::*;
    use crate::porting::manifest::parse_manifest;

    const COPY: &str = r#"
id = "copy"
name = "Copy"
kind = "static"

[check]
program = "cp"

[run]
program = "cp"
args = ["{fixture}", "{out}/result.sarif"]

[output]
file = "result.sarif"
format = "sarif"
"#;

    fn test_vars(out: &Path) -> HashMap<String, String> {
        let fixture = format!("{}/fixtures/spotbugs_vulnapp.sarif", env!("CARGO_MANIFEST_DIR"));
        HashMap::from([
            ("fixture".to_string(), fixture),
            ("out".to_string(), out.display().to_string()),
        ])
    }

    #[test]
    fn analizza_con_un_manifest() {
        let out = std::env::temp_dir().join("se-test-generic-ok");
        let manifest = parse_manifest(COPY).unwrap();
        let findings = analyze(&manifest, &test_vars(&out), &out).unwrap();
        assert_eq!(findings.len(), 10);
    }

    #[test]
    fn errore_se_manca_il_risultato() {
        let out = std::env::temp_dir().join("se-test-generic-missing");
        let text = COPY.replace("program = \"cp\"\nargs", "program = \"true\"\nargs");
        let manifest = parse_manifest(&text).unwrap();
        let err = analyze(&manifest, &test_vars(&out), &out).unwrap_err();
        assert!(err.contains("did not write"), "{err}");
    }

    const FAKE: &str = r#"
id = "fake"
name = "Fake"
kind = "static"

[check]
program = "programma-che-non-esiste-123"
args = ["--version"]
env = ["SCAN_EVERYTHING_NON_ESISTE"]
files = ["{home}/non-esiste.jar"]

[run]
program = "fake"

[output]
file = "out.sarif"
format = "sarif"
"#;

    #[test]
    fn controlla_programma_variabili_e_file() {
        let manifest = parse_manifest(FAKE).unwrap();
        let checks = check(&manifest, &base_vars());

        let names: Vec<&str> = checks.iter().map(|c| c.name.as_str()).collect();
        assert_eq!(names, ["Fake", "SCAN_EVERYTHING_NON_ESISTE", "non-esiste.jar"]);
        assert!(checks.iter().all(|c| !c.ok && c.tool == "fake"));
    }
}
