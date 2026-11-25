import type { CSSProperties } from "react";
import { Icon, toneColor, type IconName, type Tone } from "../base";
import { Ghost } from "./Ghost";
import "./GhostOrbit.css";

export type OrbitItem = { key: string; label: string; icon: IconName; tone: Tone };

const BOX = 560;
const CENTER = BOX / 2;
const RADIUS = 232;
const MAX_ITEMS = 6;

function place(index: number, count: number) {
    const step = Math.min(60, 300 / count);
    const angle = ((-90 + (index - (count - 1) / 2) * step) * Math.PI) / 180;
    return { cos: Math.cos(angle), sin: Math.sin(angle) };
}

export function GhostOrbit({ items }: { items: OrbitItem[] }) {
    const shown = items.slice(0, MAX_ITEMS);
    const placed = shown.map((item, i) => ({ item, ...place(i, shown.length) }));

    return (
        <div className="se-orbit" aria-hidden="true">
            <div className="se-orbit__ring se-orbit__ring--outer" />
            <div className="se-orbit__ring se-orbit__ring--dashed" />
            <div className="se-orbit__ring se-orbit__ring--core" />
            <div className="se-orbit__sweep" />

            <svg className="se-orbit__lines" viewBox={`0 0 ${BOX} ${BOX}`}>
                {placed.map(({ item, cos, sin }, i) => {
                    const d = `M${CENTER + cos * (RADIUS - 32)},${CENTER + sin * (RADIUS - 32)} L${CENTER + cos * 112},${CENTER + sin * 112}`;
                    return (
                        <g key={item.key} style={{ color: toneColor(item.tone) }}>
                            <path className="se-orbit__track" d={d} />
                            <path className="se-orbit__packet" d={d} style={{ animationDelay: `${i * 1.4 + 0.5}s` }} />
                        </g>
                    );
                })}
            </svg>

            {placed.map(({ item, cos, sin }, i) => (
                <div
                    key={item.key}
                    className="se-orbit__tool"
                    style={
                        {
                            left: `${((CENTER + cos * RADIUS) / BOX) * 100}%`,
                            top: `${((CENTER + sin * RADIUS) / BOX) * 100}%`,
                            "--tone": toneColor(item.tone),
                            "--lit-delay": `${i * 1.4}s`,
                            "--float-delay": `${-i * 0.8}s`,
                        } as CSSProperties
                    }
                >
                    <span className="se-orbit__chip">
                        <Icon name={item.icon} size={22} />
                    </span>
                    <span className="se-orbit__label">{item.label}</span>
                </div>
            ))}

            <div className="se-orbit__ghost">
                <div className="se-orbit__bob">
                    <Ghost width="100%" eyeRange="1.43cqw" follow />
                </div>
                <div className="se-orbit__shadow" />
            </div>
        </div>
    );
}
