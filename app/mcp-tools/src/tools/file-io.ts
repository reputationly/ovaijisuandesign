import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { open } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { knowledgeDir, workflowsDir } from "../env.js";
import { errorReply } from "../replies.js";

/**
 * `read` 的本地实现：带行号的分页文本读取，目录列条目，.docx/.pdf 交给 gateway 抽文本。
 * 输出格式（`<path>` / `<type>` / `<content>` + `N: line`）和 opencode 内置 read 一致，
 * agent 对两者的用法可以互换。
 */

const MEDIA_EXTENSIONS = extSet("png jpg jpeg webp gif bmp heic heif mp4 mov webm avi mkv mp3 wav m4a flac ogg");

/** 空格分隔的扩展名表 → 带点的小写集合。 */
function extSet(list: string): Set<string> {
  return new Set(list.split(/\s+/).filter(Boolean).map((e) => `.${e}`));
}

export function isMediaFile(p: string): boolean {
  return MEDIA_EXTENSIONS.has(path.extname(p).toLowerCase());
}

const DEFAULT_READ_LIMIT = 2000;
const MAX_LINE_LENGTH = 2000;
const MAX_LINE_SUFFIX = `... (line truncated to ${MAX_LINE_LENGTH} chars)`;
const MAX_BYTES = 50 * 1024;
const SAMPLE_BYTES = 4096;

// 办公文档里只有 .docx/.pdf 走 gateway 抽文本，其余一律当二进制
const BINARY_EXTENSIONS = extSet(
  "zip tar gz 7z exe dll so o a lib bin dat obj wasm class jar war pyc pyo " +
    "doc docx xls xlsx ppt pptx odt ods odp pdf",
);
const READABLE_DOCUMENTS = new Set([".docx", ".pdf"]);

/** 有 NUL 字节或超过 30% 不可打印字符就当二进制。 */
function isBinarySample(sample: Buffer): boolean {
  if (sample.length === 0) return false;
  let nonPrintable = 0;
  for (const b of sample) {
    if (b === 0) return true;
    if (b < 9 || (b > 13 && b < 32)) nonPrintable++;
  }
  return nonPrintable / sample.length > 0.3;
}

async function readSample(file: string): Promise<Buffer> {
  const fh = await open(file, "r");
  try {
    const buf = Buffer.allocUnsafe(SAMPLE_BYTES);
    const { bytesRead } = await fh.read(buf, 0, SAMPLE_BYTES, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

function similarPaths(missing: string): string[] {
  const dir = path.dirname(missing);
  const base = path.basename(missing).toLowerCase();
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((item) => {
        const lower = item.toLowerCase();
        return lower.includes(base) || base.includes(lower);
      })
      .slice(0, 3)
      .map((item) => path.join(dir, item));
  } catch {
    return [];
  }
}

/** 流式读，超过 50KB 截断 —— 大文件不整读进内存，也不把 agent 上下文撑爆。 */
async function readLines(file: string, offset: number, limit: number) {
  const stream = createReadStream(file, { encoding: "utf8" });
  const lines = createInterface({ crlfDelay: Number.POSITIVE_INFINITY, input: stream });
  const raw: string[] = [];
  let bytes = 0;
  let count = 0;
  let cut = false;
  let more = false;
  try {
    for await (const text of lines) {
      count += 1;
      if (count < offset) continue;
      if (raw.length >= limit) {
        more = true;
        continue;
      }
      const line = text.length > MAX_LINE_LENGTH ? `${text.slice(0, MAX_LINE_LENGTH)}${MAX_LINE_SUFFIX}` : text;
      const size = Buffer.byteLength(line, "utf8") + (raw.length > 0 ? 1 : 0);
      if (bytes + size > MAX_BYTES) {
        cut = true;
        more = true;
        break;
      }
      raw.push(line);
      bytes += size;
    }
  } finally {
    lines.close();
    stream.destroy();
  }
  return { raw, count, cut, more };
}

/** 本会话读过哪些文件（绝对路径）。保留这份记录给后续的“先读后写”类校验用。 */
const sessionReadFiles = new Map<string, Set<string>>();

export function markFileRead(sessionId: string | undefined, file: string): void {
  const key = sessionId || "__no_session__";
  let set = sessionReadFiles.get(key);
  if (!set) sessionReadFiles.set(key, (set = new Set()));
  set.add(path.resolve(file));
}

/**
 * `<knowledgeDir>/…`、`<workflowsDir>/…` 逻辑路径 → 真实路径。不以令牌开头返回 null；
 * 令牌对应的目录不可用或路径逃出根目录返回 error。
 */
export function resolveLogicalPath(raw: string): { path: string } | { error: string } | null {
  const roots: [string, string, () => string | null][] = [
    ["<knowledgeDir>", "HILO_KNOWLEDGE_DIR", knowledgeDir],
    ["<workflowsDir>", "HILO_WORKFLOWS_DIR", workflowsDir],
  ];
  for (const [token, envKey, resolveRoot] of roots) {
    if (raw !== token && !raw.startsWith(`${token}/`) && !raw.startsWith(`${token}\\`)) continue;
    const root = resolveRoot();
    if (!root) return { error: `cannot resolve ${token}: ${envKey} is not set and no profile folder was found.` };
    const base = path.resolve(root);
    const target = path.resolve(base, raw === token ? "" : raw.slice(token.length + 1));
    const rel = path.relative(base, target);
    if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
      return { error: `path escapes ${token}; logical paths must point inside that folder.` };
    }
    return { path: target };
  }
  return null;
}

export type DocumentPage =
  | { ok: true; lines: string[]; offset: number; totalLines: number; more: boolean }
  | { ok: false; reason: string; message?: string };

export type DocumentReader = (absPath: string, offset: number, limit: number) => Promise<DocumentPage>;

const text = (t: string): CallToolResult => ({ content: [{ type: "text", text: t }] });

export async function readTextOrDirectory(
  rawPath: string,
  offsetArg: number | undefined,
  limitArg: number | undefined,
  sessionId: string | undefined,
  documentReader?: DocumentReader,
): Promise<CallToolResult> {
  const logical = resolveLogicalPath(rawPath);
  if (logical && "error" in logical) return errorReply(logical.error);
  const abs = logical?.path ?? path.resolve(rawPath);

  if (!existsSync(abs)) {
    const suggestions = similarPaths(abs);
    return errorReply(
      suggestions.length > 0
        ? `No such file: ${rawPath}\n\nSimilar names nearby:\n${suggestions.join("\n")}`
        : `No such file: ${rawPath}`,
    );
  }

  const limit = limitArg ?? DEFAULT_READ_LIMIT;
  // offset 是 1 起的行号；0 当 1 处理
  const offset = offsetArg || 1;

  if (statSync(abs).isDirectory()) {
    const items = readdirSync(abs, { withFileTypes: true })
      .map((e) => {
        if (e.isDirectory()) return `${e.name}/`;
        if (e.isSymbolicLink()) {
          try {
            if (statSync(path.join(abs, e.name)).isDirectory()) return `${e.name}/`;
          } catch {
            // 断开的链接按文件列
          }
        }
        return e.name;
      })
      .sort((a, b) => a.localeCompare(b));
    const start = Math.max(0, offset - 1);
    const sliced = items.slice(start, start + limit);
    const tail =
      start + sliced.length < items.length
        ? `\n(Showing ${sliced.length} of ${items.length} entries. Use 'offset' to read beyond entry ${offset + sliced.length})`
        : `\n(${items.length} entries)`;
    return text([`<path>${abs}</path>`, "<type>directory</type>", "<entries>", sliced.join("\n"), tail, "</entries>"].join("\n"));
  }

  if (READABLE_DOCUMENTS.has(path.extname(abs).toLowerCase()) && documentReader) {
    let page: DocumentPage;
    try {
      page = await documentReader(abs, offset, limit);
    } catch (err) {
      return errorReply(`Text extraction failed for ${rawPath}: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!page.ok) return errorReply(page.message ?? `No text could be extracted from ${rawPath} (${page.reason})`);
    let out = `<path>${abs}</path>\n<type>file</type>\n<content>\n`;
    out += page.lines.map((line, i) => `${page.offset + i}: ${line}`).join("\n");
    const last = page.offset + page.lines.length - 1;
    out += page.more
      ? `\n\n(Showing lines ${page.offset}-${last} of ${page.totalLines}. Use offset=${last + 1} to continue.)`
      : `\n\n(End of file - total ${page.totalLines} lines)`;
    out += "\n</content>";
    markFileRead(sessionId, abs);
    return text(out);
  }

  if (BINARY_EXTENSIONS.has(path.extname(abs).toLowerCase())) {
    return errorReply(
      `${rawPath} is a binary format this tool does not open (archives, office files other than .docx, executables and similar). For images, video or audio make sure the file has a proper media extension.`,
    );
  }
  if (isBinarySample(await readSample(abs))) return errorReply(`${rawPath} appears to be binary data, not text.`);

  const file = await readLines(abs, offset, limit);
  if (file.count < offset && !(file.count === 0 && offset === 1)) {
    return errorReply(`offset ${offset} is past the end: the file has ${file.count} lines`);
  }
  let out = `<path>${abs}</path>\n<type>file</type>\n<content>\n`;
  out += file.raw.map((line, i) => `${i + offset}: ${line}`).join("\n");
  const last = offset + file.raw.length - 1;
  if (file.cut) {
    out += `\n\n(Output capped at ${MAX_BYTES / 1024} KB. Showing lines ${offset}-${last}. Use offset=${last + 1} to continue.)`;
  } else if (file.more) {
    out += `\n\n(Showing lines ${offset}-${last} of ${file.count}. Use offset=${last + 1} to continue.)`;
  } else {
    out += `\n\n(End of file - total ${file.count} lines)`;
  }
  out += "\n</content>";
  markFileRead(sessionId, abs);
  return text(out);
}
