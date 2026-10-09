// domestic-model-display-aliases.js

const DOMESTIC_MODEL_DISPLAY_ALIASES = [
  // Nano Banana 2 Flash → General Image 2（空格 / 下划线 / 中划线变体）
  ["nano_banana_2_flash", "General Image 2"],
  ["NanoBanana 2 Flash", "General Image 2"],
  ["NanoBanana_2_Flash", "General Image 2"],
  ["NanoBanana-2-Flash", "General Image 2"],
  ["Nano Banana 2 Flash", "General Image 2"],
  ["Nano-Banana-2-Flash", "General Image 2"],
  ["Banana 2 Flash", "General Image 2"],
  ["Banana_2_Flash", "General Image 2"],
  ["Banana-2-Flash", "General Image 2"],
  // Nano Banana Flash → General Image 2
  ["NanoBanana Flash", "General Image 2"],
  ["NanoBanana_Flash", "General Image 2"],
  ["NanoBanana-Flash", "General Image 2"],
  ["Nano Banana Flash", "General Image 2"],
  ["Nano_Banana_Flash", "General Image 2"],
  ["Nano-Banana-Flash", "General Image 2"],
  ["Banana Flash", "General Image 2"],
  ["Banana_Flash", "General Image 2"],
  ["Banana-Flash", "General Image 2"],
  // Nano Banana Pro → General Image Pro
  ["NanoBanana Pro", "General Image Pro"],
  ["NanoBanana_Pro", "General Image Pro"],
  ["NanoBanana-Pro", "General Image Pro"],
  ["Nano Banana Pro", "General Image Pro"],
  ["Nano_Banana_Pro", "General Image Pro"],
  ["Nano-Banana-Pro", "General Image Pro"],
  ["Banana Pro", "General Image Pro"],
  ["Banana_Pro", "General Image Pro"],
  ["Banana-Pro", "General Image Pro"],
  // 特例：nano_banana_2（下划线全名）→ General Image Pro。仅此一条，不派生
  // 空格/中划线变体，避免与下方 "Nano Banana 2 → General Image 2" 的下划线
  // 全名 Nano_Banana_2 冲突。
  ["nano_banana_2", "General Image Pro"],
  // Nano Banana 2 → General Image 2（不含下划线全名 Nano_Banana_2，留给上面的特例）
  ["NanoBanana 2", "General Image 2"],
  ["NanoBanana_2", "General Image 2"],
  ["NanoBanana-2", "General Image 2"],
  ["Nano Banana 2", "General Image 2"],
  ["Nano-Banana-2", "General Image 2"],
  ["Banana 2", "General Image 2"],
  ["Banana_2", "General Image 2"],
  ["Banana-2", "General Image 2"],
  // 旧国内展示名也统一收敛到新名称，覆盖历史消息与缓存数据。
  ["香蕉Pro", "General Image Pro"],
  ["香蕉2", "General Image 2"],
  // Banana 系列 → General Image 系列
  ["Banana 系列", "General Image 系列"],
  ["Banana系列", "General Image 系列"],
  ["Banana_系列", "General Image 系列"],
  ["Banana-系列", "General Image 系列"],
  ["香蕉系列", "General Image 系列"],
  // GPT Image 2.5 Flare / Sunburst → Design Image 2.5 Flare / Sunburst。
  // 两区只差品牌前缀，脱敏只把 GPT 换成 Design。
  // 这四个内部名都以 'gpt-image-2' / 'g-image-2' 为前缀子串，依靠
  // SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES 的长度降序 + 单次 alternation
  // 保证长规则先命中，不会被下方的 'gpt-image-2' 截断成 "Design Image 2.5-flare"。
  ["gpt-image-2.5-sunburst", "Design Image 2.5 Sunburst"],
  ["GPT Image 2.5 Sunburst", "Design Image 2.5 Sunburst"],
  ["GPT_Image_2.5_Sunburst", "Design Image 2.5 Sunburst"],
  ["g-image-2.5-sunburst", "Design Image 2.5 Sunburst"],
  ["gpt-image-2.5-flare", "Design Image 2.5 Flare"],
  ["GPT Image 2.5 Flare", "Design Image 2.5 Flare"],
  ["GPT_Image_2.5_Flare", "Design Image 2.5 Flare"],
  ["g-image-2.5-flare", "Design Image 2.5 Flare"],
  // GPT Image 2 / 旧国内名 → Design Image 2。只改 2 这一版，其他版本继续沿用
  // 既有 GPT Image → G Image 的国内脱敏规则。
  ["gpt-image-2", "Design Image 2"],
  ["GPT Image 2", "Design Image 2"],
  ["GPT_Image_2", "Design Image 2"],
  ["g-image-2", "Design Image 2"],
  ["G Image 2", "Design Image 2"],
  ["G_Image_2", "Design Image 2"],
  // GPT Image → G Image（其他版本）
  ["GPT Image", "G Image"],
  ["GPT_Image", "G Image"],
  ["gpt-image", "g-image"],
  // Veo 3.1 → Beta（国内展示名）。统一海外命名后 agent 输出 veo-3.1-* / Veo3，
  // 国内渲染时 redact 回 beta。长度降序排序保证技术全名（最长）先匹配；裸 model_id
  // 形如 `veo-3.1-generate-001` 内部是 `veo-3`（带连字符），不含连续子串 `veo3`，
  // 因此短规则 `Veo3 → Beta` 不会误伤全名，双重安全。
  ["veo-3.1-fast-generate-001", "beta_fast"],
  ["veo-3.1-generate-001", "beta_pro"],
  ["Veo3.1 Fast", "Beta Fast"],
  ["Veo 3.1 Fast", "Beta Fast"],
  ["Veo3 Series", "Beta系列"],
  ["Veo3.1", "Beta Pro"],
  ["Veo 3.1", "Beta Pro"],
  ["Veo3", "Beta"],
  // seedream alias
  ["doubao-seedream-5-0-pro-260628", "Seedream 5.0 Pro"],
  ["doubao-seedream-4-5-251128", "Seedream 4.5"],
];

const SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES =
  DOMESTIC_MODEL_DISPLAY_ALIASES.slice().sort(
    ([a2], [b3]) => b3.length - a2.length,
  );

const DOMESTIC_MODEL_DISPLAY_ALIAS_BY_LOWERCASE = new Map(
  SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES.map(([internal2, display]) => [
    internal2.toLowerCase(),
    display,
  ]),
);

const DOMESTIC_MODEL_CONTEXT_ALIAS_PATTERNS = [
  [/\bbanana(?=\s*(?:模型|model\b))/gi, "General Image"],
  [
    /(\b(?:(?:available|selected)_)?vendors?\s*=\s*(?:\[[^\]]*)?)\bbanana\b/gi,
    "$1General Image",
  ],
];

function shouldRedactModelAliases(region) {
  return (
    region === "domestic" ||
    region === void 0 ||
    region === null ||
    region === ""
  );
}

function escapeRegExp$3(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DOMESTIC_MODEL_DISPLAY_ALIAS_PATTERN = new RegExp(
  SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES.map(([internal2]) =>
    escapeRegExp$3(internal2),
  ).join("|"),
  "gi",
);

export function redactModelAliasesForDisplay(text2, region) {
  if (!text2 || !shouldRedactModelAliases(region)) return text2;
  let redacted = text2.replace(
    DOMESTIC_MODEL_DISPLAY_ALIAS_PATTERN,
    (matched) =>
      DOMESTIC_MODEL_DISPLAY_ALIAS_BY_LOWERCASE.get(matched.toLowerCase()) ??
      matched,
  );
  for (const [pattern, display] of DOMESTIC_MODEL_CONTEXT_ALIAS_PATTERNS) {
    redacted = redacted.replace(pattern, display);
  }
  return redacted;
}
