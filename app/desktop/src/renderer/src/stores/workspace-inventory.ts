import type { ProjectRecord, WorkspaceEntry } from "../ipc"

/**
 * 侧栏、项目详情里列出的「工作区清单」：全局存储里的最近列表（`recentWorkspaces`）
 * 合并主进程当前的标签条目。已打开的那一项带着 `authoritativeEntry`，
 * 只在标签里、还没进最近列表的（刚建的）也补进来。
 */
export interface RecentWorkspace {
  path: string
  openedAt: number
  manualOrder?: number
  displayName?: string
  coverImage?: string
}

export interface WorkspaceInventoryItem {
  workspace: RecentWorkspace
  /** 主进程里有对应标签（冷的也算）时才有 */
  authoritativeEntry?: WorkspaceEntry
  /** 最近列表里的原始路径；纯标签合成的项没有 */
  recentPath?: string
}

export interface RecentProjectDismissal {
  paths: string[]
  recentOpenedAt: number
}

export type RecentProjectsSortMode = "manual" | "recent" | "priority"

export function folderNameFromPath(fullPath: string): string {
  return fullPath.split(/[/\\]/).filter(Boolean).pop() || fullPath
}

export function workspaceDisplayName(workspace: Pick<RecentWorkspace, "path" | "displayName">): string {
  const custom = workspace.displayName?.trim()
  return custom ? custom : folderNameFromPath(workspace.path)
}

export function formatTimestampDot(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

function finiteManualOrder(workspace: RecentWorkspace): number | undefined {
  return typeof workspace.manualOrder === "number" && Number.isFinite(workspace.manualOrder) ? workspace.manualOrder : undefined
}

// 没排过序的（新打开的）排在手排过的前面，同类里按打开时间倒序
export function sortRecentWorkspacesByStableOrder(workspaces: readonly RecentWorkspace[]): RecentWorkspace[] {
  return workspaces
    .map((workspace, sourceIndex) => ({ workspace, sourceIndex }))
    .sort((a, b) => {
      const aOrder = finiteManualOrder(a.workspace)
      const bOrder = finiteManualOrder(b.workspace)
      if (aOrder === undefined && bOrder !== undefined) return -1
      if (aOrder !== undefined && bOrder === undefined) return 1
      if (aOrder !== undefined && bOrder !== undefined && aOrder !== bOrder) return aOrder - bOrder
      return b.workspace.openedAt - a.workspace.openedAt || a.sourceIndex - b.sourceIndex
    })
    .map(({ workspace }) => workspace)
}

export function resolveRecentProjectsSortMode(value: unknown): RecentProjectsSortMode {
  return value === "recent" || value === "priority" ? value : "manual"
}

export function sortRecentWorkspaces(workspaces: readonly RecentWorkspace[], sortMode: RecentProjectsSortMode = "recent"): RecentWorkspace[] {
  if (sortMode === "manual") return sortRecentWorkspacesByStableOrder(workspaces)
  return workspaces
    .map((workspace, sourceIndex) => ({ workspace, sourceIndex }))
    .sort((a, b) => b.workspace.openedAt - a.workspace.openedAt || a.sourceIndex - b.sourceIndex)
    .map(({ workspace }) => workspace)
}

export function isWorkspacePathCaseInsensitivePlatform(os: string | undefined): boolean {
  return os === "win32"
}

/** 路径比较用的 key：统一分隔符、去掉 `.` 和重复斜杠；Windows 上再转小写 */
export function workspaceInventoryPathKey(path: string, caseInsensitive: boolean): string {
  const windowsAbsolute = /^[a-zA-Z]:[\\/]/.test(path) || /^\\\\/.test(path) || (caseInsensitive && path.startsWith("//"))
  const unified = windowsAbsolute ? path.replace(/\\/g, "/") : path
  const driveMatch = /^([a-zA-Z]:)(?:\/|$)/.exec(unified)
  const drive = driveMatch?.[1] ?? ""
  const doubleSlashRoot = !drive && unified.startsWith("//")
  const remainder = drive ? unified.slice(drive.length) : doubleSlashRoot ? unified.slice(2) : unified
  const absolute = remainder.startsWith("/")
  const segments: string[] = []
  for (const segment of remainder.split("/")) {
    if (!segment || segment === ".") continue
    segments.push(segment)
  }
  const prefix = drive ? `${drive}${absolute ? "/" : ""}` : doubleSlashRoot ? "//" : absolute ? "/" : ""
  const normalized = `${prefix}${segments.join("/")}` || (doubleSlashRoot ? "//" : absolute ? "/" : ".")
  return caseInsensitive ? normalized.toLocaleLowerCase("en-US") : normalized
}

function syntheticWorkspace(entry: WorkspaceEntry, openedAt: number): RecentWorkspace {
  const projectName = entry.projectName.trim()
  const folderName = folderNameFromPath(entry.folderPath)
  return {
    path: entry.folderPath,
    openedAt,
    ...(projectName && projectName !== folderName ? { displayName: projectName } : {}),
  }
}

export interface MergeInventoryOptions {
  caseInsensitive: boolean
  dismissals?: readonly RecentProjectDismissal[]
  sortMode?: RecentProjectsSortMode
  syntheticOpenedAt?: number
  syntheticOpenedAtForEntry?: (entry: WorkspaceEntry) => number
}

export function mergeWorkspaceInventory(
  recentWorkspaces: readonly RecentWorkspace[],
  authoritativeEntries: readonly WorkspaceEntry[],
  options: MergeInventoryOptions,
): WorkspaceInventoryItem[] {
  const entryByPath = new Map<string, WorkspaceEntry>()
  const dedupedEntries: WorkspaceEntry[] = []
  const seenEntryIds = new Set<string>()
  const dismissedAtByPath = new Map<string, number>()
  for (const dismissal of options.dismissals ?? []) {
    for (const path of dismissal.paths) {
      const key = workspaceInventoryPathKey(path, options.caseInsensitive)
      dismissedAtByPath.set(key, Math.max(dismissedAtByPath.get(key) ?? Number.NEGATIVE_INFINITY, dismissal.recentOpenedAt))
    }
  }
  const dismissedAtForPaths = (...paths: (string | undefined)[]) => {
    let dismissedAt: number | undefined
    for (const path of paths) {
      if (!path) continue
      const value = dismissedAtByPath.get(workspaceInventoryPathKey(path, options.caseInsensitive))
      if (value !== undefined) dismissedAt = Math.max(dismissedAt ?? value, value)
    }
    return dismissedAt
  }
  for (const entry of authoritativeEntries) {
    const folderKey = workspaceInventoryPathKey(entry.folderPath, options.caseInsensitive)
    const workspaceIdKey = workspaceInventoryPathKey(entry.workspaceId, options.caseInsensitive)
    if (seenEntryIds.has(entry.workspaceId) || entryByPath.has(folderKey) || entryByPath.has(workspaceIdKey)) continue
    seenEntryIds.add(entry.workspaceId)
    entryByPath.set(folderKey, entry)
    entryByPath.set(workspaceIdKey, entry)
    dedupedEntries.push(entry)
  }
  const consumedEntryIds = new Set<string>()
  const seenRecentPaths = new Set<string>()
  const inventory: WorkspaceInventoryItem[] = []
  for (const recent of recentWorkspaces) {
    const recentKey = workspaceInventoryPathKey(recent.path, options.caseInsensitive)
    if (seenRecentPaths.has(recentKey)) continue
    seenRecentPaths.add(recentKey)
    const authoritativeEntry = entryByPath.get(recentKey)
    const dismissedAt = dismissedAtForPaths(recent.path, authoritativeEntry?.folderPath, authoritativeEntry?.workspaceId)
    // 删掉之后又打开过（openedAt 更新）的要重新出现
    if (dismissedAt !== undefined && dismissedAt >= recent.openedAt) continue
    if (authoritativeEntry && consumedEntryIds.has(authoritativeEntry.workspaceId)) continue
    if (authoritativeEntry) {
      consumedEntryIds.add(authoritativeEntry.workspaceId)
      inventory.push({ workspace: { ...recent, path: authoritativeEntry.folderPath }, authoritativeEntry, recentPath: recent.path })
      continue
    }
    inventory.push({ workspace: recent, recentPath: recent.path })
  }
  for (const entry of dedupedEntries) {
    if (consumedEntryIds.has(entry.workspaceId)) continue
    consumedEntryIds.add(entry.workspaceId)
    if (dismissedAtForPaths(entry.folderPath, entry.workspaceId) !== undefined) continue
    const syntheticOpenedAt = options.syntheticOpenedAtForEntry?.(entry) ?? options.syntheticOpenedAt ?? Date.now()
    inventory.push({ workspace: syntheticWorkspace(entry, syntheticOpenedAt), authoritativeEntry: entry })
  }
  const sortedWorkspaces = sortRecentWorkspaces(
    inventory.map((item) => item.workspace),
    options.sortMode,
  )
  const itemByWorkspace = new Map(inventory.map((item) => [item.workspace, item]))
  return sortedWorkspaces.flatMap((workspace) => {
    const item = itemByWorkspace.get(workspace)
    return item ? [item] : []
  })
}

export function projectWorkspaceKey(path: string, caseInsensitive: boolean): string {
  return workspaceInventoryPathKey(path, caseInsensitive)
}

export const UNGROUPED_RECENT_GROUP_KEY = "__ungrouped__"

export interface RecentWorkspaceGroup {
  key: string
  project?: ProjectRecord
  items: WorkspaceInventoryItem[]
}

export function buildWorkspaceProjectIndex(projects: readonly ProjectRecord[], caseInsensitive: boolean): Map<string, ProjectRecord> {
  const index = new Map<string, ProjectRecord>()
  for (const project of projects) {
    for (const path of project.workspacePaths) {
      const key = projectWorkspaceKey(path, caseInsensitive)
      if (!index.has(key)) index.set(key, project)
    }
  }
  return index
}

/** 每个项目一组（空项目也列，显示「暂无创作」），没归属的放最后「未分组」 */
export function groupRecentWorkspacesByProject(
  inventory: readonly WorkspaceInventoryItem[],
  projects: readonly ProjectRecord[],
  caseInsensitive: boolean,
): RecentWorkspaceGroup[] {
  const index = buildWorkspaceProjectIndex(projects, caseInsensitive)
  const byProjectId = new Map<string, WorkspaceInventoryItem[]>()
  const ungrouped: WorkspaceInventoryItem[] = []
  for (const item of inventory) {
    const key = projectWorkspaceKey(item.workspace.path, caseInsensitive)
    const recentKey = item.recentPath ? projectWorkspaceKey(item.recentPath, caseInsensitive) : undefined
    const project = index.get(key) ?? (recentKey ? index.get(recentKey) : undefined)
    if (!project) {
      ungrouped.push(item)
      continue
    }
    const bucket = byProjectId.get(project.id)
    if (bucket) bucket.push(item)
    else byProjectId.set(project.id, [item])
  }
  const groups: RecentWorkspaceGroup[] = projects.map((project) => ({ key: project.id, project, items: byProjectId.get(project.id) ?? [] }))
  if (ungrouped.length > 0) groups.push({ key: UNGROUPED_RECENT_GROUP_KEY, items: ungrouped })
  return groups
}

/** 项目详情里的创作：清单里归属这个项目的，加上项目记着但清单里没有的（合成一条，打开时间记 0） */
export function selectProjectWorkspaces(
  inventory: readonly WorkspaceInventoryItem[],
  project: ProjectRecord | undefined,
  caseInsensitive: boolean,
): WorkspaceInventoryItem[] {
  if (!project) return []
  const ownedPathByKey = new Map(project.workspacePaths.map((path) => [projectWorkspaceKey(path, caseInsensitive), path]))
  if (ownedPathByKey.size === 0) return []
  const coveredKeys = new Set<string>()
  const matched = inventory.filter((item) => {
    const keys = [projectWorkspaceKey(item.workspace.path, caseInsensitive)]
    if (item.recentPath) keys.push(projectWorkspaceKey(item.recentPath, caseInsensitive))
    const hits = keys.filter((key) => ownedPathByKey.has(key))
    if (hits.length === 0) return false
    for (const key of hits) coveredKeys.add(key)
    return true
  })
  const synthesized: WorkspaceInventoryItem[] = []
  for (const [key, path] of ownedPathByKey) {
    if (coveredKeys.has(key)) continue
    synthesized.push({ workspace: { path, openedAt: 0 } })
  }
  return [...matched, ...synthesized]
}

/** 记一次打开：去重后把它放到最前（或更新时间），再按当前顺序重写 manualOrder */
export function recordRecentWorkspaceOpened(
  workspaces: readonly RecentWorkspace[],
  workspacePath: string,
  openedAt: number,
  options: { pathsEqual?: (left: string, right: string) => boolean; previousWorkspacePath?: string } = {},
): RecentWorkspace[] {
  const pathsEqual = options.pathsEqual ?? ((left: string, right: string) => left === right)
  const matchesOpenedWorkspace = (path: string) =>
    pathsEqual(path, workspacePath) || (options.previousWorkspacePath !== undefined && pathsEqual(path, options.previousWorkspacePath))
  const ordered = sortRecentWorkspacesByStableOrder(workspaces)
  const deduped: RecentWorkspace[] = []
  let matchedOpenedWorkspaceIndex: number | undefined
  const seenPaths = new Set<string>()
  for (const workspace of ordered) {
    if (matchesOpenedWorkspace(workspace.path)) {
      if (matchedOpenedWorkspaceIndex !== undefined) {
        // 重复项里的自定义名字、封面并到留下的那条上，别丢
        const retained = deduped[matchedOpenedWorkspaceIndex]
        if (retained) {
          deduped[matchedOpenedWorkspaceIndex] = {
            ...retained,
            ...(retained.displayName === undefined && workspace.displayName !== undefined ? { displayName: workspace.displayName } : {}),
            ...(retained.coverImage === undefined && workspace.coverImage !== undefined ? { coverImage: workspace.coverImage } : {}),
          }
        }
        continue
      }
      matchedOpenedWorkspaceIndex = deduped.length
    } else {
      if (seenPaths.has(workspace.path)) continue
      seenPaths.add(workspace.path)
    }
    deduped.push(workspace)
  }
  const existingIndex = deduped.findIndex((workspace) => matchesOpenedWorkspace(workspace.path))
  if (existingIndex === -1) deduped.unshift({ path: workspacePath, openedAt })
  else {
    const existing = deduped[existingIndex]
    if (existing) deduped[existingIndex] = { ...existing, path: workspacePath, openedAt }
  }
  return deduped.map((workspace, manualOrder) => ({ ...workspace, manualOrder }))
}

/** 显示名和别的工作区重名（不区分大小写）；改回目录名不算冲突 */
export function hasWorkspaceDisplayNameConflict(
  workspaces: readonly RecentWorkspace[],
  workspacePath: string,
  newName: string,
  truncate: (s: string) => string,
): boolean {
  const folderName = folderNameFromPath(workspacePath)
  const trimmed = truncate(newName)
  if (!trimmed || trimmed === folderName) return false
  const candidate = trimmed.toLowerCase()
  return workspaces.some((workspace) => workspace.path !== workspacePath && workspaceDisplayName(workspace).toLowerCase() === candidate)
}

/** 改显示名；改成目录名等于清掉自定义名。最近列表里还没有这一项时顺手记一次打开 */
export function applyWorkspaceDisplayNameRename(
  workspaces: readonly RecentWorkspace[],
  workspacePath: string,
  newName: string,
  truncate: (s: string) => string,
  openedAt = Date.now(),
): RecentWorkspace[] {
  const folderName = folderNameFromPath(workspacePath)
  const trimmed = truncate(newName)
  const displayName = !trimmed || trimmed === folderName ? undefined : trimmed
  let matched = false
  const renamed = workspaces.map((workspace) => {
    if (workspace.path !== workspacePath) return workspace
    matched = true
    if (displayName) return { ...workspace, displayName }
    const { displayName: _displayName, ...rest } = workspace
    return rest
  })
  if (matched) return renamed
  return recordRecentWorkspaceOpened(workspaces, workspacePath, openedAt).map((workspace) =>
    workspace.path === workspacePath && displayName ? { ...workspace, displayName } : workspace,
  )
}
