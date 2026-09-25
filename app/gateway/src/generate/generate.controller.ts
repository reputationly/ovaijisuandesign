import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { MediaConfigService } from "./media-config.service.js";
import type { GenerationRequest, MediaType } from "./generation-request.js";
import { type GenerationSource, GenerationRunner } from "./generation-runner.service.js";
import { buildCatalog } from "./model-catalog.js";

/**
 * 异步生成：submit 立刻回 task_id，调用方拿它轮询 query。
 * `session_id` 取自 `x-session-id` 头（MCP 按插件注入的会话上下文带上），来源取自 `x-hilo-source`。
 */
@Controller()
export class GenerateAsyncController {
  constructor(private readonly runner: GenerationRunner) {}

  @Post("api/generate/image/submit")
  @HttpCode(200)
  submitImage(@Body() body: GenerationRequest, @Req() req: Request) {
    return this.submit("image", body, req);
  }

  @Post("api/generate/video/submit")
  @HttpCode(200)
  submitVideo(@Body() body: GenerationRequest, @Req() req: Request) {
    return this.submit("video", body, req);
  }

  @Post("api/generate/speech/submit")
  @HttpCode(200)
  submitSpeech(@Body() body: GenerationRequest, @Req() req: Request) {
    return this.submit("speech", body, req);
  }

  @Post("api/generate/music/submit")
  @HttpCode(200)
  submitMusic(@Body() body: GenerationRequest, @Req() req: Request) {
    return this.submit("music", body, req);
  }

  /**
   * 同步版：提交后等到终态，回和 query 一样的形状（成功带 result / asset，失败 ok:false）。
   * 画布弹层直接调；和异步版走同一套占位卡、记账和落地，只是这个请求挂到结果出来为止。
   */
  @Post("api/generate/image")
  @HttpCode(200)
  generateImage(@Body() body: GenerationRequest, @Req() req: Request) {
    return this.submitAndWait("image", body, req);
  }

  @Post("api/generate/video")
  @HttpCode(200)
  generateVideo(@Body() body: GenerationRequest, @Req() req: Request) {
    return this.submitAndWait("video", body, req);
  }

  @Post("api/generate/speech")
  @HttpCode(200)
  generateSpeech(@Body() body: GenerationRequest, @Req() req: Request) {
    return this.submitAndWait("speech", body, req);
  }

  @Post("api/generate/music")
  @HttpCode(200)
  generateMusic(@Body() body: GenerationRequest, @Req() req: Request) {
    return this.submitAndWait("music", body, req);
  }

  @Get("api/generate/metrics")
  metrics() {
    const s = this.runner.summary();
    return { active_generation_records: { total: s.running } };
  }

  @Get("api/generate/tasks/:task_id/query")
  query(@Param("task_id") taskId: string) {
    const r = this.runner.query(taskId);
    if (r) return r;
    throw new NotFoundException({
      ok: false,
      task_id: taskId,
      error: "task_id not found",
      error_code: "TASK_NOT_FOUND",
      user_message: "生成任务未找到，可能已过期或被清理，请重新生成。",
    });
  }

  private submit(media: MediaType, body: GenerationRequest, req: Request, defaultSource: GenerationSource = "agent") {
    const session = header(req, "x-session-id");
    const enriched: GenerationRequest = { ...(body ?? {}), ...(session && !body?.session_id ? { session_id: session } : {}) };
    return this.runner.submit(media, enriched, sourceOf(header(req, "x-hilo-source"), defaultSource));
  }

  private async submitAndWait(media: MediaType, body: GenerationRequest, req: Request) {
    // 同步路由是给画布用的，没标来源时按画布算。
    const sub = await this.submit(media, body, req, "canvas");
    return (await this.runner.waitFor(String(sub.task_id))) ?? sub;
  }
}

/** 模型目录、并发、队列、取消。 */
@Controller()
export class GenerateController {
  constructor(
    private readonly runner: GenerationRunner,
    private readonly media: MediaConfigService,
  ) {}

  @Get("api/models")
  listModels() {
    return buildCatalog(this.media.load());
  }

  @Get("api/v1/models/config")
  listModelsConfig() {
    return buildCatalog(this.media.load());
  }

  @Get("api/models/image")
  listImageModels() {
    return buildCatalog(this.media.load()).imageModels;
  }

  @Get("api/models/video")
  listVideoModels() {
    return buildCatalog(this.media.load()).videoModels;
  }

  @Get("api/models/music")
  listMusicModels() {
    return buildCatalog(this.media.load()).audioModels.filter((m) => m.tool_names.includes("hub_generate_audio_music"));
  }

  @Get("api/models/speech")
  listSpeechModels() {
    return buildCatalog(this.media.load()).audioModels.filter((m) => m.tool_names.includes("hub_generate_audio_speech"));
  }

  @Get("api/mention-models")
  listMentionModels() {
    const c = buildCatalog(this.media.load());
    return [...c.imageModels, ...c.videoModels, ...c.audioModels].map((m) => ({ id: m.id, name: m.display_name, mention_name: m.mention_name, type: m.type }));
  }

  /** 平台没有公布并发上限，不给数字：给一个猜的上限会让 agent 按它排队或拒绝提交。 */
  @Get("api/v1/models/concurrency/limits")
  concurrencyLimits() {
    return { items: [] };
  }

  @Post("api/v1/models/concurrency/usage")
  @HttpCode(200)
  concurrencyUsage(@Body() body: { models?: unknown }) {
    const models = Array.isArray(body?.models) ? body.models.filter((m): m is string => typeof m === "string") : [];
    return { items: this.runner.usage(models) };
  }

  @Get("api/generation-queue/summary")
  queueSummary() {
    return this.runner.summary();
  }

  /** 我们没有排队（提交即运行），暂停排队中的任务无从谈起。 */
  @Post("api/generation-queue/cancel")
  @HttpCode(200)
  cancelQueue() {
    return { ok: true, paused: false };
  }

  @Post("api/generation/cancel")
  @HttpCode(200)
  async cancel(@Body() body: { node_id?: unknown }) {
    const nodeId = typeof body?.node_id === "string" ? body.node_id.trim() : "";
    if (!nodeId) return { ok: true, cancelled: false, task_ids: [] };
    const r = await this.runner.cancelByNode(nodeId);
    return { ok: true, cancelled: r.cancelled, task_ids: r.taskIds };
  }
}

function header(req: Request, name: string): string | undefined {
  const v = req.headers[name];
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

function sourceOf(v: string | undefined, fallback: GenerationSource): GenerationSource {
  if (v === "canvas") return "canvas";
  if (v === "agent" || v === "mcp") return "agent";
  return v ? "unknown" : fallback;
}
