// diagnostics-status-button.jsx
import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClipboardIcon,
  CloudIcon,
  dedupedToast,
  DownloadIcon,
  FolderOpenIcon,
  MonochromeIcon,
  reactExports,
  ServerIcon,
  ShieldCheckIcon,
  UploadIcon$1 as UploadIcon,
  UsersIcon,
  useTranslation,
  WifiIcon,
  WifiOffIcon,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { isGatewayReady } from "../media-editing/derive-session-task-snapshot.jsx";
import {
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { useNetworkDiagnostics } from "./use-network-diagnostics.js";
import { Popover, Select } from "../assets/credit-query-keys.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { useTopbarState } from "../workspace/topbar-state-context.jsx";
import {
  Button,
  cn$2 as cn,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
import { LocalFolderIcon } from "../workspace/home-service.jsx";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../infra/select-content.jsx";
import { useBundleStatus } from "../media-editing/use-bundle-status.js";
import { useGatewayReadiness } from "../infra/inline-rename-input.jsx";
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
function worstDiagnosticsStatusCardSeverity(cards) {
  if (cards.some((card) => card.severity === "error")) return "error";
  if (cards.some((card) => card.severity === "warning")) return "warning";
  return "ok";
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
function buildDiagnosticsDomainCards(snapshot2) {
  const localSeverity = pickWorstSeverity(
    snapshot2?.probes,
    LOCAL_TARGETS,
    "error",
  );
  const cloudSeverity = pickWorstSeverity(
    snapshot2?.probes,
    CLOUD_TARGETS,
    "error",
  );
  const accountProbes =
    snapshot2?.probes.filter((probe) => probe.target === "team_account_api") ??
    [];
  const hasAccountProbe = accountProbes.length > 0;
  const accountProbeUnconfigured =
    hasAccountProbe &&
    accountProbes.every((probe) => probe.status === "skipped");
  const accountProbeNotApplicable =
    accountProbeUnconfigured && snapshot2?.release.channel === "staging";
  const accountSeverity = pickWorstSeverity(
    snapshot2?.probes,
    ACCOUNT_TARGETS,
    "error",
  );
  const updateSeverity = pickWorstSeverity(
    snapshot2?.probes,
    UPDATE_TARGETS,
    "warning",
  );
  const observabilitySeverity = pickWorstSeverity(
    snapshot2?.probes,
    OBSERVABILITY_TARGETS,
    "warning",
  );
  const proxyRecommendation = snapshot2?.recommendations.find(
    (recommendation) => PROXY_RECOMMENDATION_CODES.has(recommendation.code),
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
function statusOrUnknown(value, fallback) {
  return value ?? fallback;
}
function readinessLabel(t2, state2) {
  return t2(`topbar.diagnostics.readiness.${state2}`);
}
function finiteNumberText(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : void 0;
}
function buildRuntimeDetail(
  t2,
  localServiceState,
  assistantServiceState,
  toolServiceState,
) {
  return t2("topbar.diagnostics.status.runtime.detail", {
    localService: readinessLabel(t2, localServiceState),
    agentService: readinessLabel(t2, assistantServiceState),
    toolService: readinessLabel(t2, toolServiceState),
  });
}
function buildUpdaterDetail(t2, status, installMarker, staleInstallMarker) {
  if (
    !status ||
    installMarker === "unknown" ||
    staleInstallMarker === "unknown"
  ) {
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
  const usage =
    finiteNumberText(memory?.appTotalMemMB) ??
    finiteNumberText(memory?.mainRssMB);
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
const INTEGRITY_NOT_APPLICABLE_REASONS = new Set([
  "unsupported_platform",
  "not_packaged",
]);
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
function buildDiagnosticsStatusCards(status, t2) {
  const localServiceState = statusOrUnknown(
    status?.runtime?.gateway?.state,
    "unknown",
  );
  const assistantServiceState = statusOrUnknown(
    status?.runtime?.opencode?.state,
    "unknown",
  );
  const toolServiceState = statusOrUnknown(
    status?.runtime?.mcp?.state,
    "unknown",
  );
  const installMarker = statusOrUnknown(
    status?.updater?.installMarker,
    "unknown",
  );
  const staleInstallMarker = statusOrUnknown(
    status?.updater?.staleInstallMarker,
    "unknown",
  );
  const memoryPressure = statusOrUnknown(status?.memory?.pressure, "unknown");
  const integrityState = statusOrUnknown(
    status?.resourceIntegrity?.state,
    "unknown",
  );
  const integrityNotApplicable = isIntegrityNotApplicable(
    status?.resourceIntegrity,
  );
  return [
    {
      id: "runtime",
      severity: strongestSeverity([
        readinessSeverity(localServiceState),
        readinessSeverity(assistantServiceState),
        readinessSeverity(toolServiceState),
      ]),
      titleKey: "topbar.diagnostics.status.runtime.title",
      detail: buildRuntimeDetail(
        t2,
        localServiceState,
        assistantServiceState,
        toolServiceState,
      ),
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
      severity: integrityNotApplicable
        ? "ok"
        : integritySeverity(integrityState),
      titleKey: "topbar.diagnostics.status.integrity.title",
      detail: integrityNotApplicable
        ? t2("topbar.diagnostics.status.integrity.detail.notApplicable")
        : buildIntegrityDetail(t2, integrityState),
    },
  ];
}
function probeAttentionSeverity(status) {
  if (status === "failed") return "error";
  if (status === "warning") return "warning";
  return "ok";
}
function buildAttentionProbeMeta(probe, t2) {
  const meta2 = [t2(diagnosticsProbeStatusKey(probe.status))];
  const hasHttpStatus =
    typeof probe.httpStatus === "number" && probe.httpStatus > 0;
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
  if (
    typeof probe.durationMs === "number" &&
    Number.isFinite(probe.durationMs)
  ) {
    meta2.push(
      t2("topbar.diagnostics.failureDetails.duration", {
        duration: Math.round(probe.durationMs),
      }),
    );
  }
  return meta2;
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
const PROXY_MODES = ["auto", "direct", "system"];
function canProbeWorkspaceRuntime(currentWorkspaceId, status) {
  if (!currentWorkspaceId || status?.workspaceId !== currentWorkspaceId)
    return false;
  return (
    isGatewayReady(status.state) ||
    status.state === "failed" ||
    status.state === "stopped"
  );
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
export function DiagnosticsStatusButton({
  mockSeverity,
  surface = "topbar",
} = {}) {
  const { t: t2 } = useTranslation();
  const { activeRuntime, currentWorkspaceId } = useTopbarState();
  const appGatewayReadiness = useGatewayReadiness();
  const activeGatewayScope =
    currentWorkspaceId && activeRuntime?.workspaceId === currentWorkspaceId
      ? (activeRuntime.gatewayBinding?.generation ?? activeRuntime.gatewayUrl)
      : void 0;
  const bundleStatus = useBundleStatus(
    currentWorkspaceId ?? void 0,
    activeGatewayScope,
    {
      enabled: currentWorkspaceId !== null,
    },
  );
  const workspaceRuntime =
    currentWorkspaceId && activeRuntime?.workspaceId === currentWorkspaceId
      ? activeRuntime
      : null;
  const homeGatewaySettled =
    appGatewayReadiness?.state === "ready" ||
    appGatewayReadiness?.state === "failed";
  const diagnosticsEnabled =
    currentWorkspaceId === null
      ? homeGatewaySettled
      : workspaceRuntime !== null &&
        canProbeWorkspaceRuntime(currentWorkspaceId, bundleStatus);
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
    () =>
      snapshot2?.probes.filter((probe) => probe.status === "failed").length ??
      0,
    [snapshot2],
  );
  const statusCards = reactExports.useMemo(
    () =>
      buildDiagnosticsStatusCards(snapshot2?.status, (key2, options) =>
        String(t2(key2, options)),
      ),
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
    if (result?.success)
      dedupedToast.success(t2("topbar.diagnostics.exportSuccess"));
    else if (!result?.cancelled)
      dedupedToast.error(
        result?.error ?? t2("topbar.diagnostics.exportFailed"),
      );
  };
  const handleUpload = async () => {
    const result = await window.hilo?.diagnostics?.uploadLogs?.("manual", {
      source: "topbar_status_diagnostics",
      snapshot: snapshot2,
    });
    if (result?.success)
      dedupedToast.success(t2("topbar.diagnostics.uploadSuccess"));
    else
      dedupedToast.error(
        result?.error ?? t2("topbar.diagnostics.uploadFailed"),
      );
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
                  className={cn(
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
          <MonochromeIcon tone="control">
            {statusIcon(summary.severity)}
          </MonochromeIcon>
          {summary.triggerSeverity !== "ok" && (
            <span
              className={cn(
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
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg",
                    domainSurfaceClass(summary.severity),
                  )}
                >
                  {headerStatusIcon(summary.severity)}
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {t2(summary.titleKey)}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {t2(summary.detailKey, {
                      count: failedProbeCount,
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div
              className={cn(
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
          <Button
            variant="default"
            size="xs"
            onClick={() => void refresh()}
            disabled={loading}
            data-action-ui-id="topbar.diagnostics.refresh"
          >
            <RetryIcon
              size={14}
              className={loading ? "animate-spin" : void 0}
            />
            {t2("topbar.diagnostics.refresh")}
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => void handleUpload()}
            disabled={!window.hilo?.diagnostics?.uploadLogs}
            data-action-ui-id="topbar.diagnostics.upload"
          >
            <UploadIcon className="size-3.5" />
            {t2("topbar.diagnostics.upload")}
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => void handleExport()}
            disabled={!window.hilo?.diagnostics?.exportLogs}
            data-action-ui-id="topbar.diagnostics.export"
          >
            <FolderOpenIcon className="size-3.5" />
            {t2("topbar.diagnostics.export")}
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => void handleCopy()}
            disabled={!snapshot2}
            data-action-ui-id="topbar.diagnostics.copy"
          >
            <ClipboardIcon className="size-3.5" />
            {t2("topbar.diagnostics.copy")}
          </Button>
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
                    className={cn(
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
                    <span className={severityClass(card.severity)}>
                      {domainCardIcon(card.id)}
                    </span>
                    <span className="truncate">{t2(card.titleKey)}</span>
                  </div>
                  <span
                    className={cn(
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
                {attentionProbes.map(
                  ({ target, displayLabelKey, severity, meta: meta2 }) => (
                    <div
                      key={target}
                      className="flex items-start justify-between gap-3"
                      data-action-ui-id={`topbar.diagnostics.probe-${target}`}
                    >
                      <div className="min-w-0 text-[11px] font-medium">
                        {t2(displayLabelKey)}
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        {meta2.map((item) => (
                          <span
                            key={item}
                            className={cn(
                              "rounded-sm bg-background/70 px-1.5 py-0.5 text-[10px] leading-none",
                              severityClass(severity),
                            )}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
            <div className="min-w-0">
              <div className="text-[12px] font-medium">
                {t2("topbar.diagnostics.proxyMode")}
              </div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                {t2("topbar.diagnostics.proxyModeHint")}
              </div>
            </div>
            <Select
              value={proxyMode}
              onValueChange={handleProxyModeChange}
              disabled={proxyUpdating}
            >
              <SelectTrigger
                size="sm"
                className="w-30 shrink-0"
                data-action-ui-id="topbar.diagnostics.proxy-mode"
              >
                <SelectValue>
                  {() => t2(`topbar.diagnostics.proxyMode.${proxyMode}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {PROXY_MODES.map((mode2) => (
                  <SelectItem key={mode2} value={mode2}>
                    {t2(`topbar.diagnostics.proxyMode.${mode2}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                const actionMode = proxyModeForDiagnosticsRecommendation(
                  item.code,
                );
                return (
                  <li
                    key={item.code}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="min-w-0">
                      {"• "}
                      {t2(diagnosticsRecommendationKey(item.code))}
                    </span>
                    {actionMode ? (
                      <Button
                        variant="outline"
                        size="xs"
                        className="shrink-0"
                        loading={proxyUpdating}
                        disabled={proxyUpdating}
                        onClick={() =>
                          void handleRecommendationAction(actionMode)
                        }
                        data-action-ui-id={`topbar.diagnostics.recommendation-${actionMode}`}
                      >
                        {t2(
                          `topbar.diagnostics.recommendation.action.${actionMode}`,
                        )}
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <Button
              variant="ghost"
              size="xs"
              className="mt-2 px-0 text-muted-foreground"
              onClick={() => void handleOpenLogs()}
              disabled={!window.hilo?.diagnostics?.openLogDir}
              data-action-ui-id="topbar.diagnostics.open-logs"
            >
              <LocalFolderIcon className="size-3.5" />
              {t2("topbar.diagnostics.openLogs")}
            </Button>
          </div>
        ) : (
          <div className="px-4 py-3">
            <Button
              variant="ghost"
              size="xs"
              className="px-0 text-muted-foreground"
              onClick={() => void handleOpenLogs()}
              disabled={!window.hilo?.diagnostics?.openLogDir}
              data-action-ui-id="topbar.diagnostics.open-logs"
            >
              <LocalFolderIcon className="size-3.5" />
              {t2("topbar.diagnostics.openLogs")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
