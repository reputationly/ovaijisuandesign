import { Body, Controller, Get, HttpException, HttpStatus, NotFoundException, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { GenerateAudioDto, GenerateImageDto, GenerateVideoDto } from "./generate.dto.js";
import { MediaConfigService } from "./media-config.service.js";
import type { GenerationRequest, MediaType } from "./generation-request.js";
import { type GenerationSource, GenerationRunner } from "./generation-runner.service.js";
import { buildCatalog } from "./model-catalog.js";

/**
 * 异步生成：submit 立刻回 task_id，调用方拿它轮询 query。
 * `session_id` 取自 `x-session-id` 头（MCP 按插件注入的会话上下文带上），来源取自 `x-hilo-source`；
 * 画布发起的生成不归属任何对话，丢掉 session_id。
 *
 * submit 的请求体不走严格校验：旧界面的出图不带 `backend` / `filename`，参照的 DTO 会把它拒掉。
 */
@Controller()
export class GenerateAsyncController {
  constructor(private readonly runner: GenerationRunner) {}

  @Post("api/generate/image/submit")
  submitImage(@Body() body: GenerationRequest, @Req() req: Request) {
    rejectBatchShape(body);
    return this.submit("image", body, req);
  }

  @Post("api/generate/video/submit")
  submitVideo(@Body() body: GenerationRequest, @Req() req: Request) {
    rejectBatchShape(body);
    if (body?.new_round) {
      throw new HttpException(
        { ok: false, error: "video new_round path is not supported by async endpoint", error_code: "VIDEO_NEW_ROUND_NOT_SUPPORTED_USE_SYNC" },
        HttpStatus.CONFLICT,
      );
    }
    return this.submit("video", body, req);
  }

  @Post("api/generate/speech/submit")
  submitSpeech(@Body() body: GenerationRequest, @Req() req: Request) {
    return this.submit("speech", body, req);
  }

  @Post("api/generate/music/submit")
  submitMusic(@Body() body: GenerationRequest, @Req() req: Request) {
    return this.submit("music", body, req);
  }

  /**
   * 同步版：提交后等到终态再回。成功回结果本身（`{ok:true, path, width?, height?, duration?, node_id?}`），
   * 失败回 `{ok:false, error, error_code, user_message}`。和异步版走同一套占位卡、记账和落地，
   * 调用方断开也不影响任务跑完、落到画布上。
   */
  @Post("api/generate/image")
  generateImage(@Body() body: GenerateImageDto, @Req() req: Request) {
    return this.submitAndWait("image", body, req);
  }

  @Post("api/generate/video")
  generateVideo(@Body() body: GenerateVideoDto, @Req() req: Request) {
    return this.submitAndWait("video", body, req);
  }

  @Post("api/generate/speech")
  generateSpeech(@Body() body: GenerateAudioDto, @Req() req: Request) {
    return this.submitAndWait("speech", body, req);
  }

  @Post("api/generate/music")
  generateMusic(@Body() body: GenerateAudioDto, @Req() req: Request) {
    return this.submitAndWait("music", body, req);
  }

  @Get("api/generate/metrics")
  metrics() {
    return this.runner.metricsSnapshot();
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
      user_message: taskNotFoundUserMessage(),
    });
  }

  private async submit(media: MediaType, body: GenerationRequest, req: Request) {
    const source = sourceOf(header(req, "x-hilo-source"));
    const r = await this.runner.submit(media, withSession(body ?? {}, req, source), source);
    this.runner.countAsyncSubmit();
    return r;
  }

  private async submitAndWait(media: MediaType, body: GenerateImageDto | GenerateVideoDto | GenerateAudioDto, req: Request) {
    this.runner.countLegacySync(media);
    const source = sourceOf(header(req, "x-hilo-source"));
    const session = source === "canvas" ? undefined : header(req, "x-session-id");
    const sub = await this.runner.submit(media, { ...body, ...(session ? { session_id: session } : {}) } as GenerationRequest, source);
    const done = await this.runner.waitFor(String(sub.task_id));
    if (done?.status === "succeeded") return done.result;
    if (done?.status === "failed") return { ok: false, error: done.error, error_code: done.error_code, ...(done.user_message ? { user_message: done.user_message } : {}) };
    return { ok: false, error: "generation did not reach a terminal state", error_code: "unknown" };
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
  concurrencyUsage(@Body() body: { models?: unknown }) {
    const raw = Array.isArray(body?.models) ? body.models.filter((m): m is string => typeof m === "string") : [];
    // 去空白、去重，保持首次出现的顺序。
    const models = [...new Set(raw.map((m) => m.trim()).filter(Boolean))];
    return { items: this.runner.usage(models) };
  }

  @Get("api/generation-queue/summary")
  queueSummary() {
    return this.runner.summary();
  }

  /** 我们没有排队（提交即运行），暂停排队中的任务无从谈起。 */
  @Post("api/generation-queue/cancel")
  cancelQueue() {
    return { ok: true, paused: false };
  }

  /**
   * `preserve_original`：用户在「重新生成」里点了取消，原来那张要留着。我们的原地替换在结果落地前
   * 不动原节点，撤掉进行中的任务就等于保住了原节点，所以 dismissed 和 cancelled 是同一件事。
   */
  @Post("api/generation/cancel")
  async cancel(@Body() body: { node_id?: unknown; preserve_original?: unknown }) {
    const nodeId = typeof body?.node_id === "string" ? body.node_id.trim() : "";
    if (!nodeId) return { ok: true, cancelled: false, task_ids: [] };
    const r = await this.runner.cancelByNode(nodeId);
    return { ok: true, cancelled: r.cancelled, ...(body?.preserve_original === true ? { dismissed: r.cancelled } : {}), task_ids: r.taskIds };
  }
}

function header(req: Request, name: string): string | undefined {
  const v = req.headers[name];
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

function sourceOf(v: string | undefined): GenerationSource {
  if (v === "canvas") return "canvas";
  if (v === "agent" || v === "mcp") return "agent";
  return "unknown";
}

/** 画布来源丢掉 session_id；其余来源请求体里没有时用 `x-session-id` 头补上。 */
function withSession(body: GenerationRequest, req: Request, source: GenerationSource): GenerationRequest {
  if (source === "canvas") {
    const { session_id: _dropped, ...rest } = body;
    return rest;
  }
  const session = header(req, "x-session-id");
  return body.session_id || !session ? body : { ...body, session_id: session };
}

/** 异步路由一次只跑一个任务，多张 / 多条提示词要走同步路由。 */
function rejectBatchShape(body: GenerationRequest | undefined): void {
  if (typeof body?.count === "number" && body.count > 1) {
    throw new HttpException({ ok: false, error: "batch (count>1) is not supported by async endpoint", error_code: "BATCH_NOT_SUPPORTED_USE_SYNC" }, HttpStatus.CONFLICT);
  }
  if (Array.isArray(body?.prompts) && body.prompts.length > 1) {
    throw new HttpException(
      { ok: false, error: "batch (multiple prompts) is not supported by async endpoint", error_code: "BATCH_NOT_SUPPORTED_USE_SYNC" },
      HttpStatus.CONFLICT,
    );
  }
}

/** 界面语言由主进程经 `HILO_USER_LANG` 传进来；我们的主进程还没传，界面默认中文，缺省按中文。 */
function taskNotFoundUserMessage(): string {
  const lang = process.env.HILO_USER_LANG ?? "zh";
  return lang.startsWith("zh")
    ? "上游生成任务未找到，可能已过期或被清理，请重新生成。"
    : "The upstream generation task was not found. It may have expired or been cleared; please generate again.";
}
