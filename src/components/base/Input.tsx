import type { ComponentProps } from "react";
import { Input as AntInput } from "antd";
import type { InputProps as AntInputProps } from "antd";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";
import "./Input.css";

export type TextInputProps = Omit<AntInputProps, "prefix" | "size"> & { icon?: IconName };

export function TextInput({ icon, className, ...rest }: TextInputProps) {
    return (
        <AntInput
            allowClear
            prefix={icon && <Icon name={icon} />}
            className={cx("se-input", className)}
            {...rest}
        />
    );
}

export type TextAreaProps = ComponentProps<typeof AntInput.TextArea> & { mono?: boolean };

export function TextArea({ mono, className, ...rest }: TextAreaProps) {
    return (
        <AntInput.TextArea
            spellCheck={false}
            className={cx("se-textarea", mono && "se-textarea--mono", className)}
            {...rest}
        />
    );
}
