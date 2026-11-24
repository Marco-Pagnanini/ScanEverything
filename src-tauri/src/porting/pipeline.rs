use std::path::{Path, PathBuf};

use crate::porting::finding::Finding;
use crate::porting::process::ToolCheck;
use crate::porting::tools::{maven, spotbugs};

/// Controlla tutti gli strumenti della pipeline.
pub fn check_tools() -> Vec<ToolCheck> {
    let mut checks = vec![maven::check()];
    checks.extend(spotbugs::check());
    checks
}

/// Cosa analizzare: le classi compilate e dove scrivere i risultati.
struct Target {
    classes: PathBuf,
    out_dir: PathBuf,
}

/// Prepara le classi compilate.
/// - un file .jar si usa così com'è (niente Build);
/// - una cartella con pom.xml viene compilata con Maven.
fn prepare(input: &Path) -> Result<Target, String> {
    if is_jar(input) {
        return Ok(Target {
            classes: input.to_path_buf(),
            out_dir: std::env::temp_dir().join("scaneverything"),
        });
    }

    let classes = maven::build(input)?;
    Ok(Target {
        classes,
        out_dir: input.join("target"),
    })
}

fn is_jar(path: &Path) -> bool {
    path.is_file() && path.extension().is_some_and(|e| e == "jar")
}

/// Pipeline minima: (Build) → SpotBugs.
pub fn scan(input: &Path) -> Result<Vec<Finding>, String> {
    let target = prepare(input)?;
    let mut findings = spotbugs::analyze(&target.classes, &target.out_dir)?;
    findings.sort_by_key(|f| (!f.security, f.severity));
    Ok(findings)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn non_scambia_cartelle_per_jar() {
        assert!(!is_jar(Path::new("libreria.jar"))); // non esiste: non è un file
        assert!(!is_jar(Path::new("."))); // è una cartella
    }
}
