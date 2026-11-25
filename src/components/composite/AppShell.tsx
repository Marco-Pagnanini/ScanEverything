import type { ReactNode } from "react";
import { Button, Icon, Tooltip, cx, type IconName } from "../base";
import { baseName, shortPath } from "../../lib/tools";
import "./AppShell.css";

export type NavItem<T extends string> = {
    id: T;
    label: string;
    icon: IconName;
    badge?: { text: string; alert?: boolean };
};

type Props<T extends string> = {
    nav: NavItem<T>[];
    page: T;
    onNavigate: (page: T) => void;
    onHome: () => void;
    input: string | null;
    busy: boolean;
    onOpenProject: () => void;
    onOpenJar: () => void;
    title: string;
    subtitle: string;
    actions?: ReactNode;
    children: ReactNode;
};

export function AppShell<T extends string>(props: Props<T>) {
    const { nav, page, onNavigate, onHome, input, busy, onOpenProject, onOpenJar, title, subtitle, actions, children } = props;
    const name = input ? baseName(input) : null;

    return (
        <div className="se-shell">
            <aside className="se-side">
                <button className="se-side__brand" onClick={onHome} aria-label="Scan Everything, back to the start screen">
                    <span className="se-side__word">
                        Scan <b>Everything</b>
                    </span>
                    <span className="se-side__initials" aria-hidden="true">
                        S<b>E</b>
                    </span>
                </button>

                <div className="se-side__label">Menu</div>
                <nav className="se-side__nav" aria-label="Sections">
                    {nav.map((item) => (
                        <button
                            key={item.id}
                            className={cx("se-side__item", item.id === page && "is-current")}
                            aria-current={item.id === page ? "page" : undefined}
                            title={item.label}
                            onClick={() => onNavigate(item.id)}
                        >
                            <Icon name={item.icon} size={20} />
                            <span className="se-side__text">{item.label}</span>
                            {item.badge && (
                                <span className={cx("se-side__badge", item.badge.alert && "is-alert")}>{item.badge.text}</span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="se-side__spacer" />

                <div className="se-side__label">Project</div>
                <div className="se-side__project">
                    <div className="se-side__project-row" title={input ?? undefined}>
                        <span className="se-side__tile" aria-hidden="true">
                            {name ? name[0].toUpperCase() : "?"}
                        </span>
                        <span className="se-side__text se-side__project-text">
                            <b>{name ?? "No project chosen"}</b>
                            {input && <code>{shortPath(input, 28)}</code>}
                        </span>
                    </div>
                    <div className="se-side__project-actions">
                        <Tooltip content="Open a Maven project folder" placement="right">
                            <Button variant="ghost" size="sm" icon="folder" disabled={busy} onClick={onOpenProject} aria-label="Open project">
                                <span className="se-side__text">Open project</span>
                            </Button>
                        </Tooltip>
                        <Tooltip content="Open a .jar file" placement="right">
                            <Button variant="ghost" size="sm" icon="archive" disabled={busy} onClick={onOpenJar} aria-label="Open jar">
                                <span className="se-side__text">Open jar</span>
                            </Button>
                        </Tooltip>
                    </div>
                </div>
            </aside>

            <main className="se-main">
                <header className="se-main__head">
                    <div className="se-main__titles">
                        <h1>{title}</h1>
                        <p>{subtitle}</p>
                    </div>
                    {actions && <div className="se-main__actions">{actions}</div>}
                </header>
                <div className="se-main__body" key={page}>
                    {children}
                </div>
            </main>
        </div>
    );
}
