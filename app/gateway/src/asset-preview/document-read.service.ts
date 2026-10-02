import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { Injectable, Logger } from "@nestjs/common";

import { WorkspacePathService } from "../common/workspace-path.service.js";
import { resolveInsideWorkspace } from "../edit/paths.js";

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

export type DocumentReadResult =
  | { ok: true; lines: string[]; offset: number; totalLines: number; more: boolean; images?: PdfImage[]; imagesOmitted?: number }
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

  async read(rawPath: string, rawOffset?: number, rawLimit?: number, rawImagePage?: number): Promise<DocumentReadResult> {
    if (!rawPath) return { ok: false, reason: "unsupported" };
    const abs = await resolveInsideWorkspace(this.paths.root, rawPath);
    if (!abs) return { ok: false, reason: "unsupported" };
    const st = await stat(abs).catch(() => null);
    if (!st) return { ok: false, reason: "not-found" };
    if (!st.isFile()) return { ok: false, reason: "unsupported" };
    if (st.size > MAX_DOCUMENT_BYTES) return { ok: false, reason: "too-large" };
    const ext = path.extname(abs).toLowerCase();
    if (ext !== ".pdf" && ext !== ".docx") return { ok: false, reason: "unsupported" };
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
      lines: page,
      offset,
      totalLines: lines.length,
      more: start + page.length < lines.length,
      ...(extracted ? { images: extracted.images, imagesOmitted: extracted.imagesOmitted } : {}),
    };
  }
}

class PdfImagePageOutOfRangeError extends Error {}

/** 只取指定页；非 PNG 或超限的图记进 omitted，不作为错误。 */
async function extractPdfImages(abs: string, imagePage: number): Promise<{ images: PdfImage[]; imagesOmitted: number }> {
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
