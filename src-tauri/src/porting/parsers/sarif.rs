use crate::porting::finding::{Finding, Severity};
use serde::Deserialize;

/*
    Structur of SARIF file
*/

#[derive(Debug, Deserialize)]
struct SarifLog {
    runs: Vec<Run>,
}

#[derive(Debug, Deserialize)]
struct Run {
    tool: Tool,
    #[serde(default)]
    results: Vec<SarifResult>,
}

#[derive(Debug, Deserialize)]
struct Tool {
    driver: Driver,
}

#[derive(Debug, Deserialize)]
struct Driver {
    name: String,
    #[serde(default)]
    rules: Vec<Rule>,
}

#[derive(Debug, Deserialize)]
struct Rule {
    id: String,
    properties: Option<serde_json::Value>,
    relationships: Option<Vec<Relationship>>,
}

#[derive(Debug, Deserialize)]
struct Relationship {
    target: RelationshipTarget,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")] // nel JSON: "toolComponent"
struct RelationshipTarget {
    id: String,
    tool_component: Option<ToolComponentRef>,
}

#[derive(Debug, Deserialize)]
struct ToolComponentRef {
    name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")] // nel JSON: "ruleId", "ruleIndex"
struct SarifResult {
    rule_id: Option<String>,
    rule_index: Option<usize>,
    level: Option<String>,
    message: Message,
    #[serde(default)]
    locations: Vec<Location>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Location {
    physical_location: Option<PhysicalLocation>,
    #[serde(default)]
    logical_locations: Vec<LogicalLocation>,
}

#[derive(Debug, Deserialize)]
struct Message {
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PhysicalLocation {
    artifact_location: Option<ArtifactLocation>,
    region: Option<Region>,
}

#[derive(Debug, Deserialize)]
struct ArtifactLocation {
    uri: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Region {
    start_line: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LogicalLocation {
    fully_qualified_name: Option<String>,
}


/*
    Convert SARIF to Finding
*/

pub fn parse_sarif_to_finding(text: &str) -> Result<Vec<Finding>, String> {
    let log: SarifLog = serde_json::from_str(text).map_err(|e| format!("SARIF non valido: {e}"))?;

    let mut findings: Vec<Finding> = Vec::new();

    for run in log.runs {
        let tool = run.tool.driver.name.to_lowercase();

        for result in &run.results {
            let rule = find_rule(&run, result);

            let rule_id = result
                .rule_id
                .clone()
                .or_else(|| rule.map(|r| r.id.clone()))
                .unwrap_or_else(|| "UNKNOWN".to_string());

            let place = result
                .locations
                .first()
                .and_then(|l| l.physical_location.as_ref());

            let file = place
                .and_then(|p| p.artifact_location.as_ref())
                .and_then(|a| a.uri.as_deref())
                .map(clean_uri);

            let line = place
                .and_then(|p| p.region.as_ref())
                .and_then(|r| r.start_line);

            let package = result
                .locations
                .first()
                .and_then(|l| l.logical_locations.first())
                .and_then(|l| l.fully_qualified_name.clone())
                .filter(|name| name.starts_with("pkg:"));

            let cve = rule_id.starts_with("CVE-").then(|| rule_id.clone());

            let message = result.message.text.clone().unwrap_or_else(|| rule_id.clone());
            let title = short_title(&message);
            let description = (message.trim() != title).then_some(message);

            findings.push(Finding {
                tool: tool.clone(),
                rule: rule_id.clone(),
                title,
                severity: match rule.and_then(security_score) {
                    Some(score) => severity_from_score(score),
                    None => severity_from_level(result.level.as_deref()),
                },
                security: rule.map(is_security).unwrap_or(false),
                cwe: rule.and_then(cwe_of),
                file,
                line,
                cve,
                package,
                description,
            });
        }
    }
    Ok(findings)
}

fn find_rule<'a>(run: &'a Run, result: &SarifResult) -> Option<&'a Rule> {
    let rules = &run.tool.driver.rules;
    if let Some(rule) = result.rule_index.and_then(|i| rules.get(i)) {
        return Some(rule);
    }
    let id = result.rule_id.as_deref()?;
    rules.iter().find(|r| r.id == id)
}

fn severity_from_score(score: f64) -> Severity {
    if score >= 9.0 {
        Severity::Critical
    } else if score >= 7.0 {
        Severity::High
    } else if score >= 4.0 {
        Severity::Medium
    } else {
        Severity::Low
    }
}

fn security_score(rule: &Rule) -> Option<f64> {
    match rule.properties.as_ref()?.get("security-severity")? {
        serde_json::Value::Number(n) => n.as_f64(),
        serde_json::Value::String(s) => s.trim().parse().ok(),
        _ => None,
    }
}

fn severity_from_level(level: Option<&str>) -> Severity {
    match level {
        Some("error") => Severity::High,
        None | Some("warning") => Severity::Medium,
        _ => Severity::Low,
    }
}

fn is_security(rule: &Rule) -> bool {
    let has_tag = rule
        .properties
        .as_ref()
        .and_then(|p| p.get("tags"))
        .and_then(|t| t.as_array())
        .is_some_and(|tags| tags.iter().any(|t| t.as_str() == Some("SECURITY")));

    has_tag || security_score(rule).is_some()
}

fn cwe_of(rule: &Rule) -> Option<String> {
    rule.relationships
        .as_ref()?
        .iter()
        .find(|r| {
            r.target
                .tool_component
                .as_ref()
                .map(|t| t.name == "CWE")
                .unwrap_or(false)
        })
        .map(|r| format!("CWE-{}", r.target.id))
}

fn short_title(message: &str) -> String {
    let first = message.lines().next().unwrap_or("").trim();
    if first.chars().count() <= 140 {
        first.to_string()
    } else {
        let cut: String = first.chars().take(139).collect();
        format!("{cut}…").to_string()
    }
}

fn clean_uri(uri: &str) -> String {
    uri.strip_prefix("file://").unwrap_or(uri).to_string()
}
/*
    Tests
*/
#[cfg(test)]
mod tests {
    use super::*;

    // Il file viene incluso nel programma di test al momento della compilazione.
    const VULNAPP: &str = include_str!("../../../fixtures/spotbugs_vulnapp.sarif");

    #[test]
    fn legge_tutti_i_risultati() {
        let findings = parse_sarif_to_finding(VULNAPP).unwrap();
        assert_eq!(findings.len(), 10);
        assert_eq!(findings.iter().filter(|f| f.security).count(), 5);
    }

    #[test]
    fn trova_la_sql_injection_con_cwe() {
        let findings = parse_sarif_to_finding(VULNAPP).unwrap();
        let sqli = findings
            .iter()
            .find(|f| f.rule == "SQL_INJECTION_JDBC")
            .expect("SQL injection non trovata");
        assert_eq!(sqli.tool, "spotbugs");
        assert_eq!(sqli.line, Some(23));
        assert_eq!(sqli.severity, Severity::Medium);
        assert!(sqli.security);
        assert_eq!(sqli.cwe.as_deref(), Some("CWE-89"));
    }

    #[test]
    fn rifiuta_un_file_non_sarif() {
        assert!(parse_sarif_to_finding("[1, 2, 3]").is_err());
    }

    const DEPCHECK: &str = include_str!("../../../fixtures/dependency_check_vulnapp.sarif");

    #[test]
    fn legge_dependency_check() {
        let findings = parse_sarif_to_finding(DEPCHECK).unwrap();
        assert_eq!(findings.len(), 14);
    }

    #[test]
    fn dependency_check_tutti_di_sicurezza() {
        let findings = parse_sarif_to_finding(DEPCHECK).unwrap();
        assert!(findings.iter().all(|f| f.security));
    }

    #[test]
    fn log4shell_critica() {
        let findings = parse_sarif_to_finding(DEPCHECK).unwrap();
        let log4shell = findings
            .iter()
            .find(|f| f.rule == "CVE-2021-44228")
            .expect("Log4Shell non trovata");
        assert_eq!(log4shell.severity, Severity::Critical);

        let critiche = findings
            .iter()
            .filter(|f| f.severity == Severity::Critical)
            .count();
        assert_eq!(critiche, 3);
    }

    #[test]
    fn log4shell_cve_e_libreria() {
        let findings = parse_sarif_to_finding(DEPCHECK).unwrap();
        let log4shell = findings
            .iter()
            .find(|f| f.cve.as_deref() == Some("CVE-2021-44228"))
            .expect("Log4Shell non trovata");
        assert_eq!(
            log4shell.package.as_deref(),
            Some("pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1")
        );
        assert!(log4shell.line.is_none());
    }

     #[test]
    fn titoli_brevi() {
        let depcheck = parse_sarif_to_finding(DEPCHECK).unwrap();
        assert!(depcheck.iter().all(|f| f.title.chars().count() <= 140));
        assert!(depcheck.iter().all(|f| f.description.is_some()));

        let spotbugs = parse_sarif_to_finding(VULNAPP).unwrap();
        assert!(spotbugs.iter().all(|f| f.description.is_none()));
    }

    #[test]
    fn percorsi_senza_prefisso_file() {
        let findings = parse_sarif_to_finding(DEPCHECK).unwrap();
        assert!(findings
            .iter()
            .all(|f| f.file.as_deref().is_some_and(|p| p.starts_with('/'))));
    }

    #[test]
    fn regole_generiche_dello_standard() {
        let text = r#"{"runs": [{
            "tool": {"driver": {"name": "x", "rules": [{
                "id": "r1",
                "defaultConfiguration": {"level": "error"},
                "properties": {"tags": ["security", "CWE-89: SQL Injection"]}
            }]}},
            "results": [{"ruleId": "r1", "message": {"text": "Bad query. Use a prepared statement."}}]
        }]}"#;

        let f = &parse_sarif_to_finding(text).unwrap()[0];
        assert_eq!(f.severity, Severity::High);
        assert!(f.security);
        assert_eq!(f.cwe.as_deref(), Some("CWE-89"));
        assert_eq!(f.title, "Bad query");
    }

}
