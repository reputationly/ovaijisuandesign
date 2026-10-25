/**
 * 参考素材的送入方式（L-2）：小的内联，大的先上传换 URL。
 *
 * # 为什么在 gateway 这一层做
 *
 * `@ov/maas-media` 的加载函数对 `http(s)://` 是**原样透传**的，所以"上传换 URL"
 * 只需要在调用它之前把路径换掉 —— 不用改生成链路里的任何一行。放在这一层还避开了
 * 一个陷阱：`loadImageInputs` 会对相对路径读盘转 base64，一旦转完就再也拿不到原始
 * 文件大小，也就没法决定该不该上传。
 *
 * # 上传失败退回内联
 *
 * 上传是优化，不是正确性的前提。平台没配对象存储（503 `capability_unavailable`）、
 * 网络抖动、签名失败 —— 一律退回内联并把原因记进日志。只有内联也装不下的那类大文件
 * 才会真的失败，而那时错误来自请求体上限，用户看得出是怎么回事。
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { type Client, type MediaConfig, upload } from "@ov/maas-media";

export interface InputLoaderOptions {
  /** 超过这个字节数就上传。默认 {@link upload.UPLOAD_THRESHOLD_BYTES}。 */
  thresholdBytes?: number;
  /** 上传失败时记一条；默认不记（测试与离线路径）。 */
  onUploadFailure?: (file: string, error: unknown) => void;
}

/** 一次生成里所有素材的最大字节数 —— 与平台对象存储上限无关，是我们自己的护栏。 */
const MAX_REFERENCE_BYTES = 512 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  flac: "audio/flac",
};

function mimeOf(name: string): string {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

/** 这个路径需不需要处理：URL / data URI 已经是平台能吃的形态。 */
function isInlineable(raw: string): boolean {
  const value = raw.trim();
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:") || value === "";
}

/**
 * 把超过阈值的本地素材换成上传后的 URL，其余原样返回。
 *
 * 返回的数组与输入**一一对应**，调用方可以直接喂给 `loadImageInputs` /
 * `loadMediaInputs` —— 它们会把 URL 原样透传，把剩下的本地路径内联成 base64。
 */
export async function prepareInputs(
  client: Client,
  cfg: MediaConfig,
  root: string,
  paths: readonly string[],
  options: InputLoaderOptions = {},
): Promise<string[]> {
  const threshold = options.thresholdBytes ?? upload.UPLOAD_THRESHOLD_BYTES;
  if (!cfg.platform.api_key.trim()) return [...paths];
  const out: string[] = [];
  for (const raw of paths) {
    if (isInlineable(raw)) {
      out.push(raw);
      continue;
    }
    const absolute = path.isAbsolute(raw) ? raw : path.resolve(root, raw);
    let size: number;
    try {
      size = (await stat(absolute)).size;
    } catch {
      // 读不到就交给下游：`loadImageInputs` 会报一条说得清的错误（"读取素材失败 <路径>"），
      // 在这里提前失败只会让错误信息更模糊。
      out.push(raw);
      continue;
    }
    if (size <= threshold || size > MAX_REFERENCE_BYTES) {
      out.push(raw);
      continue;
    }
    try {
      const bytes = await readFile(absolute);
      const uploaded = await upload.uploadReference(client, cfg, bytes, path.basename(absolute), mimeOf(absolute));
      out.push(uploaded.url);
      client.logger.info("[input] uploaded large reference", {
        file: path.basename(absolute),
        bytes: size,
        expiresAt: uploaded.expiresAt,
      });
    } catch (error) {
      options.onUploadFailure?.(absolute, error);
      client.logger.warn("[input] upload failed, falling back to inline", {
        file: path.basename(absolute),
        bytes: size,
        error: error instanceof Error ? error.message : String(error),
      });
      out.push(raw);
    }
  }
  return out;
}
