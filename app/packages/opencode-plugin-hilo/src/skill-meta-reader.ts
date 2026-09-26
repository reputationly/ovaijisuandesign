import * as fs from "node:fs";
import * as path from "node:path";

import yaml from "js-yaml";

import { allSkillsDirs } from "./skill-paths.js";

/**
 * 技能被加载（模型调了内置 `skill` 工具）时，读它 SKILL.md 里声明要用的工具，授权给当前会话树里
 * 对应的 agent：
 * - `allowed-tools` / `tools`：给 media-agent；
 * - `allowed-tools-<agent>`：给指定 agent。
 *
 * agent 配置默认不放开某些 hub 工具，技能需要时靠这里临时授权 —— 不读的话技能一加载，
 * 下一步就因为没有权限卡住。
 *
 * 结果（包括"没有这个技能 / 没声明工具"）进程内永久缓存：技能文件改了要重启 opencode 才生效，
 * 这里没必要每次调用都读盘。
 */
export interface SkillToolMeta {
  /** `allowed-tools` / `tools` 声明的，给 media-agent。 */
  tools?: string[];
  /** `allowed-tools-<agent>` 声明的，按 agent 名分组。 */
  toolsByAgent?: Record<string, string[]>;
}

interface SkillFrontmatter {
  name?: string;
  tools?: string[];
  toolsByAgent?: Record<string, string[]>;
}

const cache = new Map<string, SkillToolMeta | null>();

export function readSkillMeta(skillName: string): SkillToolMeta | null {
  const cached = cache.get(skillName);
  if (cached !== undefined) return cached;
  const meta = scanForSkill(skillName);
  cache.set(skillName, meta);
  return meta;
}

/** 测试用：清空缓存。 */
export function _resetSkillMetaCacheForTests(): void {
  cache.clear();
}

function scanForSkill(skillName: string): SkillToolMeta | null {
  const mounted = scanMountedEvalSkillPaths(skillName);
  if (mounted !== undefined) return mounted;
  for (const dir of allSkillsDirs()) {
    const meta = readSkillMdMeta(path.join(dir, skillName, "SKILL.md"), skillName);
    if (meta !== undefined) return meta;
  }
  return null;
}

/** 评测时直接挂载的技能目录（path.delimiter 分隔），优先于常规目录。 */
function scanMountedEvalSkillPaths(skillName: string): SkillToolMeta | null | undefined {
  const raw = process.env.HILO_EVAL_SKILLS_PATHS;
  if (!raw) return undefined;
  for (const skillDir of raw.split(path.delimiter)) {
    const trimmed = skillDir.trim();
    if (!trimmed) continue;
    const meta = readSkillMdMeta(path.join(trimmed, "SKILL.md"), skillName);
    if (meta !== undefined) return meta;
  }
  return undefined;
}

/** undefined = 这里没有这个技能（继续找）；null = 找到了但没声明工具或读不了。 */
function readSkillMdMeta(skillMd: string, skillName: string): SkillToolMeta | null | undefined {
  if (!fs.existsSync(skillMd)) return undefined;
  try {
    const fm = parseSkillFrontmatter(fs.readFileSync(skillMd, "utf-8"));
    // 目录名和 frontmatter 里的名字对不上：不是要找的那个技能。
    if ((fm.name ?? skillName) !== skillName) return undefined;
    const out: SkillToolMeta = {};
    if (fm.tools && fm.tools.length > 0) out.tools = fm.tools;
    if (fm.toolsByAgent && Object.keys(fm.toolsByAgent).length > 0) out.toolsByAgent = fm.toolsByAgent;
    return out.tools || out.toolsByAgent ? out : null;
  } catch {
    return null;
  }
}

const AGENT_KEY_RE = /^allowed-tools-([a-zA-Z][a-zA-Z0-9_-]*)$/;

/**
 * 只取授权要用的字段：name、`allowed-tools`（旧写法 `tools`）、`allowed-tools-<agent>`。
 * 列表既可以是 YAML 数组，也可以是空格 / 逗号分隔的字符串。YAML 写坏了就当什么都没声明。
 */
export function parseSkillFrontmatter(content: string): SkillFrontmatter {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  let doc: unknown;
  try {
    doc = yaml.load(match[1]!);
  } catch {
    // YAML 写坏了：只宽松地认出 name（判断是不是要找的技能），工具一概不认。
    const m = /^name:\s*(.*?)\s*$/m.exec(match[1]!);
    const s = m?.[1]?.trim() ?? "";
    const name = s.length >= 2 && /^(["']).*\1$/.test(s) ? s.slice(1, -1) : s;
    return name ? { name } : {};
  }
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return {};
  const raw = doc as Record<string, unknown>;
  const result: SkillFrontmatter = {};
  const name = coerceString(raw.name);
  if (name !== undefined) result.name = name;
  const tools = coerceList(raw["allowed-tools"]) ?? coerceList(raw.tools);
  if (tools !== undefined) result.tools = tools;
  const byAgent: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    const m = AGENT_KEY_RE.exec(key);
    if (!m) continue;
    const list = coerceList(value);
    if (list && list.length > 0) byAgent[m[1]!] = list;
  }
  if (Object.keys(byAgent).length > 0) result.toolsByAgent = byAgent;
  return result;
}

function coerceString(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") {
    const s = v.trim();
    return s ? s : undefined;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

function coerceList(v: unknown): string[] | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) {
    const arr = v
      .map((item) => (item == null ? "" : String(item)))
      .map((s) => s.trim())
      .filter(Boolean);
    return arr.length > 0 ? arr : undefined;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return undefined;
    const arr = s.split(/[\s,]+/).filter(Boolean);
    return arr.length > 0 ? arr : undefined;
  }
  return undefined;
}
