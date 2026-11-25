import { useEffect, useRef, type CSSProperties } from "react";
import { cx } from "../base";
import "./Ghost.css";

type Props = {
    width?: number | string;
    eyeRange?: string;
    follow?: boolean;
    live?: boolean;
    className?: string;
};

const REACH = 240;

export function Ghost({ width = 30, eyeRange = "1.8px", follow = false, live = true, className }: Props) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!follow) return;
        let frame = 0;
        const onMove = (e: MouseEvent) => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const el = ref.current;
                if (!el) return;
                const r = el.getBoundingClientRect();
                const dx = e.clientX - (r.left + r.width / 2);
                const dy = e.clientY - (r.top + r.height * 0.45);
                const d = Math.hypot(dx, dy) || 1;
                const k = Math.min(1, d / REACH);
                el.style.setProperty("--lx", ((dx / d) * k).toFixed(3));
                el.style.setProperty("--ly", ((dy / d) * k).toFixed(3));
            });
        };
        window.addEventListener("mousemove", onMove);
        return () => {
            window.removeEventListener("mousemove", onMove);
            cancelAnimationFrame(frame);
        };
    }, [follow]);

    return (
        <div
            ref={ref}
            className={cx("se-ghost", live && "se-ghost--live", className)}
            style={{ width, "--er": eyeRange } as CSSProperties}
            aria-hidden="true"
        >
            <div className="se-ghost__body" />
            <span className="se-ghost__eye se-ghost__eye--l" />
            <span className="se-ghost__eye se-ghost__eye--r" />
        </div>
    );
}
