/**
 * 当前界面绑定的工作区 gateway。
 *
 * 每个工作区一套 gateway（地址由主进程在工作区启动后给出），应用级 gateway 没有工作区。
 * 旧的 api.ts / chat.ts 通过这里取「当前工作区」的地址；工作区页挂载时绑定、卸载时解绑，
 * 解绑后回落到应用级 gateway（首页、项目库用它）。
 */
export interface WorkspaceEndpoint {
  id: string
  gatewayUrl: string
  wsUrl: string
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
