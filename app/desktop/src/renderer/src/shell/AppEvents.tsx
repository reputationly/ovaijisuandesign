import { useNavigate, useRouter } from "@tanstack/react-router"
import { useEffect } from "react"

import { mainProcess, onRawChannel } from "../api/main-process"
import type { SessionRestorePayload } from "../ipc"
import { closeWorkspaceRuntime } from "../pages/workspace-runtime"
import { hidePreviewTab, showPreviewTab, visiblePreviewTabIds } from "../stores/tabs"
import { useSettingsDialog } from "../stores/ui"
import { useWorkspaceListSync } from "../stores/workspaces"

function isRestorePayload(v: unknown): v is SessionRestorePayload {
  return !!v && typeof v === "object" && (v as SessionRestorePayload).source === "session-restore"
}

/**
 * 主进程推来的应用级事件：菜单（新建窗口、关闭标签、打开设置）、启动恢复。
 * 不渲染任何东西，挂在外壳里一次。
 */
export function AppEvents() {
  const navigate = useNavigate()
  const router = useRouter()
  const openSettings = useSettingsDialog((s) => s.openAt)
  useWorkspaceListSync()

  useEffect(() => {
    const goWorkspace = (id: string) => void navigate({ to: "/workspace", search: { workspaceId: id } })
    const goHome = () => {
      void mainProcess()?.hilo.activateHome().catch(() => {})
      void navigate({ to: "/" })
    }
    const currentWorkspaceId = () => {
      const loc = router.state.location
      return loc.pathname.startsWith("/workspace") ? (loc.search as { workspaceId?: string }).workspaceId : undefined
    }

    const offs = [
      onRawChannel("menu:new-workspace", (payload) => {
        if (isRestorePayload(payload)) {
          // 启动恢复：只在首页时接管，优先上次可见的标签
          if (router.state.location.pathname !== "/") return
          const visible = new Set(visiblePreviewTabIds())
          const target =
            (payload.preferredWorkspaceId && visible.has(payload.preferredWorkspaceId) ? payload.preferredWorkspaceId : undefined) ??
            payload.restoredWorkspaceIds.find((id) => visible.has(id))
          if (target) goWorkspace(target)
          else void mainProcess()?.hilo.activateHome().catch(() => {})
          return
        }
        if (typeof payload !== "string" || !payload) return
        showPreviewTab(payload)
        goWorkspace(payload)
      }),
      onRawChannel("menu:close-tab", () => {
        const id = currentWorkspaceId()
        if (!id) return
        const next = hidePreviewTab(id)
        if (next) goWorkspace(next)
        else goHome()
        void closeWorkspaceRuntime(id)
      }),
      onRawChannel("menu:open-settings", () => openSettings()),
      onRawChannel("menu:new-chat", () => void navigate({ to: "/" })),
    ]
    return () => offs.forEach((off) => off())
  }, [navigate, router, openSettings])

  return null
}
