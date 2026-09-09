import { describe, expect, it } from "bun:test"

import type { CanvasFile } from "./api"
import { positionOf, sizeOf, toCanvasFile, toFlow, type NodeData } from "./canvas"
import type { Node as FlowNode } from "@xyflow/react"

/**
 * 取自真实的 `.hilo/canvas.json`（那个说唱项目），保留了原文里所有我们
 * 没有解释的字段 —— 测试的意义就在这些字段上。
 */
const FILE: CanvasFile = {
  version: 1,
  mode: "workflow",
  nodes: [
    {
      id: "audio-1",
      type: "audio",
      positions: { workflow: { x: 0, y: 0 }, grid: { x: 10, y: 20 } },
      size: { width: 350, height: 150 },
      assetId: "asset-1",
      round: 3,
      groupId: "g-1",
      meta: { createdBy: "agent" },
      data: {
        name: "深夜下班回家.wav",
        popoverDraft: {
          t2a: {
            prompt: "中文说唱 trap，85 BPM",
            modelId: "music-3.0",
            params: { is_instrumental: "vocal", lyrics: "[verse]\n末班地铁的灯" },
          },
        },
      },
    },
    { id: "img-1", type: "image", positions: { workflow: { x: 450, y: 0 } } },
  ],
  edges: [{ id: "audio-1->img-1", source: "audio-1", target: "img-1", type: "derivation" }],
  hiddenAssetIds: ["asset-9"],
}

const moved = (id: string, x: number, y: number) =>
  ({ id, position: { x, y } }) as unknown as FlowNode<NodeData>

describe("toCanvasFile", () => {
  it("挪一个节点不会碰到别的字段", () => {
    const next = toCanvasFile(FILE, [moved("audio-1", 111, 222)], "workflow")
    const n = next.nodes[0]!

    expect(n.positions.workflow).toEqual({ x: 111, y: 222 })
    // 这些是「重新生成」按钮的数据源，丢了不报错，只是按钮从此出不来对的东西。
    expect(n.data?.popoverDraft).toEqual(FILE.nodes[0]!.data!.popoverDraft)
    expect(n.meta).toEqual({ createdBy: "agent" })
    expect(n.round).toBe(3)
    expect(n.groupId).toBe("g-1")
    expect(n.assetId).toBe("asset-1")
    expect(n.size).toEqual({ width: 350, height: 150 })
  })

  it("只动当前模式的坐标，别的模式原样留着", () => {
    const next = toCanvasFile(FILE, [moved("audio-1", 111, 222)], "workflow")
    // grid 那套坐标是用户在另一个模式下摆的，这次没碰过就不能动。
    expect(next.nodes[0]!.positions.grid).toEqual({ x: 10, y: 20 })
  })

  it("在没有坐标的模式里拖动是新增一条，不是覆盖", () => {
    const next = toCanvasFile(FILE, [moved("audio-1", 5, 6)], "storyboard")
    expect(next.nodes[0]!.positions).toEqual({
      workflow: { x: 0, y: 0 },
      grid: { x: 10, y: 20 },
      storyboard: { x: 5, y: 6 },
    })
  })

  it("顶层字段和边原样保留", () => {
    const next = toCanvasFile(FILE, [moved("audio-1", 1, 1)], "workflow")
    expect(next.version).toBe(1)
    expect(next.mode).toBe("workflow")
    expect(next.edges).toEqual(FILE.edges)
    expect(next.hiddenAssetIds).toEqual(["asset-9"])
  })

  it("界面上没有的节点不会被删掉", () => {
    // 切模式、过滤、局部渲染都可能让界面上的节点少于文件里的。按界面重建
    // 会静默删数据，而 gateway 的破坏性写入防护只在节点数骤降时才拦得住。
    const next = toCanvasFile(FILE, [moved("audio-1", 1, 1)], "workflow")
    expect(next.nodes).toHaveLength(2)
    expect(next.nodes[1]).toEqual(FILE.nodes[1]!)
  })

  it("原文件不被就地改写", () => {
    const before = JSON.stringify(FILE)
    toCanvasFile(FILE, [moved("audio-1", 999, 999)], "workflow")
    expect(JSON.stringify(FILE)).toBe(before)
  })
})

describe("positionOf", () => {
  it("模式里没有坐标时退回文件声明的模式，而不是丢掉节点", () => {
    expect(positionOf(FILE.nodes[1]!, "storyboard", "workflow")).toEqual({ x: 450, y: 0 })
  })

  it("两个都没有才落到原点", () => {
    const orphan = { id: "x", type: "image", positions: {} }
    expect(positionOf(orphan, "grid", "workflow")).toEqual({ x: 0, y: 0 })
  })
})

describe("sizeOf", () => {
  it("模式专属尺寸优先于全局尺寸", () => {
    const n = { ...FILE.nodes[0]!, sizes: { workflow: { width: 9, height: 9 } } }
    expect(sizeOf(n, "workflow")).toEqual({ width: 9, height: 9 })
    expect(sizeOf(n, "grid")).toEqual({ width: 350, height: 150 })
  })

  it("都没有就按类型给个兜底（值取自官方的 IMAGE_CARD_DEFAULT_SIZE）", () => {
    expect(sizeOf({ id: "x", type: "image", positions: {} }, "workflow")).toEqual({
      width: 350,
      height: 350,
    })
  })

  it("有素材像素尺寸时按长宽比等比缩，不套固定卡片", () => {
    // 这一条是观感的关键：套固定 350x350 的话，9:16 的竖图会变成方框里
    // 的一条，周围一圈空白 —— 和官方画布差别最明显的就是这里。
    const n = { id: "x", type: "image", positions: {} }
    expect(sizeOf(n, "workflow", { id: "x", type: "image", width: 1080, height: 1920 })).toEqual({
      width: 197,
      height: 350,
    })
    expect(sizeOf(n, "workflow", { id: "x", type: "image", width: 1920, height: 1080 })).toEqual({
      width: 350,
      height: 197,
    })
  })

  it("短边不低于 100 —— 极端长宽比不能压成一条线", () => {
    const n = { id: "x", type: "image", positions: {} }
    expect(sizeOf(n, "workflow", { id: "x", type: "image", width: 4000, height: 200 })).toEqual({
      width: 350,
      height: 100,
    })
  })

  it("显式尺寸优先于按素材算", () => {
    const n = { id: "x", type: "image", positions: {}, size: { width: 42, height: 42 } }
    expect(sizeOf(n, "workflow", { id: "x", type: "image", width: 1080, height: 1920 })).toEqual({
      width: 42,
      height: 42,
    })
  })
})

describe("toFlow", () => {
  it("认不出的类型走 unknown 组件，而不是 React Flow 的默认节点", () => {
    // 默认节点看起来像渲染正常，实际上内容一个字都没显示 —— 那是最坏的失败。
    const f: CanvasFile = { ...FILE, nodes: [{ id: "t", type: "table", positions: {} }], edges: [] }
    expect(toFlow(f, "workflow", new Map()).nodes[0]!.type).toBe("unknown")
  })

  it("边保留下来并标出类型", () => {
    const { edges } = toFlow(FILE, "workflow", new Map())
    expect(edges).toHaveLength(1)
    expect(edges[0]!.label).toBe("derivation")
  })
})
