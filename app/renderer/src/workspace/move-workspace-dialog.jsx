// move-workspace-dialog.jsx
import {
  pinnedWorkspaceAliases,
  recentProjectDismissalListeners,
  removePinnedWorkspacePaths,
} from "../infra/split-pinned-inventory.js";
import { workspaceInventoryPathKey } from "./normalize-project-entries.js";
import { MonochromeIcon, Trans, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Folder } from "../media-editing/package.jsx";
import {
  AlertDialog,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  DialogDescription,
  DialogTitle,
} from "../infra/badge-variants.jsx";
import {
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { PanelVisibilityIcon } from "./home-service.jsx";
import { useGlobalSidebar } from "../media-editing/derive-session-task-snapshot.jsx";
export const OPEN_GLOBAL_SEARCH_EVENT = "hilo:open-global-search";
export function MoveWorkspaceDialog({
  move,
  submitting,
  error,
  onCancel,
  onConfirm,
}) {
  const { t: t2 } = useTranslation();
  return (
    <Dialog
      open={move !== null}
      onOpenChange={(open) => !open && !submitting && onCancel()}
    >
      <DialogContent
        size="sm"
        showCloseButton={!submitting}
        overlayClassName="creation-dialog-overlay"
        className="gap-4 p-5"
        data-action-ui-id="sidebar.move-confirm-dialog"
      >
        <DialogHeader className="min-w-0 pr-8">
          <DialogTitle className="flex min-w-0 whitespace-nowrap text-sm font-medium leading-5">
            <Trans
              t={t2}
              i18nKey="project.move.title"
              components={{
                name: (
                  <span
                    className="min-w-0 truncate"
                    title={move?.workspaceName}
                    data-action-ui-id="sidebar.move-title-name"
                  >
                    {move?.workspaceName}
                  </span>
                ),
              }}
            />
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm text-muted-foreground">
          <DialogDescription
            className="flex min-w-0 items-start gap-2 text-sm font-normal leading-5"
            data-action-ui-id="sidebar.move-target"
          >
            <span className="shrink-0">{t2("project.move.description")} </span>
            <span className="flex min-w-0 items-start gap-1">
              <Folder
                className="mt-0.5 size-4 shrink-0"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="min-w-0 break-words font-medium">
                {move?.targetName}
              </span>
            </span>
          </DialogDescription>
          {move?.switchToManual && (
            <p className="text-xs" data-action-ui-id="sidebar.move-sort-notice">
              {t2("project.move.manualNotice")}
            </p>
          )}
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="flex-row justify-end gap-2">
          <Button
            variant="secondary"
            disabled={submitting}
            onClick={onCancel}
            className="creation-dialog-action-button min-w-20 font-normal"
            data-action-ui-id="sidebar.move-cancel"
          >
            {t2("common.cancel")}
          </Button>
          <Button
            disabled={submitting}
            onClick={onConfirm}
            className="creation-dialog-action-button min-w-20 font-normal"
            data-action-ui-id="sidebar.move-confirm"
          >
            {t2(
              submitting ? "project.move.submitting" : "project.move.continue",
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function pinnedWorkspaceKeySet(pinnedPaths, caseInsensitive) {
  return new Set(
    pinnedPaths.map((path2) =>
      workspaceInventoryPathKey(path2, caseInsensitive),
    ),
  );
}
export function isInventoryItemPinned(item, pinnedKeys, caseInsensitive) {
  if (pinnedKeys.size === 0) return false;
  return pinnedWorkspaceAliases(item).some((path2) =>
    pinnedKeys.has(workspaceInventoryPathKey(path2, caseInsensitive)),
  );
}
export function togglePinnedWorkspacePath(pinnedPaths, item, caseInsensitive) {
  const without = removePinnedWorkspacePaths(
    pinnedPaths,
    pinnedWorkspaceAliases(item),
    caseInsensitive,
  );
  if (without.length !== pinnedPaths.length) return without;
  return [item.workspace.path, ...without];
}
export function isProjectPinned(projectId, pinnedProjectIds) {
  return pinnedProjectIds.includes(projectId);
}
export function togglePinnedProjectId(pinnedProjectIds, projectId) {
  const without = pinnedProjectIds.filter((id2) => id2 !== projectId);
  if (without.length !== pinnedProjectIds.length) return without;
  return [projectId, ...without];
}
export function splitPinnedProjects(projects, pinnedProjectIds) {
  if (pinnedProjectIds.length === 0)
    return {
      pinned: [],
      unpinned: [...projects],
    };
  const pinnedSet = new Set(pinnedProjectIds);
  const projectById = new Map(projects.map((p3) => [p3.id, p3]));
  const pinned = [];
  for (const id2 of pinnedProjectIds) {
    const project2 = projectById.get(id2);
    if (project2) pinned.push(project2);
  }
  const unpinned = projects.filter((p3) => !pinnedSet.has(p3.id));
  return {
    pinned,
    unpinned,
  };
}
export function reorderPinnedProjectIds(
  pinnedProjectIds,
  sourceId,
  targetId,
  dropPosition,
) {
  if (sourceId === targetId) return [...pinnedProjectIds];
  const fromIndex = pinnedProjectIds.indexOf(sourceId);
  if (fromIndex === -1 || !pinnedProjectIds.includes(targetId))
    return [...pinnedProjectIds];
  const without = pinnedProjectIds.filter((id2) => id2 !== sourceId);
  const targetIndex = without.indexOf(targetId);
  without.splice(targetIndex + (dropPosition === "after" ? 1 : 0), 0, sourceId);
  return without;
}
export function reorderPinnedWorkspacePaths(
  pinnedPaths,
  visiblePinned,
  sourcePath,
  targetPath,
  dropPosition,
  caseInsensitive,
) {
  const key2 = (path2) => workspaceInventoryPathKey(path2, caseInsensitive);
  const ordered = [...visiblePinned];
  const fromIndex = ordered.findIndex(
    (item) => key2(item.workspace.path) === key2(sourcePath),
  );
  const toIndex = ordered.findIndex(
    (item) => key2(item.workspace.path) === key2(targetPath),
  );
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex)
    return [...pinnedPaths];
  const [moved] = ordered.splice(fromIndex, 1);
  if (!moved) return [...pinnedPaths];
  const targetIndex = ordered.findIndex(
    (item) => key2(item.workspace.path) === key2(targetPath),
  );
  ordered.splice(targetIndex + (dropPosition === "after" ? 1 : 0), 0, moved);
  const visibleAliasKeys = new Set(
    ordered.flatMap((item) =>
      pinnedWorkspaceAliases(item).map((alias) => key2(alias)),
    ),
  );
  const tail = pinnedPaths.filter(
    (path2) => !visibleAliasKeys.has(key2(path2)),
  );
  return [...ordered.map((item) => item.workspace.path), ...tail];
}
export function subscribeRecentProjectDismissals(listener) {
  recentProjectDismissalListeners.add(listener);
  return () => recentProjectDismissalListeners.delete(listener);
}
const SIDEBAR_COLLAPSE_STORAGE_KEY = "hilo.home.sidebar-collapse.v1";
const SIDEBAR_COLLAPSE_VERSION = 1;
const MAX_COLLAPSED_GROUP_KEYS = 200;
const FALLBACK_STATE = {
  collapsedGroupKeys: [],
  projectsSectionCollapsed: false,
};
export function readSidebarCollapseState() {
  try {
    const raw2 = window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY);
    if (!raw2)
      return {
        ...FALLBACK_STATE,
      };
    const parsed = JSON.parse(raw2);
    if (parsed.version !== SIDEBAR_COLLAPSE_VERSION)
      return {
        ...FALLBACK_STATE,
      };
    return {
      collapsedGroupKeys: Array.isArray(parsed.collapsedGroupKeys)
        ? parsed.collapsedGroupKeys
            .filter((key2) => typeof key2 === "string" && key2.length > 0)
            .slice(-MAX_COLLAPSED_GROUP_KEYS)
        : [],
      projectsSectionCollapsed: parsed.projectsSectionCollapsed === true,
    };
  } catch {
    return {
      ...FALLBACK_STATE,
    };
  }
}
export function persistSidebarCollapseState(state2) {
  const value = {
    version: SIDEBAR_COLLAPSE_VERSION,
    collapsedGroupKeys: state2.collapsedGroupKeys.slice(
      -MAX_COLLAPSED_GROUP_KEYS,
    ),
    projectsSectionCollapsed: state2.projectsSectionCollapsed,
  };
  try {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSE_STORAGE_KEY,
      JSON.stringify(value),
    );
  } catch {}
}
export function GlobalSidebarToggle() {
  const { t: t2 } = useTranslation();
  const { collapsed, togglePinned } = useGlobalSidebar();
  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    togglePinned();
  };
  const handleClick2 = (event) => {
    if (event.detail !== 0) return;
    togglePinned();
  };
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={t2("topbar.toggleGlobalSidebar", {
              defaultValue: "一级侧栏",
            })}
            aria-pressed={!collapsed}
            onPointerDown={handlePointerDown}
            onClick={handleClick2}
            className="icon-sidebar-action-control no-drag relative z-50 flex size-8 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
            data-action-ui-id="topbar.toggle-global-sidebar"
          />
        }
      >
        <MonochromeIcon tone="control">
          <PanelVisibilityIcon
            className="pointer-events-none"
            active={!collapsed}
            side="left"
          />
        </MonochromeIcon>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {t2("topbar.toggleGlobalSidebar", {
          defaultValue: "一级侧栏",
        })}
      </TooltipContent>
    </Tooltip>
  );
}
export function DeleteConfirmDialog({
  open,
  name: name2,
  onConfirm,
  onCancel,
}) {
  const { t: t2 } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={(v2) => !v2 && onCancel()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t2("home.deleteProject")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t2("home.deleteProjectConfirm", {
              workspace_name: name2,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t2("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {t2("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
