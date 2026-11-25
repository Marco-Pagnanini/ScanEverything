import type { Need } from "../bindings/Need";
import type { ToolCheck } from "../bindings/ToolCheck";
import type { ToolInfo } from "../bindings/ToolInfo";
import type { ToolKind } from "../bindings/ToolKind";

export const MAVEN = "maven";

export type Readiness = "checking" | "ready" | "blocked";

export type SupportStep = { name: string; need: Need; makes: string };

export const KINDS: { kind: ToolKind; label: string; hint: string }[] = [
    { kind: "static", label: "Static analysis", hint: "reads code and dependencies, runs nothing" },
    { kind: "dynamic", label: "Dynamic analysis", hint: "runs the program and watches it" },
];

export const NEED_LABEL: Record<Need, string> = {
    classes: "compiled classes",
    dependencies: "dependency jars",
};

const SUPPORT_STEPS: SupportStep[] = [
    { name: "Build", need: "classes", makes: "compiled classes" },
    { name: "Copy dependencies", need: "dependencies", makes: "dependency jars" },
];

/* Readiness */
export function failedChecks(checks: ToolCheck[] | null, tool: string): ToolCheck[] {
    return (checks ?? []).filter((c) => c.tool === tool && !c.ok);
}

export function readiness(checks: ToolCheck[] | null, tool: string): Readiness {
    if (checks === null) return "checking";
    if (checks.length === 0) return "blocked";
    return failedChecks(checks, tool).length === 0 ? "ready" : "blocked";
}

export function runBlocker(state: {
    input: string | null;
    selected: string[];
    tools: ToolInfo[];
    checks: ToolCheck[] | null;
}): string | null {
    const { input, selected, tools, checks } = state;
    if (!input) return "Choose a project first";
    if (selected.length === 0) return "Turn on at least one tool";
    if (checks === null) return "Checking the tools…";
    if (checks.length === 0) return "The tool check did not finish";
    if (readiness(checks, MAVEN) === "blocked") return "Maven is not ready";
    const blocked = tools.find((t) => selected.includes(t.id) && readiness(checks, t.id) === "blocked");
    return blocked ? `${blocked.name} is not ready` : null;
}

/* Pipeline shape */
export function isJar(input: string | null): boolean {
    return !!input && input.toLowerCase().endsWith(".jar");
}

export function supportSteps(tools: ToolInfo[], selected: string[]): SupportStep[] {
    const chosen = tools.filter((t) => selected.includes(t.id));
    return SUPPORT_STEPS.filter((s) => chosen.some((t) => t.needs.includes(s.need)));
}

export function isToolStep(name: string, tools: ToolInfo[]): boolean {
    return tools.some((t) => t.name === name);
}

/* Paths */
export function baseName(path: string): string {
    return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

export function shortPath(path: string, max = 34): string {
    if (path.length <= max) return path;
    const tail = path.slice(path.length - max + 1);
    const cut = tail.search(/[\\/]/);
    return "…" + (cut > 0 ? tail.slice(cut) : tail);
}
