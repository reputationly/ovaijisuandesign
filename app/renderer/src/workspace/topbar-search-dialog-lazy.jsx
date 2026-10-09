// topbar-search-dialog-lazy.jsx
import { jsxRuntimeExports, useTranslation, reactExports, useNavigate, dedupedToast, usePlatform, useStorage, MonochromeIcon } from "../vendor.js";
import { buildWorkspaceSearch } from "./create-visible-preview-tabs-store.js";
import { GLOBAL_SIDEBAR_RAIL_WIDTH } from "./global-sidebar-provider.jsx";
import { Tooltip, TooltipTrigger, DropdownMenu, TooltipProvider } from "../vendor-inline/vscode-base/graph.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { useTopbarState, useTopbarActions, useWorkspaceFocusNavigation } from "./use-hub-logo-hover-animation.jsx";
import { workspaceDisplayName } from "../generation/use-resizable-width.js";
import { useProjectStore } from "./workspace-events.js";
import {
  TooltipContent,
  cn$2,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import { ShortcutHint, DropdownMenuSeparator } from "./shortcut-categories.jsx";
import { trackEvent } from "../infra/init-track.js";
import { useWindowChrome } from "./use-coach-mark.jsx";
import { useOptionalSettingsDialog, useProjectActions } from "../settings/custom-provider-form.jsx";
import { useNewWorkspaceDialog } from "./use-new-workspace-dialog.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { SidebarReleaseBadge } from "./recent-project-row.jsx";
import { OPEN_GLOBAL_SEARCH_EVENT } from "./use-native-project-preview.jsx";
import {
  HOME_NAV_ACTIVE_CLASS,
  HOME_NAV_BUTTON_CLASS,
  HOME_NAV_HOVER_CLASS,
  HOME_NAV_ICON_SIZE,
  HOME_NAV_ICON_SLOT_CLASS,
  HOME_NAV_INACTIVE_TEXT_CLASS,
  HOME_NAV_PILL_CLASS,
  HOME_RAIL_PILL_CLASS,
  HOME_RAIL_TOOLTIP_DELAY_MS,
} from "../settings/use-network-diagnostics.jsx";
export function SidebarNavButton({ item, active: active2, onClick, compact = false }) {
  const {
    icon: Icon2,
    iconClassName,
    iconSize = HOME_NAV_ICON_SIZE,
    label,
    to,
    disabled: disabled2,
    tooltip,
    badgeTarget,
    releaseBadge,
  } = item;
  const accessibleLabel = releaseBadge ? `${label}, ${releaseBadge.label}` : label;
  const button = (
    <button
      type="button"
      aria-label={compact || releaseBadge ? accessibleLabel : void 0}
      aria-current={active2 ? "page" : void 0}
      data-icon-disabled={disabled2 || void 0}
      data-action-ui-id={`home-sidebar-nav-${to.replace(/^\//, "") || "home"}`}
      onClick={disabled2 ? void 0 : () => onClick(to)}
      className={cn$2(
        HOME_NAV_BUTTON_CLASS,
        to !== "/" && "icon-sidebar-nav-control",
        disabled2
          ? "text-muted-foreground/30 cursor-not-allowed"
          : active2
            ? "text-foreground"
            : HOME_NAV_INACTIVE_TEXT_CLASS,
      )}
    >
      <span
        className={cn$2(
          HOME_NAV_PILL_CLASS,
          compact && HOME_RAIL_PILL_CLASS,
          !disabled2 && (active2 ? HOME_NAV_ACTIVE_CLASS : HOME_NAV_HOVER_CLASS),
        )}
      >
        {to === "/asset-center" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0"
            data-action-ui-id="home-sidebar-nav-asset-center-coachmark-anchor"
            data-presentation={compact ? "rail" : "full"}
            style={{
              width: compact ? GLOBAL_SIDEBAR_RAIL_WIDTH : "100%",
            }}
          />
        ) : null}
        <span
          className={cn$2(HOME_NAV_ICON_SLOT_CLASS, "relative", iconClassName)}
          data-action-ui-id="home-sidebar.nav-icon-slot"
        >
          {to === "/" ? (
            <Icon2 aria-hidden={true} size={iconSize} strokeWidth={1.5} />
          ) : (
            <MonochromeIcon tone="control">
              <Icon2 aria-hidden={true} size={iconSize} strokeWidth={1.5} />
            </MonochromeIcon>
          )}
          {compact && (
            <SidebarReleaseBadge compact={true} target={badgeTarget} releaseBadge={releaseBadge} />
          )}
        </span>
        <span className="home-sidebar-detail truncate leading-[normal]">{label}</span>
        {!compact ? <SidebarReleaseBadge target={badgeTarget} releaseBadge={releaseBadge} /> : null}
      </span>
    </button>
  );
  return (
    <TooltipProvider delay={HOME_RAIL_TOOLTIP_DELAY_MS}>
      <Tooltip>
        <TooltipTrigger render={button} />
        {(disabled2 && tooltip) || compact ? (
          <TooltipContent side="right">{tooltip ?? accessibleLabel}</TooltipContent>
        ) : null}
      </Tooltip>
    </TooltipProvider>
  );
}
function HomeMenuButton() {
  const { t: t2, i18n } = useTranslation();
  const { isWindowsTitlebarOverlay } = useWindowChrome();
  const [openGroup, setOpenGroup] = reactExports.useState(null);
  if (!isWindowsTitlebarOverlay) return null;
  const lang = i18n.language?.startsWith("zh") ? "zh" : "en";
  const label = (key2, fallbackKey) => t2(key2, FALLBACK_LABELS[lang][fallbackKey]);
  const dispatch2 = (action) => {
    setOpenGroup(null);
    void window.hilo.menu.trigger(action);
  };
  return (
    <nav
      aria-label={label("topbar.menu", "menu")}
      className="no-drag flex h-full items-center gap-0.5"
      data-action-ui-id="topbar.home-menu"
    >
      {GROUPS.map((group) => (
        <DropdownMenu
          key={group.id}
          open={openGroup === group.id}
          onOpenChange={(open) => setOpenGroup(open ? group.id : null)}
        >
          <DropdownMenuTrigger
            type="button"
            data-action-ui-id={`topbar.home-menu.${group.id}`}
            className="flex h-7 items-center rounded-[10px] px-2 text-xs text-foreground/70 transition-colors hover:bg-[var(--topbar-tab-inactive-bg-hover)] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 data-[popup-open]:bg-[var(--topbar-tab-inactive-bg-hover)] data-[popup-open]:text-foreground"
          >
            {label(`topbar.menu.${group.id}`, group.id)}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={2} className="min-w-[220px]">
            {group.items.map((item, idx) =>
              item.kind === "separator" ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: items are static, order stable
                <DropdownMenuSeparator key={`sep-${group.id}-${idx}`} className="my-0.5" />
              ) : (
                <DropdownMenuItem
                  key={item.action}
                  onClick={() => dispatch2(item.action)}
                  data-action-ui-id={`topbar.home-menu.${item.action}`}
                >
                  <span className="flex-1">{label(`topbar.menu.${item.key}`, item.key)}</span>
                  {item.accelerator && (
                    <ShortcutHint
                      accelerator={item.accelerator}
                      os="win32"
                      variant="plain"
                      className="inline-flex h-5 min-w-8 items-center justify-center rounded-sm bg-muted px-1.5 font-sans text-xs font-normal tracking-wide text-muted-foreground"
                    />
                  )}
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </nav>
  );
}
const GROUPS = [
  {
    id: "file",
    items: [
      {
        kind: "item",
        action: "new-chat",
        key: "newChat",
        accelerator: "Ctrl+N",
      },
      {
        kind: "item",
        action: "new-window",
        key: "newWindow",
        accelerator: "Ctrl+Shift+N",
      },
      {
        kind: "separator",
      },
      {
        kind: "item",
        action: "import-project",
        key: "importProject",
      },
      {
        kind: "item",
        action: "export-project",
        key: "exportProject",
      },
      {
        kind: "separator",
      },
      {
        kind: "item",
        action: "close-tab",
        key: "closeTab",
        accelerator: "Ctrl+W",
      },
      {
        kind: "separator",
      },
      {
        kind: "item",
        action: "open-settings",
        key: "settings",
        accelerator: "Ctrl+,",
      },
      {
        kind: "item",
        action: "quit",
        key: "quit",
      },
    ],
  },
  {
    id: "window",
    items: [
      {
        kind: "item",
        action: "minimize",
        key: "minimize",
      },
      {
        kind: "item",
        action: "toggle-fullscreen",
        key: "toggleFullscreen",
        accelerator: "F11",
      },
      {
        kind: "separator",
      },
      {
        kind: "item",
        action: "reload",
        key: "reload",
        accelerator: "Ctrl+R",
      },
    ],
  },
  {
    id: "help",
    items: [
      {
        kind: "item",
        action: "check-for-updates",
        key: "checkForUpdates",
      },
      {
        kind: "separator",
      },
      {
        kind: "item",
        action: "open-logs-folder",
        key: "openLogsFolder",
      },
      {
        kind: "item",
        action: "export-logs",
        key: "exportLogs",
      },
      {
        kind: "item",
        action: "upload-logs",
        key: "uploadLogs",
      },
      {
        kind: "separator",
      },
      {
        kind: "item",
        action: "feedback",
        key: "feedback",
      },
      {
        kind: "item",
        action: "documentation",
        key: "documentation",
      },
    ],
  },
];
const FALLBACK_LABELS = {
  zh: {
    menu: "菜单",
    file: "文件",
    window: "窗口",
    help: "帮助",
    newChat: "开始创作",
    newWindow: "新建窗口",
    importProject: "导入项目",
    exportProject: "导出当前项目",
    closeTab: "关闭标签页",
    settings: "设置",
    quit: "退出",
    minimize: "最小化",
    toggleFullscreen: "切换全屏",
    reload: "重新加载",
    checkForUpdates: "检查更新",
    openLogsFolder: "打开日志文件夹",
    exportLogs: "导出日志",
    uploadLogs: "上传日志",
    feedback: "问题反馈",
    documentation: "文档",
  },
  en: {
    menu: "Menu",
    file: "File",
    window: "Window",
    help: "Help",
    newChat: "Start Creating",
    newWindow: "New Window",
    importProject: "Import Project",
    exportProject: "Export Current Project",
    closeTab: "Close Tab",
    settings: "Settings",
    quit: "Quit",
    minimize: "Minimize",
    toggleFullscreen: "Toggle Full Screen",
    reload: "Reload",
    checkForUpdates: "Check for Updates",
    openLogsFolder: "Open Logs Folder",
    exportLogs: "Export Logs",
    uploadLogs: "Upload Logs",
    feedback: "Feedback",
    documentation: "Documentation",
  },
};
const WINDOW_APP_CONTROLS_MIN_INSET = 0;
export function Topbar({ onFullScreenChange, onAppControlsInsetChange } = {}) {
  return (
    <TopbarContent
      onFullScreenChange={onFullScreenChange}
      onAppControlsInsetChange={onAppControlsInsetChange}
    />
  );
}
function TopbarContent({ onFullScreenChange, onAppControlsInsetChange }) {
  const platform2 = usePlatform();
  const { hasReservedTitlebar, isCustomChrome, needsDragRegion, titlebarHeight } =
    useWindowChrome();
  const [searchOpen, setSearchOpen] = reactExports.useState(false);
  const [isFullscreen, setIsFullscreen] = reactExports.useState(false);
  reactExports.useEffect(() => {
    onAppControlsInsetChange?.(WINDOW_APP_CONTROLS_MIN_INSET);
  }, [onAppControlsInsetChange]);
  const openSearch = reactExports.useCallback((source) => {
    trackEvent(TRACK_EVENTS.TOPBAR_SEARCH_OPEN, {
      source,
    });
    setSearchOpen(true);
  }, []);
  reactExports.useEffect(() => {
    if (!isCustomChrome) return;
    let timer2 = null;
    let disposed = false;
    let eventRevision = 0;
    let queryRevision = 0;
    const applyFullScreen = (next2) => {
      if (disposed) return;
      setIsFullscreen(next2);
      onFullScreenChange?.(next2);
    };
    const check = () => {
      const requestRevision = ++queryRevision;
      const eventRevisionAtRequest = eventRevision;
      platform2.window
        .isFullScreen()
        .then((next2) => {
          if (requestRevision !== queryRevision || eventRevisionAtRequest !== eventRevision) {
            return;
          }
          applyFullScreen(next2);
        })
        .catch(() => {});
    };
    check();
    const unsubscribe = platform2.window.onFullScreenChange?.((next2) => {
      eventRevision += 1;
      queryRevision += 1;
      applyFullScreen(next2);
    });
    const onResize = () => {
      if (timer2) clearTimeout(timer2);
      timer2 = setTimeout(check, 300);
    };
    window.addEventListener("resize", onResize);
    return () => {
      disposed = true;
      queryRevision += 1;
      unsubscribe?.();
      window.removeEventListener("resize", onResize);
      if (timer2) clearTimeout(timer2);
    };
  }, [isCustomChrome, onFullScreenChange, platform2.window]);
  reactExports.useEffect(() => {
    const handler = (e2) => {
      const mod = e2.metaKey || e2.ctrlKey;
      if (!mod || e2.key !== "k") return;
      e2.preventDefault();
      openSearch("keyboard");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openSearch]);
  reactExports.useEffect(() => {
    const handleOpenRequest = () => openSearch("button");
    window.addEventListener(OPEN_GLOBAL_SEARCH_EVENT, handleOpenRequest);
    return () => window.removeEventListener(OPEN_GLOBAL_SEARCH_EVENT, handleOpenRequest);
  }, [openSearch]);
  return (
    <>
      <header
        className={
          hasReservedTitlebar
            ? "transparent-window-topbar relative z-40 shrink-0 select-none"
            : "pointer-events-none fixed inset-x-0 top-0 z-40 h-10 select-none"
        }
        data-layout-slot={hasReservedTitlebar ? "window-titlebar" : "window-chrome-overlay"}
        data-titlebar-reserved={hasReservedTitlebar ? "true" : "false"}
        style={
          hasReservedTitlebar
            ? {
                height: isFullscreen ? 0 : titlebarHeight,
                WebkitAppRegion: needsDragRegion ? "drag" : void 0,
              }
            : void 0
        }
      >
        {hasReservedTitlebar && !isFullscreen ? (
          <div
            className="drag-region flex h-full items-center gap-1.5 pr-2 pl-[var(--window-leading-content-inset)] text-xs text-[var(--topbar-transparent-muted-foreground)]"
            data-layout-slot="window-titlebar-drag-region"
            data-window-controls-overlay-layout="adaptive"
            style={{
              // Chromium exposes the usable titlebar rectangle after native
              // caption buttons are laid out. The fallback keeps older
              // Electron builds safe without hard-coding the primary path.
              width: "env(titlebar-area-width, calc(100% - 144px))",
              marginLeft: "env(titlebar-area-x, 0px)",
              height: "env(titlebar-area-height, 100%)",
            }}
          >
            <span className="shrink-0">MiniMax Design</span>
            <HomeMenuButton />
          </div>
        ) : null}
      </header>
      <TopbarSearchDialogLazy open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
const LazyGlobalSearchDialog = reactExports.lazy(() =>
  (() => import("../global-search/index.jsx"))().then((m3) => ({
    default: m3.GlobalSearchDialog,
  })),
);
function TopbarSearchDialogLazy({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { t: t2 } = useTranslation();
  const { searchWorkspaces, currentWorkspaceId } = useTopbarState();
  const { activateWorkspace, createWorkspace, openWorkspaceFromDialog } = useTopbarActions();
  const { requestOpen: requestNewProject } = useNewWorkspaceDialog(createWorkspace);
  const { shell } = usePlatform();
  const settingsDialog = useOptionalSettingsDialog();
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const { allProjects, hiddenProjectIds } = useProjectStore();
  const { restoreProjectVisibility } = useProjectActions();
  const { navigateAndFocusCanvas, navigateAndFocusSession } = useWorkspaceFocusNavigation(
    currentWorkspaceId,
    activateWorkspace,
  );
  if (!open) return null;
  const openWorkspaceFile = (result) => {
    if (!result.workspaceId || !result.workspacePath) return;
    activateWorkspace(result.workspaceId);
    const relativePath = result.data.path;
    if (!relativePath) return;
    const normalized = relativePath.replace(/^[/\\]+/, "");
    const absolutePath = `${result.workspacePath.replace(/[/\\]+$/, "")}/${normalized}`;
    void shell.openPath?.(absolutePath);
  };
  const openedWorkspaceByPath = new Map(
    searchWorkspaces.map((workspace) => [workspace.folderPath, workspace]),
  );
  const recentSearchWorkspaces = recentWorkspaces.map((workspace) => {
    const opened = openedWorkspaceByPath.get(workspace.path);
    return {
      workspaceId: opened?.workspaceId,
      workspaceName: opened?.workspaceName ?? workspaceDisplayName(workspace),
      folderPath: workspace.path,
      openedAt: workspace.openedAt,
    };
  });
  const executeSearchAction = (result) => {
    const action = result.action;
    if (!action) return;
    switch (action.type) {
      case "project":
        if (action.workspaceId) {
          activateWorkspace(action.workspaceId);
        } else {
          createWorkspace(void 0, {
            folderPath: action.folderPath,
            loadUserMemory: true,
          });
        }
        break;
      case "open-project":
        if (!hiddenProjectIds.includes(action.projectId)) {
          void navigate({
            to: "/projects/$projectId",
            params: {
              projectId: action.projectId,
            },
          });
          break;
        }
        return restoreProjectVisibility(action.projectId).then((restored) => {
          if (!restored) {
            dedupedToast.error(t2("project.restore.failed"));
            return false;
          }
          void navigate({
            to: "/projects/$projectId",
            params: {
              projectId: action.projectId,
            },
          });
          return true;
        });
      case "route":
        if (action.target === "projects")
          void navigate({
            to: "/projects",
          });
        if (action.target === "asset-center")
          void navigate({
            to: "/asset-center",
          });
        if (action.target === "changelog")
          void navigate({
            to: "/changelog",
          });
        if (action.target === "skills-community") {
          void navigate({
            to: "/skills",
            search: {
              tab: "community",
            },
          });
        }
        if (action.target === "skills-plugins") {
          void navigate({
            to: "/skills",
            search: {
              tab: "plugins",
            },
          });
        }
        if (action.target === "skills-mine-skills") {
          void navigate({
            to: "/skills",
            search: {
              tab: "mine",
              subTab: "skills",
            },
          });
        }
        if (action.target === "skills-mine-plugins") {
          void navigate({
            to: "/skills",
            search: {
              tab: "mine",
              subTab: "plugins",
            },
          });
        }
        break;
      case "settings":
        settingsDialog?.openSettings(action.section);
        break;
      case "new-session":
        if (!currentWorkspaceId) return;
        void navigate({
          to: "/workspace",
          search: buildWorkspaceSearch(currentWorkspaceId, {
            menuAction: "new-chat",
          }),
        });
        break;
      case "new-project":
        onOpenChange(false);
        requestNewProject();
        break;
      case "open-workspace-dialog":
        openWorkspaceFromDialog();
        break;
    }
  };
  return (
    <reactExports.Suspense fallback={null}>
      <LazyGlobalSearchDialog
        open={open}
        onOpenChange={onOpenChange}
        workspaces={searchWorkspaces}
        recentWorkspaces={recentSearchWorkspaces}
        projects={allProjects}
        currentWorkspaceId={currentWorkspaceId}
        onNavigateFile={openWorkspaceFile}
        onNavigateCanvasNode={(result) => {
          const nodeId = result.data.id;
          if (!nodeId || !result.workspaceId) return;
          navigateAndFocusCanvas(result.workspaceId, nodeId);
        }}
        onNavigateSession={(result) => {
          const sessionId = result.data.id;
          if (!sessionId || !result.workspaceId) return;
          navigateAndFocusSession(result.workspaceId, sessionId);
        }}
        onExecuteAction={executeSearchAction}
      />
    </reactExports.Suspense>
  );
}
