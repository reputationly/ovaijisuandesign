import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, Inject, Injectable, Logger, Optional, type OnApplicationBootstrap } from "@nestjs/common";
import { toAssetInfo } from "@ov/assets";
import { PlatformError, route, video } from "@ov/maas-media";

import { CanvasService } from "../canvas/canvas.service.js";
import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { GatewayConfig } from "../config/gateway-config.js";
import { VoiceLibraryService } from "../speech/voice-library.service.js";
import { type ActiveGenerationRecord, ActiveGenerationsStore } from "./active-generations.store.js";
import { type GenerationRequest, type MediaType, displayModel, runOnPlatform, submittedImageInputs } from "./generation-request.js";
import { downloadMediaToDir } from "./media-download.js";
import { withStagedWatermark } from "./staged-watermark.js";
import { WatermarkService, type WatermarkKind } from "../watermark/watermark.service.js";
import { MediaConfigService } from "./media-config.service.js";
import { ProjectTaskService } from "./tasks.js";

/** 轮询方看到的终态。成功的结果留一段时间，调用方晚到的查询也能拿到同一份。 */
type Settled =
  | { status: "succeeded"; result: Record<string, unknown>; asset: Record<string, unknown>; at: number }
  | { status: "failed"; error: string; error_code: string; user_message: string; at: number };

const SETTLED_TTL_MS = 60 * 60_000;

export type GenerationSource = "canvas" | "agent" | "unknown";

/**
 * 生成的全过程：建占位卡 → 记账 → 交给平台 → 下载落盘 → 登记资产 → 占位卡原地换成结果。
 *
 * **每个任务由 gateway 自己在后台跑到终态**，轮询只是读状态。调用方（MCP 进程）随时可能
 * 没了 —— 用户停掉对话、opencode 重启 —— 平台上的任务已经付过钱，结果照样要落到画布上。
 */
@Injectable()
export class GenerationRunner implements OnApplicationBootstrap {
  private readonly log = new Logger("Generate");
  private readonly running = new Map<string, { record: ActiveGenerationRecord; source: GenerationSource; cancelled: boolean; done: Promise<void> }>();
  private readonly settled = new Map<string, Settled>();
  /** `/api/generate/metrics` 的计数。进程内的，重启清零。 */
  private readonly counters = {
    asyncSubmitSucceeded: 0,
    completedCacheHit: 0,
    completedCacheMiss: 0,
    legacySync: { image: 0, video: 0, speech: 0, music: 0, other: 0 },
    needsUserAction: { image: 0, video: 0, audio: 0, other: 0 },
  };

  constructor(
    private readonly gw: GatewayConfig,
    private readonly paths: WorkspacePathService,
    private readonly store: ActiveGenerationsStore,
    private readonly media: MediaConfigService,
    private readonly assets: AssetsService,
    private readonly canvas: CanvasService,
    private readonly voices: VoiceLibraryService,
    private readonly watermark: WatermarkService,
    @Optional() @Inject(ProjectTaskService) private readonly tasks?: ProjectTaskService,
  ) {}

  /** 启动时把账上的任务接回来。app-level gateway 没有工作区，没有账。 */
  async onApplicationBootstrap(): Promise<void> {
    if (this.gw.role === "app-level") return;
    const records = await this.store.list().catch(() => []);
    for (const r of records) {
      if (r.platformTaskId) {
        this.log.log(`[recover] resume ${r.mediaType} task=${r.taskId} platform=${r.platformTaskId}`);
        this.start(r, "unknown", r.platformTaskId);
        continue;
      }
      // 没有平台任务号：要么是同步出图（结果随进程一起没了），要么是提交到一半。平台上可能已经
      // 扣了费，不能自动重提交；让卡片提示用户自己决定。
      this.log.warn(`[recover] ${r.mediaType} task=${r.taskId} has no platform task id; needs user action`);
      this.counters.needsUserAction[r.mediaType === "speech" || r.mediaType === "music" ? "audio" : r.mediaType] += 1;
      const message = "生成过程中应用重启了，这次结果没能取回。为避免重复扣费没有自动重试，请手动重新生成。";
      await this.settleFailure(r, message, "backend_error", { recoverable: true });
    }
  }

  async submit(mediaType: MediaType, req: GenerationRequest, source: GenerationSource, taskId = `gen_${randomUUID().replace(/-/g, "")}`): Promise<Record<string, unknown>> {
    const cfg = this.media.load();
    this.assertConfigured(mediaType, req, cfg);
    const generationAttemptId = randomUUID();
    const placeholderId = req.replace_node_id ? null : await this.createPlaceholder(mediaType, req, displayModel(cfg, mediaType, req), generationAttemptId);
    const record: ActiveGenerationRecord = {
      id: randomUUID(),
      taskId,
      mediaType,
      backend: req.backend ?? "maas",
      request: req,
      placeholderId,
      generationAttemptId,
      createdAt: Date.now(),
    };
    try {
      await this.store.upsert(record);
    } catch (err) {
      // 记不上账就不提交：提交了却没记账，重启后这笔钱就找不回结果了。
      if (placeholderId) await this.canvas.failPlaceholder({ placeholderId, errorMessage: (err as Error).message });
      throw new BadRequestException({ ok: false, error: `local generation ledger is not ready: ${(err as Error).message}`, error_code: "RECORD_PREFLIGHT_FAILED", failure_presentation: "terminal" });
    }
    this.remember(record.taskId, mediaType, req.prompt, "running");
    this.log.log(`[submit] ${mediaType} task=${record.taskId} placeholder=${placeholderId ?? "-"} model=${req.model_id ?? "<auto>"} source=${req.source_tool ?? source}`);
    this.start(record, source);
    return { ok: true, task_id: record.taskId, status: "processing", media_type: mediaType };
  }

  query(taskId: string): Record<string, unknown> | undefined {
    this.prune();
    const s = this.settled.get(taskId);
    if (s?.status === "succeeded") {
      this.counters.completedCacheHit += 1;
      return { ok: true, task_id: taskId, status: "succeeded", result: s.result, asset: s.asset };
    }
    this.counters.completedCacheMiss += 1;
    if (s?.status === "failed") {
      return { ok: false, task_id: taskId, status: "failed", cloud_terminal: true, error: s.error, error_code: s.error_code, user_message: s.user_message };
    }
    const job = this.running.get(taskId);
    if (job) return { ok: true, task_id: taskId, status: "processing", ...(job.record.platformTaskId ? { provider_task_id: job.record.platformTaskId } : {}) };
    return undefined;
  }

  countAsyncSubmit(): void {
    this.counters.asyncSubmitSucceeded += 1;
  }

  countLegacySync(media: MediaType): void {
    this.counters.legacySync[media] += 1;
  }

  /**
   * 形状和参照一致。我们没有的环节（计费、落地重试、账本隔离）恒为 0；账上的任务都是
   * "等平台出结果"这一个阶段。只有汇总数字，不含任务号、路径或提示词。
   */
  async metricsSnapshot(): Promise<Record<string, unknown>> {
    const total = (await this.store.list().catch(() => [])).length;
    const zero = () => ({ image: 0, video: 0, audio: 0, other: 0 });
    const c = this.counters;
    return {
      record_asset_short_circuit: 0,
      completed_cache_hit: c.completedCacheHit,
      completed_cache_miss: c.completedCacheMiss,
      async_submit_succeeded: c.asyncSubmitSucceeded,
      cloud_submit_success_record_persist_fail: 0,
      async_submit_rejected_by_cancel: 0,
      boot_unclean_shutdown_detected: 0,
      active_generation_ledger_quarantined: 0,
      legacy_sync_endpoint_hit: { ...c.legacySync },
      local_materialization_deferred: zero(),
      local_materialization_recovered: zero(),
      generation_recovery_needs_user_action: { ...c.needsUserAction },
      active_generation_records: {
        total,
        by_phase: { cloud_pending: total, local_materialization_pending: 0, needs_user_action: 0 },
        by_disposition: { cloud_transient: 0, local_transient: 0, unknown_after_submit: 0, shutdown: 0, none: total },
      },
    };
  }

  /** 停止一张生成任务。平台侧停不下来，只是不再把结果落到画布上。 */
  async cancel(taskId: string): Promise<boolean> {
    const job = this.running.get(taskId);
    if (!job) return false;
    await this.cancelJob(job);
    return true;
  }

  /** 取消画布上某个节点的生成。平台侧的任务停不下来，只是不再落地，占位卡直接撤掉。 */
  async cancelByNode(nodeId: string): Promise<{ cancelled: boolean; taskIds: string[] }> {
    const hit = [...this.running.values()].filter((j) => j.record.placeholderId === nodeId || j.record.request.replace_node_id === nodeId);
    for (const job of hit) await this.cancelJob(job);
    return { cancelled: hit.length > 0, taskIds: hit.map((j) => j.record.taskId) };
  }

  private async cancelJob(job: { record: ActiveGenerationRecord; cancelled: boolean }): Promise<void> {
    job.cancelled = true;
    this.running.delete(job.record.taskId);
    await this.store.remove(job.record.id);
    this.settled.set(job.record.taskId, {
      status: "failed",
      error: "generation was cancelled by the user",
      error_code: "GENERATION_CANCELLED",
      user_message: "生成已取消",
      at: Date.now(),
    });
    if (job.record.placeholderId) await this.canvas.cleanupPlaceholder(job.record.placeholderId);
  }

  summary() {
    const items = new Map<string, { model: string; mediaType: string; source: string; queued: number; running: number; total: number }>();
    for (const j of this.running.values()) {
      const media = j.record.mediaType === "speech" || j.record.mediaType === "music" ? "audio" : j.record.mediaType;
      const model = j.record.request.model_id ?? j.record.backend;
      const key = `${model}\0${media}\0${j.source}`;
      const it = items.get(key) ?? { model, mediaType: media, source: j.source, queued: 0, running: 0, total: 0 };
      it.running += 1;
      it.total += 1;
      items.set(key, it);
    }
    const list = [...items.values()].sort((a, b) => a.model.localeCompare(b.model) || a.mediaType.localeCompare(b.mediaType) || a.source.localeCompare(b.source));
    return { queued: 0, running: this.running.size, total: this.running.size, updatedAt: Date.now(), items: list };
  }

  /** 每个模型当前在跑几个。 */
  usage(models: string[]): { model: string; used_concurrency: number }[] {
    const count = new Map<string, number>();
    for (const j of this.running.values()) {
      const m = j.record.request.model_id ?? j.record.backend;
      count.set(m, (count.get(m) ?? 0) + 1);
    }
    return models.map((model) => ({ model, used_concurrency: count.get(model) ?? 0 }));
  }

  // -------------------------------------------------------------------------

  private assertConfigured(mediaType: MediaType, req: GenerationRequest, cfg: ReturnType<MediaConfigService["load"]>): void {
    const modality =
      mediaType === "image"
        ? (req.image_paths ?? []).some((p) => typeof p === "string" && p.trim())
          ? route.Modality.ImageEdit
          : route.Modality.Image
        : mediaType === "video"
          ? route.Modality.Video
          : mediaType === "speech"
            ? route.Modality.Speech
            : route.Modality.Music;
    if (!cfg.platform.base_url || !cfg.platform.api_key) {
      throw new BadRequestException({ ok: false, error: "platform is not configured (base_url / api_key missing)", error_code: "PLATFORM_NOT_CONFIGURED", user_message: "还没有配置平台地址和密钥，请先在设置里填写。" });
    }
    if (route.route(cfg.models, null, modality) === null) {
      throw new BadRequestException({ ok: false, error: `no ${modality} model configured`, error_code: "MODEL_NOT_CONFIGURED", user_message: `设置里还没有配置${MODALITY_LABEL[modality]}模型。` });
    }
  }

  /**
   * 这次生成的图片输入 → 资产 id，交给画布去连派生边。
   *
   * **只认工作区里的文件。** 远程 URL 在画布上没有对应节点，硬凑一条线只会指向一个
   * 不存在的东西；而相对/绝对路径都先归一成工作区相对路径再查，否则同一个图换个
   * 写法就连不上了。
   *
   * 用 `submittedImageInputs` 而不是自己读 `req` —— 那是 `runImage` / `runVideo` 真正
   * 提交给平台的那份清单，边照着它建，线上的图和平台收到的图就不可能对不上。
   */
  private referenceAssetIds(mediaType: MediaType, req: GenerationRequest): string[] {
    const out: string[] = [];
    for (const p of submittedImageInputs(mediaType, req)) {
      if (!p || /^https?:\/\//i.test(p)) continue;
      const rel = path.isAbsolute(p) ? this.paths.relativize(p) : p;
      const id = rel ? this.assets.byPath(rel)?.id : undefined;
      if (id) out.push(id);
    }
    return [...new Set(out)];
  }

  private async createPlaceholder(mediaType: MediaType, req: GenerationRequest, model: string, generationAttemptId: string): Promise<string | null> {
    const input = {
      sourceNodeId: req.source_node_id,
      // agent 用 `image_paths` / `first_frame_image` 提交的是**路径**而不是节点 id，所以
      // `source_node_id` 对它永远是空的。以前这里什么都不填，于是占位卡和结果节点都没有
      // 派生边 —— 参考生视频、首尾帧在画布上看起来像凭空冒出来的。
      referenceImageAssetIds: this.referenceAssetIds(mediaType, req),
      prompt: req.display_prompt ?? req.prompt ?? "",
      model,
      mediaType: mediaType === "speech" || mediaType === "music" ? "audio" : mediaType,
      aspectRatio: mediaType === "image" || mediaType === "video" ? str(req.params?.aspect_ratio) ?? str(req.params?.ratio) : undefined,
      backend: req.backend,
      model_id: req.model_id,
      params: req.params,
      source_tool: req.source_tool,
      generationAttemptId,
    };
    try {
      return (await this.canvas.addPlaceholder(input)).placeholderId;
    } catch (err) {
      // 来源节点不在画布上（agent 传了一个过期的 id）：照样出卡，只是不连线。
      if (req.source_node_id) {
        try {
          return (await this.canvas.addPlaceholder({ ...input, sourceNodeId: undefined })).placeholderId;
        } catch {
          /* 落到下面 */
        }
      }
      this.log.warn(`[submit] placeholder create failed, continuing without placeholder: ${(err as Error).message}`);
      return null;
    }
  }

  private start(record: ActiveGenerationRecord, source: GenerationSource, resumePlatformTaskId?: string): void {
    const job = { record, source, cancelled: false, done: Promise.resolve() };
    this.running.set(record.taskId, job);
    job.done = this.drive(job, resumePlatformTaskId);
  }

  /**
   * 等到终态再回查询结果（同步路由用）。调用方断开不影响任务：它照样在后台跑完、落到画布上。
   * 取消的任务 drive 会提前返回，这里拿到的是取消的终态。
   */
  async waitFor(taskId: string): Promise<Record<string, unknown> | undefined> {
    const job = this.running.get(taskId);
    if (job) await job.done;
    return this.query(taskId);
  }

  private async drive(job: { record: ActiveGenerationRecord; cancelled: boolean }, resumePlatformTaskId?: string): Promise<void> {
    const r = job.record;
    try {
      const loaded = this.media.load();
      // 克隆出的音色不在配置的 voice_map 里，合成前并进去；其他媒体不用读这张表。
      const cfg = r.mediaType === "speech" ? await this.voices.withLocalVoices(loaded) : loaded;
      const client = this.media.client((platformTaskId) => {
        r.platformTaskId = platformTaskId;
        void this.store.patch(r.id, { platformTaskId }).catch((err) => this.log.warn(`[ledger] persist platform task id failed: ${(err as Error).message}`));
      });
      const url = resumePlatformTaskId
        ? await video.pollTask(client, cfg, resumePlatformTaskId)
        : (await runOnPlatform(client, cfg, this.paths.root, r.mediaType, r.request)).urls[0]!;
      if (job.cancelled) return;
      await this.materialize(r, url, displayModel(cfg, r.mediaType, r.request));
    } catch (err) {
      if (job.cancelled) return;
      const failure = describeFailure(err);
      this.log.warn(`[task] ${r.mediaType} task=${r.taskId} failed: ${failure.message}`);
      await this.settleFailure(r, failure.message, failure.code, {
        problem: { code: failure.problemCode, source: failure.source, message: failure.userMessage },
      });
    } finally {
      this.running.delete(r.taskId);
    }
  }

  private async materialize(r: ActiveGenerationRecord, url: string, model: string): Promise<void> {
    const req = r.request;
    const kind = watermarkKind(r.mediaType);
    const abs = await withStagedWatermark((staged) => this.watermark.applyStaged(staged, kind), () => downloadMediaToDir(url, this.paths.root, req.filename));
    const rel = this.paths.relativize(abs)!;
    const params = stripPersisted(req.params);
    const assetMeta: Record<string, unknown> = {
      prompt: req.display_prompt ?? req.prompt ?? "",
      model,
      description: req.display_prompt ?? req.prompt ?? "",
      params,
      backend: req.backend,
      model_id: req.model_id,
      source_tool: req.source_tool,
      session_id: req.session_id,
      gateway_task_id: r.taskId,
      ...(r.platformTaskId ? { provider_task_id: r.platformTaskId } : {}),
      ...(r.mediaType === "speech" && str(req.params?.voice_id) ? { voice_id: str(req.params?.voice_id) } : {}),
      ...(r.mediaType === "music" && (str(req.params?.lyrics) ?? str(req.lyrics)) ? { lyrics: str(req.params?.lyrics) ?? str(req.lyrics) } : {}),
    };
    let row;
    try {
      row = await this.assets.enroll(rel, assetMeta);
    } catch (err) {
      // 登记不进资产库的文件没人认领：画布上看不到、资产列表里没有，下次同名生成还会被挤成 `_1`。
      await rm(abs, { force: true }).catch(() => undefined);
      throw err;
    }
    const info = toAssetInfo(row);
    const nodeId = await this.canvas.fillGeneratedNode({
      placeholderId: r.placeholderId ?? req.replace_node_id,
      replace: !r.placeholderId && !!req.replace_node_id,
      sourceNodeId: req.source_node_id,
      // 占位卡正常建出来时边已经连好了，这里是给"占位卡没了"那条路兜底的。
      referenceAssetIds: this.referenceAssetIds(r.mediaType, req),
      row,
      data: {
        prompt: assetMeta.prompt,
        model,
        ...(params ? { params } : {}),
        ...(req.backend ? { backend: req.backend } : {}),
        ...(req.model_id ? { model_id: req.model_id } : {}),
        ...(req.source_tool ? { source_tool: req.source_tool } : {}),
        time: new Date().toISOString(),
        ...(info.width ? { width: info.width } : {}),
        ...(info.height ? { height: info.height } : {}),
        ...(info.duration ? { duration: info.duration } : {}),
      },
    });
    const result: Record<string, unknown> = {
      ok: true,
      path: rel,
      ...(info.width ? { width: info.width } : {}),
      ...(info.height ? { height: info.height } : {}),
      ...(info.duration ? { duration: info.duration } : {}),
      ...(r.platformTaskId ? { provider_task_id: r.platformTaskId } : {}),
      ...(nodeId ? { node_id: nodeId } : {}),
    };
    const asset = { assetId: row.id, name: row.name, path: rel, mediaType: r.mediaType === "speech" || r.mediaType === "music" ? "audio" : r.mediaType, model, width: info.width, height: info.height, duration: info.duration };
    // 先下账再对外报完成：轮询方看到 succeeded 时账上必须已经没有它，否则这时候重启会把落过地的任务再落一遍。
    await this.store.remove(r.id);
    this.remember(r.taskId, r.mediaType, r.request.prompt, "completed", { path: rel, kind: asset.mediaType, name: asset.name });
    this.settled.set(r.taskId, { status: "succeeded", result, asset, at: Date.now() });
    this.log.log(`[task] ${r.mediaType} task=${r.taskId} succeeded path=${rel} node=${nodeId ?? "-"}`);
  }

  private async settleFailure(r: ActiveGenerationRecord, message: string, code: string, opts: { recoverable?: boolean; problem?: { code: string; source: string; message: string } } = {}): Promise<void> {
    const target = r.placeholderId ?? r.request.replace_node_id;
    if (target) {
      await this.canvas
        .failPlaceholder({ placeholderId: target, errorMessage: message, retryPayload: retryPayload(r), recoverable: opts.recoverable })
        .catch((err) => this.log.warn(`[task] failPlaceholder(${target}) failed: ${(err as Error).message}`));
    }
    await this.store.remove(r.id).catch(() => undefined);
    this.remember(r.taskId, r.mediaType, r.request.prompt, "failed", undefined, message, opts.problem);
    // 最后才报失败：轮询方拿到 failed 就会去看画布，占位卡得已经是错误态。
    // `user_message` 是同步接口（`/api/generate/video` 这类）回给调用方的那句话：
    // 有语义化的提示就用它，别把平台的英文原文丢给用户。
    this.settled.set(r.taskId, {
      status: "failed",
      error: message,
      error_code: code,
      user_message: opts.problem?.message ?? message,
      at: Date.now(),
    });
  }

  private remember(id: string, mediaType: MediaType, prompt: string | undefined, status: "running" | "completed" | "failed", output?: { path?: string; kind?: string; name?: string }, message?: string, problem?: { code: string; source: string; message: string }) {
    const operation = mediaType === "speech" ? "generate_speech" : mediaType === "music" ? "generate_music" : mediaType === "video" ? "generate_video" : "generate_image";
    try {
      if (status === "running") this.tasks?.accept({ id, operation, prompt, mediaType });
      else if (status === "completed" && output) this.tasks?.complete(id, output);
      else if (status === "failed" && message) this.tasks?.fail(id, message, problem);
    } catch (error) {
      this.log.warn(`[task] record ${id} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private prune(): void {
    const cutoff = Date.now() - SETTLED_TTL_MS;
    for (const [k, v] of this.settled) if (v.at < cutoff) this.settled.delete(k);
  }
}

const MODALITY_LABEL: Record<string, string> = {
  image: "文生图",
  image_edit: "图生图",
  video: "视频",
  video_ref: "参考生视频",
  music: "音乐",
  music_edit: "音乐编辑",
  speech: "语音",
};

export interface FailureDescription {
  /** 技术原文：进日志、进 `error` 字段。 */
  message: string;
  /** 兼容字段（历史调用方读它）。 */
  code: string;
  /** 任务卡片的 `problem.code`。**必须是参照那份枚举里的值**，否则渲染层的解析器会拒掉整条任务。 */
  problemCode: string;
  /** `problem.source`：billing / provider / input / delivery / system。 */
  source: string;
  /** 给用户看的一句话。缺省时 UI 显示 `message`。 */
  userMessage: string;
}

/**
 * 平台错误码 → （参照枚举里的 problem.code, source, 中文提示）。
 *
 * # 为什么要这张表
 *
 * 平台回的错误码（`insufficient_user_quota` / `rate_limited` / `sensitive_words_detected`
 * / `model_not_found`）此前一律被压成 `backend_error`，界面上只剩一句平台的英文原文。
 * 用户看不出"是被限流，还是内容没过审，还是额度没了" —— 而这三种的处置完全不同：
 * 等一会儿、改内容、充值。
 *
 * 卡片只能接受参照那份 `problem.code` 枚举，所以这里做**语义最近**的映射，
 * 中文提示放在 `message` 里（界面显示的是它，不是枚举的英文原文）。
 */
const PLATFORM_FAILURES: Record<string, { problemCode: string; source: string; userMessage: string }> = {
  insufficient_user_quota: {
    problemCode: "BILLING_INSUFFICIENT",
    source: "billing",
    userMessage: "平台额度不足，请充值后再试",
  },
  pre_consume_token_quota_failed: {
    problemCode: "BILLING_INSUFFICIENT",
    source: "billing",
    userMessage: "平台额度不足，请充值后再试",
  },
  rate_limited: {
    problemCode: "PROVIDER_CONCURRENCY",
    source: "provider",
    userMessage: "平台请求过于频繁，请稍后重试",
  },
  sensitive_words_detected: {
    problemCode: "PROVIDER_REJECTED",
    source: "provider",
    userMessage: "内容未通过平台审核，请修改后重试",
  },
  prompt_blocked: {
    problemCode: "PROVIDER_REJECTED",
    source: "provider",
    userMessage: "内容未通过平台审核，请修改后重试",
  },
  moderation_unavailable: {
    problemCode: "PROVIDER_REJECTED",
    source: "provider",
    userMessage: "平台审核服务暂时不可用，请稍后重试",
  },
  model_not_found: {
    problemCode: "PROVIDER_REJECTED",
    source: "provider",
    userMessage: "平台上没有这个模型，请检查设置里的模型名",
  },
  endpoint_not_supported: {
    problemCode: "PROVIDER_REJECTED",
    source: "provider",
    userMessage: "这个模型不支持该接口，请换一个模型",
  },
  capability_unavailable: {
    problemCode: "PROVIDER_REJECTED",
    source: "provider",
    userMessage: "这个部署没有该项能力，请检查平台配置",
  },
};

/**
 * 失败 → 调用方看得懂的码。
 *
 * 平台错误码能认出语义的按 {@link PLATFORM_FAILURES} 映射；传输层失败按
 * "提交结果未知"报（`PROVIDER_UNAVAILABLE`）；配置 / 参数问题重试也没用
 * （`client_error`），其余仍是平台侧的 `backend_error`。
 */
export function describeFailure(err: unknown): FailureDescription {
  if (err instanceof PlatformError) {
    if (err.code.startsWith("platform.")) {
      const mapped = PLATFORM_FAILURES[err.code.slice("platform.".length)];
      if (mapped) return { message: err.message, code: "backend_error", ...mapped };
    }
    if (err.code === "dpp.transport") {
      return {
        message: err.message,
        code: "network_error",
        problemCode: "PROVIDER_UNAVAILABLE",
        source: "provider",
        // **不要承诺"重试不会重复计费"**：连接断在提交之后，请求可能已经到了平台，
        // 重试就是再提交一次；计费在平台侧，客户端无从保证。说错话比不说更糟 ——
        // 用户会照着这句话重试，然后收到两份账单。
        userMessage: "与平台的连接中断，任务结果未确认，请稍后查看结果再决定是否重试",
      };
    }
    if (err.code === "dpp.config") {
      return { message: err.message, code: "client_error", problemCode: "INTERNAL_ERROR", source: "system", userMessage: err.message };
    }
    return { message: err.message, code: "backend_error", problemCode: "PROVIDER_REJECTED", source: "provider", userMessage: err.message };
  }
  const message = err instanceof Error ? err.message : String(err);
  if (/ENOSPC|no space left/i.test(message)) {
    return { message, code: "storage_full", problemCode: "INTERNAL_ERROR", source: "system", userMessage: "磁盘空间不足，无法保存生成结果" };
  }
  return { message, code: "backend_error", problemCode: "PROVIDER_REJECTED", source: "provider", userMessage: message };
}

/** 节点上的"重试"要能原样再发一次：留下请求体里决定结果的那些字段。 */
function retryPayload(r: ActiveGenerationRecord): Record<string, unknown> {
  const { session_id: _s, replace_node_id: _r, ...rest } = r.request;
  return { mediaType: r.mediaType, request: rest };
}

function watermarkKind(media: MediaType): WatermarkKind {
  return media === "speech" || media === "music" ? "audio" : media;
}

/** 参数原样记到资产和节点上（`order` 也要留：分组重排按它排序），空对象不记。 */
function stripPersisted(params?: Record<string, unknown>): Record<string, unknown> | undefined {
  return params && Object.keys(params).length ? params : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
