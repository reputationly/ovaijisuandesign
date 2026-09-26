import { homedir } from "node:os";
import * as path from "node:path";

/**
 * 技能目录，和 gateway（app/gateway/src/skills/skill-paths.ts）、主进程（roots.ts）同一套规则。
 * 主进程起 opencode 时会显式给 HUB_SKILLS_DIR / HUB_USER_SKILLS_DIR；下面的默认值只在单独跑时兜底。
 * 每次调用都重读环境变量：测试在同一进程里换临时目录。
 */
function hubRoot(): string {
  return process.env.HILO_DATA_DIR?.trim() || path.join(homedir(), ".ovhub");
}

/** 自带 / 已装的技能。 */
export function installedSkillsDir(): string {
  return process.env.HUB_SKILLS_DIR || path.join(hubRoot(), "skills");
}

/** 用户导入、fork 出来的技能。 */
export function userSkillsDir(): string {
  const env = process.env.HUB_USER_SKILLS_DIR?.trim();
  if (env) return env;
  const custom = process.env.HILO_DATA_DIR?.trim();
  if (custom) return path.join(custom, "user-skills");
  return path.join(homedir(), "Movies", "蒜狸小助手", "skills");
}

/** 扫描顺序 user > installed > EXTRA_SKILLS_DIRS，同名先到先得。 */
export function allSkillsDirs(): string[] {
  return [...new Set([userSkillsDir(), installedSkillsDir(), ...parseExtraSkillsDirs()])];
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
