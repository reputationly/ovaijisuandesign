import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";

import { ActivityService } from "../health/activity.service.js";
import { RuntimeClient } from "../runtime/runtime-client.js";
import { ChatService } from "./chat.service.js";
import { ConfirmService } from "./confirm.service.js";
import { SessionMetricsService } from "./session-metrics.service.js";

/**
 * 没有计费体系：计费分组一律回 legacy，插件和 MCP 见到它就直接放行。
 * source 必须是 MCP 认的 no_selection，别的值会被当成非法回复、拒绝提交。
 */
const LEGACY_GROUP = { group_id: null, mode: "legacy", source: "no_selection" };

/**
 * 给 opencode 插件和 MCP server 用的内部接口（按 opencode 会话 id 寻址）。
 * 静态路径写在带参数的路径前面。
 */
@Controller("api/internal/sessions")
export class InternalSessionsController {
  constructor(
    private readonly chat: ChatService,
    private readonly confirm: ConfirmService,
    private readonly runtime: RuntimeClient,
    private readonly metrics: SessionMetricsService,
    private readonly activity: ActivityService,
  ) {}

  @Get("billing-current-scope")
  billingScope() {
    return LEGACY_GROUP;
  }

  @Post("request-group-diagnostic")
  @HttpCode(200)
  diagnostic() {
    return { ok: true };
  }

  @Get("opencode-busy")
  busy() {
    return { busy: false };
  }

  /**
   * 这个 gateway 上有没有不能被打断的活：主进程重启 opencode（换 token、改技能配置）、切团队之前问一声，
   * 免得把正在跑或刚开始的一轮截断。和挂起判断用同一份活动快照（agent 在跑、写请求在飞、账上有没落地的生成）。
   */
  @Get("any-busy")
  async anyBusy() {
    const snap = await this.activity.snapshot();
    return { busy: !snap.safe_to_restart };
  }

  /** 所有会话的运行统计（最多 500 个，最近活跃的在后）。 */
  @Get("metrics")
  listMetrics() {
    return this.metrics.list();
  }

  @Get(":id/request-group")
  requestGroup() {
    return LEGACY_GROUP;
  }

  /** 根会话：内存里没有父子关系时问一次 opencode，沿 parentID 上溯（最多 10 跳）。 */
  @Get(":id/root")
  async root(@Param("id") id: string) {
    let cur = this.chat.rootOf(id);
    for (let i = 0; i < 10; i++) {
      const s = await this.runtime.getSession(cur).catch(() => undefined);
      if (!s?.parentID) break;
      cur = s.parentID;
    }
    return { rootSessionId: cur };
  }

  /** 用户在选择器里勾的媒体模型；`null` = Auto。生成工具据此拒绝未勾选的模型。 */
  @Get(":id/selected-models")
  selectedModels(@Param("id") id: string) {
    return { selected: this.chat.selectedMediaModelsOf(id) };
  }

  @Post(":id/tool-confirm/ask")
  @HttpCode(200)
  toolConfirm(@Param("id") id: string, @Body() body: { tool?: string; args?: unknown; timeout_ms?: number }) {
    const root = this.chat.rootOf(id);
    return this.confirm.askTool(root, this.chat.uiIdOf(id), String(body.tool ?? ""), body.args, Math.min(body.timeout_ms ?? 300_000, 600_000));
  }

  @Post(":id/loop-guard/ask")
  @HttpCode(200)
  async loopGuard(
    @Param("id") id: string,
    @Body() body: { tool?: string; fingerprint?: string; request_id?: string; hits?: number; window?: number; timeout_ms?: number },
  ) {
    const decision = await this.confirm.askLoopGuard(
      this.chat.rootOf(id),
      this.chat.uiIdOf(id),
      { tool: String(body.tool ?? ""), fingerprint: String(body.fingerprint ?? ""), request_id: String(body.request_id ?? ""), hits: body.hits, window: body.window },
      Math.min(body.timeout_ms ?? 30_000, 60_000),
    );
    return { decision };
  }

  @Get(":id/loop-guard/settlements/:requestId")
  settlement(@Param("requestId") requestId: string) {
    return this.confirm.settlement(requestId);
  }

  @Post(":id/loop-guard-trip")
  @HttpCode(200)
  trip(@Param("id") uiSessionId: string, @Body() body: { tool?: unknown }) {
    this.metrics.recordLoopGuardTrip(uiSessionId, typeof body?.tool === "string" ? body.tool : "unknown");
    return { ok: true };
  }

  /** 单个会话的运行统计；还没有任何事件时只回 `{uiSessionId}`，调用方当"没数据"处理。 */
  @Get(":id/metrics")
  sessionMetrics(@Param("id") uiSessionId: string) {
    return this.metrics.get(uiSessionId) ?? { uiSessionId };
  }

  /** ComfyUI 不在这个版本里：回"插件不可用"，调用方据此告诉用户而不是等一个永远不会出现的节点。 */
  @Post(":id/open-comfyui")
  @HttpCode(200)
  openComfyUi() {
    return { status: "unknown_plugin" };
  }

  @Post(":id/mcp-tool-call")
  @HttpCode(200)
  mcpToolCall() {
    return { ok: true };
  }
}

/** MCP server 启动时推过来的工具参数提示。先收下，界面的参数表单以后用。 */
@Controller("api/internal")
export class InternalToolSchemaController {
  private metas: Record<string, unknown> = {};

  @Post("tool-metas")
  @HttpCode(200)
  toolMetas(@Body() body: { metas?: Record<string, unknown> }) {
    this.metas = { ...this.metas, ...(body.metas ?? {}) };
    return { ok: true };
  }

  @Get("tool-metas")
  list() {
    return { metas: this.metas };
  }
}
