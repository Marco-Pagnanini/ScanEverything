use std::io::ErrorKind;
use std::path::Path;
use std::process::Command;

use serde::Serialize;

use ts_rs::TS;

pub struct CommandOutput {
    pub code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

pub fn run(path: &str, args: &[&str], dir: &Path) -> Result<CommandOutput, String> {
    let output = Command::new(path)
        .args(args)
        .current_dir(dir)
        .output()
        .map_err(|e| match e.kind() {
            ErrorKind::NotFound => format!("Comando non trovato: {path}"),
            _ => format!("Errore eseguendo il comando {path}: {e}"),
        })?;

    Ok(CommandOutput {
        code: output.status.code(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ToolCheck {
    pub tool: String,
    pub name: String,
    pub ok: bool,
    pub detail: String,
}

impl ToolCheck {
    pub fn new(tool: &str, name: &str, ok: bool, detail: impl Into<String>) -> Self {
        ToolCheck {
            tool: tool.to_string(),
            name: name.to_string(),
            ok,
            detail: detail.into(),
        }
    }
}

pub fn check_tool(tool: &str, name: &str, program: &str, args: &[&str]) -> ToolCheck {
    match run(program, args, Path::new(".")) {
        Ok(out) if out.code == Some(0) => ToolCheck {
            tool: tool.to_string(),
            name: name.to_string(),
            ok: true,
            detail: first_useful_line(&out.stdout)
                .or_else(|| first_useful_line(&out.stderr))
                .unwrap_or_else(|| "installed".to_string()),
        },
        Ok(out) => ToolCheck {
            tool: tool.to_string(),
            name: name.to_string(),
            ok: false,
            detail: format!("{program} answered with exit code {:?}", out.code),
        },
        Err(e) => ToolCheck {
            tool: tool.to_string(),
            name: name.to_string(),
            ok: false,
            detail: e,
        },
    }
}

fn first_useful_line(text: &str) -> Option<String> {
    text.lines()
        .map(str::trim)
        .find(|l| !l.is_empty() && !l.starts_with("WARNING") && !l.starts_with("Picked up"))
        .map(str::to_string)
}

pub fn last_lines(text: &str, n: usize) -> String {
    let lines: Vec<&str> = text.lines().collect();
    let start = lines.len().saturating_sub(n);
    lines[start..].join("\n")
}

/*
    Tests
*/
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn programma_inesistente() {
        let check = check_tool("fake", "Fake", "programma-che-non-esiste-123", &["-version"]);
        assert!(!check.ok);
        assert!(check.detail.contains("non trovato"));
    }

    #[test]
    fn ultime_righe() {
        assert_eq!(last_lines("a\nb\nc", 2), "b\nc");
        assert_eq!(last_lines("a", 5), "a");
    }
}
