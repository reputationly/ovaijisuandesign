/**
 * 裁剪与旋转。官方 `canvas.crop` / `canvas.rotate.*`：
 *
 * ```
 * canvas.crop            = 裁剪        canvas.cropping     = 裁剪中...
 * canvas.rotate.title    = 旋转与镜像   canvas.rotate.label = 旋转
 * canvas.rotate.step90   = 旋转 {{degrees}}°
 * canvas.rotate.flipH    = 水平翻转     canvas.rotate.flipV = 垂直翻转
 * canvas.rotate.scrub    = 左右拖拽调节角度（按住 Shift 加速）
 * canvas.rotate.save     = 保存        canvas.rotate.saving = 保存中
 * ```
 *
 * ## 这两个和别的编辑功能不一样
 *
 * 官方那条工具条上的大部分功能（重绘、擦除、扩图、去背景、重打光、
 * 图层拆分）都走他们云端的 `/api/edit/*` 专用接口，底层是带掩码的
 * nano-banana 或专门的分割/光照模型 —— **我们平台上一个都没有**。
 *
 * 裁剪和旋转不一样：**它们是纯像素搬运**,`<canvas>` 就能做完，
 * 不依赖任何模型。所以先做这两个。
 *
 * 逻辑放这里、界面只管画 —— 旋转后的画布尺寸、EXIF 式的翻转叠加顺序
 * 这些在界面上很难测。
 */

/** 裁剪框，像素。 */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

/** 旋转与镜像的状态。 */
export interface Orientation {
  /** 角度，顺时针。任意值，不限于 90 的倍数（官方支持拖拽调角度）。 */
  degrees: number
  flipH: boolean
  flipV: boolean
}

export const NO_ORIENTATION: Orientation = { degrees: 0, flipH: false, flipV: false }

/** 官方 `canvas.rotate.step90` =「旋转 {{degrees}}°」。 */
export function rotateBy(o: Orientation, delta: number): Orientation {
  // **规整到 [0, 360)**。不规整的话连点四次「旋转 90°」会得到 360,
  // 界面上显示「360°」——数学上对，但没人这么说。
  return { ...o, degrees: normalizeDegrees(o.degrees + delta) }
}

export function normalizeDegrees(d: number): number {
  const r = d % 360
  return r < 0 ? r + 360 : r
}

/**
 * 旋转之后画布要多大。
 *
 * **不是简单交换宽高** —— 那只对 90 的倍数成立。任意角度下外接矩形是
 * `w|cos| + h|sin|` × `w|sin| + h|cos|`,不按这个算的话斜着转 45° 会把
 * 四个角切掉，而且不报错。
 */
export function rotatedSize(
  width: number,
  height: number,
  degrees: number,
): { width: number; height: number } {
  const rad = (normalizeDegrees(degrees) * Math.PI) / 180
  const c = Math.abs(Math.cos(rad))
  const s = Math.abs(Math.sin(rad))
  return {
    width: Math.round(width * c + height * s),
    height: Math.round(width * s + height * c),
  }
}

/** 裁剪框夹回图片范围内。 */
export function clampCrop(rect: CropRect, width: number, height: number): CropRect {
  // **先夹尺寸再夹位置。** 反过来的话，一个比图还大的框会被推到负坐标上。
  const w = Math.max(1, Math.min(Math.round(rect.width), width))
  const h = Math.max(1, Math.min(Math.round(rect.height), height))
  return {
    width: w,
    height: h,
    x: Math.max(0, Math.min(Math.round(rect.x), width - w)),
    y: Math.max(0, Math.min(Math.round(rect.y), height - h)),
  }
}

/**
 * 按比例把裁剪框调整成最大可能的那个，居中。
 *
 * `null` = 自由裁剪（官方 `assetCenter.cover.freeAspect` =「自由」）。
 */
export function cropForRatio(
  width: number,
  height: number,
  ratio: number | null,
): CropRect {
  if (!ratio || ratio <= 0) return { x: 0, y: 0, width, height }
  // 取"能放进去的最大矩形"：按宽算高，超了就按高算宽。
  let w = width
  let h = Math.round(width / ratio)
  if (h > height) {
    h = height
    w = Math.round(height * ratio)
  }
  return {
    x: Math.round((width - w) / 2),
    y: Math.round((height - h) / 2),
    width: w,
    height: h,
  }
}

/** 官方裁剪的比例预设。`null` 是「自由」。 */
export const CROP_RATIOS: { label: string; ratio: number | null }[] = [
  { label: "自由", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:4", ratio: 3 / 4 },
  { label: "3:2", ratio: 3 / 2 },
  { label: "2:3", ratio: 2 / 3 },
]

/**
 * 把源图按 `crop` + `orientation` 画到一张新 canvas 上。
 *
 * ## 顺序是 **先裁再转**
 *
 * 反过来的话，用户在界面上框的那个矩形是在**转之前**的图上框的，
 * 转完之后坐标系已经不一样了 —— 裁出来的是另一块地方，而且不报错。
 *
 * ## 翻转在旋转**之前**做
 *
 * 和 EXIF 的约定一致。顺序反了的话，「水平翻转 + 旋转 90°」和
 * 「旋转 90° + 水平翻转」出来的是镜像关系的两张图。
 */
export function drawTransformed(
  src: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  crop: CropRect,
  o: Orientation,
): HTMLCanvasElement {
  const c = clampCrop(crop, srcWidth, srcHeight)
  const out = rotatedSize(c.width, c.height, o.degrees)

  const canvas = document.createElement("canvas")
  canvas.width = out.width
  canvas.height = out.height
  const ctx = canvas.getContext("2d")
  if (!ctx) return canvas

  ctx.save()
  // 以输出画布的中心为原点，转完再把裁剪区画上去 —— 这样任意角度都居中。
  ctx.translate(out.width / 2, out.height / 2)
  ctx.rotate((normalizeDegrees(o.degrees) * Math.PI) / 180)
  ctx.scale(o.flipH ? -1 : 1, o.flipV ? -1 : 1)
  ctx.drawImage(
    src,
    c.x,
    c.y,
    c.width,
    c.height,
    -c.width / 2,
    -c.height / 2,
    c.width,
    c.height,
  )
  ctx.restore()
  return canvas
}

/**
 * 改完之后的文件名。
 *
 * 带上做了什么（`-crop` / `-rot90`）而不是加个序号 —— 用户在资产列表里
 * 一眼能看出这张是怎么来的。
 */
export function transformedName(
  source: string | undefined,
  crop: CropRect,
  o: Orientation,
  srcWidth: number,
  srcHeight: number,
): string {
  const stem = (source ?? "image").replace(/\.[^.]+$/, "")
  const parts: string[] = []
  if (crop.width !== srcWidth || crop.height !== srcHeight) parts.push("crop")
  if (o.degrees) parts.push(`rot${Math.round(o.degrees)}`)
  if (o.flipH) parts.push("fliph")
  if (o.flipV) parts.push("flipv")
  return `${stem}${parts.length ? "-" + parts.join("-") : "-edit"}.png`
}
