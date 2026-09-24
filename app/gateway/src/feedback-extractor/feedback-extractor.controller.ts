import { Body, Controller, HttpCode, Post } from "@nestjs/common";

/**
 * 反馈自动提取的开关与"手动写过记忆"通知。我们没有会话结束后的自动提取，两个接口都只
 * 收下请求回 ok —— MCP 的 memory 工具是不等结果地发通知，回错只会在它那边刷日志。
 */
@Controller("api/feedback-extractor")
export class FeedbackExtractorController {
  private enabled = false;

  @Post("config")
  @HttpCode(200)
  setConfig(@Body() body: Record<string, unknown>) {
    this.enabled = Boolean(body?.enabled);
    return { ok: true, enabled: this.enabled };
  }

  @Post("notify-manual-write")
  @HttpCode(200)
  notifyManualWrite() {
    return { ok: true };
  }
}
