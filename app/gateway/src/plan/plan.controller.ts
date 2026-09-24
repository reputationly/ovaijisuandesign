import { Body, Controller, HttpCode, Post } from "@nestjs/common";

import { GatewayEventBus } from "../common/gateway-event-bus.js";

export const PLAN_CHANGE_ACTIONS = ["write", "patch_stage", "patch_work_items", "update_stage_state", "remove_stage", "replan"] as const;

/**
 * 计划（Stage Execution Plan）。计划文件由 MCP 的 plan 工具直接读写，gateway 只负责把
 * "计划变了"转成 `plan_changed` 广播给制作看板。
 */
@Controller("api/plan")
export class PlanController {
  constructor(private readonly bus: GatewayEventBus) {}

  /**
   * 不等结果的通知：MCP 那边写盘已经成功了，这里的任何失败都不该回传过去。字段不齐就
   * 静默忽略（仍回 ok）—— 看板会在下一次兜底刷新时补上。
   */
  @Post("notify-changed")
  @HttpCode(200)
  notifyChanged(@Body() body: Record<string, unknown>) {
    const planId = typeof body?.plan_id === "string" ? body.plan_id.trim() : "";
    const revision = typeof body?.revision === "number" ? body.revision : Number.NaN;
    const action = (PLAN_CHANGE_ACTIONS as readonly unknown[]).includes(body?.action) ? (body.action as string) : undefined;
    if (!planId || !Number.isFinite(revision) || !action) return { ok: true };
    const stageIds = Array.isArray(body.stage_ids) ? body.stage_ids.filter((s): s is string => typeof s === "string") : [];
    const runtimeSessionId = typeof body.runtime_session_id === "string" ? body.runtime_session_id.trim() : "";
    this.bus.emit("plan:changed", {
      type: "plan_changed",
      plan_id: planId,
      revision,
      action,
      ...(stageIds.length ? { stage_ids: stageIds } : {}),
      ...(runtimeSessionId ? { runtime_session_id: runtimeSessionId } : {}),
    });
    return { ok: true };
  }
}
