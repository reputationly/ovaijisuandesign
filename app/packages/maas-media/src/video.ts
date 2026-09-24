// 视频与超分，以及所有异步任务共用的提交/轮询。
//
// 平台把视频、超分、语音、音乐**全部**挂在 `POST /v1/videos` 下，靠
// `metadata.task_type` 区分。所以 {@link submitAndPoll} 是这个包里
// 除图片之外所有能力的公共出口。

import { type Client, readText, request, send } from "./client.js";
import { type MediaConfig, configModel, platformBase } from "./config.js";
import { PlatformError } from "./error.js";
import { Modality, route } from "./route.js";
import { asciiUpper, asU32, eqIgnoreAsciiCase, isObject, parseF64, roundHalfAway } from "./text.js";

/** @internal */
export const SUBMIT_TIMEOUT_MS = 60_000;
/** @internal */
export const QUERY_TIMEOUT_MS = 30_000;
/**
 * 轮询上限。调用方对整条链路通常另有超时，这里只是兜底不要无限转。
 *
 * @internal
 */
export const POLL_MAX_WAIT_MS = 30 * 60_000;
/** @internal */
export const POLL_INTERVAL_MS = 5_000;

// ---------------------------------------------------------------------------
// 玩法
// ---------------------------------------------------------------------------

/**
 * 一次视频请求对应平台上的哪种玩法。
 *
 * 平台靠 `metadata.task_type` 区分，引擎侧再落到 `frame_indices`
 * （`[0]` / `[-1]` / `[0,-1]`）—— **模型名不决定玩法**，同一个 checkpoint
 * 四种都吃。
 */
export type VideoPlan =
  /** 纯文生视频。 */
  | "text_to_video"
  /** 给首帧。 */
  | "image_to_video"
  /** 给首尾帧。 */
  | "first_last_frame"
  /**
   * 只给尾帧，反推开头。
   *
   * 输入形态和 `image_to_video` 一样（都是一张图），只有语义相反 ——
   * **靠张数推不出来，必须由调用方显式区分**。当成 i2v 会让画面朝反方向
   * 发展，而且不报错。
   */
  | "last_frame"
  /** 参考图 / 参考视频生视频。 */
  | "reference";

export const VideoPlan = {
  TextToVideo: "text_to_video",
  ImageToVideo: "image_to_video",
  FirstLastFrame: "first_last_frame",
  LastFrame: "last_frame",
  Reference: "reference",

  taskType(plan: VideoPlan): string {
    switch (plan) {
      case "text_to_video":
        return "t2v";
      case "image_to_video":
        return "i2v";
      case "first_last_frame":
        return "flf2v";
      case "last_frame":
        return "l2va";
      case "reference":
        return "r2va";
    }
  },

  /** 这种玩法用哪个模型字段。参考族和首尾帧族是两个 checkpoint。 */
  usesRefModel(plan: VideoPlan): boolean {
    return plan === "reference";
  },
} as const;

/**
 * 一次视频生成的全部输入。
 *
 * 用一个对象而不是十来个位置参数：这些字段里有好几组含义相近、
 * 类型相同（`frames` / `refImages` 都是 `string[]`），位置传参放错了
 * 编译器不会拦，而平台只会安静地生成一个不对的结果。
 */
export interface VideoJob {
  plan: VideoPlan;
  prompt: string;
  /** 首帧、尾帧，按顺序。`plan` 决定用几张。 */
  frames: readonly string[];
  /** 参考素材。和首帧图是**不同的键**，混用会让平台的输入形态判定失准。 */
  refImages: readonly string[];
  refVideos: readonly string[];
  refAudios: readonly string[];
  duration: number | null;
  /** `"16:9"` 这样的比值；`adaptive` 或空表示跟随输入。 */
  aspectRatio: string;
  /** `768P` / `1080P` / `2K` 这样的档位。 */
  resolution: string;
  /** 要不要连音轨一起生成。`null` 表示不指定，交给平台默认。 */
  generateAudio: boolean | null;
  /** 调用方点名的模型，**外部那套名字**。路由到本机配置，见 `route.ts`。 */
  modelId: string | null;
}

export const VideoJob = {
  /** 只给提示词的最小任务，其余字段按需覆盖。 */
  textToVideo(prompt: string): VideoJob {
    return {
      plan: VideoPlan.TextToVideo,
      prompt,
      frames: [],
      refImages: [],
      refVideos: [],
      refAudios: [],
      duration: null,
      aspectRatio: "",
      resolution: "",
      generateAudio: null,
      modelId: null,
    };
  },
} as const;

// ---------------------------------------------------------------------------
// 尺寸
// ---------------------------------------------------------------------------

/**
 * 把 `resolution` + `aspect_ratio` 翻成平台的 `size`。
 *
 * `adaptive` 或空比值表示「跟随输入」——那种情况**不传 size**，让平台按
 * 输入图自己定。硬塞一个会把画面裁掉，而且不报错。
 */
export function resolveSize(aspectRatio: string, resolution: string): string | null {
  const ratio = aspectRatio.trim();
  if (ratio === "" || eqIgnoreAsciiCase(ratio, "adaptive")) {
    return null;
  }
  let shortEdge: number;
  switch (asciiUpper(resolution.trim())) {
    case "2K":
      shortEdge = 1440;
      break;
    // **"1K" 一定要在这儿。** 界面上给用户的选项就是 1K / 2K
    // （见 Generate.tsx 的 RESOLUTIONS），而它以前落进下面的兜底 ——
    // 用户选 1K，出来的是 768P，不报错，也没有任何地方说明为什么。
    case "1K":
      shortEdge = 1024;
      break;
    case "1080P":
      shortEdge = 1080;
      break;
    case "480P":
      shortEdge = 480;
      break;
    // 768P 是基准档，认不出的也按它算。
    default:
      shortEdge = 768;
  }
  const at = ratio.indexOf(":");
  if (at < 0) return null;
  const w = parseF64(ratio.slice(0, at).trim());
  const h = parseF64(ratio.slice(at + 1).trim());
  if (w === null || h === null) return null;
  if (w <= 0.0 || h <= 0.0) {
    return null;
  }
  // **算出来的尺寸必须严格约分回请求的比例。**
  //
  // 以前是"短边钉在档位、长边按比例算、各自取整到 8"——
  // 9:16 @1K 得到 1024x1824，而 1024:1824 约分是 **32:57**。平台会从
  // size 反推 aspect_ratio 再按模型的白名单校验：
  //
  //     MiniMax H3 aspect_ratio must be one of 21:9, 16:9, 4:3, 1:1,
  //     3:4, 9:16, got '32:57'
  //
  // 而且这个错**不在提交时报**,是平台内部转换时才报
  // （`platform.convert_request_failed`）—— 任务已经排上队了才失败。
  //
  // 办法是整体缩放比例本身：找一个倍数 k，让 (w*k, h*k) 的短边最接近
  // 档位。这样约分回去一定还是原比例。
  const [rw, rh] = reduce(asU32(roundHalfAway(w)), asU32(roundHalfAway(h)));
  const shortUnit = Math.max(Math.min(rw, rh), 1);
  // k 取 8 的倍数，保证两条边都是 8 的倍数 —— 编码器普遍要求这个，
  // 不是的话平台可能自己再调一次尺寸，又偏离比例。
  const k = Math.max(asU32(roundHalfAway(shortEdge / shortUnit / 8.0)), 1) * 8;
  return `${rw * k}x${rh * k}`;
}

/** 约分。`1024:1824` → `32:57`,`9:16` → `9:16`。 */
function reduce(a: number, b: number): [number, number] {
  const gcd = (x: number, y: number): number => (y === 0 ? Math.max(x, 1) : gcd(y, x % y));
  const g = gcd(Math.max(a, 1), Math.max(b, 1));
  return [Math.floor(a / g), Math.floor(b / g)];
}

// ---------------------------------------------------------------------------
// 提交体
// ---------------------------------------------------------------------------

/**
 * 组视频任务的提交体。
 *
 * 单独抽出来是为了能直接断言键的落位 —— 平台对参数校验比较松，
 * **越界或放错的字段不报错，只会安静生成一个不是你要的结果**。
 */
export function buildBody(cfg: MediaConfig, job: VideoJob): Record<string, unknown> {
  // 调用方点名的是**外部那套名字**（`MiniMax-Hailuo-2.3` …），路由到我们
  // 配的模型。不走路由的话 `modelId` 就是收下即丢，agent 以为自己选了模型
  // 而实际一直在用默认 —— 而且不报错。
  const [modality, field] = VideoPlan.usesRefModel(job.plan)
    ? [Modality.VideoRef, "models.video_ref"]
    : [Modality.Video, "models.video"];
  const model = route(cfg.models, job.modelId, modality)?.model;
  if (model === undefined) {
    throw PlatformError.config(`${field} 未配置，这个能力不可用`);
  }

  const metadata: Record<string, unknown> = {};
  metadata.task_type = VideoPlan.taskType(job.plan);
  if (job.generateAudio !== null && job.generateAudio !== undefined) {
    metadata.generate_audio = job.generateAudio;
  }

  const body: Record<string, unknown> = {};
  body.model = model;
  body.prompt = job.prompt;

  switch (job.plan) {
    case "image_to_video":
    case "last_frame": {
      // i2v 和 l2va 的输入形态一样（都是一张图），平台靠 task_type 区分
      // 语义。多传会被平台 400。
      const only = job.frames[0];
      if (only !== undefined) {
        body.image = only;
      }
      break;
    }
    case "first_last_frame":
      // flf2v 要求正好 [首帧, 尾帧]。
      body.images = [...job.frames];
      break;
    case "reference":
      if (job.refImages.length > 0) {
        metadata.src_ref_images = [...job.refImages];
      }
      if (job.refVideos.length > 0) {
        metadata.reference_videos = [...job.refVideos];
      }
      if (job.refAudios.length > 0) {
        metadata.reference_audios = [...job.refAudios];
      }
      break;
    case "text_to_video":
      break;
  }

  if (job.duration !== null && job.duration !== undefined) {
    body.duration = job.duration;
  }
  // **有输入图时不发比例。** 首尾帧/图生视频模式下，界面上那个参数是隐藏的
  // （`hiddenParamsByImageMode: { "first-last-frame": ["aspect_ratio"] }`），
  // 因为**比例由那张图决定**。
  //
  // 不挡的话：用户要 2.39:1，模型挑了最接近的 21:9，而首帧图是 16:9
  // （1664x928）—— 平台把 16:9 的画面塞进 21:9 的画框，出来的视频横向
  // 被拉开。实测过，视频确实是 1792x768（21:9），"技术上没错"而画面
  // 是变形的，全程不报错。
  //
  // 想换比例的正确做法是**先把首帧图按那个比例出一张**,再拿它生成视频。
  const frameDriven =
    (job.plan === "image_to_video" ||
      job.plan === "last_frame" ||
      job.plan === "first_last_frame") &&
    job.frames.length > 0;

  // **比例直接发，不让平台从 size 反推。**
  //
  // 平台会拿 size 反推 aspect_ratio 再按模型白名单校验，而反推要约分 ——
  // `1024x1824` 约分是 `32:57`,直接被 H3 拒掉：
  //
  //     MiniMax H3 aspect_ratio must be one of 21:9, 16:9, 4:3, 1:1,
  //     3:4, 9:16, got '32:57'
  //
  // 而且白名单里的 `21:9` 本身就不是最简分数（约分是 `7:3`）——
  // 也就是说**任何靠约分得到的结果都对不上它**。反推这条路走不通，
  // 把用户选的那个字符串原样给它。
  const ratio = frameDriven ? "" : job.aspectRatio.trim();
  if (ratio !== "" && !eqIgnoreAsciiCase(ratio, "adaptive")) {
    body.aspect_ratio = ratio;
  }
  const size = resolveSize(ratio, job.resolution);
  if (size !== null) {
    body.size = size;
  }
  body.metadata = metadata;
  return body;
}

// ---------------------------------------------------------------------------
// 提交与轮询
// ---------------------------------------------------------------------------

/**
 * 按 serde 的规矩取一个 `#[serde(default)] String` 字段：
 * 缺了是空串，**在但不是字符串**是解析失败。
 */
function serdeString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (v === undefined) return "";
  if (typeof v !== "string") throw new TypeError(`字段 ${key} 应当是字符串`);
  return v;
}

/** `{"task_id": "…"}` 或 `{"id": "…"}`。 */
function parseSubmit(raw: string): { task_id: string; id: string } {
  const v: unknown = JSON.parse(raw);
  if (!isObject(v)) throw new TypeError("响应不是 JSON 对象");
  return { task_id: serdeString(v, "task_id"), id: serdeString(v, "id") };
}

/** `{"status": "…", "metadata": {"url": "…"}}`。 */
function parseQuery(raw: string): { status: string; url: string } {
  const v: unknown = JSON.parse(raw);
  if (!isObject(v)) throw new TypeError("响应不是 JSON 对象");
  const status = serdeString(v, "status");
  let url = "";
  if (v.metadata !== undefined) {
    if (!isObject(v.metadata)) throw new TypeError("metadata 不是对象");
    url = serdeString(v.metadata, "url");
  }
  return { status, url };
}

/**
 * 提交到平台并轮询到终态，返回结果的公网 URL。
 *
 * 视频、超分、语音、音乐**共用这一个**：平台把它们都放在 `/v1/videos`
 * 这个异步任务入口下，提交与轮询的形状完全一样，只有 `metadata.task_type`
 * 不同。
 */
export async function submitAndPoll(
  client: Client,
  cfg: MediaConfig,
  body: unknown,
): Promise<string> {
  const base = platformBase(cfg.platform);

  const submittedResp = await request(client, {
    method: "POST",
    url: `${base}/videos`,
    apiKey: cfg.platform.api_key,
    timeoutMs: SUBMIT_TIMEOUT_MS,
    json: body,
  });
  if (!submittedResp.ok) {
    throw PlatformError.fromBody(submittedResp.status, submittedResp.raw);
  }
  let submitted: { task_id: string; id: string };
  try {
    submitted = parseSubmit(submittedResp.raw);
  } catch (e) {
    throw PlatformError.protocol(
      `解析提交响应失败: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  // 两个键名都见过，取先有的那个。
  const taskId = submitted.task_id === "" ? submitted.id : submitted.task_id;
  if (taskId === "") {
    throw PlatformError.protocol("平台提交响应里没有 task_id");
  }

  const started = client.now();
  for (;;) {
    await client.sleep(POLL_INTERVAL_MS);
    if (client.now() - started > POLL_MAX_WAIT_MS) {
      throw PlatformError.protocol("平台任务轮询超时");
    }

    const url = `${base}/videos/${taskId}`;
    let resp: Response;
    try {
      resp = await send(client, {
        method: "GET",
        url,
        apiKey: cfg.platform.api_key,
        timeoutMs: QUERY_TIMEOUT_MS,
      });
    } catch {
      // 单次网络抖动不当失败 —— 任务在平台侧还好好跑着。
      continue;
    }
    let raw = "";
    try {
      raw = await readText(resp, url);
    } catch {
      raw = "";
    }
    if (!resp.ok) {
      throw PlatformError.fromBody(resp.status, raw);
    }
    let query: { status: string; url: string };
    try {
      query = parseQuery(raw);
    } catch {
      continue;
    }
    switch (query.status) {
      case "completed":
      case "succeeded":
      case "success":
        if (query.url === "") {
          throw PlatformError.protocol("平台报告完成但没有结果 URL");
        }
        return query.url;
      case "failed":
      case "cancelled":
      case "canceled":
      case "error":
        throw PlatformError.fromBody(200, raw);
      // queued / in_progress / 其余未知状态都当进行中。
      default:
        break;
    }
  }
}

/** 生成一段视频，返回结果的公网 URL。 */
export async function generate(client: Client, cfg: MediaConfig, job: VideoJob): Promise<string> {
  return submitAndPoll(client, cfg, buildBody(cfg, job));
}

/**
 * 超分：把一段已有素材放大到目标分辨率。
 *
 * 源素材走 `metadata.video`，**不是** `src_ref_images` 那一组 ——
 * 「被加工的素材」和「参考素材」是两种语义，重载同一个键会让平台的
 * 输入形态判定失准。
 */
export async function upscale(
  client: Client,
  cfg: MediaConfig,
  source: string,
  resolution: string,
): Promise<string> {
  const model = configModel(cfg, (m) => m.video_upscale, "models.video_upscale");

  const metadata: Record<string, unknown> = {};
  metadata.task_type = "sr";
  metadata.video = source;
  // 目标分辨率按档位词传，平台按它决定放大倍率。
  if (resolution.trim() !== "") {
    metadata.resolution = resolution;
  }

  const body = {
    model,
    // sr 的提示词没有意义，但平台要求 prompt 非空
    // （ValidateBasicTaskRequest），空的直接 400。
    prompt: "upscale",
    metadata,
  };
  return submitAndPoll(client, cfg, body);
}
