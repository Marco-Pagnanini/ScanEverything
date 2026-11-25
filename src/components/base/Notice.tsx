import type { CSSProperties, ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";
import { toneColor } from "./Tag";
import "./Notice.css";

type NoticeTone = "danger" | "warning" | "success";

const ICONS: Record<NoticeTone, IconName> = { danger: "alert", warning: "alert", success: "check" };

type Props = {
    tone?: NoticeTone;
    title?: ReactNode;
    mono?: boolean;
    action?: ReactNode;
    children?: ReactNode;
};

export function Notice({ tone = "danger", title, mono, action, children }: Props) {
    return (
        <div
            className="se-notice"
            role={tone === "danger" ? "alert" : "status"}
            style={{ "--tone": toneColor(tone) } as CSSProperties}
        >
            <Icon name={ICONS[tone]} size={16} className="se-notice__icon" />
            <div className="se-notice__body">
                {title && <div className="se-notice__title">{title}</div>}
                {children && <div className={cx("se-notice__text", mono && "se-notice__text--mono")}>{children}</div>}
            </div>
            {action}
        </div>
    );
}
