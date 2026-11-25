import type { CSSProperties, ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";
import "./Tag.css";

export type Tone =
    | "neutral"
    | "primary"
    | "static"
    | "dynamic"
    | "support"
    | "critical"
    | "high"
    | "medium"
    | "low"
    | "success"
    | "danger"
    | "warning";

const TONES: Record<Tone, string> = {
    neutral: "--muted-foreground",
    primary: "--primary",
    static: "--static",
    dynamic: "--dynamic",
    support: "--support",
    critical: "--sev-critical",
    high: "--sev-high",
    medium: "--sev-medium",
    low: "--sev-low",
    success: "--success",
    danger: "--danger",
    warning: "--warning",
};

export const toneColor = (tone: Tone) => `var(${TONES[tone]})`;

type Props = {
    tone?: Tone;
    outline?: boolean;
    mono?: boolean;
    icon?: IconName;
    title?: string;
    className?: string;
    children: ReactNode;
};

export function Tag({ tone = "neutral", outline, mono, icon, title, className, children }: Props) {
    return (
        <span
            className={cx("se-tag", outline && "se-tag--outline", mono && "se-mono", className)}
            style={{ "--tone": toneColor(tone) } as CSSProperties}
            title={title}
        >
            {icon && <Icon name={icon} size={10} />}
            {children}
        </span>
    );
}
