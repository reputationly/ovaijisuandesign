import { readFile, stat, writeFile } from "node:fs/promises";

import { Injectable, Logger } from "@nestjs/common";
import type { AssetRow } from "@ov/assets";
import { chat, type MediaConfig } from "@ov/maas-media";
import type { CanvasNode } from "@ov/protocol";

import { CanvasService } from "../canvas/canvas.service.js";
import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { sanitizeFileName, writeUniqueSpaced } from "../files/file-names.js";
import { describeFailure } from "../generate/generation-runner.service.js";
import { MediaConfigService } from "../generate/media-config.service.js";
import { buildCatalog, MAAS_BACKEND } from "../generate/model-catalog.js";
import type { GenerateCanvasTextDto } from "./edit.dto.js";
import { imageDataUri } from "./edit.service.js";

export type CanvasTextResult =
  | { ok: true; path: string }
  | { ok: false; error: string; error_code: string; failure_presentation?: "terminal" | "status_unknown"; user_message?: string };

/** 正文长度上限，不是目标长度：文本节点常用来写整篇稿子。 */
const TEXT_BUDGET = 8192;
const TEXT_TIMEOUT_MS = 300_000;

/**
 * 画布文本节点的生成（`/api/generate/text`）：结果写进一个 `.md` 文本资产，节点在生成期间
 * 显示"生成中"，完成后按 `textRevision` 重新读文件。
 *
 * 只接受画布发起的请求：agent 写文本走 canvas_write_node，不经过这里。
 * 目标：`replace_node_id` 是文本节点就写进它的文件（空节点先挂一份新文件），否则按提示词首行
 * 新建一个文件和节点，有来源时连派生边。
 */
@Injectable()
export class TextGenerationService {
  private readonly log = new Logger("TextGeneration");

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly assets: AssetsService,
    private readonly canvas: CanvasService,
    private readonly media: MediaConfigService,
  ) {}

  async generate(req: GenerateCanvasTextDto, source: string | undefined): Promise<CanvasTextResult> {
    let cfg: MediaConfig;
    try {
      cfg = this.media.load();
    } catch (err) {
      return { ok: false, error: `Platform config is unreadable: ${(err as Error).message}`, error_code: "client_error" };
    }
    const entry = buildCatalog(cfg).textModels.find((m) => m.id === req.model_id);
    if (!entry) {
      this.log.warn(`[text-gen] model "${req.model_id}" is not a configured text model`);
      return { ok: false, error: "No text model for this model id", error_code: "client_error" };
    }
    if (source !== "canvas") return { ok: false, error: "Text generation is only supported for canvas requests", error_code: "client_error" };

    let nodeId: string;
    let relPath: string;
    try {
      ({ nodeId, relPath } = await this.resolveTarget(req));
    } catch (err) {
      const msg = (err as Error).message;
      this.log.warn(`[text-gen] failed to resolve target: ${msg}`);
      return { ok: false, error: msg, error_code: "client_error" };
    }
    const displayPrompt = req.display_prompt || req.prompt;
    const now = new Date().toISOString();
    await this.canvas.updateTextNodeData(nodeId, {
      prompt: displayPrompt,
      displayPrompt,
      model: entry.name,
      model_id: req.model_id,
      ...(req.params ? { params: req.params } : {}),
      backend: MAAS_BACKEND,
      referenceImageIds: this.refIds(req.image_paths),
      referenceTextIds: this.refIds(req.text_paths),
      referenceVideoIds: this.refIds(req.video_paths),
      referenceAudioIds: this.refIds(req.audio_paths),
      popoverDraft: undefined,
      status: "generating",
      createdAt: now,
      generationStartedAt: now,
      errorMessage: undefined,
      errorReason: undefined,
      retryPayload: undefined,
      cloudTraceId: undefined,
      cloudTaskId: undefined,
    });
    await this.persistModelMeta(relPath, req, displayPrompt, entry.name);

    let messages: unknown[];
    try {
      messages = await this.buildMessages(req, entry.name);
    } catch (err) {
      const msg = (err as Error).message;
      this.log.warn(`[text-gen] ref preparation failed: ${msg}`);
      await this.markFailed(nodeId, msg, "error");
      return { ok: false, error: msg, error_code: "client_error" };
    }

    let text: string;
    try {
      const turn = await chat.completeWithTools(this.media.client(), cfg, messages, [], TEXT_BUDGET, TEXT_TIMEOUT_MS, req.model_id);
      text = turn.content;
    } catch (err) {
      const { message, code } = describeFailure(err);
      // 传输层断掉时平台那边可能已经在写了，卡片不说"失败"，说"状态未知"。
      const uncertain = code === "network_error";
      await this.markFailed(nodeId, message, uncertain ? "status_unknown" : "error");
      return { ok: false, error: message, error_code: code, failure_presentation: uncertain ? "status_unknown" : "terminal" };
    }
    if (!text.trim()) {
      const message = "Model returned empty output";
      await this.markFailed(nodeId, message, "error");
      return { ok: false, error: message, error_code: "backend_error", failure_presentation: "terminal" };
    }

    try {
      const abs = this.paths.resolve(relPath);
      if (!abs) throw new Error(`Path traversal detected: ${relPath}`);
      await writeFile(abs, text, "utf8");
      await this.canvas.updateTextNodeData(nodeId, {
        status: undefined,
        errorMessage: undefined,
        errorReason: undefined,
        retryPayload: undefined,
        cloudTraceId: undefined,
        cloudTaskId: undefined,
        generationStartedAt: undefined,
        textRevision: Date.now(),
      });
    } catch (err) {
      const message = `Failed to persist generated text: ${(err as Error).message}`;
      this.log.warn(`[text-gen] ${message}`);
      await this.markFailed(nodeId, message, "error");
      return { ok: false, error: message, error_code: "unknown", failure_presentation: "terminal" };
    }
    this.log.log(`[text-gen] ${relPath} ← ${text.length} chars (node=${nodeId})`);
    return { ok: true, path: relPath };
  }

  private async markFailed(nodeId: string, message: string, status: "error" | "status_unknown"): Promise<void> {
    await this.canvas.updateTextNodeData(nodeId, { status, errorMessage: message, textRevision: Date.now() }).catch(() => undefined);
  }

  /** 参考文件 → 资产 id（节点上的参考标记用）。不在资产库里的跳过。 */
  private refIds(paths: string[] | undefined): string[] | undefined {
    const ids = new Set<string>();
    for (const p of paths ?? []) {
      const abs = this.paths.resolve(p);
      const rel = abs ? this.paths.relativize(abs) : null;
      const id = rel ? this.assets.byPath(rel)?.id : undefined;
      if (id) ids.add(id);
    }
    return ids.size ? [...ids] : undefined;
  }

  private async resolveTarget(req: GenerateCanvasTextDto): Promise<{ nodeId: string; relPath: string }> {
    if (req.replace_node_id) {
      const node = (await this.canvas.getCanvas()).nodes.find((n) => n.id === req.replace_node_id && n.type === "text");
      if (node) {
        if (!node.assetId) return this.attachToLazyNode(node, req.prompt);
        const row = this.assets.byId(node.assetId);
        if (row?.path) return { nodeId: node.id, relPath: row.path };
      }
    }
    const row = await this.createTextFile(req.prompt);
    return { nodeId: await this.canvas.addTextAssetNode(row, req.source_node_id), relPath: row.path };
  }

  /** 空文本节点：它记着的文件还在就用它，否则新建一份，再原地挂上。 */
  private async attachToLazyNode(node: CanvasNode, prompt: string): Promise<{ nodeId: string; relPath: string }> {
    const dataPath = (node.data as { path?: unknown } | undefined)?.path;
    let row: AssetRow | undefined;
    if (typeof dataPath === "string" && dataPath) {
      const abs = this.paths.resolve(dataPath);
      const rel = abs ? this.paths.relativize(abs) : null;
      if (abs && rel && (await isFile(abs))) row = this.assets.byPath(rel) ?? (await this.assets.enroll(rel));
    }
    row ??= await this.createTextFile(prompt);
    const attached = await this.canvas.attachAssetToTextNode(node.id, row);
    if (!attached) throw new Error(`Text node ${node.id} no longer exists`);
    if (attached.attached) return { nodeId: node.id, relPath: row.path };
    // 渲染层抢先给它挂上了文件：用那一份，不覆盖。
    const existing = attached.node.assetId ? this.assets.byId(attached.node.assetId) : undefined;
    if (!existing) throw new Error(`Text node ${node.id} references a missing asset`);
    return { nodeId: node.id, relPath: existing.path };
  }

  private async createTextFile(prompt: string): Promise<AssetRow> {
    const abs = this.paths.resolve(`${deriveTextAssetStem(prompt)}.md`);
    if (!abs) throw new Error("Cannot create a text file in the workspace");
    const written = await writeUniqueSpaced(abs, "");
    const rel = this.paths.relativize(written)!;
    try {
      return await this.assets.enroll(rel);
    } catch (err) {
      throw new Error(`Text file created at ${rel} but asset enroll failed: ${(err as Error).message}`);
    }
  }

  /** 生成参数记进文本资产的元数据：节点上的这些字段会被裁掉，重开画布后弹层要从资产里找回模型。 */
  private async persistModelMeta(relPath: string, req: GenerateCanvasTextDto, displayPrompt: string, model: string): Promise<void> {
    try {
      const row = this.assets.byPath(relPath);
      if (!row) return;
      let prev: Record<string, unknown> = {};
      try {
        prev = row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : {};
      } catch {
        prev = {};
      }
      await this.assets.enroll(relPath, {
        ...prev,
        prompt: displayPrompt,
        model,
        model_id: req.model_id,
        backend: MAAS_BACKEND,
        ...(req.params ? { params: req.params } : {}),
      });
    } catch (err) {
      this.log.warn(`[text-gen] failed to persist model metadata for ${relPath}: ${(err as Error).message}`);
    }
  }

  /**
   * 系统提示默认告诉模型它的名字和"在文本节点里直接给结果"；调用方在 params.system_prompt 里给了就用调用方的。
   * 参考文本按「文本N」贴在提示词前面，参考图作为多模态内容。平台的对话模型收不了视频和音频，直接拒绝。
   */
  private async buildMessages(req: GenerateCanvasTextDto, displayName: string): Promise<unknown[]> {
    if (req.video_paths?.length || req.audio_paths?.length) {
      throw new Error("Video and audio references are not supported: the configured chat model only accepts text and images.");
    }
    const resolve = (p: string): string => {
      const abs = this.paths.resolve(p);
      if (!abs) throw new Error(`Path traversal detected: ${p}`);
      return abs;
    };
    const texts = await Promise.all((req.text_paths ?? []).map(async (p) => readFile(resolve(p), "utf8")));
    const images = await Promise.all((req.image_paths ?? []).map(async (p) => imageDataUri(resolve(p))));
    const userText = [...texts.map((t, i) => `【文本${i + 1}】\n${t}`), req.prompt].join("\n\n");
    const content: unknown = images.length
      ? [{ type: "text", text: userText }, ...images.map((url) => ({ type: "image_url", image_url: { url } }))]
      : userText;
    const custom = req.params?.system_prompt;
    const system = typeof custom === "string" && custom.trim() ? custom : buildTextNodeSystemPrompt(displayName);
    return [
      { role: "system", content: system },
      { role: "user", content },
    ];
  }
}

export function buildTextNodeSystemPrompt(displayName: string): string {
  return [
    `You are "${displayName}" — that is your exact model ID. If asked about your identity or model, answer with that name only; never claim to be another model.`,
    "Handle the user's text task in a canvas text node; referenced files may be provided as context. Reply with the result directly in Markdown, in the user's language, without meta commentary.",
  ].join("\n");
}

/** 文件名取提示词首行（清洗后最多 12 个字），首行为空时用 UTC 时间戳。 */
export function deriveTextAssetStem(content: string, now: Date = new Date()): string {
  const first = content.split("\n", 1)[0] ?? "";
  if (sanitizeFileName(first)) return sanitizeFileName(first);
  const p = (n: number) => String(n).padStart(2, "0");
  return `text-${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}-${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}`;
}

async function isFile(abs: string): Promise<boolean> {
  return stat(abs).then(
    (s) => s.isFile(),
    () => false,
  );
}
