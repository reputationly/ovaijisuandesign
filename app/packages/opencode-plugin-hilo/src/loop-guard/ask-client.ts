import { randomUUID } from "node:crypto";

import { sessionEndpoint, withGatewayIdentity } from "../gateway-identity.js";

/**
 * 防打转触发时经 gateway 问用户：弹窗给"允许一次 / 本会话都允许 / 拒绝"，等最多 30 秒（上限 60 秒）。
 *
 * 请求本身失败（超时、断连、回了看不懂的东西）时，用户可能已经点过了 —— 先按 request_id 去
 * settlements 对一下账，对不上才按拒绝处理。
 */
export type LoopGuardDecision = "allow_once" | "allow_session" | "reject";

export const LOOP_GUARD_DEFAULT_DECISION_TIMEOUT_MS = 30_000;
export const LOOP_GUARD_MAX_DECISION_TIMEOUT_MS = 60_000;
export const LOOP_GUARD_TRANSPORT_GRACE_MS = 2000;

export function normalizeLoopGuardDecisionTimeoutMs(value: unknown, fallbackMs = LOOP_GUARD_DEFAULT_DECISION_TIMEOUT_MS): number {
  const safeFallback =
    Number.isFinite(fallbackMs) && fallbackMs > 0
      ? Math.min(Math.max(1, Math.floor(fallbackMs)), LOOP_GUARD_MAX_DECISION_TIMEOUT_MS)
      : LOOP_GUARD_DEFAULT_DECISION_TIMEOUT_MS;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return safeFallback;
  return Math.min(Math.max(1, Math.floor(value)), LOOP_GUARD_MAX_DECISION_TIMEOUT_MS);
}

export interface AskInput {
  sessionID: string;
  tool: string;
  hits: number;
  window: number;
  recentTools: string[];
  fingerprint: string;
}

export async function askUserViaGateway(gatewayUrl: string, input: AskInput, timeoutMs = readTimeoutMs()): Promise<LoopGuardDecision> {
  const sessionUrl = sessionEndpoint(gatewayUrl, input.sessionID, "loop-guard");
  const requestId = randomUUID();
  const decisionTimeoutMs = normalizeLoopGuardDecisionTimeoutMs(timeoutMs);
  try {
    const resp = await fetch(
      `${sessionUrl}/ask`,
      withGatewayIdentity({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tool: input.tool,
          hits: input.hits,
          window: input.window,
          recent_tools: input.recentTools,
          fingerprint: input.fingerprint,
          request_id: requestId,
          timeout_ms: decisionTimeoutMs,
        }),
        signal: AbortSignal.timeout(decisionTimeoutMs + LOOP_GUARD_TRANSPORT_GRACE_MS),
      }),
    );
    if (!resp.ok) {
      console.warn(`[hilo-plugin] [loop-guard] ask HTTP ${resp.status} session=${input.sessionID} tool=${input.tool}; reconciling before reject`);
      return (await reconcileDecision(sessionUrl, requestId)) ?? "reject";
    }
    const body: unknown = await resp.json();
    const decision = parseDecision(body);
    if (!decision) {
      console.warn(`[hilo-plugin] [loop-guard] ask got malformed body=${JSON.stringify(body)}; reconciling before reject`);
      return (await reconcileDecision(sessionUrl, requestId)) ?? "reject";
    }
    return decision;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[hilo-plugin] [loop-guard] ask failed session=${input.sessionID} tool=${input.tool}: ${msg}; reconciling before reject`);
    return (await reconcileDecision(sessionUrl, requestId)) ?? "reject";
  }
}

/** 最多对两次账；只认已经结清（settled）的决定。 */
async function reconcileDecision(sessionUrl: string, requestId: string): Promise<LoopGuardDecision | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(
        `${sessionUrl}/settlements/${encodeURIComponent(requestId)}`,
        withGatewayIdentity({ method: "GET", signal: AbortSignal.timeout(LOOP_GUARD_TRANSPORT_GRACE_MS) }),
      );
      if (!response.ok) return null;
      const body = (await response.json()) as { status?: unknown } | null;
      if (!body || typeof body !== "object" || body.status !== "settled") return null;
      return parseDecision(body);
    } catch {
      // 网络抖动：再试一次
    }
  }
  return null;
}

function readTimeoutMs(): number {
  const raw = process.env.LOOP_GUARD_ASK_TIMEOUT_MS;
  if (!raw) return LOOP_GUARD_DEFAULT_DECISION_TIMEOUT_MS;
  return normalizeLoopGuardDecisionTimeoutMs(Number(raw));
}

function parseDecision(body: unknown): LoopGuardDecision | null {
  if (!body || typeof body !== "object") return null;
  const d = (body as { decision?: unknown }).decision;
  if (d === "allow_once" || d === "allow_session" || d === "reject") return d;
  return null;
}
