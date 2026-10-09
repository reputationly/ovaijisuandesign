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
import { reactExports } from "../vendor.js";
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

export function isReadyState(s2) {
  return SUCCESS_STATES.has(s2);
}

export function isGatewayReady(s2) {
  return s2 === "gateway-ready" || s2 === "opencode-starting" || s2 === "bound";
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

export function pruneExpiredDrafts(now2 = Date.now()) {
  let keys2;
  try {
    keys2 = [];
    for (let i2 = 0; i2 < localStorage.length; i2++) {
      const k2 = localStorage.key(i2);
      if (k2?.startsWith(`${KEY_PREFIX}:`)) {
        keys2.push(k2);
      }
    }
  } catch {
    return;
  }
  for (const key2 of keys2) {
    const envelope = readEnvelope(key2);
    if (!envelope || now2 - envelope.savedAt > DRAFT_TTL_MS) {
      removeKey(key2);
    }
  }
}

function readPendingHomeHandoff() {
  try {
    const raw2 = localStorage.getItem(PENDING_HOME_HANDOFF_KEY);
    if (!raw2) return void 0;
    const value = JSON.parse(raw2);
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

function isUnresolvedAnswerRequest(message2) {
  if (message2.type === "question" || message2.type === "interact")
    return !message2.resolved;
  return false;
}

function isUnresolvedConfirmation(message2) {
  if (message2.type === "confirm" || message2.type === "loop_guard_ask")
    return !message2.resolved;
  if (message2.type === "tool_confirm_ask")
    return !message2.resolved && message2.expired !== true;
  return false;
}

function deriveSessionTaskSnapshot(input) {
  let confirmationActionId;
  for (let index2 = input.messages.length - 1; index2 >= 0; index2 -= 1) {
    const message2 = input.messages[index2];
    if (isUnresolvedAnswerRequest(message2)) {
      return {
        status: "needs-answer",
        userActionId: `${message2.type}:${message2.requestId ?? message2.id}`,
      };
    }
    if (!confirmationActionId && isUnresolvedConfirmation(message2)) {
      confirmationActionId = `${message2.type}:${message2.requestId ?? message2.id}`;
    }
  }
  if (confirmationActionId) {
    return {
      status: "needs-confirmation",
      userActionId: confirmationActionId,
    };
  }
  for (let index2 = input.pendingReasons.length - 1; index2 >= 0; index2 -= 1) {
    const reason = input.pendingReasons[index2];
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
    const snapshot2 = deriveSessionTaskSnapshot(input);
    this.entries.set(input.sessionId, {
      userAttentionRevision: input.userAttentionRevision,
      messageCount: input.messages.length,
      busy: input.busy,
      pendingReasons: input.pendingReasons,
      snapshot: snapshot2,
    });
    return snapshot2;
  }
  retain(sessionIds) {
    for (const sessionId of this.entries.keys()) {
      if (!sessionIds.has(sessionId)) this.entries.delete(sessionId);
    }
  }
}

export function RemoteToolDialogShell({ width, height, children: children2 }) {
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
        {children2}
      </div>
    </div>
  );
}
