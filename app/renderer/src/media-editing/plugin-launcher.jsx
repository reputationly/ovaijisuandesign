// plugin-launcher.jsx
import { getPluginAgentEditSession, upsert } from "./input.jsx";
import {
  Layers,
  MoreHorizontal,
  reactDomExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  DirectorStageHeaderIcon,
  useCanvasRootElement,
  VideoEditorHeaderIcon,
} from "./director-stage-header-icon.jsx";
import { useCanvasShortcutGuard$1 } from "./use-canvas-shortcut-guard.js";
import {
  useHtmlFullscreenApi,
  useIsHtmlFullscreen,
  usePluginMeta,
} from "../infra/use-plugin-metadata-store.js";
import { MEDIA_NODE_RADIUS, useCanvasBridge } from "./package.jsx";
import { useCanvasActions } from "./use-canvas-actions.js";
import { pickLocalized } from "../generation/normalize-skill-detail-metadata.js";
import {
  CLIP_STUDIO_PLUGIN_ID,
  DIRECTOR_STAGE_PLUGIN_ID,
} from "./resolve-panorama-generation-presentation.js";
import { NodeBody } from "../canvas/node-body-inner.jsx";
import { Button$2 } from "../canvas/node-shell-inner.jsx";
import { HtmlViewer } from "../infra/create-html-iframe-pool-store.jsx";

function setPluginAgentEditSession(nodeId, editSessionId) {
  upsert(nodeId, {
    editSessionId,
  });
}

const PLUGIN_EDITOR_OVERLAY_MESSAGE = "hilo:plugin-editor-overlay";

const PLUGIN_EDITOR_OVERLAY_ACTION_MESSAGE =
  "hilo:plugin-editor-overlay-action";

function isFiniteNumber$1(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isOverlayItem(value) {
  if (!value || typeof value !== "object") return false;
  const item = value;
  if (item.separator === true) return true;
  return typeof item.type === "string" && typeof item.label === "string";
}

function resolveCssColor$1(value, fallback) {
  if (typeof value !== "string" || value.length > 128) return fallback;
  return /^(?:#[\da-f]{3,8}|(?:rgb|rgba|hsl|hsla|oklab|oklch)\([^;{}]*\))$/i.test(
    value,
  )
    ? value
    : fallback;
}

function resolvePluginEditorOverlayModel(data2) {
  if (!data2 || typeof data2 !== "object") return null;
  const message2 = data2;
  if (message2.type !== PLUGIN_EDITOR_OVERLAY_MESSAGE || message2.open !== true)
    return null;
  if (
    typeof message2.destination !== "string" ||
    !isFiniteNumber$1(message2.left) ||
    !isFiniteNumber$1(message2.top) ||
    !Array.isArray(message2.items) ||
    !message2.items.every(isOverlayItem)
  ) {
    return null;
  }
  return {
    destination: message2.destination,
    left: Math.max(0, message2.left),
    top: Math.max(0, message2.top),
    items: message2.items,
    customLabel: message2.customLabel ?? "Custom export...",
    customDescription: message2.customDescription ?? "Full export settings",
    bestMatchLabel: message2.bestMatchLabel ?? "Best match",
    palette: {
      rowBackground: resolveCssColor$1(
        message2.palette?.rowBackground,
        "var(--muted)",
      ),
      iconBackground: resolveCssColor$1(
        message2.palette?.iconBackground,
        "var(--muted)",
      ),
      iconColor: resolveCssColor$1(
        message2.palette?.iconColor,
        "var(--foreground)",
      ),
    },
  };
}

function PluginEditorSurface({
  children: children2,
  visible,
  onContainerChange,
}) {
  const canvasRootEl = useCanvasRootElement();
  const pinnedRootRef = reactExports.useRef(null);
  if (pinnedRootRef.current === null && canvasRootEl)
    pinnedRootRef.current = canvasRootEl;
  const portalTarget = pinnedRootRef.current;
  const [, forceRender] = reactExports.useState(0);
  reactExports.useEffect(() => {
    if (canvasRootEl && portalTarget === null) forceRender((n2) => n2 + 1);
  }, [canvasRootEl, portalTarget]);
  const containerRef = reactExports.useRef(null);
  const [overlayModel, setOverlayModel] = reactExports.useState(null);
  const setContainerRef = reactExports.useCallback(
    (element2) => {
      containerRef.current = element2;
      onContainerChange?.(element2);
    },
    [onContainerChange],
  );
  useCanvasShortcutGuard$1(visible, containerRef);
  reactExports.useEffect(() => {
    if (!visible) {
      setOverlayModel(null);
      return;
    }
    const onMessage = (event) => {
      const container = containerRef.current;
      const iframe = container?.querySelector("iframe");
      if (!container || !iframe || event.source !== iframe.contentWindow)
        return;
      const data2 = event.data;
      if (data2?.type !== PLUGIN_EDITOR_OVERLAY_MESSAGE) return;
      if (data2.open !== true) {
        setOverlayModel(null);
        return;
      }
      setOverlayModel(resolvePluginEditorOverlayModel(data2));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [visible]);
  const runOverlayAction = reactExports.useCallback((action, destination) => {
    const iframe = containerRef.current?.querySelector("iframe");
    if (!iframe) return;
    iframe.contentWindow?.postMessage(
      {
        type: PLUGIN_EDITOR_OVERLAY_ACTION_MESSAGE,
        destination,
        action,
      },
      "*",
    );
  }, []);
  const overlayStyle = overlayModel
    ? {
        left: overlayModel.left,
        top: overlayModel.top,
        transform: "scale(0.8)",
        transformOrigin: "top left",
        "--clip-studio-export-row-bg": overlayModel.palette.rowBackground,
      }
    : void 0;
  if (!portalTarget) return null;
  return reactDomExports.createPortal(
    <div
      ref={setContainerRef}
      role="dialog"
      data-canvas-chrome="true"
      data-plugin-editor-surface="true"
      data-plugin-editor-overlay-open={overlayModel ? "true" : "false"}
      data-visible={visible ? "true" : "false"}
      className="absolute inset-0 z-[10100] flex flex-col"
      style={{
        background: "var(--canvas-node-bg, #fff)",
        // Hidden-but-mounted during the launcher's unmount grace window:
        // `display:none` would not reload the iframe, but it does drop layout
        // and can reset scroll/media state, so we keep it laid out and merely
        // invisible + non-interactive.
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? "auto" : "none",
      }}
      inert={!visible}
      onKeyDown={(e2) => e2.stopPropagation()}
      onKeyUp={(e2) => e2.stopPropagation()}
    >
      {children2}
      {overlayModel ? (
        <div
          data-action-ui-id="clip-studio-export-host-preset-panel"
          className="absolute z-[10150] max-h-[400px] w-[19rem] overflow-y-auto rounded-lg border border-border bg-popover p-3 shadow-lg transition-[top] duration-200 ease-out animate-in fade-in-0 slide-in-from-left-1 motion-reduce:animate-none motion-reduce:transition-none"
          style={overlayStyle}
        >
          <div
            key={overlayModel.destination}
            className="space-y-1 animate-in fade-in-0 slide-in-from-left-1 duration-150 ease-out motion-reduce:animate-none"
          >
            {overlayModel.items.map((item) => {
              if (item.separator) {
                return (
                  <div key={"separator"} className="my-1 h-px bg-border" />
                );
              }
              return (
                <button
                  key={item.type}
                  type="button"
                  data-action-ui-id={`clip-studio-export-host-${overlayModel.destination}-${item.type}`}
                  className={`flex w-full items-center gap-3 rounded-sm p-3 text-left text-foreground hover:bg-[var(--clip-studio-export-row-bg)] ${item.recommended ? "bg-muted/50" : ""}`}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    runOverlayAction(item.type ?? "", overlayModel.destination);
                  }}
                  onClick={(event) => {
                    if (event.detail !== 0) return;
                    runOverlayAction(item.type ?? "", overlayModel.destination);
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[13px] font-medium">
                        {item.label}
                      </span>
                      {item.recommended ? (
                        <span className="shrink-0 rounded-full border border-foreground/70 px-1.5 py-0.5 text-[10px] text-foreground/70 [border-width:var(--divider-width)]">
                          {overlayModel.bestMatchLabel}
                        </span>
                      ) : null}
                    </span>
                    {item.description ? (
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              data-action-ui-id={`clip-studio-export-host-${overlayModel.destination}-custom`}
              className="flex w-full items-center gap-3 rounded-sm p-3 text-left text-foreground hover:bg-[var(--clip-studio-export-row-bg)]"
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                runOverlayAction("custom", overlayModel.destination);
              }}
              onClick={(event) => {
                if (event.detail !== 0) return;
                runOverlayAction("custom", overlayModel.destination);
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                  {overlayModel.customLabel}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {overlayModel.customDescription}
                </span>
              </span>
              <MoreHorizontal
                size={14}
                className="shrink-0 text-muted-foreground"
              />
            </button>
          </div>
        </div>
      ) : null}
    </div>,
    portalTarget,
  );
}

const LAUNCHER_UNMOUNT_GRACE_MS = 1500;

export function PluginLauncher({
  nodeId,
  pluginId,
  filePath,
  displayName: displayName2,
  width,
  height,
  selected: selected2,
  onReportAction,
  editorSurface,
}) {
  const { i18n, t: t2 } = useTranslation();
  const meta2 = usePluginMeta(pluginId);
  const rawLang = i18n.language || "en-US";
  const locale = rawLang.startsWith("zh")
    ? "zh-CN"
    : rawLang.startsWith("en")
      ? "en-US"
      : rawLang;
  const name2 =
    (meta2 ? pickLocalized(meta2.name, locale) : "") || displayName2;
  const description = meta2
    ? pickLocalized(meta2.description ?? {}, locale)
    : "";
  const openLabel =
    pluginId === CLIP_STUDIO_PLUGIN_ID
      ? t2("canvas.plugin.openVideoEditor", {
          defaultValue: "Open Video Editor",
        })
      : t2("canvas.plugin.openLauncher", {
          name: name2,
          defaultValue: "Open {{name}}",
        });
  const agentSessionName =
    (meta2?.agent?.sessionName
      ? pickLocalized(meta2.agent.sessionName, locale)
      : "") || name2;
  const [open, setOpen] = reactExports.useState(false);
  const fullscreenApi = useHtmlFullscreenApi();
  const isFullscreen = useIsHtmlFullscreen(nodeId);
  const { isWorkspaceActive, onPluginEditActiveChange } = useCanvasBridge();
  const { closeContextMenus } = useCanvasActions();
  const editSessionRef = reactExports.useRef(null);
  const editOpenContextRef = reactExports.useRef(null);
  const ensureEditSession = reactExports.useCallback(() => {
    if (!editorSurface || editSessionRef.current) return;
    editSessionRef.current = {
      nodeId,
      editSessionId:
        globalThis.crypto?.randomUUID?.() ??
        `plugin-edit-${Date.now().toString(36)}`,
    };
  }, [editorSurface, nodeId]);
  const onPluginEditActiveChangeRef = reactExports.useRef(
    onPluginEditActiveChange,
  );
  onPluginEditActiveChangeRef.current = onPluginEditActiveChange;
  const closeContextMenusRef = reactExports.useRef(closeContextMenus);
  closeContextMenusRef.current = closeContextMenus;
  const activeEditSessionIdRef = reactExports.useRef(null);
  const detachEditSession = reactExports.useCallback(
    (session) => {
      if (activeEditSessionIdRef.current !== session.editSessionId) return;
      activeEditSessionIdRef.current = null;
      if (getPluginAgentEditSession(session.nodeId) === session.editSessionId) {
        setPluginAgentEditSession(session.nodeId, null);
      }
      onPluginEditActiveChangeRef.current?.(
        session,
        false,
        agentSessionName,
        pluginId,
      );
    },
    [agentSessionName, pluginId],
  );
  const requestExitFullscreen = reactExports.useCallback(() => {
    const state2 = fullscreenApi.getState();
    if (state2.nodeId !== nodeId || state2.presentation !== "fullscreen")
      return false;
    const session = editSessionRef.current;
    try {
      if (editorSurface && session) detachEditSession(session);
    } finally {
      state2.exit(nodeId);
    }
    return true;
  }, [detachEditSession, editorSurface, fullscreenApi, nodeId]);
  reactExports.useEffect(() => {
    if (isWorkspaceActive !== false || !isFullscreen) return;
    requestExitFullscreen();
  }, [isFullscreen, isWorkspaceActive, requestExitFullscreen]);
  const openStage = reactExports.useCallback(() => {
    editOpenContextRef.current = {
      entrySource: "node_launcher",
      startedAt: Date.now(),
    };
    ensureEditSession();
    setOpen(true);
    fullscreenApi.getState().enter(nodeId);
    onReportAction?.("fullscreen", "enter");
  }, [ensureEditSession, fullscreenApi, nodeId, onReportAction]);
  reactExports.useEffect(() => {
    if (!editorSurface || !isFullscreen || open) return;
    editOpenContextRef.current = {
      entrySource: "programmatic",
      startedAt: Date.now(),
    };
    ensureEditSession();
    setOpen(true);
  }, [editorSurface, ensureEditSession, isFullscreen, open]);
  reactExports.useEffect(() => {
    if (!editorSurface || !isFullscreen) return;
    const session = editSessionRef.current;
    if (!session) return;
    closeContextMenusRef.current();
    activeEditSessionIdRef.current = session.editSessionId;
    setPluginAgentEditSession(session.nodeId, session.editSessionId);
    const openContext = editOpenContextRef.current;
    onPluginEditActiveChangeRef.current?.(
      session,
      true,
      agentSessionName,
      pluginId,
      {
        entrySource: openContext?.entrySource ?? "programmatic",
        durationMs: openContext ? Date.now() - openContext.startedAt : 0,
      },
    );
    return () => {
      detachEditSession(session);
    };
  }, [
    agentSessionName,
    detachEditSession,
    editorSurface,
    isFullscreen,
    pluginId,
  ]);
  const wasFullscreenRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (isFullscreen) {
      wasFullscreenRef.current = true;
      return;
    }
    if (!wasFullscreenRef.current) return;
    wasFullscreenRef.current = false;
    onReportAction?.("fullscreen", "exit");
    const timer2 = setTimeout(() => setOpen(false), LAUNCHER_UNMOUNT_GRACE_MS);
    return () => clearTimeout(timer2);
  }, [isFullscreen, onReportAction]);
  return (
    <NodeBody
      width={width}
      height={height}
      selected={selected2}
      variant="media"
    >
      <div
        className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6 text-center"
        style={{
          background: "var(--canvas-node-bg, #fff)",
          border: "1px solid transparent",
          borderRadius: MEDIA_NODE_RADIUS,
        }}
      >
        <div className="flex h-16 w-16 items-center justify-center">
          {pluginId === DIRECTOR_STAGE_PLUGIN_ID ? (
            <DirectorStageHeaderIcon
              size={42}
              className="text-[var(--canvas-empty-placeholder-fg)]"
            />
          ) : pluginId === CLIP_STUDIO_PLUGIN_ID ? (
            <VideoEditorHeaderIcon
              size={42}
              className="text-[var(--canvas-empty-placeholder-fg)]"
            />
          ) : (
            <Layers
              className="h-14 w-14 text-[var(--canvas-controls-text)] opacity-50"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          )}
        </div>
        <div className="mt-4 flex h-16 max-w-full flex-col items-center gap-1">
          <div
            className="max-w-full truncate text-sm font-medium text-[var(--canvas-controls-text)]"
            title={name2}
          >
            {name2}
          </div>
          <div
            className="line-clamp-2 h-10 max-w-full whitespace-pre-line text-[13px] leading-5 text-[var(--canvas-controls-text-muted)]"
            title={description || name2}
          >
            {description}
          </div>
        </div>
        <Button$2
          type="button"
          variant="secondary"
          onClick={(e2) => {
            e2.stopPropagation();
            openStage();
          }}
          onMouseDown={(event) => event.stopPropagation()}
          data-action-ui-id="canvas.plugin-node.open-launcher"
          data-plugin-id={pluginId}
          className="nodrag mt-4 h-9 cursor-pointer rounded-lg border-0 bg-[var(--button-subtle-bg)] px-4 text-[14px] font-normal tracking-wide text-[var(--canvas-controls-text)] hover:bg-[var(--button-subtle-bg-hover)]"
        >
          {openLabel}
        </Button$2>
        {open &&
          (editorSurface ? (
            // Canvas-pane editing surface. The container is pinned for the
            // whole `open` window (including the post-exit grace period), so
            // the iframe is never re-parented and the plugin keeps its
            // handshake and unsaved timeline state across visibility flips.
            <PluginEditorSurface visible={isFullscreen}>
              <HtmlViewer
                filePath={filePath ?? ""}
                interactive={true}
                displayName={name2}
                eagerActivate={true}
                surface="inline"
                requestExitFullscreen={requestExitFullscreen}
              />
            </PluginEditorSurface>
          ) : (
            <div
              className="absolute h-0 w-0 overflow-hidden"
              aria-hidden={!isFullscreen}
            >
              <HtmlViewer
                filePath={filePath ?? ""}
                interactive={true}
                displayName={name2}
                eagerActivate={true}
              />
            </div>
          ))}
      </div>
    </NodeBody>
  );
}
