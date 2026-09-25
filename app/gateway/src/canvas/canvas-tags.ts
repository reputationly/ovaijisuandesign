/**
 * 画布标签表：7 个固定的颜色标签（名字可改、不能删）+ 用户自建的关键词标签。
 *
 * 标签表整份存成一个 JSON（带 revision 做乐观锁），素材上只记 `metadata.tagIds`。
 * 颜色、预置 id、名字长度规则都是和渲染层约好的：渲染层按 id 认预置颜色，按 legacyNameKey 取翻译名。
 */

export const CANVAS_TAG_REGISTRY_VERSION = 2;
export const CANVAS_TAG_NAME_MAX_LENGTH = 12;
export const MAX_COLOR_TAGS_PER_ASSET = 1;
export const MAX_CANVAS_TAG_ASSIGNMENTS_PER_BATCH = 500;

export const CANVAS_TAG_COLOR_PALETTE = ["#0A84FF", "#BF5AF2", "#FF9F0A", "#5E3DF5", "#FF5F57", "#30D158", "#FFD60A"] as const;

const PRESET_COLOR_TAG_IDS = {
  red: "color:red",
  orange: "color:orange",
  yellow: "color:yellow",
  green: "color:green",
  blue: "color:blue",
  purple: "color:purple",
  deepPurple: "color:deep-purple",
} as const;

const PRESET_COLOR_NAME_KEYS: Record<string, string> = {
  [PRESET_COLOR_TAG_IDS.red]: "canvasTags.preset.red",
  [PRESET_COLOR_TAG_IDS.orange]: "canvasTags.preset.orange",
  [PRESET_COLOR_TAG_IDS.yellow]: "canvasTags.preset.yellow",
  [PRESET_COLOR_TAG_IDS.green]: "canvasTags.preset.green",
  [PRESET_COLOR_TAG_IDS.blue]: "canvasTags.preset.blue",
  [PRESET_COLOR_TAG_IDS.purple]: "canvasTags.preset.purple",
  [PRESET_COLOR_TAG_IDS.deepPurple]: "canvasTags.preset.deepPurple",
};

/** 预置颜色标签没改过名时，渲染层显示的中英文名。查重名要把它们也算上。 */
const PRESET_COLOR_FALLBACK_NAMES: Record<string, string[]> = {
  [PRESET_COLOR_TAG_IDS.red]: ["人物", "Character"],
  [PRESET_COLOR_TAG_IDS.orange]: ["场景", "Scene"],
  [PRESET_COLOR_TAG_IDS.yellow]: ["待定版", "Draft"],
  [PRESET_COLOR_TAG_IDS.green]: ["最终版", "Final"],
  [PRESET_COLOR_TAG_IDS.blue]: ["道具", "Prop"],
  [PRESET_COLOR_TAG_IDS.purple]: ["音色", "Voice"],
  [PRESET_COLOR_TAG_IDS.deepPurple]: ["服装", "Costume"],
};

const PRESET_COLOR_TAG_ID_BY_COLOR: Record<string, string> = {
  "#FF5F57": PRESET_COLOR_TAG_IDS.red,
  "#FF9F0A": PRESET_COLOR_TAG_IDS.orange,
  "#FFD60A": PRESET_COLOR_TAG_IDS.yellow,
  "#30D158": PRESET_COLOR_TAG_IDS.green,
  "#0A84FF": PRESET_COLOR_TAG_IDS.blue,
  "#BF5AF2": PRESET_COLOR_TAG_IDS.purple,
  "#5E3DF5": PRESET_COLOR_TAG_IDS.deepPurple,
};

export interface CanvasTag {
  id: string;
  kind: "color" | "keyword";
  color?: string;
  name?: string;
  legacyNameKey?: string;
}

export interface CanvasTagRegistry {
  version: typeof CANVAS_TAG_REGISTRY_VERSION;
  revision: number;
  orderMode: "default" | "custom";
  tags: CanvasTag[];
}

const PRESET_COLOR_TAGS: CanvasTag[] = CANVAS_TAG_COLOR_PALETTE.map((color) => {
  const id = PRESET_COLOR_TAG_ID_BY_COLOR[color]!;
  return { id, kind: "color", color, legacyNameKey: PRESET_COLOR_NAME_KEYS[id] };
});
const PRESET_COLOR_TAG_ID_SET = new Set<string>(Object.values(PRESET_COLOR_TAG_IDS));

export function seedTagRegistry(): CanvasTagRegistry {
  return { version: CANVAS_TAG_REGISTRY_VERSION, revision: 0, orderMode: "default", tags: PRESET_COLOR_TAGS.map((t) => ({ ...t })) };
}

// 中日韩文字、全角符号、emoji 算两格，其余一格：12 格大约是 6 个汉字或 12 个字母，标签胶囊放得下。
const WIDE_GRAPHEME = /(?:[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}\p{Regional_Indicator}\u{3000}-\u{303F}\u{FF01}-\u{FF60}\u{FFE0}-\u{FFE6}]|\u{20E3}|\u{FE0F})/u;

function countNameUnits(name: string): number {
  const graphemes = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(name), ({ segment }) => segment);
  return graphemes.reduce((n, g) => n + (WIDE_GRAPHEME.test(g) ? 2 : 1), 0);
}

export function validateCanvasTagName(name: string): "required" | "too-long" | null {
  const trimmed = name.trim();
  if (!trimmed) return "required";
  if (countNameUnits(trimmed) > CANVAS_TAG_NAME_MAX_LENGTH) return "too-long";
  return null;
}

export function isCanvasTagColor(color: string): boolean {
  return (CANVAS_TAG_COLOR_PALETTE as readonly string[]).includes(color);
}

export function isCanvasColorTag(tag: CanvasTag): boolean {
  return tag.kind === "color" && typeof tag.color === "string";
}

/** 默认排序：颜色标签按色板顺序，关键词标签（没有颜色）保持原相对顺序排在后面。 */
export function orderCanvasTagsByDefaultColor(tags: CanvasTag[]): CanvasTag[] {
  const priority = new Map<string, number>(CANVAS_TAG_COLOR_PALETTE.map((c, i) => [c, i]));
  return tags
    .map((tag, index) => ({ tag, index }))
    .sort((a, b) => (priority.get(a.tag.color ?? "") ?? Number.MAX_SAFE_INTEGER) - (priority.get(b.tag.color ?? "") ?? Number.MAX_SAFE_INTEGER) || a.index - b.index)
    .map(({ tag }) => tag);
}

type Raw = Record<string, unknown>;

function normalizeV2Registry(raw: Raw): CanvasTagRegistry | null {
  if (raw.version !== CANVAS_TAG_REGISTRY_VERSION || !Array.isArray(raw.tags)) return null;
  const tags: CanvasTag[] = [];
  const seen = new Set<string>();
  for (const candidate of raw.tags) {
    if (!candidate || typeof candidate !== "object") continue;
    const t = candidate as Raw;
    const id = typeof t.id === "string" ? t.id.trim() : "";
    const name = typeof t.name === "string" ? t.name.trim() : "";
    const legacyNameKey = typeof t.legacyNameKey === "string" ? t.legacyNameKey : undefined;
    const color = typeof t.color === "string" && isCanvasTagColor(t.color) ? t.color : undefined;
    const kind = PRESET_COLOR_TAG_ID_SET.has(id) ? "color" : "keyword";
    if (!id || seen.has(id) || (kind === "color" && !color)) continue;
    if (!name && !legacyNameKey) continue;
    seen.add(id);
    tags.push({ id, kind, ...(kind === "color" && color ? { color } : {}), name: name || undefined, legacyNameKey });
  }
  const revision = typeof raw.revision === "number" && Number.isSafeInteger(raw.revision) && raw.revision >= 0 ? raw.revision : 0;
  const orderMode = raw.orderMode === "custom" ? "custom" : "default";
  // 预置颜色标签少了就补回来：它们不能删，缺了只能是数据写坏了。
  const existing = new Set(tags.map((t) => t.id));
  const missing = PRESET_COLOR_TAGS.filter((t) => !existing.has(t.id)).map((t) => ({ ...t }));
  const complete =
    orderMode === "custom"
      ? [...tags.filter((t) => t.kind === "color"), ...missing, ...tags.filter((t) => t.kind === "keyword")]
      : orderCanvasTagsByDefaultColor([...tags, ...missing]);
  return { version: CANVAS_TAG_REGISTRY_VERSION, revision, orderMode, tags: complete };
}

/** 任意输入 → 合法的标签表。v2 按原样校正；更早的 `{ colors, transparents }` 格式折算过来；认不出就是预置表。 */
export function normalizeTagRegistry(input: unknown): CanvasTagRegistry {
  if (input && typeof input === "object") {
    const v2 = normalizeV2Registry(input as Raw);
    if (v2) return v2;
  }
  const legacy = input && typeof input === "object" ? (input as Raw) : null;
  if (!legacy || (!Array.isArray(legacy.colors) && !Array.isArray(legacy.transparents))) return seedTagRegistry();
  const tags = PRESET_COLOR_TAGS.map((t) => ({ ...t }));
  const byId = new Map(tags.map((t) => [t.id, t]));
  for (const candidate of Array.isArray(legacy.colors) ? legacy.colors : []) {
    if (!candidate || typeof candidate !== "object") continue;
    const old = candidate as Raw;
    if (typeof old.id !== "string") continue;
    const current = byId.get(old.id);
    const name = typeof old.name === "string" ? old.name.trim() : "";
    if (current && name) current.name = name;
  }
  const seen = new Set(tags.map((t) => t.id));
  for (const candidate of Array.isArray(legacy.transparents) ? legacy.transparents : []) {
    if (!candidate || typeof candidate !== "object") continue;
    const old = candidate as Raw;
    const id = typeof old.id === "string" ? old.id.trim() : "";
    const name = typeof old.name === "string" ? old.name.trim() : "";
    if (!id || seen.has(id) || !name) continue;
    seen.add(id);
    tags.push({ id, kind: "keyword", name });
  }
  return { version: CANVAS_TAG_REGISTRY_VERSION, revision: 0, orderMode: "default", tags: orderCanvasTagsByDefaultColor(tags) };
}

/** 旧文件能不能当标签表读：v2 要有 tags 数组，更早的格式要有 colors / transparents。 */
export function isLegacyRegistryPayload(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const c = value as Raw;
  if (c.version === CANVAS_TAG_REGISTRY_VERSION) return Array.isArray(c.tags);
  return Array.isArray(c.colors) || Array.isArray(c.transparents);
}

export function getCanvasTagKnownNames(tag: CanvasTag): string[] {
  if (tag.name?.trim()) return [tag.name.trim()];
  return PRESET_COLOR_FALLBACK_NAMES[tag.id] ?? [];
}

export type AssetTagIdsProblem = { code: "unknown-tag" | "duplicate-tag"; tagId: string } | { code: "color-limit"; limit: number };

/** 一个素材的整组标签：都得存在、不能重复、颜色标签最多一个。 */
export function validateAssetTagIds(tagIds: string[], registry: CanvasTagRegistry): AssetTagIdsProblem | null {
  const index = new Map(registry.tags.map((t) => [t.id, t]));
  const seen = new Set<string>();
  let colors = 0;
  for (const id of tagIds) {
    const tag = index.get(id);
    if (!tag) return { code: "unknown-tag", tagId: id };
    if (seen.has(id)) return { code: "duplicate-tag", tagId: id };
    seen.add(id);
    if (tag.kind === "color") colors += 1;
  }
  return colors > MAX_COLOR_TAGS_PER_ASSET ? { code: "color-limit", limit: MAX_COLOR_TAGS_PER_ASSET } : null;
}

/** 给素材加 / 去一个标签。加颜色标签会顶掉原来的颜色标签（每个素材只能有一个颜色），并排到最前。 */
export function mutateCanvasAssetTagIds(current: string[], tag: CanvasTag, registry: CanvasTagRegistry, operation: "assign" | "remove"): string[] {
  if (operation === "remove") return current.filter((id) => id !== tag.id);
  if (tag.kind === "keyword") return current.includes(tag.id) ? [...current] : [...current, tag.id];
  const byId = new Map(registry.tags.map((t) => [t.id, t]));
  return [tag.id, ...current.filter((id) => id !== tag.id && byId.get(id)?.kind !== "color")];
}

/** 重排请求必须恰好是当前全部标签各出现一次。 */
export function isValidCanvasTagOrder(ordered: string[], registry: CanvasTagRegistry): boolean {
  if (ordered.length !== registry.tags.length) return false;
  const expected = new Set(registry.tags.map((t) => t.id));
  const actual = new Set(ordered);
  if (actual.size !== ordered.length || actual.size !== expected.size) return false;
  for (const id of actual) if (!expected.has(id)) return false;
  return true;
}
