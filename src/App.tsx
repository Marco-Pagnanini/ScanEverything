import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";

type Severity = "critical" | "high" | "medium" | "low";

type Finding = {
    tool: string;
    rule: string;
    title: string;
    description: string | null;
    severity: Severity;
    security: boolean;
    cwe: string | null;
    cve: string | null;
    package: string | null;
    file: string | null;
    line: number | null;
};

type StepResult = {
    name: string;
    status: "ok" | "failed" | "skipped";
    findings: number;
    detail: string | null;
};

type ScanReport = { steps: StepResult[]; findings: Finding[] };

type ToolCheck = { name: string; ok: boolean; detail: string };

function App() {
    const [tools, setTools] = useState<ToolCheck[]>([]);
    const [input, setInput] = useState<string | null>(null);
    const [findings, setFindings] = useState<Finding[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [steps, setSteps] = useState<StepResult[]>([]);
    const [loading, setLoading] = useState(false);

    // All'apertura: controlla gli strumenti
    useEffect(() => {
        invoke<ToolCheck[]>("check_tools")
            .then(setTools)
            .catch((e) => setError(String(e)));
    }, []);

    const toolsOk = tools.length > 0 && tools.every((t) => t.ok);

    function pick(path: string) {
        setInput(path);
        setFindings([]);
        setError(null);
        setSteps([]);
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
        setLoading(true);
        if (!input) return;
        setError(null);
        setFindings([]);
        setRunning(true);
        try {
            const report = await invoke<ScanReport>("scan_project", { input });
            setSteps(report.steps);
            setFindings(report.findings);
        } catch (e) {
            setError(String(e));
        } finally {
            setRunning(false);
            setLoading(false);
        }
    }

    return (
        <main className="container" style={{ textAlign: "left" }}>
            <h1>Scan Everything</h1>

            <h3>Strumenti</h3>
            <ul>
                {tools.map((t) => (
                    <li key={t.name} style={{ color: t.ok ? "seagreen" : "tomato" }}>
                        {t.ok ? "✔" : "✘"} <b>{t.name}</b> — {t.detail}
                    </li>
                ))}
            </ul>

            <div className="row" style={{ gap: 8, justifyContent: "flex-start" }}>
                <button onClick={chooseProject} disabled={running}>Scegli progetto</button>
                <button onClick={chooseJar} disabled={running}>Scegli jar</button>
                <button onClick={scan} disabled={!input || !toolsOk || running}>
                    {running ? "Analisi in corso…" : "Analizza"}
                    {loading && <span className="spinner" style={{ marginLeft: 8 }}></span>}
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
                                    color:
                                        s.status === "ok" ? "seagreen" : s.status === "failed" ? "tomato" : "gray",
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
