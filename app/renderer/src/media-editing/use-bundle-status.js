// use-bundle-status.js
import { reactExports } from "../vendor.js";
import {
  getWorkspaceBundle,
  services,
} from "../vendor-inline/vscode-base/graph.jsx";
import { IBundleHandle } from "../workspace/home-service.jsx";

const SNAPSHOT_RETRY_DELAY_MS = 500;

const SNAPSHOT_RETRY_MAX_ELAPSED_MS = 3e4;

function createSnapshotUnavailableStatus(workspaceId2) {
  const id2 = workspaceId2 ?? "workspace";
  return {
    workspaceId: id2,
    folderPath: id2,
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

export function useBundleStatus(workspaceId2, refreshKey, options = {}) {
  const [scopedStatus, setScopedStatus] = reactExports.useState(void 0);
  const lastRevisionRef = reactExports.useRef(-1);
  const subscriptionScope = JSON.stringify([
    workspaceId2 ?? "home",
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
    let service2;
    try {
      service2 = workspaceId2
        ? getWorkspaceBundle(workspaceId2)
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
      const detail =
        err instanceof Error ? (err.stack ?? err.message) : String(err);
      const prefix = final
        ? "[useBundleStatus] snapshot retry exhausted"
        : "[useBundleStatus] snapshot failed";
      const msg = `${prefix} (${subscriptionScope}, attempts=${snapshotFailureCount}): ${detail}`;
      const logger = window.hilo?.logger;
      if (logger) {
        const write = final
          ? logger.error.bind(logger)
          : logger.warn.bind(logger);
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
  }, [
    enabled,
    workspaceId2,
    subscriptionScope,
    retryDelayMs,
    maxRetryElapsedMs,
  ]);
  return scopedStatus?.scope === subscriptionScope
    ? scopedStatus.status
    : void 0;
}
