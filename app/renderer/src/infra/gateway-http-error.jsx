// gateway-http-error.jsx
import {
  DEFAULT_RUNTIME_CONFIG,
  DialogClose$1,
  DialogPortal$2,
  getRuntimeConfig,
  HILO_WORKSPACE_IDENTITY_QUERY,
  normalizeGatewayBaseUrl,
  reactExports,
  selectedRequestGroupId,
  workspaceGatewayUrl,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { actionTrailLog } from "../vendor-inline/vscode-base/graph.jsx";

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

export function DialogPortal({ ...props }) {
  return <DialogPortal$2 data-slot="dialog-portal" {...props} />;
}

export function DialogClose({ ...props }) {
  return <DialogClose$1 data-slot="dialog-close" {...props} />;
}

export function recordAction(message2, data2) {
  actionTrailLog.info(message2, data2);
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

export function recordGatewayTraceId(traceId) {
  if (typeof traceId !== "string" || traceId.length === 0) return;
  lastTraceId = traceId;
}

export function getLastGatewayTraceId() {
  return lastTraceId;
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
  constructor({
    status,
    method,
    path: path2,
    detail,
    code: code2,
    details,
    userMessage,
  }) {
    super(
      `Gateway ${method} ${path2} failed: ${status}${detail ? ` - ${detail}` : ""}`,
    );
    this.name = "GatewayHttpError";
    this.status = status;
    this.method = method;
    this.path = path2;
    this.code = code2;
    this.details = details;
    this.userMessage = userMessage;
  }
}

export function getBaseUrl() {
  return normalizeGatewayBaseUrl(getRuntimeConfig().gatewayUrl);
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

export function gatewayUrl(path2) {
  const base2 = getBaseUrl();
  return gatewayUrlFromBase(base2, path2);
}

export const FeedbackContext = reactExports.createContext(null);
