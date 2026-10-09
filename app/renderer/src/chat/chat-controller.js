// chat-controller.js
import { measurePerf } from "../vendor.js";
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
  handleServerMessage(msg, options) {
    if (this.shouldIgnoreServerMessage(msg)) return;
    const previous2 =
      msg.type === "session_switched"
        ? this.resolveMessages(msg.session_id)
        : void 0;
    const relationshipsBefore =
      msg.type === "session_switched"
        ? this.partStores
            .get(msg.session_id)
            ?.getRecoveryDiagnostics(
              msg.runtime_session_id ??
                this.runtimeSessionIds.get(msg.session_id) ??
                msg.session_id,
            )
        : void 0;
    this.applyServerMessage(msg, options);
    if (msg.type === "session_switched") {
      this.diagnostics.restored(
        msg,
        options?.replaceSessionSnapshot === true,
        previous2 ?? [],
        this.resolveMessages(msg.session_id),
        this.partStores.get(msg.session_id),
        this.runtimeSessionIds.get(msg.session_id),
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
  applyServerMessage(msg, options) {
    const sid = extractSessionId(msg);
    if (sid && msg.type === "error") {
      if (this.handleQuestionInteractionError(sid, msg)) return;
      this.handleRootErrorMessage(sid, msg);
      return;
    }
    if (sid && msg.type === "credit_threshold_settled") {
      this.store.updateMessages(
        sid,
        (prev2) =>
          prev2.map((message2) =>
            // first-settlement-wins：终态只收敛一次。gateway 对未知 id 的 reply
            // 会广播 expired，若它迟到于真正的 continued，无条件覆盖会把「已继续」
            // 翻成「已过期」且不会自愈。终态是权威结论，不接受二次改写。
            message2.type === "credit_threshold" &&
            message2.requestId === msg.id &&
            !message2.resolved
              ? {
                  ...message2,
                  resolved: true,
                  decision: msg.decision,
                  settlementStatus: msg.status,
                  selectedItemIds: msg.selected_item_ids,
                }
              : message2,
          ),
        {
          affectsUserAttention: true,
        },
      );
      return;
    }
    if (sid && msg.type === "comfyui_run_progress") {
      let progressByCall = this.comfyUiProgressBySession.get(sid);
      if (!progressByCall) {
        progressByCall = new Map();
        this.comfyUiProgressBySession.set(sid, progressByCall);
      }
      progressByCall.set(msg.progress.tool_use_id, msg.progress);
      if (progressByCall.size > 100) {
        const oldestCallID = progressByCall.keys().next().value;
        if (oldestCallID) progressByCall.delete(oldestCallID);
      }
      this.store.updateMessages(sid, (prev2) =>
        applyComfyUiProgress(prev2, msg.progress.tool_use_id, msg.progress),
      );
      return;
    }
    if (
      msg.type === "part_updated" ||
      msg.type === "part_delta" ||
      msg.type === "session_idle" ||
      msg.type === "session_compaction" ||
      msg.type === "session_error"
    ) {
      if (!sid) return;
      this.handlePartBasedMessage(sid, msg);
      return;
    }
    if (sid && PART_SUPERSEDED_TYPES.has(msg.type)) {
      return;
    }
    if (sid && INTERACTION_MESSAGE_TYPES.has(msg.type)) {
      this.markSessionActive(sid);
      const chatMsg = this.interactionToChatMessage(msg);
      if (chatMsg) {
        this.store.updateMessages(
          sid,
          (prev2) => upsertPendingInteraction(prev2, chatMsg),
          {
            affectsUserAttention: true,
          },
        );
      }
      return;
    }
    if (sid && msg.type === "tool_confirm_expired") {
      const expiredId = msg.id;
      this.store.updateMessages(
        sid,
        (prev2) =>
          prev2.map((m3) =>
            m3.type === "tool_confirm_ask" && m3.requestId === expiredId
              ? {
                  ...m3,
                  resolved: true,
                  expired: true,
                  toolConfirmDecision: "reject",
                  toolConfirmSettlementCause: "timeout",
                }
              : m3,
          ),
        {
          affectsUserAttention: true,
        },
      );
      return;
    }
    if (sid && msg.type === "tool_confirm_settled") {
      this.store.updateMessages(
        sid,
        (prev2) => applyToolConfirmSettlements(prev2, [msg]),
        {
          affectsUserAttention: true,
        },
      );
      return;
    }
    if (sid && msg.type === "loop_guard_settled") {
      this.store.updateMessages(
        sid,
        (prev2) => applyLoopGuardSettlements(prev2, [msg]),
        {
          affectsUserAttention: true,
        },
      );
      return;
    }
    if (sid && msg.type === "question_resolved") {
      const resolved = msg;
      const acknowledgedQuestion = this.resolveMessages(sid).find(
        (message2) =>
          message2.type === "question" &&
          message2.requestId === resolved.request_id,
      );
      const shouldApplyAcknowledgement =
        acknowledgedQuestion !== void 0 &&
        (!acknowledgedQuestion.resolved ||
          questionAttachmentCount(resolved.answers) >
            questionAttachmentCount(acknowledgedQuestion.questionAnswers));
      this.store.updateMessages(
        sid,
        (prev2) =>
          prev2.map((m3) => {
            if (
              m3.type !== "question" ||
              m3.requestId !== resolved.request_id ||
              !shouldApplyAcknowledgement
            ) {
              return m3;
            }
            return {
              ...m3,
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
        const partStore = this.getOrCreatePartStore(sid);
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
          this.rederiveAndUpdate(sid, partStore);
        }
      }
      return;
    }
    const prev = this.resolveMessages(sid);
    if (sid) {
      const reducer2 = this.getOrCreateReducer(sid);
      const result = reducer2.reduce(prev, msg);
      if (result.messages !== prev) {
        this.store.updateMessages(sid, () => [...result.messages]);
      }
      for (const effect2 of result.effects) {
        this.applyEffect(effect2, options);
      }
    } else {
      const result = reduceServerMessage(prev, msg, this.effectOnlyBuffers);
      for (const effect2 of result.effects) {
        this.applyEffect(effect2, options);
      }
    }
  }
  /** Shared by renderer delivery tracking and controller ingestion. */
  shouldIgnoreServerMessage(msg) {
    const sid = extractSessionId(msg);
    if (!sid) return false;
    if (
      msg.type === "session_error" &&
      !msg.childSessionId &&
      msg.error?.error_code === ErrorCodes.CONTENT_POLICY_VIOLATION &&
      msg.runtime_message_id
    ) {
      return this.store.isMessageWithdrawn(sid, msg.runtime_message_id);
    }
    if (
      msg.type === "part_delta" &&
      this.store.isPartWithdrawn(sid, msg.partId)
    )
      return true;
    if (
      msg.type === "part_updated" &&
      this.store.isMessageWithdrawn(sid, msg.part.messageID)
    ) {
      this.store.rememberWithdrawnPart(sid, msg.part.id, msg.part.messageID);
      return true;
    }
    const messageId =
      msg.type === "part_updated"
        ? msg.part.messageID
        : msg.type === "part_delta"
          ? this.partStores.get(sid)?.getPart(msg.partId)?.messageID
          : msg.type === "question_request" && msg.tool
            ? (this.partStores.get(sid)?.getRootMessageId(msg.tool.messageID) ??
              msg.tool.messageID)
            : void 0;
    return Boolean(messageId && this.store.isMessageWithdrawn(sid, messageId));
  }
  withdrawMessage(request) {
    if (
      this.store.isMessageWithdrawn(request.sessionId, request.runtimeMessageId)
    )
      return false;
    const partStore = this.partStores.get(request.sessionId);
    this.store.updateMessages(request.sessionId, (messages2) =>
      messages2.map((message2) => {
        if (message2.type !== "question" || !message2.questionData?.tool)
          return message2;
        const messageId = message2.questionData.tool.messageID;
        const runtimeMessageId =
          partStore?.getRootMessageId(messageId) ?? messageId;
        return runtimeMessageId === request.runtimeMessageId
          ? {
              ...message2,
              runtimeMessageId,
            }
          : message2;
      }),
    );
    const previous2 =
      this.store.getState().sessions.get(request.sessionId)?.messages ?? [];
    if (!this.store.withdrawMessage(request)) return false;
    if (partStore) {
      let removedSeed = false;
      for (const message2 of previous2) {
        if (
          message2.runtimeMessageId === request.runtimeMessageId &&
          message2.type === "sub_agent" &&
          message2.childSessionId &&
          partStore.hasChildSubMessageSeed(
            message2.childSessionId,
            message2.agent,
          )
        ) {
          removedSeed = true;
          partStore.clearChildSubMessageSeed(
            message2.childSessionId,
            message2.agent,
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
    for (const [sid, parts] of this.partStores) {
      this.diagnostics.reset(sid, this.resolveMessages(sid), parts);
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
    const state2 = this.store.getState();
    const warmed = [];
    for (const [sessionId, session] of state2.sessions) {
      if (sessionId === state2.focusedSessionId) continue;
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
    const state2 = this.store.getState();
    const cooled = [];
    for (const [sessionId, session] of state2.sessions) {
      if (!options.includeFocused && sessionId === state2.focusedSessionId)
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
  handleQuestionInteractionError(sid, msg) {
    const requestId = msg.request_id;
    if (!requestId) return false;
    const pendingQuestion = this.resolveMessages(sid).some(
      (message2) =>
        message2.type === "question" &&
        message2.requestId === requestId &&
        message2.resolved !== true,
    );
    if (!pendingQuestion) return false;
    const { content: content2, error } = msg;
    logChat(
      `[question-error] session=${sid} request=${requestId} code=${error?.error_code ?? "none"} retryable=${error?.retryable ?? "?"} msg=${(content2 ?? error?.user_message ?? "").slice(0, 200)}`,
      "error",
    );
    this.store.updateMessages(sid, (prev) => [
      ...prev,
      {
        id: nextMessageId(),
        role: "agent",
        type: "error",
        requestId,
        content: content2 ?? error?.user_message ?? "",
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
  handleRootErrorMessage(sid, msg) {
    const { content: content2, error } = msg;
    logChat(
      `[error] session=${sid} code=${error?.error_code ?? "none"} retryable=${error?.retryable ?? "?"} msg=${(content2 ?? error?.user_message ?? "").slice(0, 200)}`,
      "error",
    );
    const isBusyRejection =
      String(error?.error_code ?? "") ===
        String(ErrorCodes.GATEWAY_BAD_REQUEST) &&
      /busy|pending operations/i.test(error?.user_message ?? content2 ?? "");
    if (!isBusyRejection) {
      this.store.setBusy(false, sid);
    }
    this.store.updateMessages(sid, (prev) => [
      ...prev,
      {
        id: nextMessageId(),
        role: "agent",
        type: "error",
        content: content2 ?? error?.user_message ?? "",
        ...(error
          ? {
              error,
            }
          : {}),
      },
    ]);
    if (!isBusyRejection) {
      this.store.notifySessionCompleted(sid);
    }
    if (
      error?.error_code &&
      String(error.error_code) === String(ErrorCodes.AUTH_EXPIRED)
    ) {
      authExpiredBus.emit();
    }
  }
  handlePartBasedMessage(sid, msg) {
    const partStore = this.getOrCreatePartStore(sid);
    this.markSessionActive(sid);
    switch (msg.type) {
      case "part_updated": {
        const part = msg.part;
        const diagnosticRuntimeId =
          this.runtimeSessionIds.get(sid) ??
          this.store.getState().sessions.get(sid)?.runtimeSessionId;
        const logDiagnostic = this.shouldLogPartUpdatedDiagnostic(
          part,
          diagnosticRuntimeId,
        );
        if (logDiagnostic)
          logPartUpdatedReceived(sid, part, diagnosticRuntimeId);
        if (!this.runtimeSessionIds.has(sid)) {
          const boundRuntimeId = this.store
            .getState()
            .sessions.get(sid)?.runtimeSessionId;
          const chosen = boundRuntimeId ?? part.sessionID;
          this.runtimeSessionIds.set(sid, chosen);
          const mislockRisk =
            !boundRuntimeId && this.childSessionMap.has(part.sessionID);
          logRuntimeBinding(
            `seed sid=${sid} runtime=${chosen} src=${boundRuntimeId ? "store-bound" : "first-part"}${mislockRisk ? " MISLOCK-RISK(child-part-first)" : ""}`,
            mislockRisk ? "warn" : "info",
          );
        }
        partStore.handlePartUpdated(part);
        if (part.type === "tool" && part.tool === "task") {
          const childId = extractChildSessionId(part);
          if (childId) {
            const agentName = this.extractAgentName(part);
            this.childSessionMap.set(childId, agentName);
            if (this.clearPendingChildReconciliation(sid, childId)) {
              this.flushRederiveAndUpdate(sid, partStore);
              this.logPartApply(
                sid,
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
        this.patchPartUpdateOrFallback(sid, partStore, part, logDiagnostic);
        break;
      }
      case "part_delta": {
        const { partId, delta } = msg;
        partStore.handlePartDelta(partId, delta);
        this.diagnostics.delta(
          sid,
          this.patchDeltaContent(sid, partStore, partId),
        );
        break;
      }
      case "session_idle": {
        const childSessionId = msg.childSessionId;
        if (childSessionId) {
          this.reconcileTerminalChildSession(sid, partStore, childSessionId);
        } else {
          this.flushQueuedRederive(sid);
          this.diagnostics.finish(sid, "session-idle");
          this.store.updateMessages(sid, completeLatestCompactionStatus);
          this.store.setBusy(false, sid);
          this.store.notifyFileChanged();
          this.store.notifySessionCompleted(sid);
        }
        break;
      }
      case "session_compaction": {
        const status = msg.status;
        if (status === "started") {
          this.store.updateMessages(sid, upsertRunningCompactionStatus);
        } else {
          this.store.updateMessages(sid, completeLatestCompactionStatus);
        }
        break;
      }
      case "session_error": {
        if (
          !msg.childSessionId &&
          msg.error?.error_code === ErrorCodes.CONTENT_POLICY_VIOLATION
        ) {
          if (msg.runtime_message_id) {
            this.withdrawMessage({
              sessionId: sid,
              runtimeMessageId: msg.runtime_message_id,
              reason: "content_policy_violation",
            });
            break;
          }
          logChat(
            `[withdrawal] missing runtime_message_id session=${sid}`,
            "error",
          );
        }
        const { childSessionId, error, content: content2 } = msg;
        if (childSessionId) {
          this.reconcileTerminalChildSession(sid, partStore, childSessionId);
        } else {
          logChat(
            `[session_error] session=${sid} code=${error?.error_code ?? "none"} msg=${(content2 ?? "").slice(0, 200)}`,
            "error",
          );
          this.flushQueuedRederive(sid);
          this.diagnostics.finish(sid, "session-error");
          this.store.updateMessages(sid, clearRunningCompactionStatus);
          this.store.setBusy(false, sid);
          this.store.updateMessages(sid, (prev) => [
            ...prev,
            {
              id: nextMessageId(),
              role: "agent",
              type: "error",
              content: content2 ?? "",
              ...(error
                ? {
                    error,
                  }
                : {}),
            },
          ]);
          this.store.notifySessionCompleted(sid);
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
  rederiveOrScheduleUpdate(sid, partStore) {
    if (!isChatRederiveCoalescingEnabled()) {
      this.rederiveAndUpdate(sid, partStore);
      return "applied";
    }
    if (
      !this.queuedRederiveSessionIds.has(sid) &&
      !this.hasPartMessageIndex(sid)
    ) {
      this.rederiveAndUpdate(sid, partStore);
      this.scheduleRederiveMicrotask(sid);
      return "applied";
    }
    this.queuedRederivePartStores.set(sid, partStore);
    this.scheduleRederiveMicrotask(sid);
    return "queued";
  }
  shouldLogPartUpdatedDiagnostic(part, runtimeId) {
    if (part.type === "tool" && part.tool === "task") return true;
    if (this.childSessionMap.has(part.sessionID)) return true;
    return !runtimeId || part.sessionID !== runtimeId;
  }
  patchPartUpdateOrFallback(sid, partStore, part, logDiagnostic) {
    if (!isChatIncrementalDeriveEnabled()) {
      const result = this.rederiveOrScheduleUpdate(sid, partStore);
      if (logDiagnostic) {
        logPartUpdated("route", sid, [
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
    const runtimeId = this.runtimeSessionIds.get(sid);
    if (!runtimeId) {
      this.rederiveOrScheduleUpdate(sid, partStore);
      logPartUpdated("route", sid, [
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
      const result = this.rederiveOrScheduleUpdate(sid, partStore);
      if (logDiagnostic) {
        logPartUpdated("route", sid, [
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
        this.markPendingChildReconciliation(sid, part.sessionID);
        logPartUpdated("route", sid, [
          ["part", part.id],
          ["target", void 0],
          ["result", "pending-parent"],
          ["child", part.sessionID],
        ]);
        return;
      }
      const result = this.rederiveOrScheduleUpdate(sid, partStore);
      logPartUpdated("route", sid, [
        ["part", part.id],
        ["target", void 0],
        ["result", result === "applied" ? "full-derive" : "queued-full-derive"],
        ["reason", "root-target-missing"],
      ]);
      return;
    }
    if (part.sessionID !== runtimeId) {
      this.clearPendingChildReconciliation(sid, part.sessionID);
    }
    if (
      targetPartId === part.id &&
      !this.hasDerivedPartMessage(sid, targetPartId) &&
      !partStore.isLastSessionPart(runtimeId, targetPartId)
    ) {
      const result = this.rederiveOrScheduleUpdate(sid, partStore);
      this.logPartApply(
        sid,
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
      this.hasDerivedPartMessage(sid, targetPartId) &&
      isChatRederiveCoalescingEnabled()
    ) {
      if (logDiagnostic) {
        logPartUpdated("route", sid, [
          ["part", part.id],
          ["target", targetPartId],
          ["result", "queued-patch"],
        ]);
      }
      this.schedulePartPatchMicrotask(sid, partStore, targetPartId);
      return;
    }
    const patched = this.applyDerivedPartPatch(sid, partStore, targetPartId);
    this.logPartApply(
      sid,
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
      const fallbackResult = this.rederiveOrScheduleUpdate(sid, partStore);
      this.logPartApply(
        sid,
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
  schedulePartPatchMicrotask(sid, partStore, partId) {
    let partIds = this.queuedPartPatchIds.get(sid);
    if (!partIds) {
      partIds = new Set();
      this.queuedPartPatchIds.set(sid, partIds);
    }
    partIds.add(partId);
    this.queuedPartPatchStores.set(sid, partStore);
    if (this.queuedPartPatchSessionIds.has(sid)) return;
    this.queuedPartPatchSessionIds.add(sid);
    queueMicrotask(() => {
      this.queuedPartPatchSessionIds.delete(sid);
      const queuedPartStore = this.queuedPartPatchStores.get(sid);
      const queuedPartIds = [...(this.queuedPartPatchIds.get(sid) ?? [])];
      this.queuedPartPatchStores.delete(sid);
      this.queuedPartPatchIds.delete(sid);
      if (!queuedPartStore) return;
      for (const queuedPartId of queuedPartIds) {
        const patched = this.applyDerivedPartPatch(
          sid,
          queuedPartStore,
          queuedPartId,
        );
        this.logPartApply(
          sid,
          queuedPartStore,
          queuedPartId,
          queuedPartId,
          "queued-incremental",
          patched ? "applied" : "failed",
          this.findTaskChildSessionId(queuedPartStore, queuedPartId),
        );
        if (!patched) {
          this.rederiveAndUpdate(sid, queuedPartStore);
          this.logPartApply(
            sid,
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
  scheduleRederiveMicrotask(sid) {
    if (this.queuedRederiveSessionIds.has(sid)) return;
    this.queuedRederiveSessionIds.add(sid);
    queueMicrotask(() => {
      this.queuedRederiveSessionIds.delete(sid);
      const queuedPartStore = this.queuedRederivePartStores.get(sid);
      this.queuedRederivePartStores.delete(sid);
      if (!queuedPartStore) return;
      this.rederiveAndUpdate(sid, queuedPartStore);
    });
  }
  flushQueuedRederive(sid) {
    this.flushQueuedPartPatches(sid);
    const queuedPartStore = this.queuedRederivePartStores.get(sid);
    this.queuedRederiveSessionIds.delete(sid);
    this.queuedRederivePartStores.delete(sid);
    if (queuedPartStore) {
      this.rederiveAndUpdate(sid, queuedPartStore);
    }
  }
  flushRederiveAndUpdate(sid, partStore, trigger = "full-derive") {
    this.queuedPartPatchIds.delete(sid);
    this.queuedPartPatchStores.delete(sid);
    this.queuedPartPatchSessionIds.delete(sid);
    this.queuedRederiveSessionIds.delete(sid);
    this.queuedRederivePartStores.delete(sid);
    this.rederiveAndUpdate(sid, partStore, trigger);
  }
  flushQueuedPartPatches(sid) {
    const queuedPartStore = this.queuedPartPatchStores.get(sid);
    const queuedPartIds = [...(this.queuedPartPatchIds.get(sid) ?? [])];
    this.queuedPartPatchIds.delete(sid);
    this.queuedPartPatchStores.delete(sid);
    this.queuedPartPatchSessionIds.delete(sid);
    if (!queuedPartStore) return;
    for (const partId of queuedPartIds) {
      const patched = this.applyDerivedPartPatch(sid, queuedPartStore, partId);
      this.logPartApply(
        sid,
        queuedPartStore,
        partId,
        partId,
        "flushed-incremental",
        patched ? "applied" : "failed",
        this.findTaskChildSessionId(queuedPartStore, partId),
      );
      if (!patched) {
        this.rederiveAndUpdate(sid, queuedPartStore);
        this.logPartApply(
          sid,
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
  reconcileTerminalChildSession(sid, partStore, childSessionId) {
    this.flushQueuedRederive(sid);
    const runtimeId = this.runtimeSessionIds.get(sid);
    const taskPartId = runtimeId
      ? partStore.findTaskPartIdByChildSessionId(runtimeId, childSessionId)
      : void 0;
    if (!taskPartId) {
      this.markPendingChildReconciliation(sid, childSessionId);
      return;
    }
    this.clearPendingChildReconciliation(sid, childSessionId);
    if (!this.applyDerivedPartPatch(sid, partStore, taskPartId)) {
      this.flushRederiveAndUpdate(sid, partStore);
    }
  }
  markPendingChildReconciliation(sid, childSessionId) {
    const pending2 = this.pendingChildReconciliations.get(sid) ?? new Set();
    pending2.add(childSessionId);
    this.pendingChildReconciliations.set(sid, pending2);
    this.diagnostics.pendingChildren(sid, pending2.size);
  }
  clearPendingChildReconciliation(sid, childSessionId) {
    const pending2 = this.pendingChildReconciliations.get(sid);
    if (!pending2?.delete(childSessionId)) return false;
    if (pending2.size === 0) {
      this.pendingChildReconciliations.delete(sid);
      this.diagnostics.pendingChildren(sid, 0);
    }
    return true;
  }
  clearVisiblePendingChildReconciliations(sid) {
    const pending2 = this.pendingChildReconciliations.get(sid);
    if (!pending2) return;
    for (const childSessionId of pending2) {
      if (this.isChildSessionVisible(sid, childSessionId))
        pending2.delete(childSessionId);
    }
    if (pending2.size === 0) {
      this.pendingChildReconciliations.delete(sid);
      this.diagnostics.pendingChildren(sid, 0);
    }
  }
  hasPartMessageIndex(sid) {
    const index2 = this.messageIndexByPartId.get(sid);
    return Boolean(index2 && index2.size > 0);
  }
  hasDerivedPartMessage(sid, partId) {
    const index2 = this.messageIndexByPartId.get(sid);
    return Boolean(index2?.has(partId) || index2?.has(subAgentPartId(partId)));
  }
  findTaskChildSessionId(partStore, partId) {
    return extractTaskChildSessionId(partStore.getPart(partId));
  }
  isChildSessionVisible(sid, childSessionId) {
    return Boolean(
      this.store
        .getState()
        .sessions.get(sid)
        ?.messages.some(
          (message2) =>
            message2.type === "sub_agent" &&
            message2.childSessionId === childSessionId,
        ),
    );
  }
  logPartApply(
    sid,
    partStore,
    sourcePartId,
    targetPartId,
    mode2,
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
      mode2 === "full-derive" ||
      mode2 === "fallback-full-derive";
    if (!isSubAgentRelevant && !isAnomalous) return;
    const fields = [
      ["part", sourcePartId],
      ["target", targetPartId],
      ["mode", mode2],
      ["result", result],
    ];
    if (child) {
      fields.push(
        ["child", child],
        ["visibleChild", this.isChildSessionVisible(sid, child)],
      );
    }
    logPartUpdated("apply", sid, fields);
  }
  applyDerivedPartPatch(sid, partStore, partId) {
    const t0 = performance.now();
    const state2 = this.store.getState();
    const perfMetadata = {
      sessionId: sid,
      workspaceId: state2.sessions.get(sid)?.folder,
      sessionCount: state2.sessions.size,
    };
    let derived = partStore.derivePartMessages(partId, this.childSessionMap, {
      perfMetadata,
    });
    const comfyUiProgress = this.comfyUiProgressBySession.get(sid);
    if (comfyUiProgress) {
      for (const [callID, progress] of comfyUiProgress) {
        derived = applyComfyUiProgress(derived, callID, progress);
      }
    }
    const affectedPartIds = new Set([partId, subAgentPartId(partId)]);
    let applied = false;
    this.store.updateMessages(sid, (prev) => {
      const firstIndex = prev.findIndex((message2) =>
        message2.partId ? affectedPartIds.has(message2.partId) : false,
      );
      if (firstIndex < 0 && derived.length === 0) {
        applied = true;
        return prev;
      }
      if (firstIndex < 0) {
        const merged2 = dropSupersededHistorySubAgents(
          resplicePendingToolConfirms([...prev, ...derived]),
        );
        this.rebuildMessageIndex(sid, merged2);
        applied = true;
        return merged2;
      }
      const existingByPartId = new Map();
      for (const message2 of prev) {
        if (message2.partId && affectedPartIds.has(message2.partId)) {
          existingByPartId.set(message2.partId, message2);
        }
      }
      const next2 = prev.filter(
        (message2) =>
          !(message2.partId && affectedPartIds.has(message2.partId)),
      );
      const withStableIds = derived.map((message2) => {
        const existing = message2.partId
          ? existingByPartId.get(message2.partId)
          : void 0;
        return existing
          ? {
              ...message2,
              id: existing.id,
            }
          : message2;
      });
      next2.splice(firstIndex, 0, ...withStableIds);
      const merged = dropSupersededHistorySubAgents(
        resplicePendingToolConfirms(next2),
      );
      if (messagesShallowEqual(prev, merged)) {
        applied = true;
        return prev;
      }
      this.rebuildMessageIndex(sid, merged);
      applied = true;
      return merged;
    });
    measurePerf(
      PERF_REDERIVE,
      t0,
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
  rederiveAndUpdate(sid, partStore, trigger = "part-update") {
    const t0 = performance.now();
    const runtimeId = this.runtimeSessionIds.get(sid);
    if (!runtimeId) return;
    const state2 = this.store.getState();
    const perfMetadata = {
      sessionId: sid,
      workspaceId: state2.sessions.get(sid)?.folder,
      sessionCount: state2.sessions.size,
    };
    let derived = partStore.deriveMessages(
      runtimeId,
      this.childSessionMap,
      perfMetadata,
    );
    const comfyUiProgress = this.comfyUiProgressBySession.get(sid);
    if (comfyUiProgress) {
      for (const [callID, progress] of comfyUiProgress) {
        derived = applyComfyUiProgress(derived, callID, progress);
      }
    }
    const hasDerivedCancelled = derived.some((m3) => m3.type === "cancelled");
    const derivedByPartId = new Map();
    for (const m3 of derived) {
      if (m3.partId) derivedByPartId.set(m3.partId, m3);
    }
    const derivedUserRuntimeIds = new Set();
    for (const m3 of derived) {
      if (m3.role === "user" && m3.runtimeMessageId) {
        derivedUserRuntimeIds.add(m3.runtimeMessageId);
      }
    }
    this.store.updateMessages(sid, (prev) => {
      const consumedPartIds = new Set();
      const result = [];
      const liftedConfirmAsks = [];
      const removed = [];
      for (const m3 of prev) {
        if (m3.partId) {
          const fresh = derivedByPartId.get(m3.partId);
          if (fresh) {
            result.push(fresh);
            consumedPartIds.add(m3.partId);
          } else if (m3.type === "tool" || m3.type === "sub_agent") {
            removed.push(m3);
          }
        } else if (m3.type === "cancelled" && hasDerivedCancelled);
        else if (
          m3.role === "user" &&
          !m3.partId &&
          m3.runtimeMessageId &&
          derivedUserRuntimeIds.has(m3.runtimeMessageId)
        );
        else if (
          m3.type === "tool_confirm_ask" &&
          !m3.resolved &&
          !m3.expired
        ) {
          liftedConfirmAsks.push(m3);
        } else {
          result.push(m3);
        }
      }
      for (const d2 of derived) {
        if (d2.partId && !consumedPartIds.has(d2.partId)) {
          result.push(d2);
        }
      }
      let merged = result;
      for (const ask of liftedConfirmAsks) {
        merged = insertToolConfirmAsk(merged, ask);
      }
      merged = dropSupersededHistorySubAgents(merged);
      this.diagnostics.rederived(
        sid,
        trigger,
        prev,
        merged,
        removed,
        partStore,
      );
      this.rebuildMessageIndex(sid, merged);
      return merged;
    });
    measurePerf(
      PERF_REDERIVE,
      t0,
      {
        parts: derived.length,
      },
      {
        metadata: perfMetadata,
      },
    );
  }
  patchDeltaContent(sid, partStore, partId) {
    const t0 = performance.now();
    const part = partStore.getPart(partId);
    if (!part) return "missingPart";
    const runtimeId = this.runtimeSessionIds.get(sid);
    if (runtimeId && part.sessionID !== runtimeId) {
      const taskPartId = partStore.findTaskPartIdByChildSessionId(
        runtimeId,
        part.sessionID,
      );
      if (!taskPartId) {
        this.markPendingChildReconciliation(sid, part.sessionID);
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
    this.store.updateMessages(sid, (prev) => {
      const idx = this.findMessageIndexByPartId(sid, prev, partId);
      if (idx < 0) return prev;
      patched = true;
      const updated = [...prev];
      updated[idx] = {
        ...prev[idx],
        content: newContent,
      };
      this.rebuildMessageIndex(sid, updated);
      return updated;
    });
    if (!patched && newContent) {
      this.rederiveAndUpdate(sid, partStore);
    }
    const state2 = this.store.getState();
    measurePerf(
      PERF_PATCH_DELTA,
      t0,
      {
        msgCount: patched ? 1 : 0,
      },
      {
        metadata: {
          sessionId: sid,
          workspaceId: state2.sessions.get(sid)?.folder,
          sessionCount: state2.sessions.size,
        },
        samplingRate: PERF_PATCH_DELTA_SAMPLE_RATE,
      },
    );
    return patched ? "patched" : newContent ? "rederiveAttempted" : "ignored";
  }
  interactionToChatMessage(msg) {
    switch (msg.type) {
      case "question_request": {
        const m3 = msg;
        return {
          id: nextMessageId(),
          role: "agent",
          type: "question",
          content: "",
          requestId: m3.id,
          resolved: false,
          childSessionId: m3.childSessionId,
          questionData: {
            questions: m3.questions,
            tool: m3.tool,
          },
        };
      }
      case "loop_guard_ask": {
        const m3 = msg;
        return {
          id: nextMessageId(),
          role: "agent",
          type: "loop_guard_ask",
          content: m3.message,
          requestId: m3.id,
          loopGuardSessionId: m3.session_id,
          resolved: false,
          loopGuardData: {
            tool: m3.tool,
            hits: m3.hits,
            window: m3.window,
            recent_tools: m3.recent_tools,
            message: m3.message,
          },
        };
      }
      case "interact_request": {
        const m3 = msg;
        return {
          id: nextMessageId(),
          role: "agent",
          type: "interact",
          content: m3.message,
          requestId: m3.id,
          resolved: false,
        };
      }
      case "confirm_request": {
        const m3 = msg;
        return {
          id: nextMessageId(),
          role: "agent",
          type: "confirm",
          content: m3.description,
          requestId: m3.id,
          resolved: false,
        };
      }
      case "tool_confirm_ask": {
        const m3 = msg;
        return {
          id: nextMessageId(),
          role: "agent",
          type: "tool_confirm_ask",
          content: `Confirm ${m3.tool}`,
          requestId: m3.id,
          resolved: false,
          toolConfirmData: {
            tool: m3.tool,
            args: m3.args,
            paramHints: m3.paramHints,
            vendorParamHints: m3.vendorParamHints,
          },
        };
      }
      case "credit_threshold_request": {
        const m3 = msg;
        return {
          id: nextMessageId(),
          role: "agent",
          type: "credit_threshold",
          content: "",
          requestId: m3.id,
          sessionId: m3.session_id,
          kind: m3.kind,
          expiresAt: m3.expires_at,
          shortfallCredits: m3.shortfall_credits,
          estimatedCredits: m3.estimated_credits,
          thresholdCredits: m3.threshold_credits,
          currentCredits: m3.current_credits,
          remainingCredits: m3.remaining_credits,
          batchId: m3.batch_id,
          batchItems: m3.items?.map((item) => ({
            itemId: item.item_id,
            mediaType: item.media_type,
            model: item.model,
            estimatedCredits: item.estimated_credits,
            prompt: item.prompt,
          })),
          maxSelectableCredits: m3.max_selectable_credits,
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
  seedHistorySubAgents(sessionId, messages2, onlyMissing = false) {
    restoreHistorySubAgents(
      () => this.getOrCreatePartStore(sessionId),
      messages2,
      onlyMissing,
    );
  }
  restoreRetainedToolParts(sessionId) {
    const runtimeSessionId = this.runtimeSessionIds.get(sessionId);
    if (!runtimeSessionId) return;
    const messages2 = this.resolveMessages(sessionId);
    this.seedHistorySubAgents(sessionId, messages2, true);
    restoreRootToolParts(
      this.getOrCreatePartStore(sessionId),
      runtimeSessionId,
      messages2,
      false,
    );
  }
  // --------------------------------------------------------
  // Effect consumer (exhaustive)
  // --------------------------------------------------------
  applyEffect(effect2, options) {
    switch (effect2.type) {
      case "session_created": {
        this.markSessionActive(effect2.sessionId);
        const initialMessages = effect2.messages
          ? backendMessagesToChat(effect2.messages)
          : void 0;
        if (initialMessages) {
          this.seedHistorySubAgents(effect2.sessionId, initialMessages);
        }
        this.store.createSession(
          effect2.sessionId,
          effect2.name,
          effect2.folder,
          effect2.modelId,
          effect2.createdAt,
          effect2.displayName,
          effect2.selectedMediaModels,
          initialMessages,
          effect2.origin,
          {
            focus: effect2.activated !== false,
            openTab: options?.openCreatedSessionTab !== false,
          },
        );
        break;
      }
      case "session_switched": {
        this.markSessionActive(effect2.sessionId);
        if (effect2.runtimeSessionId) {
          this.runtimeSessionIds.set(
            effect2.sessionId,
            effect2.runtimeSessionId,
          );
          this.store.setRuntimeSessionId(
            effect2.sessionId,
            effect2.runtimeSessionId,
          );
          logRuntimeBinding(
            `seed sid=${effect2.sessionId} runtime=${effect2.runtimeSessionId} src=session_switched running=${effect2.agentRunning ? 1 : 0}`,
          );
        }
        const rawMsgs = [
          ...this.store.projectMessages(
            effect2.sessionId,
            backendMessagesToChat(effect2.messages ?? []),
          ),
        ];
        const pendingReasons = effect2.pendingReasons ?? [];
        const stillBusy = deriveBusy(effect2.agentRunning, pendingReasons);
        const historyMessages = !stillBusy
          ? rawMsgs.map((msg) =>
              msg.type === "tool" && msg.toolStatus === "running"
                ? {
                    ...msg,
                    toolStatus: "error",
                  }
                : msg,
            )
          : rawMsgs;
        const pendingInteractionMessages = (effect2.pendingInteractions ?? [])
          .map((interaction) => this.interactionToChatMessage(interaction))
          .filter((message2) => message2 !== null);
        const recentSettlementIds = new Set(
          (effect2.recentLoopGuardSettlements ?? []).map(
            (settlement) => settlement.id,
          ),
        );
        const recentToolConfirmSettlementIds = new Set(
          (effect2.recentToolConfirmSettlements ?? []).map(
            (settlement) => settlement.id,
          ),
        );
        const existingMessages =
          this.store.getState().sessions.get(effect2.sessionId)?.messages ?? [];
        const retainedLoopGuardMessages = applyLoopGuardSettlements(
          existingMessages.filter(
            (message2) =>
              message2.type === "loop_guard_ask" &&
              message2.requestId !== void 0 &&
              (!message2.resolved ||
                recentSettlementIds.has(message2.requestId)),
          ),
          effect2.recentLoopGuardSettlements ?? [],
        );
        const retainedToolConfirmMessages = applyToolConfirmSettlements(
          existingMessages.filter(
            (message2) =>
              message2.type === "tool_confirm_ask" &&
              message2.requestId !== void 0 &&
              recentToolConfirmSettlementIds.has(message2.requestId),
          ),
          effect2.recentToolConfirmSettlements ?? [],
        );
        const historyLoadFailed = effect2.historyLoadFailed === true;
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
        const runtimeSessionId = this.runtimeSessionIds.get(effect2.sessionId);
        const installsHistory =
          !historyLoadFailed &&
          (replaceMessages || existingMessages.length === 0);
        if (installsHistory && runtimeSessionId) {
          chatMsgs = restoreRootToolMessages(
            this.getOrCreatePartStore(effect2.sessionId),
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
            effect2.selectedMediaModelsSnapshot === true,
          replaceMessages,
        };
        if (effect2.activated === false) {
          this.store.hydrateSession(
            effect2.sessionId,
            chatMsgs,
            effect2.folder,
            effect2.modelId,
            effect2.selectedMediaModels,
            snapshotOptions,
          );
        } else {
          this.store.switchSession(
            effect2.sessionId,
            chatMsgs,
            effect2.folder,
            effect2.modelId,
            effect2.selectedMediaModels,
            snapshotOptions,
          );
        }
        this.diagnostics.snapshotDecision(
          effect2.sessionId,
          replaceMessages,
          historyLoadFailed,
          existingMessages.length,
          chatMsgs.length,
        );
        if (!installsHistory) this.restoreRetainedToolParts(effect2.sessionId);
        if (!replaceMessages) {
          for (const interaction of pendingInteractionMessages) {
            this.store.updateMessages(
              effect2.sessionId,
              (messages2) => upsertPendingInteraction(messages2, interaction),
              {
                affectsUserAttention: true,
              },
            );
          }
        }
        if (effect2.pendingInteractions !== void 0) {
          this.store.updateMessages(
            effect2.sessionId,
            (messages2) =>
              reconcilePendingInteractionSnapshot(
                messages2,
                effect2.pendingInteractions ?? [],
              ),
            {
              affectsUserAttention: true,
            },
          );
        }
        const recentLoopGuardSettlements = effect2.recentLoopGuardSettlements;
        if (recentLoopGuardSettlements !== void 0) {
          this.store.updateMessages(
            effect2.sessionId,
            (messages2) =>
              applyLoopGuardSettlements(messages2, recentLoopGuardSettlements),
            {
              affectsUserAttention: true,
            },
          );
        }
        const recentToolConfirmSettlements =
          effect2.recentToolConfirmSettlements;
        if (recentToolConfirmSettlements !== void 0) {
          this.store.updateMessages(
            effect2.sessionId,
            (messages2) =>
              applyToolConfirmSettlements(
                messages2,
                recentToolConfirmSettlements,
              ),
            {
              affectsUserAttention: true,
            },
          );
        }
        this.store.setHistoryLoadFailed(effect2.sessionId, historyLoadFailed);
        this.store.setPendingReasons(pendingReasons, effect2.sessionId);
        if (effect2.agentRunning) {
          this.store.setBusy(true, effect2.sessionId);
        }
        if (!historyLoadFailed) {
          this.clearVisiblePendingChildReconciliations(effect2.sessionId);
        }
        break;
      }
      case "selected_media_models_updated":
        this.store.setSelectedMediaModels(
          effect2.sessionId,
          effect2.selectedMediaModels,
        );
        break;
      case "session_list":
        this.store.reconcileServerSessions(effect2.sessions);
        break;
      case "session_bound":
        this.runtimeSessionIds.set(
          effect2.uiSessionId,
          effect2.runtimeSessionId,
        );
        this.store.setRuntimeSessionId(
          effect2.uiSessionId,
          effect2.runtimeSessionId,
        );
        logRuntimeBinding(
          `seed sid=${effect2.uiSessionId} runtime=${effect2.runtimeSessionId} src=session_bound`,
        );
        break;
      case "session_renamed":
        this.store.renameSession(
          effect2.sessionId,
          effect2.name,
          effect2.runtimeSessionId,
        );
        break;
      case "set_busy":
        this.store.setBusy(effect2.busy, effect2.sessionId);
        break;
      case "set_pending_reasons":
        this.store.setPendingReasons(effect2.reasons, effect2.sessionId);
        break;
      case "file_changed":
        this.store.notifyFileChanged();
        break;
      case "canvas_updated":
        this.store.notifyCanvasUpdated(effect2.update);
        break;
      case "canvas_focus":
        this.store.notifyCanvasFocus(effect2.payload);
        break;
      case "canvas_node_generating":
        this.store.notifyCanvasNodeGenerating(effect2.payload);
        break;
      case "plugin_storage_changed":
        this.store.notifyPluginStorageChanged(effect2.payload);
        break;
      case "plugin_agent_invoke":
        this.store.notifyPluginAgentInvoke(effect2.payload);
        break;
      case "plugin_editor_open":
        this.store.notifyPluginEditorOpen(effect2.payload);
        break;
      case "asset_changed":
        this.store.notifyAssetChanged(effect2.event);
        break;
      case "auth_expired":
        authExpiredBus.emit();
        break;
      default: {
        const _exhaustive = effect2;
        logChat(`[unhandled-effect] ${_exhaustive.type}`, "warn");
      }
    }
  }
  // --------------------------------------------------------
  // Helpers
  // --------------------------------------------------------
  getOrCreateReducer(sessionId) {
    let reducer2 = this.reducers.get(sessionId);
    if (!reducer2) {
      reducer2 = new SessionReducer(sessionId);
      this.reducers.set(sessionId, reducer2);
    }
    return reducer2;
  }
  findMessageIndexByPartId(sessionId, messages2, partId) {
    const cached = this.messageIndexByPartId.get(sessionId)?.get(partId);
    if (cached !== void 0 && messages2[cached]?.partId === partId) {
      return cached;
    }
    const idx = messages2.findIndex((m3) => m3.partId === partId);
    if (idx >= 0) {
      let index2 = this.messageIndexByPartId.get(sessionId);
      if (!index2) {
        index2 = new Map();
        this.messageIndexByPartId.set(sessionId, index2);
      }
      index2.set(partId, idx);
    }
    return idx;
  }
  rebuildMessageIndex(sessionId, messages2) {
    const index2 = new Map();
    messages2.forEach((message2, idx) => {
      if (message2.partId) {
        index2.set(message2.partId, idx);
      }
    });
    if (index2.size > 0) {
      this.messageIndexByPartId.set(sessionId, index2);
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
  resolveMessages(sid) {
    if (sid) {
      const session = this.store.getState().sessions.get(sid);
      if (session) return session.messages;
    }
    return [];
  }
}
