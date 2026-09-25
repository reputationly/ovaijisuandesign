import { readFile } from "node:fs/promises";
import path from "node:path";

import yaml from "js-yaml";

/**
 * SKILL.md frontmatter 和 meta.yaml 的解析。字段名、默认值、容错方式照参照的技能协议：
 * 技能包是参照原文，渲染层按这些字段名取值。
 */

export const SKILL_GUIDE_PROMPT_DEFAULTS = {
  zh: "为我解释一下这个技能的最佳使用方式。",
  en: "Show me the best way to use this skill with a few examples.",
} as const;

export const DEFAULT_SKILL_PACKAGE_VERSION = "0.1.0";

const SKILL_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

/** 技能名同时是目录名，这条规则挡掉了 `..`、路径分隔符和空名。 */
export function isValidSkillName(name: unknown): name is string {
  return typeof name === "string" && SKILL_NAME_RE.test(name);
}

export type ContentLocale = "zh-CN" | "en-US";

export interface StructuredInfoEntry {
  summary: string;
  best_for: string[];
  how_to_use: string;
  outputs: string;
}

export interface SkillMeta {
  name?: string;
  summary?: string;
  summaryZh?: string;
  description?: string;
  creator?: string;
  guidePrompt?: string;
  guidePromptEn?: string;
  displayNameZh?: string;
  version?: string;
  hash?: string;
  tagEn?: string;
  tagCn?: string;
  descEn?: string;
  descCn?: string;
  tools?: string[];
  tags?: string[];
  tagsCn?: string[];
  triggerWords?: string[];
  agents?: string[];
  completeTagsEn?: string[];
  completeTagsCn?: string[];
  priority?: number;
  injectMode?: "append" | "prepend";
  toolsByAgent?: Record<string, string[]>;
  showcase?: string[];
  structuredInfo?: Partial<Record<ContentLocale, StructuredInfoEntry>>;
  contentLocale?: ContentLocale;
  coverObjectKey?: string;
  showcaseObjectKey?: string;
  marketSource?: string;
  coverUrl?: string;
  coverUrlEn?: string;
  authorEn?: string;
  authorCn?: string;
  categoryCodes?: string[];
}

type Raw = Record<string, unknown>;

export function parseFrontmatter(content: string): SkillMeta {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  let doc: unknown;
  try {
    doc = yaml.load(match[1]!);
  } catch {
    return lenientFallback(match[1]!);
  }
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return {};
  const raw = doc as Raw;
  const result: SkillMeta = {};
  Object.assign(result, normalizeSkillDetailMetadata(raw));
  const stringMap: [string[], keyof SkillMeta][] = [
    [["name"], "name"],
    [["summary-en", "summary"], "summary"],
    [["summary-cn", "summary-zh"], "summaryZh"],
    [["creator"], "creator"],
    [["guide-prompt"], "guidePrompt"],
    [["guide-prompt-en"], "guidePromptEn"],
    [["display-name-zh"], "displayNameZh"],
    [["version"], "version"],
    [["hash"], "hash"],
    [["tag-en"], "tagEn"],
    [["tag-cn"], "tagCn"],
    [["desc-en"], "descEn"],
    [["desc-cn"], "descCn"],
  ];
  for (const [keys, dst] of stringMap) {
    for (const k of keys) {
      const s = coerceString(raw[k]);
      if (s !== undefined) {
        (result as Raw)[dst] = s;
        break;
      }
    }
  }
  const desc = coerceString(raw.description);
  if (desc !== undefined) result.description = desc;
  const listMap: [string[], keyof SkillMeta][] = [
    [["allowed-tools", "tools"], "tools"],
    [["tags"], "tags"],
    [["tags-cn"], "tagsCn"],
    [["trigger-words"], "triggerWords"],
    [["agents"], "agents"],
  ];
  for (const [keys, dst] of listMap) {
    for (const k of keys) {
      const arr = coerceList(raw[k]);
      if (arr !== undefined) {
        (result as Raw)[dst] = arr;
        break;
      }
    }
  }
  applyTags(raw, result);
  if (typeof raw.priority === "number" && Number.isFinite(raw.priority)) {
    result.priority = raw.priority;
  } else if (typeof raw.priority === "string") {
    const n = Number.parseInt(raw.priority, 10);
    if (Number.isFinite(n)) result.priority = n;
  }
  const injectMode = coerceString(raw["inject-mode"]);
  if (injectMode === "append" || injectMode === "prepend") result.injectMode = injectMode;
  const byAgent: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    const m = /^allowed-tools-([a-zA-Z][a-zA-Z0-9_-]*)$/.exec(key);
    if (!m) continue;
    const tools = coerceList(value);
    if (tools && tools.length > 0) byAgent[m[1]!] = tools;
  }
  if (Object.keys(byAgent).length > 0) result.toolsByAgent = byAgent;
  return result;
}

function applyTags(raw: Raw, out: SkillMeta): void {
  const en = reconcileTag(raw["tag-en"], raw["complete-tags-en"]);
  if (en.single) out.tagEn = en.single;
  if (en.list.length > 0) out.completeTagsEn = en.list;
  const cn = reconcileTag(raw["tag-cn"], raw["complete-tags-cn"]);
  if (cn.single) out.tagCn = cn.single;
  if (cn.list.length > 0) out.completeTagsCn = cn.list;
}

function coerceString(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

function coerceList(v: unknown): string[] | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) {
    const arr = v.map((item) => (item == null ? "" : String(item)).trim()).filter(Boolean);
    return arr.length > 0 ? arr : undefined;
  }
  if (typeof v === "string") {
    const arr = v.trim().split(/[\s,]+/).filter(Boolean);
    return arr.length > 0 ? arr : undefined;
  }
  return undefined;
}

/** YAML 写坏了（第三方技能常见：冒号没加引号）也要能认出名字，否则整个技能从列表里消失。 */
function lenientFallback(text: string): SkillMeta {
  const stringMap: [string[], keyof SkillMeta][] = [
    [["name"], "name"],
    [["summary-en", "summary"], "summary"],
    [["summary-cn", "summary-zh"], "summaryZh"],
    [["creator"], "creator"],
    [["display-name-zh"], "displayNameZh"],
    [["version"], "version"],
    [["hash"], "hash"],
    [["tag-en"], "tagEn"],
    [["tag-cn"], "tagCn"],
  ];
  const result: SkillMeta = {};
  for (const [keys, dst] of stringMap) {
    for (const k of keys) {
      const v = lenientStringField(text, k);
      if (v !== undefined) {
        (result as Raw)[dst] = v;
        break;
      }
    }
  }
  return result;
}

function lenientStringField(text: string, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^${escaped}:\\s*(.*?)\\s*$`, "m").exec(text);
  if (!m?.[1]) return undefined;
  const s = m[1].trim();
  if (s.length >= 2 && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))) return s.slice(1, -1) || undefined;
  return s || undefined;
}

export function matchesPattern(skillName: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith("*")) return skillName.startsWith(pattern.slice(0, -1));
  return skillName === pattern;
}

/** 精确名 > 最长前缀通配 > `*`；都没有算关。 */
export function isSkillEnabled(skillName: string, permissions: Record<string, string>): boolean {
  if (skillName in permissions) return permissions[skillName] === "allow";
  let best: string | null = null;
  for (const pattern of Object.keys(permissions)) {
    if (pattern === "*" || pattern === skillName) continue;
    if (matchesPattern(skillName, pattern) && pattern.length > (best?.length ?? 0)) best = pattern;
  }
  if (best) return permissions[best] === "allow";
  if ("*" in permissions) return permissions["*"] === "allow";
  return false;
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string" && x !== "");
  if (typeof v === "string" && v) return [v];
  return [];
}

function firstString(v: unknown): string {
  if (Array.isArray(v)) return (v.find((x) => typeof x === "string" && x !== "") as string | undefined) ?? "";
  return typeof v === "string" ? v : "";
}

function reconcileTag(tagRaw: unknown, completeRaw: unknown): { single: string; list: string[] } {
  const complete = toStringArray(completeRaw);
  const single = firstString(tagRaw) || complete[0] || "";
  if (complete.length > 0) return { single, list: complete };
  return { single, list: toStringArray(tagRaw) };
}

export function normalizeSkillContentLocale(value: unknown): ContentLocale {
  return typeof value === "string" && value.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
}

// 展示视频只认这几处 CDN：详情弹窗会直接把地址塞进 <video>，任意地址等于让技能包决定渲染层加载什么。
const SKILL_MEDIA_HOSTS = new Set(["cdn.hailuoai.com", "cdn.hailuoai.video"]);
const SKILL_SUBMISSION_MEDIA_HOST = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\.oss-[a-z0-9-]+\.aliyuncs\.com$/;
const SKILL_SUBMISSION_SHOWCASE_PATH = /^\/creator-plan\/[1-9]\d*\/[A-Za-z0-9._-]+\/showcase-\d+\.(mp4|webm|mov)$/;

function isSkillShowcaseUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    return (
      (SKILL_MEDIA_HOSTS.has(url.hostname) && /\.(mp4|webm|mov|gif|png|jpe?g|webp|jfif)$/i.test(url.pathname)) ||
      (SKILL_SUBMISSION_MEDIA_HOST.test(url.hostname) && !url.hostname.includes("-internal.") && SKILL_SUBMISSION_SHOWCASE_PATH.test(decodeURIComponent(url.pathname)))
    );
  } catch {
    return false;
  }
}

function normalizePublicSkillShowcaseUrl(value: string): string | undefined {
  if (!isSkillShowcaseUrl(value)) return undefined;
  const url = new URL(value);
  if (!/\.(mp4|webm|mov)$/i.test(url.pathname)) return undefined;
  if (SKILL_SUBMISSION_MEDIA_HOST.test(url.hostname)) url.pathname = decodeURIComponent(url.pathname);
  url.search = "";
  url.hash = "";
  return url.href;
}

function record(value: unknown): Raw | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : undefined;
}

/** 详情弹窗用的结构化说明（分中英文）和展示视频；老技能包的平铺字段折算进对应语言。 */
export function normalizeSkillDetailMetadata(raw: Raw): Pick<SkillMeta, "showcase" | "structuredInfo"> {
  const result: Pick<SkillMeta, "showcase" | "structuredInfo"> = {};
  if (Array.isArray(raw.showcase)) {
    result.showcase = [...new Set(raw.showcase.filter(isSkillShowcaseUrl))];
  } else {
    const media = [raw.showcase, raw.showcaseUrl, raw.showcase_url].find(isSkillShowcaseUrl);
    if (media) result.showcase = [media];
  }
  const localized = record(raw.structuredInfo ?? raw.structured_info ?? raw["structured-info"]);
  const legacyBest = raw.bestFor ?? raw.best_for ?? raw["best-for"];
  const legacyHow = raw.howToUse ?? raw.how_to_use ?? raw["how-to-use"];
  const hasLegacyDetails = ["bestFor", "best_for", "best-for", "howToUse", "how_to_use", "how-to-use", "outputs"].some((key) => Object.hasOwn(raw, key));
  const legacyLocale = normalizeSkillContentLocale(raw.contentLocale ?? raw.content_locale ?? raw["content-locale"]);
  const info: Partial<Record<ContentLocale, StructuredInfoEntry>> = {};
  for (const locale of ["zh-CN", "en-US"] as const) {
    const legacySummary = (
      locale === "zh-CN" ? [raw.summaryZh, raw.summary_zh, raw.summary_cn, raw["summary-cn"], raw.summary] : [raw.summary, raw.summary_en, raw["summary-en"]]
    ).find((v) => typeof v === "string" && v.trim());
    const entry =
      record(localized?.[locale]) ??
      (!localized && hasLegacyDetails && locale === legacyLocale ? { summary: legacySummary, best_for: legacyBest, how_to_use: legacyHow, outputs: raw.outputs } : undefined);
    if (!entry) continue;
    const how = entry.how_to_use ?? entry["how-to-use"];
    const best = entry.best_for ?? entry["best-for"];
    info[locale] = {
      summary: typeof entry.summary === "string" ? entry.summary.trim() : "",
      best_for: Array.isArray(best) ? best.filter((v): v is string => typeof v === "string" && !!v.trim()).map((v) => v.trim()) : [],
      how_to_use: typeof how === "string" ? how.trim() : "",
      outputs: typeof entry.outputs === "string" ? entry.outputs.trim() : "",
    };
  }
  if (localized || Object.keys(info).length) result.structuredInfo = info;
  return result;
}

// meta.yaml 的 kebab 键 → 列表里的字段名。
const META_YAML_FIELD_MAP: Record<string, keyof SkillMeta> = {
  "display-name-zh": "displayNameZh",
  version: "version",
  "tag-en": "tagEn",
  "tag-cn": "tagCn",
  "summary-en": "summary",
  "summary-cn": "summaryZh",
  "desc-en": "descEn",
  "desc-cn": "descCn",
  "cover-object-key": "coverObjectKey",
  "showcase-object-key": "showcaseObjectKey",
  source: "marketSource",
  cover: "coverUrl",
  "cover-en": "coverUrlEn",
  "author-en": "authorEn",
  "author-cn": "authorCn",
};

function applyDetailMetadata(source: Raw, out: SkillMeta): void {
  Object.assign(out, normalizeSkillDetailMetadata(source));
  if (out.showcase) out.showcase = [...new Set(out.showcase.map((url) => normalizePublicSkillShowcaseUrl(url) ?? url))];
  const locale = source["content-locale"] ?? source.contentLocale ?? source.content_locale;
  if (typeof locale === "string") out.contentLocale = normalizeSkillContentLocale(locale);
  if (out.structuredInfo !== undefined) {
    out.summary = out.structuredInfo["en-US"]?.summary ?? "";
    out.summaryZh = out.structuredInfo["zh-CN"]?.summary ?? "";
  }
}

export function parseMetaYaml(content: string): SkillMeta {
  if (!content) return {};
  try {
    const raw = yaml.load(content);
    if (raw && typeof raw === "object") {
      const source = raw as Raw;
      const out: SkillMeta = {};
      for (const [kebab, camel] of Object.entries(META_YAML_FIELD_MAP)) {
        const value = source[kebab];
        if (typeof value === "string" && value.length > 0) (out as Raw)[camel] = value;
      }
      applyTags(source, out);
      applyDetailMetadata(source, out);
      return out;
    }
  } catch {
    // 落到下面的逐行恢复
  }
  return recoverMetaYamlFields(content);
}

function recoverMetaYamlFields(content: string): SkillMeta {
  const out: SkillMeta = {};
  const recovered: Raw = {};
  for (const line of content.split("\n")) {
    const m = /^([a-z][a-z-]*)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const camel = META_YAML_FIELD_MAP[m[1]!];
    if (!camel && !["how-to-use", "outputs", "showcase", "content-locale"].includes(m[1]!)) continue;
    let value = m[2]!.trim();
    if (!value) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (value.length > 0) {
      recovered[m[1]!] = value;
      if (camel) (out as Raw)[camel] = value;
    }
  }
  applyDetailMetadata(recovered, out);
  return out;
}

export async function readMetaYaml(skillDir: string, onError?: (msg: string) => void): Promise<SkillMeta> {
  let content: string;
  try {
    content = await readFile(path.join(skillDir, "meta.yaml"), "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") onError?.(`Failed to read meta.yaml for ${path.basename(skillDir)}: ${String(err)}`);
    return {};
  }
  return parseMetaYaml(content);
}

export type SkillSource = "user" | "installed";

/** 导入结果里回给渲染层的技能信息（还没进列表扫描，所以从 frontmatter 直接拼）。 */
export function buildImportedSkillInfo(meta: SkillMeta, source: SkillSource) {
  return {
    name: meta.name ?? "",
    summary: meta.summary ?? "",
    summaryZh: meta.summaryZh ?? "",
    description: meta.description ?? "",
    enabled: true,
    source,
    tools: meta.tools ?? [],
    tags: meta.tags ?? [],
    tagsCn: meta.tagsCn ?? [],
    tagEn: meta.tagEn ?? "",
    tagCn: meta.tagCn ?? "",
    completeTagsEn: meta.completeTagsEn ?? [],
    completeTagsCn: meta.completeTagsCn ?? [],
    descEn: meta.descEn,
    descCn: meta.descCn,
    creator: meta.creator ?? "",
    triggerWords: meta.triggerWords ?? [],
    guidePrompt: meta.guidePrompt ?? SKILL_GUIDE_PROMPT_DEFAULTS.zh,
    guidePromptEn: meta.guidePromptEn ?? SKILL_GUIDE_PROMPT_DEFAULTS.en,
    displayNameZh: meta.displayNameZh ?? "",
    version: meta.version ?? DEFAULT_SKILL_PACKAGE_VERSION,
    authorEn: meta.authorEn,
    authorCn: meta.authorCn,
    coverUrl: meta.coverUrl,
    coverUrlEn: meta.coverUrlEn,
    showcase: meta.showcase,
    structuredInfo: meta.structuredInfo,
    contentLocale: meta.contentLocale,
    categoryCodes: meta.categoryCodes,
    coverObjectKey: meta.coverObjectKey,
    showcaseObjectKey: meta.showcaseObjectKey,
  };
}
