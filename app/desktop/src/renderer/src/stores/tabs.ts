import { globalSet } from "../api/main-process"

/**
 * 可见的工作区标签（预览标签）。
 *
 * 标签条目本身来自主进程（listWorkspaceEntries），这里只记「哪些在界面上可见」：
 * 本地 localStorage 一份（同步读），再镜像到全局存储，主进程启动时据此预热工作区。
 */
export interface PreviewTab {
  workspaceId: string
  folderPath?: string
}

interface PreviewTabsState {
  version: 1
  initialized: boolean
  tabs: PreviewTab[]
}

export const PREVIEW_TABS_KEY = "hilo.topbar.visible-preview-tabs.v1"

export function readPreviewTabs(store: Pick<Storage, "getItem"> = localStorage): PreviewTabsState {
  try {
    const raw = store.getItem(PREVIEW_TABS_KEY)
    const v = raw ? (JSON.parse(raw) as PreviewTabsState) : null
    if (v && v.version === 1 && Array.isArray(v.tabs)) return v
  } catch {
    // 坏数据当没有
  }
  return { version: 1, initialized: false, tabs: [] }
}

function write(state: PreviewTabsState) {
  try {
    localStorage.setItem(PREVIEW_TABS_KEY, JSON.stringify(state))
  } catch {
    // 只是偏好
  }
  void globalSet("visiblePreviewTabs", state).catch(() => {})
}

export function visiblePreviewTabIds(): string[] {
  return readPreviewTabs().tabs.map((t) => t.workspaceId)
}

/** 显示一个标签（已在就不动顺序） */
export function showPreviewTab(workspaceId: string, folderPath = workspaceId): void {
  const s = readPreviewTabs()
  if (s.tabs.some((t) => t.workspaceId === workspaceId)) {
    if (!s.initialized) write({ ...s, initialized: true })
    return
  }
  write({ version: 1, initialized: true, tabs: [...s.tabs, { workspaceId, folderPath }] })
}

/** 关掉标签后该去哪个：优先右边一个，没有就左边一个，都没有返回 undefined（回首页） */
export function nextTabAfterHide(ids: string[], hidden: string): string | undefined {
  const i = ids.indexOf(hidden)
  if (i < 0) return undefined
  return ids[i + 1] ?? ids[i - 1]
}

export function hidePreviewTab(workspaceId: string): string | undefined {
  const s = readPreviewTabs()
  const next = nextTabAfterHide(
    s.tabs.map((t) => t.workspaceId),
    workspaceId,
  )
  write({ version: 1, initialized: true, tabs: s.tabs.filter((t) => t.workspaceId !== workspaceId) })
  return next
}

/** 最后活跃的工作区：主进程启动恢复时只起这一个 */
export function rememberActiveWorkspace(workspaceId: string): void {
  void globalSet("lastActiveWorkspacePath", workspaceId).catch(() => {})
}
