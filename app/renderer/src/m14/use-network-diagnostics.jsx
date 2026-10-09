// use-network-diagnostics.jsx
import { useTranslation, reactExports, ChevronDown, dedupedToast, usePlatform, Search, Plus, ArrowUpRight, ChevronRight$1, MonochromeIcon, Pin, WifiOffIcon, WifiIcon, ServerIcon, DownloadIcon, ActivityIcon, ShieldCheckIcon, CloudIcon, UsersIcon, CheckCircle2Icon, AlertTriangleIcon, UploadIcon$1, FolderOpenIcon, ClipboardIcon } from "../vendor.js";
import { Popover, PopoverTrigger, Select$1 } from "../m15/apply-asset-change.jsx";
import { Tooltip, TooltipTrigger, TooltipProvider } from "../m15/graph.jsx";
import { Trash2, FolderOpen, Users, Folder } from "../m15/parse-item.jsx";
import { useTopbarState, ContextMenu } from "../m15/use-hub-logo-hover-animation.jsx";
import {
  TooltipContent,
  Button$1,
  cn$2,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { PopoverContent } from "../m09/use-credit-details.jsx";
import { resolveShortcutDisplay, ShortcutHint } from "../m08/shortcut-categories.jsx";
import { RetryIcon, StrokeIcon, LocalFolderIcon } from "../m08/browser-inspiration-urls.jsx";
import {
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "../m10/new-workspace-dialog.jsx";
import {
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../asset-center/shared/select-content.jsx";
import { runFullNetworkDiagnostics } from "../m11/bundle-error-screen.jsx";
import { isGatewayReady, useBundleStatus } from "../m11/remote-tool-host.jsx";
import { useGatewayReadiness } from "../m10/hub-logo.jsx";
import { getNetworkDiagnosticsMainService } from "../m10/delete-account-confirm-dialog.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { UngroupedSortMenu } from "./use-native-project-preview.jsx";
export const SIDEBAR_BADGE_TARGET_BY_ROUTE = {
  "/": "launchpad",
  "/projects": "projects",
  "/asset-center": "assetCenter",
  "/skills": "skills",
  "/workflows": "workflows",
};
const DIAGNOSTICS_RECOVERY_RETRY_DELAYS_MS = [3e3, 1e4];
function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
function useNetworkDiagnostics(options) {
  const enabled = options?.enabled ?? true;
  const gatewayUrl2 = options?.gatewayUrl;
  const workspaceClaim = options?.workspaceClaim;
  const workspaceBinding = options?.workspaceBinding;
  const recoveryRetryDelaysMs =
    options?.recoveryRetryDelaysMs ?? DIAGNOSTICS_RECOVERY_RETRY_DELAYS_MS;
  const recoveryRetryPolicyKey = recoveryRetryDelaysMs.join(",");
  const unhealthyConfirmationCount = Math.max(1, options?.unhealthyConfirmationCount ?? 2);
  const requestScope = JSON.stringify([
    enabled ? "enabled" : "disabled",
    gatewayUrl2 ?? "",
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
    !scopedStateUnhealthy || scopedState.unhealthyObservationCount >= unhealthyConfirmationCount;
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
    setDiagnosticsState((current2) => ({
      scope: requestScope,
      snapshot: current2.scope === requestScope ? current2.snapshot : null,
      loading: true,
      error: null,
      resultRevision: current2.resultRevision,
      unhealthyObservationCount:
        current2.scope === requestScope ? current2.unhealthyObservationCount : 0,
    }));
    try {
      const next2 = await runFullNetworkDiagnostics({
        gatewayUrl: gatewayUrl2,
        workspaceClaim,
        workspaceBinding,
      });
      if (
        !mountedRef.current ||
        activeScopeRef.current !== requestScope ||
        revision !== requestRevisionRef.current
      )
        return;
      setDiagnosticsState((current2) => ({
        scope: requestScope,
        snapshot: next2,
        loading: false,
        error: null,
        resultRevision: ++resultRevisionRef.current,
        unhealthyObservationCount:
          next2.overall === "ok"
            ? 0
            : (current2.scope === requestScope ? current2.unhealthyObservationCount : 0) + 1,
      }));
      setProxyModeState(next2.proxyMode);
    } catch (err) {
      if (
        mountedRef.current &&
        activeScopeRef.current === requestScope &&
        revision === requestRevisionRef.current
      ) {
        setDiagnosticsState((current2) => ({
          scope: requestScope,
          snapshot: current2.scope === requestScope ? current2.snapshot : null,
          loading: false,
          error: formatError(err),
          resultRevision: ++resultRevisionRef.current,
          unhealthyObservationCount:
            (current2.scope === requestScope ? current2.unhealthyObservationCount : 0) + 1,
        }));
      }
    }
  }, [enabled, gatewayUrl2, requestScope, workspaceBinding, workspaceClaim]);
  const setProxyMode = reactExports.useCallback(
    async (mode2) => {
      setDiagnosticsState((current2) => ({
        scope: requestScope,
        snapshot: current2.scope === requestScope ? current2.snapshot : null,
        loading: current2.scope === requestScope ? current2.loading : false,
        error: null,
        resultRevision: current2.scope === requestScope ? current2.resultRevision : 0,
        unhealthyObservationCount:
          current2.scope === requestScope ? current2.unhealthyObservationCount : 0,
      }));
      try {
        const service2 = getNetworkDiagnosticsMainService();
        const result = await service2.setProxyMode(mode2);
        if (!mountedRef.current) return result.success;
        setProxyModeState(result.mode);
        if (activeScopeRef.current !== requestScope) return result.success;
        if (!result.success) {
          setDiagnosticsState((current2) => ({
            scope: requestScope,
            snapshot: current2.scope === requestScope ? current2.snapshot : null,
            loading: false,
            error: result.error ?? "proxy_mode_update_failed",
            resultRevision: ++resultRevisionRef.current,
            unhealthyObservationCount:
              (current2.scope === requestScope ? current2.unhealthyObservationCount : 0) + 1,
          }));
          return false;
        }
        await refresh();
        return true;
      } catch (err) {
        if (mountedRef.current && activeScopeRef.current === requestScope) {
          setDiagnosticsState((current2) => ({
            scope: requestScope,
            snapshot: current2.scope === requestScope ? current2.snapshot : null,
            loading: false,
            error: formatError(err),
            resultRevision: ++resultRevisionRef.current,
            unhealthyObservationCount:
              (current2.scope === requestScope ? current2.unhealthyObservationCount : 0) + 1,
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
    const service2 = getNetworkDiagnosticsMainService();
    service2
      .getProxyMode()
      .then((mode2) => {
        if (mountedRef.current) setProxyModeState(mode2);
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
    const timer2 = setTimeout(() => void refresh(), Math.max(0, delayMs));
    return () => clearTimeout(timer2);
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
      const now2 = Date.now();
      if (now2 - lastSignalAt < 100) return;
      lastSignalAt = now2;
      void refresh();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshFromConnectivitySignal();
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
const LOCAL_TARGETS = ["local_gateway", "gateway_network"];
const CLOUD_TARGETS = ["cloud_gateway_api", "app_api"];
const ACCOUNT_TARGETS = ["team_account_api"];
const UPDATE_TARGETS = ["update_cdn"];
const OBSERVABILITY_TARGETS = ["guance_rum", "sensors"];
const LEGACY_UNUSED_PROBE_TARGETS = new Set(["hot_update_cdn"]);
const PROXY_RECOMMENDATION_CODES = new Set([
  "proxy_unreachable",
  "tun_detected",
  "try_direct_proxy_mode",
  "try_system_proxy_mode",
]);
function diagnosticsRecommendationKey(code2) {
  return `topbar.diagnostics.recommendation.${code2}`;
}
function diagnosticsProbeLabelKey(target) {
  return `topbar.diagnostics.probe.${target}`;
}
function diagnosticsProbeStatusKey(status) {
  return `topbar.diagnostics.probeStatus.${status}`;
}
function diagnosticsFailureKindKey(failureKind) {
  return `topbar.diagnostics.failureKind.${failureKind}`;
}
function proxyModeForDiagnosticsRecommendation(code2) {
  if (code2 === "try_direct_proxy_mode") return "direct";
  if (code2 === "try_system_proxy_mode") return "system";
  return null;
}
function buildDiagnosticsDomainCards(snapshot2) {
  const localSeverity = pickWorstSeverity(snapshot2?.probes, LOCAL_TARGETS, "error");
  const cloudSeverity = pickWorstSeverity(snapshot2?.probes, CLOUD_TARGETS, "error");
  const accountProbes =
    snapshot2?.probes.filter((probe) => probe.target === "team_account_api") ?? [];
  const hasAccountProbe = accountProbes.length > 0;
  const accountProbeUnconfigured =
    hasAccountProbe && accountProbes.every((probe) => probe.status === "skipped");
  const accountProbeNotApplicable =
    accountProbeUnconfigured && snapshot2?.release.channel === "staging";
  const accountSeverity = pickWorstSeverity(snapshot2?.probes, ACCOUNT_TARGETS, "error");
  const updateSeverity = pickWorstSeverity(snapshot2?.probes, UPDATE_TARGETS, "warning");
  const observabilitySeverity = pickWorstSeverity(
    snapshot2?.probes,
    OBSERVABILITY_TARGETS,
    "warning",
  );
  const proxyRecommendation = snapshot2?.recommendations.find((recommendation) =>
    PROXY_RECOMMENDATION_CODES.has(recommendation.code),
  );
  const proxySeverity = proxyRecommendation?.severity ?? "ok";
  const cards = [
    {
      id: "local",
      severity: localSeverity,
      titleKey: "topbar.diagnostics.domain.local.title",
      detailKey: `topbar.diagnostics.domain.local.${localSeverity}`,
    },
    {
      id: "cloud",
      severity: cloudSeverity,
      titleKey: "topbar.diagnostics.domain.cloud.title",
      detailKey: `topbar.diagnostics.domain.cloud.${cloudSeverity}`,
    },
  ];
  if (hasAccountProbe && !accountProbeNotApplicable) {
    cards.push({
      id: "account",
      severity: accountSeverity,
      titleKey: "topbar.diagnostics.domain.account.title",
      detailKey: accountProbeUnconfigured
        ? "topbar.diagnostics.domain.account.notConfigured"
        : `topbar.diagnostics.domain.account.${accountSeverity}`,
    });
  }
  cards.push(
    {
      id: "updates",
      severity: updateSeverity,
      titleKey: "topbar.diagnostics.domain.updates.title",
      detailKey: `topbar.diagnostics.domain.updates.${updateSeverity}`,
    },
    {
      id: "observability",
      severity: observabilitySeverity,
      titleKey: "topbar.diagnostics.domain.observability.title",
      detailKey: `topbar.diagnostics.domain.observability.${observabilitySeverity}`,
    },
    {
      id: "proxy",
      severity: proxySeverity,
      titleKey: "topbar.diagnostics.domain.proxy.title",
      detailKey: snapshot2?.tunDetected
        ? "topbar.diagnostics.domain.proxy.tun"
        : snapshot2?.proxyDetected
          ? "topbar.diagnostics.domain.proxy.detected"
          : "topbar.diagnostics.domain.proxy.ok",
    },
  );
  return cards;
}
function buildDiagnosticsStatusCards(status, t2) {
  const localServiceState = statusOrUnknown(status?.runtime?.gateway?.state, "unknown");
  const assistantServiceState = statusOrUnknown(status?.runtime?.opencode?.state, "unknown");
  const toolServiceState = statusOrUnknown(status?.runtime?.mcp?.state, "unknown");
  const installMarker = statusOrUnknown(status?.updater?.installMarker, "unknown");
  const staleInstallMarker = statusOrUnknown(status?.updater?.staleInstallMarker, "unknown");
  const memoryPressure = statusOrUnknown(status?.memory?.pressure, "unknown");
  const integrityState = statusOrUnknown(status?.resourceIntegrity?.state, "unknown");
  const integrityNotApplicable = isIntegrityNotApplicable(status?.resourceIntegrity);
  return [
    {
      id: "runtime",
      severity: strongestSeverity([
        readinessSeverity(localServiceState),
        readinessSeverity(assistantServiceState),
        readinessSeverity(toolServiceState),
      ]),
      titleKey: "topbar.diagnostics.status.runtime.title",
      detail: buildRuntimeDetail(t2, localServiceState, assistantServiceState, toolServiceState),
    },
    {
      id: "updater",
      severity: strongestSeverity([
        markerSeverity(installMarker),
        markerSeverity(staleInstallMarker),
      ]),
      titleKey: "topbar.diagnostics.status.updater.title",
      detail: buildUpdaterDetail(t2, status, installMarker, staleInstallMarker),
    },
    {
      id: "memory",
      severity: memorySeverity(memoryPressure),
      titleKey: "topbar.diagnostics.status.memory.title",
      detail: buildMemoryDetail(t2, memoryPressure, status?.memory),
    },
    {
      id: "integrity",
      severity: integrityNotApplicable ? "ok" : integritySeverity(integrityState),
      titleKey: "topbar.diagnostics.status.integrity.title",
      detail: integrityNotApplicable
        ? t2("topbar.diagnostics.status.integrity.detail.notApplicable")
        : buildIntegrityDetail(t2, integrityState),
    },
  ];
}
function worstDiagnosticsStatusCardSeverity(cards) {
  if (cards.some((card) => card.severity === "error")) return "error";
  if (cards.some((card) => card.severity === "warning")) return "warning";
  return "ok";
}
function buildDiagnosticsAttentionProbes(probes, t2) {
  return (probes ?? [])
    .filter(
      (probe) =>
        !LEGACY_UNUSED_PROBE_TARGETS.has(probe.target) &&
        (probe.status === "failed" || probe.status === "warning"),
    )
    .map((probe) => ({
      target: probe.target,
      displayLabelKey: diagnosticsProbeLabelKey(probe.target),
      severity: probeAttentionSeverity(probe.status),
      meta: buildAttentionProbeMeta(probe, t2),
    }));
}
function summarizeDiagnosticsOverall(input) {
  if (input.error) {
    return {
      severity: "warning",
      triggerSeverity: "warning",
      titleKey: "topbar.diagnostics.summary.serviceUnavailableTitle",
      detailKey: "topbar.diagnostics.summary.serviceUnavailableDetail",
    };
  }
  if (!input.snapshot) {
    return {
      severity: "ok",
      triggerSeverity: "pending",
      titleKey: "topbar.diagnostics.summary.serviceUnavailableTitle",
      detailKey: "topbar.diagnostics.summary.serviceUnavailableDetail",
    };
  }
  if (
    input.snapshot.recommendations.some(
      (recommendation) => recommendation.code === "windows_version_unverified",
    )
  ) {
    return {
      severity: "error",
      triggerSeverity: "error",
      titleKey: "topbar.diagnostics.summary.windowsVersionUnverifiedTitle",
      detailKey: "topbar.diagnostics.summary.windowsVersionUnverifiedDetail",
    };
  }
  if (
    input.snapshot.recommendations.some(
      (recommendation) => recommendation.code === "windows_version_unsupported",
    )
  ) {
    return {
      severity: "error",
      triggerSeverity: "error",
      titleKey: "topbar.diagnostics.summary.windowsVersionUnsupportedTitle",
      detailKey: "topbar.diagnostics.summary.windowsVersionUnsupportedDetail",
    };
  }
  if (
    input.snapshot.recommendations.some(
      (recommendation) => recommendation.code === "windows_cpu_unsupported",
    )
  ) {
    return {
      severity: "error",
      triggerSeverity: "error",
      titleKey: "topbar.diagnostics.summary.windowsCpuUnsupportedTitle",
      detailKey: "topbar.diagnostics.summary.windowsCpuUnsupportedDetail",
    };
  }
  if (input.snapshot.overall === "error") {
    return {
      severity: "error",
      triggerSeverity: "error",
      titleKey: "topbar.diagnostics.summary.errorTitle",
      detailKey: "topbar.diagnostics.summary.errorDetail",
    };
  }
  if (input.snapshot.overall === "warning") {
    return {
      severity: "warning",
      triggerSeverity: "warning",
      titleKey: "topbar.diagnostics.summary.warningTitle",
      detailKey:
        input.failedProbeCount > 0
          ? "topbar.diagnostics.summary.warningFailedDetail"
          : "topbar.diagnostics.summary.warningDetail",
    };
  }
  if (input.statusSeverity === "error" || input.statusSeverity === "warning") {
    return {
      severity: "warning",
      triggerSeverity: "warning",
      titleKey: "topbar.diagnostics.summary.statusAttentionTitle",
      detailKey: "topbar.diagnostics.summary.statusAttentionDetail",
    };
  }
  return {
    severity: "ok",
    triggerSeverity: "ok",
    titleKey: "topbar.diagnostics.summary.okTitle",
    detailKey: "topbar.diagnostics.summary.okDetail",
  };
}
function pickWorstSeverity(probes, targets, failedSeverity) {
  if (!probes) return "ok";
  const matched = probes.filter((probe) => targets.includes(probe.target));
  if (matched.length === 0) return "warning";
  if (matched.some((probe) => probe.status === "failed")) return failedSeverity;
  if (matched.some((probe) => probe.status === "warning")) return "warning";
  if (matched.every((probe) => probe.status === "skipped")) return "warning";
  return "ok";
}
function statusOrUnknown(value, fallback) {
  return value ?? fallback;
}
function readinessLabel(t2, state2) {
  return t2(`topbar.diagnostics.readiness.${state2}`);
}
function finiteNumberText(value) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : void 0;
}
function buildRuntimeDetail(t2, localServiceState, assistantServiceState, toolServiceState) {
  return t2("topbar.diagnostics.status.runtime.detail", {
    localService: readinessLabel(t2, localServiceState),
    agentService: readinessLabel(t2, assistantServiceState),
    toolService: readinessLabel(t2, toolServiceState),
  });
}
function buildUpdaterDetail(t2, status, installMarker, staleInstallMarker) {
  if (!status || installMarker === "unknown" || staleInstallMarker === "unknown") {
    return t2("topbar.diagnostics.status.updater.detail.unknown");
  }
  if (installMarker === "present" || staleInstallMarker === "present") {
    return status.updater.manualRecoveryRecommended
      ? t2("topbar.diagnostics.status.updater.detail.recovery")
      : t2("topbar.diagnostics.status.updater.detail.pending");
  }
  return t2("topbar.diagnostics.status.updater.detail.ok");
}
function buildMemoryDetail(t2, pressure, memory) {
  const usage = finiteNumberText(memory?.appTotalMemMB) ?? finiteNumberText(memory?.mainRssMB);
  const available = finiteNumberText(memory?.availableMemMB);
  if (pressure === "low" && available) {
    return t2(
      usage
        ? "topbar.diagnostics.status.memory.detail.low.withAvailableAndUsage"
        : "topbar.diagnostics.status.memory.detail.low.withAvailable",
      {
        available,
        usage,
      },
    );
  }
  const detailKey = usage
    ? `topbar.diagnostics.status.memory.detail.${pressure}.withUsage`
    : `topbar.diagnostics.status.memory.detail.${pressure}`;
  return t2(detailKey, {
    usage,
  });
}
const INTEGRITY_NOT_APPLICABLE_REASONS = new Set(["unsupported_platform", "not_packaged"]);
function isIntegrityNotApplicable(integrity) {
  return (
    integrity?.state === "unknown" &&
    integrity.checked === false &&
    integrity.reason !== void 0 &&
    INTEGRITY_NOT_APPLICABLE_REASONS.has(integrity.reason)
  );
}
function buildIntegrityDetail(t2, state2) {
  return t2(`topbar.diagnostics.status.integrity.detail.${state2}`);
}
function readinessSeverity(state2) {
  if (state2 === "not_ready") return "error";
  if (state2 === "degraded") return "warning";
  if (state2 === "unknown") return "pending";
  return "ok";
}
function markerSeverity(state2) {
  if (state2 === "present") return "warning";
  if (state2 === "unknown") return "pending";
  return "ok";
}
function memorySeverity(pressure) {
  if (pressure === "low") return "warning";
  if (pressure === "unknown") return "pending";
  return "ok";
}
function integritySeverity(state2) {
  if (state2 === "error") return "error";
  if (state2 === "warning") return "warning";
  if (state2 === "unknown") return "pending";
  return "ok";
}
function strongestSeverity(severities) {
  if (severities.includes("error")) return "error";
  if (severities.includes("warning")) return "warning";
  if (severities.includes("pending")) return "pending";
  return "ok";
}
function probeAttentionSeverity(status) {
  if (status === "failed") return "error";
  if (status === "warning") return "warning";
  return "ok";
}
function buildAttentionProbeMeta(probe, t2) {
  const meta2 = [t2(diagnosticsProbeStatusKey(probe.status))];
  const hasHttpStatus = typeof probe.httpStatus === "number" && probe.httpStatus > 0;
  if (probe.failureKind && !(probe.failureKind === "http" && hasHttpStatus)) {
    meta2.push(t2(diagnosticsFailureKindKey(probe.failureKind)));
  }
  if (hasHttpStatus) {
    meta2.push(
      t2("topbar.diagnostics.failureDetails.httpStatus", {
        status: probe.httpStatus,
      }),
    );
  }
  if (typeof probe.durationMs === "number" && Number.isFinite(probe.durationMs)) {
    meta2.push(
      t2("topbar.diagnostics.failureDetails.duration", {
        duration: Math.round(probe.durationMs),
      }),
    );
  }
  return meta2;
}
const PROXY_MODES = ["auto", "direct", "system"];
function canProbeWorkspaceRuntime(currentWorkspaceId, status) {
  if (!currentWorkspaceId || status?.workspaceId !== currentWorkspaceId) return false;
  return isGatewayReady(status.state) || status.state === "failed" || status.state === "stopped";
}
function severityClass(severity) {
  if (severity === "error") return "text-destructive";
  if (severity === "warning") return "text-warning";
  return "text-muted-foreground";
}
function statusDotClass(severity) {
  if (severity === "error") return "bg-destructive";
  if (severity === "warning") return "bg-warning";
  if (severity === "pending") return "bg-muted-foreground/50";
  return "bg-success";
}
function domainSurfaceClass(severity) {
  if (severity === "error") return "bg-destructive/8 text-destructive";
  if (severity === "warning") return "bg-warning/10 text-warning";
  return "bg-muted text-muted-foreground";
}
function statusIcon(severity) {
  if (severity === "error") return <WifiOffIcon size={15} strokeWidth={1.75} />;
  return <WifiIcon size={15} strokeWidth={1.75} />;
}
function headerStatusIcon(severity) {
  if (severity === "error") return <WifiOffIcon size={18} strokeWidth={1.5} />;
  return <WifiIcon size={18} strokeWidth={1.5} />;
}
function statusCardIcon(id2) {
  if (id2 === "runtime") return <ServerIcon size={14} />;
  if (id2 === "updater") return <DownloadIcon size={14} />;
  if (id2 === "memory") return <ActivityIcon size={14} />;
  return <ShieldCheckIcon size={14} />;
}
function domainCardIcon(id2) {
  if (id2 === "local") return <ServerIcon size={14} />;
  if (id2 === "cloud") return <CloudIcon size={14} />;
  if (id2 === "account") return <UsersIcon size={14} />;
  if (id2 === "updates") return <DownloadIcon size={14} />;
  if (id2 === "observability") return <ActivityIcon size={14} />;
  return <ShieldCheckIcon size={14} />;
}
export function DiagnosticsStatusButton({ mockSeverity, surface = "topbar" } = {}) {
  const { t: t2 } = useTranslation();
  const { activeRuntime, currentWorkspaceId } = useTopbarState();
  const appGatewayReadiness = useGatewayReadiness();
  const activeGatewayScope =
    currentWorkspaceId && activeRuntime?.workspaceId === currentWorkspaceId
      ? (activeRuntime.gatewayBinding?.generation ?? activeRuntime.gatewayUrl)
      : void 0;
  const bundleStatus = useBundleStatus(currentWorkspaceId ?? void 0, activeGatewayScope, {
    enabled: currentWorkspaceId !== null,
  });
  const workspaceRuntime =
    currentWorkspaceId && activeRuntime?.workspaceId === currentWorkspaceId ? activeRuntime : null;
  const homeGatewaySettled =
    appGatewayReadiness?.state === "ready" || appGatewayReadiness?.state === "failed";
  const diagnosticsEnabled =
    currentWorkspaceId === null
      ? homeGatewaySettled
      : workspaceRuntime !== null && canProbeWorkspaceRuntime(currentWorkspaceId, bundleStatus);
  const live = useNetworkDiagnostics({
    enabled: diagnosticsEnabled,
    gatewayUrl: workspaceRuntime?.gatewayUrl,
    workspaceClaim: workspaceRuntime?.workspaceClaim,
    workspaceBinding: workspaceRuntime?.gatewayBinding,
  });
  const { proxyMode, loading, refresh, setProxyMode } = live;
  const snapshot2 = mockSeverity
    ? mockSeverity === "pending"
      ? null
      : {
          ...(live.snapshot ?? {
            generatedAt: new Date(0).toISOString(),
            release: {
              region: "domestic",
              channel: "dev",
            },
            online: true,
            proxyMode: "auto",
            proxyDetected: false,
            proxyRaw: "",
            tunDetected: false,
            tunInterfaces: [],
            probes: [],
            recommendations: [],
          }),
          overall: mockSeverity,
        }
    : diagnosticsEnabled
      ? live.snapshot
      : null;
  const error = mockSeverity || !diagnosticsEnabled ? null : live.error;
  const [open, setOpen] = reactExports.useState(false);
  const [proxyUpdating, setProxyUpdating] = reactExports.useState(false);
  const triggerLabel = t2("topbar.diagnostics.title");
  reactExports.useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);
  const failedProbeCount = reactExports.useMemo(
    () => snapshot2?.probes.filter((probe) => probe.status === "failed").length ?? 0,
    [snapshot2],
  );
  const statusCards = reactExports.useMemo(
    () =>
      buildDiagnosticsStatusCards(snapshot2?.status, (key2, options) => String(t2(key2, options))),
    [snapshot2?.status, t2],
  );
  const summary = reactExports.useMemo(
    () =>
      summarizeDiagnosticsOverall({
        snapshot: snapshot2,
        error,
        failedProbeCount,
        statusSeverity: worstDiagnosticsStatusCardSeverity(statusCards),
      }),
    [error, failedProbeCount, snapshot2, statusCards],
  );
  const domainCards = reactExports.useMemo(
    () => buildDiagnosticsDomainCards(snapshot2),
    [snapshot2],
  );
  const attentionProbes = reactExports.useMemo(
    () =>
      buildDiagnosticsAttentionProbes(snapshot2?.probes, (key2, options) =>
        String(t2(key2, options)),
      ),
    [snapshot2?.probes, t2],
  );
  const triggerText =
    snapshot2 || error
      ? t2(`topbar.diagnostics.trigger.${summary.severity}`)
      : t2("topbar.diagnostics.trigger.pending");
  const showTrigger =
    surface === "chat" ||
    (summary.triggerSeverity !== "ok" && summary.triggerSeverity !== "pending");
  if (!showTrigger) return null;
  const handleCopy = async () => {
    if (!snapshot2) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot2, null, 2));
      dedupedToast.success(t2("topbar.diagnostics.copySuccess"));
    } catch {
      dedupedToast.error(t2("topbar.diagnostics.copyFailed"));
    }
  };
  const handleExport = async () => {
    const result = await window.hilo?.diagnostics?.exportLogs?.();
    if (result?.success) dedupedToast.success(t2("topbar.diagnostics.exportSuccess"));
    else if (!result?.cancelled)
      dedupedToast.error(result?.error ?? t2("topbar.diagnostics.exportFailed"));
  };
  const handleUpload = async () => {
    const result = await window.hilo?.diagnostics?.uploadLogs?.("manual", {
      source: "topbar_status_diagnostics",
      snapshot: snapshot2,
    });
    if (result?.success) dedupedToast.success(t2("topbar.diagnostics.uploadSuccess"));
    else dedupedToast.error(result?.error ?? t2("topbar.diagnostics.uploadFailed"));
  };
  const handleOpenLogs = async () => {
    try {
      await window.hilo?.diagnostics?.openLogDir?.();
    } catch {
      dedupedToast.error(t2("topbar.diagnostics.openLogsFailed"));
    }
  };
  const handleProxyModeChange = async (value) => {
    if (!value || !PROXY_MODES.includes(value)) return;
    setProxyUpdating(true);
    try {
      const ok2 = await setProxyMode(value);
      if (ok2) dedupedToast.success(t2("topbar.diagnostics.proxyModeSaved"));
      else dedupedToast.error(t2("topbar.diagnostics.proxyModeFailed"));
    } finally {
      setProxyUpdating(false);
    }
  };
  const handleRecommendationAction = async (mode2) => {
    setProxyUpdating(true);
    try {
      const ok2 = await setProxyMode(mode2);
      if (ok2) dedupedToast.success(t2("topbar.diagnostics.proxyModeSaved"));
      else dedupedToast.error(t2("topbar.diagnostics.proxyModeFailed"));
    } finally {
      setProxyUpdating(false);
    }
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <button
                  type="button"
                  aria-label={`${triggerLabel}: ${triggerText}`}
                  className={cn$2(
                    "relative flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                    surface === "chat"
                      ? "icon-muted-control size-7 rounded-md text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground data-[popup-open]:bg-foreground/[0.06] data-[popup-open]:text-foreground"
                      : "icon-topbar-control my-1 mx-0.5 h-8 w-8 rounded-[10px] text-[var(--topbar-icon-fg)] hover:bg-[var(--topbar-tab-inactive-bg-hover)] hover:text-[var(--topbar-icon-fg-hover)] data-[popup-open]:bg-[var(--topbar-tab-inactive-bg-hover)] data-[popup-open]:text-[var(--topbar-icon-fg-hover)]",
                  )}
                  data-action-ui-id="topbar.diagnostics-trigger"
                  data-surface={surface}
                />
              }
            />
          }
        >
          <MonochromeIcon tone="control">{statusIcon(summary.severity)}</MonochromeIcon>
          {summary.triggerSeverity !== "ok" && (
            <span
              className={cn$2(
                "absolute right-1 top-1 size-1.5 rounded-full ring-1",
                surface === "chat" ? "ring-card" : "ring-[var(--topbar-bg)]",
                statusDotClass(summary.triggerSeverity),
              )}
            />
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom">{`${triggerLabel}: ${triggerText}`}</TooltipContent>
      </Tooltip>
      <PopoverContent
        motion="none"
        align={surface === "chat" ? "end" : "start"}
        className="max-h-[calc(100vh-48px)] w-[420px] gap-0 overflow-y-auto p-0 shadow-xl select-none"
        data-action-ui-id="topbar.diagnostics-popover"
      >
        <div className="border-b border-border/70 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className={cn$2(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg",
                    domainSurfaceClass(summary.severity),
                  )}
                >
                  {headerStatusIcon(summary.severity)}
                </div>
                <div>
                  <div className="text-sm font-medium">{t2(summary.titleKey)}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {t2(summary.detailKey, {
                      count: failedProbeCount,
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div
              className={cn$2(
                "flex shrink-0 items-center gap-1 text-[11px]",
                severityClass(summary.severity),
              )}
            >
              {summary.severity === "ok" ? (
                <CheckCircle2Icon size={14} />
              ) : (
                <AlertTriangleIcon size={14} />
              )}
              {t2(`topbar.diagnostics.overall.${summary.severity}`)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-b border-border/70 px-4 py-3">
          <Button$1
            variant="default"
            size="xs"
            onClick={() => void refresh()}
            disabled={loading}
            data-action-ui-id="topbar.diagnostics.refresh"
          >
            <RetryIcon size={14} className={loading ? "animate-spin" : void 0} />
            {t2("topbar.diagnostics.refresh")}
          </Button$1>
          <Button$1
            variant="outline"
            size="xs"
            onClick={() => void handleUpload()}
            disabled={!window.hilo?.diagnostics?.uploadLogs}
            data-action-ui-id="topbar.diagnostics.upload"
          >
            <UploadIcon$1 className="size-3.5" />
            {t2("topbar.diagnostics.upload")}
          </Button$1>
          <Button$1
            variant="outline"
            size="xs"
            onClick={() => void handleExport()}
            disabled={!window.hilo?.diagnostics?.exportLogs}
            data-action-ui-id="topbar.diagnostics.export"
          >
            <FolderOpenIcon className="size-3.5" />
            {t2("topbar.diagnostics.export")}
          </Button$1>
          <Button$1
            variant="outline"
            size="xs"
            onClick={() => void handleCopy()}
            disabled={!snapshot2}
            data-action-ui-id="topbar.diagnostics.copy"
          >
            <ClipboardIcon className="size-3.5" />
            {t2("topbar.diagnostics.copy")}
          </Button$1>
        </div>
        <div className="border-b border-border/70 px-4 py-3">
          <div className="mb-2 text-[12px] font-medium">
            {t2("topbar.diagnostics.statusSection")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {statusCards.map((card) => (
              <div
                key={card.id}
                className="rounded-lg bg-muted/50 px-3 py-2"
                data-action-ui-id={`topbar.diagnostics.status-${card.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium">
                    <span
                      className={
                        card.severity === "pending"
                          ? "text-muted-foreground"
                          : severityClass(card.severity)
                      }
                    >
                      {statusCardIcon(card.id)}
                    </span>
                    <span className="truncate">{t2(card.titleKey)}</span>
                  </div>
                  <span
                    className={cn$2(
                      "size-1.5 shrink-0 rounded-full",
                      statusDotClass(card.severity),
                    )}
                  />
                </div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {card.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-b border-border/70 px-4 py-3">
          <div className="mb-2 text-[12px] font-medium">
            {t2("topbar.diagnostics.networkSection")}
          </div>
          <div className="mb-2 grid grid-cols-2 gap-2">
            {domainCards.map((card) => (
              <div
                key={card.id}
                className="rounded-lg bg-muted/50 px-3 py-2"
                data-action-ui-id={`topbar.diagnostics.domain-${card.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium">
                    <span className={severityClass(card.severity)}>{domainCardIcon(card.id)}</span>
                    <span className="truncate">{t2(card.titleKey)}</span>
                  </div>
                  <span
                    className={cn$2(
                      "size-1.5 shrink-0 rounded-full",
                      statusDotClass(card.severity),
                    )}
                  />
                </div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {t2(card.detailKey)}
                </div>
              </div>
            ))}
          </div>
          {attentionProbes.length > 0 ? (
            <div
              className="mt-3 rounded-lg bg-muted/40 px-3 py-2"
              data-action-ui-id="topbar.diagnostics.probe-details"
            >
              <div className="mb-1.5 text-[12px] font-medium">
                {t2("topbar.diagnostics.failureDetails.title")}
              </div>
              <div className="space-y-1.5">
                {attentionProbes.map(({ target, displayLabelKey, severity, meta: meta2 }) => (
                  <div
                    key={target}
                    className="flex items-start justify-between gap-3"
                    data-action-ui-id={`topbar.diagnostics.probe-${target}`}
                  >
                    <div className="min-w-0 text-[11px] font-medium">{t2(displayLabelKey)}</div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      {meta2.map((item) => (
                        <span
                          key={item}
                          className={cn$2(
                            "rounded-sm bg-background/70 px-1.5 py-0.5 text-[10px] leading-none",
                            severityClass(severity),
                          )}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
            <div className="min-w-0">
              <div className="text-[12px] font-medium">{t2("topbar.diagnostics.proxyMode")}</div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                {t2("topbar.diagnostics.proxyModeHint")}
              </div>
            </div>
            <Select$1
              value={proxyMode}
              onValueChange={handleProxyModeChange}
              disabled={proxyUpdating}
            >
              <SelectTrigger
                size="sm"
                className="w-30 shrink-0"
                data-action-ui-id="topbar.diagnostics.proxy-mode"
              >
                <SelectValue>{() => t2(`topbar.diagnostics.proxyMode.${proxyMode}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {PROXY_MODES.map((mode2) => (
                  <SelectItem key={mode2} value={mode2}>
                    {t2(`topbar.diagnostics.proxyMode.${mode2}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select$1>
          </div>
        </div>
        {error && (
          <div
            className="border-b border-border/70 px-4 py-3"
            data-action-ui-id="topbar.diagnostics-error"
          >
            <div className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-warning">
              <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-[12px] font-medium">
                  {t2("topbar.diagnostics.serviceUnavailableTitle")}
                </div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {t2("topbar.diagnostics.serviceUnavailableDetail")}
                </div>
              </div>
            </div>
          </div>
        )}
        {snapshot2?.recommendations.length ? (
          <div className="px-4 py-3">
            <div className="mb-1.5 text-[12px] font-medium">
              {t2("topbar.diagnostics.recommendations")}
            </div>
            <ul className="space-y-1 text-[11px] leading-relaxed text-muted-foreground">
              {snapshot2.recommendations.map((item) => {
                const actionMode = proxyModeForDiagnosticsRecommendation(item.code);
                return (
                  <li key={item.code} className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      {"• "}
                      {t2(diagnosticsRecommendationKey(item.code))}
                    </span>
                    {actionMode ? (
                      <Button$1
                        variant="outline"
                        size="xs"
                        className="shrink-0"
                        loading={proxyUpdating}
                        disabled={proxyUpdating}
                        onClick={() => void handleRecommendationAction(actionMode)}
                        data-action-ui-id={`topbar.diagnostics.recommendation-${actionMode}`}
                      >
                        {t2(`topbar.diagnostics.recommendation.action.${actionMode}`)}
                      </Button$1>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <Button$1
              variant="ghost"
              size="xs"
              className="mt-2 px-0 text-muted-foreground"
              onClick={() => void handleOpenLogs()}
              disabled={!window.hilo?.diagnostics?.openLogDir}
              data-action-ui-id="topbar.diagnostics.open-logs"
            >
              <LocalFolderIcon className="size-3.5" />
              {t2("topbar.diagnostics.openLogs")}
            </Button$1>
          </div>
        ) : (
          <div className="px-4 py-3">
            <Button$1
              variant="ghost"
              size="xs"
              className="px-0 text-muted-foreground"
              onClick={() => void handleOpenLogs()}
              disabled={!window.hilo?.diagnostics?.openLogDir}
              data-action-ui-id="topbar.diagnostics.open-logs"
            >
              <LocalFolderIcon className="size-3.5" />
              {t2("topbar.diagnostics.openLogs")}
            </Button$1>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
export function SearchButton({ onClick, surface = "topbar", dataActionUiId }) {
  const { t: t2 } = useTranslation();
  const { app } = usePlatform();
  const shortcut = resolveShortcutDisplay("CommandOrControl+K", app.os);
  const sidebar = surface === "sidebar";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`${t2("topbar.search")} ${shortcut.text}`}
            data-action-ui-id={dataActionUiId}
            onClick={onClick}
            className={cn$2(
              "no-drag relative z-50 flex size-8 shrink-0 items-center justify-center rounded-[10px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
              sidebar
                ? "icon-muted-control text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground"
                : "icon-topbar-control mx-0.5 my-1 text-[var(--topbar-icon-fg)] hover:bg-[var(--topbar-tab-inactive-bg-hover)] hover:text-[var(--topbar-icon-fg-hover)]",
            )}
          />
        }
      >
        <MonochromeIcon tone="control">
          <Search size={sidebar ? 16 : 15} strokeWidth={sidebar ? 1.5 : 1.75} />
        </MonochromeIcon>
      </TooltipTrigger>
      <TooltipContent side={sidebar ? "right" : "bottom"}>
        {t2("topbar.search")}
        <ShortcutHint
          accelerator="CommandOrControl+K"
          os={app.os}
          variant="plain"
          className="ml-1.5 text-inherit opacity-50"
        />
      </TooltipContent>
    </Tooltip>
  );
}
export function pickLocale(lang) {
  return lang.startsWith("zh") ? "zh" : "en";
}
export const HOME_SIDEBAR_MIN_WIDTH = 220;
export const HOME_SIDEBAR_MAX_WIDTH = 360;
export const HOME_SIDEBAR_ICON_AXIS = 32;
export const HOME_NAV_ICON_SIZE = 18;
export const PROJECT_PREVIEW_ITEM_LIMIT = 6;
export const HOME_NEW_TASK_PLUS_SIZE = 16;
export const HOME_RECENT_SCROLL_BOTTOM_SAFE_AREA_CLASS = "pb-[54px]";
export const HOME_NAV_ICON_SLOT_CLASS = "flex size-6 shrink-0 items-center justify-center";
export const HOME_NAV_BUTTON_CLASS =
  "group flex h-[34px] w-full items-center text-[14px] leading-[14px] transition-colors duration-100 cursor-pointer";
export const HOME_NAV_PILL_CLASS =
  "home-sidebar-nav-pill relative isolate flex h-8 w-full items-center gap-2 rounded-md pr-1 after:pointer-events-none after:absolute after:inset-y-0 after:-z-10 after:rounded-md";
export const HOME_RAIL_PILL_CLASS = "home-sidebar-rail-pill";
export const HOME_NAV_HOVER_CLASS = "group-hover:after:bg-[var(--home-sidebar-nav-hover)]";
export const HOME_NAV_ACTIVE_CLASS = "after:bg-[var(--home-sidebar-nav-active)]";
export const HOME_NAV_INACTIVE_TEXT_CLASS =
  "text-[var(--home-sidebar-primary-text)] hover:text-foreground";
export const HOME_RAIL_TOOLTIP_DELAY_MS = 150;
export function resolveRecentProjectsGroupMode(value) {
  return value === "none" ? "none" : "project";
}
export function recentProjectDropPosition(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}
export function buildChangelogRows(locale) {
  return locale.items.map((item) => ({
    badge: locale.badge,
    version: item.version,
    date: item.date,
    subtitle: item.subtitle,
    changelog: item.changelog,
    featured: item.featured,
    id: item.version,
  }));
}
const HOME_RECENT_GROUP_ACTION_CLASS =
  "icon-sidebar-action-control flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:outline-none";
export function RecentProjectGroupHeader({
  project: project2,
  expanded,
  onToggle,
  ungroupedToggleKey,
  selected: selected2 = false,
  depth: depth2 = 0,
  onNewCreation,
  onOpenDetail,
  onRequestDelete,
  onNewCreationUngrouped,
  onOpenAllUngrouped,
  ungroupedSortMode,
  onUngroupedSortModeChange,
  holdPreviewOpen,
  releasePreviewHold,
  pinned = false,
  onTogglePin,
  draggable = false,
  dragging = false,
  dragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) {
  const { t: t2 } = useTranslation();
  const [contextMenuOpen, setContextMenuOpen] = reactExports.useState(false);
  const label = project2?.name ?? t2("project.ungrouped");
  const projectId = project2?.id;
  const FolderIcon = project2?.kind === "team" ? Users : expanded ? FolderOpen : Folder;
  const ChevronToggle = expanded ? ChevronDown : ChevronRight$1;
  const indentPx = 20 + depth2 * 16;
  reactExports.useEffect(() => {
    if (!contextMenuOpen || !projectId || !holdPreviewOpen || !releasePreviewHold) return;
    const token2 = `home-sidebar.recent-group-menu:${projectId}`;
    holdPreviewOpen(token2);
    return () => releasePreviewHold(token2);
  }, [contextMenuOpen, holdPreviewOpen, projectId, releasePreviewHold]);
  const handleToggle = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      if (projectId) onToggle(projectId);
    },
    [onToggle, projectId],
  );
  const handleRowClick = reactExports.useCallback(() => {
    if (projectId) onToggle(projectId);
    else if (ungroupedToggleKey) onToggle(ungroupedToggleKey);
  }, [onToggle, projectId, ungroupedToggleKey]);
  const headerClass = cn$2(
    "group relative isolate flex h-[32px] items-center gap-1 pr-1",
    dragging && "sidebar-drag-source",
    dragOver && `home-sidebar-recent-drag-over home-sidebar-recent-drag-over-${dragOver}`,
    project2
      ? "text-sm text-[var(--home-sidebar-secondary-text)]"
      : "text-[13px] text-[var(--home-sidebar-section-text)]",
    "before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:left-[calc(var(--hover-left)_-_6px)] before:-z-10 before:rounded-md",
    project2
      ? selected2
        ? "before:bg-[var(--home-sidebar-nav-active)] text-foreground"
        : "hover:before:bg-[var(--home-sidebar-nav-hover)]"
      : ungroupedToggleKey &&
          "hover:before:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground",
  );
  const header = (
    <div
      className={headerClass}
      style={{
        paddingLeft: indentPx,
        ["--hover-left"]: `${indentPx}px`,
      }}
      data-action-ui-id="home-sidebar.recent-group-header"
      data-project-id={projectId}
      data-drag-over-position={dragOver}
      data-selected={selected2 ? "true" : "false"}
    >
      {projectId ? (
        <button
          type="button"
          aria-label={expanded ? t2("project.collapse") : t2("project.expand")}
          aria-expanded={expanded}
          data-action-ui-id="home-sidebar.recent-group-toggle"
          className="icon-sidebar-action-control relative z-10 flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:outline-none"
          onClick={handleToggle}
        >
          <MonochromeIcon tone="control">
            <FolderIcon size={16} strokeWidth={1.5} aria-hidden="true" />
          </MonochromeIcon>
        </button>
      ) : null}
      {projectId ? (
        <button
          type="button"
          aria-label={label}
          data-action-ui-id="home-sidebar.recent-group-label"
          className="flex min-w-0 flex-1 items-center gap-1 cursor-pointer text-left group-hover:pr-14 group-has-[:focus-visible]:pr-14"
          onClick={handleRowClick}
        >
          <span className="min-w-0 truncate">{label}</span>
        </button>
      ) : ungroupedToggleKey ? (
        <button
          type="button"
          aria-label={label}
          data-action-ui-id="home-sidebar.recent-group-label"
          className="flex min-w-0 items-center gap-1 cursor-pointer text-left"
          onClick={handleRowClick}
        >
          <span className="min-w-0 truncate">{label}</span>
          <ChevronToggle size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <span className="min-w-0 truncate">{label}</span>
        </div>
      )}
      {!projectId && ungroupedToggleKey ? (
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {onOpenAllUngrouped ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={t2("home.viewAll")}
                      data-action-ui-id="home-sidebar.recent-group-ungrouped-view-all"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenAllUngrouped();
                      }}
                      className="icon-sidebar-action-control pointer-events-none relative z-10 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity duration-150 hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none group-hover:pointer-events-auto group-hover:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100"
                    >
                      <MonochromeIcon tone="control">
                        <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
                      </MonochromeIcon>
                    </button>
                  }
                />
                <TooltipContent side="top">{t2("home.viewAll")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
          {ungroupedSortMode && onUngroupedSortModeChange ? (
            <UngroupedSortMenu
              sortMode={ungroupedSortMode}
              onSortModeChange={onUngroupedSortModeChange}
              holdPreviewOpen={holdPreviewOpen}
              releasePreviewHold={releasePreviewHold}
            />
          ) : null}
          {onNewCreationUngrouped ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={t2("project.newCreation")}
                      data-action-ui-id="home-sidebar.recent-group-ungrouped-new-creation"
                      onClick={(event) => {
                        event.stopPropagation();
                        onNewCreationUngrouped();
                      }}
                      className="icon-sidebar-action-control pointer-events-none relative z-10 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity duration-150 hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none group-hover:pointer-events-auto group-hover:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100"
                    >
                      <MonochromeIcon tone="control">
                        <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
                      </MonochromeIcon>
                    </button>
                  }
                />
                <TooltipContent side="top">{t2("project.newCreation")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      ) : null}
      {project2 ? (
        <span
          className={cn$2(
            "pointer-events-none absolute inset-y-0 right-0.5 z-10 flex items-center gap-0.5 rounded-r-md px-1 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100",
          )}
          data-action-ui-id="home-sidebar.recent-group-actions"
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={t2("project.openDetail")}
                    data-action-ui-id="home-sidebar.recent-group-open-detail"
                    className={HOME_RECENT_GROUP_ACTION_CLASS}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenDetail(project2.id);
                    }}
                  />
                }
              >
                <MonochromeIcon tone="control">
                  <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
                </MonochromeIcon>
              </TooltipTrigger>
              <TooltipContent side="top">{t2("project.openDetail")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={t2("project.newCreation")}
                    data-action-ui-id="home-sidebar.recent-group-new-creation"
                    className={HOME_RECENT_GROUP_ACTION_CLASS}
                    onClick={(event) => {
                      event.stopPropagation();
                      onNewCreation(project2.id);
                    }}
                  />
                }
              >
                <MonochromeIcon tone="control">
                  <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
                </MonochromeIcon>
              </TooltipTrigger>
              <TooltipContent side="top">{t2("project.newCreation")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      ) : null}
    </div>
  );
  if (!project2) {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: drag-only drop zone; the header inside owns the click and menu affordances.
      <div role="presentation" onDragOver={onDragOver} onDrop={onDrop}>
        {header}
      </div>
    );
  }
  return (
    <ContextMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
      <ContextMenuTrigger
        render={
          // biome-ignore lint/a11y/noStaticElementInteractions: drag-only wrapper; the header inside owns the click and menu affordances.
          <div
            role="presentation"
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            {header}
          </div>
        }
      />
      <ContextMenuContent
        data-action-ui-id="home-sidebar.recent-group-menu"
        data-global-sidebar-hover-region="true"
      >
        <ContextMenuItem onClick={() => onNewCreation(project2.id)}>
          <StrokeIcon icon={Plus} size={14} />
          {t2("project.newCreation")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onOpenDetail(project2.id)}>
          <StrokeIcon icon={ArrowUpRight} size={14} />
          {t2("project.openDetail")}
        </ContextMenuItem>
        {onTogglePin ? (
          <ContextMenuItem onClick={onTogglePin}>
            <StrokeIcon icon={Pin} size={14} />
            {pinned ? t2("session.unpin") : t2("session.pin")}
          </ContextMenuItem>
        ) : null}
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          data-action-ui-id="home-sidebar.recent-group-delete"
          onClick={() => {
            setContextMenuOpen(false);
            onRequestDelete(project2);
          }}
        >
          <StrokeIcon icon={Trash2} size={14} />
          {t2("project.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
