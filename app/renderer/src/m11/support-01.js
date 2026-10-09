// support-01.js
import { chatLog, ChatDiagnostics } from "../vendor.js";
import { cachedTextEditSessionBindings } from "./use-session-list-retry.js";
export const chatDiagnostics = new ChatDiagnostics((line) => chatLog.info(line));
export const MESSAGE_DELIVERY_TRACE_LIMIT = 50;
export const DOCUMENT_EDIT_SUBMISSION_LIMIT = 50;
export const SAFE_WARM_SESSION_INTERVAL_MS = 6e4;
export const SAFE_WARM_SESSION_KEEP_COUNT = 80;
export const SAFE_WARM_SESSION_MIN_PART_COUNT = 160;
export const SAFE_WARM_SESSION_FLAG = "hilo.chat.safeWarmSessions.enabled";
export const SAFE_COLD_SESSION_INTERVAL_MS = 5 * 6e4;
export const SAFE_COLD_SESSION_MIN_PART_COUNT = 320;
export const SAFE_COLD_SESSION_FLAG = "hilo.chat.safeColdSessions.enabled";
export const SESSION_CREATE_TIMEOUT_MS = 1e4;
const TEXT_EDIT_BINDING_LOAD_TIMEOUT_MS = 5e3;
export const TEXT_EDIT_SESSION_REQUEST_TIMEOUT_MS = 3e4;
export const HISTORY_RELOAD_TIMEOUT_MS = 1e4;
export const RENDERER_IDLE_BUSY_MISMATCH_MS = 3e3;
export const INITIAL_PAYLOAD_HYDRATION_TIMEOUT_MS = 15e3;
export function loadTextEditBindingsWithFallback(persister, workspaceKey) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer2);
      resolve(result);
    };
    const timer2 = setTimeout(() => {
      finish({
        bindings: cachedTextEditSessionBindings(workspaceKey),
        fallbackReason: "timeout",
      });
    }, TEXT_EDIT_BINDING_LOAD_TIMEOUT_MS);
    void persister.load(workspaceKey).then(
      (bindings) =>
        finish({
          bindings,
        }),
      () =>
        finish({
          bindings: cachedTextEditSessionBindings(workspaceKey),
          fallbackReason: "error",
        }),
    );
  });
}
export function textEditTransactionId(editor) {
  return `${editor.nodeId}${editor.editSessionId}`;
}
export function textEditNodeDraftKey(nodeId) {
  return `__text_edit_node__:${nodeId}`;
}
export function sameTextEditSession(a2, b3) {
  return a2.nodeId === b3.nodeId && a2.editSessionId === b3.editSessionId;
}
