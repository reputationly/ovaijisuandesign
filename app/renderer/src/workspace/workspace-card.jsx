// workspace-card.jsx
import { useWorkspaceThumbnails } from "./use-project-delete.js";
import { jsxRuntimeExports, SquareDashed, useTranslation, useNavigate, usePlatform, useStorage, reactExports, FolderX } from "../vendor.js";
import { folderNameFromPath, workspaceDisplayName, formatTimestampDot } from "../generation/use-model-catalog-scope-key.js";
import { useWorkspaceDisplayNameRename } from "./use-new-workspace-dialog.jsx";
import { useProjectStore, useWorkspaceProject, isWorkspacePathCaseInsensitivePlatform } from "./normalize-project-entries.js";
import { useProjectActions } from "../settings/use-project-actions.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { stageWorkspacePreview } from "./context-menu-content.jsx";
import { homeService, PencilIcon } from "./home-service.jsx";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { buildWorkspaceSearch } from "./use-deep-link-router.js";
import { persistRecentProjectDismissals, upsertRecentProjectDismissal, readRecentProjectDismissals, removeRecentProjectDismissal, removePinnedWorkspacePaths } from "../infra/split-pinned-inventory.js";
import { removeWorkspaceSessionTabs } from "../canvas/resolve-workspace-failure-diagnosis.js";
import { ClickableArea, InlineRenameInput } from "../infra/inline-rename-input.jsx";
import { DropdownMenu, MoreVerticalIcon } from "../vendor-inline/vscode-base/graph.jsx";
import { DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../infra/dialog-content.jsx";
import { AddToProjectSubMenu } from "./add-to-project-sub-menu.jsx";
import { Trash2 } from "../media-editing/package.jsx";
import { DeleteConfirmDialog } from "./move-workspace-dialog.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
function WorkspaceThumbnails({ workspacePath }) {
  const { data: thumbnails } = useWorkspaceThumbnails(workspacePath);
  if (!thumbnails || thumbnails.length === 0) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <SquareDashed
          size={26}
          strokeWidth={1.5}
          className="text-muted-foreground/30"
        />
      </div>
    );
  }
  return (
    <div className="w-full h-full bg-muted flex items-center justify-center gap-2 p-3">
      {thumbnails.map((item) => (
        <div
          key={item.src}
          className="flex-1 min-w-0 h-full overflow-hidden rounded-md"
        >
          <img
            src={item.src}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
}
function WorkspaceCard({
  workspace,
  unavailable = false,
  className,
  hideDelete = false,
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const platform = usePlatform();
  const [, , setRecentWorkspacesAsync] = useStorage("global.recentWorkspaces");
  const [, , setGlobalConfigAsync] = useStorage("global.config");
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const [renaming, setRenaming] = reactExports.useState(false);
  const [deleting, setDeleting] = reactExports.useState(false);
  const renameAfterMenuCloseRef = reactExports.useRef(false);
  const folderName = folderNameFromPath(workspace.path);
  const displayName = workspaceDisplayName(workspace);
  const hasCustomName = displayName !== folderName;
  const renameDisplayName = useWorkspaceDisplayNameRename(workspace.path);
  const { projects } = useProjectStore();
  const currentProject = useWorkspaceProject(workspace.path);
  const { addWorkspaceToProject, removeWorkspaceFromProject } =
    useProjectActions();
  const handleClick = reactExports.useCallback(() => {
    if (unavailable) {
      dedupedToast.error(t("home.workspaceUnavailable"));
      return;
    }
    void stageWorkspacePreview({
      hiloApp: homeService.hiloApp,
      folderPath: workspace.path,
      t,
      onStaged: (entry) => {
        trackEvent(TRACK_EVENTS.WORKSPACE_OPEN, {
          source: "card",
        });
        return navigate({
          to: "/workspace",
          search: buildWorkspaceSearch(entry.workspaceId),
        });
      },
    }).catch(() => {});
  }, [navigate, unavailable, workspace.path, t]);
  const handleRenameConfirm = reactExports.useCallback(
    (newName) => {
      renameDisplayName(newName);
      setRenaming(false);
    },
    [renameDisplayName],
  );
  const handleDeleteConfirm = reactExports.useCallback(() => {
    const dismissal = {
      paths: [workspace.path],
      recentOpenedAt: workspace.openedAt,
    };
    persistRecentProjectDismissals(
      upsertRecentProjectDismissal(readRecentProjectDismissals(), dismissal),
    );
    void setRecentWorkspacesAsync((previous) =>
      previous.filter((entry) => entry.path !== workspace.path),
    )
      .then((persisted) => {
        if (persisted) {
          void removeWorkspaceSessionTabs(
            workspace.path,
            () => platform.storage,
          );
          return;
        }
        persistRecentProjectDismissals(
          removeRecentProjectDismissal(
            readRecentProjectDismissals(),
            dismissal,
          ),
        );
      })
      .catch(() => {
        persistRecentProjectDismissals(
          removeRecentProjectDismissal(
            readRecentProjectDismissals(),
            dismissal,
          ),
        );
      });
    const caseInsensitive = isWorkspacePathCaseInsensitivePlatform(
      platform.app.os,
    );
    void setGlobalConfigAsync((previous) => {
      const current = previous.pinnedWorkspacePaths ?? [];
      const next = removePinnedWorkspacePaths(
        current,
        [workspace.path],
        caseInsensitive,
      );
      return next.length === current.length
        ? previous
        : {
            ...previous,
            pinnedWorkspacePaths: next,
          };
    });
    setDeleting(false);
  }, [
    platform.app.os,
    platform.storage,
    setGlobalConfigAsync,
    setRecentWorkspacesAsync,
    workspace.openedAt,
    workspace.path,
  ]);
  const handleMenuOpenChange = reactExports.useCallback((open) => {
    setMenuOpen(open);
    if (open || !renameAfterMenuCloseRef.current) return;
    renameAfterMenuCloseRef.current = false;
    window.setTimeout(() => setRenaming(true), 0);
  }, []);
  return (
    <>
      <div
        className={`group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors duration-[80ms] hover:border-foreground/40 ${unavailable ? "opacity-50" : ""} ${className ?? ""}`}
      >
        <ClickableArea
          onClick={handleClick}
          className="flex w-full cursor-pointer flex-col items-stretch text-left"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-border bg-muted">
            {workspace.coverImage ? (
              <img
                src={workspace.coverImage}
                alt={displayName}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            ) : (
              <WorkspaceThumbnails workspacePath={workspace.path} />
            )}
            {unavailable && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <span className="text-[12px] text-muted-foreground px-2 text-center">
                  {t("home.workspaceUnavailable")}
                </span>
              </div>
            )}
          </div>
          <div className="flex w-full flex-col gap-1 p-3 pr-9">
            {renaming ? (
              <InlineRenameInput
                initialName={displayName}
                placeholder={t("home.workspace.displayNamePlaceholder")}
                onConfirm={handleRenameConfirm}
                onCancel={() => setRenaming(false)}
              />
            ) : (
              <p
                title={hasCustomName ? folderName : void 0}
                className="text-[14px] font-medium text-foreground overflow-hidden text-ellipsis whitespace-nowrap"
              >
                {displayName}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {workspace.openedAt <= 0
                ? " "
                : i18n.language.startsWith("zh")
                  ? formatTimestampDot(workspace.openedAt)
                  : new Date(workspace.openedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
            </p>
          </div>
        </ClickableArea>
        <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
          <DropdownMenuTrigger
            className={`absolute bottom-2 right-2 flex size-6 items-center justify-center rounded-sm border border-border bg-background text-foreground/60 transition-all duration-[80ms] hover:border-foreground/40 hover:text-foreground ${renaming ? "hidden" : menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            <MoreVerticalIcon size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={2}>
            <DropdownMenuItem
              onClick={() => {
                renameAfterMenuCloseRef.current = true;
                handleMenuOpenChange(false);
              }}
            >
              <PencilIcon size={14} strokeWidth={1.5} />
              {t("common.rename")}
            </DropdownMenuItem>
            <AddToProjectSubMenu
              projects={projects}
              currentProjectId={currentProject?.id}
              onSelect={(projectId) => {
                setMenuOpen(false);
                void addWorkspaceToProject(
                  workspace.path,
                  projectId,
                  "workspace-card-menu",
                );
              }}
            />
            {currentProject ? (
              <DropdownMenuItem
                onClick={() => {
                  setMenuOpen(false);
                  void removeWorkspaceFromProject(
                    workspace.path,
                    "workspace-card-menu",
                  );
                }}
                data-action-ui-id="workspace-card.remove-from-project"
              >
                <FolderX size={14} strokeWidth={1.5} />
                {t("project.removeFromProject")}
              </DropdownMenuItem>
            ) : null}
            {hideDelete ? null : (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  setMenuOpen(false);
                  setDeleting(true);
                }}
              >
                <Trash2 size={14} strokeWidth={1.5} />
                {t("common.delete")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {hideDelete ? null : (
        <DeleteConfirmDialog
          open={deleting}
          name={displayName}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleting(false)}
        />
      )}
    </>
  );
}
export { WorkspaceCard };
