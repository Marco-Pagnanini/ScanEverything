import { cx } from "./cx";

const PATHS = {
    /* Navigation */
    pipeline: "M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9",
    run: "M22 12h-4l-3 9L9 3l-3 9H2",
    report: "M3 3v18h18M7 16v-5M12 16V7M17 16v-3",
    tools: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",

    /* Steps and tools */
    build: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z",
    bug: "M8 2l1.9 1.9M16 2l-1.9 1.9M9 7.1V6a3 3 0 0 1 6 0v1.1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.5 13H2M22 13h-4.5M6 17l-3 2M21 19l-3-2",
    package: "M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7 12 12l8.7-5M12 22V12",
    search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
    terminal: "M4 17l6-6-6-6M12 19h8",
    file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
    folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    archive: "M21 8v13H3V8M1 3h22v5H1zM10 12h4",

    /* Status */
    check: "M20 6 9 17l-5-5",
    alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
    x: "M18 6 6 18M6 6l12 12",
    minus: "M5 12h14",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4",

    /* Actions */
    plus: "M12 5v14M5 12h14",
    refresh: "M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16",
    chevron: "M9 6l6 6-6 6",
    arrow: "M5 12h14M13 6l6 6-6 6",
    external: "M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",

    /* Filled shapes */
    play: "M6 4l14 8-14 8z",
    critical: "M12 2l10 10-10 10L2 12z",
    high: "M12 3l10 18H2z",
    medium: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z",
    low: "M5 5h14v14H5z",
} as const;

const FILLED = new Set<string>(["play", "critical", "high", "medium", "low"]);

export type IconName = keyof typeof PATHS;

type Props = {
    name: IconName;
    size?: number;
    strokeWidth?: number;
    className?: string;
};

export function Icon({ name, size = 16, strokeWidth = 1.8, className }: Props) {
    const filled = FILLED.has(name);
    return (
        <svg
            className={cx("se-icon", className)}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke={filled ? "none" : "currentColor"}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ flex: "none" }}
        >
            <path d={PATHS[name]} />
        </svg>
    );
}
