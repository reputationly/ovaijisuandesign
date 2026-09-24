import { randomUUID } from "node:crypto";
import { open, realpath } from "node:fs/promises";
import path from "node:path";

import { dedupCandidate, sanitizeFilename } from "../generate/media-download.js";

export type OutputKind = "video" | "audio" | "image";

const DEFAULT_EXT: Record<OutputKind, string> = { video: ".mp4", audio: ".mp3", image: ".png" };
const MAX_DEDUP_SUFFIX = 1000;

/**
 * 分配一个不重名的输出路径并**先占住**（独占创建一个空文件），返回绝对路径。
 *
 * 只挑名字不占位的话，两个并发的编辑任务会挑中同一个 `name.mp4`，后跑完的把先跑完的覆盖掉；
 * 占位后 ffmpeg 用 `-y` 覆盖这个空文件即可。失败时调用方负责删掉它。
 */
export async function reserveOutputPath(dir: string, kind: OutputKind, filename?: string, extOverride?: string): Promise<string> {
  const ext = extOverride && /^\.[a-z0-9]+$/.test(extOverride) ? extOverride : DEFAULT_EXT[kind];
  // 调用方常把扩展名写进 filename（`clip.mp4`），去掉免得出现 `clip.mp4.mp4`。
  const base = (filename ? sanitizeFilename(filename.replace(/\.[a-z0-9]{2,5}$/i, "")) : "") || randomUUID().slice(0, 12);
  for (let n = 0; n <= MAX_DEDUP_SUFFIX; n++) {
    const candidate = dedupCandidate(dir, base, ext, n);
    try {
      await (await open(candidate, "wx")).close();
      return candidate;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
  }
  const fallback = path.join(dir, `${base}_${randomUUID().slice(0, 12)}${ext}`);
  await (await open(fallback, "wx")).close();
  return fallback;
}

/**
 * 把调用方给的路径（工作区相对路径，或工作区内的绝对路径）解析成绝对路径；落在工作区外返回 null。
 *
 * 比较的是 realpath：工作区里一个指向 `/etc` 的符号链接不能成为逃逸口。文件还不存在时
 * 退回按字面路径比较（交给后续的 ENOENT 报错）。
 */
export async function resolveInsideWorkspace(root: string, input: string): Promise<string | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const abs = path.resolve(root, trimmed);
  if (!isWithin(root, abs)) return null;
  const [realRoot, realAbs] = await Promise.all([realpath(root).catch(() => root), realpath(abs).catch(() => null)]);
  if (realAbs !== null && !isWithin(realRoot, realAbs)) return null;
  return abs;
}

function isWithin(root: string, abs: string): boolean {
  const rel = path.relative(root, abs);
  return rel === "" ? false : !rel.startsWith("..") && !path.isAbsolute(rel);
}

/** 绝对 / 相对路径 → 工作区内的 POSIX 相对路径（资产库的 path 列只存这种）；工作区外返回 null。 */
export function toWorkspaceRel(root: string, input: string): string | null {
  const abs = path.resolve(root, input);
  if (!isWithin(root, abs)) return null;
  return path.relative(root, abs).split(path.sep).join("/");
}
