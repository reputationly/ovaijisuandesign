import { open } from "node:fs/promises";
import path from "node:path";

import { BadRequestException } from "@nestjs/common";
import { detectFileType, MEDIA_SUBDIRS } from "@ov/protocol";

/**
 * 把一段文字清洗成能当文件名的样子：非法字符换空格、连续空白压成一个、去掉开头的点、
 * 按码点截到 `max` 个字符。按码点截是为了不把一个中文或 emoji 从中间劈开。
 */
export function sanitizeFileName(seed: string, max = 12): string {
  let s = seed.replace(/[\\/:*?"<>|\x00-\x1f]/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/^\.+/, "").trim();
  return Array.from(s).slice(0, max).join("").trim();
}

/** URL 里的文件名最多保留多少个字符（去掉扩展名之后）。 */
export const URL_BASENAME_MAX_CHARS = 60;

/**
 * 导入 URL 时落到工作区的相对路径：`<按类型的子目录>/<清洗过的文件名>`。
 * URL 里拿不到文件名或扩展名时用 `download-<毫秒>` 补上缺的那部分。
 */
export function deriveImportTarget(url: string, now: Date = new Date()): string {
  let pathname = "";
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = "";
  }
  const raw = path.posix.basename(pathname.replace(/\/+$/, ""));
  const dot = raw.lastIndexOf(".");
  const hasExt = dot > 0 && dot < raw.length - 1;
  const rawStem = hasExt ? raw.slice(0, dot) : raw;
  const rawExt = hasExt ? raw.slice(dot) : "";
  let stem: string;
  try {
    stem = decodeURIComponent(rawStem);
  } catch {
    stem = rawStem;
  }
  const clean = sanitizeFileName(stem, URL_BASENAME_MAX_CHARS);
  const fallback = `download-${now.getTime()}`;
  const filename = `${clean || fallback}${hasExt ? rawExt.toLowerCase() : ""}` || fallback;
  return `${MEDIA_SUBDIRS[detectFileType(filename)]}/${filename}`;
}

/**
 * 上传的文件名：multer 按 latin1 解出来的名字还原成 utf8，再去掉路径分隔符、冒号、
 * NUL 和开头的点（不然一个 `.bashrc` 或 `../x` 就能变成隐藏文件或越界）。
 */
export function uploadFileName(original: string): string {
  const utf8 = Buffer.from(original, "latin1").toString("utf8");
  return utf8.replace(/[/\\:\0]/g, "_").replace(/^\.+/, "_");
}

/**
 * 独占写（`wx`）：目标已存在时依次试 `name(1).ext` … `name(1000).ext`，都不行再用
 * `name_<毫秒>.ext`。**绝不覆盖**已有文件 —— 覆盖会把上一份换掉，而引用它的画布
 * 节点看起来毫无变化。返回实际写入的绝对路径。
 */
export async function writeFileExclusive(abs: string, data: Uint8Array | string): Promise<string> {
  const dir = path.dirname(abs);
  const ext = path.extname(abs);
  const stem = path.basename(abs, ext);
  const candidates = [abs];
  for (let n = 1; n <= 1000; n++) candidates.push(path.join(dir, `${stem}(${n})${ext}`));
  candidates.push(path.join(dir, `${stem}_${Date.now()}${ext}`));
  for (const cand of candidates) {
    try {
      const fh = await open(cand, "wx");
      try {
        await fh.writeFile(data);
      } finally {
        await fh.close();
      }
      return cand;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
  }
  throw new Error(`同名文件太多: ${abs}`);
}

/** `unique` 写：重名时 `"<stem> 2<ext>"`、`"<stem> 3<ext>"`（中间是空格），最多到 100。 */
export async function writeUniqueSpaced(abs: string, content: string): Promise<string> {
  const ext = path.extname(abs);
  const stem = path.basename(abs, ext);
  const dir = path.dirname(abs);
  for (let n = 1; n <= 100; n++) {
    const cand = n === 1 ? abs : path.join(dir, `${stem} ${n}${ext}`);
    try {
      const fh = await open(cand, "wx");
      try {
        await fh.writeFile(content);
      } finally {
        await fh.close();
      }
      return cand;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
  }
  throw new BadRequestException(`Too many existing files for ${abs}`);
}
