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
    properties: Option<RuleProperties>,
    relationships: Option<Vec<Relationship>>,
}

#[derive(Debug, Deserialize)]
struct RuleProperties {
    #[serde(default)]
    tags: Vec<String>,
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
struct Message {
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Location {
    physical_location: Option<PhysicalLocation>,
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
                .and_then(|a| a.uri.clone());

            let line = place
                .and_then(|p| p.region.as_ref())
                .and_then(|r| r.start_line);

            findings.push(Finding {
                tool: tool.clone(),
                rule: rule_id.clone(),
                title: result.message.text.clone().unwrap_or(rule_id),
                severity: severity_from_level(result.level.as_deref()),
                security: rule.map(is_security).unwrap_or(false),
                cwe: rule.and_then(cwe_of),
                file,
                line,
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

fn severity_from_level(level: Option<&str>) -> Severity {
    match level {
        Some("error") => Severity::High,
        None | Some("warning") => Severity::Medium,
        _ => Severity::Low,
    }
}

fn is_security(rule: &Rule) -> bool {
    rule.properties
        .as_ref()
        .map(|p| p.tags.iter().any(|t| t == "SECURITY"))
        .unwrap_or(false)
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
}
