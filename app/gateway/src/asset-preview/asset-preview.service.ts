import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { Injectable, Logger } from "@nestjs/common";
import { fileTypeFromMime } from "@ov/protocol";

import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { FfmpegService } from "../edit/ffmpeg.service.js";
import { resolveInsideWorkspace } from "../edit/paths.js";
import { extractText } from "./document-read.service.js";

const MAX_TEXT_PREVIEW_BYTES = 50 * 1024 * 1024;
const DEFAULT_PREVIEW_CHARS = 200;
const MIN_PREVIEW_CHARS = 1;
const MAX_PREVIEW_CHARS = 5000;
const PDF_EXT = ".pdf";
const DOC_EXTS = new Set([".doc", ".docx"]);
export const PLAIN_TEXT_EXTS = new Set([
  ".txt", ".md", ".markdown", ".json", ".yaml", ".yml", ".toml", ".ini", ".csv", ".tsv", ".log", ".html", ".htm", ".xml",
  ".css", ".scss", ".less", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".py", ".rs", ".go", ".java", ".c", ".h", ".cpp",
  ".hpp", ".cs", ".rb", ".php", ".sh", ".bash", ".zsh", ".sql", ".env", ".gitignore", ".dockerignore",
]);

type PreviewFailure = { ok: false; reason: "unsupported" | "not-found" | "too-large" | "parse-error" };
export type TextPreviewResult = { ok: true; text: string; truncated: boolean; totalChars: number } | PreviewFailure;

function clampChars(v: number | undefined): number {
  if (v === undefined || !Number.isFinite(v)) return DEFAULT_PREVIEW_CHARS;
  return Math.min(Math.max(Math.floor(v), MIN_PREVIEW_CHARS), MAX_PREVIEW_CHARS);
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseFps(v: unknown): number | undefined {
  if (typeof v !== "string" || !v) return undefined;
  const [a, b] = v.split("/").map(Number);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return undefined;
  const fps = a! / b!;
  return Number.isFinite(fps) && fps > 0 ? Math.round(fps * 1000) / 1000 : undefined;
}

/**
 * 素材的悬停预览：文本类文件取开头一段（PDF / Word 先抽纯文本），以及按类型补充的元数据
 * （视频帧率码率、音频采样率声道、PDF 页数、文本词数、修改时间）。
 *
 * 失败一律回 `{ok:false, reason}` 而不是 HTTP 错误：悬停卡片只需要知道"显示不了"，不该在控制台刷一片红。
 */
@Injectable()
export class AssetPreviewService {
  private readonly log = new Logger("AssetPreview");

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly assets: AssetsService,
    private readonly ffmpeg: FfmpegService,
  ) {}

  async textPreview(rawPath: string, rawChars?: number): Promise<TextPreviewResult> {
    if (!rawPath) return { ok: false, reason: "unsupported" };
    const chars = clampChars(rawChars);
    const abs = await resolveInsideWorkspace(this.paths.root, rawPath);
    if (!abs) return { ok: false, reason: "unsupported" };
    const st = await stat(abs).catch(() => null);
    if (!st) return { ok: false, reason: "not-found" };
    if (!st.isFile()) return { ok: false, reason: "unsupported" };
    if (st.size > MAX_TEXT_PREVIEW_BYTES) return { ok: false, reason: "too-large" };
    const ext = path.extname(abs).toLowerCase();
    try {
      if (PLAIN_TEXT_EXTS.has(ext)) {
        const raw = await readFile(abs, "utf8");
        const truncated = raw.length > chars;
        // 截断时总字数给文件字节数和字符数里大的那个：多字节文本按字节算会更大，只用来提示"还有很多"。
        return { ok: true, text: truncated ? raw.slice(0, chars) : raw, truncated, totalChars: truncated ? Math.max(raw.length, st.size) : raw.length };
      }
      if (ext === PDF_EXT || DOC_EXTS.has(ext)) {
        const full = await extractText(abs, ext);
        const truncated = full.length > chars;
        return { ok: true, text: truncated ? full.slice(0, chars) : full, truncated, totalChars: full.length };
      }
    } catch (err) {
      this.log.debug(`text preview failed for ${abs}: ${(err as Error).message}`);
      return { ok: false, reason: "parse-error" };
    }
    return { ok: false, reason: "unsupported" };
  }

  /** 资产库里存的元数据 + 按类型现算的补充字段。某一项算不出来就不带，不影响其他字段。 */
  async metadata(id: string): Promise<{ ok: true; metadata: Record<string, unknown> } | { ok: false; reason: string }> {
    if (!id) return { ok: false, reason: "asset-not-found" };
    let row;
    try {
      row = this.assets.byId(id);
    } catch (err) {
      return { ok: false, reason: (err as Error).message };
    }
    if (!row) return { ok: false, reason: "asset-not-found" };
    if (row.status !== "active" || row.soft_deleted_at !== null) return { ok: false, reason: "asset-unavailable" };
    const abs = this.paths.resolve(row.path);
    if (!abs) return { ok: false, reason: "asset-unavailable" };
    let stored: Record<string, unknown> = {};
    try {
      stored = row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : {};
    } catch {
      stored = {};
    }
    try {
      const enrichment = await this.enrich(fileTypeFromMime(row.mime_type, row.path), abs);
      return { ok: true, metadata: { ...stored, ...enrichment } };
    } catch (err) {
      return { ok: false, reason: (err as Error).message };
    }
  }

  private async enrich(type: string, abs: string): Promise<Record<string, unknown>> {
    switch (type) {
      case "video":
      case "audio":
        return this.enrichMedia(type, abs);
      case "image": {
        const st = await stat(abs).catch(() => null);
        return st ? { mtime: st.mtime.toISOString() } : {};
      }
      case "text":
      case "file":
        return this.enrichTextOrFile(abs);
      default:
        return {};
    }
  }

  private async enrichMedia(type: "video" | "audio", abs: string): Promise<Record<string, unknown>> {
    const probed = await this.ffmpeg.ffprobe(abs).catch(() => null);
    if (!probed) return {};
    const streams = (probed.streams ?? []) as Record<string, unknown>[];
    const format = (probed.format ?? {}) as Record<string, unknown>;
    const formatDuration = num(format.duration);
    const out: Record<string, unknown> = {};
    const put = (k: string, v: unknown) => {
      if (v !== undefined) out[k] = v;
    };
    if (type === "video") {
      // 封面图（mp3 / m4a 里的专辑图）也是一条 video 流，不能当画面。
      const v = streams.find((s) => s.codec_type === "video" && (s.disposition as { attached_pic?: number } | undefined)?.attached_pic !== 1);
      if (!v) return {};
      put("fps", parseFps(v.avg_frame_rate ?? v.r_frame_rate));
      put("codec", v.codec_name);
      put("bitRate", num(v.bit_rate));
      put("duration", num(v.duration) ?? formatDuration);
      put("width", num(v.width));
      put("height", num(v.height));
      return out;
    }
    const a = streams.find((s) => s.codec_type === "audio");
    if (!a) return {};
    put("sampleRate", num(a.sample_rate));
    put("channels", num(a.channels));
    put("bitRate", num(a.bit_rate));
    put("codec", a.codec_name);
    put("duration", num(a.duration) ?? formatDuration);
    return out;
  }

  private async enrichTextOrFile(abs: string): Promise<Record<string, unknown>> {
    const out: Record<string, unknown> = {};
    const st = await stat(abs).catch(() => null);
    if (st) out.mtime = st.mtime.toISOString();
    const ext = path.extname(abs).toLowerCase();
    if (ext === PDF_EXT) {
      const pages = await this.pdfPageCount(abs);
      if (pages !== undefined) out.pageCount = pages;
    } else if (PLAIN_TEXT_EXTS.has(ext)) {
      try {
        const trimmed = (await readFile(abs, "utf8")).trim();
        out.wordCount = trimmed ? trimmed.split(/\s+/u).length : 0;
      } catch (err) {
        this.log.debug(`wordCount failed for ${abs}: ${(err as Error).message}`);
      }
    }
    return out;
  }

  private async pdfPageCount(abs: string): Promise<number | undefined> {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: await readFile(abs) });
      try {
        const info = await parser.getInfo();
        return typeof info.total === "number" && Number.isFinite(info.total) ? info.total : undefined;
      } finally {
        await parser.destroy().catch(() => undefined);
      }
    } catch (err) {
      this.log.debug(`pdf pageCount failed for ${abs}: ${(err as Error).message}`);
      return undefined;
    }
  }
}
