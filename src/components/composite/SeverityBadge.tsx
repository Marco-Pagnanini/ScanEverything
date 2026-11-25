import type { Severity } from "../../bindings/Severity";
import { Tag } from "../base";

export const SEVERITY_LABEL: Record<Severity, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
    return (
        <Tag tone={severity} icon={severity}>
            {SEVERITY_LABEL[severity]}
        </Tag>
    );
}
