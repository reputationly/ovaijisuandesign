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
  const record2 = value;
  if (typeof record2.status !== "string")
    throw new Error("Invalid ComfyUI response");
  return {
    status: record2.status,
    ...(typeof record2.error === "string"
      ? {
          error: record2.error,
        }
      : {}),
  };
}
function PendingComfyUiWorkflowOpener({
  workflowId,
  target = "new",
  workspaceId: workspaceId2,
  isActive: isActive2,
}) {
  const { t: t2 } = useTranslation();
  const navigate = useNavigate();
  const gatewayFetch2 = useGatewayFetch();
  const connected = useWorkspaceChatSelector((chat) => chat.connected);
  const sessionId = useWorkspaceChatSelector((chat) => chat.focusedSessionId);
  const openingRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!workflowId) {
      openingRef.current = null;
      return;
    }
    if (!isActive2 || !connected) return;
    const requestKey = `${workspaceId2}:${workflowId}:${target}`;
    if (openingRef.current === requestKey) return;
    openingRef.current = requestKey;
    const startedAt = Date.now();
    const workflowSource = workflowSourceFromId(workflowId);
    const clearPendingIntent = () =>
      navigate({
        to: "/workspace",
        replace: true,
        search: buildWorkspaceSearch(workspaceId2),
      });
    void gatewayFetch2(API_PATHS.comfyUiWorkflowOpen(workflowId), {
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
        dedupedToast.success(t2("workflows.addedToCanvas"));
      })
      .catch((error) => {
        trackComfyUiWorkflowOpenFailed(workflowSource, target, startedAt);
        dedupedToast.error(
          t2("workflows.addFailed", {
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      })
      .finally(clearPendingIntent);
  }, [
    connected,
    gatewayFetch2,
    isActive2,
    navigate,
    sessionId,
    t2,
    workflowId,
    workspaceId2,
    target,
  ]);
  return null;
}
function PluginInstantiator({
  pluginId,
  workspaceId: workspaceId2,
  folderPath,
}) {
  const navigate = useNavigate();
  const scopedFetch = useGatewayFetch();
  const gatewayReady = useGatewayReady();
  const { t: t2 } = useTranslation();
  const applied = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (applied.current || !pluginId || !gatewayReady) return;
    applied.current = true;
    const clearSearch = () =>
      navigate({
        to: "/workspace",
        search: buildWorkspaceSearch(workspaceId2 ?? "", {
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
        t: t2,
      },
    ).finally(clearSearch);
  }, [
    folderPath,
    gatewayReady,
    navigate,
    pluginId,
    scopedFetch,
    t2,
    workspaceId2,
  ]);
  return null;
}
function RetainedHeavyContent({ isActive: isActive2, children: children2 }) {
  return <div className={isActive2 ? "contents" : "hidden"}>{children2}</div>;
}
function shouldAutoRevealCanvas({
  isActive: isActive2,
  hasRenderableContent,
  autoReveal,
  projectRunning,
}) {
  return (
    isActive2 &&
    hasRenderableContent &&
    autoReveal === "eligible" &&
    !projectRunning
  );
}
function WorkspaceCanvasAutoRevealBridge({
  isActive: isActive2,
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
        isActive: isActive2,
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
    isActive2,
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
  workspaceId: workspaceId2,
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
        search: buildWorkspaceSearch(workspaceId2 ?? "", {
          skillPrompt: void 0,
          skillName: void 0,
        }),
        replace: true,
      });
    if (skillName) {
      scopedFetch(API_PATHS.skills)
        .then((r2) => (r2.ok ? r2.json() : []))
        .then((data2) => {
          if (!Array.isArray(data2)) return;
          const skill = data2.find(
            (s2) =>
              s2 != null &&
              typeof s2 === "object" &&
              "name" in s2 &&
              s2.name === skillName,
          );
          if (skill) {
            requestAnimationFrame(() => {
              workspaceEvents.queueAddSkillToChat(workspaceId2 ?? "", skill);
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
    workspaceId2,
    scopedFetch,
  ]);
  return null;
}
function MenuActionInjector({
  skillPrompt,
  menuAction,
  workspaceId: workspaceId2,
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
        search: buildWorkspaceSearch(workspaceId2 ?? "", {
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
      search: buildWorkspaceSearch(workspaceId2 ?? "", {
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
    workspaceId2,
  ]);
  return null;
}
const TASK_PROMPT_PREVIEW_MAX_LENGTH = 36;
function normalizeTaskPromptPreview(content2) {
  const normalized = content2.replace(/\s+/g, " ").trim();
  if (!normalized) return void 0;
  return normalized.length > TASK_PROMPT_PREVIEW_MAX_LENGTH
    ? `${normalized.slice(0, TASK_PROMPT_PREVIEW_MAX_LENGTH)}...`
    : normalized;
}
function getLatestUserPromptPreview(messages2) {
  if (!messages2) return void 0;
  for (let index2 = messages2.length - 1; index2 >= 0; index2 -= 1) {
    const message2 = messages2[index2];
    if (message2.role !== "user" || message2.type !== "text") continue;
    const preview = normalizeTaskPromptPreview(message2.content);
    if (preview) return redactForCurrentRegion(preview);
  }
  return void 0;
}
function patchCanvasTasks(prev, update2) {
  const next2 = new Map(prev.map((task) => [task.id, task]));
  for (const id2 of update2.removedNodeIds ?? []) {
    next2.delete(id2);
  }
  for (const node2 of update2.addedNodes ?? []) {
    const task = getCanvasTaskSnapshot(node2);
    if (task) next2.set(task.id, task);
  }
  for (const node2 of update2.updatedNodes ?? []) {
    const task = getCanvasTaskSnapshot(node2);
    if (task) {
      next2.set(task.id, task);
      continue;
    }
    next2.delete(node2.id);
  }
  return Array.from(next2.values());
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
    return [
      state2.focusedSessionId ?? "",
      state2.openedTabOrder.join(""),
      sessionKey,
    ].join("");
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
      const session = sessions.find((s2) => s2.id === sessionId);
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
    const canvasFocus2 = workspaceEvents.onCanvasFocus(
      ({
        workspaceId: workspaceId2,
        nodeIds,
        select: select2,
        preferParentGroup,
      }) => {
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
export function WorkspaceRuntimeContent({
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
  }, [
    initialAttachmentAdoption.error,
    initialAttachmentAdoption.retry,
    runtime.workspaceId,
    t2,
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
  const [hasRenderableCanvasContent2, setHasRenderableCanvasContent] =
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
                              onRenderableContentChange={
                                handleRenderableCanvasContentChange
                              }
                              isActive={isActive2}
                              workspaceId={runtime.workspaceId}
                              workspaceName={runtime.projectName}
                              stageLayoutReady={stageLayoutReady}
                            />
                          </RetainedHeavyContent>
                          <WorkspaceAssetCenterRelocationCoachMark
                            enabled={
                              isActive2 &&
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
