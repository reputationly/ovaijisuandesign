// use-chat.js
import { reactExports, useQueryClient, useTranslation } from "../vendor.js";
import { dedupedToast, guardAccountSubmission } from "../infra/agent-http-client.js";
import { chatLog } from "../vendor-inline/vscode-base/graph.jsx";
import { recordAction } from "../infra/gateway-http-error.jsx";
import {
  refreshAssetIndex,
  useAccountSubmissionDecision,
} from "../assets/gateway-scope-provider.jsx";
import { DraftController } from "../assets/draft-controller.js";
import { hasMessagePayload } from "../media-editing/package.jsx";
import { ErrorCodes } from "../generation/normalize-skill-detail-metadata.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { useDiffReviewStore } from "../text-editor/use-diff-review-store.js";
import {
  useGatewayScopeKey,
  useGatewayUrl,
} from "../generation/use-model-catalog-scope-key.js";
import { useWorkspaceWSConnection } from "../settings/changelog-table.jsx";
import {
  cachedTextEditSessionBindings,
  collectBindingSessionIds,
  collectTextEditSessionIds,
  mergeTextEditSessionBindings,
  resolveTextEditSessionId,
  useAgentModeAwareSend,
} from "./use-model-defaults.js";
import { TextEditSessionBindingPersister } from "./text-edit-session-binding-persister.js";
import { useChatModelSelection } from "./use-chat-model-selection.js";
import {
  ACTIVE_MESSAGE_DELIVERY_STATUSES,
  clearActiveTextEditSession,
  clearBridgeTimeoutPresentation,
  createTextAgentIntroEnsurer,
  errorCodeForMessageDeliveryStage,
  handleSessionCreatedResponse,
  isBridgeDeliveryTimeout,
  isMessagePreflight,
  isRuntimeBusyProgress,
  isSessionCachePolicyEnabled,
  listTextEditSessionEntries,
  MESSAGE_DELIVERY_TIMEOUT_MS,
  MESSAGE_RUNTIME_PROGRESS_TIMEOUT_MS,
  messageDeliveryErrorMessageId,
  messageDeliveryRuntimeProgressSessionId,
  messageDeliveryTimeoutToastId,
  nodeEditSessionName,
  recordMessageDeliveryFailureBreadcrumb,
  recordMessageDeliveryTimeoutBreadcrumb,
  recordMessageDeliveryTimeoutRecovered,
  restoreRejectedAttachments,
  rootRuntimeTerminalSessionId,
  sanitizeMessageDeliveryError,
  settleCreatedComposerDraft,
  TECHNICAL_MESSAGE_DELIVERY_ERROR_PATTERN,
  upsertTextEditSessionEntry,
} from "./handle-session-created-response.js";
import { useSessionListRetry } from "./use-session-list-retry.js";
import { useChatCancel } from "./use-chat-cancel.js";
import { useQueuedUserMessageCancellation } from "./use-queued-user-message-cancellation.js";
import { useRemoteToolSession } from "./use-remote-tool-session.js";
import { ChatController } from "./chat-controller.js";
import { useSessionFocusCoordinator } from "./use-session-focus-coordinator.js";
import { useSessionStall } from "./use-session-stall.js";
import {
  sessionSwitchNotConnectedMessage,
  sessionSwitchTimeoutMessage,
  useInitialPayloadHydrationStalledFeedback,
  useSessionSwitchErrorFeedback,
  useSessionSwitchTimeout,
  useVisibleConversationHydrationRequest,
  useVisibleConversationHydrationTimeout,
} from "./use-visible-conversation-hydration-timeout.js";
import { useSessionTabPersistence } from "./use-session-tab-persistence.js";
import {
  chatDiagnostics,
  DOCUMENT_EDIT_SUBMISSION_LIMIT,
  HISTORY_RELOAD_TIMEOUT_MS,
  INITIAL_PAYLOAD_HYDRATION_TIMEOUT_MS,
  loadTextEditBindingsWithFallback,
  MESSAGE_DELIVERY_TRACE_LIMIT,
  RENDERER_IDLE_BUSY_MISMATCH_MS,
  SAFE_COLD_SESSION_FLAG,
  SAFE_COLD_SESSION_INTERVAL_MS,
  SAFE_COLD_SESSION_MIN_PART_COUNT,
  SAFE_WARM_SESSION_FLAG,
  SAFE_WARM_SESSION_INTERVAL_MS,
  SAFE_WARM_SESSION_KEEP_COUNT,
  SAFE_WARM_SESSION_MIN_PART_COUNT,
  sameTextEditSession,
  SESSION_CREATE_TIMEOUT_MS,
  TEXT_EDIT_SESSION_REQUEST_TIMEOUT_MS,
  textEditNodeDraftKey,
  textEditTransactionId,
} from "../text-editor/load-text-edit-bindings-with-fallback.js";
import {
  chatAttachmentsFromPaths,
  DRAFT_NEW_TAB,
  equalStringSets,
  getBuiltinBrowserChatContextForSend,
  resolveRetryMessagePayload,
  useQueuedMessageScrollRequest,
} from "../workspace/resolve-retry-message-payload.jsx";
import { pruneExpiredDrafts } from "../media-editing/derive-session-task-snapshot.jsx";
import {
  recordIdleActionSafe,
  recordIdleMismatchSafe,
  recordMessageDeliveryTrace,
} from "../infra/error-boundary.jsx";
import { nextMessageId } from "./create-history-sub-agent-message.js";
import { recordError } from "./attach-handoff-targets-to-sub-messages.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { accountScopedMessage } from "../assets/preview-media.jsx";
import { QUEUED_USER_MESSAGE_LIMIT } from "../canvas/fullscreen-icon.jsx";
import { instantiationService } from "../workspace/home-service.jsx";
import { IHiloApp } from "../settings/parse-custom-mcp-arguments.js";
import { workspaceInitialPayloadSignature } from "../settings/use-asset-lineage.js";

export function useChat(
  sessionStore,
  currentWorkspace = "",
  initialMessage,
  initialAttachments,
  onInitialMessageSent,
  initialSelectedMediaModels,
  options = {},
) {
  const {
    connected,
    send: sendRaw,
    subscribe: subscribe2,
  } = useWorkspaceWSConnection();
  const send2 = useAgentModeAwareSend(sendRaw, options.agentMode);
  const {
    cancelQueuedUserMessage,
    settleQueuedUserMessageCancellation,
    rejectQueuedUserMessageCancellations,
  } = useQueuedUserMessageCancellation({
    sessionStore,
    send: send2,
  });
  const controller = reactExports.useMemo(
    () => new ChatController(sessionStore),
    [sessionStore],
  );
  const queryClient2 = useQueryClient();
  const gatewayScopeKey = useGatewayScopeKey();
  const scopedGatewayUrl = useGatewayUrl();
  const { t: translate } = useTranslation();
  const autoSendSubmissionDecision = useAccountSubmissionDecision("auto_send");
  const [messages2, setMessages] = reactExports.useState([]);
  const [focusedSessionId, setFocusedSessionId] = reactExports.useState(null);
  const [sessions, setSessions] = reactExports.useState([]);
  const textEditBindingPersister = reactExports.useMemo(
    () => new TextEditSessionBindingPersister(),
    [],
  );
  const textEditBindingsRef = reactExports.useRef(
    cachedTextEditSessionBindings(currentWorkspace),
  );
  const diffReviewSessionCacheRef = reactExports.useRef(null);
  const pendingDiffReviewSessionRef = reactExports.useRef(null);
  const textEditSessionIdsRef = reactExports.useRef(
    collectTextEditSessionIds(textEditBindingsRef.current),
  );
  const [textEditSessionIds, setTextEditSessionIds] = reactExports.useState(
    textEditSessionIdsRef.current,
  );
  const [textEditNodeSessionIds, setTextEditNodeSessionIds] =
    reactExports.useState(new Set());
  const activeTextEditAgentRef = reactExports.useRef(null);
  const nodeEditAgentKindRef = reactExports.useRef("text");
  const nodeEditAgentNameRef = reactExports.useRef(void 0);
  const [textEditAgentState, setTextEditAgentState] =
    reactExports.useState(null);
  const pendingTextEditCreatesRef = reactExports.useRef(new Map());
  const textEditBindingsReadyRef = reactExports.useRef(false);
  const pendingSessionListUntilBindingsRef = reactExports.useRef(void 0);
  const [textEditBindingsReadyVersion, setTextEditBindingsReadyVersion] =
    reactExports.useState(0);
  const latestRenameRequestBySessionRef = reactExports.useRef(new Map());
  const pendingCreatePayloadRef = reactExports.useRef(null);
  const pendingCreateTimeoutRef = reactExports.useRef(null);
  const pendingForkDraftsRef = reactExports.useRef(new Map());
  const {
    beginCreate: beginCreateFocusIntent,
    beginFork: beginForkFocusIntent,
    fence: fenceSessionActivation2,
    prepareSessionSwitch,
    reject: rejectSessionFocusIntent,
    requestSessionFocus,
    supersede: supersedeSessionFocusIntent,
  } = useSessionFocusCoordinator(send2);
  const [openedTabOrder, setOpenedTabOrder] = reactExports.useState(() => []);
  const [openedTabIds, setOpenedTabIds] = reactExports.useState(new Set());
  const [sessionsLoading, setSessionsLoading] = reactExports.useState(true);
  const [conversationLoading, setConversationLoading] =
    reactExports.useState(true);
  const visibleConversationHydrationRequestsRef = reactExports.useRef(
    new Map(),
  );
  const retainVisibleTranscriptUntilHydrationRef = reactExports.useRef(false);
  const activeConversationWorkspaceRef = reactExports.useRef(currentWorkspace);
  activeConversationWorkspaceRef.current = currentWorkspace;
  const connectedRef = reactExports.useRef(connected);
  connectedRef.current = connected;
  const [initialPayloadDispatchReady, setInitialPayloadDispatchReady] =
    reactExports.useState(false);
  const initialPayloadWaitLogKeyRef = reactExports.useRef(null);
  const initialPayloadReadinessTimerRef = reactExports.useRef(null);
  const initialPayloadDispatchReadyRef = reactExports.useRef(
    initialPayloadDispatchReady,
  );
  initialPayloadDispatchReadyRef.current = initialPayloadDispatchReady;
  const initialPayloadAwaitingDispatchRef = reactExports.useRef(false);
  const [initialPayloadHydrationStalled, setInitialPayloadHydrationStalled] =
    reactExports.useState(false);
  const clearInitialPayloadReadinessTimer = reactExports.useCallback(() => {
    if (initialPayloadReadinessTimerRef.current !== null) {
      clearTimeout(initialPayloadReadinessTimerRef.current);
      initialPayloadReadinessTimerRef.current = null;
    }
  }, []);
  const reportInitialPayloadHydrationStalled = reactExports.useCallback(
    (reason) => {
      clearInitialPayloadReadinessTimer();
      setInitialPayloadHydrationStalled(true);
      chatLog.warn(
        "initial-payload hydration stalled; payload retained, not dispatched",
        {
          reason,
          timeoutMs: INITIAL_PAYLOAD_HYDRATION_TIMEOUT_MS,
        },
      );
    },
    [clearInitialPayloadReadinessTimer],
  );
  const updateInitialPayloadDispatchReadiness = reactExports.useCallback(
    (ready) => {
      clearInitialPayloadReadinessTimer();
      setInitialPayloadDispatchReady(ready);
      if (ready) {
        setInitialPayloadHydrationStalled(false);
        return;
      }
      initialPayloadReadinessTimerRef.current = setTimeout(() => {
        initialPayloadReadinessTimerRef.current = null;
        if (!initialPayloadAwaitingDispatchRef.current) return;
        reportInitialPayloadHydrationStalled("timeout");
      }, INITIAL_PAYLOAD_HYDRATION_TIMEOUT_MS);
    },
    [clearInitialPayloadReadinessTimer, reportInitialPayloadHydrationStalled],
  );
  reactExports.useEffect(
    () => clearInitialPayloadReadinessTimer,
    [clearInitialPayloadReadinessTimer],
  );
  const [busy, setBusy] = reactExports.useState(false);
  const [pendingReasons, setPendingReasons] = reactExports.useState(() => []);
  const [historyLoadFailed, setHistoryLoadFailed] =
    reactExports.useState(false);
  const [historyReloadingSessionIds, setHistoryReloadingSessionIds] =
    reactExports.useState(() => new Set());
  const historyReloading = focusedSessionId
    ? historyReloadingSessionIds.has(focusedSessionId)
    : false;
  const {
    stalledSessions,
    handleSessionStalledMessage,
    clearStalledForSession,
    dismissStalledForSession,
    recordStallAction,
    pruneStalledSessions,
  } = useSessionStall();
  const [queuedUserMessagesBySession, setQueuedUserMessagesBySession] =
    reactExports.useState(() => new Map());
  const queuedUserMessagesBySessionRef = reactExports.useRef(
    queuedUserMessagesBySession,
  );
  const [messageDeliveryByClientId, setMessageDeliveryByClientId] =
    reactExports.useState(() => new Map());
  const messageDeliveryByClientIdRef = reactExports.useRef(
    messageDeliveryByClientId,
  );
  const cancelInFlightSessionIdsRef = reactExports.useRef(new Set());
  const [documentEditSubmissions, setDocumentEditSubmissions] =
    reactExports.useState(() => new Map());
  const documentEditSubmissionsRef = reactExports.useRef(
    documentEditSubmissions,
  );
  documentEditSubmissionsRef.current = documentEditSubmissions;
  const documentEditRequestByClientIdRef = reactExports.useRef(new Map());
  const messageDeliveryTimersRef = reactExports.useRef(new Map());
  const [switching, setSwitching] = reactExports.useState(false);
  const [switchError, setSwitchError] = reactExports.useState(null);
  const failVisibleConversationHydration =
    useVisibleConversationHydrationTimeout({
      active:
        connected &&
        conversationLoading &&
        !sessionsLoading &&
        !initialPayloadAwaitingDispatchRef.current &&
        visibleConversationHydrationRequestsRef.current.size > 0,
      pendingRequestsRef: visibleConversationHydrationRequestsRef,
      sessionStore,
      rejectSessionFocusIntent,
      setConversationLoading,
      setHistoryLoadFailed,
      setSwitchError,
      timeoutMessage: sessionSwitchTimeoutMessage(translate),
    });
  const [creatingSession, setCreatingSession] = reactExports.useState(false);
  const pendingSessionSwitchRef = reactExports.useRef(null);
  const clearPendingSessionSwitch = reactExports.useCallback(() => {
    pendingSessionSwitchRef.current = null;
    setSwitching(false);
    setSwitchError(null);
  }, []);
  const cancelPendingSessionSwitch = reactExports.useCallback(
    (supersedingSessionId) => {
      supersedeSessionFocusIntent(supersedingSessionId);
      clearPendingSessionSwitch();
    },
    [clearPendingSessionSwitch, supersedeSessionFocusIntent],
  );
  const [pendingNewTab, setPendingNewTab] = reactExports.useState(false);
  const [evictedTabIds, setEvictedTabIds] = reactExports.useState([]);
  reactExports.useEffect(() => {
    return sessionStore.subscribeTabEvicted((evictedId) => {
      setEvictedTabIds((prev) =>
        prev.includes(evictedId) ? prev : [...prev, evictedId],
      );
    });
  }, [sessionStore]);
  const [input, setInput] = reactExports.useState("");
  const {
    getSelectedMediaModels,
    getSelectedModelId,
    handleModelChange,
    handleModelSelectionChange,
    handleSelectedMediaModelsChange,
    resetForNewChat,
    selectedMediaModels,
    selectedModelId,
    syncSelectedMediaModels,
    syncSelectedModelId,
  } = useChatModelSelection({
    sessionStore,
    send: send2,
    initialModelId: options.initialModelId,
    initialSelectedMediaModels,
    defaultModelId: options.defaultModelId,
    defaultSelectedMediaModels: options.defaultSelectedMediaModels,
    modelDefaultsHydrated: options.modelDefaultsHydrated,
    onRememberDefaults: options.onRememberDefaults,
    pendingCreatePayloadRef,
  });
  const scopedGatewayUrlRef = reactExports.useRef(scopedGatewayUrl);
  scopedGatewayUrlRef.current = scopedGatewayUrl;
  const draftControllerRef = reactExports.useRef(null);
  if (!draftControllerRef.current) {
    draftControllerRef.current = new DraftController(
      currentWorkspace,
      (path2) => scopedGatewayUrlRef.current(path2),
    );
  }
  const draftController = draftControllerRef.current;
  const reconnectDraftRestoreRef = reactExports.useRef(false);
  const currentInputTextRef = reactExports.useRef("");
  const currentInputEditorDocRef = reactExports.useRef(void 0);
  const currentAttachmentsRef = reactExports.useRef([]);
  const [pendingEditorDoc, setPendingEditorDoc] = reactExports.useState(null);
  const [pendingAttachments, setPendingAttachments] =
    reactExports.useState(null);
  const getTextEditSessionIds = reactExports.useCallback(
    () => textEditSessionIdsRef.current,
    [],
  );
  const getTextEditPreservedFocusedSessionId = reactExports.useCallback(() => {
    const active2 = activeTextEditAgentRef.current;
    return active2 ? active2.previousSessionId : void 0;
  }, []);
  const publishTextEditSessionIds = reactExports.useCallback(() => {
    const ids2 = new Set(
      collectTextEditSessionIds(textEditBindingsRef.current),
    );
    const active2 = activeTextEditAgentRef.current;
    const activeSessionId = active2?.sessionId;
    if (activeSessionId) ids2.add(activeSessionId);
    textEditSessionIdsRef.current = ids2;
    setTextEditSessionIds((current2) =>
      equalStringSets(current2, ids2) ? current2 : ids2,
    );
    const nodeIds = active2
      ? new Set(
          collectBindingSessionIds(
            textEditBindingsRef.current[active2.editor.nodeId],
          ),
        )
      : new Set();
    if (active2 && activeSessionId) nodeIds.add(activeSessionId);
    setTextEditNodeSessionIds((current2) =>
      equalStringSets(current2, nodeIds) ? current2 : nodeIds,
    );
  }, []);
  const syncTextEditBindingsWithSessions = reactExports.useCallback(() => {
    const state2 = sessionStore.getState();
    let nextBindings = textEditBindingsRef.current;
    for (const [nodeId, binding] of Object.entries(
      textEditBindingsRef.current,
    )) {
      const resolvedSessionId = resolveTextEditSessionId(binding, state2);
      if (!resolvedSessionId) continue;
      const session = state2.sessions.get(resolvedSessionId);
      const nextBinding = {
        uiSessionId: resolvedSessionId,
        runtimeSessionId: session?.runtimeSessionId ?? binding.runtimeSessionId,
        updatedAt: binding.updatedAt,
      };
      if (
        binding.uiSessionId !== nextBinding.uiSessionId ||
        binding.runtimeSessionId !== nextBinding.runtimeSessionId
      ) {
        const refreshedEntry = {
          ...nextBinding,
          updatedAt: Date.now(),
        };
        nextBindings = {
          ...nextBindings,
          [nodeId]: upsertTextEditSessionEntry(binding, refreshedEntry),
        };
        void textEditBindingPersister.upsert(
          currentWorkspace,
          nodeId,
          refreshedEntry,
        );
      }
      const active2 = activeTextEditAgentRef.current;
      if (
        active2?.editor.nodeId === nodeId &&
        active2.sessionId !== resolvedSessionId
      ) {
        const updated = {
          ...active2,
          sessionId: resolvedSessionId,
        };
        activeTextEditAgentRef.current = updated;
        setTextEditAgentState({
          editor: updated.editor,
          sessionId: updated.sessionId,
          status: updated.status,
        });
      }
    }
    textEditBindingsRef.current = nextBindings;
    publishTextEditSessionIds();
  }, [
    currentWorkspace,
    publishTextEditSessionIds,
    sessionStore,
    textEditBindingPersister,
  ]);
  const bindTextEditSession = reactExports.useCallback(
    (nodeId, uiSessionId, runtimeSessionId) => {
      const current2 = textEditBindingsRef.current[nodeId];
      const entry = {
        uiSessionId,
        runtimeSessionId: runtimeSessionId ?? current2?.runtimeSessionId,
        updatedAt: Date.now(),
      };
      textEditBindingsRef.current = {
        ...textEditBindingsRef.current,
        [nodeId]: upsertTextEditSessionEntry(current2, entry),
      };
      publishTextEditSessionIds();
      void textEditBindingPersister.upsert(currentWorkspace, nodeId, entry);
    },
    [currentWorkspace, publishTextEditSessionIds, textEditBindingPersister],
  );
  reactExports.useEffect(() => {
    let cancelled = false;
    textEditBindingsReadyRef.current = false;
    pendingSessionListUntilBindingsRef.current = void 0;
    const cached = cachedTextEditSessionBindings(currentWorkspace);
    textEditBindingsRef.current = cached;
    publishTextEditSessionIds();
    void textEditBindingPersister.load(currentWorkspace).then((loaded) => {
      if (cancelled) return;
      textEditBindingsRef.current = mergeTextEditSessionBindings(
        loaded,
        textEditBindingsRef.current,
      );
      syncTextEditBindingsWithSessions();
      textEditBindingsReadyRef.current = true;
      setTextEditBindingsReadyVersion((version2) => version2 + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [
    currentWorkspace,
    publishTextEditSessionIds,
    syncTextEditBindingsWithSessions,
    textEditBindingPersister,
  ]);
  reactExports.useEffect(() => {
    draftController.setWorkspace(currentWorkspace);
  }, [currentWorkspace, draftController]);
  const conversationWorkspaceRef = reactExports.useRef(currentWorkspace);
  reactExports.useEffect(() => {
    if (conversationWorkspaceRef.current === currentWorkspace) return;
    conversationWorkspaceRef.current = currentWorkspace;
    visibleConversationHydrationRequestsRef.current.clear();
    setConversationLoading(true);
  }, [currentWorkspace]);
  reactExports.useEffect(() => {
    draftController.revive();
    pruneExpiredDrafts();
    return () => draftController.dispose();
  }, [draftController]);
  const notifyDroppedAttachments = reactExports.useCallback(() => {
    dedupedToast.warning(
      translate(
        "chat.draft.attachmentsDropped",
        "Some attachments could not be restored — please re-add them.",
      ),
    );
  }, [translate]);
  const trackInputChange = reactExports.useCallback(
    (text2, editorDoc) => {
      currentInputTextRef.current = text2;
      currentInputEditorDocRef.current = editorDoc;
      const sessionId = sessionStore.getState().focusedSessionId;
      const key2 = sessionId ?? DRAFT_NEW_TAB;
      const draft = {
        text: text2,
        editorDoc,
        attachments: currentAttachmentsRef.current,
      };
      draftController.set(key2, draft);
      const activeTextEdit = activeTextEditAgentRef.current;
      if (activeTextEdit) {
        draftController.set(
          textEditNodeDraftKey(activeTextEdit.editor.nodeId),
          draft,
        );
      }
    },
    [draftController, sessionStore],
  );
  const trackAttachmentsChange = reactExports.useCallback(
    (attachments) => {
      currentAttachmentsRef.current = attachments;
      const sessionId = sessionStore.getState().focusedSessionId;
      const key2 = sessionId ?? DRAFT_NEW_TAB;
      const draft = {
        text: currentInputTextRef.current,
        editorDoc: currentInputEditorDocRef.current,
        attachments,
      };
      draftController.set(key2, draft);
      const activeTextEdit = activeTextEditAgentRef.current;
      if (activeTextEdit) {
        draftController.set(
          textEditNodeDraftKey(activeTextEdit.editor.nodeId),
          draft,
        );
      }
    },
    [draftController, sessionStore],
  );
  const handlePendingAttachmentsConsumed = reactExports.useCallback(() => {
    setPendingAttachments(null);
  }, []);
  const handlePendingInputConsumed = reactExports.useCallback(() => {
    setInput("");
    setPendingEditorDoc(null);
  }, []);
  const clearPendingCreateTimeout = reactExports.useCallback(() => {
    if (!pendingCreateTimeoutRef.current) return;
    clearTimeout(pendingCreateTimeoutRef.current);
    pendingCreateTimeoutRef.current = null;
  }, []);
  const failPendingCreate = reactExports.useCallback(
    (requestId, userMessage) => {
      const pending2 = pendingCreatePayloadRef.current;
      if (!pending2 || pending2.requestId !== requestId) return false;
      pendingCreatePayloadRef.current = null;
      clearPendingCreateTimeout();
      setCreatingSession(false);
      rejectSessionFocusIntent(
        requestId,
        sessionStore.getState().focusedSessionId ?? DRAFT_NEW_TAB,
      );
      const newTabIsFocused = sessionStore.getState().focusedSessionId === null;
      const preservedDraft = newTabIsFocused
        ? {
            text: currentInputTextRef.current || pending2.draft.text,
            editorDoc:
              currentInputEditorDocRef.current ?? pending2.draft.editorDoc,
            attachments:
              currentAttachmentsRef.current.length > 0
                ? currentAttachmentsRef.current
                : pending2.draft.attachments,
          }
        : pending2.draft;
      draftController.setNow(DRAFT_NEW_TAB, preservedDraft);
      if (newTabIsFocused) {
        currentInputTextRef.current = preservedDraft.text;
        currentInputEditorDocRef.current = preservedDraft.editorDoc;
        currentAttachmentsRef.current = preservedDraft.attachments;
        setPendingEditorDoc(preservedDraft.editorDoc ?? null);
        setInput(preservedDraft.text);
        setPendingAttachments(preservedDraft.attachments);
      }
      dedupedToast.error(userMessage ?? translate("chat.sendFailed"));
      return true;
    },
    [
      clearPendingCreateTimeout,
      draftController,
      rejectSessionFocusIntent,
      sessionStore,
      translate,
    ],
  );
  const [pendingEditorReset, setPendingEditorReset] = reactExports.useState(0);
  const [pendingComposerReset, setPendingComposerReset] =
    reactExports.useState(0);
  reactExports.useEffect(
    () => clearPendingCreateTimeout,
    [clearPendingCreateTimeout],
  );
  const queuedUserMessages = reactExports.useMemo(() => {
    if (!focusedSessionId) return [];
    return queuedUserMessagesBySession.get(focusedSessionId) ?? [];
  }, [focusedSessionId, queuedUserMessagesBySession]);
  const { queuedUserMessageScrollRequest, requestQueuedMessageScroll } =
    useQueuedMessageScrollRequest(focusedSessionId);
  const messageDeliveryStates = reactExports.useMemo(() => {
    return [...messageDeliveryByClientId.values()];
  }, [messageDeliveryByClientId]);
  const activateNewTabDraft = reactExports.useCallback(
    (supersedeFocusIntent = true, preserveSelectedMediaModels = false) => {
      if (!supersedeFocusIntent) {
        clearPendingSessionSwitch();
      } else {
        cancelPendingSessionSwitch(DRAFT_NEW_TAB);
      }
      const currentId = sessionStore.getState().focusedSessionId;
      if (currentId) {
        draftController.setNow(currentId, {
          text: currentInputTextRef.current,
          editorDoc: currentInputEditorDocRef.current,
          attachments: currentAttachmentsRef.current,
        });
      }
      const newTabDraft = draftController.get(DRAFT_NEW_TAB);
      currentInputTextRef.current = newTabDraft.text;
      currentInputEditorDocRef.current = newTabDraft.editorDoc;
      currentAttachmentsRef.current = newTabDraft.attachments;
      setPendingEditorDoc(newTabDraft.editorDoc ?? null);
      setPendingAttachments(newTabDraft.attachments);
      if (newTabDraft.text) {
        setInput(newTabDraft.text);
      } else {
        setPendingEditorReset((resetGeneration) => resetGeneration + 1);
      }
      setPendingNewTab(true);
      retainVisibleTranscriptUntilHydrationRef.current = false;
      visibleConversationHydrationRequestsRef.current.clear();
      setConversationLoading(false);
      resetForNewChat(preserveSelectedMediaModels);
      sessionStore.clearFocusedSession();
      sessionStore.evictTabForPhantom(currentId);
    },
    [
      cancelPendingSessionSwitch,
      clearPendingSessionSwitch,
      draftController,
      resetForNewChat,
      sessionStore,
    ],
  );
  const restoreDraft = reactExports.useCallback(() => {
    const sessionId = sessionStore.getState().focusedSessionId;
    const key2 = sessionId ?? DRAFT_NEW_TAB;
    const restored = draftController.restore(key2);
    if (!restored && currentInputTextRef.current) {
      return;
    }
    if (restored && restored.droppedCount > 0) {
      notifyDroppedAttachments();
    }
    const draft = restored?.draft ?? {
      text: "",
      attachments: [],
    };
    currentInputTextRef.current = draft.text;
    currentInputEditorDocRef.current = draft.editorDoc;
    currentAttachmentsRef.current = draft.attachments;
    setPendingEditorDoc(draft.editorDoc ?? null);
    setInput(draft.text);
    setPendingAttachments(draft.attachments);
  }, [draftController, notifyDroppedAttachments, sessionStore]);
  const remoteTool = useRemoteToolSession({
    sessionStore,
    focusedSessionId,
    send: send2,
  });
  const markConfirmedEmptyConversation = reactExports.useCallback(
    (workspaceKey) => {
      if (activeConversationWorkspaceRef.current !== workspaceKey) return;
      visibleConversationHydrationRequestsRef.current.clear();
      setConversationLoading(false);
    },
    [],
  );
  const requestVisibleConversationSwitch =
    useVisibleConversationHydrationRequest(
      visibleConversationHydrationRequestsRef,
      retainVisibleTranscriptUntilHydrationRef,
      prepareSessionSwitch,
      send2,
      setConversationLoading,
    );
  const handleSessionTabRestoreSettled = reactExports.useCallback(() => {
    if (!connectedRef.current || sessionStore.getState().openedTabIds.size > 0)
      return;
    updateInitialPayloadDispatchReadiness(true);
  }, [sessionStore, updateInitialPayloadDispatchReadiness]);
  const tabPersistence = useSessionTabPersistence(
    sessionStore,
    requestVisibleConversationSwitch,
    currentWorkspace,
    connected,
    getTextEditSessionIds,
    getTextEditPreservedFocusedSessionId,
    markConfirmedEmptyConversation,
    handleSessionTabRestoreSettled,
  );
  const pendingSessionListRequestRef = reactExports.useRef(null);
  const optimisticUserMessagesRef = reactExports.useRef(new Map());
  const previousSessionRefsRef = reactExports.useRef(null);
  const previousFocusedRef = reactExports.useRef(null);
  const authoritativeHydrationRequestIdsRef = reactExports.useRef(new Set());
  const historyReloadSessionByRequestIdRef = reactExports.useRef(new Map());
  const activeHistoryReloadRequestBySessionRef = reactExports.useRef(new Map());
  const historyReloadTimeoutsRef = reactExports.useRef(new Map());
  const idleBusyDiagnosticTimersRef = reactExports.useRef(new Map());
  const finishHistoryReload = reactExports.useCallback((requestId) => {
    const sessionId = historyReloadSessionByRequestIdRef.current.get(requestId);
    if (!sessionId) return false;
    historyReloadSessionByRequestIdRef.current.delete(requestId);
    authoritativeHydrationRequestIdsRef.current.delete(requestId);
    const timeout2 = historyReloadTimeoutsRef.current.get(requestId);
    if (timeout2) clearTimeout(timeout2);
    historyReloadTimeoutsRef.current.delete(requestId);
    if (
      activeHistoryReloadRequestBySessionRef.current.get(sessionId) ===
      requestId
    ) {
      activeHistoryReloadRequestBySessionRef.current.delete(sessionId);
      setHistoryReloadingSessionIds((current2) => {
        if (!current2.has(sessionId)) return current2;
        const next2 = new Set(current2);
        next2.delete(sessionId);
        return next2;
      });
    }
    return true;
  }, []);
  const disposeHistoryReloads = reactExports.useCallback(() => {
    for (const timeout2 of historyReloadTimeoutsRef.current.values()) {
      clearTimeout(timeout2);
    }
    for (const requestId of historyReloadSessionByRequestIdRef.current.keys()) {
      authoritativeHydrationRequestIdsRef.current.delete(requestId);
    }
    historyReloadTimeoutsRef.current.clear();
    historyReloadSessionByRequestIdRef.current.clear();
    activeHistoryReloadRequestBySessionRef.current.clear();
  }, []);
  const clearHistoryReloads = reactExports.useCallback(() => {
    disposeHistoryReloads();
    setHistoryReloadingSessionIds(new Set());
  }, [disposeHistoryReloads]);
  const STREAM_UI_FLUSH_MS = 200;
  const emptyListRetryRef = reactExports.useRef(false);
  const sessionsLoadingRef = reactExports.useRef(sessionsLoading);
  sessionsLoadingRef.current = sessionsLoading;
  const messagesRef = reactExports.useRef(messages2);
  messagesRef.current = messages2;
  const busyRef = reactExports.useRef(busy);
  busyRef.current = busy;
  const sentInitialPayloadKeyRef = reactExports.useRef(null);
  const pendingInitialPayloadKeyRef = reactExports.useRef(null);
  const pendingInitialClientMessageIdRef = reactExports.useRef(null);
  const onInitialMessageSentRef = reactExports.useRef(onInitialMessageSent);
  const initialPayloadReady = options.initialPayloadReady ?? true;
  onInitialMessageSentRef.current = onInitialMessageSent;
  const requestSessionListRaw = reactExports.useCallback(
    (reason) => {
      pendingSessionListRequestRef.current = {
        reason,
        workspace: currentWorkspace,
      };
      send2({
        type: "list_sessions",
      });
    },
    [currentWorkspace, send2],
  );
  const {
    revision: sessionListRevision,
    status: sessionListUnavailable,
    requestSessionList,
    clearSessionListRetryTimer,
    scheduleSessionListRetry,
    handleSessionListUnavailable,
    handleSessionListRecovered,
    retryNow: retrySessionList,
  } = useSessionListRetry({
    connected,
    connectedRef,
    requestSessionList: requestSessionListRaw,
    setSessionsLoading,
    workspaceKey: currentWorkspace,
  });
  const updateQueuedUserMessages = reactExports.useCallback(
    (sessionId, updater) => {
      const prev = queuedUserMessagesBySessionRef.current;
      const current2 = prev.get(sessionId) ?? [];
      const nextMessages = updater(current2);
      const next2 = new Map(prev);
      if (nextMessages.length > 0) {
        next2.set(sessionId, nextMessages);
      } else {
        next2.delete(sessionId);
      }
      queuedUserMessagesBySessionRef.current = next2;
      setQueuedUserMessagesBySession(next2);
    },
    [],
  );
  const upsertQueuedUserMessage = reactExports.useCallback(
    (sessionId, message2) => {
      updateQueuedUserMessages(sessionId, (prev) => {
        const index2 = prev.findIndex(
          (item) => item.clientMessageId === message2.clientMessageId,
        );
        if (index2 === -1) {
          return [...prev, message2].sort((leftMessage, rightMessage) => {
            const positionA = leftMessage.position ?? Number.MAX_SAFE_INTEGER;
            const positionB = rightMessage.position ?? Number.MAX_SAFE_INTEGER;
            return positionA === positionB
              ? leftMessage.createdAt - rightMessage.createdAt
              : positionA - positionB;
          });
        }
        const next2 = [...prev];
        next2[index2] = {
          ...next2[index2],
          ...message2,
        };
        return next2;
      });
    },
    [updateQueuedUserMessages],
  );
  const removeQueuedUserMessages = reactExports.useCallback(
    (sessionId, ids2) => {
      const queueIds = new Set(ids2.queueIds ?? []);
      const clientMessageIds = new Set(ids2.clientMessageIds ?? []);
      updateQueuedUserMessages(sessionId, (prev) => {
        if (queueIds.size === 0 && clientMessageIds.size === 0) return [];
        return prev.filter(
          (item) =>
            !(item.queueId && queueIds.has(item.queueId)) &&
            !clientMessageIds.has(item.clientMessageId),
        );
      });
    },
    [updateQueuedUserMessages],
  );
  const upsertMessageDeliveryState = reactExports.useCallback((state2) => {
    const next2 = new Map(messageDeliveryByClientIdRef.current);
    const nextState = {
      ...state2,
      updatedAt: Date.now(),
    };
    next2.set(state2.clientMessageId, nextState);
    recordMessageDeliveryTrace(nextState);
    if (next2.size > MESSAGE_DELIVERY_TRACE_LIMIT) {
      const overflow = next2.size - MESSAGE_DELIVERY_TRACE_LIMIT;
      const oldestIds = [...next2.values()]
        .sort((leftRecord, rightRecord) => leftRecord.updatedAt - rightRecord.updatedAt)
        .slice(0, overflow)
        .map((item) => item.clientMessageId);
      for (const clientMessageId of oldestIds) {
        const timer2 = messageDeliveryTimersRef.current.get(clientMessageId);
        if (timer2) {
          clearTimeout(timer2);
          messageDeliveryTimersRef.current.delete(clientMessageId);
        }
        next2.delete(clientMessageId);
      }
    }
    messageDeliveryByClientIdRef.current = next2;
    setMessageDeliveryByClientId(next2);
  }, []);
  const clearMessageDeliveryTimer = reactExports.useCallback(
    (clientMessageId) => {
      const timer2 = messageDeliveryTimersRef.current.get(clientMessageId);
      if (!timer2) return;
      clearTimeout(timer2);
      messageDeliveryTimersRef.current.delete(clientMessageId);
    },
    [],
  );
  const markMessageDeliveryFinal = reactExports.useCallback(
    (state2) => {
      clearMessageDeliveryTimer(state2.clientMessageId);
      upsertMessageDeliveryState(state2);
    },
    [clearMessageDeliveryTimer, upsertMessageDeliveryState],
  );
  const settlePreflightDeliveries = reactExports.useCallback(
    (sessionId, clientMessageIds, status) => {
      let settled = false;
      for (const clientMessageId of clientMessageIds) {
        const current2 = messageDeliveryByClientIdRef.current.get(clientMessageId);
        if (current2?.sessionId !== sessionId || !isMessagePreflight(current2))
          continue;
        markMessageDeliveryFinal({
          clientMessageId,
          sessionId,
          status,
          delivery: current2.delivery,
        });
        settled = true;
      }
      return settled;
    },
    [markMessageDeliveryFinal],
  );
  const appendMessageDeliveryError = reactExports.useCallback(
    (sessionId, content2, errorCode, stage, errorInfo, messageId) => {
      const details =
        stage && errorInfo?.details
          ? `message_delivery_stage:${stage}
${errorInfo.details}`
          : stage
            ? `message_delivery_stage:${stage}`
            : errorInfo?.details;
      sessionStore.pushMessage(
        {
          id: messageId ?? nextMessageId(),
          role: "agent",
          type: "error",
          content: errorInfo?.user_message ?? content2,
          error: {
            error_code: errorInfo?.error_code ?? errorCode,
            user_message: errorInfo?.user_message ?? content2,
            retryable: errorInfo?.retryable ?? true,
            ...(details
              ? {
                  details,
                }
              : {}),
          },
        },
        sessionId,
      );
    },
    [sessionStore],
  );
  const scheduleMessageDeliveryTimeout = reactExports.useCallback(
    (sessionId, clientMessageId, delivery, expectedStatus, timeoutMs) => {
      clearMessageDeliveryTimer(clientMessageId);
      const timer2 = setTimeout(() => {
        const current2 =
          messageDeliveryByClientIdRef.current.get(clientMessageId);
        messageDeliveryTimersRef.current.delete(clientMessageId);
        if (!current2 || current2.status !== expectedStatus) return;
        const timeoutMessage = translate(
          "chat.errors.deliveryTimeoutShort",
          "Message delivery timed out.",
        );
        const timeoutStage =
          expectedStatus === "sent" && !isMessagePreflight(current2)
            ? "bridge_error"
            : "runtime_timeout";
        if (pendingInitialClientMessageIdRef.current === clientMessageId) {
          chatLog.error("initial-payload timeout", {
            client_message_id: clientMessageId,
            session_id: sessionId,
            stage: timeoutStage,
          });
        }
        recordMessageDeliveryTimeoutBreadcrumb(
          sessionId,
          clientMessageId,
          timeoutStage,
        );
        recordError("chat:message-timeout", {
          sessionId,
          clientMessageId,
          stage: timeoutStage,
        });
        if (timeoutStage !== "bridge_error") {
          return;
        }
        upsertMessageDeliveryState({
          clientMessageId,
          sessionId,
          status: "timeout",
          delivery,
          stage: timeoutStage,
          error: timeoutMessage,
        });
        if (delivery === "normal") {
          sessionStore.setBusy(false, sessionId);
          appendMessageDeliveryError(
            sessionId,
            timeoutMessage,
            errorCodeForMessageDeliveryStage(timeoutStage),
            timeoutStage,
            void 0,
            messageDeliveryErrorMessageId(clientMessageId),
          );
        } else {
          removeQueuedUserMessages(sessionId, {
            clientMessageIds: [clientMessageId],
          });
        }
        trackEvent(TRACK_EVENTS.CHAT_MESSAGE_FAILED, {
          session_id: sessionId,
          error_type: "delivery",
          error_code: timeoutStage,
        });
        dedupedToast.error(
          translate(
            "chat.errors.deliveryTimeout",
            "Message delivery timed out. Please retry.",
          ),
          {
            id: messageDeliveryTimeoutToastId(clientMessageId),
          },
        );
      }, timeoutMs);
      messageDeliveryTimersRef.current.set(clientMessageId, timer2);
    },
    [
      appendMessageDeliveryError,
      clearMessageDeliveryTimer,
      removeQueuedUserMessages,
      sessionStore,
      translate,
      upsertMessageDeliveryState,
    ],
  );
  const markMessageDeliverySent = reactExports.useCallback(
    (sessionId, clientMessageId, delivery) => {
      upsertMessageDeliveryState({
        clientMessageId,
        sessionId,
        status: "sent",
        delivery,
      });
      scheduleMessageDeliveryTimeout(
        sessionId,
        clientMessageId,
        delivery,
        "sent",
        MESSAGE_DELIVERY_TIMEOUT_MS,
      );
    },
    [scheduleMessageDeliveryTimeout, upsertMessageDeliveryState],
  );
  const markMessageDeliveryReceived = reactExports.useCallback(
    (sessionId, clientMessageId, gatewayTimestamp) => {
      const current2 =
        messageDeliveryByClientIdRef.current.get(clientMessageId);
      if (
        current2?.status === "failed" ||
        current2?.status === "accepted" ||
        current2?.status === "started" ||
        (current2?.status === "timeout" && !isBridgeDeliveryTimeout(current2))
      ) {
        return;
      }
      const recovered = current2
        ? clearBridgeTimeoutPresentation(sessionStore, current2, true)
        : false;
      const delivery = current2?.delivery ?? "normal";
      upsertMessageDeliveryState({
        clientMessageId,
        sessionId,
        status: "received",
        delivery,
      });
      scheduleMessageDeliveryTimeout(
        sessionId,
        clientMessageId,
        delivery,
        "received",
        MESSAGE_RUNTIME_PROGRESS_TIMEOUT_MS,
      );
      if (recovered && current2) {
        recordMessageDeliveryTimeoutRecovered(
          current2,
          "message_received",
          gatewayTimestamp,
        );
      }
    },
    [scheduleMessageDeliveryTimeout, sessionStore, upsertMessageDeliveryState],
  );
  const markMessageDeliveryAccepted = reactExports.useCallback(
    (sessionId, clientMessageId) => {
      const current2 =
        messageDeliveryByClientIdRef.current.get(clientMessageId);
      if (
        !current2 ||
        current2.status === "failed" ||
        current2.status === "started" ||
        (current2.status === "timeout" && !isBridgeDeliveryTimeout(current2))
      ) {
        return;
      }
      const recovered = clearBridgeTimeoutPresentation(
        sessionStore,
        current2,
        true,
      );
      const optimistic = optimisticUserMessagesRef.current.get(sessionId);
      if (optimistic?.clientMessageId === clientMessageId) {
        optimisticUserMessagesRef.current.delete(sessionId);
      }
      clearMessageDeliveryTimer(clientMessageId);
      upsertMessageDeliveryState({
        clientMessageId,
        sessionId,
        status: "accepted",
        delivery: current2.delivery,
      });
      scheduleMessageDeliveryTimeout(
        sessionId,
        clientMessageId,
        current2.delivery,
        "accepted",
        MESSAGE_RUNTIME_PROGRESS_TIMEOUT_MS,
      );
      if (recovered) {
        recordMessageDeliveryTimeoutRecovered(current2, "message_accepted");
      }
    },
    [
      clearMessageDeliveryTimer,
      scheduleMessageDeliveryTimeout,
      sessionStore,
      upsertMessageDeliveryState,
    ],
  );
  const markMessageDeliveryStarted = reactExports.useCallback(
    (sessionId, clientMessageId) => {
      const current2 =
        messageDeliveryByClientIdRef.current.get(clientMessageId);
      if (
        !current2 ||
        current2.status === "failed" ||
        (current2.status === "timeout" && !isBridgeDeliveryTimeout(current2))
      ) {
        return false;
      }
      const recovered = clearBridgeTimeoutPresentation(
        sessionStore,
        current2,
        true,
      );
      const optimistic = optimisticUserMessagesRef.current.get(sessionId);
      if (optimistic?.clientMessageId === clientMessageId) {
        optimisticUserMessagesRef.current.delete(sessionId);
      }
      clearMessageDeliveryTimer(clientMessageId);
      upsertMessageDeliveryState({
        clientMessageId,
        sessionId,
        status: "started",
        delivery: current2.delivery,
      });
      if (recovered) {
        recordMessageDeliveryTimeoutRecovered(current2, "message_started");
      }
      return true;
    },
    [clearMessageDeliveryTimer, sessionStore, upsertMessageDeliveryState],
  );
  const clearMessageDeliveryTimersForSession = reactExports.useCallback(
    (sessionId) => {
      for (const state2 of messageDeliveryByClientIdRef.current.values()) {
        if (
          state2.sessionId === sessionId &&
          state2.delivery === "normal" &&
          !isMessagePreflight(state2) &&
          (state2.status === "sent" ||
            state2.status === "received" ||
            state2.status === "accepted")
        ) {
          clearMessageDeliveryTimer(state2.clientMessageId);
        }
      }
    },
    [clearMessageDeliveryTimer],
  );
  const completeActiveMessageDeliveriesForSession = reactExports.useCallback(
    (sessionId) => {
      const queuedIds = new Set(
        (queuedUserMessagesBySessionRef.current.get(sessionId) ?? []).map(
          (message2) => message2.clientMessageId,
        ),
      );
      const active2 = [...messageDeliveryByClientIdRef.current.values()].filter(
        (state2) =>
          state2.sessionId === sessionId &&
          !isMessagePreflight(state2) &&
          !queuedIds.has(state2.clientMessageId) &&
          ACTIVE_MESSAGE_DELIVERY_STATUSES.has(state2.status),
      );
      if (active2.length === 0) return;
      for (const state2 of active2) {
        clearMessageDeliveryTimer(state2.clientMessageId);
        upsertMessageDeliveryState({
          clientMessageId: state2.clientMessageId,
          sessionId: state2.sessionId,
          status: "completed",
          delivery: state2.delivery,
        });
      }
    },
    [clearMessageDeliveryTimer, upsertMessageDeliveryState],
  );
  const clearAllMessageDeliveryTimers = reactExports.useCallback(() => {
    for (const timer2 of messageDeliveryTimersRef.current.values()) {
      clearTimeout(timer2);
    }
    messageDeliveryTimersRef.current.clear();
  }, []);
  const markUnackedMessageDeliveriesFailedOnDisconnect =
    reactExports.useCallback(() => {
      const states = [...messageDeliveryByClientIdRef.current.values()].filter(
        (state2) => state2.status === "sent" && !isMessagePreflight(state2),
      );
      if (states.length === 0) return;
      const disconnectMessage = translate(
        "chat.errors.deliveryDisconnected",
        "Connection lost before the message was acknowledged. Please retry.",
      );
      for (const state2 of states) {
        clearMessageDeliveryTimer(state2.clientMessageId);
        upsertMessageDeliveryState({
          clientMessageId: state2.clientMessageId,
          sessionId: state2.sessionId,
          status: "failed",
          delivery: state2.delivery,
          stage: "runtime_send",
          error: disconnectMessage,
        });
        if (state2.delivery === "normal") {
          sessionStore.setBusy(false, state2.sessionId);
          appendMessageDeliveryError(
            state2.sessionId,
            disconnectMessage,
            ErrorCodes.RUNTIME_CONNECTION_LOST,
          );
          const optimistic = optimisticUserMessagesRef.current.get(
            state2.sessionId,
          );
          if (optimistic?.clientMessageId === state2.clientMessageId) {
            optimisticUserMessagesRef.current.delete(state2.sessionId);
          }
        } else {
          removeQueuedUserMessages(state2.sessionId, {
            clientMessageIds: [state2.clientMessageId],
          });
        }
        recordMessageDeliveryFailureBreadcrumb(
          state2.sessionId,
          state2.clientMessageId,
          "runtime_send",
          disconnectMessage,
        );
        recordError("chat:message-disconnected-before-ack", {
          sessionId: state2.sessionId,
          clientMessageId: state2.clientMessageId,
          delivery: state2.delivery,
        });
      }
    }, [
      appendMessageDeliveryError,
      clearMessageDeliveryTimer,
      removeQueuedUserMessages,
      sessionStore,
      translate,
      upsertMessageDeliveryState,
    ]);
  const markRuntimeProgressStartedForSession = reactExports.useCallback(
    (sessionId) => {
      const queuedIds = new Set(
        (queuedUserMessagesBySessionRef.current.get(sessionId) ?? []).map(
          (message2) => message2.clientMessageId,
        ),
      );
      const states = [...messageDeliveryByClientIdRef.current.values()];
      let started = false;
      for (const state2 of states) {
        if (
          state2.sessionId === sessionId &&
          !queuedIds.has(state2.clientMessageId) &&
          !isMessagePreflight(state2) &&
          (state2.status === "sent" ||
            state2.status === "received" ||
            state2.status === "accepted")
        ) {
          clearMessageDeliveryTimer(state2.clientMessageId);
          upsertMessageDeliveryState({
            clientMessageId: state2.clientMessageId,
            sessionId,
            status: "started",
            delivery: state2.delivery,
          });
          started = true;
        }
      }
      return started;
    },
    [clearMessageDeliveryTimer, upsertMessageDeliveryState],
  );
  const restoreBusySessionsAfterSessionList = reactExports.useCallback(
    (busyBeforeSessionList, listedSessions) => {
      if (busyBeforeSessionList.size === 0) return;
      const listedSessionIds = new Set(
        listedSessions.map((session) => session.id),
      );
      for (const state2 of messageDeliveryByClientIdRef.current.values()) {
        if (state2.delivery !== "normal") continue;
        if (!ACTIVE_MESSAGE_DELIVERY_STATUSES.has(state2.status)) continue;
        if (!busyBeforeSessionList.has(state2.sessionId)) continue;
        if (!listedSessionIds.has(state2.sessionId)) continue;
        sessionStore.setBusy(true, state2.sessionId);
      }
    },
    [sessionStore],
  );
  const appendStartedQueuedUserMessages = reactExports.useCallback(
    (sessionId, queuedMessages) => {
      if (queuedMessages.length === 0) return;
      sessionStore.updateMessages(sessionId, (prev) => {
        const existingIds = new Set(prev.map((message2) => message2.id));
        const next2 = [...prev];
        for (const queued of queuedMessages) {
          const messageId = `queued-user-${queued.client_message_id}`;
          if (existingIds.has(messageId)) continue;
          next2.push({
            id: messageId,
            role: "user",
            type: "text",
            content: queued.content,
            attachments: chatAttachmentsFromPaths(queued.attachments),
          });
          existingIds.add(messageId);
        }
        return next2.length === prev.length ? prev : next2;
      });
    },
    [sessionStore],
  );
  const registerDocumentEditSubmission = reactExports.useCallback(
    (request, clientMessageId, sessionId) => {
      documentEditRequestByClientIdRef.current.set(clientMessageId, request);
      setDocumentEditSubmissions((previous2) => {
        const next2 = new Map(previous2);
        next2.set(request.requestId, {
          requestId: request.requestId,
          editSessionId: request.editSessionId,
          nodeId: request.document.nodeId,
          clientMessageId,
          sessionId,
          status: "submitting",
        });
        while (next2.size > DOCUMENT_EDIT_SUBMISSION_LIMIT) {
          const oldestTerminal = [...next2].find(([, submission]) =>
            ["applied", "conflict", "failed"].includes(submission.status),
          );
          if (!oldestTerminal) break;
          next2.delete(oldestTerminal[0]);
        }
        return next2;
      });
    },
    [],
  );
  const updateDocumentEditByClientMessage = reactExports.useCallback(
    (clientMessageId, status, error) => {
      const request =
        documentEditRequestByClientIdRef.current.get(clientMessageId);
      if (!request) return;
      setDocumentEditSubmissions((previous2) => {
        const current2 = previous2.get(request.requestId);
        if (!current2) return previous2;
        const next2 = new Map(previous2);
        next2.set(request.requestId, {
          ...current2,
          status,
          ...(error
            ? {
                error,
              }
            : {}),
        });
        return next2;
      });
      if (status === "failed") {
        documentEditRequestByClientIdRef.current.delete(clientMessageId);
      }
    },
    [],
  );
  const dispatchQueuedUserMessage = reactExports.useCallback(
    (
      text2,
      attachments,
      canvasNodeAttachments,
      entityRefs,
      requestedClientMessageId,
      queueInsertBefore,
      languageDetectionText,
      browserContext,
    ) => {
      const sessionId = sessionStore.getState().focusedSessionId;
      if (!sessionId) return false;
      const groupId2 = accountScopedMessage.groupId("queue");
      if (groupId2 === null) return false;
      const queuedCount =
        queuedUserMessagesBySessionRef.current.get(sessionId)?.length ?? 0;
      if (queuedCount >= QUEUED_USER_MESSAGE_LIMIT) {
        dedupedToast.warning(
          translate(
            "chat.queue.limitReached",
            "Queued message limit reached. Please wait.",
          ),
        );
        return false;
      }
      const clientMessageId =
        requestedClientMessageId ??
        globalThis.crypto?.randomUUID?.() ??
        `queued-${Date.now()}-${Math.random().toString(36)}`;
      const queuedMessage = {
        clientMessageId,
        text: text2,
        status: "sending",
        createdAt: Date.now(),
      };
      if (attachments?.length) {
        queuedMessage.attachments = [...attachments];
      }
      if (canvasNodeAttachments?.length) {
        queuedMessage.canvasNodeAttachments = [...canvasNodeAttachments];
      }
      upsertQueuedUserMessage(sessionId, queuedMessage);
      requestQueuedMessageScroll(sessionId, clientMessageId);
      const message2 = {
        type: "message",
        content: text2,
        agent_type: "general",
        delivery: "defer_if_busy",
        client_message_id: clientMessageId,
        session_id: sessionId,
        group_id: groupId2,
        language_detection_text: languageDetectionText,
        browser_context: browserContext,
      };
      if (attachments?.length) {
        message2.attachments = attachments;
      }
      if (canvasNodeAttachments?.length) {
        message2.canvas_node_attachments = canvasNodeAttachments;
      }
      if (entityRefs?.length) {
        message2.entity_refs = entityRefs;
      }
      if (queueInsertBefore?.length) {
        message2.queue_insert_before = [...queueInsertBefore];
      }
      const sent = send2(message2);
      if (!sent) {
        removeQueuedUserMessages(sessionId, {
          clientMessageIds: [clientMessageId],
        });
        return false;
      }
      markMessageDeliverySent(sessionId, clientMessageId, "defer_if_busy");
      trackEvent(TRACK_EVENTS.CHAT_MESSAGE_SEND, {
        session_id: sessionId,
        text_length: text2.length,
        attachment_count: attachments?.length ?? 0,
        delivery: "defer_if_busy",
      });
      return true;
    },
    [
      markMessageDeliverySent,
      removeQueuedUserMessages,
      requestQueuedMessageScroll,
      send2,
      sessionStore,
      translate,
      upsertQueuedUserMessage,
    ],
  );
  const sendQueuedUserMessageNow = reactExports.useCallback(
    (message2) => {
      const sessionId = sessionStore.getState().focusedSessionId;
      if (!sessionId) return false;
      const sent = send2({
        type: "send_queued_user_message_now",
        session_id: sessionId,
        queue_id: message2.queueId,
        client_message_id: message2.clientMessageId,
      });
      if (!sent) return false;
      updateQueuedUserMessages(sessionId, (prev) =>
        prev.map((item) =>
          item.clientMessageId === message2.clientMessageId
            ? {
                ...item,
                status: "sending",
              }
            : item,
        ),
      );
      trackEvent(TRACK_EVENTS.CHAT_MESSAGE_SEND, {
        session_id: sessionId,
        text_length: message2.text.length,
        attachment_count: message2.attachments?.length ?? 0,
        delivery: "send_queued_now",
      });
      return true;
    },
    [send2, sessionStore, updateQueuedUserMessages],
  );
  const reorderQueuedUserMessage = reactExports.useCallback(
    (sourceIndex, targetIndex) => {
      const sessionId = sessionStore.getState().focusedSessionId;
      if (!sessionId) return;
      if (sourceIndex === targetIndex) return;
      const current2 = queuedUserMessagesBySessionRef.current.get(sessionId) ?? [];
      if (sourceIndex < 0 || sourceIndex >= current2.length) return;
      if (targetIndex < 0 || targetIndex >= current2.length) return;
      const next2 = [...current2];
      const [moved] = next2.splice(sourceIndex, 1);
      if (!moved) return;
      if (moved.status !== "queued") return;
      next2.splice(targetIndex, 0, moved);
      const queuedRows = next2.filter((item) => item.status === "queued");
      if (queuedRows.some((item) => !item.queueId)) return;
      updateQueuedUserMessages(sessionId, () => next2);
      send2({
        type: "reorder_queued_user_messages",
        session_id: sessionId,
        queue_ids: queuedRows.map((item) => item.queueId),
      });
    },
    [send2, sessionStore, updateQueuedUserMessages],
  );
  const dispatchUserMessage = reactExports.useCallback(
    (
      text2,
      attachments,
      canvasNodeAttachments,
      entityRefs,
      pluginNodeAttachments,
      targetSessionId,
      requestedClientMessageId,
      documentEditRequest,
      textEditContext,
      pluginEditContext,
      languageDetectionText,
      attachmentRefs,
      browserContext,
    ) => {
      const sessionId = targetSessionId ?? sessionStore.getState().focusedSessionId;
      if (!sessionId) return false;
      const chatAttachments = chatAttachmentsFromPaths(attachments);
      const messageId = nextMessageId();
      sessionStore.pushMessage(
        {
          id: messageId,
          role: "user",
          type: "text",
          content: text2,
          attachments: chatAttachments,
          pluginNodeAttachments: pluginNodeAttachments?.length
            ? pluginNodeAttachments
            : void 0,
          documentAnnotations: documentEditRequest?.annotations.length
            ? documentEditRequest.annotations
            : void 0,
        },
        sessionId,
      );
      const clientMessageId = requestedClientMessageId ?? crypto.randomUUID();
      if (
        pendingInitialPayloadKeyRef.current &&
        pendingInitialClientMessageIdRef.current === null
      ) {
        pendingInitialClientMessageIdRef.current = clientMessageId;
      }
      optimisticUserMessagesRef.current.set(sessionId, {
        messageId,
        clientMessageId,
        text: text2,
        attachments: [...currentAttachmentsRef.current],
      });
      if (documentEditRequest) {
        registerDocumentEditSubmission(
          documentEditRequest,
          clientMessageId,
          sessionId,
        );
      }
      const sent = accountScopedMessage.send("chat", send2, {
        type: "message",
        content: text2,
        agent_type: "general",
        attachments,
        attachment_refs: attachmentRefs,
        session_id: sessionId,
        client_message_id: clientMessageId,
        canvas_node_attachments: canvasNodeAttachments,
        entity_refs: entityRefs,
        plugin_node_attachments: pluginNodeAttachments,
        document_edit_request: documentEditRequest,
        text_edit_context: textEditContext,
        plugin_edit_context: pluginEditContext,
        language_detection_text: languageDetectionText,
        browser_context: browserContext,
      });
      if (!sent) {
        sessionStore.removeMessageById(sessionId, messageId);
        optimisticUserMessagesRef.current.delete(sessionId);
        if (documentEditRequest) {
          updateDocumentEditByClientMessage(
            clientMessageId,
            "failed",
            "WebSocket send failed.",
          );
        }
        return false;
      }
      markMessageDeliverySent(sessionId, clientMessageId, "normal");
      trackEvent(TRACK_EVENTS.CHAT_MESSAGE_SEND, {
        session_id: sessionId,
        text_length: text2.length,
        attachment_count: attachments?.length ?? 0,
      });
      sessionStore.setBusy(true, sessionId);
      return true;
    },
    [
      markMessageDeliverySent,
      registerDocumentEditSubmission,
      sessionStore,
      send2,
      updateDocumentEditByClientMessage,
    ],
  );
  const ensureTextAgentIntro = reactExports.useMemo(
    () => createTextAgentIntroEnsurer(sessionStore, nodeEditAgentKindRef, translate),
    [sessionStore, translate],
  );
  const handleMessage = reactExports.useCallback(
    (serverMessage) => {
      chatDiagnostics.received(serverMessage);
      if (controller.shouldIgnoreServerMessage(serverMessage)) return;
      settleQueuedUserMessageCancellation(serverMessage);
      if (
        serverMessage.type === "message_started" ||
        (serverMessage.type === "session_status_changed" && serverMessage.status === "running")
      ) {
        const timer2 = idleBusyDiagnosticTimersRef.current.get(serverMessage.session_id);
        if (timer2) clearTimeout(timer2);
        idleBusyDiagnosticTimersRef.current.delete(serverMessage.session_id);
      }
      if (serverMessage.type === "session_list" && !textEditBindingsReadyRef.current) {
        pendingSessionListUntilBindingsRef.current = serverMessage;
        return;
      }
      const mediaErrorMessage =
        serverMessage.type === "error" &&
        serverMessage.error?.error_code === ErrorCodes.INPUT_MEDIA_REVIEW_FAILED
          ? translate(
              serverMessage.error.retryable
                ? "chat.errors.mediaReviewFailed"
                : "chat.errors.mediaReviewBlocked",
            )
          : void 0;
      const focusSafeMsg = fenceSessionActivation2(
        mediaErrorMessage && serverMessage.type === "error" && serverMessage.error
          ? {
              ...serverMessage,
              content: mediaErrorMessage,
              error: {
                ...serverMessage.error,
                user_message: mediaErrorMessage,
              },
            }
          : serverMessage,
      );
      if (mediaErrorMessage && serverMessage.type === "error" && !serverMessage.request_id) {
        dedupedToast.warning(mediaErrorMessage);
        return;
      }
      if (serverMessage.type === "session_rename_failed") {
        const latestRequestId = latestRenameRequestBySessionRef.current.get(
          serverMessage.session_id,
        );
        if (latestRequestId === serverMessage.request_id) {
          latestRenameRequestBySessionRef.current.delete(serverMessage.session_id);
          dedupedToast.error(
            serverMessage.error.error_code === ErrorCodes.CONTENT_BLOCKED
              ? translate("rename.safetyBlocked")
              : translate("session.renameFailed", "Failed to rename chat"),
          );
        }
        return;
      }
      if (serverMessage.type === "session_renamed" && serverMessage.request_id) {
        for (const [
          sessionId,
          requestId,
        ] of latestRenameRequestBySessionRef.current) {
          if (requestId !== serverMessage.request_id) continue;
          latestRenameRequestBySessionRef.current.delete(sessionId);
          break;
        }
      }
      if (serverMessage.type === "error" && serverMessage.request_id) {
        authoritativeHydrationRequestIdsRef.current.delete(serverMessage.request_id);
        const displayError =
          serverMessage.error?.user_message ?? serverMessage.content ?? translate("chat.sendFailed");
        if (
          initialPayloadAwaitingDispatchRef.current ||
          !failVisibleConversationHydration(serverMessage.request_id, displayError)
        ) {
          if (
            visibleConversationHydrationRequestsRef.current.delete(
              serverMessage.request_id,
            )
          ) {
            setConversationLoading(false);
          }
        }
        if (
          initialPayloadAwaitingDispatchRef.current &&
          !initialPayloadDispatchReadyRef.current
        ) {
          reportInitialPayloadHydrationStalled("switch_failed");
        }
        if (finishHistoryReload(serverMessage.request_id)) {
          dedupedToast.error(displayError);
          return;
        }
        if (failPendingCreate(serverMessage.request_id, displayError)) return;
        const pendingTextCreate = pendingTextEditCreatesRef.current.get(
          serverMessage.request_id,
        );
        if (pendingTextCreate) {
          pendingTextEditCreatesRef.current.delete(serverMessage.request_id);
          const active2 = activeTextEditAgentRef.current;
          if (
            active2 &&
            pendingTextCreate.transactionId ===
              textEditTransactionId(active2.editor)
          ) {
            const reconnectRetryCount = active2.reconnectFailClosed
              ? active2.reconnectRetryCount + 1
              : active2.reconnectRetryCount;
            const failed = {
              ...active2,
              status: active2.reconnectFailClosed ? "resolving" : "error",
              reconnectRetryCount,
            };
            activeTextEditAgentRef.current = failed;
            setTextEditAgentState({
              editor: failed.editor,
              sessionId: failed.sessionId,
              status: failed.status,
            });
            setSwitching(false);
            setSwitchError(displayError);
            if (active2.reconnectFailClosed) {
              scheduleSessionListRetry(
                Math.min(1e3 * 2 ** (reconnectRetryCount - 1), 1e4),
              );
            }
          }
          rejectSessionFocusIntent(
            serverMessage.request_id,
            active2?.previousSessionId ?? DRAFT_NEW_TAB,
          );
          return;
        }
        if (pendingForkDraftsRef.current.delete(serverMessage.request_id)) {
          rejectSessionFocusIntent(
            serverMessage.request_id,
            sessionStore.getState().focusedSessionId ?? DRAFT_NEW_TAB,
          );
          dedupedToast.error(displayError);
          return;
        }
        const pendingSwitch = pendingSessionSwitchRef.current;
        if (pendingSwitch?.requestId === serverMessage.request_id) {
          pendingSessionSwitchRef.current = null;
          setSwitching(false);
          rejectSessionFocusIntent(
            serverMessage.request_id,
            pendingSwitch.sourceSessionId ?? DRAFT_NEW_TAB,
          );
          setSwitchError(displayError);
          const active2 = activeTextEditAgentRef.current;
          if (
            active2 &&
            pendingSwitch.textEditTransactionId ===
              textEditTransactionId(active2.editor)
          ) {
            const reconnectRetryCount = active2.reconnectFailClosed
              ? active2.reconnectRetryCount + 1
              : active2.reconnectRetryCount;
            const failed = {
              ...active2,
              status: active2.reconnectFailClosed ? "resolving" : "error",
              reconnectRetryCount,
            };
            activeTextEditAgentRef.current = failed;
            setTextEditAgentState({
              editor: failed.editor,
              sessionId: failed.sessionId,
              status: failed.status,
            });
            if (active2.reconnectFailClosed) {
              scheduleSessionListRetry(
                Math.min(1e3 * 2 ** (reconnectRetryCount - 1), 1e4),
              );
            }
          }
          return;
        }
      }
      if (serverMessage.type === "session_list") {
        const sessionListReason =
          pendingSessionListRequestRef.current?.reason ?? "initial";
        pendingSessionListRequestRef.current = null;
        handleSessionListRecovered();
        const reconnectingFromPreviousTabs = Boolean(
          previousSessionRefsRef.current &&
          previousSessionRefsRef.current.length > 0,
        );
        const busyBeforeSessionList = new Set(
          [...sessionStore.getState().sessions.entries()]
            .filter(([, session]) => session.busy)
            .map(([sessionId]) => sessionId),
        );
        controller.handleServerMessage(focusSafeMsg);
        syncTextEditBindingsWithSessions();
        const ordinarySessions = serverMessage.sessions.filter(
          (session) =>
            !textEditSessionIdsRef.current.has(session.id) &&
            !(session.runtime_session_id
              ? textEditSessionIdsRef.current.has(session.runtime_session_id)
              : false),
        );
        if (!reconnectingFromPreviousTabs) {
          restoreBusySessionsAfterSessionList(
            busyBeforeSessionList,
            serverMessage.sessions,
          );
        }
        setSessionsLoading(false);
        void refreshAssetIndex({
          qc: queryClient2,
          gatewayScopeKey,
        });
        if (sessionListReason === "refresh") {
          return;
        }
        updateInitialPayloadDispatchReadiness(false);
        if (
          serverMessage.sessions.length === 0 &&
          previousSessionRefsRef.current &&
          previousSessionRefsRef.current.length > 0 &&
          !emptyListRetryRef.current
        ) {
          emptyListRetryRef.current = true;
          setTimeout(() => {
            if (connectedRef.current) {
              requestSessionList("initial");
            }
          }, 2e3);
          return;
        }
        emptyListRetryRef.current = false;
        if (serverMessage.sessions.length === 0 && previousSessionRefsRef.current) {
          previousSessionRefsRef.current = null;
          previousFocusedRef.current = null;
        }
        if (serverMessage.sessions.length > 0) {
          const previousRefs = previousSessionRefsRef.current;
          const previousFocused = previousFocusedRef.current;
          previousSessionRefsRef.current = null;
          previousFocusedRef.current = null;
          if (previousRefs && previousRefs.length > 0) {
            const sessionsById = new Map(serverMessage.sessions.map((session) => [session.id, session]));
            const resolveReconnectId = (sessionReference) => {
              if (!sessionReference) return null;
              if (sessionsById.has(sessionReference.uiSessionId)) return sessionReference.uiSessionId;
              if (
                sessionReference.runtimeSessionId &&
                sessionsById.has(sessionReference.runtimeSessionId)
              ) {
                return sessionReference.runtimeSessionId;
              }
              return null;
            };
            const restoreIds = [];
            const seenRestoreIds = new Set();
            for (const sessionReference of previousRefs) {
              const sessionId = resolveReconnectId(sessionReference);
              if (!sessionId || seenRestoreIds.has(sessionId)) continue;
              restoreIds.push(sessionId);
              seenRestoreIds.add(sessionId);
            }
            const focusedId = resolveReconnectId(previousFocused);
            const sessionsToRestore = restoreIds
              .map((sessionId) => sessionsById.get(sessionId))
              .filter((session) => session !== void 0);
            const nonFocused = sessionsToRestore.filter(
              (session) => session.id !== focusedId,
            );
            const focused = sessionsToRestore.find((session) => session.id === focusedId);
            for (const sessionReference of previousRefs) {
              const resolvedId = resolveReconnectId(sessionReference);
              if (resolvedId && resolvedId !== sessionReference.uiSessionId) {
                const activeTextEdit = activeTextEditAgentRef.current;
                if (activeTextEdit?.previousSessionId === sessionReference.uiSessionId) {
                  activeTextEditAgentRef.current = {
                    ...activeTextEdit,
                    previousSessionId: resolvedId,
                  };
                }
                sessionStore.rekeySession(sessionReference.uiSessionId, resolvedId);
              }
            }
            for (const session of sessionsToRestore) {
              if (!textEditSessionIdsRef.current.has(session.id))
                sessionStore.openTab(session.id);
            }
            for (const session of nonFocused) {
              const request = prepareSessionSwitch(session.id, {
                activate: false,
              });
              if (send2(request)) {
                authoritativeHydrationRequestIdsRef.current.add(
                  request.request_id,
                );
              }
            }
            if (focused) {
              const request = prepareSessionSwitch(focused.id);
              if (send2(request)) {
                authoritativeHydrationRequestIdsRef.current.add(
                  request.request_id,
                );
              }
            } else {
              const fallback =
                sessionsToRestore.find((session) =>
                  activeTextEditAgentRef.current
                    ? true
                    : !textEditSessionIdsRef.current.has(session.id),
                ) ??
                ordinarySessions.find((session) => session.active) ??
                ordinarySessions[0];
              if (fallback) {
                if (!textEditSessionIdsRef.current.has(fallback.id)) {
                  sessionStore.openTab(fallback.id);
                }
                const request = prepareSessionSwitch(fallback.id);
                if (send2(request)) {
                  authoritativeHydrationRequestIdsRef.current.add(
                    request.request_id,
                  );
                }
              }
            }
            tabPersistence.handleSessionList(
              ordinarySessions /* isReconnect */,
              true,
            );
          } else {
            tabPersistence.handleSessionList(
              ordinarySessions /* isReconnect */,
              false,
            );
            if (
              ordinarySessions.length === 0 &&
              !activeTextEditAgentRef.current
            ) {
              activateNewTabDraft(false, true);
            }
          }
        } else {
          activateNewTabDraft(false, true);
          tabPersistence.handleSessionList(
            ordinarySessions /* isReconnect */,
            false,
          );
          updateInitialPayloadDispatchReadiness(true);
        }
        return;
      }
      if (serverMessage.type === "session_list_unavailable") {
        pendingSessionListRequestRef.current = null;
        updateInitialPayloadDispatchReadiness(false);
        handleSessionListUnavailable(serverMessage.reason, serverMessage.retry_after_ms);
        return;
      }
      if (serverMessage.type === "document_edit_result") {
        const ownsRequest =
          serverMessage.origin === "agent" ||
          Array.from(documentEditRequestByClientIdRef.current.values()).some(
            (request) => request.requestId === serverMessage.requestId,
          );
        setDocumentEditSubmissions((previous2) => {
          const current2 = previous2.get(serverMessage.requestId);
          if (!current2 || current2.nodeId !== serverMessage.nodeId) return previous2;
          const next2 = new Map(previous2);
          const turnActive =
            current2.status === "submitting" ||
            current2.status === "accepted" ||
            current2.status === "running";
          if (serverMessage.status === "conflict" && turnActive) {
            next2.set(serverMessage.requestId, {
              ...current2,
              result: serverMessage,
            });
            return next2;
          }
          next2.set(serverMessage.requestId, {
            ...current2,
            status: serverMessage.status,
            result: serverMessage,
            ...(serverMessage.error
              ? {
                  error: serverMessage.error,
                }
              : {}),
          });
          documentEditRequestByClientIdRef.current.delete(
            current2.clientMessageId,
          );
          return next2;
        });
        if (
          ownsRequest &&
          serverMessage.status === "applied" &&
          Array.isArray(serverMessage.appliedEdits) &&
          serverMessage.appliedEdits.length > 0
        ) {
          const reviewSession = {
            requestId: serverMessage.requestId,
            nodeId: serverMessage.nodeId,
            contentHash: serverMessage.contentHash,
            appliedEdits: serverMessage.appliedEdits,
          };
          if (options.isActive === false) {
            pendingDiffReviewSessionRef.current = reviewSession;
          } else {
            useDiffReviewStore.getState().startSession(reviewSession);
          }
        }
        return;
      }
      if (serverMessage.type === "message_received") {
        if (serverMessage.phase) {
          const current2 = messageDeliveryByClientIdRef.current.get(
            serverMessage.client_message_id,
          );
          if (
            current2?.status === "failed" ||
            current2?.status === "accepted" ||
            current2?.status === "started" ||
            current2?.status === "completed"
          )
            return;
          if (current2)
            clearBridgeTimeoutPresentation(sessionStore, current2, true);
          upsertMessageDeliveryState({
            clientMessageId: serverMessage.client_message_id,
            sessionId: serverMessage.session_id,
            status: "sent",
            phase: serverMessage.phase,
            delivery: current2?.delivery ?? "normal",
          });
          scheduleMessageDeliveryTimeout(
            serverMessage.session_id,
            serverMessage.client_message_id,
            current2?.delivery ?? "normal",
            "sent",
            serverMessage.phase === "media_review"
              ? 11 * 6e4
              : MESSAGE_RUNTIME_PROGRESS_TIMEOUT_MS,
          );
          return;
        }
        updateDocumentEditByClientMessage(serverMessage.client_message_id, "accepted");
        const optimistic = optimisticUserMessagesRef.current.get(
          serverMessage.session_id,
        );
        if (optimistic?.clientMessageId === serverMessage.client_message_id) {
          optimisticUserMessagesRef.current.delete(serverMessage.session_id);
        }
        markMessageDeliveryReceived(
          serverMessage.session_id,
          serverMessage.client_message_id,
          serverMessage.timestamp,
        );
        if (
          pendingInitialClientMessageIdRef.current === serverMessage.client_message_id
        ) {
          chatLog.info("initial-payload acknowledged", {
            client_message_id: serverMessage.client_message_id,
            session_id: serverMessage.session_id,
            gateway_timestamp: serverMessage.timestamp,
          });
          pendingInitialClientMessageIdRef.current = null;
          pendingInitialPayloadKeyRef.current = null;
          onInitialMessageSentRef.current?.();
        }
        recordAction("chat:message-received", {
          sessionId: serverMessage.session_id,
          clientMessageId: serverMessage.client_message_id,
        });
        return;
      }
      if (serverMessage.type === "message_accepted") {
        updateDocumentEditByClientMessage(serverMessage.client_message_id, "accepted");
        if (serverMessage.runtime_session_id) {
          sessionStore.setRuntimeSessionId(
            serverMessage.session_id,
            serverMessage.runtime_session_id,
          );
          syncTextEditBindingsWithSessions();
        }
        markMessageDeliveryAccepted(serverMessage.session_id, serverMessage.client_message_id);
        recordAction("chat:message-accepted", {
          sessionId: serverMessage.session_id,
          clientMessageId: serverMessage.client_message_id,
          runtimeSessionId: serverMessage.runtime_session_id,
        });
        return;
      }
      if (serverMessage.type === "session_stalled") {
        handleSessionStalledMessage(serverMessage);
        return;
      }
      if (serverMessage.type === "message_started") {
        cancelInFlightSessionIdsRef.current.delete(serverMessage.session_id);
        updateDocumentEditByClientMessage(serverMessage.client_message_id, "running");
        const previousDeliveryState = messageDeliveryByClientIdRef.current.get(
          serverMessage.client_message_id,
        );
        const transitioned = markMessageDeliveryStarted(
          serverMessage.session_id,
          serverMessage.client_message_id,
        );
        if (transitioned || !previousDeliveryState) {
          sessionStore.setBusy(true, serverMessage.session_id);
        }
        recordAction("chat:message-started", {
          sessionId: serverMessage.session_id,
          clientMessageId: serverMessage.client_message_id,
        });
        return;
      }
      if (serverMessage.type === "message_failed") {
        if (
          pendingInitialClientMessageIdRef.current === serverMessage.client_message_id
        ) {
          chatLog.error("initial-payload failed", {
            client_message_id: serverMessage.client_message_id,
            session_id: serverMessage.session_id,
            stage: serverMessage.stage,
            error_code: serverMessage.error_info?.error_code ?? null,
          });
        }
        updateDocumentEditByClientMessage(
          serverMessage.client_message_id,
          "failed",
          serverMessage.error,
        );
        const isBusyRejection =
          serverMessage.stage === "gateway_validation" &&
          /agent is busy|pending operations/i.test(serverMessage.error);
        if (!isBusyRejection) {
          sessionStore.setBusy(false, serverMessage.session_id);
          clearStalledForSession(serverMessage.session_id);
        }
        removeQueuedUserMessages(serverMessage.session_id, {
          clientMessageIds: [serverMessage.client_message_id],
        });
        const previousDeliveryState = messageDeliveryByClientIdRef.current.get(
          serverMessage.client_message_id,
        );
        if (previousDeliveryState?.status === "failed") {
          return;
        }
        if (previousDeliveryState) {
          clearBridgeTimeoutPresentation(
            sessionStore,
            previousDeliveryState,
            false,
          );
        }
        const previousDelivery = previousDeliveryState?.delivery ?? "normal";
        const sanitizedError = sanitizeMessageDeliveryError(serverMessage.error);
        const errorInfo = serverMessage.error_info;
        const isMediaReviewFailure =
          errorInfo?.error_code === ErrorCodes.INPUT_MEDIA_REVIEW_FAILED;
        const displayError = isMediaReviewFailure
          ? errorInfo.retryable
            ? translate("chat.errors.mediaReviewFailed")
            : translate("chat.errors.mediaReviewBlocked")
          : (errorInfo?.user_message ??
            (TECHNICAL_MESSAGE_DELIVERY_ERROR_PATTERN.test(sanitizedError)
              ? translate(
                  "chat.errors.deliveryFailed",
                  "Message failed to send. Please retry.",
                )
              : sanitizedError));
        const displayErrorCode =
          errorInfo?.error_code ?? errorCodeForMessageDeliveryStage(serverMessage.stage);
        const isContentBlockedDeliveryFailure =
          serverMessage.stage === "gateway_validation" &&
          (errorInfo?.error_code === ErrorCodes.CONTENT_BLOCKED ||
            serverMessage.error.toLowerCase().includes("content blocked"));
        const isWorkspaceCapacityDeliveryFailure =
          serverMessage.stage === "gateway_validation" &&
          errorInfo?.error_code ===
            ErrorCodes.WORKSPACE_CONCURRENCY_LIMIT_REACHED;
        markMessageDeliveryFinal({
          clientMessageId: serverMessage.client_message_id,
          sessionId: serverMessage.session_id,
          status: "failed",
          delivery: previousDelivery,
          stage: serverMessage.stage,
          error: displayError,
        });
        if (isContentBlockedDeliveryFailure) {
          return;
        }
        if (isWorkspaceCapacityDeliveryFailure || isMediaReviewFailure) {
          const optimistic2 = optimisticUserMessagesRef.current.get(
            serverMessage.session_id,
          );
          if (optimistic2?.clientMessageId === serverMessage.client_message_id) {
            sessionStore.removeMessageById(
              serverMessage.session_id,
              optimistic2.messageId,
            );
            if (sessionStore.getFocusedSession()?.id === serverMessage.session_id) {
              const restoredAttachments =
                currentAttachmentsRef.current.length > 0
                  ? currentAttachmentsRef.current
                  : restoreRejectedAttachments(optimistic2.attachments);
              if (
                currentAttachmentsRef.current.length === 0 &&
                restoredAttachments.length > 0
              ) {
                currentAttachmentsRef.current = restoredAttachments;
                setPendingAttachments(restoredAttachments);
              }
              setInput((previous2) => {
                const restoredText = previous2 || optimistic2.text;
                currentInputTextRef.current = restoredText;
                draftController.setNow(serverMessage.session_id, {
                  text: restoredText,
                  editorDoc: currentInputEditorDocRef.current,
                  attachments: restoredAttachments,
                });
                return restoredText;
              });
            }
            optimisticUserMessagesRef.current.delete(serverMessage.session_id);
          }
          if (
            pendingInitialClientMessageIdRef.current === serverMessage.client_message_id
          ) {
            pendingInitialClientMessageIdRef.current = null;
          }
          trackEvent(TRACK_EVENTS.CHAT_MESSAGE_FAILED, {
            session_id: serverMessage.session_id,
            error_type: isMediaReviewFailure
              ? "input_media_review"
              : "workspace_capacity",
            error_code: isMediaReviewFailure
              ? ErrorCodes.INPUT_MEDIA_REVIEW_FAILED
              : ErrorCodes.WORKSPACE_CONCURRENCY_LIMIT_REACHED,
          });
          dedupedToast.warning(
            isMediaReviewFailure
              ? displayError
              : translate(
                  "chat.errors.workspaceConcurrencyLimit",
                  "Ten projects are already working. Wait for one to finish or stop a running task, then try again.",
                ),
          );
          return;
        }
        const optimistic = optimisticUserMessagesRef.current.get(
          serverMessage.session_id,
        );
        if (optimistic?.clientMessageId === serverMessage.client_message_id) {
          optimisticUserMessagesRef.current.delete(serverMessage.session_id);
        }
        if (previousDelivery === "normal") {
          appendMessageDeliveryError(
            serverMessage.session_id,
            displayError,
            displayErrorCode,
            serverMessage.stage,
            errorInfo,
          );
        }
        recordMessageDeliveryFailureBreadcrumb(
          serverMessage.session_id,
          serverMessage.client_message_id,
          serverMessage.stage,
          errorInfo?.details ?? serverMessage.error,
        );
        recordError("chat:message-failed", {
          sessionId: serverMessage.session_id,
          clientMessageId: serverMessage.client_message_id,
          stage: serverMessage.stage,
        });
        trackEvent(TRACK_EVENTS.CHAT_MESSAGE_FAILED, {
          session_id: serverMessage.session_id,
          error_type: "delivery",
          error_code: errorInfo?.error_code ?? serverMessage.stage,
        });
        if (!serverMessage.error.toLowerCase().includes("content blocked")) {
          dedupedToast.error(
            translate(
              "chat.errors.deliveryFailed",
              "Message failed to send. Please retry.",
            ),
          );
        }
        return;
      }
      if (
        (serverMessage.type === "error" || serverMessage.type === "session_error") &&
        serverMessage.error?.error_code === ErrorCodes.CONTENT_BLOCKED
      ) {
        const sessionId = serverMessage.session_id;
        if (sessionId) {
          sessionStore.setBusy(false, sessionId);
          updateQueuedUserMessages(sessionId, (prev) => {
            const lastSendingIndex = [...prev]
              .reverse()
              .findIndex((queued) => queued.status === "sending");
            if (lastSendingIndex === -1) return prev;
            const index2 = prev.length - 1 - lastSendingIndex;
            return prev.filter((message, index) => index !== index2);
          });
          const optimistic = optimisticUserMessagesRef.current.get(sessionId);
          if (optimistic) {
            const previousDeliveryState =
              messageDeliveryByClientIdRef.current.get(
                optimistic.clientMessageId,
              );
            if (previousDeliveryState) {
              clearBridgeTimeoutPresentation(
                sessionStore,
                previousDeliveryState,
                false,
              );
            }
            if (previousDeliveryState?.status !== "failed") {
              const errorMessage2 =
                serverMessage.error?.user_message ??
                serverMessage.content ??
                translate("chat.errors.contentBlocked");
              markMessageDeliveryFinal({
                clientMessageId: optimistic.clientMessageId,
                sessionId,
                status: "failed",
                delivery: previousDeliveryState?.delivery ?? "normal",
                stage: "gateway_validation",
                error: sanitizeMessageDeliveryError(errorMessage2),
              });
            }
            sessionStore.removeMessageById(sessionId, optimistic.messageId);
            const isFocused = sessionStore.getFocusedSession()?.id === sessionId;
            if (isFocused) {
              setInput((prev) => {
                if (prev) return prev;
                currentInputTextRef.current = optimistic.text;
                draftController.setNow(sessionId, {
                  text: optimistic.text,
                  editorDoc: currentInputEditorDocRef.current,
                  attachments: currentAttachmentsRef.current,
                });
                return optimistic.text;
              });
            }
            optimisticUserMessagesRef.current.delete(sessionId);
            if (
              pendingInitialClientMessageIdRef.current ===
              optimistic.clientMessageId
            ) {
              pendingInitialClientMessageIdRef.current = null;
              pendingInitialPayloadKeyRef.current = null;
              onInitialMessageSentRef.current?.();
            }
          }
        }
        trackEvent(TRACK_EVENTS.CHAT_MESSAGE_FAILED, {
          session_id: serverMessage.session_id,
          error_type: "permission",
          error_code: serverMessage.error?.error_code,
          error_message: serverMessage.error?.user_message ?? "content blocked",
        });
        dedupedToast.warning(translate("chat.errors.contentBlocked"));
        return;
      }
      if (serverMessage.type === "queued_user_message") {
        const queued = serverMessage;
        const wasPreparing = isMessagePreflight(
          messageDeliveryByClientIdRef.current.get(queued.client_message_id),
        );
        const optimistic = optimisticUserMessagesRef.current.get(
          queued.session_id,
        );
        if (optimistic?.clientMessageId === queued.client_message_id) {
          sessionStore.removeMessageById(
            queued.session_id,
            optimistic.messageId,
          );
          optimisticUserMessagesRef.current.delete(queued.session_id);
        }
        const startedMessageId = `queued-user-${queued.client_message_id}`;
        sessionStore.removeMessageById(queued.session_id, startedMessageId);
        markMessageDeliveryFinal({
          clientMessageId: queued.client_message_id,
          sessionId: queued.session_id,
          status: "received",
          delivery: "defer_if_busy",
        });
        if (wasPreparing) sessionStore.setBusy(false, queued.session_id);
        const queuedMessage = {
          clientMessageId: queued.client_message_id,
          queueId: queued.queue_id,
          text: queued.content,
          position: queued.position,
          status: "queued",
          createdAt: queued.created_at,
          reviewPaused: queued.review_paused,
        };
        if (queued.attachments?.length) {
          queuedMessage.attachments = queued.attachments;
        }
        if (queued.canvas_node_attachments?.length) {
          queuedMessage.canvasNodeAttachments = queued.canvas_node_attachments;
        }
        upsertQueuedUserMessage(queued.session_id, queuedMessage);
        if (sessionStore.getState().focusedSessionId === queued.session_id) {
          setMessages(sessionStore.getFocusedMessages());
        }
        return;
      }
      if (serverMessage.type === "queued_user_messages_delivered") {
        settlePreflightDeliveries(
          serverMessage.session_id,
          serverMessage.client_message_ids,
          "started",
        );
        removeQueuedUserMessages(serverMessage.session_id, {
          queueIds: serverMessage.queue_ids,
          clientMessageIds: serverMessage.client_message_ids,
        });
        return;
      }
      if (serverMessage.type === "queued_user_messages_started") {
        const startedMessages =
          serverMessage.phase === "preparing"
            ? serverMessage.messages.filter((message2) => {
                const current2 = messageDeliveryByClientIdRef.current.get(
                  message2.client_message_id,
                );
                return (
                  !current2 ||
                  (current2.status === "sent" && !current2.phase) ||
                  current2.status === "received"
                );
              })
            : serverMessage.messages;
        if (startedMessages.length === 0) return;
        if (serverMessage.phase === "preparing") {
          for (const message2 of startedMessages) {
            markMessageDeliveryFinal({
              clientMessageId: message2.client_message_id,
              sessionId: serverMessage.session_id,
              status: "sent",
              phase: "preparing",
              delivery: "defer_if_busy",
            });
          }
        } else {
          settlePreflightDeliveries(
            serverMessage.session_id,
            startedMessages.map((message2) => message2.client_message_id),
            "started",
          );
        }
        removeQueuedUserMessages(serverMessage.session_id, {
          queueIds: startedMessages.map((message2) => message2.queue_id),
          clientMessageIds: startedMessages.map(
            (message2) => message2.client_message_id,
          ),
        });
        appendStartedQueuedUserMessages(serverMessage.session_id, startedMessages);
        if (sessionStore.getState().focusedSessionId === serverMessage.session_id) {
          setMessages(sessionStore.getFocusedMessages());
        }
        sessionStore.setBusy(true, serverMessage.session_id);
        return;
      }
      if (serverMessage.type === "queued_user_messages_cancelled") {
        const cancelledIds = new Set(serverMessage.client_message_ids ?? []);
        for (const queued of queuedUserMessagesBySessionRef.current.get(
          serverMessage.session_id,
        ) ?? []) {
          if (queued.queueId && serverMessage.queue_ids?.includes(queued.queueId)) {
            cancelledIds.add(queued.clientMessageId);
          }
        }
        const settled = settlePreflightDeliveries(
          serverMessage.session_id,
          [...cancelledIds],
          "completed",
        );
        if (
          settled &&
          ![...messageDeliveryByClientIdRef.current.values()].some(
            (state2) =>
              state2.sessionId === serverMessage.session_id && isMessagePreflight(state2),
          )
        ) {
          sessionStore.setBusy(false, serverMessage.session_id);
        }
        removeQueuedUserMessages(serverMessage.session_id, {
          queueIds: serverMessage.queue_ids,
          clientMessageIds: serverMessage.client_message_ids,
        });
        return;
      }
      if (serverMessage.type === "queued_user_messages_reordered") {
        const order2 = new Map(
          serverMessage.queue_ids.map((queueId, index2) => [queueId, index2]),
        );
        updateQueuedUserMessages(serverMessage.session_id, (prev) => {
          const known = prev.filter(
            (item) => item.queueId && order2.has(item.queueId),
          );
          const unknown2 = prev.filter(
            (item) => !item.queueId || !order2.has(item.queueId),
          );
          known.sort(
            (leftQueuedMessage, rightQueuedMessage) =>
              (order2.get(leftQueuedMessage.queueId) ?? 0) - (order2.get(rightQueuedMessage.queueId) ?? 0),
          );
          return [
            ...known.map((item, index2) => ({
              ...item,
              position: index2 + 1,
            })),
            ...unknown2,
          ];
        });
        return;
      }
      const runtimeProgressSessionId =
        messageDeliveryRuntimeProgressSessionId(serverMessage);
      const runtimeProgressStarted = runtimeProgressSessionId
        ? markRuntimeProgressStartedForSession(runtimeProgressSessionId)
        : false;
      const replaceSessionSnapshot =
        focusSafeMsg.type === "session_switched" &&
        Boolean(
          focusSafeMsg.request_id &&
          authoritativeHydrationRequestIdsRef.current.delete(
            focusSafeMsg.request_id,
          ),
        );
      const pendingTextEditCreate =
        focusSafeMsg.type === "session_created" && focusSafeMsg.request_id
          ? pendingTextEditCreatesRef.current.get(focusSafeMsg.request_id)
          : void 0;
      if (pendingTextEditCreate && focusSafeMsg.type === "session_created") {
        bindTextEditSession(
          pendingTextEditCreate.nodeId,
          focusSafeMsg.session_id,
        );
      }
      const idleDiagnostic =
        focusSafeMsg.type === "session_status_changed" &&
        focusSafeMsg.status === "idle"
          ? (() => {
              let latestDelivery;
              for (const delivery of messageDeliveryByClientIdRef.current.values()) {
                if (delivery.sessionId !== focusSafeMsg.session_id) continue;
                if (!ACTIVE_MESSAGE_DELIVERY_STATUSES.has(delivery.status))
                  continue;
                if (
                  !latestDelivery ||
                  delivery.updatedAt > latestDelivery.updatedAt
                ) {
                  latestDelivery = delivery;
                }
              }
              return {
                sessionId: focusSafeMsg.session_id,
                clientMessageId: latestDelivery?.clientMessageId,
                receivedAt: Date.now(),
                storeBusyBefore: sessionStore.getSessionBusy(
                  focusSafeMsg.session_id,
                ),
                rendererBusyBefore:
                  sessionStore.getState().focusedSessionId ===
                  focusSafeMsg.session_id
                    ? busyRef.current
                    : false,
              };
            })()
          : null;
      controller.handleServerMessage(focusSafeMsg, {
        replaceSessionSnapshot,
        openCreatedSessionTab: pendingTextEditCreate === void 0,
      });
      if (
        focusSafeMsg.type === "session_switched" &&
        focusSafeMsg.activated !== false
      ) {
        retainVisibleTranscriptUntilHydrationRef.current = false;
        visibleConversationHydrationRequestsRef.current.clear();
        setConversationLoading(false);
      }
      if (idleDiagnostic) {
        const storeBusyAfter = sessionStore.getSessionBusy(
          idleDiagnostic.sessionId,
        );
        recordIdleActionSafe("chat:renderer-idle-applied", {
          sessionId: idleDiagnostic.sessionId,
          clientMessageId: idleDiagnostic.clientMessageId,
          agentStatus: "idle",
          storeBusyBefore: idleDiagnostic.storeBusyBefore,
          storeBusyAfter,
          rendererBusyBefore: idleDiagnostic.rendererBusyBefore,
        });
        const previousTimer = idleBusyDiagnosticTimersRef.current.get(
          idleDiagnostic.sessionId,
        );
        if (previousTimer) clearTimeout(previousTimer);
        if (
          idleDiagnostic.storeBusyBefore ||
          idleDiagnostic.rendererBusyBefore ||
          storeBusyAfter
        ) {
          const timer2 = setTimeout(() => {
            idleBusyDiagnosticTimersRef.current.delete(
              idleDiagnostic.sessionId,
            );
            if (options.isActive === false) return;
            const focusedSessionId2 = sessionStore.getState().focusedSessionId;
            if (focusedSessionId2 !== idleDiagnostic.sessionId) return;
            const storeBusy = sessionStore.getSessionBusy(
              idleDiagnostic.sessionId,
            );
            const rendererBusy = busyRef.current;
            if (!storeBusy && !rendererBusy) return;
            recordIdleMismatchSafe({
              sessionId: idleDiagnostic.sessionId,
              clientMessageId: idleDiagnostic.clientMessageId,
              agentStatus: "idle",
              storeBusy,
              rendererBusy,
              idleReceivedAt: idleDiagnostic.receivedAt,
              elapsedMs: Math.max(0, Date.now() - idleDiagnostic.receivedAt),
            });
          }, RENDERER_IDLE_BUSY_MISMATCH_MS);
          idleBusyDiagnosticTimersRef.current.set(
            idleDiagnostic.sessionId,
            timer2,
          );
        }
      }
      if (focusSafeMsg.type === "session_bound") {
        syncTextEditBindingsWithSessions();
      }
      if (focusSafeMsg.type === "session_switched") {
        if (focusSafeMsg.activated !== false) {
          updateInitialPayloadDispatchReadiness(true);
        }
        if (focusSafeMsg.request_id) {
          finishHistoryReload(focusSafeMsg.request_id);
        }
        const pendingSwitch = pendingSessionSwitchRef.current;
        const matchesPendingSwitch =
          pendingSwitch &&
          focusSafeMsg.request_id === pendingSwitch.requestId &&
          (focusSafeMsg.session_id === pendingSwitch.targetSessionId ||
            pendingSwitch.textEditTransactionId !== void 0);
        if (pendingSwitch && matchesPendingSwitch) {
          pendingSessionSwitchRef.current = null;
          setSwitching(false);
          setSwitchError(null);
          if (focusSafeMsg.activated !== false) {
            currentInputTextRef.current = pendingSwitch.targetDraft.text;
            currentInputEditorDocRef.current =
              pendingSwitch.targetDraft.editorDoc;
            currentAttachmentsRef.current =
              pendingSwitch.targetDraft.attachments;
            setPendingEditorDoc(pendingSwitch.targetDraft.editorDoc ?? null);
            setPendingAttachments(pendingSwitch.targetDraft.attachments);
            if (pendingSwitch.targetDraft.text) {
              setInput(pendingSwitch.targetDraft.text);
            } else {
              setPendingEditorReset((value) => value + 1);
            }
          }
        }
        const active2 = activeTextEditAgentRef.current;
        const activeBinding = active2
          ? textEditBindingsRef.current[active2.editor.nodeId]
          : void 0;
        const responseBelongsToActiveTextEdit =
          active2 &&
          (pendingSwitch?.textEditTransactionId ===
            textEditTransactionId(active2.editor) ||
            active2.sessionId === focusSafeMsg.session_id ||
            (Boolean(focusSafeMsg.runtime_session_id) &&
              activeBinding?.runtimeSessionId ===
                focusSafeMsg.runtime_session_id));
        if (
          responseBelongsToActiveTextEdit &&
          focusSafeMsg.activated !== false
        ) {
          bindTextEditSession(
            active2.editor.nodeId,
            focusSafeMsg.session_id,
            focusSafeMsg.runtime_session_id,
          );
          const ready = {
            ...active2,
            sessionId: focusSafeMsg.session_id,
            status: "ready",
            reconnectFailClosed: false,
            reconnectRetryCount: 0,
          };
          activeTextEditAgentRef.current = ready;
          setTextEditAgentState({
            editor: ready.editor,
            sessionId: ready.sessionId,
            status: ready.status,
          });
          ensureTextAgentIntro(focusSafeMsg.session_id);
        }
      }
      if (
        runtimeProgressSessionId &&
        runtimeProgressStarted &&
        isRuntimeBusyProgress(serverMessage)
      ) {
        sessionStore.setBusy(true, runtimeProgressSessionId);
      }
      if (remoteTool.handleRemoteToolWsMessage(serverMessage));
      if (serverMessage.type === "session_cancelled" && serverMessage.session_id) {
        const settled = settlePreflightDeliveries(
          serverMessage.session_id,
          [...messageDeliveryByClientIdRef.current.keys()],
          "completed",
        );
        if (settled) sessionStore.setBusy(false, serverMessage.session_id);
        cancelInFlightSessionIdsRef.current.delete(serverMessage.session_id);
        controller.markSessionCancelled(serverMessage.session_id);
      }
      if (
        serverMessage.type === "done" ||
        (serverMessage.type === "session_idle" && !serverMessage.childSessionId)
      ) {
        if (serverMessage.type === "done" && serverMessage.session_id) {
          controller.finalizeSessionCancellation(
            serverMessage.session_id,
            serverMessage.generation_handoff === "canvas",
            serverMessage.generation_handoff_targets,
          );
        }
        trackEvent(TRACK_EVENTS.CHAT_MESSAGE_RECEIVED, {
          session_id: serverMessage.session_id,
        });
        setDocumentEditSubmissions((previous2) => {
          let changed = false;
          const next2 = new Map(previous2);
          for (const [requestId, submission] of previous2) {
            if (
              submission.sessionId !== serverMessage.session_id ||
              submission.status === "applied" ||
              submission.status === "conflict" ||
              submission.status === "failed"
            ) {
              continue;
            }
            changed = true;
            next2.set(
              requestId,
              submission.result?.status === "conflict"
                ? {
                    ...submission,
                    status: "conflict",
                  }
                : {
                    ...submission,
                    status: "failed",
                    error:
                      "Agent completed without applying the document edits.",
                  },
            );
            documentEditRequestByClientIdRef.current.delete(
              submission.clientMessageId,
            );
          }
          return changed ? next2 : previous2;
        });
      }
      const terminalSessionId = rootRuntimeTerminalSessionId(serverMessage);
      if (terminalSessionId) {
        clearStalledForSession(terminalSessionId);
        completeActiveMessageDeliveriesForSession(terminalSessionId);
        if (
          [...messageDeliveryByClientIdRef.current.values()].some(
            (state2) =>
              state2.sessionId === terminalSessionId &&
              isMessagePreflight(state2),
          )
        ) {
          sessionStore.setBusy(true, terminalSessionId);
        }
      }
      if (serverMessage.type === "sessions_changed") {
        requestSessionList("refresh");
      }
      if (focusSafeMsg.type === "session_created") {
        const pendingMainCreate =
          focusSafeMsg.request_id !== void 0 &&
          pendingCreatePayloadRef.current?.requestId ===
            focusSafeMsg.request_id;
        const activeBeforeCreate = activeTextEditAgentRef.current;
        if (
          pendingMainCreate &&
          activeBeforeCreate?.previousSessionId === null
        ) {
          activeTextEditAgentRef.current = {
            ...activeBeforeCreate,
            previousSessionId: focusSafeMsg.session_id,
            previousPendingNewTab: false,
          };
        }
        if (pendingTextEditCreate && focusSafeMsg.request_id) {
          pendingTextEditCreatesRef.current.delete(focusSafeMsg.request_id);
          const active2 = activeTextEditAgentRef.current;
          if (
            active2 &&
            pendingTextEditCreate.transactionId ===
              textEditTransactionId(active2.editor) &&
            focusSafeMsg.activated !== false
          ) {
            const restored =
              draftController.restore(focusSafeMsg.session_id) ??
              draftController.restore(
                textEditNodeDraftKey(active2.editor.nodeId),
              );
            if (restored && restored.droppedCount > 0)
              notifyDroppedAttachments();
            const targetDraft = restored?.draft ?? {
              text: "",
              attachments: [],
            };
            currentInputTextRef.current = targetDraft.text;
            currentInputEditorDocRef.current = targetDraft.editorDoc;
            currentAttachmentsRef.current = targetDraft.attachments;
            setPendingEditorDoc(targetDraft.editorDoc ?? null);
            setPendingAttachments(targetDraft.attachments);
            if (targetDraft.text) setInput(targetDraft.text);
            else setPendingEditorReset((value) => value + 1);
            setSwitching(false);
            const ready = {
              ...active2,
              sessionId: focusSafeMsg.session_id,
              status: "ready",
              reconnectFailClosed: false,
              reconnectRetryCount: 0,
            };
            activeTextEditAgentRef.current = ready;
            setTextEditAgentState({
              editor: ready.editor,
              sessionId: ready.sessionId,
              status: ready.status,
            });
            ensureTextAgentIntro(focusSafeMsg.session_id);
          }
        }
        handleSessionCreatedResponse({
          message: focusSafeMsg,
          refs: {
            createPayload: pendingCreatePayloadRef,
            forkDrafts: pendingForkDraftsRef,
          },
          draftController,
          dispatchUserMessage,
          handleActivated: (message2) => {
            trackEvent(TRACK_EVENTS.CHAT_SESSION_CREATE, {
              session_id: message2.session_id,
            });
            setPendingNewTab(false);
            if (message2.model_id) syncSelectedModelId(message2.model_id);
          },
          handleActivatedForkDraft: (forkDraft) => {
            currentInputTextRef.current = forkDraft;
            setInput(forkDraft);
          },
          handleCreateDispatched: (message2, payload) => {
            clearPendingCreateTimeout();
            setCreatingSession(false);
            settleCreatedComposerDraft(focusSafeMsg, payload, draftController, {
              active:
                message2.activated !== false &&
                sessionStore.getState().focusedSessionId ===
                  message2.session_id,
              input: currentInputTextRef,
              editorDoc: currentInputEditorDocRef,
              attachments: currentAttachmentsRef,
              setInput,
              setPendingEditorDoc,
              setPendingAttachments,
              setPendingComposerReset,
            });
          },
          handleCreateDispatchFailed: (message2, payload) => {
            if (failPendingCreate(payload.requestId)) {
              draftController.clear(DRAFT_NEW_TAB);
              draftController.setNow(message2.session_id, payload.draft);
            }
          },
        });
      }
    },
    [
      appendMessageDeliveryError,
      appendStartedQueuedUserMessages,
      activateNewTabDraft,
      bindTextEditSession,
      clearStalledForSession,
      clearPendingCreateTimeout,
      completeActiveMessageDeliveriesForSession,
      controller,
      dispatchUserMessage,
      ensureTextAgentIntro,
      failPendingCreate,
      failVisibleConversationHydration,
      fenceSessionActivation2,
      finishHistoryReload,
      gatewayScopeKey,
      handleSessionStalledMessage,
      markMessageDeliveryAccepted,
      markMessageDeliveryFinal,
      markMessageDeliveryReceived,
      markRuntimeProgressStartedForSession,
      markMessageDeliveryStarted,
      draftController,
      notifyDroppedAttachments,
      options.isActive,
      prepareSessionSwitch,
      queryClient2,
      remoteTool.handleRemoteToolWsMessage,
      removeQueuedUserMessages,
      rejectSessionFocusIntent,
      reportInitialPayloadHydrationStalled,
      requestSessionList,
      send2,
      restoreBusySessionsAfterSessionList,
      handleSessionListRecovered,
      handleSessionListUnavailable,
      scheduleSessionListRetry,
      sessionStore,
      settleQueuedUserMessageCancellation,
      syncSelectedModelId,
      syncTextEditBindingsWithSessions,
      translate,
      tabPersistence,
      updateDocumentEditByClientMessage,
      updateInitialPayloadDispatchReadiness,
      updateQueuedUserMessages,
      upsertQueuedUserMessage,
      upsertMessageDeliveryState,
      scheduleMessageDeliveryTimeout,
      settlePreflightDeliveries,
    ],
  );
  reactExports.useEffect(() => {
    if (!textEditBindingsReadyRef.current) return;
    const pending2 = pendingSessionListUntilBindingsRef.current;
    if (!pending2) return;
    pendingSessionListUntilBindingsRef.current = void 0;
    handleMessage(pending2);
  }, [handleMessage, textEditBindingsReadyVersion]);
  reactExports.useEffect(() => {
    let prevFocusedId = sessionStore.getState().focusedSessionId;
    let prevFocusedBusy = sessionStore.isFocusedBusy();
    const initialFocused = sessionStore.getFocusedSession();
    let previousFocusedMessageCount = initialFocused?.messages.length ?? 0;
    let prevFocusedName = initialFocused?.displayName || initialFocused?.name;
    let prevTabOrder = sessionStore.getState().openedTabOrder;
    let flushTimer = null;
    const applySnapshot = (includeColdState = true) => {
      flushTimer = null;
      const state2 = sessionStore.getState();
      const currentFocusedId = state2.focusedSessionId;
      const focused = currentFocusedId
        ? state2.sessions.get(currentFocusedId)
        : void 0;
      const focusedMessages = sessionStore.getFocusedMessages();
      const preserveVisibleConversation =
        retainVisibleTranscriptUntilHydrationRef.current &&
        previousFocusedMessageCount > 0 &&
        focusedMessages.length === 0;
      if (!preserveVisibleConversation) {
        setMessages(focusedMessages);
        setBusy(focused?.busy ?? false);
        setPendingReasons(focused?.pendingReasons ?? []);
        setHistoryLoadFailed(focused?.historyLoadFailed ?? false);
        setFocusedSessionId(currentFocusedId);
      }
      if (includeColdState) {
        prevFocusedName = focused?.displayName || focused?.name;
        prevTabOrder = state2.openedTabOrder;
        setSessions(sessionStore.getSessionList());
        setOpenedTabOrder(state2.openedTabOrder);
        setOpenedTabIds(state2.openedTabIds);
        remoteTool.pruneForLiveSessions(state2.sessions);
        pruneStalledSessions(state2.sessions);
        if (focused) {
          syncSelectedMediaModels(focused.selectedMediaModels);
          syncSelectedModelId(focused.modelId || null);
        }
      }
      prevFocusedBusy = focused?.busy ?? false;
      previousFocusedMessageCount = focusedMessages.length;
      if (currentFocusedId !== prevFocusedId) {
        setSwitching(false);
        setSwitchError(null);
        prevFocusedId = currentFocusedId;
      }
    };
    const scheduleSnapshot = () => {
      const state2 = sessionStore.getState();
      const currentFocusedId = state2.focusedSessionId;
      const focused = currentFocusedId
        ? state2.sessions.get(currentFocusedId)
        : void 0;
      const focusedName = focused?.displayName || focused?.name;
      const nameChanged = focusedName !== prevFocusedName;
      const tabsChanged = state2.openedTabOrder !== prevTabOrder;
      const shouldThrottle =
        !nameChanged &&
        !tabsChanged &&
        focused?.busy === true &&
        currentFocusedId === prevFocusedId &&
        prevFocusedBusy;
      if (!shouldThrottle) {
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        applySnapshot(true);
        return;
      }
      if (!flushTimer) {
        flushTimer = setTimeout(() => applySnapshot(false), STREAM_UI_FLUSH_MS);
      }
    };
    const unsubscribe = sessionStore.subscribe(scheduleSnapshot);
    return () => {
      if (flushTimer) clearTimeout(flushTimer);
      unsubscribe();
    };
  }, [
    pruneStalledSessions,
    remoteTool.pruneForLiveSessions,
    sessionStore,
    syncSelectedMediaModels,
    syncSelectedModelId,
  ]);
  const autoOpenedImSessionsRef = reactExports.useRef(new Set());
  reactExports.useEffect(() => {
    if (!connected) return;
    for (const session of sessions) {
      if (session.origin !== "im") continue;
      if (autoOpenedImSessionsRef.current.has(session.id)) continue;
      autoOpenedImSessionsRef.current.add(session.id);
      sessionStore.openTab(session.id);
    }
  }, [sessions, connected, sessionStore]);
  reactExports.useEffect(() => {
    if (!isSessionCachePolicyEnabled(SAFE_WARM_SESSION_FLAG)) return void 0;
    const timer2 = setInterval(() => {
      controller.warmIdleSessions({
        keepCount: SAFE_WARM_SESSION_KEEP_COUNT,
        minPartCount: SAFE_WARM_SESSION_MIN_PART_COUNT,
        trimMessages: false,
      });
    }, SAFE_WARM_SESSION_INTERVAL_MS);
    return () => clearInterval(timer2);
  }, [controller]);
  reactExports.useEffect(() => {
    if (options.isActive !== false) return void 0;
    if (!isSessionCachePolicyEnabled(SAFE_COLD_SESSION_FLAG)) return void 0;
    const timer2 = setInterval(() => {
      controller.coldIdleSessions({
        minPartCount: SAFE_COLD_SESSION_MIN_PART_COUNT,
        includeFocused: true,
        clearMessages: false,
      });
    }, SAFE_COLD_SESSION_INTERVAL_MS);
    return () => clearInterval(timer2);
  }, [controller, options.isActive]);
  reactExports.useEffect(() => {
    const unsubscribe = window.hilo?.diagnostics?.onMemoryPressure?.(() => {
      controller.relieveMemoryPressure({
        includeFocused: options.isActive === false,
        trimMessages: false,
        clearMessages: false,
      });
    });
    return () => unsubscribe?.();
  }, [controller, options.isActive]);
  reactExports.useEffect(() => {
    if (options.isActive === false) return;
    const store = useDiffReviewStore;
    store.getState().clearSession();
    const cachedSession = diffReviewSessionCacheRef.current;
    if (cachedSession) store.getState().restoreRetainedSession(cachedSession);
    const unsubscribe = store.subscribe((state2) => {
      diffReviewSessionCacheRef.current = state2.session;
    });
    return () => {
      diffReviewSessionCacheRef.current = store.getState().session;
      unsubscribe();
      store.getState().clearSession();
    };
  }, [options.isActive]);
  reactExports.useEffect(() => {
    if (options.isActive === false) return;
    const pendingSession = pendingDiffReviewSessionRef.current;
    if (!pendingSession) return;
    pendingDiffReviewSessionRef.current = null;
    useDiffReviewStore.getState().startSession(pendingSession);
  }, [options.isActive]);
  const handleMessageRef = reactExports.useRef(handleMessage);
  handleMessageRef.current = handleMessage;
  reactExports.useEffect(() => {
    return subscribe2((serverMessage) => handleMessageRef.current(serverMessage));
  }, [subscribe2]);
  reactExports.useEffect(() => {
    if (!currentWorkspace) return;
    const hiloApp2 = instantiationService.invokeFunction((accessor) =>
      accessor.get(IHiloApp),
    );
    const ordinaryFocusedSessionId = textEditAgentState
      ? (activeTextEditAgentRef.current?.previousSessionId ?? null)
      : focusedSessionId;
    hiloApp2
      .updateFocusedSession(currentWorkspace, ordinaryFocusedSessionId)
      .catch((error) => {
        console.warn("[use-chat] updateFocusedSession failed", error);
      });
  }, [currentWorkspace, focusedSessionId, textEditAgentState]);
  reactExports.useEffect(() => {
    if (!connected) {
      rejectQueuedUserMessageCancellations();
      updateInitialPayloadDispatchReadiness(false);
      clearSessionListRetryTimer();
      clearPendingCreateTimeout();
      const pendingCreate = pendingCreatePayloadRef.current;
      if (pendingCreate) {
        pendingCreatePayloadRef.current = null;
        setCreatingSession(false);
        draftController.setNow(DRAFT_NEW_TAB, pendingCreate.draft);
      }
      markUnackedMessageDeliveriesFailedOnDisconnect();
      clearAllMessageDeliveryTimers();
      const state2 = sessionStore.getState();
      retainVisibleTranscriptUntilHydrationRef.current =
        sessionStore.getFocusedMessages().length > 0;
      if (state2.openedTabIds.size > 0) {
        const previousRefs = state2.openedTabOrder.map((uiSessionId) => {
          const session = state2.sessions.get(uiSessionId);
          return {
            uiSessionId,
            ...(session?.runtimeSessionId
              ? {
                  runtimeSessionId: session.runtimeSessionId,
                }
              : {}),
          };
        });
        previousSessionRefsRef.current =
          previousRefs.length > 0 ? previousRefs : null;
        previousFocusedRef.current = state2.focusedSessionId
          ? (previousRefs.find(
              (sessionReference) => sessionReference.uiSessionId === state2.focusedSessionId,
            ) ?? null)
          : null;
      }
      controller.resetBuffers();
      authoritativeHydrationRequestIdsRef.current.clear();
      clearHistoryReloads();
      pendingCreatePayloadRef.current = null;
      pendingForkDraftsRef.current.clear();
      pendingTextEditCreatesRef.current.clear();
      pendingSessionSwitchRef.current = null;
      pendingSessionListRequestRef.current = null;
      pendingSessionListUntilBindingsRef.current = void 0;
      const activeTextEdit = activeTextEditAgentRef.current;
      if (activeTextEdit) {
        const resolving = {
          ...activeTextEdit,
          status: "resolving",
          reconnectFailClosed: true,
          reconnectRetryCount: 0,
          requestId: void 0,
        };
        activeTextEditAgentRef.current = resolving;
        setTextEditAgentState({
          editor: resolving.editor,
          sessionId: resolving.sessionId,
          status: resolving.status,
        });
      }
      setSwitching(false);
    } else {
      updateInitialPayloadDispatchReadiness(false);
      reconnectDraftRestoreRef.current = true;
      optimisticUserMessagesRef.current.clear();
    }
    return () => {
      clearSessionListRetryTimer();
    };
  }, [
    clearAllMessageDeliveryTimers,
    clearHistoryReloads,
    clearPendingCreateTimeout,
    clearSessionListRetryTimer,
    connected,
    controller,
    draftController,
    markUnackedMessageDeliveriesFailedOnDisconnect,
    rejectQueuedUserMessageCancellations,
    sessionStore,
    updateInitialPayloadDispatchReadiness,
  ]);
  reactExports.useEffect(() => {
    return () => clearAllMessageDeliveryTimers();
  }, [clearAllMessageDeliveryTimers]);
  reactExports.useEffect(() => {
    return () => {
      for (const timer2 of idleBusyDiagnosticTimersRef.current.values())
        clearTimeout(timer2);
      idleBusyDiagnosticTimersRef.current.clear();
    };
  }, []);
  reactExports.useEffect(() => disposeHistoryReloads, [disposeHistoryReloads]);
  reactExports.useEffect(() => {
    if (!connected || sessionsLoading) return;
    if (!reconnectDraftRestoreRef.current) return;
    if (!focusedSessionId) return;
    reconnectDraftRestoreRef.current = false;
    restoreDraft();
  }, [connected, sessionsLoading, focusedSessionId, restoreDraft]);
  reactExports.useEffect(() => {
    if (!connected) return;
    requestSessionList("initial");
  }, [connected, requestSessionList]);
  useSessionSwitchTimeout(switching, () => {
    if (activeTextEditAgentRef.current) return;
    const sourceSessionId = pendingSessionSwitchRef.current?.sourceSessionId;
    cancelPendingSessionSwitch(sourceSessionId ?? DRAFT_NEW_TAB);
    setSwitchError(sessionSwitchTimeoutMessage(translate));
  });
  useSessionSwitchErrorFeedback(switchError, setSwitchError);
  useInitialPayloadHydrationStalledFeedback(
    initialPayloadHydrationStalled,
    translate,
    () => {
      updateInitialPayloadDispatchReadiness(false);
      requestSessionList("initial");
    },
  );
  const switchChatSession = reactExports.useCallback(
    (sessionId, options2) => {
      clearPendingSessionSwitch();
      if (options2?.openTab !== false) {
        sessionStore.openTab(sessionId);
      }
      setPendingNewTab(false);
      if (options2?.track !== false) {
        trackEvent(TRACK_EVENTS.CHAT_SESSION_SWITCH, {
          session_id: sessionId,
        });
      }
      const currentId = sessionStore.getState().focusedSessionId;
      const currentDraftKey = currentId ?? DRAFT_NEW_TAB;
      if (!options2?.textEditTransactionId) {
        draftController.setNow(currentDraftKey, {
          text: currentInputTextRef.current,
          editorDoc: currentInputEditorDocRef.current,
          attachments: currentAttachmentsRef.current,
        });
      }
      const restored =
        draftController.restore(sessionId) ??
        (options2?.fallbackDraftKey
          ? draftController.restore(options2.fallbackDraftKey)
          : null);
      if (restored && restored.droppedCount > 0) notifyDroppedAttachments();
      const targetDraft = restored?.draft ?? {
        text: "",
        attachments: [],
      };
      const installTargetDraft = () => {
        currentInputTextRef.current = targetDraft.text;
        currentInputEditorDocRef.current = targetDraft.editorDoc;
        currentAttachmentsRef.current = targetDraft.attachments;
        setPendingEditorDoc(targetDraft.editorDoc ?? null);
        setPendingAttachments(targetDraft.attachments);
        if (targetDraft.text) setInput(targetDraft.text);
        else setPendingEditorReset((resetGeneration) => resetGeneration + 1);
      };
      const existingSession = sessionStore.getState().sessions.get(sessionId);
      if (
        existingSession &&
        existingSession.messages.length > 0 &&
        !options2?.textEditTransactionId
      ) {
        requestSessionFocus(sessionId);
        sessionStore.focusSession(sessionId);
        setSwitching(false);
        setSwitchError(null);
        installTargetDraft();
        return true;
      }
      setSwitching(true);
      setSwitchError(null);
      const switchRequest = prepareSessionSwitch(
        options2?.wsSessionId ?? sessionId,
        {
          activate: true,
          origin: options2?.origin,
        },
      );
      pendingSessionSwitchRef.current = {
        requestId: switchRequest.request_id,
        sourceSessionId: currentId,
        targetSessionId: sessionId,
        targetDraft,
        ...(options2?.textEditTransactionId
          ? {
              textEditTransactionId: options2.textEditTransactionId,
            }
          : {}),
      };
      if (send2(switchRequest)) return true;
      cancelPendingSessionSwitch(currentId ?? DRAFT_NEW_TAB);
      setSwitchError(sessionSwitchNotConnectedMessage(translate));
      return false;
    },
    [
      cancelPendingSessionSwitch,
      clearPendingSessionSwitch,
      draftController,
      notifyDroppedAttachments,
      prepareSessionSwitch,
      requestSessionFocus,
      send2,
      sessionStore,
      translate,
    ],
  );
  const sendWsMessage = reactExports.useCallback(
    (message) => {
      if (
        activeTextEditAgentRef.current &&
        (message.type === "create_session" || message.type === "switch_session")
      ) {
        return false;
      }
      if (message.type === "create_session") {
        activateNewTabDraft();
        return true;
      }
      if (message.type === "switch_session") {
        return switchChatSession(message.session_id, {
          origin: message.origin,
        });
      }
      return send2(message);
    },
    [activateNewTabDraft, send2, switchChatSession],
  );
  const resolveActiveTextEditAgent = reactExports.useCallback(() => {
    const active2 = activeTextEditAgentRef.current;
    if (
      !active2 ||
      active2.status !== "resolving" ||
      !active2.bindingLoaded ||
      sessionsLoadingRef.current ||
      !connectedRef.current
    ) {
      return;
    }
    const transactionId = textEditTransactionId(active2.editor);
    const state2 = sessionStore.getState();
    const binding = textEditBindingsRef.current[active2.editor.nodeId];
    let targetSessionId = resolveTextEditSessionId(binding, state2);
    if (!targetSessionId && binding?.runtimeSessionId) {
      targetSessionId = binding.runtimeSessionId;
      sessionStore.createSession(
        targetSessionId,
        nodeEditSessionName(
          nodeEditAgentKindRef.current,
          translate,
          nodeEditAgentNameRef.current,
        ),
        currentWorkspace,
        void 0,
        void 0,
        void 0,
        void 0,
        void 0,
        "renderer",
        {
          focus: false,
          openTab: false,
        },
      );
    }
    if (targetSessionId) {
      const runtimeSwitchTarget =
        binding?.runtimeSessionId ??
        state2.sessions.get(targetSessionId)?.runtimeSessionId;
      let updated = {
        ...active2,
        sessionId: targetSessionId,
      };
      activeTextEditAgentRef.current = updated;
      setTextEditAgentState({
        editor: updated.editor,
        sessionId: targetSessionId,
        status: "resolving",
      });
      publishTextEditSessionIds();
      const switched = switchChatSession(targetSessionId, {
        openTab: false,
        textEditTransactionId: transactionId,
        fallbackDraftKey: textEditNodeDraftKey(active2.editor.nodeId),
        track: false,
        ...(runtimeSwitchTarget && runtimeSwitchTarget !== targetSessionId
          ? {
              wsSessionId: runtimeSwitchTarget,
            }
          : {}),
      });
      if (!switched) {
        const failed2 = {
          ...updated,
          status: "error",
        };
        activeTextEditAgentRef.current = failed2;
        setTextEditAgentState({
          editor: failed2.editor,
          sessionId: failed2.sessionId,
          status: failed2.status,
        });
        return;
      }
      const pending2 = pendingSessionSwitchRef.current;
      if (pending2?.textEditTransactionId === transactionId) {
        updated = {
          ...updated,
          requestId: pending2.requestId,
        };
        activeTextEditAgentRef.current = updated;
        setTextEditAgentState({
          editor: updated.editor,
          sessionId: updated.sessionId,
          status: updated.status,
        });
      }
      if (
        sessionStore.getState().focusedSessionId === targetSessionId &&
        pending2?.textEditTransactionId !== transactionId
      ) {
        const ready = {
          ...updated,
          status: "ready",
          reconnectFailClosed: false,
          reconnectRetryCount: 0,
        };
        activeTextEditAgentRef.current = ready;
        setTextEditAgentState({
          editor: ready.editor,
          sessionId: ready.sessionId,
          status: ready.status,
        });
        ensureTextAgentIntro(targetSessionId);
      }
      return;
    }
    const requestId = beginCreateFocusIntent(transactionId);
    const creating = {
      ...active2,
      requestId,
    };
    activeTextEditAgentRef.current = creating;
    pendingTextEditCreatesRef.current.set(requestId, {
      requestId,
      transactionId,
      nodeId: active2.editor.nodeId,
    });
    sessionStore.clearFocusedSession();
    setSwitching(true);
    setSwitchError(null);
    const sent = send2({
      type: "create_session",
      request_id: requestId,
      name: nodeEditSessionName(
        nodeEditAgentKindRef.current,
        translate,
        nodeEditAgentNameRef.current,
      ),
      model_id: getSelectedModelId() ?? void 0,
      selected_media_models: getSelectedMediaModels(),
    });
    if (sent) {
      setTextEditAgentState({
        editor: creating.editor,
        sessionId: creating.sessionId,
        status: creating.status,
      });
      return;
    }
    pendingTextEditCreatesRef.current.delete(requestId);
    rejectSessionFocusIntent(
      requestId,
      creating.previousSessionId ?? DRAFT_NEW_TAB,
    );
    setSwitching(false);
    const failed = {
      ...creating,
      status: "error",
    };
    activeTextEditAgentRef.current = failed;
    setTextEditAgentState({
      editor: failed.editor,
      sessionId: failed.sessionId,
      status: failed.status,
    });
  }, [
    beginCreateFocusIntent,
    currentWorkspace,
    ensureTextAgentIntro,
    getSelectedMediaModels,
    getSelectedModelId,
    publishTextEditSessionIds,
    rejectSessionFocusIntent,
    send2,
    sessionStore,
    switchChatSession,
    translate,
  ]);
  const enterTextEditAgent = reactExports.useCallback(
    (editor, kind = "text", agentName) => {
      const current2 = activeTextEditAgentRef.current;
      if (current2 && sameTextEditSession(current2.editor, editor)) return;
      nodeEditAgentKindRef.current = kind;
      nodeEditAgentNameRef.current = agentName;
      if (current2) {
        supersedeSessionFocusIntent(textEditTransactionId(editor));
        clearPendingSessionSwitch();
      }
      const state2 = sessionStore.getState();
      const previousSessionId =
        current2?.previousSessionId ?? state2.focusedSessionId;
      const previousPendingNewTab =
        current2?.previousPendingNewTab ?? pendingNewTab;
      const currentDraftKey = state2.focusedSessionId ?? DRAFT_NEW_TAB;
      draftController.setNow(currentDraftKey, {
        text: currentInputTextRef.current,
        editorDoc: currentInputEditorDocRef.current,
        attachments: currentAttachmentsRef.current,
      });
      currentInputTextRef.current = "";
      currentInputEditorDocRef.current = void 0;
      currentAttachmentsRef.current = [];
      setInput("");
      setPendingAttachments([]);
      setPendingEditorReset((value) => value + 1);
      setPendingNewTab(false);
      const transaction = {
        editor,
        sessionId: null,
        status: "resolving",
        previousSessionId,
        previousPendingNewTab,
        bindingLoaded: false,
        reconnectFailClosed: false,
        reconnectRetryCount: 0,
      };
      activeTextEditAgentRef.current = transaction;
      setTextEditAgentState({
        editor,
        sessionId: null,
        status: "resolving",
      });
      publishTextEditSessionIds();
      const transactionId = textEditTransactionId(editor);
      void loadTextEditBindingsWithFallback(
        textEditBindingPersister,
        currentWorkspace,
      ).then(({ bindings, fallbackReason }) => {
        const latest2 = activeTextEditAgentRef.current;
        if (!latest2 || textEditTransactionId(latest2.editor) !== transactionId)
          return;
        if (fallbackReason) {
          chatLog.warn("text-edit binding load fallback", {
            reason: fallbackReason,
          });
        }
        textEditBindingsRef.current = mergeTextEditSessionBindings(
          bindings,
          textEditBindingsRef.current,
        );
        const resolved = {
          ...latest2,
          bindingLoaded: true,
        };
        activeTextEditAgentRef.current = resolved;
        publishTextEditSessionIds();
        resolveActiveTextEditAgent();
      });
    },
    [
      clearPendingSessionSwitch,
      currentWorkspace,
      draftController,
      pendingNewTab,
      publishTextEditSessionIds,
      resolveActiveTextEditAgent,
      sessionStore,
      supersedeSessionFocusIntent,
      textEditBindingPersister,
    ],
  );
  const leaveTextEditAgent = reactExports.useCallback(
    (editor) => {
      const active2 = activeTextEditAgentRef.current;
      if (!active2 || !sameTextEditSession(active2.editor, editor)) return;
      const returnTarget = active2.previousSessionId ?? DRAFT_NEW_TAB;
      supersedeSessionFocusIntent(returnTarget);
      clearPendingSessionSwitch();
      if (
        active2.sessionId &&
        sessionStore.getState().focusedSessionId === active2.sessionId
      ) {
        const textDraft = {
          text: currentInputTextRef.current,
          editorDoc: currentInputEditorDocRef.current,
          attachments: currentAttachmentsRef.current,
        };
        draftController.setNow(active2.sessionId, textDraft);
        draftController.setNow(
          textEditNodeDraftKey(active2.editor.nodeId),
          textDraft,
        );
      }
      activeTextEditAgentRef.current = null;
      nodeEditAgentKindRef.current = "text";
      nodeEditAgentNameRef.current = void 0;
      setTextEditAgentState(null);
      setSwitching(false);
      setSwitchError(null);
      publishTextEditSessionIds();
      const previousSession = active2.previousSessionId
        ? sessionStore.getState().sessions.get(active2.previousSessionId)
        : void 0;
      const draftKey = previousSession ? previousSession.id : DRAFT_NEW_TAB;
      const restored = draftController.restore(draftKey);
      if (restored && restored.droppedCount > 0) notifyDroppedAttachments();
      const targetDraft = restored?.draft ?? {
        text: "",
        attachments: [],
      };
      currentInputTextRef.current = targetDraft.text;
      currentInputEditorDocRef.current = targetDraft.editorDoc;
      currentAttachmentsRef.current = targetDraft.attachments;
      setPendingEditorDoc(targetDraft.editorDoc ?? null);
      setPendingAttachments(targetDraft.attachments);
      if (targetDraft.text) setInput(targetDraft.text);
      else setPendingEditorReset((value) => value + 1);
      if (previousSession) {
        sessionStore.openTab(previousSession.id);
        sessionStore.focusSession(previousSession.id);
        requestSessionFocus(previousSession.id);
        setPendingNewTab(false);
      } else {
        sessionStore.clearFocusedSession();
        setPendingNewTab(active2.previousPendingNewTab);
      }
    },
    [
      clearPendingSessionSwitch,
      draftController,
      notifyDroppedAttachments,
      publishTextEditSessionIds,
      requestSessionFocus,
      sessionStore,
      supersedeSessionFocusIntent,
    ],
  );
  const resetTextEditComposer = reactExports.useCallback(
    (active2) => {
      const draft = {
        text: currentInputTextRef.current,
        editorDoc: currentInputEditorDocRef.current,
        attachments: currentAttachmentsRef.current,
      };
      if (active2.sessionId) draftController.setNow(active2.sessionId, draft);
      draftController.setNow(textEditNodeDraftKey(active2.editor.nodeId), {
        text: "",
        editorDoc: void 0,
        attachments: [],
      });
      currentInputTextRef.current = "";
      currentInputEditorDocRef.current = void 0;
      currentAttachmentsRef.current = [];
      setInput("");
      setPendingAttachments([]);
      setPendingEditorReset((value) => value + 1);
    },
    [draftController],
  );
  const newTextEditSession = reactExports.useCallback(() => {
    const active2 = activeTextEditAgentRef.current;
    if (!active2 || active2.status === "resolving") return;
    const nodeId = active2.editor.nodeId;
    resetTextEditComposer(active2);
    textEditBindingsRef.current = {
      ...textEditBindingsRef.current,
      [nodeId]: clearActiveTextEditSession(
        textEditBindingsRef.current[nodeId],
        Date.now(),
      ),
    };
    void textEditBindingPersister.clearActive(currentWorkspace, nodeId);
    supersedeSessionFocusIntent(textEditTransactionId(active2.editor));
    clearPendingSessionSwitch();
    const transaction = {
      ...active2,
      sessionId: null,
      status: "resolving",
      requestId: void 0,
    };
    activeTextEditAgentRef.current = transaction;
    setTextEditAgentState({
      editor: transaction.editor,
      sessionId: null,
      status: "resolving",
    });
    publishTextEditSessionIds();
    resolveActiveTextEditAgent();
  }, [
    clearPendingSessionSwitch,
    currentWorkspace,
    publishTextEditSessionIds,
    resetTextEditComposer,
    resolveActiveTextEditAgent,
    supersedeSessionFocusIntent,
    textEditBindingPersister,
  ]);
  const switchTextEditSession = reactExports.useCallback(
    (sessionId) => {
      const active2 = activeTextEditAgentRef.current;
      if (!active2 || active2.status === "resolving") return;
      if (active2.sessionId === sessionId) return;
      const nodeId = active2.editor.nodeId;
      const binding = textEditBindingsRef.current[nodeId];
      const ownedIds = collectBindingSessionIds(binding);
      const session = sessionStore.getState().sessions.get(sessionId);
      const owned =
        ownedIds.has(sessionId) ||
        Boolean(
          session?.runtimeSessionId && ownedIds.has(session.runtimeSessionId),
        );
      if (!owned) return;
      resetTextEditComposer(active2);
      const entry = {
        uiSessionId: sessionId,
        runtimeSessionId: session?.runtimeSessionId,
        updatedAt: Date.now(),
      };
      textEditBindingsRef.current = {
        ...textEditBindingsRef.current,
        [nodeId]: upsertTextEditSessionEntry(binding, entry),
      };
      void textEditBindingPersister.upsert(currentWorkspace, nodeId, entry);
      supersedeSessionFocusIntent(textEditTransactionId(active2.editor));
      clearPendingSessionSwitch();
      const transaction = {
        ...active2,
        sessionId: null,
        status: "resolving",
        requestId: void 0,
      };
      activeTextEditAgentRef.current = transaction;
      setTextEditAgentState({
        editor: transaction.editor,
        sessionId: null,
        status: "resolving",
      });
      publishTextEditSessionIds();
      resolveActiveTextEditAgent();
    },
    [
      clearPendingSessionSwitch,
      currentWorkspace,
      publishTextEditSessionIds,
      resetTextEditComposer,
      resolveActiveTextEditAgent,
      sessionStore,
      supersedeSessionFocusIntent,
      textEditBindingPersister,
    ],
  );
  const clearTextEditSessionsForNode = reactExports.useCallback(
    (nodeId) => {
      if (!nodeId) return;
      if (activeTextEditAgentRef.current?.editor.nodeId === nodeId) return;
      const binding = textEditBindingsRef.current[nodeId];
      if (!binding) return;
      const remaining = {
        ...textEditBindingsRef.current,
      };
      delete remaining[nodeId];
      textEditBindingsRef.current = remaining;
      publishTextEditSessionIds();
      void textEditBindingPersister.remove(currentWorkspace, nodeId);
      const state2 = sessionStore.getState();
      const purged = new Set();
      for (const entry of listTextEditSessionEntries(binding)) {
        const target =
          entry.runtimeSessionId ??
          (entry.uiSessionId
            ? (state2.sessions.get(entry.uiSessionId)?.runtimeSessionId ??
              entry.uiSessionId)
            : void 0);
        if (!target || purged.has(target)) continue;
        purged.add(target);
        send2({
          type: "delete_session",
          session_id: target,
        });
      }
      for (const sessionId of collectBindingSessionIds(binding)) {
        if (state2.sessions.has(sessionId)) sessionStore.removeSession(sessionId);
      }
    },
    [
      currentWorkspace,
      publishTextEditSessionIds,
      send2,
      sessionStore,
      textEditBindingPersister,
    ],
  );
  reactExports.useEffect(() => {
    resolveActiveTextEditAgent();
  }, [
    connected,
    resolveActiveTextEditAgent,
    sessionListRevision,
    sessionsLoading,
  ]);
  reactExports.useEffect(() => {
    if (textEditAgentState?.status !== "resolving") return;
    const transactionId = textEditTransactionId(textEditAgentState.editor);
    const activeAtStart = activeTextEditAgentRef.current;
    if (
      !activeAtStart ||
      activeAtStart.reconnectFailClosed ||
      textEditTransactionId(activeAtStart.editor) !== transactionId
    ) {
      return;
    }
    const pendingSwitchAtStart = pendingSessionSwitchRef.current;
    const requestIdAtStart =
      activeAtStart.requestId &&
      pendingTextEditCreatesRef.current.has(activeAtStart.requestId)
        ? activeAtStart.requestId
        : pendingSwitchAtStart?.textEditTransactionId === transactionId
          ? pendingSwitchAtStart.requestId
          : void 0;
    if (!requestIdAtStart) return;
    const timer2 = setTimeout(() => {
      const active2 = activeTextEditAgentRef.current;
      if (
        !active2 ||
        active2.status !== "resolving" ||
        textEditTransactionId(active2.editor) !== transactionId
      ) {
        return;
      }
      if (active2.reconnectFailClosed) return;
      const pendingSwitch = pendingSessionSwitchRef.current;
      const requestId =
        active2.requestId &&
        pendingTextEditCreatesRef.current.has(active2.requestId)
          ? active2.requestId
          : pendingSwitch?.textEditTransactionId === transactionId
            ? pendingSwitch.requestId
            : void 0;
      if (requestId !== requestIdAtStart) return;
      if (requestId) {
        rejectSessionFocusIntent(
          requestId,
          active2.previousSessionId ?? DRAFT_NEW_TAB,
        );
      } else {
        supersedeSessionFocusIntent(active2.previousSessionId ?? DRAFT_NEW_TAB);
      }
      clearPendingSessionSwitch();
      const failed = {
        ...active2,
        status: "error",
      };
      activeTextEditAgentRef.current = failed;
      setTextEditAgentState({
        editor: failed.editor,
        sessionId: failed.sessionId,
        status: failed.status,
      });
      setSwitching(false);
      setSwitchError(
        nodeEditAgentKindRef.current === "plugin"
          ? translate(
              "chat.pluginEditAgent.prepareFailedShort",
              "Editor Agent session could not be prepared.",
            )
          : translate(
              "chat.textEditAgent.prepareFailedShort",
              "Text Assistant session could not be prepared.",
            ),
      );
    }, TEXT_EDIT_SESSION_REQUEST_TIMEOUT_MS);
    return () => clearTimeout(timer2);
  }, [
    clearPendingSessionSwitch,
    rejectSessionFocusIntent,
    supersedeSessionFocusIntent,
    translate,
    textEditAgentState,
  ]);
  const reloadSessionHistory = reactExports.useCallback(() => {
    const focusedSession = sessionStore.getFocusedSession();
    if (!focusedSession?.historyLoadFailed) return;
    if (activeHistoryReloadRequestBySessionRef.current.has(focusedSession.id))
      return;
    const request = prepareSessionSwitch(focusedSession.id, {
      activate: false,
    });
    authoritativeHydrationRequestIdsRef.current.add(request.request_id);
    historyReloadSessionByRequestIdRef.current.set(
      request.request_id,
      focusedSession.id,
    );
    activeHistoryReloadRequestBySessionRef.current.set(
      focusedSession.id,
      request.request_id,
    );
    setHistoryReloadingSessionIds((current2) =>
      new Set(current2).add(focusedSession.id),
    );
    const timeout2 = setTimeout(() => {
      historyReloadTimeoutsRef.current.delete(request.request_id);
      if (
        activeHistoryReloadRequestBySessionRef.current.get(
          focusedSession.id,
        ) !== request.request_id
      ) {
        return;
      }
      activeHistoryReloadRequestBySessionRef.current.delete(focusedSession.id);
      setHistoryReloadingSessionIds((current2) => {
        if (!current2.has(focusedSession.id)) return current2;
        const next2 = new Set(current2);
        next2.delete(focusedSession.id);
        return next2;
      });
    }, HISTORY_RELOAD_TIMEOUT_MS);
    historyReloadTimeoutsRef.current.set(request.request_id, timeout2);
    if (!send2(request)) {
      finishHistoryReload(request.request_id);
    }
  }, [finishHistoryReload, prepareSessionSwitch, send2, sessionStore]);
  const renameSession = reactExports.useCallback(
    (sessionId, name2) => {
      const requestId = crypto.randomUUID();
      latestRenameRequestBySessionRef.current.set(sessionId, requestId);
      const sent = send2({
        type: "rename_session",
        request_id: requestId,
        session_id: sessionId,
        name: name2,
      });
      if (!sent) {
        latestRenameRequestBySessionRef.current.delete(sessionId);
        dedupedToast.error(translate("session.renameFailed", "Failed to rename chat"));
      }
    },
    [send2, translate],
  );
  const sendMessage = reactExports.useCallback(
    (
      text2,
      attachments,
      canvasNodeAttachments,
      entityRefs,
      pluginNodeAttachments,
      requestedClientMessageId,
      documentEditRequest,
      textEditContext,
      pluginEditContext,
      queueInsertBefore,
      languageDetectionText,
      options2,
    ) => {
      if (
        !hasMessagePayload(
          text2,
          attachments,
          entityRefs,
          canvasNodeAttachments,
          pluginNodeAttachments,
        ) ||
        !connectedRef.current ||
        pendingSessionSwitchRef.current !== null
      ) {
        return false;
      }
      const browserContext = getBuiltinBrowserChatContextForSend();
      const clientMessageId = requestedClientMessageId ?? crypto.randomUUID();
      recordAction("chat:send", {
        clientMessageId,
        textLength: text2.length,
        hasAttachments: (attachments?.length ?? 0) > 0,
        sessionId: focusedSessionId ?? "new",
      });
      if (focusedSessionId) {
        const focusedSession = sessionStore
          .getState()
          .sessions.get(focusedSessionId);
        if (focusedSession?.busy || focusedSession?.pendingReasons.length) {
          if (documentEditRequest) return false;
          return dispatchQueuedUserMessage(
            text2.trim(),
            attachments?.length ? attachments : void 0,
            canvasNodeAttachments?.length ? canvasNodeAttachments : void 0,
            entityRefs?.length ? entityRefs : void 0,
            clientMessageId,
            queueInsertBefore,
            languageDetectionText,
            browserContext,
          );
        }
        return dispatchUserMessage(
          text2,
          attachments,
          canvasNodeAttachments,
          entityRefs,
          pluginNodeAttachments,
          void 0,
          clientMessageId,
          documentEditRequest,
          textEditContext,
          pluginEditContext,
          languageDetectionText,
          void 0,
          browserContext,
        );
      }
      if (pendingCreatePayloadRef.current) return false;
      if (!guardAccountSubmission("chat").allowed) return false;
      const requestId = beginCreateFocusIntent(DRAFT_NEW_TAB);
      pendingCreatePayloadRef.current = {
        requestId,
        clientMessageId,
        text: text2,
        attachments: attachments ?? null,
        canvasNodeAttachments: canvasNodeAttachments ?? null,
        entityRefs: entityRefs ?? null,
        pluginNodeAttachments: pluginNodeAttachments ?? null,
        documentEditRequest: documentEditRequest ?? null,
        textEditContext: textEditContext ?? null,
        pluginEditContext: pluginEditContext ?? null,
        languageDetectionText: languageDetectionText ?? null,
        attachmentRefs: null,
        browserContext,
        preserveComposer: options2?.preserveComposer,
        draft: {
          text: options2?.preserveComposer
            ? currentInputTextRef.current
            : currentInputTextRef.current || text2,
          editorDoc: currentInputEditorDocRef.current,
          attachments: currentAttachmentsRef.current,
        },
      };
      const sent = send2({
        type: "create_session",
        request_id: requestId,
        model_id: getSelectedModelId() ?? void 0,
        selected_media_models: getSelectedMediaModels(),
      });
      if (!sent) {
        pendingCreatePayloadRef.current = null;
        return false;
      }
      clearPendingCreateTimeout();
      setCreatingSession(true);
      pendingCreateTimeoutRef.current = setTimeout(() => {
        pendingCreateTimeoutRef.current = null;
        failPendingCreate(requestId);
      }, SESSION_CREATE_TIMEOUT_MS);
      return true;
    },
    [
      focusedSessionId,
      dispatchQueuedUserMessage,
      dispatchUserMessage,
      getSelectedMediaModels,
      getSelectedModelId,
      beginCreateFocusIntent,
      clearPendingCreateTimeout,
      failPendingCreate,
      sessionStore,
      send2,
    ],
  );
  const handleSend = reactExports.useCallback(
    (attachments) => {
      const text2 = input.trim();
      if (!hasMessagePayload(text2, attachments)) return;
      if (sendMessage(text2, attachments)) {
        if (!sessionStore.getState().focusedSessionId) return;
        setInput("");
        const draftKey =
          sessionStore.getState().focusedSessionId ?? DRAFT_NEW_TAB;
        draftController.clear(draftKey);
        currentInputTextRef.current = "";
        currentInputEditorDocRef.current = void 0;
        setPendingEditorDoc(null);
        currentAttachmentsRef.current = [];
      }
    },
    [draftController, input, sendMessage, sessionStore],
  );
  reactExports.useEffect(() => {
    const startupMessage = initialMessage;
    const attachments = initialAttachments;
    const entityRefs = options.initialEntityRefs;
    const payloadId = options.initialPayloadId;
    const payloadKey = payloadId
      ? `operation:${payloadId}`
      : `legacy:${workspaceInitialPayloadSignature({
          initialMessage: startupMessage,
          initialAttachments: attachments,
          initialEntityRefs: entityRefs,
          initialModelId: options.initialModelId,
          initialSelectedMediaModels:
            initialSelectedMediaModels ?? getSelectedMediaModels(),
        })}`;
    if (!startupMessage || sentInitialPayloadKeyRef.current === payloadKey) {
      initialPayloadAwaitingDispatchRef.current = false;
      return;
    }
    initialPayloadAwaitingDispatchRef.current = true;
    const waitReason = !initialPayloadReady
      ? "payload_not_ready"
      : !connected
        ? "websocket_disconnected"
        : sessionsLoading
          ? "session_list_loading"
          : !initialPayloadDispatchReady
            ? "session_hydration_pending"
            : switching || pendingSessionSwitchRef.current !== null
              ? "session_switch_pending"
              : textEditAgentState !== null
                ? "text_edit_session_active"
                : busy
                  ? "session_busy"
                  : null;
    if (waitReason) {
      const waitLogKey = `${payloadKey}:${waitReason}`;
      if (initialPayloadWaitLogKeyRef.current !== waitLogKey) {
        initialPayloadWaitLogKeyRef.current = waitLogKey;
        chatLog.info("initial-payload waiting", {
          client_message_id: payloadId ?? null,
          reason: waitReason,
          connected,
          sessions_loading: sessionsLoading,
          switching,
          session_id: sessionStore.getState().focusedSessionId,
        });
      }
      return;
    }
    initialPayloadWaitLogKeyRef.current = null;
    if (
      !autoSendSubmissionDecision.allowed ||
      !guardAccountSubmission("auto_send").allowed
    ) {
      return;
    }
    if (options.initialModelId) handleModelChange(options.initialModelId);
    if (initialSelectedMediaModels !== void 0) {
      syncSelectedMediaModels(initialSelectedMediaModels);
      const focusedSessionId2 = sessionStore.getState().focusedSessionId;
      if (focusedSessionId2) {
        sessionStore.setSelectedMediaModels(
          focusedSessionId2,
          initialSelectedMediaModels,
        );
        send2({
          type: "update_selected_media_models",
          session_id: focusedSessionId2,
          selected_media_models: initialSelectedMediaModels,
        });
      }
    }
    pendingInitialPayloadKeyRef.current = payloadKey;
    const sent = sendMessage(
      startupMessage,
      attachments?.length ? attachments : void 0,
      void 0,
      entityRefs?.length ? entityRefs : void 0,
      void 0,
      options.initialPayloadId,
    );
    const dispatchMeta2 = {
      client_message_id: payloadId ?? pendingInitialClientMessageIdRef.current,
      session_id: sessionStore.getState().focusedSessionId,
      sent,
      message_length: startupMessage.length,
      attachment_count: attachments?.length ?? 0,
      entity_ref_count: entityRefs?.length ?? 0,
    };
    if (sent) {
      chatLog.info("initial-payload dispatch", dispatchMeta2);
    } else {
      chatLog.warn("initial-payload dispatch", dispatchMeta2);
    }
    if (sent) {
      sentInitialPayloadKeyRef.current = payloadKey;
    } else {
      pendingInitialPayloadKeyRef.current = null;
      pendingInitialClientMessageIdRef.current = null;
    }
  }, [
    autoSendSubmissionDecision.allowed,
    connected,
    sessionsLoading,
    initialPayloadDispatchReady,
    switching,
    busy,
    textEditAgentState,
    sendMessage,
    initialPayloadReady,
    initialMessage,
    initialAttachments,
    initialSelectedMediaModels,
    options.initialModelId,
    handleModelChange,
    options.initialEntityRefs,
    options.initialPayloadId,
    send2,
    sessionStore,
    getSelectedMediaModels,
    syncSelectedMediaModels,
  ]);
  const handleRetry = reactExports.useCallback(
    (targetUserMessage) => {
      if (busyRef.current || !connectedRef.current) return false;
      const sessionId = sessionStore.getState().focusedSessionId;
      if (!sessionId) return false;
      const retryMessage = resolveRetryMessagePayload(
        messagesRef.current,
        targetUserMessage,
      );
      if (!retryMessage) return false;
      const {
        text: text2,
        attachmentPaths,
        pluginNodeAttachments,
      } = retryMessage;
      const clientMessageId = crypto.randomUUID();
      recordAction("chat:send", {
        clientMessageId,
        textLength: text2.length,
        hasAttachments: (attachmentPaths?.length ?? 0) > 0,
        sessionId,
        retry: true,
      });
      const sent = accountScopedMessage.send("retry", send2, {
        type: "message",
        content: text2,
        agent_type: "general",
        attachments: attachmentPaths,
        plugin_node_attachments: pluginNodeAttachments,
        client_message_id: clientMessageId,
        session_id: sessionId,
        browser_context: getBuiltinBrowserChatContextForSend(),
      });
      if (sent) {
        sessionStore.setBusy(true, sessionId);
        markMessageDeliverySent(sessionId, clientMessageId, "normal");
      }
      return sent;
    },
    [markMessageDeliverySent, sessionStore, send2],
  );
  const { performCancel, handleCancel } = useChatCancel({
    busy,
    pendingReasons,
    sessionStore,
    controller,
    cancelInFlightSessionIdsRef,
    send: send2,
    clearMessageDeliveryTimersForSession,
  });
  const stopStalledSession = reactExports.useCallback(() => {
    const sessionId = sessionStore.getState().focusedSessionId;
    if (sessionId) recordStallAction(sessionId, "stop_task");
    performCancel("stall_banner_stop");
    if (sessionId) clearStalledForSession(sessionId);
  }, [performCancel, sessionStore, recordStallAction, clearStalledForSession]);
  const dismissStalledNotice = reactExports.useCallback(() => {
    const sessionId = sessionStore.getState().focusedSessionId;
    if (sessionId) dismissStalledForSession(sessionId);
  }, [sessionStore, dismissStalledForSession]);
  const openNewTab = reactExports.useCallback(() => {
    if (activeTextEditAgentRef.current) return;
    activateNewTabDraft();
  }, [activateNewTabDraft]);
  const cancelNewTab = reactExports.useCallback(() => {
    setPendingNewTab(false);
  }, []);
  const clearEvictedTabIds = reactExports.useCallback(() => {
    setEvictedTabIds((prev) => (prev.length === 0 ? prev : []));
  }, []);
  const closeTab = reactExports.useCallback(
    (sessionId) => {
      const state2 = sessionStore.getState();
      if (!state2.openedTabIds.has(sessionId)) return false;
      if (state2.focusedSessionId !== sessionId) {
        sessionStore.closeTab(sessionId);
        return true;
      }
      const order2 = state2.openedTabOrder;
      const tabIndex = order2.indexOf(sessionId);
      const nextFocusedId = order2[tabIndex + 1] ?? order2[tabIndex - 1] ?? null;
      if (nextFocusedId) {
        sendWsMessage({
          type: "switch_session",
          session_id: nextFocusedId,
        });
        sessionStore.closeTab(sessionId);
        return true;
      }
      cancelPendingSessionSwitch(DRAFT_NEW_TAB);
      draftController.setNow(sessionId, {
        text: currentInputTextRef.current,
        editorDoc: currentInputEditorDocRef.current,
        attachments: currentAttachmentsRef.current,
      });
      sessionStore.closeTab(sessionId);
      const newTabDraft = draftController.get(DRAFT_NEW_TAB);
      currentInputTextRef.current = newTabDraft.text;
      currentInputEditorDocRef.current = newTabDraft.editorDoc;
      currentAttachmentsRef.current = newTabDraft.attachments;
      setPendingEditorDoc(newTabDraft.editorDoc ?? null);
      setPendingAttachments(newTabDraft.attachments);
      if (newTabDraft.text) {
        setInput(newTabDraft.text);
      } else {
        setPendingEditorReset((resetGeneration) => resetGeneration + 1);
      }
      return true;
    },
    [cancelPendingSessionSwitch, sessionStore, sendWsMessage, draftController],
  );
  const forkSession = reactExports.useCallback(
    (runtimeMessageId, forkPointContent) => {
      if (activeTextEditAgentRef.current) return;
      const currentId = sessionStore.getState().focusedSessionId;
      if (!currentId) return;
      const requestId = beginForkFocusIntent(currentId);
      pendingForkDraftsRef.current.set(requestId, forkPointContent);
      const sent = send2({
        type: "fork_session",
        request_id: requestId,
        session_id: currentId,
        message_id: runtimeMessageId,
      });
      if (!sent) pendingForkDraftsRef.current.delete(requestId);
    },
    [beginForkFocusIntent, sessionStore, send2],
  );
  const markSessionCancelled = reactExports.useCallback(
    (sessionId) => {
      controller.markSessionCancelled(sessionId);
    },
    [controller],
  );
  const getTextEditCloseBlockReason = reactExports.useCallback(
    (editor) => {
      const active2 = activeTextEditAgentRef.current;
      if (!active2 || !sameTextEditSession(active2.editor, editor)) return null;
      if (active2.status === "resolving") {
        const transactionId = textEditTransactionId(active2.editor);
        const pendingSwitch = pendingSessionSwitchRef.current;
        const hasPendingCreate = Boolean(
          active2.requestId &&
          pendingTextEditCreatesRef.current.has(active2.requestId),
        );
        const hasPendingSwitch =
          pendingSwitch?.textEditTransactionId === transactionId;
        if (
          !active2.reconnectFailClosed &&
          !active2.sessionId &&
          !hasPendingCreate &&
          !hasPendingSwitch
        ) {
          return null;
        }
        return "session-resolving";
      }
      const state2 = sessionStore.getState();
      const resolvedSessionId =
        active2.sessionId ??
        resolveTextEditSessionId(
          textEditBindingsRef.current[editor.nodeId],
          state2,
        );
      if (!resolvedSessionId) {
        return active2.status === "error" && !active2.sessionId
          ? null
          : "session-resolving";
      }
      const session = state2.sessions.get(resolvedSessionId);
      if (!session) {
        return active2.status === "error" && !active2.sessionId
          ? null
          : "session-resolving";
      }
      const hasActiveDelivery = [
        ...messageDeliveryByClientIdRef.current.values(),
      ].some(
        (delivery) =>
          delivery.sessionId === resolvedSessionId &&
          ACTIVE_MESSAGE_DELIVERY_STATUSES.has(delivery.status),
      );
      const hasQueuedMessages =
        (queuedUserMessagesBySessionRef.current.get(resolvedSessionId)
          ?.length ?? 0) > 0;
      const hasDocumentEdit = [
        ...documentEditSubmissionsRef.current.values(),
      ].some(
        (submission) =>
          submission.sessionId === resolvedSessionId &&
          (submission.status === "submitting" ||
            submission.status === "accepted" ||
            submission.status === "running"),
      );
      const hasPendingRemoteTool =
        remoteTool.hasPendingRemoteToolForSession(resolvedSessionId);
      const hasPendingInteraction = session.messages.some((message2) => {
        if (
          message2.type === "question" ||
          message2.type === "interact" ||
          message2.type === "confirm" ||
          message2.type === "loop_guard_ask"
        ) {
          return !message2.resolved;
        }
        return (
          message2.type === "tool_confirm_ask" &&
          !message2.resolved &&
          !message2.expired
        );
      });
      return session.busy ||
        session.pendingReasons.length > 0 ||
        hasActiveDelivery ||
        hasQueuedMessages ||
        hasDocumentEdit ||
        hasPendingRemoteTool ||
        hasPendingInteraction
        ? "agent-running"
        : null;
    },
    [remoteTool.hasPendingRemoteToolForSession, sessionStore],
  );
  return {
    connected,
    messages: messages2,
    // Processing includes pre-runtime stages. A preceding turn's idle frame
    // cannot make the currently admitted message look idle in the renderer.
    busy:
      busy ||
      messageDeliveryStates.some(
        (state2) =>
          state2.sessionId === focusedSessionId && isMessagePreflight(state2),
      ),
    pendingReasons,
    historyLoadFailed,
    historyReloading,
    focusedSessionId,
    sessions,
    openedTabOrder,
    openedTabIds,
    sessionsLoading,
    conversationLoading,
    sessionListUnavailable,
    retrySessionList,
    switching,
    switchError,
    creatingSession,
    pendingNewTab,
    evictedTabIds,
    clearEvictedTabIds,
    openNewTab,
    cancelNewTab,
    closeTab,
    forkSession,
    input,
    setInput,
    handleSend,
    sendMessage,
    handleRetry,
    handleCancel,
    stalledSessions,
    stopStalledSession,
    dismissStalledNotice,
    markSessionCancelled,
    reloadSessionHistory,
    sendWsMessage,
    renameSession,
    sessionStore,
    textEditAgentState,
    textEditSessionIds,
    textEditNodeSessionIds,
    enterTextEditAgent,
    leaveTextEditAgent,
    newTextEditSession,
    switchTextEditSession,
    clearTextEditSessionsForNode,
    getTextEditCloseBlockReason,
    controller,
    selectedModelId,
    handleModelChange,
    handleModelSelectionChange,
    remoteToolRequest: remoteTool.remoteToolRequest,
    remoteToolDialogSessionId: remoteTool.remoteToolDialogSessionId,
    clearRemoteToolRequest: remoteTool.clearRemoteToolRequest,
    pendingRemoteToolRequest: remoteTool.pendingRemoteToolRequest,
    openPendingRemoteTool: remoteTool.openPendingRemoteTool,
    clearPendingRemoteToolRequest: remoteTool.clearPendingRemoteToolRequest,
    lastSkillGuiEvent: remoteTool.lastSkillGuiEvent,
    sendSkillGuiEvent: remoteTool.sendSkillGuiEvent,
    selectedMediaModels,
    handleSelectedMediaModelsChange,
    trackInputChange,
    pendingEditorReset,
    pendingEditorDoc,
    handlePendingInputConsumed,
    pendingComposerReset,
    restoreDraft,
    pendingAttachments,
    handlePendingAttachmentsConsumed,
    trackAttachmentsChange,
    queuedUserMessages,
    queuedUserMessageScrollRequest,
    cancelQueuedUserMessage,
    sendQueuedUserMessageNow,
    reorderQueuedUserMessage,
    messageDeliveryStates,
    documentEditSubmissions,
  };
}
