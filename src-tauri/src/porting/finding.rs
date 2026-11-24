use serde::{Deserialize, Serialize};
use ts_rs::TS;

// Deserialize -> take JSON
// Serialize -> create JSON for React app

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, TS)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Finding {
    pub tool: String,
    #[serde(default)] // se manca nel JSON: stringa vuota
    pub rule: String,
    pub title: String,
    pub severity: Severity,
    #[serde(default)] // se manca nel JSON: false
    pub security: bool,
    pub cwe: Option<String>,
    pub file: Option<String>,
    pub line: Option<u32>,
    pub cve: Option<String>,
    pub package: Option<String>,
    pub description: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn read_json() {
        let json =
            r#"{ "tool": "dependency-check", "title": "Log4Shell", "severity": "critical" }"#;
        let finding: Finding = serde_json::from_str(json).unwrap();
        assert_eq!(finding.severity, Severity::Critical);
        assert!(!finding.security);
    }
}
