import type { Finding } from "../bindings/Finding";
import type { Severity } from "../bindings/Severity";

export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

export type GroupBy = "none" | "file" | "cwe" | "tool";

export type Filters = {
    securityOnly: boolean;
    severity: Severity | null;
    tools: string[];
    query: string;
};

export type FindingGroup = { key: string; label: string; items: Finding[] };

export const DEFAULT_FILTERS: Filters = { securityOnly: true, severity: null, tools: [], query: "" };

/* Filters */
function matchesQuery(f: Finding, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [f.title, f.rule, f.cwe, f.cve, f.file, f.package].some((s) => s?.toLowerCase().includes(q));
}

export function applyFilters(findings: Finding[], filters: Filters, ignoreSeverity = false): Finding[] {
    return findings.filter(
        (f) =>
            (!filters.securityOnly || f.security) &&
            (ignoreSeverity || filters.severity === null || f.severity === filters.severity) &&
            (filters.tools.length === 0 || filters.tools.includes(f.tool)) &&
            matchesQuery(f, filters.query),
    );
}

export function isFiltered(filters: Filters): boolean {
    return filters.severity !== null || filters.tools.length > 0 || filters.query.trim() !== "";
}

/* Counts */
export function severityCounts(findings: Finding[]): Record<Severity, number> {
    const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of findings) counts[f.severity]++;
    return counts;
}

export function toolsIn(findings: Finding[]): string[] {
    return [...new Set(findings.map((f) => f.tool))];
}

/* Groups */
function groupKey(f: Finding, by: GroupBy): string {
    if (by === "file") return f.file ?? f.package ?? "No location";
    if (by === "cwe") return f.cwe ?? "No CWE";
    return f.tool;
}

function worst(items: Finding[]): number {
    return Math.min(...items.map((f) => SEVERITIES.indexOf(f.severity)));
}

export function groupFindings(findings: Finding[], by: GroupBy): FindingGroup[] {
    if (by === "none") return [{ key: "all", label: "", items: findings }];
    const groups = new Map<string, Finding[]>();
    for (const f of findings) {
        const key = groupKey(f, by);
        groups.set(key, [...(groups.get(key) ?? []), f]);
    }
    return [...groups.entries()]
        .map(([key, items]) => ({ key, label: by === "file" ? shortLocation(key) : key, items }))
        .sort((a, b) => worst(a.items) - worst(b.items) || b.items.length - a.items.length);
}

/* Location */
export function shortLocation(path: string): string {
    if (path.startsWith("pkg:")) return path.slice(path.lastIndexOf("/") + 1);
    return path.split(/[\\/]/).pop() ?? path;
}

export function whereOf(f: Finding): { short: string; full: string } | null {
    if (f.file && !f.package) {
        const line = f.line === null ? "" : `:${f.line}`;
        return { short: shortLocation(f.file) + line, full: f.file + line };
    }
    if (f.package) return { short: shortLocation(f.package), full: f.package };
    return null;
}

/* Links */
export function cweUrl(cwe: string): string | null {
    const id = cwe.match(/\d+/)?.[0];
    return id ? `https://cwe.mitre.org/data/definitions/${id}.html` : null;
}

export function cveUrl(cve: string): string {
    return `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cve)}`;
}
