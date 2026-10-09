// home-widget-host.jsx
import { useTranslation, reactExports, dedupedToast, usePlatform, useStorage, X$7 } from "../vendor.js";
import { useAuth } from "../m15/apply-asset-change.jsx";
import { HOME_INPUT_COACH_MARK_ID, ASSET_CENTER_RELOCATION_REVISION } from "../m15/check-cloud-asset-upload.js";
import { DEFAULT_HOME_WIDGET_CONFIG } from "../m15/deferred-thumbnail-image-generation.jsx";
import { useHomeWidgetDevPreviewMode } from "../m15/global-sidebar-provider.jsx";
import { openExternalUrl } from "../m15/graph.jsx";
import { useRouterState } from "../m15/linked-list.js";
import { Upload } from "../m15/parse-item.jsx";
import { TRACK_EVENTS } from "../m15/track-events.js";
import { useGatewayFetch, useResizableWidth } from "../m15/use-resizable-width.js";
import { Button$1, cn$2 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { ResizeColHandle } from "../m10/asset-center-relocation-coach-mark.jsx";
import {
  useCoachMarkSequence,
  ASSET_CENTER_RELOCATION_SPOTLIGHT,
} from "../m10/asset-mention-list.jsx";
import { CoachMarkPopup } from "../m10/use-coach-mark.jsx";
import { useHubClientConfig } from "../m10/use-new-workspace-dialog.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FileExplorer } from "./file-explorer.jsx";
import { CanvasSidebarHeader } from "./team-assets-sidebar-panel.jsx";
import { AssetsTabPanel, FilePanelCoachMarks } from "./use-canvas-tags.jsx";
function LeftSidebar({ initialFolderPath, isActive: isActive2 = true, onClose, mode: mode2 }) {
  const containerRef = reactExports.useRef(null);
  const platform2 = usePlatform();
  const { t: t2 } = useTranslation();
  const [, setRootPath] = reactExports.useState(null);
  const openWithSystem = reactExports.useCallback(
    async (path2) => {
      if (!platform2.shell.openPath) return;
      try {
        await platform2.shell.openPath(path2);
      } catch {
        dedupedToast.error(t2("fileExplorer.openFailed"));
      }
    },
    [platform2, t2],
  );
  const handleFileOpen = reactExports.useCallback(
    (path2, _name) => {
      openWithSystem(path2);
    },
    [openWithSystem],
  );
  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-hidden">
      <FilePanelCoachMarks containerRef={containerRef} isActive={isActive2} />
      <div className="flex flex-col overflow-hidden flex-1 min-h-0">
        <FileExplorer
          onFileOpen={handleFileOpen}
          onRootPathChange={setRootPath}
          initialRootPath={initialFolderPath || void 0}
          isActive={isActive2}
          onClose={onClose}
          mode={mode2}
        />
      </div>
    </div>
  );
}
function UploadFilesFooter() {
  const { t: t2 } = useTranslation();
  const gatewayFetch2 = useGatewayFetch();
  const inputRef = reactExports.useRef(null);
  const [uploading, setUploading] = reactExports.useState(false);
  const onPick = reactExports.useCallback(() => {
    if (uploading) return;
    inputRef.current?.click();
  }, [uploading]);
  const onChange = reactExports.useCallback(
    async (e2) => {
      const files = Array.from(e2.target.files ?? []);
      e2.target.value = "";
      if (files.length === 0) return;
      setUploading(true);
      let okCount = 0;
      const failed = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        try {
          const res = await gatewayFetch2("/api/upload", {
            method: "POST",
            body: form,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          okCount += 1;
        } catch {
          failed.push(file.name);
        }
      }
      setUploading(false);
      if (failed.length === 0) {
        dedupedToast.success(
          t2("fileExplorer.uploadSuccess", {
            count: okCount,
            defaultValue: "已上传 {{count}} 个文件",
          }),
        );
      } else if (okCount === 0) {
        dedupedToast.error(
          t2("fileExplorer.uploadFailedAll", {
            count: failed.length,
            defaultValue: "上传失败：{{count}} 个文件",
          }),
        );
      } else {
        dedupedToast.warning(
          t2("fileExplorer.uploadPartial", {
            ok: okCount,
            failed: failed.length,
            defaultValue: "已上传 {{ok}} 个，失败 {{failed}} 个",
          }),
        );
      }
    },
    [gatewayFetch2, t2],
  );
  return (
    <div className="shrink-0 border-t border-border p-2">
      <button
        type="button"
        data-action-ui-id="canvas-sidebar-upload-files"
        disabled={uploading}
        onClick={onPick}
        className="flex h-8 w-full cursor-pointer items-center justify-center gap-1 rounded-md bg-foreground/[0.04] text-[12px] font-medium text-foreground/80 transition-colors hover:bg-foreground/[0.08] hover:text-foreground dark:bg-foreground/[0.08] dark:hover:bg-foreground/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Upload size={14} strokeWidth={1.5} />
        {uploading
          ? t2("fileExplorer.uploading", {
              defaultValue: "上传中…",
            })
          : t2("fileExplorer.uploadFile", {
              defaultValue: "上传文件",
            })}
      </button>
      <input ref={inputRef} type="file" multiple={true} className="hidden" onChange={onChange} />
    </div>
  );
}
function FilePanel({ initialFolderPath, isActive: isActive2 = true, onClose, mode: mode2 }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <LeftSidebar
          initialFolderPath={initialFolderPath}
          isActive={isActive2}
          onClose={onClose}
          mode={mode2}
        />
      </div>
      {mode2 === "docked" ? <UploadFilesFooter /> : null}
    </div>
  );
}
function ContentPanel({
  activeTab,
  initialFolderPath,
  isActive: isActive2 = true,
  onClose,
  mode: mode2,
  onManageActiveChange,
}) {
  const canvasActive = activeTab === "canvas";
  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-card"
      data-action-ui-id="canvas-sidebar.content-shell"
      data-active-tab={activeTab}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className={cn$2(
            "absolute inset-0 overflow-hidden",
            canvasActive ? "visible z-10" : "invisible z-0 pointer-events-none",
          )}
          aria-hidden={!canvasActive}
          inert={!canvasActive}
          data-slot="canvas-sidebar-canvas-surface"
        >
          <FilePanel
            initialFolderPath={initialFolderPath}
            isActive={isActive2 && canvasActive}
            onClose={onClose}
            mode={mode2}
          />
        </div>
        {activeTab === "assets" ? (
          <div
            className="absolute inset-0 z-10 overflow-hidden"
            data-slot="canvas-sidebar-assets-surface"
          >
            <AssetsTabPanel onManageActiveChange={onManageActiveChange} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
const CONTENT_PANEL_DEFAULT_WIDTH = 320;
const CONTENT_PANEL_MIN_WIDTH = 240;
const CONTENT_PANEL_MAX_WIDTH = 480;
export const SKILL_DRAG_MIME = "application/x-hilo-skill";
export const PLUGIN_DRAG_MIME = "application/x-hilo-plugin";
const PANEL_TRANSITION_MS = 200;
const PANEL_TRANSITION_FALLBACK_MS = PANEL_TRANSITION_MS + 40;
const MIN_CANVAS_WIDTH_BESIDE_DOCKED_FILES = 220;
const CANVAS_SIDEBAR_NAVIGATION_EVENT = "canvas-sidebar:navigate";
const canvasSidebarNavigation = new EventTarget();
export function useCanvasSidebar() {
  const openTab = reactExports.useCallback((tab2) => {
    canvasSidebarNavigation.dispatchEvent(
      new CustomEvent(CANVAS_SIDEBAR_NAVIGATION_EVENT, {
        detail: {
          tab: tab2,
        },
      }),
    );
  }, []);
  return {
    openTab,
  };
}
export function useCanvasSidebarController({
  isActive: isActive2,
  expanded: controlledExpanded,
  onExpandedChange,
  resizeFrom = "right",
} = {}) {
  const [config2, setConfig] = useStorage("global.config");
  const [uncontrolledExpanded, setUncontrolledExpanded] = reactExports.useState(false);
  const expanded = controlledExpanded ?? uncontrolledExpanded;
  const active2 = isActive2 ?? true;
  const configRef = reactExports.useRef(config2);
  configRef.current = config2;
  const widthStorage = reactExports.useMemo(
    () => ({
      read: () => configRef.current.canvasSidebarWidth,
      write: (value) =>
        setConfig((prev) => ({
          ...prev,
          canvasSidebarWidth: value,
        })),
    }),
    [setConfig],
  );
  const {
    width,
    onMouseDown: handleResizeMouseDown,
    onValueChange: handleResizeValueChange,
    reset: handleResetWidth,
  } = useResizableWidth({
    defaultWidth: CONTENT_PANEL_DEFAULT_WIDTH,
    minWidth: CONTENT_PANEL_MIN_WIDTH,
    maxWidth: CONTENT_PANEL_MAX_WIDTH,
    storage: widthStorage,
    externalValue: config2.canvasSidebarWidth,
    invertDelta: resizeFrom === "left",
  });
  const handleTogglePanel = reactExports.useCallback(() => {
    const next2 = !expanded;
    if (controlledExpanded === void 0) setUncontrolledExpanded(next2);
    onExpandedChange?.(next2);
  }, [controlledExpanded, expanded, onExpandedChange]);
  const shouldOpen = active2 && expanded;
  const [contentMounted, setContentMounted] = reactExports.useState(shouldOpen);
  const [panelPhase, setPanelPhase] = reactExports.useState(shouldOpen ? "open" : "closed");
  const contentMountedRef = reactExports.useRef(contentMounted);
  contentMountedRef.current = contentMounted;
  reactExports.useEffect(() => {
    if (!active2) {
      setContentMounted(false);
      setPanelPhase("closed");
      return;
    }
    if (expanded) {
      setContentMounted(true);
      setPanelPhase("opening");
      let innerFrame = 0;
      const frame2 = requestAnimationFrame(() => {
        innerFrame = requestAnimationFrame(() => setPanelPhase("open"));
      });
      return () => {
        cancelAnimationFrame(frame2);
        cancelAnimationFrame(innerFrame);
      };
    }
    if (!contentMountedRef.current) {
      setPanelPhase("closed");
      return;
    }
    setPanelPhase("closing");
    const timeout2 = window.setTimeout(() => {
      setPanelPhase("closed");
    }, PANEL_TRANSITION_FALLBACK_MS);
    return () => window.clearTimeout(timeout2);
  }, [active2, expanded]);
  const handleContentTransitionEnd = reactExports.useCallback(
    (event) => {
      if (event.currentTarget !== event.target || event.propertyName !== "transform") return;
      if (panelPhase !== "closing") return;
      setPanelPhase("closed");
    },
    [panelPhase],
  );
  return {
    active: active2,
    expanded,
    width,
    contentMounted,
    panelIsOpen: shouldOpen && panelPhase === "open",
    handleTogglePanel,
    handleResizeMouseDown,
    handleResizeValueChange,
    handleResetWidth,
    handleContentTransitionEnd,
  };
}
export function resolveCanvasSidebarRightEdgeInset(presentation, width) {
  const safeWidth = Math.max(0, width);
  if (presentation === "drawer") return safeWidth;
  if (presentation === "drawer-overlay") return safeWidth + 8;
  return 0;
}
export const CanvasSidebarOverlay = reactExports.memo(function CanvasSidebarOverlay2({
  id: id2,
  controller,
  initialFolderPath,
  mode: mode2,
  seamSide,
  layoutOrder,
  onToggleDock,
  onPresentationChange,
}) {
  const { t: t2 } = useTranslation();
  const overlayRef = reactExports.useRef(null);
  const [hostWidth, setHostWidth] = reactExports.useState(0);
  const [activeTab, setActiveTab] = reactExports.useState("canvas");
  const [manageActive, setManageActive] = reactExports.useState(false);
  const {
    active: active2,
    contentMounted,
    expanded,
    handleTogglePanel,
    handleContentTransitionEnd,
    handleResetWidth,
    handleResizeMouseDown,
    handleResizeValueChange,
    panelIsOpen,
    width,
  } = controller;
  const handleClosePanel = reactExports.useCallback(() => {
    if (!expanded) return;
    const workspaceRoot = overlayRef.current?.closest('[data-canvas-sidebar-root="true"]');
    handleTogglePanel();
    requestAnimationFrame(() => {
      workspaceRoot?.querySelector('[data-action-ui-id="canvas.toolbar-project-assets"]')?.focus({
        preventScroll: true,
      });
    });
  }, [expanded, handleTogglePanel]);
  reactExports.useEffect(() => {
    const handleNavigation = (event) => {
      const tab2 = event.detail?.tab;
      if (!active2 || (tab2 !== "canvas" && tab2 !== "assets")) return;
      setActiveTab(tab2);
      if (!expanded) handleTogglePanel();
    };
    canvasSidebarNavigation.addEventListener(CANVAS_SIDEBAR_NAVIGATION_EVENT, handleNavigation);
    return () =>
      canvasSidebarNavigation.removeEventListener(
        CANVAS_SIDEBAR_NAVIGATION_EVENT,
        handleNavigation,
      );
  }, [active2, expanded, handleTogglePanel]);
  reactExports.useEffect(() => {
    if (!active2 || !contentMounted) return;
    const host = overlayRef.current?.parentElement;
    if (!host) return;
    const syncWidth = () => {
      const next2 = host.getBoundingClientRect().width || host.clientWidth;
      setHostWidth((previous2) => (previous2 === next2 ? previous2 : next2));
    };
    syncWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncWidth);
      return () => window.removeEventListener("resize", syncWidth);
    }
    const observer2 = new ResizeObserver(syncWidth);
    observer2.observe(host);
    return () => observer2.disconnect();
  }, [active2, contentMounted]);
  const isDocked = mode2 === "docked";
  const MANAGE_VIEW_WIDTH = 720;
  const effectiveWidth = manageActive ? MANAGE_VIEW_WIDTH : width;
  const isStructurallyDocked =
    isDocked && expanded && hostWidth >= effectiveWidth + MIN_CANVAS_WIDTH_BESIDE_DOCKED_FILES;
  const isDockedOverlay = isDocked && expanded && !isStructurallyDocked;
  const presentation =
    !active2 || !contentMounted || !expanded
      ? "closed"
      : isStructurallyDocked
        ? "drawer"
        : isDockedOverlay
          ? "drawer-overlay"
          : "bubble";
  reactExports.useLayoutEffect(() => {
    onPresentationChange?.(presentation);
  }, [onPresentationChange, presentation]);
  reactExports.useEffect(
    () => () => {
      onPresentationChange?.("closed");
    },
    [onPresentationChange],
  );
  if (!active2 || !contentMounted) return null;
  const closedTransform = seamSide === "left" ? "-translate-x-2" : "translate-x-2";
  const content2 = (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden" data-density="compact">
      <CanvasSidebarHeader
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        onClose={handleClosePanel}
        mode={mode2}
        onToggleDock={onToggleDock}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        <ContentPanel
          activeTab={activeTab}
          initialFolderPath={initialFolderPath}
          isActive={active2 && expanded}
          onClose={handleClosePanel}
          mode={mode2}
          onManageActiveChange={setManageActive}
        />
      </div>
    </div>
  );
  const resizeHandle = isStructurallyDocked ? (
    <ResizeColHandle
      tabIndex={0}
      aria-label={t2("a11y.resizeProjectAssetsPanel")}
      aria-orientation="vertical"
      aria-valuemin={CONTENT_PANEL_MIN_WIDTH}
      aria-valuemax={CONTENT_PANEL_MAX_WIDTH}
      aria-valuenow={width}
      data-action-ui-id="canvas-sidebar.resize-handle"
      indicatorVariant="grip"
      onMouseDown={handleResizeMouseDown}
      onValueChange={handleResizeValueChange}
      onDoubleClick={handleResetWidth}
      invertKeyboardDirection={seamSide === "right"}
    />
  ) : null;
  return (
    <aside
      id={id2}
      ref={overlayRef}
      aria-label={t2("canvasAssets.panelAria")}
      aria-hidden={!expanded}
      inert={!expanded}
      data-workspace-files-panel={mode2}
      data-workspace-files-presentation={presentation}
      data-sidebar-expanded={expanded ? "true" : "false"}
      data-seam-side={seamSide}
      className={`${isStructurallyDocked ? `relative z-20 h-full shrink-0 ${seamSide === "left" ? "border-r" : "border-l"} border-border-soft` : `elevated-surface-border absolute z-30 rounded-xl shadow-lg ${seamSide === "left" ? "left-2" : "right-2"} ${isDockedOverlay ? "top-2 bottom-2" : "bottom-16 h-[min(520px,calc(100%-72px))]"}`} flex min-h-0 ${isStructurallyDocked ? "overflow-visible" : "overflow-hidden"} bg-card/95 backdrop-blur-xl will-change-transform transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${panelIsOpen ? "translate-x-0 opacity-100" : `${closedTransform} opacity-0`}`}
      style={{
        width:
          isStructurallyDocked || isDockedOverlay
            ? effectiveWidth
            : manageActive
              ? MANAGE_VIEW_WIDTH
              : 320,
        maxWidth: isStructurallyDocked ? void 0 : "calc(100% - 16px)",
        order: layoutOrder,
      }}
      onTransitionEnd={handleContentTransitionEnd}
    >
      {seamSide === "right" ? resizeHandle : null}
      {content2}
      {seamSide === "left" ? resizeHandle : null}
    </aside>
  );
});
const LIBRARY_ANCHOR_SELECTOR = [
  '[data-action-ui-id="canvas-sidebar-assets.library-entry"]',
  '[data-action-ui-id="canvas-sidebar-assets.library-heading"]',
].join(",");
export function WorkspaceAssetCenterRelocationCoachMark({ enabled, workspaceId: workspaceId2 }) {
  const { t: t2 } = useTranslation();
  const { openTab } = useCanvasSidebar();
  const anchorRef = reactExports.useRef(null);
  const [anchorEl, setAnchorEl] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!enabled) {
      anchorRef.current = null;
      setAnchorEl(null);
      return;
    }
    const resolveAnchor = () => {
      const workspaceRoot = Array.from(
        document.querySelectorAll("[data-workspace-runtime-id]"),
      ).find((element2) => element2.dataset.workspaceRuntimeId === workspaceId2);
      const next2 = workspaceRoot?.querySelector(LIBRARY_ANCHOR_SELECTOR) ?? null;
      anchorRef.current = next2;
      setAnchorEl((current2) => (current2 === next2 ? current2 : next2));
    };
    resolveAnchor();
    const observer2 = new MutationObserver(resolveAnchor);
    observer2.observe(document.body, {
      childList: true,
      subtree: true,
    });
    return () => observer2.disconnect();
  }, [enabled, workspaceId2]);
  const sequence = useCoachMarkSequence(
    HOME_INPUT_COACH_MARK_ID,
    [
      {
        revision: ASSET_CENTER_RELOCATION_REVISION,
        onEnter: () => openTab("assets"),
      },
    ],
    enabled,
    void 0,
    {
      persistOnEscape: false,
    },
  );
  if (!anchorEl) return null;
  const handleDismiss = (method) => {
    if (method === "button") {
      sequence.dismiss(method);
      return;
    }
    sequence.closeWithoutPersisting(method);
  };
  return (
    <CoachMarkPopup
      open={sequence.isOpen}
      onDismiss={handleDismiss}
      anchorRef={anchorRef}
      anchorEl={anchorEl}
      side="right"
      align="start"
      title={t2("coachMark.workspace.assetCenterRelocation.title", "这里就是新家")}
      description={t2(
        "coachMark.workspace.assetCenterRelocation.desc",
        "以后可以在这里找到并使用原资产中心里的素材。",
      )}
      ctaLabel={t2("coachMark.gotIt", "我知道了")}
      stepCurrent={2}
      stepTotal={2}
      showClose={true}
      showSpotlight={ASSET_CENTER_RELOCATION_SPOTLIGHT}
      actionUiId="coach-mark-asset-center-relocation-workspace"
    />
  );
}
const HOME_WIDGET_DISMISSAL_PREFIX = "hilo.home-widget.dismissed";
function getHomeSurveyDismissalKey(accountScope, surveyId) {
  return `${HOME_WIDGET_DISMISSAL_PREFIX}.${JSON.stringify([accountScope, surveyId])}`;
}
function isHomeSurveyDismissed(
  accountScope,
  surveyId,
  now2 = Date.now(),
  storage = typeof window === "undefined" ? void 0 : window.localStorage,
) {
  if (!storage) return false;
  try {
    const raw2 = storage.getItem(getHomeSurveyDismissalKey(accountScope, surveyId));
    if (!raw2) return false;
    const dismissedUntil = Number(raw2);
    return Number.isFinite(dismissedUntil) && dismissedUntil > now2;
  } catch {
    return false;
  }
}
function dismissHomeSurvey(
  accountScope,
  surveyId,
  cooldownMs,
  now2 = Date.now(),
  storage = typeof window === "undefined" ? void 0 : window.localStorage,
) {
  if (!storage) return;
  try {
    storage.setItem(
      getHomeSurveyDismissalKey(accountScope, surveyId),
      String(now2 + Math.max(0, cooldownMs)),
    );
  } catch {}
}
const HomeSurveyCard = ({ survey, onCta, onDismiss }) => {
  const { t: t2 } = useTranslation();
  const [imageVisible, setImageVisible] = reactExports.useState(true);
  reactExports.useEffect(() => {
    setImageVisible(Boolean(survey.imageUrl));
  }, [survey.imageUrl]);
  return (
    <article
      className="elevated-surface-border w-full overflow-hidden rounded-[10px] bg-popover p-[3px] text-popover-foreground shadow-lg"
      data-action-ui-id="home-widget.survey"
    >
      <div className="relative">
        <div data-action-ui-id="home-widget.survey.preview">
          {imageVisible ? (
            <div className="relative aspect-[16/8] w-full overflow-hidden rounded-[7px] bg-muted">
              <img
                src={survey.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                onError={() => setImageVisible(false)}
              />
            </div>
          ) : null}
          <div className="px-2 pt-2 pb-1">
            <h3 className="line-clamp-2 text-sm font-medium text-foreground">{survey.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {survey.description}
            </p>
          </div>
        </div>
        {survey.dismissible ? (
          <button
            type="button"
            className="absolute top-1.5 right-1.5 z-10 inline-flex size-5 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/45 text-white transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/80"
            onClick={onDismiss}
            aria-label={t2("common.close")}
            data-action-ui-id="home-widget.survey.close"
          >
            <X$7 className="size-2.5" strokeWidth={1.8} />
          </button>
        ) : null}
      </div>
      <div className="px-2 pt-1 pb-2">
        <Button$1
          type="button"
          size="sm"
          className={cn$2("h-8 w-full min-w-0 rounded-[7px]")}
          onClick={onCta}
          data-action-ui-id="home-widget.survey.cta"
        >
          {survey.ctaLabel}
        </Button$1>
      </div>
    </article>
  );
};
export const HomeWidgetHost = () => {
  const pathname = useRouterState({
    select: (state2) => state2.location.pathname,
  });
  const isHomeRoute = pathname === "/";
  const { user } = useAuth();
  const accountScope = user?.userID ? `user:${user.userID}` : "anonymous";
  const { homeWidget: configuredWidget } = useHubClientConfig();
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const preview = useHomeWidgetDevPreviewMode();
  const isSurveyPreview = preview.selection === "survey";
  const homeWidget =
    preview.selection === "empty" || preview.selection === "update"
      ? {
          enabled: false,
          survey: null,
        }
      : (configuredWidget ?? DEFAULT_HOME_WIDGET_CONFIG);
  const survey = homeWidget.survey;
  const surveyId = survey?.id ?? null;
  const surveyKey = surveyId ? getHomeSurveyDismissalKey(accountScope, surveyId) : null;
  const [dismissedSurveyKey, setDismissedSurveyKey] = reactExports.useState(() =>
    !isSurveyPreview && surveyId && isHomeSurveyDismissed(accountScope, surveyId)
      ? surveyKey
      : null,
  );
  const ctaRequestRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    void preview.revision;
    setDismissedSurveyKey(
      !isSurveyPreview && surveyId && isHomeSurveyDismissed(accountScope, surveyId)
        ? surveyKey
        : null,
    );
    ctaRequestRef.current = null;
    return () => {
      ctaRequestRef.current = null;
    };
  }, [accountScope, surveyId, surveyKey, preview.revision, isSurveyPreview]);
  const surveyAvailable = Boolean(
    isHomeRoute &&
    homeWidget.enabled &&
    survey &&
    surveyKey !== dismissedSurveyKey &&
    (isSurveyPreview || !isHomeSurveyDismissed(accountScope, survey.id)),
  );
  reactExports.useEffect(() => {
    if (!surveyAvailable || !survey || isSurveyPreview) return;
    trackEvent(TRACK_EVENTS.HOME_WIDGET_VIEW, {
      widget_type: "survey",
      widget_id: survey.id,
      placement: "home-bottom-right",
    });
  }, [survey, surveyAvailable, isSurveyPreview]);
  const handleDismissSurvey = () => {
    if (!survey?.dismissible) return;
    if (!isSurveyPreview) dismissHomeSurvey(accountScope, survey.id, survey.cooldownMs);
    setDismissedSurveyKey(surveyKey);
    if (!isSurveyPreview) {
      trackEvent(TRACK_EVENTS.HOME_WIDGET_DISMISS, {
        widget_type: "survey",
        widget_id: survey.id,
        placement: "home-bottom-right",
      });
    }
  };
  const handleSurveyCta = () => {
    if (!survey || ctaRequestRef.current) return;
    const requestToken = Symbol();
    ctaRequestRef.current = requestToken;
    if (!isSurveyPreview) {
      trackEvent(TRACK_EVENTS.HOME_WIDGET_CLICK, {
        widget_type: "survey",
        widget_id: survey.id,
        placement: "home-bottom-right",
        action: "cta",
      });
    }
    void openExternalUrl(platform2, survey.ctaUrl, {
      source: "home-widget.survey",
    }).then((opened) => {
      if (opened && !isSurveyPreview) {
        dismissHomeSurvey(accountScope, survey.id, survey.cooldownMs);
      }
      if (ctaRequestRef.current !== requestToken) return;
      ctaRequestRef.current = null;
      if (opened) {
        setDismissedSurveyKey(surveyKey);
        return;
      }
      if (!isSurveyPreview) {
        trackEvent(TRACK_EVENTS.HOME_WIDGET_ACTION_FAILED, {
          widget_type: "survey",
          widget_id: survey.id,
          placement: "home-bottom-right",
          action: "cta",
          reason: "external_link_failed",
        });
      }
      dedupedToast.error(t2("homeWidget.actionFailed"));
    });
  };
  if (!surveyAvailable || !survey) return null;
  return (
    <div
      className={cn$2(
        "pointer-events-none absolute right-4 bottom-4 z-40 w-[min(256px,calc(100%-2rem))]",
      )}
      data-action-ui-id="home-widget"
      data-widget-type="survey"
    >
      <div className="pointer-events-auto">
        <HomeSurveyCard survey={survey} onCta={handleSurveyCta} onDismiss={handleDismissSurvey} />
      </div>
    </div>
  );
};
