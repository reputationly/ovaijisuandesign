// error-boundary.jsx
import { recordError } from "../chat/attach-handoff-targets-to-sub-messages.js";
import { recordAction } from "./gateway-http-error.jsx";
import {
  MAX_RECENT_TRACES,
  scopedAssetsQueryKey,
  tracesByClientId,
} from "../assets/credit-query-keys.jsx";
import { measurePerf, reactExports } from "../vendor.js";
import { PERF_CHAT_FIRST_PROGRESS } from "../generation/to-workspace-browser-url.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ErrorFallbackUI } from "./error-fallback-ui.jsx";
import { logErrorBoundary } from "../settings/log-error-boundary.js";
import { visiblePreviewTabsStore } from "../workspace/create-visible-preview-tabs-store.js";

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
  componentDidCatch(error, info) {
    const diagnostic = logErrorBoundary(error, info.componentStack);
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
            this.setState((prevState) => ({
              showDetails: !prevState.showDetails,
            }))
          }
          onRetry={this.handleReload}
        />
      );
    }
    return this.props.children;
  }
}

export function getVisiblePreviewTabIds() {
  return visiblePreviewTabsStore.getVisibleWorkspaceIds();
}

export function replaceVisiblePreviewTab(workspaceId, entry) {
  visiblePreviewTabsStore.replace(workspaceId, entry);
}

export async function optimisticallyRemoveAssets({
  qc,
  gatewayScopeKey,
  paths,
}) {
  const queryKey = scopedAssetsQueryKey(gatewayScopeKey);
  await qc.cancelQueries({
    queryKey,
  });
  const snapshot = qc.getQueryData(queryKey);
  const removed = new Set(paths);
  qc.setQueryData(queryKey, (prev) =>
    prev ? prev.filter((asset) => !removed.has(asset.path)) : prev,
  );
  return {
    queryKey,
    assets: snapshot,
  };
}

export function rollbackAssetListSnapshot({ qc, snapshot }) {
  if (!snapshot?.assets) return;
  qc.setQueryData(snapshot.queryKey, snapshot.assets);
}

const MAX_PENDING_FIRST_PROGRESS = 100;

const firstProgressStartByClientId = new Map();

export function recordIdleActionSafe(message, data) {
  try {
    recordAction(message, data);
  } catch {}
}

export function recordIdleMismatchSafe(data) {
  try {
    recordError("chat_busy_state_mismatch", data);
  } catch {}
}

function observeFirstProgress(trace) {
  if (trace.status === "sent") {
    if (!firstProgressStartByClientId.has(trace.clientMessageId)) {
      firstProgressStartByClientId.set(
        trace.clientMessageId,
        performance.now(),
      );
      if (firstProgressStartByClientId.size > MAX_PENDING_FIRST_PROGRESS) {
        const oldestKey = firstProgressStartByClientId.keys().next().value;
        if (oldestKey !== void 0)
          firstProgressStartByClientId.delete(oldestKey);
      }
    }
    return;
  }
  if (trace.status === "received" || trace.status === "accepted") return;
  const start = firstProgressStartByClientId.get(trace.clientMessageId);
  firstProgressStartByClientId.delete(trace.clientMessageId);
  if (start === void 0 || trace.status !== "started") return;
  measurePerf(PERF_CHAT_FIRST_PROGRESS, start, {
    sessionId: trace.sessionId,
    delivery: trace.delivery,
  });
}

function trimTraceMap() {
  if (tracesByClientId.size <= MAX_RECENT_TRACES) return;
  const overflow = tracesByClientId.size - MAX_RECENT_TRACES;
  const oldestIds = [...tracesByClientId.values()]
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .slice(0, overflow)
    .map((trace) => trace.clientMessageId);
  for (const id of oldestIds) {
    tracesByClientId.delete(id);
  }
}

export function recordMessageDeliveryTrace(trace) {
  observeFirstProgress(trace);
  tracesByClientId.set(trace.clientMessageId, trace);
  trimTraceMap();
}
