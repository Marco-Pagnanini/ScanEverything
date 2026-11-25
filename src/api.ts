import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { ScanReport } from "./bindings/ScanReport";
import type { ToolCatalog } from "./bindings/ToolCatalog";
import type { ToolCheck } from "./bindings/ToolCheck";

/* Commands */
export const listTools = () => invoke<ToolCatalog>("list_tools");
export const checkTools = () => invoke<ToolCheck[]>("check_tools");
export const scanProject = (input: string, tools: string[]) => invoke<ScanReport>("scan_project", { input, tools });
export const manifestTemplate = () => invoke<string>("manifest_template");
export const validateTool = (text: string) => invoke<string[]>("validate_tool", { text });
export const saveTool = (text: string) => invoke<string>("save_tool", { text });

/* Links */
export const openExternal = (url: string) => {
    openUrl(url);
};

/* Pickers */
export async function pickProject(): Promise<string | null> {
    const dir = await open({ directory: true, multiple: false, title: "Maven project to analyse" });
    return typeof dir === "string" ? dir : null;
}

export async function pickJar(): Promise<string | null> {
    const file = await open({
        directory: false,
        multiple: false,
        title: "Jar to analyse",
        filters: [{ name: "Java archive", extensions: ["jar"] }],
    });
    return typeof file === "string" ? file : null;
}
