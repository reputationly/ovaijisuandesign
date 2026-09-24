import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { GenerateFailure } from "./schemas.js";

/**
 * 工具结果的统一形状。一律回本地路径字符串，不用 resource_link / image content。
 */

/** 成功：structuredContent + 同一对象的 JSON 文本（有的客户端只看 content）。 */
export function structuredReply(data: Record<string, unknown>): CallToolResult {
  return { structuredContent: data, content: [{ type: "text", text: JSON.stringify(data) }] };
}

export function textReply(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

/** 普通失败：`isError: true` + `Error: …` 文本。 */
export function errorReply(err: unknown): CallToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return { isError: true, content: [{ type: "text", text: `Error: ${message}` }] };
}

type GenerationFailureLike = Pick<GenerateFailure, "error"> &
  Partial<Omit<GenerateFailure, "ok" | "error" | "error_code">> & { error_code?: string };

/**
 * 生成类失败。recoverable / status_unknown 表示任务可能还在跑或已经扣费：
 * 加 `do_not_resubmit: true` 且 `isError: false`，免得 agent 当成失败立刻重提交重复扣费。
 * 只有 terminal（及未标注）才是 `isError: true`。
 */
export function generationErrorReply(r: GenerationFailureLike): CallToolResult {
  const structured: Record<string, unknown> = {
    ok: false,
    error: r.error,
    error_code: r.error_code ?? "unknown",
    ...(r.user_message ? { user_message: r.user_message } : {}),
    ...(r.failure_presentation ? { failure_presentation: r.failure_presentation } : {}),
    ...(r.recovery_handle ? { recovery_handle: r.recovery_handle } : {}),
    ...(r.billing ? { billing: r.billing } : {}),
  };
  const nonTerminal = r.failure_presentation === "recoverable" || r.failure_presentation === "status_unknown";
  const payload = nonTerminal ? { ...structured, do_not_resubmit: true } : structured;
  return {
    structuredContent: payload,
    content: [{ type: "text", text: JSON.stringify(payload) }],
    isError: !nonTerminal,
  };
}

export function generationUnknownReply(message: string): CallToolResult {
  return generationErrorReply({ error: message, error_code: "unknown", failure_presentation: "status_unknown" });
}
