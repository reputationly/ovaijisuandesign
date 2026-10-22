// perform-gateway-fetch.js
import { ErrorCodes } from "../generation/normalize-skill-detail-metadata.js";
import { GROUP_ID_HEADER } from "./shared-runtime.js";
import { HILO_WORKSPACE_IDENTITY_HEADER, isWorkspaceIdentityErrorCode, withWorkspaceGatewayHeaders, WORKSPACE_IDENTITY_MISMATCH_CODE, WorkspaceGatewayClient } from "./workspace-gateway.js";
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

function appendRendererCommonParams(url) {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(buildRendererCommonParams())) {
    if (value !== void 0 && value !== "") {
      parsed.searchParams.set(key, String(value));
    }
  }
  return parsed.toString();
}

function withTraceHeader(init, traceId) {
  const base = init ?? {};
  const merged = new Headers(base.headers);
  if (!merged.has("x-request-id")) {
    merged.set("x-request-id", traceId);
  }
  return {
    ...base,
    headers: merged,
  };
}

function withSelectedGroupHeader(init) {
  const groupId = getSelectedRequestGroupId();
  if (!groupId) return init;
  const merged = new Headers(init.headers);
  merged.set(GROUP_ID_HEADER, groupId);
  return {
    ...init,
    headers: merged,
  };
}

function withWorkspaceHeader(init, workspaceClaim) {
  const merged = new Headers(init.headers);
  if (!merged.has(HILO_WORKSPACE_IDENTITY_HEADER)) {
    merged.set(HILO_WORKSPACE_IDENTITY_HEADER, workspaceClaim);
  }
  return {
    ...init,
    headers: merged,
  };
}

function isAuthError403Body(body) {
  if (!body) return false;
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === "object") {
      return parsed.error?.type === "authentication_error";
    }
  } catch {}
  return false;
}

function isUpstreamAuthError(status, body, metadata) {
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
      isAuthError403Body(body) ||
      (!!body && body.includes(ErrorCodes.AUTH_EXPIRED))
    );
  }
  if (status === 400 && body.includes("missing user identity")) return true;
  if (body?.includes(ErrorCodes.AUTH_EXPIRED)) return true;
  return false;
}

async function extractErrorCode(res) {
  try {
    const body = await res.clone().json();
    return body?.code;
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
    ...init
  } = options;
  const signal = combineSignals(callerSignal, timeoutMs);
  return signal
    ? {
        ...init,
        signal,
      }
    : init;
}

async function extractErrorDetail(res) {
  try {
    const body = await res.clone().json();
    const msg = body?.message;
    if (typeof msg === "string" && msg.length > 0) return msg;
    if (Array.isArray(msg) && msg.length > 0) return msg.map(String).join("; ");
  } catch {}
  try {
    const text = await res.clone().text();
    return text.trim();
  } catch {
    return "";
  }
}

async function extractErrorMetadata(res) {
  try {
    const body = await res.clone().json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return {};
    const record = body;
    const nestedError =
      record.error &&
      typeof record.error === "object" &&
      !Array.isArray(record.error)
        ? record.error
        : void 0;
    const rawCode = record.code ?? record.error_code ?? nestedError?.code;
    const code =
      typeof rawCode === "string" && rawCode.length > 0 ? rawCode : void 0;
    const details = record.details ?? nestedError?.details;
    const errorType =
      typeof record.error === "string" ? record.error : void 0;
    const rawUserMessage = record.user_message ?? nestedError?.user_message;
    const userMessage =
      typeof rawUserMessage === "string" && rawUserMessage.length > 0
        ? rawUserMessage
        : void 0;
    return {
      code,
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
  path,
  options,
  allowRecovery,
  dispatchInit,
) {
  const rawUrl = binding.workspaceClient
    ? binding.workspaceClient.url(path)
    : gatewayUrlFromBase(binding.baseUrl, path);
  const url = rawUrl ? appendRendererCommonParams(rawUrl) : void 0;
  if (!url) throw new GatewayNotReadyError();
  let init = dispatchInit;
  if (!init) {
    const traceId = mintGatewayTraceId();
    recordGatewayTraceId(traceId);
    init = withSelectedGroupHeader(
      withTraceHeader(options ? toRequestInit(options) : void 0, traceId),
    );
  }
  if (binding.workspaceClient) {
    init = {
      ...init,
      headers: withWorkspaceGatewayHeaders(
        binding.workspaceClient.binding,
        init.headers,
      ),
    };
  } else if (binding.workspaceClaim) {
    init = withWorkspaceHeader(init, binding.workspaceClaim);
  }
  const res = binding.workspaceClient
    ? await binding.workspaceClient.request(url, init)
    : await fetch(url, init);
  if (!res.ok) {
    const errorCode = await extractErrorCode(res);
    if (isWorkspaceIdentityErrorCode(errorCode)) {
      if (
        allowRecovery &&
        !binding.workspaceClient &&
        options?.recoverWorkspace
      ) {
        const method = (options.method ?? "GET").toUpperCase();
        if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
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
              path,
              options,
              false,
              init,
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
      path,
      detail,
      code: metadata.code,
      details: metadata.details,
      userMessage: metadata.userMessage,
    serverMessage: metadata.serverMessage,});
  }
  return res;
}

export async function gatewayFetchFromBase(baseUrl, path, options) {
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
    path,
    options,
    true,
  );
}
