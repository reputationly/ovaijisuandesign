// retained-workspace-runtime-host.jsx
import { jsxRuntimeExports, useTranslation, reactExports, useNavigate, dedupedToast, useStorage, createAssetMetadataStore } from "../vendor.js";
import { reportWorkspaceRetentionDiagnostics, GatewayScopeProvider } from "../assets/apply-asset-change.jsx";
import { createModelRegistryStore, createRecentlyAddedStore } from "../infra/create-recently-added-store.jsx";
import { buildWorkspaceSearch } from "./create-visible-preview-tabs-store.js";
import { useRouterState, workspaceRuntimeFromOpenResult } from "../vendor-inline/vscode-base/linked-list.js";
import { createGeneratingStateStore } from "../media-editing/parse-item.jsx";
import { normalizeWorkspaceId } from "../settings/run-manual-update-check.js";
import { createCanvasOverlayStore } from "../canvas/use-file-bytes.js";
import { workspaceEvents, useTopbarState, useTopbarActions } from "./use-hub-logo-hover-animation.jsx";
import { createMultiImageOverlayStore } from "../media-editing/use-multi-image-actions.js";
import { useWorkspaceChatSelector, WorkspaceChatProvider } from "../assets/use-asset-picker-host.jsx";
import { instantiationService } from "./browser-inspiration-urls.jsx";
import { redactForCurrentRegion } from "../generation/resolve-chat-file-reference.js";
import { ChatReadinessProvider, resolveChatReadiness } from "../chat/mode-selector.jsx";
import { WorkspaceWSConnectionProvider } from "../settings/compact-rewrite-flow.jsx";
import {
  CanvasLoadingState,
  SessionStoreProvider,
} from "./use-workspace-canvas-persistence.jsx";
import { ChatHistoryLoadingState } from "../chat/session-tab-strip.jsx";
import {
  useCanvasSidebarController,
  WorkspaceAssetCenterRelocationCoachMark,
} from "./home-widget-host.jsx";
import { toastWorkspaceOpenResult } from "./new-workspace-dialog.jsx";
import {
  AssetMetadataStoreProvider,
  GeneratingStateStoreProvider,
} from "../canvas/generating-media-area.jsx";
import { shouldRefreshStatusOnResume, BundleErrorScreen } from "../infra/bundle-error-screen.jsx";
import { ModelRegistryStoreProvider } from "../generation/create-tracker.jsx";
import {
  isGatewayReady,
  SessionTaskSnapshotCache,
  useBundleStatus,
  requestRecentWorkspacesRefresh,
  AutoFeedbackToastListener,
  acknowledgeHomeDraftHandoff,
} from "../media-editing/remote-tool-host.jsx";
import { IHiloApp } from "../settings/instantiation-service.js";
import { replaceVisiblePreviewTab } from "../infra/error-fallback-ui.jsx";
import { AssetSourcePickerProvider } from "../text-editor/image-annotation-dialog.jsx";
import { CanvasOverlayStoreProvider } from "../media-editing/calc-crop-rect.jsx";
import { MultiImageOverlayStoreProvider } from "../media-editing/image-node-toolbar-section.jsx";
import { RecentlyAddedStoreProvider } from "../canvas/use-inline-rename.jsx";
import { WorkspaceInitialPayloadCache } from "../settings/im-bridge-manager.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  createWorkspaceResumeFailureStatus,
  deriveWorkspaceRuntimeView,
  isInitialAttachmentAdoptionReady,
  resolveEffectiveWorkspaceRuntime,
  resyncRuntimeGatewayBinding,
  useAdoptInitialAttachments,
} from "./use-adopt-initial-attachments.jsx";
import {
  PendingComfyUiWorkflowOpener,
  PluginInstantiator,
  RetainedHeavyContent,
  useRetainInactiveWorkspaceContent,
} from "../media-editing/use-browser-video-download.jsx";
import {
  WorkspaceCanvasAutoRevealBridge,
  WorkspaceCanvasFocusCoordinator,
} from "./workspace-canvas-focus-coordinator.jsx";
import {
  MenuActionInjector,
  SkillPromptInjector,
  WorkspaceContent,
  getLatestUserPromptPreview,
  normalizeTaskPromptPreview,
  patchCanvasTasks,
} from "./workspace-content.jsx";
import {
  DEFAULT_WORKSPACE_CHAT_RATIO,
  DEFAULT_WORKSPACE_PANE_ORDER,
  createWorkspaceStageState,
  queueWorkspacePaneOrderSet,
  rebaseWorkspaceStageActions,
  resolveWorkspaceActivationResult,
  resolveWorkspacePaneOrderIntent,
  shouldAnnounceRecoveryNotice,
  useWorkspaceRuntimeViewDiagnostics,
  workspaceStageReducer,
} from "./workspace-stage-reducer.jsx";
import { WorkspaceRuntimeDegradedBanner, WorkspaceStage } from "./workspace-stage.jsx";
function WorkspaceTopbarBridge({ runtime, canvasTasks, setCanvasTasks }) {
  const { reportWorkspaceSnapshot, reportTaskCompleted } = useTopbarActions();
  const sessions = useWorkspaceChatSelector((chat) => chat.sessions);
  const textEditSessionIds = useWorkspaceChatSelector((chat) => chat.textEditSessionIds);
  const sessionStore = useWorkspaceChatSelector((chat) => chat.sessionStore);
  const sendWsMessage = useWorkspaceChatSelector((chat) => chat.sendWsMessage);
  const [storeVersion, setStoreVersion] = reactExports.useState(0);
  const taskSnapshotCache = reactExports.useMemo(() => new SessionTaskSnapshotCache(), []);
  const getTopbarStoreKey = reactExports.useCallback(() => {
    const state2 = sessionStore.getState();
    const activeSessionIds = new Set();
    const sessionKey = Array.from(state2.sessions.values())
      .map((session) => {
        activeSessionIds.add(session.id);
        const taskSnapshot = taskSnapshotCache.get({
          sessionId: session.id,
          userAttentionRevision: session.userAttentionRevision,
          busy: session.busy,
          pendingReasons: session.pendingReasons,
          messages: session.messages,
        });
        return [
          session.id,
          session.name,
          session.displayName ?? "",
          session.folder ?? "",
          session.modelId ?? "",
          session.messages.length,
          taskSnapshot.status,
          taskSnapshot.userActionId ?? "",
          session.busy ? "1" : "0",
          session.hasUnread ? "1" : "0",
          session.pendingReasons.length,
        ].join("");
      })
      .join("");
    taskSnapshotCache.retain(activeSessionIds);
    return [state2.focusedSessionId ?? "", state2.openedTabOrder.join(""), sessionKey].join("");
  }, [sessionStore, taskSnapshotCache]);
  reactExports.useEffect(() => {
    let prevKey = getTopbarStoreKey();
    return sessionStore.subscribe(() => {
      const nextKey = getTopbarStoreKey();
      if (nextKey === prevKey) return;
      prevKey = nextKey;
      setStoreVersion((v2) => v2 + 1);
    });
  }, [getTopbarStoreKey, sessionStore]);
  const searchSessions = reactExports.useMemo(
    () =>
      sessions
        .filter(
          (session) =>
            !textEditSessionIds.has(session.id) &&
            !(session.runtime_session_id
              ? textEditSessionIds.has(session.runtime_session_id)
              : false),
        )
        .map((session) => ({
          id: session.id,
          name: redactForCurrentRegion(session.display_name || session.name),
          folder: session.folder ?? runtime.folderPath,
          messageCount: session.message_count,
          createdAt: session.created_at,
        })),
    [runtime.folderPath, sessions, textEditSessionIds],
  );
  reactExports.useEffect(() => {
    return sessionStore.onCanvasUpdated((update2) => {
      setCanvasTasks((prev) => patchCanvasTasks(prev, update2));
    });
  }, [sessionStore, setCanvasTasks]);
  const tasks = reactExports.useMemo(() => {
    const sessionState = sessionStore.getState();
    const sessionTasks = sessions.flatMap((session) => {
      const storeSession = sessionState.sessions.get(session.id);
      if (!storeSession) return [];
      const taskSnapshot = taskSnapshotCache.get({
        sessionId: storeSession.id,
        userAttentionRevision: storeSession.userAttentionRevision,
        busy: storeSession.busy,
        pendingReasons: storeSession.pendingReasons,
        messages: storeSession.messages,
      });
      const status = taskSnapshot.status;
      if (status === "idle") return [];
      return [
        {
          id: `${runtime.workspaceId}:${session.id}`,
          workspaceId: runtime.workspaceId,
          workspaceName: runtime.projectName,
          sessionId: session.id,
          sessionName: redactForCurrentRegion(session.display_name || session.name),
          promptPreview: getLatestUserPromptPreview(storeSession?.messages),
          source: "chat",
          status,
          userActionId: taskSnapshot.userActionId,
        },
      ];
    });
    const canvasTaskInfos = canvasTasks.map((task) => ({
      id: `${runtime.workspaceId}:canvas:${task.id}`,
      workspaceId: runtime.workspaceId,
      workspaceName: runtime.projectName,
      sessionId: `canvas:${task.id}`,
      sessionName: task.label,
      promptPreview: normalizeTaskPromptPreview(task.label),
      source: "canvas",
      estimatedDuration: task.detail,
    }));
    return [...sessionTasks, ...canvasTaskInfos];
  }, [
    canvasTasks,
    runtime.projectName,
    runtime.workspaceId,
    sessionStore,
    sessions,
    storeVersion,
    taskSnapshotCache,
  ]);
  reactExports.useEffect(() => {
    reportWorkspaceSnapshot(runtime.workspaceId, {
      sessions: searchSessions,
      tasks,
    });
  }, [reportWorkspaceSnapshot, runtime.workspaceId, searchSessions, tasks]);
  reactExports.useEffect(() => {
    return sessionStore.onSessionCompleted((sessionId) => {
      const session = sessions.find((s2) => s2.id === sessionId);
      if (!session) return;
      const storeSession = sessionStore.getState().sessions.get(sessionId);
      reportTaskCompleted({
        id: `${runtime.workspaceId}:${sessionId}`,
        workspaceId: runtime.workspaceId,
        workspaceName: runtime.projectName,
        sessionId,
        sessionName: redactForCurrentRegion(session.display_name || session.name),
        promptPreview: getLatestUserPromptPreview(storeSession?.messages),
      });
    });
  }, [reportTaskCompleted, runtime.workspaceId, runtime.projectName, sessionStore, sessions]);
  reactExports.useEffect(() => {
    const canvasFocus2 = workspaceEvents.onCanvasFocus(
      ({ workspaceId: workspaceId2, nodeIds, select: select2, preferParentGroup }) => {
        if (workspaceId2 !== runtime.workspaceId) return;
        sessionStore.notifyCanvasFocus({
          type: "canvas_focus",
          nodeIds,
          padding: 0.2,
          duration: 400,
          select: select2,
          preferParentGroup,
        });
      },
    );
    const switchSession = workspaceEvents.onSwitchSession(
      ({ workspaceId: workspaceId2, sessionId }) => {
        if (workspaceId2 !== runtime.workspaceId) return;
        sendWsMessage({
          type: "switch_session",
          session_id: sessionId,
        });
      },
    );
    workspaceEvents.fireSubscribersReady(runtime.workspaceId);
    return () => {
      workspaceEvents.clearSubscribersReady(runtime.workspaceId);
      canvasFocus2.dispose();
      switchSession.dispose();
    };
  }, [runtime.workspaceId, sendWsMessage, sessionStore]);
  return null;
}
function parseInitialAttachments$1(value) {
  if (Array.isArray(value) && value.every((v2) => typeof v2 === "string")) {
    return value;
  }
  if (typeof value !== "string") return void 0;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((v2) => typeof v2 === "string")) return parsed;
  } catch {}
  return void 0;
}
function parseInitialSelectedMediaModels$1(value) {
  let raw2 = value;
  if (typeof value === "string") {
    try {
      raw2 = JSON.parse(value);
    } catch {
      return void 0;
    }
  }
  if (!raw2 || typeof raw2 !== "object" || Array.isArray(raw2)) return void 0;
  const obj = raw2;
  const pick = (key2) => {
    const list2 = obj[key2];
    if (list2 === void 0) return void 0;
    if (Array.isArray(list2) && list2.every((id2) => typeof id2 === "string")) return list2;
    return void 0;
  };
  const result = {};
  const image2 = pick("image");
  const video = pick("video");
  const audio = pick("audio");
  if (image2 !== void 0) result.image = image2;
  if (video !== void 0) result.video = video;
  if (audio !== void 0) result.audio = audio;
  return result;
}
function useWorkspaceRouteState() {
  return useRouterState({
    select: (state2) => {
      const pathname = state2.location.pathname;
      if (!pathname.startsWith("/workspace"))
        return {
          active: false,
        };
      const search2 = state2.location.search;
      return {
        active: true,
        workspaceId: normalizeWorkspaceId(search2.workspaceId),
        initialPayloadId:
          typeof search2.initialPayloadId === "string" ? search2.initialPayloadId : void 0,
        initialMessage: search2.initialMessage != null ? String(search2.initialMessage) : void 0,
        initialAttachments: parseInitialAttachments$1(search2.initialAttachments),
        initialEntityRefs: parseInitialAttachments$1(search2.initialEntityRefs),
        initialModelId:
          typeof search2.initialModelId === "string" ? search2.initialModelId : void 0,
        initialSelectedMediaModels: parseInitialSelectedMediaModels$1(
          search2.initialSelectedMediaModels,
        ),
        initialComfyUiWorkflowId:
          typeof search2.initialComfyUiWorkflowId === "string" &&
          search2.initialComfyUiWorkflowId.trim()
            ? search2.initialComfyUiWorkflowId
            : void 0,
        initialComfyUiWorkflowTarget:
          search2.initialComfyUiWorkflowTarget === "current" ||
          search2.initialComfyUiWorkflowTarget === "new"
            ? search2.initialComfyUiWorkflowTarget
            : void 0,
        skillPrompt: typeof search2.skillPrompt === "string" ? search2.skillPrompt : void 0,
        skillName: typeof search2.skillName === "string" ? search2.skillName : void 0,
        pluginId: typeof search2.pluginId === "string" ? search2.pluginId : void 0,
        menuAction:
          search2.menuAction === "new-chat" || search2.menuAction === "open-settings"
            ? search2.menuAction
            : void 0,
        assetCenterRelocation: search2.assetCenterRelocation === true,
      };
    },
  });
}
function RetainedWorkspaceRuntimeHost({
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
  const [lastRenderableStatus, setLastRenderableStatus] = reactExports.useState(void 0);
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
  const [activationFailureStatus, setActivationFailureStatus] = reactExports.useState(void 0);
  const [retryCount, setRetryCount] = reactExports.useState(0);
  const lastReportedRetainedDegradedRef = reactExports.useRef(void 0);
  const retainContent = useRetainInactiveWorkspaceContent();
  const status = useBundleStatus(workspaceId2, statusRefreshKey, {
    enabled: isActive2 || runtime !== void 0,
  });
  const latestStatusStateRef = reactExports.useRef(void 0);
  latestStatusStateRef.current = status?.workspaceId === workspaceId2 ? status.state : void 0;
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
    setLastRenderableStatus((prev) => (prev?.workspaceId === workspaceId2 ? prev : void 0));
    setActivationFailureStatus(void 0);
    lastReportedRetainedDegradedRef.current = void 0;
    let disposed = false;
    const lastState = latestStatusStateRef.current;
    const resumingFromDeadHandle = shouldRefreshStatusOnResume(isActive2, lastState);
    const hiloApp2 = instantiationService.invokeFunction((accessor) => accessor.get(IHiloApp));
    const activationPromise = isActive2
      ? hiloApp2.activateWorkspaceWithResult(workspaceId2).then(resolveWorkspaceActivationResult)
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
            createWorkspaceResumeFailureStatus(workspaceId2, void 0, resumeFailureMessage),
          );
        }
      })
      .catch((err) => {
        if (disposed) return;
        if (isActive2) {
          setActivationFailureStatus(
            createWorkspaceResumeFailureStatus(workspaceId2, void 0, resumeFailureMessage),
          );
        }
        const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
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
      const hiloApp2 = instantiationService.invokeFunction((accessor) => accessor.get(IHiloApp));
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
    const hiloApp2 = instantiationService.invokeFunction((accessor) => accessor.get(IHiloApp));
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
      const hiloApp2 = instantiationService.invokeFunction((accessor) => accessor.get(IHiloApp));
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
        createWorkspaceResumeFailureStatus(workspaceId2, void 0, resumeFailureMessage),
      );
      setStatusRefreshKey((key2) => key2 + 1);
      const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
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
  }, [activeRuntime, activeStatus?.state, isActive2, retainContent, workspaceId2]);
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
            <div className="flex h-full min-h-0 flex-col" data-chat-loading-motion="breathe">
              <ChatHistoryLoadingState
                label={t2("chat.starting.placeholder", "Agent is getting ready...")}
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
        gatewayReady={runtimeIssueStatus === void 0 && isGatewayReady(renderableStatus.state)}
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
function normalizeWorkspaceChatRatio(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(0.72, Math.max(0, value))
    : DEFAULT_WORKSPACE_CHAT_RATIO;
}
function normalizeWorkspacePaneOrder(value) {
  return value === "chat-canvas" || value === "canvas-chat" ? value : DEFAULT_WORKSPACE_PANE_ORDER;
}
function useWorkspaceStageLayout(workspaceId2, isActive2) {
  const [layoutConfig, setLayoutConfig, setLayoutConfigAsync, layoutHydrated] =
    useStorage("global.config");
  const persistedStageState = layoutConfig.workspaceStageLayouts?.[workspaceId2];
  const paneOrder = normalizeWorkspacePaneOrder(layoutConfig.workspacePaneOrder);
  const [stageState, dispatchStage] = reactExports.useReducer(
    workspaceStageReducer,
    {
      ...persistedStageState,
      paneOrder,
    },
    createWorkspaceStageState,
  );
  const stageRevisionRef = reactExports.useRef(0);
  const stageScheduledRevisionRef = reactExports.useRef(0);
  const stageRetryCountRef = reactExports.useRef(0);
  const stageRetryTimerRef = reactExports.useRef(void 0);
  const [stagePersistenceRetry, setStagePersistenceRetry] = reactExports.useState(0);
  const [stageLayoutReady, setStageLayoutReady] = reactExports.useState(false);
  const stageLayoutReadyRef = reactExports.useRef(false);
  const pendingStageActionsRef = reactExports.useRef([]);
  const effectiveStageState = reactExports.useMemo(() => {
    const visibleState = stageLayoutReady
      ? stageState
      : createWorkspaceStageState({
          ...persistedStageState,
          paneOrder,
        });
    return visibleState.paneOrder === paneOrder
      ? visibleState
      : {
          ...visibleState,
          paneOrder,
        };
  }, [paneOrder, persistedStageState, stageLayoutReady, stageState]);
  const [chatRatio, setChatRatio] = reactExports.useState(() =>
    normalizeWorkspaceChatRatio(layoutConfig.workspaceChatRatio),
  );
  const chatRatioRef = reactExports.useRef(chatRatio);
  chatRatioRef.current = chatRatio;
  const chatRatioRevisionRef = reactExports.useRef(0);
  const chatRatioScheduledRevisionRef = reactExports.useRef(0);
  const chatRatioRetryCountRef = reactExports.useRef(0);
  const chatRatioRetryTimerRef = reactExports.useRef(void 0);
  const [chatRatioPersistenceRetry, setChatRatioPersistenceRetry] = reactExports.useState(0);
  const persistenceMountedRef = reactExports.useRef(true);
  reactExports.useEffect(() => {
    persistenceMountedRef.current = true;
    return () => {
      persistenceMountedRef.current = false;
      if (stageRetryTimerRef.current !== void 0) {
        window.clearTimeout(stageRetryTimerRef.current);
      }
      if (chatRatioRetryTimerRef.current !== void 0) {
        window.clearTimeout(chatRatioRetryTimerRef.current);
      }
    };
  }, []);
  const markStageIntent = reactExports.useCallback(() => {
    stageRevisionRef.current += 1;
    stageRetryCountRef.current = 0;
    if (stageRetryTimerRef.current !== void 0) {
      window.clearTimeout(stageRetryTimerRef.current);
      stageRetryTimerRef.current = void 0;
    }
  }, []);
  reactExports.useEffect(() => {
    if (!layoutHydrated) {
      stageLayoutReadyRef.current = false;
      setStageLayoutReady(false);
      return;
    }
    if (stageLayoutReadyRef.current && stageRevisionRef.current !== 0) return;
    const restoredState = createWorkspaceStageState({
      ...persistedStageState,
      paneOrder,
    });
    const pendingActions = stageLayoutReadyRef.current ? [] : pendingStageActionsRef.current;
    pendingStageActionsRef.current = [];
    const nextState = rebaseWorkspaceStageActions(restoredState, pendingActions);
    dispatchStage({
      type: "state/restore",
      state: nextState,
    });
    stageLayoutReadyRef.current = true;
    setStageLayoutReady(true);
    if (pendingActions.length > 0) {
      markStageIntent();
    }
  }, [layoutHydrated, markStageIntent, paneOrder, persistedStageState]);
  reactExports.useEffect(() => {
    if (!layoutHydrated || chatRatioRevisionRef.current !== 0) return;
    const next2 = normalizeWorkspaceChatRatio(layoutConfig.workspaceChatRatio);
    chatRatioRef.current = next2;
    setChatRatio((previous2) => (previous2 === next2 ? previous2 : next2));
  }, [layoutConfig.workspaceChatRatio, layoutHydrated]);
  const dispatchStageWithIntent = reactExports.useCallback(
    (action) => {
      if (!layoutHydrated || !stageLayoutReadyRef.current) {
        pendingStageActionsRef.current.push(action);
        return;
      }
      markStageIntent();
      dispatchStage(action);
    },
    [layoutHydrated, markStageIntent],
  );
  const [browserOpen, setBrowserOpen] = reactExports.useState(false);
  const canvasPaneRef = reactExports.useRef(null);
  const handleCanvasPaneChange = reactExports.useCallback((pane) => {
    canvasPaneRef.current = pane;
  }, []);
  const getCanvasPane = reactExports.useCallback(() => canvasPaneRef.current, []);
  const handleEnsureCanvasVisible = reactExports.useCallback(() => {
    setBrowserOpen(false);
    dispatchStageWithIntent({
      type: "canvas/open",
    });
  }, [dispatchStageWithIntent]);
  const pendingPaneOrderIntentRef = reactExports.useRef(null);
  const applyHydratedPaneOrderIntent = reactExports.useCallback(
    (intent) => {
      setLayoutConfig((previous2) => {
        const currentOrder = normalizeWorkspacePaneOrder(previous2.workspacePaneOrder);
        const nextOrder = resolveWorkspacePaneOrderIntent(currentOrder, intent);
        return currentOrder === nextOrder
          ? previous2
          : {
              ...previous2,
              workspacePaneOrder: nextOrder,
            };
      });
    },
    [setLayoutConfig],
  );
  const handlePaneOrderChange = reactExports.useCallback(
    (targetOrder) => {
      const intent = queueWorkspacePaneOrderSet(targetOrder);
      if (!layoutHydrated) {
        pendingPaneOrderIntentRef.current = intent;
        return;
      }
      applyHydratedPaneOrderIntent(intent);
    },
    [applyHydratedPaneOrderIntent, layoutHydrated],
  );
  reactExports.useEffect(() => {
    const pendingIntent = pendingPaneOrderIntentRef.current;
    if (!layoutHydrated || !pendingIntent) return;
    pendingPaneOrderIntentRef.current = null;
    applyHydratedPaneOrderIntent(pendingIntent);
  }, [applyHydratedPaneOrderIntent, layoutHydrated]);
  reactExports.useEffect(() => {
    const revision = stageRevisionRef.current;
    if (!stageLayoutReady || revision === 0 || revision <= stageScheduledRevisionRef.current) {
      return;
    }
    stageScheduledRevisionRef.current = revision;
    const persistedFilesMode = stageState.filesMode === "docked" ? "docked" : "closed";
    const snapshot2 = {
      workspaceMode: stageState.workspaceMode,
      // Keep the legacy projection so an older renderer still opens the same
      // Canvas after reading a snapshot written by this version.
      canvasVisibility: stageState.canvasVisibility,
      filesMode: persistedFilesMode,
      autoReveal: stageState.autoReveal,
    };
    void setLayoutConfigAsync((previous2) => {
      const current2 = previous2.workspaceStageLayouts?.[workspaceId2];
      if (
        current2?.workspaceMode === snapshot2.workspaceMode &&
        current2?.canvasVisibility === snapshot2.canvasVisibility &&
        current2?.filesMode === snapshot2.filesMode &&
        current2?.autoReveal === snapshot2.autoReveal
      ) {
        return previous2;
      }
      return {
        ...previous2,
        workspaceStageLayouts: {
          ...previous2.workspaceStageLayouts,
          [workspaceId2]: snapshot2,
        },
      };
    }).then((persisted) => {
      if (!persistenceMountedRef.current) return;
      if (stageRevisionRef.current !== revision) return;
      if (persisted) {
        stageRevisionRef.current = 0;
        stageScheduledRevisionRef.current = 0;
        stageRetryCountRef.current = 0;
        return;
      }
      if (stageRetryCountRef.current >= 1) return;
      stageRetryCountRef.current += 1;
      stageScheduledRevisionRef.current = revision - 1;
      stageRetryTimerRef.current = window.setTimeout(() => {
        stageRetryTimerRef.current = void 0;
        setStagePersistenceRetry((value) => value + 1);
      }, 500);
    });
  }, [setLayoutConfigAsync, stageLayoutReady, stagePersistenceRetry, stageState, workspaceId2]);
  reactExports.useEffect(() => {
    const revision = chatRatioRevisionRef.current;
    if (!layoutHydrated || revision === 0 || revision <= chatRatioScheduledRevisionRef.current) {
      return;
    }
    const timeout2 = window.setTimeout(() => {
      chatRatioScheduledRevisionRef.current = revision;
      void setLayoutConfigAsync((previous2) =>
        previous2.workspaceChatRatio === chatRatio
          ? previous2
          : {
              ...previous2,
              workspaceChatRatio: chatRatio,
            },
      ).then((persisted) => {
        if (!persistenceMountedRef.current) return;
        if (chatRatioRevisionRef.current !== revision) return;
        if (persisted) {
          chatRatioRevisionRef.current = 0;
          chatRatioScheduledRevisionRef.current = 0;
          chatRatioRetryCountRef.current = 0;
          return;
        }
        if (chatRatioRetryCountRef.current >= 1) return;
        chatRatioRetryCountRef.current += 1;
        chatRatioScheduledRevisionRef.current = revision - 1;
        chatRatioRetryTimerRef.current = window.setTimeout(() => {
          chatRatioRetryTimerRef.current = void 0;
          setChatRatioPersistenceRetry((value) => value + 1);
        }, 500);
      });
    }, 250);
    return () => window.clearTimeout(timeout2);
  }, [chatRatio, chatRatioPersistenceRetry, layoutHydrated, setLayoutConfigAsync]);
  const handleChatRatioChange = reactExports.useCallback((nextRatio) => {
    const normalized = normalizeWorkspaceChatRatio(nextRatio);
    if (Math.abs(chatRatioRef.current - normalized) < 5e-4) return;
    chatRatioRef.current = normalized;
    chatRatioRevisionRef.current += 1;
    chatRatioRetryCountRef.current = 0;
    if (chatRatioRetryTimerRef.current !== void 0) {
      window.clearTimeout(chatRatioRetryTimerRef.current);
      chatRatioRetryTimerRef.current = void 0;
    }
    setChatRatio(normalized);
  }, []);
  const handleAssetPanelExpandedChange = reactExports.useCallback(
    (expanded) => {
      dispatchStageWithIntent(
        expanded
          ? {
              type: "files/open",
              mode: "docked",
            }
          : {
              type: "files/close",
            },
      );
    },
    [dispatchStageWithIntent],
  );
  const assetPanel = useCanvasSidebarController({
    isActive: isActive2,
    expanded: effectiveStageState.filesMode !== "closed",
    onExpandedChange: handleAssetPanelExpandedChange,
    resizeFrom: "left",
  });
  return {
    browserOpen,
    setBrowserOpen,
    assetPanel,
    stageState: effectiveStageState,
    dispatchStage: dispatchStageWithIntent,
    handlePaneOrderChange,
    chatRatio,
    handleChatRatioChange,
    handleCanvasPaneChange,
    getCanvasPane,
    handleEnsureCanvasVisible,
    stageLayoutReady,
  };
}
function WorkspaceRuntimeContent({
  runtime,
  status,
  stageLayout,
  runtimeUnavailable = false,
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
  const initialAttachmentAdoption = useAdoptInitialAttachments(
    initialAttachments,
    runtime.folderPath,
    isInitialAttachmentAdoptionReady(status, runtimeUnavailable),
    initialPayloadId,
  );
  reactExports.useEffect(() => {
    const toastId = `initial-attachment-adoption:${runtime.workspaceId}`;
    if (!initialAttachmentAdoption.error) {
      dedupedToast.dismiss(toastId);
      return;
    }
    dedupedToast.error(
      t2("workspace.initialAttachments.failed", {
        defaultValue: "图片迁移到工作区失败，首条消息尚未发送。",
      }),
      {
        id: toastId,
        duration: Number.POSITIVE_INFINITY,
        description: initialAttachmentAdoption.error,
        action: {
          label: t2("common.retry", "重试"),
          onClick: initialAttachmentAdoption.retry,
        },
      },
    );
    return () => {
      dedupedToast.dismiss(toastId);
    };
  }, [initialAttachmentAdoption.error, initialAttachmentAdoption.retry, runtime.workspaceId, t2]);
  const {
    browserOpen,
    setBrowserOpen,
    assetPanel,
    stageState: effectiveStageState,
    dispatchStage: dispatchStageWithIntent,
    handlePaneOrderChange,
    chatRatio,
    handleChatRatioChange,
    handleCanvasPaneChange,
    getCanvasPane,
    handleEnsureCanvasVisible,
    stageLayoutReady,
  } = stageLayout;
  const assetMetadataStore = reactExports.useMemo(() => createAssetMetadataStore(), []);
  const canvasOverlayStore = reactExports.useMemo(() => createCanvasOverlayStore(), []);
  const generatingStateStore = reactExports.useMemo(() => createGeneratingStateStore(), []);
  const modelRegistryStore = reactExports.useMemo(() => createModelRegistryStore(), []);
  const multiImageOverlayStore = reactExports.useMemo(() => createMultiImageOverlayStore(), []);
  const recentlyAddedStore = reactExports.useMemo(() => createRecentlyAddedStore(), []);
  const [canvasTasks, setCanvasTasks] = reactExports.useState([]);
  const [hasRenderableCanvasContent2, setHasRenderableCanvasContent] = reactExports.useState(false);
  const handleCanvasTasksChange = reactExports.useCallback((tasks) => {
    setCanvasTasks(tasks);
  }, []);
  const handleRenderableCanvasContentChange = reactExports.useCallback((hasRenderableContent) => {
    setHasRenderableCanvasContent(hasRenderableContent);
  }, []);
  const handleAutoRevealCanvas = reactExports.useCallback(() => {
    dispatchStageWithIntent({
      type: "canvas/auto-reveal",
    });
  }, [dispatchStageWithIntent]);
  return (
    <SessionStoreProvider>
      <AssetMetadataStoreProvider store={assetMetadataStore}>
        <AssetSourcePickerProvider>
          <CanvasOverlayStoreProvider store={canvasOverlayStore}>
            <GeneratingStateStoreProvider store={generatingStateStore}>
              <MultiImageOverlayStoreProvider store={multiImageOverlayStore}>
                <ModelRegistryStoreProvider store={modelRegistryStore}>
                  <RecentlyAddedStoreProvider store={recentlyAddedStore}>
                    <WorkspaceWSConnectionProvider
                      wsUrl={runtime.wsUrl}
                      syncCanvasAssetMetadata={isActive2}
                    >
                      <AutoFeedbackToastListener
                        workspaceId={runtime.workspaceId}
                        isActive={isActive2}
                      />
                      <ChatReadinessProvider
                        value={resolveChatReadiness(status, runtimeUnavailable)}
                      >
                        <WorkspaceChatProvider
                          folderPath={runtime.folderPath}
                          initialPayloadId={initialPayloadId}
                          initialMessage={initialMessage}
                          initialAttachments={initialAttachmentAdoption.attachments}
                          initialAttachmentRefs={initialAttachmentAdoption.attachmentRefs}
                          initialEntityRefs={initialEntityRefs}
                          initialPayloadReady={initialAttachmentAdoption.ready}
                          initialModelId={initialModelId}
                          initialSelectedMediaModels={initialSelectedMediaModels}
                          onInitialMessageSent={onInitialMessageSent}
                          isActive={isActive2}
                        >
                          <PendingComfyUiWorkflowOpener
                            workflowId={initialComfyUiWorkflowId}
                            target={initialComfyUiWorkflowTarget}
                            workspaceId={runtime.workspaceId}
                            isActive={isActive2}
                          />
                          <WorkspaceCanvasFocusCoordinator
                            workspaceId={runtime.workspaceId}
                            isActive={isActive2}
                            canvasVisible={effectiveStageState.workspaceMode !== "chatOnly"}
                            browserOpen={browserOpen}
                            onEnsureCanvasVisible={handleEnsureCanvasVisible}
                            getCanvasPane={getCanvasPane}
                          />
                          <WorkspaceTopbarBridge
                            runtime={runtime}
                            canvasTasks={canvasTasks}
                            setCanvasTasks={setCanvasTasks}
                          />
                          <WorkspaceCanvasAutoRevealBridge
                            isActive={isActive2 && stageLayoutReady}
                            hasRenderableContent={hasRenderableCanvasContent2}
                            autoReveal={effectiveStageState.autoReveal}
                            onAutoReveal={handleAutoRevealCanvas}
                          />
                          {isActive2 ? (
                            <>
                              <SkillPromptInjector
                                skillPrompt={skillPrompt}
                                skillName={skillName}
                                workspaceId={runtime.workspaceId}
                              />
                              <PluginInstantiator
                                pluginId={pluginId}
                                workspaceId={runtime.workspaceId}
                                folderPath={runtime.folderPath}
                              />
                              <MenuActionInjector
                                skillPrompt={skillPrompt}
                                menuAction={menuAction}
                                workspaceId={runtime.workspaceId}
                              />
                            </>
                          ) : null}
                          <RetainedHeavyContent isActive={isActive2}>
                            <WorkspaceContent
                              assetPanel={assetPanel}
                              stageState={effectiveStageState}
                              dispatchStage={dispatchStageWithIntent}
                              onPaneOrderChange={handlePaneOrderChange}
                              chatRatio={chatRatio}
                              onChatRatioChange={handleChatRatioChange}
                              onCanvasPaneChange={handleCanvasPaneChange}
                              browserOpen={browserOpen}
                              setBrowserOpen={setBrowserOpen}
                              folderPath={runtime.folderPath}
                              onCanvasTasksChange={handleCanvasTasksChange}
                              onRenderableContentChange={handleRenderableCanvasContentChange}
                              isActive={isActive2}
                              workspaceId={runtime.workspaceId}
                              workspaceName={runtime.projectName}
                              stageLayoutReady={stageLayoutReady}
                            />
                          </RetainedHeavyContent>
                          <WorkspaceAssetCenterRelocationCoachMark
                            enabled={
                              isActive2 && Boolean(assetCenterRelocation) && stageLayoutReady
                            }
                            workspaceId={runtime.workspaceId}
                          />
                        </WorkspaceChatProvider>
                      </ChatReadinessProvider>
                    </WorkspaceWSConnectionProvider>
                  </RecentlyAddedStoreProvider>
                </ModelRegistryStoreProvider>
              </MultiImageOverlayStoreProvider>
            </GeneratingStateStoreProvider>
          </CanvasOverlayStoreProvider>
        </AssetSourcePickerProvider>
      </AssetMetadataStoreProvider>
    </SessionStoreProvider>
  );
}
export function RetainedWorkspaceRuntimeLayer() {
  const {
    active: active2,
    workspaceId: workspaceId2,
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
  } = useWorkspaceRouteState();
  const { entries: entries2 } = useTopbarState();
  const navigate = useNavigate();
  const initialPayloadCacheRef = reactExports.useRef(new WorkspaceInitialPayloadCache());
  const seenEntryIdsRef = reactExports.useRef(new Set());
  const seenLiveWorkspaceIdsRef = reactExports.useRef(new Set());
  const retainedWorkspaceIds = reactExports.useMemo(() => {
    const ids2 = entries2.filter((entry) => entry.gatewayUrl).map((entry) => entry.workspaceId);
    if (workspaceId2 && !ids2.includes(workspaceId2)) ids2.push(workspaceId2);
    return ids2;
  }, [entries2, workspaceId2]);
  initialPayloadCacheRef.current.capture(workspaceId2, {
    initialPayloadId,
    initialMessage,
    initialAttachments,
    initialEntityRefs,
    initialModelId,
    initialSelectedMediaModels,
  });
  reactExports.useEffect(() => {
    const entryIds = new Set(entries2.map((entry) => entry.workspaceId));
    initialPayloadCacheRef.current.cleanupClosed(entryIds, seenEntryIdsRef.current, workspaceId2);
    const liveIds = new Set(
      entries2.filter((entry) => entry.gatewayUrl).map((entry) => entry.workspaceId),
    );
    for (const liveId of liveIds) seenLiveWorkspaceIdsRef.current.add(liveId);
    for (const seenId of [...seenLiveWorkspaceIdsRef.current]) {
      if (liveIds.has(seenId)) continue;
      workspaceEvents.clearSubscribersReady(seenId);
      seenLiveWorkspaceIdsRef.current.delete(seenId);
    }
  }, [entries2, workspaceId2]);
  return (
    // WorkbenchShell provides the positioned right-content slot. Keep this
    // layer scoped to that slot so it never covers the full-height global sidebar.
    <div
      className={
        active2
          ? "transparent-window-workspace-shell absolute inset-0 z-10 flex bg-background"
          : "hidden"
      }
    >
      {retainedWorkspaceIds.map((id2) => (
        <RetainedWorkspaceRuntimeHost
          key={id2}
          workspaceId={id2}
          isActive={active2 && id2 === workspaceId2}
          initialPayloadId={initialPayloadCacheRef.current.get(id2)?.initialPayloadId}
          initialMessage={initialPayloadCacheRef.current.get(id2)?.initialMessage}
          initialAttachments={initialPayloadCacheRef.current.get(id2)?.initialAttachments}
          initialEntityRefs={initialPayloadCacheRef.current.get(id2)?.initialEntityRefs}
          initialModelId={initialPayloadCacheRef.current.get(id2)?.initialModelId}
          initialSelectedMediaModels={
            initialPayloadCacheRef.current.get(id2)?.initialSelectedMediaModels
          }
          initialComfyUiWorkflowId={
            active2 && id2 === workspaceId2 ? initialComfyUiWorkflowId : void 0
          }
          initialComfyUiWorkflowTarget={
            active2 && id2 === workspaceId2 ? initialComfyUiWorkflowTarget : void 0
          }
          onInitialMessageSent={() => {
            const payload = initialPayloadCacheRef.current.get(id2);
            initialPayloadCacheRef.current.consume(id2);
            if (payload?.initialPayloadId) {
              acknowledgeHomeDraftHandoff(payload.initialPayloadId);
            }
            if (
              active2 &&
              workspaceId2 === id2 &&
              payload &&
              (!payload.initialPayloadId || payload.initialPayloadId === initialPayloadId)
            ) {
              void navigate({
                to: "/workspace",
                replace: true,
                search: buildWorkspaceSearch(id2, {
                  skillPrompt,
                  skillName,
                  pluginId,
                  menuAction,
                  assetCenterRelocation,
                }),
              });
            }
          }}
          skillPrompt={skillPrompt}
          skillName={skillName}
          pluginId={pluginId}
          menuAction={menuAction}
          assetCenterRelocation={active2 && id2 === workspaceId2 ? assetCenterRelocation : void 0}
        />
      ))}
    </div>
  );
}
