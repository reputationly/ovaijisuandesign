import { sessionEndpoint, withGatewayIdentity } from "./gateway-identity.js";

/**
 * 本轮对话的计费分组（Group）和 chat turn id，问 gateway 要。
 *
 * - canonical：有分组，模型请求带 `X-Group-Id`，hub 工具参数带 `_group_id`；
 * - legacy：明确没有分组（本应用没有计费体系，gateway 一律回它），照常放行，hub 工具带
 *   `_group_scope=legacy`，MCP 见到它就不再去补查；
 * - 其余（超时、出错、回了看不懂的东西）：模型请求拒发，hub 工具带 `_group_scope=unresolved`，
 *   由 MCP 在提交生成前再补查一次。宁可不发，也不发一个归不到任何一轮的请求。
 */
export type RequestGroupResolution =
  | { ok: true; groupId: string; elapsedMs: number; chatTurnId?: string }
  | {
      ok: false;
      groupId: null;
      reason: "no_session" | "http_error" | "malformed" | "legacy_null" | "turn_unknown" | "timeout" | "network_error";
      elapsedMs: number;
      status?: number;
      detail?: string;
      chatTurnId?: string;
    };

type Mapped = { mode: "canonical" | "legacy" | "unknown"; groupId: string | null; chatTurnId?: string };

export function mapRequestGroupResponse(body: unknown): Mapped {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { mode: "unknown", groupId: null };
  const record = body as Record<string, unknown>;
  const rawChatTurnId = record.chat_turn_id;
  const chatTurnId = typeof rawChatTurnId === "string" && /^[0-9a-f]{32}$/i.test(rawChatTurnId) ? rawChatTurnId : undefined;
  const turn = chatTurnId ? { chatTurnId } : {};
  const rawGroup = record.group_id;
  const groupId = typeof rawGroup === "string" && /^[1-9]\d*$/.test(rawGroup) ? rawGroup : null;
  const rawMode = record.mode;
  if (rawMode === "canonical") {
    // 说是 canonical 却没有分组：违约，不能当 legacy 放行。
    return groupId ? { mode: "canonical", groupId, ...turn } : { mode: "unknown", groupId: null, ...turn };
  }
  if (rawMode === "legacy") return { mode: "legacy", groupId: null, ...turn };
  if (rawMode === "unknown") return { mode: "unknown", groupId: null, ...turn };
  // 老版本 gateway 不回 mode：有分组算 canonical，没有算 legacy。
  return groupId ? { mode: "canonical", groupId, ...turn } : { mode: "legacy", groupId: null, ...turn };
}

const REQUEST_GROUP_TIMEOUT_MS = (() => {
  const raw = Number.parseInt(process.env.HILO_REQUEST_GROUP_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 6000;
})();

function classifyRequestGroupError(err: unknown): { reason: "timeout" | "network_error"; detail: string } {
  const name = err instanceof Error ? err.name : "";
  const detail = err instanceof Error ? err.message : String(err);
  return name === "TimeoutError" || name === "AbortError" ? { reason: "timeout", detail } : { reason: "network_error", detail };
}

export async function resolveRequestGroup(gatewayUrl: string, sessionID: string | undefined): Promise<RequestGroupResolution> {
  if (!sessionID) return { ok: false, groupId: null, reason: "no_session", elapsedMs: 0 };
  const startedAt = Date.now();
  try {
    const resp = await fetch(
      sessionEndpoint(gatewayUrl, sessionID, "request-group"),
      withGatewayIdentity({ signal: AbortSignal.timeout(REQUEST_GROUP_TIMEOUT_MS) }),
    );
    if (!resp.ok) return { ok: false, groupId: null, reason: "http_error", status: resp.status, elapsedMs: Date.now() - startedAt };
    let body: unknown;
    try {
      body = await resp.json();
    } catch (err) {
      return {
        ok: false,
        groupId: null,
        reason: "malformed",
        status: resp.status,
        elapsedMs: Date.now() - startedAt,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
    const mapped = mapRequestGroupResponse(body);
    const elapsedMs = Date.now() - startedAt;
    const turn = mapped.chatTurnId ? { chatTurnId: mapped.chatTurnId } : {};
    if (mapped.mode === "canonical" && mapped.groupId) return { ok: true, groupId: mapped.groupId, elapsedMs, ...turn };
    return { ok: false, groupId: null, reason: mapped.mode === "legacy" ? "legacy_null" : "turn_unknown", elapsedMs, ...turn };
  } catch (err) {
    const { reason, detail } = classifyRequestGroupError(err);
    return { ok: false, groupId: null, reason, elapsedMs: Date.now() - startedAt, detail };
  }
}

/** 同上，外加一行日志（legacy / 没有会话是常态，记 info；其余记 warn）。 */
export async function fetchRequestGroup(gatewayUrl: string, sessionID: string | undefined, stage: string, logContext = ""): Promise<RequestGroupResolution> {
  const resolution = await resolveRequestGroup(gatewayUrl, sessionID);
  if (resolution.ok) {
    console.log(
      `[hilo-plugin] [request-group] HIT stage=${stage} session=${sessionID} group=${resolution.groupId} chat_turn_id=${resolution.chatTurnId ?? "none"} elapsedMs=${resolution.elapsedMs}${logContext}`,
    );
    return resolution;
  }
  const line =
    `[hilo-plugin] [request-group] MISS stage=${stage} session=${sessionID} chat_turn_id=${resolution.chatTurnId ?? "none"} reason=${resolution.reason} elapsedMs=${resolution.elapsedMs}` +
    (resolution.status === undefined ? "" : ` status=${resolution.status}`) +
    (resolution.detail === undefined ? "" : ` detail=${resolution.detail}`) +
    logContext;
  if (resolution.reason === "legacy_null" || resolution.reason === "no_session") console.log(line);
  else console.warn(line);
  return resolution;
}

export function groupScopeMarker(resolution: RequestGroupResolution): "legacy" | "unresolved" {
  return !resolution.ok && resolution.reason === "legacy_null" ? "legacy" : "unresolved";
}

/** 开发环境下可以显式放行拿不到分组的模型请求（排查 gateway 时用），生产永远不放。 */
export function shouldFailOpenRequestGroup(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.HILO_REQUEST_GROUP_FAIL_OPEN === "1";
}
