import type { CSSProperties } from "react";
import type { ToolCatalog } from "../bindings/ToolCatalog";
import type { ToolCheck } from "../bindings/ToolCheck";
import { Card, Notice, Spinner, toneColor } from "../components/base";
import { ToolRow, toolIcon } from "../components/composite";
import { KINDS, MAVEN, NEED_LABEL, readiness } from "../lib/tools";
import "./pages.css";

type Props = {
    catalog: ToolCatalog | null;
    checks: ToolCheck[] | null;
    loadError: string | null;
};

export function ToolsPage({ catalog, checks, loadError }: Props) {
    const checksOf = (tool: string) => (checks ?? []).filter((c) => c.tool === tool);

    return (
        <div className="se-page se-page--narrow">
            {loadError && (
                <Notice tone="danger" title="The tools could not be checked" mono>
                    {loadError}
                </Notice>
            )}
            {catalog && catalog.errors.length > 0 && (
                <Notice
                    tone="danger"
                    title={catalog.errors.length === 1 ? "1 manifest could not be loaded" : `${catalog.errors.length} manifests could not be loaded`}
                    mono
                >
                    {catalog.errors.join("\n")}
                </Notice>
            )}

            <section className="se-kind" style={{ "--tone": toneColor("support") } as CSSProperties}>
                <h2 className="se-kind__title">
                    Prerequisites <span>needed before any tool runs</span>
                </h2>
                <Card flush>
                    <ToolRow
                        icon="build"
                        tone="support"
                        name="Maven"
                        description="Compiles the project and collects its dependencies."
                        readiness={readiness(checks, MAVEN)}
                        checks={checksOf(MAVEN)}
                        facts={[{ label: "Used by", value: "Build and Copy dependencies, the two steps that prepare a project." }]}
                    />
                </Card>
            </section>

            {!catalog && !loadError && (
                <div className="se-page__loading">
                    <Spinner /> Loading the tool catalog…
                </div>
            )}

            {catalog &&
                KINDS.map(({ kind, label }) => {
                    const tools = catalog.tools.filter((t) => t.kind === kind);
                    if (tools.length === 0) return null;
                    return (
                        <section key={kind} className="se-kind" style={{ "--tone": toneColor(kind) } as CSSProperties}>
                            <h2 className="se-kind__title">
                                {label} <span>{tools.length === 1 ? "1 tool" : `${tools.length} tools`}</span>
                            </h2>
                            <Card flush>
                                {tools.map((tool) => (
                                    <ToolRow
                                        key={tool.id}
                                        icon={toolIcon(tool.id)}
                                        tone={kind}
                                        name={tool.name}
                                        badge={tool.source ? "yours" : undefined}
                                        description={tool.description}
                                        readiness={readiness(checks, tool.id)}
                                        checks={checksOf(tool.id)}
                                        facts={[
                                            {
                                                label: "Needs",
                                                value: tool.needs.map((n) => NEED_LABEL[n]).join(", ") || "Only the project folder",
                                            },
                                            {
                                                label: "Manifest",
                                                value: tool.source ? <code>{tool.source}</code> : "Bundled with the app",
                                            },
                                        ]}
                                    />
                                ))}
                            </Card>
                        </section>
                    );
                })}

            {catalog && (
                <p className="se-page__note">
                    Your own tools live in <code>{catalog.folder}</code>. Java projects only, for now.
                </p>
            )}
        </div>
    );
}
