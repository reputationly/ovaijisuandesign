import { BadRequestException, Body, Controller, Post } from "@nestjs/common";

const MAX_BYTES = 102_400;

/**
 * 文本安全检查。我们没有云端审核服务，一律放行（`decision: "bypass"`）；
 * 长度和类型照样校验，调用方（MCP 的写文本节点）按同样的约束分块。
 */
@Controller("api/safety")
export class SafetyController {
  @Post("check-text")
  checkText(@Body() body: { content?: unknown }) {
    if (typeof body?.content !== "string") throw new BadRequestException("`content` must be a string");
    if (Buffer.byteLength(body.content, "utf8") > MAX_BYTES) {
      throw new BadRequestException(`content exceeds ${MAX_BYTES} bytes; split caller-side`);
    }
    return { pass: true, decision: "bypass" };
  }
}
