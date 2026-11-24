use std::path::{Path, PathBuf};

use crate::porting::process::{ToolCheck, check_tool, last_lines, run};

/// Controlla che Maven sia installato.
pub fn check() -> ToolCheck {
        check_tool("maven", "Maven", "mvn", &["-version"])
}

fn mvn(project: &Path, args: &[&str]) -> Result<(), String> {
    if !project.join("pom.xml").is_file() {
        return Err(format!("No pom.xml in {}", project.display()));
    }

    let out = run("mvn", args, project)?;

    if out.code != Some(0) {
        return Err(format!(
            "Maven failed (exit code {:?}):\n{}",
            out.code,
            last_lines(&format!("{}{}", out.stdout, out.stderr), 25)
        ));
    }
    Ok(())
}



/// Step "Build": compila un progetto Maven.
/// Restituisce la cartella con le classi compilate (target/classes).
pub fn build(project: &Path) -> Result<PathBuf, String> {
    mvn(project, &["-B", "-q", "package", "-DskipTests"])?;

    let classes = project.join("target").join("classes");
    if classes.is_dir() {
        Ok(classes)
    } else {
        Err(format!("Maven finished but {} does not exist", classes.display()))
    }
}

pub fn copy_dependencies(project: &Path) -> Result<PathBuf, String> {
    mvn(
        project,
        &["-B", "-q", "dependency:copy-dependencies", "-DincludeScope=runtime"],
    )?;

    let deps = project.join("target").join("dependency");
    std::fs::create_dir_all(&deps)
        .map_err(|e| format!("Cannot create {}: {e}", deps.display()))?;
    Ok(deps)
}

/*
    Tests
*/


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cartella_senza_pom() {
        let err = build(Path::new(".")).unwrap_err();
        assert!(err.contains("pom.xml"));
    }

        #[test]
    fn dipendenze_senza_pom() {
        let err = copy_dependencies(Path::new(".")).unwrap_err();
        assert!(err.contains("pom.xml"));
    }
}
