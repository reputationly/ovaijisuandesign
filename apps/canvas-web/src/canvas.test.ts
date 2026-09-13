import { describe, expect, it } from "bun:test"

import type { CanvasFile } from "./api"
import { GROUP_Z_INDEX, positionOf, sizeOf, toCanvasFile, toFlow, type NodeData } from "./canvas"
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

  it("边保留下来，但**不挂 label**", () => {
    // 这里原来钉的是 `label === "derivation"`。官方的 `toFlowEdge` 根本
    // 没有 label 这一项 —— 挂上去的结果是中文界面里每条连线都顶着一行
    // 英文字段名。`animated` 才是标出 derivation 的方式。
    const { edges } = toFlow(FILE, "workflow", new Map())
    expect(edges).toHaveLength(1)
    expect(edges[0]!.label).toBeUndefined()
    expect(edges[0]!.animated).toBe(true)
  })
})

describe("sizeOf：还等于默认值的尺寸要按素材重算", () => {
  const asset = { id: "x", type: "image", width: 1360, height: 1024 }

  it("历史默认值 350x195 会被素材比例覆盖", () => {
    // 早期版本给图片节点写死 350x195（16:9），素材却是 4:3 ——
    // 画布上每张图周围都有一圈白边。那些节点已经存在 canvas.json 里，
    // 不认这个历史默认值就永远修不好。
    const n = { id: "x", type: "image", positions: {}, size: { width: 350, height: 195 } }
    expect(sizeOf(n, "workflow", asset)).toEqual({ width: 350, height: 264 })
  })

  it("用户手动拖过的尺寸不被覆盖", () => {
    const n = { id: "x", type: "image", positions: {}, size: { width: 512, height: 200 } }
    expect(sizeOf(n, "workflow", asset)).toEqual({ width: 512, height: 200 })
  })

  it("拿不到素材尺寸时保留原来存的值，不要退回类型默认", () => {
    // 退回默认会让节点在"素材信息还没加载出来"的一瞬间跳一下。
    const n = { id: "x", type: "image", positions: {}, size: { width: 350, height: 195 } }
    expect(sizeOf(n, "workflow")).toEqual({ width: 350, height: 195 })
  })
})

describe("分组的 z 轴", () => {
  it("组要压在边下面，否则组内的连线全被盖住", () => {
    // **这条是真出过的问题。** 编完组之后画布上一条连线都看不见，
    // 而 canvas.json 里 4 条边一条不少 —— React Flow 把边画在默认
    // `zIndex: 0` 的 SVG 层里，组作为节点画在它上面，背景整个盖住。
    // 不报错、刷新也不会好。官方 `GROUP_Z_INDEX = -100`。
    const file: CanvasFile = {
      version: 1,
      mode: "freeform",
      nodes: [
        { id: "g", type: "group", positions: { freeform: { x: 0, y: 0 } } },
        { id: "a", type: "image", parentId: "g", positions: { freeform: { x: 0, y: 0 } } },
      ],
      edges: [],
    }
    const { nodes } = toFlow(file, "freeform", new Map())
    const group = nodes.find((n) => n.id === "g")!
    const child = nodes.find((n) => n.id === "a")!
    expect(group.zIndex).toBe(GROUP_Z_INDEX)
    expect(GROUP_Z_INDEX).toBeLessThan(0)
    // 成员不该被压下去 —— 压下去的话组的背景又会盖住成员本身。
    expect(child.zIndex).toBeUndefined()
  })

  it("已经存在的老画布（组上没有 meta.zIndex）也要被兜底修好", () => {
    // 只读 `meta.zIndex` 的话，这次之前建的那些组永远是坏的,
    // 除非再写一次数据迁移。
    const file: CanvasFile = {
      version: 1,
      mode: "freeform",
      nodes: [{ id: "g", type: "group", positions: { freeform: { x: 0, y: 0 } } }],
      edges: [],
    }
    const { nodes } = toFlow(file, "freeform", new Map())
    expect(nodes[0].zIndex).toBe(GROUP_Z_INDEX)
  })

  it("meta.zIndex 写了就以它为准", () => {
    const file: CanvasFile = {
      version: 1,
      mode: "freeform",
      nodes: [
        { id: "g", type: "group", positions: { freeform: { x: 0, y: 0 } }, meta: { zIndex: -7 } },
      ],
      edges: [],
    }
    const { nodes } = toFlow(file, "freeform", new Map())
    expect(nodes[0].zIndex).toBe(-7)
  })
})

describe("折叠分组", () => {
  /** 一个组 + 两个成员 + 一条组内边 + 一条伸到组外的边。 */
  const withGroup = (collapsed: boolean): CanvasFile => ({
    version: 1,
    mode: "freeform",
    nodes: [
      {
        id: "g",
        type: "group",
        positions: { freeform: { x: 0, y: 0 } },
        size: { width: 800, height: 400 },
        ...(collapsed ? { meta: { collapsed: true } } : {}),
      },
      { id: "a", type: "image", parentId: "g", positions: { freeform: { x: 0, y: 0 } } },
      { id: "b", type: "image", parentId: "g", positions: { freeform: { x: 0, y: 0 } } },
      { id: "out", type: "image", positions: { freeform: { x: 999, y: 0 } } },
    ],
    edges: [
      { id: "e1", source: "a", target: "b", type: "derivation" },
      { id: "e2", source: "b", target: "out", type: "derivation" },
    ],
  })

  it("折叠时成员全部藏起来", () => {
    // 只收组不藏成员的话，成员会留在原地悬空 —— 组框已经收成 1×1,
    // 看起来就是一堆节点散在画布上，而且再也框不回去。
    const { nodes } = toFlow(withGroup(true), "freeform", new Map())
    expect(nodes.find((n) => n.id === "a")!.hidden).toBe(true)
    expect(nodes.find((n) => n.id === "b")!.hidden).toBe(true)
    // 组外的节点不受影响。
    expect(nodes.find((n) => n.id === "out")!.hidden).toBeUndefined()
    // 组本身要看得见 —— 藏了的话没有任何地方能再展开。
    expect(nodes.find((n) => n.id === "g")!.hidden).toBeUndefined()
  })

  it("折叠时组收成 1×1，并且不可选、拖拽限定在 chip 上", () => {
    const { nodes } = toFlow(withGroup(true), "freeform", new Map())
    const g = nodes.find((n) => n.id === "g")!
    expect(g.width).toBe(1)
    expect(g.height).toBe(1)
    // 强制取消选中：折叠前留下的选中态会让工具条浮在一片空地上。
    expect(g.selectable).toBe(false)
    expect(g.selected).toBe(false)
    expect(g.dragHandle).toBe(".canvas-group-collapsed-drag-handle")
  })

  it("**跨组的边也要藏** —— 只在两端都藏时才藏会漏出半条线", () => {
    const { edges } = toFlow(withGroup(true), "freeform", new Map())
    // e1 两端都在组里
    expect(edges.find((e) => e.id === "e1")!.hidden).toBe(true)
    // e2 一端在组里、一端在组外 —— 不藏的话是一条从折叠的组里伸出来、
    // 那一头什么都没有的线。
    expect(edges.find((e) => e.id === "e2")!.hidden).toBe(true)
  })

  it("展开时一切照旧", () => {
    const { nodes, edges } = toFlow(withGroup(false), "freeform", new Map())
    expect(nodes.every((n) => n.hidden === undefined)).toBe(true)
    expect(edges.every((e) => e.hidden === undefined)).toBe(true)
    expect(nodes.find((n) => n.id === "g")!.width).toBe(800)
  })

  it("meta.collapsed 才算数，data.collapsed 不算", () => {
    // 后端一度把这个标记写在 `data` 里。官方读的是 `meta` ——
    // 认错地方的话开关看着能点，刷新又回到展开，而且不报错。
    const f = withGroup(false)
    f.nodes[0]!.data = { collapsed: true }
    const { nodes } = toFlow(f, "freeform", new Map())
    expect(nodes.find((n) => n.id === "a")!.hidden).toBeUndefined()
  })
})

describe("边的端点高亮", () => {
  it("source 或 target 被选中时边就高亮", () => {
    const f: CanvasFile = {
      version: 1,
      mode: "freeform",
      nodes: [
        { id: "a", type: "image", positions: { freeform: { x: 0, y: 0 } } },
        { id: "b", type: "image", positions: { freeform: { x: 0, y: 0 } } },
        { id: "c", type: "image", positions: { freeform: { x: 0, y: 0 } } },
      ],
      edges: [
        { id: "ab", source: "a", target: "b", type: "derivation" },
        { id: "bc", source: "b", target: "c", type: "derivation" },
      ],
    }
    const { edges } = toFlow(f, "freeform", new Map(), new Set(["a"]))
    expect(edges.find((e) => e.id === "ab")!.selected).toBe(true)
    expect(edges.find((e) => e.id === "bc")!.selected).toBe(false)
  })

  it("不传选中集时整个不设这个键", () => {
    // 一律给 `selected: false` 会盖掉 React Flow 自己的选中状态。
    const { edges } = toFlow(FILE, "workflow", new Map())
    expect(edges[0]!.selected).toBeUndefined()
  })
})
