// canvas-sidebar-overlay.jsx
import { reactExports, useCurrentWorkspace, usePlatform, useStorage, useTranslation, X$7 as X } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { useWorkspaceProject } from "./normalize-project-entries.js";
import { useProjectAssetsService } from "../infra/new-folder-dialog.jsx";
import { useProjectActions } from "../settings/use-project-actions.js";
import {
  Icon,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { getFileManagerLabelKey } from "../settings/request-prompt-prefill.jsx";
import { cn$2 as cn, TooltipContent } from "../infra/dialog-content.jsx";
import { LocalFolderIcon } from "./home-service.jsx";
import { Maximize2, Minimize2, Upload } from "../media-editing/package.jsx";
import {
  folderNameFromPath,
  useGatewayFetch,
  workspaceDisplayName,
} from "../generation/use-model-catalog-scope-key.js";
import { SegmentedSwitch } from "../canvas/popover-title.jsx";
import {
  CDN_COACHMARK_FILE_LOCATE,
  CDN_COACHMARK_FILE_VIEW,
} from "./context-menu-content.jsx";
import { useLocation } from "../vendor-inline/vscode-base/linked-list.js";
import { useCoachMarkSequence } from "../assets/use-coach-mark-sequence.js";
import { resolveShortcutDisplay } from "./other-modifiers.js";
import { CoachMarkPopup } from "./coach-mark-popup.jsx";
import { FileExplorer } from "../generation/file-explorer.jsx";
import { AssetsTabPanel } from "../canvas/assets-tab-panel.jsx";
import {
  CANVAS_SIDEBAR_NAVIGATION_EVENT,
  canvasSidebarNavigation,
  CONTENT_PANEL_MAX_WIDTH,
  CONTENT_PANEL_MIN_WIDTH,
} from "./workspace-asset-center-relocation-coach-mark.jsx";
import { ResizeColHandle } from "../assets/resize-col-handle.jsx";
function useProjectAssetsDir() {
  const platform2 = usePlatform();
  const workspacePath = useCurrentWorkspace();
  const project2 = useWorkspaceProject(workspacePath || void 0);
  const { ensureProjectFolderName } = useProjectActions();
  const service2 = useProjectAssetsService();
  const [dir, setDir] = reactExports.useState(void 0);
  const projectId = project2?.id;
  reactExports.useEffect(() => {
    if (!projectId) {
      setDir(void 0);
      return;
    }
    let disposed = false;
    void (async () => {
      const folderName = await ensureProjectFolderName(projectId);
      if (!folderName || disposed) return;
      const resolved = await service2.getAssetsDir(folderName);
      if (disposed) return;
      try {
        await platform2.fs.mkdir(resolved);
      } catch {}
      if (!disposed) setDir(resolved);
    })().catch(() => {
      if (!disposed) setDir(void 0);
    });
    return () => {
      disposed = true;
    };
  }, [ensureProjectFolderName, platform2.fs, projectId, service2]);
  return dir;
}
const BUTTON_CLASS =
  "inline-flex items-center justify-center overflow-hidden rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50";
function CanvasAssetsFinderMenu({
  projectFolderPath,
  outputFolderPath,
  compact = false,
}) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const primaryPath = outputFolderPath || projectFolderPath;
  const openDirectory = reactExports.useCallback(
    async (path2) => {
      if (!path2) return;
      try {
        if (platform2.shell.openPath) {
          await platform2.shell.openPath(path2);
          return;
        }
        if (platform2.shell.showItemInFolder) {
          await platform2.shell.showItemInFolder(path2);
          return;
        }
        dedupedToast.error(t2("fileExplorer.platformNotSupported"));
      } catch {
        dedupedToast.error(t2("fileExplorer.openFailed"));
      }
    },
    [platform2.shell, t2],
  );
  const openLabel = t2(getFileManagerLabelKey(platform2.app.os));
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className={cn(BUTTON_CLASS, compact ? "size-6" : "size-7")}
              aria-label={openLabel}
              disabled={!primaryPath}
              onClick={() => void openDirectory(primaryPath)}
              data-action-ui-id="canvas-assets.open-output-folder"
              data-slot="canvas-assets-finder-button"
            />
          }
        >
          <LocalFolderIcon
            os={platform2.app.os}
            className={cn("shrink-0", compact ? "size-4" : "size-5")}
            aria-hidden="true"
          />
        </TooltipTrigger>
        <TooltipContent side="bottom">{openLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
const PRESENTATION_BUTTON_CLASS =
  "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50";
function CanvasSidebarPresentationButton({ mode: mode2, onToggleDock }) {
  const { t: t2 } = useTranslation();
  const label =
    mode2 === "docked"
      ? t2("fileExplorer.compactFileExplorer", "Show compact file list")
      : t2("fileExplorer.expandFileExplorer", "Expand file list");
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={PRESENTATION_BUTTON_CLASS}
            aria-label={label}
            data-action-ui-id="canvas-sidebar.toggle-dock"
            onClick={onToggleDock}
          />
        }
      >
        <Icon
          icon={mode2 === "docked" ? Minimize2 : Maximize2}
          size="sm"
          aria-hidden={true}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
const HEADER_ACTION_BUTTON_CLASS =
  "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50";
function CanvasSidebarHeader({
  activeTab,
  onActiveTabChange,
  onClose,
  mode: mode2,
  onToggleDock,
}) {
  const { t: t2 } = useTranslation();
  const closeLabel = t2("common.close", "关闭");
  const workspacePath = useCurrentWorkspace();
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const displayName2 = reactExports.useMemo(() => {
    const recent = recentWorkspaces.find((w3) => w3.path === workspacePath);
    return recent
      ? workspaceDisplayName(recent)
      : folderNameFromPath(workspacePath);
  }, [recentWorkspaces, workspacePath]);
  const project2 = useWorkspaceProject(workspacePath);
  const projectName = project2?.name;
  const projectAssetsDir = useProjectAssetsDir();
  const options = reactExports.useMemo(() => {
    return [
      {
        value: "canvas",
        label: t2("canvasAssets.canvasTab", "Canvas"),
        ariaLabel: t2("canvasAssets.canvasTab", "Canvas"),
        dataActionUiId: "canvas-sidebar.tab-canvas",
      },
      {
        value: "assets",
        label: t2("canvasAssets.assetsTab", "Assets"),
        ariaLabel: t2("canvasAssets.assetsTab", "Assets"),
        dataActionUiId: "canvas-sidebar.tab-assets",
      },
    ];
  }, [t2]);
  return (
    <div
      className="flex shrink-0 flex-col"
      data-slot="canvas-sidebar-header"
      data-action-ui-id="canvas-sidebar.header"
    >
      <div className="flex shrink-0 items-start gap-1 px-2 pt-3 pb-3">
        <div
          className="flex min-w-0 flex-1 flex-col gap-1.5 px-1 pt-1"
          data-slot="canvas-sidebar-header-title"
        >
          <span
            className="min-w-0 truncate text-sm font-medium leading-none text-foreground"
            title={displayName2}
          >
            {displayName2}
          </span>
          {projectName && (
            <span
              className="min-w-0 truncate text-xs leading-none text-muted-foreground"
              title={projectName}
            >
              {projectName}
            </span>
          )}
        </div>
        <TooltipProvider>
          <div className="flex shrink-0 items-center gap-0.5">
            <CanvasAssetsFinderMenu
              projectFolderPath={workspacePath}
              outputFolderPath={
                activeTab === "assets" ? projectAssetsDir : void 0
              }
              compact={true}
            />
            <CanvasSidebarPresentationButton
              mode={mode2}
              onToggleDock={onToggleDock}
            />
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className={HEADER_ACTION_BUTTON_CLASS}
                    aria-label={closeLabel}
                    data-action-ui-id="canvas-sidebar.close"
                    onClick={onClose}
                  />
                }
              >
                <Icon icon={X} size="sm" aria-hidden={true} />
              </TooltipTrigger>
              <TooltipContent side="bottom">{closeLabel}</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
      <div className="flex h-10 shrink-0 items-center px-2 pb-1">
        <SegmentedSwitch
          value={activeTab}
          options={options}
          onValueChange={onActiveTabChange}
          ariaLabel={t2("canvasAssets.tabSwitcherAria", "Project content")}
          dataActionUiId="canvas-sidebar.tab-switcher"
          thumbDataSlot="canvas-sidebar-tab-thumb"
          variant="label"
          stretch={true}
          className="min-w-0 flex-1"
          itemClassName="px-2"
        />
      </div>
    </div>
  );
}
const MARK_ID = "file-panel-intro";
const STEP_MEDIA_URLS = [CDN_COACHMARK_FILE_LOCATE, CDN_COACHMARK_FILE_VIEW];
function queryAnchor(root2, actionUiId) {
  return root2?.querySelector(`[data-action-ui-id="${actionUiId}"]`) ?? null;
}
function FilePanelCoachMarks({ containerRef, isActive: isActive2 }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const { pathname } = useLocation();
  const [armed, setArmed] = reactExports.useState(false);
  const triggeredRef = reactExports.useRef(false);
  const [anchorEl, setAnchorEl] = reactExports.useState(null);
  const anchorRef = reactExports.useRef(null);
  anchorRef.current = anchorEl;
  const firstHoveredRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const container = containerRef.current;
    if (!container || armed || !isActive2) return;
    const onOver = (e2) => {
      const target = e2.target;
      const item = target?.closest('[data-coach-anchor="file-item"]');
      if (item) {
        firstHoveredRef.current = item;
        triggeredRef.current = true;
        setArmed(true);
      }
    };
    container.addEventListener("pointerover", onOver);
    return () => container.removeEventListener("pointerover", onOver);
  }, [containerRef, armed, isActive2]);
  const resolvers = [
    () =>
      firstHoveredRef.current ??
      queryAnchor(containerRef.current, "file-view-mode-toggle"),
    () => queryAnchor(containerRef.current, "file-view-mode-toggle"),
  ];
  const seq2 = useCoachMarkSequence(
    MARK_ID,
    // The sequence only needs the step count; anchor resolution is driven by the
    // effect below (so it also re-resolves on route changes).
    resolvers.map(() => ({})),
    armed && isActive2,
  );
  reactExports.useEffect(() => {
    if (isActive2 || !triggeredRef.current || seq2.isDismissed) return;
    seq2.dismiss("close");
  }, [isActive2, seq2.dismiss, seq2.isDismissed]);
  reactExports.useEffect(() => {
    if (!seq2.isOpen || !isActive2) {
      setAnchorEl(null);
      return;
    }
    setAnchorEl(null);
    const resolver2 = resolvers[seq2.index];
    if (!resolver2) return;
    let tries = 0;
    let raf = 0;
    const tick = () => {
      const el = resolver2();
      if (el?.isConnected && el.offsetParent !== null) {
        setAnchorEl(el);
        return;
      }
      if (tries++ < 60) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [seq2.isOpen, seq2.index, pathname]);
  if (!isActive2 || !seq2.isOpen || !anchorEl) return null;
  const treeViewShortcut = resolveShortcutDisplay(
    "CommandOrControl+1",
    platform2.app.os,
  ).text;
  const gridViewShortcut = resolveShortcutDisplay(
    "CommandOrControl+2",
    platform2.app.os,
  ).text;
  const STEP_COPY = [
    {
      title: t2("coachMark.file.locate.title", "在画布定位"),
      desc: t2(
        "coachMark.file.locate.desc",
        "在资源面板右键「在画布定位」，快速在画布中找到对应素材",
      ),
      side: "right",
      mediaUrl: CDN_COACHMARK_FILE_LOCATE,
    },
    {
      title: t2("coachMark.file.view.title", "两种视图可切换"),
      desc: t2(
        "coachMark.file.view.desc",
        "点击此处或资源面板按 {{treeShortcut}} / {{gridShortcut}} 切换排序 / 视图模式",
        {
          treeShortcut: treeViewShortcut,
          gridShortcut: gridViewShortcut,
        },
      ),
      side: "bottom",
      mediaUrl: CDN_COACHMARK_FILE_VIEW,
    },
  ];
  const copy2 = STEP_COPY[seq2.index];
  if (!copy2) return null;
  return (
    <CoachMarkPopup
      open={isActive2 && seq2.isOpen}
      onDismiss={(method) =>
        method === "button" ? seq2.next() : seq2.dismiss(method)
      }
      anchorRef={anchorRef}
      anchorEl={anchorEl}
      side={copy2.side}
      align="start"
      title={copy2.title}
      description={copy2.desc}
      media={{
        url: copy2.mediaUrl,
        type: "image",
      }}
      preloadUrls={STEP_MEDIA_URLS}
      ctaLabel={
        seq2.isLast
          ? t2("coachMark.gotIt", "我知道了")
          : t2("coachMark.next", "下一步")
      }
      stepCurrent={seq2.stepCurrent}
      stepTotal={seq2.stepTotal}
      showClose={true}
      actionUiId={`coach-mark-${MARK_ID}`}
    />
  );
}
function LeftSidebar({
  initialFolderPath,
  isActive: isActive2 = true,
  onClose,
  mode: mode2,
}) {
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
      <input
        ref={inputRef}
        type="file"
        multiple={true}
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
function FilePanel({
  initialFolderPath,
  isActive: isActive2 = true,
  onClose,
  mode: mode2,
}) {
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
          className={cn(
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
const MIN_CANVAS_WIDTH_BESIDE_DOCKED_FILES = 220;
export const CanvasSidebarOverlay = reactExports.memo(
  function CanvasSidebarOverlay2({
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
      const workspaceRoot = overlayRef.current?.closest(
        '[data-canvas-sidebar-root="true"]',
      );
      handleTogglePanel();
      requestAnimationFrame(() => {
        workspaceRoot
          ?.querySelector('[data-action-ui-id="canvas.toolbar-project-assets"]')
          ?.focus({
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
      canvasSidebarNavigation.addEventListener(
        CANVAS_SIDEBAR_NAVIGATION_EVENT,
        handleNavigation,
      );
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
      isDocked &&
      expanded &&
      hostWidth >= effectiveWidth + MIN_CANVAS_WIDTH_BESIDE_DOCKED_FILES;
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
    const closedTransform =
      seamSide === "left" ? "-translate-x-2" : "translate-x-2";
    const content2 = (
      <div
        className="flex min-w-0 flex-1 flex-col overflow-hidden"
        data-density="compact"
      >
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
  },
);
