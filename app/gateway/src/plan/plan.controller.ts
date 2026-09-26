import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Patch, Post, Query } from "@nestjs/common";

import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { patchStageWorkItems, PlanStoreError, planFileToReviewModel, readPlanFile, type ReferenceItemInput, type WorkItemPatch } from "./plan-file.js";

export const PLAN_CHANGE_ACTIONS = ["write", "patch_stage", "patch_work_items", "update_stage_state", "remove_stage", "replan"] as const;

/**
 * 计划（Stage Execution Plan）。计划文件由 MCP 的 plan 工具创建和推进；gateway 给制作看板出审阅视图、
 * 接用户在审阅阶段对工作项的修改，并把"计划变了"转成 `plan_changed` 广播。
 */
@Controller("api/plan")
export class PlanController {
  constructor(
    private readonly bus: GatewayEventBus,
    private readonly paths: WorkspacePathService,
  ) {}

  /** 计划在 gateway 的基准目录下（app-level 没绑工作区时是它的输出目录，那里没有计划，查了回 404）。 */
  private projectRoot(_action: string): string {
    return this.paths.root;
  }

  @Get("review")
  async review(@Query("id") id?: string) {
    if (!id?.trim()) throw new BadRequestException("Query param `id` (stage plan id) is required.");
    if (/[\\/]/.test(id)) throw new BadRequestException("Invalid stage plan id.");
    try {
      return planFileToReviewModel(await readPlanFile(this.projectRoot("Plan review"), id));
    } catch (err) {
      if (err instanceof PlanStoreError && err.code === "not_found") throw new NotFoundException(`Stage plan not found: ${id}`);
      if (err instanceof PlanStoreError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  /** body 按原始对象收：字段逐个校验，报错信息说清楚是哪个字段。 */
  @Patch("stage-work-items")
  async patchWorkItems(@Body() body: Record<string, unknown>) {
    const planId = typeof body?.plan_id === "string" ? body.plan_id.trim() : "";
    const stageId = typeof body?.stage_id === "string" ? body.stage_id.trim() : "";
    if (!planId || /[\\/]/.test(planId)) throw new BadRequestException("Invalid plan_id.");
    if (!stageId) throw new BadRequestException("stage_id is required.");
    const expected = body.expected_revision;
    if (typeof expected !== "number" || !Number.isInteger(expected) || expected < 1) throw new BadRequestException("expected_revision must be a positive integer.");
    if (!Array.isArray(body.patches) || body.patches.length === 0) throw new BadRequestException("patches must contain at least one work item patch.");
    if (body.reference_items !== undefined && !Array.isArray(body.reference_items)) throw new BadRequestException("reference_items must be an array when provided.");
    try {
      const result = await patchStageWorkItems(this.projectRoot("Plan update"), planId, {
        stage_id: stageId,
        expected_revision: expected,
        patches: body.patches as WorkItemPatch[],
        ...(body.reference_items ? { reference_items: body.reference_items as ReferenceItemInput[] } : {}),
      });
      if (result.changed_item_ids.length > 0) {
        this.bus.emit("plan:changed", { type: "plan_changed", plan_id: planId, revision: result.plan.revision, action: "patch_work_items", stage_ids: [stageId] });
      }
      return { ok: true, plan_id: planId, stage_id: stageId, revision: result.plan.revision, changed_item_ids: result.changed_item_ids };
    } catch (err) {
      if (err instanceof PlanStoreError && err.code === "not_found") throw new NotFoundException(err.message);
      if (err instanceof PlanStoreError && err.code === "revision_conflict") throw new ConflictException(err.message);
      if (err instanceof PlanStoreError) throw new BadRequestException(err.message);
      throw err;
    }
  }

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
