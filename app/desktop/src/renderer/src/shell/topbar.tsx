import { useNavigate, useRouterState } from "@tanstack/react-router"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { mainProcess } from "../api/main-process"
import { hiloPlatform } from "../api/runtime"
import type { IHiloApp, WorkspaceEntry, WorkspaceRuntimeInfo } from "../ipc"
import type { WorkspaceSearch } from "../router/search"
import { useGlobalStorage } from "../stores/global-storage"
import { useProjectActions } from "../stores/projects"
import { hideVisiblePreviewTabs, resolveVisiblePreviewEntries, showVisiblePreviewTab, useVisiblePreviewTabsSnapshot, visiblePreviewTabsStore } from "../stores/tabs"
import { workspaceDisplayName, type RecentWorkspace } from "../stores/workspace-inventory"
import { performOtherWorkspacePreviewsHide, performWorkspacePreviewHide, performWorkspacePreviewsToRightHide, shouldActivateWorkspaceThroughRoute } from "./topbar-logic"
import { handleNewWorkspaceOpenResult, requestWorkspaceRuntimeClose, stageWorkspacePreview } from "./workspace-open"

/**
 * 已打开工作区（「标签」）的状态与动作。
 *
 * 标签条目来自主进程（listWorkspaceEntries + 变更事件），按本地记的可见标签过滤出 previewEntries；
 * 当前工作区看路由。顶栏本身没有标签条，已打开的工作区在全局侧栏里列出。
 * 生成任务、完成通知这类跨工作区的状态还没接，先给空值。
 */
export type WorkspaceNavigateOptions = Omit<WorkspaceSearch, "workspaceId">

export interface WorkspaceStatus {
  running: boolean
  unread: boolean
  needsUserAction?: "answer" | "confirmation"
}

export interface TopbarState {
  entries: WorkspaceEntry[]
  previewEntries: WorkspaceEntry[]
  currentWorkspaceId: string | null
  isHomeActive: boolean
  activeRuntime: WorkspaceRuntimeInfo | null
  unreadCompletedTaskCount: number
  workspaceStatusById: Map<string, WorkspaceStatus>
}

export interface CreateWorkspaceOptions {
  folderPath?: string
  projectId?: string
  loadUserMemory?: boolean
  allowDataDirectoryFallback?: boolean
}

export interface TopbarActions {
  activateHome(): void
  activateWorkspace(workspaceId: string): void
  closeWorkspace(workspaceId: string, source?: string): void
  closeOtherWorkspacePreviews(workspaceId: string): void
  closeWorkspacePreviewsToRight(workspaceId: string): void
  createWorkspace(name: string, options?: CreateWorkspaceOptions, navigateOptions?: WorkspaceNavigateOptions): Promise<boolean>
  openWorkspaceFromDialog(): void
  reorderTabs(activeId: string, overId: string): void
}

const EMPTY_STATUS = new Map<string, WorkspaceStatus>()

const TopbarStateContext = createContext<TopbarState>({
  entries: [],
  previewEntries: [],
  currentWorkspaceId: null,
  isHomeActive: true,
  activeRuntime: null,
  unreadCompletedTaskCount: 0,
  workspaceStatusById: EMPTY_STATUS,
})
const TopbarActionsContext = createContext<TopbarActions | null>(null)

export function useTopbarState(): TopbarState {
  return useContext(TopbarStateContext)
}

export function useTopbarActions(): TopbarActions {
  const actions = useContext(TopbarActionsContext)
  if (!actions) throw new Error("useTopbarActions must be used within TopbarProvider")
  return actions
}

export function buildWorkspaceSearch(workspaceId: string, opts?: WorkspaceNavigateOptions): WorkspaceSearch {
  return { ...opts, workspaceId }
}

function normalizeWorkspaceId(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

/** 没有主进程（浏览器里开 renderer）时的空实现，界面照常渲染，只是没有标签 */
const NULL_HILO: Pick<IHiloApp, "activateHome" | "activateWorkspace" | "closeWorkspace" | "stageWorkspaceTab" | "createWorkspaceWithResult"> = {
  activateHome: async () => {},
  activateWorkspace: async () => undefined,
  closeWorkspace: async () => ({ closed: true }),
  stageWorkspaceTab: async (folderPath) => ({ kind: "cancelled", folderPath }),
  createWorkspaceWithResult: async () => ({ kind: "cancelled", folderPath: "" }),
}

export function useHiloApp() {
  return useMemo(() => mainProcess()?.hilo ?? NULL_HILO, [])
}

export function useTopbarEntries() {
  const [entries, setEntries] = useState<WorkspaceEntry[]>([])
  const visiblePreviewTabs = useVisiblePreviewTabsSnapshot()

  const applyEntries = useCallback((rawList: WorkspaceEntry[]) => {
    visiblePreviewTabsStore.initialize(rawList)
    setEntries(rawList)
    mainProcess()?.pruneWorkspaceBundles(rawList.map((e) => e.workspaceId))
  }, [])

  useEffect(() => {
    const main = mainProcess()
    if (!main) return
    let disposed = false
    const disposable = main.hilo.onWorkspaceEntriesChanged((list) => applyEntries(list))
    void main.hilo
      .listWorkspaceEntries()
      .then((list) => {
        if (!disposed) applyEntries(list)
      })
      .catch(() => {})
    return () => {
      disposed = true
      disposable.dispose()
    }
  }, [applyEntries])

  const previewEntries = useMemo(() => resolveVisiblePreviewEntries(entries, visiblePreviewTabs.tabs), [entries, visiblePreviewTabs.tabs])
  const reorderTabs = useCallback((activeId: string, overId: string) => visiblePreviewTabsStore.reorder(activeId, overId), [])
  return { entries, previewEntries, reorderTabs }
}

function useWindowTitleSync(entries: WorkspaceEntry[], currentWorkspaceId: string | null) {
  const { t } = useTranslation()
  useEffect(() => {
    const appName = t("common.appName")
    const active = entries.find((e) => e.workspaceId === currentWorkspaceId)
    const title = active ? `${active.projectName} - ${appName}` : appName
    const setTitle = hiloPlatform().window?.setTitle
    if (setTitle) setTitle(title)
    else document.title = title
  }, [currentWorkspaceId, entries, t])
}

/** 主进程启动恢复时只预热最后活跃的那个 */
function useLastActivePersistence(currentWorkspaceId: string | null) {
  useEffect(() => {
    if (!currentWorkspaceId) return
    hiloPlatform()
      .storage?.globalSet("lastActiveWorkspacePath", currentWorkspaceId)
      .catch(() => {})
  }, [currentWorkspaceId])
}

function useActiveRuntime(currentWorkspaceId: string | null): WorkspaceRuntimeInfo | null {
  const [runtime, setRuntime] = useState<WorkspaceRuntimeInfo | null>(null)
  useEffect(() => {
    setRuntime(null)
    const main = mainProcess()
    if (!currentWorkspaceId || !main) return
    let disposed = false
    let requestId = 0
    const refresh = () => {
      const current = ++requestId
      main.hilo
        .getWorkspaceRuntime(currentWorkspaceId)
        .then((r) => {
          if (!disposed && current === requestId) setRuntime(r ?? null)
        })
        .catch(() => {
          if (!disposed && current === requestId) setRuntime(null)
        })
    }
    refresh()
    const disposable = main.hilo.onWorkspaceEntriesChanged((list) => {
      if (list.some((entry) => entry.workspaceId === currentWorkspaceId)) refresh()
      else {
        requestId += 1
        setRuntime(null)
      }
    })
    return () => {
      disposed = true
      requestId += 1
      disposable.dispose()
    }
  }, [currentWorkspaceId])
  return runtime
}

function useIsKnownWorkspacePath() {
  return useCallback(async (folderPath: string) => {
    try {
      const persisted = await hiloPlatform()
        .storage?.globalGet("recentWorkspaces")
        .catch(() => undefined)
      if (!Array.isArray(persisted)) return false
      return persisted.some((w: RecentWorkspace | undefined) => w?.path === folderPath)
    } catch {
      return false
    }
  }, [])
}

export function useTopbarNavigation(allEntries: WorkspaceEntry[], previewEntries: WorkspaceEntry[], currentWorkspaceId: string | null): Omit<TopbarActions, "reorderTabs"> {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const hiloApp = useHiloApp()
  const isKnownWorkspacePath = useIsKnownWorkspacePath()
  const { addWorkspaceToProject } = useProjectActions()
  const allEntriesRef = useRef(allEntries)
  allEntriesRef.current = allEntries
  const entriesRef = useRef(previewEntries)
  entriesRef.current = previewEntries
  const currentWorkspaceIdRef = useRef(currentWorkspaceId)
  currentWorkspaceIdRef.current = currentWorkspaceId

  const goWorkspace = useCallback(
    (workspaceId: string, opts?: WorkspaceNavigateOptions) => navigate({ to: "/workspace", search: buildWorkspaceSearch(workspaceId, opts) }),
    [navigate],
  )

  const activateHome = useCallback(() => {
    void hiloApp.activateHome().catch(() => {})
    void navigate({ to: "/" })
  }, [hiloApp, navigate])

  const activateWorkspace = useCallback(
    (workspaceId: string) => {
      showVisiblePreviewTab(workspaceId)
      if (shouldActivateWorkspaceThroughRoute(allEntriesRef.current, workspaceId)) {
        void goWorkspace(workspaceId)
        return
      }
      void hiloApp
        .activateWorkspace(workspaceId)
        .then((runtime) => {
          if (!runtime) return
          showVisiblePreviewTab(runtime.workspaceId)
          return goWorkspace(runtime.workspaceId)
        })
        .catch((err: unknown) => console.error("[Topbar] activateWorkspace failed:", err))
    },
    [goWorkspace, hiloApp],
  )

  const requestRuntimeClose = useCallback(
    (workspaceId: string, source: string) => void requestWorkspaceRuntimeClose(hiloApp, workspaceId, source),
    [hiloApp],
  )

  const closeWorkspace = useCallback(
    (workspaceId: string, source = "topbar") => {
      performWorkspacePreviewHide(entriesRef.current, workspaceId, currentWorkspaceIdRef.current, source, {
        hidePreview: (id) => hideVisiblePreviewTabs(id),
        activateWorkspace,
        activateHome,
        requestRuntimeClose,
      })
    },
    [activateHome, activateWorkspace, requestRuntimeClose],
  )

  const closeOtherWorkspacePreviews = useCallback(
    (workspaceId: string) =>
      performOtherWorkspacePreviewsHide(entriesRef.current, workspaceId, currentWorkspaceIdRef.current, {
        hidePreviews: (ids) => hideVisiblePreviewTabs(ids),
        activateWorkspace,
        requestRuntimeClose,
      }),
    [activateWorkspace, requestRuntimeClose],
  )

  const closeWorkspacePreviewsToRight = useCallback(
    (workspaceId: string) =>
      performWorkspacePreviewsToRightHide(entriesRef.current, workspaceId, currentWorkspaceIdRef.current, {
        hidePreviews: (ids) => hideVisiblePreviewTabs(ids),
        activateWorkspace,
        requestRuntimeClose,
      }),
    [activateWorkspace, requestRuntimeClose],
  )

  const createWorkspace = useCallback(
    async (name: string, options?: CreateWorkspaceOptions, navigateOptions?: WorkspaceNavigateOptions) => {
      const pickedFolder = options?.folderPath
      const targetProjectId = options?.projectId
      const alreadyKnown = pickedFolder ? await isKnownWorkspacePath(pickedFolder) : false
      if (pickedFolder && alreadyKnown) {
        if (targetProjectId) await addWorkspaceToProject(pickedFolder, targetProjectId, "workspace-create")
        const staged = await stageWorkspacePreview({ hiloApp, folderPath: pickedFolder, t, onStaged: (entry) => goWorkspace(entry.workspaceId, navigateOptions) })
        return Boolean(staged)
      }
      const result = await hiloApp.createWorkspaceWithResult({
        name,
        folderPath: pickedFolder,
        loadUserMemory: options?.loadUserMemory,
        allowDataDirectoryFallback: options?.allowDataDirectoryFallback,
      })
      if (targetProjectId && (result.kind === "opened" || result.kind === "reused")) {
        await addWorkspaceToProject(result.runtime.folderPath, targetProjectId, "workspace-create")
      }
      return Boolean(handleNewWorkspaceOpenResult(result, t, (runtime) => goWorkspace(runtime.workspaceId, navigateOptions), alreadyKnown))
    },
    [addWorkspaceToProject, goWorkspace, hiloApp, isKnownWorkspacePath, t],
  )

  const openWorkspaceFromDialog = useCallback(() => {
    void (async () => {
      const paths = await hiloPlatform().fs?.showOpenDialog?.({ directory: true })
      const folderPath = paths?.[0]
      if (!folderPath) return
      await stageWorkspacePreview({ hiloApp, folderPath, t, onStaged: (entry) => goWorkspace(entry.workspaceId) })
    })()
  }, [goWorkspace, hiloApp, t])

  return useMemo(
    () => ({
      activateHome,
      activateWorkspace,
      closeWorkspace,
      closeOtherWorkspacePreviews,
      closeWorkspacePreviewsToRight,
      createWorkspace,
      openWorkspaceFromDialog,
    }),
    [activateHome, activateWorkspace, closeOtherWorkspacePreviews, closeWorkspace, closeWorkspacePreviewsToRight, createWorkspace, openWorkspaceFromDialog],
  )
}

const NO_RECENTS: RecentWorkspace[] = []

export function TopbarProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const routerSearch = useRouterState({ select: (s) => s.location.search as { workspaceId?: unknown } })
  const isWorkspaceRoute = pathname.startsWith("/workspace")
  const currentWorkspaceId = (isWorkspaceRoute ? normalizeWorkspaceId(routerSearch?.workspaceId) : undefined) ?? null
  const isHomeActive = currentWorkspaceId === null
  const hiloApp = useHiloApp()
  const { entries: rawEntries, previewEntries: rawPreviewEntries, reorderTabs } = useTopbarEntries()
  const [recentWorkspaces] = useGlobalStorage<RecentWorkspace[]>("recentWorkspaces", NO_RECENTS)

  // 用户改过的显示名记在最近列表里，标签条目里的是目录名
  const entries = useMemo(() => {
    if (rawEntries.length === 0) return rawEntries
    return rawEntries.map((entry) => {
      const recent = (Array.isArray(recentWorkspaces) ? recentWorkspaces : []).find((w) => w.path === entry.folderPath)
      if (!recent) return entry
      const resolved = workspaceDisplayName(recent)
      return resolved === entry.projectName ? entry : { ...entry, projectName: resolved }
    })
  }, [rawEntries, recentWorkspaces])

  const previewEntries = useMemo(() => {
    const entriesById = new Map(entries.map((entry) => [entry.workspaceId, entry]))
    return rawPreviewEntries.map((entry) => entriesById.get(entry.workspaceId) ?? entry)
  }, [entries, rawPreviewEntries])

  useEffect(() => {
    if (currentWorkspaceId) showVisiblePreviewTab(currentWorkspaceId)
  }, [currentWorkspaceId])

  // 离开工作区页（去首页、项目库……）要告诉主进程，好让工作区转到后台、进入闲置挂起的计时
  useEffect(() => {
    if (isWorkspaceRoute) return
    void hiloApp.activateHome().catch(() => {})
  }, [hiloApp, isWorkspaceRoute])

  useWindowTitleSync(entries, currentWorkspaceId)
  useLastActivePersistence(currentWorkspaceId)
  const activeRuntime = useActiveRuntime(currentWorkspaceId)
  const nav = useTopbarNavigation(entries, previewEntries, currentWorkspaceId)

  const stateValue = useMemo<TopbarState>(
    () => ({
      entries,
      previewEntries,
      currentWorkspaceId,
      isHomeActive,
      activeRuntime,
      unreadCompletedTaskCount: 0,
      workspaceStatusById: EMPTY_STATUS,
    }),
    [activeRuntime, currentWorkspaceId, entries, isHomeActive, previewEntries],
  )
  const actionsValue = useMemo<TopbarActions>(() => ({ ...nav, reorderTabs }), [nav, reorderTabs])

  return (
    <TopbarStateContext.Provider value={stateValue}>
      <TopbarActionsContext.Provider value={actionsValue}>{children}</TopbarActionsContext.Provider>
    </TopbarStateContext.Provider>
  )
}
