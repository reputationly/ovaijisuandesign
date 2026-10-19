// ==== 逐文件收敛 ====

// ==== 逐文件收敛 ====

// ==== 逐文件收敛 ====
import { CanvasLoadingPresenceContext } from "./canvas-loading-state.jsx";
import { WorkbenchProvider, cn as cn$5 } from "../canvas-v3/main-exports.js";
import { PageStateBoundary } from "../assets/page-state-boundary.jsx";
import { Alert, AlertDescription } from "../team/alert-variants.jsx";
import { Button as Button$3 } from "../canvas/node-shell-inner.jsx";
import { compact } from "../canvas-v3/ui-components.js";
// canvas-sidebar-overlay.jsx
import reactExports from "react";
import { useCurrentWorkspace } from "../infra/shared-runtime.js";
import { usePlatform } from "../infra/platform-context.js";
import { useTranslation } from "react-i18next";
import { useStorage } from "../infra/use-storage.js";
import { X$7 as CloseIcon } from "../media-editing/lucide-icon-wraps.js";
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
import { mergeTailwindClasses as cn, TooltipContent } from "../infra/dialog-content.jsx";
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
import { resolveShortcutDisplay } from "./resolve-shortcut-display.js";
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
import jsxRuntimeExports from "react/jsx-runtime";
import { WorkspaceLoadingDotField } from "./symbols.jsx";
import { MascotLoadingAnimation } from "./mascot-loading-animation.jsx";
// 产物里这一组声明在还原时整块丢了（构建不报错，运行时才炸）。来源：index-BBp4hclA.js
function CanvasLoadingState({ label, className }) {
  const reportPresence = reactExports.useContext(CanvasLoadingPresenceContext);
  reactExports.useLayoutEffect(() => {
    if (!reportPresence) return;
    reportPresence(1);
    return () => reportPresence(-1);
  }, [reportPresence]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn$5(
        "pointer-events-none flex size-full items-center justify-center overflow-hidden bg-background",
        className
      ),
      "data-action-ui-id": "canvas.restoring",
      role: "status",
      "aria-label": label,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 flex flex-col items-center gap-4 text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "workspace-loading-mascot-anchor", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceLoadingDotField, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MascotLoadingAnimation, {})
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", children: label })
      ] })
    }
  );
}

// 产物里这一组声明在还原时整块丢了（构建不报错，运行时才炸）。来源：index-BBp4hclA.js
function PanelLoadingPlaceholder({ label }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1", role: "status", "aria-busy": "true", "aria-label": label, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: label }) });
}

// 产物里这一组声明在还原时整块丢了（构建不报错，运行时才炸）。来源：index-BBp4hclA.js
function WorkspaceStructureView({
  mode: mode2,
  isActive: isActive2 = true
}) {
  const runtime = useOptionalWorkspaceStructure();
  const { t: t2 } = useTranslation();
  const retryInFlight = reactExports.useRef(false);
  const [retrying, setRetrying] = reactExports.useState(false);
  async function handleRetry() {
    if (!runtime || retryInFlight.current) return;
    retryInFlight.current = true;
    setRetrying(true);
    try {
      await runtime.retry();
    } finally {
      retryInFlight.current = false;
      setRetrying(false);
    }
  }
  if (!runtime) return null;
  if (!runtime.workbench && runtime.pending) {
    return mode2 === "directory" ? /* @__PURE__ */ jsxRuntimeExports.jsx(PanelLoadingPlaceholder, { label: t2("common.loading") }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CanvasLoadingState, { label: t2("common.loading") });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    PageStateBoundary,
    {
      error: !runtime.workbench && Boolean(runtime.error),
      errorOptions: { title: t2("workspace.structure.loadFailed"), retry: runtime.retry },
      density: "panel",
      children: runtime.workbench && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-0 flex-1 flex-col", children: [
        (!runtime.ready || runtime.error || runtime.subscriptionUnavailable) && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Alert,
          {
            role: runtime.error ? "alert" : "status",
            "aria-live": runtime.error ? "assertive" : "polite",
            "aria-busy": retrying,
            className: "shrink-0 rounded-none border-x-0 border-t-0",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, { className: "min-w-0 flex-1", children: runtime.subscriptionUnavailable && runtime.ready ? t2("workspace.structure.autoRefreshUnavailable") : runtime.error ? t2("workspace.structure.refreshFailed") : t2("workspace.structure.connectionUnavailable") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button$3,
                {
                  variant: "outline",
                  size: "sm",
                  loading: retrying,
                  "data-action-ui-id": `workspace.structure.${mode2}.retry`,
                  onClick: () => void handleRetry(),
                  children: retrying ? t2("common.loading") : t2("common.retry")
                }
              )
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchProvider, { workbench: runtime.workbench, queryClient: runtime.queryClient, children: /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceCompositionActions, { active: runtime.isActive && isActive2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceStructurePresentation, { children: mode2 === "directory" ? /* @__PURE__ */ jsxRuntimeExports.jsx(StructureDirectory, { active: runtime.isActive && isActive2 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(StructureList, { active: runtime.isActive && isActive2 }) }) }) })
      ] })
    }
  );
}

// 产物里这一组声明在还原时整块丢了（构建不报错，运行时才炸）。来源：index-BBp4hclA.js
function useOptionalWorkspaceStructure() {
  return reactExports.useContext(WorkspaceStructureContext);
}

// 产物里这一组声明在还原时整块丢了（构建不报错，运行时才炸）。来源：index-BBp4hclA.js
const WorkspaceStructureContext = reactExports.createContext(null);

function useProjectAssetsDir() {
  const platform = usePlatform();
  const workspacePath = useCurrentWorkspace();
  const project = useWorkspaceProject(workspacePath || void 0);
  const { ensureProjectFolderName } = useProjectActions();
  const service = useProjectAssetsService();
  const [directoryPath, setDirectoryPath] = reactExports.useState(void 0);
  const projectId = project?.id;
  reactExports.useEffect(() => {
    if (!projectId) {
      setDirectoryPath(void 0);
      return;
    }
    let disposed = false;
    void (async () => {
      const folderName = await ensureProjectFolderName(projectId);
      if (!folderName || disposed) return;
      const resolved = await service.getAssetsDir(folderName);
      if (disposed) return;
      try {
        await platform.fs.mkdir(resolved);
      } catch {}
      if (!disposed) setDirectoryPath(resolved);
    })().catch(() => {
      if (!disposed) setDirectoryPath(void 0);
    });
    return () => {
      disposed = true;
    };
  }, [ensureProjectFolderName, platform.fs, projectId, service]);
  return directoryPath;
}
const BUTTON_CLASS =
  "inline-flex items-center justify-center overflow-hidden rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50";
function CanvasAssetsFinderMenu({
  projectFolderPath,
  outputFolderPath,
  compact = false,
}) {
  const { t: translate } = useTranslation();
  const platform = usePlatform();
  const primaryPath = outputFolderPath || projectFolderPath;
  const openDirectory = reactExports.useCallback(
    async (path) => {
      if (!path) return;
      try {
        if (platform.shell.openPath) {
          await platform.shell.openPath(path);
          return;
        }
        if (platform.shell.showItemInFolder) {
          await platform.shell.showItemInFolder(path);
          return;
        }
        dedupedToast.error(translate("fileExplorer.platformNotSupported"));
      } catch {
        dedupedToast.error(translate("fileExplorer.openFailed"));
      }
    },
    [platform.shell, translate],
  );
  const openLabel = translate(getFileManagerLabelKey(platform.app.os));
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
            os={platform.app.os}
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
function CanvasSidebarPresentationButton({ mode, onToggleDock }) {
  const { t: translate } = useTranslation();
  const label =
    mode === "docked"
      ? translate("fileExplorer.compactFileExplorer", "Show compact file list")
      : translate("fileExplorer.expandFileExplorer", "Expand file list");
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
          icon={mode === "docked" ? Minimize2 : Maximize2}
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
  mode,
  onToggleDock,
}) {
  const { t: translate } = useTranslation();
  const closeLabel = translate("common.close", "关闭");
  const workspacePath = useCurrentWorkspace();
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const displayName = reactExports.useMemo(() => {
    const recent = recentWorkspaces.find((recentWorkspace) => recentWorkspace.path === workspacePath);
    return recent
      ? workspaceDisplayName(recent)
      : folderNameFromPath(workspacePath);
  }, [recentWorkspaces, workspacePath]);
  const project = useWorkspaceProject(workspacePath);
  const projectName = project?.name;
  const projectAssetsDir = useProjectAssetsDir();
  const options = reactExports.useMemo(() => {
    return [
      {
        value: "canvas",
        label: translate("canvasAssets.canvasTab", "Canvas"),
        ariaLabel: translate("canvasAssets.canvasTab", "Canvas"),
        dataActionUiId: "canvas-sidebar.tab-canvas",
      },
      {
        value: "assets",
        label: translate("canvasAssets.assetsTab", "Assets"),
        ariaLabel: translate("canvasAssets.assetsTab", "Assets"),
        dataActionUiId: "canvas-sidebar.tab-assets",
      },
    ];
  }, [translate]);
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
            title={displayName}
          >
            {displayName}
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
              mode={mode}
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
                <Icon icon={CloseIcon} size="sm" aria-hidden={true} />
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
          ariaLabel={translate("canvasAssets.tabSwitcherAria", "Project content")}
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
function queryAnchor(root, actionUiId) {
  return root?.querySelector(`[data-action-ui-id="${actionUiId}"]`) ?? null;
}
function FilePanelCoachMarks({ containerRef, isActive }) {
  const { t: translate } = useTranslation();
  const platform = usePlatform();
  const { pathname } = useLocation();
  const [armed, setArmed] = reactExports.useState(false);
  const triggeredRef = reactExports.useRef(false);
  const [anchorEl, setAnchorEl] = reactExports.useState(null);
  const anchorRef = reactExports.useRef(null);
  anchorRef.current = anchorEl;
  const firstHoveredRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const container = containerRef.current;
    if (!container || armed || !isActive) return;
    const onOver = (pointerEvent) => {
      const target = pointerEvent.target;
      const item = target?.closest('[data-coach-anchor="file-item"]');
      if (item) {
        firstHoveredRef.current = item;
        triggeredRef.current = true;
        setArmed(true);
      }
    };
    container.addEventListener("pointerover", onOver);
    return () => container.removeEventListener("pointerover", onOver);
  }, [containerRef, armed, isActive]);
  const resolvers = [
    () =>
      firstHoveredRef.current ??
      queryAnchor(containerRef.current, "file-view-mode-toggle"),
    () => queryAnchor(containerRef.current, "file-view-mode-toggle"),
  ];
  const seq = useCoachMarkSequence(
    MARK_ID,
    // The sequence only needs the step count; anchor resolution is driven by the
    // effect below (so it also re-resolves on route changes).
    resolvers.map(() => ({})),
    armed && isActive,
  );
  reactExports.useEffect(() => {
    if (isActive || !triggeredRef.current || seq.isDismissed) return;
    seq.dismiss("close");
  }, [isActive, seq.dismiss, seq.isDismissed]);
  reactExports.useEffect(() => {
    if (!seq.isOpen || !isActive) {
      setAnchorEl(null);
      return;
    }
    setAnchorEl(null);
    const resolver = resolvers[seq.index];
    if (!resolver) return;
    let tries = 0;
    let animationFrameId = 0;
    const tick = () => {
      const el = resolver();
      if (el?.isConnected && el.offsetParent !== null) {
        setAnchorEl(el);
        return;
      }
      if (tries++ < 60) animationFrameId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(animationFrameId);
  }, [seq.isOpen, seq.index, pathname]);
  if (!isActive || !seq.isOpen || !anchorEl) return null;
  const treeViewShortcut = resolveShortcutDisplay(
    "CommandOrControl+1",
    platform.app.os,
  ).text;
  const gridViewShortcut = resolveShortcutDisplay(
    "CommandOrControl+2",
    platform.app.os,
  ).text;
  const STEP_COPY = [
    {
      title: translate("coachMark.file.locate.title", "在画布定位"),
      desc: translate(
        "coachMark.file.locate.desc",
        "在资源面板右键「在画布定位」，快速在画布中找到对应素材",
      ),
      side: "right",
      mediaUrl: CDN_COACHMARK_FILE_LOCATE,
    },
    {
      title: translate("coachMark.file.view.title", "两种视图可切换"),
      desc: translate(
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
  const copy = STEP_COPY[seq.index];
  if (!copy) return null;
  return (
    <CoachMarkPopup
      open={isActive && seq.isOpen}
      onDismiss={(method) =>
        method === "button" ? seq.next() : seq.dismiss(method)
      }
      anchorRef={anchorRef}
      anchorEl={anchorEl}
      side={copy.side}
      align="start"
      title={copy.title}
      description={copy.desc}
      media={{
        url: copy.mediaUrl,
        type: "image",
      }}
      preloadUrls={STEP_MEDIA_URLS}
      ctaLabel={
        seq.isLast
          ? translate("coachMark.gotIt", "我知道了")
          : translate("coachMark.next", "下一步")
      }
      stepCurrent={seq.stepCurrent}
      stepTotal={seq.stepTotal}
      showClose={true}
      actionUiId={`coach-mark-${MARK_ID}`}
    />
  );
}
function LeftSidebar({
  initialFolderPath,
  isActive = true,
  onClose,
  mode,
}) {
  const containerRef = reactExports.useRef(null);
  const platform = usePlatform();
  const { t: translate } = useTranslation();
  const [, setRootPath] = reactExports.useState(null);
  const openWithSystem = reactExports.useCallback(
    async (path) => {
      if (!platform.shell.openPath) return;
      try {
        await platform.shell.openPath(path);
      } catch {
        dedupedToast.error(translate("fileExplorer.openFailed"));
      }
    },
    [platform, translate],
  );
  const handleFileOpen = reactExports.useCallback(
    (path, _name) => {
      openWithSystem(path);
    },
    [openWithSystem],
  );
  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-hidden">
      <FilePanelCoachMarks containerRef={containerRef} isActive={isActive} />
      <div className="flex flex-col overflow-hidden flex-1 min-h-0">
        <FileExplorer
          onFileOpen={handleFileOpen}
          onRootPathChange={setRootPath}
          initialRootPath={initialFolderPath || void 0}
          isActive={isActive}
          onClose={onClose}
          mode={mode}
        />
      </div>
    </div>
  );
}
function UploadFilesFooter() {
  const { t: translate } = useTranslation();
  const gatewayFetch = useGatewayFetch();
  const inputRef = reactExports.useRef(null);
  const [uploading, setUploading] = reactExports.useState(false);
  const onPick = reactExports.useCallback(() => {
    if (uploading) return;
    inputRef.current?.click();
  }, [uploading]);
  const onChange = reactExports.useCallback(
    async (changeEvent) => {
      const files = Array.from(changeEvent.target.files ?? []);
      changeEvent.target.value = "";
      if (files.length === 0) return;
      setUploading(true);
      let okCount = 0;
      const failed = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        try {
          const response = await gatewayFetch("/api/upload", {
            method: "POST",
            body: form,
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          okCount += 1;
        } catch {
          failed.push(file.name);
        }
      }
      setUploading(false);
      if (failed.length === 0) {
        dedupedToast.success(
          translate("fileExplorer.uploadSuccess", {
            count: okCount,
            defaultValue: "已上传 {{count}} 个文件",
          }),
        );
      } else if (okCount === 0) {
        dedupedToast.error(
          translate("fileExplorer.uploadFailedAll", {
            count: failed.length,
            defaultValue: "上传失败：{{count}} 个文件",
          }),
        );
      } else {
        dedupedToast.warning(
          translate("fileExplorer.uploadPartial", {
            ok: okCount,
            failed: failed.length,
            defaultValue: "已上传 {{ok}} 个，失败 {{failed}} 个",
          }),
        );
      }
    },
    [gatewayFetch, translate],
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
          ? translate("fileExplorer.uploading", {
              defaultValue: "上传中…",
            })
          : translate("fileExplorer.uploadFile", {
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
  isActive = true,
  onClose,
  mode,
}) {
  const structure = useOptionalWorkspaceStructure();
  if (structure && structure.architecture !== "legacy") {
    return (
      <div className="h-full min-h-0 overflow-y-auto p-3" data-action-ui-id="workspace.structure-directory">
        <WorkspaceStructureView mode="directory" isActive={isActive} />
      </div>
    );
  }
  if (structure && structure.architecture !== "legacy") {
    return (
      <div className="h-full min-h-0 overflow-y-auto p-3" data-action-ui-id="workspace.structure-directory">
        <WorkspaceStructureView mode="directory" isActive={isActive} />
      </div>
    );
  }
  return(
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <LeftSidebar
          initialFolderPath={initialFolderPath}
          isActive={isActive}
          onClose={onClose}
          mode={mode}
        />
      </div>
      {mode === "docked" ? <UploadFilesFooter /> : null}
    </div>
  );
}
function ContentPanel({
  activeTab,
  initialFolderPath,
  isActive = true,
  onClose,
  mode,
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
            isActive={isActive && canvasActive}
            onClose={onClose}
            mode={mode}
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
  function CanvasSidebarOverlay({
    id: workspaceId,
    controller,
    initialFolderPath,
    mode,
    seamSide,
    layoutOrder,
    onToggleDock,
    onPresentationChange,
  }) {
    const { t: translate } = useTranslation();
    const overlayRef = reactExports.useRef(null);
    const [hostWidth, setHostWidth] = reactExports.useState(0);
    const [activeTab, setActiveTab] = reactExports.useState("canvas");
    const [manageActive, setManageActive] = reactExports.useState(false);
    const {
      active,
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
        const tab = event.detail?.tab;
        if (!active || (tab !== "canvas" && tab !== "assets")) return;
        setActiveTab(tab);
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
    }, [active, expanded, handleTogglePanel]);
    reactExports.useEffect(() => {
      if (!active || !contentMounted) return;
      const host = overlayRef.current?.parentElement;
      if (!host) return;
      const syncWidth = () => {
        const next = host.getBoundingClientRect().width || host.clientWidth;
        setHostWidth((previous) => (previous === next ? previous : next));
      };
      syncWidth();
      if (typeof ResizeObserver === "undefined") {
        window.addEventListener("resize", syncWidth);
        return () => window.removeEventListener("resize", syncWidth);
      }
      const observer = new ResizeObserver(syncWidth);
      observer.observe(host);
      return () => observer.disconnect();
    }, [active, contentMounted]);
    const isDocked = mode === "docked";
    const MANAGE_VIEW_WIDTH = 720;
    const effectiveWidth = manageActive ? MANAGE_VIEW_WIDTH : width;
    const isStructurallyDocked =
      isDocked &&
      expanded &&
      hostWidth >= effectiveWidth + MIN_CANVAS_WIDTH_BESIDE_DOCKED_FILES;
    const isDockedOverlay = isDocked && expanded && !isStructurallyDocked;
    const presentation =
      !active || !contentMounted || !expanded
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
    if (!active || !contentMounted) return null;
    const closedTransform =
      seamSide === "left" ? "-translate-x-2" : "translate-x-2";
    const content = (
      <div
        className="flex min-w-0 flex-1 flex-col overflow-hidden"
        data-density="compact"
      >
        <CanvasSidebarHeader
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          onClose={handleClosePanel}
          mode={mode}
          onToggleDock={onToggleDock}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          <ContentPanel
            activeTab={activeTab}
            initialFolderPath={initialFolderPath}
            isActive={active && expanded}
            onClose={handleClosePanel}
            mode={mode}
            onManageActiveChange={setManageActive}
          />
        </div>
      </div>
    );
    const resizeHandle = isStructurallyDocked ? (
      <ResizeColHandle
        tabIndex={0}
        aria-label={translate("a11y.resizeProjectAssetsPanel")}
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
        id={workspaceId}
        ref={overlayRef}
        aria-label={translate("canvasAssets.panelAria")}
        aria-hidden={!expanded}
        inert={!expanded}
        data-workspace-files-panel={mode}
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
        {content}
        {seamSide === "left" ? resizeHandle : null}
      </aside>
    );
  },
);
