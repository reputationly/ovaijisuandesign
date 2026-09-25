import { access, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { chat, image, type MediaConfig } from "@ov/maas-media";
import sharp from "sharp";

import { CanvasService } from "../canvas/canvas.service.js";
import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { downloadMediaToDir } from "../generate/media-download.js";
import { MediaConfigService } from "../generate/media-config.service.js";
import type {
  AnalyzeMediaDto,
  ConcatenateDto,
  EmbedAudioDto,
  ExtractAudioDto,
  FfmpegRunDto,
  GenerateTextDto,
  GenerateTextMessagesDto,
  SuperResolutionDto,
} from "./edit.dto.js";
import { checkFfmpegCommand, inputIndices, isDryRun, type OutputType, resolveOutputExt, stripTrailingOutput } from "./ffmpeg-args.js";
import { FfmpegService } from "./ffmpeg.service.js";
import { type OutputKind, reserveOutputPath, resolveInsideWorkspace, toWorkspaceRel } from "./paths.js";

export type EditResult = { ok: true; path: string; warnings?: string[]; _probe?: { stdout: string; stderr: string } } | { ok: false; error: string };
export type SuperResolutionResult = { ok: true; path: string; width: number; height: number; node_id?: string } | { ok: false; error: string };
export type TextResult = { ok: true; text: string } | { ok: false; error: string };

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "tif", "tiff", "heic", "heif", "avif"]);
const VIDEO_EXTS = new Set(["mp4", "mov", "avi", "mkv", "webm", "m4v", "flv", "wmv", "mpg", "mpeg", "3gp"]);
const AUDIO_EXTS = new Set(["mp3", "wav", "aac", "flac", "ogg", "m4a", "opus", "wma", "aiff"]);

/** 多模态输入的上限：长边 2160、单图 5MB，超了先缩再发。 */
const IMAGE_MAX_EDGE = 2160;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
/** 视频按时长均匀抽帧，最多这么多张。 */
const MAX_VIDEO_FRAMES = 6;
const ANALYZE_TIMEOUT_MS = 180_000;
const TEXT_TIMEOUT_MS = 120_000;
/**
 * 对话预算的下限。推理模型的思考过程和正文共用 max_tokens，调用方按"只要一行结果"给的
 * 128 会被思考全部吃掉，正文回空。这是上限不是目标长度，放宽不会让回答变长。
 */
const MIN_CHAT_BUDGET = 1024;
const ANALYZE_BUDGET = 4096;

interface RecordOptions {
  sourceNodeId?: string;
  replaceNodeId?: string;
  referencePaths?: string[];
  metadata?: { prompt?: string; model?: string; description?: string };
  sessionId?: string;
}

/**
 * 本地编辑（ffmpeg）和多模态理解。编辑产物统一落在工作区根目录，登记进资产库后放上画布。
 */
@Injectable()
export class EditService {
  private readonly log = new Logger("Edit");

  constructor(
    private readonly ffmpeg: FfmpegService,
    private readonly paths: WorkspacePathService,
    private readonly assets: AssetsService,
    private readonly canvas: CanvasService,
    private readonly media: MediaConfigService,
  ) {}

  private get root(): string {
    return this.paths.root;
  }

  /** 工作区内的路径（相对或绝对）→ 绝对路径；越界 400。 */
  private async resolveOrThrow(p: string): Promise<string> {
    const abs = await resolveInsideWorkspace(this.root, p);
    if (!abs) throw new BadRequestException(`Path traversal detected: ${p}`);
    return abs;
  }

  // -------------------------------------------------------------------------
  // 通用 ffmpeg
  // -------------------------------------------------------------------------

  async runFfmpeg(dto: FfmpegRunDto, sessionId?: string): Promise<EditResult> {
    const outputType: OutputType = dto.output_type ?? "video";
    const check = checkFfmpegCommand(dto.args, outputType);
    if (!check.ok) return check;
    const sandboxed = await this.sandboxInputs(dto.args.filter((a) => a !== "-y"));
    if ("error" in sandboxed) return { ok: false, error: sandboxed.error };
    let args = sandboxed.args;

    if (isDryRun(args)) {
      // null 封装器也要一个"输出"，ffmpeg 约定写 `-`。
      const probeArgs = args[args.length - 1] === "-" ? args : [...args, "-"];
      try {
        const { stdout, stderr } = await this.ffmpeg.exec(probeArgs, { cwd: this.root });
        return { ok: true, path: "", _probe: { stdout, stderr } };
      } catch (err) {
        return { ok: false, error: `ffmpeg failed: ${(err as Error).message}` };
      }
    }

    args = stripTrailingOutput(args);
    const ext = resolveOutputExt(outputType, args);
    if ("error" in ext) return { ok: false, error: ext.error };
    const out = await reserveOutputPath(this.root, outputType, dto.filename, ext.ext);
    try {
      await this.ffmpeg.exec([...args, "-y", out], { cwd: this.root });
      await assertNonEmpty(out);
    } catch (err) {
      await rm(out, { force: true });
      return { ok: false, error: `ffmpeg failed: ${(err as Error).message}` };
    }
    const rel = toWorkspaceRel(this.root, out)!;
    // preserve_source_canvas_node：用户要两版都留着，被点名替换的节点改当来源连派生边。
    const preserve = dto.preserve_source_canvas_node === true;
    await this.recordOutput(rel, outputType, {
      sourceNodeId: dto.source_node_id ?? (preserve ? dto.replace_node_id : undefined),
      replaceNodeId: preserve ? undefined : dto.replace_node_id,
      referencePaths: dto.input_paths ?? sandboxed.inputs,
      metadata: dto.metadata,
      sessionId,
    });
    return { ok: true, path: rel };
  }

  /**
   * 把每个 `-i` 的输入钉在工作区里并改写成绝对路径（ffmpeg 的工作目录不影响结果）。
   * 网络协议、工作区外的文件、lavfi 里读文件的 movie 源一律拒绝；`concat:` 逐段检查。
   * 滤镜参数里的文件（drawtext 的字体等）不在这里管 —— MCP 会注入应用自带的字体路径。
   */
  private async sandboxInputs(args: string[]): Promise<{ args: string[]; inputs: string[] } | { error: string }> {
    const out = [...args];
    const inputs: string[] = [];
    const idx = new Set(inputIndices(args));
    let format: string | undefined;
    for (let i = 0; i < out.length; i++) {
      if (out[i] === "-f" && i + 1 < out.length) format = out[i + 1];
      if (!idx.has(i)) continue;
      const raw = out[i]!;
      if (format === "lavfi") {
        if (/(^|[\s,;:[\]])a?movie\s*=/.test(raw)) return { error: "lavfi movie/amovie sources are not allowed; pass media files with -i instead." };
        format = undefined;
        continue;
      }
      format = undefined;
      if (raw.startsWith("concat:")) {
        const parts: string[] = [];
        for (const part of raw.slice("concat:".length).split("|")) {
          const r = await this.sandboxPath(part);
          if (typeof r !== "string") return r;
          parts.push(r);
          inputs.push(r);
        }
        out[i] = `concat:${parts.join("|")}`;
        continue;
      }
      const r = await this.sandboxPath(raw);
      if (typeof r !== "string") return r;
      out[i] = r;
      inputs.push(r);
    }
    return { args: out, inputs };
  }

  private async sandboxPath(raw: string): Promise<string | { error: string }> {
    let p = raw;
    // `file:` 是本地文件的显式写法；其余协议（http / tcp / pipe …）会让 ffmpeg 读到工作区外的东西。
    if (/^file:/i.test(p)) p = p.replace(/^file:(\/\/)?/i, "");
    else if (/^[a-z][a-z0-9+.-]+:/i.test(p) && !/^[a-z]:[\\/]/i.test(p)) {
      return { error: `Input "${raw}" uses a non-file protocol; only local files inside the workspace are allowed.` };
    }
    const abs = await resolveInsideWorkspace(this.root, p);
    if (!abs) return { error: `Input path is outside the workspace: ${raw}` };
    // 图片序列（`frame_%03d.png`）和 glob 不是一个具体文件，存在性交给 ffmpeg 判断。
    if (!/[%*?]/.test(p) && !(await exists(abs))) return { error: `Input file not found: ${raw}` };
    return abs;
  }

  // -------------------------------------------------------------------------
  // 拼接 / 配音轨 / 抽音轨
  // -------------------------------------------------------------------------

  async concatenateVideos(dto: ConcatenateDto, sessionId?: string): Promise<EditResult> {
    const inputs = await Promise.all(dto.video_paths.map((p) => this.resolveOrThrow(p)));
    const out = await reserveOutputPath(this.root, "video", dto.filename);
    try {
      await this.ffmpeg.concatenate(inputs, out, dto.scale_mode ?? "first", dto.target_width, dto.target_height);
      await assertNonEmpty(out);
    } catch (err) {
      await rm(out, { force: true });
      return { ok: false, error: `Concatenate failed: ${(err as Error).message}` };
    }
    const rel = toWorkspaceRel(this.root, out)!;
    await this.recordOutput(rel, "video", { sourceNodeId: dto.source_node_id, referencePaths: dto.video_paths, sessionId });
    return { ok: true, path: rel };
  }

  async embedAudio(dto: EmbedAudioDto, sessionId?: string): Promise<EditResult> {
    const video = await this.resolveOrThrow(dto.video_path);
    const audio = await this.resolveOrThrow(dto.audio_path);
    const out = await reserveOutputPath(this.root, "video", dto.filename);
    try {
      await this.ffmpeg.embedAudio(video, audio, out, dto.replace ?? false);
      await assertNonEmpty(out);
    } catch (err) {
      await rm(out, { force: true });
      return { ok: false, error: `Embed audio failed: ${(err as Error).message}` };
    }
    const rel = toWorkspaceRel(this.root, out)!;
    await this.recordOutput(rel, "video", {
      sourceNodeId: dto.source_node_id,
      replaceNodeId: dto.replace_node_id,
      referencePaths: [dto.video_path],
      sessionId,
    });
    return { ok: true, path: rel };
  }

  /**
   * 拆成一个独立音频和一份静音视频，两个都从源视频派生。两次 ffmpeg 互不牵连：
   * 静音视频失败只记一个 warning，音频已经成功了就不该整体报错。
   */
  async extractAudio(dto: ExtractAudioDto, sessionId?: string): Promise<EditResult> {
    const video = await this.resolveOrThrow(dto.video_path);
    const base = path.basename(dto.video_path).replace(/\.[^.]+$/, "") || "video";
    const audioOut = await reserveOutputPath(this.root, "audio", dto.filename ?? `${base}-audio`);
    try {
      await this.ffmpeg.extractAudio(video, audioOut);
      await assertNonEmpty(audioOut);
    } catch (err) {
      await rm(audioOut, { force: true });
      const msg = (err as Error).message;
      this.log.error(`extract-audio 失败 ${dto.video_path}: ${msg}`);
      return { ok: false, error: /Stream map.*matches no streams|does not contain any stream|Output file .*does not contain/i.test(msg) ? "Video has no audio track" : `Audio extraction failed: ${msg}` };
    }
    const audioRel = toWorkspaceRel(this.root, audioOut)!;
    await this.recordOutput(audioRel, "audio", { sourceNodeId: dto.source_node_id, referencePaths: [dto.video_path], sessionId });

    const warnings: string[] = [];
    const silentOut = await reserveOutputPath(this.root, "video", `${base}-muted`);
    try {
      await this.ffmpeg.removeAudio(video, silentOut);
      await assertNonEmpty(silentOut);
      await this.recordOutput(toWorkspaceRel(this.root, silentOut)!, "video", { sourceNodeId: dto.source_node_id, referencePaths: [dto.video_path], sessionId });
    } catch (err) {
      await rm(silentOut, { force: true });
      this.log.warn(`extract-audio 的静音视频失败 ${dto.video_path}: ${(err as Error).message}`);
      warnings.push("silent_video_failed");
    }
    return warnings.length ? { ok: true, path: audioRel, warnings } : { ok: true, path: audioRel };
  }

  // -------------------------------------------------------------------------
  // 图片超分
  // -------------------------------------------------------------------------

  /**
   * 同步超分：出一张新图，不动原图（原图可能还被别的节点引用）。
   *
   * 目标尺寸必须按源图的实际像素算：平台不认档位词，只认精确的 `size`，不传就按默认的
   * 2 倍放大，选什么档都一样。EXIF 旋转过的照片要按显示方向量，否则竖图算成横图的尺寸。
   */
  async superResolution(dto: SuperResolutionDto, sessionId?: string): Promise<SuperResolutionResult> {
    const src = await this.resolveOrThrow(dto.image_path);
    const ext = path.extname(src).toLowerCase().replace(/^\./, "");
    if (!IMAGE_EXTS.has(ext)) return { ok: false, error: `Super resolution only accepts images: ${dto.image_path}` };
    let cfg: MediaConfig;
    try {
      cfg = this.media.load();
    } catch (err) {
      return { ok: false, error: `Platform config is unreadable: ${(err as Error).message}` };
    }
    const model = cfg.models.image_upscale?.trim();
    if (!cfg.platform.base_url.trim() || !model) {
      return { ok: false, error: "No image upscale model configured: set it in Settings." };
    }

    let width: number;
    let height: number;
    try {
      const meta = await sharp(src, { failOn: "none" }).metadata();
      const swap = (meta.orientation ?? 1) >= 5;
      width = (swap ? meta.height : meta.width) ?? 0;
      height = (swap ? meta.width : meta.height) ?? 0;
    } catch (err) {
      return { ok: false, error: `Failed to read image size: ${dto.image_path} (${(err as Error).message})` };
    }
    const tier = dto.resolution?.trim() || "2K";
    const size = image.upscaleSize(width, height, tier);
    // 不是故障，是这张图不用放大：说清楚现有尺寸，不然用户只看到一个没有原因的失败。
    if (!size) return { ok: false, error: `Image is already ${width}x${height}, at or above ${tier.toUpperCase()}; nothing to upscale.` };

    let abs: string;
    try {
      const [source] = await image.loadImageInputs(this.root, [src]);
      const url = await image.upscale(this.media.client(), cfg, source!, size);
      const base = path.basename(dto.image_path).replace(/\.[^.]+$/, "") || "image";
      abs = await downloadMediaToDir(url, this.root, dto.filename ?? `${base}-${tier.toLowerCase()}`);
    } catch (err) {
      return { ok: false, error: `Super resolution failed: ${(err as Error).message}` };
    }
    const rel = toWorkspaceRel(this.root, abs)!;
    const preserve = dto.preserve_source_canvas_node === true;
    const nodeId = await this.recordOutput(rel, "image", {
      sourceNodeId: dto.source_node_id ?? (preserve ? dto.replace_node_id : undefined),
      replaceNodeId: preserve ? undefined : dto.replace_node_id,
      referencePaths: [dto.image_path],
      metadata: { model, description: `super resolution ${tier.toUpperCase()}` },
      sessionId,
    });
    const [w, h] = size.split("x").map(Number) as [number, number];
    const row = this.assets.byPath(rel);
    this.log.log(`super-resolution: ${dto.image_path} ${width}x${height} → ${size}`);
    return { ok: true, path: rel, width: row?.width ?? w, height: row?.height ?? h, ...(nodeId ? { node_id: nodeId } : {}) };
  }

  /**
   * 产物登记 + 上画布。失败只记日志：文件已经在盘上、路径也会回给调用方，登记失败不该让
   * 整个编辑报错（用户重试会再生成一份 `_1`）。
   */
  private async recordOutput(rel: string, kind: OutputKind, o: RecordOptions): Promise<string | undefined> {
    try {
      const abs = path.join(this.root, rel);
      const info = kind === "image" ? undefined : await this.ffmpeg.probeMedia(abs);
      const refIds = [
        ...new Set(
          (o.referencePaths ?? [])
            .map((p) => toWorkspaceRel(this.root, p))
            .map((r) => (r ? this.assets.byPath(r)?.id : undefined))
            .filter((id): id is string => !!id),
        ),
      ];
      const m = o.metadata ?? {};
      const row = await this.assets.enroll(rel, {
        prompt: m.prompt ?? "",
        model: m.model ?? "",
        description: m.description ?? "",
        ...(o.sessionId ? { session_id: o.sessionId } : {}),
        ...(refIds.length ? { reference_images: refIds } : {}),
      });
      const width = row.width ?? (info?.width || undefined);
      const height = row.height ?? (info?.height || undefined);
      const duration = row.duration_ms != null ? row.duration_ms / 1000 : info?.duration || undefined;
      return await this.canvas.placeDerivedMedia({
        row,
        replaceNodeId: o.replaceNodeId,
        sourceNodeId: o.sourceNodeId,
        referenceAssetIds: refIds,
        data: {
          ...(m.prompt ? { prompt: m.prompt } : {}),
          ...(m.model ? { model: m.model } : {}),
          ...(m.description ? { description: m.description } : {}),
          time: new Date().toISOString(),
          ...(width ? { width } : {}),
          ...(height ? { height } : {}),
          ...(duration ? { duration } : {}),
          ...(refIds.length ? { referenceImageIds: refIds } : {}),
        },
      });
    } catch (err) {
      this.log.warn(`编辑产物登记失败 ${rel}: ${(err as Error).message}`);
      return undefined;
    }
  }

  // -------------------------------------------------------------------------
  // 多模态理解 / 文本
  // -------------------------------------------------------------------------

  /**
   * 看图 / 看视频回答问题。走平台的 `/chat/completions`（OpenAI 兼容的多模态消息）：
   * 图片直接发 data URI，视频按时长均匀抽几帧当图片发。音频没有对应的通用接口，直接拒绝。
   */
  async analyzeMedia(dto: AnalyzeMediaDto): Promise<TextResult> {
    const ext = path.extname(dto.file_path).toLowerCase().replace(/^\./, "");
    // 和读文件的工具一致：绝对路径放行（素材可能来自别的工作区 / 知识库），相对路径必须在工作区内。
    const abs = path.isAbsolute(dto.file_path) ? path.resolve(dto.file_path) : await resolveInsideWorkspace(this.root, dto.file_path);
    if (!abs) return { ok: false, error: `Path traversal detected: ${dto.file_path}` };
    try {
      await access(abs);
    } catch {
      return { ok: false, error: `File not found at: ${abs} (input: ${dto.file_path})` };
    }
    if (AUDIO_EXTS.has(ext)) {
      return { ok: false, error: `Audio analysis is not supported: the configured platform chat model only accepts images and video frames (${dto.file_path}). Use media_transcribe for speech/lyrics.` };
    }
    if (!IMAGE_EXTS.has(ext) && !VIDEO_EXTS.has(ext)) {
      return { ok: false, error: `Unsupported media type ".${ext}" for analysis: only images and videos can be analyzed.` };
    }
    const cfg = this.chatConfig();
    if ("error" in cfg) return { ok: false, error: cfg.error };

    let parts: unknown[];
    try {
      if (IMAGE_EXTS.has(ext)) {
        parts = [{ type: "text", text: dto.question }, { type: "image_url", image_url: { url: await imageDataUri(abs) } }];
      } else {
        const info = await this.ffmpeg.probeMedia(abs);
        const n = info.duration > 0 ? Math.min(MAX_VIDEO_FRAMES, Math.max(1, Math.ceil(info.duration / 2))) : 1;
        const times = Array.from({ length: n }, (_, i) => (info.duration > 0 ? (info.duration * (i + 0.5)) / n : 0));
        const frames = await this.ffmpeg.extractFrames(abs, times);
        if (frames.length === 0) return { ok: false, error: `Failed to extract frames from video: ${dto.file_path}` };
        const note =
          `The ${frames.length} attached images are frames sampled in order from a ${info.duration > 0 ? `${info.duration.toFixed(1)}s ` : ""}video` +
          `${info.duration > 0 ? ` at ${times.slice(0, frames.length).map((t) => `${t.toFixed(1)}s`).join(", ")}` : ""}. The audio track is not included.`;
        parts = [
          { type: "text", text: `${note}\n\n${dto.question}` },
          ...frames.map((f) => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${f.toString("base64")}` } })),
        ];
      }
    } catch (err) {
      return { ok: false, error: `Failed to encode media: ${dto.file_path} (${(err as Error).message})` };
    }
    this.log.log(`analyze-media: ${dto.file_path}，问题：${dto.question.slice(0, 100)}`);
    return this.chatText(cfg.value, [{ role: "user", content: parts }], ANALYZE_BUDGET, ANALYZE_TIMEOUT_MS, "Analyze media failed", true);
  }

  /** 单轮文本生成，可带参考图和系统提示。 */
  async generateText(dto: GenerateTextDto, system?: string): Promise<TextResult> {
    const images = await Promise.all((dto.image_paths ?? []).map((p) => this.resolveOrThrow(p)));
    const cfg = this.chatConfig();
    if ("error" in cfg) return { ok: false, error: cfg.error };
    let content: unknown = dto.prompt;
    try {
      if (images.length) {
        content = [{ type: "text", text: dto.prompt }, ...(await Promise.all(images.map(async (p) => ({ type: "image_url", image_url: { url: await imageDataUri(p) } }))))];
      }
    } catch (err) {
      return { ok: false, error: `Text generation failed: ${(err as Error).message}` };
    }
    const messages = [...(system ? [{ role: "system", content: system }] : []), { role: "user", content }];
    return this.chatText(cfg.value, messages, MIN_CHAT_BUDGET * 2, TEXT_TIMEOUT_MS, "Text generation failed", false);
  }

  /** messages 形式的单轮调用（配图方案分类器用）。空回答照样 ok —— 分类器自己把空当"不选"。 */
  async generateTextMessages(dto: GenerateTextMessagesDto): Promise<TextResult> {
    const cfg = this.chatConfig();
    if ("error" in cfg) return { ok: false, error: cfg.error };
    this.log.log(`generate-text-messages: prompt=${dto.prompt.slice(0, 100)}`);
    const budget = Math.max(dto.max_tokens ?? 512, MIN_CHAT_BUDGET);
    return this.chatText(cfg.value, [{ role: "user", content: dto.prompt }], budget, TEXT_TIMEOUT_MS, "Text messages generation failed", false);
  }

  private chatConfig(): { value: MediaConfig } | { error: string } {
    let cfg: MediaConfig;
    try {
      cfg = this.media.load();
    } catch (err) {
      return { error: `Platform config is unreadable: ${(err as Error).message}` };
    }
    if (!cfg.platform.base_url.trim() || !cfg.platform.chat_model.trim()) {
      return { error: "No chat model configured: set the platform base URL and chat model in Settings." };
    }
    return { value: cfg };
  }

  private async chatText(cfg: MediaConfig, messages: unknown[], maxTokens: number, timeoutMs: number, label: string, requireText: boolean): Promise<TextResult> {
    try {
      const turn = await chat.completeWithTools(this.media.client(), cfg, messages, [], maxTokens, timeoutMs);
      if (requireText && !turn.content) {
        const hint = turn.finishReason === "length" ? " (output truncated by max_tokens)" : "";
        return { ok: false, error: `${label}: model returned no text${hint}` };
      }
      return { ok: true, text: turn.content };
    } catch (err) {
      return { ok: false, error: `${label}: ${(err as Error).message}` };
    }
  }
}

/** 图片 → data URI。尺寸、体积、格式都合适就原样发，否则缩到长边 2160 转 JPEG。 */
async function imageDataUri(abs: string): Promise<string> {
  const buf = await readFile(abs);
  const meta = await sharp(buf, { failOn: "none" }).metadata();
  const fmt = meta.format ?? "";
  const passthrough =
    ["jpeg", "png", "webp", "gif"].includes(fmt) && (meta.width ?? 0) <= IMAGE_MAX_EDGE && (meta.height ?? 0) <= IMAGE_MAX_EDGE && buf.length <= IMAGE_MAX_BYTES;
  if (passthrough) return `data:image/${fmt};base64,${buf.toString("base64")}`;
  const jpeg = await sharp(buf, { failOn: "none" })
    .rotate()
    .resize({ width: IMAGE_MAX_EDGE, height: IMAGE_MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 85 })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

async function exists(p: string): Promise<boolean> {
  return stat(p).then(
    () => true,
    () => false,
  );
}

/** 占位的空文件没被写上内容，说明 ffmpeg 其实把结果写到了别处（参数里自带了输出）或什么都没写。 */
async function assertNonEmpty(p: string): Promise<void> {
  const st = await stat(p);
  if (st.size === 0) throw new Error("ffmpeg produced an empty output file (do not include an output path in args)");
}
