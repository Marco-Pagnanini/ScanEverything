import type { ReactNode } from "react";
import { cx } from "./cx";
import "./Card.css";

type Props = {
    title?: ReactNode;
    subtitle?: ReactNode;
    actions?: ReactNode;
    flush?: boolean;
    className?: string;
    children: ReactNode;
};

export function Card({ title, subtitle, actions, flush, className, children }: Props) {
    return (
        <section className={cx("se-card", className)}>
            {(title || actions) && (
                <header className="se-card__head">
                    <div className="se-card__titles">
                        {title && <h2>{title}</h2>}
                        {subtitle && <p>{subtitle}</p>}
                    </div>
                    {actions}
                </header>
            )}
            <div className={cx("se-card__body", flush && "se-card__body--flush")}>{children}</div>
        </section>
    );
}
