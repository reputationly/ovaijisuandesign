// retained-workspace-runtime-host.jsx
import { entries } from "../assets/credit-query-keys.jsx";
import { HILO_WORKSPACE_GENERATION_QUERY, HILO_WORKSPACE_IDENTITY_QUERY, HILO_WORKSPACE_INSTANCE_QUERY, reactExports, useNavigate, useTranslation } from "../vendor.js";
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
function reportWorkspaceRetentionDiagnostics(workspaceId2, entry) {
  entries.set(workspaceId2, entry);
  return () => {
    entries.delete(workspaceId2);
  };
}
function useRetainInactiveWorkspaceContent(isActive2) {
  return true;
}
function createWorkspaceResumeFailureStatus(
  workspaceId2,
  folderPath,
  message2,
) {
  return {
    workspaceId: workspaceId2,
    folderPath: folderPath ?? workspaceId2,
    state: "failed",
    revision: 0,
    error: message2,
    synthetic: true,
  };
}
function deriveWorkspaceRuntimeView(input) {
  const {
    workspaceId: workspaceId2,
    isActive: isActive2,
    runtime,
    status,
    lastRenderableStatus,
    activationFailureStatus,
    resumeFailureMessage,
  } = input;
  const activeRuntime =
    runtime?.workspaceId === workspaceId2 ? runtime : void 0;
  const activeStatus = status?.workspaceId === workspaceId2 ? status : void 0;
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
    (lastRenderableStatus?.workspaceId === workspaceId2
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
          workspaceId: workspaceId2,
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
          workspaceId2,
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
  const derived = (view2) => ({
    view: view2,
    activeRuntime,
    activeStatus,
    liveRenderableStatus,
    canRenderRetainedContent,
    runtimeIssueStatus,
  });
  if (!activeRuntime) {
    if (failureStatus) {
      return derived(
        isActive2
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
      isActive2
        ? {
            kind: "loading",
            status: activeStatus ?? {
              workspaceId: workspaceId2,
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
  const url2 = new URL(`${protocol}://${host}/ws`);
  url2.searchParams.set(HILO_WORKSPACE_IDENTITY_QUERY, binding.claim);
  url2.searchParams.set(HILO_WORKSPACE_INSTANCE_QUERY, binding.instanceId);
  url2.searchParams.set(
    HILO_WORKSPACE_GENERATION_QUERY,
    String(binding.generation),
  );
  return url2.toString();
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
function resyncRuntimeGatewayBinding(prev, workspaceId2, nextBinding, options) {
  if (!prev || prev.workspaceId !== workspaceId2) return prev;
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
function writeDiagnostic(level, message2) {
  const logger = window.hilo?.logger;
  if (logger) {
    const write =
      level === "warn" ? logger.warn.bind(logger) : logger.info.bind(logger);
    write(message2).catch(() => {
      if (level === "warn") {
        console.warn(message2);
      } else {
        console.info(message2);
      }
    });
    return;
  }
  if (level === "warn") {
    console.warn(message2);
  } else {
    console.info(message2);
  }
}
function formatWorkspaceMatch(value, workspaceId2) {
  if (!value) return "unknown";
  return String(value === workspaceId2);
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
  const { i18n, t: t2 } = useTranslation();
  const retryHintActive = useRetryHintActive(status.retryAfter?.blockedUntilMs);
  const diagnosis = resolveWorkspaceFailureDiagnosis(
    status.diagnosis?.code,
    t2,
    i18n.language,
  );
  const errorMessage2 =
    diagnosis?.message ??
    status.error ??
    t2("workspace.runtimeDegraded.description", {
      defaultValue:
        "Workspace, canvas, chat history, and assets stay visible. Chat is paused until the local runtime reconnects.",
    });
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex justify-center">
      <div className="elevated-surface-border pointer-events-auto max-w-2xl rounded-lg bg-popover/95 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
        <div className="font-medium text-foreground">
          {t2("workspace.runtimeDegraded.title", {
            defaultValue: "Local runtime is recovering",
          })}
        </div>
        <div className="mt-0.5">{errorMessage2}</div>
        {retryHintActive ? (
          <div className="mt-1">
            {t2("workspace.runtimeDegraded.retryHint", {
              defaultValue:
                "The runtime protection circuit is cooling down. Retry remains available and will not clear the current workspace view.",
            })}
          </div>
        ) : null}
        {onRetry ? (
          <Button
            variant="outline"
            size="xs"
            className="mt-1.5"
            loading={retrying}
            onClick={onRetry}
          >
            <RetryIcon />
            {retrying
              ? t2("workspace.runtimeDegraded.retrying", {
                  defaultValue: "Retrying...",
                })
              : t2("common.retry")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
export function RetainedWorkspaceRuntimeHost({
  workspaceId: workspaceId2,
  isActive: isActive2,
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
  const { t: t2 } = useTranslation();
  const navigate = useNavigate();
  const stageLayout = useWorkspaceStageLayout(workspaceId2, isActive2);
  const [runtime, setRuntime] = reactExports.useState(void 0);
  const [lastRenderableStatus, setLastRenderableStatus] =
    reactExports.useState(void 0);
  const [statusRefreshKey, setStatusRefreshKey] = reactExports.useState(0);
  const [retrying, setRetrying] = reactExports.useState(false);
  const resumeFailureMessage = reactExports.useMemo(
    () =>
      t2("bundleError.resumeFailed", {
        defaultValue:
          "Workspace recovery failed. Your workspace data is still safe; retry to restart the local runtime.",
      }),
    [t2],
  );
  const [activationFailureStatus, setActivationFailureStatus] =
    reactExports.useState(void 0);
  const [retryCount, setRetryCount] = reactExports.useState(0);
  const lastReportedRetainedDegradedRef = reactExports.useRef(void 0);
  const retainContent = useRetainInactiveWorkspaceContent();
  const status = useBundleStatus(workspaceId2, statusRefreshKey, {
    enabled: isActive2 || runtime !== void 0,
  });
  const latestStatusStateRef = reactExports.useRef(void 0);
  latestStatusStateRef.current =
    status?.workspaceId === workspaceId2 ? status.state : void 0;
  reactExports.useEffect(() => {
    const notice = status?.recoveryNotice;
    if (!shouldAnnounceRecoveryNotice(notice)) return;
    if (notice.kind === "opencode_db_rebuilt") {
      dedupedToast.warning(t2("workspace.recovery.dbRebuilt.title"), {
        description: t2("workspace.recovery.dbRebuilt.description"),
        duration: 12e3,
      });
    }
  }, [status?.recoveryNotice, t2]);
  reactExports.useEffect(() => {
    setRuntime((prev) => (prev?.workspaceId === workspaceId2 ? prev : void 0));
    setLastRenderableStatus((prev) =>
      prev?.workspaceId === workspaceId2 ? prev : void 0,
    );
    setActivationFailureStatus(void 0);
    lastReportedRetainedDegradedRef.current = void 0;
    let disposed = false;
    const lastState = latestStatusStateRef.current;
    const resumingFromDeadHandle = shouldRefreshStatusOnResume(
      isActive2,
      lastState,
    );
    const hiloApp2 = instantiationService.invokeFunction((accessor) =>
      accessor.get(IHiloApp),
    );
    const activationPromise = isActive2
      ? hiloApp2
          .activateWorkspaceWithResult(workspaceId2)
          .then(resolveWorkspaceActivationResult)
      : hiloApp2.getWorkspaceRuntime(workspaceId2).then((runtime2) =>
          runtime2
            ? {
                kind: "runtime",
                runtime: runtime2,
              }
            : {
                kind: "inactive",
              },
        );
    activationPromise
      .then((resolution) => {
        if (disposed) return;
        if (resolution.kind === "soft_failure") {
          toastWorkspaceOpenResult(resolution.result, t2);
          setActivationFailureStatus(void 0);
          if (isActive2 && resolution.returnHome) {
            void hiloApp2.activateHome();
            void navigate({
              to: "/",
            });
          }
          return;
        }
        if (resolution.kind === "runtime") {
          const next2 = resolution.runtime;
          setRuntime(next2);
          setActivationFailureStatus(void 0);
          if (isActive2) requestRecentWorkspacesRefresh();
          if (isActive2 && next2.workspaceId !== workspaceId2) {
            replaceVisiblePreviewTab(workspaceId2, {
              workspaceId: next2.workspaceId,
              folderPath: next2.folderPath,
            });
            void navigate({
              to: "/workspace",
              search: buildWorkspaceSearch(next2.workspaceId, {
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
            setStatusRefreshKey((key2) => key2 + 1);
          }
          return;
        }
        if (isActive2 && resolution.kind === "startup_failure") {
          setActivationFailureStatus(
            createWorkspaceResumeFailureStatus(
              workspaceId2,
              void 0,
              resumeFailureMessage,
            ),
          );
        }
      })
      .catch((err) => {
        if (disposed) return;
        if (isActive2) {
          setActivationFailureStatus(
            createWorkspaceResumeFailureStatus(
              workspaceId2,
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
    workspaceId2,
    isActive2,
    t2,
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
      const hiloApp2 = instantiationService.invokeFunction((accessor) =>
        accessor.get(IHiloApp),
      );
      const next2 = await hiloApp2.getWorkspaceRuntime(workspaceId2);
      if (next2?.gatewayBinding) {
        const nextBinding = next2.gatewayBinding;
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
          return next2;
        });
        return nextBinding;
      }
      if (isActive2 === false) return void 0;
      const result = await hiloApp2.activateWorkspaceWithResult(workspaceId2);
      const resumed = result ? workspaceRuntimeFromOpenResult(result) : void 0;
      if (!resumed?.gatewayBinding) return void 0;
      setRuntime(resumed);
      return resumed.gatewayBinding;
    })();
    recoverInFlightRef.current = attempt.finally(() => {
      recoverInFlightRef.current = null;
    });
    return recoverInFlightRef.current;
  }, [workspaceId2, isActive2]);
  reactExports.useEffect(() => {
    if (!workspaceId2) return;
    const hiloApp2 = instantiationService.invokeFunction((accessor) =>
      accessor.get(IHiloApp),
    );
    const disposable = hiloApp2.onWorkspaceEntriesChanged((entries2) => {
      const entry = entries2.find((e2) => e2.workspaceId === workspaceId2);
      if (!isActive2 && !entry?.gatewayUrl) {
        workspaceEvents.clearSubscribersReady(workspaceId2);
      }
      if (isActive2 && !entry?.gatewayBinding) {
        void hiloApp2
          .listWorkspaceLifecycleStates()
          .then(async (states) => {
            if (states[workspaceId2] !== "suspended") return;
            await recoverWorkspaceBinding();
          })
          .catch(() => {});
      }
      setRuntime((prev) =>
        resyncRuntimeGatewayBinding(prev, workspaceId2, entry?.gatewayBinding, {
          dropWhenUnavailable: !isActive2,
        }),
      );
    });
    return () => {
      disposable.dispose();
    };
  }, [isActive2, workspaceId2, recoverWorkspaceBinding]);
  const retryWorkspace = reactExports.useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    setActivationFailureStatus(void 0);
    setRetryCount((c3) => c3 + 1);
    try {
      const hiloApp2 = instantiationService.invokeFunction((accessor) =>
        accessor.get(IHiloApp),
      );
      const result = await hiloApp2.retryWorkspaceWithResult(workspaceId2);
      const next2 = workspaceRuntimeFromOpenResult(result);
      if (!next2) {
        toastWorkspaceOpenResult(result, t2);
        await hiloApp2.activateHome();
        void navigate({
          to: "/",
        });
        return;
      } else {
        setActivationFailureStatus(void 0);
        setRuntime(next2);
      }
      setStatusRefreshKey((key2) => key2 + 1);
    } catch (err) {
      setActivationFailureStatus(
        createWorkspaceResumeFailureStatus(
          workspaceId2,
          void 0,
          resumeFailureMessage,
        ),
      );
      setStatusRefreshKey((key2) => key2 + 1);
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
  }, [workspaceId2, retrying, t2, resumeFailureMessage, navigate]);
  const {
    view: view2,
    activeRuntime,
    activeStatus,
    liveRenderableStatus,
    canRenderRetainedContent,
    runtimeIssueStatus,
  } = deriveWorkspaceRuntimeView({
    workspaceId: workspaceId2,
    isActive: isActive2,
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
    workspaceId: workspaceId2,
    isActive: isActive2,
    viewKind: view2.kind,
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
    if (!isActive2 || !runtimeIssueStatus || !canRenderRetainedContent) return;
    const reportKey = [
      runtimeIssueStatus.state,
      runtimeIssueStatus.revision,
      runtimeIssueStatus.diagnosis?.code ?? "unknown",
    ].join(":");
    if (lastReportedRetainedDegradedRef.current === reportKey) return;
    lastReportedRetainedDegradedRef.current = reportKey;
    const msg = `[workspace] runtime degraded; retaining visible workspace content workspace=${workspaceId2} state=${runtimeIssueStatus.state} diagnosis=${runtimeIssueStatus.diagnosis?.code ?? "unknown"}`;
    if (window.hilo?.logger) {
      window.hilo.logger.warn(msg).catch(() => console.warn(msg));
    } else {
      console.warn(msg);
    }
  }, [canRenderRetainedContent, isActive2, runtimeIssueStatus, workspaceId2]);
  reactExports.useEffect(() => {
    return reportWorkspaceRetentionDiagnostics(workspaceId2, {
      isActive: isActive2,
      retainContent,
      hasRuntime: activeRuntime !== void 0,
      statusState: activeStatus?.state,
    });
  }, [
    activeRuntime,
    activeStatus?.state,
    isActive2,
    retainContent,
    workspaceId2,
  ]);
  if (view2.kind === "none") {
    return null;
  }
  if (view2.kind === "error") {
    return (
      <BundleErrorScreen
        status={view2.status}
        retrying={retrying}
        retryCount={retryCount}
        onRetry={retryWorkspace}
      />
    );
  }
  if (view2.kind === "loading") {
    const chatVisible = stageLayout.stageState.workspaceMode !== "canvasOnly";
    const canvasVisible = stageLayout.stageState.workspaceMode !== "chatOnly";
    return (
      <div
        className={isActive2 ? "relative flex h-full w-full" : "hidden"}
        data-workspace-runtime-pending={workspaceId2}
      >
        <WorkspaceStage
          isActive={isActive2}
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
                label={t2(
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
                <CanvasLoadingState label={t2("a11y.loading")} />
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
  const renderableStatus = view2.renderableStatus;
  const contentRuntime = view2.runtime;
  const effectiveRuntime = resolveEffectiveWorkspaceRuntime({
    runtime: contentRuntime,
    renderableStatus,
    activeStatus,
  });
  return (
    <div
      className={isActive2 ? "relative flex h-full w-full" : "hidden"}
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
          isActive={isActive2}
          initialPayloadId={initialPayloadId}
          initialMessage={initialMessage}
          initialAttachments={initialAttachments}
          initialEntityRefs={initialEntityRefs}
          initialModelId={initialModelId}
          initialSelectedMediaModels={initialSelectedMediaModels}
          initialComfyUiWorkflowId={initialComfyUiWorkflowId}
          initialComfyUiWorkflowTarget={initialComfyUiWorkflowTarget}
          onInitialMessageSent={onInitialMessageSent}
          skillPrompt={isActive2 ? skillPrompt : void 0}
          skillName={isActive2 ? skillName : void 0}
          pluginId={isActive2 ? pluginId : void 0}
          menuAction={isActive2 ? menuAction : void 0}
          assetCenterRelocation={isActive2 ? assetCenterRelocation : void 0}
        />
      </GatewayScopeProvider>
      {runtimeIssueStatus && isActive2 ? (
        <WorkspaceRuntimeDegradedBanner
          status={runtimeIssueStatus}
          retrying={retrying}
          onRetry={retryWorkspace}
        />
      ) : null}
    </div>
  );
}
