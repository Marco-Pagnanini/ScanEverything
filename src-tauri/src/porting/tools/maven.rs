use std::path::{Path, PathBuf};

use crate::porting::process::{ToolCheck, check_tool, last_lines, run};

/// Controlla che Maven sia installato.
pub fn check() -> ToolCheck {
    check_tool("Maven", "mvn", "-version")
}

/// Step "Build": compila un progetto Maven.
/// Restituisce la cartella con le classi compilate (target/classes).
pub fn build(project: &Path) -> Result<PathBuf, String> {
    if !project.join("pom.xml").is_file() {
        return Err(format!("No pom.xml in {}", project.display()));
    }

    let out = run("mvn", &["-B", "-q", "package", "-DskipTests"], project)?;

    if out.code != Some(0) {
        return Err(format!(
            "Maven build failed (exit code {:?}):\n{}",
            out.code,
            last_lines(&format!("{}{}", out.stdout, out.stderr), 25)
        ));
    }

    let classes = project.join("target").join("classes");
    if classes.is_dir() {
        Ok(classes)
    } else {
        Err(format!(
            "Maven finished but {} does not exist",
            classes.display()
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cartella_senza_pom() {
        let err = build(Path::new(".")).unwrap_err();
        assert!(err.contains("pom.xml"));
    }
}
