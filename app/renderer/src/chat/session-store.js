// session-store.js
import { measurePerf } from "../vendor.js";
import { DEFAULT_SESSION_NAME } from "../canvas/generating-media-area.jsx";
import { PERF_STORE_NOTIFY } from "../generation/text-models.js";
export function extractSessionId(msg) {
  return msg.session_id;
}
export function applyComfyUiProgress(messages2, callID, progress) {
  const patchSubMessages = (subMessages) =>
    subMessages?.map((message2) => ({
      ...message2,
      ...(message2.type === "tool" && message2.callID === callID
        ? {
            comfyUiProgress: progress,
          }
        : {}),
      ...(message2.subMessages
        ? {
            subMessages: patchSubMessages(message2.subMessages),
          }
        : {}),
    }));
  return messages2.map((message2) => {
    if (message2.type === "tool" && message2.callID === callID) {
      return {
        ...message2,
        comfyUiProgress: progress,
      };
    }
    if (message2.type === "sub_agent" && message2.subMessages) {
      return {
        ...message2,
        subMessages: patchSubMessages(message2.subMessages),
      };
    }
    return message2;
  });
}
export function normalizeKeepCount(keepCount) {
  if (!Number.isFinite(keepCount) || keepCount <= 0) return 0;
  return Math.floor(keepCount);
}
export function protectedFocusedSessionIds(focusedSessionId) {
  return focusedSessionId ? new Set([focusedSessionId]) : void 0;
}
export function subAgentPartId(partId) {
  return `${partId}__sub_agent`;
}
export function resplicePendingToolConfirms(messages2) {
  const base2 = [];
  const lifted = [];
  for (const message2 of messages2) {
    if (message2.type === "tool_confirm_ask" && !message2.resolved && !message2.expired) {
      lifted.push(message2);
    } else {
      base2.push(message2);
    }
  }
  let result = base2;
  for (const ask of lifted) {
    result = insertToolConfirmAsk(result, ask);
  }
  return result;
}
export function messagesShallowEqual(prev, next2) {
  if (prev === next2) return true;
  if (prev.length !== next2.length) return false;
  for (let index2 = 0; index2 < prev.length; index2 += 1) {
    if (!chatMessageShallowEqual(prev[index2], next2[index2])) return false;
  }
  return true;
}
function chatMessageShallowEqual(a2, b3) {
  if (a2 === b3) return true;
  const aRecord = a2;
  const bRecord = b3;
  const aKeys = Object.keys(aRecord);
  const bKeys = Object.keys(bRecord);
  if (aKeys.length !== bKeys.length) return false;
  for (const key2 of aKeys) {
    if (aRecord[key2] !== bRecord[key2]) {
      return false;
    }
  }
  return true;
}
export function insertToolConfirmAsk(prev, chatMsg) {
  if (chatMsg.type !== "tool_confirm_ask" || !chatMsg.toolConfirmData) {
    return [...prev, chatMsg];
  }
  const targetTool = chatMsg.toolConfirmData.tool;
  const targetArgsKey = canonicalArgsKey(chatMsg.toolConfirmData.args);
  for (let i2 = prev.length - 1; i2 >= 0; i2--) {
    const m3 = prev[i2];
    if (m3.type === "tool") {
      if (m3.content === targetTool) {
        if (canonicalArgsKey(safeParseToolArgs(m3.toolArgs)) === targetArgsKey) {
          return [...prev.slice(0, i2 + 1), chatMsg, ...prev.slice(i2 + 1)];
        }
      }
    } else if (m3.type === "sub_agent") {
      const subs = m3.subMessages ?? [];
      const matchesSub = subs.some(
        (s2) =>
          s2.type === "tool" &&
          stripToolResultPrefix(s2.content ?? "") === targetTool &&
          canonicalArgsKey(safeParseToolArgs(s2.args)) === targetArgsKey,
      );
      if (matchesSub) {
        return [...prev.slice(0, i2 + 1), chatMsg, ...prev.slice(i2 + 1)];
      }
    }
  }
  return [...prev, chatMsg];
}
export function upsertPendingInteraction(prev, interaction) {
  const requestId = "requestId" in interaction ? interaction.requestId : void 0;
  if (
    requestId &&
    prev.some((message2) => "requestId" in message2 && message2.requestId === requestId)
  ) {
    if (interaction.type === "credit_threshold") {
      return prev.map((message2) =>
        message2.type === "credit_threshold" && message2.requestId === requestId
          ? {
              ...interaction,
              id: message2.id,
              revision: (message2.revision ?? 0) + 1,
            }
          : message2,
      );
    }
    return [...prev];
  }
  return interaction.type === "tool_confirm_ask"
    ? insertToolConfirmAsk(prev, interaction)
    : [...prev, interaction];
}
export function reconcilePendingInteractionSnapshot(messages2, pendingInteractions) {
  const pendingIds = new Set(
    pendingInteractions
      .filter((interaction) => interaction.type === "loop_guard_ask")
      .map((interaction) => interaction.id),
  );
  const pendingCreditThresholdIds = new Set(
    pendingInteractions
      .filter((interaction) => interaction.type === "credit_threshold_request")
      .map((interaction) => interaction.id),
  );
  return messages2.map((message2) => {
    if (message2.type === "credit_threshold" && message2.requestId) {
      return pendingCreditThresholdIds.has(message2.requestId)
        ? message2.resolved
          ? {
              ...message2,
              resolved: false,
              settlementStatus: void 0,
              decision: void 0,
            }
          : message2
        : message2.resolved
          ? message2
          : {
              ...message2,
              resolved: true,
              settlementStatus: "unavailable",
            };
    }
    if (message2.type !== "loop_guard_ask" || !message2.requestId) {
      return message2;
    }
    if (pendingIds.has(message2.requestId)) {
      return message2.resolved
        ? {
            ...message2,
            resolved: false,
            loopGuardDecision: void 0,
            loopGuardSettlementCause: void 0,
          }
        : message2;
    }
    return message2.resolved
      ? message2
      : {
          ...message2,
          resolved: true,
          loopGuardDecision: void 0,
          loopGuardSettlementCause: "unavailable",
        };
  });
}
export function applyToolConfirmSettlements(messages2, settlements) {
  if (settlements.length === 0) return [...messages2];
  const byRequestId = new Map(settlements.map((settlement) => [settlement.id, settlement]));
  return messages2.map((message2) => {
    if (message2.type !== "tool_confirm_ask" || !message2.requestId) return message2;
    const settlement = byRequestId.get(message2.requestId);
    if (!settlement) return message2;
    return {
      ...message2,
      resolved: true,
      expired: settlement.cause !== "reply",
      toolConfirmDecision: settlement.decision,
      toolConfirmSettlementCause: settlement.cause,
      ...(settlement.modified_args && message2.toolConfirmData
        ? {
            toolConfirmData: {
              ...message2.toolConfirmData,
              args: settlement.modified_args,
            },
          }
        : {}),
    };
  });
}
export function applyLoopGuardSettlements(messages2, settlements) {
  if (settlements.length === 0) return [...messages2];
  const byRequestId = new Map(settlements.map((settlement) => [settlement.id, settlement]));
  return messages2.map((message2) => {
    if (message2.type !== "loop_guard_ask" || !message2.requestId) return message2;
    const settlement = byRequestId.get(message2.requestId);
    if (!settlement || settlement.session_id !== message2.loopGuardSessionId) return message2;
    return {
      ...message2,
      resolved: true,
      loopGuardDecision: settlement.decision,
      loopGuardSettlementCause: settlement.cause,
    };
  });
}
function stripToolResultPrefix(content2) {
  const idx = content2.indexOf(": ");
  return idx >= 0 ? content2.slice(0, idx) : content2;
}
function safeParseToolArgs(serialized) {
  if (!serialized) return void 0;
  try {
    return JSON.parse(serialized);
  } catch {
    return serialized;
  }
}
function canonicalArgsKey(args) {
  if (args === void 0) return "__undefined__";
  if (args === null || typeof args !== "object") return JSON.stringify(args);
  const filtered = {};
  for (const k2 of Object.keys(args)) {
    if (k2 === "_session_id" || k2 === "_tool_use_id") continue;
    filtered[k2] = args[k2];
  }
  return stableStringify(filtered);
}
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const obj = value;
  const keys2 = Object.keys(obj).sort();
  return `{${keys2.map((k2) => `${JSON.stringify(k2)}:${stableStringify(obj[k2])}`).join(",")}}`;
}
class MessageWithdrawals {
  partIds = new Map();
  sessions = new Map();
  has(sessionId, runtimeMessageId) {
    return this.sessions.get(sessionId)?.has(runtimeMessageId) ?? false;
  }
  rememberPart(sessionId, partId, runtimeMessageId) {
    if (!this.has(sessionId, runtimeMessageId)) return;
    let ids2 = this.partIds.get(sessionId);
    if (!ids2) {
      ids2 = new Set();
      this.partIds.set(sessionId, ids2);
    }
    ids2.add(partId);
  }
  hasPart(sessionId, partId) {
    return this.partIds.get(sessionId)?.has(partId) ?? false;
  }
  add({ sessionId, runtimeMessageId, reason }) {
    if (!sessionId || !runtimeMessageId || this.has(sessionId, runtimeMessageId)) return void 0;
    let messages2 = this.sessions.get(sessionId);
    if (!messages2) {
      messages2 = new Map();
      this.sessions.set(sessionId, messages2);
    }
    const placeholder = {
      id: `withdrawn:${sessionId}:${runtimeMessageId}`,
      type: "withdrawn",
      role: "agent",
      content: "",
      runtimeMessageId,
      reason,
    };
    messages2.set(runtimeMessageId, placeholder);
    return placeholder;
  }
  project(sessionId, messages2) {
    for (const message2 of messages2) {
      if (message2.type === "withdrawn") {
        this.add({
          sessionId,
          runtimeMessageId: message2.runtimeMessageId,
          reason: message2.reason,
        });
      }
    }
    const withdrawals = this.sessions.get(sessionId);
    if (!withdrawals?.size) return messages2;
    const seen2 = new Set();
    const result = [];
    for (const message2 of messages2) {
      const target =
        message2.role === "agent" && message2.runtimeMessageId
          ? withdrawals.get(message2.runtimeMessageId)
          : void 0;
      if (!target) {
        result.push(message2);
        continue;
      }
      if (message2.partId) this.rememberPart(sessionId, message2.partId, target.runtimeMessageId);
      if (!seen2.has(target.runtimeMessageId)) {
        result.push(target);
        seen2.add(target.runtimeMessageId);
      }
    }
    return result.length === messages2.length && result.every((m3, i2) => m3 === messages2[i2])
      ? messages2
      : result;
  }
  rekeySession(fromId, toId) {
    const source = this.sessions.get(fromId);
    if (source) this.sessions.set(toId, new Map([...(this.sessions.get(toId) ?? []), ...source]));
    const parts = this.partIds.get(fromId);
    if (parts) this.partIds.set(toId, new Set([...(this.partIds.get(toId) ?? []), ...parts]));
    this.removeSession(fromId);
  }
  removeSession(sessionId) {
    this.sessions.delete(sessionId);
    this.partIds.delete(sessionId);
  }
  reset() {
    this.sessions.clear();
    this.partIds.clear();
  }
}
const EMPTY_MESSAGES = Object.freeze([]);
const EMPTY_SESSION_LIST = Object.freeze([]);
const EMPTY_OPENED_TAB_ORDER = Object.freeze([]);
const EMPTY_OPENED_TABS = Object.freeze(new Set());
const EMPTY_PENDING_REASONS = Object.freeze([]);
function isDefaultSessionName(name2) {
  return name2 === DEFAULT_SESSION_NAME;
}
function getIncomingSessionName(info2) {
  if (info2.display_name && !isDefaultSessionName(info2.display_name)) return info2.display_name;
  if (info2.name && !isDefaultSessionName(info2.name)) return info2.name;
  return info2.display_name || info2.name || DEFAULT_SESSION_NAME;
}
function resolveReconciledSessionName(info2, existingName) {
  const incomingName = getIncomingSessionName(info2);
  if (existingName && !isDefaultSessionName(existingName) && isDefaultSessionName(incomingName)) {
    return existingName;
  }
  return incomingName;
}
function hasSelectedMediaModelsSnapshot(info2) {
  return Object.hasOwn(info2, "selected_media_models");
}
const NEEDS_USER_ACTION_KINDS = new Set(["tool_confirm_ask", "loop_guard_ask"]);
export class SessionStore {
  withdrawals = new MessageWithdrawals();
  state = {
    sessions: new Map(),
    focusedSessionId: null,
    openedTabOrder: EMPTY_OPENED_TAB_ORDER,
    openedTabIds: EMPTY_OPENED_TABS,
  };
  listeners = new Set();
  tabEvictedListeners = new Set();
  // --------------------------------------------------------
  // Subscriptions
  // --------------------------------------------------------
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  /**
   * Fires whenever ANY path (openTab, createSession, evictTabForPhantom)
   * auto-evicts a tab into History to enforce `OPENED_TAB_CAP`. Lets the
   * UI surface a single red-dot / toast affordance without every call
   * site having to thread the evicted id back manually.
   */
  subscribeTabEvicted(listener) {
    this.tabEvictedListeners.add(listener);
    return () => this.tabEvictedListeners.delete(listener);
  }
  notifyTabEvicted(sessionId) {
    for (const listener of this.tabEvictedListeners) {
      listener(sessionId);
    }
  }
  notify() {
    const t0 = performance.now();
    for (const listener of this.listeners) {
      listener(this.state);
    }
    const focusedSession = this.state.focusedSessionId
      ? this.state.sessions.get(this.state.focusedSessionId)
      : void 0;
    measurePerf(
      PERF_STORE_NOTIFY,
      t0,
      {
        listeners: this.listeners.size,
      },
      {
        metadata: {
          sessionId: this.state.focusedSessionId ?? void 0,
          workspaceId: focusedSession?.folder,
          sessionCount: this.state.sessions.size,
        },
      },
    );
  }
  /** Replace internal state immutably and notify subscribers */
  setState(next2) {
    this.state = next2;
    this.notify();
  }
  /** Replace a single session immutably */
  setSession(id2, session) {
    const next2 = new Map(this.state.sessions);
    next2.set(id2, session);
    this.setState({
      ...this.state,
      sessions: next2,
    });
  }
  /** Derive an openedTabIds Set from the canonical ordered array. */
  deriveOpenedTabIds(order2) {
    return order2.length === 0 ? EMPTY_OPENED_TABS : new Set(order2);
  }
  // --------------------------------------------------------
  // Getters (return snapshots, not live references)
  // --------------------------------------------------------
  getState() {
    return this.state;
  }
  getFocusedSession() {
    if (!this.state.focusedSessionId) return void 0;
    return this.state.sessions.get(this.state.focusedSessionId);
  }
  getFocusedMessages() {
    return this.getFocusedSession()?.messages ?? EMPTY_MESSAGES;
  }
  isFocusedBusy() {
    return this.getFocusedSession()?.busy ?? false;
  }
  /**
   * Aggregated pending snapshot for the focused session. Empty array (the
   * shared frozen reference) when nothing is pending. Consumers may use list
   * length for pending/running status, but must inspect reason kinds before
   * deciding whether to lock the composer.
   */
  getFocusedPendingReasons() {
    return this.getFocusedSession()?.pendingReasons ?? EMPTY_PENDING_REASONS;
  }
  getFocusedFolder() {
    const session = this.getFocusedSession();
    return session?.folder || null;
  }
  getSessionList() {
    if (this.state.sessions.size === 0) return EMPTY_SESSION_LIST;
    const result = [];
    for (const [id2, session] of this.state.sessions) {
      result.push({
        id: id2,
        runtime_session_id: session.runtimeSessionId,
        name: session.displayName || session.name,
        created_at: session.createdAt ?? "",
        message_count: session.messages.length,
        active: id2 === this.state.focusedSessionId,
        folder: session.folder,
        model_id: session.modelId,
        origin: session.origin,
      });
    }
    return result;
  }
  // --------------------------------------------------------
  // Mutations (immutable: always produce new state objects)
  // --------------------------------------------------------
  createSession(
    id2,
    name2,
    folder,
    modelId,
    createdAt,
    displayName2,
    selectedMediaModels,
    initialMessages,
    origin,
    options,
  ) {
    const next2 = new Map(this.state.sessions);
    const existing = next2.get(id2);
    next2.set(id2, {
      id: id2,
      name: displayName2 || name2,
      messages: this.projectMessages(id2, initialMessages ? [...initialMessages] : []),
      userAttentionRevision: (existing?.userAttentionRevision ?? -1) + 1,
      busy: false,
      hasUnread: false,
      createdAt: createdAt || existing?.createdAt || new Date().toISOString(),
      folder,
      modelId,
      selectedMediaModels,
      origin: origin ?? existing?.origin,
      pendingReasons: existing?.pendingReasons ?? EMPTY_PENDING_REASONS,
    });
    let nextOrder =
      options?.openTab === false
        ? this.state.openedTabOrder.filter((tabId) => tabId !== id2)
        : this.state.openedTabIds.has(id2)
          ? this.state.openedTabOrder
          : [...this.state.openedTabOrder, id2];
    let evictedId = null;
    if (options?.openTab !== false && nextOrder.length > SessionStore.OPENED_TAB_CAP) {
      evictedId =
        this.findEvictableTabId(new Set([this.state.focusedSessionId, id2])) ??
        this.state.openedTabOrder[0] ??
        null;
      if (evictedId) nextOrder = nextOrder.filter((tabId) => tabId !== evictedId);
    }
    this.setState({
      sessions: next2,
      focusedSessionId: options?.focus === false ? this.state.focusedSessionId : id2,
      openedTabOrder: nextOrder,
      openedTabIds: this.deriveOpenedTabIds(nextOrder),
    });
    if (evictedId) this.notifyTabEvicted(evictedId);
  }
  updateModelId(id2, modelId) {
    const session = this.state.sessions.get(id2);
    if (!session) return;
    const next2 = new Map(this.state.sessions);
    next2.set(id2, {
      ...session,
      modelId,
    });
    this.setState({
      ...this.state,
      sessions: next2,
    });
  }
  /**
   * Replace a session's media model whitelist (handler for
   * `ServerSelectedMediaModelsUpdated` and as part of `switchSession`).
   * Pass `undefined` to clear (Auto for every category).
   */
  setSelectedMediaModels(id2, selectedMediaModels) {
    const session = this.state.sessions.get(id2);
    if (!session) return;
    this.setSession(id2, {
      ...session,
      selectedMediaModels,
    });
  }
  /**
   * Mark whether the latest hydration failed to load history from OpenCode.
   * `true` keeps the current transcript but tells the UI it is not
   * authoritative; `false` clears the degraded state after a successful load.
   */
  setHistoryLoadFailed(id2, failed) {
    const session = this.state.sessions.get(id2);
    if (!session) return;
    if ((session.historyLoadFailed ?? false) === failed) return;
    this.setSession(id2, {
      ...session,
      historyLoadFailed: failed,
    });
  }
  switchSession(id2, messages2, folder, modelId, selectedMediaModels, options) {
    this.applySessionSnapshot(id2, messages2, folder, modelId, selectedMediaModels, options, true);
  }
  /**
   * Install a full session snapshot without changing visible focus.
   *
   * Used by reconnect/background hydration and stale switch responses. The
   * session's history/runtime metadata remains available when the user later
   * focuses the tab, while the current transcript and send target stay stable.
   */
  hydrateSession(id2, messages2, folder, modelId, selectedMediaModels, options) {
    this.applySessionSnapshot(id2, messages2, folder, modelId, selectedMediaModels, options, false);
  }
  /** Change visible focus without reloading or replacing session history. */
  focusSession(id2) {
    this.applySessionSnapshot(id2, void 0, void 0, void 0, void 0, void 0, true);
  }
  /**
   * Adopt a new server identity for an already-rendered session without
   * dropping its transcript. Used only when reconnect proves a cold gateway
   * now addresses the same OpenCode session by runtime id.
   */
  rekeySession(fromId, toId) {
    if (fromId === toId) return;
    const source = this.state.sessions.get(fromId);
    if (!source) return;
    const target = this.state.sessions.get(toId);
    this.withdrawals.rekeySession(fromId, toId);
    const sessions = new Map(this.state.sessions);
    sessions.delete(fromId);
    sessions.set(toId, {
      ...source,
      ...target,
      id: toId,
      messages: source.messages,
      busy: source.busy,
      hasUnread: source.hasUnread,
      pendingReasons: source.pendingReasons,
      runtimeSessionId: target?.runtimeSessionId ?? source.runtimeSessionId ?? toId,
    });
    const openedTabOrder = [
      ...new Set(
        this.state.openedTabOrder.map((sessionId) => (sessionId === fromId ? toId : sessionId)),
      ),
    ];
    this.setState({
      ...this.state,
      sessions,
      openedTabOrder,
      openedTabIds: this.deriveOpenedTabIds(openedTabOrder),
      focusedSessionId: this.state.focusedSessionId === fromId ? toId : this.state.focusedSessionId,
    });
  }
  applySessionSnapshot(id2, messages2, folder, modelId, selectedMediaModels, options, focus2) {
    const session = this.state.sessions.get(id2);
    if (!session) return;
    const hasSelectedMediaModelsSnapshot2 = options?.selectedMediaModelsSnapshot === true;
    const shouldInstallMessages =
      options?.replaceMessages === true ||
      Boolean(messages2 && messages2.length > 0 && session.messages.length === 0);
    const needsUpdate =
      (focus2 && session.hasUnread) ||
      shouldInstallMessages ||
      folder ||
      modelId ||
      hasSelectedMediaModelsSnapshot2;
    if (needsUpdate) {
      const next2 = new Map(this.state.sessions);
      next2.set(id2, {
        ...session,
        ...(focus2
          ? {
              hasUnread: false,
            }
          : {}),
        ...(shouldInstallMessages
          ? {
              messages: this.projectMessages(id2, messages2 ?? []),
              userAttentionRevision: session.userAttentionRevision + 1,
            }
          : {}),
        ...(folder
          ? {
              folder,
            }
          : {}),
        ...(modelId
          ? {
              modelId,
            }
          : {}),
        ...(hasSelectedMediaModelsSnapshot2
          ? {
              selectedMediaModels,
            }
          : {}),
      });
      this.setState({
        ...this.state,
        sessions: next2,
        ...(focus2
          ? {
              focusedSessionId: id2,
            }
          : {}),
      });
    } else if (focus2) {
      this.setState({
        ...this.state,
        focusedSessionId: id2,
      });
    }
  }
  /** Clear focused session (e.g. for "New Chat" — session created on first message) */
  clearFocusedSession() {
    if (!this.state.focusedSessionId) return;
    this.setState({
      ...this.state,
      focusedSessionId: null,
    });
  }
  removeSession(id2) {
    this.withdrawals.removeSession(id2);
    const next2 = new Map(this.state.sessions);
    next2.delete(id2);
    const nextOrder = this.state.openedTabOrder.filter((tabId) => tabId !== id2);
    let nextFocusedId = this.state.focusedSessionId;
    if (nextFocusedId === id2) {
      nextFocusedId = nextOrder[0] ?? null;
    }
    this.setState({
      ...this.state,
      sessions: next2,
      openedTabOrder: nextOrder,
      openedTabIds: this.deriveOpenedTabIds(nextOrder),
      focusedSessionId: nextFocusedId,
    });
  }
  /**
   * Cap on how many tabs the chat header shows at once. Beyond this,
   * every tab-adding path (openTab / createSession / the phantom "New
   * Chat" slot) automatically evicts a tab into history — the underlying
   * session survives, only its strip slot is reclaimed. See ADR: chat
   * panel is narrow (RightPanel MIN_WIDTH 300px) so more than 3 tabs
   * shrink each title into illegibility.
   */
  static OPENED_TAB_CAP = 3;
  /**
   * Pick which tab to evict when the strip is over cap.
   *
   * Selection order (oldest-first within each tier):
   *   1. idle tabs — safe to hide, nothing in flight
   *   2. running (busy / pending) tabs — deprioritized: users usually want
   *      to see a generation finish, but hiding one is recoverable (the
   *      History guidance + unread signal still fire)
   *   3. needs-user-action tabs — NEVER evicted: hiding the session the
   *      user must respond to (tool confirm / loop guard) would soft-lock
   *      that flow behind the History popover.
   *
   * `excludeIds` lets callers protect the focused tab and/or a just-added
   * id. Returns null when every candidate is protected.
   */
  findEvictableTabId(excludeIds) {
    const candidates2 = this.state.openedTabOrder.filter((tabId) => !excludeIds.has(tabId));
    let runningFallback = null;
    for (const tabId of candidates2) {
      const session = this.state.sessions.get(tabId);
      const pending2 = session?.pendingReasons ?? EMPTY_PENDING_REASONS;
      if (pending2.some((r2) => NEEDS_USER_ACTION_KINDS.has(r2.kind))) continue;
      const running2 = (session?.busy ?? false) || pending2.length > 0;
      if (!running2) return tabId;
      runningFallback ??= tabId;
    }
    return runningFallback;
  }
  /**
   * Add a session id to opened tabs (does not change focus).
   *
   * When the strip is already at `OPENED_TAB_CAP`, we evict per
   * `findEvictableTabId` (never the focused tab, never needs-user-action
   * tabs, running tabs last). The evicted id is returned AND broadcast
   * via `subscribeTabEvicted` so every open path — restore, default
   * fallback, IM auto-open, switch_session — surfaces the History guidance
   * without each caller having to plumb the return value.
   */
  openTab(id2) {
    if (this.state.openedTabIds.has(id2))
      return {
        evictedId: null,
      };
    let nextOrder = [...this.state.openedTabOrder, id2];
    let evictedId = null;
    if (nextOrder.length > SessionStore.OPENED_TAB_CAP) {
      evictedId =
        this.findEvictableTabId(new Set([this.state.focusedSessionId, id2])) ??
        this.state.openedTabOrder[0] ??
        null;
      if (evictedId) nextOrder = nextOrder.filter((tabId) => tabId !== evictedId);
    }
    this.setState({
      ...this.state,
      openedTabOrder: nextOrder,
      openedTabIds: this.deriveOpenedTabIds(nextOrder),
    });
    if (evictedId) this.notifyTabEvicted(evictedId);
    return {
      evictedId,
    };
  }
  /**
   * Enforce the tab cap on behalf of the phantom "New Chat" slot, which
   * occupies a strip position without being a real session id. `excludeId`
   * protects the tab the caller is currently standing on (the focused id
   * captured BEFORE clearFocusedSession, which nulls the store's own
   * focused pointer). Returns the evicted id (also broadcast).
   */
  evictTabForPhantom(excludeId) {
    if (this.state.openedTabOrder.length < SessionStore.OPENED_TAB_CAP) {
      return {
        evictedId: null,
      };
    }
    const evictedId =
      this.findEvictableTabId(new Set([this.state.focusedSessionId, excludeId])) ??
      this.state.openedTabOrder.find((tabId) => tabId !== excludeId) ??
      null;
    if (!evictedId)
      return {
        evictedId: null,
      };
    const nextOrder = this.state.openedTabOrder.filter((tabId) => tabId !== evictedId);
    this.setState({
      ...this.state,
      openedTabOrder: nextOrder,
      openedTabIds: this.deriveOpenedTabIds(nextOrder),
    });
    this.notifyTabEvicted(evictedId);
    return {
      evictedId,
    };
  }
  /**
   * Close a tab view without deleting the underlying session. The session
   * remains in `sessions` and can be reopened from History. If the closed
   * tab was focused, focus falls to the right neighbor, then the left
   * neighbor. Returns the id of the next session to focus (or null when
   * no tabs remain), so callers can drive a `switch_session` WS message.
   */
  closeTab(id2) {
    if (!this.state.openedTabIds.has(id2)) return null;
    const prevOrder = this.state.openedTabOrder;
    const idx = prevOrder.indexOf(id2);
    const nextOrder = prevOrder.filter((tabId) => tabId !== id2);
    const wasFocused = this.state.focusedSessionId === id2;
    let nextFocusedId = this.state.focusedSessionId;
    if (wasFocused) {
      nextFocusedId = nextOrder[idx] ?? nextOrder[idx - 1] ?? null;
    }
    this.setState({
      ...this.state,
      openedTabOrder: nextOrder,
      openedTabIds: this.deriveOpenedTabIds(nextOrder),
      focusedSessionId: nextFocusedId,
    });
    return {
      nextFocusedId,
    };
  }
  setBusy(busy, sessionId) {
    const session = this.state.sessions.get(sessionId);
    if (!session) return;
    if (session.busy === busy) return;
    this.setSession(sessionId, {
      ...session,
      busy,
    });
  }
  /**
   * Replace the pending-reason snapshot for a session. Pass an empty array
   * to clear. Reuses the shared frozen `EMPTY_PENDING_REASONS` reference so
   * subscribers can shallow-compare to skip re-renders.
   */
  setPendingReasons(reasons, sessionId) {
    const session = this.state.sessions.get(sessionId);
    if (!session) return;
    const next2 = reasons.length === 0 ? EMPTY_PENDING_REASONS : reasons;
    if (session.pendingReasons === next2) return;
    this.setSession(sessionId, {
      ...session,
      pendingReasons: next2,
    });
  }
  /** Check busy state for any session (not just focused) */
  getSessionBusy(sessionId) {
    return this.state.sessions.get(sessionId)?.busy ?? false;
  }
  /** Check unread state for any session */
  getSessionUnread(sessionId) {
    return this.state.sessions.get(sessionId)?.hasUnread ?? false;
  }
  /** Clear unread flag for a session (e.g. when user focuses it) */
  clearUnread(sessionId) {
    const session = this.state.sessions.get(sessionId);
    if (!session?.hasUnread) return;
    this.setSession(sessionId, {
      ...session,
      hasUnread: false,
    });
  }
  // --------------------------------------------------------
  // Message mutations (delegated to MessageReducer)
  // --------------------------------------------------------
  updateMessages(sessionId, updater, options) {
    const session = this.state.sessions.get(sessionId);
    if (!session) return;
    const isNonFocused = sessionId !== this.state.focusedSessionId;
    const nextMessages = this.projectMessages(sessionId, updater(session.messages));
    const nextHasUnread = isNonFocused ? true : session.hasUnread;
    if (nextMessages === session.messages && nextHasUnread === session.hasUnread) {
      return;
    }
    this.setSession(sessionId, {
      ...session,
      messages: nextMessages,
      hasUnread: nextHasUnread,
      userAttentionRevision: options?.affectsUserAttention
        ? session.userAttentionRevision + 1
        : session.userAttentionRevision,
    });
  }
  rememberWithdrawnPart(sessionId, partId, runtimeMessageId) {
    this.withdrawals.rememberPart(sessionId, partId, runtimeMessageId);
  }
  isPartWithdrawn(sessionId, partId) {
    return this.withdrawals.hasPart(sessionId, partId);
  }
  isMessageWithdrawn(sessionId, runtimeMessageId) {
    return this.withdrawals.has(sessionId, runtimeMessageId);
  }
  projectMessages(sessionId, messages2) {
    return this.withdrawals.project(sessionId, messages2);
  }
  withdrawMessage(request) {
    const session = this.state.sessions.get(request.sessionId);
    if (!session) return false;
    const placeholder = this.withdrawals.add(request);
    if (!placeholder) return false;
    this.setSession(request.sessionId, {
      ...session,
      // Include a placeholder even if the safety event preceded the first part.
      messages: this.projectMessages(request.sessionId, [...session.messages, placeholder]).filter(
        (message2) => message2.type !== "compaction_status" || message2.content === "compacted",
      ),
      busy: false,
      hasUnread: session.hasUnread || request.sessionId !== this.state.focusedSessionId,
      userAttentionRevision: session.userAttentionRevision + 1,
    });
    return true;
  }
  /** Convenience: push a new message to a session */
  pushMessage(msg, sessionId) {
    this.updateMessages(sessionId, (prev) => [...prev, msg]);
  }
  /**
   * Mark all unfinished task cards as 'error' for a given session.
   * Called by local abort paths so the UI does not leave task/sub-agent
   * dispatch cards stuck in pending/running while the runtime is being killed.
   */
  finalizePendingTasks(sessionId) {
    const session = this.state.sessions.get(sessionId);
    if (!session) return;
    const hasPending = session.messages.some(
      (m3) =>
        m3.type === "tool" &&
        m3.content === "task" &&
        (m3.toolStatus === "pending" || m3.toolStatus === "running"),
    );
    if (!hasPending) return;
    this.updateMessages(sessionId, (prev) =>
      prev.map((m3) =>
        m3.type === "tool" &&
        m3.content === "task" &&
        (m3.toolStatus === "pending" || m3.toolStatus === "running")
          ? {
              ...m3,
              toolStatus: "error",
            }
          : m3,
      ),
    );
  }
  /**
   * Mark all unresolved `tool_confirm_ask` cards in the session as resolved.
   * Inline cards hide themselves once resolved (MessageBubble returns null),
   * so this single flip also makes the mini bar above the input disappear
   * (its pending count is derived from the same filter). Used by Stop / abort
   * paths so the user's "终止对话" click clears all confirmation UI in one go
   * instead of leaving stale cards for the agent's killed turn.
   */
  resolvePendingToolConfirms(sessionId) {
    const session = this.state.sessions.get(sessionId);
    if (!session) return;
    const hasPending = session.messages.some(
      (m3) => m3.type === "tool_confirm_ask" && !m3.resolved,
    );
    if (!hasPending) return;
    this.updateMessages(
      sessionId,
      (prev) =>
        prev.map((m3) =>
          m3.type === "tool_confirm_ask" && !m3.resolved
            ? {
                ...m3,
                resolved: true,
                toolConfirmDecision: "reject",
              }
            : m3,
        ),
      {
        affectsUserAttention: true,
      },
    );
  }
  /**
   * Remove a single message by id from a session.
   * No-op if the session or message does not exist.
   * Used to roll back optimistic user messages (e.g. on safety block).
   * Does not flip hasUnread — removal is not a new event.
   */
  removeMessageById(sessionId, messageId) {
    const session = this.state.sessions.get(sessionId);
    if (!session) return;
    if (!session.messages.some((m3) => m3.id === messageId)) return;
    this.setSession(sessionId, {
      ...session,
      messages: session.messages.filter((m3) => m3.id !== messageId),
    });
  }
  /**
   * Rename an existing session.
   * No-op if the session does not exist or the name is unchanged.
   * Used by the gateway-pushed `session_renamed` event after a session's
   * first user message clears safety — the session is created with a
   * default "New Chat" name and renamed once the content is allowed.
   */
  renameSession(sessionId, name2, runtimeSessionId) {
    let resolvedId = sessionId;
    let session = this.state.sessions.get(sessionId);
    if (!session && runtimeSessionId) {
      for (const [candidateId, candidate] of this.state.sessions) {
        if (candidate.runtimeSessionId !== runtimeSessionId) continue;
        resolvedId = candidateId;
        session = candidate;
        break;
      }
    }
    if (!session) return;
    if (session.name === name2) return;
    this.setSession(resolvedId, {
      ...session,
      name: name2,
    });
  }
  /**
   * Set a user-defined display name for a session.
   * Passing an empty string clears the override (reverts to server name).
   */
  setSessionDisplayName(sessionId, displayName2) {
    const session = this.state.sessions.get(sessionId);
    if (!session) return;
    const next2 = displayName2.trim() || void 0;
    if (session.displayName === next2) return;
    this.setSession(sessionId, {
      ...session,
      displayName: next2,
    });
  }
  /**
   * Store the OpenCode runtime session ID on a session. Tab persistence
   * uses this stable ID instead of the ephemeral 8-char UUID so that
   * persisted tabs survive app restarts.
   */
  setRuntimeSessionId(uiSessionId, runtimeSessionId) {
    const session = this.state.sessions.get(uiSessionId);
    if (!session) return;
    if (session.runtimeSessionId === runtimeSessionId) return;
    this.setSession(uiSessionId, {
      ...session,
      runtimeSessionId,
    });
  }
  // --------------------------------------------------------
  // Server-pushed session list
  // --------------------------------------------------------
  /**
   * Reconcile local session state with the server's authoritative list.
   *
   * **Call-site contract**: this method MUST only be invoked in response to
   * a `session_list` message from the gateway — i.e. on initial connect,
   * workspace switch, or WS reconnect. In all these cases the previous WS
   * connection (and its SSE bridges) is already dead, so `busy` and
   * `pendingReasons` from the prior cycle are stale and force-reset here.
   *
   * Behaviour:
   * 1. Adds sessions that exist on the server but not locally.
   * 2. Updates metadata for sessions that exist in both; force-resets `busy`
   *    and `pendingReasons` to avoid orphaned "in-flight" state after
   *    reconnect (fixes #7: pre-login send → post-login no AI reply).
   * 3. Drops every local-only session whose UI ID and runtimeSessionId are
   *    both absent from the server (e.g. stale short-UUID entries).
   * 4. Prunes `openedTabIds` and `focusedSessionId` for consistency.
   */
  reconcileServerSessions(sessions) {
    const next2 = new Map();
    const existingByRuntimeId = new Map();
    for (const [sessionId, session] of this.state.sessions) {
      if (session.runtimeSessionId) {
        existingByRuntimeId.set(session.runtimeSessionId, [sessionId, session]);
      }
    }
    const consumedExistingIds = new Set();
    for (const info2 of sessions) {
      let sessionId = info2.id;
      let existing = this.state.sessions.get(info2.id);
      const hasSelectionSnapshot = hasSelectedMediaModelsSnapshot(info2);
      if (!existing) {
        const runtimeAlias = existingByRuntimeId.get(info2.runtime_session_id ?? info2.id);
        if (runtimeAlias) {
          sessionId = runtimeAlias[0];
          existing = runtimeAlias[1];
        }
      }
      if (existing && consumedExistingIds.has(sessionId)) continue;
      if (!existing) {
        next2.set(sessionId, {
          id: sessionId,
          runtimeSessionId: info2.runtime_session_id,
          name: resolveReconciledSessionName(info2),
          messages: [],
          userAttentionRevision: 0,
          busy: false,
          hasUnread: false,
          createdAt: info2.created_at,
          folder: info2.folder,
          modelId: info2.model_id,
          selectedMediaModels: info2.selected_media_models,
          origin: info2.origin,
          pendingReasons: EMPTY_PENDING_REASONS,
        });
      } else {
        consumedExistingIds.add(sessionId);
        next2.set(sessionId, {
          ...existing,
          name: resolveReconciledSessionName(info2, existing.name),
          displayName: existing.displayName,
          createdAt: info2.created_at || existing.createdAt,
          folder: info2.folder ?? existing.folder,
          modelId: info2.model_id ?? existing.modelId,
          runtimeSessionId: info2.runtime_session_id ?? existing.runtimeSessionId,
          selectedMediaModels: hasSelectionSnapshot
            ? info2.selected_media_models
            : existing.selectedMediaModels,
          origin: info2.origin ?? existing.origin,
          busy: false,
          pendingReasons: EMPTY_PENDING_REASONS,
        });
      }
    }
    let nextOrder = this.state.openedTabOrder;
    let nextOpened = this.state.openedTabIds;
    const hasStale = this.state.openedTabOrder.some((id2) => !next2.has(id2));
    if (hasStale) {
      nextOrder = this.state.openedTabOrder.filter((id2) => next2.has(id2));
      nextOpened = this.deriveOpenedTabIds(nextOrder);
    }
    const focusedId =
      this.state.focusedSessionId && next2.has(this.state.focusedSessionId)
        ? this.state.focusedSessionId
        : null;
    this.setState({
      sessions: next2,
      focusedSessionId: focusedId,
      openedTabOrder: nextOrder,
      openedTabIds: nextOpened,
    });
  }
  // --------------------------------------------------------
  // File change notification
  // --------------------------------------------------------
  fileChangeListeners = new Set();
  /** Subscribe to file-changed events (e.g. for file panel refresh) */
  onFileChanged(listener) {
    this.fileChangeListeners.add(listener);
    return () => this.fileChangeListeners.delete(listener);
  }
  /** Notify that generated files have changed on disk */
  notifyFileChanged() {
    for (const listener of this.fileChangeListeners) {
      listener();
    }
  }
  // --------------------------------------------------------
  // Canvas update notification
  // --------------------------------------------------------
  canvasUpdateListeners = new Set();
  /** Subscribe to canvas_updated events (e.g. for incremental canvas refresh) */
  onCanvasUpdated(listener) {
    this.canvasUpdateListeners.add(listener);
    return () => this.canvasUpdateListeners.delete(listener);
  }
  /** Notify that canvas data has been updated */
  notifyCanvasUpdated(update2) {
    for (const listener of this.canvasUpdateListeners) {
      listener(update2);
    }
  }
  // --------------------------------------------------------
  // Plugin storage invalidation notification
  // --------------------------------------------------------
  pluginStorageChangeListeners = new Set();
  /** Subscribe to durable per-node plugin KV invalidations from the gateway. */
  onPluginStorageChanged(listener) {
    this.pluginStorageChangeListeners.add(listener);
    return () => this.pluginStorageChangeListeners.delete(listener);
  }
  /** Notify mounted plugin hosts without routing the change through canvas state. */
  notifyPluginStorageChanged(update2) {
    for (const listener of this.pluginStorageChangeListeners) {
      listener(update2);
    }
  }
  // --------------------------------------------------------
  // Plugin agent invoke notification
  // --------------------------------------------------------
  pluginAgentInvokeListeners = new Set();
  /** Subscribe to gateway-originated plugin-agent capability invokes. */
  onPluginAgentInvoke(listener) {
    this.pluginAgentInvokeListeners.add(listener);
    return () => this.pluginAgentInvokeListeners.delete(listener);
  }
  /** Fan one invoke out to mounted plugin hosts (filtered by nodeId there). */
  notifyPluginAgentInvoke(invoke) {
    for (const listener of this.pluginAgentInvokeListeners) {
      listener(invoke);
    }
  }
  // --------------------------------------------------------
  // Canvas focus notification (viewport command)
  // --------------------------------------------------------
  canvasFocusListeners = new Set();
  /** Subscribe to canvas_focus events (viewport pan/zoom commands from MCP) */
  onCanvasFocus(listener) {
    this.canvasFocusListeners.add(listener);
    return () => this.canvasFocusListeners.delete(listener);
  }
  /** Notify renderer to bring the listed nodes into view */
  notifyCanvasFocus(payload) {
    for (const listener of this.canvasFocusListeners) {
      listener(payload);
    }
  }
  // --------------------------------------------------------
  // Canvas node-generating notification (cross-process spinner bridge)
  //
  // Wakes the renderer's `generatingStateStore` for nodes whose
  // re-generation was kicked off by the gateway (currently only
  // `canvas_execute_group` MCP tool). Popover submits and the renderer's
  // own `useGroupExecution` already mark the store directly in-process;
  // this listener exists so gateway-initiated runs can drive the same
  // spinner UI without duplicating zustand state on the gateway side.
  // --------------------------------------------------------
  canvasNodeGeneratingListeners = new Set();
  /** Subscribe to canvas_node_generating events (mark / clear bridge). */
  onCanvasNodeGenerating(listener) {
    this.canvasNodeGeneratingListeners.add(listener);
    return () => this.canvasNodeGeneratingListeners.delete(listener);
  }
  /** Fan out a mark/clear instruction to every subscriber. */
  notifyCanvasNodeGenerating(payload) {
    for (const listener of this.canvasNodeGeneratingListeners) {
      listener(payload);
    }
  }
  // --------------------------------------------------------
  // Plugin editor open notification (programmatic open command)
  // --------------------------------------------------------
  pluginEditorOpenListeners = new Set();
  /** Subscribe to plugin_editor_open events (programmatic editor launch from MCP) */
  onPluginEditorOpen(listener) {
    this.pluginEditorOpenListeners.add(listener);
    return () => this.pluginEditorOpenListeners.delete(listener);
  }
  /** Notify renderer to open a launcher-mode plugin node's editor surface */
  notifyPluginEditorOpen(payload) {
    for (const listener of this.pluginEditorOpenListeners) {
      listener(payload);
    }
  }
  // --------------------------------------------------------
  // Asset change notification
  // --------------------------------------------------------
  assetChangeListeners = new Set();
  /** Subscribe to asset_changed events (e.g. for auto-refreshing resource panel) */
  onAssetChanged(listener) {
    this.assetChangeListeners.add(listener);
    return () => this.assetChangeListeners.delete(listener);
  }
  /** Notify that asset data has changed */
  notifyAssetChanged(event) {
    for (const listener of this.assetChangeListeners) {
      listener(event);
    }
  }
  // --------------------------------------------------------
  // Session completion notification (pub/sub for task tracking)
  // --------------------------------------------------------
  sessionCompletedListeners = new Set();
  /** Subscribe to session completion events (session_idle / session_error). */
  onSessionCompleted(listener) {
    this.sessionCompletedListeners.add(listener);
    return () => this.sessionCompletedListeners.delete(listener);
  }
  /** Notify that a session has finished (agent stopped running). */
  notifySessionCompleted(sessionId) {
    for (const listener of this.sessionCompletedListeners) {
      listener(sessionId);
    }
  }
  /** Reset store (e.g. on disconnect) */
  reset() {
    this.withdrawals.reset();
    this.setState({
      sessions: new Map(),
      focusedSessionId: null,
      openedTabOrder: EMPTY_OPENED_TAB_ORDER,
      openedTabIds: EMPTY_OPENED_TABS,
    });
  }
}
