import { useEffect, useState } from "react";
import { Button, Modal, Notice, TextArea } from "../base";
import "./ToolEditorModal.css";

const PLACEHOLDERS = ["{home}", "{out}", "{project}", "{name}", "{classes}", "{dependencies}", "{env:VAR}"];

type Result = { error: string } | { warnings: string[] } | null;

type Props = {
    open: boolean;
    folder: string;
    loadTemplate: () => Promise<string>;
    validate: (text: string) => Promise<string[]>;
    save: (text: string) => Promise<unknown>;
    onClose: () => void;
    onSaved: () => void;
};

export function ToolEditorModal({ open, folder, loadTemplate, validate, save, onClose, onSaved }: Props) {
    const [template, setTemplate] = useState("");
    const [draft, setDraft] = useState("");
    const [result, setResult] = useState<Result>(null);
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setResult(null);
        setConfirming(false);
        loadTemplate()
            .then((text) => {
                setTemplate(text);
                setDraft(text);
            })
            .catch((e) => setResult({ error: String(e) }));
    }, [open, loadTemplate]);

    function requestClose() {
        if (draft !== template && !confirming) setConfirming(true);
        else onClose();
    }

    async function onValidate() {
        setBusy(true);
        try {
            setResult({ warnings: await validate(draft) });
        } catch (e) {
            setResult({ error: String(e) });
        } finally {
            setBusy(false);
        }
    }

    async function onSave() {
        setBusy(true);
        try {
            await save(draft);
            onSaved();
        } catch (e) {
            setResult({ error: String(e) });
        } finally {
            setBusy(false);
        }
    }

    const footer = confirming ? (
        <div className="se-editor__footer">
            <span className="se-editor__confirm">Discard the changes to this manifest?</span>
            <Button onClick={() => setConfirming(false)}>Keep editing</Button>
            <Button variant="primary" onClick={onClose}>
                Discard
            </Button>
        </div>
    ) : (
        <div className="se-editor__footer">
            <Button variant="ghost" onClick={requestClose}>
                Cancel
            </Button>
            <Button onClick={onValidate} disabled={busy}>
                Validate
            </Button>
            <Button variant="primary" onClick={onSave} disabled={busy}>
                Save tool
            </Button>
        </div>
    );

    return (
        <Modal
            open={open}
            title="Add tool"
            subtitle={
                <>
                    The manifest is saved in <code>{folder}</code>
                </>
            }
            footer={footer}
            onClose={requestClose}
        >
            <div className="se-editor">
                <TextArea
                    mono
                    rows={18}
                    aria-label="Tool manifest (TOML)"
                    value={draft}
                    onChange={(e) => {
                        setDraft(e.target.value);
                        setResult(null);
                    }}
                />
                <p className="se-editor__help">
                    Placeholders
                    {PLACEHOLDERS.map((p) => (
                        <code key={p}>{p}</code>
                    ))}
                </p>
                {result && "error" in result && (
                    <Notice tone="danger" title="This manifest is not valid" mono>
                        {result.error}
                    </Notice>
                )}
                {result && "warnings" in result && result.warnings.length === 0 && (
                    <Notice tone="success" title="Manifest is valid" />
                )}
                {result && "warnings" in result && result.warnings.length > 0 && (
                    <Notice tone="warning" title="Valid, with warnings">
                        {result.warnings.join("\n")}
                    </Notice>
                )}
            </div>
        </Modal>
    );
}
