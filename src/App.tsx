import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";
import type { Finding } from "./bindings/Finding";
import type { ScanReport } from "./bindings/ScanReport";
import type { StepResult } from "./bindings/StepResult";
import type { ToolCheck } from "./bindings/ToolCheck";
import type { ToolInfo } from "./bindings/ToolInfo";

const GROUPS = [
    { kind: "static", label: "Analisi statica" },
    { kind: "dynamic", label: "Analisi dinamica" },
] as const;

function App() {
    const [catalog, setCatalog] = useState<ToolInfo[]>([]);
    const [tools, setTools] = useState<ToolCheck[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [input, setInput] = useState<string | null>(null);
    const [steps, setSteps] = useState<StepResult[]>([]);
    const [findings, setFindings] = useState<Finding[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);

    useEffect(() => {
        invoke<ToolInfo[]>("list_tools")
            .then((list) => {
                setCatalog(list);
                setSelected(list.map((t) => t.id));
            })
            .catch((e) => setError(String(e)));

        invoke<ToolCheck[]>("check_tools")
            .then(setTools)
            .catch((e) => setError(String(e)));
    }, []);

    const ready = (tool: string) => tools.filter((t) => t.tool === tool).every((t) => t.ok);
    const canRun = tools.length > 0 && selected.length > 0 && ready("maven") && selected.every(ready);

    function toggle(id: string) {
        setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    }

    function pick(path: string) {
        setInput(path);
        setSteps([]);
        setFindings([]);
        setError(null);
    }

    async function chooseProject() {
        const dir = await open({ directory: true, multiple: false, title: "Progetto Maven da analizzare" });
        if (typeof dir === "string") pick(dir);
    }

    async function chooseJar() {
        const file = await open({
            directory: false,
            multiple: false,
            title: "Jar da analizzare",
            filters: [{ name: "Java archive", extensions: ["jar"] }],
        });
        if (typeof file === "string") pick(file);
    }

    async function scan() {
        if (!input) return;
        setError(null);
        setSteps([]);
        setFindings([]);
        setRunning(true);
        try {
            const report = await invoke<ScanReport>("scan_project", { input, tools: selected });
            setSteps(report.steps);
            setFindings(report.findings);
        } catch (e) {
            setError(String(e));
        } finally {
            setRunning(false);
        }
    }

    return (
        <main className="container" style={{ textAlign: "left" }}>
            <h1>Scan Everything</h1>

            <h3>Strumenti</h3>
            <ul>
                {tools.map((t) => (
                    <li key={`${t.tool}-${t.name}`} style={{ color: t.ok ? "seagreen" : "tomato" }}>
                        {t.ok ? "✔" : "✘"} <b>{t.name}</b> — {t.detail}
                    </li>
                ))}
            </ul>

            <h3>Pipeline</h3>
            {GROUPS.map(({ kind, label }) => {
                const group = catalog.filter((t) => t.kind === kind);
                if (group.length === 0) return null;
                return (
                    <div key={kind} style={{ marginBottom: 8 }}>
                        <b>{label}</b>
                        {group.map((t) => (
                            <label key={t.id} style={{ display: "block" }}>
                                <input
                                    type="checkbox"
                                    checked={selected.includes(t.id)}
                                    onChange={() => toggle(t.id)}
                                    disabled={running}
                                />{" "}
                                {t.name}
                                {!ready(t.id) && <span style={{ color: "tomato" }}> — non pronto</span>}
                                <br />
                                <small style={{ opacity: 0.7 }}>{t.description}</small>
                            </label>
                        ))}
                    </div>
                );
            })}

            <div className="row" style={{ gap: 8, justifyContent: "flex-start", marginTop: 12 }}>
                <button onClick={chooseProject} disabled={running}>Scegli progetto</button>
                <button onClick={chooseJar} disabled={running}>Scegli jar</button>
                <button onClick={scan} disabled={!input || !canRun || running}>
                    {running ? "Analisi in corso…" : "Analizza"}
                    {running && <span className="spinner" style={{ marginLeft: 8 }}></span>}
                </button>
            </div>
            <p><code>{input ?? "Niente da analizzare"}</code></p>

            {error && <pre style={{ color: "tomato", whiteSpace: "pre-wrap" }}>{error}</pre>}

            {steps.length > 0 && (
                <>
                    <h3>Step</h3>
                    <ul>
                        {steps.map((s) => (
                            <li
                                key={s.name}
                                style={{
                                    color: s.status === "ok" ? "seagreen" : s.status === "failed" ? "tomato" : "gray",
                                }}
                            >
                                {s.status === "ok" ? "✔" : s.status === "failed" ? "✘" : "–"} <b>{s.name}</b>
                                {s.status === "ok" && ` — ${s.findings} finding`}
                                {s.detail && <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{s.detail}</pre>}
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {findings.length > 0 && (
                <p>
                    {findings.length} finding · {findings.filter((f) => f.security).length} di sicurezza
                </p>
            )}
            <ul>
                {findings.map((f, i) => (
                    <li key={i} style={{ opacity: f.security ? 1 : 0.55 }}>
                        {f.security && <b>SICUREZZA </b>}
                        [{f.severity}] {f.title}
                        {f.cwe && ` · ${f.cwe}`}
                        {" — "}
                        {f.package
                            ? `${f.package} (${f.file ?? ""})`
                            : f.file ? `${f.file}:${f.line ?? ""}` : "(nessun file)"}
                    </li>
                ))}
            </ul>
        </main>
    );
}

export default App;
