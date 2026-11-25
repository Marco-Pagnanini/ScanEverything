import { Button as AntButton } from "antd";
import type { ButtonProps as AntButtonProps } from "antd";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";
import "./Button.css";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "link";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, Pick<AntButtonProps, "color" | "variant">> = {
    primary: { color: "primary", variant: "solid" },
    secondary: { color: "primary", variant: "outlined" },
    outline: { color: "default", variant: "outlined" },
    ghost: { color: "default", variant: "text" },
    link: { color: "primary", variant: "link" },
};

const SIZES = { sm: "small", md: "middle", lg: "large" } as const;

export type ButtonProps = Omit<AntButtonProps, "type" | "color" | "variant" | "size" | "shape" | "icon"> & {
    variant?: Variant;
    size?: Size;
    pill?: boolean;
    icon?: IconName;
    iconEnd?: IconName;
};

export function Button({ variant = "outline", size = "md", pill, icon, iconEnd, className, children, ...rest }: ButtonProps) {
    const iconSize = size === "sm" ? 14 : 16;
    return (
        <AntButton
            {...VARIANTS[variant]}
            size={SIZES[size]}
            shape={pill ? "round" : "default"}
            icon={icon && <Icon name={icon} size={iconSize} />}
            className={cx("se-btn", className)}
            {...rest}
        >
            {children}
            {iconEnd && <Icon name={iconEnd} size={iconSize} />}
        </AntButton>
    );
}
