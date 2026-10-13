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
  const { t } = useTranslation();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted px-6 text-center">
      <FileMissingIcon />
      <div className="text-sm font-medium text-foreground">
        {t(
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
function useUrlAvailability(url, reloadKey) {
  const [state, setState] = reactExports.useState("checking");
  const probeInput = reactExports.useMemo(
    () => ({
      url,
      reloadKey,
    }),
    [url, reloadKey],
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
      .then((response) => {
        if (controller.signal.aborted) return;
        if (response.status === 404) setState("not-found");
        else setState("ok");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState("error");
      });
    return () => controller.abort();
  }, [probeInput]);
  return state;
}
function getWindowBridge() {
  const platform = window.__HILO_PLATFORM__;
  return platform?.window;
}
export function HtmlViewerInner({
  filePath,
  interactive,
  displayName,
  pluginOpenRequest,
  supportsCanvasPresentation,
  surface,
  requestExitFullscreen,
  reloadKey,
}) {
  const inlineSurface = surface === "inline";
  const { t } = useTranslation();
  const nodeId = useNodeId() ?? "";
  const actions = useCanvasActions();
  const active = useCanvasActive();
  const {
    onPluginEditorOpen,
    pluginEditorAgentVisible,
    resolvePluginAssetUrl,
  } = useCanvasBridge();
  const pluginUrl = reactExports.useMemo(() => {
    if (!nodeId || !resolvePluginAssetUrl) return null;
    const data = actions.getNodeById(nodeId)?.data;
    const pluginId = typeof data?.pluginId === "string" ? data.pluginId : null;
    const entry =
      typeof data?.pluginEntry === "string" ? data.pluginEntry : null;
    return pluginId && entry ? resolvePluginAssetUrl(pluginId, entry) : null;
  }, [nodeId, actions, resolvePluginAssetUrl]);
  const workspaceFileUrl = useFileUrl(filePath, {
    cacheBust: false,
  });
  const rawFileUrl = pluginUrl ?? workspaceFileUrl;
  const fileUrl = reactExports.useMemo(() => {
    if (!rawFileUrl) return rawFileUrl;
    const browserUrl = toWorkspaceBrowserUrl(rawFileUrl);
    if (!pluginOpenRequest) return browserUrl;
    const url = new URL(browserUrl);
    url.searchParams.set("hubWorkflow", pluginOpenRequest.workflow);
    url.searchParams.set("hubWorkflowRequestId", pluginOpenRequest.requestId);
    url.searchParams.set("hubWorkflowCommand", pluginOpenRequest.command);
    if (pluginOpenRequest.workflowId) {
      url.searchParams.set("hubWorkflowId", pluginOpenRequest.workflowId);
    }
    if (pluginOpenRequest.target) {
      url.searchParams.set("hubWorkflowTarget", pluginOpenRequest.target);
    }
    return url.toString();
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
  const [containerElState, setContainerElState] = reactExports.useState(null);
  const setContainerEl = reactExports.useCallback(
    (element) => {
      setContainerElState(element);
      if (nodeId) fullscreenApi.getState().setContainerEl(nodeId, element);
    },
    [nodeId, fullscreenApi],
  );
  reactExports.useEffect(() => {
    if (!containerElState || inlineSurface) return;
    if (isPresented) {
      try {
        containerElState.showPopover();
      } catch {}
    } else {
      try {
        containerElState.hidePopover();
      } catch {}
    }
  }, [isPresented, containerElState, inlineSurface]);
  reactExports.useLayoutEffect(() => {
    if (!containerElState || presentation !== "canvas") return;
    const canvasHost = containerElState.closest(
      '[data-workspace-canvas-viewport-host="true"]',
    );
    if (!canvasHost) return;
    const updateBounds = () => {
      const bounds = canvasHost.getBoundingClientRect();
      containerElState.style.setProperty(
        "--html-viewer-canvas-top",
        `${bounds.top}px`,
      );
      containerElState.style.setProperty(
        "--html-viewer-canvas-left",
        `${bounds.left}px`,
      );
      containerElState.style.setProperty(
        "--html-viewer-canvas-width",
        `${bounds.width}px`,
      );
      containerElState.style.setProperty(
        "--html-viewer-canvas-height",
        `${bounds.height}px`,
      );
    };
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(canvasHost);
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
      observer.disconnect();
      mutationObserver.disconnect();
      if (layoutSettleTimer !== null) window.clearTimeout(layoutSettleTimer);
      window.removeEventListener("resize", updateBounds);
    };
  }, [containerElState, presentation]);
  reactExports.useEffect(() => {
    if (!containerElState || !nodeId) return;
    const onToggle = (toggleEvent) => {
      const presentationEvent = toggleEvent;
      if (
        presentationEvent.newState === "closed" &&
        fullscreenApi.getState().nodeId === nodeId
      ) {
        fullscreenApi.getState().exit(nodeId);
      }
    };
    containerElState.addEventListener("toggle", onToggle);
    return () => containerElState.removeEventListener("toggle", onToggle);
  }, [nodeId, fullscreenApi, containerElState]);
  reactExports.useEffect(() => {
    if (!active || !isFullscreen || !nodeId) return;
    const onKey = (keyboardEvent) => {
      if (keyboardEvent.key !== "Escape") return;
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      exitFullscreen();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [active, isFullscreen, nodeId, exitFullscreen]);
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
  const isConnecting = useConnection((connectionState) => connectionState.inProgress);
  const allowPointer =
    isPresented || inlineSurface ? true : interactive && !isConnecting;
  const availability = useUrlAvailability(fileUrl, reloadKey);
  if (!fileUrl) return <ViewerLoading />;
  if (availability === "checking") return <ViewerLoading />;
  if (availability === "not-found")
    return <ViewerNotFound detail={displayName} />;
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
        title={displayName ?? "HTML preview"}
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
          aria-label={t("shortcuts.action.deleteNode", "删除节点")}
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
              aria-label={t("workspace.openChat", "Open Chat")}
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
                ? t("canvas.file.showInCanvas", "在画布中显示")
                : t("canvas.file.enterFullscreen", "全屏预览")
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
            aria-label={t("shortcuts.action.deleteNode", "删除节点")}
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
            aria-label={t("canvas.file.exitFullscreen", "退出全屏")}
            data-action-ui-id="canvas.file-node.exit-fullscreen"
          >
            <Minimize2 size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
