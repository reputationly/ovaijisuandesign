/**
 * 整理（自动布局）。官方 `canvas.tidy.*`：
 *
 * ```
 * canvas.tidy                    = 整理
 * canvas.tidy.layouts            = 布局整理
 * canvas.tidy.grid               = 宫格布局
 * canvas.tidy.horizontal         = 水平布局
 * canvas.tidy.vertical           = 垂直布局
 * canvas.tidy.sort               = 分类整理
 * canvas.tidy.sort.connections   = 按连线关系
 * canvas.tidy.sort.connections.hint
 *   = 有连线依赖的节点按上下游排在上方，离散节点收拢到下方
 * canvas.tidy.sort.mediaType     = 按素材类型
 * canvas.tidy.sort.mediaType.hint
 *   = 按图片 / 视频 / 音频 / 文本 等素材类型分成多条泳道，不考虑连线
 * canvas.tidy.confirmKeep        = 保留整理结果？
 * canvas.tidy.keep = 保留        canvas.tidy.revert = 撤回
 * ```
 *
 * 逻辑全在这里，界面只管画 —— 拓扑分层里的环、孤立节点、跨层长边这些
 * 在界面上很难测。
 */

export interface TidyNode {
  id: string
  type: string
  width: number
  height: number
}

export interface TidyEdge {
  source: string
  target: string
}

export type TidyKind = "grid" | "horizontal" | "vertical" | "connections" | "type"

/** 节点之间的间距。官方画布上的观感就是这个量级。 */
export const GAP = 40

/** 一列的宽度。节点最宽 350（见 canvas.ts 的 NODE_SIZE_MAX）。 */
const COL_W = 350 + GAP

/** 媒体类型的泳道顺序。和「添加节点」菜单里的顺序一致。 */
const TYPE_ORDER = ["image", "video", "audio", "text"]

export type Positions = Map<string, { x: number; y: number }>

/**
 * 按 `kind` 算出每个节点的新坐标。
 *
 * **返回全新的坐标表，不改入参。** 调用方要拿旧坐标做「撤回」,
 * 就地改的话那份旧数据当场就没了。
 */
export function tidy(
  nodes: readonly TidyNode[],
  edges: readonly TidyEdge[],
  kind: TidyKind,
): Positions {
  switch (kind) {
    case "grid":
      return gridLayout(nodes)
    case "horizontal":
      return lineLayout(nodes, "h")
    case "vertical":
      return lineLayout(nodes, "v")
    case "type":
      return swimlanes(nodes)
    case "connections":
      return byConnections(nodes, edges)
  }
}

/**
 * 宫格：瀑布流。
 *
 * **按列累加而不是固定行高** —— 节点是按素材比例算的，高度各不相同，
 * 固定行高会让矮的下面留一大片空。
 */
function gridLayout(nodes: readonly TidyNode[]): Positions {
  const out: Positions = new Map()
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)))
  const bottom = new Array<number>(cols).fill(0)
  for (const n of nodes) {
    // 放进当前最短的那一列，排布最紧凑。
    let c = 0
    for (let i = 1; i < cols; i++) if (bottom[i]! < bottom[c]!) c = i
    out.set(n.id, { x: c * COL_W, y: bottom[c]! })
    bottom[c] = bottom[c]! + n.height + GAP
  }
  return out
}

/** 水平 / 垂直一条线。**按各自的实际尺寸累加**,不是等距。 */
function lineLayout(nodes: readonly TidyNode[], dir: "h" | "v"): Positions {
  const out: Positions = new Map()
  let at = 0
  for (const n of nodes) {
    out.set(n.id, dir === "h" ? { x: at, y: 0 } : { x: 0, y: at })
    at += (dir === "h" ? n.width : n.height) + GAP
  }
  return out
}

/** 按素材类型分泳道。官方 `sort.mediaType`：**不考虑连线**。 */
function swimlanes(nodes: readonly TidyNode[]): Positions {
  const lanes = new Map<string, TidyNode[]>()
  for (const n of nodes) {
    const key = TYPE_ORDER.includes(n.type) ? n.type : "other"
    lanes.set(key, [...(lanes.get(key) ?? []), n])
  }
  // 已知类型按固定顺序，其余的（sticker、未知类型）排在后面。
  const keys = [...lanes.keys()].sort((a, b) => {
    const ia = TYPE_ORDER.indexOf(a)
    const ib = TYPE_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  const out: Positions = new Map()
  let y = 0
  for (const k of keys) {
    const row = lanes.get(k)!
    let x = 0
    let tallest = 0
    for (const n of row) {
      out.set(n.id, { x, y })
      x += n.width + GAP
      tallest = Math.max(tallest, n.height)
    }
    y += tallest + GAP
  }
  return out
}

/**
 * 按连线关系分层。官方 `sort.connections`：
 * **有连线依赖的节点按上下游排在上方，离散节点收拢到下方。**
 *
 * 层号 = 从任一入度为 0 的节点出发的最长路径长度。用最长路径而不是最短：
 * 一个节点只要还有上游没排完，就不该先排它 —— 否则箭头会往回指。
 *
 * **环要能跑完。** 画布上的边是用户随手连的，成环完全可能；
 * 没有保护的话这里会死循环，表现是点了「整理」整个界面卡死。
 */
function byConnections(nodes: readonly TidyNode[], edges: readonly TidyEdge[]): Positions {
  const ids = new Set(nodes.map((n) => n.id))
  // 只认两端都在的边。悬空的边不该影响布局。
  const real = edges.filter((e) => ids.has(e.source) && ids.has(e.target))

  const indeg = new Map<string, number>()
  const next = new Map<string, string[]>()
  for (const id of ids) {
    indeg.set(id, 0)
    next.set(id, [])
  }
  for (const e of real) {
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1)
    next.get(e.source)!.push(e.target)
  }

  // Kahn。环里的节点入度永远降不到 0，会留在 `indeg` 里 —— 正是我们要的
  // "跑得完"。
  const level = new Map<string, number>()
  let queue = [...ids].filter((id) => indeg.get(id) === 0)
  for (const id of queue) level.set(id, 0)
  let seen = 0
  while (queue.length > 0) {
    const cur = queue
    queue = []
    for (const id of cur) {
      seen++
      for (const t of next.get(id)!) {
        // 最长路径：只会往后推，不会往前提。
        level.set(t, Math.max(level.get(t) ?? 0, (level.get(id) ?? 0) + 1))
        indeg.set(t, indeg.get(t)! - 1)
        if (indeg.get(t) === 0) queue.push(t)
      }
    }
  }

  // 环里的节点。**不能丢掉** —— 丢了就是"点了整理，有几个节点原地没动",
  // 而用户看不出为什么。统一放到最后一层。
  const maxLevel = level.size > 0 ? Math.max(...level.values()) : -1
  const stranded = [...ids].filter((id) => !level.has(id))
  for (const id of stranded) level.set(id, maxLevel + 1)
  void seen

  // 有连线的和离散的分开：官方那句 hint 说的就是这个。
  const connected = new Set<string>()
  for (const e of real) {
    connected.add(e.source)
    connected.add(e.target)
  }

  const byLevel = new Map<number, TidyNode[]>()
  const loose: TidyNode[] = []
  for (const n of nodes) {
    if (!connected.has(n.id)) {
      loose.push(n)
      continue
    }
    const l = level.get(n.id) ?? 0
    byLevel.set(l, [...(byLevel.get(l) ?? []), n])
  }

  const out: Positions = new Map()
  let y = 0
  for (const l of [...byLevel.keys()].sort((a, b) => a - b)) {
    const row = byLevel.get(l)!
    let x = 0
    let tallest = 0
    for (const n of row) {
      out.set(n.id, { x, y })
      x += n.width + GAP
      tallest = Math.max(tallest, n.height)
    }
    y += tallest + GAP
  }

  // 离散节点收拢到下方，按宫格排 —— 一条长队会把画布拉得很宽。
  if (loose.length > 0) {
    // **和上面的层之间空一格** —— 贴着排的话看起来像最后一层的一部分。
    y += GAP
    for (const [id, p] of gridLayout(loose)) {
      out.set(id, { x: p.x, y: y + p.y })
    }
  }
  return out
}
