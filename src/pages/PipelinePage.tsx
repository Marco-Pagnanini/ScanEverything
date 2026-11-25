import type { ToolCheck } from "../bindings/ToolCheck";
import type { ToolInfo } from "../bindings/ToolInfo";
import { Button, EmptyState, Spinner } from "../components/base";
import { PipelineGraph, type GraphNode, type NodeStatus } from "../components/composite";
import { MAVEN, failedChecks, isJar, readiness } from "../lib/tools";
import "./pages.css";

type Props = {
    tools: ToolInfo[];
    loading: boolean;
    selected: string[];
    checks: ToolCheck[] | null;
    input: string | null;
    running: boolean;
    onToggle: (id: string) => void;
    onGoTools: () => void;
};

function readyStatus(checks: ToolCheck[] | null, tool: string): NodeStatus {
    const state = readiness(checks, tool);
    if (state === "checking") return { state: "busy", text: "Checking…" };
    if (state === "ready") return { state: "ok", text: "Ready" };
    const failed = failedChecks(checks, tool);
    if (failed.length === 0) return { state: "error", text: "Could not be checked" };
    return {
        state: "error",
        text: `Not ready: ${failed[0].name}`,
        hint: failed.map((c) => `${c.name} — ${c.detail}`).join("\n"),
    };
}

export function PipelinePage({ tools, loading, selected, checks, input, running, onToggle, onGoTools }: Props) {
    if (loading) {
        return (
            <div className="se-page__loading">
                <Spinner /> Loading the tool catalog…
            </div>
        );
    }

    if (tools.length === 0) {
        return (
            <EmptyState
                title="No tools in the catalog"
                actions={
                    <Button variant="primary" onClick={onGoTools}>
                        Go to Tools
                    </Button>
                }
            >
                A pipeline needs at least one tool. Add a manifest and it shows up here.
            </EmptyState>
        );
    }

    function statusOf(node: GraphNode): NodeStatus {
        if (node.type === "support") {
            return isJar(input) ? { state: "idle", text: "Skipped for a jar" } : readyStatus(checks, MAVEN);
        }
        if (node.type === "tool") {
            return selected.includes(node.tool.id) ? readyStatus(checks, node.tool.id) : { state: "idle", text: "Off" };
        }
        return { state: "idle", text: selected.length > 0 ? "Waits for the tools" : "Nothing to merge" };
    }

    return (
        <div className="se-page">
            <div className="se-canvas">
                <PipelineGraph tools={tools} selected={selected} statusOf={statusOf} onToggle={onToggle} disabled={running} />
            </div>
        </div>
    );
}
