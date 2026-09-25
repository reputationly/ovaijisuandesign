import { API_PATHS } from "@ov/protocol"

import { currentGatewayUrl } from "../workspace-binding"

export { API_PATHS }

/** gateway 还没给出地址（preload 缺失且不是同源开发）时抛这个 */
export class GatewayNotReadyError extends Error {
  constructor() {
    super("gateway 地址未就绪")
    this.name = "GatewayNotReadyError"
  }
}

/**
 * 非 2xx 响应。`userMessage` 是后端给用户看的那句（`user_message` 字段），
 * 界面优先显示它，拿不到再退回 message。
 */
export class GatewayHttpError extends Error {
  constructor(
    readonly status: number,
    readonly method: string,
    readonly path: string,
    readonly code?: string,
    readonly userMessage?: string,
    readonly details?: unknown,
  ) {
    super(userMessage ?? `${method} ${path} → HTTP ${status}${code ? ` (${code})` : ""}`)
    this.name = "GatewayHttpError"
  }
}

/** 在工作区页里指向该工作区的 gateway，其余页面指向应用级 gateway */
export function gatewayUrl(path: string): string {
  return currentGatewayUrl() + path
}

export interface GatewayFetchOptions extends RequestInit {
  /** 超时毫秒数；和调用方传入的 signal 同时生效 */
  timeoutMs?: number
}

let lastTraceId: string | undefined
/** 最近一次请求的 trace id，反馈问题时附上便于查 gateway 日志 */
export const getLastTraceId = () => lastTraceId

/** 统一的 gateway 请求：拼地址、带 trace id、处理超时。不解析响应体。 */
export async function gatewayFetch(path: string, opts: GatewayFetchOptions = {}): Promise<Response> {
  const { timeoutMs, signal, headers, ...rest } = opts
  const traceId = crypto.randomUUID()
  lastTraceId = traceId
  const signals = [signal, timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined].filter(
    (s): s is AbortSignal => !!s,
  )
  const h = new Headers(headers)
  h.set("x-request-id", traceId)
  return fetch(gatewayUrl(path), {
    ...rest,
    headers: h,
    signal: signals.length > 1 ? AbortSignal.any(signals) : signals[0],
  })
}

/** 取 JSON；非 2xx 转成 GatewayHttpError（尽量带上后端的 code / user_message） */
export async function gatewayJson<T>(path: string, opts: GatewayFetchOptions = {}): Promise<T> {
  const res = await gatewayFetch(path, opts)
  const method = (opts.method ?? "GET").toUpperCase()
  if (!res.ok) {
    let body: { code?: string; error?: string; user_message?: string; details?: unknown } = {}
    try {
      body = await res.json()
    } catch {
      // 非 JSON 错误页，只保留状态码
    }
    throw new GatewayHttpError(res.status, method, path, body.code, body.user_message ?? body.error, body.details)
  }
  return (await res.json()) as T
}
