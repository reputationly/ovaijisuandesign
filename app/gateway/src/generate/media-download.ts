import { randomUUID } from "node:crypto";
import { link, mkdir, open, rename, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * 把生成结果（公网 URL 或 data URI）落进目录，返回最终的绝对路径。
 *
 * 先写进同目录下的临时文件，再用硬链接发布成最终文件名：链接在目标已存在时原子地失败，
 * 两个并发任务抢同一个名字不会互相覆盖，失败的一方换 `_1`、`_2` 再试。
 */
export async function downloadMediaToDir(source: string, dir: string, filename?: string, timeoutMs = DOWNLOAD_TIMEOUT_MS): Promise<string> {
  await mkdir(dir, { recursive: true });
  const { bytes, mime, urlPath } = await fetchBytes(source, timeoutMs);
  const ext = extensionFor(mime, urlPath, bytes);
  const base = (filename ? sanitizeFilename(stripKnownExt(filename)) : "") || randomUUID().slice(0, FILENAME_ID_LENGTH);
  const staged = path.join(dir, `.staged-${randomUUID()}${ext}`);
  await writeFile(staged, bytes);
  try {
    return await publishUnique(staged, dir, base, ext);
  } finally {
    await rm(staged, { force: true });
  }
}

export const DOWNLOAD_TIMEOUT_MS = 10 * 60_000;
const FILENAME_ID_LENGTH = 12;
const MAX_FILENAME_LENGTH = 60;
const MAX_DEDUP_SUFFIX = 1000;

/** 文件名清洗：去掉路径和保留字符，空白折成 `-`，最长 60。 */
export function sanitizeFilename(name: string): string {
  let s = name
    .replace(/[/\\:*?"<>|\0]/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length > MAX_FILENAME_LENGTH) s = s.slice(0, MAX_FILENAME_LENGTH).replace(/-+$/, "");
  return s;
}

/** 调用方常把扩展名写进 filename（`cat.png`）。扩展名以实际内容为准，名字里那个去掉，免得出现 `cat.png.jpg`。 */
function stripKnownExt(name: string): string {
  return name.replace(/\.(png|jpe?g|webp|gif|bmp|mp4|mov|webm|mkv|mp3|wav|m4a|aac|flac|ogg|opus)$/i, "");
}

export function dedupCandidate(dir: string, base: string, ext: string, n: number): string {
  return path.join(dir, n === 0 ? `${base}${ext}` : `${base}_${n}${ext}`);
}

async function publishUnique(staged: string, dir: string, base: string, ext: string): Promise<string> {
  for (let n = 0; n <= MAX_DEDUP_SUFFIX; n++) {
    const candidate = dedupCandidate(dir, base, ext, n);
    try {
      await link(staged, candidate);
      return candidate;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EEXIST") continue;
      // 文件系统不支持硬链接（部分网络盘 / FAT）：退回独占创建 + rename。
      return publishByExclusiveCreate(staged, dir, base, ext);
    }
  }
  const fallback = path.join(dir, `${base}_${randomUUID().slice(0, FILENAME_ID_LENGTH)}${ext}`);
  await link(staged, fallback);
  return fallback;
}

async function publishByExclusiveCreate(staged: string, dir: string, base: string, ext: string): Promise<string> {
  for (let n = 0; n <= MAX_DEDUP_SUFFIX; n++) {
    const candidate = dedupCandidate(dir, base, ext, n);
    try {
      const fh = await open(candidate, "wx");
      await fh.close();
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") continue;
      throw err;
    }
    try {
      await rename(staged, candidate);
      return candidate;
    } catch (err) {
      await unlink(candidate).catch(() => undefined);
      throw err;
    }
  }
  throw new Error(`no free filename for ${base}${ext}`);
}

async function fetchBytes(source: string, timeoutMs: number): Promise<{ bytes: Buffer; mime: string; urlPath: string }> {
  if (source.startsWith("data:")) {
    const m = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(source);
    if (!m) throw new Error("malformed data URI");
    const bytes = m[2] ? Buffer.from(m[3]!, "base64") : Buffer.from(decodeURIComponent(m[3]!));
    return { bytes, mime: m[1] ?? "", urlPath: "" };
  }
  let resp: Response;
  try {
    resp = await fetch(source, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const cause = (err as { cause?: { message?: string } }).cause?.message;
    throw new Error(`Download failed (${(err as Error).message}${cause ? `: ${cause}` : ""}): ${source}`);
  }
  if (!resp.ok) throw new Error(`Download failed (${resp.status}): ${source}`);
  const bytes = Buffer.from(await resp.arrayBuffer());
  const declared = Number(resp.headers.get("content-length"));
  // 声明了长度却没收齐：半截文件能被登记成资产、在画布上显示成一张坏图，宁可报错。
  if (Number.isFinite(declared) && declared > 0 && !resp.headers.get("content-encoding") && bytes.length !== declared) {
    throw new Error(`Truncated download: got ${bytes.length}B, Content-Length declared ${declared}B: ${source}`);
  }
  let urlPath = "";
  try {
    urlPath = new URL(source).pathname;
  } catch {
    urlPath = "";
  }
  return { bytes, mime: (resp.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase(), urlPath };
}

const EXT_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/wave": ".wav",
  "audio/flac": ".flac",
  "audio/x-flac": ".flac",
  "audio/mp4": ".m4a",
  "audio/aac": ".aac",
  "audio/ogg": ".ogg",
};

/**
 * 扩展名：先看内容（魔数），再看 Content-Type，最后看 URL。对象存储经常一律回
 * `application/octet-stream`，URL 也可能是不带扩展名的签名地址，只有字节是可信的。
 */
export function extensionFor(mime: string, urlPath: string, bytes: Uint8Array): string {
  const sniffed = sniff(bytes);
  if (sniffed) return sniffed;
  if (EXT_BY_MIME[mime]) return EXT_BY_MIME[mime]!;
  const fromUrl = path.extname(urlPath).toLowerCase();
  if (/^\.[a-z0-9]{2,5}$/.test(fromUrl)) return fromUrl === ".jpeg" ? ".jpg" : fromUrl;
  return ".bin";
}

function sniff(b: Uint8Array): string | undefined {
  const ascii = (from: number, len: number) => String.fromCharCode(...b.subarray(from, from + len));
  if (b.length >= 8 && b[0] === 0x89 && ascii(1, 3) === "PNG") return ".png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return ".jpg";
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return ".webp";
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE") return ".wav";
  if (b.length >= 6 && ascii(0, 3) === "GIF") return ".gif";
  if (b.length >= 4 && ascii(0, 4) === "fLaC") return ".flac";
  if (b.length >= 4 && ascii(0, 4) === "OggS") return ".ogg";
  if (b.length >= 3 && ascii(0, 3) === "ID3") return ".mp3";
  if (b.length >= 2 && b[0] === 0xff && (b[1]! & 0xe0) === 0xe0) return ".mp3";
  if (b.length >= 12 && ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (brand.startsWith("M4A")) return ".m4a";
    if (brand === "qt  ") return ".mov";
    return ".mp4";
  }
  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return ".webm";
  return undefined;
}
