// app-root.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  useDebugFlag,
  DEBUG_FLAGS,
  useGatewayFetch,
  dedupedToast,
  TRACK_EVENTS,
  buildWorkspaceSearch,
  API_PATHS,
  gatewayFetch,
  useRouterState,
  GatewayScopeProvider,
  TooltipProvider,
  useQueryClient,
  useLocation,
  GLOBAL_SIDEBAR_RAIL_WIDTH,
  GlobalSidebarProvider,
  AuthContext,
  useGatewayScope,
  useModelCatalogScopeKey,
  GLOBAL_SIDEBAR_MIN_WIDTH,
  GLOBAL_SIDEBAR_MAX_WIDTH,
  createRootRoute,
  recordNavigation,
  Outlet,
  Route$d,
  Route$c,
  Route$b,
  Route$a,
  Route$9,
  Route$8,
  Route$7,
  Route$6,
  Route$5,
  Route$4,
  Route$3,
  Route$2,
  Route$1,
  Route2,
  isElectron,
  rendererRuntimeConfig,
  createRouter,
  useDeepLinkRouter,
  IPC_CHANNELS,
  OPEN_NEW_WORKSPACE_DIALOG_EVENT,
  showVisiblePreviewTab,
  getNextPreviewTabIdAfterHide,
  recordAction,
  hideVisiblePreviewTabs,
  requestWorkspaceRuntimeClose,
} from "../vendor.js";
import {
  cn$2,
  useBrowserHoverPreview,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { homeService, ComfyUiDownloadProgressHost } from "../m08/browser-inspiration-urls.jsx";
import { HomeWidgetHost } from "../m11/home-widget-host.jsx";
import { AssetCenterRelocationCoachMark } from "../m10/asset-center-relocation-coach-mark.jsx";
import { trackEvent, initTrack } from "../asset-center/shared/init-track.js";
import { useWindowChrome, AppProviders, OfflineBanner } from "../m10/use-coach-mark.jsx";
import { useSettings } from "../m10/use-data-directory.js";
import {
  useTrackPageView,
  initRum,
  waitForUserReady,
  scheduleRumInitStatusTrackReports,
  RouterProvider,
} from "../m07/en.jsx";
import {
  useGlobalSidebar,
  GLOBAL_SIDEBAR_PREVIEW_EDGE_HIT_WIDTH,
} from "../m11/remote-tool-host.jsx";
import {
  startPerfObserver,
  getStartupVisiblePreviewWorkspace,
  getVisiblePreviewTabIds,
  Toaster2,
} from "../m09/error-fallback-ui.jsx";
import { useGatewayReady } from "../m10/hub-logo.jsx";
import { ProjectInvitePrompt } from "../m10/topbar-provider.jsx";
import {
  trackSkillInstallEvent,
  showSkillInstallSuccessToast,
  trackSkillInstallFailed,
} from "../m10/use-new-workspace-dialog.jsx";
import {
  startRendererDiagnosticsReporter,
  applyRenderingModeAttributes,
} from "../m09/auth-provider.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { HomeSidebar } from "./home-sidebar.jsx";
import { RetainedWorkspaceRuntimeLayer } from "./retained-workspace-runtime-host.jsx";
import { Topbar } from "./topbar-search-dialog-lazy.jsx";
import { DataDirectoryStatusBanner, GatewayReadinessBanner } from "./user-menu-popover-content.jsx";
const GLOBAL_SIDEBAR_PREVIEW_PANEL_INSET = 4;
const GLOBAL_SIDEBAR_DOCKED_FOOTER_HEIGHT = 56;
const GLOBAL_SIDEBAR_RAIL_FOOTER_HEIGHT = 136;
const SIDEBAR_USER_MENU_PREVIEW_HOLD = "sidebar-user-menu";
const MemoizedRetainedWorkspaceRuntimeLayer = reactExports.memo(RetainedWorkspaceRuntimeLayer);
function WorkbenchShell({ children: children2 }) {
  return (
    <GlobalSidebarProvider>
      <WorkbenchShellContent>{children2}</WorkbenchShellContent>
    </GlobalSidebarProvider>
  );
}
function WorkbenchShellContent({ children: children2 }) {
  const hasAuthContext = reactExports.useContext(AuthContext) !== null;
  const settings = useSettings();
  const appGatewayReady = useGatewayReady();
  const { chromeMode, hasReservedTitlebar, isMacIntegratedChrome, titlebarHeight } =
    useWindowChrome();
  const { collapsed, previewOpen, openPreview } = useGlobalSidebar();
  const [isWindowFullScreen, setIsWindowFullScreen] = reactExports.useState(false);
  const activeTitlebarHeight = hasReservedTitlebar && !isWindowFullScreen ? titlebarHeight : 0;
  const showWorkbenchDragHotZones = isMacIntegratedChrome && !isWindowFullScreen;
  const isWorkspaceRoute = useRouterState({
    select: (state2) => state2.location.pathname.startsWith("/workspace"),
  });
  const topBottomDragHotZoneClassName = isWorkspaceRoute ? "h-3" : "h-1";
  const sideDragHotZoneInsetClassName = isWorkspaceRoute ? "inset-y-3" : "inset-y-1";
  return (
    <GatewayScopeProvider gatewayReady={appGatewayReady}>
      {hasAuthContext ? <ModelCatalogLoginWarmup /> : null}
      <GlobalSidebarStateRoot
        className={cn$2(
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
                  className={cn$2(
                    "drag-region absolute inset-x-2 top-0 z-20",
                    topBottomDragHotZoneClassName,
                  )}
                  data-action-ui-id="workbench.window-drag-fallback-top"
                />
                <div
                  aria-hidden="true"
                  className={cn$2(
                    "drag-region absolute inset-x-2 bottom-0 z-20",
                    topBottomDragHotZoneClassName,
                  )}
                  data-action-ui-id="workbench.window-drag-fallback-bottom"
                />
                {!collapsed ? (
                  <div
                    aria-hidden="true"
                    className={cn$2(
                      "drag-region absolute left-0 z-20 w-2",
                      sideDragHotZoneInsetClassName,
                    )}
                    data-action-ui-id="workbench.window-drag-hot-zone-left"
                  />
                ) : null}
                <div
                  aria-hidden="true"
                  className={cn$2(
                    "drag-region absolute right-0 z-20 w-2",
                    sideDragHotZoneInsetClassName,
                  )}
                  data-action-ui-id="workbench.window-drag-hot-zone-right"
                />
              </>
            ) : null}
            <section
              className={cn$2(
                "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl",
                !isWorkspaceRoute && "elevated-surface-border bg-[var(--home-content-surface)]",
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
        (query.queryKey[0] === "models" || query.queryKey[0] === "mention-models") &&
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
          console.warn(`[model-catalog] login warmup failed with HTTP ${response.status}`);
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
      data-global-sidebar-preview-active={previewInteractionActive ? "true" : "false"}
    >
      {children2}
    </div>
  );
}
function GlobalSidebarSurface() {
  const {
    width,
    collapsed,
    previewOpen,
    previewOpening,
    previewClosing,
    openPreview,
    keepPreviewOpen,
    schedulePreviewClose,
    completePreviewClose,
    holdPreviewOpen,
    releasePreviewHold,
    onResizeMouseDown,
    onResizeValueChange,
    resetWidth,
  } = useGlobalSidebar();
  const { hasReservedTitlebar, needsTrafficLightSpacer } = useWindowChrome();
  const railMode = collapsed;
  const browserPreviewReady = useBrowserHoverPreview(railMode && (previewOpening || previewOpen));
  const floatingPreview = railMode && previewOpen && browserPreviewReady;
  const previewExpanded = floatingPreview && !previewClosing;
  const previewInteractionBridge = floatingPreview;
  const previewContentWidth = railMode ? width + GLOBAL_SIDEBAR_PREVIEW_EDGE_HIT_WIDTH : width;
  const previewContentClipRight = previewContentWidth - GLOBAL_SIDEBAR_RAIL_WIDTH;
  const previewVisualClipRight =
    width - (GLOBAL_SIDEBAR_RAIL_WIDTH - GLOBAL_SIDEBAR_PREVIEW_PANEL_INSET);
  const previewSurfaceWidth = railMode
    ? previewInteractionBridge
      ? previewContentWidth
      : width + GLOBAL_SIDEBAR_PREVIEW_PANEL_INSET
    : width;
  const previewContentClipPath = railMode
    ? previewExpanded
      ? "inset(0px 0px 0px 0px)"
      : `inset(0px ${previewContentClipRight}px 0px 0px)`
    : void 0;
  const previewVisualClipPath =
    railMode && !previewExpanded
      ? `inset(0px ${previewVisualClipRight}px 0px 0px)`
      : "inset(0px 0px 0px 0px)";
  const isSidebarHoverRegion = (target) =>
    target instanceof Element &&
    Boolean(target.closest('[data-global-sidebar-hover-region="true"]'));
  const handleSidebarOverlayOpenChange = reactExports.useCallback(
    (open) => {
      if (open) holdPreviewOpen(SIDEBAR_USER_MENU_PREVIEW_HOLD);
      else releasePreviewHold(SIDEBAR_USER_MENU_PREVIEW_HOLD);
    },
    [holdPreviewOpen, releasePreviewHold],
  );
  const handleSurfaceBlur = (event) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    if (isSidebarHoverRegion(nextTarget)) return;
    schedulePreviewClose();
  };
  const handleSurfaceMouseLeave = (event) => {
    if (isSidebarHoverRegion(event.relatedTarget)) return;
    if (floatingPreview) {
      const surfaceRect = event.currentTarget.getBoundingClientRect();
      const visiblePreviewRight = surfaceRect.left + width + GLOBAL_SIDEBAR_PREVIEW_PANEL_INSET;
      const pointerStillInsidePreview =
        event.clientX >= surfaceRect.left &&
        event.clientX <= visiblePreviewRight &&
        event.clientY >= surfaceRect.top &&
        event.clientY <= surfaceRect.bottom;
      if (pointerStillInsidePreview) return;
    }
    schedulePreviewClose();
  };
  const handleSurfaceMouseMove = (event) => {
    if (!floatingPreview) return;
    if (document.documentElement.dataset.columnResizeActive === "true") return;
    if (isSidebarHoverRegion(event.target)) return;
    if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return;
    const visiblePreviewRight =
      event.currentTarget.getBoundingClientRect().left + width + GLOBAL_SIDEBAR_PREVIEW_PANEL_INSET;
    if (event.clientX > visiblePreviewRight) schedulePreviewClose();
  };
  return (
    <div
      className="relative z-50 h-full shrink-0"
      style={{
        width: railMode ? GLOBAL_SIDEBAR_RAIL_WIDTH : width,
      }}
      data-action-ui-id="global-sidebar-dock"
      data-collapsed={railMode ? "true" : "false"}
      data-mode={railMode ? "rail" : "pinned"}
    >
      <div
        aria-hidden="true"
        className="global-sidebar-footer-divider pointer-events-none absolute z-40 h-px"
        data-action-ui-id="global-sidebar-footer-divider"
        style={
          floatingPreview
            ? {
                bottom: GLOBAL_SIDEBAR_DOCKED_FOOTER_HEIGHT,
                left: GLOBAL_SIDEBAR_PREVIEW_PANEL_INSET,
                width,
              }
            : railMode
              ? {
                  bottom: GLOBAL_SIDEBAR_RAIL_FOOTER_HEIGHT,
                  left: 0,
                  width: GLOBAL_SIDEBAR_RAIL_WIDTH + GLOBAL_SIDEBAR_PREVIEW_EDGE_HIT_WIDTH,
                }
              : {
                  bottom: GLOBAL_SIDEBAR_DOCKED_FOOTER_HEIGHT,
                  left: 0,
                  width: width + GLOBAL_SIDEBAR_PREVIEW_EDGE_HIT_WIDTH,
                }
        }
      />
      <div
        className={cn$2(
          "absolute inset-y-0 left-0",
          previewInteractionBridge ? "no-drag pointer-events-auto z-50" : "pointer-events-none",
        )}
        style={{
          width: previewSurfaceWidth,
        }}
        data-action-ui-id="global-sidebar-surface"
        data-overlay={floatingPreview ? "true" : "false"}
        data-preview-opening={previewOpening ? "true" : "false"}
        data-preview-closing={previewClosing ? "true" : "false"}
        data-interaction-bridge={previewInteractionBridge ? "true" : "false"}
        data-presentation={floatingPreview ? "floating-preview" : railMode ? "rail" : "docked"}
        onMouseEnter={() => {
          if (railMode && !previewOpen) openPreview();
          else if (floatingPreview) keepPreviewOpen();
        }}
        onMouseMove={handleSurfaceMouseMove}
        onMouseLeave={handleSurfaceMouseLeave}
        onFocus={() => {
          if (railMode && !previewOpen) openPreview();
          else if (floatingPreview) keepPreviewOpen();
        }}
        onBlur={handleSurfaceBlur}
      >
        <div
          className={cn$2(
            "transparent-window-floating-sidebar elevated-surface-border pointer-events-none absolute inset-y-1 left-1 rounded-xl transition-[clip-path,opacity,box-shadow] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            previewExpanded ? "duration-[160ms]" : "duration-0",
            previewExpanded ? "opacity-100 shadow-lg" : "opacity-0 shadow-none",
          )}
          style={{
            width,
            clipPath: previewVisualClipPath,
            willChange: railMode ? "clip-path, opacity" : void 0,
          }}
          data-action-ui-id="global-sidebar-visual-panel"
          data-presentation={floatingPreview ? "floating-preview" : railMode ? "rail" : "docked"}
          aria-hidden="true"
        />
        <div
          className={cn$2(
            "pointer-events-auto absolute inset-y-0 left-0 transition-[clip-path] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            previewExpanded ? "duration-[160ms]" : "duration-0",
            railMode ? "overflow-hidden" : "overflow-visible",
          )}
          style={{
            width: previewContentWidth,
            clipPath: previewContentClipPath,
            willChange: railMode ? "clip-path" : void 0,
          }}
          data-action-ui-id="global-sidebar-content"
          data-preview-expanded={previewExpanded ? "true" : "false"}
          onTransitionEnd={(event) => {
            if (
              previewClosing &&
              event.target === event.currentTarget &&
              (event.propertyName === "clip-path" || event.propertyName === "-webkit-clip-path")
            ) {
              completePreviewClose();
            }
          }}
        >
          <div
            className="h-full"
            style={{
              width,
            }}
          >
            <HomeSidebar
              width={width}
              topChromeInset={needsTrafficLightSpacer && !hasReservedTitlebar}
              presentation={floatingPreview ? "floating-preview" : railMode ? "rail" : "docked"}
              minWidth={GLOBAL_SIDEBAR_MIN_WIDTH}
              maxWidth={GLOBAL_SIDEBAR_MAX_WIDTH}
              onResizeMouseDown={onResizeMouseDown}
              onResizeValueChange={onResizeValueChange}
              onResetWidth={resetWidth}
              onPreviewInteractionEnter={keepPreviewOpen}
              onPreviewInteractionLeave={schedulePreviewClose}
              onOverlayOpenChange={handleSidebarOverlayOpenChange}
              holdPreviewOpen={holdPreviewOpen}
              releasePreviewHold={releasePreviewHold}
              loadRecentThumbnails={!railMode || previewExpanded}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
const Route$e = createRootRoute({
  component: RootLayout,
});
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
const HomeSkillCommunityIndexRoute = Route$9.update({
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
  return candidate.source === "session-restore" && Array.isArray(candidate.restoredWorkspaceIds);
}
startPerfObserver();
if (isElectron()) {
  (() => import("../workbenchService-B3rZsapG.js"))();
  startRendererDiagnosticsReporter(homeService.hiloApp);
}
{
  const cfg = rendererRuntimeConfig;
  applyRenderingModeAttributes(cfg);
  initRum(cfg);
  void initTrack({
    region: cfg.region,
    channel: cfg.channel,
    env: cfg.env,
    appVersion: cfg.appVersion,
    deviceId: cfg.deviceId ?? "",
    ipCountry: cfg.ipCountry,
    downloadSource: cfg.downloadSource,
    updateBackend: cfg.updateBackend,
    processType: "renderer",
    // Renderer cannot read process.versions.* / node:os under contextIsolation,
    // preload pre-computes these in __HILO_CONFIG__ and we forward them.
    electronVersion: cfg.electronVersion,
    chromeVersion: cfg.chromeVersion,
    cpuCount: cfg.cpuCount,
    totalMemoryMb: cfg.totalMemoryMb,
    locale: cfg.locale,
    timezone: cfg.timezone,
    debug: false,
  }).then(async () => {
    await waitForUserReady();
    trackEvent(TRACK_EVENTS.APP_LAUNCH, {
      entry: "renderer",
    });
    scheduleRumInitStatusTrackReports((props) => {
      trackEvent(TRACK_EVENTS.RUM_INIT_STATUS, {
        ...props,
      });
    });
  });
}
if (window.__TEST_DRIVER_IPC__) {
  const ipc = window.__TEST_DRIVER_IPC__;
  void (() => import("../test-driver-bridge-CFT8sZQ3.js"))().then((mod) => {
    mod.initTestDriverBridge(ipc);
  });
}
const router = createRouter({
  routeTree,
});
const TrackingRecorder = null;
export function AppRoot() {
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
    const offNewChat = window.hilo.ipcRenderer.on(IPC_CHANNELS.MENU_NEW_CHAT, () => {
      window.dispatchEvent(new Event(OPEN_NEW_WORKSPACE_DIALOG_EVENT));
    });
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
    const offCloseTab = window.hilo.ipcRenderer.on(IPC_CHANNELS.MENU_CLOSE_TAB, () => {
      const event = new CustomEvent(IPC_CHANNELS.DOM_CLOSE_TAB, {
        cancelable: true,
      });
      window.dispatchEvent(event);
      if (event.defaultPrevented) return;
      const search2 = router.state.location.search;
      const workspaceId2 = search2?.workspaceId;
      if (!workspaceId2) return;
      const source = "menu-close-tab";
      const nextWorkspaceId = getNextPreviewTabIdAfterHide(getVisiblePreviewTabIds(), workspaceId2);
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
      void requestWorkspaceRuntimeClose(homeService.hiloApp, workspaceId2, source);
    });
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
