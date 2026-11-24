use std::path::Path;

use serde::Serialize;
use ts_rs::TS;

use crate::porting::finding::Finding;
use crate::porting::manifest::{Need, ToolKind, ToolManifest, builtin_manifests};
use crate::porting::process::ToolCheck;
use crate::porting::tools::{generic, maven};

/*
    Report of a scan
*/

#[derive(Debug, Serialize, PartialEq, TS)]
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
    Tools
*/

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ToolInfo {
    pub id: String,
    pub name: String,
    pub kind: ToolKind,
    pub description: String,
    pub needs: Vec<Need>,
}

pub fn list_tools() -> Vec<ToolInfo> {
    builtin_manifests()
        .into_iter()
        .map(|m| ToolInfo {
            id: m.id,
            name: m.name,
            kind: m.kind,
            description: m.description,
            needs: m.run.needs,
        })
        .collect()
}

pub fn check_tools() -> Vec<ToolCheck> {
    let vars = generic::base_vars();
    let mut checks = vec![maven::check()];
    for manifest in builtin_manifests() {
        checks.extend(generic::check(&manifest, &vars));
    }
    checks
}

/*
    Pipeline
*/

pub fn scan(input: &Path, tools: &[String]) -> ScanReport {
    let mut report = ScanReport::new();
    let jar = is_jar(input);

    let chosen: Vec<ToolManifest> = builtin_manifests()
        .into_iter()
        .filter(|m| tools.contains(&m.id))
        .collect();
    let needs = |need: Need| chosen.iter().any(|m| m.run.needs.contains(&need));

    let out_dir = if jar {
        std::env::temp_dir().join("scaneverything")
    } else {
        input.join("target")
    };

    let classes = if !needs(Need::Classes) {
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

    let deps = if !needs(Need::Dependencies) {
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

    let mut vars = generic::base_vars();
    vars.insert("out".to_string(), out_dir.display().to_string());
    vars.insert("name".to_string(), project_name(input));
    if let Some(classes) = &classes {
        vars.insert("classes".to_string(), classes.display().to_string());
    }
    if let Some(deps) = &deps {
        vars.insert("dependencies".to_string(), deps.display().to_string());
    }

    for manifest in &chosen {
        let missing = manifest.run.needs.iter().find(|need| match need {
            Need::Classes => classes.is_none(),
            Need::Dependencies => deps.is_none(),
        });

        if let Some(reason) = not_ready(generic::check(manifest, &vars)) {
            report.skipped(&manifest.name, &reason);
        } else if let Some(need) = missing {
            report.skipped(&manifest.name, need_label(*need));
        } else {
            match generic::analyze(manifest, &vars, &out_dir) {
                Ok(found) => report.ok(&manifest.name, found),
                Err(e) => report.failed(&manifest.name, e),
            }
        }
    }

    report.findings.sort_by_key(|f| (!f.security, f.severity));
    report
}

fn need_label(need: Need) -> &'static str {
    match need {
        Need::Classes => "no compiled classes",
        Need::Dependencies => "no libraries to analyze",
    }
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
            ToolCheck::new("x", "A", true, "1.0"),
            ToolCheck::new("x", "B", false, "not found"),
        ];
        assert_eq!(not_ready(checks), Some("B: not found".to_string()));
        assert_eq!(not_ready(Vec::new()), None);
    }

    #[test]
    fn lista_degli_strumenti() {
        let tools = list_tools();
        let ids: Vec<&str> = tools.iter().map(|t| t.id.as_str()).collect();
        assert_eq!(ids, ["spotbugs", "dependency-check"]);
        assert_eq!(tools[0].needs, [Need::Classes]);
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
