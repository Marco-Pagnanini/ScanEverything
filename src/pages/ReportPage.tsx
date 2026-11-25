import { useState } from "react";
import type { ScanReport } from "../bindings/ScanReport";
import { Button, Card, EmptyState, Notice, Spinner } from "../components/base";
import { FindingFilters, FindingList, SeveritySummary } from "../components/composite";
import {
    DEFAULT_FILTERS,
    applyFilters,
    groupFindings,
    isFiltered,
    severityCounts,
    toolsIn,
    type Filters,
    type GroupBy,
} from "../lib/findings";
import "./pages.css";

type Props = {
    report: ScanReport | null;
    running: boolean;
    onGoRun: () => void;
    onOpenUrl: (url: string) => void;
};

export function ReportPage({ report, running, onGoRun, onOpenUrl }: Props) {
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [groupBy, setGroupBy] = useState<GroupBy>("none");

    if (running) {
        return (
            <div className="se-page__loading">
                <Spinner /> The analysis is still running. The report appears when it ends.
            </div>
        );
    }

    const seeRun = (
        <Button variant="primary" iconEnd="arrow" onClick={onGoRun}>
            Go to Run
        </Button>
    );

    if (!report) {
        return (
            <EmptyState title="No report yet" actions={seeRun}>
                Run the pipeline and everything the tools find lands here, in one list.
            </EmptyState>
        );
    }

    const incomplete = report.steps.filter((s) => s.status !== "ok");

    if (report.findings.length === 0) {
        return incomplete.length === 0 ? (
            <EmptyState title="No problems found by the tools you ran">
                That covers only what these tools look for. A different tool may still find something.
            </EmptyState>
        ) : (
            <EmptyState title="No findings, but the run was incomplete" actions={seeRun}>
                {incomplete.map((s) => s.name).join(", ")} did not finish, so this result says little.
            </EmptyState>
        );
    }

    const shown = applyFilters(report.findings, filters);
    const counts = severityCounts(applyFilters(report.findings, filters, true));
    const quality = report.findings.filter((f) => !f.security).length;
    const onlyQuality = shown.length === 0 && filters.securityOnly && !isFiltered(filters);

    return (
        <div className="se-page">
            {incomplete.length > 0 && (
                <Notice
                    tone="warning"
                    title="This report is incomplete"
                    action={
                        <Button size="sm" onClick={onGoRun}>
                            See the run
                        </Button>
                    }
                >
                    {incomplete.map((s) => `${s.name} ${s.status === "failed" ? "failed" : "was skipped"}`).join(" · ")}
                </Notice>
            )}

            <SeveritySummary
                counts={counts}
                scope={filters.securityOnly ? "security findings" : "findings, security and quality"}
                active={filters.severity}
                onPick={(severity) => setFilters({ ...filters, severity })}
            />

            <Card flush>
                <FindingFilters
                    filters={filters}
                    onChange={setFilters}
                    tools={toolsIn(report.findings)}
                    groupBy={groupBy}
                    onGroupBy={setGroupBy}
                    shown={shown.length}
                    total={report.findings.length}
                />
                {shown.length > 0 && (
                    <FindingList
                        groups={groupFindings(shown, groupBy)}
                        grouped={groupBy !== "none"}
                        dimQuality={!filters.securityOnly}
                        onOpenUrl={onOpenUrl}
                    />
                )}
                {shown.length === 0 && onlyQuality && (
                    <div className="se-report__empty">
                        No security findings. {quality === 1 ? "1 quality finding is" : `${quality} quality findings are`} hidden.
                        <Button onClick={() => setFilters({ ...filters, securityOnly: false })}>Show all findings</Button>
                    </div>
                )}
                {shown.length === 0 && !onlyQuality && (
                    <div className="se-report__empty">
                        No findings match these filters.
                        <Button onClick={() => setFilters({ ...DEFAULT_FILTERS, securityOnly: filters.securityOnly })}>Clear filters</Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
