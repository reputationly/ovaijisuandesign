import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"

import { dedupedToast } from "../components/ui/sonner"
import { storageKeys, useGlobalStorage } from "./global-storage"
import { truncateProjectName } from "./projects"
import { applyWorkspaceDisplayNameRename, hasWorkspaceDisplayNameConflict, type RecentWorkspace } from "./workspace-inventory"

const NO_RECENTS: RecentWorkspace[] = []

/** 全局存储里的最近打开列表（主进程每次打开工作区时追加） */
export function useRecentWorkspaces() {
  const [value, setAsync, hydrated] = useGlobalStorage<RecentWorkspace[]>("recentWorkspaces", NO_RECENTS)
  return [Array.isArray(value) ? value : NO_RECENTS, setAsync, hydrated] as const
}

/** 最近列表是主进程写的，渲染层收不到通知：挂载、窗口回到前台时重拉 */
export function useRecentWorkspacesRefresh(): void {
  const qc = useQueryClient()
  useEffect(() => {
    const invalidate = () => void qc.invalidateQueries({ queryKey: storageKeys.global("recentWorkspaces") })
    invalidate()
    window.addEventListener("focus", invalidate)
    return () => window.removeEventListener("focus", invalidate)
  }, [qc])
}

/** 工作区改显示名（只改最近列表里的 displayName，目录不动） */
export function useWorkspaceDisplayNameRename(workspacePath: string) {
  const { t } = useTranslation()
  const [, setRecentWorkspacesAsync] = useRecentWorkspaces()
  return useCallback(
    (newName: string) => {
      void (async () => {
        let conflicted = false
        const ok = await setRecentWorkspacesAsync((previous) => {
          const list = Array.isArray(previous) ? previous : []
          if (hasWorkspaceDisplayNameConflict(list, workspacePath, newName, truncateProjectName)) {
            conflicted = true
            return list
          }
          return applyWorkspaceDisplayNameRename(list, workspacePath, newName, truncateProjectName)
        })
        if (conflicted) dedupedToast.error(t("home.workspace.duplicateName"))
        else if (!ok) dedupedToast.error(t("canvas.renameFailed"))
      })()
    },
    [setRecentWorkspacesAsync, t, workspacePath],
  )
}
