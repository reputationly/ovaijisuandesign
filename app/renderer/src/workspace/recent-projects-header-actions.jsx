// recent-projects-header-actions.jsx
import {
  ArrowUpDown,
  MonochromeIcon,
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
  cn$2 as cn,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { DropdownMenuSeparator } from "./shortcut-hint.jsx";
import { CreateProjectMenuContent } from "../infra/inline-rename-input.jsx";
function isRecentProjectsSortMode(value) {
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
      <DropdownMenu
        modal={false}
        open={sortMenuOpen}
        onOpenChange={setSortMenuOpen}
      >
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
                    <ArrowUpDown
                      size={14}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
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
            <DropdownMenuLabel>
              {t2("homeSidebar.recentProjectsGroupLabel")}
            </DropdownMenuLabel>
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
                    className={cn(
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
                  className={cn(
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
