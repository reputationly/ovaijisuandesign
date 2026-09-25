import { homedir } from "node:os";
import path from "node:path";

/**
 * 技能相关的目录。每次调用都重读环境变量：测试在同一进程里换临时目录。
 *
 * 两类技能目录：
 * - 已装技能（installed）：自带技能由主进程铺到这里，opencode 从这里加载；
 * - 用户技能（user）：用户导入、fork 出来的，可以删（进废纸篓）。
 *
 * 数据根和桌面主进程（app/desktop/src/main/roots.ts）保持一致；另一个同类应用的
 * `~/.hub`、`~/Movies/Hub` 一律不碰。
 */

/** agent 家目录。HILO_DATA_DIR 覆盖时和主进程一样整个换过去。 */
export function hubRoot(): string {
  return process.env.HILO_DATA_DIR?.trim() || path.join(homedir(), ".ovhub");
}

export function installedSkillsDir(): string {
  return process.env.HUB_SKILLS_DIR || path.join(hubRoot(), "skills");
}

/**
 * 用户技能目录，默认放在用户看得见的数据根下。
 * HILO_DATA_DIR 覆盖时数据根和 agent 家目录是同一个，换个名字，免得和已装技能挤在一个目录里分不出来源。
 */
export function userSkillsDir(): string {
  const env = process.env.HUB_USER_SKILLS_DIR?.trim();
  if (env) return env;
  const custom = process.env.HILO_DATA_DIR?.trim();
  if (custom) return path.join(custom, "user-skills");
  return path.join(homedir(), "Movies", "蒜狸小助手", "skills");
}

/** 扫描顺序 user > installed > EXTRA_SKILLS_DIRS，同名先到先得。 */
export function allSkillsDirs(): string[] {
  const dirs = [userSkillsDir(), installedSkillsDir(), ...parseExtraSkillsDirs()];
  return [...new Set(dirs)];
}

function parseExtraSkillsDirs(): string[] {
  const raw = process.env.EXTRA_SKILLS_DIRS;
  if (!raw) return [];
  const out: string[] = [];
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const expanded = trimmed.startsWith("~/") ? path.join(homedir(), trimmed.slice(2)) : trimmed === "~" ? homedir() : trimmed;
    const absolute = path.resolve(expanded);
    if (!out.includes(absolute)) out.push(absolute);
  }
  return out;
}

export function allSubAgentSkillsDirs(): string[] {
  return [path.join(userSkillsDir(), "sub-agent-skills"), path.join(installedSkillsDir(), "sub-agent-skills")];
}

export function userPermissionsFile(): string {
  return process.env.HILO_SKILL_PERMISSIONS_FILE || path.join(hubRoot(), "skill-permissions.json");
}

/** agent 配置的 base.json：技能的默认开关在 `agent.media-agent.permission.skill`。主进程把配置同步到 `<hubRoot>/.config-v2`。 */
export function baseConfigPath(): string {
  const dir = process.env.OPENCODE_CONFIG_DIR;
  if (dir) return path.join(dir, "base.json");
  return path.join(hubRoot(), ".config-v2", "base.json");
}

export function runtimeSkillsCachePath(): string {
  return path.join(hubRoot(), "runtimes", "opencode-skills-last-known-good.json");
}
