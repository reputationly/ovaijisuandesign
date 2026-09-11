import { describe, expect, it } from "bun:test"

import { GAP, tidy, type TidyEdge, type TidyNode } from "./tidy"

const n = (id: string, type = "image", width = 100, height = 100): TidyNode => ({
  id,
  type,
  width,
  height,
})
const e = (source: string, target: string): TidyEdge => ({ source, target })

/** 某个节点在第几行（y 相同的算同一行）。 */
const rowsOf = (pos: Map<string, { x: number; y: number }>) => {
  const byY = new Map<number, string[]>()
  for (const [id, p] of pos) byY.set(p.y, [...(byY.get(p.y) ?? []), id])
  return [...byY.entries()].sort((a, b) => a[0] - b[0]).map(([, ids]) => ids.sort())
}

describe("不改入参", () => {
  it("返回新表，原节点对象不动", () => {
    const nodes = [n("a"), n("b")]
    const snapshot = JSON.stringify(nodes)
    tidy(nodes, [], "grid")
    // 调用方要拿旧坐标做「撤回」,就地改的话那份旧数据当场就没了。
    expect(JSON.stringify(nodes)).toBe(snapshot)
  })
})

describe("水平 / 垂直", () => {
  it("按各自的实际尺寸累加，不是等距", () => {
    // 一个 300 宽一个 100 宽。等距排的话宽的那个会压到后面那个上。
    const pos = tidy([n("a", "image", 300), n("b", "image", 100)], [], "horizontal")
    expect(pos.get("a")).toEqual({ x: 0, y: 0 })
    expect(pos.get("b")).toEqual({ x: 300 + GAP, y: 0 })
  })

  it("垂直同理", () => {
    const pos = tidy([n("a", "image", 100, 500), n("b")], [], "vertical")
    expect(pos.get("b")).toEqual({ x: 0, y: 500 + GAP })
  })
})

describe("宫格", () => {
  it("高度不同的节点不会留大片空白", () => {
    // 按列累加。固定行高的话，矮的下面会空出高的那一截。
    const pos = tidy([n("a", "image", 100, 400), n("b", "image", 100, 50), n("c"), n("d")], [], "grid")
    const ys = [...pos.values()].map((p) => p.y)
    // 至少有一个节点被塞进了"矮的那列"的空档里，而不是统统对齐到 400+GAP。
    expect(ys.some((y) => y > 0 && y < 400)).toBe(true)
  })
})

describe("按素材类型", () => {
  it("图片 / 视频 / 音频 / 文本 各一条泳道，顺序固定", () => {
    const pos = tidy(
      [n("t", "text"), n("i", "image"), n("v", "video"), n("a", "audio")],
      [],
      "type",
    )
    expect(rowsOf(pos)).toEqual([["i"], ["v"], ["a"], ["t"]])
  })

  it("不认识的类型排在最后，不会被丢掉", () => {
    // 丢掉的话就是"点了整理，贴纸原地没动",而用户看不出为什么。
    const pos = tidy([n("s", "sticker"), n("i", "image")], [], "type")
    expect(pos.has("s")).toBe(true)
    expect(pos.get("s")!.y).toBeGreaterThan(pos.get("i")!.y)
  })

  it("不考虑连线 —— 官方 hint 明说的", () => {
    const pos = tidy([n("i", "image"), n("v", "video")], [e("v", "i")], "type")
    // 连线方向是 v → i，但按类型排 image 仍在上面。
    expect(pos.get("i")!.y).toBeLessThan(pos.get("v")!.y)
  })
})

describe("按连线关系", () => {
  it("上游在上，下游在下", () => {
    const pos = tidy([n("a"), n("b"), n("c")], [e("a", "b"), e("b", "c")], "connections")
    expect(rowsOf(pos)).toEqual([["a"], ["b"], ["c"]])
  })

  it("用最长路径分层 —— 否则箭头会往回指", () => {
    // a→b→c 同时 a→c。c 的最短路径是 1 层，但 b 在第 1 层；
    // c 必须排在 b 之后，不然 b→c 这条线是往上指的。
    const pos = tidy([n("a"), n("b"), n("c")], [e("a", "b"), e("b", "c"), e("a", "c")], "connections")
    expect(pos.get("c")!.y).toBeGreaterThan(pos.get("b")!.y)
  })

  it("离散节点收拢到下方", () => {
    const pos = tidy([n("a"), n("b"), n("lonely")], [e("a", "b")], "connections")
    expect(pos.get("lonely")!.y).toBeGreaterThan(pos.get("b")!.y)
  })

  it("成环不会死循环，而且环里的节点不会被丢掉", () => {
    // 画布上的边是用户随手连的，成环完全可能。没有保护的话这里会死循环,
    // 表现是点了「整理」整个界面卡死。
    const nodes = [n("a"), n("b"), n("x")]
    const pos = tidy(nodes, [e("a", "b"), e("b", "a"), e("x", "a")], "connections")
    for (const k of nodes) expect(pos.has(k.id)).toBe(true)
  })

  it("全是环也能跑完", () => {
    const nodes = [n("a"), n("b")]
    const pos = tidy(nodes, [e("a", "b"), e("b", "a")], "connections")
    expect(pos.size).toBe(2)
  })

  it("悬空的边不影响布局", () => {
    // 两端有一端不在节点集里。不过滤的话入度会算错，节点排不出来。
    const pos = tidy([n("a"), n("b")], [e("a", "b"), e("ghost", "a")], "connections")
    expect(rowsOf(pos)).toEqual([["a"], ["b"]])
  })

  it("一个节点都没有时返回空表，不崩", () => {
    expect(tidy([], [], "connections").size).toBe(0)
    expect(tidy([], [], "grid").size).toBe(0)
  })
})
