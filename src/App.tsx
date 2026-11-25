import { useCallback, useEffect, useState } from "react";
import type { ScanReport } from "./bindings/ScanReport";
import type { ToolCatalog } from "./bindings/ToolCatalog";
import type { ToolCheck } from "./bindings/ToolCheck";
import {
    checkTools,
    listTools,
    manifestTemplate,
    openExternal,
    pickJar,
    pickProject,
    saveTool,
    scanProject,
    validateTool,
} from "./api";
import { Button } from "./components/base";
import { AppShell, ToolEditorModal, type NavItem } from "./components/composite";
import { MAVEN, baseName, readiness, runBlocker } from "./lib/tools";
import { PipelinePage } from "./pages/PipelinePage";
import { ReportPage } from "./pages/ReportPage";
import { RunPage } from "./pages/RunPage";
import { SplashPage } from "./pages/SplashPage";
import { ToolsPage } from "./pages/ToolsPage";

type ShellPage = "pipeline" | "tools" | "run" | "report";
type Page = "splash" | ShellPage;

const TITLES: Record<ShellPage, string> = {
    pipeline: "Pipeline",
    tools: "Tools",
    run: "Run",
    report: "Report",
};

function App() {
    const [page, setPage] = useState<Page>("splash");
    const [catalog, setCatalog] = useState<ToolCatalog | null>(null);
    const [checks, setChecks] = useState<ToolCheck[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [input, setInput] = useState<string | null>(null);
    const [report, setReport] = useState<ScanReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [startedAt, setStartedAt] = useState<number | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);

    /* Tools */
    const loadTools = useCallback(() => {
        setChecks(null);
        setLoadError(null);
        listTools()
            .then((c) => {
                setCatalog(c);
                setSelected(c.tools.map((t) => t.id));
            })
            .catch((e) => setLoadError(String(e)));
        checkTools()
            .then(setChecks)
            .catch((e) => {
                setChecks([]);
                setLoadError(String(e));
            });
    }, []);

    useEffect(loadTools, [loadTools]);

    const tools = catalog?.tools ?? [];
    const blocker = runBlocker({ input, selected, tools, checks });

    function toggle(id: string) {
        setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    }

    /* Input */
    function pick(path: string | null) {
        if (!path) return;
        setInput(path);
        setReport(null);
        setError(null);
        if (page === "splash") setPage("pipeline");
    }

    const chooseProject = () => pickProject().then(pick);
    const chooseJar = () => pickJar().then(pick);

    /* Scan */
    async function scan() {
        if (!input || blocker || running) return;
        setError(null);
        setReport(null);
        setRunning(true);
        setStartedAt(Date.now());
        setPage("run");
        try {
            setReport(await scanProject(input, selected));
        } catch (e) {
            setError(String(e));
        } finally {
            setRunning(false);
        }
    }

    if (page === "splash") {
        return (
            <SplashPage
                tools={tools}
                current={input && baseName(input)}
                onOpenProject={chooseProject}
                onOpenJar={chooseJar}
                onContinue={() => setPage("pipeline")}
            />
        );
    }

    /* Shell */
    const project = input ? baseName(input) : "your project";
    const blocked = [MAVEN, ...tools.map((t) => t.id)].filter((id) => readiness(checks, id) === "blocked").length;
    const toolsAlert = loadError || (catalog?.errors.length ?? 0) > 0 ? "!" : blocked > 0 ? String(blocked) : null;

    const nav: NavItem<ShellPage>[] = [
        { id: "pipeline", label: "Pipeline", icon: "pipeline" },
        { id: "tools", label: "Tools", icon: "tools", badge: toolsAlert ? { text: toolsAlert, alert: true } : undefined },
        { id: "run", label: "Run", icon: "run" },
        {
            id: "report",
            label: "Report",
            icon: "report",
            badge: report && report.findings.length > 0 ? { text: String(report.findings.length) } : undefined,
        },
    ];

    const subtitles: Record<ShellPage, string> = {
        pipeline: `Choose what runs on ${project}. Click a tool to turn it on or off.`,
        tools: "What is installed on this machine, and what each tool still needs before it can run.",
        run: `Start the analysis of ${project} and see how each step ended.`,
        report: "Everything the tools found, merged into one list.",
    };

    const runAction = (
        <>
            {blocker && !running && <span className="se-main__hint">{blocker}</span>}
            <Button variant="primary" size="lg" pill icon="play" loading={running} disabled={!!blocker} onClick={scan}>
                {running ? "Analysis running…" : report ? "Run again" : "Run pipeline"}
            </Button>
        </>
    );

    const toolsAction = (
        <>
            <Button icon="refresh" disabled={running} onClick={loadTools}>
                Reload
            </Button>
            <Button variant="primary" icon="plus" disabled={running || !catalog} onClick={() => setEditorOpen(true)}>
                Add tool
            </Button>
        </>
    );

    return (
        <>
            <AppShell
                nav={nav}
                page={page}
                onNavigate={setPage}
                onHome={() => setPage("splash")}
                input={input}
                busy={running}
                onOpenProject={chooseProject}
                onOpenJar={chooseJar}
                title={TITLES[page]}
                subtitle={subtitles[page]}
                actions={page === "tools" ? toolsAction : runAction}
            >
                {page === "pipeline" && (
                    <PipelinePage
                        tools={tools}
                        loading={!catalog && !loadError}
                        selected={selected}
                        checks={checks}
                        input={input}
                        running={running}
                        onToggle={toggle}
                        onGoTools={() => setPage("tools")}
                    />
                )}
                {page === "tools" && <ToolsPage catalog={catalog} checks={checks} loadError={loadError} />}
                {page === "run" && (
                    <RunPage
                        tools={tools}
                        selected={selected}
                        input={input}
                        running={running}
                        startedAt={startedAt}
                        report={report}
                        error={error}
                        onRetry={scan}
                        onOpenReport={() => setPage("report")}
                    />
                )}
                {page === "report" && (
                    <ReportPage report={report} running={running} onGoRun={() => setPage("run")} onOpenUrl={openExternal} />
                )}
            </AppShell>

            <ToolEditorModal
                open={editorOpen}
                folder={catalog?.folder ?? ""}
                loadTemplate={manifestTemplate}
                validate={validateTool}
                save={saveTool}
                onClose={() => setEditorOpen(false)}
                onSaved={() => {
                    setEditorOpen(false);
                    loadTools();
                }}
            />
        </>
    );
}

export default App;
