// 参考素材上传（`POST /v1/ov/files`）。
//
// # 为什么不一律走 base64
//
// 参考视频可以有 100MB 以上，base64 之后是 133MB —— 直接顶到请求体上限，而多出来
// 那 33% 纯属浪费。超过阈值就先上传、拿签名 URL，任务提交时把这个 URL 放进
// metadata（平台的输入物化认识自家对象存储的 URL，不会出网重拉）。
//
// # 为什么不一律走上传
//
// 小图（几十 KB 的参考图、一张底图）上传一次要多一个来回 + 一次签名，比直接内联慢；
// 而平台对 data URI 的支持是完整的。所以阈值以下继续内联。
//
// # 上传失败怎么办
//
// **退回内联，不让请求失败。** 上传是优化，不是正确性的前提；平台没配对象存储时
// （`POST /v1/ov/files` 回 503 + `capability_unavailable`）尤其如此。只有内联也
// 装不下的那些大文件才会真的失败，而那时错误信息来自请求体上限，说得清。

import type { Client } from "./client.js";
import { type MediaConfig, ovUrl, platformBase } from "./config.js";
import { PlatformError } from "./error.js";
import { isObject } from "./text.js";

/**
 * 超过这个大小就先上传。8MB：常见参考图远小于它，而 100MB 级的参考视频一定超过。
 *
 * 取值的另一头是平台请求体上限（几 MB 到几十 MB 不等）。宁可低一点：多上传几次
 * 的代价是一个来回，踩上限的代价是整个任务提交不上去。
 */
export const UPLOAD_THRESHOLD_BYTES = 8 * 1024 * 1024;

/** 上传的超时。视频可能很大，给足。 */
const UPLOAD_TIMEOUT_MS = 300_000;

export interface UploadedReference {
  url: string;
  expiresAt?: string;
  bytes?: number;
}

/**
 * 上传一份素材，返回平台可下载的 URL。失败时抛 {@link PlatformError} ——
 * **要不要退回内联由调用方决定**，这里不替它吞掉原因。
 */
export async function uploadReference(
  client: Client,
  cfg: MediaConfig,
  bytes: Uint8Array,
  filename: string,
  contentType: string,
): Promise<UploadedReference> {
  const url = ovUrl(platformBase(cfg.platform), "/files");
  const form = new FormData();
  // Node 18+ 自带 Blob；用 Uint8Array 兜一层，免得 Buffer 的 slice 语义带进 multipart。
  form.append("file", new Blob([new Uint8Array(bytes)], { type: contentType || "application/octet-stream" }), filename);
  let response: Response;
  try {
    response = await client.fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${cfg.platform.api_key}` },
      body: form,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
  } catch (error) {
    throw PlatformError.fromFetch(error, url, "send");
  }
  const raw = await response.text();
  if (!response.ok) throw PlatformError.fromBody(response.status, raw);
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw PlatformError.protocol(`上传响应不是 JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isObject(payload) || typeof payload.url !== "string" || payload.url === "") {
    throw PlatformError.protocol("上传响应里没有可下载的 URL");
  }
  return {
    url: payload.url,
    ...(typeof payload.expires_at === "string" ? { expiresAt: payload.expires_at } : {}),
    ...(typeof payload.bytes === "number" ? { bytes: payload.bytes } : {}),
  };
}

/** 这个 URL 是不是我们自己上传换来的（用来判断"已经在平台上"）。 */
export function isUploadedUrl(value: string): boolean {
  return /^https?:\/\//.test(value);
}
