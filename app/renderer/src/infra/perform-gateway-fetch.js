// perform-gateway-fetch.js
import { ErrorCodes } from "../generation/normalize-skill-detail-metadata.js";
import { GROUP_ID_HEADER, HILO_WORKSPACE_IDENTITY_HEADER, isWorkspaceIdentityErrorCode, withWorkspaceGatewayHeaders, WORKSPACE_IDENTITY_MISMATCH_CODE, WorkspaceGatewayClient } from "../vendor.js";
import { buildRendererCommonParams } from "./agent-http-client.js";
import {
  authExpiredBus,
  GatewayHttpError,
  GatewayNotReadyError,
  gatewayUrlFromBase,
  getSelectedRequestGroupId,
  recordGatewayTraceId,
} from "./gateway-http-error.jsx";

function mintGatewayTraceId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

class GatewayWorkspaceMismatchError extends Error {
  constructor() {
    super("Workspace gateway identity mismatch");
    this.name = "GatewayWorkspaceMismatchError";
  }
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

function isUpstreamAuthError(status, body2, metadata) {
  if (status === 401) {
    if (
      metadata.errorType === "TeamGatewayError" &&
      metadata.code === "permission_denied"
    ) {
      return false;
    }
    return true;
  }
  if (status === 403) {
    return (
      isAuthError403Body(body2) ||
      (!!body2 && body2.includes(ErrorCodes.AUTH_EXPIRED))
    );
  }
  if (status === 400 && body2.includes("missing user identity")) return true;
  if (body2?.includes(ErrorCodes.AUTH_EXPIRED)) return true;
  return false;
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
    timeoutSignal.addEventListener(
      "abort",
      () => onAbort(timeoutSignal.reason),
      {
        once: true,
      },
    );
  return controller.signal;
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
      record2.error &&
      typeof record2.error === "object" &&
      !Array.isArray(record2.error)
        ? record2.error
        : void 0;
    const rawCode = record2.code ?? record2.error_code ?? nestedError?.code;
    const code2 =
      typeof rawCode === "string" && rawCode.length > 0 ? rawCode : void 0;
    const details = record2.details ?? nestedError?.details;
    const errorType =
      typeof record2.error === "string" ? record2.error : void 0;
    const rawUserMessage = record2.user_message ?? nestedError?.user_message;
    const userMessage =
      typeof rawUserMessage === "string" && rawUserMessage.length > 0
        ? rawUserMessage
        : void 0;
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

async function performGatewayFetch(
  binding,
  path2,
  options,
  allowRecovery,
  dispatchInit,
) {
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
      headers: withWorkspaceGatewayHeaders(
        binding.workspaceClient.binding,
        init2.headers,
      ),
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
      if (
        allowRecovery &&
        !binding.workspaceClient &&
        options?.recoverWorkspace
      ) {
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
