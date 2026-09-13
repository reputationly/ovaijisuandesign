/**
 * 高清增强（超分）的尺寸逻辑。**照抄官方 3.0.14**。
 *
 * 官方那套是 `canvas.enhanceImage.*`:
 *
 * ```
 * canvas.enhanceImage.title           = 高清增强
 * canvas.enhanceImage.resolutionLabel = 分辨率
 * canvas.enhanceImage.submit          = 生成
 * canvas.enhanceImage.cancel          = 取消
 * canvas.enhanceImage.belowSource     = 目标分辨率不高于原图
 * ```
 *
 * ## 注意别抄错那一套
 *
 * 包里还有一组 `canvas.superResolution.tier.{2k,4k,8k}`（「约 2048 像素
 * 长边」那些）——**那是死字符串**，i18n 表里有，代码里零引用。真正在跑的
 * 是这里这套。按 tier 那套做的话，档位描述、默认值、禁用规则全是错的。
 *
 * ## 我们和官方的唯一差别：8K
 *
 * 官方有 1K/2K/4K/8K 四档。我们平台**按总像素封顶在 4K**
 * （3840×2160 = 8,294,400），超了静默截断、不报错 —— 实测：
 *
 * ```
 * 请求 2880×2880 = 8.29M → 2880×2880   精确兑现
 * 请求 3840×3840 = 14.7M → 2880×2880   截断
 * 请求 7680×4288 = 32.9M → 3854×2152   截断
 * ```
 *
 * 所以 8K 这一档去掉（选了也永远出不来），4K 那一档在超预算时按预算收 ——
 * 收了之后界面上要**把真实尺寸显示出来**，见 `EnhancePopover`。
 */

/** 档位。官方的 `ENHANCE_IMAGE_RESOLUTIONS`，去掉 `8k`。 */
export const ENHANCE_RESOLUTIONS = ["1k", "2k", "4k"] as const
export type EnhanceResolution = (typeof ENHANCE_RESOLUTIONS)[number]

/** 官方 `RESOLUTION_LONG_EDGE`。 */
export const RESOLUTION_LONG_EDGE: Record<EnhanceResolution, number> = {
  "1k": 1024,
  "2k": 2048,
  "4k": 3840,
}

const RESOLUTION_LABELS: Record<EnhanceResolution, string> = {
  "1k": "1K",
  "2k": "2K",
  "4k": "4K",
}

export function formatResolution(v: EnhanceResolution): string {
  return RESOLUTION_LABELS[v]
}

export const DEFAULT_ENHANCE_RESOLUTION: EnhanceResolution = "2k"

/** 官方 `OUTPUT_EDGE_MAX`。单边的硬上限。 */
const OUTPUT_EDGE_MAX = 10240

/**
 * 平台的总像素预算 = 4K 的像素数。
 *
 * **和 `crates/maas-media/src/image.rs` 的 `MAX_PIXELS` 是同一个数**,
 * 两边都要按它算：后端按它收才不会被平台静默截断，前端按它算才能把
 * 真实尺寸显示对。改一边不改另一边的表现是「界面显示 3840×3840,
 * 实际出来 2880×2880」。
 */
export const MAX_PIXELS = 3840 * 2160

function longEdge(width?: number, height?: number): number | undefined {
  if (!width || !height || width <= 0 || height <= 0) return undefined
  return Math.max(width, height)
}

/**
 * 这一档是不是**不比原图高**。官方 `isEnhanceImageResolutionBelowSource`。
 *
 * 真的放大不了却还让点的话，算出来的目标尺寸小于原图，而引擎会照办 ——
 * 用户点「生成」得到一张更糊的图，全程不报错。官方的做法是**把这一档
 * 禁掉**并在 title 上说明原因，不是点了之后再报错。
 */
export function isBelowSource(
  option: EnhanceResolution,
  width?: number,
  height?: number,
): boolean {
  const long = longEdge(width, height)
  if (long === undefined) return false
  return RESOLUTION_LONG_EDGE[option] <= long
}

/**
 * 算目标尺寸。官方 `computeEnhanceImageTarget`，外加平台的像素预算。
 *
 * 官方只按长边缩放 + 单边封顶；我们在后面多一步**按总像素收** ——
 * 4K 方图 3840×3840 长边合规、总量是横图 4K 的 1.8 倍，不收的话
 * 平台那边会静默截断成 2880×2880。
 */
export function computeTarget(
  option: EnhanceResolution,
  width?: number,
  height?: number,
): { targetWidth: number; targetHeight: number } | undefined {
  if (!width || !height || width <= 0 || height <= 0) return undefined
  const long = Math.max(width, height)
  const targetLong = Math.min(RESOLUTION_LONG_EDGE[option], OUTPUT_EDGE_MAX)
  let scale = targetLong / long

  // 像素预算。**先按长边算，再按总量收**,顺序反了的话方图会超预算。
  const budget = Math.sqrt(MAX_PIXELS / (width * height))
  if (budget < scale) scale = budget

  const targetWidth = Math.min(Math.round(width * scale), OUTPUT_EDGE_MAX)
  const targetHeight = Math.min(Math.round(height * scale), OUTPUT_EDGE_MAX)
  return { targetWidth, targetHeight }
}

/**
 * 打开面板时默认选哪一档。官方 `suggestEnhanceImageResolution`：
 * **第一个比原图长边大的档位**,一个都没有就取最高档。
 *
 * 默认落在一个禁用档上的话，面板一打开「生成」就是灰的 ——
 * 用户以为功能坏了。
 */
export function suggestResolution(width?: number, height?: number): EnhanceResolution {
  const long = longEdge(width, height)
  if (long === undefined) return DEFAULT_ENHANCE_RESOLUTION
  for (const option of ENHANCE_RESOLUTIONS) {
    if (RESOLUTION_LONG_EDGE[option] > long) return option
  }
  return ENHANCE_RESOLUTIONS[ENHANCE_RESOLUTIONS.length - 1]
}
