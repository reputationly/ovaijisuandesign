import { sessionEndpoint, withGatewayIdentity } from "../gateway-identity.js";

/**
 * hub 工具执行前的确认。"询问"模式下 gateway 弹卡片等用户拍板（默认最多 5 分钟），
 * 其余模式 gateway 直接回 confirm。
 *
 * gateway 不可用（出错、超时、回了看不懂的东西）时：花钱的工具宁可拒绝，其余放行 ——
 * 确认服务不在的时候，花钱的操作不能默认放行。
 */
export const TOOL_CONFIRM_TIMEOUT_ENV = "HILO_TOOL_CONFIRM_TIMEOUT_MS";
const TOOL_CONFIRM_DEFAULT_TIMEOUT_MS = 300_000;
const TOOL_CONFIRM_TRANSPORT_GRACE_MS = 10_000;
const MAX_DECISION_TIMEOUT_MS = 2_147_483_647 - TOOL_CONFIRM_TRANSPORT_GRACE_MS;

export const TOOL_CONFIRM_REJECT_REASONS = ["user_rejected", "confirmation_expired", "confirmation_unavailable"] as const;
export type ToolConfirmRejectReason = (typeof TOOL_CONFIRM_REJECT_REASONS)[number];

export interface ToolConfirmResult {
  decision: "confirm" | "reject";
  reject_reason?: ToolConfirmRejectReason;
  modified_args?: Record<string, unknown>;
}

export function normalizeToolConfirmTimeoutMs(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > MAX_DECISION_TIMEOUT_MS) {
    return TOOL_CONFIRM_DEFAULT_TIMEOUT_MS;
  }
  const normalized = Math.floor(value);
  return normalized === 0 ? TOOL_CONFIRM_DEFAULT_TIMEOUT_MS : normalized;
}

function isToolConfirmRejectReason(value: unknown): value is ToolConfirmRejectReason {
  return typeof value === "string" && (TOOL_CONFIRM_REJECT_REASONS as readonly string[]).includes(value);
}

export function formatToolConfirmRejectReasonMarker(reason: ToolConfirmRejectReason): string {
  return `[tool-confirm-reject:${reason}]`;
}

export async function askToolConfirmViaGateway(
  gatewayUrl: string,
  input: { sessionID: string; tool: string; args: unknown },
): Promise<ToolConfirmResult> {
  const url = sessionEndpoint(gatewayUrl, input.sessionID, "tool-confirm/ask");
  const timeoutMs = configuredToolConfirmTimeoutMs();
  try {
    const resp = await fetch(
      url,
      withGatewayIdentity({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tool: input.tool, args: input.args, timeout_ms: timeoutMs }),
        signal: AbortSignal.timeout(timeoutMs + TOOL_CONFIRM_TRANSPORT_GRACE_MS),
      }),
    );
    if (!resp.ok) {
      const fallback = fallbackResult(input.tool);
      console.warn(`[hilo-plugin] [tool-confirm] ask HTTP ${resp.status} session=${input.sessionID} tool=${input.tool}; defaulting to ${fallback.decision}`);
      return fallback;
    }
    const body: unknown = await resp.json();
    const parsed = parseResult(body);
    if (parsed) return parsed;
    const fallback = fallbackResult(input.tool);
    console.warn(
      `[hilo-plugin] [tool-confirm] ask got malformed body=${JSON.stringify(body)} session=${input.sessionID} tool=${input.tool}; defaulting to ${fallback.decision}`,
    );
    return fallback;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const fallback = fallbackResult(input.tool);
    console.warn(`[hilo-plugin] [tool-confirm] ask failed session=${input.sessionID} tool=${input.tool}: ${msg}; defaulting to ${fallback.decision}`);
    return fallback;
  }
}

function configuredToolConfirmTimeoutMs(): number {
  const raw = process.env[TOOL_CONFIRM_TIMEOUT_ENV];
  return normalizeToolConfirmTimeoutMs(raw === undefined ? undefined : Number(raw));
}

function parseResult(body: unknown): ToolConfirmResult | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { decision?: unknown; modified_args?: unknown; reject_reason?: unknown };
  const d = b.decision;
  if (d !== "confirm" && d !== "reject") return null;
  return {
    decision: d,
    ...(d === "reject" ? { reject_reason: isToolConfirmRejectReason(b.reject_reason) ? b.reject_reason : "confirmation_unavailable" } : {}),
    ...(b.modified_args && typeof b.modified_args === "object" ? { modified_args: b.modified_args as Record<string, unknown> } : {}),
  };
}

function fallbackResult(tool: string): ToolConfirmResult {
  return isHighCostTool(tool) ? { decision: "reject", reject_reason: "confirmation_unavailable" } : { decision: "confirm" };
}

export function isHighCostTool(tool: string): boolean {
  return tool.includes("_generation") || tool.includes("generate_") || tool === "hub_music_cover";
}
