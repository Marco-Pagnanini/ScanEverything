import { useState, type CSSProperties, type ReactNode } from "react";
import type { ToolCheck } from "../../bindings/ToolCheck";
import { Icon, Spinner, StatusDot, Tag, cx, toneColor, type IconName, type Tone } from "../base";
import type { Readiness } from "../../lib/tools";
import "./ToolRow.css";

const READINESS: Record<Readiness, { label: string; dot: "ok" | "error" | "pending" }> = {
    ready: { label: "Ready", dot: "ok" },
    blocked: { label: "Not ready", dot: "error" },
    checking: { label: "Checking", dot: "pending" },
};

type Props = {
    icon: IconName;
    tone: Tone;
    name: string;
    badge?: string;
    description: string;
    readiness: Readiness;
    checks: ToolCheck[];
    facts?: { label: string; value: ReactNode }[];
};

export function ToolRow({ icon, tone, name, badge, description, readiness, checks, facts = [] }: Props) {
    const [toggled, setToggled] = useState<boolean | null>(null);
    const open = toggled ?? readiness === "blocked";
    const state = READINESS[readiness];

    return (
        <div className="se-tool" style={{ "--tone": toneColor(tone) } as CSSProperties}>
            <button className="se-tool__head" aria-expanded={open} onClick={() => setToggled(!open)}>
                <span className="se-tool__tile">
                    <Icon name={icon} size={18} strokeWidth={1.9} />
                </span>
                <span className="se-tool__titles">
                    <span className="se-tool__name">
                        {name}
                        {badge && <Tag tone="primary">{badge}</Tag>}
                    </span>
                    <span className="se-tool__desc">{description}</span>
                </span>
                <span className={cx("se-tool__state", `is-${readiness}`)}>
                    <StatusDot tone={state.dot} />
                    {state.label}
                </span>
                <Icon name="chevron" size={16} className={cx("se-tool__chevron", open && "is-open")} />
            </button>

            {open && (
                <dl className="se-tool__detail">
                    <dt>Checks</dt>
                    <dd>
                        {readiness === "checking" && (
                            <span className="se-tool__check">
                                <Spinner size={11} /> Looking for it on this machine…
                            </span>
                        )}
                        {readiness === "blocked" && checks.length === 0 && "The check did not run. Reload to try again."}
                        {readiness === "ready" && checks.length === 0 && "Nothing to check."}
                        {checks.map((c) => (
                            <span key={c.name} className={cx("se-tool__check", c.ok ? "is-ok" : "is-failed")}>
                                <Icon name={c.ok ? "check" : "x"} size={13} strokeWidth={2.6} />
                                <b>{c.name}</b>
                                <code>{c.detail}</code>
                            </span>
                        ))}
                    </dd>
                    {facts.map((f) => (
                        <div key={f.label} className="se-tool__fact">
                            <dt>{f.label}</dt>
                            <dd>{f.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    );
}
