import { getRuntimeConfig } from "../infra/runtime-config.js";
import { HILO_WORKSPACE_IDENTITY_HEADER, WORKSPACE_IDENTITY_MISMATCH_CODE, isWorkspaceIdentityErrorCode } from "../infra/workspace-gateway.js";
import { gatewayUrlFromBase } from "../workspace/get-base-url.jsx";
import { GROUP_ID_HEADER } from "./group-id-header.jsx";
import { HILO_APP_ID, HILO_BIZ_ID, HILO_DEFAULT_VERSION_CODE, normalizeVersionCodeForCloud } from "./hilo-app-id.jsx";
import { WorkspaceGatewayClient, authExpiredBus, withWorkspaceGatewayHeaders } from "./workspace-gateway-url.jsx";
import { default as instance } from "i18next";
import { ErrorCodes } from "parse5";
// `lastTraceId` 住在这个模块**外面**（`infra/gateway-http-error.jsx`）。
//
// 这里原本自己写了一遍同名函数，却**没有声明 `lastTraceId`** ——
// 一调用就抛 `lastTraceId is not defined`，而它正好在 `performGatewayFetch`
// 的必经路径上，于是**每一次网关请求都直接失败**：
// 架构查询拿不到结果 → 画布不渲染；其它接口同理。
// 改成从权威模块转发，保证两边写的是同一份状态。
import { recordGatewayTraceId } from "../infra/gateway-http-error.jsx";
export { recordGatewayTraceId };

export function mintGatewayTraceId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export let selectedRequestGroupId = null;

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
  constructor({ status, method, path: path2, detail: detail2, code: code2, details, userMessage }) {
    super(`Gateway ${method} ${path2} failed: ${status}${detail2 ? ` - ${detail2}` : ""}`);
    this.name = "GatewayHttpError";
    this.status = status;
    this.method = method;
    this.path = path2;
    this.code = code2;
    this.details = details;
    this.userMessage = userMessage;
  }
}

export class GatewayWorkspaceMismatchError extends Error {
  constructor() {
    super("Workspace gateway identity mismatch");
    this.name = "GatewayWorkspaceMismatchError";
  }
}

export function normalizeGatewayBaseUrl(gatewayUrl2) {
  return gatewayUrl2?.replace(/\/$/, "") || void 0;
}

export async function gatewayFetchFromBase(baseUrl, path2, options2) {
  const workspaceClient =
    options2?.workspaceClient ??
    (options2?.workspaceBinding
      ? new WorkspaceGatewayClient({
          binding: options2.workspaceBinding,
          recoverWorkspace: options2.recoverWorkspace,
        })
      : void 0);
  return performGatewayFetch(
    {
      baseUrl,
      workspaceClaim: options2?.workspaceClaim,
      workspaceClient,
    },
    path2,
    options2,
    true,
  );
}

export async function performGatewayFetch(binding, path2, options2, allowRecovery, dispatchInit) {
  const rawUrl = binding.workspaceClient
    ? binding.workspaceClient.url(path2)
    : gatewayUrlFromBase(binding.baseUrl, path2);
  const url2 = rawUrl ? appendRendererCommonParams(rawUrl) : void 0;
  if (!url2) throw new GatewayNotReadyError();
  let init2 = dispatchInit;
  if (!init2) {
    const traceId = mintGatewayTraceId();
    recordGatewayTraceId(traceId);
    init2 = withSelectedGroupHeader(withTraceHeader(options2 ? toRequestInit(options2) : void 0, traceId));
  }
  if (binding.workspaceClient) {
    init2 = {
      ...init2,
      headers: withWorkspaceGatewayHeaders(binding.workspaceClient.binding, init2.headers),
    };
  } else if (binding.workspaceClaim) {
    init2 = withWorkspaceHeader(init2, binding.workspaceClaim);
  }
  const res = binding.workspaceClient ? await binding.workspaceClient.request(url2, init2) : await fetch(url2, init2);
  if (!res.ok) {
    const errorCode = await extractErrorCode(res);
    if (isWorkspaceIdentityErrorCode(errorCode)) {
      if (allowRecovery && !binding.workspaceClient && options2?.recoverWorkspace) {
        const method2 = (options2.method ?? "GET").toUpperCase();
        if (method2 === "GET" || method2 === "HEAD" || method2 === "OPTIONS") {
          const recovered = await options2.recoverWorkspace();
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
              options2,
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
    const method = options2?.method ?? "GET";
    const detail2 = await extractErrorDetail(res);
    const metadata = await extractErrorMetadata(res);
    if (isUpstreamAuthError(res.status, detail2, metadata)) {
      authExpiredBus.emit();
    }
    throw new GatewayHttpError({
      status: res.status,
      method,
      path: path2,
      detail: detail2,
      code: metadata.code,
      details: metadata.details,
      userMessage: metadata.userMessage,
    });
  }
  return res;
}

export function appendRendererCommonParams(url2) {
  const parsed = new URL(url2);
  for (const [key2, value] of Object.entries(buildRendererCommonParams())) {
    if (value !== void 0 && value !== "") {
      parsed.searchParams.set(key2, String(value));
    }
  }
  return parsed.toString();
}

export function buildRendererCommonParams() {
  const cfg = getRuntimeConfig();
  const deviceId = cfg.deviceId?.trim();
  const rawVersionCode = cfg.appVersion?.trim() || HILO_DEFAULT_VERSION_CODE;
  const params = {
    device_platform: "desktop",
    app_id: HILO_APP_ID,
    version_code: normalizeVersionCodeForCloud(rawVersionCode),
    biz_id: HILO_BIZ_ID,
    unix: Date.now(),
    os_name: getOsName(),
    browser_name: getBrowserName(),
    browser_language: navigator.language,
    browser_platform: navigator.platform,
    screen_width: screen.width,
    screen_height: screen.height,
  };
  const lang = toCloudLang(instance.language) || cfg.locale;
  if (lang) {
    params.lang = lang;
  }
  const deviceMemory = getDeviceMemory(cfg.totalMemoryMb);
  if (deviceMemory !== void 0) {
    params.device_memory = deviceMemory;
  }
  const cpuCoreNum = navigator.hardwareConcurrency || cfg.cpuCount;
  if (cpuCoreNum !== void 0) {
    params.cpu_core_num = cpuCoreNum;
  }
  if (deviceId) {
    params.uuid = deviceId;
    params.device_id = deviceId;
  }
  return params;
}

export function toCloudLang(locale) {
  if (!locale) return "";
  return locale === "zh" ? "zh-Hans" : locale;
}

export function getOsName() {
  const platform2 = navigator.platform || "";
  const ua = navigator.userAgent || "";
  if (/mac/i.test(platform2) || /Mac OS X/i.test(ua)) return "macOS";
  if (/win/i.test(platform2) || /Windows/i.test(ua)) return "Windows";
  if (/linux/i.test(platform2) || /Linux/i.test(ua)) return "Linux";
  return platform2 || "unknown";
}

export function getBrowserName() {
  const ua = navigator.userAgent || "";
  if (/Electron/i.test(ua)) return "Electron";
  if (/Chrome|Chromium/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  return "unknown";
}

export function getDeviceMemory(totalMemoryMb) {
  const navMemory = navigator.deviceMemory;
  if (typeof navMemory === "number" && navMemory > 0) return navMemory;
  if (typeof totalMemoryMb === "number" && totalMemoryMb > 0) {
    return Math.round(totalMemoryMb / 1024);
  }
  return void 0;
}

export function withTraceHeader(init2, traceId) {
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

export function withSelectedGroupHeader(init2) {
  const groupId2 = getSelectedRequestGroupId();
  if (!groupId2) return init2;
  const merged = new Headers(init2.headers);
  merged.set(GROUP_ID_HEADER, groupId2);
  return {
    ...init2,
    headers: merged,
  };
}

export function withWorkspaceHeader(init2, workspaceClaim) {
  const merged = new Headers(init2.headers);
  if (!merged.has(HILO_WORKSPACE_IDENTITY_HEADER)) {
    merged.set(HILO_WORKSPACE_IDENTITY_HEADER, workspaceClaim);
  }
  return {
    ...init2,
    headers: merged,
  };
}

export function isUpstreamAuthError(status, body2, metadata) {
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

export function isAuthError403Body(body2) {
  if (!body2) return false;
  try {
    const parsed = JSON.parse(body2);
    if (parsed && typeof parsed === "object") {
      return parsed.error?.type === "authentication_error";
    }
  } catch {}
  return false;
}

export function toRequestInit(options2) {
  const {
    timeoutMs,
    workspaceClaim: _workspaceClaim,
    workspaceBinding: _workspaceBinding,
    workspaceClient: _workspaceClient,
    recoverWorkspace: _recoverWorkspace,
    signal: callerSignal,
    ...init2
  } = options2;
  const signal = combineSignals(callerSignal, timeoutMs);
  return signal
    ? {
        ...init2,
        signal,
      }
    : init2;
}

export async function extractErrorCode(res) {
  try {
    const body2 = await res.clone().json();
    return body2?.code;
  } catch {
    return void 0;
  }
}

export function combineSignals(callerSignal, timeoutMs) {
  if (timeoutMs == null) return callerSignal ?? void 0;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!callerSignal) return timeoutSignal;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([callerSignal, timeoutSignal]);
  }
  const controller = new AbortController();
  const onAbort = (reason2) => controller.abort(reason2);
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

export async function extractErrorDetail(res) {
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

export async function extractErrorMetadata(res) {
  try {
    const body2 = await res.clone().json();
    if (!body2 || typeof body2 !== "object" || Array.isArray(body2)) return {};
    const record2 = body2;
    const nestedError =
      record2.error && typeof record2.error === "object" && !Array.isArray(record2.error) ? record2.error : void 0;
    const rawCode = record2.code ?? record2.error_code ?? nestedError?.code;
    const code2 = typeof rawCode === "string" && rawCode.length > 0 ? rawCode : void 0;
    const details = record2.details ?? nestedError?.details;
    const errorType = typeof record2.error === "string" ? record2.error : void 0;
    const rawUserMessage = record2.user_message ?? nestedError?.user_message;
    const userMessage = typeof rawUserMessage === "string" && rawUserMessage.length > 0 ? rawUserMessage : void 0;
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
