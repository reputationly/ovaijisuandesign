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
  // 官方 STICKER_NODE_SIZE。**不参与按素材比例重算** —— 贴纸没有素材，
  // 而且它是固定大小的标记，跟着目标缩放会让一排章大小不一。
  sticker: { width: 56, height: 56 },
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

/**
 * 分组容器的 z。**照官方的 `GROUP_Z_INDEX = -100`。**
 *
 * 官方那份注释写得很直白：组拿这个值「so ReactFlow renders it beneath
 * the children」。
 *
 * ## 为什么必须是负数
 *
 * React Flow 把边画在一层 SVG 里，默认 `zIndex: 0`；节点画在它上面。
 * 组也是节点，于是**组的背景会把组内所有的边整条盖住** —— 表现是
 * 「编了组之后连线全不见了」,而数据里边好好地在（我们这次就是这样：
 * 4 条首尾帧→视频的边都在 canvas.json 里，画面上一条都看不到）。
 *
 * 不报错、刷新也不会好，只有把组压到边下面才行。
 */
export const GROUP_Z_INDEX = -100

/**
 * 节点上那些**只存在于 `meta` 里、直接影响渲染**的字段。
 *
 * 官方 `toFlowNode` 从 `meta` 里取三样：`zIndex` / `locked` / `hidden`。
 * 这三个在 React Flow 里都是可选 prop —— **漏传不会报错，只会静默地
 * 换一种行为**：
 *
 * | meta       | 漏了会怎样 |
 * |------------|-----------|
 * | `zIndex`   | 组的背景盖住组内所有的边（这次就是它） |
 * | `locked`   | 用户锁住的节点照样能拖走 |
 * | `hidden`   | 标了隐藏的节点照样画出来 |
 *
 * 所以这一层要**一次性对齐**，而不是遇到一个补一个。
 */
function metaProps(node: CanvasNode): {
  zIndex?: number
  draggable?: boolean
  hidden?: boolean
} {
  const z = node.meta?.zIndex
  const out: { zIndex?: number; draggable?: boolean; hidden?: boolean } = {}

  if (typeof z === "number") out.zIndex = z
  // 组没写这个值时兜底 —— 见 `GROUP_Z_INDEX` 的注释。**兜底而不是只读
  // meta**：这次修之前建的那些组都没有这个字段，只读 meta 的话它们一直
  // 是坏的，除非再写一次数据迁移。
  else if (node.type === "group") out.zIndex = GROUP_Z_INDEX

  // 官方 `draggable: !node.meta?.locked`。**只在锁住时显式给 false** ——
  // 一律给 `draggable: true` 会盖掉 React Flow 自己的默认值。
  if (node.meta?.locked === true) out.draggable = false
  // 官方：不是 true 就整个不给这个键，让 React Flow 的 diff 在常见情况下
  // 看到一个稳定的形状。
  if (node.meta?.hidden === true) out.hidden = true
  return out
}

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

/**
 * 折叠的组占多大。官方 `COLLAPSED_GROUP_FLOW_SIZE = { width: 1, height: 1 }`。
 *
 * **收成 1×1 而不是收成标签那么大。** 组框本身在折叠态是透明且
 * `pointer-events: none` 的，真正看得见的只有浮在上方的那个 chip ——
 * 留一个跟标签同宽的隐形框会挡住它背后的东西，而用户眼里那儿什么都没有。
 */
const COLLAPSED_GROUP_SIZE: Size = { width: 1, height: 1 }

/**
 * 哪些节点该藏起来。官方 `collectHiddenChildIds`。
 *
 * 两个来源：节点自己标了 `meta.hidden`，或者**它的父组折叠了**。
 *
 * 只折叠组、不藏成员的话，成员会留在原地悬空显示 —— 组框已经收成 1×1 了,
 * 看起来就是一堆节点散在画布上，而且再也框不回去。
 */
export function collectHiddenIds(nodes: CanvasNode[]): Set<string> {
  const collapsed = new Set<string>()
  const hidden = new Set<string>()
  for (const n of nodes) {
    if (n.meta?.hidden === true) hidden.add(n.id)
    if (n.type === "group" && n.meta?.collapsed === true) collapsed.add(n.id)
  }
  if (collapsed.size > 0) {
    for (const n of nodes) {
      if (n.parentId && collapsed.has(n.parentId)) hidden.add(n.id)
    }
  }
  return hidden
}

export function toFlow(
  file: CanvasFile,
  mode: CanvasMode,
  details: Map<string, NodeDetail>,
  /** 当前选中的节点。边靠它判断要不要高亮，见下面 `selected` 那一段。 */
  selectedIds?: Set<string>,
): { nodes: FlowNode<NodeData>[]; edges: FlowEdge[] } {
  const hiddenIds = collectHiddenIds(file.nodes)

  const nodes = file.nodes.map((n): FlowNode<NodeData> => {
    const detail = details.get(n.id)
    const collapsedGroup = n.type === "group" && n.meta?.collapsed === true
    const { width, height } = collapsedGroup ? COLLAPSED_GROUP_SIZE : sizeOf(n, mode, detail)
    return {
      id: n.id,
      // 认不出的类型交给 `unknown` 组件显示原始信息，而不是让 React Flow
      // 回退到默认节点 —— 那样看起来像个正常节点，实际上我们没渲染它的内容。
      type: RENDERABLE.has(n.type) ? n.type : "unknown",
      position: positionOf(n, mode, file.mode),
      width,
      height,
      ...(n.parentId ? { parentId: n.parentId } : {}),
      // 贴纸不参与连线。**`connectable: false` 必须显式给** —— 默认是可连的，
      // 而贴纸没有 Handle，用户从别处拉线过来能"连上"一个看不见的把手，
      // 连出来的边在图里真实存在，下游拿它当输入时只会拿到一个 emoji。
      ...(n.type === "sticker" ? { connectable: false } : {}),
      // 分组是容器：**不可连线**（`isValidConnection` 也拦着），而且要排在
      // 成员前面 —— React Flow 要求父节点先于子节点出现，否则子节点找不到
      // 父节点会被整个丢掉。后端写文件时已经排好了，这里只是不打乱它。
      ...(n.type === "group" ? { connectable: false, selectable: true } : {}),
      // 只存在于 `meta` 里、直接影响渲染的那几样（z 轴 / 锁定 / 隐藏）。
      ...metaProps(n),
      // 折叠的组。官方这一段：
      //
      // - `selectable: false` + `selected: false` —— **强制取消选中**,
      //   否则折叠前留下的选中态会让工具条和缩放把手浮在一片空地上。
      // - `dragHandle` 把 React Flow 的拖拽监听**限定在 chip 上**。框本身
      //   已经是 1×1 且 `pointer-events: none`,不限定的话拖拽落在一个
      //   看不见的盒子上，用户找不到能拖的地方。
      ...(collapsedGroup
        ? {
            selectable: false,
            selected: false,
            className: "canvas-group-collapsed",
            dragHandle: ".canvas-group-collapsed-drag-handle",
          }
        : {}),
      ...(hiddenIds.has(n.id) ? { hidden: true } : {}),
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
      // **不挂 label。** 这里原来是 `label: e.type` —— 于是画布上每条连线
      // 都顶着一行 `derivation`,中文界面里的英文字段名。官方的
      // `toFlowEdge` 没有 label 这一项。
      animated: e.type === "derivation",
      // `data` 原样带上。官方 `data: edge.data ?? {}` —— 丢掉的话
      // 边上挂的东西在界面这一侧就没了。
      ...(e.data ? { data: e.data } : {}),
      // **端点选中时边跟着高亮。** 官方
      // `selected: selectedNodeIds.has(source) || has(target)`。
      //
      // 选中一个节点是在问「这张图和谁有关系」,而答案正是它连出去的那几条边。
      // 不给的话边只有被**直接点中**时才高亮，而边本身很细、很难点中。
      ...(selectedIds
        ? { selected: selectedIds.has(e.source) || selectedIds.has(e.target) }
        : {}),
      // 任一端被藏起来，这条边就得藏。官方注释说得很准：只在两端都藏时才藏
      // 的话，**跨组的边会漏出来** —— 一条线从一个折叠的组里伸出来，
      // 而那一头什么都没有。
      ...(hiddenIds.has(e.source) || hiddenIds.has(e.target) ? { hidden: true } : {}),
    }),
  )

  return { nodes, edges }
}

const RENDERABLE = new Set(["image", "video", "audio", "text", "sticker", "group"])

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

/**
 * 一条连线合不合法。逐条照官方的 `isValidConnection`：
 *
 * ```js
 * if (!conn.target || conn.source === conn.target) return false;
 * if (existingEdgeKeys.has(`${conn.source}->${conn.target}`)) return false;
 * if (lookup.get(conn.source)?.type === CanvasNodeType.Group) return false;
 * if (lookup.get(conn.target)?.type === CanvasNodeType.Group) return false;
 * return true;
 * ```
 *
 * **我们之前一条都没有** —— 自己连自己、同一对连两次、连到分组上，全都
 * 允许。这几种连出来的边在画布上看得见，但下游拿它做输入时要么拿到自己、
 * 要么拿到一个分组容器，而分组没有素材。
 */
export function isValidConnection(
  conn: { source?: string | null; target?: string | null },
  ctx: { edges: readonly { source: string; target: string }[]; typeOf: (id: string) => string | undefined },
): boolean {
  const { source, target } = conn
  if (!source || !target) return false
  // 自环。画出来是一个绕回自己的圈，而"以自己为输入"没有意义。
  if (source === target) return false
  // 重复边。同一对之间连第二次不会有新语义，只会多一条压在原来那条上面。
  if (ctx.edges.some((e) => e.source === source && e.target === target)) return false
  // 分组是容器，本身没有素材。
  if (ctx.typeOf(source) === "group" || ctx.typeOf(target) === "group") return false
  return true
}
