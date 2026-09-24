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

export type DocumentReadResult =
  | { ok: true; lines: string[]; offset: number; totalLines: number; more: boolean }
  | { ok: false; reason: "unsupported" | "too-large" | "parse-error" | "not-found" | "invalid-offset"; message?: string };

/**
 * .docx / .pdf 的纯文本分页读取（MCP `read` 工具读文档时用）。按行分页，和读普通文本
 * 文件的体验一致：offset 从 1 开始，一页最多 2000 行、50KB，超长的单行截断。
 */
@Injectable()
export class DocumentReadService {
  private readonly log = new Logger("DocumentRead");

  constructor(private readonly paths: WorkspacePathService) {}

  async read(rawPath: string, rawOffset?: number, rawLimit?: number): Promise<DocumentReadResult> {
    if (!rawPath) return { ok: false, reason: "unsupported" };
    const abs = await resolveInsideWorkspace(this.paths.root, rawPath);
    if (!abs) return { ok: false, reason: "unsupported" };
    const st = await stat(abs).catch(() => null);
    if (!st) return { ok: false, reason: "not-found" };
    if (!st.isFile()) return { ok: false, reason: "unsupported" };
    if (st.size > MAX_DOCUMENT_BYTES) return { ok: false, reason: "too-large" };
    const ext = path.extname(abs).toLowerCase();
    if (ext !== ".pdf" && ext !== ".docx") return { ok: false, reason: "unsupported" };

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
    if (offset > lines.length && !(lines.length === 0 && offset === 1)) {
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
    return { ok: true, lines: page, offset, totalLines: lines.length, more: start + page.length < lines.length };
  }
}

/** 解析库按需加载：pdf.js 很大，启动时不该为一个很少用到的接口付这个代价。 */
async function extractText(abs: string, ext: string): Promise<string> {
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
