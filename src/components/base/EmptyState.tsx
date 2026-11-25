import type { ReactNode } from "react";
import "./EmptyState.css";

type Props = {
    visual?: ReactNode;
    title: string;
    actions?: ReactNode;
    children?: ReactNode;
};

export function EmptyState({ visual, title, actions, children }: Props) {
    return (
        <div className="se-empty">
            {visual}
            <h2>{title}</h2>
            {children && <p>{children}</p>}
            {actions && <div className="se-empty__actions">{actions}</div>}
        </div>
    );
}
