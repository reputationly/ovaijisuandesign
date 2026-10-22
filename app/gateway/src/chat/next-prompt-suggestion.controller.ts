/**
 * 「下一步提示建议」的 HTTP 入口。
 *
 * 移植自 4.0.3 的 `gateway/dist/next-prompt-suggestion/next-prompt-suggestion.controller.js`：
 *   POST /api/sessions/:id/next-prompt-suggestion
 * 路由前缀由全局配置加上，这里只写 `:id/next-prompt-suggestion`。
 *
 * 与参照一致的三个细节：
 *   · 会话 id 先做格式校验（只允许字母数字下划线短横），否则 400
 *   · 用 AbortController 接 res 的 close —— 前端取消请求时立刻停止生成
 *   · 永远返回 { suggestion, source }，生成不出来就是 suggestion: null（不是错误）
 */

import { BadRequestException, Controller, HttpCode, Inject, Param, Post, Res } from "@nestjs/common";
import type { Response } from "express";

import { NextPromptSuggestionService } from "./next-prompt-suggestion/next-prompt-suggestion.service.js";

@Controller()
export class NextPromptSuggestionController {
  constructor(
    @Inject(NextPromptSuggestionService)
    private readonly service: NextPromptSuggestionService,
  ) {}

  @Post(":id/next-prompt-suggestion")
  @HttpCode(200)
  async suggest(@Param("id") id: string, @Res() res: Response) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new BadRequestException("Invalid session ID format");
    }
    const result = await this.service.suggest(id);
    res.json(result);
  }
}
