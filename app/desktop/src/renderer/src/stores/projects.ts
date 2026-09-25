import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo } from "react"

import { mainProcess } from "../api/main-process"
import { hiloPlatform } from "../api/runtime"
import type { ProjectRecord } from "../ipc"
import { storageKeys, useGlobalStorage } from "./global-storage"
import { buildWorkspaceProjectIndex, projectWorkspaceKey } from "./workspace-inventory"

/**
 * 项目（一组工作区）。列表读全局存储的 `projects`，增删改走主进程 `project` 频道，
 * 改完失效缓存让所有用到的地方跟上。
 *
 * 「删除」和参照一致只是解散：把 id 记进 `hiddenProjectIds`，记录和项目空间目录都保留。
 */
export const PROJECT_NAME_MAX_CHARS = 50

export type ProjectKind = "local" | "team"
export type ProjectSortMode = "updated" | "created" | "name"

/** 按字符（不是 UTF-16 单元）截断，避免把表情切成半个 */
export function truncateProjectName(name: string | undefined, maxChars = PROJECT_NAME_MAX_CHARS): string {
  const trimmed = name?.trim() ?? ""
  if (!trimmed) return ""
  const chars = [...trimmed]
  return chars.length > maxChars ? chars.slice(0, maxChars).join("").trim() : trimmed
}

export function normalizeProjectName(name: string): string {
  return name.trim().replace(/\s+/g, " ")
}

function finiteNumberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function normalizeProjectKind(project: { kind?: unknown; remoteId?: unknown }): ProjectKind {
  if (project.kind === "team" || project.kind === "local") return project.kind
  return typeof project.remoteId === "string" && project.remoteId.trim() ? "team" : "local"
}

/** 存储里的数据可能是旧版本或手改过的：缺 id / 名字的丢掉，其余字段补默认值 */
export function normalizeProjectEntries(projects: unknown): ProjectRecord[] {
  if (!Array.isArray(projects)) return []
  const normalized: ProjectRecord[] = []
  for (const candidate of projects as Record<string, unknown>[]) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue
    const id = typeof candidate.id === "string" ? candidate.id.trim() : ""
    const name = typeof candidate.name === "string" ? normalizeProjectName(candidate.name) : ""
    if (!id || !name) continue
    const createdAt = finiteNumberOr(candidate.createdAt, 0)
    const updatedAt = finiteNumberOr(candidate.updatedAt, createdAt)
    const entry: ProjectRecord = {
      id,
      name,
      kind: normalizeProjectKind(candidate),
      createdAt,
      updatedAt,
      workspacePaths: Array.isArray(candidate.workspacePaths) ? candidate.workspacePaths.filter((p): p is string => typeof p === "string") : [],
      revision: Math.max(0, Math.trunc(finiteNumberOr(candidate.revision, 0))),
      transactionId: typeof candidate.transactionId === "string" ? candidate.transactionId : "",
      folderName: typeof candidate.folderName === "string" && candidate.folderName.trim() ? candidate.folderName : "",
    }
    if (typeof candidate.coverImage === "string") entry.coverImage = candidate.coverImage
    if (typeof candidate.remoteId === "string" && candidate.remoteId.trim()) entry.remoteId = candidate.remoteId
    normalized.push(entry)
  }
  return normalized
}

export function normalizeHiddenProjectIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean)))
}

export function filterVisibleProjects(projects: unknown, hiddenProjectIds: unknown): ProjectRecord[] {
  const hidden = new Set(normalizeHiddenProjectIds(hiddenProjectIds))
  return normalizeProjectEntries(projects).filter((project) => !hidden.has(project.id))
}

export function hideProjectId(hiddenProjectIds: unknown, projectId: string): string[] {
  return normalizeHiddenProjectIds([...normalizeHiddenProjectIds(hiddenProjectIds), projectId])
}

export function restoreProjectId(hiddenProjectIds: unknown, projectId: string): string[] {
  return normalizeHiddenProjectIds(hiddenProjectIds).filter((id) => id !== projectId)
}

/** 新建时重名自动加 `-2`、`-3`（不区分大小写） */
export function dedupeProjectName(projects: readonly ProjectRecord[], name: string): string {
  const base = normalizeProjectName(name)
  if (!base) return base
  const taken = new Set(projects.map((project) => project.name.toLowerCase()))
  if (!taken.has(base.toLowerCase())) return base
  let suffix = 2
  while (taken.has(`${base}-${suffix}`.toLowerCase())) suffix++
  return `${base}-${suffix}`
}

export function hasProjectNameConflict(projects: unknown, projectId: string, name: string): boolean {
  const normalized = normalizeProjectName(name)
  if (!normalized) return false
  const candidate = normalized.toLowerCase()
  return normalizeProjectEntries(projects).some((project) => project.id !== projectId && project.name.toLowerCase() === candidate)
}

export function findProjectForWorkspace(projects: readonly ProjectRecord[], workspacePath: string, caseInsensitive: boolean): ProjectRecord | undefined {
  return buildWorkspaceProjectIndex(projects, caseInsensitive).get(projectWorkspaceKey(workspacePath, caseInsensitive))
}

export function sortProjects(projects: unknown, mode: ProjectSortMode): ProjectRecord[] {
  const sorted = normalizeProjectEntries(projects)
  switch (mode) {
    case "created":
      sorted.sort((a, b) => b.createdAt - a.createdAt)
      break
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      break
    default:
      sorted.sort((a, b) => b.updatedAt - a.updatedAt)
      break
  }
  return sorted
}

export function filterProjectsByKeyword(projects: unknown, keyword: string): ProjectRecord[] {
  const needle = keyword.trim().toLocaleLowerCase()
  const safeProjects = normalizeProjectEntries(projects)
  if (!needle) return safeProjects
  return safeProjects.filter((project) => project.name.toLocaleLowerCase().includes(needle))
}

export function filterProjectsByKind(projects: unknown, kind: ProjectKind): ProjectRecord[] {
  return normalizeProjectEntries(projects).filter((project) => project.kind === kind)
}

/** 项目路径比较是否忽略大小写：macOS 和 Windows 的默认文件系统都不区分 */
export function isCaseInsensitiveOs(os: string | undefined): boolean {
  return os === "darwin" || os === "win32"
}

/** 主进程改了项目（别的窗口、主进程自己迁移）时让缓存失效；挂在外壳上一次即可 */
export function useProjectsSync(): void {
  const qc = useQueryClient()
  useEffect(() => {
    const main = mainProcess()
    if (!main) return
    const sub = main.project.onDidChangeProjects(() => void qc.invalidateQueries({ queryKey: storageKeys.global("projects") }))
    return () => sub.dispose()
  }, [qc])
}

const EMPTY: unknown[] = []

export function useProjectStore() {
  const caseInsensitive = isCaseInsensitiveOs(hiloPlatform().app?.os)
  const [projects, setProjectsAsync, hydrated] = useGlobalStorage<unknown[]>("projects", EMPTY)
  const [hiddenProjectIds, setHiddenProjectIdsAsync] = useGlobalStorage<unknown[]>("hiddenProjectIds", EMPTY)
  const allProjects = useMemo(() => normalizeProjectEntries(projects), [projects])
  const normalizedHiddenProjectIds = useMemo(() => normalizeHiddenProjectIds(hiddenProjectIds), [hiddenProjectIds])
  const visibleProjects = useMemo(() => filterVisibleProjects(allProjects, normalizedHiddenProjectIds), [allProjects, normalizedHiddenProjectIds])
  return {
    projects: visibleProjects,
    allProjects,
    hiddenProjectIds: normalizedHiddenProjectIds,
    setHiddenProjectIdsAsync,
    setProjectsAsync,
    caseInsensitive,
    /** 列表真正从存储读出来了（首帧的空列表不算） */
    hydrated,
  }
}

export function useProjects(options?: { sortMode?: ProjectSortMode; keyword?: string; kind?: ProjectKind }): ProjectRecord[] {
  const { projects } = useProjectStore()
  const sortMode = options?.sortMode ?? "updated"
  const keyword = options?.keyword ?? ""
  const kind = options?.kind
  return useMemo(
    () => sortProjects(filterProjectsByKeyword(kind ? filterProjectsByKind(projects, kind) : projects, keyword), sortMode),
    [keyword, kind, projects, sortMode],
  )
}

export function useProject(projectId: string | undefined): ProjectRecord | undefined {
  const { projects } = useProjectStore()
  return useMemo(() => (projectId ? projects.find((project) => project.id === projectId) : undefined), [projectId, projects])
}

export function useWorkspaceProject(workspacePath: string | undefined): ProjectRecord | undefined {
  const { projects, caseInsensitive } = useProjectStore()
  return useMemo(
    () => (workspacePath ? findProjectForWorkspace(projects, workspacePath, caseInsensitive) : undefined),
    [caseInsensitive, projects, workspacePath],
  )
}

export interface ProjectActionResult {
  project?: ProjectRecord
  safetyBlocked?: boolean
  errorMessageKey?: string
  errorMessage?: string
  errorCode?: "project-name-conflict" | "project-transfer-active" | "project-hide-failed" | "cloud-request-failed"
}

function projectService() {
  const main = mainProcess()
  if (!main) throw new Error("主进程不可用")
  return main.project
}

/**
 * 项目的增删改。团队项目依赖云端，这里一律给桩：新建返回提示，
 * 云端同步返回 null（调用方按「没拿到」处理）。
 */
export function useProjectActions() {
  const { allProjects: projects, caseInsensitive, hiddenProjectIds, setHiddenProjectIdsAsync } = useProjectStore()
  const qc = useQueryClient()
  const refreshProjects = useCallback(() => qc.invalidateQueries({ queryKey: storageKeys.global("projects") }), [qc])

  const createProject = useCallback(
    async (name: string, kind: ProjectKind): Promise<ProjectActionResult> => {
      if (kind === "team") return { errorMessageKey: "ov.project.teamUnavailable" }
      const uniqueName = dedupeProjectName(projects, name)
      const entry = await projectService().createProject({ name: uniqueName, kind })
      await refreshProjects()
      return { project: entry }
    },
    [projects, refreshProjects],
  )

  const renameProject = useCallback(
    async (project: ProjectRecord, name: string): Promise<ProjectActionResult> => {
      const normalizedName = normalizeProjectName(name)
      if (!normalizedName) return {}
      if (hasProjectNameConflict(projects, project.id, normalizedName)) return { errorCode: "project-name-conflict" }
      if (project.kind === "team" && project.remoteId) return { errorCode: "cloud-request-failed", errorMessageKey: "ov.project.teamUnavailable" }
      await projectService().renameProject(project.id, normalizedName)
      await refreshProjects()
      return {}
    },
    [projects, refreshProjects],
  )

  const deleteProject = useCallback(
    async (project: ProjectRecord): Promise<ProjectActionResult> => {
      if (await projectService().hasActiveProjectTransfers(project.id)) return { errorCode: "project-transfer-active" }
      const hidden = await setHiddenProjectIdsAsync((current) => hideProjectId(current, project.id))
      if (!hidden) return { errorCode: "project-hide-failed" }
      return {}
    },
    [setHiddenProjectIdsAsync],
  )

  const restoreProjectVisibility = useCallback(
    async (projectId: string) => {
      if (!hiddenProjectIds.includes(projectId)) return true
      return setHiddenProjectIdsAsync((current) => restoreProjectId(current, projectId))
    },
    [hiddenProjectIds, setHiddenProjectIdsAsync],
  )

  const addWorkspaceToProject = useCallback(
    async (workspacePath: string, projectId: string, _source?: string) => {
      await projectService().assignWorkspace(workspacePath, projectId, caseInsensitive)
      await refreshProjects()
    },
    [caseInsensitive, refreshProjects],
  )

  const removeWorkspaceFromProject = useCallback(
    async (workspacePath: string, _source?: string) => {
      await projectService().detachWorkspace(workspacePath, caseInsensitive)
      await refreshProjects()
    },
    [caseInsensitive, refreshProjects],
  )

  const syncCloudProjects = useCallback(async (): Promise<null> => null, [])

  const ensureProjectFolderName = useCallback((projectId: string) => projectService().getProjectFolderName(projectId), [])

  return {
    createProject,
    renameProject,
    deleteProject,
    restoreProjectVisibility,
    addWorkspaceToProject,
    removeWorkspaceFromProject,
    syncCloudProjects,
    ensureProjectFolderName,
  }
}
