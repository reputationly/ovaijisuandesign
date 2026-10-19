/**
 * 画布标签：调色板、预设色标签、以及「颜色 → 标签 id」的对应表。
 *
 * 预设标签用**颜色本身**当身份（`color:red`），而不是用名字 ——
 * 名字是可改的（用户能重命名标签），颜色不可改。用名字当身份的话，
 * 用户改一次名，所有历史引用就全断了。
 *
 * `legacyNameKey` / `PRESET_COLOR_FALLBACK_NAMES` 是为老数据留的：
 * 早期版本只有名字没有 id，这些值用来把老数据认回对应的预设色。
 */

/** 可选的颜色。顺序即界面上的排列顺序。 */
export const CANVAS_TAG_COLOR_PALETTE = ["#0A84FF", "#BF5AF2", "#FF9F0A", "#5E3DF5", "#FF5F57", "#30D158", "#FFD60A"];

/** 预设色标签的 id。`deepPurple` 放在最后，加新色不要插在中间 —— 顺序进了老数据的引用里。 */
export const PRESET_COLOR_TAG_IDS = {
  red: "color:red",
  orange: "color:orange",
  yellow: "color:yellow",
  green: "color:green",
  blue: "color:blue",
  purple: "color:purple",
  deepPurple: "color:deep-purple",
} as const;

/** 预设色的 i18n 键。 */
export const PRESET_COLOR_NAME_KEYS: Record<string, string> = {
  [PRESET_COLOR_TAG_IDS.red]: "canvasTags.preset.red",
  [PRESET_COLOR_TAG_IDS.orange]: "canvasTags.preset.orange",
  [PRESET_COLOR_TAG_IDS.yellow]: "canvasTags.preset.yellow",
  [PRESET_COLOR_TAG_IDS.green]: "canvasTags.preset.green",
  [PRESET_COLOR_TAG_IDS.blue]: "canvasTags.preset.blue",
  [PRESET_COLOR_TAG_IDS.purple]: "canvasTags.preset.purple",
  [PRESET_COLOR_TAG_IDS.deepPurple]: "canvasTags.preset.deepPurple",
};

/**
 * 预设色的兜底名字（无 i18n 时用）。中英各一份，中文在前 ——
 * 界面语言缺失时按第一项显示，而这类场景几乎都发生在中文环境。
 */
export const PRESET_COLOR_FALLBACK_NAMES: Record<string, string[]> = {
  [PRESET_COLOR_TAG_IDS.red]: ["人物", "Character"],
  [PRESET_COLOR_TAG_IDS.orange]: ["场景", "Scene"],
  [PRESET_COLOR_TAG_IDS.yellow]: ["待定版", "Draft"],
  [PRESET_COLOR_TAG_IDS.green]: ["最终版", "Final"],
  [PRESET_COLOR_TAG_IDS.blue]: ["道具", "Prop"],
  [PRESET_COLOR_TAG_IDS.purple]: ["音色", "Voice"],
  [PRESET_COLOR_TAG_IDS.deepPurple]: ["服装", "Costume"],
};

/** 颜色 → 预设标签 id。用来把「按颜色存的」老数据认回预设。 */
export const PRESET_COLOR_TAG_ID_BY_COLOR: Record<string, string> = {
  "#FF5F57": PRESET_COLOR_TAG_IDS.red,
  "#FF9F0A": PRESET_COLOR_TAG_IDS.orange,
  "#FFD60A": PRESET_COLOR_TAG_IDS.yellow,
  "#30D158": PRESET_COLOR_TAG_IDS.green,
  "#0A84FF": PRESET_COLOR_TAG_IDS.blue,
  "#BF5AF2": PRESET_COLOR_TAG_IDS.purple,
  "#5E3DF5": PRESET_COLOR_TAG_IDS.deepPurple,
};

export interface PresetColorTag {
  id: string;
  kind: "color";
  color: string;
  legacyNameKey: string;
}

/** 预设色标签列表，按调色板顺序。 */
export const PRESET_COLOR_TAGS: PresetColorTag[] = CANVAS_TAG_COLOR_PALETTE.map((color) => {
  const id = PRESET_COLOR_TAG_ID_BY_COLOR[color] ?? "";
  return { id, kind: "color" as const, color, legacyNameKey: PRESET_COLOR_NAME_KEYS[id] ?? "" };
});

/** 判断某个 id 是不是预设色标签。 */
export const PRESET_COLOR_TAG_ID_SET = new Set<string>(Object.values(PRESET_COLOR_TAG_IDS));
