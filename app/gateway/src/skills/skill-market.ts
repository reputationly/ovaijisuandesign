import { DEFAULT_SKILL_PACKAGE_VERSION, SKILL_GUIDE_PROMPT_DEFAULTS, type SkillMeta } from "./skill-meta.js";

/**
 * 技能市场条目（`GET /api/skills/market` 的 `skills[]`）。字段和云端市场条目映射后的形状一致：
 * 渲染层的首页技能卡片、技能页市场、详情弹窗都按这些字段取值。
 */
export interface MarketSkillInfo {
  showcase?: string[];
  structuredInfo?: SkillMeta["structuredInfo"];
  name: string;
  version: string;
  hash: string;
  summary: string;
  summaryZh: string;
  description: string;
  tags: string[];
  tagsCn: string[];
  creator: string;
  triggerWords: string[];
  guidePrompt: string;
  guidePromptEn: string;
  displayNameZh: string;
  tagEn: string;
  tagCn: string;
  completeTagsEn: string[];
  completeTagsCn: string[];
  categoryCodes: string[];
  descEn: string;
  descCn: string;
  tools: string[];
  toolsByAgent?: Record<string, string[]>;
  coverUrl?: string;
  authorEn?: string;
  authorCn?: string;
  source?: string;
  installed: boolean;
  updateAvailable: boolean;
  installedVersion?: string;
}

export interface MarketListQuery {
  tag?: string;
  source?: string;
  /** 有值时按关键词搜（`/api/skills/market/search`），忽略 tag / source。 */
  query?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** 标签「一级分类 / 阶段」里的一级分类（英文），去重。和 buildMarketCategories 给出的分类 key 是同一套。 */
function categoriesFromTags(meta: SkillMeta): string[] {
  const tags = meta.completeTagsEn?.length ? meta.completeTagsEn : meta.tagEn ? [meta.tagEn] : [];
  return [...new Set(tags.map((t) => t.split("/")[0]!.trim()).filter(Boolean))];
}

/**
 * 自带技能 → 市场条目。
 * 自带技能已经装在本机，所以已装、无更新、本地版本就是它自己的版本。
 * 技能包没写分类代码时从标签推出来：渲染层按分类筛市场时只看 `categoryCodes`，空着的话点任何分类都是空的。
 */
export function toMarketSkillInfo(name: string, meta: SkillMeta): MarketSkillInfo {
  const version = meta.version || DEFAULT_SKILL_PACKAGE_VERSION;
  return {
    ...(meta.showcase ? { showcase: meta.showcase } : {}),
    ...(meta.structuredInfo ? { structuredInfo: meta.structuredInfo } : {}),
    name,
    version,
    hash: meta.hash ?? "",
    summary: meta.summary ?? "",
    summaryZh: meta.summaryZh ?? "",
    description: meta.description ?? "",
    tags: meta.tags ?? [],
    tagsCn: meta.tagsCn ?? [],
    creator: meta.creator ?? "",
    triggerWords: meta.triggerWords ?? [],
    guidePrompt: meta.guidePrompt ?? SKILL_GUIDE_PROMPT_DEFAULTS.zh,
    guidePromptEn: meta.guidePromptEn ?? SKILL_GUIDE_PROMPT_DEFAULTS.en,
    displayNameZh: meta.displayNameZh ?? "",
    tagEn: meta.tagEn ?? "",
    tagCn: meta.tagCn ?? "",
    completeTagsEn: meta.completeTagsEn ?? [],
    completeTagsCn: meta.completeTagsCn ?? [],
    categoryCodes: meta.categoryCodes ?? categoriesFromTags(meta),
    descEn: meta.descEn ?? "",
    descCn: meta.descCn ?? "",
    tools: meta.tools ?? [],
    ...(meta.toolsByAgent ? { toolsByAgent: meta.toolsByAgent } : {}),
    ...(meta.coverUrl ? { coverUrl: meta.coverUrl } : {}),
    ...(meta.authorEn ? { authorEn: meta.authorEn } : {}),
    ...(meta.authorCn ? { authorCn: meta.authorCn } : {}),
    ...(meta.marketSource ? { source: meta.marketSource } : {}),
    installed: true,
    updateAvailable: false,
    installedVersion: version,
  };
}

function matchesTag(s: MarketSkillInfo, tag: string): boolean {
  const t = tag.trim().toLowerCase();
  const all = [s.tagEn, s.tagCn, ...s.completeTagsEn, ...s.completeTagsCn, ...s.tags, ...s.tagsCn, ...s.categoryCodes];
  // 分类标签是「一级 / 二级」的写法，按一级分类筛时也要命中。
  return all.some((v) => {
    const x = v.trim().toLowerCase();
    return x === t || x.split("/").some((part) => part.trim() === t);
  });
}

function matchesQuery(s: MarketSkillInfo, query: string): boolean {
  const q = query.trim().toLowerCase();
  return [s.name, s.displayNameZh, s.summary, s.summaryZh, s.tagEn, s.tagCn, ...s.triggerWords].some((v) => v.toLowerCase().includes(q));
}

/**
 * 过滤、排序、分页，回 `{ skills, total }`。
 *
 * 来源按每个技能 meta.yaml 里的 `source` 分（技能页把市场分三块同时拉：精选、用户精选、其他）：
 * - `official-featured` / `official`：meta 里写的就是这两个值，原样匹配；
 * - `community`：不属于上面两种的（自带技能里目前没有）；
 * - 不带来源（或不认识的来源）：全部。
 * 有封面的排前面：首页卡片没封面只能显示纯色块。
 */
export function buildMarketList(all: MarketSkillInfo[], q: MarketListQuery): { skills: MarketSkillInfo[]; total: number } {
  const CURATED_SOURCES = new Set(["official-featured", "official"]);
  let list = all;
  if (q.source && CURATED_SOURCES.has(q.source)) list = list.filter((s) => s.source === q.source);
  else if (q.source === "community") list = list.filter((s) => !CURATED_SOURCES.has(s.source ?? ""));
  if (q.query?.trim()) list = list.filter((s) => matchesQuery(s, q.query!));
  else if (q.tag?.trim()) list = list.filter((s) => matchesTag(s, q.tag!));
  list = [...list].sort((a, b) => Number(!a.coverUrl) - Number(!b.coverUrl) || a.name.localeCompare(b.name));
  const pageSize = Math.min(Math.max(q.pageSize && q.pageSize > 0 ? q.pageSize : DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const page = q.page && q.page > 0 ? q.page : 1;
  return { skills: list.slice((page - 1) * pageSize, page * pageSize), total: list.length };
}

export interface MarketCategory {
  category: string;
  sort_order: number;
  cn_name: string;
  en_name: string;
  enabled: boolean;
  tag_type: "category" | "stage";
  cn_description: string;
  en_description: string;
}

/**
 * 分类表从自带技能的标签里归纳：标签写成「一级分类 / 阶段」，中英文各一份、按位置对应。
 * 分类的 key 用英文一级分类名，和条目的 `categoryCodes`（见 categoriesFromTags）是同一套值 ——
 * 渲染层点分类时按 `categoryCodes` 在前端筛；市场按 tag 筛选时也认它。
 */
export function buildMarketCategories(skills: MarketSkillInfo[], tagType: string | undefined): { categories: MarketCategory[] } {
  const found = new Map<string, MarketCategory>();
  const add = (type: "category" | "stage", en: string, cn: string) => {
    const key = `${type}:${en}`;
    if (!en || found.has(key)) return;
    found.set(key, { category: en, sort_order: 0, cn_name: cn || en, en_name: en, enabled: true, tag_type: type, cn_description: "", en_description: "" });
  };
  for (const s of skills) {
    const en = s.completeTagsEn.length ? s.completeTagsEn : s.tagEn ? [s.tagEn] : [];
    const cn = s.completeTagsCn.length ? s.completeTagsCn : s.tagCn ? [s.tagCn] : [];
    en.forEach((tag, i) => {
      const [enCategory = "", enStage = ""] = tag.split("/").map((p) => p.trim());
      const [cnCategory = "", cnStage = ""] = (cn[i] ?? "").split("/").map((p) => p.trim());
      add("category", enCategory, cnCategory);
      add("stage", enStage, cnStage);
    });
  }
  const wanted = tagType === "all" ? null : tagType === "stage" ? "stage" : "category";
  const categories = [...found.values()]
    .filter((c) => wanted === null || c.tag_type === wanted)
    .sort((a, b) => a.tag_type.localeCompare(b.tag_type) || a.en_name.localeCompare(b.en_name))
    .map((c, i) => ({ ...c, sort_order: i }));
  return { categories };
}
