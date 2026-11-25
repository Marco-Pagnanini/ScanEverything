import type { CSSProperties } from "react";
import type { Severity } from "../../bindings/Severity";
import { Icon, cx, toneColor } from "../base";
import { SEVERITIES } from "../../lib/findings";
import { SEVERITY_LABEL } from "./SeverityBadge";
import "./SeveritySummary.css";

type Props = {
    counts: Record<Severity, number>;
    scope: string;
    active: Severity | null;
    onPick: (severity: Severity | null) => void;
};

export function SeveritySummary({ counts, scope, active, onPick }: Props) {
    const total = SEVERITIES.reduce((sum, s) => sum + counts[s], 0);

    return (
        <div className="se-summary">
            <div className="se-summary__total">
                <span className="se-summary__number se-num">{total}</span>
                <span className="se-summary__scope">{scope}</span>
                <span className="se-summary__bar" aria-hidden="true">
                    {SEVERITIES.filter((s) => counts[s] > 0).map((s) => (
                        <span key={s} style={{ flexGrow: counts[s], background: toneColor(s) }} />
                    ))}
                </span>
            </div>

            <div className="se-summary__levels" role="group" aria-label="Filter by severity">
                {SEVERITIES.map((s) => (
                    <button
                        key={s}
                        className={cx("se-summary__level", active === s && "is-active", active !== null && active !== s && "is-dim")}
                        style={{ "--tone": toneColor(s) } as CSSProperties}
                        aria-pressed={active === s}
                        onClick={() => onPick(active === s ? null : s)}
                    >
                        <span className="se-summary__count se-num">{counts[s]}</span>
                        <span className="se-summary__name">
                            <Icon name={s} size={10} />
                            {SEVERITY_LABEL[s]}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
