import { useNavigate } from "@tanstack/react-router"
import { FolderX, Pencil, SquareDashed } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { useWorkspaceThumbnails } from "../../api/app-gateway"
import { DotsVerticalIcon } from "../../shell/icons"
import { buildWorkspaceSearch, useHiloApp } from "../../shell/topbar"
import { stageWorkspacePreview } from "../../shell/workspace-open"
import { useProjectActions, useProjectStore, useWorkspaceProject } from "../../stores/projects"
import { useWorkspaceDisplayNameRename } from "../../stores/recent-workspaces"
import { folderNameFromPath, formatTimestampDot, workspaceDisplayName, type RecentWorkspace } from "../../stores/workspace-inventory"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { dedupedToast } from "../ui/sonner"
import { AddToProjectSubMenu, ClickableArea, InlineRenameInput } from "./controls"

function WorkspaceThumbnails({ workspacePath }: { workspacePath: string }) {
  const { data: thumbnails } = useWorkspaceThumbnails(workspacePath)
  if (!thumbnails || thumbnails.length === 0) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <SquareDashed size={26} strokeWidth={1.5} className="text-muted-foreground/30" />
      </div>
    )
  }
  return (
    <div className="w-full h-full bg-muted flex items-center justify-center gap-2 p-3">
      {thumbnails.map((item) => (
        <div key={item.src} className="flex-1 min-w-0 h-full overflow-hidden rounded-md">
          <img src={item.src} alt={item.name} className="h-full w-full object-cover" draggable={false} />
        </div>
      ))}
    </div>
  )
}

/** 创作（工作区）卡片：点开走「登记标签 → 跳转」，菜单里改显示名、挪项目 */
export function WorkspaceCard({ workspace, unavailable = false, className }: { workspace: RecentWorkspace; unavailable?: boolean; className?: string }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const hiloApp = useHiloApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const renameAfterMenuCloseRef = useRef(false)
  const folderName = folderNameFromPath(workspace.path)
  const displayName = workspaceDisplayName(workspace)
  const hasCustomName = displayName !== folderName
  const renameDisplayName = useWorkspaceDisplayNameRename(workspace.path)
  const { projects } = useProjectStore()
  const currentProject = useWorkspaceProject(workspace.path)
  const { addWorkspaceToProject, removeWorkspaceFromProject } = useProjectActions()

  const handleClick = useCallback(() => {
    if (unavailable) {
      dedupedToast.error(t("home.workspaceUnavailable"))
      return
    }
    void stageWorkspacePreview({
      hiloApp,
      folderPath: workspace.path,
      t,
      onStaged: (entry) => navigate({ to: "/workspace", search: buildWorkspaceSearch(entry.workspaceId) }),
    }).catch(() => {})
  }, [hiloApp, navigate, unavailable, workspace.path, t])

  // 菜单关掉后再进入改名，否则菜单的收尾焦点会立刻把输入框失焦提交
  const handleMenuOpenChange = useCallback((open: boolean) => {
    setMenuOpen(open)
    if (open || !renameAfterMenuCloseRef.current) return
    renameAfterMenuCloseRef.current = false
    window.setTimeout(() => setRenaming(true), 0)
  }, [])

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors duration-[80ms] hover:border-foreground/40 ${unavailable ? "opacity-50" : ""} ${className ?? ""}`}
      data-action-ui-id="workspace-card"
    >
      <ClickableArea onClick={handleClick} className="flex w-full cursor-pointer flex-col items-stretch text-left">
        <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-border bg-muted">
          {workspace.coverImage ? (
            <img src={workspace.coverImage} alt={displayName} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
          ) : (
            <WorkspaceThumbnails workspacePath={workspace.path} />
          )}
          {unavailable ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <span className="text-[12px] text-muted-foreground px-2 text-center">{t("home.workspaceUnavailable")}</span>
            </div>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-1 p-3 pr-9">
          {renaming ? (
            <InlineRenameInput
              initialName={displayName}
              placeholder={t("home.workspace.displayNamePlaceholder")}
              onConfirm={(name) => {
                renameDisplayName(name)
                setRenaming(false)
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <p title={hasCustomName ? folderName : undefined} className="text-[14px] font-medium text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
              {displayName}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            {workspace.openedAt <= 0
              ? " "
              : i18n.language.startsWith("zh")
                ? formatTimestampDot(workspace.openedAt)
                : new Date(workspace.openedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </ClickableArea>
      <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
        <DropdownMenuTrigger
          className={`absolute bottom-2 right-2 flex size-6 items-center justify-center rounded-sm border border-border bg-background text-foreground/60 transition-all duration-[80ms] hover:border-foreground/40 hover:text-foreground ${renaming ? "hidden" : menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          aria-label={t("homeSidebar.recentProjectActions")}
          data-action-ui-id="workspace-card-more"
        >
          <DotsVerticalIcon size={14} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" sideOffset={2}>
          <DropdownMenuItem
            onClick={() => {
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
              void addWorkspaceToProject(workspace.path, projectId, "workspace-card-menu")
            }}
          />
          {currentProject ? (
            <DropdownMenuItem
              onClick={() => {
                setMenuOpen(false)
                void removeWorkspaceFromProject(workspace.path, "workspace-card-menu")
              }}
              data-action-ui-id="workspace-card.remove-from-project"
            >
              <FolderX size={14} strokeWidth={1.5} />
              {t("project.removeFromProject")}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
