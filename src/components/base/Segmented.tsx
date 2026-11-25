import { Segmented as AntSegmented } from "antd";

type Props<T extends string> = {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
};

export function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
    return <AntSegmented<T> aria-label={label} options={options} value={value} onChange={onChange} />;
}
