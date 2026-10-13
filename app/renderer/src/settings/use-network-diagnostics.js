// use-network-diagnostics.js
import { reactExports } from "../vendor.js";
import { runFullNetworkDiagnostics } from "../infra/use-retry-hint-active.js";
import { getNetworkDiagnosticsMainService } from "../team/copy-icon-button.jsx";

const DIAGNOSTICS_RECOVERY_RETRY_DELAYS_MS = [3e3, 1e4];

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

export function useNetworkDiagnostics(options) {
  const enabled = options?.enabled ?? true;
  const gatewayUrl = options?.gatewayUrl;
  const workspaceClaim = options?.workspaceClaim;
  const workspaceBinding = options?.workspaceBinding;
  const recoveryRetryDelaysMs =
    options?.recoveryRetryDelaysMs ?? DIAGNOSTICS_RECOVERY_RETRY_DELAYS_MS;
  const recoveryRetryPolicyKey = recoveryRetryDelaysMs.join(",");
  const unhealthyConfirmationCount = Math.max(
    1,
    options?.unhealthyConfirmationCount ?? 2,
  );
  const requestScope = JSON.stringify([
    enabled ? "enabled" : "disabled",
    gatewayUrl ?? "",
    workspaceBinding?.baseUrl ?? "",
    workspaceBinding?.instanceId ?? "",
    workspaceBinding?.generation ?? "",
    workspaceClaim ?? "",
  ]);
  const [diagnosticsState, setDiagnosticsState] = reactExports.useState({
    scope: requestScope,
    snapshot: null,
    loading: false,
    error: null,
    resultRevision: 0,
    unhealthyObservationCount: 0,
  });
  const [proxyMode, setProxyModeState] = reactExports.useState("auto");
  const mountedRef = reactExports.useRef(false);
  const activeScopeRef = reactExports.useRef(requestScope);
  activeScopeRef.current = requestScope;
  const recoveryRetryDelaysRef = reactExports.useRef(recoveryRetryDelaysMs);
  recoveryRetryDelaysRef.current = recoveryRetryDelaysMs;
  const requestRevisionRef = reactExports.useRef(0);
  const resultRevisionRef = reactExports.useRef(0);
  const recoveryRetryRef = reactExports.useRef({
    scope: requestScope,
    policyKey: recoveryRetryPolicyKey,
    attempt: 0,
  });
  const scopedState =
    diagnosticsState.scope === requestScope
      ? diagnosticsState
      : {
          scope: requestScope,
          snapshot: null,
          loading: false,
          error: null,
          resultRevision: 0,
          unhealthyObservationCount: 0,
        };
  const scopedStateUnhealthy =
    scopedState.error !== null ||
    (scopedState.snapshot !== null && scopedState.snapshot.overall !== "ok");
  const scopedStateConfirmed =
    !scopedStateUnhealthy ||
    scopedState.unhealthyObservationCount >= unhealthyConfirmationCount;
  const visibleState = scopedStateConfirmed
    ? scopedState
    : {
        ...scopedState,
        snapshot: null,
        loading: true,
        error: null,
      };
  const refresh = reactExports.useCallback(async () => {
    if (!enabled || activeScopeRef.current !== requestScope) return;
    const revision = ++requestRevisionRef.current;
    setDiagnosticsState((current) => ({
      scope: requestScope,
      snapshot: current.scope === requestScope ? current.snapshot : null,
      loading: true,
      error: null,
      resultRevision: current.resultRevision,
      unhealthyObservationCount:
        current.scope === requestScope
          ? current.unhealthyObservationCount
          : 0,
    }));
    try {
      const next = await runFullNetworkDiagnostics({
        gatewayUrl,
        workspaceClaim,
        workspaceBinding,
      });
      if (
        !mountedRef.current ||
        activeScopeRef.current !== requestScope ||
        revision !== requestRevisionRef.current
      )
        return;
      setDiagnosticsState((current) => ({
        scope: requestScope,
        snapshot: next,
        loading: false,
        error: null,
        resultRevision: ++resultRevisionRef.current,
        unhealthyObservationCount:
          next.overall === "ok"
            ? 0
            : (current.scope === requestScope
                ? current.unhealthyObservationCount
                : 0) + 1,
      }));
      setProxyModeState(next.proxyMode);
    } catch (err) {
      if (
        mountedRef.current &&
        activeScopeRef.current === requestScope &&
        revision === requestRevisionRef.current
      ) {
        setDiagnosticsState((current) => ({
          scope: requestScope,
          snapshot: current.scope === requestScope ? current.snapshot : null,
          loading: false,
          error: formatError(err),
          resultRevision: ++resultRevisionRef.current,
          unhealthyObservationCount:
            (current.scope === requestScope
              ? current.unhealthyObservationCount
              : 0) + 1,
        }));
      }
    }
  }, [enabled, gatewayUrl, requestScope, workspaceBinding, workspaceClaim]);
  const setProxyMode = reactExports.useCallback(
    async (mode) => {
      setDiagnosticsState((current) => ({
        scope: requestScope,
        snapshot: current.scope === requestScope ? current.snapshot : null,
        loading: current.scope === requestScope ? current.loading : false,
        error: null,
        resultRevision:
          current.scope === requestScope ? current.resultRevision : 0,
        unhealthyObservationCount:
          current.scope === requestScope
            ? current.unhealthyObservationCount
            : 0,
      }));
      try {
        const service = getNetworkDiagnosticsMainService();
        const result = await service.setProxyMode(mode);
        if (!mountedRef.current) return result.success;
        setProxyModeState(result.mode);
        if (activeScopeRef.current !== requestScope) return result.success;
        if (!result.success) {
          setDiagnosticsState((current) => ({
            scope: requestScope,
            snapshot:
              current.scope === requestScope ? current.snapshot : null,
            loading: false,
            error: result.error ?? "proxy_mode_update_failed",
            resultRevision: ++resultRevisionRef.current,
            unhealthyObservationCount:
              (current.scope === requestScope
                ? current.unhealthyObservationCount
                : 0) + 1,
          }));
          return false;
        }
        await refresh();
        return true;
      } catch (err) {
        if (mountedRef.current && activeScopeRef.current === requestScope) {
          setDiagnosticsState((current) => ({
            scope: requestScope,
            snapshot:
              current.scope === requestScope ? current.snapshot : null,
            loading: false,
            error: formatError(err),
            resultRevision: ++resultRevisionRef.current,
            unhealthyObservationCount:
              (current.scope === requestScope
                ? current.unhealthyObservationCount
                : 0) + 1,
          }));
        }
        return false;
      }
    },
    [refresh, requestScope],
  );
  reactExports.useEffect(() => {
    mountedRef.current = true;
    requestRevisionRef.current += 1;
    setDiagnosticsState({
      scope: requestScope,
      snapshot: null,
      loading: false,
      error: null,
      resultRevision: 0,
      unhealthyObservationCount: 0,
    });
    if (!enabled) {
      return () => {
        mountedRef.current = false;
        requestRevisionRef.current += 1;
      };
    }
    const service = getNetworkDiagnosticsMainService();
    service
      .getProxyMode()
      .then((mode) => {
        if (mountedRef.current) setProxyModeState(mode);
      })
      .catch(() => {});
    void refresh();
    return () => {
      mountedRef.current = false;
      requestRevisionRef.current += 1;
    };
  }, [enabled, refresh, requestScope]);
  reactExports.useEffect(() => {
    if (
      recoveryRetryRef.current.scope !== requestScope ||
      recoveryRetryRef.current.policyKey !== recoveryRetryPolicyKey
    ) {
      recoveryRetryRef.current = {
        scope: requestScope,
        policyKey: recoveryRetryPolicyKey,
        attempt: 0,
      };
    }
    const hasResult = scopedState.resultRevision > 0;
    const unhealthy =
      scopedState.error !== null ||
      (scopedState.snapshot !== null && scopedState.snapshot.overall !== "ok");
    if (!enabled || scopedState.loading || !hasResult) return;
    if (!unhealthy) {
      recoveryRetryRef.current = {
        scope: requestScope,
        policyKey: recoveryRetryPolicyKey,
        attempt: 0,
      };
      return;
    }
    const attempt = recoveryRetryRef.current.attempt;
    const delayMs = recoveryRetryDelaysRef.current[attempt];
    if (delayMs === void 0) return;
    recoveryRetryRef.current = {
      scope: requestScope,
      policyKey: recoveryRetryPolicyKey,
      attempt: attempt + 1,
    };
    const timer = setTimeout(() => void refresh(), Math.max(0, delayMs));
    return () => clearTimeout(timer);
  }, [
    enabled,
    recoveryRetryPolicyKey,
    refresh,
    requestScope,
    scopedState.error,
    scopedState.loading,
    scopedState.resultRevision,
    scopedState.snapshot,
  ]);
  reactExports.useEffect(() => {
    let lastSignalAt = 0;
    const refreshFromConnectivitySignal = () => {
      const now = Date.now();
      if (now - lastSignalAt < 100) return;
      lastSignalAt = now;
      void refresh();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible")
        refreshFromConnectivitySignal();
    };
    window.addEventListener("focus", refreshFromConnectivitySignal);
    window.addEventListener("online", refreshFromConnectivitySignal);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", refreshFromConnectivitySignal);
      window.removeEventListener("online", refreshFromConnectivitySignal);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);
  return {
    snapshot: visibleState.snapshot,
    proxyMode,
    loading: visibleState.loading,
    error: visibleState.error,
    refresh,
    setProxyMode,
  };
}
