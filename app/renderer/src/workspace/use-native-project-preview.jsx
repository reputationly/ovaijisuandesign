// use-native-project-preview.jsx
import { useTranslation, reactExports, CompositedSvg, CircleAlert, API_PATHS, Plus, Trans, MonochromeIcon, ArrowUpDown, useQuery } from "../vendor.js";
import { gatewayFetch } from "../infra/agent-ws-client.jsx";
import { DeferredThumbnailImage } from "./deferred-thumbnail-image-generation.jsx";
import { Tooltip, TooltipTrigger, Icon, DropdownMenu, DropdownMenuGroup, DropdownMenuRadioGroup, TooltipProvider } from "../vendor-inline/vscode-base/graph.jsx";
import { Folder } from "../media-editing/parse-item.jsx";
import { pinnedWorkspaceAliases, removePinnedWorkspacePaths, recentProjectDismissalListeners } from "../infra/split-pinned-inventory.js";
import { workspaceInventoryPathKey } from "./workspace-events.js";
import { FourCornerLoading } from "../chat/empty-chat-recommendations.jsx";
import {
  TooltipContent,
  Button$1,
  cn$2,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
  DialogFooter,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import { DropdownMenuSeparator } from "./shortcut-categories.jsx";
import {
  QuestionPromptIcon,
  PlaybackPlayIcon,
  PanelVisibilityIcon,
} from "./browser-inspiration-urls.jsx";
import { useGlobalSidebar } from "../media-editing/remote-tool-host.jsx";
import { CreateProjectMenuContent } from "../infra/hub-logo.jsx";
import { useWorkspaceThumbnails } from "./topbar-provider.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export const OPEN_GLOBAL_SEARCH_EVENT = "hilo:open-global-search";
export function MoveWorkspaceDialog({ move, submitting, error, onCancel, onConfirm }) {
  const { t: t2 } = useTranslation();
  return (
    <Dialog open={move !== null} onOpenChange={(open) => !open && !submitting && onCancel()}>
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
              <Folder className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span className="min-w-0 break-words font-medium">{move?.targetName}</span>
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
          <Button$1
            variant="secondary"
            disabled={submitting}
            onClick={onCancel}
            className="creation-dialog-action-button min-w-20 font-normal"
            data-action-ui-id="sidebar.move-cancel"
          >
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            disabled={submitting}
            onClick={onConfirm}
            className="creation-dialog-action-button min-w-20 font-normal"
            data-action-ui-id="sidebar.move-confirm"
          >
            {t2(submitting ? "project.move.submitting" : "project.move.continue")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function pinnedWorkspaceKeySet(pinnedPaths, caseInsensitive) {
  return new Set(pinnedPaths.map((path2) => workspaceInventoryPathKey(path2, caseInsensitive)));
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
export function reorderPinnedProjectIds(pinnedProjectIds, sourceId, targetId, dropPosition) {
  if (sourceId === targetId) return [...pinnedProjectIds];
  const fromIndex = pinnedProjectIds.indexOf(sourceId);
  if (fromIndex === -1 || !pinnedProjectIds.includes(targetId)) return [...pinnedProjectIds];
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
  const fromIndex = ordered.findIndex((item) => key2(item.workspace.path) === key2(sourcePath));
  const toIndex = ordered.findIndex((item) => key2(item.workspace.path) === key2(targetPath));
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return [...pinnedPaths];
  const [moved] = ordered.splice(fromIndex, 1);
  if (!moved) return [...pinnedPaths];
  const targetIndex = ordered.findIndex((item) => key2(item.workspace.path) === key2(targetPath));
  ordered.splice(targetIndex + (dropPosition === "after" ? 1 : 0), 0, moved);
  const visibleAliasKeys = new Set(
    ordered.flatMap((item) => pinnedWorkspaceAliases(item).map((alias) => key2(alias))),
  );
  const tail = pinnedPaths.filter((path2) => !visibleAliasKeys.has(key2(path2)));
  return [...ordered.map((item) => item.workspace.path), ...tail];
}
function isRecentProjectsSortMode$1(value) {
  return value === "manual" || value === "recent" || value === "priority";
}
function isRecentProjectsGroupMode(value) {
  return value === "none" || value === "project";
}
const RECENT_HEADER_PREVIEW_HOLD = "home-sidebar.recent-header-menu";
const CREATE_TRIGGER_CLASS =
  "icon-muted-control pointer-events-none flex size-6 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-[opacity,background-color,color] duration-[80ms] hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 group-hover:pointer-events-auto group-hover:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100";
export function RecentProjectsHeaderActions({
  sortMode,
  onSortModeChange,
  groupMode,
  onGroupModeChange,
  onCreateProject,
  onSelectCreateKind,
  createLabel: createLabelProp,
  holdPreviewOpen,
  releasePreviewHold,
}) {
  const { t: t2 } = useTranslation();
  const [sortMenuOpen, setSortMenuOpen] = reactExports.useState(false);
  const [createMenuOpen, setCreateMenuOpen] = reactExports.useState(false);
  const sortTriggerRef = reactExports.useRef(null);
  const moreLabel = t2("homeSidebar.recentProjectsMore");
  const createLabel = createLabelProp ?? t2("project.newCreation");
  const previewHoldActive = sortMenuOpen || createMenuOpen;
  reactExports.useEffect(() => {
    if (!previewHoldActive || !holdPreviewOpen || !releasePreviewHold) return;
    holdPreviewOpen(RECENT_HEADER_PREVIEW_HOLD);
    return () => releasePreviewHold(RECENT_HEADER_PREVIEW_HOLD);
  }, [holdPreviewOpen, previewHoldActive, releasePreviewHold]);
  return (
    <div
      className="ml-auto flex shrink-0 items-center gap-0.5"
      data-action-ui-id="home-sidebar.recent-header-actions"
    >
      <DropdownMenu modal={false} open={sortMenuOpen} onOpenChange={setSortMenuOpen}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  ref={sortTriggerRef}
                  type="button"
                  aria-label={moreLabel}
                  data-action-ui-id="home-sidebar.recent-sort-trigger"
                  className="icon-muted-control pointer-events-none flex size-6 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-[opacity,background-color,color] duration-[80ms] hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 group-hover:pointer-events-auto group-hover:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100 data-[popup-open]:pointer-events-auto data-[popup-open]:bg-[var(--home-sidebar-nav-active)] data-[popup-open]:text-foreground data-[popup-open]:opacity-100"
                >
                  <MonochromeIcon tone="control">
                    <ArrowUpDown size={14} strokeWidth={1.5} aria-hidden="true" />
                  </MonochromeIcon>
                </DropdownMenuTrigger>
              }
            />
            <TooltipContent side="top">{moreLabel}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent
          align="end"
          side="bottom"
          sideOffset={4}
          className="min-w-40"
          data-global-sidebar-hover-region="true"
          finalFocus={(closeType) => {
            if (closeType === "keyboard") return true;
            queueMicrotask(() => {
              const sortTrigger = sortTriggerRef.current;
              if (sortTrigger && document.activeElement === sortTrigger) {
                sortTrigger.blur();
              }
            });
            return false;
          }}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t2("homeSidebar.recentProjectsGroupLabel")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={groupMode}
              aria-label={t2("homeSidebar.recentProjectsGroupLabel")}
              onValueChange={(value) => {
                if (isRecentProjectsGroupMode(value)) onGroupModeChange(value);
              }}
            >
              <DropdownMenuRadioItem
                value="project"
                data-action-ui-id="home-sidebar.recent-group-project"
              >
                {t2("homeSidebar.recentProjectsGroupProject")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="none"
                data-action-ui-id="home-sidebar.recent-group-none"
              >
                {t2("homeSidebar.recentProjectsGroupNone")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t2("homeSidebar.recentProjectsSortLabel")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sortMode}
              aria-label={t2("homeSidebar.recentProjectsSortLabel")}
              onValueChange={(value) => {
                if (isRecentProjectsSortMode$1(value)) onSortModeChange(value);
              }}
            >
              <DropdownMenuRadioItem
                value="manual"
                data-action-ui-id="home-sidebar.recent-sort-manual"
              >
                {t2("homeSidebar.recentProjectsSortManual")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="recent"
                data-action-ui-id="home-sidebar.recent-sort-recent"
              >
                {t2("homeSidebar.recentProjectsSortRecent")}
              </DropdownMenuRadioItem>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <DropdownMenuRadioItem
                        value="priority"
                        data-action-ui-id="home-sidebar.recent-sort-priority"
                      >
                        {t2("homeSidebar.recentProjectsSortPriority")}
                      </DropdownMenuRadioItem>
                    }
                  />
                  <TooltipContent side="right">
                    {t2("homeSidebar.recentProjectsSortPriorityTooltip")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {onSelectCreateKind ? (
        // Same dropdown as the project list "New project" button so every
        // entry point offers the local/team choice.
        <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    type="button"
                    aria-label={createLabel}
                    data-action-ui-id="home-sidebar.recent-create-project"
                    onClick={() => setSortMenuOpen(false)}
                    className={cn$2(
                      CREATE_TRIGGER_CLASS,
                      "data-[popup-open]:pointer-events-auto data-[popup-open]:bg-[var(--home-sidebar-nav-active)] data-[popup-open]:text-foreground data-[popup-open]:opacity-100",
                      sortMenuOpen && "pointer-events-auto opacity-100",
                    )}
                  >
                    <MonochromeIcon tone="control">
                      <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
                    </MonochromeIcon>
                  </DropdownMenuTrigger>
                }
              />
              <TooltipContent side="top">{createLabel}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <CreateProjectMenuContent
            actionUiIdPrefix="home-sidebar.recent"
            onSelectKind={onSelectCreateKind}
            align="end"
            side="bottom"
            sideOffset={4}
            sidebarHoverRegion={true}
          />
        </DropdownMenu>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={createLabel}
                  data-action-ui-id="home-sidebar.recent-create-project"
                  onClick={() => {
                    setSortMenuOpen(false);
                    onCreateProject?.();
                  }}
                  className={cn$2(
                    CREATE_TRIGGER_CLASS,
                    sortMenuOpen && "pointer-events-auto opacity-100",
                  )}
                >
                  <MonochromeIcon tone="control">
                    <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
                  </MonochromeIcon>
                </button>
              }
            />
            <TooltipContent side="top">{createLabel}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
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
    collapsedGroupKeys: state2.collapsedGroupKeys.slice(-MAX_COLLAPSED_GROUP_KEYS),
    projectsSectionCollapsed: state2.projectsSectionCollapsed,
  };
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, JSON.stringify(value));
  } catch {}
}
function isRecentProjectsSortMode(value) {
  return value === "manual" || value === "recent" || value === "priority";
}
const UNGROUPED_SORT_PREVIEW_HOLD = "home-sidebar.recent-group-ungrouped-sort-menu";
export function UngroupedSortMenu({
  sortMode,
  onSortModeChange,
  holdPreviewOpen,
  releasePreviewHold,
}) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const triggerRef = reactExports.useRef(null);
  const moreLabel = t2("homeSidebar.recentProjectsMore");
  reactExports.useEffect(() => {
    if (!open || !holdPreviewOpen || !releasePreviewHold) return;
    holdPreviewOpen(UNGROUPED_SORT_PREVIEW_HOLD);
    return () => releasePreviewHold(UNGROUPED_SORT_PREVIEW_HOLD);
  }, [holdPreviewOpen, open, releasePreviewHold]);
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                ref={triggerRef}
                type="button"
                aria-label={moreLabel}
                data-action-ui-id="home-sidebar.recent-group-ungrouped-sort-trigger"
                onClick={(event) => event.stopPropagation()}
                className="pointer-events-none relative z-10 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity duration-150 hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none group-hover:pointer-events-auto group-hover:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100 data-[popup-open]:pointer-events-auto data-[popup-open]:bg-[var(--home-sidebar-nav-active)] data-[popup-open]:text-foreground data-[popup-open]:opacity-100"
              >
                <ArrowUpDown size={14} strokeWidth={1.5} aria-hidden="true" />
              </DropdownMenuTrigger>
            }
          />
          <TooltipContent side="top">{moreLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={4}
        className="min-w-40"
        data-global-sidebar-hover-region="true"
        finalFocus={(closeType) => {
          if (closeType === "keyboard") return true;
          queueMicrotask(() => {
            const trigger = triggerRef.current;
            if (trigger && document.activeElement === trigger) {
              trigger.blur();
            }
          });
          return false;
        }}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t2("homeSidebar.recentProjectsSortLabel")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sortMode}
            aria-label={t2("homeSidebar.recentProjectsSortLabel")}
            onValueChange={(value) => {
              if (isRecentProjectsSortMode(value)) onSortModeChange(value);
            }}
          >
            <DropdownMenuRadioItem
              value="manual"
              data-action-ui-id="home-sidebar.recent-group-ungrouped-sort-manual"
            >
              {t2("homeSidebar.recentProjectsSortManual")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              value="recent"
              data-action-ui-id="home-sidebar.recent-group-ungrouped-sort-recent"
            >
              {t2("homeSidebar.recentProjectsSortRecent")}
            </DropdownMenuRadioItem>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DropdownMenuRadioItem
                      value="priority"
                      data-action-ui-id="home-sidebar.recent-group-ungrouped-sort-priority"
                    >
                      {t2("homeSidebar.recentProjectsSortPriority")}
                    </DropdownMenuRadioItem>
                  }
                />
                <TooltipContent side="right">
                  {t2("homeSidebar.recentProjectsSortPriorityTooltip")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
          <PanelVisibilityIcon className="pointer-events-none" active={!collapsed} side="left" />
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
function isWorkspaceMediaSummary(value) {
  if (value === null || typeof value !== "object" || !("counts" in value)) return false;
  const counts = value.counts;
  if (counts === null || typeof counts !== "object") return false;
  const candidate = counts;
  return ["image", "video", "audio", "text"].every(
    (key2) => typeof candidate[key2] === "number" && Number.isFinite(candidate[key2]),
  );
}
async function fetchWorkspaceSummary(workspacePath) {
  const response = await gatewayFetch(API_PATHS.workspaceSummary(workspacePath));
  if (!response.ok) {
    throw new Error(`Workspace summary request failed: ${response.status}`);
  }
  const value = await response.json();
  if (!isWorkspaceMediaSummary(value)) {
    throw new Error("Invalid workspace summary response");
  }
  return value;
}
export function useWorkspaceSummary(workspacePath, enabled) {
  return useQuery({
    queryKey: ["workspace-media-summary", workspacePath],
    queryFn: () => fetchWorkspaceSummary(workspacePath),
    enabled: enabled && workspacePath.length > 0,
    staleTime: 3e4,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
export function DeleteConfirmDialog({ open, name: name2, onConfirm, onCancel }) {
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
const MINUTE_MS = 6e4;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
function localCalendarDay(date2) {
  return Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate()) / DAY_MS;
}
export function formatWorkspaceOpenedAt(timestamp2, locale, now2 = Date.now()) {
  if (!Number.isFinite(timestamp2) || !Number.isFinite(now2)) return "";
  const openedAt = new Date(timestamp2);
  const current2 = new Date(now2);
  if (Number.isNaN(openedAt.getTime()) || Number.isNaN(current2.getTime())) return "";
  const dayDifference = localCalendarDay(current2) - localCalendarDay(openedAt);
  const relativeTime = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
  });
  if (dayDifference === 0) {
    const elapsed = Math.max(0, now2 - timestamp2);
    if (elapsed < MINUTE_MS) return relativeTime.format(0, "second");
    if (elapsed < HOUR_MS) {
      return relativeTime.format(-Math.max(1, Math.floor(elapsed / MINUTE_MS)), "minute");
    }
    return relativeTime.format(-Math.max(1, Math.floor(elapsed / HOUR_MS)), "hour");
  }
  if (dayDifference === 1) return relativeTime.format(-1, "day");
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(openedAt);
}
export const HOME_RECENT_DETAILS_SIDE_OFFSET = 0;
export const HOME_RECENT_CLICK_RESOLUTION_DELAY = 240;
export const HOME_NAV_PILL_CLASS$1 =
  "home-sidebar-nav-pill relative isolate flex h-8 w-full items-center gap-2 rounded-md pr-1 after:pointer-events-none after:absolute after:inset-y-0 after:-z-10 after:rounded-md";
export const HOME_NAV_ACTIVE_CLASS$1 = "after:bg-[var(--home-sidebar-nav-active)]";
export function RecentProjectStatusContent({
  variant,
  userAction,
  userActionLabel,
  displayName: displayName2,
  openedAtLabel,
}) {
  const rowActionId =
    userAction === "confirmation"
      ? "home-sidebar.recent-confirmation-tag"
      : "home-sidebar.recent-question-tag";
  const detailsActionId =
    userAction === "confirmation"
      ? "home-sidebar.recent-details-confirmation-tag"
      : "home-sidebar.recent-details-question-tag";
  if (variant === "row") {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate" data-recent-project-name="true">
          {displayName2}
        </span>
        {userAction ? (
          <Badge
            role="status"
            aria-label={userActionLabel}
            data-action-ui-id={rowActionId}
            className="h-4 rounded-sm bg-brand-accent/10 px-1.5 py-0 text-[10px] font-medium leading-none text-brand-accent group-focus-within:hidden"
          >
            {userActionLabel}
          </Badge>
        ) : null}
      </span>
    );
  }
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      {userAction ? (
        <Badge
          role="status"
          aria-label={userActionLabel}
          data-action-ui-id={detailsActionId}
          className="h-4 rounded-sm bg-brand-accent/10 px-1.5 py-0 text-[10px] font-medium leading-none text-brand-accent"
        >
          {userActionLabel}
        </Badge>
      ) : null}
      <span
        data-action-ui-id="home-sidebar.recent-details-time"
        className="text-right text-[10px] tabular-nums whitespace-nowrap text-muted-foreground"
      >
        {openedAtLabel}
      </span>
    </div>
  );
}
function WorkspaceStatusBadge({ status, className }) {
  const { t: t2 } = useTranslation();
  if (!status || (!status.running && !status.unread && !status.needsUserAction)) return null;
  if (status.needsUserAction) {
    const needsAnswer = status.needsUserAction === "answer";
    const label = needsAnswer
      ? t2("session.tabs.status.awaitingAnswer", "Waiting for your answer")
      : t2("session.tabs.status.awaitingConfirmation", "Waiting for your confirmation");
    return (
      <span
        role="status"
        aria-label={label}
        title={label}
        className={cn$2(
          "flex size-4 shrink-0 items-center justify-center text-foreground/70",
          className,
        )}
      >
        {needsAnswer ? (
          <QuestionPromptIcon className="size-3.5 text-foreground/70" />
        ) : (
          <Icon icon={CircleAlert} size="sm" />
        )}
      </span>
    );
  }
  if (status.running) {
    return (
      <FourCornerLoading
        variant="tab"
        size="sm"
        label={t2("session.tabs.status.generating", "Generating")}
        className={className}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={t2("session.tabs.status.completedUnread", "Completed, unread")}
      className={cn$2("size-[5px] shrink-0 rounded-full bg-brand-accent", className)}
    />
  );
}
export function RecentProjectTrailingStatus({
  status,
  hovered,
  hasTrailingStatus,
  completedUnreadLabel,
}) {
  return (
    <span
      data-action-ui-id="home-sidebar.recent-trailing-slot"
      className={cn$2(
        "relative flex h-4 shrink-0 items-center justify-center overflow-hidden transition-[width] duration-150 ease-out group-hover:w-5 group-focus-within:w-5",
        hasTrailingStatus ? "w-5" : "w-0",
      )}
    >
      {!hovered && hasTrailingStatus && status?.running ? (
        <WorkspaceStatusBadge status={status} />
      ) : !hovered && hasTrailingStatus ? (
        <span
          role="img"
          aria-label={completedUnreadLabel}
          className="size-[5px] shrink-0 rounded-full bg-brand-accent"
        />
      ) : null}
    </span>
  );
}
function WorkspaceThumbnailFallback() {
  return (
    <span
      aria-hidden="true"
      className="home-sidebar-recent-thumbnail-fallback flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-foreground/[0.04] text-sidebar-foreground"
    >
      <CompositedSvg
        className="size-3"
        opacity="0.16"
        role="presentation"
        viewBox="0 0 145 137"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M116 6.31573e-05C123.69 6.31573e-05 131.069 3.04111 136.515 8.44623C141.939 13.8621 145 21.1907 145 28.8417V86.5356C145 94.1866 141.95 101.515 136.515 106.931C131.066 112.355 123.687 115.393 116 115.377H81.7478L47.227 135.977C46.1888 136.595 45.0131 136.944 43.806 136.994C42.5988 137.043 41.3984 136.791 40.3132 136.26C39.228 135.729 38.2922 134.936 37.5902 133.952C36.8883 132.968 36.4425 131.825 36.293 130.625L36.25 129.798V115.377H29C21.5683 115.386 14.4171 112.539 9.02222 107.425C3.63642 102.34 0.41663 95.3744 0.0322224 87.9755L0 86.5356V28.8417C0 21.1907 3.05037 13.8621 8.48518 8.44623C13.9343 3.02195 21.3131 -0.0159719 29 6.31573e-05H116ZM87 64.9044H43.5C41.5882 64.91 39.7554 65.6686 38.3985 67.0161C37.0416 68.3635 36.2698 70.1914 36.25 72.1041C36.2471 73.0559 36.4329 73.9988 36.7967 74.8783C37.1604 75.7578 37.6948 76.5565 38.3691 77.228C39.0433 77.8995 39.8439 78.4307 40.7246 78.7906C41.6053 79.1506 42.5487 79.3323 43.5 79.3252H87C88.9137 79.3196 90.748 78.5595 92.1052 77.2097C93.4624 75.86 94.233 74.0293 94.25 72.1148C94.2514 71.1639 94.0646 70.2221 93.7002 69.3439C93.3359 68.4656 92.8012 67.6682 92.1271 66.9978C91.453 66.3274 90.6529 65.7973 89.7729 65.438C88.8929 65.0787 87.9504 64.8973 87 64.9044ZM101.5 36.0521H43.5C41.5863 36.0576 39.752 36.8177 38.3948 38.1675C37.0376 39.5177 36.267 41.348 36.25 43.2625C36.2486 44.2134 36.4354 45.1552 36.7998 46.0334C37.1641 46.9117 37.6988 47.709 38.3729 48.3794C39.047 49.0498 39.847 49.58 40.7271 49.9393C41.6071 50.2986 42.5496 50.48 43.5 50.4729H101.5C103.412 50.4673 105.245 49.7087 106.601 48.3612C107.958 47.0137 108.73 45.1858 108.75 43.2732C108.753 42.3214 108.567 41.3785 108.203 40.4989C107.84 39.6194 107.305 38.8208 106.631 38.1493C105.957 37.4777 105.156 36.9466 104.275 36.5866C103.395 36.2267 102.451 36.045 101.5 36.0521Z"
          fill="currentColor"
        />
      </CompositedSvg>
    </span>
  );
}
const HOME_RECENT_THUMBNAIL_ROOT_MARGIN = "96px 0px";
const HOME_RECENT_THUMBNAIL_STABLE_DELAY_MS = 240;
export function RecentWorkspaceThumbnail({ workspacePath, scanAllowed }) {
  const hostRef = reactExports.useRef(null);
  const [loadEnabled, setLoadEnabled] = reactExports.useState(
    () => typeof IntersectionObserver === "undefined",
  );
  const { data: thumbnails } = useWorkspaceThumbnails(workspacePath, scanAllowed && loadEnabled);
  const [failedSource, setFailedSource] = reactExports.useState(null);
  const thumbnail = thumbnails?.[0];
  const thumbnailFailed = thumbnail ? failedSource === thumbnail.src : false;
  reactExports.useEffect(() => {
    if (!scanAllowed || loadEnabled || typeof IntersectionObserver === "undefined") return;
    const host = hostRef.current;
    if (!host) return;
    let visibilityTimer = null;
    const observer2 = new IntersectionObserver(
      (entries2) => {
        if (!entries2.some((entry) => entry.isIntersecting)) {
          if (visibilityTimer !== null) {
            window.clearTimeout(visibilityTimer);
            visibilityTimer = null;
          }
          return;
        }
        if (visibilityTimer !== null) return;
        visibilityTimer = window.setTimeout(() => {
          visibilityTimer = null;
          setLoadEnabled(true);
          observer2.disconnect();
        }, HOME_RECENT_THUMBNAIL_STABLE_DELAY_MS);
      },
      {
        rootMargin: HOME_RECENT_THUMBNAIL_ROOT_MARGIN,
      },
    );
    observer2.observe(host);
    return () => {
      observer2.disconnect();
      if (visibilityTimer !== null) window.clearTimeout(visibilityTimer);
    };
  }, [loadEnabled, scanAllowed]);
  return (
    <span
      ref={hostRef}
      data-action-ui-id="home-sidebar.recent-thumbnail"
      className="relative flex size-6 shrink-0 overflow-hidden rounded-sm"
    >
      {!thumbnail || thumbnailFailed ? (
        <WorkspaceThumbnailFallback />
      ) : (
        <span className="relative size-6 shrink-0 overflow-hidden rounded-sm bg-muted">
          <DeferredThumbnailImage
            src={thumbnail.src}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
            onFailure={() => {
              setFailedSource(thumbnail.src);
            }}
          />
          {thumbnail.mediaType === "video" && (
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--media-overlay-surface)] text-[var(--media-overlay-foreground)]"
              data-home-video-play="true"
            >
              <PlaybackPlayIcon size={9} className="text-[var(--media-overlay-foreground)]" />
            </span>
          )}
        </span>
      )}
    </span>
  );
}
const THEME_TOKENS = [
  "--popover",
  "--foreground",
  "--muted",
  "--muted-foreground",
  "--elevated-border-width",
  "--elevated-border-color",
  "--radius",
  "--radius-md",
  "--font-sans",
  "--ring",
  "--brand-accent",
];
export function useNativeProjectPreview(options) {
  const browser2 = window.hilo?.browser;
  const supported =
    typeof browser2?.showProjectPreview === "function" &&
    typeof browser2?.hideProjectPreview === "function" &&
    typeof browser2?.onProjectPreviewEvent === "function";
  const [domFallback, setDomFallback] = reactExports.useState(false);
  const latest2 = reactExports.useRef(options);
  latest2.current = options;
  const publishRef = reactExports.useRef(null);
  const { open, anchor } = options;
  reactExports.useLayoutEffect(() => {
    if (!open || !supported || !browser2) return;
    const element2 = anchor.current;
    if (!element2) return;
    setDomFallback(false);
    const token2 = `project-preview:${crypto.randomUUID()}`;
    let disposed = false;
    let held = false;
    let lastPayload = "";
    let revision = 0;
    let nativeActive = true;
    const hold = latest2.current.holdPreviewOpen;
    const release = latest2.current.releasePreviewHold;
    const hide2 = () => {
      void browser2.hideProjectPreview(token2).catch(() => {});
    };
    const unsubscribe = browser2.onProjectPreviewEvent((event) => {
      if (!disposed && event.token === token2) latest2.current.onEvent(event);
    });
    const publish = () => {
      if (disposed) return;
      const rect = element2.getBoundingClientRect();
      const computed = getComputedStyle(element2);
      const request = {
        token: token2,
        anchor: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        content: latest2.current.content,
        theme: Object.fromEntries(
          THEME_TOKENS.map((key2) => [key2, computed.getPropertyValue(key2).trim()]),
        ),
      };
      const payload = JSON.stringify(request);
      if (payload === lastPayload) return;
      lastPayload = payload;
      const currentRevision = ++revision;
      void browser2.showProjectPreview(request).then(
        (shown) => {
          if (disposed || currentRevision !== revision) return;
          nativeActive = shown;
          setDomFallback(!shown);
          if (shown && !held) {
            held = true;
            hold?.(token2);
          }
        },
        () => {
          if (disposed || currentRevision !== revision) return;
          nativeActive = false;
          hide2();
          setDomFallback(true);
        },
      );
    };
    publishRef.current = publish;
    publish();
    const close2 = () => {
      if (nativeActive)
        latest2.current.onEvent({
          token: token2,
          type: "close",
        });
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") close2();
    };
    document.addEventListener("scroll", close2, true);
    document.addEventListener("pointerdown", close2, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", close2);
    const themeObserver = new MutationObserver(publish);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    return () => {
      disposed = true;
      publishRef.current = null;
      unsubscribe();
      themeObserver.disconnect();
      document.removeEventListener("scroll", close2, true);
      document.removeEventListener("pointerdown", close2, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", close2);
      hide2();
      if (held) release?.(token2);
    };
  }, [anchor, browser2, open, supported]);
  reactExports.useEffect(() => {
    publishRef.current?.();
  });
  return open && supported && !domFallback;
}
