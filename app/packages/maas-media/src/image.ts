// 图片生成。平台侧这条是**同步**的，不是任务。

import { readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";

import { type Client, request } from "./client.js";
import { type MediaConfig, configModel, platformBase } from "./config.js";
import { PlatformError } from "./error.js";
import { Modality, route } from "./route.js";
import { asciiLower, asciiUpper, asU32, isObject, parseF64, roundHalfAway } from "./text.js";

/**
 * 出图本身就要几十秒，而且是同步接口，超时要给够。
 *
 * @internal
 */
export const TIMEOUT_MS = 300_000;

// ---------------------------------------------------------------------------
// 尺寸换算
// ---------------------------------------------------------------------------

/**
 * 把 `aspect_ratio` + `resolution` 档位翻成平台要的 `size`。
 *
 * 调用方给的常是 `"16:9"` 这样的比值加 `"1K"` / `"2K"` 档位，平台要的是
 * `"1024x1024"` 这种像素尺寸。按短边对齐档位、长边按比例推，再取整到 8 的
 * 倍数 —— 扩散模型基本都要求边长能被 8 整除。
 */
export function resolveSize(aspectRatio: string, resolution: string): string {
  let shortEdge: number;
  switch (asciiUpper(resolution.trim())) {
    case "2K":
      shortEdge = 1440;
      break;
    case "4K":
      shortEdge = 2160;
      break;
    // 空值和认不出的档位都按 1K：不填 resolution 很常见，
    // 这时候报错没有意义。
    default:
      shortEdge = 1024;
  }

  const ratio = parseRatio(aspectRatio) ?? 1.0;
  const [w, h] =
    ratio >= 1.0
      ? [asU32(roundHalfAway(shortEdge * ratio)), shortEdge]
      : [shortEdge, asU32(roundHalfAway(shortEdge / ratio))];
  return `${roundTo8(w)}x${roundTo8(h)}`;
}

function parseRatio(raw: string): number | null {
  const s = raw.trim();
  const at = s.indexOf(":");
  if (at < 0) return null;
  const w = parseF64(s.slice(0, at).trim());
  const h = parseF64(s.slice(at + 1).trim());
  if (w === null || h === null) return null;
  if (w <= 0.0 || h <= 0.0) return null;
  return w / h;
}

/** @internal */
export function roundTo8(v: number): number {
  return Math.floor((Math.max(v, 8) + 4) / 8) * 8;
}

// ---------------------------------------------------------------------------
// 输入素材
// ---------------------------------------------------------------------------

/**
 * 把一组素材路径变成平台能吃的输入。
 *
 * 平台**三种形态都接受**（http(s) URL / 裸 base64 / data URI），报错原文：
 * 「输入 image 既非 http(s) URL 也非合法 base64/data-uri」。所以已经是 URL
 * 或 data URI 的原样透传，只有相对路径需要读盘转码。
 *
 * `baseDir` 是相对路径的基准目录。
 */
export function loadImageInputs(baseDir: string, paths: readonly string[]): Promise<string[]> {
  return load(baseDir, paths, guessImageMime);
}

/** 同上，但按扩展名猜视频 / 音频的 MIME。 */
export function loadMediaInputs(baseDir: string, paths: readonly string[]): Promise<string[]> {
  return load(baseDir, paths, guessMediaMime);
}

async function load(
  baseDir: string,
  paths: readonly string[],
  mimeOf: (path: string) => string,
): Promise<string[]> {
  const out: string[] = [];
  for (const raw of paths) {
    const p = raw.trim();
    if (p === "") continue;
    if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:")) {
      out.push(p);
      continue;
    }
    // 和 Rust `Path::join` 一样：p 是绝对路径时直接用它。
    const abs = resolvePath(baseDir, p);
    // 静默跳过读不到的底图会让图生图**退化成文生图** —— 不报错，
    // 用户看到的是「重绘把整张图换了」。
    let bytes: Buffer;
    try {
      bytes = await readFile(abs);
    } catch (e) {
      throw PlatformError.io(`读取素材失败 ${abs}: ${e instanceof Error ? e.message : String(e)}`);
    }
    out.push(`data:${mimeOf(p)};base64,${bytes.toString("base64")}`);
  }
  return out;
}

function extOf(path: string): string {
  const parts = path.split(".");
  return asciiLower(parts[parts.length - 1] ?? "");
}

function guessImageMime(path: string): string {
  switch (extOf(path)) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "heic":
      return "image/heic";
    default:
      return "image/png";
  }
}

function guessMediaMime(path: string): string {
  switch (extOf(path)) {
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "m4a":
      return "audio/mp4";
    case "flac":
      return "audio/flac";
    default:
      return "application/octet-stream";
  }
}

// ---------------------------------------------------------------------------
// 出图
// ---------------------------------------------------------------------------

/**
 * 出一张图，返回**公网可下载的 URL**。
 *
 * `images` 非空走 `/images/edits`（图生图），否则走 `/images/generations`
 * （文生图）。两个都是同步接口，直接返回结果。
 *
 * `modelId`：调用方点名的模型，**用的是外部那套名字**
 * （`nano-banana` / `seedream_5_pro` …），不是我们平台上的。路由到我们平台上配的模型，
 * 见 `route.ts`。不传就走默认。
 */
export async function generate(
  client: Client,
  cfg: MediaConfig,
  prompt: string,
  images: readonly string[],
  aspectRatio: string,
  resolution: string,
  modelId?: string | null,
): Promise<string> {
  let path: string;
  let body: Record<string, unknown>;
  if (images.length === 0) {
    const model = route(cfg.models, modelId, Modality.Image)?.model;
    if (model === undefined) {
      throw PlatformError.config("models.image 未配置，这个能力不可用");
    }
    path = "/images/generations";
    body = {
      model,
      prompt,
      n: 1,
      size: resolveSize(aspectRatio, resolution),
    };
  } else {
    const model = route(cfg.models, modelId, Modality.ImageEdit)?.model;
    if (model === undefined) {
      throw PlatformError.config("models.image_edit 未配置，这个能力不可用");
    }
    path = "/images/edits";
    // 底图字段是 `image`（单张）或 `images`（多张），JSON 或
    // multipart 都行；`data:image/png;base64,` 前缀带不带都接受。
    body = {
      model,
      prompt,
      images: [...images],
    };
  }

  return postImages(client, cfg, path, body);
}

/**
 * 发一次同步出图请求，取回第一个可下载的 URL。
 *
 * 文生图 / 图生图 / 超分共用 —— 三者只有 path 和 body 不同，
 * 响应形状和错误处理完全一样。
 */
async function postImages(
  client: Client,
  cfg: MediaConfig,
  path: string,
  body: unknown,
): Promise<string> {
  const { status, ok, raw } = await request(client, {
    method: "POST",
    url: `${platformBase(cfg.platform)}${path}`,
    apiKey: cfg.platform.api_key,
    timeoutMs: TIMEOUT_MS,
    json: body,
  });
  if (!ok) {
    throw PlatformError.fromBody(status, raw);
  }

  const urls = parseImageResponse(raw);
  // 平台也可能只回 `b64_json`。调用方通常要的是一个能下载的地址，
  // 所以这里显式失败，而不是继续往下走。
  const url = urls.find((u) => u !== "");
  if (url === undefined) {
    throw PlatformError.protocol("平台响应里没有可下载的图片 URL");
  }
  return url;
}

/**
 * 解 `{"data":[{"url":"…"}]}`。
 *
 * 严格程度照 Rust 的 serde 结构体：`data` / `url` 缺了算空，但**类型不对**
 * （比如 `url: null`）是解析失败 —— 和 Rust 时期同一份响应给出同一个结论。
 */
function parseImageResponse(raw: string): string[] {
  const fail = (why: string) => PlatformError.protocol(`解析平台响应失败: ${why}`);
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch (e) {
    throw fail(e instanceof Error ? e.message : String(e));
  }
  if (!isObject(v)) throw fail("响应不是 JSON 对象");
  if (v.data === undefined) return [];
  if (!Array.isArray(v.data)) throw fail("data 不是数组");
  return v.data.map((item, i) => {
    if (!isObject(item)) throw fail(`data[${i}] 不是对象`);
    if (item.url === undefined) return "";
    if (typeof item.url !== "string") throw fail(`data[${i}].url 不是字符串`);
    return item.url;
  });
}

// ---------------------------------------------------------------------------
// 超分
// ---------------------------------------------------------------------------

/**
 * 超分档位能到的**长边**像素。界面上的档位文案（`canvas.superResolution.tier.*`）
 * 写的是「约 2048 / 3840 / 7680 像素长边」。
 *
 * **我们只做到 4K。** 实测 7680×4288 的请求回来是 3854×2152 ——
 * 平台**静默截断**，不报错。给一个永远兑现不了的 8K 档位，
 * 用户看到的是「选了 8K，出来的还是 4K」,而没有任何地方说明。
 */
function tierLongEdge(tier: string): number {
  switch (asciiUpper(tier.trim())) {
    case "4K":
      return 3840;
    // 空值和认不出的档位都按 2K —— 这是保守的那一档。
    default:
      return 2048;
  }
}

/**
 * 目标尺寸算出来最多这么多像素 —— 正好是 4K 的像素数。
 *
 * **平台按总像素封顶，不是按长边。** 实测（源图分别是 416×232 和 464×464）：
 *
 * ```text
 * 请求 3840×2144 = 8.23M → 3840×2144   精确兑现
 * 请求 2880×2880 = 8.29M → 2880×2880   精确兑现
 * 请求 3840×3840 = 14.7M → 2880×2880   截断
 * 请求 7680×4288 = 32.9M → 3854×2152   截断
 * ```
 *
 * 两次截断的结果都落在 8,294,400 像素上（= 3840×2160），比例保持不变 ——
 * 所以上限是这个数，而且**不报错**。
 *
 * 按长边封顶会放过方图：4K 方图 3840×3840 长边合规，像素数却是横图 4K 的
 * 1.8 倍，照样被截 —— 表现是「选了 4K，出来的尺寸对不上」。
 *
 * @internal
 */
export const MAX_PIXELS = 3840 * 2160;

/**
 * 把源图尺寸 + 档位翻成平台要的精确 `size`。
 *
 * ## 为什么必须按源图算，不能只传档位词
 *
 * 平台**不读 `metadata.resolution`** —— `gpustackplus` 那条同步 i2i 的路
 * 是按字段白名单转发的，`resolution` 在里面零命中。真正生效的是
 * `size` → `target_shape`。不传 `size` 的话引擎走 `sr_ratio` 的默认值
 * **2.0**,于是不管选 2K 还是 4K，出来的永远是源图的 2 倍 ——
 * 界面显示 4K 而实际是 2 倍，不报错。
 *
 * ## 返回 `null` = 这张图不该超分
 *
 * 源图已经比档位大时，按比例算出来的 `target_shape` 会**小于**源图,
 * 而引擎会老老实实照办 —— 用户点「高清」,得到一张更糊的图。
 * 这种情况下调用方应当报错，而不是发出请求。
 */
export function upscaleSize(width: number, height: number, tier: string): string | null {
  const long = Math.max(width, height);
  if (width === 0 || height === 0) {
    return null;
  }

  let scale = tierLongEdge(tier) / long;
  // 已经够大了：算出来会是缩小，不是放大。
  if (scale <= 1.0) {
    return null;
  }
  // 像素预算。**先按长边算，再按总量收** —— 方图在长边上合规、
  // 在总量上超标，只看长边会让 4K 方图落进静默截断区。
  const budget = Math.sqrt(MAX_PIXELS / (width * height));
  if (budget < scale) {
    scale = budget;
  }
  if (scale <= 1.0) {
    return null;
  }

  const w = roundTo8(asU32(roundHalfAway(width * scale)));
  const h = roundTo8(asU32(roundHalfAway(height * scale)));
  return `${w}x${h}`;
}

/**
 * 图片超分。返回**公网可下载的 URL**。
 *
 * 走同步的 `/images/edits`,和图生图是同一条接口 —— 但字段不一样：
 *
 * - 底图用**顶层 `image`**（单数）。放进 `metadata.image` 会被判
 *   「图片编辑(i2i)必须提供底图」。
 * - 尺寸用 `size`,平台换算成引擎的 `target_shape: [h, w]`。
 * - `prompt` 对超分没有意义，但平台要求非空（`ValidateBasicTaskRequest`）,
 *   空的直接 400。
 */
export async function upscale(
  client: Client,
  cfg: MediaConfig,
  source: string,
  size: string,
): Promise<string> {
  const model = configModel(cfg, (m) => m.image_upscale, "models.image_upscale");

  const body: Record<string, unknown> = {
    model,
    prompt: "upscale",
    image: source,
  };
  if (size.trim() !== "") {
    body.size = size;
  }

  return postImages(client, cfg, "/images/edits", body);
}
