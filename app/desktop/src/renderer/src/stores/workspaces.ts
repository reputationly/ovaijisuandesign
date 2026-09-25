import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { gatewayJson, API_PATHS } from "../api/gateway"
import { globalGet, mainProcess } from "../api/main-process"
import { queryKeys } from "../api/query-client"
import type { ProjectRecord } from "../ipc"

/**
 * 侧栏「最近」和项目库用到的工作区列表。
 *
 * 主进程在时：最近打开的工作区（全局存储 recentWorkspaces）+ 已打开的标签 + 项目（projects）。
 * 没有主进程时（浏览器里开 renderer）退回旧接口：/api/canvases，再不行只列当前工作区。
 * 几种来源统一成同一个形状，页面不用关心数据来自哪边。
 */
export interface WorkspaceEntry {
  /** 路由里的 workspaceId：新后端是目录路径，旧后端是画布 id */
  id: string
  name: string
  updatedAt?: number
  projectId?: string
  /** 画布里有哪几类内容，用来挑缩略图标 */
  kinds?: string[]
}

export interface ProjectEntry {
  id: string
  name: string
  createdAt: number
}

export interface WorkspaceList {
  source: "main" | "canvases" | "single"
  current?: string
  workspaces: WorkspaceEntry[]
  projects: ProjectEntry[]
}

interface LegacyCanvases {
  current: string
  list: { id: string; name: string; updatedAt: number; project?: string; kinds: string[] }[]
  projects: ProjectEntry[]
}

export function basename(dir: string): string {
  const parts = dir.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? dir
}

interface RecentWorkspace {
  path: string
  openedAt?: number
  displayName?: string
}

async function fromMainProcess(): Promise<WorkspaceList | null> {
  const main = mainProcess()
  if (!main) return null
  const [recent, projects, entries, lastActive] = await Promise.all([
    globalGet<RecentWorkspace[]>("recentWorkspaces"),
    globalGet<ProjectRecord[]>("projects"),
    main.hilo.listWorkspaceEntries().catch(() => []),
    globalGet<string>("lastActiveWorkspacePath"),
  ])
  const projectOf = new Map<string, string>()
  for (const p of projects ?? []) for (const w of p.workspacePaths) projectOf.set(w, p.id)
  const byPath = new Map<string, WorkspaceEntry>()
  for (const r of recent ?? []) {
    byPath.set(r.path, { id: r.path, name: r.displayName || basename(r.path), updatedAt: r.openedAt, projectId: projectOf.get(r.path) })
  }
  // 已打开但还没进最近列表的（刚建的）也要列出来
  for (const e of entries) {
    if (!byPath.has(e.workspaceId)) byPath.set(e.workspaceId, { id: e.workspaceId, name: e.projectName || basename(e.folderPath), updatedAt: Date.now(), projectId: projectOf.get(e.workspaceId) })
  }
  return {
    source: "main",
    current: lastActive,
    workspaces: [...byPath.values()],
    projects: (projects ?? []).filter((p) => p.kind === "local").map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt })),
  }
}

export async function fetchWorkspaceList(): Promise<WorkspaceList> {
  const viaMain = await fromMainProcess().catch(() => null)
  if (viaMain) return viaMain
  try {
    const r = await gatewayJson<LegacyCanvases>("/api/canvases")
    return {
      source: "canvases",
      current: r.current,
      workspaces: r.list.map((s) => ({ id: s.id, name: s.name, updatedAt: s.updatedAt, projectId: s.project, kinds: s.kinds })),
      projects: r.projects,
    }
  } catch {
    // 新后端没有列表接口：退回只列当前工作区
  }
  try {
    const { dir } = await gatewayJson<{ dir: string }>(API_PATHS.workspace)
    return { source: "single", current: dir, workspaces: [{ id: dir, name: basename(dir) }], projects: [] }
  } catch {
    return { source: "single", workspaces: [], projects: [] }
  }
}

export function useWorkspaceList() {
  return useQuery({ queryKey: queryKeys.sessions, queryFn: fetchWorkspaceList })
}

/** 主进程里标签或项目变了就让列表失效重拉；挂在外壳上一次即可 */
export function useWorkspaceListSync() {
  const qc = useQueryClient()
  useEffect(() => {
    const main = mainProcess()
    if (!main) return
    const refresh = () => void qc.invalidateQueries({ queryKey: queryKeys.sessions })
    const a = main.hilo.onWorkspaceEntriesChanged(refresh)
    const b = main.project.onDidChangeProjects(refresh)
    return () => {
      a.dispose()
      b.dispose()
    }
  }, [qc])
}

/** 按「最近更新」「名称」排序；没有时间戳的排在最后 */
export function sortWorkspaces(list: WorkspaceEntry[], mode: "recent" | "name" = "recent"): WorkspaceEntry[] {
  const out = [...list]
  if (mode === "name") out.sort((a, b) => a.name.localeCompare(b.name))
  else out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  return out
}

/** 按项目分组：项目顺序跟项目列表一致，没有项目的归入「未分组」（projectId 为 undefined） */
export function groupByProject(list: WorkspaceEntry[], projects: ProjectEntry[]) {
  const groups: { project?: ProjectEntry; items: WorkspaceEntry[] }[] = []
  for (const p of projects) {
    const items = list.filter((w) => w.projectId === p.id)
    if (items.length) groups.push({ project: p, items })
  }
  const known = new Set(projects.map((p) => p.id))
  const rest = list.filter((w) => !w.projectId || !known.has(w.projectId))
  if (rest.length) groups.push({ items: rest })
  return groups
}
