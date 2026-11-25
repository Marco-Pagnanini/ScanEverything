use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::io::Write;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/*
    Manifest of a tool
*/

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, TS)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum ToolKind {
    Static,
    Dynamic,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, TS)]
#[ts(export)]
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
    #[serde(skip)]
    pub source: Option<PathBuf>,
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
    User Manifest
*/
pub struct LoadedManifests{
    pub manifests: Vec<ToolManifest>,
    pub errors: Vec<String>,
}

pub fn user_tools_dir() -> PathBuf{
    let home = std::env::var("HOME").unwrap_or_default();
    Path::new(&home).join(".scaneverything").join("tools")
}

pub fn load_user_manifests(dir : &Path) -> LoadedManifests{
    let mut manifests = builtin_manifests();
    let mut errors: Vec<String> = Vec::new();


    let Ok(entries) = std::fs::read_dir(dir) else {
        return LoadedManifests { manifests, errors };
    };

    let mut paths: Vec<PathBuf> = entries
        .filter_map(|entry| entry.ok().map(|e| e.path()))
        .filter(|path| path.extension().is_some_and(|e| e == "toml"))
        .collect();
    paths.sort();

    let mut seen: HashMap<String, String> = HashMap::new();

    for path in paths {
        let file = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let result = std::fs::read_to_string(&path)
            .map_err(|e| e.to_string())
            .and_then(|text| parse_manifest(&text));

        let mut manifest = match result {
            Ok(manifest) => manifest,
            Err(e) => {
                errors.push(format!("{file}: {e}"));
                continue;
            }
        };

        if let Some(first) = seen.get(&manifest.id) {
            errors.push(format!("{file}: id \"{}\" is already used by {first}", manifest.id));
            continue;
        }
        seen.insert(manifest.id.clone(), file);
        manifest.source = Some(path);

        match manifests.iter_mut().find(|m| m.id == manifest.id) {
            Some(existing) => *existing = manifest,
            None => manifests.push(manifest),
        }
    }

    LoadedManifests { manifests, errors }

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
    Validation
*/

pub const TEMPLATE: &str = include_str!("../../manifests/template.toml");

const RUN_PLACEHOLDERS: [&str; 6] = ["home", "out", "name", "project", "classes", "dependencies"];
const CHECK_PLACEHOLDERS: [&str; 1] = ["home"];

pub fn validate_manifest(text: &str, others: &[ToolManifest]) -> Result<(ToolManifest, Vec<String>), String> {
    let manifest = parse_manifest(text)?;
    check_id(&manifest.id)?;

    let check_templates: Vec<&String> = manifest.check.args.iter().chain(&manifest.check.files).collect();
    check_placeholders(&check_templates, &CHECK_PLACEHOLDERS)?;
    let run_templates: Vec<&String> = manifest.run.args.iter().collect();
    check_placeholders(&run_templates, &RUN_PLACEHOLDERS)?;
    check_needs(&manifest)?;

    let mut warnings = Vec::new();
    for other in others {
        if other.id == manifest.id {
            match &other.source {
                Some(path) => return Err(format!("id \"{}\" is already used by {}", manifest.id, path.display())),
                None => warnings.push(format!("Replaces the built-in tool {}", other.name)),
            }
        } else if other.output.file == manifest.output.file {
            warnings.push(format!("{} also writes {}", other.name, manifest.output.file));
        }
    }

    Ok((manifest, warnings))
}

pub fn save_manifest(dir: &Path, text: &str, others: &[ToolManifest]) -> Result<PathBuf, String> {
    let (manifest, _) = validate_manifest(text, others)?;
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;

    let path = dir.join(format!("{}.toml", manifest.id));
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map_err(|e| match e.kind() {
            std::io::ErrorKind::AlreadyExists => format!("{} already exists", path.display()),
            _ => e.to_string(),
        })?;
    file.write_all(text.as_bytes()).map_err(|e| e.to_string())?;

    Ok(path)
}

fn check_id(id: &str) -> Result<(), String> {
    let valid = !id.is_empty()
        && id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '_');
    if valid {
        Ok(())
    } else {
        Err(format!("Invalid id \"{id}\": use only a-z, 0-9, - and _"))
    }
}

fn placeholders(template: &str) -> Result<Vec<&str>, String> {
    let mut names = Vec::new();
    let mut rest = template;

    while let Some(start) = rest.find('{') {
        let after = &rest[start + 1..];
        let end = after
            .find('}')
            .ok_or_else(|| format!("Missing }} in \"{template}\""))?;
        names.push(&after[..end]);
        rest = &after[end + 1..];
    }

    Ok(names)
}

fn check_placeholders(templates: &[&String], allowed: &[&str]) -> Result<(), String> {
    for template in templates {
        for name in placeholders(template)? {
            if !name.starts_with("env:") && !allowed.contains(&name) {
                return Err(format!("Placeholder {{{name}}} can't be used in \"{template}\""));
            }
        }
    }
    Ok(())
}

fn check_needs(manifest: &ToolManifest) -> Result<(), String> {
    for template in &manifest.run.args {
        for name in placeholders(template)? {
            let need = match name {
                "classes" => Need::Classes,
                "dependencies" => Need::Dependencies,
                _ => continue,
            };
            if !manifest.run.needs.contains(&need) {
                return Err(format!("{{{name}}} is used, but run.needs doesn't contain \"{name}\""));
            }
        }
    }
    Ok(())
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
    fn cartella_utente_mancante() {
        let loaded = load_user_manifests(Path::new("/cartella/che/non/esiste"));
        assert_eq!(loaded.manifests.len(), 2);
        assert!(loaded.errors.is_empty());
    }

    #[test]
    fn manifest_dell_utente() {
        let dir = std::env::temp_dir().join("se-test-user-manifests");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let semgrep = SPOTBUGS.replace("id = \"spotbugs\"", "id = \"semgrep\"");
        let custom = SPOTBUGS.replace("name = \"SpotBugs\"", "name = \"SpotBugs custom\"");
        std::fs::write(dir.join("semgrep.toml"), semgrep).unwrap();
        std::fs::write(dir.join("spotbugs.toml"), custom).unwrap();
        std::fs::write(dir.join("broken.toml"), "id = ").unwrap();
        std::fs::write(dir.join("notes.txt"), "not a manifest").unwrap();

        let loaded = load_user_manifests(&dir);
        let ids: Vec<&str> = loaded.manifests.iter().map(|m| m.id.as_str()).collect();
        assert_eq!(ids, ["spotbugs", "dependency-check", "semgrep"]);
        assert_eq!(loaded.manifests[0].name, "SpotBugs custom");
        assert!(loaded.manifests[0].source.is_some());
        assert!(loaded.manifests[1].source.is_none());
        assert_eq!(loaded.errors.len(), 1);
        assert!(loaded.errors[0].starts_with("broken.toml"));
    }
    #[test]
    fn id_duplicato_nella_cartella() {
        let dir = std::env::temp_dir().join("se-test-duplicate-ids");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let tool = SPOTBUGS.replace("id = \"spotbugs\"", "id = \"mio\"");
        std::fs::write(dir.join("a.toml"), &tool).unwrap();
        std::fs::write(dir.join("b.toml"), &tool).unwrap();

        let loaded = load_user_manifests(&dir);
        assert_eq!(loaded.manifests.iter().filter(|m| m.id == "mio").count(), 1);
        assert_eq!(loaded.errors.len(), 1);
        assert!(loaded.errors[0].contains("a.toml"), "{}", loaded.errors[0]);
    }
        #[test]
    fn il_modello_e_valido() {
        let (manifest, warnings) = validate_manifest(TEMPLATE, &builtin_manifests()).unwrap();
        assert_eq!(manifest.id, "my-tool");
        assert!(warnings.is_empty(), "{warnings:?}");
    }

    #[test]
    fn rifiuta_un_id_non_valido() {
        let text = TEMPLATE.replace("id = \"my-tool\"", "id = \"../evil\"");
        let err = validate_manifest(&text, &[]).unwrap_err();
        assert!(err.contains("Invalid id"), "{err}");
    }

    #[test]
    fn rifiuta_segnaposto_sbagliati() {
        let text = TEMPLATE.replace("{project}", "{pippo}");
        assert!(validate_manifest(&text, &[]).is_err());

        let text = TEMPLATE.replace("\"--version\"", "\"{out}\"");
        assert!(validate_manifest(&text, &[]).is_err());

        let text = TEMPLATE.replace("{project}", "{classes}");
        let err = validate_manifest(&text, &[]).unwrap_err();
        assert!(err.contains("run.needs"), "{err}");
    }

    #[test]
    fn avvisi_per_id_e_output() {
        let (_, warnings) = validate_manifest(SPOTBUGS, &builtin_manifests()).unwrap();
        assert!(warnings[0].contains("built-in"), "{warnings:?}");

        let text = SPOTBUGS.replace("id = \"spotbugs\"", "id = \"mio\"");
        let (_, warnings) = validate_manifest(&text, &builtin_manifests()).unwrap();
        assert!(warnings[0].contains("spotbugs.sarif"), "{warnings:?}");
    }

    #[test]
    fn salva_il_manifest() {
        let dir = std::env::temp_dir().join("se-test-save");
        let _ = std::fs::remove_dir_all(&dir);

        let path = save_manifest(&dir, TEMPLATE, &builtin_manifests()).unwrap();
        assert!(path.ends_with("my-tool.toml"));
        assert!(save_manifest(&dir, TEMPLATE, &builtin_manifests()).is_err());

        let loaded = load_user_manifests(&dir);
        let mine = loaded.manifests.iter().find(|m| m.id == "my-tool").unwrap();
        assert!(mine.source.is_some());

        let err = validate_manifest(TEMPLATE, &loaded.manifests).unwrap_err();
        assert!(err.contains("already used"), "{err}");
    }

    #[test]
    fn rifiuta_un_formato_sconosciuto() {
        let text = SPOTBUGS.replace("format = \"sarif\"", "format = \"xml\"");
        let err = parse_manifest(&text).unwrap_err();
        assert!(err.contains("xml"), "{err}");
    }

}
