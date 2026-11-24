import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

// Stessa forma della struct Rust (per ora scritta a mano;
// più avanti la genereremo automaticamente dal Rust).
type Severity = "critical" | "high" | "medium" | "low";

type Finding = {
    tool: string;
    rule: string;
    title: string;
    severity: Severity;
    security: boolean;
    cwe: string | null;
    file: string | null;
    line: number | null;
};

function App() {
    const [path, setPath] = useState("");
    const [findings, setFindings] = useState<Finding[]>([]);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        setError(null);
        try {
            const result = await invoke<Finding[]>("load_findings", { path });
            setFindings(result);
        } catch (e) {
            setFindings([]);
            setError(String(e));
        }
    }

    return (
        <main className="container">
            <h1>Scan Everything</h1>

            <form
                className="row"
                onSubmit={(e) => {
                    e.preventDefault();
                    load();
                }}
            >
                <input
                    value={path}
                    onChange={(e) => setPath(e.currentTarget.value)}
                    placeholder="Percorso completo di findings.json"
                    style={{ width: 420 }}
                />
                <button type="submit">Carica</button>
            </form>

            {error && <p style={{ color: "tomato" }}>{error}</p>}

            <p>{findings.length} finding</p>
            <ul style={{ textAlign: "left" }}>
                {findings.map((f, i) => (
                    <li key={i} style={{ opacity: f.security ? 1 : 0.55 }}>
                        {f.security && <b>SICUREZZA </b>}
                        [{f.severity}] {f.title}
                        {f.cwe && ` · ${f.cwe}`}
                        {" — "}
                        {f.file ? `${f.file}:${f.line ?? ""}` : "(nessun file)"}
                        {` (${f.tool} · ${f.rule})`}
                    </li>
                ))}
            </ul>
        </main>
    );
}

export default App;
