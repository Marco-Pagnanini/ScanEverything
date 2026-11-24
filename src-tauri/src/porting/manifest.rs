use serde::Deserialize;
use std::collections::HashMap;

/*
    Manifest of a tool
*/

#[derive(Debug, Deserialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ToolKind {
    Static,
    Dynamic,
}

#[derive(Debug, Deserialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Need {
    Classes,
    Dependencies,
}

#[derive(Debug, Deserialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OutputFormat {
    Sarif,
}

#[derive(Debug, Deserialize, Clone)]
pub struct CheckSpec {
    pub program: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub env: Vec<String>,
    #[serde(default)]
    pub files: Vec<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct RunSpec {
    pub program: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub needs: Vec<Need>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct OutputSpec {
    pub file: String,
    pub format: OutputFormat,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ToolManifest {
    pub id: String,
    pub name: String,
    pub kind: ToolKind,
    #[serde(default)]
    pub description: String,
    pub check: CheckSpec,
    pub run: RunSpec,
    pub output: OutputSpec,
}

pub fn parse_manifest(text: &str) -> Result<ToolManifest, String> {
    toml::from_str(text).map_err(|e| format!("Invalid manifest: {e}"))
}

pub fn builtin_manifests() -> Vec<ToolManifest> {
    [
        include_str!("../../manifests/spotbugs.toml"),
        include_str!("../../manifests/dependency-check.toml"),
    ]
    .iter()
    .map(|text| parse_manifest(text).expect("built-in manifest is valid"))
    .collect()
}
/*
    Placeholders
*/

pub fn expand(template: &str, vars: &HashMap<String, String>) -> Result<String, String> {
    let mut out = String::new();
    let mut rest = template;

    while let Some(start) = rest.find('{') {
        out.push_str(&rest[..start]);
        let after = &rest[start + 1..];
        let end = after
            .find('}')
            .ok_or_else(|| format!("Missing }} in \"{template}\""))?;
        out.push_str(&lookup(&after[..end], vars)?);
        rest = &after[end + 1..];
    }

    out.push_str(rest);
    Ok(out)
}

pub fn expand_all(templates: &[String], vars: &HashMap<String, String>) -> Result<Vec<String>, String> {
    templates.iter().map(|t| expand(t, vars)).collect()
}

fn lookup(key: &str, vars: &HashMap<String, String>) -> Result<String, String> {
    if let Some(name) = key.strip_prefix("env:") {
        return std::env::var(name).map_err(|_| format!("Environment variable {name} is not set"));
    }
    vars.get(key)
        .cloned()
        .ok_or_else(|| format!("Unknown placeholder {{{key}}}"))
}
/*
    Tests
*/

#[cfg(test)]
mod tests {
    use super::*;

    const SPOTBUGS: &str = include_str!("../../manifests/spotbugs.toml");
    const DEPCHECK: &str = include_str!("../../manifests/dependency-check.toml");

    #[test]
    fn legge_il_manifest_di_spotbugs() {
        let m = parse_manifest(SPOTBUGS).unwrap();
        assert_eq!(m.id, "spotbugs");
        assert_eq!(m.kind, ToolKind::Static);
        assert_eq!(m.run.needs, [Need::Classes]);
        assert_eq!(m.output.format, OutputFormat::Sarif);
    }

    #[test]
    fn legge_il_manifest_di_dependency_check() {
        let m = parse_manifest(DEPCHECK).unwrap();
        assert_eq!(m.id, "dependency-check");
        assert_eq!(m.check.env, ["NVD_API_KEY"]);
        assert_eq!(m.run.needs, [Need::Dependencies]);
    }
    fn vars() -> HashMap<String, String> {
        HashMap::from([
            ("home".to_string(), "/Users/marco".to_string()),
            ("out".to_string(), "/tmp/run".to_string()),
            ("classes".to_string(), "/p/target/classes".to_string()),
        ])
    }

    #[test]
    fn sostituisce_i_segnaposto() {
        let arg = expand("-sarif={out}/spotbugs.sarif", &vars()).unwrap();
        assert_eq!(arg, "-sarif=/tmp/run/spotbugs.sarif");
        assert_eq!(expand("-textui", &vars()).unwrap(), "-textui");
    }

    #[test]
    fn legge_le_variabili_d_ambiente() {
        let home = std::env::var("HOME").unwrap();
        assert_eq!(expand("{env:HOME}", &vars()).unwrap(), home);
        assert!(expand("{env:SCAN_EVERYTHING_NON_ESISTE}", &vars()).is_err());
    }

    #[test]
    fn errori_nei_segnaposto() {
        assert!(expand("{boh}", &vars()).unwrap_err().contains("boh"));
        assert!(expand("{out", &vars()).is_err());
    }

    #[test]
    fn espande_gli_argomenti_di_spotbugs() {
        let m = parse_manifest(SPOTBUGS).unwrap();
        let args = expand_all(&m.run.args, &vars()).unwrap();
        assert!(args.iter().all(|a| !a.contains('{')));
        assert_eq!(args.last().unwrap(), "/p/target/classes");
    }

    #[test]
    fn manifest_inclusi() {
        let ids: Vec<String> = builtin_manifests().into_iter().map(|m| m.id).collect();
        assert_eq!(ids, ["spotbugs", "dependency-check"]);
    }

    #[test]
    fn rifiuta_un_formato_sconosciuto() {
        let text = SPOTBUGS.replace("format = \"sarif\"", "format = \"xml\"");
        let err = parse_manifest(&text).unwrap_err();
        assert!(err.contains("xml"), "{err}");
    }
}
