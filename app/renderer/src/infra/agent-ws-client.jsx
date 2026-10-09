// agent-ws-client.jsx
import {
  reactExports,
  getRuntimeConfig,
  instance,
  DialogTrigger$1,
  DialogPortal$2,
  DialogClose$1,
  HILO_WORKSPACE_IDENTITY_QUERY,
  HILO_WORKSPACE_INSTANCE_QUERY,
  HILO_WORKSPACE_GENERATION_QUERY,
  DEFAULT_RUNTIME_CONFIG,
  selectedRequestGroupId,
  normalizeGatewayBaseUrl,
  workspaceGatewayUrl,
  WorkspaceGatewayClient,
  withWorkspaceGatewayHeaders,
  isWorkspaceIdentityErrorCode,
  WORKSPACE_IDENTITY_MISMATCH_CODE,
  buildRendererCommonParams,
  GROUP_ID_HEADER,
  HILO_WORKSPACE_IDENTITY_HEADER,
  API_PATHS,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { actionTrailLog } from "../vendor-inline/vscode-base/graph.jsx";
import {
  ErrorCodes,
  FEEDBACK_CONSTRAINTS,
  WORKSPACE_IDENTITY_WS_CLOSE_CODE,
} from "../generation/push-inline.js";
import { ChatDiagnostics } from "../canvas/relayout-group-children.js";
import { getPlatform } from "./track-events.js";
export function getShortcutTokenKind(label) {
  const normalized = label.trim().toLowerCase();
  if (label === "⌘" || normalized === "cmd" || normalized === "command") return "command";
  if (label === "⌃" || normalized === "ctrl" || normalized === "control" || normalized === "win") {
    return "control";
  }
  if (label === "⌥" || normalized === "alt" || normalized === "option") return "option";
  if (label === "⇧" || normalized === "shift") return "shift";
  return "key";
}
export const IPC_CHANNELS = {
  APP_QUIT: "app:quit",
  // Deep Link
  DEEPLINK_RECEIVED: "deeplink:received",
  // Menu actions (main -> renderer)
  MENU_NEW_CHAT: "menu:new-chat",
  MENU_NEW_WORKSPACE: "menu:new-workspace",
  MENU_CLOSE_TAB: "menu:close-tab",
  MENU_OPEN_SETTINGS: "menu:open-settings",
  MENU_IMPORT_PROJECT: "menu:import-project",
  MENU_EXPORT_PROJECT: "menu:export-project",
  /** Application Help menu → Feedback. Renderer opens the structured
   *  FeedbackDialog with source='menu'. */
  MENU_OPEN_FEEDBACK: "menu:open-feedback",
  // Renderer DOM events (dispatched via window.dispatchEvent, NOT Electron IPC).
  // Listed here to avoid magic strings scattered across renderer components.
  /** Cancelable CustomEvent dispatched by the MENU_CLOSE_TAB handler.
   *  Focused components (e.g. SessionTabs) can preventDefault() to close a
   *  child tab instead of the workspace tab. */
  DOM_CLOSE_TAB: "hilo:close-tab",
};
export const listeners$a = new Set();
export const subscribe = (listener) => {
  listeners$a.add(listener);
  return () => listeners$a.delete(listener);
};
export function DialogTrigger({ ...props }) {
  return <DialogTrigger$1 data-slot="dialog-trigger" {...props} />;
}
export function DialogPortal({ ...props }) {
  return <DialogPortal$2 data-slot="dialog-portal" {...props} />;
}
export function DialogClose({ ...props }) {
  return <DialogClose$1 data-slot="dialog-close" {...props} />;
}
export function recordAction(message2, data2) {
  actionTrailLog.info(message2, data2);
}
export function recordNavigation(path2, data2) {
  actionTrailLog.info(`navigate: ${path2}`, data2);
}
const NOOP_WS_LOGGER = {
  info: () => {},
  warn: () => {},
  error: () => {},
};
const WS_LOG_TAG = "[AgentWSClient]";
export class AgentWSClient {
  ws = null;
  active = false;
  reconnectTimer = null;
  stableOpenTimer = null;
  reconnectAttempts = 0;
  nextReconnectDelay;
  _connected = false;
  url;
  workspaceClaim;
  workspaceBinding;
  onMessage;
  onConnectionChange;
  reconnectDelay;
  maxReconnectDelay;
  reconnectStableResetMs;
  maxReconnectAttempts;
  logger;
  onWorkspaceIdentityMismatch;
  onPersistentDisconnect;
  persistentDisconnectAttempts;
  diagnostics = new ChatDiagnostics((line) => this.logger.info(line));
  constructor(options) {
    this.url = options.url;
    this.workspaceBinding = options.workspaceBinding;
    this.workspaceClaim = options.workspaceBinding?.claim ?? options.workspaceClaim;
    this.onMessage = options.onMessage;
    this.onConnectionChange = options.onConnectionChange ?? (() => {});
    this.reconnectDelay = options.reconnectDelay ?? 2e3;
    this.nextReconnectDelay = this.reconnectDelay;
    this.maxReconnectDelay = options.maxReconnectDelay ?? 3e4;
    this.reconnectStableResetMs = options.reconnectStableResetMs ?? 1e4;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? Number.POSITIVE_INFINITY;
    this.logger = options.logger ?? NOOP_WS_LOGGER;
    this.onWorkspaceIdentityMismatch = options.onWorkspaceIdentityMismatch;
    this.onPersistentDisconnect = options.onPersistentDisconnect;
    this.persistentDisconnectAttempts = options.persistentDisconnectAttempts ?? 3;
  }
  get connected() {
    return this._connected;
  }
  /** Start the WebSocket connection */
  connect() {
    this.active = true;
    this.reconnectAttempts = 0;
    this.nextReconnectDelay = this.reconnectDelay;
    this.doConnect();
  }
  /** Gracefully close and stop reconnecting */
  disconnect() {
    this.active = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearStableOpenTimer();
    this.ws?.close();
    this.ws = null;
  }
  /**
   * Kick an immediate reconnect attempt, bypassing the current backoff timer.
   *
   * Intended for event-driven wakeups: the workspace shell mounts before the
   * per-workspace gateway is listening, so the first connect fails and would
   * otherwise sit out the full backoff window even after the gateway becomes
   * healthy. Callers invoke this when the gateway reports ready.
   *
   * No-op when disconnected intentionally, already connected, or a connection
   * attempt is already in flight (`this.ws` stays set from doConnect until
   * onclose). Does not reset the backoff schedule — if this attempt fails,
   * onclose continues the existing exponential backoff.
   */
  reconnectNow() {
    if (!this.active || this.ws) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.doConnect();
  }
  /** Send a client message */
  send(msg) {
    const trace = (outcome) => this.diagnostics.operation(msg, "sent", outcome);
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
        trace("submitted");
        return true;
      } catch (error) {
        trace("send-threw");
        throw error;
      }
    }
    trace("socket-not-open");
    return false;
  }
  /** Send raw data */
  sendRaw(data2) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data2);
      return true;
    }
    return false;
  }
  /**
   * Update the per-session media model whitelist.
   *
   * Takes effect on the NEXT outgoing message — current in-flight agent
   * execution is unaffected. Use empty arrays / omit a category to mean
   * Auto for that category.
   */
  updateSelectedMediaModels(sessionId, selectedMediaModels) {
    return this.send({
      type: "update_selected_media_models",
      session_id: sessionId,
      selected_media_models: selectedMediaModels,
    });
  }
  doConnect() {
    if (!this.active) return;
    const url2 = new URL(this.url);
    if (this.workspaceClaim) {
      url2.searchParams.set(HILO_WORKSPACE_IDENTITY_QUERY, this.workspaceClaim);
    }
    if (this.workspaceBinding) {
      url2.searchParams.set(HILO_WORKSPACE_INSTANCE_QUERY, this.workspaceBinding.instanceId);
      url2.searchParams.set(
        HILO_WORKSPACE_GENERATION_QUERY,
        String(this.workspaceBinding.generation),
      );
    }
    const ws2 = new WebSocket(url2.toString());
    this.ws = ws2;
    ws2.onopen = () => {
      if (!this.active) {
        ws2.close();
        return;
      }
      this._connected = true;
      if (AgentWSClient.isLogPoint(this.reconnectAttempts)) {
        this.logger.info(
          `${WS_LOG_TAG} connected to ${this.url} (after ${this.reconnectAttempts} retries)`,
        );
      }
      this.onConnectionChange(true);
      this.scheduleStableOpenReset();
    };
    ws2.onclose = (event) => {
      const ev = event;
      this._connected = false;
      this.ws = null;
      this.clearStableOpenTimer();
      this.onConnectionChange(false);
      if (ev?.code === WORKSPACE_IDENTITY_WS_CLOSE_CODE) {
        this.onWorkspaceIdentityMismatch?.();
      }
      if (this.active && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        if (
          this.onPersistentDisconnect &&
          this.persistentDisconnectAttempts > 0 &&
          this.reconnectAttempts % this.persistentDisconnectAttempts === 0
        ) {
          this.onPersistentDisconnect(this.reconnectAttempts);
        }
        let delay;
        if (ev?.code === WORKSPACE_IDENTITY_WS_CLOSE_CODE) {
          delay = this.maxReconnectDelay;
          this.nextReconnectDelay = this.maxReconnectDelay;
        } else {
          delay = this.nextReconnectDelay;
          this.nextReconnectDelay = Math.min(
            Math.max(this.reconnectDelay, this.nextReconnectDelay * 2),
            this.maxReconnectDelay,
          );
        }
        if (AgentWSClient.isLogPoint(this.reconnectAttempts)) {
          this.logger.warn(
            `${WS_LOG_TAG} closed (code=${ev?.code ?? "?"} reason=${ev?.reason || "none"} clean=${ev?.wasClean ?? "?"}); reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
          );
        }
        this.reconnectTimer = setTimeout(() => this.doConnect(), delay);
      } else if (this.active) {
        this.logger.error(
          `${WS_LOG_TAG} closed (code=${ev?.code ?? "?"} reason=${ev?.reason || "none"}); max reconnect attempts (${this.maxReconnectAttempts}) reached, giving up`,
        );
      }
    };
    ws2.onerror = () => {
      ws2.close();
    };
    ws2.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        const preview =
          typeof event.data === "string"
            ? event.data.slice(0, 200)
            : `<non-string: ${typeof event.data}>`;
        this.logger.warn(`${WS_LOG_TAG} dropped malformed JSON frame: ${preview}`);
        return;
      }
      try {
        this.onMessage(msg);
      } catch (err) {
        this.logger.error(
          `${WS_LOG_TAG} onMessage handler error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    };
  }
  scheduleStableOpenReset() {
    this.clearStableOpenTimer();
    this.stableOpenTimer = setTimeout(() => {
      this.reconnectAttempts = 0;
      this.nextReconnectDelay = this.reconnectDelay;
      this.stableOpenTimer = null;
    }, this.reconnectStableResetMs);
  }
  clearStableOpenTimer() {
    if (!this.stableOpenTimer) return;
    clearTimeout(this.stableOpenTimer);
    this.stableOpenTimer = null;
  }
  /**
   * Power-of-2 throttle (0, 1, 2, 4, 8, ...) for reconnect-storm logging.
   * A gateway outage can re-open/close the socket ~1800×/hour; gating logs
   * on this keeps a sustained storm to ~11 lines while preserving the attempt
   * count in the message. Mirrors the renderer ws-connection failedAttempts
   * throttle.
   */
  static isLogPoint(n2) {
    return (n2 & (n2 - 1)) === 0;
  }
}
export function buildWSUrl(url2) {
  return url2 ?? DEFAULT_RUNTIME_CONFIG.wsUrl;
}
const listeners$9 = new Set();
export const authExpiredBus = {
  on(listener) {
    listeners$9.add(listener);
    return () => {
      listeners$9.delete(listener);
    };
  },
  emit() {
    for (const fn2 of listeners$9) {
      try {
        fn2();
      } catch (err) {
        console.error("[auth-expired-bus] listener threw:", err);
      }
    }
  },
};
let lastTraceId = null;
function recordGatewayTraceId(traceId) {
  if (typeof traceId !== "string" || traceId.length === 0) return;
  lastTraceId = traceId;
}
export function getLastGatewayTraceId() {
  return lastTraceId;
}
function mintGatewayTraceId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export function getSelectedRequestGroupId() {
  return selectedRequestGroupId;
}
export class GatewayNotReadyError extends Error {
  constructor() {
    super("Gateway not ready");
    this.name = "GatewayNotReadyError";
  }
}
export class GatewayHttpError extends Error {
  status;
  method;
  path;
  code;
  details;
  /**
   * 后端 JSONErrorI18n 的 `user_message`：i18n 翻译后的用户友好文案（`message` 是 vendor raw，
   * 不适合直接展示给用户）。业务层展示错误时优先用它，缺失再 fallback 到本地 i18n key。
   */
  userMessage;
  constructor({ status, method, path: path2, detail, code: code2, details, userMessage }) {
    super(`Gateway ${method} ${path2} failed: ${status}${detail ? ` - ${detail}` : ""}`);
    this.name = "GatewayHttpError";
    this.status = status;
    this.method = method;
    this.path = path2;
    this.code = code2;
    this.details = details;
    this.userMessage = userMessage;
  }
}
class GatewayWorkspaceMismatchError extends Error {
  constructor() {
    super("Workspace gateway identity mismatch");
    this.name = "GatewayWorkspaceMismatchError";
  }
}
function getBaseUrl() {
  return normalizeGatewayBaseUrl(getRuntimeConfig().gatewayUrl);
}
export function withUrlSearchParams(url2, params) {
  const hashIndex = url2.indexOf("#");
  const hash2 = hashIndex >= 0 ? url2.slice(hashIndex) : "";
  const urlWithoutHash = hashIndex >= 0 ? url2.slice(0, hashIndex) : url2;
  const queryIndex = urlWithoutHash.indexOf("?");
  const path2 = queryIndex >= 0 ? urlWithoutHash.slice(0, queryIndex) : urlWithoutHash;
  const searchParams = new URLSearchParams(
    queryIndex >= 0 ? urlWithoutHash.slice(queryIndex + 1) : "",
  );
  for (const [key2, value] of Object.entries(params)) {
    if (value !== void 0) {
      searchParams.set(key2, String(value));
    }
  }
  const query = searchParams.toString();
  return `${path2}${query ? `?${query}` : ""}${hash2}`;
}
export function gatewayUrl(path2) {
  const base2 = getBaseUrl();
  return gatewayUrlFromBase(base2, path2);
}
export function gatewayUrlFromBase(baseUrl, path2, workspaceIdentity) {
  if (typeof workspaceIdentity === "object") {
    return workspaceGatewayUrl(workspaceIdentity, path2);
  }
  const base2 = normalizeGatewayBaseUrl(baseUrl);
  if (!base2) return void 0;
  const result = new URL(`${base2}${path2}`);
  if (workspaceIdentity) {
    result.searchParams.set(HILO_WORKSPACE_IDENTITY_QUERY, workspaceIdentity);
  }
  return result.toString();
}
export async function gatewayFetch(path2, options) {
  return gatewayFetchFromBase(getBaseUrl(), path2, options);
}
export async function gatewayFetchFromBase(baseUrl, path2, options) {
  const workspaceClient =
    options?.workspaceClient ??
    (options?.workspaceBinding
      ? new WorkspaceGatewayClient({
          binding: options.workspaceBinding,
          recoverWorkspace: options.recoverWorkspace,
        })
      : void 0);
  return performGatewayFetch(
    {
      baseUrl,
      workspaceClaim: options?.workspaceClaim,
      workspaceClient,
    },
    path2,
    options,
    true,
  );
}
async function performGatewayFetch(binding, path2, options, allowRecovery, dispatchInit) {
  const rawUrl = binding.workspaceClient
    ? binding.workspaceClient.url(path2)
    : gatewayUrlFromBase(binding.baseUrl, path2);
  const url2 = rawUrl ? appendRendererCommonParams(rawUrl) : void 0;
  if (!url2) throw new GatewayNotReadyError();
  let init2 = dispatchInit;
  if (!init2) {
    const traceId = mintGatewayTraceId();
    recordGatewayTraceId(traceId);
    init2 = withSelectedGroupHeader(
      withTraceHeader(options ? toRequestInit(options) : void 0, traceId),
    );
  }
  if (binding.workspaceClient) {
    init2 = {
      ...init2,
      headers: withWorkspaceGatewayHeaders(binding.workspaceClient.binding, init2.headers),
    };
  } else if (binding.workspaceClaim) {
    init2 = withWorkspaceHeader(init2, binding.workspaceClaim);
  }
  const res = binding.workspaceClient
    ? await binding.workspaceClient.request(url2, init2)
    : await fetch(url2, init2);
  if (!res.ok) {
    const errorCode = await extractErrorCode(res);
    if (isWorkspaceIdentityErrorCode(errorCode)) {
      if (allowRecovery && !binding.workspaceClient && options?.recoverWorkspace) {
        const method2 = (options.method ?? "GET").toUpperCase();
        if (method2 === "GET" || method2 === "HEAD" || method2 === "OPTIONS") {
          const recovered = await options.recoverWorkspace();
          if (recovered) {
            return performGatewayFetch(
              {
                baseUrl: recovered.baseUrl,
                workspaceClaim: recovered.claim,
                workspaceClient: new WorkspaceGatewayClient({
                  binding: recovered,
                }),
              },
              path2,
              options,
              false,
              init2,
            );
          }
        }
      }
      if (errorCode === WORKSPACE_IDENTITY_MISMATCH_CODE) {
        throw new GatewayWorkspaceMismatchError();
      }
    }
    const method = options?.method ?? "GET";
    const detail = await extractErrorDetail(res);
    const metadata = await extractErrorMetadata(res);
    if (isUpstreamAuthError(res.status, detail, metadata)) {
      authExpiredBus.emit();
    }
    throw new GatewayHttpError({
      status: res.status,
      method,
      path: path2,
      detail,
      code: metadata.code,
      details: metadata.details,
      userMessage: metadata.userMessage,
    });
  }
  return res;
}
function appendRendererCommonParams(url2) {
  const parsed = new URL(url2);
  for (const [key2, value] of Object.entries(buildRendererCommonParams())) {
    if (value !== void 0 && value !== "") {
      parsed.searchParams.set(key2, String(value));
    }
  }
  return parsed.toString();
}
function withTraceHeader(init2, traceId) {
  const base2 = init2 ?? {};
  const merged = new Headers(base2.headers);
  if (!merged.has("x-request-id")) {
    merged.set("x-request-id", traceId);
  }
  return {
    ...base2,
    headers: merged,
  };
}
function withSelectedGroupHeader(init2) {
  const groupId2 = getSelectedRequestGroupId();
  if (!groupId2) return init2;
  const merged = new Headers(init2.headers);
  merged.set(GROUP_ID_HEADER, groupId2);
  return {
    ...init2,
    headers: merged,
  };
}
function withWorkspaceHeader(init2, workspaceClaim) {
  const merged = new Headers(init2.headers);
  if (!merged.has(HILO_WORKSPACE_IDENTITY_HEADER)) {
    merged.set(HILO_WORKSPACE_IDENTITY_HEADER, workspaceClaim);
  }
  return {
    ...init2,
    headers: merged,
  };
}
function isUpstreamAuthError(status, body2, metadata) {
  if (status === 401) {
    if (metadata.errorType === "TeamGatewayError" && metadata.code === "permission_denied") {
      return false;
    }
    return true;
  }
  if (status === 403) {
    return isAuthError403Body(body2) || (!!body2 && body2.includes(ErrorCodes.AUTH_EXPIRED));
  }
  if (status === 400 && body2.includes("missing user identity")) return true;
  if (body2?.includes(ErrorCodes.AUTH_EXPIRED)) return true;
  return false;
}
function isAuthError403Body(body2) {
  if (!body2) return false;
  try {
    const parsed = JSON.parse(body2);
    if (parsed && typeof parsed === "object") {
      return parsed.error?.type === "authentication_error";
    }
  } catch {}
  return false;
}
function toRequestInit(options) {
  const {
    timeoutMs,
    workspaceClaim: _workspaceClaim,
    workspaceBinding: _workspaceBinding,
    workspaceClient: _workspaceClient,
    recoverWorkspace: _recoverWorkspace,
    signal: callerSignal,
    ...init2
  } = options;
  const signal = combineSignals(callerSignal, timeoutMs);
  return signal
    ? {
        ...init2,
        signal,
      }
    : init2;
}
async function extractErrorCode(res) {
  try {
    const body2 = await res.clone().json();
    return body2?.code;
  } catch {
    return void 0;
  }
}
function combineSignals(callerSignal, timeoutMs) {
  if (timeoutMs == null) return callerSignal ?? void 0;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!callerSignal) return timeoutSignal;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([callerSignal, timeoutSignal]);
  }
  const controller = new AbortController();
  const onAbort = (reason) => controller.abort(reason);
  if (callerSignal.aborted) controller.abort(callerSignal.reason);
  else
    callerSignal.addEventListener("abort", () => onAbort(callerSignal.reason), {
      once: true,
    });
  if (timeoutSignal.aborted) controller.abort(timeoutSignal.reason);
  else
    timeoutSignal.addEventListener("abort", () => onAbort(timeoutSignal.reason), {
      once: true,
    });
  return controller.signal;
}
async function extractErrorDetail(res) {
  try {
    const body2 = await res.clone().json();
    const msg = body2?.message;
    if (typeof msg === "string" && msg.length > 0) return msg;
    if (Array.isArray(msg) && msg.length > 0) return msg.map(String).join("; ");
  } catch {}
  try {
    const text2 = await res.clone().text();
    return text2.trim();
  } catch {
    return "";
  }
}
async function extractErrorMetadata(res) {
  try {
    const body2 = await res.clone().json();
    if (!body2 || typeof body2 !== "object" || Array.isArray(body2)) return {};
    const record2 = body2;
    const nestedError =
      record2.error && typeof record2.error === "object" && !Array.isArray(record2.error)
        ? record2.error
        : void 0;
    const rawCode = record2.code ?? record2.error_code ?? nestedError?.code;
    const code2 = typeof rawCode === "string" && rawCode.length > 0 ? rawCode : void 0;
    const details = record2.details ?? nestedError?.details;
    const errorType = typeof record2.error === "string" ? record2.error : void 0;
    const rawUserMessage = record2.user_message ?? nestedError?.user_message;
    const userMessage =
      typeof rawUserMessage === "string" && rawUserMessage.length > 0 ? rawUserMessage : void 0;
    return {
      code: code2,
      details,
      errorType,
      userMessage,
    };
  } catch {
    return {};
  }
}
async function readUserId() {
  try {
    const bridge = window.__HILO_AUTH__;
    if (!bridge?.getStoredAuth) return "unknown";
    const stored = await bridge.getStoredAuth();
    return stored?.user?.userID || "unknown";
  } catch {
    return "unknown";
  }
}
function readWorkspaceId() {
  try {
    return new URLSearchParams(window.location.search).get("workspaceId") ?? "";
  } catch {
    return "";
  }
}
async function tryUploadLogs(reason, feedbackContext) {
  try {
    const result = await window.hilo?.diagnostics?.uploadLogs?.(reason, feedbackContext);
    return {
      uploaded: Boolean(result?.success),
      url: result?.url,
    };
  } catch {
    return {
      uploaded: false,
    };
  }
}
async function tryFetchOpenCodeSessionExport(workspaceDir, runtimeSessionId, fetchFeedback) {
  try {
    const res = await fetchFeedback("/api/projects/archive/export", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        dir: workspaceDir,
        sessionId: runtimeSessionId,
      }),
      // The export reads SQLite directly and serialises in-process; even a
      // session with deep tool-call history finishes in well under a second.
      // Cap generously so a momentarily-slow gateway doesn't stall ticket
      // submission, but keep tighter than the 30 s feedback budget.
      timeoutMs: 1e4,
    });
    if (!res.ok) {
      if (false);
      return void 0;
    }
    const body2 = await res.json();
    if (
      typeof body2 !== "object" ||
      body2 === null ||
      !("payload" in body2) ||
      body2.payload == null
    )
      return void 0;
    return JSON.stringify(body2.payload);
  } catch (err) {
    return void 0;
  }
}
async function uploadFileToGateway(file, fetchFeedback) {
  if (file.size > FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_BYTES) {
    throw new Error(
      `File "${file.name}" exceeds ${FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_BYTES} bytes`,
    );
  }
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetchFeedback(API_PATHS.feedbackUploadAttachment, {
    method: "POST",
    body: formData,
    timeoutMs: 3e4,
  });
  return await res.json();
}
export async function submitFeedback(input, options = {}) {
  const assertIdentity = async () => {
    if (options.isCurrentIdentity && !(await options.isCurrentIdentity())) {
      throw new Error("Feedback account changed");
    }
  };
  const withIdentity = (fetch2) => async (path2, init2) => {
    await assertIdentity();
    return fetch2(path2, init2);
  };
  const fetchFeedback = withIdentity(options.fetch ?? gatewayFetch);
  const fetchSession = options.exportFetch ? withIdentity(options.exportFetch) : fetchFeedback;
  await assertIdentity();
  recordAction("feedback:submit", {
    source: input.source,
  });
  const platform2 = getPlatform();
  const config2 = getRuntimeConfig();
  const reason = input.logUploadReason ?? `user_feedback:${input.source}`;
  const isFeatureRequest = input.category === "feature_request";
  await readUserId();
  const workspaceId2 = input.workspaceId ?? readWorkspaceId();
  const attachmentUrls = input.files?.length
    ? await Promise.all(
        input.files
          .slice(0, FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_COUNT)
          .map((file) => uploadFileToGateway(file, fetchFeedback)),
      )
    : [];
  let logResult = {
    uploaded: false,
  };
  if (!isFeatureRequest) {
    const feedbackContext = {};
    if (attachmentUrls.length > 0) {
      feedbackContext.attachments_json = JSON.stringify(attachmentUrls);
    }
    if (input.runtimeSessionId && input.workspaceDir) {
      const sessionJson = await tryFetchOpenCodeSessionExport(
        input.workspaceDir,
        input.runtimeSessionId,
        fetchSession,
      );
      if (sessionJson) {
        feedbackContext.opencode_session_json = sessionJson;
      }
    }
    if (input.context) {
      feedbackContext.context_json = JSON.stringify(
        input.contextType === "chat_feedback"
          ? {
              ...input.context,
              session_archive_entry: feedbackContext.opencode_session_json
                ? "opencode-session.json"
                : null,
            }
          : input.context,
      );
    }
    await assertIdentity();
    logResult = await tryUploadLogs(reason, feedbackContext);
  }
  const auto_log_uploaded = logResult.uploaded;
  const clientRequestId = getLastGatewayTraceId() ?? void 0;
  const isCanvasNodeError = input.source === "context" && input.contextType === "canvas_node_error";
  const requiresModelTrace = isCanvasNodeError || input.contextType === "chat_feedback";
  const resolvedTraceId = isFeatureRequest
    ? void 0
    : (input.traceId ?? (requiresModelTrace ? void 0 : clientRequestId));
  const payload = {
    source: input.source,
    // Only feature requests carry type/module — bug-mode payload stays
    // byte-identical to the pre-feature-request contract (spec decision).
    type: isFeatureRequest ? input.category : void 0,
    module: isFeatureRequest ? input.module : void 0,
    context_type: input.contextType,
    context: input.context,
    description: input.description.trim(),
    attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : void 0,
    idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
    metadata: {
      app_version: config2?.appVersion ?? "unknown",
      build_channel: config2?.channel ?? "unknown",
      os: platform2?.app?.os ?? "unknown",
      workspace_id: isFeatureRequest ? "" : workspaceId2,
      region: config2?.region ?? "domestic",
      locale: input.locale ?? (instance.language || "en"),
      current_route: isFeatureRequest ? void 0 : input.currentRoute,
      trace_id: resolvedTraceId,
      ...(clientRequestId
        ? {
            client_request_id: clientRequestId,
          }
        : {}),
      auto_log_uploaded,
    },
  };
  const requestBody = {
    idempotency_key: payload.idempotencyKey,
    source: payload.source,
    description: payload.description,
    workspace_id: payload.metadata.workspace_id,
    region: payload.metadata.region,
    app_version: payload.metadata.app_version,
    build_channel: payload.metadata.build_channel,
    os: payload.metadata.os,
    current_route: payload.metadata.current_route,
    trace_id: payload.metadata.trace_id,
    ...(payload.metadata.client_request_id
      ? {
          client_request_id: payload.metadata.client_request_id,
        }
      : {}),
    context_type: payload.context_type ?? "",
    locale: payload.metadata.locale,
    auto_log_uploaded: payload.metadata.auto_log_uploaded ?? false,
    detail_url: logResult.url ?? "",
  };
  if (payload.type) {
    requestBody.type = payload.type;
  }
  if (payload.module) {
    requestBody.module = payload.module;
  }
  if (isFeatureRequest && attachmentUrls.length > 0) {
    requestBody.attachments = attachmentUrls;
  }
  const res = await fetchFeedback(API_PATHS.feedback, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(requestBody),
    // Generous budget: the gateway forwards to the central API, which can
    // be slow on a flaky network. Submitting feedback should not abort
    // halfway and leave the user wondering whether it landed.
    timeoutMs: 3e4,
  });
  if (!res.ok) throw new Error(`Feedback submission failed (${res.status})`);
  const saved = await res.json();
  if (
    typeof saved !== "object" ||
    saved === null ||
    !("ticket_id" in saved) ||
    typeof saved.ticket_id !== "string" ||
    !saved.ticket_id
  )
    throw new Error("Invalid feedback acknowledgement");
  return {
    ticket_id: saved.ticket_id,
  };
}
export const FeedbackContext = reactExports.createContext(null);
export const ERROR_BOUNDARY_AUTO_UPLOAD_REASON = "error_boundary";
export const ERROR_BOUNDARY_AUTO_UPLOAD_COOLDOWN_MS = 15 * 60 * 1e3;
export const ERROR_BOUNDARY_UPLOAD_STORAGE_KEY = "hilo:last-error-boundary-upload";
export const MAX_ERROR_BOUNDARY_DIAGNOSTIC_LENGTH = 4e3;
export const MAX_ERROR_BOUNDARY_BREADCRUMB_MESSAGE_LENGTH = 300;
