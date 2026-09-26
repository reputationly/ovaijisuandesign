import { HttpException, HttpStatus } from "@nestjs/common";

export const CAPABILITY_UNAVAILABLE = "CAPABILITY_UNAVAILABLE";

/**
 * 平台没有这项能力时的统一回法：503 + `{ok:false, error, user_message, error_code}`。
 *
 * 形状和编辑类接口失败时一致：渲染层的错误提示取 `user_message`，MCP 工具把 `error` 原样转给 agent。
 * 给一个说得清的"不支持"，而不是让请求去撞一个不存在的上游、最后报一个看不懂的网络错误；
 * 也不拿别的模型顶上 —— 顶上去往往能"成功"返回一个完全不对的结果。
 * 在任何占位卡、任何平台调用之前就回，画布上不会留下一张永远转圈的卡。
 */
export function capabilityUnavailable(feature: string, userMessage: string, detail = "the configured platform has no model for it"): HttpException {
  return new HttpException(
    {
      ok: false,
      error: `${feature} is not available: ${detail}.`,
      user_message: userMessage,
      error_code: CAPABILITY_UNAVAILABLE,
    },
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}
