import "./Status.css";

export type StatusTone = "ok" | "error" | "pending" | "off";

export function StatusDot({ tone }: { tone: StatusTone }) {
    return <span className={`se-dot se-dot--${tone}`} aria-hidden="true" />;
}

export function Spinner({ size = 14 }: { size?: number }) {
    return <span className="se-spinner" style={{ width: size, height: size }} role="status" aria-label="Loading" />;
}
