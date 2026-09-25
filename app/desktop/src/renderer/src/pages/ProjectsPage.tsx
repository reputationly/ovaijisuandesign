import { useNavigate, useSearch } from "@tanstack/react-router"
import { BookOpen, ChevronDown, CloudUpload, FolderOpen, Pencil, Plus, Search, Trash2, Users } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { useWorkspaceThumbnails } from "../api/app-gateway"
import { ClickableArea, InlineRenameInput } from "../components/project/controls"
import { CreateProjectDialog, CreateProjectMenuContent, DissolveProjectDialog, useCreateProjectKind } from "../components/project/dialogs"
import { Button } from "../components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import { Input } from "../components/ui/form"
import { dedupedToast } from "../components/ui/sonner"
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Hint } from "../components/ui/tooltip"
import type { ProjectRecord } from "../ipc"
import { cn } from "../lib"
import { DotsVerticalIcon } from "../shell/icons"
import { useGlobalConfig } from "../stores/global-config"
import { useProjectActions, useProjects, type ProjectKind, type ProjectSortMode } from "../stores/projects"
import { formatTimestampDot } from "../stores/workspace-inventory"
import { CatalogPage, PageState } from "./common"

const SORT_MODES: ProjectSortMode[] = ["updated", "created", "name"]
const KIND_TABS: { kind: ProjectKind; labelKey: string }[] = [
  { kind: "local", labelKey: "project.kindTabs.local" },
  { kind: "team", labelKey: "project.kindTabs.cloud" },
]

function isProjectsSortMode(value: unknown): value is ProjectSortMode {
  return SORT_MODES.includes(value as ProjectSortMode)
}

export function projectListLocation(kind: ProjectKind) {
  return { to: "/projects" as const, search: { kind: kind === "team" ? ("team" as const) : undefined } }
}

/** 项目库：本地项目的卡片列表，新建 / 改名 / 解散。团队（云端）页签只有空状态 */
export function ProjectsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // 路由 id 在类型层和运行时对末尾斜杠的处理不一致，这里不按 id 取
  const kind = (useSearch({ strict: false }) as { kind?: ProjectKind }).kind
  const activeKind: ProjectKind = kind ?? "local"
  const configSort = useGlobalConfig((s) => s.config.projectsSortMode)
  const updateConfig = useGlobalConfig((s) => s.update)
  const [keyword, setKeyword] = useState("")
  const [createKind, setCreateKind] = useCreateProjectKind()
  const [pendingDelete, setPendingDelete] = useState<ProjectRecord | null>(null)
  const sortMode: ProjectSortMode = isProjectsSortMode(configSort) ? configSort : "updated"
  const projects = useProjects({ sortMode, keyword, kind: activeKind })
  const { createProject, renameProject, deleteProject } = useProjectActions()

  const handleCreate = useCallback(
    async (name: string, k: ProjectKind) => {
      const result = await createProject(name, k).catch((e: unknown) => ({ errorMessage: e instanceof Error ? e.message : String(e), project: undefined, errorMessageKey: undefined }))
      if (!result.project) {
        dedupedToast.error(result.errorMessage ?? t(result.errorMessageKey ?? "project.create.failed"))
        return
      }
      setCreateKind(null)
      await navigate({ to: "/projects/$projectId", params: { projectId: result.project.id } })
    },
    [createProject, navigate, setCreateKind, t],
  )

  const handleRename = useCallback(
    (project: ProjectRecord, name: string) => {
      void renameProject(project, name)
        .then((result) => {
          if (result.safetyBlocked) dedupedToast.error(t("rename.safetyBlocked"))
          else if (result.errorCode === "project-name-conflict") dedupedToast.error(t("home.workspace.duplicateName"))
          else if (result.errorMessage || result.errorCode === "cloud-request-failed") dedupedToast.error(result.errorMessage ?? t("project.rename.failed"))
        })
        .catch(() => dedupedToast.error(t("project.rename.failed")))
    },
    [renameProject, t],
  )

  const handleConfirmDelete = useCallback(() => {
    const target = pendingDelete
    setPendingDelete(null)
    if (!target) return
    void deleteProject(target)
      .then((result) => {
        if (result.errorCode === "project-transfer-active") dedupedToast.warning(t("project.dissolve.transferActive"))
        else if (result.errorCode === "project-hide-failed") dedupedToast.error(t("project.dissolve.failed"))
      })
      .catch(() => dedupedToast.error(t("project.dissolve.failed")))
  }, [deleteProject, pendingDelete, t])

  const heroBtn = "h-9 gap-1.5 rounded-lg px-4 text-[13px] font-medium"

  return (
    <CatalogPage
      id="project-list"
      title={t("project.listTitle")}
      subtitle={t("project.heroDescription")}
      actions={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button className={heroBtn} data-action-ui-id="project-list.create-trigger" />}>
              <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
              {t("project.create.trigger")}
            </DropdownMenuTrigger>
            <CreateProjectMenuContent actionUiIdPrefix="project-list" onSelectKind={setCreateKind} align="start" side="bottom" sideOffset={4} />
          </DropdownMenu>
          {/* 教程链接指向参照的云端文档站，这边没有，保留按钮但不可点 */}
          <Button variant="outline" className={heroBtn} data-action-ui-id="project-list.tutorial-trigger" disabled>
            <BookOpen size={16} strokeWidth={1.5} aria-hidden="true" />
            <span className="max-w-48 truncate">{t("project.tutorial.trigger")}</span>
          </Button>
        </>
      }
    >
      <div className="flex min-w-0 flex-nowrap items-center gap-3 py-2" data-layout-slot="project-list-toolbar">
        <Tabs
          className="shrink-0"
          value={activeKind}
          onValueChange={(v) => {
            if (v === "local" || v === "team") void navigate({ ...projectListLocation(v), replace: true })
          }}
        >
          <TabsList variant="underline" aria-label={t("project.kindTabsAria")} data-action-ui-id="project-list.kind-tabs">
            {KIND_TABS.map((tab) => (
              <TabsTrigger key={tab.kind} variant="underline" value={tab.kind} className="gap-1.5" data-action-ui-id={`project-list.kind-tab-${tab.kind}`}>
                {t(tab.labelKey)}
                {tab.kind === "team" ? <CloudUpload size={14} strokeWidth={2.25} aria-hidden="true" /> : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div
          className="scrollbar-none flex min-w-0 flex-1 flex-nowrap items-center gap-3 overflow-x-auto overscroll-x-contain [&>*:first-child]:ml-auto"
          data-layout-slot="project-list-toolbar-actions"
        >
          <div className="w-60 min-w-36 max-w-60 flex-1 shrink" data-layout-slot="project-list-search-slot">
            <div className="relative flex h-9 w-60 max-w-full shrink-0 items-center" data-slot="page-search-input">
              <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-9 pr-9"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t("project.searchPlaceholder")}
                aria-label={t("project.searchPlaceholder")}
                data-action-ui-id="project-list.search"
              />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-transparent px-3 text-xs text-foreground transition-colors hover:border-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              data-action-ui-id="project-list.sort-trigger"
              aria-label={t("project.sortLabel")}
            >
              {t(`project.sort.${sortMode}`)}
              <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="min-w-40">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("project.sortLabel")}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sortMode}
                  aria-label={t("project.sortLabel")}
                  onValueChange={(v) => {
                    if (isProjectsSortMode(v)) updateConfig({ projectsSortMode: v })
                  }}
                >
                  {SORT_MODES.map((mode) => (
                    <DropdownMenuRadioItem key={mode} value={mode}>
                      {t(`project.sort.${mode}`)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div
        key={`project-tab-content-${activeKind}`}
        className="flex flex-1 flex-col motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200"
        data-layout-slot="project-tab-content"
      >
        {projects.length === 0 ? (
          <PageState
            className="mt-2"
            icon={<FolderOpen size={24} strokeWidth={1.5} />}
            text={keyword ? t("project.searchEmpty") : t(activeKind === "local" ? "project.listEmptyLocalTitle" : "project.listEmptyCloudTitle")}
            description={keyword ? t("project.searchEmptyDescription") : t(activeKind === "local" ? "project.listEmptyLocalDescription" : "project.listEmptyCloudDescription")}
          />
        ) : (
          <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={(project) => void navigate({ to: "/projects/$projectId", params: { projectId: project.id } })}
                onRename={handleRename}
                onRequestDelete={setPendingDelete}
              />
            ))}
          </div>
        )}
      </div>
      <CreateProjectDialog
        open={createKind !== null}
        kind={createKind ?? "local"}
        onConfirm={handleCreate}
        onOpenChange={(open) => {
          if (!open) setCreateKind(null)
        }}
      />
      <DissolveProjectDialog project={pendingDelete} onConfirm={handleConfirmDelete} onCancel={() => setPendingDelete(null)} />
    </CatalogPage>
  )
}

const PROJECT_COVER_TILE_LIMIT = 4

const PLACEHOLDER_GRADIENTS = [
  "from-[color-mix(in_oklab,var(--chart-1)_28%,transparent)] to-[color-mix(in_oklab,var(--chart-1)_8%,transparent)]",
  "from-[color-mix(in_oklab,var(--chart-2)_28%,transparent)] to-[color-mix(in_oklab,var(--chart-2)_8%,transparent)]",
  "from-[color-mix(in_oklab,var(--chart-3)_28%,transparent)] to-[color-mix(in_oklab,var(--chart-3)_8%,transparent)]",
  "from-[color-mix(in_oklab,var(--chart-4)_28%,transparent)] to-[color-mix(in_oklab,var(--chart-4)_8%,transparent)]",
  "from-[color-mix(in_oklab,var(--chart-5)_28%,transparent)] to-[color-mix(in_oklab,var(--chart-5)_8%,transparent)]",
]

/** 同一个项目每次都是同一种底色 */
export function stableGradient(seed: string): string {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) % 1000003
  return PLACEHOLDER_GRADIENTS[hash % PLACEHOLDER_GRADIENTS.length] ?? PLACEHOLDER_GRADIENTS[0]!
}

/** 封面：自定义封面优先，否则取前几个工作区各自的第一张缩略图拼起来 */
function ProjectCover({ project, className }: { project: ProjectRecord; className?: string }) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {project.coverImage ? (
        <img src={project.coverImage} alt="" draggable={false} className="h-full w-full object-cover" />
      ) : (
        <CoverCollage projectId={project.id} paths={project.workspacePaths.slice(0, PROJECT_COVER_TILE_LIMIT)} />
      )}
    </div>
  )
}

function CoverCollage({ projectId, paths }: { projectId: string; paths: string[] }) {
  // 固定 4 个槽位调用 hook，保证每次渲染 hook 数量一致
  const q0 = useWorkspaceThumbnails(paths[0] ?? "", Boolean(paths[0]))
  const q1 = useWorkspaceThumbnails(paths[1] ?? "", Boolean(paths[1]))
  const q2 = useWorkspaceThumbnails(paths[2] ?? "", Boolean(paths[2]))
  const q3 = useWorkspaceThumbnails(paths[3] ?? "", Boolean(paths[3]))
  const tiles = [q0, q1, q2, q3].flatMap((q) => (q.data?.[0] ? [q.data[0]] : []))
  if (tiles.length === 0) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br", stableGradient(projectId))} data-action-ui-id="project.cover-placeholder">
        <FolderOpen size={28} strokeWidth={1.2} className="text-foreground/25" />
      </div>
    )
  }
  if (tiles.length === 1) {
    return <img src={tiles[0]!.src} alt="" draggable={false} className="h-full w-full object-cover" />
  }
  return (
    <div className={cn("grid h-full w-full", tiles.length === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2")} data-action-ui-id="project.cover-collage">
      {tiles.map((tile, index) => (
        <div key={tile.src} className={cn("relative min-h-0 min-w-0 overflow-hidden", tiles.length === 3 && index === 0 && "row-span-2")}>
          <img src={tile.src} alt="" draggable={false} className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  )
}

// 文件夹造型的卡片：后层是倾斜的封面，前层是带标签页缺口的半透明夹片
const LAYER_BORDER = "border-[color:color-mix(in_srgb,var(--sidebar-foreground)_4%,transparent)] group-hover:border-[color:color-mix(in_srgb,var(--sidebar-foreground)_10%,transparent)]"
const FRONT_BG =
  "bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))_88%,transparent)] group-hover:bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_92%,var(--brand-accent))_88%,transparent)]"

function ProjectCard({
  project,
  onOpen,
  onRename,
  onRequestDelete,
}: {
  project: ProjectRecord
  onOpen: (project: ProjectRecord) => void
  onRename: (project: ProjectRecord, name: string) => void
  onRequestDelete: (project: ProjectRecord) => void
}) {
  const { t, i18n } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const renameAfterMenuCloseRef = useRef(false)
  // 菜单关掉后再进入改名，否则菜单的收尾焦点会立刻把输入框失焦提交
  const handleMenuOpenChange = useCallback((open: boolean) => {
    setMenuOpen(open)
    if (open || !renameAfterMenuCloseRef.current) return
    renameAfterMenuCloseRef.current = false
    window.setTimeout(() => setRenaming(true), 0)
  }, [])
  const updatedLabel = i18n.language.startsWith("zh")
    ? formatTimestampDot(project.updatedAt)
    : new Date(project.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  return (
    <div className="group relative w-full aspect-[4/3] min-w-0 overflow-visible text-left" data-project-id={project.id}>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-1 bottom-0 z-0 rounded-[24px] border ${LAYER_BORDER} bg-[color:color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[background-color,border-color,box-shadow] duration-200 group-hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_92%,var(--brand-accent))] group-hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)]`}
      />
      <ClickableArea onClick={() => onOpen(project)} className="relative z-10 flex h-full w-full cursor-pointer flex-col items-stretch text-left" data-action-ui-id="project-card">
        <div className="pointer-events-none absolute inset-x-5 top-4 h-[64%]">
          <div className="absolute inset-x-3 top-0 h-[88%] -rotate-3 rounded-[18px] bg-muted shadow-[0_3px_8px_rgba(0,0,0,0.10)]" />
          <div className="absolute -inset-x-0.5 top-3 h-[88%] rotate-2 overflow-hidden rounded-[18px] border border-border bg-card p-1 shadow-[0_4px_10px_rgba(0,0,0,0.14)]">
            <ProjectCover project={project} className="rounded-[12px] bg-card" />
          </div>
        </div>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-[40%] left-0 h-5 w-24 translate-y-px rounded-t-[32px] border border-b-0 ${LAYER_BORDER} ${FRONT_BG} backdrop-blur-[6px] transition-colors duration-200`}
        />
        <div
          className={`absolute inset-x-0 bottom-0 top-[calc(40%+20px)] flex min-h-0 flex-col justify-end overflow-hidden rounded-tr-[30px] rounded-b-[24px] border border-t-0 ${LAYER_BORDER} ${FRONT_BG} pr-12 pl-5 pt-8 pb-3 backdrop-blur-[6px] transition-colors duration-200`}
        >
          {project.kind === "team" ? (
            <Hint content={t("project.kind.team")} side="top">
              <span
                className="absolute left-5 top-3 flex size-5 items-center justify-center rounded-full bg-sidebar/70 text-sidebar-foreground/60 transition-colors group-hover:bg-sidebar/20 group-hover:text-sidebar-foreground"
                data-action-ui-id="project-card.team-badge"
              >
                <Users size={12} strokeWidth={1.5} aria-hidden="true" />
              </span>
            </Hint>
          ) : null}
          {renaming ? (
            <InlineRenameInput
              initialName={project.name}
              placeholder={t("project.create.namePlaceholder")}
              onConfirm={(name) => {
                onRename(project, name)
                setRenaming(false)
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <p
              className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-medium text-[color:color-mix(in_srgb,var(--sidebar-foreground)_68%,transparent)] transition-colors group-hover:text-[color:color-mix(in_srgb,var(--sidebar-accent-foreground)_76%,transparent)] dark:text-[color:color-mix(in_srgb,var(--sidebar-foreground)_92%,transparent)] dark:group-hover:text-[color:color-mix(in_srgb,var(--sidebar-accent-foreground)_98%,transparent)]"
              data-action-ui-id="project-card.name"
            >
              {project.name}
            </p>
          )}
          <p className="text-[11px] text-sidebar-foreground/60 transition-colors group-hover:text-sidebar-accent-foreground/70 dark:text-sidebar-foreground/80 dark:group-hover:text-sidebar-accent-foreground/90">
            {updatedLabel}
          </p>
        </div>
      </ClickableArea>
      <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
        <DropdownMenuTrigger
          aria-label={t("project.cardActions")}
          data-action-ui-id="project-card-more"
          className={`absolute right-3 bottom-3 z-20 flex size-7 items-center justify-center rounded-full border border-sidebar-border bg-sidebar/70 text-sidebar-foreground/70 transition-all duration-[80ms] hover:bg-sidebar hover:text-sidebar-foreground ${renaming ? "hidden" : menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          <DotsVerticalIcon size={14} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" sideOffset={2}>
          <DropdownMenuItem
            data-action-ui-id="project-card.rename"
            onClick={() => {
              renameAfterMenuCloseRef.current = true
              handleMenuOpenChange(false)
            }}
          >
            <Pencil size={14} strokeWidth={1.5} />
            {t("common.rename")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            data-action-ui-id="project-card.delete"
            onClick={() => {
              setMenuOpen(false)
              onRequestDelete(project)
            }}
          >
            <Trash2 size={14} strokeWidth={1.5} />
            {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
