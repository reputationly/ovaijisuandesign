// move-workspace-dialog.jsx
import {
  pinnedWorkspaceAliases,
  recentProjectDismissalListeners,
  removePinnedWorkspacePaths,
} from "../infra/split-pinned-inventory.js";
import { workspaceInventoryPathKey } from "./normalize-project-entries.js";
import { Trans } from "react-i18next";
import { useTranslation } from "react-i18next";
import { MonochromeIcon } from "../media-editing/icon-compositing.js";
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
  const { t: translate } = useTranslation();
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
              t={translate}
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
            <span className="shrink-0">{translate("project.move.description")} </span>
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
              {translate("project.move.manualNotice")}
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
            {translate("common.cancel")}
          </Button>
          <Button
            disabled={submitting}
            onClick={onConfirm}
            className="creation-dialog-action-button min-w-20 font-normal"
            data-action-ui-id="sidebar.move-confirm"
          >
            {translate(
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
    pinnedPaths.map((path) =>
      workspaceInventoryPathKey(path, caseInsensitive),
    ),
  );
}
export function isInventoryItemPinned(item, pinnedKeys, caseInsensitive) {
  if (pinnedKeys.size === 0) return false;
  return pinnedWorkspaceAliases(item).some((path) =>
    pinnedKeys.has(workspaceInventoryPathKey(path, caseInsensitive)),
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
  const without = pinnedProjectIds.filter((id) => id !== projectId);
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
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const pinned = [];
  for (const id of pinnedProjectIds) {
    const project = projectById.get(id);
    if (project) pinned.push(project);
  }
  const unpinned = projects.filter((project) => !pinnedSet.has(project.id));
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
  const without = pinnedProjectIds.filter((id) => id !== sourceId);
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
  const key = (path) => workspaceInventoryPathKey(path, caseInsensitive);
  const ordered = [...visiblePinned];
  const fromIndex = ordered.findIndex(
    (item) => key(item.workspace.path) === key(sourcePath),
  );
  const toIndex = ordered.findIndex(
    (item) => key(item.workspace.path) === key(targetPath),
  );
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex)
    return [...pinnedPaths];
  const [moved] = ordered.splice(fromIndex, 1);
  if (!moved) return [...pinnedPaths];
  const targetIndex = ordered.findIndex(
    (item) => key(item.workspace.path) === key(targetPath),
  );
  ordered.splice(targetIndex + (dropPosition === "after" ? 1 : 0), 0, moved);
  const visibleAliasKeys = new Set(
    ordered.flatMap((item) =>
      pinnedWorkspaceAliases(item).map((alias) => key(alias)),
    ),
  );
  const tail = pinnedPaths.filter(
    (path) => !visibleAliasKeys.has(key(path)),
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
    const raw = window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY);
    if (!raw)
      return {
        ...FALLBACK_STATE,
      };
    const parsed = JSON.parse(raw);
    if (parsed.version !== SIDEBAR_COLLAPSE_VERSION)
      return {
        ...FALLBACK_STATE,
      };
    return {
      collapsedGroupKeys: Array.isArray(parsed.collapsedGroupKeys)
        ? parsed.collapsedGroupKeys
            .filter((key) => typeof key === "string" && key.length > 0)
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
export function persistSidebarCollapseState(state) {
  const value = {
    version: SIDEBAR_COLLAPSE_VERSION,
    collapsedGroupKeys: state.collapsedGroupKeys.slice(
      -MAX_COLLAPSED_GROUP_KEYS,
    ),
    projectsSectionCollapsed: state.projectsSectionCollapsed,
  };
  try {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSE_STORAGE_KEY,
      JSON.stringify(value),
    );
  } catch {}
}
export function GlobalSidebarToggle() {
  const { t: translate } = useTranslation();
  const { collapsed, togglePinned } = useGlobalSidebar();
  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    togglePinned();
  };
  const handleClick = (event) => {
    if (event.detail !== 0) return;
    togglePinned();
  };
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={translate("topbar.toggleGlobalSidebar", {
              defaultValue: "一级侧栏",
            })}
            aria-pressed={!collapsed}
            onPointerDown={handlePointerDown}
            onClick={handleClick}
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
        {translate("topbar.toggleGlobalSidebar", {
          defaultValue: "一级侧栏",
        })}
      </TooltipContent>
    </Tooltip>
  );
}
export function DeleteConfirmDialog({
  open,
  name: projectName,
  onConfirm,
  onCancel,
}) {
  const { t: translate } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{translate("home.deleteProject")}</AlertDialogTitle>
          <AlertDialogDescription>
            {translate("home.deleteProjectConfirm", {
              workspace_name: projectName,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{translate("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {translate("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
