// use-bundle-status.js
import { reactExports } from "../vendor.js";
import {
  getWorkspaceBundle,
  services,
} from "../vendor-inline/vscode-base/graph.jsx";
import { IBundleHandle } from "../workspace/home-service.jsx";

const SNAPSHOT_RETRY_DELAY_MS = 500;

const SNAPSHOT_RETRY_MAX_ELAPSED_MS = 3e4;

function createSnapshotUnavailableStatus(workspaceId) {
  const normalizedWorkspaceId = workspaceId ?? "workspace";
  return {
    workspaceId: normalizedWorkspaceId,
    folderPath: normalizedWorkspaceId,
    state: "failed",
    revision: 0,
    error:
      "Workspace runtime did not become available in time. Please retry to resume it.",
    diagnosis: {
      code: "runtime_start_timeout",
    },
    synthetic: true,
  };
}

export function useBundleStatus(workspaceId, refreshKey, options = {}) {
  const [scopedStatus, setScopedStatus] = reactExports.useState(void 0);
  const lastRevisionRef = reactExports.useRef(-1);
  const subscriptionScope = JSON.stringify([
    workspaceId ?? "home",
    refreshKey ?? 0,
  ]);
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
    let service;
    try {
      service = workspaceId
        ? getWorkspaceBundle(workspaceId)
        : services.get(IBundleHandle);
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
    const apply = (next) => {
      if (disposed) return;
      if (next.revision <= lastRevisionRef.current) return;
      lastRevisionRef.current = next.revision;
      clearRetryTimer();
      setScopedStatus({
        scope: subscriptionScope,
        status: next,
      });
    };
    const logSnapshotFailure = (err, final) => {
      const detail =
        err instanceof Error ? (err.stack ?? err.message) : String(err);
      const prefix = final
        ? "[useBundleStatus] snapshot retry exhausted"
        : "[useBundleStatus] snapshot failed";
      const message = `${prefix} (${subscriptionScope}, attempts=${snapshotFailureCount}): ${detail}`;
      const logger = window.hilo?.logger;
      if (logger) {
        const write = final
          ? logger.error.bind(logger)
          : logger.warn.bind(logger);
        write(message).catch(() => console.error(message));
      } else if (final) {
        console.error(message);
      } else {
        console.warn(message);
      }
    };
    const scheduleRetry = (err) => {
      if (disposed || lastRevisionRef.current >= 0) return;
      snapshotFailureCount += 1;
      const elapsedMs = Date.now() - startedAt;
      const final = elapsedMs >= maxRetryElapsedMs;
      if (snapshotFailureCount === 1 || final) {
        logSnapshotFailure(err, final);
      }
      if (final) {
        setScopedStatus({
          scope: subscriptionScope,
          status: createSnapshotUnavailableStatus(workspaceId),
        });
        return;
      }
      clearRetryTimer();
      retryTimer = setTimeout(fetchSnapshot, retryDelayMs);
    };
    const fetchSnapshot = () => {
      if (disposed || lastRevisionRef.current >= 0) return;
      service
        .getStatus()
        .then((snapshot) => {
          if (disposed || !snapshot) return;
          apply(snapshot);
        })
        .catch(scheduleRetry);
    };
    const subscription = service.onStatusChange(apply);
    fetchSnapshot();
    return () => {
      disposed = true;
      clearRetryTimer();
      subscription.dispose();
    };
  }, [
    enabled,
    workspaceId,
    subscriptionScope,
    retryDelayMs,
    maxRetryElapsedMs,
  ]);
  return scopedStatus?.scope === subscriptionScope
    ? scopedStatus.status
    : void 0;
}
