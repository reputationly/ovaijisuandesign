// workspace-runtime-content.jsx
import { API_PATHS, jsxRuntimeExports, reactExports, useNavigate, useTranslation } from "../vendor.js";
import { createAssetMetadataStore, dedupedToast } from "../infra/agent-http-client.js";
import { buildWorkspaceSearch } from "./use-deep-link-router.js";
import { useTopbarActions, workspaceEvents } from "./topbar-state-context.jsx";
import {
  useGatewayFetch,
  useGatewayReady,
} from "../generation/use-model-catalog-scope-key.js";
import { useWorkspaceChatSelector } from "../assets/use-canvas-model-registry-hydration.js";
import { useSettingsDialog } from "../settings/persist-visible-workspace-manual-order.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { instantiatePluginOnCanvas } from "../text-editor/instantiate-plugin-on-canvas.js";
import { trackComfyUiEvent } from "../media-editing/merge-browser-bookmarks.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { workflowSourceFromId } from "../media-editing/unwrap-mcp-json-record.js";
import {
  isGatewayReady,
  SessionTaskSnapshotCache,
} from "../media-editing/derive-session-task-snapshot.jsx";
import { getCanvasTaskSnapshot } from "../canvas/get-canvas-task-snapshot.js";
import { redactForCurrentRegion } from "../generation/replace-configured-model-names-for-current-region.js";
import {
  createModelRegistryStore,
  createRecentlyAddedStore,
} from "../infra/create-recently-added-store.js";
import { createGeneratingStateStore } from "../media-editing/package.jsx";
import { createCanvasOverlayStore } from "../canvas/create-canvas-overlay-store.js";
import { createMultiImageOverlayStore } from "../media-editing/use-start-cloud-edit-from-node.js";
import { WorkspaceChatProvider } from "../assets/workspace-chat-provider.jsx";
import {
  ChatReadinessProvider,
  resolveChatReadiness,
} from "../chat/chat-compliance-notice.jsx";
import { WorkspaceWSConnectionProvider } from "../settings/changelog-table.jsx";
import { SessionStoreProvider } from "./resolve-retry-message-payload.jsx";
import { WorkspaceAssetCenterRelocationCoachMark } from "./workspace-asset-center-relocation-coach-mark.jsx";
import {
  AssetMetadataStoreProvider,
  GeneratingStateStoreProvider,
} from "../canvas/fullscreen-icon.jsx";
import { ModelRegistryStoreProvider } from "../generation/missing-asset-card.jsx";
import { AutoFeedbackToastListener } from "../media-editing/auto-feedback-toast-listener.js";
import { AssetSourcePickerProvider } from "../text-editor/read-preview-text-response.jsx";
import { CanvasOverlayStoreProvider } from "../media-editing/image-edit-pricing.js";
import { MultiImageOverlayStoreProvider } from "../media-editing/customize-toolbar-dialog-2.jsx";
import { RecentlyAddedStoreProvider } from "../canvas/use-inline-rename.jsx";
import { useAdoptInitialAttachments } from "./use-adopt-initial-attachments.js";
import { WorkspaceCanvasFocusCoordinator } from "./workspace-canvas-focus-coordinator.js";
import { WorkspaceContent } from "./workspace-content.jsx";
function trackComfyUiWorkflowOpen(workflowSource, target, startedAt) {
  trackComfyUiEvent(TRACK_EVENTS.COMFYUI_WORKFLOW_OPEN, {
    entry_point: "workspace_pending",
    workflow_source: workflowSource,
    target,
    duration_ms: Math.max(0, Date.now() - startedAt),
  });
}
function trackComfyUiWorkflowOpenFailed(workflowSource, target, startedAt) {
  trackComfyUiEvent(TRACK_EVENTS.COMFYUI_WORKFLOW_OPEN_FAILED, {
    entry_point: "workspace_pending",
    workflow_source: workflowSource,
    target,
    error_type: "business",
    error_code: "workflow_open_failed",
    error_message: "ComfyUI workflow could not be opened",
    duration_ms: Math.max(0, Date.now() - startedAt),
  });
}
function parseOpenWorkflowResult(value) {
  if (!value || typeof value !== "object")
    throw new Error("Invalid ComfyUI response");
  const record = value;
  if (typeof record.status !== "string")
    throw new Error("Invalid ComfyUI response");
  return {
    status: record.status,
    ...(typeof record.error === "string"
      ? {
          error: record.error,
        }
      : {}),
  };
}
function PendingComfyUiWorkflowOpener({
  workflowId,
  target = "new",
  workspaceId,
  isActive,
}) {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const gatewayFetch = useGatewayFetch();
  const connected = useWorkspaceChatSelector((chat) => chat.connected);
  const sessionId = useWorkspaceChatSelector((chat) => chat.focusedSessionId);
  const openingRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!workflowId) {
      openingRef.current = null;
      return;
    }
    if (!isActive || !connected) return;
    const requestKey = `${workspaceId}:${workflowId}:${target}`;
    if (openingRef.current === requestKey) return;
    openingRef.current = requestKey;
    const startedAt = Date.now();
    const workflowSource = workflowSourceFromId(workflowId);
    const clearPendingIntent = () =>
      navigate({
        to: "/workspace",
        replace: true,
        search: buildWorkspaceSearch(workspaceId),
      });
    void gatewayFetch(API_PATHS.comfyUiWorkflowOpen(workflowId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(sessionId
          ? {
              session_id: sessionId,
            }
          : {}),
        target,
        open_editor: false,
      }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = parseOpenWorkflowResult(await response.json());
        if (result.status !== "opened")
          throw new Error(result.error || result.status);
        trackComfyUiWorkflowOpen(workflowSource, target, startedAt);
        dedupedToast.success(translate("workflows.addedToCanvas"));
      })
      .catch((error) => {
        trackComfyUiWorkflowOpenFailed(workflowSource, target, startedAt);
        dedupedToast.error(
          translate("workflows.addFailed", {
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      })
      .finally(clearPendingIntent);
  }, [
    connected,
    gatewayFetch,
    isActive,
    navigate,
    sessionId,
    translate,
    workflowId,
    workspaceId,
    target,
  ]);
  return null;
}
function PluginInstantiator({
  pluginId,
  workspaceId,
  folderPath,
}) {
  const navigate = useNavigate();
  const scopedFetch = useGatewayFetch();
  const gatewayReady = useGatewayReady();
  const { t: translate } = useTranslation();
  const applied = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (applied.current || !pluginId || !gatewayReady) return;
    applied.current = true;
    const clearSearch = () =>
      navigate({
        to: "/workspace",
        search: buildWorkspaceSearch(workspaceId ?? "", {
          pluginId: void 0,
        }),
        replace: true,
      });
    void instantiatePluginOnCanvas(
      {
        pluginId,
      },
      {
        currentWorkspace: folderPath,
        gatewayFetch: scopedFetch,
        t: translate,
      },
    ).finally(clearSearch);
  }, [
    folderPath,
    gatewayReady,
    navigate,
    pluginId,
    scopedFetch,
    translate,
    workspaceId,
  ]);
  return null;
}
function RetainedHeavyContent({ isActive, children }) {
  return <div className={isActive ? "contents" : "hidden"}>{children}</div>;
}
function shouldAutoRevealCanvas({
  isActive,
  hasRenderableContent,
  autoReveal,
  projectRunning,
}) {
  return (
    isActive &&
    hasRenderableContent &&
    autoReveal === "eligible" &&
    !projectRunning
  );
}
function WorkspaceCanvasAutoRevealBridge({
  isActive,
  hasRenderableContent,
  autoReveal,
  onAutoReveal,
}) {
  const sessionStore = useWorkspaceChatSelector((chat) => chat.sessionStore);
  const focusedSessionRunning = useWorkspaceChatSelector(
    (chat) => chat.busy || chat.pendingReasons.length > 0,
  );
  const readProjectRunning = reactExports.useCallback(
    () =>
      Array.from(sessionStore.getState().sessions.values()).some(
        (session) => session.busy || session.pendingReasons.length > 0,
      ),
    [sessionStore],
  );
  const [projectRunning, setProjectRunning] =
    reactExports.useState(readProjectRunning);
  reactExports.useEffect(() => {
    const sync = () => setProjectRunning(readProjectRunning());
    sync();
    return sessionStore.subscribe(sync);
  }, [readProjectRunning, sessionStore]);
  reactExports.useEffect(() => {
    if (
      shouldAutoRevealCanvas({
        isActive,
        hasRenderableContent,
        autoReveal,
        projectRunning: focusedSessionRunning || projectRunning,
      })
    ) {
      onAutoReveal();
    }
  }, [
    autoReveal,
    focusedSessionRunning,
    hasRenderableContent,
    isActive,
    onAutoReveal,
    projectRunning,
  ]);
  return null;
}
function isInitialAttachmentAdoptionReady(status, runtimeUnavailable) {
  return !runtimeUnavailable && isGatewayReady(status.state);
}
function SkillPromptInjector({
  skillPrompt,
  skillName,
  workspaceId,
}) {
  const setInput = useWorkspaceChatSelector((chat) => chat.setInput);
  const trackInputChange = useWorkspaceChatSelector(
    (chat) => chat.trackInputChange,
  );
  const navigate = useNavigate();
  const scopedFetch = useGatewayFetch();
  const applied = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (applied.current) return;
    if (!skillName && !skillPrompt) return;
    applied.current = true;
    const clearSearch = () =>
      navigate({
        to: "/workspace",
        search: buildWorkspaceSearch(workspaceId ?? "", {
          skillPrompt: void 0,
          skillName: void 0,
        }),
        replace: true,
      });
    if (skillName) {
      scopedFetch(API_PATHS.skills)
        .then((response) => (response.ok ? response.json() : []))
        .then((data) => {
          if (!Array.isArray(data)) return;
          const skill = data.find(
            (candidateSession) =>
              candidateSession != null &&
              typeof candidateSession === "object" &&
              "name" in candidateSession &&
              candidateSession.name === skillName,
          );
          if (skill) {
            requestAnimationFrame(() => {
              workspaceEvents.queueAddSkillToChat(workspaceId ?? "", skill);
            });
          }
        })
        .catch(() => {})
        .finally(clearSearch);
      return;
    }
    if (skillPrompt) {
      setInput(skillPrompt);
      trackInputChange(skillPrompt);
      clearSearch();
    }
  }, [
    skillName,
    skillPrompt,
    setInput,
    trackInputChange,
    navigate,
    workspaceId,
    scopedFetch,
  ]);
  return null;
}
function MenuActionInjector({
  skillPrompt,
  menuAction,
  workspaceId,
}) {
  const navigate = useNavigate();
  const connected = useWorkspaceChatSelector((chat) => chat.connected);
  const sendWsMessage = useWorkspaceChatSelector((chat) => chat.sendWsMessage);
  const { openSettings } = useSettingsDialog();
  const handledRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!menuAction) {
      handledRef.current = null;
      return;
    }
    if (handledRef.current === menuAction) return;
    if (menuAction === "open-settings") {
      handledRef.current = menuAction;
      openSettings();
      void navigate({
        to: "/workspace",
        search: buildWorkspaceSearch(workspaceId ?? "", {
          skillPrompt,
        }),
        replace: true,
      });
      return;
    }
    if (!connected) return;
    handledRef.current = menuAction;
    sendWsMessage({
      type: "create_session",
    });
    void navigate({
      to: "/workspace",
      search: buildWorkspaceSearch(workspaceId ?? "", {
        skillPrompt,
      }),
      replace: true,
    });
  }, [
    connected,
    menuAction,
    navigate,
    openSettings,
    sendWsMessage,
    skillPrompt,
    workspaceId,
  ]);
  return null;
}
const TASK_PROMPT_PREVIEW_MAX_LENGTH = 36;
function normalizeTaskPromptPreview(content) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return void 0;
  return normalized.length > TASK_PROMPT_PREVIEW_MAX_LENGTH
    ? `${normalized.slice(0, TASK_PROMPT_PREVIEW_MAX_LENGTH)}...`
    : normalized;
}
function getLatestUserPromptPreview(messages) {
  if (!messages) return void 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user" || message.type !== "text") continue;
    const preview = normalizeTaskPromptPreview(message.content);
    if (preview) return redactForCurrentRegion(preview);
  }
  return void 0;
}
function patchCanvasTasks(prev, update) {
  const next = new Map(prev.map((task) => [task.id, task]));
  for (const nodeId of update.removedNodeIds ?? []) {
    next.delete(nodeId);
  }
  for (const node of update.addedNodes ?? []) {
    const task = getCanvasTaskSnapshot(node);
    if (task) next.set(task.id, task);
  }
  for (const node of update.updatedNodes ?? []) {
    const task = getCanvasTaskSnapshot(node);
    if (task) {
      next.set(task.id, task);
      continue;
    }
    next.delete(node.id);
  }
  return Array.from(next.values());
}
function WorkspaceTopbarBridge({ runtime, canvasTasks, setCanvasTasks }) {
  const { reportWorkspaceSnapshot, reportTaskCompleted } = useTopbarActions();
  const sessions = useWorkspaceChatSelector((chat) => chat.sessions);
  const textEditSessionIds = useWorkspaceChatSelector(
    (chat) => chat.textEditSessionIds,
  );
  const sessionStore = useWorkspaceChatSelector((chat) => chat.sessionStore);
  const sendWsMessage = useWorkspaceChatSelector((chat) => chat.sendWsMessage);
  const [storeVersion, setStoreVersion] = reactExports.useState(0);
  const taskSnapshotCache = reactExports.useMemo(
    () => new SessionTaskSnapshotCache(),
    [],
  );
  const getTopbarStoreKey = reactExports.useCallback(() => {
    const state = sessionStore.getState();
    const activeSessionIds = new Set();
    const sessionKey = Array.from(state.sessions.values())
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
    return [
      state.focusedSessionId ?? "",
      state.openedTabOrder.join(""),
      sessionKey,
    ].join("");
  }, [sessionStore, taskSnapshotCache]);
  reactExports.useEffect(() => {
    let prevKey = getTopbarStoreKey();
    return sessionStore.subscribe(() => {
      const nextKey = getTopbarStoreKey();
      if (nextKey === prevKey) return;
      prevKey = nextKey;
      setStoreVersion((currentVersion) => currentVersion + 1);
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
    return sessionStore.onCanvasUpdated((update) => {
      setCanvasTasks((prev) => patchCanvasTasks(prev, update));
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
          sessionName: redactForCurrentRegion(
            session.display_name || session.name,
          ),
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
      const session = sessions.find((sessionRecord) => sessionRecord.id === sessionId);
      if (!session) return;
      const storeSession = sessionStore.getState().sessions.get(sessionId);
      reportTaskCompleted({
        id: `${runtime.workspaceId}:${sessionId}`,
        workspaceId: runtime.workspaceId,
        workspaceName: runtime.projectName,
        sessionId,
        sessionName: redactForCurrentRegion(
          session.display_name || session.name,
        ),
        promptPreview: getLatestUserPromptPreview(storeSession?.messages),
      });
    });
  }, [
    reportTaskCompleted,
    runtime.workspaceId,
    runtime.projectName,
    sessionStore,
    sessions,
  ]);
  reactExports.useEffect(() => {
    const canvasFocus = workspaceEvents.onCanvasFocus(
      ({
        workspaceId,
        nodeIds,
        select,
        preferParentGroup,
      }) => {
        if (workspaceId !== runtime.workspaceId) return;
        sessionStore.notifyCanvasFocus({
          type: "canvas_focus",
          nodeIds,
          padding: 0.2,
          duration: 400,
          select,
          preferParentGroup,
        });
      },
    );
    const switchSession = workspaceEvents.onSwitchSession(
      ({ workspaceId, sessionId }) => {
        if (workspaceId !== runtime.workspaceId) return;
        sendWsMessage({
          type: "switch_session",
          session_id: sessionId,
        });
      },
    );
    workspaceEvents.fireSubscribersReady(runtime.workspaceId);
    return () => {
      workspaceEvents.clearSubscribersReady(runtime.workspaceId);
      canvasFocus.dispose();
      switchSession.dispose();
    };
  }, [runtime.workspaceId, sendWsMessage, sessionStore]);
  return null;
}
export function WorkspaceRuntimeContent({
  runtime,
  status,
  stageLayout,
  runtimeUnavailable = false,
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
      translate("workspace.initialAttachments.failed", {
        defaultValue: "图片迁移到工作区失败，首条消息尚未发送。",
      }),
      {
        id: toastId,
        duration: Number.POSITIVE_INFINITY,
        description: initialAttachmentAdoption.error,
        action: {
          label: translate("common.retry", "重试"),
          onClick: initialAttachmentAdoption.retry,
        },
      },
    );
    return () => {
      dedupedToast.dismiss(toastId);
    };
  }, [
    initialAttachmentAdoption.error,
    initialAttachmentAdoption.retry,
    runtime.workspaceId,
    translate,
  ]);
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
  const assetMetadataStore = reactExports.useMemo(
    () => createAssetMetadataStore(),
    [],
  );
  const canvasOverlayStore = reactExports.useMemo(
    () => createCanvasOverlayStore(),
    [],
  );
  const generatingStateStore = reactExports.useMemo(
    () => createGeneratingStateStore(),
    [],
  );
  const modelRegistryStore = reactExports.useMemo(
    () => createModelRegistryStore(),
    [],
  );
  const multiImageOverlayStore = reactExports.useMemo(
    () => createMultiImageOverlayStore(),
    [],
  );
  const recentlyAddedStore = reactExports.useMemo(
    () => createRecentlyAddedStore(),
    [],
  );
  const [canvasTasks, setCanvasTasks] = reactExports.useState([]);
  const [hasRenderableCanvasContent, setHasRenderableCanvasContent] =
    reactExports.useState(false);
  const handleCanvasTasksChange = reactExports.useCallback((tasks) => {
    setCanvasTasks(tasks);
  }, []);
  const handleRenderableCanvasContentChange = reactExports.useCallback(
    (hasRenderableContent) => {
      setHasRenderableCanvasContent(hasRenderableContent);
    },
    [],
  );
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
                      syncCanvasAssetMetadata={isActive}
                    >
                      <AutoFeedbackToastListener
                        workspaceId={runtime.workspaceId}
                        isActive={isActive}
                      />
                      <ChatReadinessProvider
                        value={resolveChatReadiness(status, runtimeUnavailable)}
                      >
                        <WorkspaceChatProvider
                          folderPath={runtime.folderPath}
                          initialPayloadId={initialPayloadId}
                          initialMessage={initialMessage}
                          initialAttachments={
                            initialAttachmentAdoption.attachments
                          }
                          initialAttachmentRefs={
                            initialAttachmentAdoption.attachmentRefs
                          }
                          initialEntityRefs={initialEntityRefs}
                          initialPayloadReady={initialAttachmentAdoption.ready}
                          initialModelId={initialModelId}
                          initialSelectedMediaModels={
                            initialSelectedMediaModels
                          }
                          onInitialMessageSent={onInitialMessageSent}
                          isActive={isActive}
                        >
                          <PendingComfyUiWorkflowOpener
                            workflowId={initialComfyUiWorkflowId}
                            target={initialComfyUiWorkflowTarget}
                            workspaceId={runtime.workspaceId}
                            isActive={isActive}
                          />
                          <WorkspaceCanvasFocusCoordinator
                            workspaceId={runtime.workspaceId}
                            isActive={isActive}
                            canvasVisible={
                              effectiveStageState.workspaceMode !== "chatOnly"
                            }
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
                            isActive={isActive && stageLayoutReady}
                            hasRenderableContent={hasRenderableCanvasContent}
                            autoReveal={effectiveStageState.autoReveal}
                            onAutoReveal={handleAutoRevealCanvas}
                          />
                          {isActive ? (
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
                          <RetainedHeavyContent isActive={isActive}>
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
                              onRenderableContentChange={
                                handleRenderableCanvasContentChange
                              }
                              isActive={isActive}
                              workspaceId={runtime.workspaceId}
                              workspaceName={runtime.projectName}
                              stageLayoutReady={stageLayoutReady}
                            />
                          </RetainedHeavyContent>
                          <WorkspaceAssetCenterRelocationCoachMark
                            enabled={
                              isActive &&
                              Boolean(assetCenterRelocation) &&
                              stageLayoutReady
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
