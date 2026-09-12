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
  /**
   * 标签注册表。官方的 `{ version, revision, orderMode, tags[] }`,见 tags.ts。
   *
   * 放在画布文件顶层：gateway 对未知字段是 `#[serde(flatten)] extra`,
   * 原样带进带出，**不用改后端**。
   */
  canvasTags?: unknown
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
  /** 工作区相对路径（`images/xxx.png`）。拿这个节点当生成输入时要用。 */
  path?: string
  textContent?: string
  /** 内容哈希。写回时带上做乐观并发，见 [`writeTextNode`]。 */
  textContentHash?: string
  /** 素材的像素尺寸。节点大小按它等比算，见 `canvas.ts` 的 `fitNodeSize`。 */
  width?: number
  height?: number
  metadata?: Record<string, unknown>
}

export interface AssetInfo {
  id: string
  path: string
  type: string
  name: string
  width?: number
  height?: number
  status?: string
  /**
   * **服务端发的是 snake_case。**
   *
   * 这里原来只声明了一个 `fileSize`,而 `/api/assets` 返回的键是
   * `file_size` —— 于是那个字段永远是 `undefined`,类型上却完全合法。
   * 项目资产面板要按大小排序和显示，靠那个字段的话整列都是空的。
   */
  file_size: number
  /** 秒级时间戳，字符串。资产索引里就是这么存的。 */
  time: string
}

import type { Capability } from "./params"
import type { Plan } from "./plan"

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

/**
 * 把资产移到废纸篓。返回真正处理掉的路径。
 *
 * **不保证全成** —— 批量删 20 个，其中一个被别的进程占用时另外 19 个照删。
 * 调用方对比返回值和自己传的列表就知道哪些没成。
 */
export async function trashAssets(paths: string[]): Promise<string[]> {
  const body = await json<{ deleted: string[] }>(
    await fetch("/api/assets/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
    }),
    "POST /api/assets/trash",
  )
  return body.deleted ?? []
}

export async function getAssets(): Promise<AssetInfo[]> {
  const body = await json<{ assets: AssetInfo[] }>(await fetch("/api/assets"), "GET /api/assets")
  return body.assets ?? []
}

/**
 * 资产索引是不是降级开局（原文件损坏、已隔离）。
 *
 * **要单独暴露。** 降级时 `getAssets()` 回的是空数组 —— 和"这个工作区
 * 还没有素材"长得一模一样，而两者该做的事完全相反。
 */
export async function assetsDegraded(): Promise<boolean> {
  const body = await json<{ degraded?: boolean }>(await fetch("/api/assets"), "GET /api/assets")
  return body.degraded === true
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

/**
 * 把几个节点编成一组。官方 `canvas.splitGrid.cropSplit` =「编组」。
 *
 * 后端要求至少两个（`api_group.rs`：「至少要两个节点」）—— 一个节点编组
 * 没有意义，而它会回 400，调用方要么先判要么处理错误。
 */
export async function groupNodes(nodeIds: string[], label?: string): Promise<void> {
  const res = await fetch("/api/canvas/group", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeIds, ...(label ? { label } : {}) }),
  })
  await json<unknown>(res, "POST /api/canvas/group")
}

/**
 * 在画布上建一个媒体节点。
 *
 * `sourceNodeIds` 给了就顺带连一条从源节点过来的边 —— 后端一直支持
 * （`api_canvas.rs` 的 `sourceNodeIds`），只是前端之前没传。截帧、
 * 以某个节点为输入生成，产物都该连回它的来源，否则画布上看不出因果。
 */
export async function createMediaNode(
  assetPath: string,
  sourceNodeIds?: string[],
  allowDuplicate?: boolean,
): Promise<string | undefined> {
  const res = await fetch("/api/canvas/media-node", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assetPath,
      ...(sourceNodeIds?.length ? { sourceNodeIds } : {}),
      // 后端默认对同一个资产是**复用已有节点**（见 api_canvas 的
      // `allow_duplicate`）。「复制」这个动作要的正是第二张卡片。
      ...(allowDuplicate ? { allowDuplicate: true } : {}),
    }),
  })
  // **回 nodeId。** 宫格切分要拿这几个 id 去编组，拿不到的话只能建完
  // 再去画布里按路径反查 —— 而那时同名文件已经被避让改过名了。
  const body = await json<{ nodeId?: string }>(res, "POST /api/canvas/media-node")
  return body.nodeId
}

/** agent 的一次工具调用。`id` 把 start 和 ok/error 配成一条。 */
export interface ToolActivity {
  tool: string
  phase: "start" | "ok" | "error"
  id: string
  summary?: string
  error?: string
  /** 这次调用产出的文件，工作区相对路径。用来渲染文件 chip。 */
  artifact?: string
  at: number
}

/**
 * 拉一次工具活动历史。
 *
 * **必须有这一次拉取。** `/ws` 是广播，晚连的客户端一条都收不到 ——
 * 刷新一次页面右栏就空了，而 agent 还在后台干活，看起来像是断了。
 */
export async function getActivity(): Promise<ToolActivity[]> {
  const r = await fetch("/api/activity")
  if (!r.ok) return []
  const j = (await r.json()) as { entries?: ToolActivity[] }
  return j.entries ?? []
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

// ==================== 升级 ====================

export type UpdateCheck = {
  current: string
  latest?: string
  needUpdate: boolean
  /** `false` = 没查到（断网、清单没这一档），**不是**"已是最新"。 */
  reachable: boolean
  url?: string
  sha256?: string
  size?: number
}

/** 和 Rust 那边 `update::Phase` 的 `#[serde(tag = "state")]` 一一对应。 */
export type UpdatePhase =
  | { state: "idle" }
  | { state: "downloading"; version: string; done: number; total: number }
  | { state: "verifying"; version: string }
  | { state: "staged"; version: string }
  | { state: "applied"; version: string }
  | { state: "failed"; at: string; error: string }

export async function checkUpdate(): Promise<UpdateCheck> {
  return json(await fetch("/api/update/check"), "GET /api/update/check")
}

export async function updateStatus(): Promise<{ current: string; phase: UpdatePhase }> {
  return json(await fetch("/api/update/status"), "GET /api/update/status")
}

/**
 * 开始下载。**参数原样来自 `check` 的结果**，不让后端自己再查一次清单 ——
 * 两次查之间清单可能翻了版本，于是用户点的是 A、装上的是 B。
 */
export async function startDownload(c: UpdateCheck): Promise<void> {
  const res = await fetch("/api/update/download", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: c.url, sha256: c.sha256, version: c.latest, size: c.size }),
  })
  if (!res.ok) throw new Error(`开始下载失败 HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

export async function applyUpdate(): Promise<{ version: string }> {
  return json(await fetch("/api/update/apply", { method: "POST" }), "POST /api/update/apply")
}

// ==================== agent 的决策点 ====================

/**
 * 协议是 opencode 自带的 `question` 工具，见 `Question.tsx` 的注释。
 * gateway 只是中转：agent 阻塞在 `/api/question/ask`，界面轮询 `pending`、
 * 提交 `reply`。
 */
export async function pendingQuestion(): Promise<{
  pending: { id: string; questions: import("./Question").QuestionInfo[] } | null
}> {
  return json(await fetch("/api/question/pending"), "GET /api/question/pending")
}

/** `answers` 为 null 表示跳过。 */
export async function answerQuestion(id: string, answers: string[][] | null): Promise<void> {
  const res = await fetch("/api/question/reply", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, answers }),
  })
  // 409 = 这道题已经不在等待了（被顶掉或超时）。不是错误，静默忽略 ——
  // 用户看到的题本来就已经作废，弹个错只会让人困惑。
  if (!res.ok && res.status !== 409) {
    throw new Error(`提交回答失败 HTTP ${res.status}`)
  }
}

// ---------------------------------------------------------------------------
// 会话与项目
//
// 一条「会话」就是一张画布。侧栏那一栏列的是会话，不是节点 ——
// 之前列节点是个假的近似：同一张画布里的几个节点看起来像几条独立创作，
// 点进去却哪儿也没去。
// ---------------------------------------------------------------------------

export interface Session {
  id: string
  name: string
  updatedAt: number
  nodeCount: number
  /** 归属项目。缺省 = 未分组。 */
  project?: string
  /** 里面有哪几类内容，列表按它选图标。 */
  kinds: string[]
}

export interface Project {
  id: string
  name: string
  createdAt: number
}

export async function listSessions(): Promise<{
  current: string
  list: Session[]
  projects: Project[]
}> {
  return json(await fetch("/api/canvases"), "GET /api/canvases")
}

export async function createSession(name?: string): Promise<{ id: string }> {
  return json(
    await fetch("/api/canvases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }),
    "POST /api/canvases",
  )
}

export async function openSession(id: string): Promise<void> {
  await json(
    await fetch(`/api/canvases/${encodeURIComponent(id)}/open`, { method: "POST" }),
    "open canvas",
  )
}

export async function deleteSession(id: string): Promise<void> {
  await json(
    await fetch(`/api/canvases/${encodeURIComponent(id)}`, { method: "DELETE" }),
    "delete canvas",
  )
}

export async function renameSession(id: string, name: string): Promise<void> {
  await json(
    await fetch(`/api/canvases/${encodeURIComponent(id)}/rename`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }),
    "rename canvas",
  )
}

/** `projectId` 传 null 表示移出到未分组。 */
export async function moveSession(id: string, projectId: string | null): Promise<void> {
  await json(
    await fetch(`/api/canvases/${encodeURIComponent(id)}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId }),
    }),
    "move canvas",
  )
}

export async function createProject(name: string): Promise<{ project: Project }> {
  return json(
    await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }),
    "POST /api/projects",
  )
}

/** 解散项目。里面的会话退回未分组，**不会被删**。 */
export async function deleteProject(id: string): Promise<void> {
  await json(
    await fetch(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" }),
    "delete project",
  )
}

// ---------------------------------------------------------------------------
// Skill
// ---------------------------------------------------------------------------

export interface Skill {
  slug: string
  name: string
  description: string
  category: string
  builtin: boolean
  /** 列表里不带，取单条时才有。 */
  body?: string
}

export async function listSkills(): Promise<{ skills: Skill[]; categories: string[] }> {
  return json(await fetch("/api/skills"), "GET /api/skills")
}

export async function getSkill(slug: string): Promise<{ skill: Skill }> {
  return json(await fetch(`/api/skills/${encodeURIComponent(slug)}`), "GET /api/skills/:slug")
}

export async function saveSkill(s: {
  slug: string
  name?: string
  description?: string
  category?: string
  body?: string
}): Promise<void> {
  await json(
    await fetch("/api/skills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(s),
    }),
    "POST /api/skills",
  )
}

export async function deleteSkill(slug: string): Promise<void> {
  await json(
    await fetch(`/api/skills/${encodeURIComponent(slug)}`, { method: "DELETE" }),
    "delete skill",
  )
}

// ---------------------------------------------------------------------------
// 上传与能力
// ---------------------------------------------------------------------------

/**
 * 上传本地文件到工作区，返回各自的相对路径。
 *
 * **一个一个传，不并发。** 并发听起来更快，但一次选十几个大文件会同时开
 * 十几条连接，gateway 那边是全量读进内存的 —— 而且失败时说不清是哪一个。
 *
 * 文件名走 header 且要 encodeURIComponent：HTTP header 只认 ASCII，
 * 中文名直接塞进去会被 fetch 拒掉（`Invalid value`）。
 */
export async function uploadFiles(files: File[]): Promise<string[]> {
  const out: string[] = []
  for (const f of files) {
    const res = await fetch("/api/files/upload", {
      method: "POST",
      headers: {
        "content-type": "application/octet-stream",
        "x-filename": encodeURIComponent(f.name),
      },
      body: f,
    })
    const body = await json<{ path?: string }>(res, `上传 ${f.name}`)
    if (body.path) out.push(body.path)
  }
  return out
}

/** 解组。官方 `canvas.ungroup`。 */
export async function ungroupNodes(groupId: string): Promise<void> {
  await json(
    await fetch("/api/canvas/ungroup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ groupId }),
    }),
    "POST /api/canvas/ungroup",
  )
}

/** 当前这份制作计划。没有计划时 `plan` 是 `null`。 */
export async function getPlan(): Promise<Plan | null> {
  const body = await json<{ plan: Plan | null }>(
    await fetch("/api/plan/current"),
    "GET /api/plan/current",
  )
  return body.plan ?? null
}

export async function getCapabilities(): Promise<Capability[]> {
  const res = await fetch("/api/capabilities", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  })
  const body = await json<{
    capabilities?: { modality: string; available: boolean; model: string | null }[]
  }>(res, "POST /api/capabilities")
  return body.capabilities ?? []
}

// ---------------------------------------------------------------------------
// 设置
// ---------------------------------------------------------------------------

export interface SettingsInfo {
  path: string
  /** 实际生效的工作区（WORKSPACE_DIR 会覆盖配置里那个）。 */
  workspace: string
  workspaceConfigured?: string
  port: number
  platform: { baseUrl: string; apiKeyMasked: string; hasApiKey: boolean; chatModel: string }
  models: Record<string, unknown>
}

export async function getSettings(): Promise<SettingsInfo> {
  return json(await fetch("/api/settings"), "GET /api/settings")
}

/** `apiKey` 传空串表示不改。 */
export async function saveSettings(body: Record<string, unknown>): Promise<void> {
  await json(
    await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    "POST /api/settings",
  )
}

// ---------------------------------------------------------------------------
// 应用内 agent
// ---------------------------------------------------------------------------

export interface AgentMsg {
  role: "user" | "assistant" | "tool"
  content?: string
  tool_calls?: unknown
  tool_call_id?: string
  at?: number
}

export async function agentMessages(): Promise<{ running: boolean; messages: AgentMsg[] }> {
  return json(await fetch("/api/agent/messages"), "GET /api/agent/messages")
}

export interface SendOptions {
  /** `auto`（默认）或 `ask`。官方的 `chat.mode.*`。 */
  mode?: string
  /** 这一轮允许 agent 用的模型。空 = 不限。 */
  models?: string[]
  aspectRatio?: string
  resolution?: string
  /** 视频时长，秒。不给 = 由模型/平台按内容定。 */
  duration?: number
  /** 这一轮的对话模型。不给 = 用配置里的。 */
  chatModel?: string
  /**
   * 按模态分开的参数。`{ image: { aspect_ratio: "1:1" }, video: {...} }`
   *
   * 后端拿它给**对应的工具**兜底 —— 调 generate_image 用 image 那套，
   * 调 generate_video 用 video 那套。上面那三个扁平字段是旧路径，
   * 两边都发是为了不改一半。
   */
  params?: Record<string, Record<string, string>>
}

export async function agentSend(
  message: string,
  attachments: string[] = [],
  opts: SendOptions = {},
): Promise<void> {
  const res = await fetch("/api/agent/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message,
      attachments,
      // **只传真的设了的。** 后端对空值当"没设"，但传一堆空串会让
      // 请求体里全是噪声，排查时分不清哪些是用户选的。
      ...(opts.mode && opts.mode !== "auto" ? { mode: opts.mode } : {}),
      ...(opts.models?.length ? { models: opts.models } : {}),
      ...(opts.aspectRatio ? { aspect_ratio: opts.aspectRatio } : {}),
      ...(opts.resolution ? { resolution: opts.resolution } : {}),
      ...(opts.duration ? { duration: opts.duration } : {}),
      ...(opts.params && Object.keys(opts.params).length > 0 ? { params: opts.params } : {}),
      ...(opts.chatModel ? { chat_model: opts.chatModel } : {}),
    }),
  })
  // 409 = 上一轮还在跑。把服务端那句话原样抛出去 —— 它比"HTTP 409"有用。
  if (res.status === 409) {
    const b = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(b.error ?? "上一轮还在跑")
  }
  await json<unknown>(res, "POST /api/agent/send")
}

export async function agentStop(): Promise<void> {
  // **不能吞。** 之前是 `.catch(() => {})` —— 网络错误和 4xx/5xx 一起
  // 被吃掉，界面上那一行"思考中…"照样消失，而 agent 还在后台跑：
  // 用户以为停了，下一句话发出去会撞上「上一轮还在跑」。
  const res = await fetch("/api/agent/stop", { method: "POST" })
  await json<unknown>(res, "POST /api/agent/stop")
}

/** 从官方应用装 skill 的目录（默认 `~/.hub/skills`）增量导入。 */
export async function importSkills(
  from?: string,
): Promise<{ from: string; added: string[]; skipped: string[]; failed: unknown[] }> {
  return json(
    await fetch("/api/skills/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from }),
    }),
    "POST /api/skills/import",
  )
}

// ---------------------------------------------------------------------------
// 飞书
// ---------------------------------------------------------------------------

export interface FeishuInfo {
  configured: boolean
  appId: string
  domain: string
  status: { state: string; error?: string; handled: number }
}

export async function feishuStatus(): Promise<FeishuInfo> {
  return json(await fetch("/api/feishu/status"), "GET /api/feishu/status")
}

/** `appSecret` 传空串表示不改。 */
export async function feishuSave(b: {
  appId: string
  appSecret: string
  domain?: string
}): Promise<void> {
  await json(
    await fetch("/api/feishu/creds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(b),
    }),
    "POST /api/feishu/creds",
  )
}

export async function feishuConnect(): Promise<void> {
  const res = await fetch("/api/feishu/connect", { method: "POST" })
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(b.error ?? `HTTP ${res.status}`)
  }
}

export async function feishuDisconnect(): Promise<void> {
  // 同 `agentStop`：断开失败要让调用方知道。界面上显示"未接入"而长连接
  // 还开着的话，飞书那边发来的消息会继续被处理。
  const res = await fetch("/api/feishu/disconnect", { method: "POST" })
  await json<unknown>(res, "POST /api/feishu/disconnect")
}

// ---------------------------------------------------------------------------
// 微信（iLink AI Bot）
// ---------------------------------------------------------------------------

export interface WechatInfo {
  configured: boolean
  status: {
    state: string
    error?: string
    handled: number
    qrState?: string
    qrUrl?: string
    qrIsImage?: boolean
  }
}

export async function wechatStatus(): Promise<WechatInfo> {
  return json(await fetch("/api/wechat/status"), "GET /api/wechat/status")
}

export async function wechatLogin(): Promise<void> {
  await fetch("/api/wechat/login", { method: "POST" })
}
export async function wechatConnect(): Promise<void> {
  const res = await fetch("/api/wechat/connect", { method: "POST" })
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(b.error ?? `HTTP ${res.status}`)
  }
}
export async function wechatDisconnect(): Promise<void> {
  // 同 feishuDisconnect：断开失败要让调用方知道。
  const res = await fetch("/api/wechat/disconnect", { method: "POST" })
  await json<unknown>(res, "POST /api/wechat/disconnect")
}
/** 平台上有哪些模型。设置页用来给模型名做候选。 */
export type PlatformModel = {
  id: string
  /** 认不出来时是 null —— 平台随时会加新模型，认不出不等于用不了。 */
  modality: string | null
  configuredAs: string[]
}

export async function platformModels(): Promise<PlatformModel[]> {
  const res = await fetch("/api/models")
  const b = (await res.json().catch(() => ({}))) as { models?: PlatformModel[] }
  // 拉不到就返回空 —— 少一组候选而已，手打那条路一直是通的。
  return b.models ?? []
}

/** 保持电脑唤醒。对应官方的 `preventSleep`。 */
export type AwakeInfo = { enabled: boolean; error: string | null }

/** 日志文件的位置。`exists` 为 false 说明一条都还没写出来。 */
/** 在访达里打开这个 skill 的目录。官方 `skills.detail.showInFolder`。 */
export async function revealSkill(slug: string): Promise<{ ok: boolean; error?: string }> {
  return json(
    await fetch(`/api/skills/${encodeURIComponent(slug)}/reveal`, { method: "POST" }),
    "POST /api/skills/{slug}/reveal",
  )
}

export async function logInfo(): Promise<{ dir?: string; file?: string; exists: boolean }> {
  return json(await fetch("/api/system/logs"), "GET /api/system/logs")
}

/** 在访达 / 资源管理器里打开日志目录。 */
export async function openLogDir(): Promise<{ ok: boolean; error?: string }> {
  return json(
    await fetch("/api/system/logs/open", { method: "POST" }),
    "POST /api/system/logs/open",
  )
}

export async function awakeStatus(): Promise<AwakeInfo> {
  return json(await fetch("/api/system/awake"), "GET /api/system/awake")
}

/**
 * 开或关。
 *
 * 后端**用 200 + ok:false 报"系统拒了"**（不是 5xx）—— 那不是请求错了，
 * 原因要原样显示给用户看。所以这里不能只看 res.ok。
 */
export async function awakeSet(enabled: boolean): Promise<AwakeInfo> {
  const res = await fetch("/api/system/awake", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled }),
  })
  const b = (await res.json().catch(() => ({}))) as {
    ok?: boolean
    enabled?: boolean
    error?: string
  }
  if (!res.ok) throw new Error(b.error ?? `HTTP ${res.status}`)
  return { enabled: b.enabled ?? false, error: b.ok === false ? (b.error ?? "开启失败") : null }
}

export async function wechatLogout(): Promise<void> {
  // 退出失败必须报出来 —— 界面显示"已退出"而 token 还在的话，
  // 用户会以为自己下线了，实际上机器人还在替他收消息。
  const res = await fetch("/api/wechat/logout", { method: "POST" })
  await json<unknown>(res, "POST /api/wechat/logout")
}
