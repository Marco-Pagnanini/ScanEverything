import type { ReactElement, ReactNode } from "react";
import { Tooltip as AntTooltip } from "antd";

type Props = {
    content: ReactNode;
    placement?: "top" | "bottom" | "left" | "right";
    children: ReactElement;
};

export function Tooltip({ content, placement = "top", children }: Props) {
    return (
        <AntTooltip title={content} placement={placement} mouseEnterDelay={0.15}>
            {children}
        </AntTooltip>
    );
}
