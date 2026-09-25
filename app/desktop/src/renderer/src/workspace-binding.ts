/**
 * 当前界面绑定的工作区 gateway。
 *
 * 每个工作区一套 gateway（地址由主进程在工作区启动后给出），应用级 gateway 没有工作区。
 * 旧的 api.ts / chat.ts 通过这里取「当前工作区」的地址；工作区页挂载时绑定、卸载时解绑，
 * 解绑后回落到应用级 gateway（首页、项目库用它）。
 *
 * 工作区 gateway 校验身份：写请求不带齐三个头回 428，带了对不上回 409。gateway 重启后
 * instance / generation 会变，旧页面发来的写请求就写不进别的工作区。
 */
export interface WorkspaceIdentity {
  claim: string
  instanceId: string
  generation: number
}

export interface WorkspaceEndpoint {
  id: string
  gatewayUrl: string
  wsUrl: string
  /** 浏览器里直接开 renderer（没有主进程）时没有 */
  identity?: WorkspaceIdentity
}

type Listener = (ep: WorkspaceEndpoint | null) => void

let active: WorkspaceEndpoint | null = null
const listeners = new Set<Listener>()

export function setActiveWorkspace(ep: WorkspaceEndpoint | null): void {
  active = ep
  for (const l of listeners) l(ep)
}

export function activeWorkspace(): WorkspaceEndpoint | null {
  return active
}

export function onActiveWorkspaceChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 应用级（preload 注入的）地址，没有工作区时用它 */
export function appLevelEndpoint(): { gatewayUrl: string; wsUrl: string } {
  const c = (typeof window !== "undefined" && (window as unknown as { __HILO_CONFIG__?: { gatewayUrl?: string; wsUrl?: string } }).__HILO_CONFIG__) || {}
  return { gatewayUrl: (c.gatewayUrl ?? "").replace(/\/+$/, ""), wsUrl: c.wsUrl ?? "" }
}

/** 旧接口用的 gateway 前缀：有绑定的工作区就用它，否则应用级 */
export function currentGatewayUrl(): string {
  return (active?.gatewayUrl ?? appLevelEndpoint().gatewayUrl).replace(/\/+$/, "")
}

export const IDENTITY_HEADERS = {
  claim: "x-hilo-workspace",
  instance: "x-hilo-workspace-instance",
  generation: "x-hilo-workspace-generation",
} as const

/** WebSocket 握手和 `<img src>` 带不了头，走 query */
export const IDENTITY_QUERY = {
  claim: "hilo_workspace",
  instance: "hilo_workspace_instance",
  generation: "hilo_workspace_generation",
} as const

/** 发往当前工作区 gateway 的请求要带的头；没绑定工作区时为空 */
export function identityHeaders(): Record<string, string> {
  const id = active?.identity
  if (!id) return {}
  return {
    [IDENTITY_HEADERS.claim]: id.claim,
    [IDENTITY_HEADERS.instance]: id.instanceId,
    [IDENTITY_HEADERS.generation]: String(id.generation),
  }
}

/** 把身份加进 URL 的 query（保留原有参数）；没有身份时原样返回 */
export function withIdentityQuery(url: string, identity: WorkspaceIdentity | undefined = active?.identity): string {
  if (!identity) return url
  const hash = url.indexOf("#")
  const base = hash >= 0 ? url.slice(0, hash) : url
  const params = new URLSearchParams()
  params.set(IDENTITY_QUERY.claim, identity.claim)
  params.set(IDENTITY_QUERY.instance, identity.instanceId)
  params.set(IDENTITY_QUERY.generation, String(identity.generation))
  return `${base}${base.includes("?") ? "&" : "?"}${params.toString()}${hash >= 0 ? url.slice(hash) : ""}`
}

/** 在请求参数上合入身份头，调用方自己给的同名头优先 */
export function withIdentityHeaders(init: RequestInit = {}): RequestInit {
  const extra = identityHeaders()
  if (!Object.keys(extra).length) return init
  const h = new Headers(init.headers)
  for (const [k, v] of Object.entries(extra)) if (!h.has(k)) h.set(k, v)
  return { ...init, headers: h }
}
