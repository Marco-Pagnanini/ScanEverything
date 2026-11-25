import type { CSSProperties } from "react";
import type { ToolInfo } from "../../bindings/ToolInfo";
import { Icon, toneColor, type IconName } from "../base";
import { KINDS, NEED_LABEL, supportSteps, type SupportStep } from "../../lib/tools";
import { PipelineNode, type NodeStatus } from "./PipelineNode";
import "./PipelineGraph.css";

export type GraphNode =
    | { type: "support"; step: SupportStep }
    | { type: "tool"; tool: ToolInfo }
    | { type: "report" };

const TOOL_ICONS: Record<string, IconName> = {
    spotbugs: "bug",
    "dependency-check": "package",
    semgrep: "search",
};

export const toolIcon = (id: string): IconName => TOOL_ICONS[id] ?? "terminal";

type Props = {
    tools: ToolInfo[];
    selected: string[];
    statusOf: (node: GraphNode) => NodeStatus;
    onToggle?: (id: string) => void;
    disabled?: boolean;
};

export function PipelineGraph({ tools, selected, statusOf, onToggle, disabled }: Props) {
    const support = supportSteps(tools, selected);
    const bands = KINDS.map((k) => ({ ...k, tools: tools.filter((t) => t.kind === k.kind) })).filter((b) => b.tools.length > 0);
    const active = tools.filter((t) => selected.includes(t.id)).length;

    return (
        <div className="se-graph">
            <div className="se-graph__row">
                <div className="se-graph__start">
                    <Icon name="play" size={12} />
                    Start
                </div>
                {support.map((step) => (
                    <div key={step.name} className="se-graph__linked">
                        <span className="se-graph__link" aria-hidden="true" />
                        <PipelineNode
                            icon="build"
                            name={step.name}
                            tone="support"
                            kindLabel="Support step · Maven"
                            ins="project sources"
                            outs={step.makes}
                            status={statusOf({ type: "support", step })}
                        />
                    </div>
                ))}
            </div>

            {bands.map((band) => {
                const on = band.tools.filter((t) => selected.includes(t.id)).length;
                return (
                    <div key={band.kind} className="se-graph__stage">
                        <span className="se-graph__drop" aria-hidden="true" />
                        <section className="se-band" style={{ "--tone": toneColor(band.kind) } as CSSProperties}>
                            <header className="se-band__head">
                                <span className="se-band__mark" aria-hidden="true" />
                                <h2>{band.label}</h2>
                                <span className="se-band__hint">{band.hint}</span>
                                <span className="se-band__count">
                                    {onToggle
                                        ? `${on} of ${band.tools.length} on`
                                        : band.tools.length === 1
                                          ? "1 tool"
                                          : `${band.tools.length} tools`}
                                </span>
                            </header>
                            <div className="se-band__nodes">
                                {band.tools.map((tool) => (
                                    <PipelineNode
                                        key={tool.id}
                                        icon={toolIcon(tool.id)}
                                        name={tool.name}
                                        tone={band.kind}
                                        kindLabel={band.label}
                                        ins={tool.needs.map((n) => NEED_LABEL[n]).join(" · ") || "project sources"}
                                        outs="findings · SARIF"
                                        badge={tool.source ? "yours" : undefined}
                                        status={statusOf({ type: "tool", tool })}
                                        checked={selected.includes(tool.id)}
                                        disabled={disabled}
                                        onToggle={onToggle && (() => onToggle(tool.id))}
                                    />
                                ))}
                            </div>
                        </section>
                    </div>
                );
            })}

            <div className="se-graph__stage">
                <span className="se-graph__drop" aria-hidden="true" />
                <PipelineNode
                    icon="file"
                    name="Report"
                    tone="primary"
                    kindLabel="One list for every tool"
                    ins={`${active} ${active === 1 ? "tool" : "tools"}`}
                    outs="merged findings"
                    status={statusOf({ type: "report" })}
                />
            </div>
        </div>
    );
}
