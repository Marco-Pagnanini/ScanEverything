import type { ToolInfo } from "../bindings/ToolInfo";
import { Button } from "../components/base";
import { GhostOrbit, toolIcon } from "../components/composite";
import "./pages.css";

type Props = {
    tools: ToolInfo[];
    current: string | null;
    onOpenProject: () => void;
    onOpenJar: () => void;
    onContinue: () => void;
};

export function SplashPage({ tools, current, onOpenProject, onOpenJar, onContinue }: Props) {
    const items = tools.map((t) => ({ key: t.id, label: t.name, icon: toolIcon(t.id), tone: t.kind }));
    const count = tools.length === 1 ? "1 tool in the catalog" : `${tools.length} tools in the catalog`;

    return (
        <main className="se-splash">
            <div className="se-splash__orbit">
                <GhostOrbit items={items} />
            </div>
            <div className="se-splash__text">
                <h1>
                    Scan <span>Everything</span>
                </h1>

                <div className="se-splash__actions">
                    <Button variant="primary" size="lg" pill iconEnd="arrow" onClick={onOpenProject}>
                        Open a project
                    </Button>
                    <Button size="lg" pill icon="archive" onClick={onOpenJar}>
                        Open a jar
                    </Button>
                </div>
                <div className="se-splash__note">
                    <span>Java + Maven projects{tools.length > 0 && ` · ${count}`}</span>
                    {current && (
                        <Button variant="link" size="sm" iconEnd="arrow" onClick={onContinue}>
                            Continue with {current}
                        </Button>
                    )}
                </div>
            </div>
        </main>
    );
}
