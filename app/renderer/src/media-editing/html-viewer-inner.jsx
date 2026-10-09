// html-viewer-inner.jsx
import {
  reactExports,
  useConnection,
  useNodeId,
  useTranslation,
  X$7 as X,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FileMissingIcon } from "../canvas/file-missing-icon.jsx";
import { usePluginHost } from "./use-plugin-host.js";
import { ViewerLoading } from "./input.jsx";
import {
  useFileUrl,
  useHtmlFullscreenApi,
  useHtmlViewerPresentation,
} from "../infra/use-plugin-metadata-store.js";
import {
  Maximize2,
  MessageSquare,
  Minimize2,
  useCanvasActive,
  useCanvasBridge,
} from "./package.jsx";
import { useCanvasActions } from "./use-canvas-actions.js";
import { toWorkspaceBrowserUrl } from "../generation/to-workspace-browser-url.js";
function ViewerNotFound({ messageKey, detail }) {
  const { t: t2 } = useTranslation();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted px-6 text-center">
      <FileMissingIcon />
      <div className="text-sm font-medium text-foreground">
        {t2(
          messageKey ?? "canvas.file.viewer.notFound",
          "找不到文件，可能已被删除或对应插件已卸载",
        )}
      </div>
      {detail ? (
        <div className="max-w-full truncate text-xs text-muted-foreground">
          {detail}
        </div>
      ) : null}
    </div>
  );
}
const CANVAS_PRESENTATION_LAYOUT_SETTLE_MS = 250;
function useUrlAvailability(url2, reloadKey) {
  const [state2, setState] = reactExports.useState("checking");
  const probeInput = reactExports.useMemo(
    () => ({
      url: url2,
      reloadKey,
    }),
    [url2, reloadKey],
  );
  reactExports.useEffect(() => {
    const probeUrl = probeInput.url;
    if (!probeUrl) {
      setState("checking");
      return;
    }
    const controller = new AbortController();
    setState("checking");
    fetch(probeUrl, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => {
        if (controller.signal.aborted) return;
        if (res.status === 404) setState("not-found");
        else setState("ok");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState("error");
      });
    return () => controller.abort();
  }, [probeInput]);
  return state2;
}
function getWindowBridge() {
  const platform2 = window.__HILO_PLATFORM__;
  return platform2?.window;
}
export function HtmlViewerInner({
  filePath,
  interactive,
  displayName: displayName2,
  pluginOpenRequest,
  supportsCanvasPresentation,
  surface,
  requestExitFullscreen,
  reloadKey,
}) {
  const inlineSurface = surface === "inline";
  const { t: t2 } = useTranslation();
  const nodeId = useNodeId() ?? "";
  const actions = useCanvasActions();
  const active2 = useCanvasActive();
  const {
    onPluginEditorOpen,
    pluginEditorAgentVisible,
    resolvePluginAssetUrl,
  } = useCanvasBridge();
  const pluginUrl = reactExports.useMemo(() => {
    if (!nodeId || !resolvePluginAssetUrl) return null;
    const data2 = actions.getNodeById(nodeId)?.data;
    const pid = typeof data2?.pluginId === "string" ? data2.pluginId : null;
    const entry =
      typeof data2?.pluginEntry === "string" ? data2.pluginEntry : null;
    return pid && entry ? resolvePluginAssetUrl(pid, entry) : null;
  }, [nodeId, actions, resolvePluginAssetUrl]);
  const workspaceFileUrl = useFileUrl(filePath, {
    cacheBust: false,
  });
  const rawFileUrl = pluginUrl ?? workspaceFileUrl;
  const fileUrl = reactExports.useMemo(() => {
    if (!rawFileUrl) return rawFileUrl;
    const browserUrl = toWorkspaceBrowserUrl(rawFileUrl);
    if (!pluginOpenRequest) return browserUrl;
    const url2 = new URL(browserUrl);
    url2.searchParams.set("hubWorkflow", pluginOpenRequest.workflow);
    url2.searchParams.set("hubWorkflowRequestId", pluginOpenRequest.requestId);
    url2.searchParams.set("hubWorkflowCommand", pluginOpenRequest.command);
    if (pluginOpenRequest.workflowId) {
      url2.searchParams.set("hubWorkflowId", pluginOpenRequest.workflowId);
    }
    if (pluginOpenRequest.target) {
      url2.searchParams.set("hubWorkflowTarget", pluginOpenRequest.target);
    }
    return url2.toString();
  }, [rawFileUrl, pluginOpenRequest]);
  const [iframeEl, setIframeEl] = reactExports.useState(null);
  const fullscreenApi = useHtmlFullscreenApi();
  const exitFullscreen = reactExports.useCallback(() => {
    if (!nodeId) return false;
    if (requestExitFullscreen) return requestExitFullscreen();
    fullscreenApi.getState().exit(nodeId);
    return true;
  }, [fullscreenApi, nodeId, requestExitFullscreen]);
  usePluginHost(
    iframeEl,
    nodeId,
    requestExitFullscreen ? exitFullscreen : void 0,
  );
  const presentation = useHtmlViewerPresentation(nodeId);
  const isPresented = presentation !== null;
  const isFullscreen = presentation === "fullscreen";
  const [containerEl, setContainerElState] = reactExports.useState(null);
  const setContainerEl = reactExports.useCallback(
    (el) => {
      setContainerElState(el);
      if (nodeId) fullscreenApi.getState().setContainerEl(nodeId, el);
    },
    [nodeId, fullscreenApi],
  );
  reactExports.useEffect(() => {
    if (!containerEl || inlineSurface) return;
    if (isPresented) {
      try {
        containerEl.showPopover();
      } catch {}
    } else {
      try {
        containerEl.hidePopover();
      } catch {}
    }
  }, [isPresented, containerEl, inlineSurface]);
  reactExports.useLayoutEffect(() => {
    if (!containerEl || presentation !== "canvas") return;
    const canvasHost = containerEl.closest(
      '[data-workspace-canvas-viewport-host="true"]',
    );
    if (!canvasHost) return;
    const updateBounds = () => {
      const bounds = canvasHost.getBoundingClientRect();
      containerEl.style.setProperty(
        "--html-viewer-canvas-top",
        `${bounds.top}px`,
      );
      containerEl.style.setProperty(
        "--html-viewer-canvas-left",
        `${bounds.left}px`,
      );
      containerEl.style.setProperty(
        "--html-viewer-canvas-width",
        `${bounds.width}px`,
      );
      containerEl.style.setProperty(
        "--html-viewer-canvas-height",
        `${bounds.height}px`,
      );
    };
    updateBounds();
    const observer2 = new ResizeObserver(updateBounds);
    observer2.observe(canvasHost);
    let layoutSettleTimer = null;
    const mutationObserver = new MutationObserver(() => {
      updateBounds();
      if (layoutSettleTimer !== null) window.clearTimeout(layoutSettleTimer);
      layoutSettleTimer = window.setTimeout(
        updateBounds,
        CANVAS_PRESENTATION_LAYOUT_SETTLE_MS,
      );
    });
    mutationObserver.observe(canvasHost, {
      attributes: true,
      attributeFilter: ["data-layout-relocation-key"],
    });
    window.addEventListener("resize", updateBounds);
    return () => {
      observer2.disconnect();
      mutationObserver.disconnect();
      if (layoutSettleTimer !== null) window.clearTimeout(layoutSettleTimer);
      window.removeEventListener("resize", updateBounds);
    };
  }, [containerEl, presentation]);
  reactExports.useEffect(() => {
    if (!containerEl || !nodeId) return;
    const onToggle = (e2) => {
      const tev = e2;
      if (
        tev.newState === "closed" &&
        fullscreenApi.getState().nodeId === nodeId
      ) {
        fullscreenApi.getState().exit(nodeId);
      }
    };
    containerEl.addEventListener("toggle", onToggle);
    return () => containerEl.removeEventListener("toggle", onToggle);
  }, [nodeId, fullscreenApi, containerEl]);
  reactExports.useEffect(() => {
    if (!active2 || !isFullscreen || !nodeId) return;
    const onKey = (e2) => {
      if (e2.key !== "Escape") return;
      e2.preventDefault();
      e2.stopPropagation();
      exitFullscreen();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [active2, isFullscreen, nodeId, exitFullscreen]);
  reactExports.useEffect(() => {
    if (!isFullscreen || inlineSurface) return;
    const bridge = getWindowBridge();
    bridge?.setWindowButtonVisibility?.(false);
    return () => {
      bridge?.setWindowButtonVisibility?.(true);
    };
  }, [isFullscreen, inlineSurface]);
  const togglePresentation = reactExports.useCallback(() => {
    if (!nodeId || !presentation || !supportsCanvasPresentation) return;
    if (presentation === "fullscreen") {
      fullscreenApi.getState().leaveFullscreen(nodeId);
      return;
    }
    fullscreenApi.getState().setPresentation(nodeId, "fullscreen");
  }, [fullscreenApi, nodeId, presentation, supportsCanvasPresentation]);
  const isConnecting = useConnection((c3) => c3.inProgress);
  const allowPointer =
    isPresented || inlineSurface ? true : interactive && !isConnecting;
  const availability = useUrlAvailability(fileUrl, reloadKey);
  if (!fileUrl) return <ViewerLoading />;
  if (availability === "checking") return <ViewerLoading />;
  if (availability === "not-found")
    return <ViewerNotFound detail={displayName2} />;
  return (
    <div
      ref={setContainerEl}
      {...(inlineSurface
        ? {}
        : {
            popover: "manual",
          })}
      className={inlineSurface ? "h-full w-full" : "html-viewer-popover"}
      data-presentation={presentation ?? "inline"}
      data-action-ui-id="canvas.file-node.html-fullscreen-container"
    >
      <iframe
        key={reloadKey}
        ref={setIframeEl}
        src={fileUrl}
        title={displayName2 ?? "HTML preview"}
        loading="lazy"
        className={`${allowPointer ? "nowheel pointer-events-auto " : "pointer-events-none "}h-full w-full border-0 bg-background`}
      />
      {pluginUrl && !isPresented && nodeId && (
        <button
          type="button"
          className="html-viewer-inline-remove"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            actions.removeNode(nodeId);
          }}
          aria-label={t2("shortcuts.action.deleteNode", "删除节点")}
          data-action-ui-id="canvas.file-node.remove-plugin-inline"
        />
      )}
      <div className="html-viewer-popover-actions">
        {supportsCanvasPresentation &&
          presentation === "canvas" &&
          pluginEditorAgentVisible === false && (
            <button
              type="button"
              className="html-viewer-popover-action"
              onClick={() => onPluginEditorOpen?.()}
              aria-label={t2("workspace.openChat", "Open Chat")}
              data-action-ui-id="canvas.file-node.open-agent"
            >
              <MessageSquare size={18} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
        {supportsCanvasPresentation && (
          <button
            type="button"
            className="html-viewer-popover-action"
            onClick={togglePresentation}
            aria-label={
              isFullscreen
                ? t2("canvas.file.showInCanvas", "在画布中显示")
                : t2("canvas.file.enterFullscreen", "全屏预览")
            }
            data-action-ui-id="canvas.file-node.toggle-presentation"
          >
            {isFullscreen ? (
              <Minimize2 size={18} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Maximize2 size={18} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        )}
        {supportsCanvasPresentation && presentation === "canvas" && nodeId && (
          <button
            type="button"
            className="html-viewer-popover-action"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              actions.removeNode(nodeId);
            }}
            aria-label={t2("shortcuts.action.deleteNode", "删除节点")}
            data-action-ui-id="canvas.file-node.remove-plugin"
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
        {inlineSurface && (
          <button
            type="button"
            className="html-viewer-popover-action"
            onClick={exitFullscreen}
            aria-label={t2("canvas.file.exitFullscreen", "退出全屏")}
            data-action-ui-id="canvas.file-node.exit-fullscreen"
          >
            <Minimize2 size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
