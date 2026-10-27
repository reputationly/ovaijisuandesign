import { readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

import { WorkspacePathService } from "../common/workspace-path.service.js";


const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
const DEFAULT_LIMIT = 2000;
const MAX_LIMIT = 2000;
const MAX_LINE_CHARS = 2000;
const MAX_PAGE_BYTES = 50 * 1024;
const LINE_SUFFIX = `... (line truncated to ${MAX_LINE_CHARS} chars)`;
/** 单张内嵌图与整页合计的上限：超了只记数不返回，避免一页几十兆撑爆回包。 */
const MAX_PDF_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_PDF_IMAGES_TOTAL_BYTES = 4 * 1024 * 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface PdfImage {
  page: number;
  index: number;
  mimeType: "image/png";
  data: string;
  width: number;
  height: number;
}

/** 纯文本按扩展名判断；不认识的再嗅 NUL 字节，避免把二进制当文本读回来。 */
const TEXT_EXTENSIONS = new Set([
  ".md", ".markdown", ".txt", ".json", ".json5", ".jsonc", ".yaml", ".yml", ".toml", ".ini", ".csv", ".tsv",
  ".html", ".htm", ".xml", ".svg", ".css", ".scss", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py",
  ".sh", ".bash", ".zsh", ".sql", ".log", ".srt", ".vtt", ".ass", ".ssa", ".sub", ".env", ".gitignore",
]);

export type DocumentReadResult =
  | {
      ok: true;
      /** text: 普通文本；document: Word/PDF 抽取；directory: 目录列举。 */
      kind: "text" | "document" | "directory";
      lines: string[];
      offset: number;
      totalLines: number;
      more: boolean;
      images?: PdfImage[];
      imagesOmitted?: number;
    }
  | { ok: false; reason: "unsupported" | "too-large" | "parse-error" | "not-found" | "invalid-offset"; message?: string };

/**
 * .docx / .pdf 的纯文本分页读取（MCP `read` 工具读文档时用）。按行分页，和读普通文本
 * 文件的体验一致：offset 从 1 开始，一页最多 2000 行、50KB，超长的单行截断。
 *
 * `imagePage`（1 起）额外把该 PDF 页的内嵌 PNG 一并返回 —— agent 读带图文档时能直接看图，
 * 不用另存文件再走 analyse_media。只收 PNG（其它编码不转），且单张 2MB、合计 4MB 封顶。
 */
@Injectable()
export class DocumentReadService {
  private readonly log = new Logger("DocumentRead");

  constructor(private readonly paths: WorkspacePathService) {}

  /**
   * 可以读哪些地方。
   *
   * 工作区之外还要允许**模型自己的知识卡/技能引用**：那些文件在 `HILO_DATA_DIR`
   * （`…/data/.config-v2/knowledge/…`、`…/data/skills/<skill>/references/…`）和
   * `HILO_KNOWLEDGE_DIR` / `HILO_WORKFLOWS_DIR` 下。以前这里只认工作区，
   * agent 读知识卡一律 404/403 —— 只能退回 `bash` 去 `cat`。
   */
  private allowedRoots(): string[] {
    const roots = [
      this.paths.isWorkspaceLocked ? this.paths.root : undefined,
      process.env.HILO_DATA_DIR,
      process.env.HILO_KNOWLEDGE_DIR,
      process.env.HILO_WORKFLOWS_DIR,
    ];
    return roots.filter((root): root is string => typeof root === "string" && root.trim() !== "").map((root) => path.resolve(root));
  }

  /** 绝对/相对路径 → 允许范围内的真实路径；越界或不存在都返回 null。 */
  private async resolveReadable(rawPath: string): Promise<string | null> {
    const trimmed = rawPath.trim();
    if (!trimmed || trimmed.includes("\0")) return null;
    const configured = this.allowedRoots();
    if (configured.length === 0) return null;
    // macOS 上 /var 是指向 /private/var 的符号链接：根目录和 realpath 后的路径必须
    // 统一成同一形态再比，否则工作区内的文件会被判成"越界"。
    const roots = await Promise.all(configured.map(async (root) => (await realpath(root).catch(() => root)) ?? root));
    const abs = path.isAbsolute(trimmed) ? path.resolve(trimmed) : path.resolve(roots[0]!, trimmed);
    const candidates = [abs];
    if (!path.isAbsolute(trimmed)) for (const root of roots) candidates.push(path.resolve(root, trimmed));
    for (const candidate of candidates) {
      if (!configured.some((root) => isWithinRoot(root, candidate)) && !roots.some((root) => isWithinRoot(root, candidate))) continue;
      const real = await realpath(candidate).catch(() => null);
      // 在允许范围内但不存在：把路径交给调用方的 stat 报 `not-found`，
      // 不要笼统报 `unsupported`（那样 agent 会以为路径写错了位置）。
      if (real === null) return candidate;
      // 存在但真身跑出了允许范围（符号链接逃逸）：拒绝。
      if (!roots.some((root) => isWithinRoot(root, real))) continue;
      return real;
    }
    return null;
  }

  /** 文档缓存按工作区根和版本号分目录。没绑工作区时没有可写的缓存根。 */
  cacheContext() {
    if (!this.paths.isWorkspaceLocked) throw new ServiceUnavailableException("Document cache requires a workspace-bound Gateway");
    return { workspaceRoot: this.paths.root, version: "v2-p1" };
  }

  /** 纯文本：整体读入再按行分页（和文档同一套 offset/limit/超长行截断规则）。 */
  private async readTextFile(abs: string, ext: string, size: number, rawOffset?: number, rawLimit?: number): Promise<DocumentReadResult> {
    let text: string;
    try {
      const buffer = await readFile(abs);
      if (!TEXT_EXTENSIONS.has(ext) && buffer.subarray(0, 8192).includes(0)) {
        return { ok: false, reason: "unsupported", message: "read returns text only; inspect this file with design_analyse_media or design_resource_preview" };
      }
      text = buffer.toString("utf8");
    } catch (error) {
      this.log.debug(`文本读取失败 ${abs}: ${(error as Error).message}`);
      return { ok: false, reason: "parse-error" };
    }
    const lines = text.length === 0 ? [] : text.split(/\r?\n/);
    return paginate(lines, rawOffset, rawLimit, "text", this.log, abs, size);
  }

  /** 目录：列一级条目，目录名带 `/` 后缀。 */
  private async readDirectory(abs: string, rawOffset?: number, rawLimit?: number): Promise<DocumentReadResult> {
    let entries;
    try {
      entries = await readdir(abs, { withFileTypes: true });
    } catch (error) {
      this.log.debug(`目录列举失败 ${abs}: ${(error as Error).message}`);
      return { ok: false, reason: "parse-error" };
    }
    const names = entries
      .filter((entry) => !entry.name.startsWith(".DS_Store"))
      .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
      .sort((a, b) => a.localeCompare(b));
    return paginate(names, rawOffset, rawLimit, "directory", this.log, abs, 0);
  }

  async read(rawPath: string, rawOffset?: number, rawLimit?: number, rawImagePage?: number): Promise<DocumentReadResult> {
    if (!rawPath) return { ok: false, reason: "unsupported" };
    const abs = await this.resolveReadable(rawPath);
    if (!abs) return { ok: false, reason: "unsupported" };
    const st = await stat(abs).catch(() => null);
    if (!st) return { ok: false, reason: "not-found" };
    if (st.isDirectory()) return this.readDirectory(abs, rawOffset, rawLimit);
    if (!st.isFile()) return { ok: false, reason: "unsupported" };
    if (st.size > MAX_DOCUMENT_BYTES) return { ok: false, reason: "too-large" };
    const ext = path.extname(abs).toLowerCase();
    if (ext !== ".pdf" && ext !== ".docx") return this.readTextFile(abs, ext, st.size, rawOffset, rawLimit);
    if (rawImagePage !== undefined) {
      // 只有 PDF 有内嵌图这一说；给了页号就必须是真 PDF。
      if (ext !== ".pdf") return { ok: false, reason: "unsupported" };
      if (!Number.isSafeInteger(rawImagePage) || rawImagePage < 1) {
        return { ok: false, reason: "invalid-offset", message: "image_page must be a positive PDF page number" };
      }
    }

    const offset = positive(rawOffset, 1);
    const limit = Math.min(positive(rawLimit, DEFAULT_LIMIT), MAX_LIMIT);
    let text: string;
    try {
      text = await extractText(abs, ext);
    } catch (err) {
      this.log.debug(`文档解析失败 ${abs}: ${(err as Error).message}`);
      return { ok: false, reason: "parse-error" };
    }
    const lines = text.length === 0 ? [] : text.split(/\r?\n/);
    // 空文档只接受从第 1 行读（回一页空结果），其余越界都报错。
    const lastReadable = Math.max(lines.length, 1);
    if (offset > lastReadable) {
      return { ok: false, reason: "invalid-offset", message: `Offset ${offset} is out of range for this document (${lines.length} lines)` };
    }
    const page: string[] = [];
    let bytes = 0;
    const start = offset - 1;
    const end = Math.min(lines.length, start + limit);
    for (let i = start; i < end; i++) {
      const raw = lines[i] ?? "";
      const line = raw.length > MAX_LINE_CHARS ? `${raw.slice(0, MAX_LINE_CHARS)}${LINE_SUFFIX}` : raw;
      const n = Buffer.byteLength(line, "utf8") + (page.length ? 1 : 0);
      // 至少给一行，否则一行就超过 50KB 的文档永远翻不动。
      if (page.length && bytes + n > MAX_PAGE_BYTES) break;
      page.push(line);
      bytes += n;
    }
    let extracted: { images: PdfImage[]; imagesOmitted: number } | undefined;
    if (rawImagePage !== undefined) {
      try {
        extracted = await extractPdfImages(abs, rawImagePage);
      } catch (err) {
        if (err instanceof PdfImagePageOutOfRangeError) return { ok: false, reason: "invalid-offset", message: err.message };
        this.log.debug(`PDF 内嵌图提取失败 ${abs}: ${(err as Error).message}`);
        return { ok: false, reason: "parse-error", message: "PDF image extraction failed; retry" };
      }
    }
    return {
      ok: true,
      kind: "document",
      lines: page,
      offset,
      totalLines: lines.length,
      more: start + page.length < lines.length,
      ...(extracted ? { images: extracted.images, imagesOmitted: extracted.imagesOmitted } : {}),
    };
  }
}

/**
 * 按行分页：offset 1 起、limit 最多 2000 行、单页 50KB 上限、超长行截断。
 * 文本、目录、文档三条路径共用同一套规则，调用方看到的形状才一致。
 */
function paginate(
  lines: string[],
  rawOffset: number | undefined,
  rawLimit: number | undefined,
  kind: "text" | "directory" | "document",
  log: Logger,
  abs: string,
  size: number,
): DocumentReadResult {
  const offset = positive(rawOffset, 1);
  const limit = Math.min(positive(rawLimit, DEFAULT_LIMIT), MAX_LIMIT);
  const lastReadable = Math.max(lines.length, 1);
  if (offset > lastReadable) {
    return { ok: false, reason: "invalid-offset", message: `Offset ${offset} is out of range for ${abs} (${lines.length} lines)` };
  }
  const start = offset - 1;
  const end = Math.min(lines.length, start + limit);
  const page: string[] = [];
  let bytes = 0;
  for (let i = start; i < end; i++) {
    const raw = lines[i] ?? "";
    const line = raw.length > MAX_LINE_CHARS ? `${raw.slice(0, MAX_LINE_CHARS)}${LINE_SUFFIX}` : raw;
    const n = Buffer.byteLength(line, "utf8") + (page.length ? 1 : 0);
    // 至少给一行，否则一行就超过 50KB 的文档永远翻不动。
    if (page.length && bytes + n > MAX_PAGE_BYTES) break;
    page.push(line);
    bytes += n;
  }
  void size;
  void log;
  return { ok: true, kind, lines: page, offset, totalLines: lines.length, more: start + page.length < lines.length };
}

function isWithinRoot(root: string, abs: string): boolean {
  const rel = path.relative(root, abs);
  return rel === "" ? false : !rel.startsWith("..") && !path.isAbsolute(rel);
}

export class PdfImagePageOutOfRangeError extends Error {}

/** 只取指定页；非 PNG 或超限的图记进 omitted，不作为错误。 */
export async function extractPdfImages(abs: string, imagePage: number): Promise<{ images: PdfImage[]; imagesOmitted: number }> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: await readFile(abs), maxImageSize: 8_000_000 });
  try {
    const result = await parser.getImage({ partial: [imagePage], imageThreshold: 80, imageDataUrl: false, imageBuffer: true });
    if (imagePage > result.total) throw new PdfImagePageOutOfRangeError(`PDF page ${imagePage} is out of range (${result.total} pages)`);
    const images: PdfImage[] = [];
    let imagesOmitted = 0;
    let totalBytes = 0;
    for (const resultPage of result.pages) {
      for (const [index, image] of resultPage.images.entries()) {
        const data = Buffer.from(image.data);
        const isPng = data.subarray(0, 8).equals(PNG_MAGIC);
        if (!isPng || data.length > MAX_PDF_IMAGE_BYTES || totalBytes + data.length > MAX_PDF_IMAGES_TOTAL_BYTES) {
          imagesOmitted += 1;
          continue;
        }
        totalBytes += data.length;
        images.push({
          page: imagePage,
          index: index + 1,
          mimeType: "image/png",
          data: data.toString("base64"),
          width: image.width,
          height: image.height,
        });
      }
    }
    return { images, imagesOmitted };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

/** 解析库按需加载：pdf.js 很大，启动时不该为一个很少用到的接口付这个代价。 */
export async function extractText(abs: string, ext: string): Promise<string> {
  if (ext === ".pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: await readFile(abs) });
    try {
      return ((await parser.getText()).text ?? "").trim();
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }
  const mammoth = (await import("mammoth")).default;
  return ((await mammoth.extractRawText({ path: abs })).value ?? "").trim();
}

function positive(v: number | undefined, fallback: number): number {
  return v === undefined || !Number.isFinite(v) ? fallback : Math.max(1, Math.floor(v));
}
