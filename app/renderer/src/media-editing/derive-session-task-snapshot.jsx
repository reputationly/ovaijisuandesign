// derive-session-task-snapshot.jsx
import {
  clearDraft,
  DRAFT_TTL_MS,
  HOME_DRAFT_SESSION_KEY,
  HOME_DRAFT_WORKSPACE,
  invalidatePendingHomeHandoff,
  KEY_PREFIX,
  PENDING_HOME_HANDOFF_KEY,
  readEnvelope,
  removeKey,
} from "../assets/read-envelope.js";
import reactExports from "react";
import {
  GlobalSidebarContext,
  RECENT_WORKSPACES_REFRESH_EVENT,
} from "../workspace/set-home-widget-dev-preview-mode.js";
import { __jsx } from "../shared/jsx-runtime.js";

const LINEAR_STARTUP_PHASES = [
  "inactive",
  "starting",
  "ready",
  "restored",
  "running",
];

new Set(LINEAR_STARTUP_PHASES);

const SUCCESS_STATES = new Set(["bound"]);

export function isReadyState(sessionState) {
  return SUCCESS_STATES.has(sessionState);
}

export function isGatewayReady(gatewayState) {
  return gatewayState === "gateway-ready" || gatewayState === "opencode-starting" || gatewayState === "bound";
}

export function requestRecentWorkspacesRefresh() {
  window.dispatchEvent(new Event(RECENT_WORKSPACES_REFRESH_EVENT));
}

export const GLOBAL_SIDEBAR_PREVIEW_EDGE_HIT_WIDTH = 8;

export function useGlobalSidebar() {
  const value = reactExports.useContext(GlobalSidebarContext);
  if (!value)
    throw new Error(
      "useGlobalSidebar must be used within GlobalSidebarProvider",
    );
  return value;
}

export function pruneExpiredDrafts(now = Date.now()) {
  let keys;
  try {
    keys = [];
    for (let index = 0; index < localStorage.length; index++) {
      const storageKey = localStorage.key(index);
      if (storageKey?.startsWith(`${KEY_PREFIX}:`)) {
        keys.push(storageKey);
      }
    }
  } catch {
    return;
  }
  for (const key of keys) {
    const envelope = readEnvelope(key);
    if (!envelope || now - envelope.savedAt > DRAFT_TTL_MS) {
      removeKey(key);
    }
  }
}

function readPendingHomeHandoff() {
  try {
    const raw = localStorage.getItem(PENDING_HOME_HANDOFF_KEY);
    if (!raw) return void 0;
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value))
      return void 0;
    const operationId = value.operationId;
    return typeof operationId === "string" && operationId.length > 0
      ? {
          operationId,
        }
      : void 0;
  } catch {
    return void 0;
  }
}

export function acknowledgeHomeDraftHandoff(operationId) {
  if (readPendingHomeHandoff()?.operationId !== operationId) return false;
  clearDraft(HOME_DRAFT_WORKSPACE, HOME_DRAFT_SESSION_KEY);
  invalidatePendingHomeHandoff();
  return true;
}

const CONFIRMATION_REASON_KINDS = new Set([
  "loop_guard_ask",
  "tool_confirm_ask",
]);

function isUnresolvedAnswerRequest(message) {
  if (message.type === "question" || message.type === "interact")
    return !message.resolved;
  return false;
}

function isUnresolvedConfirmation(message) {
  // 4.0.3：loop_guard_ask 这类消息被移除了（防死循环确认整块下线），这里不再判它。
  if (message.type === "confirm") return !message.resolved;
  if (message.type === "tool_confirm_ask")
    return !message.resolved && message.expired !== true;
  return false;
}

function deriveSessionTaskSnapshot(input) {
  let confirmationActionId;
  for (let index = input.messages.length - 1; index >= 0; index -= 1) {
    const message = input.messages[index];
    if (isUnresolvedAnswerRequest(message)) {
      return {
        status: "needs-answer",
        userActionId: `${message.type}:${message.requestId ?? message.id}`,
      };
    }
    if (!confirmationActionId && isUnresolvedConfirmation(message)) {
      confirmationActionId = `${message.type}:${message.requestId ?? message.id}`;
    }
  }
  if (confirmationActionId) {
    return {
      status: "needs-confirmation",
      userActionId: confirmationActionId,
    };
  }
  for (let index = input.pendingReasons.length - 1; index >= 0; index -= 1) {
    const reason = input.pendingReasons[index];
    if (CONFIRMATION_REASON_KINDS.has(reason.kind)) {
      return {
        status: "needs-confirmation",
        userActionId: `${reason.kind}:${reason.id}`,
      };
    }
  }
  return {
    status: input.busy || input.pendingReasons.length > 0 ? "running" : "idle",
  };
}

export function deriveSessionTaskStatus(input) {
  return deriveSessionTaskSnapshot(input).status;
}

export class SessionTaskSnapshotCache {
  entries = new Map();
  get(input) {
    const cached = this.entries.get(input.sessionId);
    if (
      cached?.userAttentionRevision === input.userAttentionRevision &&
      cached.messageCount === input.messages.length &&
      cached.busy === input.busy &&
      cached.pendingReasons === input.pendingReasons
    ) {
      return cached.snapshot;
    }
    const snapshot = deriveSessionTaskSnapshot(input);
    this.entries.set(input.sessionId, {
      userAttentionRevision: input.userAttentionRevision,
      messageCount: input.messages.length,
      busy: input.busy,
      pendingReasons: input.pendingReasons,
      snapshot,
    });
    return snapshot;
  }
  retain(sessionIds) {
    for (const sessionId of this.entries.keys()) {
      if (!sessionIds.has(sessionId)) this.entries.delete(sessionId);
    }
  }
}

export function RemoteToolDialogShell({ width, height, children }) {
  return (
    <div
      className={
        width || height
          ? "elevated-surface-border relative z-10 flex flex-col overflow-hidden bg-popover shadow-2xl"
          : "elevated-surface-border relative z-10 flex h-[80vh] w-[80vw] max-w-5xl flex-col overflow-hidden bg-popover shadow-2xl"
      }
      style={
        width || height
          ? {
              width: width ? `${width}px` : "80vw",
              height: height ? `${height}px` : "80vh",
              maxWidth: "none",
              maxHeight: "90vh",
            }
          : void 0
      }
    >
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
