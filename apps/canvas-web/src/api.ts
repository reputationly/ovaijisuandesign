/**
 * 官方 gateway 的客户端。
 *
 * 类型对齐 gateway 里的 `canvasFileSchema`（zod，未混淆，在
 * `gateway/dist/main.js` 的 `../gateway/dist/canvas/canvas.schema.js` 段）：
 *
 *   node = { id, type, positions: Record<mode,{x,y}>, size?, sizes?,
 *            assetId?, groupId?, round?, parentId?, isEmpty?, data?, meta? }
 *   edge = { id, source, sourceHandle?, target, targetHandle?, type, data? }
 *   file = { version, mode, nodes[], edges[], hiddenAssetIds? }
 */

/** 画布模式。同一个节点在四种模式下各存一套坐标。 */
export type CanvasMode = "freeform" | "grid" | "storyboard" | "workflow"

export const CANVAS_MODES: CanvasMode[] = ["freeform", "grid", "storyboard", "workflow"]

export interface XY {
  x: number
  y: number
}
export interface Size {
  width: number
  height: number
}

export interface CanvasNode {
  id: string
  type: string
  positions: Record<string, XY>
  size?: Size
  sizes?: Record<string, Size>
  assetId?: string
  groupId?: string
  round?: number
  parentId?: string
  isEmpty?: boolean
  data?: Record<string, unknown>
  meta?: Record<string, unknown>
}

export interface CanvasEdge {
  id: string
  source: string
  sourceHandle?: string
  target: string
  targetHandle?: string
  type: string
  data?: Record<string, unknown>
}

export interface CanvasFile {
  version: number
  mode: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  hiddenAssetIds?: string[]
}

/** `POST /api/canvas/nodes/detail` 的返回。 */
export interface NodeDetail {
  id: string
  type: string
  name?: string
  textContent?: string
  /** 内容哈希。写回时带上做乐观并发，见 [`writeTextNode`]。 */
  textContentHash?: string
  metadata?: Record<string, unknown>
}

export interface AssetInfo {
  id: string
  path: string
  type: string
  name: string
  width?: number
  height?: number
  fileSize?: number
  status?: string
}

async function json<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) throw new Error(`${what} 失败 HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()) as T
}

export async function getWorkspace(): Promise<{ dir: string }> {
  return json(await fetch("/api/workspace"), "GET /api/workspace")
}

export async function getCanvas(): Promise<CanvasFile> {
  return json(await fetch("/api/canvas"), "GET /api/canvas")
}

/**
 * 整份快照写回。
 *
 * gateway 侧的 `CanvasPersistenceService.write` 会先跑 `canvasFileSchema` 校验，
 * 再过一道破坏性写入防护（节点数骤降会被拒并把快照丢进隔离区）。所以
 * **必须整份回写、且不能丢掉我们不认识的字段** —— 见 `toCanvasFile`。
 */
export async function putCanvas(file: CanvasFile): Promise<void> {
  const res = await fetch("/api/canvas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(file),
  })
  await json<{ ok: boolean }>(res, "POST /api/canvas")
}

export async function getNodeDetails(nodeIds: string[]): Promise<NodeDetail[]> {
  if (nodeIds.length === 0) return []
  const res = await fetch("/api/canvas/nodes/detail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeIds }),
  })
  const body = await json<{ nodes: NodeDetail[] }>(res, "POST /api/canvas/nodes/detail")
  return body.nodes ?? []
}

/**
 * 写回文本节点。
 *
 * `expectedContentHash` 是**乐观并发**：gateway 拿它和当前内容比对，对不上
 * 就拒绝。不传的话，agent 或另一个窗口在我们编辑期间改过同一个节点，保存会
 * **静默覆盖掉对方** —— 而文本节点恰恰是最可能被 agent 同时写的东西。
 *
 * 返回新的哈希，供下一次编辑接着用。
 */
export async function writeTextNode(
  nodeId: string,
  content: string,
  expectedContentHash: string | undefined,
): Promise<string | undefined> {
  const res = await fetch("/api/canvas/text-node", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nodeId,
      content,
      mode: "replace",
      ...(expectedContentHash ? { expectedContentHash } : {}),
    }),
  })
  if (res.status === 409) {
    throw new Error("这个节点在你编辑期间被改过了。重新加载后再编辑，避免覆盖对方的修改。")
  }
  const body = await json<{ contentHash?: string }>(res, "POST /api/canvas/text-node")
  return body.contentHash
}

export async function getAssets(): Promise<AssetInfo[]> {
  const body = await json<{ assets: AssetInfo[] }>(await fetch("/api/assets"), "GET /api/assets")
  return body.assets ?? []
}

/**
 * 资产的字节流地址。
 *
 * 走 `/files/id/:assetId` 而不是 `/files/{path}`：assetId 是稳定的，
 * 而 path 会被 reconcile 重绑（文件在工作区里挪动后 gateway 会改 path）。
 * `w` 交给 gateway 用 sharp 实时缩放，前端不必下原图 —— 那三张枫叶各 1.8MB。
 */
export function assetUrl(assetId: string, width?: number): string {
  return width ? `/files/id/${assetId}?w=${width}` : `/files/id/${assetId}`
}

// ---------------------------------------------------------------------------
// 生成
//
// `/api/generate/*` 由**我们自己的 gateway** 提供（Vite 代理按前缀分流），
// 其余仍走官方 gateway。见 vite.config.ts。
// ---------------------------------------------------------------------------

export interface GenerateParams {
  prompt: string
  aspectRatio: string
  resolution: string
  /** 底图。非空走图生图。 */
  imagePaths?: string[]
}

/** 提交出图，返回 task_id。 */
export async function submitImage(p: GenerateParams): Promise<string> {
  const res = await fetch("/api/generate/image/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: p.prompt,
      image_paths: p.imagePaths ?? [],
      params: { aspect_ratio: p.aspectRatio, resolution: p.resolution },
    }),
  })
  const body = await json<{ task_id?: string }>(res, "POST /api/generate/image/submit")
  if (!body.task_id) throw new Error("gateway 没有返回 task_id")
  return body.task_id
}

export interface Product {
  path: string
  width?: number
  height?: number
}

interface TaskQuery {
  status: "processing" | "succeeded" | "failed"
  result?: Product
  user_message?: string
  error?: string
}

/**
 * 轮询到终态，返回**工作区相对路径**。
 *
 * `signal` 用来在用户取消时停下 —— 没有它的话组件卸载后这个循环还会跑到
 * 超时，而且失败会报到一个已经不存在的界面上。
 */
export async function pollTask(
  taskId: string,
  signal: AbortSignal,
  onTick?: (seconds: number) => void,
): Promise<Product> {
  const startedAt = Date.now()
  // 兜底上限。真正的超时在平台侧，这里只是不要无限转。
  const MAX_MS = 10 * 60 * 1000
  for (;;) {
    if (signal.aborted) throw new Error("已取消")
    if (Date.now() - startedAt > MAX_MS) throw new Error("生成超时")
    await new Promise((r) => setTimeout(r, 2000))
    onTick?.(Math.round((Date.now() - startedAt) / 1000))

    const res = await fetch(`/api/generate/tasks/${encodeURIComponent(taskId)}/query`, { signal })
    const body = await json<TaskQuery>(res, "GET /api/generate/tasks/…/query")
    if (body.status === "succeeded") {
      // 报了成功却没有路径是协议层的错，不是"还没好"。继续轮询会一直转。
      if (!body.result?.path) throw new Error("gateway 报告成功但没有结果路径")
      return body.result
    }
    if (body.status === "failed") {
      throw new Error(body.user_message || body.error || "生成失败")
    }
  }
}

/** 在画布上建一个媒体节点。仍借官方 gateway。 */
export async function createMediaNode(assetPath: string): Promise<void> {
  const res = await fetch("/api/canvas/media-node", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetPath }),
  })
  await json<unknown>(res, "POST /api/canvas/media-node")
}

/**
 * 订阅 gateway 的实时推送。
 *
 * 用的是 Nest 的 `WsAdapter`，帧是 `{event, data}`。我们不预设事件名 ——
 * 收到什么就报什么，让界面把真实事件名显示出来。
 */
export function connectEvents(onEvent: (event: string, data: unknown) => void): () => void {
  const proto = location.protocol === "https:" ? "wss:" : "ws:"
  let ws: WebSocket | null = null
  let retry: ReturnType<typeof setTimeout> | null = null
  let closed = false

  const open = () => {
    if (closed) return
    ws = new WebSocket(`${proto}//${location.host}/ws`)
    ws.onmessage = (ev) => {
      try {
        const frame = JSON.parse(ev.data as string)
        onEvent(String(frame.event ?? "?"), frame.data)
      } catch {
        onEvent("<非 JSON 帧>", String(ev.data).slice(0, 200))
      }
    }
    ws.onclose = () => {
      if (closed) return
      // gateway 重启是常态（改一次配置就要重起），自己重连。
      retry = setTimeout(open, 2000)
    }
    ws.onerror = () => ws?.close()
  }
  open()

  return () => {
    closed = true
    if (retry) clearTimeout(retry)
    ws?.close()
  }
}
