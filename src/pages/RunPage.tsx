import { useEffect, useState } from "react";
import type { ScanReport } from "../bindings/ScanReport";
import type { ToolInfo } from "../bindings/ToolInfo";
import { Button, Card, Icon, Notice, Spinner, cx } from "../components/base";
import { PipelineGraph, StepResults, stepOutcome, type GraphNode, type NodeStatus } from "../components/composite";
import { baseName, isToolStep } from "../lib/tools";
import "./pages.css";

type Props = {
    tools: ToolInfo[];
    selected: string[];
    input: string | null;
    running: boolean;
    startedAt: number | null;
    report: ScanReport | null;
    error: string | null;
    onRetry: () => void;
    onOpenReport: () => void;
};

function useElapsed(startedAt: number | null, running: boolean): string {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (!running) return;
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [running]);

    const seconds = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function RunPage({ tools, selected, input, running, startedAt, report, error, onRetry, onOpenReport }: Props) {
    const elapsed = useElapsed(startedAt, running);
    const chosen = tools.filter((t) => selected.includes(t.id));
    const slow = chosen.some((t) => t.id === "dependency-check");

    function statusOf(node: GraphNode): NodeStatus {
        if (running) return { state: "busy", text: node.type === "report" ? "Waiting for the tools" : "Waiting for the result" };
        if (node.type === "report") {
            if (!report) return { state: "idle", text: "Not run yet" };
            return { state: "ok", text: report.findings.length === 1 ? "1 finding" : `${report.findings.length} findings` };
        }
        const name = node.type === "tool" ? node.tool.name : node.step.name;
        const step = report?.steps.find((s) => s.name === name);
        if (!step) return { state: "idle", text: "Not run yet" };
        const text = stepOutcome(step, node.type === "tool");
        if (step.status === "ok") return { state: "ok", text };
        return { state: step.status === "failed" ? "error" : "idle", text, hint: step.detail ?? undefined };
    }

    const security = report?.findings.filter((f) => f.security).length ?? 0;
    const failed = report?.steps.filter((s) => s.status === "failed").length ?? 0;

    return (
        <div className="se-page">
            {error && (
                <Notice
                    tone="danger"
                    title="The analysis could not run"
                    mono
                    action={
                        <Button size="sm" onClick={onRetry}>
                            Try again
                        </Button>
                    }
                >
                    {error}
                </Notice>
            )}

            {!error && (
                <div className={cx("se-runbar", running && "is-running", report && "is-done")}>
                    <span className="se-runbar__mark">
                        {running ? <Spinner size={16} /> : <Icon name={report ? "check" : "play"} size={16} strokeWidth={2.4} />}
                    </span>
                    {running && (
                        <>
                            <div className="se-runbar__text">
                                <h2>Analysis running</h2>
                                <p>
                                    Results arrive together, when every tool has finished.
                                    {slow && " Dependency-Check can take a few minutes."}
                                </p>
                            </div>
                            <span className="se-runbar__time" aria-label={`Elapsed time ${elapsed}`}>
                                <Icon name="clock" size={16} />
                                {elapsed}
                            </span>
                        </>
                    )}
                    {!running && report && (
                        <>
                            <div className="se-runbar__text">
                                <h2>Run finished</h2>
                                <p>
                                    {report.findings.length === 1 ? "1 finding" : `${report.findings.length} findings`}, {security} of them
                                    security.
                                    {failed > 0 && ` ${failed === 1 ? "1 step" : `${failed} steps`} failed, so the report is incomplete.`}
                                </p>
                            </div>
                            <Button variant="primary" iconEnd="arrow" onClick={onOpenReport}>
                                Open report
                            </Button>
                        </>
                    )}
                    {!running && !report && (
                        <div className="se-runbar__text">
                            <h2>No run yet</h2>
                            <p>
                                Run the pipeline to analyse {input ? baseName(input) : "your project"}. Each step shows here how it ended.
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div className="se-canvas">
                <PipelineGraph tools={chosen} selected={selected} statusOf={statusOf} />
            </div>

            {report && !running && (
                <Card title="Steps" subtitle="Open a step to read why it failed or was skipped" flush>
                    <StepResults steps={report.steps} isTool={(name) => isToolStep(name, tools)} />
                </Card>
            )}
        </div>
    );
}
