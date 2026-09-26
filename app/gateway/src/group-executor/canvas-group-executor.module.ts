import { readFile } from "node:fs/promises";

import { BadRequestException, Body, Controller, Headers, HttpCode, Injectable, Logger, Module, Post } from "@nestjs/common";
import type { CanvasEdge, CanvasFile, CanvasNode } from "@ov/protocol";
import { IsNotEmpty, IsString } from "class-validator";

import { CanvasService } from "../canvas/canvas.service.js";
import { AssetsService } from "../common/assets.service.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { TextGenerationService } from "../edit/text-generation.service.js";
import type { GenerationRequest, MediaType } from "../generate/generation-request.js";
import { GenerationRunner } from "../generate/generation-runner.service.js";
import { MediaConfigService } from "../generate/media-config.service.js";

const MAX_LAYER_CONCURRENCY = 10;
/** 这些状态的节点还在跑或结果待定，重跑会叠出第二个任务。 */
const NON_RESUBMITTABLE_STATUS = new Set(["pending", "generating", "loading", "recoverable_error", "status_unknown"]);
const REFERENCE_PROMPT_PREAMBLE = "The content in <reference_text> is reference material only. Treat <user_prompt> as the primary instruction.";

export class ExecuteGroupDto {
  @IsString() @IsNotEmpty() groupId!: string;
}

/** 能重跑的节点：图 / 视频 / 音频 / 文本，记着生成它的模型，而且当前不在跑。用户上传的素材没有 model_id，跳过。 */
function isReexecutable(node: CanvasNode): boolean {
  if (!["image", "video", "audio", "text"].includes(node.type)) return false;
  const data = node.data;
  if (!data) return false;
  if (typeof data.status === "string" && NON_RESUBMITTABLE_STATUS.has(data.status)) return false;
  return typeof data.model_id === "string" && data.model_id.length > 0;
}

export interface ExecutionPlan {
  groupId: string;
  layers: string[][];
  executableCount: number;
  layerCount: number;
  totalChildren: number;
  skipped: { nonExecutable: string[] };
}

/**
 * 组内节点按组内连线拓扑分层：上游先跑，下游拿到新结果再跑。层号取最长路径（一个节点等它所有上游都完），
 * 成环的节点落到第 0 层。不可重跑的节点照样参与分层（它们是别人的上游），只是不派发。
 */
export function resolveExecutableLayers(canvas: Pick<CanvasFile, "nodes" | "edges">, groupId: string): ExecutionPlan {
  const children = canvas.nodes.filter((n) => n.parentId === groupId);
  if (children.length === 0) return { groupId, layers: [], executableCount: 0, layerCount: 0, totalChildren: 0, skipped: { nonExecutable: [] } };
  const ids = new Set(children.map((n) => n.id));
  const out = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const id of ids) {
    out.set(id, []);
    indeg.set(id, 0);
  }
  for (const e of canvas.edges as CanvasEdge[]) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    out.get(e.source)!.push(e.target);
    indeg.set(e.target, indeg.get(e.target)! + 1);
  }
  const level = new Map<string, number>();
  const queue = [...ids].filter((id) => indeg.get(id) === 0);
  for (const id of queue) level.set(id, 0);
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i]!;
    for (const child of out.get(cur)!) {
      level.set(child, Math.max(level.get(child) ?? 0, level.get(cur)! + 1));
      const left = indeg.get(child)! - 1;
      indeg.set(child, left);
      if (left === 0) queue.push(child);
    }
  }
  for (const id of ids) if (!level.has(id)) level.set(id, 0);
  const maxLevel = Math.max(...level.values());
  const raw: string[][] = Array.from({ length: maxLevel + 1 }, () => []);
  for (const [id, l] of level) raw[l]!.push(id);
  const executable = new Set<string>();
  const nonExecutable: string[] = [];
  for (const n of children) (isReexecutable(n) ? executable.add(n.id) : nonExecutable.push(n.id));
  const layers = raw.map((layer) => layer.filter((id) => executable.has(id))).filter((layer) => layer.length > 0);
  return { groupId, layers, executableCount: executable.size, layerCount: layers.length, totalChildren: children.length, skipped: { nonExecutable } };
}

type Outcome = { nodeId: string; ok: true } | { nodeId: string; ok: false; error: string; userMessage: string; errorStatus: "error" | "status_unknown" };

/**
 * 整组重跑（agent 的 canvas_execute_group）：立刻回计划和 executionId，实际生成在后台按层跑，每层最多 10 个并发，
 * 某层有失败就停（下游拿不到新的上游结果，跑了也是白花钱），结束后发 `task:completed`（task_id = `group-exec-<id>`）。
 *
 * 组里没有可重跑的节点时回 `noop: true` 且不会有任何通知：agent 应该当场回复，而不是等一个永远不来的完成事件。
 */
@Injectable()
export class CanvasGroupExecutorService {
  private readonly log = new Logger("GroupExecutor");
  private counter = 0;
  private readonly running = new Map<string, { executionId: string; startedAt: number }>();

  constructor(
    private readonly canvas: CanvasService,
    private readonly runner: GenerationRunner,
    private readonly text: TextGenerationService,
    private readonly assets: AssetsService,
    private readonly media: MediaConfigService,
    private readonly paths: WorkspacePathService,
    private readonly bus: GatewayEventBus,
  ) {}

  async execute(groupId: string, sessionId?: string) {
    if (!groupId) throw new BadRequestException("groupId is required");
    const existing = this.running.get(groupId);
    if (existing) {
      throw new BadRequestException(`Group ${groupId} is already executing (executionId=${existing.executionId}). Wait for the current run to finish or cancel via chat stop.`);
    }
    const canvas = await this.canvas.getCanvas();
    const group = canvas.nodes.find((n) => n.id === groupId);
    if (!group) throw new BadRequestException(`Group node not found: ${groupId}`);
    if (group.type !== "group") {
      throw new BadRequestException(`Node ${groupId} is type "${group.type}", not a group. Use canvas_get_node to inspect, or canvas_list_nodes({type:'group'}) to find a real group.`);
    }
    const plan = resolveExecutableLayers(canvas, groupId);
    const executionId = `${Date.now().toString(36)}-${++this.counter}`;
    const skipped = { nonExecutableCount: plan.skipped.nonExecutable.length };
    if (plan.executableCount === 0) {
      const message =
        plan.totalChildren === 0
          ? `Group ${groupId} is empty — nothing to execute.`
          : `Group ${groupId} has no re-executable children. All ${plan.totalChildren} child(ren) were skipped: ${skipped.nonExecutableCount} non-re-executable node(s) (user uploads, placeholders, tables, or nested groups). No background task was started; the agent should respond now instead of waiting for a notification.`;
      return { executionId, totalLayers: 0, executableCount: 0, totalChildren: plan.totalChildren, skipped, message, noop: true };
    }
    const nodes = new Map(canvas.nodes.map((n) => [n.id, n]));
    this.running.set(groupId, { executionId, startedAt: Date.now() });
    this.log.log(`[group-exec] start executionId=${executionId} groupId=${groupId} layers=${plan.layerCount} executable=${plan.executableCount}/${plan.totalChildren}`);
    void this.runLayers(plan, nodes, executionId, sessionId).catch((err: unknown) => {
      this.emitTaskCompleted(executionId, sessionId, { status: "failed", error_message: `Group executor crashed: ${(err as Error).message}` });
      this.running.delete(groupId);
    });
    return {
      executionId,
      totalLayers: plan.layerCount,
      executableCount: plan.executableCount,
      totalChildren: plan.totalChildren,
      skipped,
      message: `Group execution started (${plan.executableCount} node(s) across ${plan.layerCount} layer(s)). The system will notify you via task:completed when the run finishes. End your turn now — do NOT poll.`,
      noop: false,
    };
  }

  private async runLayers(plan: ExecutionPlan, nodes: Map<string, CanvasNode>, executionId: string, sessionId?: string): Promise<void> {
    const completed: string[] = [];
    const failed: { id: string; error: string }[] = [];
    try {
      for (let i = 0; i < plan.layers.length; i++) {
        const layer = plan.layers[i]!.map((id) => nodes.get(id)).filter((n): n is CanvasNode => !!n);
        const outcomes = await this.runLayer(layer);
        for (const o of outcomes) (o.ok ? completed.push(o.nodeId) : failed.push({ id: o.nodeId, error: o.error }));
        if (failed.length > 0) {
          this.log.warn(`[group-exec] fail-fast executionId=${executionId} layer=${i + 1} failed=${failed.length}`);
          break;
        }
      }
      const errorMessage =
        failed.length === 0
          ? undefined
          : `${failed.length} node(s) failed: ${failed
              .slice(0, 3)
              .map((f) => `${f.id} (${f.error})`)
              .join("; ")}${failed.length > 3 ? ` (+${failed.length - 3} more)` : ""}`;
      this.emitTaskCompleted(executionId, sessionId, {
        status: failed.length > 0 ? "failed" : "succeeded",
        outputs: {
          group_id: plan.groupId,
          completed_count: String(completed.length),
          failed_count: String(failed.length),
          skipped_count: String(plan.skipped.nonExecutable.length),
        },
        error_message: errorMessage,
      });
    } finally {
      this.running.delete(plan.groupId);
    }
  }

  /** 工作池而不是分块 Promise.all：慢节点不拖住同一块里的其他节点，空出一个位置就进下一个。 */
  private async runLayer(nodes: CanvasNode[]): Promise<Outcome[]> {
    const results: Outcome[] = new Array(nodes.length);
    let next = 0;
    const worker = async () => {
      for (;;) {
        const i = next++;
        if (i >= nodes.length) return;
        results[i] = await this.dispatch(nodes[i]!);
      }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_LAYER_CONCURRENCY, nodes.length) }, worker));
    return results;
  }

  private async dispatch(node: CanvasNode): Promise<Outcome> {
    const data = node.data ?? {};
    const prompt = typeof data.prompt === "string" ? data.prompt : "";
    const modelId = typeof data.model_id === "string" ? data.model_id : "";
    const params = stringRecord(data.params);
    const refs = {
      image: this.assetPaths(data.referenceImageIds),
      video: this.assetPaths(data.referenceVideoIds),
      audio: this.assetPaths(data.referenceAudioIds),
      text: this.assetPaths(data.referenceTextIds),
    };
    const backend = typeof data.backend === "string" && data.backend ? data.backend : undefined;
    const presentation = { prompt, model: modelId, modelId, ...(backend ? { backend } : {}), params };
    this.emitNodeGenerating(node.id, "mark", { ...presentation, phase: node.type === "text" ? "pending" : "generating" });
    try {
      let outcome: Outcome;
      if (node.type === "text") {
        const r = await this.text.generate(
          {
            model_id: modelId,
            prompt,
            ...(Object.keys(params).length ? { params } : {}),
            replace_node_id: node.id,
            source_node_id: node.id,
            ...(refs.image.length ? { image_paths: refs.image } : {}),
            ...(refs.text.length ? { text_paths: refs.text } : {}),
            ...(refs.video.length ? { video_paths: refs.video } : {}),
            ...(refs.audio.length ? { audio_paths: refs.audio } : {}),
          },
          "canvas",
        );
        outcome = r.ok ? { nodeId: node.id, ok: true } : failure(node.id, r.error, r.user_message, r.failure_presentation);
      } else {
        const mediaType = this.mediaTypeOf(node, modelId, backend, refs);
        const modelPrompt = node.type === "audio" ? prompt : await this.composeMediaPrompt(prompt, refs.text);
        const req: GenerationRequest = {
          ...(backend ? { backend } : {}),
          ...(modelId ? { model_id: modelId } : {}),
          prompt: modelPrompt,
          display_prompt: prompt,
          ...(Object.keys(params).length ? { params } : {}),
          ...(refs.image.length && node.type !== "audio" ? { image_paths: refs.image } : {}),
          ...(refs.video.length && node.type !== "audio" ? { video_paths: refs.video } : {}),
          ...(refs.audio.length && node.type !== "audio" ? { audio_paths: refs.audio } : {}),
          replace_node_id: node.id,
          source_tool: "canvas_execute_group",
          filename: `group-rerun-${node.id}`,
        };
        const sub = await this.runner.submit(mediaType, req, "canvas");
        const done = (await this.runner.waitFor(String(sub.task_id))) as { status?: string; error?: string; user_message?: string } | undefined;
        outcome =
          done?.status === "succeeded"
            ? { nodeId: node.id, ok: true }
            : failure(node.id, done?.status === "failed" ? done.error : "generation did not reach a terminal state", done?.status === "failed" ? done.user_message : undefined);
      }
      if (outcome.ok) this.emitNodeGenerating(node.id, "clear", {});
      else this.emitNodeGenerating(node.id, "mark", { ...presentation, error: outcome.userMessage, errorStatus: outcome.errorStatus });
      return outcome;
    } catch (err) {
      const outcome = failure(node.id, (err as Error).message);
      this.log.warn(`[group-exec] dispatch failed nodeId=${node.id} type=${node.type}: ${outcome.ok ? "" : outcome.error}`);
      if (!outcome.ok) this.emitNodeGenerating(node.id, "mark", { ...presentation, error: outcome.userMessage, errorStatus: outcome.errorStatus });
      return outcome;
    }
  }

  /** 图片节点带了视频 / 音频参考就是图生视频的结果，按视频重跑；音频节点按配置里的语音 / 音乐模型分流。 */
  private mediaTypeOf(node: CanvasNode, modelId: string, backend: string | undefined, refs: { video: string[]; audio: string[] }): MediaType {
    if (node.type === "video") return "video";
    if (node.type === "image") return refs.video.length || refs.audio.length ? "video" : "image";
    let models: { speech: string | null; music: string | null; music_edit: string | null } | undefined;
    try {
      models = this.media.load().models;
    } catch {
      models = undefined;
    }
    if (modelId && models && (modelId === models.music || modelId === models.music_edit)) return "music";
    if (modelId && models && modelId === models.speech) return "speech";
    return backend && /music/i.test(backend) ? "music" : "speech";
  }

  private assetPaths(ids: unknown): string[] {
    if (!Array.isArray(ids)) return [];
    return ids.filter((x): x is string => typeof x === "string").flatMap((id) => {
      const path = this.assets.byId(id)?.path;
      return path ? [path] : [];
    });
  }

  /** 图 / 视频模型读不了文本文件：参考文本的内容拼进提示词，并说明哪部分是参考、哪部分是指令。 */
  private async composeMediaPrompt(prompt: string, textPaths: string[]): Promise<string> {
    if (textPaths.length === 0) return prompt;
    const contents = await Promise.all(
      [...new Set(textPaths)].map(async (p) => {
        const abs = this.paths.resolve(p);
        if (!abs) return "";
        return (await readFile(abs, "utf8").catch(() => "")).trim();
      }),
    );
    const reference = contents.filter(Boolean).join("\n\n").trim();
    if (!reference) return prompt;
    const section = `${REFERENCE_PROMPT_PREAMBLE}\n\n<reference_text>\n${reference}\n</reference_text>`;
    return prompt.trim() ? `${section}\n\n<user_prompt>\n${prompt.trim()}\n</user_prompt>` : section;
  }

  /** 组里的节点原地重跑，没有占位卡：这条事件是界面显示进度 / 错误的唯一来源。空字段不带，免得界面渲染出"模型：" 这种空标签。 */
  private emitNodeGenerating(nodeId: string, action: "mark" | "clear", f: Record<string, unknown>): void {
    const params = f.params as Record<string, string> | undefined;
    this.bus.emit("canvas:node-generating", {
      type: "canvas_node_generating",
      nodeId,
      action,
      ...(f.prompt ? { prompt: f.prompt } : {}),
      ...(f.model ? { model: f.model } : {}),
      ...(f.modelId ? { modelId: f.modelId } : {}),
      ...(f.backend ? { backend: f.backend } : {}),
      ...(f.phase ? { phase: f.phase } : {}),
      ...(action === "mark" && f.phase !== "pending" && f.error === undefined ? { generationStartedAt: new Date().toISOString() } : {}),
      ...(params && Object.keys(params).length ? { params } : {}),
      ...(f.error !== undefined ? { error: f.error } : {}),
      ...(f.errorStatus ? { errorStatus: f.errorStatus } : {}),
    });
  }

  private emitTaskCompleted(executionId: string, sessionId: string | undefined, p: { status: string; outputs?: Record<string, string>; error_message?: string }): void {
    this.bus.emit("task:completed", {
      task_id: `group-exec-${executionId}`,
      status: p.status,
      ...(p.outputs ? { outputs: p.outputs } : {}),
      ...(p.error_message ? { error_message: p.error_message } : {}),
      ...(sessionId ? { session_id: sessionId } : {}),
    });
  }
}

function stringRecord(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object") return {};
  return Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === "string")) as Record<string, string>;
}

/** 传输层失败（平台那边可能已经在跑）不说"失败"，说"状态未知"。 */
function failure(nodeId: string, error?: string, userMessage?: string, presentation?: string): Outcome {
  const msg = error?.trim() || "Generation failed";
  return { nodeId, ok: false, error: msg, userMessage: userMessage?.trim() || msg, errorStatus: presentation === "status_unknown" ? "status_unknown" : "error" };
}

@Controller("api/canvas")
export class CanvasGroupExecutorController {
  constructor(private readonly executor: CanvasGroupExecutorService) {}

  @Post("execute-group")
  @HttpCode(200)
  executeGroup(@Body() body: ExecuteGroupDto, @Headers("x-session-id") sessionId?: string) {
    return this.executor.execute(body.groupId, sessionId || undefined);
  }
}

/** 文本生成服务在这里再实例化一份：它无状态，依赖都是全局的，用不着去改编辑模块的导出。 */
@Module({ controllers: [CanvasGroupExecutorController], providers: [CanvasGroupExecutorService, TextGenerationService] })
export class CanvasGroupExecutorModule {}
