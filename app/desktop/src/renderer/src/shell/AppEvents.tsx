import { useRouter } from "@tanstack/react-router"
import { useEffect } from "react"

import { mainProcess, onRawChannel } from "../api/main-process"
import type { SessionRestorePayload } from "../ipc"
import { getNextPreviewTabIdAfterHide, getStartupVisiblePreviewWorkspace, getVisiblePreviewTabIds, hideVisiblePreviewTabs, showVisiblePreviewTab } from "../stores/tabs"
import { useProjectsSync } from "../stores/projects"
import { useSettingsDialog } from "../stores/ui"
import { useWorkspaceListSync } from "../stores/workspaces"
import { OPEN_NEW_WORKSPACE_DIALOG_EVENT } from "./new-workspace-dialog"
import { buildWorkspaceSearch } from "./topbar"
import { requestWorkspaceRuntimeClose } from "./workspace-open"

/**
 * 菜单「关闭标签」先广播这个可取消的 DOM 事件：聚焦在子标签（比如会话标签）上的组件
 * 可以 preventDefault，改成关自己的子标签而不是整个工作区。
 */
export const DOM_CLOSE_TAB_EVENT = "hilo:close-tab"

function isStartupSessionRestorePayload(v: unknown): v is SessionRestorePayload {
  return !!v && typeof v === "object" && (v as SessionRestorePayload).source === "session-restore"
}

/**
 * 主进程推来的应用级事件：菜单（新建、关闭标签、打开设置）、启动恢复。
 * 不渲染任何东西，挂在外壳里一次。
 */
export function AppEvents() {
  const router = useRouter()
  const openSettings = useSettingsDialog((s) => s.openAt)
  useWorkspaceListSync()
  useProjectsSync()

  useEffect(() => {
    const main = mainProcess()
    const activateHome = () => {
      void main?.hilo.activateHome().catch(() => {})
      void router.navigate({ to: "/" })
    }
    const offs = [
      onRawChannel("menu:new-chat", () => window.dispatchEvent(new Event(OPEN_NEW_WORKSPACE_DIALOG_EVENT))),
      onRawChannel("menu:new-workspace", (request) => {
        if (isStartupSessionRestorePayload(request)) {
          // 启动恢复只在首页时接管：用户已经点进别处就不抢
          if (router.state.location.pathname !== "/") return
          const workspaceId = getStartupVisiblePreviewWorkspace(request.restoredWorkspaceIds, request.preferredWorkspaceId)
          if (!workspaceId) {
            activateHome()
            return
          }
          void router.navigate({ to: "/workspace", search: buildWorkspaceSearch(workspaceId) })
          return
        }
        const workspaceId = typeof request === "string" ? request : undefined
        if (!workspaceId) return
        showVisiblePreviewTab(workspaceId)
        void router.navigate({ to: "/workspace", search: buildWorkspaceSearch(workspaceId) })
      }),
      onRawChannel("menu:close-tab", () => {
        const event = new CustomEvent(DOM_CLOSE_TAB_EVENT, { cancelable: true })
        window.dispatchEvent(event)
        if (event.defaultPrevented) return
        const loc = router.state.location
        const workspaceId = loc.pathname.startsWith("/workspace") ? (loc.search as { workspaceId?: string }).workspaceId : undefined
        if (!workspaceId) return
        const nextWorkspaceId = getNextPreviewTabIdAfterHide(getVisiblePreviewTabIds(), workspaceId)
        hideVisiblePreviewTabs(workspaceId)
        if (!nextWorkspaceId) activateHome()
        else void router.navigate({ to: "/workspace", search: buildWorkspaceSearch(nextWorkspaceId) })
        if (main) void requestWorkspaceRuntimeClose(main.hilo, workspaceId, "menu-close-tab")
      }),
      onRawChannel("menu:open-settings", () => openSettings()),
    ]
    return () => offs.forEach((off) => off())
  }, [router, openSettings])

  return null
}
