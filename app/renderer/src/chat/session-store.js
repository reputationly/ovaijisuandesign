// session-store.js
import { DEFAULT_SESSION_NAME } from "../canvas/fullscreen-icon.jsx";
import { measurePerf } from "../vendor.js";
import { PERF_STORE_NOTIFY } from "../generation/to-workspace-browser-url.js";

class MessageWithdrawals {
  partIds = new Map();
  sessions = new Map();
  has(sessionId, runtimeMessageId) {
    return this.sessions.get(sessionId)?.has(runtimeMessageId) ?? false;
  }
  rememberPart(sessionId, partId, runtimeMessageId) {
    if (!this.has(sessionId, runtimeMessageId)) return;
    let ids = this.partIds.get(sessionId);
    if (!ids) {
      ids = new Set();
      this.partIds.set(sessionId, ids);
    }
    ids.add(partId);
  }
  hasPart(sessionId, partId) {
    return this.partIds.get(sessionId)?.has(partId) ?? false;
  }
  add({ sessionId, runtimeMessageId, reason }) {
    if (
      !sessionId ||
      !runtimeMessageId ||
      this.has(sessionId, runtimeMessageId)
    )
      return void 0;
    let messages = this.sessions.get(sessionId);
    if (!messages) {
      messages = new Map();
      this.sessions.set(sessionId, messages);
    }
    const placeholder = {
      id: `withdrawn:${sessionId}:${runtimeMessageId}`,
      type: "withdrawn",
      role: "agent",
      content: "",
      runtimeMessageId,
      reason,
    };
    messages.set(runtimeMessageId, placeholder);
    return placeholder;
  }
  project(sessionId, messages) {
    for (const message of messages) {
      if (message.type === "withdrawn") {
        this.add({
          sessionId,
          runtimeMessageId: message.runtimeMessageId,
          reason: message.reason,
        });
      }
    }
    const withdrawals = this.sessions.get(sessionId);
    if (!withdrawals?.size) return messages;
    const seen = new Set();
    const result = [];
    for (const message of messages) {
      const target =
        message.role === "agent" && message.runtimeMessageId
          ? withdrawals.get(message.runtimeMessageId)
          : void 0;
      if (!target) {
        result.push(message);
        continue;
      }
      if (message.partId)
        this.rememberPart(sessionId, message.partId, target.runtimeMessageId);
      if (!seen.has(target.runtimeMessageId)) {
        result.push(target);
        seen.add(target.runtimeMessageId);
      }
    }
    return result.length === messages.length &&
      result.every((message, messageIndex) => message === messages[messageIndex])
      ? messages
      : result;
  }
  rekeySession(fromId, toId) {
    const source = this.sessions.get(fromId);
    if (source)
      this.sessions.set(
        toId,
        new Map([...(this.sessions.get(toId) ?? []), ...source]),
      );
    const parts = this.partIds.get(fromId);
    if (parts)
      this.partIds.set(
        toId,
        new Set([...(this.partIds.get(toId) ?? []), ...parts]),
      );
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

function isDefaultSessionName(sessionName) {
  return sessionName === DEFAULT_SESSION_NAME;
}

function getIncomingSessionName(info) {
  if (info.display_name && !isDefaultSessionName(info.display_name))
    return info.display_name;
  if (info.name && !isDefaultSessionName(info.name)) return info.name;
  return info.display_name || info.name || DEFAULT_SESSION_NAME;
}

function resolveReconciledSessionName(info, existingName) {
  const incomingName = getIncomingSessionName(info);
  if (
    existingName &&
    !isDefaultSessionName(existingName) &&
    isDefaultSessionName(incomingName)
  ) {
    return existingName;
  }
  return incomingName;
}

function hasSelectedMediaModelsSnapshot(info) {
  return Object.hasOwn(info, "selected_media_models");
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
    const startedAt = performance.now();
    for (const listener of this.listeners) {
      listener(this.state);
    }
    const focusedSession = this.state.focusedSessionId
      ? this.state.sessions.get(this.state.focusedSessionId)
      : void 0;
    measurePerf(
      PERF_STORE_NOTIFY,
      startedAt,
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
  setState(next) {
    this.state = next;
    this.notify();
  }
  /** Replace a single session immutably */
  setSession(sessionId, session) {
    const next = new Map(this.state.sessions);
    next.set(sessionId, session);
    this.setState({
      ...this.state,
      sessions: next,
    });
  }
  /** Derive an openedTabIds Set from the canonical ordered array. */
  deriveOpenedTabIds(order) {
    return order.length === 0 ? EMPTY_OPENED_TABS : new Set(order);
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
    for (const [sessionId, session] of this.state.sessions) {
      result.push({
        id: sessionId,
        runtime_session_id: session.runtimeSessionId,
        name: session.displayName || session.name,
        created_at: session.createdAt ?? "",
        message_count: session.messages.length,
        active: sessionId === this.state.focusedSessionId,
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
    sessionId,
    sessionName,
    folder,
    modelId,
    createdAt,
    displayName,
    selectedMediaModels,
    initialMessages,
    origin,
    options,
  ) {
    const next = new Map(this.state.sessions);
    const existing = next.get(sessionId);
    next.set(sessionId, {
      id: sessionId,
      name: displayName || sessionName,
      messages: this.projectMessages(
        sessionId,
        initialMessages ? [...initialMessages] : [],
      ),
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
        ? this.state.openedTabOrder.filter((tabId) => tabId !== sessionId)
        : this.state.openedTabIds.has(sessionId)
          ? this.state.openedTabOrder
          : [...this.state.openedTabOrder, sessionId];
    let evictedId = null;
    if (
      options?.openTab !== false &&
      nextOrder.length > SessionStore.OPENED_TAB_CAP
    ) {
      evictedId =
        this.findEvictableTabId(new Set([this.state.focusedSessionId, sessionId])) ??
        this.state.openedTabOrder[0] ??
        null;
      if (evictedId)
        nextOrder = nextOrder.filter((tabId) => tabId !== evictedId);
    }
    this.setState({
      sessions: next,
      focusedSessionId:
        options?.focus === false ? this.state.focusedSessionId : sessionId,
      openedTabOrder: nextOrder,
      openedTabIds: this.deriveOpenedTabIds(nextOrder),
    });
    if (evictedId) this.notifyTabEvicted(evictedId);
  }
  updateModelId(sessionId, modelId) {
    const session = this.state.sessions.get(sessionId);
    if (!session) return;
    const next = new Map(this.state.sessions);
    next.set(sessionId, {
      ...session,
      modelId,
    });
    this.setState({
      ...this.state,
      sessions: next,
    });
  }
  /**
   * Replace a session's media model whitelist (handler for
   * `ServerSelectedMediaModelsUpdated` and as part of `switchSession`).
   * Pass `undefined` to clear (Auto for every category).
   */
  setSelectedMediaModels(sessionId, selectedMediaModels) {
    const session = this.state.sessions.get(sessionId);
    if (!session) return;
    this.setSession(sessionId, {
      ...session,
      selectedMediaModels,
    });
  }
  /**
   * Mark whether the latest hydration failed to load history from OpenCode.
   * `true` keeps the current transcript but tells the UI it is not
   * authoritative; `false` clears the degraded state after a successful load.
   */
  setHistoryLoadFailed(sessionId, failed) {
    const session = this.state.sessions.get(sessionId);
    if (!session) return;
    if ((session.historyLoadFailed ?? false) === failed) return;
    this.setSession(sessionId, {
      ...session,
      historyLoadFailed: failed,
    });
  }
  switchSession(sessionId, messages, folder, modelId, selectedMediaModels, options) {
    this.applySessionSnapshot(
      sessionId,
      messages,
      folder,
      modelId,
      selectedMediaModels,
      options,
      true,
    );
  }
  /**
   * Install a full session snapshot without changing visible focus.
   *
   * Used by reconnect/background hydration and stale switch responses. The
   * session's history/runtime metadata remains available when the user later
   * focuses the tab, while the current transcript and send target stay stable.
   */
  hydrateSession(
    sessionId,
    messages,
    folder,
    modelId,
    selectedMediaModels,
    options,
  ) {
    this.applySessionSnapshot(
      sessionId,
      messages,
      folder,
      modelId,
      selectedMediaModels,
      options,
      false,
    );
  }
  /** Change visible focus without reloading or replacing session history. */
  focusSession(sessionId) {
    this.applySessionSnapshot(
      sessionId,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      true,
    );
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
      runtimeSessionId:
        target?.runtimeSessionId ?? source.runtimeSessionId ?? toId,
    });
    const openedTabOrder = [
      ...new Set(
        this.state.openedTabOrder.map((sessionId) =>
          sessionId === fromId ? toId : sessionId,
        ),
      ),
    ];
    this.setState({
      ...this.state,
      sessions,
      openedTabOrder,
      openedTabIds: this.deriveOpenedTabIds(openedTabOrder),
      focusedSessionId:
        this.state.focusedSessionId === fromId
          ? toId
          : this.state.focusedSessionId,
    });
  }
  applySessionSnapshot(
    sessionId,
    messages,
    folder,
    modelId,
    selectedMediaModels,
    options,
    shouldFocus,
  ) {
    const session = this.state.sessions.get(sessionId);
    if (!session) return;
    const hasSelectedMediaModelsSnapshot =
      options?.selectedMediaModelsSnapshot === true;
    const shouldInstallMessages =
      options?.replaceMessages === true ||
      Boolean(
        messages && messages.length > 0 && session.messages.length === 0,
      );
    const needsUpdate =
      (shouldFocus && session.hasUnread) ||
      shouldInstallMessages ||
      folder ||
      modelId ||
      hasSelectedMediaModelsSnapshot;
    if (needsUpdate) {
      const next = new Map(this.state.sessions);
      next.set(sessionId, {
        ...session,
        ...(shouldFocus
          ? {
              hasUnread: false,
            }
          : {}),
        ...(shouldInstallMessages
          ? {
              messages: this.projectMessages(sessionId, messages ?? []),
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
        ...(hasSelectedMediaModelsSnapshot
          ? {
              selectedMediaModels,
            }
          : {}),
      });
      this.setState({
        ...this.state,
        sessions: next,
        ...(shouldFocus
          ? {
              focusedSessionId: sessionId,
            }
          : {}),
      });
    } else if (shouldFocus) {
      this.setState({
        ...this.state,
        focusedSessionId: sessionId,
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
  removeSession(sessionId) {
    this.withdrawals.removeSession(sessionId);
    const next = new Map(this.state.sessions);
    next.delete(sessionId);
    const nextOrder = this.state.openedTabOrder.filter(
      (tabId) => tabId !== sessionId,
    );
    let nextFocusedId = this.state.focusedSessionId;
    if (nextFocusedId === sessionId) {
      nextFocusedId = nextOrder[0] ?? null;
    }
    this.setState({
      ...this.state,
      sessions: next,
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
    const candidates = this.state.openedTabOrder.filter(
      (tabId) => !excludeIds.has(tabId),
    );
    let runningFallback = null;
    for (const tabId of candidates) {
      const session = this.state.sessions.get(tabId);
      const pending = session?.pendingReasons ?? EMPTY_PENDING_REASONS;
      if (pending.some((pendingReason) => NEEDS_USER_ACTION_KINDS.has(pendingReason.kind))) continue;
      const running = (session?.busy ?? false) || pending.length > 0;
      if (!running) return tabId;
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
  openTab(sessionId) {
    if (this.state.openedTabIds.has(sessionId))
      return {
        evictedId: null,
      };
    let nextOrder = [...this.state.openedTabOrder, sessionId];
    let evictedId = null;
    if (nextOrder.length > SessionStore.OPENED_TAB_CAP) {
      evictedId =
        this.findEvictableTabId(new Set([this.state.focusedSessionId, sessionId])) ??
        this.state.openedTabOrder[0] ??
        null;
      if (evictedId)
        nextOrder = nextOrder.filter((tabId) => tabId !== evictedId);
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
      this.findEvictableTabId(
        new Set([this.state.focusedSessionId, excludeId]),
      ) ??
      this.state.openedTabOrder.find((tabId) => tabId !== excludeId) ??
      null;
    if (!evictedId)
      return {
        evictedId: null,
      };
    const nextOrder = this.state.openedTabOrder.filter(
      (tabId) => tabId !== evictedId,
    );
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
  closeTab(sessionId) {
    if (!this.state.openedTabIds.has(sessionId)) return null;
    const prevOrder = this.state.openedTabOrder;
    const previousTabIndex = prevOrder.indexOf(sessionId);
    const nextOrder = prevOrder.filter((tabId) => tabId !== sessionId);
    const wasFocused = this.state.focusedSessionId === sessionId;
    let nextFocusedId = this.state.focusedSessionId;
    if (wasFocused) {
      nextFocusedId = nextOrder[previousTabIndex] ?? nextOrder[previousTabIndex - 1] ?? null;
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
    const next = reasons.length === 0 ? EMPTY_PENDING_REASONS : reasons;
    if (session.pendingReasons === next) return;
    this.setSession(sessionId, {
      ...session,
      pendingReasons: next,
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
    const nextMessages = this.projectMessages(
      sessionId,
      updater(session.messages),
    );
    const nextHasUnread = isNonFocused ? true : session.hasUnread;
    if (
      nextMessages === session.messages &&
      nextHasUnread === session.hasUnread
    ) {
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
  projectMessages(sessionId, messages) {
    return this.withdrawals.project(sessionId, messages);
  }
  withdrawMessage(request) {
    const session = this.state.sessions.get(request.sessionId);
    if (!session) return false;
    const placeholder = this.withdrawals.add(request);
    if (!placeholder) return false;
    this.setSession(request.sessionId, {
      ...session,
      // Include a placeholder even if the safety event preceded the first part.
      messages: this.projectMessages(request.sessionId, [
        ...session.messages,
        placeholder,
      ]).filter(
        (message) =>
          message.type !== "compaction_status" ||
          message.content === "compacted",
      ),
      busy: false,
      hasUnread:
        session.hasUnread || request.sessionId !== this.state.focusedSessionId,
      userAttentionRevision: session.userAttentionRevision + 1,
    });
    return true;
  }
  /** Convenience: push a new message to a session */
  pushMessage(message, sessionId) {
    this.updateMessages(sessionId, (prev) => [...prev, message]);
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
      (message) =>
        message.type === "tool" &&
        message.content === "task" &&
        (message.toolStatus === "pending" || message.toolStatus === "running"),
    );
    if (!hasPending) return;
    this.updateMessages(sessionId, (prev) =>
      prev.map((message) =>
        message.type === "tool" &&
        message.content === "task" &&
        (message.toolStatus === "pending" || message.toolStatus === "running")
          ? {
              ...message,
              toolStatus: "error",
            }
          : message,
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
      (message) => message.type === "tool_confirm_ask" && !message.resolved,
    );
    if (!hasPending) return;
    this.updateMessages(
      sessionId,
      (prev) =>
        prev.map((message) =>
          message.type === "tool_confirm_ask" && !message.resolved
            ? {
                ...message,
                resolved: true,
                toolConfirmDecision: "reject",
              }
            : message,
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
    if (!session.messages.some((message) => message.id === messageId)) return;
    this.setSession(sessionId, {
      ...session,
      messages: session.messages.filter((message) => message.id !== messageId),
    });
  }
  /**
   * Rename an existing session.
   * No-op if the session does not exist or the name is unchanged.
   * Used by the gateway-pushed `session_renamed` event after a session's
   * first user message clears safety — the session is created with a
   * default "New Chat" name and renamed once the content is allowed.
   */
  renameSession(sessionId, sessionName, runtimeSessionId) {
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
    if (session.name === sessionName) return;
    this.setSession(resolvedId, {
      ...session,
      name: sessionName,
    });
  }
  /**
   * Set a user-defined display name for a session.
   * Passing an empty string clears the override (reverts to server name).
   */
  setSessionDisplayName(sessionId, displayName) {
    const session = this.state.sessions.get(sessionId);
    if (!session) return;
    const next = displayName.trim() || void 0;
    if (session.displayName === next) return;
    this.setSession(sessionId, {
      ...session,
      displayName: next,
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
    const next = new Map();
    const existingByRuntimeId = new Map();
    for (const [sessionId, session] of this.state.sessions) {
      if (session.runtimeSessionId) {
        existingByRuntimeId.set(session.runtimeSessionId, [sessionId, session]);
      }
    }
    const consumedExistingIds = new Set();
    for (const info of sessions) {
      let sessionId = info.id;
      let existing = this.state.sessions.get(info.id);
      const hasSelectionSnapshot = hasSelectedMediaModelsSnapshot(info);
      if (!existing) {
        const runtimeAlias = existingByRuntimeId.get(
          info.runtime_session_id ?? info.id,
        );
        if (runtimeAlias) {
          sessionId = runtimeAlias[0];
          existing = runtimeAlias[1];
        }
      }
      if (existing && consumedExistingIds.has(sessionId)) continue;
      if (!existing) {
        next.set(sessionId, {
          id: sessionId,
          runtimeSessionId: info.runtime_session_id,
          name: resolveReconciledSessionName(info),
          messages: [],
          userAttentionRevision: 0,
          busy: false,
          hasUnread: false,
          createdAt: info.created_at,
          folder: info.folder,
          modelId: info.model_id,
          selectedMediaModels: info.selected_media_models,
          origin: info.origin,
          pendingReasons: EMPTY_PENDING_REASONS,
        });
      } else {
        consumedExistingIds.add(sessionId);
        next.set(sessionId, {
          ...existing,
          name: resolveReconciledSessionName(info, existing.name),
          displayName: existing.displayName,
          createdAt: info.created_at || existing.createdAt,
          folder: info.folder ?? existing.folder,
          modelId: info.model_id ?? existing.modelId,
          runtimeSessionId:
            info.runtime_session_id ?? existing.runtimeSessionId,
          selectedMediaModels: hasSelectionSnapshot
            ? info.selected_media_models
            : existing.selectedMediaModels,
          origin: info.origin ?? existing.origin,
          busy: false,
          pendingReasons: EMPTY_PENDING_REASONS,
        });
      }
    }
    let nextOrder = this.state.openedTabOrder;
    let nextOpened = this.state.openedTabIds;
    const hasStale = this.state.openedTabOrder.some((sessionId) => !next.has(sessionId));
    if (hasStale) {
      nextOrder = this.state.openedTabOrder.filter((sessionId) => next.has(sessionId));
      nextOpened = this.deriveOpenedTabIds(nextOrder);
    }
    const focusedId =
      this.state.focusedSessionId && next.has(this.state.focusedSessionId)
        ? this.state.focusedSessionId
        : null;
    this.setState({
      sessions: next,
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
  notifyCanvasUpdated(update) {
    for (const listener of this.canvasUpdateListeners) {
      listener(update);
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
  notifyPluginStorageChanged(update) {
    for (const listener of this.pluginStorageChangeListeners) {
      listener(update);
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
