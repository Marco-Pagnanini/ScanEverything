use std::path::Path;

use serde::Serialize;

use crate::porting::finding::Finding;
use crate::porting::process::ToolCheck;
use crate::porting::tools::{dependency_check, maven, spotbugs};

use ts_rs::TS;
/*
    Report of a scan
*/

#[derive(Debug, Serialize, TS, PartialEq)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum StepStatus {
    Ok,
    Failed,
    Skipped,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct StepResult {
    pub name: String,
    pub status: StepStatus,
    pub findings: usize,
    pub detail: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ScanReport {
    pub steps: Vec<StepResult>,
    pub findings: Vec<Finding>,
}

impl ScanReport {
    fn new() -> Self {
        ScanReport {
            steps: Vec::new(),
            findings: Vec::new(),
        }
    }

    fn ok(&mut self, name: &str, found: Vec<Finding>) {
        self.steps.push(StepResult {
            name: name.to_string(),
            status: StepStatus::Ok,
            findings: found.len(),
            detail: None,
        });
        self.findings.extend(found);
    }

    fn failed(&mut self, name: &str, error: String) {
        self.steps.push(StepResult {
            name: name.to_string(),
            status: StepStatus::Failed,
            findings: 0,
            detail: Some(error),
        });
    }

    fn skipped(&mut self, name: &str, reason: &str) {
        self.steps.push(StepResult {
            name: name.to_string(),
            status: StepStatus::Skipped,
            findings: 0,
            detail: Some(reason.to_string()),
        });
    }
}

/*
    Pipeline
*/

pub fn check_tools() -> Vec<ToolCheck> {
    let mut checks = vec![maven::check()];
    checks.extend(spotbugs::check());
    checks.extend(dependency_check::check());
    checks
}

pub fn scan(input: &Path, tools: &[String]) -> ScanReport {
    let mut report = ScanReport::new();
    let jar = is_jar(input);
    let use_spotbugs = tools.iter().any(|t| t == "spotbugs");
    let use_depcheck = tools.iter().any(|t| t == "dependency-check");

    let out_dir = if jar {
        std::env::temp_dir().join("scaneverything")
    } else {
        input.join("target")
    };

    let classes = if !use_spotbugs {
        None
    } else if jar {
        report.skipped("Build", "the input is a jar");
        Some(input.to_path_buf())
    } else {
        match maven::build(input) {
            Ok(classes) => {
                report.ok("Build", Vec::new());
                Some(classes)
            }
            Err(e) => {
                report.failed("Build", e);
                None
            }
        }
    };

    let deps = if !use_depcheck {
        None
    } else if jar {
        report.skipped("Copy dependencies", "the input is a jar");
        None
    } else {
        match maven::copy_dependencies(input) {
            Ok(deps) => {
                report.ok("Copy dependencies", Vec::new());
                Some(deps)
            }
            Err(e) => {
                report.failed("Copy dependencies", e);
                None
            }
        }
    };

    if use_spotbugs {
        if let Some(reason) = not_ready(spotbugs::check()) {
            report.skipped("SpotBugs", &reason);
        } else {
            match &classes {
                None => report.skipped("SpotBugs", "no compiled classes"),
                Some(classes) => match spotbugs::analyze(classes, &out_dir) {
                    Ok(found) => report.ok("SpotBugs", found),
                    Err(e) => report.failed("SpotBugs", e),
                },
            }
        }
    }

    if use_depcheck {
        if let Some(reason) = not_ready(dependency_check::check()) {
            report.skipped("Dependency-Check", &reason);
        } else {
            match &deps {
                None => report.skipped("Dependency-Check", "no libraries to analyze"),
                Some(deps) => match dependency_check::analyze(deps, &out_dir, &project_name(input)) {
                    Ok(found) => report.ok("Dependency-Check", found),
                    Err(e) => report.failed("Dependency-Check", e),
                },
            }
        }
    }

    report.findings.sort_by_key(|f| (!f.security, f.severity));
    report
}

fn not_ready(checks: Vec<ToolCheck>) -> Option<String> {
    checks
        .into_iter()
        .find(|check| !check.ok)
        .map(|check| format!("{}: {}", check.name, check.detail))
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

/*
    Tests
*/

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn non_scambia_cartelle_per_jar() {
        assert!(!is_jar(Path::new("libreria.jar")));
        assert!(!is_jar(Path::new(".")));
    }

    #[test]
    fn nome_del_progetto() {
        assert_eq!(project_name(Path::new("/tmp/vulnapp")), "vulnapp");
        assert_eq!(project_name(Path::new("/tmp/app-1.0.jar")), "app-1.0");
    }

    #[test]
    fn primo_strumento_non_pronto() {
        let checks = vec![
            ToolCheck {
                tool: "x".to_string(),
                name: "A".to_string(),
                ok: true,
                detail: "1.0".to_string(),
            },
            ToolCheck {
                tool: "x".to_string(),
                name: "B".to_string(),
                ok: false,
                detail: "not found".to_string(),
            },
        ];
        assert_eq!(not_ready(checks), Some("B: not found".to_string()));
        assert_eq!(not_ready(Vec::new()), None);
    }

    #[test]
    fn build_fallita_non_blocca_il_report() {
        let all = ["spotbugs".to_string(), "dependency-check".to_string()];
        let report = scan(Path::new("."), &all);
        let status: Vec<&StepStatus> = report.steps.iter().map(|s| &s.status).collect();
        assert_eq!(
            status,
            [
                &StepStatus::Failed,
                &StepStatus::Failed,
                &StepStatus::Skipped,
                &StepStatus::Skipped
            ]
        );
        assert!(report.findings.is_empty());
    }

    #[test]
    fn nessuno_strumento_scelto() {
        let report = scan(Path::new("."), &[]);
        assert!(report.steps.is_empty());
    }

    #[test]
    fn solo_dependency_check_non_compila() {
        let only = ["dependency-check".to_string()];
        let report = scan(Path::new("."), &only);
        let names: Vec<&str> = report.steps.iter().map(|s| s.name.as_str()).collect();
        assert_eq!(names, ["Copy dependencies", "Dependency-Check"]);
    }
}
