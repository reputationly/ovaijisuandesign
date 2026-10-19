// retained-workspace-runtime-host.jsx
import { entries } from "../assets/credit-query-keys.jsx";
import { HILO_WORKSPACE_GENERATION_QUERY, HILO_WORKSPACE_IDENTITY_QUERY, HILO_WORKSPACE_INSTANCE_QUERY } from "../infra/workspace-gateway.js";
import reactExports from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { resolveWorkspaceFailureDiagnosis } from "../canvas/resolve-workspace-failure-diagnosis.js";
import { Button } from "../infra/dialog-content.jsx";
import { RetryIcon } from "./use-prompt-icon.jsx";
import {
  shouldRefreshStatusOnResume,
  useRetryHintActive,
} from "../infra/use-retry-hint-active.js";
import {
  isGatewayReady,
  isReadyState,
  requestRecentWorkspacesRefresh,
} from "../media-editing/derive-session-task-snapshot.jsx";
import { workspaceRuntimeFromOpenResult } from "../vendor-inline/vscode-base/linked-list.js";
import { useWorkspaceStageLayout } from "./use-workspace-stage-layout.js";
import { WorkspaceRuntimeContent } from "./workspace-runtime-content.jsx";
import { GatewayScopeProvider } from "../assets/gateway-scope-provider.jsx";
import { buildWorkspaceSearch } from "./use-deep-link-router.js";
import { workspaceEvents } from "./topbar-state-context.jsx";
import { instantiationService } from "./home-service.jsx";
import { CanvasLoadingState } from "./resolve-retry-message-payload.jsx";
import { ChatHistoryLoadingState } from "../chat/chat-history-loading-state.jsx";
import { toastWorkspaceOpenResult } from "./toast-workspace-open-result.js";
import { BundleErrorScreen } from "../infra/bundle-error-screen.jsx";
import { useBundleStatus } from "../media-editing/use-bundle-status.js";
import { IHiloApp } from "../settings/parse-custom-mcp-arguments.js";
import { replaceVisiblePreviewTab } from "../infra/error-boundary.jsx";
import { WorkspaceStage } from "./workspace-stage.jsx";
function reportWorkspaceRetentionDiagnostics(workspaceId, entry) {
  entries.set(workspaceId, entry);
  return () => {
    entries.delete(workspaceId);
  };
}
function useRetainInactiveWorkspaceContent(isActive) {
  return true;
}
function createWorkspaceResumeFailureStatus(
  workspaceId,
  folderPath,
  message,
) {
  return {
    workspaceId,
    folderPath: folderPath ?? workspaceId,
    state: "failed",
    revision: 0,
    error: message,
    synthetic: true,
  };
}
function deriveWorkspaceRuntimeView(input) {
  const {
    workspaceId,
    isActive,
    runtime,
    status,
    lastRenderableStatus,
    activationFailureStatus,
    resumeFailureMessage,
  } = input;
  const activeRuntime =
    runtime?.workspaceId === workspaceId ? runtime : void 0;
  const activeStatus = status?.workspaceId === workspaceId ? status : void 0;
  const liveGatewayStatus =
    activeStatus && isGatewayReady(activeStatus.state) ? activeStatus : void 0;
  const liveRenderableStatus =
    activeStatus && isReadyState(activeStatus.state) ? activeStatus : void 0;
  const canShowActivationFailure =
    activationFailureStatus !== void 0 &&
    (!activeStatus ||
      activeStatus.state === "stopping" ||
      activeStatus.state === "stopped");
  const failureStatus =
    activeStatus?.state === "failed"
      ? activeStatus
      : canShowActivationFailure
        ? activationFailureStatus
        : void 0;
  const retainedRenderableStatus =
    liveRenderableStatus ??
    (lastRenderableStatus?.workspaceId === workspaceId
      ? lastRenderableStatus
      : void 0);
  const canRenderRetainedContent =
    activeRuntime !== void 0 && retainedRenderableStatus !== void 0;
  const syntheticStartingStatus =
    activeRuntime &&
    !activeStatus &&
    !retainedRenderableStatus &&
    !failureStatus
      ? {
          workspaceId,
          folderPath: activeRuntime.folderPath,
          state: "creating",
          revision: 0,
          synthetic: true,
        }
      : void 0;
  const renderableStatus =
    liveGatewayStatus ??
    retainedRenderableStatus ??
    activeStatus ??
    failureStatus ??
    syntheticStartingStatus;
  const statusUnavailableStatus =
    !activeStatus && canRenderRetainedContent
      ? createWorkspaceResumeFailureStatus(
          workspaceId,
          activeRuntime?.folderPath,
          resumeFailureMessage,
        )
      : void 0;
  const runtimeIssueStatus =
    failureStatus ??
    (canRenderRetainedContent &&
    activeStatus &&
    !isReadyState(activeStatus.state)
      ? activeStatus
      : activeRuntime &&
          activeStatus &&
          (activeStatus.state === "stopping" ||
            activeStatus.state === "stopped")
        ? activeStatus
        : statusUnavailableStatus);
  const derived = (view) => ({
    view,
    activeRuntime,
    activeStatus,
    liveRenderableStatus,
    canRenderRetainedContent,
    runtimeIssueStatus,
  });
  if (!activeRuntime) {
    if (failureStatus) {
      return derived(
        isActive
          ? {
              kind: "error",
              status: failureStatus,
            }
          : {
              kind: "none",
            },
      );
    }
    return derived(
      isActive
        ? {
            kind: "loading",
            status: activeStatus ?? {
              workspaceId,
              folderPath: "",
              state: "creating",
              revision: 0,
              synthetic: true,
            },
          }
        : {
            kind: "none",
          },
    );
  }
  if (!renderableStatus)
    return derived({
      kind: "none",
    });
  return derived({
    kind: "content",
    runtime: activeRuntime,
    renderableStatus,
    runtimeIssueStatus,
  });
}
function toWorkspaceWsUrl(binding) {
  const protocol = binding.baseUrl.startsWith("https") ? "wss" : "ws";
  const host = binding.baseUrl.replace(/^https?:\/\//, "");
  const url = new URL(`${protocol}://${host}/ws`);
  url.searchParams.set(HILO_WORKSPACE_IDENTITY_QUERY, binding.claim);
  url.searchParams.set(HILO_WORKSPACE_INSTANCE_QUERY, binding.instanceId);
  url.searchParams.set(
    HILO_WORKSPACE_GENERATION_QUERY,
    String(binding.generation),
  );
  return url.toString();
}
function resolveEffectiveWorkspaceRuntime({
  runtime,
  renderableStatus,
  activeStatus,
}) {
  const statusGatewayUrl =
    activeStatus && isGatewayReady(activeStatus.state)
      ? activeStatus.gatewayUrl
      : renderableStatus.gatewayUrl;
  if (!runtime.gatewayBinding) return runtime;
  if (statusGatewayUrl && statusGatewayUrl !== runtime.gatewayBinding.baseUrl)
    return runtime;
  return runtime;
}
function sameBinding(left, right) {
  return (
    left.baseUrl === right.baseUrl &&
    left.claim === right.claim &&
    left.instanceId === right.instanceId &&
    left.generation === right.generation
  );
}
function resyncRuntimeGatewayBinding(prev, workspaceId, nextBinding, options) {
  if (!prev || prev.workspaceId !== workspaceId) return prev;
  if (!nextBinding) return options?.dropWhenUnavailable ? void 0 : prev;
  if (prev.gatewayBinding && sameBinding(prev.gatewayBinding, nextBinding)) {
    return prev;
  }
  return {
    ...prev,
    gatewayBinding: nextBinding,
    gatewayUrl: nextBinding.baseUrl,
    workspaceClaim: nextBinding.claim,
    wsUrl: toWorkspaceWsUrl(nextBinding),
  };
}
function writeDiagnostic(level, message) {
  const logger = window.hilo?.logger;
  if (logger) {
    const write =
      level === "warn" ? logger.warn.bind(logger) : logger.info.bind(logger);
    write(message).catch(() => {
      if (level === "warn") {
        console.warn(message);
      } else {
        console.info(message);
      }
    });
    return;
  }
  if (level === "warn") {
    console.warn(message);
  } else {
    console.info(message);
  }
}
function formatWorkspaceMatch(value, workspaceId) {
  if (!value) return "unknown";
  return String(value === workspaceId);
}
function formatDiagnosticSnapshot(instanceId, input) {
  return [
    `instance=${instanceId}`,
    `active=${input.isActive}`,
    `view=${input.viewKind}`,
    `runtimeKnown=${input.runtime !== void 0}`,
    `runtimeMatch=${formatWorkspaceMatch(input.runtime?.workspaceId, input.workspaceId)}`,
    `activeRuntime=${input.activeRuntime !== void 0}`,
    `statusKnown=${input.status !== void 0}`,
    `statusMatch=${formatWorkspaceMatch(input.status?.workspaceId, input.workspaceId)}`,
    `activeStatus=${input.activeStatus?.state ?? "unknown"}`,
    `activeRevision=${input.activeStatus?.revision ?? "unknown"}`,
    `liveRenderable=${input.liveRenderableStatus !== void 0}`,
    `lastRenderable=${input.lastRenderableStatus !== void 0}`,
    `lastRenderableRevision=${input.lastRenderableStatus?.revision ?? "unknown"}`,
    `activationFailure=${input.activationFailureStatus?.state ?? "none"}`,
    `canRetain=${input.canRenderRetainedContent}`,
    `refreshKey=${input.statusRefreshKey}`,
  ].join(" ");
}
function useWorkspaceRuntimeViewDiagnostics(input) {
  const reactId = reactExports.useId();
  const instanceId = `workspace-runtime-${reactId.replace(/:/g, "")}`;
  const latestInputRef = reactExports.useRef(input);
  latestInputRef.current = input;
  const lifecycleGenerationRef = reactExports.useRef(0);
  const hasLoggedMountRef = reactExports.useRef(false);
  const hasCommittedContentRef = reactExports.useRef(false);
  const previousViewKindRef = reactExports.useRef(void 0);
  reactExports.useEffect(() => {
    const generation = lifecycleGenerationRef.current + 1;
    lifecycleGenerationRef.current = generation;
    if (!hasLoggedMountRef.current) {
      hasLoggedMountRef.current = true;
      writeDiagnostic(
        "info",
        `[workspace-runtime-view] host mounted ${formatDiagnosticSnapshot(instanceId, latestInputRef.current)}`,
      );
    }
    return () => {
      queueMicrotask(() => {
        if (lifecycleGenerationRef.current !== generation) return;
        writeDiagnostic(
          "info",
          `[workspace-runtime-view] host unmounted ${formatDiagnosticSnapshot(instanceId, latestInputRef.current)}`,
        );
      });
    };
  }, [instanceId]);
  reactExports.useEffect(() => {
    const previousViewKind = previousViewKindRef.current;
    previousViewKindRef.current = input.viewKind;
    if (input.viewKind === "content" && !hasCommittedContentRef.current) {
      hasCommittedContentRef.current = true;
      writeDiagnostic(
        "info",
        `[workspace-runtime-view] content committed ${formatDiagnosticSnapshot(instanceId, latestInputRef.current)}`,
      );
    }
    if (previousViewKind !== "content" || input.viewKind === "content") return;
    writeDiagnostic(
      "warn",
      `[workspace-runtime-view] committed content regression previous=content ${formatDiagnosticSnapshot(instanceId, latestInputRef.current)}`,
    );
  }, [input.viewKind, instanceId]);
}
const announced = new Set();
function shouldAnnounceRecoveryNotice(notice) {
  if (!notice) return false;
  if (announced.has(notice.atMs)) return false;
  announced.add(notice.atMs);
  return true;
}
function resolveWorkspaceActivationResult(result) {
  if (!result)
    return {
      kind: "startup_failure",
    };
  switch (result.kind) {
    case "opened":
    case "reused":
      return {
        kind: "runtime",
        runtime: result.runtime,
      };
    default:
      return {
        kind: "soft_failure",
        result,
        returnHome: true,
      };
  }
}
function WorkspaceRuntimeDegradedBanner({ status, retrying = false, onRetry }) {
  const { i18n, t } = useTranslation();
  const retryHintActive = useRetryHintActive(status.retryAfter?.blockedUntilMs);
  const diagnosis = resolveWorkspaceFailureDiagnosis(status.diagnosis?.code, t, i18n.language);
  const errorMessage =
    diagnosis?.message ??
    status.error ??
    t("workspace.runtimeDegraded.description", {
      defaultValue:
        "Workspace, canvas, chat history, and assets stay visible. Chat is paused until the local runtime reconnects.",
    });
  const actionable = diagnosis?.severity === "needs_user_action";
  const title =
    actionable && diagnosis
      ? diagnosis.title
      : t("workspace.runtimeDegraded.title", {
          defaultValue: "Local runtime is recovering",
        });
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex justify-center">
      <div
        className="elevated-surface-border pointer-events-auto max-w-2xl rounded-lg bg-popover/95 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur"
        data-action-ui-id="workspace.runtime-degraded-banner"
        data-diagnosis-code={diagnosis?.code}
      >
        <div className="font-medium text-foreground">{title}</div>
        <div className="mt-0.5">{errorMessage}</div>
        {actionable && diagnosis && diagnosis.suggestions.length > 0 ? (
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {diagnosis.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        ) : null}
        {retryHintActive ? (
          <div className="mt-1">
            {t("workspace.runtimeDegraded.retryHint", {
              defaultValue:
                "The runtime protection circuit is cooling down. Retry remains available and will not clear the current workspace view.",
            })}
          </div>
        ) : null}
        {onRetry ? (
          <Button variant="outline" size="xs" className="mt-1.5" loading={retrying} onClick={onRetry}>
            <RetryIcon />
            {retrying
              ? t("workspace.runtimeDegraded.retrying", {
                  defaultValue: "Retrying...",
                })
              : t("common.retry")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
export function RetainedWorkspaceRuntimeHost({
  workspaceId,
  isActive,
  initialPayloadId,
  initialMessage,
  initialAttachments,
  initialEntityRefs,
  initialModelId,
  initialSelectedMediaModels,
  initialComfyUiWorkflowId,
  initialComfyUiWorkflowTarget,
  onInitialMessageSent,
  skillPrompt,
  skillName,
  pluginId,
  menuAction,
  assetCenterRelocation,
}) {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const stageLayout = useWorkspaceStageLayout(workspaceId, isActive);
  const [runtime, setRuntime] = reactExports.useState(void 0);
  const [lastRenderableStatus, setLastRenderableStatus] =
    reactExports.useState(void 0);
  const [statusRefreshKey, setStatusRefreshKey] = reactExports.useState(0);
  const [retrying, setRetrying] = reactExports.useState(false);
  const resumeFailureMessage = reactExports.useMemo(
    () =>
      translate("bundleError.resumeFailed", {
        defaultValue:
          "Workspace recovery failed. Your workspace data is still safe; retry to restart the local runtime.",
      }),
    [translate],
  );
  const [activationFailureStatus, setActivationFailureStatus] =
    reactExports.useState(void 0);
  const [retryCount, setRetryCount] = reactExports.useState(0);
  const lastReportedRetainedDegradedRef = reactExports.useRef(void 0);
  const retainContent = useRetainInactiveWorkspaceContent();
  const status = useBundleStatus(workspaceId, statusRefreshKey, {
    enabled: isActive || runtime !== void 0,
  });
  const latestStatusStateRef = reactExports.useRef(void 0);
  // 产物里写的是 `status?.workspaceId === workspaceId ? status.state : void 0`，**少了 status 这一侧的判空**：
  // 当 `status` 与 `workspaceId` 都是 undefined 时，`undefined === undefined` 成立，于是去读 `status.state` 直接抛。
  // 这是上游的**潜在缺陷**（产物里一模一样），平时不触发；我们这边会走到，所以补上判空。
  // 只影响「本来就会抛」那一条路径。
  latestStatusStateRef.current =
    status && status.workspaceId === workspaceId ? status.state : void 0;
  reactExports.useEffect(() => {
    const notice = status?.recoveryNotice;
    if (!shouldAnnounceRecoveryNotice(notice)) return;
    if (notice.kind === "opencode_db_rebuilt") {
      dedupedToast.warning(translate("workspace.recovery.dbRebuilt.title"), {
        description: translate("workspace.recovery.dbRebuilt.description"),
        duration: 12e3,
      });
    }
  }, [status?.recoveryNotice, translate]);
  reactExports.useEffect(() => {
    setRuntime((prev) => (prev?.workspaceId === workspaceId ? prev : void 0));
    setLastRenderableStatus((prev) =>
      prev?.workspaceId === workspaceId ? prev : void 0,
    );
    setActivationFailureStatus(void 0);
    lastReportedRetainedDegradedRef.current = void 0;
    let disposed = false;
    const lastState = latestStatusStateRef.current;
    const resumingFromDeadHandle = shouldRefreshStatusOnResume(
      isActive,
      lastState,
    );
    const hiloApp = instantiationService.invokeFunction((accessor) =>
      accessor.get(IHiloApp),
    );
    const activationPromise = isActive
      ? hiloApp
          .activateWorkspaceWithResult(workspaceId)
          .then(resolveWorkspaceActivationResult)
      : hiloApp.getWorkspaceRuntime(workspaceId).then((runtime) =>
          runtime
            ? {
                kind: "runtime",
                runtime,
              }
            : {
                kind: "inactive",
              },
        );
    activationPromise
      .then((resolution) => {
        if (disposed) return;
        if (resolution.kind === "soft_failure") {
          toastWorkspaceOpenResult(resolution.result, translate);
          setActivationFailureStatus(void 0);
          if (isActive && resolution.returnHome) {
            void hiloApp.activateHome();
            void navigate({
              to: "/",
            });
          }
          return;
        }
        if (resolution.kind === "runtime") {
          const next = resolution.runtime;
          setRuntime(next);
          setActivationFailureStatus(void 0);
          if (isActive) requestRecentWorkspacesRefresh();
          if (isActive && next.workspaceId !== workspaceId) {
            replaceVisiblePreviewTab(workspaceId, {
              workspaceId: next.workspaceId,
              folderPath: next.folderPath,
            });
            void navigate({
              to: "/workspace",
              search: buildWorkspaceSearch(next.workspaceId, {
                initialPayloadId,
                initialMessage,
                initialAttachments,
                initialEntityRefs,
                initialModelId,
                initialSelectedMediaModels,
                initialComfyUiWorkflowId,
                initialComfyUiWorkflowTarget,
                skillPrompt,
                skillName,
                pluginId,
                menuAction,
                assetCenterRelocation,
              }),
              replace: true,
            });
          }
          if (resumingFromDeadHandle) {
            setStatusRefreshKey((key) => key + 1);
          }
          return;
        }
        if (isActive && resolution.kind === "startup_failure") {
          setActivationFailureStatus(
            createWorkspaceResumeFailureStatus(
              workspaceId,
              void 0,
              resumeFailureMessage,
            ),
          );
        }
      })
      .catch((err) => {
        if (disposed) return;
        if (isActive) {
          setActivationFailureStatus(
            createWorkspaceResumeFailureStatus(
              workspaceId,
              void 0,
              resumeFailureMessage,
            ),
          );
        }
        const detail =
          err instanceof Error ? (err.stack ?? err.message) : String(err);
        const msg = `[workspace] activateWorkspace failed: ${detail}`;
        if (window.hilo?.logger) {
          window.hilo.logger.error(msg).catch(() => console.error(msg));
        } else {
          console.error(msg);
        }
      });
    return () => {
      disposed = true;
    };
  }, [
    workspaceId,
    isActive,
    translate,
    resumeFailureMessage,
    navigate,
    initialPayloadId,
    initialMessage,
    initialAttachments,
    initialEntityRefs,
    initialModelId,
    initialSelectedMediaModels,
    initialComfyUiWorkflowId,
    initialComfyUiWorkflowTarget,
    skillPrompt,
    skillName,
    pluginId,
    menuAction,
    assetCenterRelocation,
  ]);
  const recoverInFlightRef = reactExports.useRef(null);
  const recoverWorkspaceBinding = reactExports.useCallback(async () => {
    const inFlight = recoverInFlightRef.current;
    if (inFlight) return inFlight;
    const attempt = (async () => {
      const hiloApp = instantiationService.invokeFunction((accessor) =>
        accessor.get(IHiloApp),
      );
      const next = await hiloApp.getWorkspaceRuntime(workspaceId);
      if (next?.gatewayBinding) {
        const nextBinding = next.gatewayBinding;
        setRuntime((prev) => {
          const prevBinding = prev?.gatewayBinding;
          if (
            prevBinding &&
            prevBinding.baseUrl === nextBinding.baseUrl &&
            prevBinding.claim === nextBinding.claim &&
            prevBinding.instanceId === nextBinding.instanceId &&
            prevBinding.generation === nextBinding.generation
          ) {
            return prev;
          }
          return next;
        });
        return nextBinding;
      }
      if (isActive === false) return void 0;
      const result = await hiloApp.activateWorkspaceWithResult(workspaceId);
      const resumed = result ? workspaceRuntimeFromOpenResult(result) : void 0;
      if (!resumed?.gatewayBinding) return void 0;
      setRuntime(resumed);
      return resumed.gatewayBinding;
    })();
    recoverInFlightRef.current = attempt.finally(() => {
      recoverInFlightRef.current = null;
    });
    return recoverInFlightRef.current;
  }, [workspaceId, isActive]);
  reactExports.useEffect(() => {
    if (!workspaceId) return;
    const hiloApp = instantiationService.invokeFunction((accessor) =>
      accessor.get(IHiloApp),
    );
    const disposable = hiloApp.onWorkspaceEntriesChanged((entries) => {
      const entry = entries.find((workspaceEntry) => workspaceEntry.workspaceId === workspaceId);
      if (!isActive && !entry?.gatewayUrl) {
        workspaceEvents.clearSubscribersReady(workspaceId);
      }
      if (isActive && !entry?.gatewayBinding) {
        void hiloApp
          .listWorkspaceLifecycleStates()
          .then(async (states) => {
            if (states[workspaceId] !== "suspended") return;
            await recoverWorkspaceBinding();
          })
          .catch(() => {});
      }
      setRuntime((prev) =>
        resyncRuntimeGatewayBinding(prev, workspaceId, entry?.gatewayBinding, {
          dropWhenUnavailable: !isActive,
        }),
      );
    });
    return () => {
      disposable.dispose();
    };
  }, [isActive, workspaceId, recoverWorkspaceBinding]);
  const retryWorkspace = reactExports.useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    setActivationFailureStatus(void 0);
    setRetryCount((retryCount) => retryCount + 1);
    try {
      const hiloApp = instantiationService.invokeFunction((accessor) =>
        accessor.get(IHiloApp),
      );
      const result = await hiloApp.retryWorkspaceWithResult(workspaceId);
      const next = workspaceRuntimeFromOpenResult(result);
      if (!next) {
        toastWorkspaceOpenResult(result, translate);
        await hiloApp.activateHome();
        void navigate({
          to: "/",
        });
        return;
      } else {
        setActivationFailureStatus(void 0);
        setRuntime(next);
      }
      setStatusRefreshKey((key) => key + 1);
    } catch (err) {
      setActivationFailureStatus(
        createWorkspaceResumeFailureStatus(
          workspaceId,
          void 0,
          resumeFailureMessage,
        ),
      );
      setStatusRefreshKey((key) => key + 1);
      const detail =
        err instanceof Error ? (err.stack ?? err.message) : String(err);
      const msg = `[workspace] retryWorkspace failed: ${detail}`;
      if (window.hilo?.logger) {
        window.hilo.logger.error(msg).catch(() => console.error(msg));
      } else {
        console.error(msg);
      }
    } finally {
      setRetrying(false);
    }
  }, [workspaceId, retrying, translate, resumeFailureMessage, navigate]);
  const {
    view,
    activeRuntime,
    activeStatus,
    liveRenderableStatus,
    canRenderRetainedContent,
    runtimeIssueStatus,
  } = deriveWorkspaceRuntimeView({
    workspaceId,
    isActive,
    runtime,
    status,
    lastRenderableStatus,
    activationFailureStatus,
    resumeFailureMessage,
  });
  reactExports.useEffect(() => {
    if (!liveRenderableStatus) return;
    setLastRenderableStatus(liveRenderableStatus);
  }, [liveRenderableStatus]);
  useWorkspaceRuntimeViewDiagnostics({
    workspaceId,
    isActive,
    viewKind: view.kind,
    runtime,
    status,
    activeRuntime,
    activeStatus,
    liveRenderableStatus,
    lastRenderableStatus,
    activationFailureStatus,
    canRenderRetainedContent,
    statusRefreshKey,
  });
  reactExports.useEffect(() => {
    if (!isActive || !runtimeIssueStatus || !canRenderRetainedContent) return;
    const reportKey = [
      runtimeIssueStatus.state,
      runtimeIssueStatus.revision,
      runtimeIssueStatus.diagnosis?.code ?? "unknown",
    ].join(":");
    if (lastReportedRetainedDegradedRef.current === reportKey) return;
    lastReportedRetainedDegradedRef.current = reportKey;
    const msg = `[workspace] runtime degraded; retaining visible workspace content workspace=${workspaceId} state=${runtimeIssueStatus.state} diagnosis=${runtimeIssueStatus.diagnosis?.code ?? "unknown"}`;
    if (window.hilo?.logger) {
      window.hilo.logger.warn(msg).catch(() => console.warn(msg));
    } else {
      console.warn(msg);
    }
  }, [canRenderRetainedContent, isActive, runtimeIssueStatus, workspaceId]);
  reactExports.useEffect(() => {
    return reportWorkspaceRetentionDiagnostics(workspaceId, {
      isActive,
      retainContent,
      hasRuntime: activeRuntime !== void 0,
      statusState: activeStatus?.state,
    });
  }, [
    activeRuntime,
    activeStatus?.state,
    isActive,
    retainContent,
    workspaceId,
  ]);
  if (view.kind === "none") {
    return null;
  }
  if (view.kind === "error") {
    return (
      <BundleErrorScreen
        status={view.status}
        retrying={retrying}
        retryCount={retryCount}
        onRetry={retryWorkspace}
      />
    );
  }
  if (view.kind === "loading") {
    const chatVisible = stageLayout.stageState.workspaceMode !== "canvasOnly";
    const canvasVisible = stageLayout.stageState.workspaceMode !== "chatOnly";
    return (
      <div
        className={isActive ? "relative flex h-full w-full" : "hidden"}
        data-workspace-runtime-pending={workspaceId}
      >
        <WorkspaceStage
          isActive={isActive}
          paneOrder={stageLayout.stageState.paneOrder}
          chatVisible={chatVisible}
          canvasVisible={canvasVisible}
          chatRatio={stageLayout.chatRatio}
          onChatRatioChange={stageLayout.handleChatRatioChange}
          onPaneOrderChange={stageLayout.handlePaneOrderChange}
          onCanvasPaneChange={stageLayout.handleCanvasPaneChange}
          chat={
            <div
              className="flex h-full min-h-0 flex-col"
              data-chat-loading-motion="breathe"
            >
              <ChatHistoryLoadingState
                label={translate(
                  "chat.starting.placeholder",
                  "Agent is getting ready...",
                )}
                includeChrome={true}
              />
            </div>
          }
          canvas={
            <div
              className="relative flex h-full min-h-0 min-w-0 overflow-hidden bg-background"
              data-workspace-canvas-surface="loading"
            >
              <div
                className="relative min-h-0 min-w-0 flex-1"
                style={{
                  order: 0,
                }}
              >
                <CanvasLoadingState label={translate("a11y.loading")} />
              </div>
              {stageLayout.stageState.filesMode === "docked" ? (
                <div
                  aria-hidden="true"
                  className="h-full shrink-0 border-l border-border-soft bg-card/95"
                  data-workspace-loading-files-dock="true"
                  style={{
                    order: 2,
                    width: stageLayout.assetPanel.width,
                  }}
                />
              ) : null}
            </div>
          }
        />
      </div>
    );
  }
  const renderableStatus = view.renderableStatus;
  const contentRuntime = view.runtime;
  const effectiveRuntime = resolveEffectiveWorkspaceRuntime({
    runtime: contentRuntime,
    renderableStatus,
    activeStatus,
  });
  return (
    <div
      className={isActive ? "relative flex h-full w-full" : "hidden"}
      data-workspace-runtime-id={effectiveRuntime.workspaceId}
    >
      <GatewayScopeProvider
        gatewayUrl={effectiveRuntime.gatewayUrl}
        gatewayBinding={effectiveRuntime.gatewayBinding}
        gatewayReady={
          runtimeIssueStatus === void 0 &&
          isGatewayReady(renderableStatus.state)
        }
        scopeKey={effectiveRuntime.workspaceId}
        workspaceClaim={effectiveRuntime.workspaceClaim}
        recoverWorkspace={recoverWorkspaceBinding}
      >
        <WorkspaceRuntimeContent
          runtime={effectiveRuntime}
          status={renderableStatus}
          stageLayout={stageLayout}
          runtimeUnavailable={runtimeIssueStatus !== void 0}
          isActive={isActive}
          initialPayloadId={initialPayloadId}
          initialMessage={initialMessage}
          initialAttachments={initialAttachments}
          initialEntityRefs={initialEntityRefs}
          initialModelId={initialModelId}
          initialSelectedMediaModels={initialSelectedMediaModels}
          initialComfyUiWorkflowId={initialComfyUiWorkflowId}
          initialComfyUiWorkflowTarget={initialComfyUiWorkflowTarget}
          onInitialMessageSent={onInitialMessageSent}
          skillPrompt={isActive ? skillPrompt : void 0}
          skillName={isActive ? skillName : void 0}
          pluginId={isActive ? pluginId : void 0}
          menuAction={isActive ? menuAction : void 0}
          assetCenterRelocation={isActive ? assetCenterRelocation : void 0}
        />
      </GatewayScopeProvider>
      {runtimeIssueStatus && isActive ? (
        <WorkspaceRuntimeDegradedBanner
          status={runtimeIssueStatus}
          retrying={retrying}
          onRetry={retryWorkspace}
        />
      ) : null}
    </div>
  );
}
