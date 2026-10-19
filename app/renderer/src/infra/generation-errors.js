import { __jsx } from "../shared/jsx-runtime.js";
// 生成失败的错误码和展示文案。


export const GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT = "image_aspect_ratio_conflict";
export const GENERATE_ERROR_CODES = /* @__PURE__ */new Set(["client_error", "backend_error", "billing_insufficient_balance", "concurrency_limit", GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT, "network_connect_timeout", "content_policy_violation", "timeout", "unavailable", "shutdown", "network_error", "storage_full", "queue_paused", "WORKSPACE_CONCURRENCY_LIMIT_REACHED", "unknown"]);
export function normalizeGenerationFailurePresentation(value) {
  return value === "terminal" || value === "recoverable" || value === "status_unknown" ? value : void 0;
}
export function normalizeGenerateErrorCode(value, fallback) {
  return typeof value === "string" && GENERATE_ERROR_CODES.has(value) ? value : fallback;
}
export class ApiError extends Error {
  status;
  body;
  url;
  method;
  /** Error category for structured error handling */
  type;
  /**
   * ADR-009 AnthropicError shape parsed from body. `undefined` when body is
   * not AnthropicError-shaped (e.g. plain text 404, empty body, or vendor
   * non-AnthropicError). Fields are extracted from `error.{type, message,
   * user_message, code}`.
   */
  parsedError;
  constructor(status, body, url, method, type, preParsedError) {
    const errorType = type ?? "http";
    let computedParsed;
    if (preParsedError) {
      computedParsed = preParsedError;
    } else {
      try {
        const parsed = JSON.parse(body);
        if (parsed && typeof parsed === "object" && "error" in parsed) {
          const err = parsed.error;
          if (err && typeof err === "object") {
            const detail = err;
            computedParsed = {
              type: typeof detail.type === "string" ? detail.type : void 0,
              message: typeof detail.message === "string" ? detail.message : void 0,
              user_message: typeof detail.user_message === "string" ? detail.user_message : void 0,
              code: typeof detail.code === "string" ? detail.code : void 0
            };
          }
        }
      } catch {}
    }
    const displayText = computedParsed?.user_message ?? computedParsed?.message ?? body;
    super(`API ${errorType} error ${status}: ${displayText}`);
    this.status = status;
    this.body = body;
    this.url = url;
    this.method = method;
    this.name = "ApiError";
    this.type = errorType;
    this.parsedError = computedParsed;
  }
  /**
   * 给桌面端 / 画布 / UI 展示的最终消息文本。
   *
   *   if (err instanceof ApiError) {
   *     // 仅当 catch 块 **直接驱动 UI 展示** 时（如 canvas placeholder
   *     // error 文本）用这个。
   *   }
   *
   * fallback 优先级（受众拆分语义见 ADR-009「2026-06 修订」）：
   *   1. parsedError.user_message — i18n 翻译文案，可带 inline HTML <a>
   *   2. parsedError.message      — vendor raw（i18n mapper 未命中时给用户的最后兜底）
   *   3. body                     — parsedError 整个抽取失败时的最终兜底
   *
   * ⚠️ **不要**用 `displayMessage` 给 agent 链路 —— agent 链路应该用 `agentMessage`，
   * 否则 agent 会看到 user_message 里的文档链接（受众错位）。
   */
  get displayMessage() {
    if (this.parsedError?.user_message) return this.parsedError.user_message;
    if (this.parsedError?.message) return this.parsedError.message;
    return this.body;
  }
  /**
   * 给 agent / mcp-tools / 自动决策 用的 vendor-faithful 消息。
   *
   *   if (err instanceof ApiError) {
   *     // 走 MCP tool error、agent reasoning 时用这个，避免 user_message 里的
   *     // HTML 文档链接污染 agent context。
   *   }
   *
   * fallback 优先级：
   *   1. parsedError.message — vendor raw
   *   2. body                — 最终兜底
   *
   * **绝不**返回 `parsedError.user_message`。
   */
  get agentMessage() {
    if (this.parsedError?.message) return this.parsedError.message;
    return this.body;
  }
}
