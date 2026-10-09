// remote-tool-host.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, useQueryClient, useNavigate, m$4 } from "../vendor.js";
import { buildWorkspaceSearch } from "../m15/create-visible-preview-tabs-store.js";
import { KEY_PREFIX, readEnvelope, DRAFT_TTL_MS, removeKey, PENDING_HOME_HANDOFF_KEY, clearDraft, HOME_DRAFT_WORKSPACE, HOME_DRAFT_SESSION_KEY, invalidatePendingHomeHandoff } from "../m15/draft-controller.js";
import { SNAPSHOT_RETRY_DELAY_MS, SNAPSHOT_RETRY_MAX_ELAPSED_MS, createSnapshotUnavailableStatus, RECENT_WORKSPACES_REFRESH_EVENT, GlobalSidebarContext } from "../m15/global-sidebar-provider.jsx";
import { getWorkspaceBundle, services, remoteToolLog } from "../m15/graph.jsx";
import { useGatewayFetch, useGatewayScopeKey } from "../m15/use-resizable-width.js";
import { useSettingsDialog } from "../m10/custom-provider-form.jsx";
import { IBundleHandle } from "../m08/browser-inspiration-urls.jsx";
import { useOptionalWSConnection, deleteMemory } from "../m10/compact-rewrite-flow.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
const LINEAR_STARTUP_PHASES = ["inactive", "starting", "ready", "restored", "running"];
new Set(LINEAR_STARTUP_PHASES);
const TERMINAL_STATES = new Set(["failed", "stopped"]);
const SUCCESS_STATES = new Set(["bound"]);
export function isTerminalState(s2) {
  return TERMINAL_STATES.has(s2);
}
export function isReadyState(s2) {
  return SUCCESS_STATES.has(s2);
}
export function isGatewayReady(s2) {
  return s2 === "gateway-ready" || s2 === "opencode-starting" || s2 === "bound";
}
export function useBundleStatus(workspaceId2, refreshKey, options = {}) {
  const [scopedStatus, setScopedStatus] = reactExports.useState(void 0);
  const lastRevisionRef = reactExports.useRef(-1);
  const subscriptionScope = JSON.stringify([workspaceId2 ?? "home", refreshKey ?? 0]);
  const {
    enabled = true,
    retryDelayMs = SNAPSHOT_RETRY_DELAY_MS,
    maxRetryElapsedMs = SNAPSHOT_RETRY_MAX_ELAPSED_MS,
  } = options;
  reactExports.useEffect(() => {
    if (!enabled) {
      lastRevisionRef.current = -1;
      setScopedStatus(void 0);
      return;
    }
    let service2;
    try {
      service2 = workspaceId2 ? getWorkspaceBundle(workspaceId2) : services.get(IBundleHandle);
    } catch {
      return;
    }
    let disposed = false;
    let retryTimer;
    let snapshotFailureCount = 0;
    const startedAt = Date.now();
    lastRevisionRef.current = -1;
    setScopedStatus(void 0);
    const clearRetryTimer = () => {
      if (!retryTimer) return;
      clearTimeout(retryTimer);
      retryTimer = void 0;
    };
    const apply2 = (next2) => {
      if (disposed) return;
      if (next2.revision <= lastRevisionRef.current) return;
      lastRevisionRef.current = next2.revision;
      clearRetryTimer();
      setScopedStatus({
        scope: subscriptionScope,
        status: next2,
      });
    };
    const logSnapshotFailure = (err, final) => {
      const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
      const prefix = final
        ? "[useBundleStatus] snapshot retry exhausted"
        : "[useBundleStatus] snapshot failed";
      const msg = `${prefix} (${subscriptionScope}, attempts=${snapshotFailureCount}): ${detail}`;
      const logger = window.hilo?.logger;
      if (logger) {
        const write = final ? logger.error.bind(logger) : logger.warn.bind(logger);
        write(msg).catch(() => console.error(msg));
      } else if (final) {
        console.error(msg);
      } else {
        console.warn(msg);
      }
    };
    const scheduleRetry = (err) => {
      if (disposed || lastRevisionRef.current >= 0) return;
      snapshotFailureCount += 1;
      const elapsedMs2 = Date.now() - startedAt;
      const final = elapsedMs2 >= maxRetryElapsedMs;
      if (snapshotFailureCount === 1 || final) {
        logSnapshotFailure(err, final);
      }
      if (final) {
        setScopedStatus({
          scope: subscriptionScope,
          status: createSnapshotUnavailableStatus(workspaceId2),
        });
        return;
      }
      clearRetryTimer();
      retryTimer = setTimeout(fetchSnapshot, retryDelayMs);
    };
    const fetchSnapshot = () => {
      if (disposed || lastRevisionRef.current >= 0) return;
      service2
        .getStatus()
        .then((snapshot2) => {
          if (disposed || !snapshot2) return;
          apply2(snapshot2);
        })
        .catch(scheduleRetry);
    };
    const subscription = service2.onStatusChange(apply2);
    fetchSnapshot();
    return () => {
      disposed = true;
      clearRetryTimer();
      subscription.dispose();
    };
  }, [enabled, workspaceId2, subscriptionScope, retryDelayMs, maxRetryElapsedMs]);
  return scopedStatus?.scope === subscriptionScope ? scopedStatus.status : void 0;
}
export function requestRecentWorkspacesRefresh() {
  window.dispatchEvent(new Event(RECENT_WORKSPACES_REFRESH_EVENT));
}
export const GLOBAL_SIDEBAR_PREVIEW_EDGE_HIT_WIDTH = 8;
export function useGlobalSidebar() {
  const value = reactExports.useContext(GlobalSidebarContext);
  if (!value) throw new Error("useGlobalSidebar must be used within GlobalSidebarProvider");
  return value;
}
export function pruneExpiredDrafts(now2 = Date.now()) {
  let keys2;
  try {
    keys2 = [];
    for (let i2 = 0; i2 < localStorage.length; i2++) {
      const k2 = localStorage.key(i2);
      if (k2?.startsWith(`${KEY_PREFIX}:`)) {
        keys2.push(k2);
      }
    }
  } catch {
    return;
  }
  for (const key2 of keys2) {
    const envelope = readEnvelope(key2);
    if (!envelope || now2 - envelope.savedAt > DRAFT_TTL_MS) {
      removeKey(key2);
    }
  }
}
function readPendingHomeHandoff() {
  try {
    const raw2 = localStorage.getItem(PENDING_HOME_HANDOFF_KEY);
    if (!raw2) return void 0;
    const value = JSON.parse(raw2);
    if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
    const operationId = value.operationId;
    return typeof operationId === "string" && operationId.length > 0
      ? {
          operationId,
        }
      : void 0;
  } catch {
    return void 0;
  }
}
export function acknowledgeHomeDraftHandoff(operationId) {
  if (readPendingHomeHandoff()?.operationId !== operationId) return false;
  clearDraft(HOME_DRAFT_WORKSPACE, HOME_DRAFT_SESSION_KEY);
  invalidatePendingHomeHandoff();
  return true;
}
const CONFIRMATION_REASON_KINDS = new Set(["loop_guard_ask", "tool_confirm_ask"]);
function isUnresolvedAnswerRequest(message2) {
  if (message2.type === "question" || message2.type === "interact") return !message2.resolved;
  return false;
}
function isUnresolvedConfirmation(message2) {
  if (message2.type === "confirm" || message2.type === "loop_guard_ask") return !message2.resolved;
  if (message2.type === "tool_confirm_ask") return !message2.resolved && message2.expired !== true;
  return false;
}
export function deriveSessionTaskStatus(input) {
  return deriveSessionTaskSnapshot(input).status;
}
function deriveSessionTaskSnapshot(input) {
  let confirmationActionId;
  for (let index2 = input.messages.length - 1; index2 >= 0; index2 -= 1) {
    const message2 = input.messages[index2];
    if (isUnresolvedAnswerRequest(message2)) {
      return {
        status: "needs-answer",
        userActionId: `${message2.type}:${message2.requestId ?? message2.id}`,
      };
    }
    if (!confirmationActionId && isUnresolvedConfirmation(message2)) {
      confirmationActionId = `${message2.type}:${message2.requestId ?? message2.id}`;
    }
  }
  if (confirmationActionId) {
    return {
      status: "needs-confirmation",
      userActionId: confirmationActionId,
    };
  }
  for (let index2 = input.pendingReasons.length - 1; index2 >= 0; index2 -= 1) {
    const reason = input.pendingReasons[index2];
    if (CONFIRMATION_REASON_KINDS.has(reason.kind)) {
      return {
        status: "needs-confirmation",
        userActionId: `${reason.kind}:${reason.id}`,
      };
    }
  }
  return {
    status: input.busy || input.pendingReasons.length > 0 ? "running" : "idle",
  };
}
export class SessionTaskSnapshotCache {
  entries = new Map();
  get(input) {
    const cached = this.entries.get(input.sessionId);
    if (
      cached?.userAttentionRevision === input.userAttentionRevision &&
      cached.messageCount === input.messages.length &&
      cached.busy === input.busy &&
      cached.pendingReasons === input.pendingReasons
    ) {
      return cached.snapshot;
    }
    const snapshot2 = deriveSessionTaskSnapshot(input);
    this.entries.set(input.sessionId, {
      userAttentionRevision: input.userAttentionRevision,
      messageCount: input.messages.length,
      busy: input.busy,
      pendingReasons: input.pendingReasons,
      snapshot: snapshot2,
    });
    return snapshot2;
  }
  retain(sessionIds) {
    for (const sessionId of this.entries.keys()) {
      if (!sessionIds.has(sessionId)) this.entries.delete(sessionId);
    }
  }
}
function autoFeedbackToastId(evt, gatewayScopeKey) {
  const name2 = encodeURIComponent(evt.name);
  if (evt.scope === "project") {
    return `memory-auto:project:${encodeURIComponent(gatewayScopeKey)}:${name2}`;
  }
  return `memory-auto:user:${name2}`;
}
export function AutoFeedbackToastListener({ workspaceId: workspaceId2, isActive: isActive2 }) {
  const connection = useOptionalWSConnection();
  const subscribe2 = connection?.subscribe;
  const missingProviderWarnedRef = reactExports.useRef(false);
  const { t: t2 } = useTranslation();
  const queryClient2 = useQueryClient();
  const { openSettings } = useSettingsDialog();
  const navigate = useNavigate();
  const gatewayScopeKey = useGatewayScopeKey();
  const fetcher = useGatewayFetch();
  reactExports.useEffect(() => {
    if (!subscribe2 || connection.scope !== "workspace") {
      if (!missingProviderWarnedRef.current) {
        missingProviderWarnedRef.current = true;
        try {
          void window.hilo?.logger?.warn?.(
            "[AutoFeedbackToastListener] workspace WS provider unavailable; listener disabled",
          );
        } catch {}
      }
      return;
    }
    return subscribe2((msg) => {
      if (msg.type !== "memory_changed") return;
      const evt = msg;
      if (!evt.auto_extracted || evt.action !== "created") return;
      const toastId = autoFeedbackToastId(evt, gatewayScopeKey);
      dedupedToast.success(t2("memory.autoToast.title", "Agent learnt a preference"), {
        id: toastId,
        description: t2("memory.autoToast.description", {
          name: evt.name,
          defaultValue: 'Captured "{{name}}". Find it under Settings → Memory.',
        }),
        action: {
          label: t2("memory.autoToast.view", "View"),
          onClick: () => {
            if (evt.scope === "project" && !isActive2) {
              void navigate({
                to: "/workspace",
                search: buildWorkspaceSearch(workspaceId2),
              }).then(
                () => openSettings("memory"),
                (error) => {
                  void window.hilo?.logger?.warn?.(
                    `[AutoFeedbackToastListener] failed to open source workspace memory: ${error instanceof Error ? error.message : String(error)}`,
                  );
                },
              );
              return;
            }
            openSettings("memory");
          },
        },
        cancel: {
          label: t2("memory.autoToast.undo", "Undo"),
          onClick: () => {
            void (async () => {
              try {
                const res = await deleteMemory(fetcher, evt.scope, evt.name);
                dedupedToast.dismiss(toastId);
                if (res.deleted) {
                  dedupedToast.success(
                    t2("memory.autoToast.undoSuccess", "Undone — entry removed"),
                  );
                } else {
                  dedupedToast.info(
                    t2("memory.autoToast.undoNotFound", "Entry was already removed"),
                  );
                }
                queryClient2.invalidateQueries({
                  queryKey: ["memory"],
                });
              } catch (err) {
                dedupedToast.error(
                  t2("memory.autoToast.undoFailed", "Undo failed") +
                    (err instanceof Error ? `: ${err.message}` : ""),
                );
              }
            })();
          },
        },
      });
    });
  }, [
    connection?.scope,
    subscribe2,
    t2,
    queryClient2,
    fetcher,
    gatewayScopeKey,
    isActive2,
    navigate,
    openSettings,
    workspaceId2,
  ]);
  return null;
}
export function RemoteToolDialogShell({ width, height, children: children2 }) {
  return (
    <div
      className={
        width || height
          ? "elevated-surface-border relative z-10 flex flex-col overflow-hidden bg-popover shadow-2xl"
          : "elevated-surface-border relative z-10 flex h-[80vh] w-[80vw] max-w-5xl flex-col overflow-hidden bg-popover shadow-2xl"
      }
      style={
        width || height
          ? {
              width: width ? `${width}px` : "80vw",
              height: height ? `${height}px` : "80vh",
              maxWidth: "none",
              maxHeight: "90vh",
            }
          : void 0
      }
    >
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden">{children2}</div>
    </div>
  );
}
async function loadRemoteToolModule(url2) {
  const res = await fetch(url2);
  if (!res.ok) throw new Error(`Failed to fetch remote tool: ${res.status}`);
  const content2 = await res.text();
  const blob = new Blob([content2], {
    type: "text/javascript",
  });
  const blobUrl = URL.createObjectURL(blob);
  try {
    const mod = await import(/* @vite-ignore */ blobUrl);
    return mod;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
export function RemoteToolHost$1({
  toolUrl,
  toolId,
  sdk,
  layout = "fill",
  availableWidth,
  className,
  logger = remoteToolLog,
}) {
  const { t: t2 } = useTranslation();
  const containerRef = reactExports.useRef(null);
  const shadowRef = reactExports.useRef(null);
  const mountPointRef = reactExports.useRef(null);
  const mountHandleRef = reactExports.useRef(null);
  const sdkRef = reactExports.useRef(sdk);
  sdkRef.current = sdk;
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [productSize, setProductSize] = reactExports.useState({
    w: 0,
    h: 0,
  });
  reactExports.useEffect(() => {
    if (!toolUrl || !containerRef.current) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    if (!shadowRef.current) {
      shadowRef.current = containerRef.current.attachShadow({
        mode: "open",
      });
    }
    const shadow2 = shadowRef.current;
    while (shadow2.firstChild) shadow2.removeChild(shadow2.firstChild);
    const mountPoint = document.createElement("div");
    mountPoint.style.cssText =
      layout === "fit" ? "display: inline-block;" : "width: 100%; min-height: 100%;";
    shadow2.appendChild(mountPoint);
    mountPointRef.current = mountPoint;
    let ro = null;
    if (layout === "fit") {
      ro = new ResizeObserver((entries2) => {
        for (const entry of entries2) {
          const { width, height } = entry.contentRect;
          setProductSize((prev) =>
            prev.w === width && prev.h === height
              ? prev
              : {
                  w: width,
                  h: height,
                },
          );
        }
      });
      ro.observe(mountPoint);
    }
    let cancelled = false;
    const loadStart = Date.now();
    logger.info("host load start", {
      tool_id: toolId,
      tool_url: toolUrl,
    });
    loadRemoteToolModule(toolUrl)
      .then((mod) => {
        if (cancelled) return;
        for (const node2 of Array.from(
          document.head.querySelectorAll('style, link[rel="stylesheet"]'),
        )) {
          shadow2.insertBefore(node2.cloneNode(true), mountPoint);
        }
        shadow2.adoptedStyleSheets = [...document.adoptedStyleSheets];
        try {
          mountHandleRef.current = mod.mount(mountPoint, sdkRef.current);
          logger.info("host mounted", {
            tool_id: toolId,
            elapsed_ms: Date.now() - loadStart,
          });
        } catch (err) {
          logger.error("host mount failed", {
            tool_id: toolId,
            tool_url: toolUrl,
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : void 0,
          });
          setError(err instanceof Error ? err.message : String(err));
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        logger.error("host load failed", {
          tool_id: toolId,
          tool_url: toolUrl,
          elapsed_ms: Date.now() - loadStart,
          error: err instanceof Error ? err.message : String(err),
        });
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
      ro?.disconnect();
      try {
        mountHandleRef.current?.unmount();
      } catch (err) {
        logger.warn("host unmount error", {
          tool_id: toolId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      mountHandleRef.current = null;
      mountPointRef.current = null;
    };
  }, [toolUrl, toolId, layout, logger]);
  reactExports.useEffect(() => {
    mountHandleRef.current?.update(sdk);
  }, [sdk]);
  const scale2 =
    layout === "fit" && availableWidth && productSize.w > availableWidth
      ? availableWidth / productSize.w
      : 1;
  const scaled = scale2 < 1;
  const shadowHostStyle = {
    // fill mode: explicit height so the tool's h-full chain resolves to the
    // dialog container's height, enabling flex row layouts to work correctly.
    ...(layout === "fill" && {
      height: "100%",
    }),
    ...(layout === "fit" && {
      display: "inline-block",
      width: "max-content",
      height: "max-content",
    }),
    ...(scaled && {
      transform: `scale(${scale2})`,
      transformOrigin: "center center",
    }),
  };
  const wrapperClassName =
    className ??
    (layout === "fit"
      ? "relative flex h-full w-full items-center justify-center overflow-hidden"
      : "relative h-full w-full");
  return (
    <div className={wrapperClassName}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <span className="animate-pulse text-sm text-muted-foreground">
            {t2("remoteTool.loading", "Loading tool...")}
          </span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
          <div className="max-w-md bg-destructive/15 p-4 text-sm text-destructive">
            <p className="font-medium">{t2("remoteTool.loadFailed", "Failed to load tool")}</p>
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-xs opacity-80">
              {error}
            </pre>
          </div>
        </div>
      )}
      {jsxRuntimeExports.jsx(m$4, {
        onError: (boundaryError, info2) => {
          logger.error("host render error", {
            tool_id: toolId,
            error: boundaryError instanceof Error ? boundaryError.message : String(boundaryError),
            stack: boundaryError instanceof Error ? boundaryError.stack?.slice(0, 1024) : void 0,
            component_stack: info2.componentStack?.slice(0, 1024),
          });
        },
        fallbackRender: ({ error: boundaryError }) => (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <p className="text-center text-sm text-destructive break-all">
              {boundaryError instanceof Error ? boundaryError.message : String(boundaryError)}
            </p>
          </div>
        ),
        children: <div ref={containerRef} data-remote-tool={toolId} style={shadowHostStyle} />,
      })}
    </div>
  );
}
