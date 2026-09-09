/**
 * gateway 的 HTTP 客户端。
 *
 * **只认一个地址**（`GATEWAY_URL`）。我们自己的 gateway 会把还没实现的路由
 * 反代给官方，所以这一层不需要知道替换进行到哪一步了。
 */

/** 官方 mcp-tools 用的也是这个环境变量名。 */
const BASE = (process.env.GATEWAY_URL ?? "http://127.0.0.1:8100").replace(/\/+$/, "")

/**
 * 诊断日志。
 *
 * **stdout 是 MCP 协议通道，绝对不能往里写东西** —— 一行 `console.log` 就会
 * 破坏协议帧。官方把诊断只写 stderr，而 opencode 不落盘、应用日志里也看不到，
 * 结果是排查工具层成败时唯一的地面真相却看不见。我们同时写 stderr 和文件。
 */
const LOG_PATH = process.env.OVMCP_LOG ?? "/tmp/ovaijisuandesign-mcp.log"

export function diag(line: string) {
  const stamped = `[${new Date().toISOString()}] ${line}\n`
  process.stderr.write(stamped)
  try {
    Bun.write(LOG_PATH, stamped, { createPath: true }).catch(() => {})
  } catch {
    /* 日志写不了不该影响工具本身 */
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
  return (text ? JSON.parse(text) : {}) as T
}

export const gw = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  base: BASE,
}

// ---------------------------------------------------------------------------
// 生成
// ---------------------------------------------------------------------------

export interface Product {
  path: string
  width?: number
  height?: number
  /** 一次提交产出多份时的全部路径（多段语音）。单份时 gateway 不发这个键。 */
  paths?: string[]
}

interface TaskQuery {
  status: "processing" | "succeeded" | "failed"
  result?: Product
  error?: string
  user_message?: string
}

/** 轮询间隔与上限。生成本身要几十秒，太密只是白打 gateway。 */
const POLL_INTERVAL_MS = 3000
const POLL_MAX_MS = 10 * 60 * 1000

/**
 * 提交一次生成并轮询到终态，返回工作区相对路径。
 *
 * 提交**不重试**：它可能已经在平台侧建了任务，重试会重复计费。
 * 轮询期间的单次网络抖动不算失败 —— 任务在平台那边还好好跑着。
 */
export async function submitAndPoll(
  kind: "image" | "video" | "speech" | "music",
  body: unknown,
): Promise<Product> {
  const submitted = await gw.post<{ task_id?: string }>(`/api/generate/${kind}/submit`, body)
  const taskId = submitted.task_id
  if (!taskId) throw new Error("gateway 没有返回 task_id")
  diag(`[submit] ${kind} task=${taskId}`)

  const startedAt = Date.now()
  for (;;) {
    if (Date.now() - startedAt > POLL_MAX_MS) throw new Error("生成超时")
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

    let q: TaskQuery
    try {
      // 注意 `/query` 后缀。漏了会 404，而 404 在这一层看起来和"任务不存在"
      // 一模一样 —— 官方就是在这里踩过坑。
      q = await gw.get<TaskQuery>(`/api/generate/tasks/${encodeURIComponent(taskId)}/query`)
    } catch (err) {
      diag(`[poll] ${taskId} 抖动: ${err}`)
      continue
    }

    if (q.status === "succeeded") {
      if (!q.result?.path) throw new Error("gateway 报告成功但没有结果路径")
      diag(`[terminal] ${taskId} ok path=${q.result.path}`)
      return q.result
    }
    if (q.status === "failed") {
      const why = q.user_message || q.error || "生成失败"
      diag(`[terminal] ${taskId} failed: ${why}`)
      throw new Error(why)
    }
  }
}
