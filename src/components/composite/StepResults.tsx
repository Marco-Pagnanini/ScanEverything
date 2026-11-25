import type { StepResult } from "../../bindings/StepResult";
import type { StepStatus } from "../../bindings/StepStatus";
import { Icon, cx, type IconName } from "../base";
import "./StepResults.css";

const STATUS: Record<StepStatus, { icon: IconName; label: string }> = {
    ok: { icon: "check", label: "Done" },
    failed: { icon: "alert", label: "Failed" },
    skipped: { icon: "minus", label: "Skipped" },
};

export function stepOutcome(step: StepResult, isTool: boolean): string {
    if (step.status !== "ok" || !isTool) return STATUS[step.status].label;
    return step.findings === 1 ? "1 finding" : `${step.findings} findings`;
}

type Props = {
    steps: StepResult[];
    isTool: (name: string) => boolean;
};

export function StepResults({ steps, isTool }: Props) {
    return (
        <div className="se-steps">
            {steps.map((step) => {
                const head = (
                    <>
                        <Icon name={STATUS[step.status].icon} size={14} strokeWidth={2.6} className="se-steps__icon" />
                        <span className="se-steps__name">{step.name}</span>
                        <span className="se-steps__outcome se-num">{stepOutcome(step, isTool(step.name))}</span>
                    </>
                );
                const className = cx("se-steps__step", `is-${step.status}`);

                if (!step.detail) {
                    return (
                        <div key={step.name} className={className}>
                            <div className="se-steps__head">{head}</div>
                        </div>
                    );
                }
                return (
                    <details key={step.name} className={className} open={step.status === "failed"}>
                        <summary className="se-steps__head">
                            {head}
                            <Icon name="chevron" size={14} className="se-steps__chevron" />
                        </summary>
                        <pre className="se-steps__detail">{step.detail}</pre>
                    </details>
                );
            })}
        </div>
    );
}
