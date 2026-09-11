import { describe, expect, it } from "bun:test"

import {
  DEFAULT_STICKER_EMOJI,
  STICKERS,
  STICKER_MAX_ROTATION_DEG,
  STICKER_SIZE,
  findStickerTarget,
  makeSticker,
  randomRotation,
  stickerOffset,
  syncStickerBindings,
  type Placed,
  type StickerData,
} from "./sticker"

const node = (id: string, x: number, y: number, w = 100, h = 100, extra: Partial<Placed> = {}) =>
  ({ id, type: "image", position: { x, y }, size: { width: w, height: h }, ...extra }) as Placed

describe("常量对得上官方", () => {
  it("尺寸 56x56、最大旋转 30 度、默认 emoji 是星星", () => {
    expect(STICKER_SIZE).toEqual({ width: 56, height: 56 })
    expect(STICKER_MAX_ROTATION_DEG).toBe(30)
    expect(DEFAULT_STICKER_EMOJI).toBe("⭐")
  })

  it("8 种预设，id 照官方且不重复", () => {
    expect(STICKERS).toHaveLength(8)
    expect(new Set(STICKERS.map((s) => s.id)).size).toBe(8)
    // 官方 CANVAS_STICKER_ASSETS 的 id 全集。
    expect(STICKERS.map((s) => s.id).sort()).toEqual(
      [
        "sticker-approved",
        "sticker-dot",
        "sticker-heart",
        "sticker-question",
        "sticker-rejected",
        "sticker-star",
        "sticker-thumbs-down",
        "sticker-thumbs-up",
      ].sort(),
    )
  })

  it("旋转角落在 ±30 度内", () => {
    expect(randomRotation(() => 0)).toBe(-30)
    expect(randomRotation(() => 1)).toBe(30)
    expect(randomRotation(() => 0.5)).toBe(0)
  })
})

describe("命中目标", () => {
  it("取重叠面积最大的，不是列表里最后一个", () => {
    // 章盖在 (0,0)-(56,56)。a 占了 40x40，b 占了 56x56 全覆盖。
    // b 排在前面 —— 用"最后一个"或"最上层"都会选错。
    const hit = findStickerTarget([node("b", -20, -20, 200, 200), node("a", 0, 0, 40, 40)], {
      x: 0,
      y: 0,
    })
    expect(hit?.id).toBe("b")
  })

  it("没有重叠时返回 undefined —— 那是自由贴纸", () => {
    expect(findStickerTarget([node("a", 500, 500)], { x: 0, y: 0 })).toBeUndefined()
  })

  it("跳过贴纸自身和隐藏节点", () => {
    const nodes = [
      { ...node("s", 0, 0), type: "sticker" },
      { ...node("h", 0, 0), hidden: true },
    ] as Placed[]
    expect(findStickerTarget(nodes, { x: 0, y: 0 })).toBeUndefined()
  })

  it("anchor 是归一化比例", () => {
    // 目标 200x200 在原点，章落在 (100,50) → anchor (0.5, 0.25)。
    const hit = findStickerTarget([node("a", 0, 0, 200, 200)], { x: 100, y: 50 })
    expect(hit?.anchor).toEqual({ x: 0.5, y: 0.25 })
  })

  it("零尺寸节点不会算出 NaN", () => {
    // 除以 0 得 Infinity，乘回去就是 NaN —— 贴纸坐标一旦是 NaN，
    // React Flow 直接不渲染它，而且不报错。
    const hit = findStickerTarget([node("a", 0, 0, 0, 0)], { x: 0, y: 0 })
    // 零面积不算命中。
    expect(hit).toBeUndefined()
  })
})

describe("跟随目标", () => {
  const sticker = (id: string, x: number, y: number, data: StickerData, parentId?: string) =>
    ({
      id,
      type: "sticker",
      position: { x, y },
      size: STICKER_SIZE,
      data,
      ...(parentId ? { parentId } : {}),
    }) as Placed & { parentId?: string; data: StickerData }

  it("目标移动，贴纸按 anchor 跟着走", () => {
    const nodes = [
      node("img", 300, 300, 200, 200),
      sticker("s1", 0, 0, { emoji: "✅", rotation: 0, targetId: "img", targetAnchor: { x: 0.5, y: 0.5 } }),
    ]
    const moves = syncStickerBindings(nodes, "img")
    expect(moves).toEqual([{ id: "s1", position: { x: 400, y: 400 } }])
  })

  it("目标放大，贴纸按比例挪 —— 贴右下角的仍在右下角", () => {
    const small = [
      node("img", 0, 0, 100, 100),
      sticker("s1", 0, 0, { emoji: "✅", rotation: 0, targetId: "img", targetAnchor: { x: 0.8, y: 0.8 } }),
    ]
    expect(syncStickerBindings(small, "img")[0]!.position).toEqual({ x: 80, y: 80 })

    const big = [
      node("img", 0, 0, 400, 400),
      sticker("s1", 0, 0, { emoji: "✅", rotation: 0, targetId: "img", targetAnchor: { x: 0.8, y: 0.8 } }),
    ]
    expect(syncStickerBindings(big, "img")[0]!.position).toEqual({ x: 320, y: 320 })
  })

  it("贴纸本身不跟着放大 —— 只挪位置", () => {
    // 官方 syncStickerBindings 只调 moveNode，从不改 size。
    const n = makeSticker({ at: { x: 0, y: 0 }, preset: STICKERS[0]!, mode: "freeform" })
    expect(n.size).toEqual(STICKER_SIZE)
  })

  it("自由贴纸不动", () => {
    const nodes = [node("img", 300, 300), sticker("s1", 10, 10, { emoji: "⭐", rotation: 0 })]
    expect(syncStickerBindings(nodes, "img")).toEqual([])
  })

  it("已经在正确位置的不返回 —— 否则拖一下会把全部贴纸标成已改", () => {
    const nodes = [
      node("img", 0, 0, 100, 100),
      sticker("s1", 50, 50, { emoji: "✅", rotation: 0, targetId: "img", targetAnchor: { x: 0.5, y: 0.5 } }),
    ]
    expect(syncStickerBindings(nodes, "img")).toEqual([])
  })

  it("拖分组时，组里节点上的贴纸也要跟着", () => {
    // img 在 group 里；拖的是 group，但 img 的绝对坐标变了。
    const nodes = [
      node("group", 100, 100, 500, 500),
      { ...node("img", 10, 10, 100, 100), parentId: "group" } as Placed & { parentId: string },
      sticker("s1", 0, 0, { emoji: "✅", rotation: 0, targetId: "img", targetAnchor: { x: 0, y: 0 } }),
    ]
    const moves = syncStickerBindings(nodes, "group")
    // img 绝对坐标 = (110,110)，anchor 0,0 → 贴纸到 (110,110)。
    expect(moves).toEqual([{ id: "s1", position: { x: 110, y: 110 } }])
  })

  it("贴纸自己在分组里时，写回的是相对坐标", () => {
    const nodes = [
      node("g", 1000, 1000, 500, 500),
      node("img", 0, 0, 100, 100),
      sticker("s1", 0, 0, { emoji: "✅", rotation: 0, targetId: "img", targetAnchor: { x: 0.5, y: 0.5 } }, "g"),
    ]
    // 目标绝对 (50,50)，贴纸父级绝对 (1000,1000) → 相对 (-950,-950)。
    expect(syncStickerBindings(nodes, "img")).toEqual([{ id: "s1", position: { x: -950, y: -950 } }])
  })

  it("parentId 成环不会死循环", () => {
    // 数据坏掉时会这样。没有 visited 集合的话这里跑不完，
    // 表现是拖一下节点整个界面卡死。
    const nodes = [
      { ...node("a", 0, 0), parentId: "b" } as Placed & { parentId: string },
      { ...node("b", 0, 0), parentId: "a" } as Placed & { parentId: string },
    ]
    expect(() => syncStickerBindings(nodes, "a")).not.toThrow()
  })

  it("目标被删掉后贴纸不动，也不崩", () => {
    const nodes = [sticker("s1", 10, 10, { emoji: "✅", rotation: 0, targetId: "gone" })]
    expect(syncStickerBindings(nodes, "gone")).toEqual([])
  })
})

describe("stickerOffset", () => {
  it("anchor 优先于 offset", () => {
    const d: StickerData = {
      emoji: "✅",
      rotation: 0,
      targetAnchor: { x: 0.5, y: 0.5 },
      targetOffset: { x: 999, y: 999 },
    }
    expect(stickerOffset(d, { width: 100, height: 100 })).toEqual({ x: 50, y: 50 })
  })

  it("没有 anchor 时退回像素偏移", () => {
    const d: StickerData = { emoji: "✅", rotation: 0, targetOffset: { x: 7, y: 8 } }
    expect(stickerOffset(d, { width: 100, height: 100 })).toEqual({ x: 7, y: 8 })
  })
})

describe("makeSticker", () => {
  it("贴纸左上角落在指针处，不是居中", () => {
    // 官方 STICKER_POINTER_ANCHOR = {x:0,y:0}。
    const n = makeSticker({ at: { x: 40, y: 60 }, preset: STICKERS[0]!, mode: "freeform" })
    expect(n.positions.freeform).toEqual({ x: 40, y: 60 })
  })

  it("命中目标时同时写 anchor 和 offset", () => {
    const n = makeSticker({
      at: { x: 50, y: 50 },
      preset: STICKERS[0]!,
      mode: "freeform",
      target: { id: "img", position: { x: 0, y: 0 }, size: { width: 100, height: 100 }, anchor: { x: 0.5, y: 0.5 } },
    })
    const d = n.data as StickerData
    expect(d.targetId).toBe("img")
    expect(d.targetAnchor).toEqual({ x: 0.5, y: 0.5 })
    expect(d.targetOffset).toEqual({ x: 50, y: 50 })
  })

  it("自由贴纸不带 target 字段", () => {
    const d = makeSticker({ at: { x: 0, y: 0 }, mode: "freeform" }).data as StickerData
    expect("targetId" in d).toBe(false)
    expect(d.emoji).toBe(DEFAULT_STICKER_EMOJI)
  })

  it("id 带 sticker- 前缀 —— 清除时靠 type 认，但日志里看 id 更直观", () => {
    expect(makeSticker({ at: { x: 0, y: 0 }, mode: "freeform" }).id).toMatch(/^sticker-/)
  })
})
