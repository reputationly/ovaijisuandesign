// topbar-search-dialog-lazy.jsx
import {
  AuthContext,
  buildRendererDiagnosticsSnapshot,
  hideVisiblePreviewTabs,
  requestWorkspaceRuntimeClose,
} from "../assets/credit-query-keys.jsx";
import { AlertTriangle, API_PATHS, clientExports, createFileRoute, createRootRoute, jsxRuntimeExports, lazyRouteComponent, reactExports, redirect, useGatewayScope, useNavigate, usePlatform, useQueryClient, useStorage, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  DATA_DIRECTORY_STATUS_CHANGED_EVENT,
  getDataDirectoryMainService,
} from "../settings/get-data-directory-main-service.js";
import { useOptionalSettingsDialog } from "../settings/persist-visible-workspace-manual-order.js";
import {
  actionTrailLog,
  DropdownMenu,
  services,
  TooltipProvider,
} from "../vendor-inline/vscode-base/graph.jsx";
import { IHiloApp } from "../settings/parse-custom-mcp-arguments.js";
import {
  useGatewayReadiness,
  useGatewayReady,
} from "../infra/inline-rename-input.jsx";
import {
  Router,
  useLocation,
  useRouterState,
} from "../vendor-inline/vscode-base/linked-list.js";
import {
  buildWorkspaceSearch,
  canUseDebugTooling,
  DEBUG_FLAGS,
  getNextPreviewTabIdAfterHide,
  useDebugFlag,
  useDeepLinkRouter,
} from "./use-deep-link-router.js";
import {
  useTopbarActions,
  useTopbarState,
  workspaceEvents,
} from "./topbar-state-context.jsx";
import { useWorkspaceFocusNavigation } from "./use-workspace-focus-navigation.js";
import {
  useGatewayFetch,
  useModelCatalogScopeKey,
  workspaceDisplayName,
} from "../generation/use-model-catalog-scope-key.js";
import { useProjectStore } from "./normalize-project-entries.js";
import { useProjectActions } from "../settings/use-project-actions.js";
import {
  showSkillInstallSuccessToast,
  trackSkillInstallEvent,
  trackSkillInstallFailed,
  useNewWorkspaceDialog,
} from "./use-new-workspace-dialog.jsx";
import { GROUPS } from "./groups.js";
import {
  cn$2 as cn,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../infra/dialog-content.jsx";
import { DropdownMenuSeparator, ShortcutHint } from "./shortcut-hint.jsx";
import { OfflineBanner, useWindowChrome } from "./offline-banner.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { OPEN_GLOBAL_SEARCH_EVENT } from "./move-workspace-dialog.jsx";
import {
  acknowledgeHomeDraftHandoff,
  useGlobalSidebar,
} from "../media-editing/derive-session-task-snapshot.jsx";
import { normalizeWorkspaceId } from "../settings/use-active-runtime.js";
import { RetainedWorkspaceRuntimeHost } from "./retained-workspace-runtime-host.jsx";
import { WorkspaceInitialPayloadCache } from "../settings/workspace-initial-payload-cache.js";
import { GlobalSidebarSurface } from "../infra/global-sidebar-surface.jsx";
import { GatewayScopeProvider } from "../assets/gateway-scope-provider.jsx";
import { HomeWidgetHost } from "./home-widget-host.jsx";
import { AssetCenterRelocationCoachMark } from "../assets/asset-center-relocation-coach-mark.jsx";
import { useSettings } from "../settings/use-settings.js";
import { GlobalSidebarProvider } from "./global-sidebar-provider.jsx";
import { Outlet } from "../infra/match-view.jsx";
import { AppProviders } from "../settings/server-driven-popup-orchestrator.jsx";
import { useTrackPageView } from "../i18n/canvas-node-tools.jsx";
import { ProjectInvitePrompt } from "./project-invite-prompt.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { IPC_CHANNELS, recordAction } from "../infra/gateway-http-error.jsx";
import { showVisiblePreviewTab } from "./show-visible-preview-tab.js";
import { OPEN_NEW_WORKSPACE_DIALOG_EVENT } from "./tool-label-definitions.js";
import { homeService } from "./home-service.jsx";
import { ComfyUiDownloadProgressHost } from "./comfy-ui-download-progress-host.jsx";
import { RouterProvider } from "../infra/transitioner.jsx";
import { getStartupVisiblePreviewWorkspace } from "../infra/select-startup-visible-preview-workspace.js";
import {
  ErrorBoundary,
  getVisiblePreviewTabIds,
} from "../infra/error-boundary.jsx";
import { Toaster2 } from "../settings/attach-native-toast-surface.jsx";
function recordNavigation(path2, data2) {
  actionTrailLog.info(`navigate: ${path2}`, data2);
}
function reportRendererReady(hiloApp2) {
  return Promise.resolve(
    hiloApp2.updateRendererDiagnosticsSnapshot({
      ...buildRendererDiagnosticsSnapshot(),
      rendererReady: true,
    }),
  );
}
const IDLE_MS = 600;
function installScrollbarVisibility(doc2 = document) {
  const timers = new Map();
  doc2.documentElement.setAttribute("data-auto-hide-scrollbars", "");
  const onScroll = (event) => {
    const target = event.target === doc2 ? doc2.scrollingElement : event.target;
    if (!(target instanceof Element)) return;
    clearTimeout(timers.get(target));
    target.setAttribute("data-scroll-active", "");
    timers.set(
      target,
      setTimeout(() => {
        target.removeAttribute("data-scroll-active");
        timers.delete(target);
      }, IDLE_MS),
    );
  };
  doc2.addEventListener("scroll", onScroll, {
    capture: true,
    passive: true,
  });
  return () => {
    doc2.removeEventListener("scroll", onScroll, true);
    doc2.documentElement.removeAttribute("data-auto-hide-scrollbars");
    for (const [element2, timer2] of timers) {
      clearTimeout(timer2);
      element2.removeAttribute("data-scroll-active");
    }
    timers.clear();
  };
}
var createRouter = (options) => {
  return new Router(options);
};
const $$splitComponentImporter$c = () =>
  (() => import("../_home-COqe4OG7.js"))();
const Route$d = createFileRoute("/_home")({
  component: lazyRouteComponent($$splitComponentImporter$c, "component"),
});
const $$splitComponentImporter$b = () =>
  (() => import("../_app-BYKdG-ns.js"))();
const Route$c = createFileRoute("/_app")({
  component: lazyRouteComponent($$splitComponentImporter$b, "component"),
});
const $$splitComponentImporter$a = () => (() => import("../home/index.jsx"))();
const Route$b = createFileRoute("/_home/")({
  component: lazyRouteComponent($$splitComponentImporter$a, "component"),
});
const $$splitComponentImporter$9 = () =>
  (() => import("../workflows/index.jsx"))();
const Route$a = createFileRoute("/_home/workflows/")({
  component: lazyRouteComponent($$splitComponentImporter$9, "component"),
  validateSearch: (search2) => ({
    tab:
      search2.tab === "mine"
        ? "mine"
        : search2.tab === "official"
          ? "official"
          : void 0,
  }),
});
const Route = createFileRoute("/_home/skill-community/")({
  validateSearch: (search2) => ({
    ...(search2.capability === "skills" || search2.capability === "connectors"
      ? {
          capability: search2.capability,
        }
      : {}),
    ...(search2.tab === "community" ||
    search2.tab === "plugins" ||
    search2.tab === "mine"
      ? {
          tab: search2.tab,
        }
      : {}),
    ...(search2.subTab === "skills" || search2.subTab === "plugins"
      ? {
          subTab: search2.subTab,
        }
      : {}),
    ...(typeof search2.pluginId === "string"
      ? {
          pluginId: search2.pluginId,
        }
      : {}),
  }),
  beforeLoad: ({ search: search2 }) => {
    throw redirect({
      to: "/skills",
      search: search2,
    });
  },
});
function parseProjectListSearch(search2) {
  return {
    kind: search2.kind === "team" ? "team" : "local",
  };
}
const $$splitComponentImporter$8 = () =>
  (() => import("../projects/index.jsx"))();
const Route$8 = createFileRoute("/_home/projects/")({
  validateSearch: parseProjectListSearch,
  component: lazyRouteComponent($$splitComponentImporter$8, "component"),
});
const $$splitComponentImporter$7 = () =>
  (() => import("../creations/index.jsx"))();
const Route$7 = createFileRoute("/_home/creations/")({
  component: lazyRouteComponent($$splitComponentImporter$7, "component"),
});
const $$splitComponentImporter$6 = () =>
  (() => import("../changelog/index.jsx"))();
const Route$6 = createFileRoute("/_home/changelog/")({
  component: lazyRouteComponent($$splitComponentImporter$6, "component"),
  validateSearch: (search2) => ({
    targetId: typeof search2.targetId === "string" ? search2.targetId : void 0,
    source:
      search2.source === "home_top_whats_new" ? "home_top_whats_new" : void 0,
  }),
});
const $$splitComponentImporter$5 = () =>
  (() => import("../index-DRApim0M.js"))();
function validateAssetCenterSearch(search2) {
  const result = {};
  if (search2.action === "create") result.action = "create";
  const returnWorkspaceId = normalizeWorkspaceId(search2.returnWorkspaceId);
  if (returnWorkspaceId) result.returnWorkspaceId = returnWorkspaceId;
  return result;
}
const Route$5 = createFileRoute("/_home/asset-center/")({
  component: lazyRouteComponent($$splitComponentImporter$5, "component"),
  validateSearch: validateAssetCenterSearch,
});
const $$splitComponentImporter$4 = () =>
  (() => import("../index-HL7p23h1.js"))();
function parseInitialAttachments(value) {
  if (Array.isArray(value) && value.every((v2) => typeof v2 === "string")) {
    return value;
  }
  if (typeof value !== "string") return void 0;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((v2) => typeof v2 === "string"))
      return parsed;
  } catch {}
  return void 0;
}
function parseInitialSelectedMediaModels(value) {
  let raw2 = value;
  if (typeof value === "string") {
    try {
      raw2 = JSON.parse(value);
    } catch {
      return void 0;
    }
  }
  if (!raw2 || typeof raw2 !== "object" || Array.isArray(raw2)) return void 0;
  const obj = raw2;
  const pick = (key2) => {
    const list2 = obj[key2];
    if (list2 === void 0) return void 0;
    if (Array.isArray(list2) && list2.every((id2) => typeof id2 === "string"))
      return list2;
    return void 0;
  };
  const result = {};
  const image2 = pick("image");
  const video = pick("video");
  const audio = pick("audio");
  if (image2 !== void 0) result.image = image2;
  if (video !== void 0) result.video = video;
  if (audio !== void 0) result.audio = audio;
  return result;
}
const Route$4 = createFileRoute("/_app/workspace/")({
  validateSearch: (search2) => ({
    workspaceId: normalizeWorkspaceId(search2.workspaceId),
    initialPayloadId:
      typeof search2.initialPayloadId === "string"
        ? search2.initialPayloadId
        : void 0,
    initialMessage:
      search2.initialMessage != null ? String(search2.initialMessage) : void 0,
    initialAttachments: parseInitialAttachments(search2.initialAttachments),
    initialEntityRefs: parseInitialAttachments(search2.initialEntityRefs),
    initialModelId:
      typeof search2.initialModelId === "string"
        ? search2.initialModelId
        : void 0,
    initialSelectedMediaModels: parseInitialSelectedMediaModels(
      search2.initialSelectedMediaModels,
    ),
    skillPrompt:
      typeof search2.skillPrompt === "string" ? search2.skillPrompt : void 0,
    skillName:
      typeof search2.skillName === "string" ? search2.skillName : void 0,
    pluginId: typeof search2.pluginId === "string" ? search2.pluginId : void 0,
    initialComfyUiWorkflowId:
      typeof search2.initialComfyUiWorkflowId === "string" &&
      search2.initialComfyUiWorkflowId.trim()
        ? search2.initialComfyUiWorkflowId
        : void 0,
    initialComfyUiWorkflowTarget:
      search2.initialComfyUiWorkflowTarget === "current" ||
      search2.initialComfyUiWorkflowTarget === "new"
        ? search2.initialComfyUiWorkflowTarget
        : void 0,
    menuAction:
      search2.menuAction === "new-chat" ||
      search2.menuAction === "open-settings"
        ? search2.menuAction
        : void 0,
    assetCenterRelocation:
      search2.assetCenterRelocation === true ||
      search2.assetCenterRelocation === "true"
        ? true
        : void 0,
  }),
  beforeLoad: ({ search: search2 }) => {
    if (!search2.workspaceId)
      throw redirect({
        to: "/",
      });
  },
  component: lazyRouteComponent($$splitComponentImporter$4, "component"),
});
const $$splitComponentImporter$3 = () =>
  (() => import("../skills/index.jsx"))();
function validateSkillsSearch(search2) {
  const out = {};
  const capability = search2.capability;
  if (capability === "skills" || capability === "connectors") {
    out.capability = capability;
  }
  const tab2 = search2.tab;
  if (tab2 === "community" || tab2 === "plugins" || tab2 === "mine") {
    out.tab = tab2;
  }
  const subTab = search2.subTab;
  if (subTab === "skills" || subTab === "plugins") {
    out.subTab = subTab;
  }
  const pluginId =
    typeof search2.pluginId === "string" ? search2.pluginId.trim() : "";
  if (pluginId) out.pluginId = pluginId;
  const skillName =
    typeof search2.skillName === "string" ? search2.skillName.trim() : "";
  if (skillName) out.skillName = skillName;
  const connectorId =
    typeof search2.connectorId === "string" ? search2.connectorId.trim() : "";
  if (connectorId) out.connectorId = connectorId;
  return out;
}
const Route$3 = createFileRoute("/_app/skills/")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component"),
  // Accept capability and detail identifiers so external entries can deep-link
  // to a specific Skill, plugin, or Connector without duplicating their flows.
  // Unknown values are silently dropped so the page falls back to its default.
  // subTab only applies when tab === 'mine' (the only tab with a sub-switcher);
  // we still validate it independently so the schema stays self-describing.
  validateSearch: validateSkillsSearch,
});
const $$splitComponentImporter$2 = () =>
  (() => import("../project-detail/index.jsx"))();
const Route$2 = createFileRoute("/_home/projects/$projectId")({
  validateSearch: (search2) => ({
    tab: typeof search2.tab === "string" ? search2.tab : void 0,
  }),
  component: lazyRouteComponent($$splitComponentImporter$2, "component"),
});
const $$splitComponentImporter$1 = () =>
  (() => import("../remote-tool-DZYmJVoR.js"))();
const Route$1 = createFileRoute("/_app/debug/remote-tool")({
  validateSearch: (search2) => ({
    url: typeof search2.url === "string" ? search2.url : void 0,
    manifest: typeof search2.manifest === "string" ? search2.manifest : void 0,
    tool: typeof search2.tool === "string" ? search2.tool : void 0,
  }),
  component: lazyRouteComponent($$splitComponentImporter$1, "component"),
});
function requireChatCaseDebugAccess(canUseDebug = canUseDebugTooling) {
  if (!canUseDebug()) {
    throw redirect({
      to: "/",
    });
  }
}
const $$splitComponentImporter = () =>
  (() => import("../chat-case-_htrAxBf.js"))();
const Route2 = createFileRoute("/_app/debug/chat-case")({
  beforeLoad: () => requireChatCaseDebugAccess(),
  validateSearch: (search2) => ({
    case:
      search2.case === "image-reconnect-duplicate" ||
      search2.case === "production-confirm-overlap" ||
      search2.case === "question-overflow" ||
      search2.case === "generation-errors"
        ? search2.case
        : void 0,
  }),
  component: lazyRouteComponent($$splitComponentImporter, "component"),
});
const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
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
function HomeMenuButton() {
  const { t: t2, i18n } = useTranslation();
  const { isWindowsTitlebarOverlay } = useWindowChrome();
  const [openGroup, setOpenGroup] = reactExports.useState(null);
  if (!isWindowsTitlebarOverlay) return null;
  const lang = i18n.language?.startsWith("zh") ? "zh" : "en";
  const label = (key2, fallbackKey) =>
    t2(key2, FALLBACK_LABELS[lang][fallbackKey]);
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
          <DropdownMenuContent
            align="start"
            sideOffset={2}
            className="min-w-[220px]"
          >
            {group.items.map((item, idx) =>
              item.kind === "separator" ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: items are static, order stable
                <DropdownMenuSeparator
                  key={`sep-${group.id}-${idx}`}
                  className="my-0.5"
                />
              ) : (
                <DropdownMenuItem
                  key={item.action}
                  onClick={() => dispatch2(item.action)}
                  data-action-ui-id={`topbar.home-menu.${item.action}`}
                >
                  <span className="flex-1">
                    {label(`topbar.menu.${item.key}`, item.key)}
                  </span>
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
const WINDOW_APP_CONTROLS_MIN_INSET = 0;
const LazyGlobalSearchDialog = reactExports.lazy(() =>
  (() => import("../global-search/index.jsx"))().then((m3) => ({
    default: m3.GlobalSearchDialog,
  })),
);
function TopbarSearchDialogLazy({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { t: t2 } = useTranslation();
  const { searchWorkspaces, currentWorkspaceId } = useTopbarState();
  const { activateWorkspace, createWorkspace, openWorkspaceFromDialog } =
    useTopbarActions();
  const { requestOpen: requestNewProject } =
    useNewWorkspaceDialog(createWorkspace);
  const { shell } = usePlatform();
  const settingsDialog = useOptionalSettingsDialog();
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const { allProjects, hiddenProjectIds } = useProjectStore();
  const { restoreProjectVisibility } = useProjectActions();
  const { navigateAndFocusCanvas, navigateAndFocusSession } =
    useWorkspaceFocusNavigation(currentWorkspaceId, activateWorkspace);
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
function TopbarContent({ onFullScreenChange, onAppControlsInsetChange }) {
  const platform2 = usePlatform();
  const {
    hasReservedTitlebar,
    isCustomChrome,
    needsDragRegion,
    titlebarHeight,
  } = useWindowChrome();
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
          if (
            requestRevision !== queryRevision ||
            eventRevisionAtRequest !== eventRevision
          ) {
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
    return () =>
      window.removeEventListener(OPEN_GLOBAL_SEARCH_EVENT, handleOpenRequest);
  }, [openSearch]);
  return (
    <>
      <header
        className={
          hasReservedTitlebar
            ? "transparent-window-topbar relative z-40 shrink-0 select-none"
            : "pointer-events-none fixed inset-x-0 top-0 z-40 h-10 select-none"
        }
        data-layout-slot={
          hasReservedTitlebar ? "window-titlebar" : "window-chrome-overlay"
        }
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
function Topbar({ onFullScreenChange, onAppControlsInsetChange } = {}) {
  return (
    <TopbarContent
      onFullScreenChange={onFullScreenChange}
      onAppControlsInsetChange={onAppControlsInsetChange}
    />
  );
}
function DataDirectoryStatusBanner() {
  const { t: t2 } = useTranslation();
  const settingsDialog = useOptionalSettingsDialog();
  const [status, setStatus] = reactExports.useState(null);
  const refresh = reactExports.useCallback(() => {
    getDataDirectoryMainService()
      .getStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);
  reactExports.useEffect(() => {
    refresh();
    window.addEventListener(DATA_DIRECTORY_STATUS_CHANGED_EVENT, refresh);
    return () =>
      window.removeEventListener(DATA_DIRECTORY_STATUS_CHANGED_EVENT, refresh);
  }, [refresh]);
  if (
    !status ||
    (status.state !== "configured_location_unavailable" &&
      status.state !== "pending_restart" &&
      !status.workspacePathRewritePending)
  ) {
    return null;
  }
  return (
    <div
      role="alert"
      className="flex shrink-0 items-center justify-center gap-2 border-b border-warning/20 bg-warning/10 px-3 py-1.5 text-center text-xs text-warning-foreground"
      data-action-ui-id="data-directory-status-banner"
    >
      <AlertTriangle size={14} strokeWidth={1.5} className="shrink-0" />
      <span>
        {status.state === "configured_location_unavailable"
          ? t2("settings.storage.globalFallback")
          : status.state === "pending_restart"
            ? t2("settings.storage.globalPendingRestart")
            : t2("settings.storage.globalRewriteRepairPending")}
      </span>
      <button
        type="button"
        className="font-medium underline underline-offset-2 hover:opacity-80"
        onClick={() => settingsDialog?.openSettings("storage")}
      >
        {t2("settings.storage.openSettings")}
      </button>
    </div>
  );
}
function GatewayReadinessBanner() {
  const { t: t2 } = useTranslation();
  const readiness = useGatewayReadiness();
  if (!readiness || readiness.state === "ready") return null;
  const failed = readiness.state === "failed";
  const handleRetry = () => {
    try {
      services
        .get(IHiloApp)
        .retryAppGateway()
        .catch(() => {});
    } catch {}
  };
  return (
    <div
      role="status"
      className={`flex shrink-0 items-center justify-center gap-2 px-3 py-1.5 text-center text-xs ${failed ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}
    >
      <span>
        {failed ? t2("home.gatewayFailed") : t2("home.gatewayStarting")}
      </span>
      {failed && (
        <button
          type="button"
          onClick={handleRetry}
          className="font-medium underline underline-offset-2 hover:opacity-80"
        >
          {t2("home.gatewayRetry")}
        </button>
      )}
    </div>
  );
}
function parseInitialAttachments$1(value) {
  if (Array.isArray(value) && value.every((v2) => typeof v2 === "string")) {
    return value;
  }
  if (typeof value !== "string") return void 0;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((v2) => typeof v2 === "string"))
      return parsed;
  } catch {}
  return void 0;
}
function parseInitialSelectedMediaModels$1(value) {
  let raw2 = value;
  if (typeof value === "string") {
    try {
      raw2 = JSON.parse(value);
    } catch {
      return void 0;
    }
  }
  if (!raw2 || typeof raw2 !== "object" || Array.isArray(raw2)) return void 0;
  const obj = raw2;
  const pick = (key2) => {
    const list2 = obj[key2];
    if (list2 === void 0) return void 0;
    if (Array.isArray(list2) && list2.every((id2) => typeof id2 === "string"))
      return list2;
    return void 0;
  };
  const result = {};
  const image2 = pick("image");
  const video = pick("video");
  const audio = pick("audio");
  if (image2 !== void 0) result.image = image2;
  if (video !== void 0) result.video = video;
  if (audio !== void 0) result.audio = audio;
  return result;
}
function useWorkspaceRouteState() {
  return useRouterState({
    select: (state2) => {
      const pathname = state2.location.pathname;
      if (!pathname.startsWith("/workspace"))
        return {
          active: false,
        };
      const search2 = state2.location.search;
      return {
        active: true,
        workspaceId: normalizeWorkspaceId(search2.workspaceId),
        initialPayloadId:
          typeof search2.initialPayloadId === "string"
            ? search2.initialPayloadId
            : void 0,
        initialMessage:
          search2.initialMessage != null
            ? String(search2.initialMessage)
            : void 0,
        initialAttachments: parseInitialAttachments$1(
          search2.initialAttachments,
        ),
        initialEntityRefs: parseInitialAttachments$1(search2.initialEntityRefs),
        initialModelId:
          typeof search2.initialModelId === "string"
            ? search2.initialModelId
            : void 0,
        initialSelectedMediaModels: parseInitialSelectedMediaModels$1(
          search2.initialSelectedMediaModels,
        ),
        initialComfyUiWorkflowId:
          typeof search2.initialComfyUiWorkflowId === "string" &&
          search2.initialComfyUiWorkflowId.trim()
            ? search2.initialComfyUiWorkflowId
            : void 0,
        initialComfyUiWorkflowTarget:
          search2.initialComfyUiWorkflowTarget === "current" ||
          search2.initialComfyUiWorkflowTarget === "new"
            ? search2.initialComfyUiWorkflowTarget
            : void 0,
        skillPrompt:
          typeof search2.skillPrompt === "string"
            ? search2.skillPrompt
            : void 0,
        skillName:
          typeof search2.skillName === "string" ? search2.skillName : void 0,
        pluginId:
          typeof search2.pluginId === "string" ? search2.pluginId : void 0,
        menuAction:
          search2.menuAction === "new-chat" ||
          search2.menuAction === "open-settings"
            ? search2.menuAction
            : void 0,
        assetCenterRelocation: search2.assetCenterRelocation === true,
      };
    },
  });
}
function RetainedWorkspaceRuntimeLayer() {
  const {
    active: active2,
    workspaceId: workspaceId2,
    initialPayloadId,
    initialMessage,
    initialAttachments,
    initialEntityRefs,
    initialModelId,
    initialSelectedMediaModels,
    initialComfyUiWorkflowId,
    initialComfyUiWorkflowTarget,
    skillPrompt,
    skillName,
    pluginId,
    menuAction,
    assetCenterRelocation,
  } = useWorkspaceRouteState();
  const { entries: entries2 } = useTopbarState();
  const navigate = useNavigate();
  const initialPayloadCacheRef = reactExports.useRef(
    new WorkspaceInitialPayloadCache(),
  );
  const seenEntryIdsRef = reactExports.useRef(new Set());
  const seenLiveWorkspaceIdsRef = reactExports.useRef(new Set());
  const retainedWorkspaceIds = reactExports.useMemo(() => {
    const ids2 = entries2
      .filter((entry) => entry.gatewayUrl)
      .map((entry) => entry.workspaceId);
    if (workspaceId2 && !ids2.includes(workspaceId2)) ids2.push(workspaceId2);
    return ids2;
  }, [entries2, workspaceId2]);
  initialPayloadCacheRef.current.capture(workspaceId2, {
    initialPayloadId,
    initialMessage,
    initialAttachments,
    initialEntityRefs,
    initialModelId,
    initialSelectedMediaModels,
  });
  reactExports.useEffect(() => {
    const entryIds = new Set(entries2.map((entry) => entry.workspaceId));
    initialPayloadCacheRef.current.cleanupClosed(
      entryIds,
      seenEntryIdsRef.current,
      workspaceId2,
    );
    const liveIds = new Set(
      entries2
        .filter((entry) => entry.gatewayUrl)
        .map((entry) => entry.workspaceId),
    );
    for (const liveId of liveIds) seenLiveWorkspaceIdsRef.current.add(liveId);
    for (const seenId of [...seenLiveWorkspaceIdsRef.current]) {
      if (liveIds.has(seenId)) continue;
      workspaceEvents.clearSubscribersReady(seenId);
      seenLiveWorkspaceIdsRef.current.delete(seenId);
    }
  }, [entries2, workspaceId2]);
  return (
    // WorkbenchShell provides the positioned right-content slot. Keep this
    // layer scoped to that slot so it never covers the full-height global sidebar.
    <div
      className={
        active2
          ? "transparent-window-workspace-shell absolute inset-0 z-10 flex bg-background"
          : "hidden"
      }
    >
      {retainedWorkspaceIds.map((id2) => (
        <RetainedWorkspaceRuntimeHost
          key={id2}
          workspaceId={id2}
          isActive={active2 && id2 === workspaceId2}
          initialPayloadId={
            initialPayloadCacheRef.current.get(id2)?.initialPayloadId
          }
          initialMessage={
            initialPayloadCacheRef.current.get(id2)?.initialMessage
          }
          initialAttachments={
            initialPayloadCacheRef.current.get(id2)?.initialAttachments
          }
          initialEntityRefs={
            initialPayloadCacheRef.current.get(id2)?.initialEntityRefs
          }
          initialModelId={
            initialPayloadCacheRef.current.get(id2)?.initialModelId
          }
          initialSelectedMediaModels={
            initialPayloadCacheRef.current.get(id2)?.initialSelectedMediaModels
          }
          initialComfyUiWorkflowId={
            active2 && id2 === workspaceId2 ? initialComfyUiWorkflowId : void 0
          }
          initialComfyUiWorkflowTarget={
            active2 && id2 === workspaceId2
              ? initialComfyUiWorkflowTarget
              : void 0
          }
          onInitialMessageSent={() => {
            const payload = initialPayloadCacheRef.current.get(id2);
            initialPayloadCacheRef.current.consume(id2);
            if (payload?.initialPayloadId) {
              acknowledgeHomeDraftHandoff(payload.initialPayloadId);
            }
            if (
              active2 &&
              workspaceId2 === id2 &&
              payload &&
              (!payload.initialPayloadId ||
                payload.initialPayloadId === initialPayloadId)
            ) {
              void navigate({
                to: "/workspace",
                replace: true,
                search: buildWorkspaceSearch(id2, {
                  skillPrompt,
                  skillName,
                  pluginId,
                  menuAction,
                  assetCenterRelocation,
                }),
              });
            }
          }}
          skillPrompt={skillPrompt}
          skillName={skillName}
          pluginId={pluginId}
          menuAction={menuAction}
          assetCenterRelocation={
            active2 && id2 === workspaceId2 ? assetCenterRelocation : void 0
          }
        />
      ))}
    </div>
  );
}
const MemoizedRetainedWorkspaceRuntimeLayer = reactExports.memo(
  RetainedWorkspaceRuntimeLayer,
);
function ModelCatalogLoginWarmup() {
  const auth = reactExports.useContext(AuthContext);
  const gatewayFetch2 = useGatewayFetch();
  const queryClient2 = useQueryClient();
  const { gatewayReady, scopeKey, gatewayBinding } = useGatewayScope();
  const catalogScopeKey = useModelCatalogScopeKey();
  const warmedRuntimeRef = reactExports.useRef(null);
  const previousCatalogScopeRef = reactExports.useRef(null);
  const runtimeKey = [
    scopeKey,
    gatewayBinding?.instanceId ?? "legacy",
    gatewayBinding?.generation ?? 0,
  ].join(":");
  const isLoggedIn = auth?.isLoggedIn ?? false;
  const isLoading = auth?.isLoading ?? true;
  reactExports.useEffect(() => {
    const previousCatalogScope = previousCatalogScopeRef.current;
    previousCatalogScopeRef.current = catalogScopeKey;
    if (previousCatalogScope && previousCatalogScope !== catalogScopeKey) {
      const belongsToPreviousScope = (query) =>
        (query.queryKey[0] === "models" ||
          query.queryKey[0] === "mention-models") &&
        query.queryKey[1] === previousCatalogScope;
      void queryClient2
        .cancelQueries({
          predicate: belongsToPreviousScope,
        })
        .then(() =>
          queryClient2.removeQueries({
            predicate: belongsToPreviousScope,
          }),
        );
      warmedRuntimeRef.current = null;
    }
    if (isLoading || !isLoggedIn) {
      warmedRuntimeRef.current = null;
      return;
    }
    const warmKey = `${catalogScopeKey}:${runtimeKey}`;
    if (!gatewayReady || warmedRuntimeRef.current === warmKey) {
      return;
    }
    warmedRuntimeRef.current = warmKey;
    void queryClient2.invalidateQueries({
      queryKey: ["models", catalogScopeKey],
    });
    void queryClient2.invalidateQueries({
      queryKey: ["mention-models", catalogScopeKey],
    });
    void gatewayFetch2(API_PATHS.modelsConfig)
      .then((response) => {
        if (!response.ok) {
          warmedRuntimeRef.current = null;
          console.warn(
            `[model-catalog] login warmup failed with HTTP ${response.status}`,
          );
        }
      })
      .catch((error) => {
        warmedRuntimeRef.current = null;
        console.warn("[model-catalog] login warmup failed:", error);
      });
  }, [
    catalogScopeKey,
    gatewayFetch2,
    gatewayReady,
    isLoading,
    isLoggedIn,
    queryClient2,
    runtimeKey,
  ]);
  return null;
}
function GlobalSidebarStateRoot({ children: children2, ...props }) {
  const { collapsed, previewOpen } = useGlobalSidebar();
  const previewInteractionActive = collapsed && previewOpen;
  return (
    <div
      {...props}
      data-global-sidebar-collapsed={collapsed ? "true" : "false"}
      data-global-sidebar-preview-active={
        previewInteractionActive ? "true" : "false"
      }
    >
      {children2}
    </div>
  );
}
function WorkbenchShellContent({ children: children2 }) {
  const hasAuthContext = reactExports.useContext(AuthContext) !== null;
  const settings = useSettings();
  const appGatewayReady = useGatewayReady();
  const {
    chromeMode,
    hasReservedTitlebar,
    isMacIntegratedChrome,
    titlebarHeight,
  } = useWindowChrome();
  const { collapsed, previewOpen, openPreview } = useGlobalSidebar();
  const [isWindowFullScreen, setIsWindowFullScreen] =
    reactExports.useState(false);
  const activeTitlebarHeight =
    hasReservedTitlebar && !isWindowFullScreen ? titlebarHeight : 0;
  const showWorkbenchDragHotZones =
    isMacIntegratedChrome && !isWindowFullScreen;
  const isWorkspaceRoute = useRouterState({
    select: (state2) => state2.location.pathname.startsWith("/workspace"),
  });
  const topBottomDragHotZoneClassName = isWorkspaceRoute ? "h-3" : "h-1";
  const sideDragHotZoneInsetClassName = isWorkspaceRoute
    ? "inset-y-3"
    : "inset-y-1";
  return (
    <GatewayScopeProvider gatewayReady={appGatewayReady}>
      {hasAuthContext ? <ModelCatalogLoginWarmup /> : null}
      <GlobalSidebarStateRoot
        className={cn(
          "transparent-window-root transparent-window-shell-material relative flex h-screen w-screen flex-col overflow-hidden bg-[var(--window-shell-fallback-bg)]",
          !settings.config.islandLayout && "no-islands",
        )}
        data-action-ui-id="workbench-shell"
        data-window-chrome-mode={chromeMode}
        data-window-fullscreen={isWindowFullScreen ? "true" : "false"}
        style={{
          "--window-titlebar-height": `${activeTitlebarHeight}px`,
          // App controls now belong to the sidebar chrome row. The rail
          // itself contains macOS traffic lights, so workbench panes no
          // longer reserve either top-corner overlay inset.
          "--window-traffic-light-inset": "0px",
          "--window-app-controls-inset": "0px",
        }}
      >
        <Topbar onFullScreenChange={setIsWindowFullScreen} />
        <DataDirectoryStatusBanner />
        <div
          className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden"
          data-layout-slot="window-shell-body"
        >
          <GlobalSidebarSurface />
          <AssetCenterRelocationCoachMark />
          <div
            className="transparent-window-surface-gap transparent-window-workbench-inset relative flex min-w-0 flex-1 flex-col overflow-hidden py-1 pr-1 pl-2"
            data-layout-slot="workbench-content"
            data-window-chrome-overlaid={hasReservedTitlebar ? "false" : "true"}
          >
            {showWorkbenchDragHotZones && collapsed && !previewOpen ? (
              <>
                <div
                  aria-hidden="true"
                  className="no-drag pointer-events-auto absolute inset-y-0 left-0 z-50 w-2"
                  data-action-ui-id="global-sidebar-hover-edge"
                  onMouseEnter={openPreview}
                  onFocus={openPreview}
                />
              </>
            ) : null}
            {showWorkbenchDragHotZones ? (
              <>
                <div
                  aria-hidden="true"
                  className={cn(
                    "drag-region absolute inset-x-2 top-0 z-20",
                    topBottomDragHotZoneClassName,
                  )}
                  data-action-ui-id="workbench.window-drag-fallback-top"
                />
                <div
                  aria-hidden="true"
                  className={cn(
                    "drag-region absolute inset-x-2 bottom-0 z-20",
                    topBottomDragHotZoneClassName,
                  )}
                  data-action-ui-id="workbench.window-drag-fallback-bottom"
                />
                {!collapsed ? (
                  <div
                    aria-hidden="true"
                    className={cn(
                      "drag-region absolute left-0 z-20 w-2",
                      sideDragHotZoneInsetClassName,
                    )}
                    data-action-ui-id="workbench.window-drag-hot-zone-left"
                  />
                ) : null}
                <div
                  aria-hidden="true"
                  className={cn(
                    "drag-region absolute right-0 z-20 w-2",
                    sideDragHotZoneInsetClassName,
                  )}
                  data-action-ui-id="workbench.window-drag-hot-zone-right"
                />
              </>
            ) : null}
            <section
              className={cn(
                "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl",
                !isWorkspaceRoute &&
                  "elevated-surface-border bg-[var(--home-content-surface)]",
              )}
              data-action-ui-id="workbench-sheet"
              data-surface={isWorkspaceRoute ? "workspace" : "global"}
            >
              {!isWorkspaceRoute ? <GatewayReadinessBanner /> : null}
              <div className="relative flex min-h-0 flex-1 overflow-hidden">
                {isWorkspaceRoute ? (
                  <div className="absolute inset-0 min-h-0 min-w-0 overflow-hidden">
                    {children2}
                  </div>
                ) : (
                  <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    {children2}
                  </main>
                )}
                <MemoizedRetainedWorkspaceRuntimeLayer />
              </div>
              {!isWorkspaceRoute ? <HomeWidgetHost /> : null}
            </section>
          </div>
        </div>
      </GlobalSidebarStateRoot>
    </GatewayScopeProvider>
  );
}
function WorkbenchShell({ children: children2 }) {
  return (
    <GlobalSidebarProvider>
      <WorkbenchShellContent>{children2}</WorkbenchShellContent>
    </GlobalSidebarProvider>
  );
}
function RootLayout() {
  const { pathname } = useLocation();
  useTrackPageView(pathname);
  reactExports.useEffect(() => {
    recordNavigation(pathname);
  }, [pathname]);
  return (
    <AppProviders>
      <WorkbenchShell>
        <Outlet />
      </WorkbenchShell>
      <OfflineBanner />
      <ProjectInvitePrompt />
    </AppProviders>
  );
}
const Route$e = createRootRoute({
  component: RootLayout,
});
const HomeRoute = Route$d.update({
  id: "/_home",
  getParentRoute: () => Route$e,
});
const AppRoute = Route$c.update({
  id: "/_app",
  getParentRoute: () => Route$e,
});
const HomeIndexRoute = Route$b.update({
  id: "/",
  path: "/",
  getParentRoute: () => HomeRoute,
});
const HomeWorkflowsIndexRoute = Route$a.update({
  id: "/workflows/",
  path: "/workflows/",
  getParentRoute: () => HomeRoute,
});
const HomeSkillCommunityIndexRoute = Route.update({
  id: "/skill-community/",
  path: "/skill-community/",
  getParentRoute: () => HomeRoute,
});
const HomeProjectsIndexRoute = Route$8.update({
  id: "/projects/",
  path: "/projects/",
  getParentRoute: () => HomeRoute,
});
const HomeCreationsIndexRoute = Route$7.update({
  id: "/creations/",
  path: "/creations/",
  getParentRoute: () => HomeRoute,
});
const HomeChangelogIndexRoute = Route$6.update({
  id: "/changelog/",
  path: "/changelog/",
  getParentRoute: () => HomeRoute,
});
const HomeAssetCenterIndexRoute = Route$5.update({
  id: "/asset-center/",
  path: "/asset-center/",
  getParentRoute: () => HomeRoute,
});
const AppWorkspaceIndexRoute = Route$4.update({
  id: "/workspace/",
  path: "/workspace/",
  getParentRoute: () => AppRoute,
});
const AppSkillsIndexRoute = Route$3.update({
  id: "/skills/",
  path: "/skills/",
  getParentRoute: () => AppRoute,
});
const HomeProjectsProjectIdRoute = Route$2.update({
  id: "/projects/$projectId",
  path: "/projects/$projectId",
  getParentRoute: () => HomeRoute,
});
const AppDebugRemoteToolRoute = Route$1.update({
  id: "/debug/remote-tool",
  path: "/debug/remote-tool",
  getParentRoute: () => AppRoute,
});
const AppDebugChatCaseRoute = Route2.update({
  id: "/debug/chat-case",
  path: "/debug/chat-case",
  getParentRoute: () => AppRoute,
});
const AppRouteChildren = {
  AppDebugChatCaseRoute,
  AppDebugRemoteToolRoute,
  AppSkillsIndexRoute,
  AppWorkspaceIndexRoute,
};
const AppRouteWithChildren = AppRoute._addFileChildren(AppRouteChildren);
const HomeRouteChildren = {
  HomeIndexRoute,
  HomeProjectsProjectIdRoute,
  HomeAssetCenterIndexRoute,
  HomeChangelogIndexRoute,
  HomeCreationsIndexRoute,
  HomeProjectsIndexRoute,
  HomeSkillCommunityIndexRoute,
  HomeWorkflowsIndexRoute,
};
const HomeRouteWithChildren = HomeRoute._addFileChildren(HomeRouteChildren);
const rootRouteChildren = {
  AppRoute: AppRouteWithChildren,
  HomeRoute: HomeRouteWithChildren,
};
const routeTree = Route$e._addFileChildren(rootRouteChildren)._addFileTypes();
function isStartupSessionRestorePayload(value) {
  if (!value || typeof value !== "object") return false;
  const candidate = value;
  return (
    candidate.source === "session-restore" &&
    Array.isArray(candidate.restoredWorkspaceIds)
  );
}
const router = createRouter({
  routeTree,
});
const TrackingRecorder = null;
function AppRoot() {
  const { t: t2 } = useTranslation();
  useDebugFlag(DEBUG_FLAGS.trackingRecorder);
  const { pendingInstall, dismiss: dismissInstall } = useDeepLinkRouter();
  const installInFlightRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (!pendingInstall || installInFlightRef.current) return;
    installInFlightRef.current = true;
    const doInstall = async () => {
      const startedAt = Date.now();
      try {
        const res = await gatewayFetch(API_PATHS.marketInstall, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: pendingInstall.name,
          }),
        });
        const data2 = await res.json();
        if (data2.ok) {
          trackSkillInstallEvent({
            name: pendingInstall.name,
            source: "market",
            via: "share_link",
          });
          showSkillInstallSuccessToast(pendingInstall.name);
          sessionStorage.setItem("deepLinkSkill", pendingInstall.name);
          void router.navigate({
            to: "/skills",
          });
          try {
            await window.hilo.opencode.restart();
          } catch {}
        } else {
          trackSkillInstallFailed({
            name: pendingInstall.name,
            source: "market",
            via: "share_link",
            error: data2.error || "install rejected",
            durationMs: Date.now() - startedAt,
          });
          dedupedToast.error(
            data2.error ||
              t2("skills.market.installError", {
                name: pendingInstall.name,
              }),
          );
        }
      } catch (err) {
        trackSkillInstallFailed({
          name: pendingInstall.name,
          source: "market",
          via: "share_link",
          error: err,
          durationMs: Date.now() - startedAt,
        });
        dedupedToast.error(
          t2("skills.market.installError", {
            name: pendingInstall.name,
          }),
        );
      } finally {
        installInFlightRef.current = false;
        dismissInstall();
      }
    };
    doInstall();
  }, [pendingInstall, dismissInstall, t2]);
  reactExports.useEffect(() => {
    if (!window.hilo?.ipcRenderer) return;
    const offNewChat = window.hilo.ipcRenderer.on(
      IPC_CHANNELS.MENU_NEW_CHAT,
      () => {
        window.dispatchEvent(new Event(OPEN_NEW_WORKSPACE_DIALOG_EVENT));
      },
    );
    const offNewWorkspace = window.hilo.ipcRenderer.on(
      IPC_CHANNELS.MENU_NEW_WORKSPACE,
      (...args) => {
        const request = args[1];
        if (isStartupSessionRestorePayload(request)) {
          if (router.state.location.pathname !== "/") return;
          const workspaceId22 = getStartupVisiblePreviewWorkspace(
            request.restoredWorkspaceIds,
            request.preferredWorkspaceId,
          );
          if (!workspaceId22) {
            void homeService.hiloApp.activateHome();
            void router.navigate({
              to: "/",
            });
            return;
          }
          void router.navigate({
            to: "/workspace",
            search: buildWorkspaceSearch(workspaceId22),
          });
          return;
        }
        const workspaceId2 = typeof request === "string" ? request : void 0;
        if (!workspaceId2) return;
        showVisiblePreviewTab(workspaceId2);
        void router.navigate({
          to: "/workspace",
          search: buildWorkspaceSearch(workspaceId2),
        });
      },
    );
    const offCloseTab = window.hilo.ipcRenderer.on(
      IPC_CHANNELS.MENU_CLOSE_TAB,
      () => {
        const event = new CustomEvent(IPC_CHANNELS.DOM_CLOSE_TAB, {
          cancelable: true,
        });
        window.dispatchEvent(event);
        if (event.defaultPrevented) return;
        const search2 = router.state.location.search;
        const workspaceId2 = search2?.workspaceId;
        if (!workspaceId2) return;
        const source = "menu-close-tab";
        const nextWorkspaceId = getNextPreviewTabIdAfterHide(
          getVisiblePreviewTabIds(),
          workspaceId2,
        );
        recordAction("workspace:preview-hidden", {
          workspaceId: workspaceId2,
          source,
          wasActive: true,
          ...(nextWorkspaceId
            ? {
                nextWorkspaceId,
              }
            : {}),
        });
        hideVisiblePreviewTabs(workspaceId2);
        if (!nextWorkspaceId) {
          void homeService.hiloApp.activateHome();
          void router.navigate({
            to: "/",
          });
        } else {
          void router.navigate({
            to: "/workspace",
            search: buildWorkspaceSearch(nextWorkspaceId),
          });
        }
        void requestWorkspaceRuntimeClose(
          homeService.hiloApp,
          workspaceId2,
          source,
        );
      },
    );
    return () => {
      offNewChat();
      offNewWorkspace();
      offCloseTab();
    };
  }, []);
  return (
    <TooltipProvider delay={150}>
      <ComfyUiDownloadProgressHost>
        <RouterProvider router={router} />
        <Toaster2 />
        {TrackingRecorder}
      </ComfyUiDownloadProgressHost>
    </TooltipProvider>
  );
}
function AppRootWithRendererReady() {
  reactExports.useEffect(() => installScrollbarVisibility(), []);
  reactExports.useEffect(() => {
    void reportRendererReady(homeService.hiloApp).catch(() => {});
  }, []);
  return <AppRoot />;
}
clientExports.createRoot(root).render(
  <reactExports.StrictMode>
    <ErrorBoundary>
      <AppRootWithRendererReady />
    </ErrorBoundary>
  </reactExports.StrictMode>,
);
