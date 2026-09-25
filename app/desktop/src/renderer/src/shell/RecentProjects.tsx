import { useNavigate, useRouterState } from "@tanstack/react-router"
import { ArrowUpRight, ChevronDown, ChevronRight, CircleX, Copy, Folder, FolderOpen, FolderX, MessageSquare, Pencil, Pin, Plus, Users } from "lucide-react"
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { hiloPlatform } from "../api/runtime"
import { AddToProjectSubMenu, InlineRenameInput } from "../components/project/controls"
import { CreateProjectDialog, CreateProjectMenuContent, useCreateProjectKind } from "../components/project/dialogs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import { dedupedToast } from "../components/ui/sonner"
import { Hint } from "../components/ui/tooltip"
import type { ProjectRecord } from "../ipc"
import { cn } from "../lib"
import { useGlobalConfig } from "../stores/global-config"
import { useProjectActions, useProjectStore, type ProjectKind } from "../stores/projects"
import { useRecentWorkspaces, useRecentWorkspacesRefresh, useWorkspaceDisplayNameRename } from "../stores/recent-workspaces"
import {
  buildWorkspaceProjectIndex,
  groupRecentWorkspacesByProject,
  isWorkspacePathCaseInsensitivePlatform,
  mergeWorkspaceInventory,
  projectWorkspaceKey,
  resolveRecentProjectsSortMode,
  UNGROUPED_RECENT_GROUP_KEY,
  workspaceDisplayName,
  workspaceInventoryPathKey,
  type RecentProjectsSortMode,
  type RecentWorkspace,
  type WorkspaceInventoryItem,
} from "../stores/workspace-inventory"
import { DotsVerticalIcon } from "./icons"
import { useNewWorkspaceDialog } from "./new-workspace-dialog"
import { buildWorkspaceSearch, useHiloApp, useTopbarActions, useTopbarState, type WorkspaceStatus } from "./topbar"
import { stageWorkspacePreview } from "./workspace-open"

type GroupMode = "project" | "none"

const HOME_RECENT_GROUP_ACTION_CLASS =
  "flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none"

/**
 * 侧栏「项目」分区：最近打开的工作区合并已打开的标签，按项目分组（或平铺）。
 * 已打开的那几项能「关闭项目」（停掉运行时），当前工作区高亮。
 */
export function RecentProjects() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const hiloApp = useHiloApp()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const caseInsensitiveWorkspacePaths = isWorkspacePathCaseInsensitivePlatform(hiloPlatform().app?.os)
  const { currentWorkspaceId, entries, workspaceStatusById } = useTopbarState()
  const { createWorkspace, closeWorkspace } = useTopbarActions()
  const { requestOpen: requestNewProject, requestOpenForProject: requestNewProjectInProject, dialog: newProjectDialog } = useNewWorkspaceDialog(createWorkspace)
  const { projects, caseInsensitive: projectCaseInsensitive } = useProjectStore()
  const { addWorkspaceToProject, createProject, removeWorkspaceFromProject } = useProjectActions()
  const [createProjectKind, setCreateProjectKind] = useCreateProjectKind()
  const [recentWorkspaces, , recentHydrated] = useRecentWorkspaces()
  const sortModeRaw = useGlobalConfig((s) => s.config.recentProjectsSortMode)
  const groupModeRaw = useGlobalConfig((s) => s.config.recentProjectsGroupMode)
  const updateConfig = useGlobalConfig((s) => s.update)
  const sortMode = resolveRecentProjectsSortMode(sortModeRaw)
  const groupingEnabled = groupModeRaw !== "none"
  useRecentWorkspacesRefresh()

  // 只在标签里、还没进最近列表的项没有打开时间：第一次见到时记一个，之后保持不变，免得每次渲染都跳到最前
  const syntheticOpenedAtByPathRef = useRef(new Map<string, number>())
  for (const workspace of recentWorkspaces) {
    const key = workspaceInventoryPathKey(workspace.path, caseInsensitiveWorkspacePaths)
    const previous = syntheticOpenedAtByPathRef.current.get(key)
    if (previous === undefined || workspace.openedAt > previous) syntheticOpenedAtByPathRef.current.set(key, workspace.openedAt)
  }
  const syntheticOpenedAtForEntry = useCallback(
    (entry: { folderPath: string }) => {
      const key = workspaceInventoryPathKey(entry.folderPath, caseInsensitiveWorkspacePaths)
      const existing = syntheticOpenedAtByPathRef.current.get(key)
      if (existing !== undefined) return existing
      const firstSeenAt = Date.now()
      syntheticOpenedAtByPathRef.current.set(key, firstSeenAt)
      return firstSeenAt
    },
    [caseInsensitiveWorkspacePaths],
  )

  const baseInventory = useMemo(
    () =>
      mergeWorkspaceInventory(recentHydrated ? recentWorkspaces : [], entries, {
        caseInsensitive: caseInsensitiveWorkspacePaths,
        sortMode,
        syntheticOpenedAtForEntry,
      }),
    [caseInsensitiveWorkspacePaths, entries, recentHydrated, recentWorkspaces, sortMode, syntheticOpenedAtForEntry],
  )
  const inventory = useMemo(() => {
    if (sortMode !== "priority") return baseInventory
    const rank = (item: WorkspaceInventoryItem) => {
      const id = item.authoritativeEntry?.workspaceId
      const status = id ? workspaceStatusById.get(id) : undefined
      if (status?.needsUserAction) return 0
      if (status?.running) return 1
      if (status?.unread) return 2
      return 3
    }
    return baseInventory
      .map((item, index) => ({ item, index, rank: rank(item) }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map(({ item }) => item)
  }, [baseInventory, sortMode, workspaceStatusById])

  const groups = useMemo(
    () => (groupingEnabled ? groupRecentWorkspacesByProject(inventory, projects, projectCaseInsensitive) : []),
    [groupingEnabled, inventory, projectCaseInsensitive, projects],
  )
  const workspaceProjectByKey = useMemo(() => buildWorkspaceProjectIndex(projects, projectCaseInsensitive), [projectCaseInsensitive, projects])
  const selectedProjectId = useMemo(() => {
    const match = pathname.match(/^\/projects\/([^/]+)/)
    return match ? decodeURIComponent(match[1]!) : null
  }, [pathname])

  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(() => new Set())
  const [sectionCollapsed, setSectionCollapsed] = useState(false)
  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroupKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const activateHomeThen = useCallback(
    (go: () => void) => {
      void hiloApp.activateHome().catch(() => {})
      go()
    },
    [hiloApp],
  )
  const handleOpenAllCreations = useCallback(() => activateHomeThen(() => void navigate({ to: "/creations" })), [activateHomeThen, navigate])
  const handleOpenProjectDetail = useCallback(
    (projectId: string) => activateHomeThen(() => void navigate({ to: "/projects/$projectId", params: { projectId } })),
    [activateHomeThen, navigate],
  )
  const handleRecentClick = useCallback(
    (workspace: RecentWorkspace) => {
      void stageWorkspacePreview({
        hiloApp,
        folderPath: workspace.path,
        t,
        onStaged: (entry) => navigate({ to: "/workspace", search: buildWorkspaceSearch(entry.workspaceId) }),
      }).catch(() => {})
    },
    [hiloApp, navigate, t],
  )
  const handleCreateProject = useCallback(
    async (name: string, kind: ProjectKind) => {
      const result = await createProject(name, kind).catch((e: unknown) => ({ project: undefined, errorMessage: e instanceof Error ? e.message : String(e), errorMessageKey: undefined }))
      if (!result.project) {
        dedupedToast.error(result.errorMessage ?? t(result.errorMessageKey ?? "project.create.failed"))
        return
      }
      setCreateProjectKind(null)
      void navigate({ to: "/projects/$projectId", params: { projectId: result.project.id } })
    },
    [createProject, navigate, setCreateProjectKind, t],
  )

  const renderRow = (item: WorkspaceInventoryItem) => {
    const workspace = item.workspace
    const authoritativeId = item.authoritativeEntry?.workspaceId
    const ownerKey = projectWorkspaceKey(workspace.path, projectCaseInsensitive)
    const recentKey = item.recentPath ? projectWorkspaceKey(item.recentPath, projectCaseInsensitive) : undefined
    const currentProject = workspaceProjectByKey.get(ownerKey) ?? (recentKey ? workspaceProjectByKey.get(recentKey) : undefined)
    return (
      <RecentProjectRow
        key={authoritativeId ?? workspace.path}
        workspace={workspace}
        renamePath={item.recentPath}
        active={Boolean(authoritativeId && authoritativeId === currentWorkspaceId)}
        open={Boolean(authoritativeId)}
        status={authoritativeId ? workspaceStatusById.get(authoritativeId) : undefined}
        onOpen={handleRecentClick}
        onCloseRuntime={authoritativeId ? () => closeWorkspace(authoritativeId, "home-sidebar-recent") : undefined}
        projects={projects}
        currentProject={currentProject}
        onAddToProject={(path, projectId) => void addWorkspaceToProject(path, projectId, "sidebar-menu")}
        onRemoveFromProject={(path) => void removeWorkspaceFromProject(path, "sidebar-menu")}
      />
    )
  }

  return (
    <div data-action-ui-id="home-sidebar.recent-projects">
      <div className="group flex items-center pl-5 pr-2 pt-[18px] pb-0.5" data-action-ui-id="home-sidebar.recent-header" data-right-inset="2">
        {groupingEnabled ? (
          <button
            type="button"
            aria-label={sectionCollapsed ? t("project.expand") : t("project.collapse")}
            aria-expanded={!sectionCollapsed}
            data-action-ui-id="home-sidebar.recent-section-toggle"
            onClick={() => setSectionCollapsed((v) => !v)}
            className="flex items-center gap-1 text-sm text-[var(--home-sidebar-section-text)] font-normal cursor-pointer hover:text-foreground focus-visible:outline-none"
          >
            <span>{t("project.sidebarTitle")}</span>
            {sectionCollapsed ? (
              <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="text-sm text-[var(--home-sidebar-section-text)] font-normal">{t("homeSidebar.recentProjects")}</span>
        )}
        {!groupingEnabled ? (
          <Hint content={t("home.viewAll")} side="top">
            <button
              type="button"
              aria-label={t("home.viewAll")}
              data-action-ui-id="home-sidebar.recent-view-all"
              onClick={handleOpenAllCreations}
              className="ml-1 flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-[80ms] hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
            >
              <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </Hint>
        ) : null}
        <RecentProjectsHeaderActions
          sortMode={sortMode}
          onSortModeChange={(mode) => updateConfig({ recentProjectsSortMode: mode })}
          groupMode={groupingEnabled ? "project" : "none"}
          onGroupModeChange={(mode) => updateConfig({ recentProjectsGroupMode: mode })}
          onCreateProject={groupingEnabled ? undefined : requestNewProject}
          onSelectCreateKind={groupingEnabled ? setCreateProjectKind : undefined}
          createLabel={groupingEnabled ? t("project.create.trigger") : t("project.newCreation")}
        />
      </div>
      {groupingEnabled ? (
        <div className="flex shrink-0 flex-col">
          {groups.map((group) => {
            const projectId = group.project?.id
            const toggleKey = projectId ?? UNGROUPED_RECENT_GROUP_KEY
            const expanded = !collapsedGroupKeys.has(toggleKey)
            const isUngrouped = !group.project
            if (sectionCollapsed && !isUngrouped) return null
            return (
              <section key={group.key} data-action-ui-id="home-sidebar.recent-group" className={cn("flex flex-col gap-px", isUngrouped && "pt-4")}>
                <RecentProjectGroupHeader
                  project={group.project}
                  expanded={expanded}
                  onToggle={toggleGroup}
                  selected={Boolean(projectId && projectId === selectedProjectId)}
                  onNewCreation={requestNewProjectInProject}
                  onOpenDetail={handleOpenProjectDetail}
                  onNewCreationUngrouped={isUngrouped ? requestNewProject : undefined}
                  onOpenAllUngrouped={isUngrouped ? handleOpenAllCreations : undefined}
                />
                {expanded ? (
                  group.items.length > 0 ? (
                    <ul className="flex shrink-0 flex-col gap-px" style={{ paddingLeft: isUngrouped ? 0 : 16 }} data-action-ui-id="home-sidebar.recent-group-items">
                      {group.items.map(renderRow)}
                    </ul>
                  ) : (
                    <p className="flex h-[32px] items-center text-xs text-foreground/30 -mt-[6px]" style={{ paddingLeft: 40 }} data-action-ui-id="home-sidebar.recent-group-empty">
                      {t("project.creationsEmptySidebar")}
                    </p>
                  )
                ) : null}
              </section>
            )
          })}
        </div>
      ) : (
        <ul className="flex shrink-0 flex-col gap-px">{inventory.map(renderRow)}</ul>
      )}
      {newProjectDialog}
      <CreateProjectDialog
        open={createProjectKind !== null}
        kind={createProjectKind ?? "local"}
        onConfirm={handleCreateProject}
        onOpenChange={(open) => {
          if (!open) setCreateProjectKind(null)
        }}
      />
    </div>
  )
}

const CREATE_TRIGGER_CLASS =
  "pointer-events-none flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-[opacity,background-color,color] duration-[80ms] hover:bg-foreground/[0.05] hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"

function RecentProjectsHeaderActions({
  sortMode,
  onSortModeChange,
  groupMode,
  onGroupModeChange,
  onCreateProject,
  onSelectCreateKind,
  createLabel,
}: {
  sortMode: RecentProjectsSortMode
  onSortModeChange: (mode: RecentProjectsSortMode) => void
  groupMode: GroupMode
  onGroupModeChange: (mode: GroupMode) => void
  onCreateProject?: () => void
  onSelectCreateKind?: (kind: ProjectKind) => void
  createLabel: string
}) {
  const { t } = useTranslation()
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const moreLabel = t("homeSidebar.recentProjectsMore")
  return (
    <div className="ml-auto flex shrink-0 items-center gap-0.5" data-action-ui-id="home-sidebar.recent-header-actions">
      <DropdownMenu modal={false} open={sortMenuOpen} onOpenChange={setSortMenuOpen}>
        <Hint content={moreLabel} side="top">
          <DropdownMenuTrigger
            aria-label={moreLabel}
            data-action-ui-id="home-sidebar.recent-sort-trigger"
            className={cn(CREATE_TRIGGER_CLASS, "data-[popup-open]:pointer-events-auto data-[popup-open]:bg-foreground/[0.05] data-[popup-open]:text-foreground data-[popup-open]:opacity-100")}
          >
            <DotsVerticalIcon size={16} />
          </DropdownMenuTrigger>
        </Hint>
        <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="min-w-40">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("homeSidebar.recentProjectsGroupLabel")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={groupMode}
              aria-label={t("homeSidebar.recentProjectsGroupLabel")}
              onValueChange={(value) => {
                if (value === "project" || value === "none") onGroupModeChange(value)
              }}
            >
              <DropdownMenuRadioItem value="project" data-action-ui-id="home-sidebar.recent-group-project">
                {t("homeSidebar.recentProjectsGroupProject")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="none" data-action-ui-id="home-sidebar.recent-group-none">
                {t("homeSidebar.recentProjectsGroupNone")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("homeSidebar.recentProjectsSortLabel")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sortMode}
              aria-label={t("homeSidebar.recentProjectsSortLabel")}
              onValueChange={(value) => {
                if (value === "manual" || value === "recent" || value === "priority") onSortModeChange(value)
              }}
            >
              <DropdownMenuRadioItem value="manual" data-action-ui-id="home-sidebar.recent-sort-manual">
                {t("homeSidebar.recentProjectsSortManual")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="recent" data-action-ui-id="home-sidebar.recent-sort-recent">
                {t("homeSidebar.recentProjectsSortRecent")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="priority" data-action-ui-id="home-sidebar.recent-sort-priority">
                {t("homeSidebar.recentProjectsSortPriority")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {onSelectCreateKind ? (
        // 和项目库的「新建项目」按钮同一个菜单，每个入口都能选本地 / 团队
        <DropdownMenu>
          <Hint content={createLabel} side="top">
            <DropdownMenuTrigger
              aria-label={createLabel}
              data-action-ui-id="home-sidebar.recent-create-project"
              onClick={() => setSortMenuOpen(false)}
              className={cn(CREATE_TRIGGER_CLASS, "data-[popup-open]:pointer-events-auto data-[popup-open]:bg-foreground/[0.05] data-[popup-open]:text-foreground data-[popup-open]:opacity-100", sortMenuOpen && "pointer-events-auto opacity-100")}
            >
              <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
            </DropdownMenuTrigger>
          </Hint>
          <CreateProjectMenuContent actionUiIdPrefix="home-sidebar.recent" onSelectKind={onSelectCreateKind} align="end" side="bottom" sideOffset={4} />
        </DropdownMenu>
      ) : (
        <Hint content={createLabel} side="top">
          <button
            type="button"
            aria-label={createLabel}
            data-action-ui-id="home-sidebar.recent-create-project"
            onClick={() => {
              setSortMenuOpen(false)
              onCreateProject?.()
            }}
            className={cn(CREATE_TRIGGER_CLASS, sortMenuOpen && "pointer-events-auto opacity-100")}
          >
            <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </Hint>
      )}
    </div>
  )
}

function RecentProjectGroupHeader({
  project,
  expanded,
  onToggle,
  selected = false,
  onNewCreation,
  onOpenDetail,
  onNewCreationUngrouped,
  onOpenAllUngrouped,
}: {
  project?: ProjectRecord
  expanded: boolean
  onToggle: (key: string) => void
  selected?: boolean
  onNewCreation: (projectId: string) => void
  onOpenDetail: (projectId: string) => void
  onNewCreationUngrouped?: () => void
  onOpenAllUngrouped?: () => void
}) {
  const { t } = useTranslation()
  const label = project?.name ?? t("project.ungrouped")
  const projectId = project?.id
  const FolderIcon = project?.kind === "team" ? Users : expanded ? FolderOpen : Folder
  const ChevronToggle = expanded ? ChevronDown : ChevronRight
  const indentPx = 20
  const toggle = () => onToggle(projectId ?? UNGROUPED_RECENT_GROUP_KEY)
  const smallBtn =
    "pointer-events-none relative z-10 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity duration-150 hover:bg-foreground/[0.06] hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none group-hover:pointer-events-auto group-hover:opacity-100"
  return (
    <div
      className={cn(
        "group relative isolate flex h-[32px] items-center gap-1 pr-2 text-sm",
        project ? "text-[var(--home-sidebar-secondary-text)]" : "text-[var(--home-sidebar-section-text)]",
        "before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:left-[calc(var(--hover-left)_-_6px)] before:-z-10 before:rounded-md",
        project && (selected ? "before:bg-[var(--home-sidebar-nav-hover)] text-foreground" : "hover:before:bg-[var(--home-sidebar-nav-hover)]"),
      )}
      style={{ paddingLeft: indentPx, ["--hover-left" as string]: `${indentPx}px` }}
      data-action-ui-id="home-sidebar.recent-group-header"
      data-project-id={projectId}
      data-selected={selected ? "true" : "false"}
    >
      {projectId ? (
        <>
          <button
            type="button"
            aria-label={expanded ? t("project.collapse") : t("project.expand")}
            aria-expanded={expanded}
            data-action-ui-id="home-sidebar.recent-group-toggle"
            className="relative z-10 flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none"
            onClick={(event) => {
              event.stopPropagation()
              toggle()
            }}
          >
            <FolderIcon size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button type="button" aria-label={label} data-action-ui-id="home-sidebar.recent-group-label" className="flex min-w-0 flex-1 items-center gap-1 cursor-pointer text-left" onClick={toggle}>
            <span className="min-w-0 truncate">{label}</span>
          </button>
          <span
            className="pointer-events-none absolute inset-y-0 right-0.5 z-10 flex items-center gap-0.5 rounded-r-md bg-[var(--home-sidebar-nav-hover)] px-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
            data-action-ui-id="home-sidebar.recent-group-actions"
          >
            <HeaderIconButton id="home-sidebar.recent-group-open-detail" label={t("project.openDetail")} onClick={() => onOpenDetail(projectId)}>
              <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
            </HeaderIconButton>
            <HeaderIconButton id="home-sidebar.recent-group-new-creation" label={t("project.newCreation")} onClick={() => onNewCreation(projectId)}>
              <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
            </HeaderIconButton>
          </span>
        </>
      ) : (
        <>
          <button type="button" aria-label={label} data-action-ui-id="home-sidebar.recent-group-label" className="flex min-w-0 items-center gap-1 cursor-pointer text-left" onClick={toggle}>
            <span className="min-w-0 truncate">{label}</span>
            <ChevronToggle size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-muted-foreground" />
          </button>
          <div className="flex-1" aria-hidden="true" />
          {onOpenAllUngrouped ? (
            <Hint content={t("home.viewAll")} side="top">
              <button
                type="button"
                aria-label={t("home.viewAll")}
                data-action-ui-id="home-sidebar.recent-group-ungrouped-view-all"
                onClick={(event) => {
                  event.stopPropagation()
                  onOpenAllUngrouped()
                }}
                className={smallBtn}
              >
                <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </Hint>
          ) : null}
          {onNewCreationUngrouped ? (
            <Hint content={t("project.newCreation")} side="top">
              <button
                type="button"
                aria-label={t("project.newCreation")}
                data-action-ui-id="home-sidebar.recent-group-ungrouped-new-creation"
                onClick={(event) => {
                  event.stopPropagation()
                  onNewCreationUngrouped()
                }}
                className={smallBtn}
              >
                <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </Hint>
          ) : null}
        </>
      )}
    </div>
  )
}

function HeaderIconButton({ id, label, onClick, children }: { id: string; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Hint content={label} side="top">
      <button
        type="button"
        aria-label={label}
        data-action-ui-id={id}
        className={HOME_RECENT_GROUP_ACTION_CLASS}
        onClick={(event) => {
          event.stopPropagation()
          onClick()
        }}
      >
        {children}
      </button>
    </Hint>
  )
}

function fileManagerLabelKey(os: string | undefined): string {
  if (os === "darwin") return "common.fileManager.open.darwin"
  if (os === "win32") return "common.fileManager.open.win32"
  return "common.fileManager.open.other"
}

function RecentProjectRow({
  workspace,
  renamePath,
  active,
  open,
  status,
  onOpen,
  onCloseRuntime,
  projects,
  currentProject,
  onAddToProject,
  onRemoveFromProject,
}: {
  workspace: RecentWorkspace
  renamePath?: string
  active: boolean
  /** 主进程里有这个标签：侧栏据此区分「已打开」 */
  open: boolean
  status?: WorkspaceStatus
  onOpen: (workspace: RecentWorkspace) => void
  onCloseRuntime?: () => void
  projects: ProjectRecord[]
  currentProject?: ProjectRecord
  onAddToProject: (workspacePath: string, projectId: string) => void
  onRemoveFromProject: (workspacePath: string) => void
}) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const renameAfterMenuCloseRef = useRef(false)
  const displayName = workspaceDisplayName(workspace)
  const renameDisplayName = useWorkspaceDisplayNameRename(renamePath ?? workspace.path)
  const platform = hiloPlatform()

  const handleMenuOpenChange = useCallback((next: boolean) => {
    setMenuOpen(next)
    if (next || !renameAfterMenuCloseRef.current) return
    renameAfterMenuCloseRef.current = false
    window.setTimeout(() => setRenaming(true), 0)
  }, [])

  const pillClass = cn(
    "home-sidebar-nav-pill relative isolate flex h-8 w-full items-center gap-2 rounded-md before:pointer-events-none before:absolute before:inset-y-0 before:-z-10 before:rounded-md pr-2 text-left",
    active ? "before:bg-[var(--home-sidebar-nav-active)]" : "group-hover:before:bg-[var(--home-sidebar-nav-hover)]",
  )
  const thumbnail = (
    <span className="relative flex size-6 shrink-0 overflow-hidden rounded-sm" data-action-ui-id="home-sidebar.recent-thumbnail">
      <span className="home-sidebar-recent-thumbnail-fallback flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-foreground/[0.04] text-sidebar-foreground">
        <MessageSquare className="size-3 opacity-40" strokeWidth={2} />
      </span>
    </span>
  )

  return (
    <li
      className={cn(
        "group relative flex h-[32px] shrink-0 cursor-pointer items-center text-left text-sm text-[var(--home-sidebar-secondary-text)] transition-colors hover:text-foreground",
        active && "text-foreground",
      )}
      data-action-ui-id="home-sidebar-recent"
      data-workspace-path={workspace.path}
      data-open={open ? "true" : "false"}
      data-active={active ? "true" : "false"}
    >
      {renaming ? (
        <div className={pillClass} data-action-ui-id="home-sidebar.recent-pill">
          {thumbnail}
          <InlineRenameInput
            initialName={displayName}
            placeholder={t("home.workspace.displayNamePlaceholder")}
            onConfirm={(name) => {
              renameDisplayName(name)
              setRenaming(false)
            }}
            onCancel={() => setRenaming(false)}
          />
        </div>
      ) : (
        <button type="button" aria-current={active ? "page" : undefined} onClick={() => onOpen(workspace)} className={pillClass} data-action-ui-id="home-sidebar.recent-pill">
          {thumbnail}
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate" data-recent-project-name="true">
              {displayName}
            </span>
          </span>
          <span
            className={cn(
              "relative flex h-4 shrink-0 items-center justify-center overflow-hidden transition-[width] duration-150 ease-out group-hover:w-5 group-focus-within:w-5",
              status?.running || status?.unread ? "w-4" : "w-0",
            )}
            data-action-ui-id="home-sidebar.recent-trailing-slot"
          />
        </button>
      )}
      <div
        className={cn(
          "pointer-events-none absolute right-0.5 top-0 bottom-0 flex items-center gap-0.5 px-2 rounded-r-md opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 bg-[var(--home-sidebar-nav-hover)]",
          menuOpen && "pointer-events-auto opacity-100",
        )}
      >
        <Hint content={t("session.pin")} side="top">
          <button
            type="button"
            className="pointer-events-auto flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/[0.1] hover:text-foreground focus-visible:outline-none"
            data-action-ui-id="home-sidebar-recent-pin"
            aria-label={t("session.pin")}
          >
            <Pin size={14} strokeWidth={1.5} />
          </button>
        </Hint>
        <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
          <DropdownMenuTrigger
            disabled={renaming}
            aria-label={t("homeSidebar.recentProjectActions")}
            data-action-ui-id="home-sidebar-recent-more"
            className={cn(
              "pointer-events-auto flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none",
              menuOpen && "bg-foreground/[0.06]",
            )}
          >
            <DotsVerticalIcon size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="bottom" sideOffset={2} data-action-ui-id="home-sidebar.recent-actions-menu">
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation()
                renameAfterMenuCloseRef.current = true
                handleMenuOpenChange(false)
              }}
            >
              <Pencil size={14} strokeWidth={1.5} />
              {t("common.rename")}
            </DropdownMenuItem>
            <AddToProjectSubMenu
              projects={projects}
              currentProjectId={currentProject?.id}
              onSelect={(projectId) => {
                setMenuOpen(false)
                onAddToProject(workspace.path, projectId)
              }}
            />
            {currentProject ? (
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation()
                  setMenuOpen(false)
                  onRemoveFromProject(workspace.path)
                }}
                data-action-ui-id="home-sidebar.recent-remove-from-project"
              >
                <FolderX size={14} strokeWidth={1.5} />
                {t("project.removeFromProject")}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation()
                try {
                  platform.clipboard?.writeText(workspace.path)
                  dedupedToast.success(t("fileExplorer.pathCopied"))
                } catch {
                  dedupedToast.error(t("fileExplorer.copyFailed"))
                }
              }}
            >
              <Copy size={14} strokeWidth={1.5} />
              {t("fileExplorer.copyPath")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation()
                const shell = platform.shell
                if (!shell) {
                  dedupedToast.error(t("fileExplorer.platformNotSupported"))
                  return
                }
                void shell.openPath(workspace.path).catch(() => dedupedToast.error(t("fileExplorer.openFailed")))
              }}
            >
              <FolderOpen className="size-4" aria-hidden="true" />
              {t(fileManagerLabelKey(platform.app?.os))}
            </DropdownMenuItem>
            {onCloseRuntime ? (
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation()
                  setMenuOpen(false)
                  onCloseRuntime()
                }}
                data-action-ui-id="home-sidebar.recent-close-runtime"
              >
                <CircleX size={14} strokeWidth={1.5} />
                {t("homeSidebar.closeProject")}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}
