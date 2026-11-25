import { useState } from "react";
import type { Finding } from "../../bindings/Finding";
import { Button, Icon, Tag, cx } from "../base";
import { cveUrl, cweUrl, whereOf, type FindingGroup } from "../../lib/findings";
import { SeverityBadge } from "./SeverityBadge";
import "./FindingList.css";

type Props = {
    groups: FindingGroup[];
    grouped: boolean;
    dimQuality: boolean;
    onOpenUrl: (url: string) => void;
};

export function FindingList({ groups, grouped, dimQuality, onOpenUrl }: Props) {
    const [closed, setClosed] = useState<string[]>([]);
    const [openRow, setOpenRow] = useState<string | null>(null);

    function toggleGroup(key: string) {
        setClosed((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key]));
    }

    return (
        <div className="se-findings">
            {groups.map((group) => {
                const open = !closed.includes(group.key);
                return (
                    <section key={group.key} className="se-findings__group">
                        {grouped && (
                            <button className="se-findings__group-head" aria-expanded={open} onClick={() => toggleGroup(group.key)}>
                                <Icon name="chevron" size={14} className={cx("se-findings__chevron", open && "is-open")} />
                                <span className="se-findings__group-name" title={group.key}>
                                    {group.label}
                                </span>
                                <span className="se-findings__group-count se-num">{group.items.length}</span>
                            </button>
                        )}
                        {open &&
                            group.items.map((finding, i) => {
                                const id = `${group.key}:${i}`;
                                return (
                                    <FindingRow
                                        key={id}
                                        finding={finding}
                                        open={openRow === id}
                                        dim={dimQuality && !finding.security}
                                        onToggle={() => setOpenRow(openRow === id ? null : id)}
                                        onOpenUrl={onOpenUrl}
                                    />
                                );
                            })}
                    </section>
                );
            })}
        </div>
    );
}

type RowProps = {
    finding: Finding;
    open: boolean;
    dim: boolean;
    onToggle: () => void;
    onOpenUrl: (url: string) => void;
};

function FindingRow({ finding: f, open, dim, onToggle, onOpenUrl }: RowProps) {
    const where = whereOf(f);
    const cwe = f.cwe ? cweUrl(f.cwe) : null;

    return (
        <div className={cx("se-finding", open && "is-open")}>
            <button className={cx("se-finding__row", dim && "is-dim")} aria-expanded={open} onClick={onToggle}>
                <SeverityBadge severity={f.severity} />
                <span className="se-finding__main">
                    <span className="se-finding__title">{f.title}</span>
                    <span className="se-finding__meta">
                        {(f.cve ?? f.cwe) && <span className="se-mono">{f.cve ?? f.cwe}</span>}
                        <span>{f.tool}</span>
                        {!f.security && <span>Quality</span>}
                    </span>
                </span>
                <span className="se-finding__where se-mono" title={where?.full}>
                    {where?.short ?? "No location"}
                </span>
            </button>

            {open && (
                <div className="se-finding__detail">
                    {f.description && <p className="se-finding__description">{f.description}</p>}
                    <dl>
                        <dt>Where</dt>
                        <dd className="se-mono">{where?.full ?? "The tool gave no file or package"}</dd>
                        <dt>Rule</dt>
                        <dd className="se-mono">{f.rule}</dd>
                        <dt>Tool</dt>
                        <dd>
                            {f.tool}
                            <Tag tone={f.security ? "primary" : "neutral"} outline={!f.security}>
                                {f.security ? "Security" : "Quality"}
                            </Tag>
                        </dd>
                        {f.cwe && (
                            <>
                                <dt>CWE</dt>
                                <dd>
                                    {cwe ? (
                                        <Button variant="link" size="sm" iconEnd="external" onClick={() => onOpenUrl(cwe)}>
                                            {f.cwe} on cwe.mitre.org
                                        </Button>
                                    ) : (
                                        f.cwe
                                    )}
                                </dd>
                            </>
                        )}
                        {f.cve && (
                            <>
                                <dt>CVE</dt>
                                <dd>
                                    <Button variant="link" size="sm" iconEnd="external" onClick={() => onOpenUrl(cveUrl(f.cve!))}>
                                        {f.cve} on nvd.nist.gov
                                    </Button>
                                </dd>
                            </>
                        )}
                    </dl>
                </div>
            )}
        </div>
    );
}
