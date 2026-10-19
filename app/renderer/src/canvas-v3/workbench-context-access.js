/**
 * `useWorkbench` 单独成文件（第 128 轮）。
 *
 * 原本在 `canvas-v3-hooks.js` 里，而 `project-command.js` 要用它、
 * `hooks` 又要用 `project-command` 的 `useResourceCommand` —— 形成
 * `hooks → project-command → hooks` 的 import 环（由 `check-tdz.mjs` 的 R3 检出）。
 */
import reactExports from "react";
import { WorkbenchContext } from "./contexts.js";

export function useWorkbench() {
  const workbench = reactExports.useContext(WorkbenchContext);
  if (!workbench) throw new Error("WorkbenchProvider is required");
  return workbench;
}
