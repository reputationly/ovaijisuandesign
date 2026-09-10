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

/**
 * 哪些尺寸算"没被用户调过"。
 *
 * 官方的 `reconcileNodeSize` 就是这个判断：**当前尺寸还等于该类型的默认值
 * 时，说明用户没手动拖过，可以按素材的真实比例重算**；一旦不等于默认值，
 * 就是用户自己拖的，任何情况下都不能覆盖。
 *
 * 除了现在的默认值，还要认我们**历史上写过的**默认值 —— 早期版本给图片
 * 节点写死 350x195（16:9），而素材可能是 4:3，于是画布上每张图周围都有
 * 一圈白边。那些节点已经存在 canvas.json 里了，不认的话永远修不好。
 */
const UNSET_SIZES: Size[] = [
  { width: 350, height: 350 }, // 现在的 image/video 默认
  { width: 350, height: 150 }, // audio
  { width: 350, height: 500 }, // text
  { width: 350, height: 195 }, // 历史：image/video
  { width: 320, height: 180 }, // 历史：text
  { width: 300, height: 160 }, // 历史：兜底
]

const isUnset = (s: Size) =>
  UNSET_SIZES.some((d) => Math.round(s.width) === d.width && Math.round(s.height) === d.height)

export function sizeOf(node: CanvasNode, mode: CanvasMode, detail?: NodeDetail): Size {
  const explicit = node.sizes?.[mode] ?? node.size
  // 用户手动调过的尺寸永远优先。
  if (explicit && !isUnset(explicit)) return explicit

  // 否则按素材的真实长宽比算。套固定卡片的话，一张 4:3 的图放进 16:9 的框里
  // 四周就是白边 —— 这是和官方观感差别最直接的一处。
  if (detail?.width && detail?.height) {
    const fitted = fitNodeSize(detail.width, detail.height)
    if (fitted) return fitted
  }
  return explicit ?? DEFAULT_SIZE[node.type] ?? FALLBACK_SIZE
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
  flowEdges?: FlowEdge[],
): CanvasFile {
  const moved = new Map(flowNodes.map((n) => [n.id, n.position]))
  return {
    ...original,
    // **连线要从界面状态回写。** 节点那边是"以服务端那份为底只改坐标"，
    // 因为节点上有一堆我们没解释的字段；连线不一样，它只有
    // `{id, source, target}` 这几样，而用户新拉的线**只存在于界面状态里** ——
    // 沿用 `original.edges` 的话，拉完一松手边就没了，而且不报错。
    //
    // 不传 flowEdges 时保持原样（有些调用点只是挪了挪位置）。
    ...(flowEdges
      ? {
          edges: flowEdges.map((e) => {
            const before = original.edges.find((x) => x.id === e.id)
            // 已有的边**保留服务端那份的全部字段**，只有新增的才现造。
            if (before) return before
            return {
              id: e.id,
              source: e.source,
              target: e.target,
              // `type` 在 CanvasEdge 里是必填。新拉的线沿用画布上现有边的
              // 类型，一条都没有时退回 xyflow 的 `default` —— 写一个
              // gateway 不认识的字符串会让整次保存被拒。
              type: e.type ?? original.edges[0]?.type ?? "default",
              ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
              ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
            }
          }),
        }
      : {}),
    nodes: original.nodes.map((n) => {
      const p = moved.get(n.id)
      if (!p) return n
      return { ...n, positions: { ...n.positions, [mode]: { x: p.x, y: p.y } } }
    }),
  }
}
