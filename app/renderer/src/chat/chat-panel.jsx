// chat-panel.jsx
import reactExports from "react";
import { useCurrentWorkspace } from "../infra/shared-runtime.js";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Loader2 } from "../media-editing/lucide-icon-wraps.js";
import { workspaceLog } from "../infra/logger.js";
import { dedupedToast, guardAccountSubmission, useBrowserImageEdit } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  buildSelectionQuote,
  DOCUMENT_EDIT_TARGETS_PER_ANNOTATION,
  MILLISECONDS_PER_MINUTE,
  QuestionComposerGate,
  queuedMessageSuccessorIds,
  restoreQueuedMessageToComposer,
  SessionListUnavailableNotice,
  StalledTurnBanner,
  textAgentInputPlaceholder,
} from "./stalled-turn-banner.jsx";
import { applyToolConfirmReplyOptimisticUpdate } from "./apply-tool-confirm-reply-optimistic-update.js";
import { QueuedUserMessageList } from "./sortable-queued-row.jsx";
import {
  DEBUG_FLAGS,
  useDebugFlag,
} from "../workspace/use-deep-link-router.js";
import { useLoginGuard } from "../infra/schedule.js";
import {
  useTopbarState,
  workspaceEvents,
} from "../workspace/topbar-state-context.jsx";
import { RecoveringChildrenProvider } from "../generation/use-mention-models.jsx";
import { useGatewayScopeKey } from "../generation/use-model-catalog-scope-key.js";
import {
  aggregateToolConfirmApprovalState,
  canApproveAllToolConfirms,
  getLatestInlineToolConfirmId,
  getMiniBarToolConfirms,
  getPendingToolConfirms,
  useToolConfirmSettlement,
} from "./use-tool-confirm-settlement.js";
import { useLoopGuardSettlement } from "../generation/use-loop-guard-settlement.js";
import {
  useChatConnectionPhase,
  useRuntimeMemoryReclaim,
  useToolConfirmEditState,
} from "../generation/use-tool-confirm-edit-state.js";
import { useChatToolbar } from "../generation/use-chat-toolbar.jsx";
import { ChatEmptyState } from "./chat-empty-state.jsx";
import {
  resolveLegacyInteractionReply,
  useAstraSendGate,
} from "../generation/use-astra-send-gate.js";
import { Button } from "../infra/dialog-content.jsx";
import { CHAT_CONTENT_MAX_WIDTH_PX } from "./chat-content-width.jsx";
import {
  shallowEqualObject,
  useWorkspaceChatSelector,
  useWorkspaceChatStoreSelector,
  useWorkspaceProductionPlanDisclosureStore,
} from "../assets/use-canvas-model-registry-hydration.js";
import { ProductionPlanDisclosureContext } from "../text-editor/capability-search-card.jsx";
import {
  ChatComplianceNotice,
  chatReadinessBlocksInput,
  MessageInput,
  useChatReadiness,
  useSkillReloadNotification,
} from "./chat-compliance-notice.jsx";
import { ModeSelector } from "./mode-selector.jsx";
import { PromoBanner } from "./promo-banner.jsx";
import { TEXT_EDIT_SELECTION_MAX_LENGTH } from "../text-editor/build-asr-gateway-request.js";
import { useAgentModePreference } from "../workspace/resolve-retry-message-payload.jsx";
import { useMaterializeEntity } from "../assets/use-materialize-entity.js";
import {
  applyChatShowcaseSelection,
  ChatReconnectNotice,
  ChatStartupNotice,
  isDocumentEditSubmissionForAnnotations,
  selectChatPanelState,
  selectMessages,
  useBrowserChatMedia,
  useReconnectingStuck,
} from "./use-browser-chat-media.jsx";
import { ChatHeaderContainer } from "./chat-header-container.jsx";
import { ChatHistoryLoadingState } from "./chat-history-loading-state.jsx";
import { DocumentEditReviewBar } from "./document-edit-review-bar.jsx";
import {
  canOpenProductionPlan,
  productionPlanDisclosureKey,
  ToolConfirmEditsContext,
  updateProductionPlanDisclosureState,
} from "../generation/domestic-param-labels.jsx";
import { useCreditReminderConfig } from "../team/team-credit-history-section.jsx";
import { getPluginAgentEditorState } from "../media-editing/input.jsx";
import { hasFileDropPayload } from "./find-trailing-trigger.js";
import { SKILL_DRAG_MIME } from "../workspace/workspace-asset-center-relocation-coach-mark.jsx";
import { ENTITY_DRAG_MIME } from "../infra/use-online.jsx";
import { readEntityDragData } from "../assets/read-entity-drag-data.js";
import { FileDropFeedback } from "../text-editor/file-drop-feedback.jsx";
import { WorkspaceCreationGuidePlaceholder } from "../text-editor/get-wire-content-text.jsx";
import { LoopGuardAskDock } from "./loop-guard-ask-dock.jsx";
import { MessageListContainer } from "../media-editing/message-list-props-equal.jsx";
import { QuestionDock } from "./question-dock.jsx";
import { PendingAnnotationList } from "../text-editor/pending-annotation-list.jsx";
import { ProductionPlanTimeline } from "../text-editor/production-plan-timeline.jsx";
import {
  canCompleteProductionPlanConfirmation,
  findPendingQuestionState,
  getCurrentProductionStage,
  getStageConfirmationCopy,
  getStageDisplayName,
  nextFeedbackSentStageKey,
  nodeAgentInputPlaceholder,
  shouldRouteMessageToStageRevision,
  SkillReloadDock,
  StageConfirmationBar,
  ToolConfirmMiniBar,
} from "../text-editor/skill-reload-dock.jsx";
import { StagePromptEditorCard } from "../workspace/stage-prompt-editor-card.jsx";
import { DevToolConfirmTrigger } from "../media-editing/dev-tool-confirm-trigger.jsx";
import { findStageReviewAnchorMessageId } from "../workspace/task-result-authored-stage-id.js";
import {
  hasConfirmedPromptReview,
  takeLatestPromptReviews,
} from "../workspace/has-confirmed-prompt-review.js";
import { useProductionBoard } from "../workspace/use-production-board.js";
export function ChatPanel({
  onCollapse: _onCollapse,
  headerActions,
  textEditMode,
  textEditChatStatus,
  textEditSession,
  textEditSelectionRef,
  hasTextEditSelection = false,
  pluginEditMode,
  pluginEditChatStatus,
  pluginEditSession,
  pluginEditAgentName,
  pluginEditPluginId,
  annotations,
  activeAnnotationId,
  onAnnotationLocate,
  onAnnotationDelete,
  onAnnotationClear,
  isPresented = true,
}) {
  const { t: translate, i18n } = useTranslation();
  const { guard: loginGuard, LoginDialog } = useLoginGuard();
  const navigate = useNavigate();
  const { currentWorkspaceId } = useTopbarState();
  const workspaceId = useGatewayScopeKey();
  const isActiveRef = reactExports.useRef(currentWorkspaceId === workspaceId);
  isActiveRef.current = currentWorkspaceId === workspaceId;
  const currentWorkspacePath = useCurrentWorkspace();
  const materializeEntityMutation = useMaterializeEntity();
  const selected = useWorkspaceChatSelector(
    selectChatPanelState,
    shallowEqualObject,
  );
  const mediaReviewing = useWorkspaceChatSelector((chat) =>
    chat.messageDeliveryStates.some(
      (state) =>
        state.sessionId === chat.focusedSessionId &&
        state.status === "sent" &&
        state.phase === "media_review",
    ),
  );
  const {
    connected,
    sessionsLoading,
    conversationLoading,
    sessionListUnavailable,
    retrySessionList,
    messages,
    busy,
    pendingReasons,
    historyLoadFailed,
    historyReloading,
    switching,
    creatingSession,
    focusedSessionId,
    input: pendingInput,
    setInput: setPendingInput,
    pendingEditorDoc,
    handlePendingInputConsumed,
    sendMessage,
    handleRetry,
    handleCancel,
    stalledSessions,
    stopStalledSession,
    dismissStalledNotice,
    reloadSessionHistory,
    sendWsMessage,
    sessionStore,
    forkSession,
    selectedModelId,
    handleModelSelectionChange,
    selectedMediaModels,
    handleSelectedMediaModelsChange,
    trackInputChange,
    trackAttachmentsChange,
    pendingEditorReset,
    pendingComposerReset,
    restoreDraft,
    pendingAttachments,
    handlePendingAttachmentsConsumed,
    queuedUserMessages,
    queuedUserMessageScrollRequest,
    cancelQueuedUserMessage,
    sendQueuedUserMessageNow,
    reorderQueuedUserMessage,
    documentEditSubmissions,
  } = selected;
  const astraSendGate = useAstraSendGate(selectedModelId);
  const [activeDocumentEditRequestId, setActiveDocumentEditRequestId] =
    reactExports.useState(null);
  const submittedAnnotationIdsRef = reactExports.useRef([]);
  const activeDocumentEditSubmissionCandidate = activeDocumentEditRequestId
    ? documentEditSubmissions?.get(activeDocumentEditRequestId)
    : void 0;
  const activeSubmissionMatchesAnnotations =
    isDocumentEditSubmissionForAnnotations(
      submittedAnnotationIdsRef.current,
      annotations ?? [],
    );
  const documentEditInFlight =
    activeDocumentEditSubmissionCandidate?.status === "submitting" ||
    activeDocumentEditSubmissionCandidate?.status === "accepted" ||
    activeDocumentEditSubmissionCandidate?.status === "running";
  const activeDocumentEditSubmission =
    documentEditInFlight || activeSubmissionMatchesAnnotations
      ? activeDocumentEditSubmissionCandidate
      : void 0;
  const inputRef = reactExports.useRef(null);
  const questionFileDropHandlerRef = reactExports.useRef(void 0);
  const handleQuestionFileDropHandlerChange = reactExports.useCallback(
    (handler) => {
      questionFileDropHandlerRef.current = handler;
    },
    [],
  );
  const queuedEditRestoreRef = reactExports.useRef(null);
  const pendingQueuedEditClientMessageIdRef = reactExports.useRef(null);
  const composerSendPreparingRef = reactExports.useRef(false);
  const [composerSendPreparing, setComposerSendPreparing] =
    reactExports.useState(false);
  const handleComposerSendPreparingChange = reactExports.useCallback(
    (preparing) => {
      composerSendPreparingRef.current = preparing;
      setComposerSendPreparing(preparing);
    },
    [],
  );
  const showcaseSelectionSeqRef = reactExports.useRef(0);
  const showcaseAttachmentAbortRef = reactExports.useRef(null);
  const [showcaseAttachmentsLoading, setShowcaseAttachmentsLoading] =
    reactExports.useState(false);
  const stagePromptEditorRef = reactExports.useRef(null);
  const productionPlanMessagePendingRef = reactExports.useRef(false);
  const productionPlanConfirmTransitionRef = reactExports.useRef(void 0);
  const processedResetRef = reactExports.useRef(pendingEditorReset);
  reactExports.useEffect(() => {
    if (pendingEditorReset > processedResetRef.current) {
      processedResetRef.current = pendingEditorReset;
      if (inputRef.current?.isSelectSkillPending?.()) return;
      inputRef.current?.resetInput();
    }
  }, [pendingEditorReset]);
  const processedComposerResetRef = reactExports.useRef(pendingComposerReset);
  reactExports.useEffect(() => {
    if (pendingComposerReset <= processedComposerResetRef.current) return;
    processedComposerResetRef.current = pendingComposerReset;
    inputRef.current?.reset();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [pendingComposerReset]);
  reactExports.useEffect(() => {
    restoreDraft();
  }, [restoreDraft]);
  const nodeEditMode = !!textEditMode || !!pluginEditMode;
  const nodeEditAgentLabels = reactExports.useMemo(
    () =>
      pluginEditMode
        ? {
            preparing: translate(
              "chat.pluginEditAgent.preparing",
              "Preparing editor Agent...",
            ),
            prepareFailed: translate(
              "chat.pluginEditAgent.prepareFailed",
              "Editor Agent could not be prepared. Close the editor and try again.",
            ),
            preparingPlaceholder: translate(
              "chat.pluginEditAgent.preparingPlaceholder",
              "Editor Agent is getting ready...",
            ),
          }
        : {
            preparing: translate(
              "chat.textEditAgent.preparing",
              "Preparing Text Assistant...",
            ),
            prepareFailed: translate(
              "chat.textEditAgent.prepareFailed",
              "Text Assistant could not be prepared. Close the editor and try again.",
            ),
            preparingPlaceholder: translate(
              "chat.textEditAgent.preparingPlaceholder",
              "Text Assistant is getting ready...",
            ),
          },
    [pluginEditMode, translate],
  );
  const nodeEditChatStatus = pluginEditMode
    ? pluginEditChatStatus
    : textEditChatStatus;
  const nodeEditSkillMode = textEditMode
    ? "text-editor"
    : pluginEditPluginId === "3d-director-stage"
      ? "director-stage"
      : pluginEditMode
        ? "clip-editor"
        : void 0;
  const isSpecialNodeSession =
    nodeEditSkillMode === "director-stage" ||
    nodeEditSkillMode === "clip-editor";
  const nodeSkillLabel =
    nodeEditSkillMode === "director-stage"
      ? translate("chat.emptyRecommendations.skillTab.directorAgent")
      : nodeEditSkillMode === "clip-editor"
        ? translate("chat.emptyRecommendations.skillTab.clipAgent")
        : void 0;
  const textEditConversationReady =
    !nodeEditMode || nodeEditChatStatus === "ready";
  const textEditConversationFailed =
    nodeEditMode && nodeEditChatStatus === "error";
  const visibleMessages = selectMessages(
    messages,
    textEditConversationReady,
    !!textEditMode,
  );
  const hasActiveSession = visibleMessages.length > 0;
  const showConversationLoading =
    textEditConversationReady && (conversationLoading || switching);
  const {
    pendingSkills,
    reload: reloadSkills,
    dismiss: dismissSkillReload,
  } = useSkillReloadNotification(hasActiveSession);
  const productionPlan = useProductionBoard(messages, focusedSessionId);
  const productionPlanKey = productionPlanDisclosureKey(focusedSessionId);
  const productionPlanDisclosureStore =
    useWorkspaceProductionPlanDisclosureStore();
  const productionPlanExpanded = useWorkspaceChatStoreSelector(
    productionPlanDisclosureStore,
    (snapshot) =>
      productionPlanKey ? snapshot.get(productionPlanKey) : void 0,
  );
  const updateProductionPlanDisclosure = reactExports.useCallback(
    (event) => {
      if (!productionPlanKey) return;
      const current = productionPlanDisclosureStore.getSnapshot();
      const next = updateProductionPlanDisclosureState(
        current,
        productionPlanKey,
        event,
      );
      if (next === current) return;
      productionPlanDisclosureStore.setSnapshot(next);
    },
    [productionPlanDisclosureStore, productionPlanKey],
  );
  reactExports.useEffect(() => {
    if (!productionPlan.planId || !productionPlanKey) return;
    updateProductionPlanDisclosure("plan-discovered");
  }, [
    productionPlan.planId,
    productionPlanKey,
    updateProductionPlanDisclosure,
  ]);
  const collapseProductionPlan = reactExports.useCallback(() => {
    if (!productionPlan.planId) return;
    updateProductionPlanDisclosure("message-sent");
  }, [productionPlan.planId, updateProductionPlanDisclosure]);
  const openProductionPlan = reactExports.useCallback(
    (requestedPlanId) => {
      if (!canOpenProductionPlan(productionPlan.planId, requestedPlanId))
        return false;
      updateProductionPlanDisclosure("timeline-opened");
      return true;
    },
    [productionPlan.planId, updateProductionPlanDisclosure],
  );
  const productionPlanDisclosureValue = reactExports.useMemo(
    () => ({
      activePlanId: productionPlan.planId,
      openPlan: openProductionPlan,
    }),
    [openProductionPlan, productionPlan.planId],
  );
  const handleProductionPlanExpandedChange = reactExports.useCallback(
    (expanded) => {
      updateProductionPlanDisclosure(
        expanded ? "manually-expanded" : "manually-collapsed",
      );
    },
    [updateProductionPlanDisclosure],
  );
  const currentProductionStage = getCurrentProductionStage(
    productionPlan.model,
  );
  const waitingStageKey =
    currentProductionStage?.status === "waiting_user" && productionPlan.planId
      ? `${productionPlan.planId}:${currentProductionStage.id}:${productionPlan.revision ?? ""}`
      : void 0;
  const productionPlanConfirmationScopeKey = `${focusedSessionId ?? ""}\0${productionPlan.planId ?? ""}\0${currentProductionStage?.id ?? ""}`;
  const productionPlanConfirmationGenerationRef = reactExports.useRef({
    key: productionPlanConfirmationScopeKey,
    generation: 0,
  });
  if (
    productionPlanConfirmationGenerationRef.current.key !==
    productionPlanConfirmationScopeKey
  ) {
    productionPlanConfirmationGenerationRef.current = {
      key: productionPlanConfirmationScopeKey,
      generation:
        productionPlanConfirmationGenerationRef.current.generation + 1,
    };
  }
  const productionPlanConfirmationIdentity = {
    sessionId: focusedSessionId,
    planId: productionPlan.planId,
    stageId: currentProductionStage?.id,
    revision: productionPlan.revision,
    editable: productionPlan.editable,
    generation: productionPlanConfirmationGenerationRef.current.generation,
  };
  const productionPlanConfirmationIdentityRef = reactExports.useRef(
    productionPlanConfirmationIdentity,
  );
  productionPlanConfirmationIdentityRef.current =
    productionPlanConfirmationIdentity;
  const [feedbackSentStageKey, setFeedbackSentStageKey] =
    reactExports.useState();
  const userMessageSignature = messages
    .filter((message) => message.role === "user" && message.type === "text")
    .map((message) => message.id)
    .join("\n");
  const userMessageHistory = reactExports.useMemo(
    () => messages.filter((message) => message.role === "user" && message.type === "text"),
    [userMessageSignature],
  );
  const mockToolConfirm = useDebugFlag(DEBUG_FLAGS.mockToolConfirm);
  const { pendingQuestion, pendingQuestionFailureId } = reactExports.useMemo(
    () => findPendingQuestionState(messages),
    [messages],
  );
  const pendingLoopGuard = reactExports.useMemo(() => {
    for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex--) {
      const message = messages[messageIndex];
      if (message.type === "loop_guard_ask" && !message.resolved) return message;
    }
    return null;
  }, [messages]);
  const handleRejectedLoopGuardSettlement = reactExports.useCallback(
    (cause, _intent) => {
      if (cause === "session_cancelled" || cause === "session_deleted") return;
      if (cause === "timeout") {
        dedupedToast.warning(
          translate(
            "chat.loopGuard.timeoutNotice",
            "The confirmation expired before your choice was accepted. Please retry the operation.",
          ),
        );
        return;
      }
      if (cause === "runtime_restarted") {
        dedupedToast.warning(
          translate(
            "chat.loopGuard.runtimeRestartedNotice",
            "The local service reconnected, so this confirmation was cancelled. Please retry the operation.",
          ),
        );
        return;
      }
      if (cause === "transport_closed") {
        dedupedToast.warning(
          translate(
            "chat.loopGuard.transportClosedNotice",
            "The connection closed, so this confirmation was cancelled. Please retry the operation.",
          ),
        );
        return;
      }
      dedupedToast.warning(
        translate(
          "chat.loopGuard.unavailableNotice",
          "We could not verify whether this choice took effect. Check the current task state before retrying.",
        ),
      );
    },
    [translate],
  );
  const handleLoopGuardAckTimeout = reactExports.useCallback(() => {
    dedupedToast.warning(
      translate(
        "chat.loopGuard.ackTimeoutNotice",
        "No confirmation result was received. You can choose again without losing the conversation.",
      ),
    );
  }, [translate]);
  const handleConflictingLoopGuardSettlement = reactExports.useCallback(() => {
    dedupedToast.warning(
      translate(
        "chat.loopGuard.conflictingDecisionNotice",
        "Another choice was already accepted for this confirmation. The earlier choice remains in effect.",
      ),
    );
  }, [translate]);
  const {
    beginSubmission: beginLoopGuardSubmission,
    isSubmitting: isLoopGuardSubmitting,
  } = useLoopGuardSettlement({
    messages,
    isPresented,
    focusedSessionId,
    onRejectedSettlement: handleRejectedLoopGuardSettlement,
    onConflictingSettlement: handleConflictingLoopGuardSettlement,
    onAckTimeout: handleLoopGuardAckTimeout,
  });
  const handleToolConfirmAckTimeout = reactExports.useCallback(() => {
    dedupedToast.warning(
      translate(
        "chat.toolConfirm.ackTimeoutNotice",
        "No confirmation result was received. You can choose again without losing the conversation.",
      ),
    );
  }, [translate]);
  const { submit: submitToolConfirm, submittingIds: submittingToolConfirmIds } =
    useToolConfirmSettlement({
      messages,
      isPresented,
      focusedSessionId,
      onAckTimeout: handleToolConfirmAckTimeout,
    });
  const pendingToolConfirms = reactExports.useMemo(
    () => getPendingToolConfirms(messages),
    [messages],
  );
  const miniBarToolConfirms = reactExports.useMemo(
    () => getMiniBarToolConfirms(pendingToolConfirms, messages),
    [messages, pendingToolConfirms],
  );
  const inlineEditorFocusMessageId = reactExports.useMemo(
    () => getLatestInlineToolConfirmId(pendingToolConfirms, messages),
    [messages, pendingToolConfirms],
  );
  const {
    approvalState: toolConfirmApprovalState,
    contextValue: toolConfirmEditsContextValue,
    edits: toolConfirmEdits,
  } = useToolConfirmEditState(pendingToolConfirms, submittingToolConfirmIds);
  const aggregateApprovalState = reactExports.useMemo(
    () =>
      aggregateToolConfirmApprovalState(
        miniBarToolConfirms,
        toolConfirmApprovalState,
      ),
    [miniBarToolConfirms, toolConfirmApprovalState],
  );
  const [sessionMode, setAgentModePreference] = useAgentModePreference();
  const {
    config: creditReminderConfig,
    isReady: creditReminderReady,
    saveConfig: setCreditReminderConfig,
  } = useCreditReminderConfig();
  const handleCreditReminderConfigChange = reactExports.useCallback(
    async (nextConfig) => {
      await setCreditReminderConfig(nextConfig);
      if (!focusedSessionId) return;
      sendWsMessage({
        type: "set_credit_reminder_config",
        session_id: focusedSessionId,
        enabled: nextConfig.enabled,
        threshold: nextConfig.threshold,
      });
    },
    [focusedSessionId, sendWsMessage, setCreditReminderConfig],
  );
  reactExports.useEffect(() => {
    if (!connected || !creditReminderReady || !focusedSessionId) return;
    sendWsMessage({
      type: "set_credit_reminder_config",
      session_id: focusedSessionId,
      enabled: creditReminderConfig.enabled,
      threshold: creditReminderConfig.threshold,
    });
  }, [
    connected,
    creditReminderConfig,
    creditReminderReady,
    focusedSessionId,
    sendWsMessage,
  ]);
  const handleModeChange = reactExports.useCallback(
    (mode) => {
      if (composerSendPreparingRef.current) return;
      setAgentModePreference(mode);
      if (focusedSessionId) {
        sendWsMessage({
          type: "set_mode",
          mode,
          session_id: focusedSessionId,
        });
      }
    },
    [focusedSessionId, sendWsMessage, setAgentModePreference],
  );
  const handleComposerModelSelectionChange = reactExports.useCallback(
    (next, rememberForNewChats = false) => {
      if (composerSendPreparingRef.current) return;
      handleModelSelectionChange(next, rememberForNewChats);
    },
    [handleModelSelectionChange],
  );
  const agentRunning = busy || pendingReasons.length > 0;
  const stalledInfo = focusedSessionId
    ? stalledSessions[focusedSessionId]
    : void 0;
  const showStalledBanner = Boolean(stalledInfo) && agentRunning;
  const stalledBasisMs =
    stalledInfo?.watchdog === "hard_cap"
      ? stalledInfo.elapsedMs
      : stalledInfo?.silentMs;
  const stalledMinutes = Math.max(
    1,
    Math.round((stalledBasisMs ?? 0) / MILLISECONDS_PER_MINUTE),
  );
  const recoveringChildSessionIds = reactExports.useMemo(() => {
    const childSessionIdSet = new Set();
    for (const pendingReason of pendingReasons) {
      if (pendingReason.kind === "generation_recovery") {
        for (const childSessionId of pendingReason.childSessionIds ?? []) childSessionIdSet.add(childSessionId);
      }
    }
    return childSessionIdSet;
  }, [pendingReasons]);
  const isRecovering = pendingReasons.some(
    (pendingReason) => pendingReason.kind === "generation_recovery",
  );
  const connectionPhase = useChatConnectionPhase(workspaceId, connected);
  const connecting = connectionPhase === "connecting";
  const reconnecting = connectionPhase === "reconnecting";
  const connectionUnavailable = connectionPhase !== "connected";
  const reclaimedByMemory = useRuntimeMemoryReclaim();
  const reconnectingStuck = useReconnectingStuck(reconnecting);
  const reconnectBanner =
    reconnectingStuck && reclaimedByMemory
      ? {
          title: translate(
            "chat.reconnecting.stuckMemoryTitle",
            "Low memory — still can't reach the runtime",
          ),
          description: translate(
            "chat.reconnecting.stuckDescription",
            "Auto-reconnect isn't recovering. Close other memory-heavy apps, then restart the app and try again.",
          ),
        }
      : reconnectingStuck
        ? {
            title: translate(
              "chat.reconnecting.stuckTitle",
              "Still can't reach the runtime",
            ),
            description: translate(
              "chat.reconnecting.stuckDescription",
              "Auto-reconnect isn't recovering. Close other memory-heavy apps, then restart the app and try again.",
            ),
          }
        : reclaimedByMemory
          ? {
              title: translate(
                "chat.reconnecting.memoryTitle",
                "Low system memory — runtime was reclaimed",
              ),
              description: translate(
                "chat.reconnecting.memoryDescription",
                "Recovering automatically. Close some memory-heavy apps or workspaces and try again.",
              ),
            }
          : {
              title: translate(
                "chat.reconnecting.title",
                "Reconnecting to runtime...",
              ),
              description: translate(
                "chat.reconnecting.description",
                "Messages are paused until the connection is restored.",
              ),
            };
  const chatReadiness = useChatReadiness();
  const starting = chatReadiness === "starting";
  const preparing = starting || connecting;
  const providersUnavailable = chatReadiness === "providers_unavailable";
  const runtimeUnavailable = chatReadiness === "runtime_unavailable";
  const sessionListStalled = sessionListUnavailable?.stalled === true;
  const readinessLocked = chatReadinessBlocksInput(chatReadiness);
  const [retryingProviders, setRetryingProviders] =
    reactExports.useState(false);
  const handleRetryProviders = reactExports.useCallback(async () => {
    setRetryingProviders(true);
    try {
      await window.hilo.opencode.restart();
    } catch {
    } finally {
      setRetryingProviders(false);
    }
  }, []);
  const inputLocked =
    !!pendingQuestion ||
    !!pendingLoopGuard ||
    connectionUnavailable ||
    conversationLoading ||
    switching ||
    (creatingSession && !focusedSessionId) ||
    readinessLocked ||
    sessionListStalled ||
    isRecovering ||
    !textEditConversationReady ||
    composerSendPreparing ||
    showcaseAttachmentsLoading;
  const renderToolbar = useChatToolbar({
    busy: inputLocked,
    running: textEditConversationReady && agentRunning,
    selectedModelId,
    selectedMediaModels,
    onModelSelectionChange: handleComposerModelSelectionChange,
    skillLabel: nodeSkillLabel,
    hideMediaModelSelector: isSpecialNodeSession,
    // 第 319 轮（验收发现）：参照的聊天输入框有「模型」按钮（chat-model-btn），
    // 我们的 ChatToolbar 里也有这个组件，但 showModelSelector 默认 false、
    // 这里又没传，于是按钮从来没渲染过 —— 35 屏都缺。
    showModelSelector: true,
  });
  const modeSelectorSlot = reactExports.useMemo(
    () =>
      isSpecialNodeSession ? null : (
        <ModeSelector
          mode={sessionMode}
          onChange={handleModeChange}
          disabled={composerSendPreparing}
          creditReminderConfig={
            creditReminderReady ? creditReminderConfig : void 0
          }
          onCreditReminderConfigChange={
            creditReminderReady ? handleCreditReminderConfigChange : void 0
          }
        />
      ),
    [
      creditReminderConfig,
      creditReminderReady,
      handleCreditReminderConfigChange,
      handleModeChange,
      isSpecialNodeSession,
      composerSendPreparing,
      sessionMode,
    ],
  );
  const inputPlaceholderBusy = reactExports.useMemo(() => {
    if (textEditConversationFailed) {
      return translate(
        "chat.textEditAgent.failedPlaceholder",
        "Close the editor and try again.",
      );
    }
    if (!textEditConversationReady) {
      return nodeEditAgentLabels.preparingPlaceholder;
    }
    if (showcaseAttachmentsLoading) {
      return translate("home.scene.loadingAssets", "Loading reference assets...");
    }
    if (preparing) {
      return translate("chat.starting.placeholder", "Agent is getting ready...");
    }
    if (providersUnavailable) {
      return translate(
        "chat.providersUnavailable.placeholder",
        "AI service unavailable — chat is paused",
      );
    }
    if (runtimeUnavailable) {
      return translate(
        "chat.runtimeUnavailable.placeholder",
        "Runtime recovering — chat is paused",
      );
    }
    if (isRecovering) {
      return translate("chat.recovering.placeholder", "正在恢复并继续生成…");
    }
    if (reconnecting) {
      return translate("chat.reconnecting.placeholder", "Reconnecting...");
    }
    return translate(
      "chat.queue.placeholder",
      "Type ahead, your message will be queued...",
    );
  }, [
    nodeEditAgentLabels,
    textEditConversationFailed,
    textEditConversationReady,
    showcaseAttachmentsLoading,
    preparing,
    providersUnavailable,
    runtimeUnavailable,
    isRecovering,
    reconnecting,
    translate,
  ]);
  const inputPlaceholder = reactExports.useMemo(() => {
    if (nodeEditMode && textEditConversationFailed) {
      return translate(
        "chat.textEditAgent.failedPlaceholder",
        "Close the editor and try again.",
      );
    }
    if (nodeEditMode && !textEditConversationReady) {
      return nodeEditAgentLabels.preparingPlaceholder;
    }
    if (
      nodeEditSkillMode === "director-stage" ||
      nodeEditSkillMode === "clip-editor"
    ) {
      const placeholder = nodeAgentInputPlaceholder(nodeEditSkillMode);
      return translate(placeholder.key, placeholder.fallback);
    }
    if (textEditMode) {
      const placeholder = textAgentInputPlaceholder(hasTextEditSelection);
      return translate(placeholder.key, placeholder.fallback);
    }
    return waitingStageKey && feedbackSentStageKey !== waitingStageKey
      ? translate(
          "productionPlan.feedbackPlaceholder",
          "输入文字将作为本阶段修改意见；添加附件则作为普通消息发送",
        )
      : void 0;
  }, [
    feedbackSentStageKey,
    hasTextEditSelection,
    nodeEditAgentLabels,
    nodeEditMode,
    nodeEditSkillMode,
    translate,
    textEditConversationFailed,
    textEditConversationReady,
    textEditMode,
    waitingStageKey,
  ]);
  const handleShowcaseSelect = reactExports.useCallback(
    (item) => {
      if (composerSendPreparingRef.current) return;
      if (item.action.kind !== "query" || !inputRef.current) return;
      const showcaseSelectionSequence = ++showcaseSelectionSeqRef.current;
      showcaseAttachmentAbortRef.current?.abort();
      const hasDownloadableAttachments = item.action.query.attachments.some(
        (attachment) => attachment.assetUrl,
      );
      const abortController = hasDownloadableAttachments
        ? new AbortController()
        : null;
      showcaseAttachmentAbortRef.current = abortController;
      setShowcaseAttachmentsLoading(hasDownloadableAttachments);
      void applyChatShowcaseSelection({
        item,
        language: i18n.language,
        input: inputRef.current,
        selectedMediaModels,
        onSelectedMediaModelsChange: handleSelectedMediaModelsChange,
        signal: abortController?.signal,
      })
        .then(({ failed }) => {
          if (showcaseSelectionSequence !== showcaseSelectionSeqRef.current || failed.length === 0)
            return;
          dedupedToast.warning(
            translate("home.scene.assetFetchFailed", {
              defaultValue: i18n.language.startsWith("zh")
                ? "无法加载附件 {{names}}，请手动上传"
                : "Failed to load attachment {{names}}, please upload manually",
              names: failed.map((attachment) => attachment.name).join("、"),
            }),
          );
        })
        .catch((error) => {
          if (
            showcaseSelectionSequence !== showcaseSelectionSeqRef.current ||
            abortController?.signal.aborted
          )
            return;
          inputRef.current?.clearAttachments({
            source: "scene-query",
          });
          workspaceLog.warn("chat: showcase-attachments-fetch-error", {
            error,
          });
          dedupedToast.warning(
            translate("home.scene.assetFetchFailed", {
              defaultValue: i18n.language.startsWith("zh")
                ? "无法加载场景附件，请手动上传"
                : "Failed to load scene attachments, please upload manually",
              names:
                item.action.kind === "query"
                  ? item.action.query.attachments
                      .map((attachment) => attachment.name)
                      .join("、")
                  : "",
            }),
          );
        })
        .finally(() => {
          if (showcaseSelectionSequence !== showcaseSelectionSeqRef.current) return;
          if (showcaseAttachmentAbortRef.current === abortController) {
            showcaseAttachmentAbortRef.current = null;
          }
          setShowcaseAttachmentsLoading(false);
        });
    },
    [handleSelectedMediaModelsChange, i18n.language, selectedMediaModels, translate],
  );
  reactExports.useEffect(
    () => () => {
      showcaseSelectionSeqRef.current += 1;
      showcaseAttachmentAbortRef.current?.abort();
      showcaseAttachmentAbortRef.current = null;
    },
    [],
  );
  const handleFeaturedSkillSelect = reactExports.useCallback(
    (skill, prompt) => {
      if (composerSendPreparingRef.current) return;
      inputRef.current?.selectSkillDirect(
        {
          ...skill,
          enabled: true,
          source: "installed",
        },
        prompt,
      );
    },
    [],
  );
  const handleQuestionSend = reactExports.useCallback(
    (message) => {
      if (message.type === "question_reply" || message.type === "question_reject") {
        const sessionId = focusedSessionId;
        return sendWsMessage(
          sessionId
            ? {
                ...message,
                session_id: sessionId,
              }
            : message,
        );
      }
      return sendWsMessage(message);
    },
    [focusedSessionId, sendWsMessage],
  );
  const handleLoopGuardSend = reactExports.useCallback(
    (message) => {
      if (message.type === "loop_guard_reply") {
        if (!beginLoopGuardSubmission(message.id, message.decision, message.session_id))
          return;
        sendWsMessage(message);
        return;
      }
      sendWsMessage(message);
    },
    [beginLoopGuardSubmission, sendWsMessage],
  );
  const handleToolConfirmSend = reactExports.useCallback(
    (message) => {
      if (message.type === "tool_confirm_reply") {
        const sessionId = focusedSessionId;
        const devToolId = message.id.startsWith("dev-confirm-")
          ? message.id.replace("dev-confirm-", "dev-tool-")
          : null;
        if (sessionId && devToolId) {
          sessionStore.updateMessages(
            sessionId,
            (prev) => {
              const updated = applyToolConfirmReplyOptimisticUpdate(prev, message);
              return updated.map((updatedMessage) => {
                if (updatedMessage.type !== "tool" || updatedMessage.id !== devToolId) return updatedMessage;
                return {
                  ...updatedMessage,
                  toolStatus: message.decision === "reject" ? "error" : "running",
                  toolResult:
                    message.decision === "reject"
                      ? JSON.stringify({
                          is_error: true,
                          error: "User rejected this tool call",
                        })
                      : void 0,
                };
              });
            },
            {
              affectsUserAttention: true,
            },
          );
        }
        if (devToolId) return true;
        return submitToolConfirm(message.id, sessionId, () =>
          sendWsMessage({
            ...message,
            session_id: sessionId ?? void 0,
          }),
        );
      }
      return sendWsMessage(message);
    },
    [focusedSessionId, sessionStore, sendWsMessage, submitToolConfirm],
  );
  const handleApproveAllToolConfirms = reactExports.useCallback(() => {
    if (
      !canApproveAllToolConfirms(
        miniBarToolConfirms,
        toolConfirmApprovalState,
        toolConfirmEdits,
      )
    )
      return;
    for (const toolConfirm of miniBarToolConfirms) {
      const requestId = toolConfirm.requestId;
      if (!requestId) continue;
      const edited = toolConfirmEdits[requestId];
      const original = toolConfirm.toolConfirmData?.args ?? {};
      const hasChanges =
        !!edited && JSON.stringify(edited) !== JSON.stringify(original);
      handleToolConfirmSend({
        type: "tool_confirm_reply",
        id: requestId,
        decision: "confirm",
        ...(hasChanges
          ? {
              modified_args: edited,
            }
          : {}),
      });
    }
  }, [
    miniBarToolConfirms,
    toolConfirmApprovalState,
    toolConfirmEdits,
    handleToolConfirmSend,
  ]);
  const handleJumpToFirstPendingToolConfirm = reactExports.useCallback(() => {
    const first = miniBarToolConfirms[0];
    if (!first) return;
    const node = document.querySelector(`[data-message-id="${first.id}"]`);
    if (node && "scrollIntoView" in node) {
      node.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [miniBarToolConfirms]);
  const handleAnyMessageSend = reactExports.useCallback(
    (message) => {
      if (message.type === "tool_confirm_reply") {
        return handleToolConfirmSend(message);
      }
      if (message.type === "question_reply" || message.type === "question_reject") {
        return handleQuestionSend(message);
      }
      if (message.type === "user_reply") {
        const sessionId = focusedSessionId;
        if (sessionId) {
          sessionStore.updateMessages(
            sessionId,
            (messages) => resolveLegacyInteractionReply(messages, message.id),
            {
              affectsUserAttention: true,
            },
          );
        }
        return sendWsMessage(
          sessionId
            ? {
                ...message,
                session_id: sessionId,
              }
            : message,
        );
      }
      return sendWsMessage(message);
    },
    [
      focusedSessionId,
      handleToolConfirmSend,
      handleQuestionSend,
      sendWsMessage,
      sessionStore,
    ],
  );
  const handleProductionPlanMessage = reactExports.useCallback(
    (content) => {
      if (
        productionPlanMessagePendingRef.current ||
        !loginGuard() ||
        inputLocked ||
        agentRunning ||
        !focusedSessionId
      ) {
        return false;
      }
      productionPlanMessagePendingRef.current = true;
      if (sessionMode !== "auto") {
        sendWsMessage({
          type: "set_mode",
          mode: sessionMode,
          session_id: focusedSessionId,
        });
      }
      const sent = sendMessage(content);
      if (sent) {
        collapseProductionPlan();
      } else {
        productionPlanMessagePendingRef.current = false;
      }
      return sent;
    },
    [
      agentRunning,
      collapseProductionPlan,
      focusedSessionId,
      inputLocked,
      loginGuard,
      sendMessage,
      sendWsMessage,
      sessionMode,
    ],
  );
  const handleSend = reactExports.useCallback(
    (
      text,
      filePaths,
      canvasNodeAttachments,
      entityRefs,
      pluginNodeAttachments,
      _allowDataDirectoryFallback,
      languageDetectionText,
    ) => {
      if (!loginGuard() || !guardAccountSubmission("chat").allowed)
        return false;
      const hasAttachments =
        filePaths.length > 0 ||
        Boolean(canvasNodeAttachments?.length) ||
        Boolean(entityRefs?.length) ||
        Boolean(pluginNodeAttachments?.length);
      const shouldSendStageFeedback = shouldRouteMessageToStageRevision({
        hasAttachments,
        waitingStageKey,
        stageStatus: currentProductionStage?.status,
        planId: productionPlan.planId,
        text,
      });
      if (sessionMode !== "auto" || !focusedSessionId) {
        sendWsMessage({
          type: "set_mode",
          mode: sessionMode,
          session_id: focusedSessionId ?? void 0,
        });
      }
      const queueInsertBefore = queuedEditRestoreRef.current ?? void 0;
      queuedEditRestoreRef.current = null;
      const pendingAnnotations = annotations ?? [];
      let documentEditRequest;
      let textEditContext;
      let pluginEditContext;
      let messageText = text;
      if (textEditMode && textEditSession && pendingAnnotations.length > 0) {
        const requestId = crypto.randomUUID();
        documentEditRequest = {
          requestId,
          editSessionId: textEditSession.editSessionId,
          document: {
            nodeId: textEditSession.nodeId,
          },
          annotations: pendingAnnotations,
          ...(text.trim()
            ? {
                instruction: text.trim(),
              }
            : {}),
        };
        messageText =
          text.trim() ||
          translate(
            "chat.pendingAnnotations.submitMessage",
            "Apply {{count}} document annotations",
            {
              count: pendingAnnotations.length,
            },
          );
      } else if (textEditMode && textEditSession) {
        const oversizedLength = textEditSelectionRef?.current?.oversizedLength;
        if (oversizedLength) {
          dedupedToast.warning(
            translate("chat.textEditAgent.selectionTooLong", {
              count: oversizedLength,
              max: TEXT_EDIT_SELECTION_MAX_LENGTH,
            }),
          );
          return false;
        }
        const selectionState = textEditSelectionRef?.current;
        const selectionAnchors = (
          selectionState?.anchors ??
          (selectionState?.anchor ? [selectionState.anchor] : [])
        ).filter((anchor) => anchor.exact.trim());
        if (selectionAnchors.length > 0 && text.trim()) {
          const requestId = crypto.randomUUID();
          const selectionAnnotations = [];
          for (
            let index = 0;
            index < selectionAnchors.length;
            index += DOCUMENT_EDIT_TARGETS_PER_ANNOTATION
          ) {
            const targets = selectionAnchors.slice(
              index,
              index + DOCUMENT_EDIT_TARGETS_PER_ANNOTATION,
            );
            selectionAnnotations.push({
              id: `selection-${requestId}-${selectionAnnotations.length + 1}`,
              seq: selectionAnnotations.length + 1,
              quote: buildSelectionQuote(targets),
              comment: text.trim(),
              targets,
            });
          }
          documentEditRequest = {
            requestId,
            editSessionId: textEditSession.editSessionId,
            document: {
              nodeId: textEditSession.nodeId,
            },
            annotations: selectionAnnotations,
          };
        } else {
          textEditContext = {
            editSessionId: textEditSession.editSessionId,
            document: {
              nodeId: textEditSession.nodeId,
            },
          };
        }
      } else if (pluginEditMode && pluginEditSession) {
        const editorState = getPluginAgentEditorState(pluginEditSession.nodeId);
        pluginEditContext = {
          editSessionId: pluginEditSession.editSessionId,
          node: {
            nodeId: pluginEditSession.nodeId,
          },
          ...(editorState
            ? {
                editorState,
              }
            : {}),
        };
      }
      const sent = sendMessage(
        messageText,
        filePaths.length > 0 ? filePaths : void 0,
        canvasNodeAttachments && canvasNodeAttachments.length > 0
          ? canvasNodeAttachments
          : void 0,
        entityRefs && entityRefs.length > 0 ? entityRefs : void 0,
        pluginNodeAttachments && pluginNodeAttachments.length > 0
          ? pluginNodeAttachments
          : void 0,
        void 0,
        documentEditRequest,
        textEditContext,
        pluginEditContext,
        queueInsertBefore,
        languageDetectionText,
      );
      if (sent) {
        workspaceEvents.clearQueuedReferences(workspaceId);
        if (
          textEditMode &&
          textEditSession &&
          textEditSelectionRef?.current?.anchor
        ) {
          workspaceEvents.fireAnnotationCommand(workspaceId, textEditSession, {
            type: "clearSelection",
          });
        }
        collapseProductionPlan();
        if (documentEditRequest) {
          submittedAnnotationIdsRef.current =
            documentEditRequest.annotations.map((annotation) => annotation.id);
          setActiveDocumentEditRequestId(documentEditRequest.requestId);
        }
        setFeedbackSentStageKey((currentKey) =>
          nextFeedbackSentStageKey({
            currentKey,
            waitingStageKey,
            sent,
            sentAsStageFeedback: shouldSendStageFeedback,
          }),
        );
        if (focusedSessionId) {
          inputRef.current?.reset();
          requestAnimationFrame(() => inputRef.current?.focus());
        }
      }
      return sent;
    },
    [
      annotations,
      currentProductionStage,
      collapseProductionPlan,
      focusedSessionId,
      loginGuard,
      productionPlan.planId,
      sendMessage,
      sendWsMessage,
      sessionMode,
      translate,
      textEditMode,
      textEditSession,
      textEditSelectionRef,
      pluginEditMode,
      pluginEditSession,
      waitingStageKey,
      workspaceId,
    ],
  );
  const handleAnnotationSend = reactExports.useCallback(() => {
    if (inputLocked || documentEditInFlight) return;
    handleSend("", []);
  }, [documentEditInFlight, handleSend, inputLocked]);
  const pluginDispatchInFlightRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (
      !pluginEditMode ||
      !pluginEditSession ||
      nodeEditChatStatus !== "ready" ||
      pluginDispatchInFlightRef.current
    ) {
      return;
    }
    const message = workspaceEvents.takePluginDispatchMessage(
      pluginEditSession.nodeId,
    );
    if (!message) return;
    pluginDispatchInFlightRef.current = true;
    handleSend(message, []);
    pluginDispatchInFlightRef.current = false;
  }, [pluginEditMode, pluginEditSession, nodeEditChatStatus, handleSend]);
  reactExports.useEffect(() => {
    if (
      !activeDocumentEditRequestId ||
      documentEditInFlight ||
      activeSubmissionMatchesAnnotations
    ) {
      return;
    }
    submittedAnnotationIdsRef.current = [];
    setActiveDocumentEditRequestId(null);
  }, [
    activeDocumentEditRequestId,
    activeSubmissionMatchesAnnotations,
    documentEditInFlight,
  ]);
  reactExports.useEffect(() => {
    if (
      activeDocumentEditSubmission?.status === "applied" &&
      activeDocumentEditSubmission.editSessionId ===
        textEditSession?.editSessionId &&
      activeDocumentEditSubmission.nodeId === textEditSession.nodeId
    ) {
      for (const annotationId of submittedAnnotationIdsRef.current) {
        onAnnotationDelete?.(annotationId);
      }
      submittedAnnotationIdsRef.current = [];
      setActiveDocumentEditRequestId(null);
    }
  }, [activeDocumentEditSubmission, onAnnotationDelete, textEditSession]);
  reactExports.useEffect(() => {
    submittedAnnotationIdsRef.current = [];
    setActiveDocumentEditRequestId(null);
  }, [textEditSession?.editSessionId]);
  reactExports.useEffect(() => {
    if (!agentRunning) productionPlanMessagePendingRef.current = false;
  }, [agentRunning]);
  reactExports.useEffect(() => {
    const transition = productionPlanConfirmTransitionRef.current;
    if (
      !transition ||
      (!agentRunning &&
        userMessageHistory.length <= transition.userMessageCount)
    ) {
      return;
    }
    productionPlanConfirmTransitionRef.current = void 0;
    setFeedbackSentStageKey(transition.stageKey);
  }, [agentRunning, userMessageHistory.length]);
  const isFinalProductionStage = Boolean(
    currentProductionStage &&
    productionPlan.model?.pending_stages.length === 0 &&
    productionPlan.model.stages.at(-1)?.id === currentProductionStage.id,
  );
  const handleConfirmProductionStage = reactExports.useCallback(async () => {
    if (
      !currentProductionStage ||
      currentProductionStage.status !== "waiting_user" ||
      !productionPlan.planId ||
      productionPlan.revision === void 0 ||
      !productionPlan.editable
    ) {
      return;
    }
    const capturedIdentity = productionPlanConfirmationIdentityRef.current;
    const savedRevision = await stagePromptEditorRef.current?.flush();
    if (savedRevision === false) return;
    const confirmedIdentity = productionPlanConfirmationIdentityRef.current;
    if (
      !canCompleteProductionPlanConfirmation({
        captured: capturedIdentity,
        current: confirmedIdentity,
        savedRevision,
      }) ||
      !confirmedIdentity.planId ||
      confirmedIdentity.revision === void 0 ||
      !productionPlan.isRevisionCurrent(
        confirmedIdentity.planId,
        confirmedIdentity.revision,
      )
    ) {
      return;
    }
    const confirmedStageKey =
      confirmedIdentity.planId &&
      confirmedIdentity.stageId &&
      confirmedIdentity.revision !== void 0
        ? `${confirmedIdentity.planId}:${confirmedIdentity.stageId}:${confirmedIdentity.revision}`
        : void 0;
    if (confirmedStageKey) {
      productionPlanConfirmTransitionRef.current = {
        stageKey: confirmedStageKey,
        userMessageCount: userMessageHistory.length,
      };
    }
    const stageName = getStageDisplayName(currentProductionStage);
    const confirmationCopy = getStageConfirmationCopy(
      currentProductionStage,
      isFinalProductionStage,
    );
    const content = translate(
      confirmationCopy.messageKey,
      confirmationCopy.messageFallback,
      {
        stage: stageName,
      },
    );
    const sent = handleProductionPlanMessage(content);
    if (!sent && confirmedStageKey) {
      productionPlanConfirmTransitionRef.current = void 0;
    }
  }, [
    currentProductionStage,
    handleProductionPlanMessage,
    isFinalProductionStage,
    productionPlan.editable,
    productionPlan.isRevisionCurrent,
    productionPlan.planId,
    productionPlan.revision,
    translate,
    userMessageHistory.length,
  ]);
  const productionPlanConfirmTransition =
    productionPlanConfirmTransitionRef.current;
  const productionPlanConfirmMessageArrived = Boolean(
    productionPlanConfirmTransition &&
    productionPlanConfirmTransition.stageKey === waitingStageKey &&
    userMessageHistory.length >
      productionPlanConfirmTransition.userMessageCount,
  );
  const showCurrentProductionGate = Boolean(
    !agentRunning &&
    currentProductionStage &&
    waitingStageKey &&
    feedbackSentStageKey !== waitingStageKey &&
    !productionPlanConfirmMessageArrived,
  );
  const latestUserMessageId = userMessageHistory.at(-1)?.id;
  const productionPlanTurnTails = reactExports.useMemo(() => {
    if (!productionPlan.model) return [];
    const promptReviews = productionPlan.model.stages.flatMap((stage) => {
      const hasPromptContent = Boolean(
        stage.work_items.some((item) => Boolean(item.prompt?.trim())) &&
        stage.review?.before_execution?.some(
          (check) => check.trim().length > 0,
        ),
      );
      const isActivePromptReview = Boolean(
        showCurrentProductionGate &&
        stage.id === currentProductionStage?.id &&
        stage.waiting_reason === "plan_review",
      );
      const hasFinishedPromptReview = hasConfirmedPromptReview(stage);
      if (
        !hasPromptContent ||
        (!isActivePromptReview && !hasFinishedPromptReview)
      )
        return [];
      const anchorMessageId =
        findStageReviewAnchorMessageId(
          messages,
          productionPlan.planId ?? "",
          stage.id,
        ) ?? (isActivePromptReview ? latestUserMessageId : void 0);
      if (!anchorMessageId) return [];
      return [
        {
          id: `production-plan-stage-${productionPlan.planId}-${stage.id}`,
          anchorMessageId,
          content: (
            <div
              className="flex flex-col gap-2"
              data-action-ui-id={`production-plan.conversation-card-${stage.id}`}
            >
              <StagePromptEditorCard
                ref={isActivePromptReview ? stagePromptEditorRef : void 0}
                stage={stage}
                readOnly={!isActivePromptReview}
                disabled={
                  inputLocked || agentRunning || !productionPlan.editable
                }
                saveStageWorkItems={productionPlan.saveStageWorkItems}
              />
            </div>
          ),
        },
      ];
    });
    return takeLatestPromptReviews(promptReviews);
  }, [
    agentRunning,
    currentProductionStage,
    inputLocked,
    latestUserMessageId,
    messages,
    productionPlan.model,
    productionPlan.editable,
    productionPlan.saveStageWorkItems,
    productionPlan.planId,
    showCurrentProductionGate,
  ]);
  const productionPlanConversationTail = reactExports.useMemo(() => {
    if (!showCurrentProductionGate || !currentProductionStage) return null;
    return (
      <StageConfirmationBar
        stage={currentProductionStage}
        finalStage={isFinalProductionStage}
        disabled={
          inputLocked ||
          agentRunning ||
          !focusedSessionId ||
          !productionPlan.editable
        }
        onConfirm={handleConfirmProductionStage}
      />
    );
  }, [
    agentRunning,
    currentProductionStage,
    focusedSessionId,
    handleConfirmProductionStage,
    inputLocked,
    isFinalProductionStage,
    productionPlan.editable,
    showCurrentProductionGate,
  ]);
  const handleInputChange = reactExports.useCallback(
    (text, editorDoc) => {
      trackInputChange(text, editorDoc);
      workspaceEvents.syncQueuedReferencesWithInput(workspaceId, text);
    },
    [trackInputChange, workspaceId],
  );
  const handleEditQueuedUserMessage = reactExports.useCallback(
    async (message) => {
      const editSessionId = focusedSessionId;
      if (!editSessionId || pendingQueuedEditClientMessageIdRef.current) return;
      pendingQueuedEditClientMessageIdRef.current = message.clientMessageId;
      const successors = queuedMessageSuccessorIds(
        queuedUserMessages,
        message.clientMessageId,
      );
      try {
        const cancelled = await cancelQueuedUserMessage(message);
        if (
          !cancelled ||
          sessionStore.getState().focusedSessionId !== editSessionId
        )
          return;
        queuedEditRestoreRef.current = successors;
        restoreQueuedMessageToComposer(
          inputRef.current,
          message,
          setPendingInput,
          trackInputChange,
        );
      } finally {
        if (
          pendingQueuedEditClientMessageIdRef.current ===
          message.clientMessageId
        ) {
          pendingQueuedEditClientMessageIdRef.current = null;
        }
      }
    },
    [
      cancelQueuedUserMessage,
      focusedSessionId,
      queuedUserMessages,
      sessionStore,
      setPendingInput,
      trackInputChange,
    ],
  );
  const handleExploreSkills = reactExports.useCallback(() => {
    navigate({
      to: "/skills",
    });
  }, [navigate]);
  const handleCreateSkill = reactExports.useCallback(() => {
    inputRef.current?.selectSkillByName("skill-creator");
  }, []);
  reactExports.useEffect(() => {
    const subscription = workspaceEvents.onAddToChat(
      ({ relativePath, filename, nodeId }) => {
        if (!isActiveRef.current) return;
        inputRef.current?.addFromAssetPath(relativePath, filename, nodeId);
      },
    );
    return () => subscription.dispose();
  }, []);
  useBrowserChatMedia(inputRef, isActiveRef, workspaceId, focusedSessionId);
  useBrowserImageEdit({
    isActiveRef,
    sessionId: focusedSessionId,
    locked: Boolean(
      inputLocked || composerSendPreparing || textEditMode || pluginEditMode,
    ),
    canSend: () =>
      loginGuard() &&
      guardAccountSubmission("chat").allowed &&
      astraSendGate.sendGuard(),
    send: (text, attachments) =>
      sendMessage(
        text,
        attachments,
        void 0,
        void 0,
        void 0,
        void 0,
        void 0,
        void 0,
        void 0,
        void 0,
        text,
        {
          preserveComposer: true,
        },
      ),
  });
  reactExports.useEffect(() => {
    const subscription = workspaceEvents.onAddPluginNodeToChat(
      ({ nodeId, pluginId, name: pluginName }) => {
        if (!isActiveRef.current) return;
        inputRef.current?.addFromPluginNode(nodeId, pluginId, pluginName);
      },
    );
    return () => subscription.dispose();
  }, []);
  reactExports.useEffect(() => {
    const subscription = workspaceEvents.onAssetRenamed(
      ({ oldPath, newPath, newFilename }) => {
        inputRef.current?.renameAttachment(oldPath, newPath, newFilename);
      },
    );
    return () => subscription.dispose();
  }, []);
  reactExports.useEffect(
    () =>
      workspaceEvents.subscribeChatReferences({
        workspaceId,
        isActive: () => isActiveRef.current,
        selectSkill: (skill) => inputRef.current?.selectSkillDirect(skill),
        selectConnector: (connector, prompt) =>
          inputRef.current?.selectConnectorDirect(connector, prompt),
        persistDraft: (input) => {
          trackInputChange(input);
          setPendingInput(input);
        },
      }),
    [setPendingInput, trackInputChange, workspaceId],
  );
  reactExports.useEffect(() => {
    if (!connected || sessionsLoading || switching) return;
    workspaceEvents.fireChatInputReady(workspaceId);
  }, [connected, sessionsLoading, switching, workspaceId]);
  reactExports.useEffect(() => {
    const subscription = workspaceEvents.onAddEntityToChat(
      ({ entityId, name: entityName, type }) => {
        if (!isActiveRef.current) return;
        inputRef.current?.addFromEntity(entityId, entityName, type);
      },
    );
    return () => subscription.dispose();
  }, []);
  const [dragOver, setDragOver] = reactExports.useState(false);
  const [fileDragOver, setFileDragOver] = reactExports.useState(false);
  const fileDragDepthRef = reactExports.useRef(0);
  const clearFileDragState = reactExports.useCallback(() => {
    fileDragDepthRef.current = 0;
    setFileDragOver(false);
  }, []);
  const handleChatPanelDragEnter = reactExports.useCallback((dragEvent) => {
    if (!hasFileDropPayload(dragEvent.dataTransfer)) return;
    dragEvent.preventDefault();
    dragEvent.dataTransfer.dropEffect = "copy";
    fileDragDepthRef.current += 1;
    setFileDragOver(true);
  }, []);
  const handleChatPanelDragOver = reactExports.useCallback((dragEvent) => {
    if (hasFileDropPayload(dragEvent.dataTransfer)) {
      dragEvent.preventDefault();
      dragEvent.dataTransfer.dropEffect = "copy";
      if (fileDragDepthRef.current === 0) fileDragDepthRef.current = 1;
      setFileDragOver(true);
      return;
    }
    const types = dragEvent.dataTransfer.types;
    if (!types.includes(SKILL_DRAG_MIME) && !types.includes(ENTITY_DRAG_MIME))
      return;
    dragEvent.preventDefault();
    dragEvent.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  }, []);
  const handleChatPanelDragLeave = reactExports.useCallback((dragEvent) => {
    if (fileDragDepthRef.current > 0) {
      dragEvent.preventDefault();
      fileDragDepthRef.current = Math.max(0, fileDragDepthRef.current - 1);
      if (fileDragDepthRef.current === 0) setFileDragOver(false);
      return;
    }
    if (dragEvent.currentTarget.contains(dragEvent.relatedTarget)) return;
    setDragOver(false);
  }, []);
  const handleChatPanelDrop = reactExports.useCallback(
    (dragEvent) => {
      setDragOver(false);
      if (hasFileDropPayload(dragEvent.dataTransfer)) {
        dragEvent.preventDefault();
        dragEvent.stopPropagation();
        clearFileDragState();
        const handleFileDrop =
          questionFileDropHandlerRef.current ??
          inputRef.current?.handleFileDrop;
        handleFileDrop?.(dragEvent);
        return;
      }
      clearFileDragState();
      const entity = readEntityDragData(dragEvent);
      if (entity) {
        dragEvent.preventDefault();
        if (!isActiveRef.current) return;
        inputRef.current?.addFromEntity(
          entity.entityId,
          entity.name,
          entity.type,
        );
        if (currentWorkspacePath) {
          void materializeEntityMutation
            .mutateAsync({
              entityId: entity.entityId,
              input: {
                workspacePath: currentWorkspacePath,
              },
            })
            .catch((error) => {
              console.error("[chat] Materialize on entity drop failed:", error);
            });
        }
        return;
      }
      const serializedSkillDragData = dragEvent.dataTransfer.getData(SKILL_DRAG_MIME);
      if (!serializedSkillDragData) return;
      dragEvent.preventDefault();
      try {
        const data = JSON.parse(serializedSkillDragData);
        inputRef.current?.selectSkillDirect(data.skill);
      } catch {}
    },
    [clearFileDragState, currentWorkspacePath, materializeEntityMutation],
  );
  const showPromoBanner =
    textEditConversationReady && queuedUserMessages.length === 0;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: skill / entity drag-and-drop target
    <div
      className={`relative z-2 flex flex-col h-full transition-colors ${dragOver ? "ring-2 ring-inset ring-primary/40 bg-primary/5" : ""} ${fileDragOver ? "file-drop-active" : ""}`}
      data-file-drop-scope="chat-panel"
      data-chat-loading-motion={nodeEditMode ? "sweep" : "breathe"}
      onDragEnter={handleChatPanelDragEnter}
      onDragOver={handleChatPanelDragOver}
      onDragLeave={handleChatPanelDragLeave}
      onDragEnd={clearFileDragState}
      onDrop={handleChatPanelDrop}
    >
      {fileDragOver && <FileDropFeedback label={translate("chat.dropFilesHere")} />}
      {LoginDialog}
      <ChatHeaderContainer
        rightActions={headerActions}
        isPresented={isPresented}
        variant={
          pluginEditMode
            ? "plugin-edit"
            : textEditMode
              ? "text-edit"
              : "default"
        }
        nodeEditAgentName={pluginEditAgentName}
      />
      {textEditConversationReady && (
        <ProductionPlanTimeline
          key={productionPlan.planId ?? "production-plan"}
          model={productionPlan.model}
          loading={productionPlan.loading}
          error={productionPlan.error}
          onRetry={productionPlan.retry}
          expanded={
            Boolean(productionPlan.planId && productionPlanKey) &&
            (productionPlanExpanded ?? true)
          }
          onExpandedChange={handleProductionPlanExpandedChange}
        />
      )}
      <ToolConfirmEditsContext.Provider value={toolConfirmEditsContextValue}>
        <RecoveringChildrenProvider value={recoveringChildSessionIds}>
          <ProductionPlanDisclosureContext.Provider
            value={productionPlanDisclosureValue}
          >
            {textEditConversationReady ? (
              showConversationLoading ? (
                <ChatHistoryLoadingState
                  label={translate(
                    "chat.starting.placeholder",
                    "Agent is getting ready...",
                  )}
                />
              ) : (
                hasActiveSession && (
                  <MessageListContainer
                    messages={visibleMessages}
                    busy={busy}
                    busyLabel={
                      mediaReviewing ? translate("chat.mediaReviewing") : void 0
                    }
                    focusMessageId={inlineEditorFocusMessageId}
                    isPresented={isPresented}
                    recovering={isRecovering}
                    focusedSessionId={focusedSessionId}
                    onSend={handleAnyMessageSend}
                    onRetry={handleRetry}
                    onFork={forkSession}
                    conversationTail={productionPlanConversationTail}
                    turnTails={productionPlanTurnTails}
                    showTurnArtifacts={false}
                  />
                )
              )
            ) : (
              <div
                className="flex min-h-0 flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
                data-action-ui-id="chat.text-edit-agent-resolving"
              >
                {!textEditConversationFailed && (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                )}
                <span>
                  {textEditConversationFailed
                    ? nodeEditAgentLabels.prepareFailed
                    : nodeEditAgentLabels.preparing}
                </span>
              </div>
            )}
          </ProductionPlanDisclosureContext.Provider>
        </RecoveringChildrenProvider>
      </ToolConfirmEditsContext.Provider>
      {textEditConversationReady &&
        !showConversationLoading &&
        !hasActiveSession && (
          <div className="flex min-h-0 flex-1 items-start overflow-y-auto">
            <ChatEmptyState
              onSelectShowcase={handleShowcaseSelect}
              onSelectSkill={handleFeaturedSkillSelect}
              skillMode={nodeEditSkillMode}
            />
          </div>
        )}
      {textEditConversationReady && pendingSkills && (
        <SkillReloadDock
          skillNames={pendingSkills}
          onReload={reloadSkills}
          onDismiss={dismissSkillReload}
        />
      )}
      {textEditConversationReady && pendingLoopGuard && (
        <LoopGuardAskDock
          message={pendingLoopGuard}
          onSend={handleLoopGuardSend}
          isPresented={isPresented}
          shortcutsEnabled={!pendingQuestion}
          submitting={isLoopGuardSubmitting(pendingLoopGuard.requestId)}
        />
      )}
      {textEditConversationReady && mockToolConfirm && (
        <DevToolConfirmTrigger
          sessionStore={sessionStore}
          focusedSessionId={focusedSessionId}
        />
      )}
      <ToolConfirmMiniBar
        pendingCount={
          textEditConversationReady ? miniBarToolConfirms.length : 0
        }
        approvalState={aggregateApprovalState}
        submitting={miniBarToolConfirms.some(
          (message) =>
            message.requestId !== void 0 &&
            submittingToolConfirmIds.has(message.requestId),
        )}
        onJump={handleJumpToFirstPendingToolConfirm}
        onApproveAll={handleApproveAllToolConfirms}
      />
      <footer
        className={`relative z-10 px-4 pb-2 pt-0 bg-transparent ${textEditConversationReady && pendingQuestion ? "min-h-0 overflow-hidden" : ""}`}
      >
        <div
          className={`mx-auto w-full ${textEditConversationReady && pendingQuestion ? "flex h-full min-h-0 flex-col" : ""}`}
          style={{
            maxWidth: `${CHAT_CONTENT_MAX_WIDTH_PX}px`,
          }}
        >
          <ChatStartupNotice
            starting={starting}
            connecting={connecting}
            reconnecting={reconnecting}
            showPreparing={!showConversationLoading}
          />
          {textEditConversationReady && historyLoadFailed && !switching && (
            <div
              className="mb-2 border border-border [border-width:var(--divider-width)] rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
              data-action-ui-id="chat.history-load-failed-notice"
            >
              <div className="font-medium text-foreground">
                {translate(
                  "chat.historyLoadFailed.title",
                  "Chat history is temporarily unavailable",
                )}
              </div>
              <div>
                {translate(
                  "chat.historyLoadFailed.description",
                  "The current view was preserved, but the complete history could not be verified. Retry to reload it.",
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-1.5 h-6 px-2 text-xs"
                disabled={historyReloading}
                aria-busy={historyReloading}
                onClick={reloadSessionHistory}
              >
                {historyReloading
                  ? translate("common.loading", "Loading...")
                  : translate("chat.retry", "Retry")}
              </Button>
            </div>
          )}
          {providersUnavailable && (
            <div className="mb-2 border border-border [border-width:var(--divider-width)] rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">
                {translate(
                  "chat.providersUnavailable.title",
                  "AI service temporarily unavailable",
                )}
              </div>
              <div>
                {translate(
                  "chat.providersUnavailable.description",
                  "Model providers could not be loaded. Canvas and assets still work; chat resumes automatically once the connection recovers.",
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-1.5 h-6 px-2 text-xs"
                disabled={retryingProviders}
                onClick={handleRetryProviders}
              >
                {retryingProviders
                  ? translate("chat.providersUnavailable.retrying", "Retrying...")
                  : translate("chat.retry", "Retry")}
              </Button>
            </div>
          )}
          {sessionListStalled &&
            !runtimeUnavailable &&
            !connectionUnavailable && (
              <SessionListUnavailableNotice onRetry={retrySessionList} />
            )}
          {textEditConversationReady && showStalledBanner && (
            <StalledTurnBanner
              minutes={stalledMinutes}
              watchdog={stalledInfo?.watchdog}
              onKeepWaiting={dismissStalledNotice}
              onStop={stopStalledSession}
            />
          )}
          {reconnecting && !preparing && (
            <ChatReconnectNotice
              title={reconnectBanner.title}
              description={reconnectBanner.description}
              animated={
                !nodeEditMode && !reconnectingStuck && !reclaimedByMemory
              }
              stuck={reconnectingStuck}
            />
          )}
          {runtimeUnavailable && !connectionUnavailable && (
            <div className="mb-2 border border-border [border-width:var(--divider-width)] rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">
                {translate(
                  "chat.runtimeUnavailable.title",
                  "Local runtime is recovering",
                )}
              </div>
              <div>
                {translate(
                  "chat.runtimeUnavailable.description",
                  "Workspace, canvas, and assets stay visible. Chat resumes after the local runtime reconnects.",
                )}
              </div>
            </div>
          )}
          {textEditMode && annotations && annotations.length > 0 && (
            <PendingAnnotationList
              annotations={annotations}
              activeId={activeAnnotationId ?? null}
              onLocate={onAnnotationLocate ?? (() => {})}
              onDelete={onAnnotationDelete ?? (() => {})}
              onClear={onAnnotationClear ?? (() => {})}
              onSend={handleAnnotationSend}
              submission={activeDocumentEditSubmission}
              sendDisabled={inputLocked || documentEditInFlight}
            />
          )}
          {textEditConversationReady && <DocumentEditReviewBar />}
          <QuestionComposerGate
            blocked={textEditConversationReady && Boolean(pendingQuestion)}
            dock={
              textEditConversationReady && pendingQuestion ? (
                <QuestionDock
                  key={`${focusedSessionId ?? "unbound"}:${pendingQuestion.requestId ?? pendingQuestion.id}`}
                  question={pendingQuestion}
                  submissionFailureId={pendingQuestionFailureId}
                  onSend={handleQuestionSend}
                  isPresented={isPresented}
                  onFileDropHandlerChange={handleQuestionFileDropHandlerChange}
                />
              ) : null
            }
          >
            <QueuedUserMessageList
              messages={textEditConversationReady ? queuedUserMessages : []}
              scrollRequest={queuedUserMessageScrollRequest}
              onEdit={handleEditQueuedUserMessage}
              onDelete={cancelQueuedUserMessage}
              onSendNow={sendQueuedUserMessageNow}
              onReorder={reorderQueuedUserMessage}
            />
            {showPromoBanner && <PromoBanner key={focusedSessionId ?? "new"} />}
            <MessageInput
              ref={inputRef}
              fileDropScope="parent"
              onSend={handleSend}
              onSendPreparingChange={handleComposerSendPreparingChange}
              clearOnSend={false}
              onCancel={handleCancel}
              busy={inputLocked}
              allowEmptySend={Boolean(
                textEditMode &&
                annotations &&
                annotations.length > 0 &&
                !documentEditInFlight,
              )}
              running={textEditConversationReady && agentRunning}
              placeholderBusy={inputPlaceholderBusy}
              placeholder={inputPlaceholder}
              placeholderNode={
                textEditMode || isSpecialNodeSession
                  ? void 0
                  : WorkspaceCreationGuidePlaceholder
              }
              showBusyPlaceholder={
                (textEditConversationReady && agentRunning) ||
                showcaseAttachmentsLoading ||
                connectionUnavailable ||
                preparing ||
                providersUnavailable ||
                runtimeUnavailable
              }
              guard={loginGuard}
              sendGuard={astraSendGate.sendGuard}
              sendLabel={astraSendGate.sendLabel}
              sendTooltip={astraSendGate.sendTooltip}
              messageHistory={userMessageHistory}
              messageHistoryResetKey={focusedSessionId ?? "new"}
              toolbar={renderToolbar}
              pendingInput={pendingInput}
              pendingEditorDoc={pendingEditorDoc}
              onPendingInputConsumed={handlePendingInputConsumed}
              rightSlot={modeSelectorSlot}
              onExploreSkills={handleExploreSkills}
              onCreateSkill={handleCreateSkill}
              skillPopoverMode={nodeEditSkillMode ?? "default"}
              selectedMediaModels={selectedMediaModels}
              onSelectedMediaModelsChange={handleSelectedMediaModelsChange}
              onInputChange={handleInputChange}
              pendingAttachments={pendingAttachments}
              onPendingAttachmentsConsumed={handlePendingAttachmentsConsumed}
              onAttachmentsChange={trackAttachmentsChange}
              className="message-input-surface @container/composer min-h-[var(--workspace-chat-composer-default-height)] p-[var(--message-input-card-padding)] border border-border-solid rounded-[var(--message-input-surface-radius)] bg-[var(--elevated-surface)] relative z-10"
            />
          </QuestionComposerGate>
          <ChatComplianceNotice />
        </div>
      </footer>
    </div>
  );
}
