// error-fallback-ui.jsx
import {
  measurePerf,
  useTranslation,
  reactExports,
  recordAction,
  AlertTriangle,
  CompositedSvg,
  isElectron,
  attachNativeToastSurface,
  reactDomExports,
  z$3,
  resolveToasterPlacement,
  Toaster$1,
  CircleCheckIcon,
  InfoIcon$1,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
  GLOBAL_TOASTER_Z_INDEX,
  visiblePreviewTabsStore,
  recentSlowMeasures,
  pendingLogLines,
  recentLongTasks,
  flush,
  scopedAssetsQueryKey,
  tracesByClientId,
  MAX_RECENT_TRACES,
} from "../vendor.js";
import { recordError } from "../m08/part-store.jsx";
import {
  PERF_PREFIX,
  PERF_SLOW_THRESHOLDS,
  PERF_SLOW_DEFAULT_MS,
  PERF_CHAT_FIRST_PROGRESS,
} from "../m01/text-models.js";
import { Button$1 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { instantiation, IWindowMainService } from "../m08/browser-inspiration-urls.jsx";
import { ShortcutHint } from "../m08/shortcut-categories.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ERROR_BOUNDARY_FEEDBACK_REASON,
  FeedbackButton,
  SupportInfoRow,
  buildSupportPayload,
  formatSupportTime,
  logErrorBoundary,
} from "./feedback-dialog.jsx";
export class ErrorBoundary extends reactExports.Component {
  state = {
    hasError: false,
    error: null,
    showDetails: false,
    diagnostic: null,
  };
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }
  componentDidCatch(error, info2) {
    const diagnostic = logErrorBoundary(error, info2.componentStack);
    this.setState({
      diagnostic,
    });
  }
  handleReload = () => {
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackUI
          message={this.state.error?.message}
          stack={this.state.error?.stack}
          failureId={this.state.diagnostic?.failureId}
          failureTimestamp={this.state.diagnostic?.timestamp}
          showDetails={this.state.showDetails}
          onToggleDetails={() =>
            this.setState((s2) => ({
              showDetails: !s2.showDetails,
            }))
          }
          onRetry={this.handleReload}
        />
      );
    }
    return this.props.children;
  }
}
export function ErrorFallbackUI({
  message: message2,
  stack,
  failureId,
  failureTimestamp,
  showDetails,
  onToggleDetails,
  onRetry,
  showFeedbackAction = true,
  containerClassName = "h-screen w-screen",
}) {
  const { t: t2 } = useTranslation();
  const [copied, setCopied] = reactExports.useState(false);
  const [diagnosticsContext, setDiagnosticsContext] = reactExports.useState(null);
  const [fallbackTimestamp] = reactExports.useState(() => new Date().toISOString());
  const supportTimestamp = failureTimestamp ?? diagnosticsContext?.timestamp ?? fallbackTimestamp;
  const supportPayload = failureId
    ? buildSupportPayload({
        failureId,
        timestamp: supportTimestamp,
        userId: diagnosticsContext?.userId ?? null,
      })
    : void 0;
  const feedbackErrorContext = supportPayload
    ? `${supportPayload}${
        message2
          ? `
${message2}`
          : ""
      }`
    : message2;
  reactExports.useEffect(() => {
    let cancelled = false;
    window.hilo?.diagnostics
      ?.getDiagnosticsContext?.()
      ?.then((context) => {
        if (!cancelled) setDiagnosticsContext(context);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const handleCopySupportInfo = () => {
    if (!supportPayload) return;
    const writeText = navigator.clipboard?.writeText;
    if (!writeText) return;
    void writeText
      .call(
        navigator.clipboard,
        message2
          ? `${supportPayload}
message: ${message2}`
          : supportPayload,
      )
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2e3);
      })
      .catch(() => {});
  };
  return (
    <div
      className={`flex ${containerClassName} select-none flex-col items-center justify-center bg-background`}
    >
      <div className="flex w-full max-w-md flex-col items-center px-6">
        <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive ring-1 ring-destructive/20">
          <AlertTriangle className="size-5" />
        </div>
        <h1 className="mb-2 text-[15px] font-medium text-destructive">
          {t2("errorBoundary.title", {
            defaultValue: "Something went wrong",
          })}
        </h1>
        <p className="mb-6 text-center text-[13px] leading-relaxed text-muted-foreground">
          {t2("errorBoundary.descriptionLine1", {
            defaultValue: "The application encountered an unexpected error.",
          })}
          <br />
          {t2("errorBoundary.descriptionLine2", {
            defaultValue: "You can try again. If the issue persists, please report it.",
          })}
        </p>
        {failureId && (
          <div className="mb-6 w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-[12px]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="font-medium text-foreground">
                {t2("errorBoundary.diagnosticsTitle", {
                  defaultValue: "Diagnostics info",
                })}
              </span>
              <Button$1
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleCopySupportInfo}
                className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                data-action-ui-id="error-boundary.copy-diagnostics"
              >
                {copied
                  ? t2("errorBoundary.copied", {
                      defaultValue: "Copied",
                    })
                  : t2("errorBoundary.copyDiagnostics", {
                      defaultValue: "Copy info",
                    })}
              </Button$1>
            </div>
            <div className="grid gap-1.5">
              <SupportInfoRow
                label={t2("errorBoundary.diagnosticsUid", {
                  defaultValue: "UID",
                })}
                value={
                  diagnosticsContext?.userId ??
                  t2("errorBoundary.diagnosticsUnknownUid", {
                    defaultValue: "Unknown",
                  })
                }
              />
              <SupportInfoRow
                label={t2("errorBoundary.diagnosticsCode", {
                  defaultValue: "Code",
                })}
                value={failureId}
              />
              <SupportInfoRow
                label={t2("errorBoundary.diagnosticsTime", {
                  defaultValue: "Time",
                })}
                value={formatSupportTime(supportTimestamp)}
              />
            </div>
          </div>
        )}
        <div className="mb-6 flex gap-2.5">
          {showFeedbackAction ? (
            <FeedbackButton
              errorContext={feedbackErrorContext}
              context={
                failureId
                  ? {
                      error_code: failureId,
                      failure_id: failureId,
                      error_source: "error_boundary",
                      user_id: diagnosticsContext?.userId ?? void 0,
                      timestamp: supportTimestamp,
                    }
                  : void 0
              }
              reason={ERROR_BOUNDARY_FEEDBACK_REASON}
              label={t2("errorBoundary.reportIssue", {
                defaultValue: "Report Issue",
              })}
            />
          ) : null}
          <Button$1
            type="button"
            onClick={onRetry}
            className="h-auto rounded-lg px-4 py-2 text-[13px]"
            data-action-ui-id="error-boundary.retry"
          >
            {t2("errorBoundary.tryAgain", {
              defaultValue: "Try Again",
            })}
          </Button$1>
        </div>
        {message2 && (
          <div className="flex w-full flex-col items-center">
            <Button$1
              type="button"
              variant="ghost"
              size="xs"
              onClick={onToggleDetails}
              className="gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
              data-action-ui-id="error-boundary.toggle-details"
            >
              <CompositedSvg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="currentColor"
                aria-hidden="true"
                className={`transition-transform ${showDetails ? "rotate-90" : ""}`}
              >
                <path
                  d="M3 1.5L7 5L3 8.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </CompositedSvg>
              {t2("errorBoundary.errorDetails", {
                defaultValue: "Error details",
              })}
            </Button$1>
            {showDetails && (
              <pre className="mt-3 max-h-48 w-full overflow-auto rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
                {message2}
                {stack &&
                  `

${stack}`}
              </pre>
            )}
          </div>
        )}
        <p className="mt-10 text-[11px] text-muted-foreground">
          {t2("errorBoundary.press", {
            defaultValue: "Press",
          })}{" "}
          <ShortcutHint
            accelerator="CommandOrControl+R"
            className="inline-flex h-auto min-w-0 items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground"
          />{" "}
          {t2("errorBoundary.toRetry", {
            defaultValue: "to try again",
          })}
        </p>
      </div>
    </div>
  );
}
function NativeToastHost({ children: children2, hotkey }) {
  const fallbackRef = reactExports.useRef(null);
  const [mount] = reactExports.useState(() => document.createElement("div"));
  reactExports.useLayoutEffect(() => {
    fallbackRef.current?.appendChild(mount);
    return () => mount.remove();
  }, [mount]);
  reactExports.useEffect(() => {
    if (!isElectron()) return;
    let disposed = false;
    let detach;
    const warn2 = (error) => {
      if (!disposed && error !== void 0)
        console.warn("[toast] Native surface unavailable; using DOM fallback.", error);
    };
    void (async () => {
      const { instantiationService: instantiationService2 } = await Promise.resolve().then(
        () => instantiation,
      );
      return {
        instantiationService: instantiationService2,
      };
    })()
      .then(({ instantiationService: instantiationService2 }) => {
        if (disposed) return;
        const service2 = instantiationService2.invokeFunction((accessor) =>
          accessor.get(IWindowMainService),
        );
        detach = attachNativeToastSurface(
          mount,
          (token2, layout) => service2.updateNativeToast(token2, layout),
          warn2,
          {
            bridge: service2,
            hotkey,
          },
        );
      })
      .catch(warn2);
    return () => {
      disposed = true;
      detach?.();
    };
  }, [mount, hotkey]);
  return (
    <div ref={fallbackRef} data-native-toast-host="">
      {reactDomExports.createPortal(children2, mount)}
    </div>
  );
}
export const Toaster2 = ({ style: style2, ...props }) => {
  const { theme: theme2 = "system" } = z$3();
  const placement = resolveToasterPlacement();
  return (
    <NativeToastHost hotkey={props.hotkey}>
      <Toaster$1
        theme={theme2}
        className="toaster group"
        position={placement.position}
        offset={placement.offset}
        mobileOffset={placement.mobileOffset}
        icons={{
          success: <CircleCheckIcon className="size-4" />,
          info: <InfoIcon$1 className="size-4" />,
          warning: <TriangleAlertIcon className="size-4" />,
          error: <OctagonXIcon className="size-4" />,
          loading: <Loader2Icon className="size-4 animate-spin" />,
        }}
        style={{
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--elevated-border-color)",
          "--border-radius": "8px",
          // NativeToastHost preserves this single tree in a native child above
          // WebContentsViews. The z-index remains for the web/error fallback,
          // above dialogs, tooltips and Canvas portals.
          zIndex: GLOBAL_TOASTER_Z_INDEX,
          ...style2,
        }}
        toastOptions={{
          classNames: {
            toast: "cn-toast",
          },
        }}
        {...props}
      />
    </NativeToastHost>
  );
};
function nonEmptyOpaqueText$1(value) {
  if (typeof value !== "string") return void 0;
  return value.trim().length > 0 ? value : void 0;
}
function normalizeReference$2(value) {
  if (typeof value === "string") {
    const workspaceId22 = nonEmptyOpaqueText$1(value);
    return workspaceId22
      ? {
          workspaceId: workspaceId22,
        }
      : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value;
  const workspaceId2 = nonEmptyOpaqueText$1(candidate.workspaceId);
  if (!workspaceId2) return null;
  const folderPath = nonEmptyOpaqueText$1(candidate.folderPath);
  return folderPath
    ? {
        workspaceId: workspaceId2,
        folderPath,
      }
    : {
        workspaceId: workspaceId2,
      };
}
function normalizeVisiblePreviewTabReferences(values3) {
  const seenWorkspaceIds = new Set();
  const seenFolderPaths = new Set();
  const result = [];
  for (const value of values3) {
    const reference = normalizeReference$2(value);
    if (!reference || seenWorkspaceIds.has(reference.workspaceId)) continue;
    if (reference.folderPath && seenFolderPaths.has(reference.folderPath)) continue;
    seenWorkspaceIds.add(reference.workspaceId);
    if (reference.folderPath) seenFolderPaths.add(reference.folderPath);
    result.push(reference);
  }
  return result;
}
function selectStartupVisiblePreviewWorkspace$1(
  snapshot2,
  restoredWorkspaceIds,
  preferredWorkspaceId,
) {
  const restored = normalizeVisiblePreviewTabReferences(restoredWorkspaceIds).map(
    (entry) => entry.workspaceId,
  );
  if (restored.length === 0) return null;
  const restoredSet = new Set(restored);
  if (!snapshot2.initialized) {
    return preferredWorkspaceId && restoredSet.has(preferredWorkspaceId)
      ? preferredWorkspaceId
      : (restored[0] ?? null);
  }
  const visibleRestored = [];
  const seen2 = new Set();
  for (const reference of snapshot2.tabs) {
    const restoredId = restoredSet.has(reference.workspaceId)
      ? reference.workspaceId
      : reference.folderPath && restoredSet.has(reference.folderPath)
        ? reference.folderPath
        : void 0;
    if (!restoredId || seen2.has(restoredId)) continue;
    seen2.add(restoredId);
    visibleRestored.push(restoredId);
  }
  if (preferredWorkspaceId && visibleRestored.includes(preferredWorkspaceId)) {
    return preferredWorkspaceId;
  }
  return visibleRestored[0] ?? null;
}
function selectStartupVisiblePreviewWorkspace(
  snapshot2,
  restoredWorkspaceIds,
  preferredWorkspaceId,
) {
  return selectStartupVisiblePreviewWorkspace$1(
    snapshot2,
    restoredWorkspaceIds,
    preferredWorkspaceId,
  );
}
export function getVisiblePreviewTabIds() {
  return visiblePreviewTabsStore.getVisibleWorkspaceIds();
}
export function getStartupVisiblePreviewWorkspace(restoredWorkspaceIds, preferredWorkspaceId) {
  return selectStartupVisiblePreviewWorkspace(
    visiblePreviewTabsStore.getSnapshot(),
    restoredWorkspaceIds,
    preferredWorkspaceId,
  );
}
export function replaceVisiblePreviewTab(workspaceId2, entry) {
  visiblePreviewTabsStore.replace(workspaceId2, entry);
}
const MAX_BUFFER = 200;
let observer = null;
let longTaskObserver = null;
const FLUSH_INTERVAL_MS = 5e3;
function safeStringifyDetail(detail) {
  if (detail === void 0) return void 0;
  try {
    return JSON.stringify(detail, (_key, value) => {
      if (typeof value === "bigint") return value.toString();
      return value;
    });
  } catch {
    return "[unserializable detail]";
  }
}
function handleEntries(list2) {
  for (const entry of list2.getEntries()) {
    if (!entry.name.startsWith(PERF_PREFIX)) continue;
    const threshold = PERF_SLOW_THRESHOLDS[entry.name] ?? PERF_SLOW_DEFAULT_MS;
    const dur = Math.round(entry.duration * 100) / 100;
    if (dur < threshold) continue;
    const detail = entry.detail;
    const record2 = {
      name: entry.name,
      durationMs: dur,
      detail: detail ?? void 0,
      ts: Date.now(),
    };
    recentSlowMeasures.push(record2);
    if (recentSlowMeasures.length > MAX_BUFFER) {
      recentSlowMeasures.shift();
    }
    const detailText = safeStringifyDetail(detail);
    pendingLogLines.push(`[slow] ${entry.name} ${dur}ms${detailText ? ` ${detailText}` : ""}`);
  }
}
function handleLongTaskEntries(list2) {
  for (const entry of list2.getEntries()) {
    const ts2 = normalizeEntryTimestamp(entry);
    const attribution = entry.attribution;
    recentLongTasks.push({
      name: entry.name || "longtask",
      durationMs: Math.round(entry.duration * 100) / 100,
      ts: ts2,
      tsIso: new Date(ts2).toISOString(),
      ...(Array.isArray(attribution)
        ? {
            attributionCount: attribution.length,
          }
        : {}),
    });
    if (recentLongTasks.length > MAX_BUFFER) {
      recentLongTasks.shift();
    }
  }
}
function normalizeEntryTimestamp(entry) {
  const timeOrigin = performance.timeOrigin;
  if (Number.isFinite(timeOrigin) && Number.isFinite(entry.startTime)) {
    return Math.round(timeOrigin + entry.startTime);
  }
  return Date.now();
}
export function startPerfObserver() {
  if (
    observer ||
    typeof PerformanceObserver === "undefined" ||
    typeof hilo === "undefined" ||
    !hilo?.logger
  ) {
    return;
  }
  try {
    longTaskObserver = new PerformanceObserver(handleLongTaskEntries);
    longTaskObserver.observe({
      type: "longtask",
      buffered: true,
    });
  } catch {
    longTaskObserver = null;
  }
  observer = new PerformanceObserver(handleEntries);
  observer.observe({
    type: "measure",
    buffered: true,
  });
  setInterval(flush, FLUSH_INTERVAL_MS);
}
export async function optimisticallyRemoveAssets({ qc, gatewayScopeKey, paths }) {
  const queryKey = scopedAssetsQueryKey(gatewayScopeKey);
  await qc.cancelQueries({
    queryKey,
  });
  const snapshot2 = qc.getQueryData(queryKey);
  const removed = new Set(paths);
  qc.setQueryData(queryKey, (prev) =>
    prev ? prev.filter((asset) => !removed.has(asset.path)) : prev,
  );
  return {
    queryKey,
    assets: snapshot2,
  };
}
export function rollbackAssetListSnapshot({ qc, snapshot: snapshot2 }) {
  if (!snapshot2?.assets) return;
  qc.setQueryData(snapshot2.queryKey, snapshot2.assets);
}
const MAX_PENDING_FIRST_PROGRESS = 100;
const firstProgressStartByClientId = new Map();
export function recordIdleActionSafe(message2, data2) {
  try {
    recordAction(message2, data2);
  } catch {}
}
export function recordIdleMismatchSafe(data2) {
  try {
    recordError("chat_busy_state_mismatch", data2);
  } catch {}
}
export function recordMessageDeliveryTrace(trace) {
  observeFirstProgress(trace);
  tracesByClientId.set(trace.clientMessageId, trace);
  trimTraceMap();
}
function observeFirstProgress(trace) {
  if (trace.status === "sent") {
    if (!firstProgressStartByClientId.has(trace.clientMessageId)) {
      firstProgressStartByClientId.set(trace.clientMessageId, performance.now());
      if (firstProgressStartByClientId.size > MAX_PENDING_FIRST_PROGRESS) {
        const oldestKey = firstProgressStartByClientId.keys().next().value;
        if (oldestKey !== void 0) firstProgressStartByClientId.delete(oldestKey);
      }
    }
    return;
  }
  if (trace.status === "received" || trace.status === "accepted") return;
  const start2 = firstProgressStartByClientId.get(trace.clientMessageId);
  firstProgressStartByClientId.delete(trace.clientMessageId);
  if (start2 === void 0 || trace.status !== "started") return;
  measurePerf(PERF_CHAT_FIRST_PROGRESS, start2, {
    sessionId: trace.sessionId,
    delivery: trace.delivery,
  });
}
function trimTraceMap() {
  if (tracesByClientId.size <= MAX_RECENT_TRACES) return;
  const overflow = tracesByClientId.size - MAX_RECENT_TRACES;
  const oldestIds = [...tracesByClientId.values()]
    .sort((a2, b3) => a2.updatedAt - b3.updatedAt)
    .slice(0, overflow)
    .map((trace) => trace.clientMessageId);
  for (const id2 of oldestIds) {
    tracesByClientId.delete(id2);
  }
}
