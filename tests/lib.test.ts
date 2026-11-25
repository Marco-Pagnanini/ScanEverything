import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_FILTERS, applyFilters, groupFindings, severityCounts, whereOf } from "../src/lib/findings.ts";
import { readiness, runBlocker, shortPath, supportSteps } from "../src/lib/tools.ts";

const finding = (over: object) => ({
    tool: "spotbugs",
    rule: "RULE",
    title: "Title",
    severity: "medium",
    security: true,
    cwe: null,
    file: null,
    line: null,
    cve: null,
    package: null,
    description: null,
    ...over,
});

const findings = [
    finding({ severity: "high", cwe: "CWE-89", file: "com/example/Service.java", line: 23 }),
    finding({ tool: "semgrep oss", severity: "high", cwe: "CWE-89", file: "src/main/java/com/example/Service.java", line: 23 }),
    finding({ severity: "medium", cwe: "CWE-328", file: "com/example/Service.java", line: 39 }),
    finding({ severity: "medium", security: false, cwe: "CWE-173", file: "com/example/Service.java", line: 39 }),
    finding({
        tool: "dependency-check",
        severity: "critical",
        cve: "CVE-2021-44228",
        file: "pom.xml",
        package: "pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1",
    }),
] as never[];

const tools = [
    { id: "spotbugs", name: "SpotBugs", kind: "static", description: "", needs: ["classes"], source: null },
    { id: "dependency-check", name: "Dependency-Check", kind: "static", description: "", needs: ["dependencies"], source: null },
    { id: "semgrep", name: "Semgrep", kind: "static", description: "", needs: [], source: "/tools/semgrep.toml" },
] as never[];

const checks = [
    { tool: "maven", name: "Maven", ok: true, detail: "3.9.6" },
    { tool: "spotbugs", name: "spotbugs", ok: true, detail: "4.8.6" },
    { tool: "dependency-check", name: "NVD_API_KEY", ok: false, detail: "not set" },
];

test("security only hides quality findings", () => {
    assert.equal(applyFilters(findings, DEFAULT_FILTERS).length, 4);
    assert.equal(applyFilters(findings, { ...DEFAULT_FILTERS, securityOnly: false }).length, 5);
});

test("severity, tool and search filters combine", () => {
    assert.equal(applyFilters(findings, { ...DEFAULT_FILTERS, severity: "high" }).length, 2);
    assert.equal(applyFilters(findings, { ...DEFAULT_FILTERS, severity: "high", tools: ["semgrep oss"] }).length, 1);
    assert.equal(applyFilters(findings, { ...DEFAULT_FILTERS, query: "cve-2021" }).length, 1);
    assert.equal(applyFilters(findings, { ...DEFAULT_FILTERS, severity: "low" }, true).length, 4);
});

test("counts follow the findings they are given", () => {
    assert.deepEqual(severityCounts(applyFilters(findings, DEFAULT_FILTERS)), { critical: 1, high: 2, medium: 1, low: 0 });
});

test("groups put the worst severity first, then the larger group", () => {
    const byCwe = groupFindings(applyFilters(findings, DEFAULT_FILTERS), "cwe");
    assert.deepEqual(byCwe.map((g) => g.key), ["No CWE", "CWE-89", "CWE-328"]);
    assert.equal(byCwe[1].items.length, 2);
});

test("location is short in the row and full in the detail", () => {
    assert.deepEqual(whereOf(findings[0]), { short: "Service.java:23", full: "com/example/Service.java:23" });
    assert.equal(whereOf(findings[4])?.short, "log4j-core@2.14.1");
    assert.equal(whereOf(finding({}) as never), null);
});

test("readiness needs every check of a tool to pass", () => {
    assert.equal(readiness(null, "spotbugs"), "checking");
    assert.equal(readiness(checks, "spotbugs"), "ready");
    assert.equal(readiness(checks, "dependency-check"), "blocked");
    assert.equal(readiness([], "maven"), "blocked");
});

test("the run button explains why it is disabled", () => {
    const all = ["spotbugs", "dependency-check", "semgrep"];
    assert.equal(runBlocker({ input: null, selected: all, tools, checks }), "Choose a project first");
    assert.equal(runBlocker({ input: "/p", selected: [], tools, checks }), "Turn on at least one tool");
    assert.equal(runBlocker({ input: "/p", selected: all, tools, checks: null }), "Checking the tools…");
    assert.equal(runBlocker({ input: "/p", selected: all, tools, checks }), "Dependency-Check is not ready");
    assert.equal(runBlocker({ input: "/p", selected: ["spotbugs", "semgrep"], tools, checks }), null);
});

test("support steps follow what the chosen tools need", () => {
    assert.deepEqual(supportSteps(tools, ["semgrep"]).map((s) => s.name), []);
    assert.deepEqual(supportSteps(tools, ["dependency-check"]).map((s) => s.name), ["Copy dependencies"]);
    assert.deepEqual(supportSteps(tools, ["spotbugs", "dependency-check"]).map((s) => s.name), ["Build", "Copy dependencies"]);
});

test("long paths keep their end", () => {
    assert.equal(shortPath("/a/b", 34), "/a/b");
    assert.equal(shortPath("/Users/dev/code/Security/samples/vulnapp", 20), "…/samples/vulnapp");
});
