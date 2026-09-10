/**
 * 画布标签。官方的 `canvasTags.*`。
 *
 * 官方分两套：
 *
 * - **画布标签**：有颜色，**直接显示在画布上**（`canvasTags.colorLabels`
 *   =「画布标签」，说明是「画布标签会直接显示在画布上」）。
 * - **关键词**：透明、不显示，用于关联/搜索/筛选
 *   （`canvasTags.keywordInfo`）。
 *
 * 这里先做前一套 —— 画布节点多了以后"能一眼分清"是最先需要的。
 *
 * ## 规格全部取自官方产物
 *
 * ```js
 * const CANVAS_TAG_NAME_MAX_LENGTH  = 12;
 * const MAX_COLOR_TAGS_PER_ASSET    = 1;
 * const PRESET_COLOR_TAG_IDS = { red: "color:red", …, deepPurple: "color:deep-purple" };
 * const CANVAS_TAG_COLOR_PALETTE = ["#0A84FF","#BF5AF2","#FF9F0A","#5E3DF5","#FF5F57","#30D158","#FFD60A"];
 * ```
 *
 * 预设名字来自 `canvasTags.preset.*`：人物 / 场景 / 道具 / 服装 / 音色 /
 * 最终版 / 待定版。
 */

/** 官方 `CANVAS_TAG_NAME_MAX_LENGTH`。中文按 2 个宽度算，见 [`nameTooLong`]。 */
export const TAG_NAME_MAX = 12

/**
 * 官方 `MAX_COLOR_TAGS_PER_ASSET = 1`。
 *
 * **一个节点只能有一个彩色标签。** 允许多个的话，画布上一个节点挂三条
 * 颜色带，扫一眼反而分不出主次 —— 而标签存在的意义就是扫一眼能分清。
 */
export const MAX_TAGS_PER_NODE = 1

export interface TagPreset {
  /** 官方的 `PRESET_COLOR_TAG_IDS`,形如 `color:red`。 */
  id: string
  /**
   * 主色和前景色的 CSS 变量。
   *
   * **写全名，不要拼。** `var(--canvas-node-tag-${token})` 这种拼法
   * `tokens.test.ts` 验不了 —— 它只能看到静态前缀，于是 token 里一个错字
   * 会产出一个没定义的变量，样式静默失效（正是那个测试要防的事）。
   */
  color: string
  foreground: string
  name: string
}

/** 七个预设。顺序照官方的 `CANVAS_TAG_COLOR_PALETTE`。 */
export const TAG_PRESETS: TagPreset[] = [
  {
    id: "color:blue",
    name: "道具",
    color: "var(--canvas-node-tag-blue)",
    foreground: "var(--canvas-node-tag-blue-foreground)",
  },
  {
    id: "color:purple",
    name: "音色",
    color: "var(--canvas-node-tag-purple)",
    foreground: "var(--canvas-node-tag-purple-foreground)",
  },
  {
    id: "color:orange",
    name: "场景",
    color: "var(--canvas-node-tag-orange)",
    foreground: "var(--canvas-node-tag-orange-foreground)",
  },
  {
    id: "color:deep-purple",
    name: "服装",
    color: "var(--canvas-node-tag-deep-purple)",
    foreground: "var(--canvas-node-tag-deep-purple-foreground)",
  },
  {
    id: "color:red",
    name: "人物",
    color: "var(--canvas-node-tag-red)",
    foreground: "var(--canvas-node-tag-red-foreground)",
  },
  {
    id: "color:green",
    name: "最终版",
    color: "var(--canvas-node-tag-green)",
    foreground: "var(--canvas-node-tag-green-foreground)",
  },
  {
    id: "color:yellow",
    name: "待定版",
    color: "var(--canvas-node-tag-yellow)",
    foreground: "var(--canvas-node-tag-yellow-foreground)",
  },
]

const BY_ID = new Map(TAG_PRESETS.map((t) => [t.id, t]))

export function tagById(id: string): TagPreset | undefined {
  return BY_ID.get(id)
}

/** 标签的主色。用 CSS 变量而不是写死 hex —— 深色主题下这些值是另一套。 */
export function tagColor(id: string): string | undefined {
  return BY_ID.get(id)?.color
}

/**
 * 名字长度是否超限。
 *
 * 官方的提示是「最多 6 个中文或 12 个英文字符」——**同一个上限的两种说法**，
 * 也就是按显示宽度算：中文算 2，其余算 1。
 * 按 `length` 算的话，6 个中文只有 6，能一直打到 12 个中文，
 * 标签会把节点顶宽。
 */
export function nameWidth(name: string): number {
  let w = 0
  for (const ch of name) {
    // 全角区间：CJK、假名、全角标点。
    w += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch)
      ? 2
      : 1
  }
  return w
}

export function nameTooLong(name: string): boolean {
  return nameWidth(name) > TAG_NAME_MAX
}

/**
 * 给节点打标签后的新标签数组。
 *
 * 超过上限时**换掉旧的，不是拒绝**。官方 `MAX_COLOR_TAGS_PER_ASSET = 1`,
 * 用户点第二个颜色的意思显然是"改成这个"，弹一句"已达上限"只会让人再点一次。
 * 再点同一个 = 取消。
 */
export function toggleTag(current: readonly string[], id: string): string[] {
  if (current.includes(id)) return current.filter((x) => x !== id)
  const next = [...current, id]
  // 从头上丢，留最近选的那些。
  return next.slice(Math.max(0, next.length - MAX_TAGS_PER_NODE))
}

/** 按标签筛出节点 id。`null` 表示不筛。 */
export function filterByTag<T extends { id: string; tags?: readonly string[] }>(
  nodes: readonly T[],
  tagId: string | null,
): T[] {
  if (!tagId) return [...nodes]
  return nodes.filter((n) => n.tags?.includes(tagId))
}

/**
 * 从画布节点上读标签。
 *
 * 官方存在 `meta.tagIds`（`NodeShell` / `NodeHeader` / `NodeBody` 收的都是
 * `meta2?.tagIds`）。我们的 gateway 对 `meta` 是 `#[serde(flatten)] extra`
 * 原样带进带出，所以不用改后端。
 */
export function tagsOf(node: { meta?: unknown } | undefined): string[] {
  const meta = node?.meta
  if (!meta || typeof meta !== "object") return []
  const ids = (meta as { tagIds?: unknown }).tagIds
  return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : []
}

/**
 * 写回标签，返回新的 `meta`。
 *
 * **以原来那份为底改**，不是重建：`meta` 里有一堆官方写进去、我们不认识的
 * 字段（生成参数、轮次…），重建会把它们抹掉，而 gateway 只校验图的结构，
 * 拦不住这种"结构合法但内容被清空"的写入。
 */
export function withTags(meta: unknown, tags: readonly string[]): Record<string, unknown> {
  const base = meta && typeof meta === "object" ? { ...(meta as Record<string, unknown>) } : {}
  if (tags.length === 0) {
    delete base.tagIds
    return base
  }
  base.tagIds = [...tags]
  return base
}
