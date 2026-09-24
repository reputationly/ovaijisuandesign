import { randomUUID } from "node:crypto";

import { BadRequestException, Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { toAssetInfo } from "@ov/assets";
import { PlatformError, route, video } from "@ov/maas-media";

import { CanvasService } from "../canvas/canvas.service.js";
import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { GatewayConfig } from "../config/gateway-config.js";
import { type ActiveGenerationRecord, ActiveGenerationsStore } from "./active-generations.store.js";
import { type GenerationRequest, type MediaType, displayModel, runOnPlatform } from "./generation-request.js";
import { downloadMediaToDir } from "./media-download.js";
import { MediaConfigService } from "./media-config.service.js";

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
  private readonly running = new Map<string, { record: ActiveGenerationRecord; source: GenerationSource; cancelled: boolean }>();
  private readonly settled = new Map<string, Settled>();

  constructor(
    private readonly gw: GatewayConfig,
    private readonly paths: WorkspacePathService,
    private readonly store: ActiveGenerationsStore,
    private readonly media: MediaConfigService,
    private readonly assets: AssetsService,
    private readonly canvas: CanvasService,
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
      const message = "生成过程中应用重启了，这次结果没能取回。为避免重复扣费没有自动重试，请手动重新生成。";
      await this.settleFailure(r, message, "backend_error", { recoverable: true });
    }
  }

  async submit(mediaType: MediaType, req: GenerationRequest, source: GenerationSource): Promise<Record<string, unknown>> {
    const cfg = this.media.load();
    this.assertConfigured(mediaType, req, cfg);
    const generationAttemptId = randomUUID();
    const placeholderId = req.replace_node_id ? null : await this.createPlaceholder(mediaType, req, displayModel(cfg, mediaType, req), generationAttemptId);
    const record: ActiveGenerationRecord = {
      id: randomUUID(),
      taskId: `gen_${randomUUID().replace(/-/g, "")}`,
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
    this.log.log(`[submit] ${mediaType} task=${record.taskId} placeholder=${placeholderId ?? "-"} model=${req.model_id ?? "<auto>"} source=${req.source_tool ?? source}`);
    this.start(record, source);
    return { ok: true, task_id: record.taskId, status: "processing", media_type: mediaType };
  }

  query(taskId: string): Record<string, unknown> | undefined {
    this.prune();
    const s = this.settled.get(taskId);
    if (s?.status === "succeeded") return { ok: true, task_id: taskId, status: "succeeded", result: s.result, asset: s.asset };
    if (s?.status === "failed") {
      return { ok: false, task_id: taskId, status: "failed", cloud_terminal: true, error: s.error, error_code: s.error_code, user_message: s.user_message };
    }
    if (this.running.has(taskId)) return { ok: true, task_id: taskId, status: "processing" };
    return undefined;
  }

  /** 取消画布上某个节点的生成。平台侧的任务停不下来，只是不再落地，占位卡直接撤掉。 */
  async cancelByNode(nodeId: string): Promise<{ cancelled: boolean; taskIds: string[] }> {
    const hit = [...this.running.values()].filter((j) => j.record.placeholderId === nodeId || j.record.request.replace_node_id === nodeId);
    for (const j of hit) {
      j.cancelled = true;
      this.running.delete(j.record.taskId);
      await this.store.remove(j.record.id);
      this.settled.set(j.record.taskId, {
        status: "failed",
        error: "generation was cancelled by the user",
        error_code: "GENERATION_CANCELLED",
        user_message: "生成已取消",
        at: Date.now(),
      });
      if (j.record.placeholderId) await this.canvas.cleanupPlaceholder(j.record.placeholderId);
    }
    return { cancelled: hit.length > 0, taskIds: hit.map((j) => j.record.taskId) };
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

  private async createPlaceholder(mediaType: MediaType, req: GenerationRequest, model: string, generationAttemptId: string): Promise<string | null> {
    const input = {
      sourceNodeId: req.source_node_id,
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
    const job = { record, source, cancelled: false };
    this.running.set(record.taskId, job);
    void this.drive(job, resumePlatformTaskId);
  }

  private async drive(job: { record: ActiveGenerationRecord; cancelled: boolean }, resumePlatformTaskId?: string): Promise<void> {
    const r = job.record;
    try {
      const cfg = this.media.load();
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
      const { message, code } = describeFailure(err);
      this.log.warn(`[task] ${r.mediaType} task=${r.taskId} failed: ${message}`);
      await this.settleFailure(r, message, code);
    } finally {
      this.running.delete(r.taskId);
    }
  }

  private async materialize(r: ActiveGenerationRecord, url: string, model: string): Promise<void> {
    const req = r.request;
    const abs = await downloadMediaToDir(url, this.paths.root, req.filename);
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
    const row = await this.assets.enroll(rel, assetMeta);
    const info = toAssetInfo(row);
    const nodeId = await this.canvas.fillGeneratedNode({
      placeholderId: r.placeholderId ?? req.replace_node_id,
      replace: !r.placeholderId && !!req.replace_node_id,
      sourceNodeId: req.source_node_id,
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
    this.settled.set(r.taskId, { status: "succeeded", result, asset, at: Date.now() });
    await this.store.remove(r.id);
    this.log.log(`[task] ${r.mediaType} task=${r.taskId} succeeded path=${rel} node=${nodeId ?? "-"}`);
  }

  private async settleFailure(r: ActiveGenerationRecord, message: string, code: string, opts: { recoverable?: boolean } = {}): Promise<void> {
    this.settled.set(r.taskId, { status: "failed", error: message, error_code: code, user_message: message, at: Date.now() });
    const target = r.placeholderId ?? r.request.replace_node_id;
    if (target) {
      await this.canvas
        .failPlaceholder({ placeholderId: target, errorMessage: message, retryPayload: retryPayload(r), recoverable: opts.recoverable })
        .catch((err) => this.log.warn(`[task] failPlaceholder(${target}) failed: ${(err as Error).message}`));
    }
    await this.store.remove(r.id).catch(() => undefined);
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

/**
 * 失败 → 调用方看得懂的码。配置 / 参数问题重试也没用（`client_error`），传输问题是
 * `network_error`，其余都是平台侧的 `backend_error`。原因原文放进 message，画布上直接显示它。
 */
export function describeFailure(err: unknown): { message: string; code: string } {
  if (err instanceof PlatformError) {
    const code = err.code === "dpp.config" ? "client_error" : err.code === "dpp.transport" ? "network_error" : "backend_error";
    return { message: err.message, code };
  }
  const message = err instanceof Error ? err.message : String(err);
  if (/ENOSPC|no space left/i.test(message)) return { message, code: "storage_full" };
  return { message, code: "backend_error" };
}

/** 节点上的"重试"要能原样再发一次：留下请求体里决定结果的那些字段。 */
function retryPayload(r: ActiveGenerationRecord): Record<string, unknown> {
  const { session_id: _s, replace_node_id: _r, ...rest } = r.request;
  return { mediaType: r.mediaType, request: rest };
}

/** 参数原样记到资产和节点上（`order` 也要留：分组重排按它排序），空对象不记。 */
function stripPersisted(params?: Record<string, unknown>): Record<string, unknown> | undefined {
  return params && Object.keys(params).length ? params : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
