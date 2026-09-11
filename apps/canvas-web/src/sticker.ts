/**
 * Sticker（贴纸 / 盖章）。官方 `canvas.toolbar.sticker*` + `canvas.sticker.*`：
 *
 * ```
 * canvas.toolbar.sticker            = Sticker
 * canvas.toolbar.stickerMode        = 盖章
 * canvas.toolbar.stickerActive      = Sticker 模式已开启，可连续点击盖章。
 * canvas.toolbar.stickerInactive    = 选择 Sticker 后点击画布即可开始盖章。
 * canvas.toolbar.stickerBound       = 跟随目标
 * canvas.toolbar.stickerFree        = 自由贴纸
 * canvas.toolbar.stickerRelationHint= 跟随目标会随选中的产物移动和缩放；
 *                                     自由贴纸只固定在画布位置。
 * canvas.toolbar.stickerCount       = {{count}} 个 Sticker
 * canvas.toolbar.clearStickersTitle = 清空全部贴纸
 * canvas.toolbar.clearStickersConfirm = 确定清除当前画布的全部 Sticker 吗？
 *                                       该操作可以整体撤销一次。
 * canvas.sticker.asset.{thumbsUp,thumbsDown,star,heart,approved,rejected,question,dot}
 * ```
 *
 * 用途是**评审**：在一批生成结果上打「通过 / 拒绝 / 待定」。
 *
 * ## 和官方的一处实现差异：图案用 emoji，不用他们的 PNG
 *
 * 官方每种贴纸有一张定制 PNG（`sticker-thumbs-up-*.png` 那批），那是他们的
 * 美术资源，不搬。**官方本身就支持 emoji 贴纸**（数据里 `emoji` 是主字段、
 * `brandId` 才是可选的品牌图案，默认值就是 `DEFAULT_STICKER_EMOJI = "⭐"`），
 * 所以全用 emoji 是官方设计内的一个分支，不是我们另起炉灶。
 *
 * ## 「跟随目标」不是 parentId
 *
 * 一开始我以为是靠 React Flow 的 `parentId`（我们分组就是那么做的），
 * **读了官方实现才发现不是**：贴纸自己的 `parentId` 仍然表示它落在哪个分组
 * 里，跟随关系单独存在 `data.targetId` 上。两者正交 —— 同步位置时要先算
 * 目标的绝对坐标，再减掉贴纸自己父级的绝对坐标换回相对坐标。
 *
 * 分开是对的：贴纸贴在一个节点上，不代表它属于那个节点的分组容器。
 */

import type { CanvasNode, Size, XY } from "./api"

/** 官方 `STICKER_NODE_SIZE`。 */
export const STICKER_SIZE: Size = { width: 56, height: 56 }

/** 官方 `STICKER_MAX_ROTATION_DEG`。 */
export const STICKER_MAX_ROTATION_DEG = 30

/** 官方 `DEFAULT_STICKER_EMOJI`。 */
export const DEFAULT_STICKER_EMOJI = "⭐"

/** 一种预设贴纸。`id` 和 `label` 都照官方。 */
export interface StickerPreset {
  /** 官方的 `CANVAS_STICKER_ASSETS[].id`。 */
  id: string
  /** 官方 `canvas.sticker.asset.*` 的中文。 */
  label: string
  emoji: string
}

/**
 * 8 种预设。**顺序照官方的 `CANVAS_STICKER_PICKER_ASSET_IDS`** ——
 * 通过/拒绝排在最前，因为评审时这两个用得最多。
 */
export const STICKERS: StickerPreset[] = [
  { id: "sticker-approved", label: "通过", emoji: "✅" },
  { id: "sticker-rejected", label: "拒绝", emoji: "❌" },
  { id: "sticker-thumbs-up", label: "点赞", emoji: "👍" },
  { id: "sticker-thumbs-down", label: "踩", emoji: "👎" },
  { id: "sticker-star", label: "星星", emoji: "⭐" },
  { id: "sticker-heart", label: "爱心", emoji: "❤️" },
  { id: "sticker-question", label: "问号", emoji: "❓" },
  { id: "sticker-dot", label: "圆点", emoji: "🔴" },
]

/** 贴纸节点 `data` 的形状。字段名照官方。 */
export interface StickerData extends Record<string, unknown> {
  emoji: string
  /** 角度，度。官方是随机的，见 [`randomRotation`]。 */
  rotation: number
  /** 预设 id。自定义 emoji 时没有这个字段。 */
  brandId?: string
  /** 跟随的目标节点。没有 = 自由贴纸。 */
  targetId?: string
  /**
   * 相对目标**尺寸**的归一化偏移（0..1）。目标缩放时按比例重算位置 ——
   * 贴在右下角的贴纸，目标放大后仍在右下角。
   */
  targetAnchor?: XY
  /** 像素偏移。目标尺寸拿不到时的退路，见 [`stickerOffset`]。 */
  targetOffset?: XY
}

export const isSticker = (n: { type: string }) => n.type === "sticker"

/**
 * 随机角度。官方 `randomStickerRotation`：`round((random()*2-1) * 30)`。
 *
 * 随机是有意的 —— 一排贴纸全是正的会显得像图标，歪一点才像盖上去的。
 */
export function randomRotation(rand: () => number = Math.random): number {
  return Math.round((rand() * 2 - 1) * STICKER_MAX_ROTATION_DEG)
}

/** 画布上一个节点的位置和尺寸。调用方按当前 mode 算好再传进来。 */
export interface Placed {
  id: string
  type: string
  position: XY
  size: Size
  hidden?: boolean
}

/**
 * 盖章落点命中哪个节点。官方 `findStickerTarget`。
 *
 * **取重叠面积最大的那个，不是最上层的。** 贴纸只有 56x56，落在两个节点
 * 交界处时，"最上层"多半不是用户瞄的那个 —— 用户瞄的是章盖住得更多的
 * 那一个。
 *
 * 跳过贴纸自身和隐藏节点：贴纸不能贴在贴纸上（会连锁跟随），
 * 隐藏节点在画布上看不见，贴上去等于贴了个寂寞。
 */
export function findStickerTarget(
  nodes: readonly Placed[],
  at: XY,
): { id: string; position: XY; size: Size; anchor: XY } | undefined {
  const right = at.x + STICKER_SIZE.width
  const bottom = at.y + STICKER_SIZE.height
  let best: { area: number; target: { id: string; position: XY; size: Size; anchor: XY } } | undefined

  for (const n of nodes) {
    if (isSticker(n) || n.hidden) continue
    const w = Math.max(0, Math.min(right, n.position.x + n.size.width) - Math.max(at.x, n.position.x))
    const h = Math.max(0, Math.min(bottom, n.position.y + n.size.height) - Math.max(at.y, n.position.y))
    const area = w * h
    if (area <= 0 || (best && area <= best.area)) continue
    best = {
      area,
      target: {
        id: n.id,
        position: n.position,
        size: n.size,
        anchor: {
          // 除以 0 会得到 Infinity，之后乘回去就是 NaN ——
          // 贴纸坐标变成 NaN 后 React Flow 直接不渲染它，而且不报错。
          x: (at.x - n.position.x) / Math.max(n.size.width, 1),
          y: (at.y - n.position.y) / Math.max(n.size.height, 1),
        },
      },
    }
  }
  return best?.target
}

/**
 * 贴纸相对目标的偏移。**anchor 优先，offset 是退路。**
 *
 * 官方就是这个顺序：有 anchor 就按当前目标尺寸乘出来（于是目标缩放时贴纸
 * 跟着挪），没有才用固定像素。两个字段同时写入，是为了目标尺寸一时算不出来
 * （素材还没加载完）时还有个能用的值。
 */
export function stickerOffset(data: StickerData, targetSize: Size): XY | undefined {
  if (data.targetAnchor) {
    return { x: data.targetAnchor.x * targetSize.width, y: data.targetAnchor.y * targetSize.height }
  }
  return data.targetOffset
}

/**
 * 目标动了之后，重算跟随它的贴纸该在哪。官方 `syncStickerBindings`。
 *
 * 返回**需要移动的**贴纸及其新坐标（相对自己父级）。没动的不返回 ——
 * 每次都全量写一遍的话，拖一个节点会把画布上所有贴纸都标记成"已修改"。
 *
 * `affected` 不只是被拖的那个：**分组里的节点跟着分组一起动**，所以要把
 * 它的后代也算上。官方那段就是在做这件事。
 */
export function syncStickerBindings(
  nodes: readonly (Placed & { parentId?: string; data?: Record<string, unknown> })[],
  movedId: string,
): { id: string; position: XY }[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))

  // 被拖的那个 + 它的所有后代。
  const affected = new Set([movedId])
  for (const n of nodes) {
    let p = n.parentId
    // **要有 visited。** parentId 成环时（数据坏了就会）这个循环不退出，
    // 表现是拖一下节点整个界面卡死。
    const visited = new Set<string>()
    while (p && !visited.has(p)) {
      if (p === movedId) {
        affected.add(n.id)
        break
      }
      visited.add(p)
      p = byId.get(p)?.parentId
    }
  }

  const abs = (n: Placed & { parentId?: string }): XY => {
    let { x, y } = n.position
    let p = n.parentId
    const visited = new Set<string>()
    while (p && !visited.has(p)) {
      visited.add(p)
      const parent = byId.get(p)
      if (!parent) break
      x += parent.position.x
      y += parent.position.y
      p = parent.parentId
    }
    return { x, y }
  }

  const out: { id: string; position: XY }[] = []
  for (const s of nodes) {
    if (!isSticker(s)) continue
    const data = s.data as StickerData | undefined
    if (!data?.targetId || !affected.has(data.targetId)) continue
    const target = byId.get(data.targetId)
    if (!target) continue

    const offset = stickerOffset(data, target.size)
    if (!offset) continue

    const targetAbs = abs(target)
    const parent = s.parentId ? byId.get(s.parentId) : undefined
    const parentAbs = parent ? abs(parent) : { x: 0, y: 0 }
    const next = {
      x: targetAbs.x + offset.x - parentAbs.x,
      y: targetAbs.y + offset.y - parentAbs.y,
    }
    if (s.position.x === next.x && s.position.y === next.y) continue
    out.push({ id: s.id, position: next })
  }
  return out
}

/**
 * 造一个贴纸节点。
 *
 * `at` 是画布坐标，**贴纸的左上角就落在指针处**（官方
 * `STICKER_POINTER_ANCHOR = {x:0, y:0}`），不是居中对齐。
 */
export function makeSticker(opts: {
  at: XY
  preset?: StickerPreset
  emoji?: string
  target?: { id: string; position: XY; size: Size; anchor: XY }
  mode: string
  id?: string
  rotation?: number
}): CanvasNode {
  const { at, preset, target, mode } = opts
  const data: StickerData = {
    emoji: opts.emoji ?? preset?.emoji ?? DEFAULT_STICKER_EMOJI,
    rotation: opts.rotation ?? randomRotation(),
    ...(preset ? { brandId: preset.id } : {}),
    ...(target
      ? {
          targetId: target.id,
          targetOffset: { x: at.x - target.position.x, y: at.y - target.position.y },
          targetAnchor: target.anchor,
        }
      : {}),
  }
  return {
    id: opts.id ?? `sticker-${crypto.randomUUID()}`,
    type: "sticker",
    positions: { [mode]: at },
    size: { ...STICKER_SIZE },
    data,
  }
}
