import { existsSync } from "node:fs";
import * as path from "node:path";

import { allSkillsDirs } from "./skill-paths.js";

/**
 * 内置浏览器工具（`hub_browser`）的前置条件：本会话树里先完整加载过操作说明技能，才准调用。
 * 不读说明直接上手，模型会乱点、乱填表单。
 *
 * 技能没装（磁盘上找不到）时不设这道门，免得要求一个加载不了的技能把工具锁死。
 * 目前 MCP 里没有提供 `hub_browser`，这道门实际不会触发；保留它是为了工具上线时行为一致。
 */
export const CONTROL_IN_APP_BROWSER_SKILL = "control-in-app-browser";

export class BrowserSkillRequiredError extends Error {
  readonly code = "BROWSER_SKILL_REQUIRED";
  readonly skill = CONTROL_IN_APP_BROWSER_SKILL;

  constructor() {
    super(
      'BROWSER_SKILL_REQUIRED: call skill({ "name": "control-in-app-browser" }) as the only tool call in one assistant step, wait for its complete body, then retry this hub_browser action. One successful load covers the rest of this session.',
    );
    this.name = "BrowserSkillRequiredError";
  }
}

/** skill 工具返回了非空正文才算加载成功（报错时 output 为空）。 */
export function isBrowserSkillLoadResult(args: unknown, resultText: unknown): boolean {
  const name = (args as { name?: unknown } | null | undefined)?.name;
  if (name !== CONTROL_IN_APP_BROWSER_SKILL) return false;
  return typeof resultText === "string" && resultText.trim().length > 0;
}

let browserSkillSeenOnDisk = false;

/** 看到过一次就记住：技能不会在运行中被删掉又需要重新放行。 */
export function isBrowserSkillInstalled(dirs: readonly string[] = allSkillsDirs()): boolean {
  if (browserSkillSeenOnDisk) return true;
  browserSkillSeenOnDisk = dirs.some((dir) => existsSync(path.join(dir, CONTROL_IN_APP_BROWSER_SKILL, "SKILL.md")));
  return browserSkillSeenOnDisk;
}
