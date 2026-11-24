use std::path::{Path, PathBuf};

use crate::porting::finding::Finding;
use crate::porting::process::ToolCheck;
use crate::porting::tools::{maven, spotbugs, dependency_check};

/// Controlla tutti gli strumenti della pipeline.
pub fn check_tools() -> Vec<ToolCheck> {
    let mut checks = vec![maven::check()];
    checks.extend(spotbugs::check());
    checks.extend(dependency_check::check());
    checks
}

/// Cosa analizzare: le classi compilate e dove scrivere i risultati.
struct Target {
    classes: PathBuf,
    out_dir: PathBuf,
    deps: Option<PathBuf>,
}

/// Prepara le classi compilate.
/// - un file .jar si usa così com'è (niente Build);
/// - una cartella con pom.xml viene compilata con Maven.
fn prepare(input: &Path) -> Result<Target, String> {
    if is_jar(input) {
        return Ok(Target {
            classes: input.to_path_buf(),
            out_dir: std::env::temp_dir().join("scaneverything"),
            deps: None,
        });
    }

    let classes = maven::build(input)?;
    let deps = maven::copy_dependencies(input)?;
    Ok(Target {
        classes,
        out_dir: input.join("target"),
        deps:Some(deps)
    })
}

fn is_jar(path: &Path) -> bool {
    path.is_file() && path.extension().is_some_and(|e| e == "jar")
}

fn project_name(input: &Path) -> String {
    input
        .file_stem()
        .and_then(|name| name.to_str())
        .unwrap_or("project")
        .to_string()
}

/// Pipeline minima: (Build) → SpotBugs.
pub fn scan(input: &Path) -> Result<Vec<Finding>, String> {
    let target = prepare(input)?;
    let mut findings = spotbugs::analyze(&target.classes, &target.out_dir)?;
    if let Some(deps) = &target.deps {
        let libraries = dependency_check::analyze(deps, &target.out_dir, &project_name(input))?;
        findings.extend(libraries);
    }

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

    #[test]
    fn nome_del_progetto() {
        assert_eq!(project_name(Path::new("/tmp/vulnapp")), "vulnapp");
        assert_eq!(project_name(Path::new("/tmp/app-1.0.jar")), "app-1.0");
    }
}
