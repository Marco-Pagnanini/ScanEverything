import type { ReactNode } from "react";
import { Switch as AntSwitch } from "antd";
import "./Switch.css";

type Props = {
    label: ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
};

export function Switch({ label, checked, onChange, disabled }: Props) {
    return (
        <label className="se-switch">
            <AntSwitch size="small" checked={checked} onChange={onChange} disabled={disabled} />
            <span>{label}</span>
        </label>
    );
}
