import type { CSSProperties } from "react";
import { Icon, Spinner, Tag, cx, toneColor, type IconName, type Tone } from "../base";
import "./PipelineNode.css";

export type NodeStatus = {
    state: "ok" | "error" | "busy" | "idle";
    text: string;
    note?: string;
    hint?: string;
};

const STATE_ICON: Record<"ok" | "error" | "idle", IconName> = { ok: "check", error: "alert", idle: "minus" };

type Props = {
    icon: IconName;
    name: string;
    tone: Tone;
    kindLabel: string;
    ins: string;
    outs: string;
    badge?: string;
    status: NodeStatus;
    checked?: boolean;
    disabled?: boolean;
    onToggle?: () => void;
};

export function PipelineNode({ icon, name, tone, kindLabel, ins, outs, badge, status, checked, disabled, onToggle }: Props) {
    const body = (
        <>
            <span className="se-node__head">
                <span className="se-node__tile">
                    <Icon name={icon} size={16} strokeWidth={2} />
                </span>
                <span className="se-node__titles">
                    <span className="se-node__name">
                        <span title={name}>{name}</span>
                        {badge && <Tag tone="primary">{badge}</Tag>}
                    </span>
                    <span className="se-node__kind">{kindLabel}</span>
                </span>
                {onToggle && (
                    <span className="se-node__check">
                        <Icon name="check" size={12} strokeWidth={3} />
                    </span>
                )}
            </span>
            <span className="se-node__io">
                <span>
                    <i>in</i>
                    <span>{ins}</span>
                </span>
                <span>
                    <i>out</i>
                    <span>{outs}</span>
                </span>
            </span>
            <span className={cx("se-node__status", `is-${status.state}`)}>
                {status.state === "busy" ? <Spinner size={10} /> : <Icon name={STATE_ICON[status.state]} size={12} strokeWidth={3} />}
                <span className="se-node__status-text">{status.text}</span>
                {status.note && <span className="se-node__note">{status.note}</span>}
            </span>
        </>
    );

    const shared = {
        className: cx("se-node", onToggle && "se-node--toggle", onToggle && !checked && "is-off"),
        style: { "--tone": toneColor(tone) } as CSSProperties,
        title: status.hint,
    };

    if (!onToggle) return <div {...shared}>{body}</div>;

    return (
        <button {...shared} role="switch" aria-checked={checked} aria-label={`${name}, ${status.text}`} disabled={disabled} onClick={onToggle}>
            {body}
        </button>
    );
}
