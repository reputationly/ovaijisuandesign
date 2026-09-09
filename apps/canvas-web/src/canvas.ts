/** `canvas.json` 与 React Flow 图之间的互转。 */

import type { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react"

import type { CanvasEdge, CanvasFile, CanvasMode, CanvasNode, NodeDetail, Size } from "./api"

/** 挂在 React Flow 节点 `data` 上的东西。节点组件从这里取。 */
export interface NodeData extends Record<string, unknown> {
  raw: CanvasNode
  detail?: NodeDetail
}

/**
 * 节点尺寸。**规则和常量都取自官方 3.0.12 的实现**，不是估的：
 *
 * ```
 * NODE_SIZE_MAX = 350   NODE_SIZE_MIN = 100
 * AUDIO_CARD_SIZE       350 x 150
 * IMAGE_CARD_DEFAULT    350 x 350
 * TEXT_CARD_DEFAULT     350 x 500   （min 200 x 100）
 * sticker               56 x 56
 * ```
 *
 * 有长宽比的话按 `computeNodeSize` 算：**等比缩到长边 350**，短边不低于 100。
 * 这一条是画面观感的关键 —— 按固定高度裁的话，竖图会被压成一条，
 * 而官方画布上竖图就是竖的。
 */
const NODE_SIZE_MAX = 350
const NODE_SIZE_MIN = 100

const DEFAULT_SIZE: Record<string, Size> = {
  image: { width: 350, height: 350 },
  video: { width: 350, height: 350 },
  audio: { width: 350, height: 150 },
  text: { width: 350, height: 500 },
}
const FALLBACK_SIZE: Size = { width: 350, height: 350 }

/** 官方的 `computeNodeSize`：等比缩到长边 NODE_SIZE_MAX，短边保底 MIN。 */
export function fitNodeSize(w: number, h: number): Size | undefined {
  if (!w || !h || w <= 0 || h <= 0) return undefined
  const scale = Math.min(NODE_SIZE_MAX / w, NODE_SIZE_MAX / h)
  return {
    width: Math.max(NODE_SIZE_MIN, Math.round(w * scale)),
    height: Math.max(NODE_SIZE_MIN, Math.round(h * scale)),
  }
}

export function sizeOf(node: CanvasNode, mode: CanvasMode, detail?: NodeDetail): Size {
  const explicit = node.sizes?.[mode] ?? node.size
  if (explicit) return explicit
  // 没有显式尺寸就按素材的真实长宽比算，而不是套一个固定卡片 ——
  // 套固定尺寸的话一张 9:16 的竖图会显示成 350x350 里的一条窄图，
  // 周围一圈空白，和官方差别最明显的就是这里。
  if (detail?.width && detail?.height) {
    const fitted = fitNodeSize(detail.width, detail.height)
    if (fitted) return fitted
  }
  return DEFAULT_SIZE[node.type] ?? FALLBACK_SIZE
}

/**
 * 取这个节点在指定模式下的坐标。
 *
 * `positions` 按模式分开存，而**一个节点不保证四种模式都有坐标** ——
 * 只在 workflow 里摆过的节点，切到 storyboard 就没有条目。这时退回到文件
 * 声明的 `mode`，再退到原点：宁可让它堆在左上角，也不能因为读不到坐标
 * 就把节点丢掉（那等于用户以为画布数据没了）。
 */
export function positionOf(node: CanvasNode, mode: CanvasMode, fileMode: string) {
  return node.positions?.[mode] ?? node.positions?.[fileMode] ?? { x: 0, y: 0 }
}

export function toFlow(
  file: CanvasFile,
  mode: CanvasMode,
  details: Map<string, NodeDetail>,
): { nodes: FlowNode<NodeData>[]; edges: FlowEdge[] } {
  const nodes = file.nodes.map((n): FlowNode<NodeData> => {
    const detail = details.get(n.id)
    const { width, height } = sizeOf(n, mode, detail)
    return {
      id: n.id,
      // 认不出的类型交给 `unknown` 组件显示原始信息，而不是让 React Flow
      // 回退到默认节点 —— 那样看起来像个正常节点，实际上我们没渲染它的内容。
      type: RENDERABLE.has(n.type) ? n.type : "unknown",
      position: positionOf(n, mode, file.mode),
      width,
      height,
      ...(n.parentId ? { parentId: n.parentId } : {}),
      data: { raw: n, detail: details.get(n.id) },
    }
  })

  const edges = file.edges.map(
    (e: CanvasEdge): FlowEdge => ({
      id: e.id,
      source: e.source,
      target: e.target,
      ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
      ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
      label: e.type,
      animated: e.type === "derivation",
    }),
  )

  return { nodes, edges }
}

const RENDERABLE = new Set(["image", "video", "audio", "text"])

/**
 * 把界面上的坐标写回一份完整的 canvas 文件。
 *
 * **以 `original` 为底、只改 `positions[mode]`**，绝不重建节点对象。
 * 文件里有一堆我们没有解释的字段（`data.popoverDraft` 里存着重新生成用的
 * prompt / modelId / 歌词，还有 `meta` / `round` / `groupId`），从 React Flow
 * 的节点反推会把它们全部抹掉 —— 而 gateway 只校验图的结构不变式，
 * 不会拦住这种"结构合法但内容被清空"的写入。
 */
export function toCanvasFile(
  original: CanvasFile,
  flowNodes: FlowNode<NodeData>[],
  mode: CanvasMode,
): CanvasFile {
  const moved = new Map(flowNodes.map((n) => [n.id, n.position]))
  return {
    ...original,
    nodes: original.nodes.map((n) => {
      const p = moved.get(n.id)
      if (!p) return n
      return { ...n, positions: { ...n.positions, [mode]: { x: p.x, y: p.y } } }
    }),
  }
}
