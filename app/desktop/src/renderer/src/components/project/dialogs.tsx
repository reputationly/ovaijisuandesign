import { BadgeInfo, ChevronDown, Folder, FolderOpen, Plus, Users, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import type { ProjectRecord } from "../../ipc"
import { useGlobalConfig } from "../../stores/global-config"
import { PROJECT_NAME_MAX_CHARS, truncateProjectName, useProjectActions, useProjects, type ProjectKind } from "../../stores/projects"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { Input, Switch } from "../ui/form"
import { dedupedToast } from "../ui/sonner"
import { Hint } from "../ui/tooltip"

export function CreateProjectDialog({
  open,
  kind,
  onConfirm,
  onOpenChange,
}: {
  open: boolean
  kind: ProjectKind
  onConfirm: (name: string, kind: ProjectKind) => Promise<void> | void
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [pending, setPending] = useState(false)
  const composingRef = useRef(false)
  const trimmed = truncateProjectName(name)

  useEffect(() => {
    if (open) return
    setName("")
    setPending(false)
  }, [open])

  const handleConfirm = useCallback(async () => {
    if (!trimmed || pending) return
    setPending(true)
    try {
      await onConfirm(trimmed, kind)
    } finally {
      setPending(false)
    }
  }, [kind, onConfirm, pending, trimmed])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-action-ui-id="create-project-dialog">
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">{kind === "team" ? t("project.create.teamTitle") : t("project.create.localTitle")}</DialogTitle>
          <DialogDescription className="sr-only">{kind === "team" ? t("project.create.teamDescription") : t("project.create.localDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <label htmlFor="create-project-name" className="text-xs font-medium">
            {t("project.create.nameLabel")}
          </label>
          <Input
            id="create-project-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onCompositionStart={() => {
              composingRef.current = true
            }}
            onCompositionEnd={() => {
              composingRef.current = false
            }}
            onKeyDown={(event) => {
              if (composingRef.current || event.nativeEvent.isComposing) return
              if (event.key !== "Enter") return
              event.preventDefault()
              void handleConfirm()
            }}
            aria-label={t("project.create.nameLabel")}
            placeholder={t("project.create.namePlaceholder")}
            autoComplete="off"
            maxLength={PROJECT_NAME_MAX_CHARS}
            data-action-ui-id="create-project-name-input"
          />
        </div>
        <div className="flex items-start gap-2.5 rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
          <BadgeInfo className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          <p>{kind === "team" ? t("project.create.teamDescription") : t("project.create.localDescription")}</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={!trimmed || pending} data-action-ui-id="create-project-submit">
            {t("project.create.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 新建项目的「本地 / 团队」二选一菜单；各入口共用，团队项目这边是桩（选了会提示不可用） */
export function CreateProjectMenuContent({
  actionUiIdPrefix,
  onSelectKind,
  align = "end",
  side = "bottom",
  sideOffset = 4,
}: {
  actionUiIdPrefix: string
  onSelectKind: (kind: ProjectKind) => void
  align?: "start" | "center" | "end"
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
}) {
  const { t } = useTranslation()
  return (
    <DropdownMenuContent align={align} side={side} sideOffset={sideOffset} className="min-w-52">
      <DropdownMenuItem onClick={() => onSelectKind("local")} data-action-ui-id={`${actionUiIdPrefix}.create-local`}>
        <FolderOpen className="size-4" aria-hidden="true" />
        {t("project.create.local")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onSelectKind("team")} data-action-ui-id={`${actionUiIdPrefix}.create-team`}>
        <Users size={14} strokeWidth={1.5} />
        {t("project.create.team")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}

/** 团队项目依赖云端，这里不弹对话框，直接提示 */
export function useCreateProjectKind(): [ProjectKind | null, (kind: ProjectKind | null) => void] {
  const { t } = useTranslation()
  const [kind, setKind] = useState<ProjectKind | null>(null)
  const select = useCallback(
    (next: ProjectKind | null) => {
      if (next === "team") {
        dedupedToast.info(t("ov.project.teamUnavailable"))
        return
      }
      setKind(next)
    },
    [t],
  )
  return [kind, select]
}

/** 解散（删除）项目的确认 */
export function DissolveProjectDialog({ project, onConfirm, onCancel }: { project: ProjectRecord | null; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation()
  return (
    <Dialog open={Boolean(project)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent size="sm" showCloseButton={false} data-action-ui-id="project.dissolve-dialog">
        <DialogHeader>
          <DialogTitle>{t("project.dissolve.title")}</DialogTitle>
          <DialogDescription>{t("project.dissolve.description", { name: project?.name ?? "" })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} data-action-ui-id="project.dissolve-confirm">
            {t("project.dissolve.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProjectSelectRow({
  projects,
  selectedProjectId,
  onChange,
  className,
}: {
  projects: ProjectRecord[]
  selectedProjectId?: string
  onChange: (projectId: string | undefined) => void
  className?: string
}) {
  const { t } = useTranslation()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const selected = projects.find((project) => project.id === selectedProjectId)
  const { createProject } = useProjectActions()
  const handleCreateProject = useCallback(
    async (name: string, kind: ProjectKind) => {
      const result = await createProject(name, kind)
      if (!result.project) {
        dedupedToast.error(result.errorMessage ?? t(result.errorMessageKey ?? "project.create.failed"))
        return
      }
      onChange(result.project.id)
      setCreateDialogOpen(false)
    },
    [createProject, onChange, t],
  )
  return (
    <div className={`flex min-h-10 w-full min-w-0 items-center gap-3 px-3 py-2 text-left ${className ?? ""}`} data-action-ui-id="new-workspace-project-row">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <Folder className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        <span className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden">
          <Hint content={t("project.selectRow.hint")}>
            <span className="max-w-[82px] shrink cursor-help truncate text-body-14 text-muted-foreground">{t("project.selectRow.label")}</span>
          </Hint>
          <span className="min-w-0 flex-1 truncate whitespace-nowrap text-body-14 text-muted-foreground">{selected?.name ?? t("project.selectRow.none")}</span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex shrink-0 items-center gap-0.5 rounded-sm px-1.5 py-1 text-body-14 font-medium whitespace-nowrap text-brand-accent transition-colors hover:bg-brand-accent/10"
            data-action-ui-id="new-workspace-project-pick"
          >
            {selected ? t("project.selectRow.change") : t("project.selectRow.pick")}
            <ChevronDown size={13} strokeWidth={1.5} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" alignOffset={-2} side="bottom" sideOffset={4} className="min-w-44 max-w-72 text-[13px] font-normal text-foreground/70">
            <DropdownMenuItem data-action-ui-id="new-workspace-project-create" onClick={() => setCreateDialogOpen(true)} className="text-[13px] font-normal text-foreground/70">
              <Plus size={16} strokeWidth={1.5} />
              <span>{t("project.create.trigger")}</span>
            </DropdownMenuItem>
            {projects.length === 0 ? (
              <p className="px-2.5 py-1.5 whitespace-nowrap text-foreground/70">{t("project.noProjects")}</p>
            ) : (
              <>
                <DropdownMenuSeparator />
                <div className="max-h-56 overflow-y-auto">
                  {projects.map((project) => (
                    <DropdownMenuItem key={project.id} onClick={() => onChange(project.id)} className="text-[13px] font-normal text-foreground/70">
                      {project.kind === "team" ? <Users size={14} strokeWidth={1.5} /> : <Folder size={14} strokeWidth={1.5} />}
                      <span className="min-w-0 flex-1 truncate">{project.name}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
              </>
            )}
            {selected ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onChange(undefined)} className="text-[13px] font-normal text-foreground/70">
                  {t("project.selectRow.clear")}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        {selected ? (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            aria-label={t("common.clear")}
            data-action-ui-id="new-workspace-project-clear"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        ) : null}
      </div>
      <CreateProjectDialog open={createDialogOpen} kind="local" onConfirm={handleCreateProject} onOpenChange={setCreateDialogOpen} />
    </div>
  )
}

export interface NewWorkspaceConfirmOptions {
  loadUserMemory: boolean
  folderPath?: string
  projectId?: string
  allowDataDirectoryFallback?: boolean
}

export type NewWorkspaceConfirm = (name: string, options: NewWorkspaceConfirmOptions) => unknown

/**
 * 新建项目（工作区）弹窗：名字、归属项目、是否加载用户记忆。
 * 参照版本这里的「保存位置」行已下线，项目行直接贴在输入框下面；
 * 数据目录不可用时的临时回退开关依赖数据目录服务，这边还是桩，不显示。
 */
export function NewWorkspaceDialog({
  open,
  onOpenChange,
  onConfirm,
  defaultProjectId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: NewWorkspaceConfirm
  defaultProjectId?: string
}) {
  const { t } = useTranslation()
  const rememberedMemory = useGlobalConfig((s) => s.config.newProjectPrefs?.loadUserMemory === true)
  const updateConfig = useGlobalConfig((s) => s.update)
  const [name, setName] = useState("")
  const [loadUserMemory, setLoadUserMemory] = useState(rememberedMemory)
  const [projectId, setProjectId] = useState<string | undefined>(defaultProjectId)
  const projects = useProjects({ sortMode: "updated" })
  const composingRef = useRef(false)
  const trimmed = truncateProjectName(name)

  const handleLoadUserMemoryChange = useCallback(
    (next: boolean) => {
      setLoadUserMemory(next)
      updateConfig({ newProjectPrefs: { loadUserMemory: next } })
    },
    [updateConfig],
  )

  const reset = useCallback(() => {
    setName("")
    setLoadUserMemory(rememberedMemory)
    setProjectId(defaultProjectId)
  }, [defaultProjectId, rememberedMemory])

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    setLoadUserMemory(rememberedMemory)
  }, [open, reset, rememberedMemory])

  useEffect(() => {
    if (open) setProjectId(defaultProjectId)
  }, [open, defaultProjectId])

  const handleConfirm = useCallback(() => {
    if (!trimmed) return
    onConfirm(trimmed, { loadUserMemory, projectId })
    reset()
    onOpenChange(false)
  }, [trimmed, loadUserMemory, projectId, onConfirm, onOpenChange, reset])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) reset()
      onOpenChange(nextOpen)
    },
    [onOpenChange, reset],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="md"
        overlayClassName="new-workspace-modal-overlay"
        className="new-workspace-dialog flex max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:!max-w-[528px]"
        data-action-ui-id="new-workspace-dialog"
      >
        <div className="min-h-0 min-w-0 overflow-y-auto px-4 pt-4 pb-3 sm:px-5 sm:pt-5" data-action-ui-id="new-workspace-dialog-body">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-body-14 leading-5 font-medium tracking-normal">{t("topbar.newProject.title")}</DialogTitle>
            <DialogDescription className="sr-only">{t("topbar.newProject.description")}</DialogDescription>
          </DialogHeader>
          <div className="relative min-w-0 overflow-visible" data-action-ui-id="new-workspace-fields">
            <Input
              id="new-workspace-name"
              data-action-ui-id="new-workspace-name-input"
              className="new-workspace-name-input relative z-2 h-12 rounded-lg px-3 text-body-15 font-normal tracking-normal"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onCompositionStart={() => {
                composingRef.current = true
              }}
              onCompositionEnd={() => {
                composingRef.current = false
              }}
              onKeyDown={(e) => {
                if (composingRef.current || e.nativeEvent.isComposing) return
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleConfirm()
                }
              }}
              aria-label={t("topbar.newProject.placeholder")}
              placeholder={t("topbar.newProject.placeholder")}
              autoComplete="off"
              maxLength={PROJECT_NAME_MAX_CHARS}
            />
            <ProjectSelectRow
              className="new-workspace-project-picker relative z-1 overflow-hidden rounded-b-lg new-workspace-project-picker--tucked"
              projects={projects}
              selectedProjectId={projectId}
              onChange={setProjectId}
            />
          </div>
          <section className="mt-5 border-t border-border-soft pt-3">
            <h3 className="mb-2 text-body-14 leading-5 font-normal text-muted-foreground">{t("topbar.newProject.settingsTitle")}</h3>
            <div className="grid grid-cols-1 gap-1">
              <div className="flex min-h-12 items-center gap-3 px-1 py-1" data-action-ui-id="new-workspace-load-user-memory-row">
                <div className="min-w-0 flex-1">
                  <div className="text-body-14 leading-5 font-normal">{t("topbar.newProject.loadUserMemory.label")}</div>
                  <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{t("topbar.newProject.loadUserMemory.description")}</p>
                </div>
                <Switch
                  checked={loadUserMemory}
                  onCheckedChange={handleLoadUserMemoryChange}
                  aria-label={t("topbar.newProject.loadUserMemory.label")}
                  data-action-ui-id="new-workspace-load-user-memory-toggle"
                />
              </div>
            </div>
          </section>
        </div>
        <DialogFooter className="shrink-0 flex-row justify-end gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
          <Button variant="secondary" onClick={() => handleOpenChange(false)} className="new-workspace-action-button min-w-20 font-medium">
            {t("common.cancel")}
          </Button>
          <Button data-action-ui-id="new-workspace-confirm" disabled={!trimmed} onClick={handleConfirm} className="new-workspace-action-button min-w-22 font-medium">
            {t("topbar.newProject.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
