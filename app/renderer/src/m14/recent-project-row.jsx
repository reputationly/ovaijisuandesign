// recent-project-row.jsx
import { useTranslation, reactExports, Check, Copy, dedupedToast, usePlatform, MonochromeIcon, Pin, FolderX, CircleX } from "../vendor.js";
import { Popover } from "../m15/apply-asset-change.jsx";
import { UNGROUPED_RECENT_GROUP_KEY } from "../m15/deferred-thumbnail-image-generation.jsx";
import { Tooltip, TooltipTrigger, DropdownMenu, TooltipProvider, MoreVerticalIcon } from "../m15/graph.jsx";
import { PlatformFileManagerLabel } from "../m15/interest-selection-provider.jsx";
import { Trash2 } from "../m15/parse-item.jsx";
import { workspaceDisplayName } from "../m15/use-resizable-width.js";
import { projectWorkspaceKey } from "../m15/workspace-events.js";
import {
  TooltipContent,
  cn$2,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { PopoverContent } from "../m09/use-credit-details.jsx";
import { PencilIcon, StrokeIcon, LocalFolderIcon } from "../m08/browser-inspiration-urls.jsx";
import { AddToProjectSubMenu } from "../m10/new-workspace-dialog.jsx";
import { InlineRenameInput } from "../m10/hub-logo.jsx";
import { useWorkspaceDisplayNameRename } from "../m10/use-new-workspace-dialog.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  DeleteConfirmDialog,
  HOME_NAV_ACTIVE_CLASS$1,
  HOME_NAV_PILL_CLASS$1,
  HOME_RECENT_CLICK_RESOLUTION_DELAY,
  HOME_RECENT_DETAILS_SIDE_OFFSET,
  RecentProjectStatusContent,
  RecentProjectTrailingStatus,
  RecentWorkspaceThumbnail,
  formatWorkspaceOpenedAt,
  isProjectPinned,
  useNativeProjectPreview,
  useWorkspaceSummary,
} from "./use-native-project-preview.jsx";
const COPY_FEEDBACK_DURATION_MS = 1500;
export function RecentProjectRow({
  workspace,
  renamePath,
  active: active2 = false,
  status,
  onOpen,
  onDelete,
  onCloseRuntime,
  dragOver,
  draggable = true,
  dragging = false,
  moveCompleted = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onPreviewInteractionEnter,
  onPreviewInteractionLeave,
  loadThumbnail,
  detailsEnabled,
  detailsOpen,
  onDetailsOpenChange,
  projects,
  currentProject,
  onAddToProject,
  onRemoveFromProject,
  pinned = false,
  onTogglePin,
  holdPreviewOpen,
  releasePreviewHold,
}) {
  const { t: t2, i18n } = useTranslation();
  const platform2 = usePlatform();
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const [renameSurface, setRenameSurface] = reactExports.useState(null);
  const [renameMenuHandoff, setRenameMenuHandoff] = reactExports.useState(false);
  const [deleting, setDeleting] = reactExports.useState(false);
  const [hovered, setHovered] = reactExports.useState(false);
  const [pathCopied, setPathCopied] = reactExports.useState(false);
  const rowRef = reactExports.useRef(null);
  const copyFeedbackTimerRef = reactExports.useRef(null);
  const detailsTimerRef = reactExports.useRef(null);
  const openTimerRef = reactExports.useRef(null);
  const renameAfterMenuCloseRef = reactExports.useRef(false);
  const renameAfterMenuCloseTimerRef = reactExports.useRef(null);
  const draggingRef = reactExports.useRef(false);
  const displayName2 = workspaceDisplayName(workspace);
  const pendingUserAction = status?.needsUserAction;
  const hasTrailingStatus = Boolean(status?.running || status?.unread) && !pendingUserAction;
  const renaming = renameSurface !== null;
  const previewHoldActive = menuOpen || renaming || renameMenuHandoff || deleting;
  reactExports.useEffect(() => {
    if (!previewHoldActive || !holdPreviewOpen || !releasePreviewHold) return;
    const token2 = `home-sidebar.recent-row:${workspace.path}`;
    holdPreviewOpen(token2);
    return () => releasePreviewHold(token2);
  }, [holdPreviewOpen, previewHoldActive, releasePreviewHold, workspace.path]);
  const setDetailsOpen = reactExports.useCallback(
    (open) => onDetailsOpenChange(workspace.path, open),
    [onDetailsOpenChange, workspace.path],
  );
  const renameDisplayName = useWorkspaceDisplayNameRename(renamePath ?? workspace.path);
  const openedAtLabel = formatWorkspaceOpenedAt(workspace.openedAt, i18n.language);
  const pendingUserActionLabel =
    pendingUserAction === "confirmation"
      ? t2("homeSidebar.recentProjectAwaitingApproval", "Awaiting approval")
      : t2("homeSidebar.recentProjectAwaitingAnswer", "Awaiting reply");
  const visibleDetailsOpen = detailsEnabled && detailsOpen;
  const recentPillStateClass = active2
    ? HOME_NAV_ACTIVE_CLASS$1
    : cn$2(
        "group-hover/recent-row:after:bg-[var(--home-sidebar-nav-hover)] group-has-[:focus-visible]/recent-row:after:bg-[var(--home-sidebar-nav-hover)]",
        (visibleDetailsOpen || menuOpen) && "after:bg-[var(--home-sidebar-nav-hover)]",
      );
  const summaryQuery = useWorkspaceSummary(workspace.path, visibleDetailsOpen && !menuOpen);
  const counts = summaryQuery.data?.counts;
  const assetSummaryItems = counts
    ? [
        {
          key: "video",
          label: t2("home.recentProjectDetails.videos"),
          count: counts.video,
        },
        {
          key: "image",
          label: t2("home.recentProjectDetails.images"),
          count: counts.image,
        },
        {
          key: "text",
          label: t2("home.recentProjectDetails.text"),
          count: counts.text,
        },
        {
          key: "audio",
          label: t2("home.recentProjectDetails.audio"),
          count: counts.audio,
        },
      ].filter((item) => item.count > 0)
    : [];
  const handleCopyWorkspacePath = reactExports.useCallback(
    async (feedback = "toast") => {
      try {
        await platform2.clipboard.writeText(workspace.path);
        if (feedback === "toast") {
          dedupedToast.success(t2("fileExplorer.pathCopied"));
          return;
        }
        if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current);
        setPathCopied(true);
        copyFeedbackTimerRef.current = setTimeout(() => {
          copyFeedbackTimerRef.current = null;
          setPathCopied(false);
        }, COPY_FEEDBACK_DURATION_MS);
      } catch {
        if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current);
        copyFeedbackTimerRef.current = null;
        setPathCopied(false);
        dedupedToast.error(t2("fileExplorer.copyFailed"));
      }
    },
    [platform2.clipboard, t2, workspace.path],
  );
  reactExports.useEffect(
    () => () => {
      if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current);
    },
    [],
  );
  const handleOpenWorkspacePath = reactExports.useCallback(async () => {
    try {
      if (platform2.shell.openPath) {
        await platform2.shell.openPath(workspace.path);
        return;
      }
      if (platform2.shell.showItemInFolder) {
        await platform2.shell.showItemInFolder(workspace.path);
        return;
      }
      dedupedToast.error(t2("fileExplorer.platformNotSupported"));
    } catch {
      dedupedToast.error(t2("fileExplorer.openFailed"));
    }
  }, [platform2.shell, t2, workspace.path]);
  const clearDetailsTimer = reactExports.useCallback(() => {
    if (detailsTimerRef.current) {
      clearTimeout(detailsTimerRef.current);
      detailsTimerRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => clearDetailsTimer, [clearDetailsTimer]);
  reactExports.useLayoutEffect(() => {
    if (detailsEnabled) return;
    clearDetailsTimer();
    setHovered(false);
    setDetailsOpen(false);
    setRenameSurface((surface) => (surface === "details" ? null : surface));
  }, [clearDetailsTimer, detailsEnabled, setDetailsOpen]);
  const clearOpenTimer = reactExports.useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => clearOpenTimer, [clearOpenTimer]);
  const handleMenuOpenChange = reactExports.useCallback(
    (open) => {
      setMenuOpen(open);
      if (open) {
        clearOpenTimer();
        clearDetailsTimer();
        setDetailsOpen(false);
        return;
      }
      if (!renameAfterMenuCloseRef.current) return;
      renameAfterMenuCloseRef.current = false;
      if (renameAfterMenuCloseTimerRef.current) {
        clearTimeout(renameAfterMenuCloseTimerRef.current);
      }
      renameAfterMenuCloseTimerRef.current = setTimeout(() => {
        renameAfterMenuCloseTimerRef.current = null;
        setRenameMenuHandoff(false);
        setRenameSurface("row");
      }, 0);
    },
    [clearDetailsTimer, clearOpenTimer, setDetailsOpen],
  );
  reactExports.useEffect(
    () => () => {
      if (renameAfterMenuCloseTimerRef.current) {
        clearTimeout(renameAfterMenuCloseTimerRef.current);
      }
    },
    [],
  );
  const scheduleDetailsClose = reactExports.useCallback(() => {
    clearDetailsTimer();
    if (renameSurface === "details") return;
    detailsTimerRef.current = setTimeout(() => setDetailsOpen(false), 140);
  }, [clearDetailsTimer, renameSurface, setDetailsOpen]);
  const handlePointerEnter = reactExports.useCallback(() => {
    onPreviewInteractionEnter?.();
    clearDetailsTimer();
    setHovered(true);
    if (detailsEnabled && !menuOpen && !renaming && !draggingRef.current) {
      detailsTimerRef.current = setTimeout(() => setDetailsOpen(true), 160);
    }
  }, [
    clearDetailsTimer,
    detailsEnabled,
    menuOpen,
    onPreviewInteractionEnter,
    renaming,
    setDetailsOpen,
  ]);
  const handlePointerLeave = reactExports.useCallback(() => {
    setHovered(false);
    scheduleDetailsClose();
  }, [scheduleDetailsClose]);
  const handleProjectClick = reactExports.useCallback(
    (event) => {
      if (renaming || menuOpen) return;
      const shouldRename =
        event.detail >= 3 &&
        event.target instanceof HTMLElement &&
        event.target.closest('[data-recent-project-name="true"]');
      if (!shouldRename) {
        clearOpenTimer();
        openTimerRef.current = setTimeout(() => {
          openTimerRef.current = null;
          onOpen(workspace);
        }, HOME_RECENT_CLICK_RESOLUTION_DELAY);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      clearOpenTimer();
      clearDetailsTimer();
      setDetailsOpen(false);
      setMenuOpen(false);
      setRenameSurface("row");
    },
    [clearDetailsTimer, clearOpenTimer, menuOpen, onOpen, renaming, setDetailsOpen, workspace],
  );
  const nativeDetails = useNativeProjectPreview({
    open: visibleDetailsOpen && !menuOpen && !deleting,
    anchor: rowRef,
    content: {
      name: displayName2,
      path: workspace.path,
      status: pendingUserAction
        ? `${pendingUserActionLabel}
${openedAtLabel}`
        : openedAtLabel,
      summary: assetSummaryItems.map((item) => `${item.label} · ${item.count}`).join(" ｜ "),
      loading: summaryQuery.isPending,
      copyLabel: t2("fileExplorer.copyPath"),
      copiedLabel: t2("common.copiedShort"),
      copied: pathCopied,
      renamePlaceholder: t2("home.workspace.displayNamePlaceholder"),
    },
    holdPreviewOpen,
    releasePreviewHold,
    onEvent: (event) => {
      if (event.type === "enter") {
        onPreviewInteractionEnter?.();
        clearDetailsTimer();
      } else if (event.type === "leave") {
        scheduleDetailsClose();
        onPreviewInteractionLeave?.();
      } else if (event.type === "close") {
        clearDetailsTimer();
        setDetailsOpen(false);
      } else if (event.type === "copy") {
        void handleCopyWorkspacePath("inline");
      } else if (event.type === "rename" && event.name?.trim()) {
        renameDisplayName(event.name.trim());
        setDetailsOpen(false);
      }
    },
  });
  return (
    <Popover
      open={visibleDetailsOpen && !nativeDetails}
      onOpenChange={(open) => {
        if (open && !detailsEnabled) return;
        setDetailsOpen(open);
        if (!open && renameSurface === "details") setRenameSurface(null);
      }}
    >
      <li
        ref={rowRef}
        draggable={draggable && !renaming}
        data-action-ui-id="home-sidebar-recent"
        data-workspace-path={workspace.path}
        onDragStart={(event) => {
          draggingRef.current = true;
          clearDetailsTimer();
          clearOpenTimer();
          setDetailsOpen(false);
          setMenuOpen(false);
          onDragStart(event, workspace.path);
        }}
        onDragOver={(event) => {
          clearDetailsTimer();
          clearOpenTimer();
          setDetailsOpen(false);
          onDragOver(event, workspace.path);
        }}
        onDrop={(event) => {
          draggingRef.current = false;
          clearDetailsTimer();
          clearOpenTimer();
          setDetailsOpen(false);
          onDrop(event, workspace.path);
        }}
        onDragEnd={() => {
          draggingRef.current = false;
          clearDetailsTimer();
          clearOpenTimer();
          setDetailsOpen(false);
          onDragEnd();
        }}
        className={cn$2(
          "group group/recent-row relative flex h-[32px] shrink-0 cursor-pointer items-center text-left text-sm text-[var(--home-sidebar-secondary-text)] transition-colors hover:text-foreground",
          active2 && "text-foreground",
          dragging && "sidebar-drag-source",
          moveCompleted && "sidebar-move-completed",
          dragOver && "home-sidebar-recent-drag-over",
          dragOver && `home-sidebar-recent-drag-over-${dragOver}`,
        )}
        data-drag-over-position={dragOver}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {renameSurface === "row" ? (
          <div
            className={cn$2(
              HOME_NAV_PILL_CLASS$1,
              recentPillStateClass,
              "pr-2 group-hover/recent-row:pr-16 group-has-[:focus-visible]/recent-row:pr-16",
              menuOpen && "pr-16",
            )}
            data-action-ui-id="home-sidebar.recent-pill"
          >
            <RecentWorkspaceThumbnail workspacePath={workspace.path} scanAllowed={loadThumbnail} />
            <InlineRenameInput
              initialName={displayName2}
              placeholder={t2("home.workspace.displayNamePlaceholder")}
              onConfirm={(name2) => {
                renameDisplayName(name2);
                setRenameSurface(null);
              }}
              onCancel={() => setRenameSurface(null)}
            />
          </div>
        ) : (
          <button
            type="button"
            tabIndex={0}
            aria-current={active2 ? "page" : void 0}
            onClick={handleProjectClick}
            className={cn$2(
              HOME_NAV_PILL_CLASS$1,
              recentPillStateClass,
              "list-row-hit-area [--list-row-gap:1px] group-first/recent-row:before:top-0 group-last/recent-row:before:bottom-0 pr-2 text-left group-hover/recent-row:pr-16 group-has-[:focus-visible]/recent-row:pr-16",
              menuOpen && "pr-16",
            )}
            data-action-ui-id="home-sidebar.recent-pill"
          >
            <RecentWorkspaceThumbnail workspacePath={workspace.path} scanAllowed={loadThumbnail} />
            <RecentProjectStatusContent
              variant="row"
              userAction={hovered ? void 0 : pendingUserAction}
              userActionLabel={pendingUserActionLabel}
              displayName={displayName2}
            />
            <RecentProjectTrailingStatus
              status={status}
              hovered={hovered}
              hasTrailingStatus={hasTrailingStatus}
              completedUnreadLabel={t2("session.tabs.status.completedUnread", "Completed, unread")}
            />
          </button>
        )}
        <div
          className={cn$2(
            "pointer-events-none absolute right-0.5 top-0 bottom-0 flex items-center gap-0.5 px-2 rounded-r-md opacity-0 transition-opacity duration-150 group-hover/recent-row:opacity-100 group-hover/recent-row:pointer-events-auto group-has-[:focus-visible]/recent-row:opacity-100 group-has-[:focus-visible]/recent-row:pointer-events-auto",
            menuOpen && "pointer-events-auto opacity-100",
          )}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={pinned ? t2("session.unpin") : t2("session.pin")}
                    data-action-ui-id="home-sidebar-recent-pin"
                    data-icon-active={pinned || void 0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onTogglePin();
                    }}
                    className={cn$2(
                      "icon-sidebar-action-control flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:outline-none",
                      pinned && "text-foreground",
                    )}
                  >
                    <MonochromeIcon tone="control">
                      <Pin
                        size={14}
                        strokeWidth={1.5}
                        aria-hidden="true"
                        className={cn$2(pinned && "fill-current")}
                      />
                    </MonochromeIcon>
                  </button>
                }
              />
              <TooltipContent side="top">
                {pinned ? t2("session.unpin") : t2("session.pin")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
            <DropdownMenuTrigger
              type="button"
              draggable={false}
              disabled={renaming}
              aria-label={t2("homeSidebar.recentProjectActions")}
              data-action-ui-id="home-sidebar-recent-more"
              className={cn$2(
                "icon-sidebar-action-control flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:outline-none",
                menuOpen &&
                  "bg-[var(--home-sidebar-nav-active)] hover:bg-[var(--home-sidebar-nav-active)]",
              )}
            >
              <MonochromeIcon tone="control">
                <MoreVerticalIcon size={14} />
              </MonochromeIcon>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              side="bottom"
              sideOffset={2}
              finalFocus={false}
              className="[&_[data-slot=dropdown-menu-item]>svg:first-child]:mx-px [&_[data-slot=dropdown-menu-sub-trigger]>span>svg:first-child]:mx-px"
              data-action-ui-id="home-sidebar.recent-actions-menu"
              data-global-sidebar-hover-region="true"
              onPointerEnter={onPreviewInteractionEnter}
              onPointerLeave={onPreviewInteractionLeave}
            >
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  renameAfterMenuCloseRef.current = true;
                  setRenameMenuHandoff(true);
                  handleMenuOpenChange(false);
                }}
              >
                <StrokeIcon icon={PencilIcon} size={14} />
                {t2("common.rename")}
              </DropdownMenuItem>
              <AddToProjectSubMenu
                useStrokeSpec={true}
                projects={projects}
                currentProjectId={currentProject?.id}
                onSelect={(projectId) => {
                  setMenuOpen(false);
                  onAddToProject(workspace.path, projectId);
                }}
              />
              {currentProject ? (
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onRemoveFromProject(workspace.path);
                  }}
                  data-action-ui-id="home-sidebar.recent-remove-from-project"
                >
                  <StrokeIcon icon={FolderX} size={14} />
                  {t2("project.removeFromProject")}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  void handleCopyWorkspacePath();
                }}
              >
                <StrokeIcon icon={Copy} size={14} />
                {t2("fileExplorer.copyPath")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  void handleOpenWorkspacePath();
                }}
              >
                <LocalFolderIcon className="size-4" aria-hidden="true" />
                <PlatformFileManagerLabel os={platform2.app.os} />
              </DropdownMenuItem>
              {onCloseRuntime ? (
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onCloseRuntime();
                  }}
                  data-action-ui-id="home-sidebar.recent-close-runtime"
                >
                  <StrokeIcon icon={CircleX} size={14} />
                  {t2("homeSidebar.closeProject")}
                </DropdownMenuItem>
              ) : null}
              {onDelete ? (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    setDeleting(true);
                  }}
                >
                  <StrokeIcon icon={Trash2} size={14} />
                  {t2("common.delete")}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </li>
      {visibleDetailsOpen && !nativeDetails ? (
        <PopoverContent
          anchor={rowRef}
          side="right"
          align="start"
          sideOffset={HOME_RECENT_DETAILS_SIDE_OFFSET}
          initialFocus={false}
          finalFocus={false}
          className="w-64 gap-0 p-3"
          data-action-ui-id="home-sidebar.recent-details"
          data-global-sidebar-hover-region="true"
          data-side-offset={HOME_RECENT_DETAILS_SIDE_OFFSET}
          onPointerEnter={() => {
            onPreviewInteractionEnter?.();
            clearDetailsTimer();
          }}
          onPointerLeave={() => {
            scheduleDetailsClose();
            onPreviewInteractionLeave?.();
          }}
        >
          <div className="flex min-w-0 items-start gap-3">
            {renameSurface === "details" ? (
              <div className="min-w-0 flex-1">
                <InlineRenameInput
                  initialName={displayName2}
                  placeholder={t2("home.workspace.displayNamePlaceholder")}
                  onConfirm={(name2) => {
                    renameDisplayName(name2);
                    setRenameSurface(null);
                    setDetailsOpen(false);
                  }}
                  onCancel={() => {
                    setRenameSurface(null);
                    setDetailsOpen(false);
                  }}
                />
              </div>
            ) : (
              <p
                data-action-ui-id="home-sidebar.recent-details-name"
                className="min-w-0 flex-1 cursor-text whitespace-normal break-words text-sm font-medium leading-5 text-foreground"
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  clearDetailsTimer();
                  setRenameSurface("details");
                }}
              >
                {displayName2}
              </p>
            )}
            <RecentProjectStatusContent
              variant="details"
              userAction={pendingUserAction}
              userActionLabel={pendingUserActionLabel}
              openedAtLabel={openedAtLabel}
            />
          </div>
          <div
            data-action-ui-id="home-sidebar.recent-details-path"
            className="relative mt-2 flex w-full max-w-full items-center gap-1.5 overflow-hidden rounded-md bg-muted px-1.5 py-1 text-[11px] text-muted-foreground"
          >
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <span
                className="line-clamp-2 min-w-0 whitespace-normal leading-4 [overflow-wrap:anywhere]"
                title={workspace.path}
              >
                {workspace.path}
              </span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 right-0 h-4 w-8 bg-gradient-to-r from-transparent to-muted"
              />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  closeOnClick={false}
                  render={
                    <button
                      type="button"
                      className="icon-sidebar-action-control relative z-10 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
                      aria-label={
                        pathCopied ? t2("common.copiedShort") : t2("fileExplorer.copyPath")
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleCopyWorkspacePath("inline");
                      }}
                      data-action-ui-id="home-sidebar.recent-details-copy-path"
                    />
                  }
                >
                  {pathCopied ? (
                    <MonochromeIcon tone="control">
                      <StrokeIcon icon={Check} size={14} />
                    </MonochromeIcon>
                  ) : (
                    <MonochromeIcon tone="control">
                      <StrokeIcon icon={Copy} size={14} />
                    </MonochromeIcon>
                  )}
                </TooltipTrigger>
                <TooltipContent side="top">
                  {pathCopied ? t2("common.copiedShort") : t2("fileExplorer.copyPath")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {summaryQuery.isPending ? (
            <div
              data-action-ui-id="home-sidebar.recent-details-assets-loading"
              className="mt-2 h-3 w-28 animate-pulse rounded-sm bg-muted"
              aria-hidden="true"
            />
          ) : assetSummaryItems.length > 0 ? (
            <p
              data-action-ui-id="home-sidebar.recent-details-assets"
              className="mt-2 truncate text-[10px] leading-4 text-muted-foreground"
            >
              {assetSummaryItems.map((item, index2) => (
                <span key={item.key}>
                  {index2 > 0 && (
                    <span aria-hidden="true" className="mx-1 text-foreground/25">
                      ｜
                    </span>
                  )}
                  {item.label}
                  {" · "}
                  {item.count}
                </span>
              ))}
            </p>
          ) : null}
        </PopoverContent>
      ) : null}
      <DeleteConfirmDialog
        open={Boolean(onDelete && deleting)}
        name={displayName2}
        onConfirm={() => {
          onDelete?.();
          setDeleting(false);
        }}
        onCancel={() => setDeleting(false)}
      />
    </Popover>
  );
}
export function SidebarReleaseBadge({ compact = false, target, releaseBadge }) {
  if (!target || !releaseBadge) return null;
  if (compact) {
    return releaseBadge.tone === "brand" ? (
      <span
        aria-hidden="true"
        className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-brand-accent ring-1 ring-[var(--topbar-transparent-bg)]"
        data-action-ui-id={`home-sidebar.${target}-release-badge`}
        data-variant="new"
      />
    ) : null;
  }
  if (target === "connectors" && releaseBadge.tone === "brand") {
    return (
      <span
        aria-hidden="true"
        className="home-sidebar-detail size-1.5 shrink-0 rounded-full bg-brand-accent"
        data-action-ui-id="home-sidebar.connectors-release-badge"
        data-variant="new"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn$2(
        "home-sidebar-detail shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
        releaseBadge.tone === "brand"
          ? "bg-brand-accent text-brand-accent-foreground"
          : "bg-muted text-muted-foreground",
      )}
      data-action-ui-id={`home-sidebar.${target}-release-badge`}
      data-variant={releaseBadge.tone === "brand" ? "new" : "beta"}
    >
      {releaseBadge.label}
    </span>
  );
}
function resolveGroupDropPlacement(clientY, headerBottom, rows) {
  if (clientY < headerBottom || rows.length === 0)
    return {
      kind: "end",
    };
  for (const row of rows) {
    if (clientY < row.top + row.height / 2) {
      return {
        kind: "relative",
        anchorPath: row.path,
        position: "before",
      };
    }
    if (clientY <= row.top + row.height) {
      return {
        kind: "relative",
        anchorPath: row.path,
        position: "after",
      };
    }
  }
  return {
    kind: "relative",
    anchorPath: rows[rows.length - 1].path,
    position: "after",
  };
}
function isUnchangedSidebarPosition(paths, sourcePath, anchorPath, position2) {
  const sourceIndex = paths.indexOf(sourcePath);
  const anchorIndex = paths.indexOf(anchorPath);
  if (sourceIndex < 0 || anchorIndex < 0) return true;
  return (
    sourceIndex === anchorIndex ||
    (position2 === "before" && sourceIndex === anchorIndex - 1) ||
    (position2 === "after" && sourceIndex === anchorIndex + 1)
  );
}
export function useSidebarProjectDrag({
  draggedPath,
  draggedProjectId,
  sourceSection,
  sourceProjectId,
  inventory,
  currentInventory,
  projects,
  pinnedProjectIds,
  sortMode,
  caseInsensitive,
  scrollRef,
  onClearDrag,
  onRowOver,
  onRowDrop,
  onProjectReorder,
  onMove,
  onReveal,
  holdPreviewOpen,
  releasePreviewHold,
}) {
  const { t: t2 } = useTranslation();
  const [groupTarget, setGroupTarget] = reactExports.useState(null);
  const [rowTarget, setRowTarget] = reactExports.useState(null);
  const [projectTarget, setProjectTarget] = reactExports.useState(null);
  const [pendingMove, setPendingMove] = reactExports.useState(null);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [completedPath, setCompletedPath] = reactExports.useState(null);
  const submittingRef = reactExports.useRef(false);
  const dragActive = Boolean(draggedPath || draggedProjectId);
  const clearPreview = reactExports.useCallback(() => {
    setGroupTarget(null);
    setRowTarget(null);
    setProjectTarget(null);
  }, []);
  reactExports.useEffect(() => {
    if (!dragActive) clearPreview();
  }, [dragActive, clearPreview]);
  reactExports.useEffect(() => {
    if (!dragActive && !pendingMove) return;
    const token2 = "home-sidebar.project-drag";
    holdPreviewOpen?.(token2);
    return () => releasePreviewHold?.(token2);
  }, [dragActive, pendingMove, holdPreviewOpen, releasePreviewHold]);
  reactExports.useEffect(() => {
    if (!dragActive) return;
    let frame2 = 0;
    let speed = 0;
    const tick = () => {
      if (scrollRef.current && speed) scrollRef.current.scrollTop += speed;
      frame2 = requestAnimationFrame(tick);
    };
    const handleOver = (event) => {
      const scroll = scrollRef.current;
      const rect = scroll?.getBoundingClientRect();
      const target = event.target instanceof Element ? event.target : null;
      if (!rect || !target || !scroll?.contains(target)) {
        speed = 0;
        clearPreview();
        return;
      }
      speed = event.clientY < rect.top + 32 ? -8 : event.clientY > rect.bottom - 32 ? 8 : 0;
      if (!target.closest('[data-action-ui-id="home-sidebar.recent-group"]')) clearPreview();
    };
    document.addEventListener("dragover", handleOver, true);
    frame2 = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener("dragover", handleOver, true);
      cancelAnimationFrame(frame2);
    };
  }, [dragActive, scrollRef, clearPreview]);
  reactExports.useEffect(() => {
    if (!completedPath) return;
    const row = [...(scrollRef.current?.querySelectorAll("[data-workspace-path]") ?? [])].find(
      (element2) => element2.dataset.workspacePath === completedPath,
    );
    row?.scrollIntoView?.({
      block: "nearest",
      behavior: "auto",
    });
    const timeout2 = setTimeout(() => setCompletedPath(null), 1800);
    return () => clearTimeout(timeout2);
  }, [completedPath, scrollRef]);
  const resolveOwner = reactExports.useCallback(
    (path2) => {
      const key2 = projectWorkspaceKey(path2, caseInsensitive);
      const item = currentInventory.find(
        (entry) => projectWorkspaceKey(entry.workspace.path, caseInsensitive) === key2,
      );
      const alias = item?.recentPath && projectWorkspaceKey(item.recentPath, caseInsensitive);
      return (
        projects.find((project2) =>
          project2.workspacePaths.some((candidate) => {
            const candidateKey = projectWorkspaceKey(candidate, caseInsensitive);
            return candidateKey === key2 || candidateKey === alias;
          }),
        )?.id ?? null
      );
    },
    [caseInsensitive, currentInventory, projects],
  );
  const handleGroupDrag = reactExports.useCallback(
    (event, targetId, drop) => {
      event.stopPropagation();
      if (pendingMove || (!draggedPath && !draggedProjectId)) return;
      const group = event.currentTarget;
      const header = group.querySelector('[data-action-ui-id="home-sidebar.recent-group-header"]');
      if (draggedProjectId) {
        clearPreview();
        const headerRect = header?.getBoundingClientRect();
        const sourcePinned = isProjectPinned(draggedProjectId, pinnedProjectIds);
        if (
          !targetId ||
          !headerRect ||
          event.clientY > headerRect.bottom ||
          targetId === draggedProjectId ||
          isProjectPinned(targetId, pinnedProjectIds) !== sourcePinned
        ) {
          event.dataTransfer.dropEffect = "none";
          if (drop) onClearDrag();
          return;
        }
        const position2 =
          event.clientY < headerRect.top + headerRect.height / 2 ? "before" : "after";
        const projectOrder = sourcePinned
          ? pinnedProjectIds.filter((id2) => projects.some((project2) => project2.id === id2))
          : projects
              .filter((project2) => !isProjectPinned(project2.id, pinnedProjectIds))
              .map((project2) => project2.id);
        if (isUnchangedSidebarPosition(projectOrder, draggedProjectId, targetId, position2)) {
          event.dataTransfer.dropEffect = "none";
          if (drop) onClearDrag();
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setProjectTarget({
          id: targetId,
          position: position2,
        });
        if (drop) {
          onProjectReorder(draggedProjectId, targetId, position2);
          clearPreview();
          onClearDrag();
        }
        return;
      }
      if (!draggedPath) return;
      if (sourceSection !== "recent") {
        clearPreview();
        event.dataTransfer.dropEffect = "none";
        if (drop) onClearDrag();
        return;
      }
      const rows = [...group.querySelectorAll("[data-workspace-path]")].map((element2) => ({
        path: element2.dataset.workspacePath ?? "",
        top: element2.getBoundingClientRect().top,
        height: element2.getBoundingClientRect().height,
      }));
      const placement = resolveGroupDropPlacement(
        event.clientY,
        header?.getBoundingClientRect().bottom ?? 0,
        rows,
      );
      clearPreview();
      if (sourceProjectId === targetId) {
        if (
          placement.kind === "end" ||
          isUnchangedSidebarPosition(
            rows.map((row) => row.path),
            draggedPath,
            placement.anchorPath,
            placement.position,
          )
        ) {
          event.dataTransfer.dropEffect = "none";
          if (drop) onClearDrag();
          return;
        }
        setRowTarget({
          path: placement.anchorPath,
          position: placement.position,
        });
        if (drop) onRowDrop(event, placement.anchorPath, "recent", placement.position);
        else onRowOver(event, placement.anchorPath, "recent", placement.position);
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (placement.kind === "end")
        setGroupTarget({
          projectId: targetId,
        });
      else
        setRowTarget({
          path: placement.anchorPath,
          position: placement.position,
        });
      if (!drop) return;
      const item = inventory.find((entry) => entry.workspace.path === draggedPath);
      if (!item) {
        onClearDrag();
        return;
      }
      const anchor =
        placement.kind === "relative"
          ? inventory.find((entry) => entry.workspace.path === placement.anchorPath)
          : void 0;
      const sourceName =
        projects.find((p3) => p3.id === sourceProjectId)?.name ?? t2("project.ungrouped");
      const targetName = projects.find((p3) => p3.id === targetId)?.name ?? t2("project.ungrouped");
      setError(null);
      setPendingMove({
        input: {
          workspacePath: draggedPath,
          expectedSourceProjectId: sourceProjectId,
          targetProjectId: targetId,
          placement,
          visibleWorkspaces: inventory.map((entry) => entry.workspace),
          caseInsensitive,
        },
        summary: {
          workspaceName: workspaceDisplayName(item.workspace),
          sourceName,
          targetName,
          anchorName: anchor ? workspaceDisplayName(anchor.workspace) : void 0,
          position: placement.kind === "relative" ? placement.position : void 0,
          switchToManual: sortMode !== "manual",
        },
      });
      clearPreview();
      onClearDrag();
    },
    [
      pendingMove,
      draggedPath,
      draggedProjectId,
      sourceSection,
      sourceProjectId,
      pinnedProjectIds,
      inventory,
      projects,
      sortMode,
      caseInsensitive,
      t2,
      clearPreview,
      onClearDrag,
      onRowOver,
      onRowDrop,
      onProjectReorder,
    ],
  );
  const handleCancel = reactExports.useCallback(() => {
    if (submittingRef.current) return;
    setPendingMove(null);
    setError(null);
  }, []);
  const handleConfirm = reactExports.useCallback(async () => {
    if (!pendingMove || submittingRef.current) return;
    const { input, summary } = pendingMove;
    const placement = input.placement;
    const hasPath2 = (path2) =>
      currentInventory.some(
        (item) =>
          projectWorkspaceKey(item.workspace.path, caseInsensitive) ===
          projectWorkspaceKey(path2, caseInsensitive),
      );
    if (
      !hasPath2(input.workspacePath) ||
      resolveOwner(input.workspacePath) !== input.expectedSourceProjectId ||
      (input.targetProjectId !== null && !projects.some((p3) => p3.id === input.targetProjectId)) ||
      (placement.kind === "relative" &&
        (!hasPath2(placement.anchorPath) ||
          resolveOwner(placement.anchorPath) !== input.targetProjectId))
    ) {
      setError(t2("project.move.invalid"));
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await onMove(input);
      onReveal(input.targetProjectId);
      setCompletedPath(input.workspacePath);
      setPendingMove(null);
      dedupedToast.success(
        t2("project.move.success", {
          target: summary.targetName,
        }),
      );
    } catch {
      setError(t2("project.move.failed"));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    pendingMove,
    currentInventory,
    caseInsensitive,
    resolveOwner,
    projects,
    onMove,
    onReveal,
    t2,
  ]);
  return {
    groupTarget,
    rowTarget,
    projectTarget,
    pendingMove,
    submitting,
    error,
    completedPath,
    handleGroupDrag,
    handleCancel,
    handleConfirm,
    clearPreview,
    temporaryUngrouped:
      sourceSection === "recent" && draggedPath !== null && sourceProjectId !== null,
    ungroupedKey: UNGROUPED_RECENT_GROUP_KEY,
  };
}
