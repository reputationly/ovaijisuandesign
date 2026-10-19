// chat-controller.js
import { measurePerf } from "../infra/perf-log.js";
import { DEFAULT_SESSION_NAME } from "../canvas/fullscreen-icon.jsx";
import {
  clearRunningCompactionStatus,
  completeLatestCompactionStatus,
  DEFAULT_WARM_KEEP_COUNT,
  dropSupersededHistorySubAgents,
  extractTaskChildSessionId,
  formatQuestionToolResult,
  INTERACTION_MESSAGE_TYPES,
  isChatIncrementalDeriveEnabled,
  isChatRederiveCoalescingEnabled,
  MEMORY_PRESSURE_COLD_MIN_PART_COUNT,
  MEMORY_PRESSURE_WARM_KEEP_COUNT,
  MEMORY_PRESSURE_WARM_MIN_PART_COUNT,
  PART_SUPERSEDED_TYPES,
  questionAttachmentCount,
  restoreHistorySubAgents,
  restoreRootToolMessages,
  restoreRootToolParts,
  retainCompletedCompactionStatuses,
  SessionReducer,
} from "./restore-root-tool-messages.js";
import { authExpiredBus } from "../infra/gateway-http-error.jsx";
import { ErrorCodes } from "../generation/normalize-skill-detail-metadata.js";
import {
  isCancelMarkerText,
  stripContextPrefix,
} from "../text-editor/build-asr-gateway-request.js";
import {
  extractChildSessionId,
  logChat,
  logPartUpdated,
  logPartUpdatedReceived,
  logRuntimeBinding,
} from "./attach-handoff-targets-to-sub-messages.js";
import { ChatStateDiagnostics } from "./chat-state-diagnostics.js";
import { PartStore } from "./part-store.js";
import {
  createStreamingBuffers,
  nextMessageId,
} from "./create-history-sub-agent-message.js";
import { reduceServerMessage } from "./reduce-server-message.js";
import { deriveBusy } from "../canvas/fullscreen-icon.jsx";
import {
  PERF_PATCH_DELTA,
  PERF_PATCH_DELTA_SAMPLE_RATE,
  PERF_REDERIVE,
} from "../generation/to-workspace-browser-url.js";
import { backendMessagesToChat } from "./backend-messages-to-chat.js";
import { upsertRunningCompactionStatus } from "./upsert-running-compaction-status.js";
import {
  applyComfyUiProgress,
  applyLoopGuardSettlements,
  applyToolConfirmSettlements,
  extractSessionId,
  insertToolConfirmAsk,
  messagesShallowEqual,
  normalizeKeepCount,
  protectedFocusedSessionIds,
  reconcilePendingInteractionSnapshot,
  resplicePendingToolConfirms,
  subAgentPartId,
  upsertPendingInteraction,
} from "./reconcile-pending-interaction-snapshot.js";

export class ChatController {
  constructor(store) {
    this.store = store;
  }
  diagnostics = new ChatStateDiagnostics(logChat);
  handleServerMessage(serverMessage, options) {
    if (this.shouldIgnoreServerMessage(serverMessage)) return;
    const previous =
      serverMessage.type === "session_switched"
        ? this.resolveMessages(serverMessage.session_id)
        : void 0;
    const relationshipsBefore =
      serverMessage.type === "session_switched"
        ? this.partStores
            .get(serverMessage.session_id)
            ?.getRecoveryDiagnostics(
              serverMessage.runtime_session_id ??
                this.runtimeSessionIds.get(serverMessage.session_id) ??
                serverMessage.session_id,
            )
        : void 0;
    this.applyServerMessage(serverMessage, options);
    if (serverMessage.type === "session_switched") {
      this.diagnostics.restored(
        serverMessage,
        options?.replaceSessionSnapshot === true,
        previous ?? [],
        this.resolveMessages(serverMessage.session_id),
        this.partStores.get(serverMessage.session_id),
        this.runtimeSessionIds.get(serverMessage.session_id),
        relationshipsBefore,
      );
    }
  }
  reducers = new Map();
  partStores = new Map();
  /** UI session ID → OpenCode runtime session ID */
  runtimeSessionIds = new Map();
  /** OpenCode child runtime session ID → agent name */
  childSessionMap = new Map();
  /** UI session ID → child runtime session IDs awaiting a parent task link. */
  pendingChildReconciliations = new Map();
  sessionTemperatures = new Map();
  /** UI session ID → partId → current ChatMessage index */
  messageIndexByPartId = new Map();
  /** UI session IDs with a queued microtask rederive */
  queuedRederiveSessionIds = new Set();
  /** Latest PartStore to rederive for each queued UI session */
  queuedRederivePartStores = new Map();
  /** UI session ID → root part IDs awaiting same-tick incremental patch. */
  queuedPartPatchIds = new Map();
  /** Latest PartStore to patch for each queued UI session. */
  queuedPartPatchStores = new Map();
  queuedPartPatchSessionIds = new Set();
  /** Renderer-only ComfyUI progress overlays keyed by UI session then tool call id. */
  comfyUiProgressBySession = new Map();
  effectOnlyBuffers = createStreamingBuffers();
  // --------------------------------------------------------
  // Public API
  // --------------------------------------------------------
  applyServerMessage(serverMessage, options) {
    const sessionId = extractSessionId(serverMessage);
    if (sessionId && serverMessage.type === "error") {
      if (this.handleQuestionInteractionError(sessionId, serverMessage)) return;
      this.handleRootErrorMessage(sessionId, serverMessage);
      return;
    }
    if (sessionId && serverMessage.type === "credit_threshold_settled") {
      this.store.updateMessages(
        sessionId,
        (prev) =>
          prev.map((message) =>
            // first-settlement-wins：终态只收敛一次。gateway 对未知 id 的 reply
            // 会广播 expired，若它迟到于真正的 continued，无条件覆盖会把「已继续」
            // 翻成「已过期」且不会自愈。终态是权威结论，不接受二次改写。
            message.type === "credit_threshold" &&
            message.requestId === serverMessage.id &&
            !message.resolved
              ? {
                  ...message,
                  resolved: true,
                  decision: serverMessage.decision,
                  settlementStatus: serverMessage.status,
                  selectedItemIds: serverMessage.selected_item_ids,
                }
              : message,
          ),
        {
          affectsUserAttention: true,
        },
      );
      return;
    }
    if (sessionId && serverMessage.type === "comfyui_run_progress") {
      let progressByCall = this.comfyUiProgressBySession.get(sessionId);
      if (!progressByCall) {
        progressByCall = new Map();
        this.comfyUiProgressBySession.set(sessionId, progressByCall);
      }
      progressByCall.set(serverMessage.progress.tool_use_id, serverMessage.progress);
      if (progressByCall.size > 100) {
        const oldestCallID = progressByCall.keys().next().value;
        if (oldestCallID) progressByCall.delete(oldestCallID);
      }
      this.store.updateMessages(sessionId, (prev) =>
        applyComfyUiProgress(prev, serverMessage.progress.tool_use_id, serverMessage.progress),
      );
      return;
    }
    if (
      serverMessage.type === "part_updated" ||
      serverMessage.type === "part_delta" ||
      serverMessage.type === "session_idle" ||
      serverMessage.type === "session_compaction" ||
      serverMessage.type === "session_error"
    ) {
      if (!sessionId) return;
      this.handlePartBasedMessage(sessionId, serverMessage);
      return;
    }
    if (sessionId && PART_SUPERSEDED_TYPES.has(serverMessage.type)) {
      return;
    }
    if (sessionId && INTERACTION_MESSAGE_TYPES.has(serverMessage.type)) {
      this.markSessionActive(sessionId);
      const chatMsg = this.interactionToChatMessage(serverMessage);
      if (chatMsg) {
        this.store.updateMessages(
          sessionId,
          (prev) => upsertPendingInteraction(prev, chatMsg),
          {
            affectsUserAttention: true,
          },
        );
      }
      return;
    }
    if (sessionId && serverMessage.type === "tool_confirm_expired") {
      const expiredId = serverMessage.id;
      this.store.updateMessages(
        sessionId,
        (prev) =>
          prev.map((message) =>
            message.type === "tool_confirm_ask" && message.requestId === expiredId
              ? {
                  ...message,
                  resolved: true,
                  expired: true,
                  toolConfirmDecision: "reject",
                  toolConfirmSettlementCause: "timeout",
                }
              : message,
          ),
        {
          affectsUserAttention: true,
        },
      );
      return;
    }
    if (sessionId && serverMessage.type === "tool_confirm_settled") {
      this.store.updateMessages(
        sessionId,
        (prev) => applyToolConfirmSettlements(prev, [serverMessage]),
        {
          affectsUserAttention: true,
        },
      );
      return;
    }
    if (sessionId && serverMessage.type === "loop_guard_settled") {
      this.store.updateMessages(
        sessionId,
        (prev) => applyLoopGuardSettlements(prev, [serverMessage]),
        {
          affectsUserAttention: true,
        },
      );
      return;
    }
    if (sessionId && serverMessage.type === "question_resolved") {
      const resolved = serverMessage;
      const acknowledgedQuestion = this.resolveMessages(sessionId).find(
        (message) =>
          message.type === "question" &&
          message.requestId === resolved.request_id,
      );
      const shouldApplyAcknowledgement =
        acknowledgedQuestion !== void 0 &&
        (!acknowledgedQuestion.resolved ||
          questionAttachmentCount(resolved.answers) >
            questionAttachmentCount(acknowledgedQuestion.questionAnswers));
      this.store.updateMessages(
        sessionId,
        (prev) =>
          prev.map((message) => {
            if (
              message.type !== "question" ||
              message.requestId !== resolved.request_id ||
              !shouldApplyAcknowledgement
            ) {
              return message;
            }
            return {
              ...message,
              resolved: true,
              questionAnswers: resolved.answers,
            };
          }),
        {
          affectsUserAttention: true,
        },
      );
      const callID = acknowledgedQuestion?.questionData?.tool?.callID;
      if (
        shouldApplyAcknowledgement &&
        callID &&
        (resolved.answers || resolved.rejected)
      ) {
        const partStore = this.getOrCreatePartStore(sessionId);
        const rejected = resolved.rejected === true;
        const result = rejected
          ? "rejected"
          : formatQuestionToolResult(
              acknowledgedQuestion.questionData?.questions ?? [],
              resolved.answers ?? [],
            );
        if (
          partStore.markQuestionResolved(
            callID,
            result,
            rejected ? "Question rejected" : "Question answered",
          )
        ) {
          this.rederiveAndUpdate(sessionId, partStore);
        }
      }
      return;
    }
    const prev = this.resolveMessages(sessionId);
    if (sessionId) {
      const reducer = this.getOrCreateReducer(sessionId);
      const result = reducer.reduce(prev, serverMessage);
      if (result.messages !== prev) {
        this.store.updateMessages(sessionId, () => [...result.messages]);
      }
      for (const effect of result.effects) {
        this.applyEffect(effect, options);
      }
    } else {
      const result = reduceServerMessage(prev, serverMessage, this.effectOnlyBuffers);
      for (const effect of result.effects) {
        this.applyEffect(effect, options);
      }
    }
  }
  /** Shared by renderer delivery tracking and controller ingestion. */
  shouldIgnoreServerMessage(serverMessage) {
    const sessionId = extractSessionId(serverMessage);
    if (!sessionId) return false;
    if (
      serverMessage.type === "session_error" &&
      !serverMessage.childSessionId &&
      serverMessage.error?.error_code === ErrorCodes.CONTENT_POLICY_VIOLATION &&
      serverMessage.runtime_message_id
    ) {
      return this.store.isMessageWithdrawn(sessionId, serverMessage.runtime_message_id);
    }
    if (
      serverMessage.type === "part_delta" &&
      this.store.isPartWithdrawn(sessionId, serverMessage.partId)
    )
      return true;
    if (
      serverMessage.type === "part_updated" &&
      this.store.isMessageWithdrawn(sessionId, serverMessage.part.messageID)
    ) {
      this.store.rememberWithdrawnPart(sessionId, serverMessage.part.id, serverMessage.part.messageID);
      return true;
    }
    const messageId =
      serverMessage.type === "part_updated"
        ? serverMessage.part.messageID
        : serverMessage.type === "part_delta"
          ? this.partStores.get(sessionId)?.getPart(serverMessage.partId)?.messageID
          : serverMessage.type === "question_request" && serverMessage.tool
            ? (this.partStores.get(sessionId)?.getRootMessageId(serverMessage.tool.messageID) ??
              serverMessage.tool.messageID)
            : void 0;
    return Boolean(messageId && this.store.isMessageWithdrawn(sessionId, messageId));
  }
  withdrawMessage(request) {
    if (
      this.store.isMessageWithdrawn(request.sessionId, request.runtimeMessageId)
    )
      return false;
    const partStore = this.partStores.get(request.sessionId);
    this.store.updateMessages(request.sessionId, (messages) =>
      messages.map((message) => {
        if (message.type !== "question" || !message.questionData?.tool)
          return message;
        const messageId = message.questionData.tool.messageID;
        const runtimeMessageId =
          partStore?.getRootMessageId(messageId) ?? messageId;
        return runtimeMessageId === request.runtimeMessageId
          ? {
              ...message,
              runtimeMessageId,
            }
          : message;
      }),
    );
    const previous =
      this.store.getState().sessions.get(request.sessionId)?.messages ?? [];
    if (!this.store.withdrawMessage(request)) return false;
    if (partStore) {
      let removedSeed = false;
      for (const message of previous) {
        if (
          message.runtimeMessageId === request.runtimeMessageId &&
          message.type === "sub_agent" &&
          message.childSessionId &&
          partStore.hasChildSubMessageSeed(
            message.childSessionId,
            message.agent,
          )
        ) {
          removedSeed = true;
          partStore.clearChildSubMessageSeed(
            message.childSessionId,
            message.agent,
          );
        }
      }
      if (removedSeed) {
        this.seedHistorySubAgents(
          request.sessionId,
          this.store.getState().sessions.get(request.sessionId)?.messages ?? [],
        );
      }
      const runtimeId =
        this.runtimeSessionIds.get(request.sessionId) ??
        this.store.getState().sessions.get(request.sessionId)?.runtimeSessionId;
      if (runtimeId) {
        for (const part of partStore.getSessionParts(runtimeId)) {
          this.store.rememberWithdrawnPart(
            request.sessionId,
            part.id,
            part.messageID,
          );
        }
      }
      this.flushRederiveAndUpdate(request.sessionId, partStore);
    }
    this.messageIndexByPartId.delete(request.sessionId);
    this.diagnostics.finish(request.sessionId, "message-withdrawn");
    this.store.notifySessionCompleted(request.sessionId);
    return true;
  }
  resetBuffers() {
    for (const [sessionId, parts] of this.partStores) {
      this.diagnostics.reset(sessionId, this.resolveMessages(sessionId), parts);
    }
    this.diagnostics.clear();
    if (this.runtimeSessionIds.size > 0) {
      logRuntimeBinding(
        `reset cleared ${this.runtimeSessionIds.size} binding(s)`,
        "warn",
      );
    }
    this.reducers.clear();
    this.partStores.clear();
    this.runtimeSessionIds.clear();
    this.childSessionMap.clear();
    this.pendingChildReconciliations.clear();
    this.sessionTemperatures.clear();
    this.messageIndexByPartId.clear();
    this.queuedRederiveSessionIds.clear();
    this.queuedRederivePartStores.clear();
    this.queuedPartPatchIds.clear();
    this.queuedPartPatchStores.clear();
    this.queuedPartPatchSessionIds.clear();
    this.effectOnlyBuffers = createStreamingBuffers();
  }
  /**
   * Reset the streaming reducer + derive bookkeeping for a session, WITHOUT
   * evicting any part-derived content. The cancel path (use-chat) calls this so
   * late in-flight SSE events (sub_agent_text / part.delta arriving between
   * `abortSessionTree` and the final `done`) don't fold into the previous
   * SubAgentGroup — that fold lives entirely in `this.reducers`.
   *
   * It deliberately does NOT call `cleanChildSessions`: a sub-agent that already
   * finished (e.g. produced images) is authoritative part-derived content, and
   * releasing its parts here made the `task` re-derive (status→aborted) render an
   * empty sub_agent block until a workspace reopen re-read OpenCode history.
   * Child parts/maps are reclaimed later by cooling when the session goes idle.
   */
  resetSession(sessionId) {
    this.diagnostics.finish(sessionId, "session-reset");
    this.reducers.delete(sessionId);
    this.sessionTemperatures.delete(sessionId);
    this.messageIndexByPartId.delete(sessionId);
    this.queuedRederiveSessionIds.delete(sessionId);
    this.queuedRederivePartStores.delete(sessionId);
    this.queuedPartPatchIds.delete(sessionId);
    this.queuedPartPatchStores.delete(sessionId);
    this.queuedPartPatchSessionIds.delete(sessionId);
    this.comfyUiProgressBySession.delete(sessionId);
  }
  /**
   * Cool down a session by releasing its parts from memory.
   * - 'warm': trim to the most recent `keepCount` parts (default 50).
   * - 'cold': release all parts and child session references.
   *
   * See Contract 4 in hub-runtime-reliability-contracts.md.
   */
  coolSession(
    sessionId,
    level,
    keepCount = DEFAULT_WARM_KEEP_COUNT,
    options = {},
  ) {
    const runtimeId = this.runtimeSessionIds.get(sessionId);
    const partStore = this.partStores.get(sessionId);
    const knownSession =
      this.store.getState().sessions.has(sessionId) ||
      runtimeId !== void 0 ||
      partStore !== void 0;
    if (!knownSession) return false;
    if (level === "warm") {
      const normalizedKeepCount = normalizeKeepCount(keepCount);
      const trimMessages = options.trimMessages ?? true;
      if (!trimMessages) return false;
      this.sessionTemperatures.set(sessionId, "warm");
      if (runtimeId && partStore) {
        const removed = partStore.trimToRecent(runtimeId, normalizedKeepCount);
        this.cleanRemovedTaskParts(partStore, removed);
        this.rederiveAndUpdate(sessionId, partStore);
      }
      this.trimMessagesToRecent(sessionId, normalizedKeepCount);
    } else {
      const clearMessages = options.clearMessages ?? true;
      if (!clearMessages) return false;
      this.diagnostics.forget(sessionId);
      this.sessionTemperatures.set(sessionId, "cold");
      this.cleanChildSessions(sessionId);
      if (runtimeId && partStore) {
        partStore.releaseSession(runtimeId);
      }
      this.reducers.delete(sessionId);
      this.messageIndexByPartId.delete(sessionId);
      this.queuedRederiveSessionIds.delete(sessionId);
      this.queuedRederivePartStores.delete(sessionId);
      this.queuedPartPatchIds.delete(sessionId);
      this.queuedPartPatchStores.delete(sessionId);
      this.queuedPartPatchSessionIds.delete(sessionId);
      this.pendingChildReconciliations.delete(sessionId);
      this.store.updateMessages(sessionId, () => []);
    }
    return true;
  }
  warmIdleSessions(options = {}) {
    const keepCount = normalizeKeepCount(
      options.keepCount ?? DEFAULT_WARM_KEEP_COUNT,
    );
    const minPartCount = normalizeKeepCount(
      options.minPartCount ?? keepCount + 1,
    );
    const state = this.store.getState();
    const warmed = [];
    for (const [sessionId, session] of state.sessions) {
      if (sessionId === state.focusedSessionId) continue;
      if (options.protectedSessionIds?.has(sessionId)) continue;
      if (deriveBusy(session.busy, session.pendingReasons)) continue;
      if (this.sessionTemperatures.get(sessionId) === "cold") continue;
      const runtimeId = this.runtimeSessionIds.get(sessionId);
      const partStore = this.partStores.get(sessionId);
      if (!runtimeId || !partStore) continue;
      if (partStore.getSessionPartCount(runtimeId) < minPartCount) continue;
      const cooled = this.coolSession(sessionId, "warm", keepCount, {
        trimMessages: options.trimMessages ?? false,
      });
      if (cooled) warmed.push(sessionId);
    }
    return warmed;
  }
  coldIdleSessions(options = {}) {
    const minPartCount = normalizeKeepCount(
      options.minPartCount ?? DEFAULT_WARM_KEEP_COUNT + 1,
    );
    const state = this.store.getState();
    const cooled = [];
    for (const [sessionId, session] of state.sessions) {
      if (!options.includeFocused && sessionId === state.focusedSessionId)
        continue;
      if (options.protectedSessionIds?.has(sessionId)) continue;
      if (deriveBusy(session.busy, session.pendingReasons)) continue;
      if (this.sessionTemperatures.get(sessionId) === "cold") continue;
      const runtimeId = this.runtimeSessionIds.get(sessionId);
      const partStore = this.partStores.get(sessionId);
      if (!runtimeId || !partStore) continue;
      if (partStore.getSessionPartCount(runtimeId) < minPartCount) continue;
      const released = this.coolSession(
        sessionId,
        "cold",
        DEFAULT_WARM_KEEP_COUNT,
        {
          clearMessages: options.clearMessages,
        },
      );
      if (released) cooled.push(sessionId);
    }
    return cooled;
  }
  relieveMemoryPressure(options = {}) {
    const warmed = this.warmIdleSessions({
      keepCount: MEMORY_PRESSURE_WARM_KEEP_COUNT,
      minPartCount: MEMORY_PRESSURE_WARM_MIN_PART_COUNT,
      protectedSessionIds: options.includeFocused
        ? void 0
        : protectedFocusedSessionIds(this.store.getState().focusedSessionId),
      trimMessages: options.trimMessages ?? false,
    });
    const cooled = this.coldIdleSessions({
      includeFocused: options.includeFocused,
      minPartCount: MEMORY_PRESSURE_COLD_MIN_PART_COUNT,
      clearMessages: options.clearMessages ?? false,
    });
    return {
      warmed,
      cooled,
    };
  }
  markSessionCancelled(sessionId) {
    const partStore = this.getOrCreatePartStore(sessionId);
    const runtimeSessionId = this.runtimeSessionIds.get(sessionId) ?? sessionId;
    partStore.markSessionCancelled(runtimeSessionId);
    this.flushRederiveAndUpdate(sessionId, partStore, "session-cancelled");
    this.diagnostics.finish(sessionId, "session-cancelled");
  }
  settleSessionCancellation(sessionId) {
    const partStore = this.getOrCreatePartStore(sessionId);
    const runtimeSessionId = this.runtimeSessionIds.get(sessionId) ?? sessionId;
    partStore.settleSessionCancellation(runtimeSessionId);
  }
  finalizeSessionCancellation(sessionId, generationHandedOff, targets = []) {
    if (!generationHandedOff) {
      this.settleSessionCancellation(sessionId);
      return;
    }
    this.markSessionCancelled(sessionId);
    this.markSessionGenerationHandedOff(sessionId, targets);
  }
  markSessionGenerationHandedOff(sessionId, targets = []) {
    const partStore = this.getOrCreatePartStore(sessionId);
    const runtimeSessionId = this.runtimeSessionIds.get(sessionId) ?? sessionId;
    partStore.markSessionGenerationHandedOff(runtimeSessionId, targets);
    this.flushRederiveAndUpdate(sessionId, partStore);
  }
  /**
   * Return the OpenCode runtime session id for a given UI session, or
   * `undefined` if the controller has not yet observed any part for that
   * session (the mapping is learned from the first incoming `part_updated`
   * message, see `handlePartBasedMessage` below).
   *
   * Consumers (e.g. the feedback dialog asking the gateway to dump just
   * this conversation's OpenCode data) MUST tolerate `undefined` — a brand
   * new session that hasn't received any agent output yet has no runtime
   * id mapped, and asking the gateway to export `sessionId=undefined`
   * would silently fall back to "every session in the workspace", which
   * is exactly the leak we're trying to avoid.
   */
  getRuntimeSessionId(sessionId) {
    return this.runtimeSessionIds.get(sessionId);
  }
  hasPendingChildReconciliation(sessionId) {
    return (this.pendingChildReconciliations.get(sessionId)?.size ?? 0) > 0;
  }
  getDiagnostics() {
    const temperatures = this.countSessionTemperatures();
    let partCount = 0;
    let derivedCacheEntries = 0;
    let subMessageCacheEntries = 0;
    for (const partStore of this.partStores.values()) {
      const diagnostics = partStore.getDiagnostics();
      partCount += diagnostics.partCount;
      derivedCacheEntries += diagnostics.derivedCacheEntries;
      subMessageCacheEntries += diagnostics.subMessageCacheEntries;
    }
    return {
      ...temperatures,
      partCount,
      derivedCacheEntries,
      subMessageCacheEntries,
      childSessionMapSize: this.childSessionMap.size,
    };
  }
  // --------------------------------------------------------
  // Part-based message handling
  // --------------------------------------------------------
  handleQuestionInteractionError(sessionId, message) {
    const requestId = message.request_id;
    if (!requestId) return false;
    const pendingQuestion = this.resolveMessages(sessionId).some(
      (message) =>
        message.type === "question" &&
        message.requestId === requestId &&
        message.resolved !== true,
    );
    if (!pendingQuestion) return false;
    const { content, error } = message;
    logChat(
      `[question-error] session=${sessionId} request=${requestId} code=${error?.error_code ?? "none"} retryable=${error?.retryable ?? "?"} msg=${(content ?? error?.user_message ?? "").slice(0, 200)}`,
      "error",
    );
    this.store.updateMessages(sessionId, (prev) => [
      ...prev,
      {
        id: nextMessageId(),
        role: "agent",
        type: "error",
        requestId,
        content: content ?? error?.user_message ?? "",
        ...(error
          ? {
              error,
            }
          : {}),
      },
    ]);
    if (
      error?.error_code &&
      String(error.error_code) === String(ErrorCodes.AUTH_EXPIRED)
    ) {
      authExpiredBus.emit();
    }
    return true;
  }
  handleRootErrorMessage(sessionId, message) {
    const { content, error } = message;
    logChat(
      `[error] session=${sessionId} code=${error?.error_code ?? "none"} retryable=${error?.retryable ?? "?"} msg=${(content ?? error?.user_message ?? "").slice(0, 200)}`,
      "error",
    );
    const isBusyRejection =
      String(error?.error_code ?? "") ===
        String(ErrorCodes.GATEWAY_BAD_REQUEST) &&
      /busy|pending operations/i.test(error?.user_message ?? content ?? "");
    if (!isBusyRejection) {
      this.store.setBusy(false, sessionId);
    }
    this.store.updateMessages(sessionId, (prev) => [
      ...prev,
      {
        id: nextMessageId(),
        role: "agent",
        type: "error",
        content: content ?? error?.user_message ?? "",
        ...(error
          ? {
              error,
            }
          : {}),
      },
    ]);
    if (!isBusyRejection) {
      this.store.notifySessionCompleted(sessionId);
    }
    if (
      error?.error_code &&
      String(error.error_code) === String(ErrorCodes.AUTH_EXPIRED)
    ) {
      authExpiredBus.emit();
    }
  }
  handlePartBasedMessage(sessionId, message) {
    const partStore = this.getOrCreatePartStore(sessionId);
    this.markSessionActive(sessionId);
    switch (message.type) {
      case "part_updated": {
        const part = message.part;
        const diagnosticRuntimeId =
          this.runtimeSessionIds.get(sessionId) ??
          this.store.getState().sessions.get(sessionId)?.runtimeSessionId;
        const logDiagnostic = this.shouldLogPartUpdatedDiagnostic(
          part,
          diagnosticRuntimeId,
        );
        if (logDiagnostic)
          logPartUpdatedReceived(sessionId, part, diagnosticRuntimeId);
        if (!this.runtimeSessionIds.has(sessionId)) {
          const boundRuntimeId = this.store
            .getState()
            .sessions.get(sessionId)?.runtimeSessionId;
          const chosen = boundRuntimeId ?? part.sessionID;
          this.runtimeSessionIds.set(sessionId, chosen);
          const mislockRisk =
            !boundRuntimeId && this.childSessionMap.has(part.sessionID);
          logRuntimeBinding(
            `seed sid=${sessionId} runtime=${chosen} src=${boundRuntimeId ? "store-bound" : "first-part"}${mislockRisk ? " MISLOCK-RISK(child-part-first)" : ""}`,
            mislockRisk ? "warn" : "info",
          );
        }
        partStore.handlePartUpdated(part);
        if (part.type === "tool" && part.tool === "task") {
          const childId = extractChildSessionId(part);
          if (childId) {
            const agentName = this.extractAgentName(part);
            this.childSessionMap.set(childId, agentName);
            if (this.clearPendingChildReconciliation(sessionId, childId)) {
              this.flushRederiveAndUpdate(sessionId, partStore);
              this.logPartApply(
                sessionId,
                partStore,
                part.id,
                part.id,
                "full-derive",
                "applied",
                childId,
              );
              break;
            }
          }
        }
        this.patchPartUpdateOrFallback(sessionId, partStore, part, logDiagnostic);
        break;
      }
      case "part_delta": {
        const { partId, delta } = message;
        partStore.handlePartDelta(partId, delta);
        this.diagnostics.delta(
          sessionId,
          this.patchDeltaContent(sessionId, partStore, partId),
        );
        break;
      }
      case "session_idle": {
        const childSessionId = message.childSessionId;
        if (childSessionId) {
          this.reconcileTerminalChildSession(sessionId, partStore, childSessionId);
        } else {
          this.flushQueuedRederive(sessionId);
          this.diagnostics.finish(sessionId, "session-idle");
          this.store.updateMessages(sessionId, completeLatestCompactionStatus);
          this.store.setBusy(false, sessionId);
          this.store.notifyFileChanged();
          this.store.notifySessionCompleted(sessionId);
        }
        break;
      }
      case "session_compaction": {
        const status = message.status;
        if (status === "started") {
          this.store.updateMessages(sessionId, upsertRunningCompactionStatus);
        } else {
          this.store.updateMessages(sessionId, completeLatestCompactionStatus);
        }
        break;
      }
      case "session_error": {
        if (
          !message.childSessionId &&
          message.error?.error_code === ErrorCodes.CONTENT_POLICY_VIOLATION
        ) {
          if (message.runtime_message_id) {
            this.withdrawMessage({
              sessionId,
              runtimeMessageId: message.runtime_message_id,
              reason: "content_policy_violation",
            });
            break;
          }
          logChat(
            `[withdrawal] missing runtime_message_id session=${sessionId}`,
            "error",
          );
        }
        const { childSessionId, error, content } = message;
        if (childSessionId) {
          this.reconcileTerminalChildSession(sessionId, partStore, childSessionId);
        } else {
          logChat(
            `[session_error] session=${sessionId} code=${error?.error_code ?? "none"} msg=${(content ?? "").slice(0, 200)}`,
            "error",
          );
          this.flushQueuedRederive(sessionId);
          this.diagnostics.finish(sessionId, "session-error");
          this.store.updateMessages(sessionId, clearRunningCompactionStatus);
          this.store.setBusy(false, sessionId);
          this.store.updateMessages(sessionId, (prev) => [
            ...prev,
            {
              id: nextMessageId(),
              role: "agent",
              type: "error",
              content: content ?? "",
              ...(error
                ? {
                    error,
                  }
                : {}),
            },
          ]);
          this.store.notifySessionCompleted(sessionId);
          if (
            error?.error_code &&
            String(error.error_code) === String(ErrorCodes.AUTH_EXPIRED)
          ) {
            authExpiredBus.emit();
          }
        }
        break;
      }
    }
  }
  rederiveOrScheduleUpdate(sessionId, partStore) {
    if (!isChatRederiveCoalescingEnabled()) {
      this.rederiveAndUpdate(sessionId, partStore);
      return "applied";
    }
    if (
      !this.queuedRederiveSessionIds.has(sessionId) &&
      !this.hasPartMessageIndex(sessionId)
    ) {
      this.rederiveAndUpdate(sessionId, partStore);
      this.scheduleRederiveMicrotask(sessionId);
      return "applied";
    }
    this.queuedRederivePartStores.set(sessionId, partStore);
    this.scheduleRederiveMicrotask(sessionId);
    return "queued";
  }
  shouldLogPartUpdatedDiagnostic(part, runtimeId) {
    if (part.type === "tool" && part.tool === "task") return true;
    if (this.childSessionMap.has(part.sessionID)) return true;
    return !runtimeId || part.sessionID !== runtimeId;
  }
  patchPartUpdateOrFallback(sessionId, partStore, part, logDiagnostic) {
    if (!isChatIncrementalDeriveEnabled()) {
      const result = this.rederiveOrScheduleUpdate(sessionId, partStore);
      if (logDiagnostic) {
        logPartUpdated("route", sessionId, [
          ["part", part.id],
          ["target", part.id],
          [
            "result",
            result === "applied" ? "full-derive" : "queued-full-derive",
          ],
          ["reason", "incremental-disabled"],
        ]);
      }
      return;
    }
    const runtimeId = this.runtimeSessionIds.get(sessionId);
    if (!runtimeId) {
      this.rederiveOrScheduleUpdate(sessionId, partStore);
      logPartUpdated("route", sessionId, [
        ["part", part.id],
        ["target", void 0],
        ["result", "blocked-no-runtime"],
      ]);
      return;
    }
    if (
      part.type === "text" &&
      isCancelMarkerText(stripContextPrefix(part.text).trim())
    ) {
      const result = this.rederiveOrScheduleUpdate(sessionId, partStore);
      if (logDiagnostic) {
        logPartUpdated("route", sessionId, [
          ["part", part.id],
          ["target", part.id],
          [
            "result",
            result === "applied" ? "full-derive" : "queued-full-derive",
          ],
          ["reason", "cancel-marker"],
        ]);
      }
      return;
    }
    const targetPartId = partStore.isSessionPart(runtimeId, part.id)
      ? part.id
      : partStore.findTaskPartIdByChildSessionId(runtimeId, part.sessionID);
    if (!targetPartId) {
      if (part.sessionID !== runtimeId) {
        this.markPendingChildReconciliation(sessionId, part.sessionID);
        logPartUpdated("route", sessionId, [
          ["part", part.id],
          ["target", void 0],
          ["result", "pending-parent"],
          ["child", part.sessionID],
        ]);
        return;
      }
      const result = this.rederiveOrScheduleUpdate(sessionId, partStore);
      logPartUpdated("route", sessionId, [
        ["part", part.id],
        ["target", void 0],
        ["result", result === "applied" ? "full-derive" : "queued-full-derive"],
        ["reason", "root-target-missing"],
      ]);
      return;
    }
    if (part.sessionID !== runtimeId) {
      this.clearPendingChildReconciliation(sessionId, part.sessionID);
    }
    if (
      targetPartId === part.id &&
      !this.hasDerivedPartMessage(sessionId, targetPartId) &&
      !partStore.isLastSessionPart(runtimeId, targetPartId)
    ) {
      const result = this.rederiveOrScheduleUpdate(sessionId, partStore);
      this.logPartApply(
        sessionId,
        partStore,
        part.id,
        targetPartId,
        "full-derive",
        result,
        part.sessionID === runtimeId
          ? extractTaskChildSessionId(part)
          : part.sessionID,
      );
      return;
    }
    if (
      this.hasDerivedPartMessage(sessionId, targetPartId) &&
      isChatRederiveCoalescingEnabled()
    ) {
      if (logDiagnostic) {
        logPartUpdated("route", sessionId, [
          ["part", part.id],
          ["target", targetPartId],
          ["result", "queued-patch"],
        ]);
      }
      this.schedulePartPatchMicrotask(sessionId, partStore, targetPartId);
      return;
    }
    const patched = this.applyDerivedPartPatch(sessionId, partStore, targetPartId);
    this.logPartApply(
      sessionId,
      partStore,
      part.id,
      targetPartId,
      "incremental",
      patched ? "applied" : "failed",
      part.sessionID === runtimeId
        ? extractTaskChildSessionId(part)
        : part.sessionID,
    );
    if (!patched) {
      const fallbackResult = this.rederiveOrScheduleUpdate(sessionId, partStore);
      this.logPartApply(
        sessionId,
        partStore,
        part.id,
        targetPartId,
        "fallback-full-derive",
        fallbackResult,
        part.sessionID === runtimeId
          ? extractTaskChildSessionId(part)
          : part.sessionID,
      );
    }
  }
  schedulePartPatchMicrotask(sessionId, partStore, partId) {
    let partIds = this.queuedPartPatchIds.get(sessionId);
    if (!partIds) {
      partIds = new Set();
      this.queuedPartPatchIds.set(sessionId, partIds);
    }
    partIds.add(partId);
    this.queuedPartPatchStores.set(sessionId, partStore);
    if (this.queuedPartPatchSessionIds.has(sessionId)) return;
    this.queuedPartPatchSessionIds.add(sessionId);
    queueMicrotask(() => {
      this.queuedPartPatchSessionIds.delete(sessionId);
      const queuedPartStore = this.queuedPartPatchStores.get(sessionId);
      const queuedPartIds = [...(this.queuedPartPatchIds.get(sessionId) ?? [])];
      this.queuedPartPatchStores.delete(sessionId);
      this.queuedPartPatchIds.delete(sessionId);
      if (!queuedPartStore) return;
      for (const queuedPartId of queuedPartIds) {
        const patched = this.applyDerivedPartPatch(
          sessionId,
          queuedPartStore,
          queuedPartId,
        );
        this.logPartApply(
          sessionId,
          queuedPartStore,
          queuedPartId,
          queuedPartId,
          "queued-incremental",
          patched ? "applied" : "failed",
          this.findTaskChildSessionId(queuedPartStore, queuedPartId),
        );
        if (!patched) {
          this.rederiveAndUpdate(sessionId, queuedPartStore);
          this.logPartApply(
            sessionId,
            queuedPartStore,
            queuedPartId,
            queuedPartId,
            "fallback-full-derive",
            "applied",
            this.findTaskChildSessionId(queuedPartStore, queuedPartId),
          );
          break;
        }
      }
    });
  }
  scheduleRederiveMicrotask(sessionId) {
    if (this.queuedRederiveSessionIds.has(sessionId)) return;
    this.queuedRederiveSessionIds.add(sessionId);
    queueMicrotask(() => {
      this.queuedRederiveSessionIds.delete(sessionId);
      const queuedPartStore = this.queuedRederivePartStores.get(sessionId);
      this.queuedRederivePartStores.delete(sessionId);
      if (!queuedPartStore) return;
      this.rederiveAndUpdate(sessionId, queuedPartStore);
    });
  }
  flushQueuedRederive(sessionId) {
    this.flushQueuedPartPatches(sessionId);
    const queuedPartStore = this.queuedRederivePartStores.get(sessionId);
    this.queuedRederiveSessionIds.delete(sessionId);
    this.queuedRederivePartStores.delete(sessionId);
    if (queuedPartStore) {
      this.rederiveAndUpdate(sessionId, queuedPartStore);
    }
  }
  flushRederiveAndUpdate(sessionId, partStore, trigger = "full-derive") {
    this.queuedPartPatchIds.delete(sessionId);
    this.queuedPartPatchStores.delete(sessionId);
    this.queuedPartPatchSessionIds.delete(sessionId);
    this.queuedRederiveSessionIds.delete(sessionId);
    this.queuedRederivePartStores.delete(sessionId);
    this.rederiveAndUpdate(sessionId, partStore, trigger);
  }
  flushQueuedPartPatches(sessionId) {
    const queuedPartStore = this.queuedPartPatchStores.get(sessionId);
    const queuedPartIds = [...(this.queuedPartPatchIds.get(sessionId) ?? [])];
    this.queuedPartPatchIds.delete(sessionId);
    this.queuedPartPatchStores.delete(sessionId);
    this.queuedPartPatchSessionIds.delete(sessionId);
    if (!queuedPartStore) return;
    for (const partId of queuedPartIds) {
      const patched = this.applyDerivedPartPatch(sessionId, queuedPartStore, partId);
      this.logPartApply(
        sessionId,
        queuedPartStore,
        partId,
        partId,
        "flushed-incremental",
        patched ? "applied" : "failed",
        this.findTaskChildSessionId(queuedPartStore, partId),
      );
      if (!patched) {
        this.rederiveAndUpdate(sessionId, queuedPartStore);
        this.logPartApply(
          sessionId,
          queuedPartStore,
          partId,
          partId,
          "fallback-full-derive",
          "applied",
          this.findTaskChildSessionId(queuedPartStore, partId),
        );
        break;
      }
    }
  }
  reconcileTerminalChildSession(sessionId, partStore, childSessionId) {
    this.flushQueuedRederive(sessionId);
    const runtimeId = this.runtimeSessionIds.get(sessionId);
    const taskPartId = runtimeId
      ? partStore.findTaskPartIdByChildSessionId(runtimeId, childSessionId)
      : void 0;
    if (!taskPartId) {
      this.markPendingChildReconciliation(sessionId, childSessionId);
      return;
    }
    this.clearPendingChildReconciliation(sessionId, childSessionId);
    if (!this.applyDerivedPartPatch(sessionId, partStore, taskPartId)) {
      this.flushRederiveAndUpdate(sessionId, partStore);
    }
  }
  markPendingChildReconciliation(sessionId, childSessionId) {
    const pending = this.pendingChildReconciliations.get(sessionId) ?? new Set();
    pending.add(childSessionId);
    this.pendingChildReconciliations.set(sessionId, pending);
    this.diagnostics.pendingChildren(sessionId, pending.size);
  }
  clearPendingChildReconciliation(sessionId, childSessionId) {
    const pending = this.pendingChildReconciliations.get(sessionId);
    if (!pending?.delete(childSessionId)) return false;
    if (pending.size === 0) {
      this.pendingChildReconciliations.delete(sessionId);
      this.diagnostics.pendingChildren(sessionId, 0);
    }
    return true;
  }
  clearVisiblePendingChildReconciliations(sessionId) {
    const pending = this.pendingChildReconciliations.get(sessionId);
    if (!pending) return;
    for (const childSessionId of pending) {
      if (this.isChildSessionVisible(sessionId, childSessionId))
        pending.delete(childSessionId);
    }
    if (pending.size === 0) {
      this.pendingChildReconciliations.delete(sessionId);
      this.diagnostics.pendingChildren(sessionId, 0);
    }
  }
  hasPartMessageIndex(sessionId) {
    const index = this.messageIndexByPartId.get(sessionId);
    return Boolean(index && index.size > 0);
  }
  hasDerivedPartMessage(sessionId, partId) {
    const index = this.messageIndexByPartId.get(sessionId);
    return Boolean(index?.has(partId) || index?.has(subAgentPartId(partId)));
  }
  findTaskChildSessionId(partStore, partId) {
    return extractTaskChildSessionId(partStore.getPart(partId));
  }
  isChildSessionVisible(sessionId, childSessionId) {
    return Boolean(
      this.store
        .getState()
        .sessions.get(sessionId)
        ?.messages.some(
          (message) =>
            message.type === "sub_agent" &&
            message.childSessionId === childSessionId,
        ),
    );
  }
  logPartApply(
    sessionId,
    partStore,
    sourcePartId,
    targetPartId,
    mode,
    result,
    childSessionId,
  ) {
    const child =
      childSessionId ?? this.findTaskChildSessionId(partStore, targetPartId);
    const targetPart = partStore.getPart(targetPartId);
    const isSubAgentRelevant =
      Boolean(child) ||
      (targetPart?.type === "tool" && targetPart.tool === "task");
    const isAnomalous =
      result === "failed" ||
      mode === "full-derive" ||
      mode === "fallback-full-derive";
    if (!isSubAgentRelevant && !isAnomalous) return;
    const fields = [
      ["part", sourcePartId],
      ["target", targetPartId],
      ["mode", mode],
      ["result", result],
    ];
    if (child) {
      fields.push(
        ["child", child],
        ["visibleChild", this.isChildSessionVisible(sessionId, child)],
      );
    }
    logPartUpdated("apply", sessionId, fields);
  }
  applyDerivedPartPatch(sessionId, partStore, partId) {
    const startTime = performance.now();
    const state = this.store.getState();
    const perfMetadata = {
      sessionId,
      workspaceId: state.sessions.get(sessionId)?.folder,
      sessionCount: state.sessions.size,
    };
    let derived = partStore.derivePartMessages(partId, this.childSessionMap, {
      perfMetadata,
    });
    const comfyUiProgress = this.comfyUiProgressBySession.get(sessionId);
    if (comfyUiProgress) {
      for (const [callID, progress] of comfyUiProgress) {
        derived = applyComfyUiProgress(derived, callID, progress);
      }
    }
    const affectedPartIds = new Set([partId, subAgentPartId(partId)]);
    let applied = false;
    this.store.updateMessages(sessionId, (prev) => {
      const firstIndex = prev.findIndex((message) =>
        message.partId ? affectedPartIds.has(message.partId) : false,
      );
      if (firstIndex < 0 && derived.length === 0) {
        applied = true;
        return prev;
      }
      if (firstIndex < 0) {
        const merged = dropSupersededHistorySubAgents(
          resplicePendingToolConfirms([...prev, ...derived]),
        );
        this.rebuildMessageIndex(sessionId, merged);
        applied = true;
        return merged;
      }
      const existingByPartId = new Map();
      for (const message of prev) {
        if (message.partId && affectedPartIds.has(message.partId)) {
          existingByPartId.set(message.partId, message);
        }
      }
      const next = prev.filter(
        (message) =>
          !(message.partId && affectedPartIds.has(message.partId)),
      );
      const withStableIds = derived.map((message) => {
        const existing = message.partId
          ? existingByPartId.get(message.partId)
          : void 0;
        return existing
          ? {
              ...message,
              id: existing.id,
            }
          : message;
      });
      next.splice(firstIndex, 0, ...withStableIds);
      const merged = dropSupersededHistorySubAgents(
        resplicePendingToolConfirms(next),
      );
      if (messagesShallowEqual(prev, merged)) {
        applied = true;
        return prev;
      }
      this.rebuildMessageIndex(sessionId, merged);
      applied = true;
      return merged;
    });
    measurePerf(
      PERF_REDERIVE,
      startTime,
      {
        parts: 1,
        messages: derived.length,
        mode: "incremental-part",
      },
      {
        metadata: perfMetadata,
        samplingRate: PERF_PATCH_DELTA_SAMPLE_RATE,
      },
    );
    return applied;
  }
  rederiveAndUpdate(sessionId, partStore, trigger = "part-update") {
    const startTime = performance.now();
    const runtimeId = this.runtimeSessionIds.get(sessionId);
    if (!runtimeId) return;
    const state = this.store.getState();
    const perfMetadata = {
      sessionId,
      workspaceId: state.sessions.get(sessionId)?.folder,
      sessionCount: state.sessions.size,
    };
    let derived = partStore.deriveMessages(
      runtimeId,
      this.childSessionMap,
      perfMetadata,
    );
    const comfyUiProgress = this.comfyUiProgressBySession.get(sessionId);
    if (comfyUiProgress) {
      for (const [callID, progress] of comfyUiProgress) {
        derived = applyComfyUiProgress(derived, callID, progress);
      }
    }
    const hasDerivedCancelled = derived.some((derivedMessage) => derivedMessage.type === "cancelled");
    const derivedByPartId = new Map();
    for (const derivedMessage of derived) {
      if (derivedMessage.partId) derivedByPartId.set(derivedMessage.partId, derivedMessage);
    }
    const derivedUserRuntimeIds = new Set();
    for (const derivedMessage of derived) {
      if (derivedMessage.role === "user" && derivedMessage.runtimeMessageId) {
        derivedUserRuntimeIds.add(derivedMessage.runtimeMessageId);
      }
    }
    this.store.updateMessages(sessionId, (prev) => {
      const consumedPartIds = new Set();
      const result = [];
      const liftedConfirmAsks = [];
      const removed = [];
      for (const previousMessage of prev) {
        if (previousMessage.partId) {
          const fresh = derivedByPartId.get(previousMessage.partId);
          if (fresh) {
            result.push(fresh);
            consumedPartIds.add(previousMessage.partId);
          } else if (previousMessage.type === "tool" || previousMessage.type === "sub_agent") {
            removed.push(previousMessage);
          }
        } else if (previousMessage.type === "cancelled" && hasDerivedCancelled);
        else if (
          previousMessage.role === "user" &&
          !previousMessage.partId &&
          previousMessage.runtimeMessageId &&
          derivedUserRuntimeIds.has(previousMessage.runtimeMessageId)
        );
        else if (
          previousMessage.type === "tool_confirm_ask" &&
          !previousMessage.resolved &&
          !previousMessage.expired
        ) {
          liftedConfirmAsks.push(previousMessage);
        } else {
          result.push(previousMessage);
        }
      }
      for (const derivedMessage of derived) {
        if (derivedMessage.partId && !consumedPartIds.has(derivedMessage.partId)) {
          result.push(derivedMessage);
        }
      }
      let merged = result;
      for (const toolConfirmAsk of liftedConfirmAsks) {
        merged = insertToolConfirmAsk(merged, toolConfirmAsk);
      }
      merged = dropSupersededHistorySubAgents(merged);
      this.diagnostics.rederived(
        sessionId,
        trigger,
        prev,
        merged,
        removed,
        partStore,
      );
      this.rebuildMessageIndex(sessionId, merged);
      return merged;
    });
    measurePerf(
      PERF_REDERIVE,
      startTime,
      {
        parts: derived.length,
      },
      {
        metadata: perfMetadata,
      },
    );
  }
  patchDeltaContent(sessionId, partStore, partId) {
    const startTime = performance.now();
    const part = partStore.getPart(partId);
    if (!part) return "missingPart";
    const runtimeId = this.runtimeSessionIds.get(sessionId);
    if (runtimeId && part.sessionID !== runtimeId) {
      const taskPartId = partStore.findTaskPartIdByChildSessionId(
        runtimeId,
        part.sessionID,
      );
      if (!taskPartId) {
        this.markPendingChildReconciliation(sessionId, part.sessionID);
        return "waitingParent";
      }
    }
    const newContent =
      part.type === "text"
        ? stripContextPrefix(part.text)
        : part.type === "reasoning"
          ? part.text
          : void 0;
    if (newContent === void 0) return "ignored";
    let patched = false;
    this.store.updateMessages(sessionId, (prev) => {
      const messageIndex = this.findMessageIndexByPartId(sessionId, prev, partId);
      if (messageIndex < 0) return prev;
      patched = true;
      const updated = [...prev];
      updated[messageIndex] = {
        ...prev[messageIndex],
        content: newContent,
      };
      this.rebuildMessageIndex(sessionId, updated);
      return updated;
    });
    if (!patched && newContent) {
      this.rederiveAndUpdate(sessionId, partStore);
    }
    const state = this.store.getState();
    measurePerf(
      PERF_PATCH_DELTA,
      startTime,
      {
        msgCount: patched ? 1 : 0,
      },
      {
        metadata: {
          sessionId,
          workspaceId: state.sessions.get(sessionId)?.folder,
          sessionCount: state.sessions.size,
        },
        samplingRate: PERF_PATCH_DELTA_SAMPLE_RATE,
      },
    );
    return patched ? "patched" : newContent ? "rederiveAttempted" : "ignored";
  }
  interactionToChatMessage(interaction) {
    switch (interaction.type) {
      case "question_request": {
        const questionRequest = interaction;
        return {
          id: nextMessageId(),
          role: "agent",
          type: "question",
          content: "",
          requestId: questionRequest.id,
          resolved: false,
          childSessionId: questionRequest.childSessionId,
          questionData: {
            questions: questionRequest.questions,
            tool: questionRequest.tool,
          },
        };
      }
      case "loop_guard_ask": {
        const loopGuardAsk = interaction;
        return {
          id: nextMessageId(),
          role: "agent",
          type: "loop_guard_ask",
          content: loopGuardAsk.message,
          requestId: loopGuardAsk.id,
          loopGuardSessionId: loopGuardAsk.session_id,
          resolved: false,
          loopGuardData: {
            tool: loopGuardAsk.tool,
            hits: loopGuardAsk.hits,
            window: loopGuardAsk.window,
            recent_tools: loopGuardAsk.recent_tools,
            message: loopGuardAsk.message,
          },
        };
      }
      case "interact_request": {
        const interactRequest = interaction;
        return {
          id: nextMessageId(),
          role: "agent",
          type: "interact",
          content: interactRequest.message,
          requestId: interactRequest.id,
          resolved: false,
        };
      }
      case "confirm_request": {
        const confirmRequest = interaction;
        return {
          id: nextMessageId(),
          role: "agent",
          type: "confirm",
          content: confirmRequest.description,
          requestId: confirmRequest.id,
          resolved: false,
        };
      }
      case "tool_confirm_ask": {
        const toolConfirmAsk = interaction;
        return {
          id: nextMessageId(),
          role: "agent",
          type: "tool_confirm_ask",
          content: `Confirm ${toolConfirmAsk.tool}`,
          requestId: toolConfirmAsk.id,
          resolved: false,
          toolConfirmData: {
            tool: toolConfirmAsk.tool,
            args: toolConfirmAsk.args,
            paramHints: toolConfirmAsk.paramHints,
            vendorParamHints: toolConfirmAsk.vendorParamHints,
          },
        };
      }
      case "credit_threshold_request": {
        const creditThresholdRequest = interaction;
        return {
          id: nextMessageId(),
          role: "agent",
          type: "credit_threshold",
          content: "",
          requestId: creditThresholdRequest.id,
          sessionId: creditThresholdRequest.session_id,
          kind: creditThresholdRequest.kind,
          expiresAt: creditThresholdRequest.expires_at,
          shortfallCredits: creditThresholdRequest.shortfall_credits,
          estimatedCredits: creditThresholdRequest.estimated_credits,
          thresholdCredits: creditThresholdRequest.threshold_credits,
          currentCredits: creditThresholdRequest.current_credits,
          remainingCredits: creditThresholdRequest.remaining_credits,
          batchId: creditThresholdRequest.batch_id,
          batchItems: creditThresholdRequest.items?.map((item) => ({
            itemId: item.item_id,
            mediaType: item.media_type,
            model: item.model,
            estimatedCredits: item.estimated_credits,
            prompt: item.prompt,
          })),
          maxSelectableCredits: creditThresholdRequest.max_selectable_credits,
          resolved: false,
        };
      }
      default:
        return null;
    }
  }
  extractAgentName(part) {
    if (part.type !== "tool") return "subagent";
    try {
      const input =
        typeof part.state.input === "string"
          ? JSON.parse(part.state.input)
          : part.state.input;
      return input?.subagent_type ?? "subagent";
    } catch {
      return "subagent";
    }
  }
  getOrCreatePartStore(sessionId) {
    let store = this.partStores.get(sessionId);
    if (!store) {
      store = new PartStore((messageId) =>
        this.store.isMessageWithdrawn(sessionId, messageId),
      );
      this.partStores.set(sessionId, store);
    }
    return store;
  }
  seedHistorySubAgents(sessionId, messages, onlyMissing = false) {
    restoreHistorySubAgents(
      () => this.getOrCreatePartStore(sessionId),
      messages,
      onlyMissing,
    );
  }
  restoreRetainedToolParts(sessionId) {
    const runtimeSessionId = this.runtimeSessionIds.get(sessionId);
    if (!runtimeSessionId) return;
    const messages = this.resolveMessages(sessionId);
    this.seedHistorySubAgents(sessionId, messages, true);
    restoreRootToolParts(
      this.getOrCreatePartStore(sessionId),
      runtimeSessionId,
      messages,
      false,
    );
  }
  // --------------------------------------------------------
  // Effect consumer (exhaustive)
  // --------------------------------------------------------
  applyEffect(effect, options) {
    switch (effect.type) {
      case "session_created": {
        this.markSessionActive(effect.sessionId);
        const initialMessages = effect.messages
          ? backendMessagesToChat(effect.messages)
          : void 0;
        if (initialMessages) {
          this.seedHistorySubAgents(effect.sessionId, initialMessages);
        }
        this.store.createSession(
          effect.sessionId,
          effect.name,
          effect.folder,
          effect.modelId,
          effect.createdAt,
          effect.displayName,
          effect.selectedMediaModels,
          initialMessages,
          effect.origin,
          {
            focus: effect.activated !== false,
            openTab: options?.openCreatedSessionTab !== false,
          },
        );
        break;
      }
      case "session_switched": {
        this.markSessionActive(effect.sessionId);
        if (effect.runtimeSessionId) {
          this.runtimeSessionIds.set(
            effect.sessionId,
            effect.runtimeSessionId,
          );
          this.store.setRuntimeSessionId(
            effect.sessionId,
            effect.runtimeSessionId,
          );
          logRuntimeBinding(
            `seed sid=${effect.sessionId} runtime=${effect.runtimeSessionId} src=session_switched running=${effect.agentRunning ? 1 : 0}`,
          );
        }
        const rawMsgs = [
          ...this.store.projectMessages(
            effect.sessionId,
            backendMessagesToChat(effect.messages ?? []),
          ),
        ];
        const pendingReasons = effect.pendingReasons ?? [];
        const stillBusy = deriveBusy(effect.agentRunning, pendingReasons);
        const historyMessages = !stillBusy
          ? rawMsgs.map((rawMessage) =>
              rawMessage.type === "tool" && rawMessage.toolStatus === "running"
                ? {
                    ...rawMessage,
                    toolStatus: "error",
                  }
                : rawMessage,
            )
          : rawMsgs;
        const pendingInteractionMessages = (effect.pendingInteractions ?? [])
          .map((interaction) => this.interactionToChatMessage(interaction))
          .filter((message) => message !== null);
        const recentSettlementIds = new Set(
          (effect.recentLoopGuardSettlements ?? []).map(
            (settlement) => settlement.id,
          ),
        );
        const recentToolConfirmSettlementIds = new Set(
          (effect.recentToolConfirmSettlements ?? []).map(
            (settlement) => settlement.id,
          ),
        );
        const existingMessages =
          this.store.getState().sessions.get(effect.sessionId)?.messages ?? [];
        const retainedLoopGuardMessages = applyLoopGuardSettlements(
          existingMessages.filter(
            (message) =>
              message.type === "loop_guard_ask" &&
              message.requestId !== void 0 &&
              (!message.resolved ||
                recentSettlementIds.has(message.requestId)),
          ),
          effect.recentLoopGuardSettlements ?? [],
        );
        const retainedToolConfirmMessages = applyToolConfirmSettlements(
          existingMessages.filter(
            (message) =>
              message.type === "tool_confirm_ask" &&
              message.requestId !== void 0 &&
              recentToolConfirmSettlementIds.has(message.requestId),
          ),
          effect.recentToolConfirmSettlements ?? [],
        );
        const historyLoadFailed = effect.historyLoadFailed === true;
        const replaceMessages =
          options?.replaceSessionSnapshot === true && !historyLoadFailed;
        let chatMsgs = replaceMessages
          ? [
              ...pendingInteractionMessages,
              ...retainedLoopGuardMessages,
              ...retainedToolConfirmMessages,
            ].reduce(upsertPendingInteraction, [...historyMessages])
          : historyLoadFailed
            ? []
            : historyMessages;
        const runtimeSessionId = this.runtimeSessionIds.get(effect.sessionId);
        const installsHistory =
          !historyLoadFailed &&
          (replaceMessages || existingMessages.length === 0);
        if (installsHistory && runtimeSessionId) {
          chatMsgs = restoreRootToolMessages(
            this.getOrCreatePartStore(effect.sessionId),
            runtimeSessionId,
            chatMsgs,
            replaceMessages,
            this.childSessionMap,
          );
          chatMsgs = dropSupersededHistorySubAgents(chatMsgs);
        }
        if (replaceMessages) {
          chatMsgs = retainCompletedCompactionStatuses(
            chatMsgs,
            existingMessages,
          );
        }
        const snapshotOptions = {
          selectedMediaModelsSnapshot:
            effect.selectedMediaModelsSnapshot === true,
          replaceMessages,
        };
        if (effect.activated === false) {
          this.store.hydrateSession(
            effect.sessionId,
            chatMsgs,
            effect.folder,
            effect.modelId,
            effect.selectedMediaModels,
            snapshotOptions,
          );
        } else {
          this.store.switchSession(
            effect.sessionId,
            chatMsgs,
            effect.folder,
            effect.modelId,
            effect.selectedMediaModels,
            snapshotOptions,
          );
        }
        const switchedName = effect.name?.trim();
        if (switchedName && switchedName !== DEFAULT_SESSION_NAME) {
          this.store.renameSession(
            effect.sessionId,
            switchedName,
            effect.runtimeSessionId,
          );
        }
        this.diagnostics.snapshotDecision(
          effect.sessionId,
          replaceMessages,
          historyLoadFailed,
          existingMessages.length,
          chatMsgs.length,
        );
        if (!installsHistory) this.restoreRetainedToolParts(effect.sessionId);
        if (!replaceMessages) {
          for (const interaction of pendingInteractionMessages) {
            this.store.updateMessages(
              effect.sessionId,
              (messages) => upsertPendingInteraction(messages, interaction),
              {
                affectsUserAttention: true,
              },
            );
          }
        }
        if (effect.pendingInteractions !== void 0) {
          this.store.updateMessages(
            effect.sessionId,
            (messages) =>
              reconcilePendingInteractionSnapshot(
                messages,
                effect.pendingInteractions ?? [],
              ),
            {
              affectsUserAttention: true,
            },
          );
        }
        const recentLoopGuardSettlements = effect.recentLoopGuardSettlements;
        if (recentLoopGuardSettlements !== void 0) {
          this.store.updateMessages(
            effect.sessionId,
            (messages) =>
              applyLoopGuardSettlements(messages, recentLoopGuardSettlements),
            {
              affectsUserAttention: true,
            },
          );
        }
        const recentToolConfirmSettlements =
          effect.recentToolConfirmSettlements;
        if (recentToolConfirmSettlements !== void 0) {
          this.store.updateMessages(
            effect.sessionId,
            (messages) =>
              applyToolConfirmSettlements(
                messages,
                recentToolConfirmSettlements,
              ),
            {
              affectsUserAttention: true,
            },
          );
        }
        this.store.setHistoryLoadFailed(effect.sessionId, historyLoadFailed);
        this.store.setPendingReasons(pendingReasons, effect.sessionId);
        if (effect.agentRunning) {
          this.store.setBusy(true, effect.sessionId);
        }
        if (!historyLoadFailed) {
          this.clearVisiblePendingChildReconciliations(effect.sessionId);
        }
        break;
      }
      case "selected_media_models_updated":
        this.store.setSelectedMediaModels(
          effect.sessionId,
          effect.selectedMediaModels,
        );
        break;
      case "session_list":
        this.store.reconcileServerSessions(effect.sessions);
        break;
      case "session_bound":
        this.runtimeSessionIds.set(
          effect.uiSessionId,
          effect.runtimeSessionId,
        );
        this.store.setRuntimeSessionId(
          effect.uiSessionId,
          effect.runtimeSessionId,
        );
        logRuntimeBinding(
          `seed sid=${effect.uiSessionId} runtime=${effect.runtimeSessionId} src=session_bound`,
        );
        break;
      case "session_renamed":
        this.store.renameSession(
          effect.sessionId,
          effect.name,
          effect.runtimeSessionId,
        );
        break;
      case "set_busy":
        this.store.setBusy(effect.busy, effect.sessionId);
        break;
      case "set_pending_reasons":
        this.store.setPendingReasons(effect.reasons, effect.sessionId);
        break;
      case "file_changed":
        this.store.notifyFileChanged();
        break;
      case "canvas_updated":
        this.store.notifyCanvasUpdated(effect.update);
        break;
      case "canvas_focus":
        this.store.notifyCanvasFocus(effect.payload);
        break;
      case "canvas_node_generating":
        this.store.notifyCanvasNodeGenerating(effect.payload);
        break;
      case "plugin_storage_changed":
        this.store.notifyPluginStorageChanged(effect.payload);
        break;
      case "plugin_agent_invoke":
        this.store.notifyPluginAgentInvoke(effect.payload);
        break;
      case "plugin_editor_open":
        this.store.notifyPluginEditorOpen(effect.payload);
        break;
      case "asset_changed":
        this.store.notifyAssetChanged(effect.event);
        break;
      case "auth_expired":
        authExpiredBus.emit();
        break;
      default: {
        const _exhaustive = effect;
        logChat(`[unhandled-effect] ${_exhaustive.type}`, "warn");
      }
    }
  }
  // --------------------------------------------------------
  // Helpers
  // --------------------------------------------------------
  getOrCreateReducer(sessionId) {
    let reducer = this.reducers.get(sessionId);
    if (!reducer) {
      reducer = new SessionReducer(sessionId);
      this.reducers.set(sessionId, reducer);
    }
    return reducer;
  }
  findMessageIndexByPartId(sessionId, messages, partId) {
    const cached = this.messageIndexByPartId.get(sessionId)?.get(partId);
    if (cached !== void 0 && messages[cached]?.partId === partId) {
      return cached;
    }
    const messageIndex = messages.findIndex((message) => message.partId === partId);
    if (messageIndex >= 0) {
      let index = this.messageIndexByPartId.get(sessionId);
      if (!index) {
        index = new Map();
        this.messageIndexByPartId.set(sessionId, index);
      }
      index.set(partId, messageIndex);
    }
    return messageIndex;
  }
  rebuildMessageIndex(sessionId, messages) {
    const index = new Map();
    messages.forEach((message, messageIndex) => {
      if (message.partId) {
        index.set(message.partId, messageIndex);
      }
    });
    if (index.size > 0) {
      this.messageIndexByPartId.set(sessionId, index);
    } else {
      this.messageIndexByPartId.delete(sessionId);
    }
  }
  markSessionActive(sessionId) {
    this.sessionTemperatures.set(sessionId, "active");
  }
  countSessionTemperatures() {
    const sessionIds = new Set(this.store.getState().sessions.keys());
    for (const sessionId of this.sessionTemperatures.keys()) {
      sessionIds.add(sessionId);
    }
    let activeSessions = 0;
    let warmSessions = 0;
    let coldSessions = 0;
    for (const sessionId of sessionIds) {
      const temperature = this.sessionTemperatures.get(sessionId) ?? "active";
      if (temperature === "active") {
        activeSessions += 1;
      } else if (temperature === "warm") {
        warmSessions += 1;
      } else {
        coldSessions += 1;
      }
    }
    return {
      activeSessions,
      warmSessions,
      coldSessions,
    };
  }
  trimMessagesToRecent(sessionId, keepCount) {
    const session = this.store.getState().sessions.get(sessionId);
    if (!session || session.messages.length <= keepCount) return;
    this.store.updateMessages(sessionId, (prev) =>
      keepCount === 0 ? [] : prev.slice(prev.length - keepCount),
    );
  }
  /**
   * Remove child session entries spawned by a root session.
   * Scans the PartStore for task tool parts to find child session IDs.
   */
  cleanChildSessions(sessionId) {
    const runtimeId = this.runtimeSessionIds.get(sessionId);
    if (!runtimeId) return;
    const partStore = this.partStores.get(sessionId);
    if (!partStore) return;
    for (const part of partStore.getSessionParts(runtimeId)) {
      if (part.type !== "tool" || part.tool !== "task") continue;
      const childId = extractChildSessionId(part);
      if (childId) {
        this.childSessionMap.delete(childId);
        partStore.releaseSession(childId);
      }
    }
  }
  /**
   * Clean child session entries for task parts that were removed by trimToRecent.
   */
  cleanRemovedTaskParts(partStore, removedParts) {
    for (const part of removedParts) {
      if (part.type !== "tool" || part.tool !== "task") continue;
      const childId = extractChildSessionId(part);
      if (childId) {
        this.childSessionMap.delete(childId);
        partStore.releaseSession(childId);
      }
    }
  }
  resolveMessages(sessionId) {
    if (sessionId) {
      const session = this.store.getState().sessions.get(sessionId);
      if (session) return session.messages;
    }
    return [];
  }
}
