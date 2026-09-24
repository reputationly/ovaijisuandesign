import { Controller, Delete, Get, Query, Res } from "@nestjs/common";
import type { Response } from "express";

import { ActivityService } from "./activity.service.js";

/**
 * 健康检查。
 *
 * `live` 在设了 `GATEWAY_NONCE` 时回 `X-Gateway-Nonce` 头（**只有 live 带**）。
 * 主进程拉起 gateway 后拿它比对：端口上可能还残留着上一次的 gateway，
 * 只看 200 会把旧进程当成新的，而旧进程的工作区、opencode 地址全是错的。
 *
 * `activity` 给主进程判断能否挂起/关闭；带 `drain=1` 时同时申请挂起租约
 * （快照不空闲则立即归还）。`DELETE suspend-lease` 是主进程放弃挂起时归还租约。
 */
/** 健康检查的返回体（terminus 的形状，没有注册任何检查项）。 */
const OK = { status: "ok", info: {}, error: {}, details: {} };

@Controller("api/health")
export class HealthController {
  constructor(private readonly activityService: ActivityService) {}

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

  @Get("activity")
  async activity(@Query("drain") drain?: string) {
    const draining = drain === "1";
    // 先竖闸门再算快照：快照说安全时，之后不可能再有新活开始
    if (draining) this.activityService.acquireLease();
    const snap = await this.activityService.snapshot();
    if (draining && !snap.safe_to_suspend) this.activityService.releaseLease();
    return snap;
  }

  @Delete("suspend-lease")
  releaseSuspendLease() {
    this.activityService.releaseLease();
    return { released: true };
  }

  @Get()
  health() {
    return OK;
  }
}
