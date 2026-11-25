import type { ReactNode } from "react";
import { Modal as AntModal } from "antd";
import "./Modal.css";

type Props = {
    open: boolean;
    title: string;
    subtitle?: ReactNode;
    footer?: ReactNode;
    width?: number;
    onClose: () => void;
    children: ReactNode;
};

export function Modal({ open, title, subtitle, footer, width = 720, onClose, children }: Props) {
    return (
        <AntModal
            open={open}
            onCancel={onClose}
            width={width}
            centered
            destroyOnHidden
            className="se-modal"
            title={
                <div className="se-modal__head">
                    <h2>{title}</h2>
                    {subtitle && <p>{subtitle}</p>}
                </div>
            }
            footer={footer ?? null}
        >
            {children}
        </AntModal>
    );
}
