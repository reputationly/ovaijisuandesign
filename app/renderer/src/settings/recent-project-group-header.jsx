// recent-project-group-header.jsx
import {
  ArrowUpDown,
  ArrowUpRight,
  ChevronDown,
  ChevronRight$1,
  MonochromeIcon,
  Pin,
  Plus,
  reactExports,
  useTranslation,
} from "../vendor.js";
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  cn$2,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import {
  Folder,
  FolderOpen,
  Trash2,
  Users,
} from "../media-editing/package.jsx";
import { ContextMenu } from "../workspace/topbar-state-context.jsx";
import { StrokeIcon } from "../workspace/use-prompt-icon.jsx";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../workspace/context-menu-content.jsx";

function isRecentProjectsSortMode(value) {
  return value === "manual" || value === "recent" || value === "priority";
}

const UNGROUPED_SORT_PREVIEW_HOLD =
  "home-sidebar.recent-group-ungrouped-sort-menu";

function UngroupedSortMenu({
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
          <DropdownMenuLabel>
            {t2("homeSidebar.recentProjectsSortLabel")}
          </DropdownMenuLabel>
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

const HOME_RECENT_GROUP_ACTION_CLASS =
  "icon-sidebar-action-control flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:outline-none";

export function RecentProjectGroupHeader({
  project: project2,
  expanded,
  onToggle,
  ungroupedToggleKey,
  selected: selected2 = false,
  depth: depth2 = 0,
  onNewCreation,
  onOpenDetail,
  onRequestDelete,
  onNewCreationUngrouped,
  onOpenAllUngrouped,
  ungroupedSortMode,
  onUngroupedSortModeChange,
  holdPreviewOpen,
  releasePreviewHold,
  pinned = false,
  onTogglePin,
  draggable = false,
  dragging = false,
  dragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) {
  const { t: t2 } = useTranslation();
  const [contextMenuOpen, setContextMenuOpen] = reactExports.useState(false);
  const label = project2?.name ?? t2("project.ungrouped");
  const projectId = project2?.id;
  const FolderIcon =
    project2?.kind === "team" ? Users : expanded ? FolderOpen : Folder;
  const ChevronToggle = expanded ? ChevronDown : ChevronRight$1;
  const indentPx = 20 + depth2 * 16;
  reactExports.useEffect(() => {
    if (
      !contextMenuOpen ||
      !projectId ||
      !holdPreviewOpen ||
      !releasePreviewHold
    )
      return;
    const token2 = `home-sidebar.recent-group-menu:${projectId}`;
    holdPreviewOpen(token2);
    return () => releasePreviewHold(token2);
  }, [contextMenuOpen, holdPreviewOpen, projectId, releasePreviewHold]);
  const handleToggle = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      if (projectId) onToggle(projectId);
    },
    [onToggle, projectId],
  );
  const handleRowClick = reactExports.useCallback(() => {
    if (projectId) onToggle(projectId);
    else if (ungroupedToggleKey) onToggle(ungroupedToggleKey);
  }, [onToggle, projectId, ungroupedToggleKey]);
  const headerClass = cn$2(
    "group relative isolate flex h-[32px] items-center gap-1 pr-1",
    dragging && "sidebar-drag-source",
    dragOver &&
      `home-sidebar-recent-drag-over home-sidebar-recent-drag-over-${dragOver}`,
    project2
      ? "text-sm text-[var(--home-sidebar-secondary-text)]"
      : "text-[13px] text-[var(--home-sidebar-section-text)]",
    "before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:left-[calc(var(--hover-left)_-_6px)] before:-z-10 before:rounded-md",
    project2
      ? selected2
        ? "before:bg-[var(--home-sidebar-nav-active)] text-foreground"
        : "hover:before:bg-[var(--home-sidebar-nav-hover)]"
      : ungroupedToggleKey &&
          "hover:before:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground",
  );
  const header = (
    <div
      className={headerClass}
      style={{
        paddingLeft: indentPx,
        ["--hover-left"]: `${indentPx}px`,
      }}
      data-action-ui-id="home-sidebar.recent-group-header"
      data-project-id={projectId}
      data-drag-over-position={dragOver}
      data-selected={selected2 ? "true" : "false"}
    >
      {projectId ? (
        <button
          type="button"
          aria-label={expanded ? t2("project.collapse") : t2("project.expand")}
          aria-expanded={expanded}
          data-action-ui-id="home-sidebar.recent-group-toggle"
          className="icon-sidebar-action-control relative z-10 flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:outline-none"
          onClick={handleToggle}
        >
          <MonochromeIcon tone="control">
            <FolderIcon size={16} strokeWidth={1.5} aria-hidden="true" />
          </MonochromeIcon>
        </button>
      ) : null}
      {projectId ? (
        <button
          type="button"
          aria-label={label}
          data-action-ui-id="home-sidebar.recent-group-label"
          className="flex min-w-0 flex-1 items-center gap-1 cursor-pointer text-left group-hover:pr-14 group-has-[:focus-visible]:pr-14"
          onClick={handleRowClick}
        >
          <span className="min-w-0 truncate">{label}</span>
        </button>
      ) : ungroupedToggleKey ? (
        <button
          type="button"
          aria-label={label}
          data-action-ui-id="home-sidebar.recent-group-label"
          className="flex min-w-0 items-center gap-1 cursor-pointer text-left"
          onClick={handleRowClick}
        >
          <span className="min-w-0 truncate">{label}</span>
          <ChevronToggle
            size={14}
            strokeWidth={1.75}
            aria-hidden="true"
            className="shrink-0"
          />
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <span className="min-w-0 truncate">{label}</span>
        </div>
      )}
      {!projectId && ungroupedToggleKey ? (
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {onOpenAllUngrouped ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={t2("home.viewAll")}
                      data-action-ui-id="home-sidebar.recent-group-ungrouped-view-all"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenAllUngrouped();
                      }}
                      className="icon-sidebar-action-control pointer-events-none relative z-10 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity duration-150 hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none group-hover:pointer-events-auto group-hover:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100"
                    >
                      <MonochromeIcon tone="control">
                        <ArrowUpRight
                          size={14}
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </MonochromeIcon>
                    </button>
                  }
                />
                <TooltipContent side="top">{t2("home.viewAll")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
          {ungroupedSortMode && onUngroupedSortModeChange ? (
            <UngroupedSortMenu
              sortMode={ungroupedSortMode}
              onSortModeChange={onUngroupedSortModeChange}
              holdPreviewOpen={holdPreviewOpen}
              releasePreviewHold={releasePreviewHold}
            />
          ) : null}
          {onNewCreationUngrouped ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={t2("project.newCreation")}
                      data-action-ui-id="home-sidebar.recent-group-ungrouped-new-creation"
                      onClick={(event) => {
                        event.stopPropagation();
                        onNewCreationUngrouped();
                      }}
                      className="icon-sidebar-action-control pointer-events-none relative z-10 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity duration-150 hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none group-hover:pointer-events-auto group-hover:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100"
                    >
                      <MonochromeIcon tone="control">
                        <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
                      </MonochromeIcon>
                    </button>
                  }
                />
                <TooltipContent side="top">
                  {t2("project.newCreation")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      ) : null}
      {project2 ? (
        <span
          className={cn$2(
            "pointer-events-none absolute inset-y-0 right-0.5 z-10 flex items-center gap-0.5 rounded-r-md px-1 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100",
          )}
          data-action-ui-id="home-sidebar.recent-group-actions"
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={t2("project.openDetail")}
                    data-action-ui-id="home-sidebar.recent-group-open-detail"
                    className={HOME_RECENT_GROUP_ACTION_CLASS}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenDetail(project2.id);
                    }}
                  />
                }
              >
                <MonochromeIcon tone="control">
                  <ArrowUpRight
                    size={14}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </MonochromeIcon>
              </TooltipTrigger>
              <TooltipContent side="top">
                {t2("project.openDetail")}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={t2("project.newCreation")}
                    data-action-ui-id="home-sidebar.recent-group-new-creation"
                    className={HOME_RECENT_GROUP_ACTION_CLASS}
                    onClick={(event) => {
                      event.stopPropagation();
                      onNewCreation(project2.id);
                    }}
                  />
                }
              >
                <MonochromeIcon tone="control">
                  <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
                </MonochromeIcon>
              </TooltipTrigger>
              <TooltipContent side="top">
                {t2("project.newCreation")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      ) : null}
    </div>
  );
  if (!project2) {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: drag-only drop zone; the header inside owns the click and menu affordances.
      <div role="presentation" onDragOver={onDragOver} onDrop={onDrop}>
        {header}
      </div>
    );
  }
  return (
    <ContextMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
      <ContextMenuTrigger
        render={
          // biome-ignore lint/a11y/noStaticElementInteractions: drag-only wrapper; the header inside owns the click and menu affordances.
          <div
            role="presentation"
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            {header}
          </div>
        }
      />
      <ContextMenuContent
        data-action-ui-id="home-sidebar.recent-group-menu"
        data-global-sidebar-hover-region="true"
      >
        <ContextMenuItem onClick={() => onNewCreation(project2.id)}>
          <StrokeIcon icon={Plus} size={14} />
          {t2("project.newCreation")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onOpenDetail(project2.id)}>
          <StrokeIcon icon={ArrowUpRight} size={14} />
          {t2("project.openDetail")}
        </ContextMenuItem>
        {onTogglePin ? (
          <ContextMenuItem onClick={onTogglePin}>
            <StrokeIcon icon={Pin} size={14} />
            {pinned ? t2("session.unpin") : t2("session.pin")}
          </ContextMenuItem>
        ) : null}
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          data-action-ui-id="home-sidebar.recent-group-delete"
          onClick={() => {
            setContextMenuOpen(false);
            onRequestDelete(project2);
          }}
        >
          <StrokeIcon icon={Trash2} size={14} />
          {t2("project.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
