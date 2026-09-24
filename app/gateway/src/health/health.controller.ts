import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";

/**
 * 健康检查。
 *
 * `live` 在设了 `GATEWAY_NONCE` 时回 `X-Gateway-Nonce` 头（**只有 live 带**）。
 * 主进程拉起 gateway 后拿它比对：端口上可能还残留着上一次的 gateway，
 * 只看 200 会把旧进程当成新的，而旧进程的工作区、opencode 地址全是错的。
 */
/** 健康检查的返回体（terminus 的形状，没有注册任何检查项）。 */
const OK = { status: "ok", info: {}, error: {}, details: {} };

@Controller("api/health")
export class HealthController {
  @Get("live")
  live(@Res({ passthrough: true }) res: Response) {
    const nonce = process.env.GATEWAY_NONCE;
    if (nonce) res.setHeader("X-Gateway-Nonce", nonce);
    return OK;
  }

  @Get("ready")
  ready() {
    return OK;
  }

  @Get()
  health() {
    return OK;
  }
}
