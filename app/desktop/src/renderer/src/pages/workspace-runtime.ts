import { useEffect, useState } from "react"
import type { TFunction } from "i18next"

import { mainProcess } from "../api/main-process"
import type { GatewayBinding, WorkspaceOpenResult, WorkspaceRuntimeInfo } from "../ipc"
import { dropConnection } from "../chat"
import { appLevelEndpoint, setActiveWorkspace, withIdentityQuery, type WorkspaceIdentity } from "../workspace-binding"
import { rememberActiveWorkspace, showPreviewTab } from "../stores/tabs"

export type RuntimeState =
  | { status: "starting" }
  | { status: "ready"; gatewayUrl: string; wsUrl: string }
  | { status: "failed"; message: string }

/** 打不开时给用户看的那句话 */
export function openFailureMessage(r: WorkspaceOpenResult | undefined, t: TFunction): string {
  if (!r) return t("ov.workspace.missing")
  switch (r.kind) {
    case "limit_reached":
      return r.busyProjectNames.length
        ? t("workspace.open.limitReachedNamed", { max: r.maxOpenWorkspaces, projects: r.busyProjectNames.join("、") })
        : t("workspace.open.limitReached", { max: r.maxOpenWorkspaces })
    case "retry_in_flight":
      return t("workspace.open.retryInFlight")
    case "storage_restart_required":
      return t("workspace.open.storageRestartRequired")
    case "storage_migration_in_progress":
      return t("workspace.open.storageMigrationInProgress")
    case "storage_unavailable":
      return t("workspace.open.storageUnavailable")
    default:
      return t("ov.workspace.missing")
  }
}

/** 等 gateway 真正能接请求：地址先于监听给出时，立刻挂载的画布会拿到一串连接失败 */
async function waitForGateway(url: string, alive: () => boolean): Promise<boolean> {
  for (let i = 0; i < 60 && alive(); i++) {
    try {
      const r = await fetch(`${url}/api/health/ready`)
      if (r.ok) return true
    } catch {
      // 还没开始监听
    }
    await new Promise((res) => setTimeout(res, 300))
  }
  return false
}

const toWs = (http: string) => http.replace(/^http/, "ws").replace(/\/+$/, "") + "/ws"

const identityOf = (b: GatewayBinding | undefined): WorkspaceIdentity | undefined =>
  b ? { claim: b.claim, instanceId: b.instanceId, generation: b.generation } : undefined

/**
 * 让一个工作区跑起来并拿到它的 gateway 地址。
 *
 * 冷标签由主进程在激活时拉起；gateway 重启后地址会变，跟着 bundle 状态更新。
 * 地址就绪时先写好「当前工作区」绑定再更新状态，保证子组件挂载时旧接口已指向这个工作区。
 */
export function useWorkspaceRuntime(workspaceId: string | undefined, t: TFunction): RuntimeState {
  const [state, setState] = useState<RuntimeState>({ status: "starting" })

  useEffect(() => {
    if (!workspaceId) return
    let alive = true
    const ready = async (gatewayUrl: string, wsUrl: string, identity: WorkspaceIdentity | undefined) => {
      if (!alive || !(await waitForGateway(gatewayUrl, () => alive))) return
      // 同一地址上 gateway 重启过，身份也会换：绑定和状态都要跟着换，WS 地址变了聊天连接才会重建
      setActiveWorkspace({ id: workspaceId, gatewayUrl, wsUrl, identity })
      setState((s) => (s.status === "ready" && s.gatewayUrl === gatewayUrl && s.wsUrl === wsUrl ? s : { status: "ready", gatewayUrl, wsUrl }))
    }
    /** bundle 状态里只有地址，身份要去标签列表里取 */
    const readyFromEntries = async (gatewayUrl: string) => {
      const entry = (await main!.hilo.listWorkspaceEntries().catch(() => [])).find((e) => e.workspaceId === workspaceId)
      const identity = identityOf(entry?.gatewayBinding)
      // 标签列表还没跟上（地址不一致）时等下一次状态或打开结果，别拿旧身份去连新 gateway
      if (entry?.gatewayUrl && entry.gatewayUrl.replace(/\/+$/, "") !== gatewayUrl.replace(/\/+$/, "")) return
      await ready(gatewayUrl, withIdentityQuery(toWs(gatewayUrl), identity), identity)
    }

    const main = mainProcess()
    if (!main) {
      // 没有主进程（浏览器开发）：旧后端只有一个 gateway
      const app = appLevelEndpoint()
      setActiveWorkspace({ id: workspaceId, ...app })
      setState({ status: "ready", ...app })
      return () => {
        alive = false
        setActiveWorkspace(null)
      }
    }

    setState({ status: "starting" })
    showPreviewTab(workspaceId)
    rememberActiveWorkspace(workspaceId)
    const bundle = main.getWorkspaceBundle(workspaceId)
    const sub = bundle.onStatusChange((s) => {
      if (s.gatewayUrl && (s.state === "gateway-ready" || s.state === "opencode-starting" || s.state === "bound")) void readyFromEntries(s.gatewayUrl)
      if (s.state === "failed" && alive) setState({ status: "failed", message: s.error ?? t("ov.workspace.missing") })
    })
    // 已有标签（含冷标签）走激活；从最近列表点进来的还没有标签，按路径打开
    void main.hilo
      .activateWorkspaceWithResult(workspaceId)
      .then((r) => r ?? main.hilo.openWorkspaceWithResult(workspaceId))
      .then((r) => {
        if (!alive) return
        if (r && (r.kind === "opened" || r.kind === "reused")) {
          const rt: WorkspaceRuntimeInfo = r.runtime
          const identity = identityOf(rt.gatewayBinding)
          void ready(rt.gatewayUrl, rt.wsUrl || withIdentityQuery(toWs(rt.gatewayUrl), identity), identity)
        } else setState({ status: "failed", message: openFailureMessage(r, t) })
      })
      .catch((e: unknown) => alive && setState({ status: "failed", message: e instanceof Error ? e.message : String(e) }))

    return () => {
      alive = false
      sub.dispose()
      setActiveWorkspace(null)
    }
  }, [workspaceId, t])

  return state
}

/** 关掉一个工作区：断开它的连接，请主进程停掉运行时（有未保存内容时主进程会拒绝） */
export async function closeWorkspaceRuntime(workspaceId: string): Promise<void> {
  dropConnection(workspaceId)
  await mainProcess()
    ?.hilo.closeWorkspace(workspaceId, { source: "menu-close-tab" })
    .catch(() => undefined)
}
