import { randomUUID } from "node:crypto";

import { gatewayEndpoint, withGatewayIdentity } from "./gateway-identity.js";

const TRACE_PATH = "/api/chat/model-traces";
const CONTEXT_HEADER = "x-hilo-model-trace-context";
const registryKey = Symbol.for("hilo.model-trace-capture.v1");

type TraceContext = { session_id: string; request_id: string; agent: string; model_id: string };
type Owner = {
  gatewayUrl: string;
  headers: Headers;
  disposed: boolean;
  controllers: Set<AbortController>;
  pending: Set<Promise<void>>;
};
type State = { owners: Map<string, Owner>; lastStartedAt: number; wrapper?: typeof fetch };

const globals = globalThis as typeof globalThis & { [registryKey]?: State };

/**
 * 模型请求头里带着这次对话的会话和代理。请求发出后把头剥掉，
 * 等响应带回 trace id，再记到 gateway，评分才能对上这一轮。
 */
export function createModelTraceCapture(gatewayUrl: string) {
  const state = registry();
  const ownerId = randomUUID();
  const owner: Owner = {
    gatewayUrl: gatewayUrl.replace(/\/+$/, ""),
    headers: new Headers(withGatewayIdentity({ headers: { "content-type": "application/json" } }).headers),
    disposed: false,
    controllers: new Set(),
    pending: new Set(),
  };
  return {
    enableDiagnostics() {
      if (!owner.disposed) installSanitizer(state);
    },
    attach(context: TraceContext, headers: Record<string, string>) {
      if (owner.disposed) return;
      const encoded = Buffer.from(JSON.stringify({ ...context, ownerId })).toString("base64url");
      if (!readContext(encoded)) return;
      installSanitizer(state);
      state.owners.set(ownerId, owner);
      headers[CONTEXT_HEADER] = encoded;
    },
    async dispose() {
      owner.disposed = true;
      state.owners.delete(ownerId);
      for (const controller of owner.controllers) controller.abort();
      await Promise.all(owner.pending);
    },
  };
}

function registry(): State {
  globals[registryKey] ??= { owners: new Map(), lastStartedAt: 0 };
  return globals[registryKey];
}

function installSanitizer(state: State) {
  if (globalThis.fetch === state.wrapper) return;
  const send = globalThis.fetch.bind(globalThis);
  const wrapper: typeof fetch = async (input, init) => {
    const requestHeaders = input instanceof Request ? input.headers : undefined;
    const headers = new Headers(init?.headers ?? requestHeaders);
    const raw = headers.get(CONTEXT_HEADER);
    if (!raw && !requestHeaders?.has(CONTEXT_HEADER)) return send(input, init);
    headers.delete(CONTEXT_HEADER);
    let cleanInput = input;
    if (input instanceof Request && input.headers.has(CONTEXT_HEADER)) {
      const cleanHeaders = new Headers(input.headers);
      cleanHeaders.delete(CONTEXT_HEADER);
      cleanInput = new Request(input, { headers: cleanHeaders });
    }
    const cleanInit = { ...init, headers };
    const parsed = readContext(raw);
    const owner = parsed ? state.owners.get(parsed.ownerId) : undefined;
    if (!parsed || !owner || owner.disposed || !isResponsesRequest(input, init)) return send(cleanInput, cleanInit);
    const callId = randomUUID();
    const startedAt = Math.max(Date.now(), state.lastStartedAt + 1);
    state.lastStartedAt = startedAt;
    const response = await send(cleanInput, cleanInit);
    const traceId = response.headers.get("Trace-Id") ?? response.headers.get("X-Trace-Id");
    if (isId(traceId) && !owner.disposed) {
      const pending = reportTrace(owner, { ...parsed.context, call_id: callId, trace_id: traceId, started_at: startedAt, status_code: response.status }, send);
      owner.pending.add(pending);
      void pending.finally(() => owner.pending.delete(pending));
    }
    return response;
  };
  state.wrapper = wrapper;
  globalThis.fetch = wrapper;
}

async function reportTrace(owner: Owner, trace: TraceContext & { call_id: string; trace_id: string; started_at: number; status_code: number }, send: typeof fetch) {
  for (let attempt = 0; attempt < 2 && !owner.disposed; attempt += 1) {
    const controller = new AbortController();
    owner.controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
      const response = await send(gatewayEndpoint(owner.gatewayUrl, TRACE_PATH), {
        method: "POST",
        headers: owner.headers,
        body: JSON.stringify(trace),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("trace_report_http_error");
      const acknowledgement = await response.json() as { call_id?: unknown };
      if (acknowledgement?.call_id !== trace.call_id) throw new Error("trace_report_invalid_ack");
      return;
    } catch {
      if (owner.disposed || attempt === 1) return;
    } finally {
      clearTimeout(timeout);
      owner.controllers.delete(controller);
    }
  }
}

function readContext(raw: string | null): { ownerId: string; context: TraceContext } | undefined {
  if (!raw || raw.length > 4096) return undefined;
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Record<string, unknown>;
    if (!isId(value.ownerId) || !isId(value.session_id) || !isId(value.request_id) || !isLabel(value.agent) || !isLabel(value.model_id)) return undefined;
    return { ownerId: value.ownerId, context: { session_id: value.session_id, request_id: value.request_id, agent: value.agent, model_id: value.model_id } };
  } catch {
    return undefined;
  }
}

function isResponsesRequest(input: Parameters<typeof fetch>[0], init?: RequestInit): boolean {
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  if (method.toUpperCase() !== "POST") return false;
  try {
    const url = new URL(input instanceof Request ? input.url : String(input));
    return /^https?:$/.test(url.protocol) && /\/responses\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

function isId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value);
}

function isLabel(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 256;
}
