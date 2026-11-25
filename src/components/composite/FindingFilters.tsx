import { Segmented, Switch, TextInput, cx } from "../base";
import type { Filters, GroupBy } from "../../lib/findings";
import "./FindingFilters.css";

const GROUPS: { value: GroupBy; label: string }[] = [
    { value: "none", label: "None" },
    { value: "file", label: "File" },
    { value: "cwe", label: "CWE" },
    { value: "tool", label: "Tool" },
];

type Props = {
    filters: Filters;
    onChange: (filters: Filters) => void;
    tools: string[];
    groupBy: GroupBy;
    onGroupBy: (groupBy: GroupBy) => void;
    shown: number;
    total: number;
};

export function FindingFilters({ filters, onChange, tools, groupBy, onGroupBy, shown, total }: Props) {
    function toggleTool(tool: string) {
        const has = filters.tools.includes(tool);
        onChange({ ...filters, tools: has ? filters.tools.filter((t) => t !== tool) : [...filters.tools, tool] });
    }

    return (
        <div className="se-filters">
            <Switch
                label="Security only"
                checked={filters.securityOnly}
                onChange={(securityOnly) => onChange({ ...filters, securityOnly })}
            />

            {tools.length > 1 && (
                <div className="se-filters__tools" role="group" aria-label="Filter by tool">
                    {tools.map((tool) => (
                        <button
                            key={tool}
                            className={cx("se-filters__chip", filters.tools.includes(tool) && "is-active")}
                            aria-pressed={filters.tools.includes(tool)}
                            onClick={() => toggleTool(tool)}
                        >
                            {tool}
                        </button>
                    ))}
                </div>
            )}

            <TextInput
                className="se-filters__search"
                icon="search"
                aria-label="Search findings"
                placeholder="Search title, rule, CWE, CVE, file"
                value={filters.query}
                onChange={(e) => onChange({ ...filters, query: e.target.value })}
            />

            <div className="se-filters__group">
                <span>Group by</span>
                <Segmented label="Group findings by" options={GROUPS} value={groupBy} onChange={onGroupBy} />
            </div>

            <span className="se-filters__count se-num" aria-live="polite">
                {shown} of {total} findings
            </span>
        </div>
    );
}
