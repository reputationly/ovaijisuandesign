import type { ReleaseRegion } from "../env.js";
import { probeOneMedia } from "../ffprobe.js";
import {
  putJsonList,
  fillDefaults,
  firstProblem,
  collectVendorParams,
  pickBool,
  pickEnum,
  pickInt,
  pickIntInRange,
  requireJsonArray,
  type Params,
} from "./capability-params.js";
import { referenceDurationError, referenceMediaTypeError, seedanceAudioFormatError } from "./media-validation.js";
import {
  BACKEND,
  resolveModelId,
  VIDEO_SUPPORTED_MODES,
  VIDEO_VENDOR_CONFIGS,
  WAN3_MODEL_IDS,
  WAN_RETIRED_MODEL_IDS,
  type VideoMode,
  type VideoVendor,
} from "./model-catalog.js";

/**
 * generate_video 的提交体构造。提交体形状（哪些进 image_paths、哪些以 JSON 数组串进 params、
 * image_mode / type 这类路由字段）是 gateway 的契约，逐 vendor 保持。
 * 提交前能判定的错误（模式不支持、必需素材缺失、素材类型 / 数量、逐模型的时长 / 比例 / 分辨率档位）
 * 都在这里拦下，免得白扣一次费；回话文字与 agent 知识卡片里写的一致。
 */

export interface VideoArgs {
  vendor: VideoVendor;
  mode: VideoMode;
  model_id?: string;
  prompt: string;
  filename: string;
  duration?: number;
  first_frame_image?: string;
  last_frame_image?: string;
  reference_image_paths?: string[];
  reference_video_urls?: string[];
  reference_audio_urls?: string[];
  audio_path?: string;
  video_url?: string;
  vendor_params?: Record<string, unknown>;
  order?: number;
}

export interface VideoBody {
  backend: string;
  model_id: string;
  prompt: string;
  filename: string;
  image_paths: string[];
  params: Params;
  source_tool: string;
}

type Built = { body: VideoBody; error?: undefined } | { body?: undefined; error: string };

const refCount = (a: VideoArgs) =>
  (a.reference_image_paths?.length ?? 0) + (a.reference_video_urls?.length ?? 0) + (a.reference_audio_urls?.length ?? 0);

function body(args: VideoArgs, backend: string, modelId: string, imagePaths: string[], params: Params): Built {
  return {
    body: {
      backend,
      model_id: modelId,
      prompt: args.prompt,
      filename: args.filename,
      image_paths: imagePaths,
      params,
      source_tool: `hub_generate_video:${args.vendor}:${args.mode}`,
    },
  };
}

/** 顶层 duration 并入 params，且锁定：vendor_params 里再给不同的值算冲突。 */
function merge(scope: string, args: VideoArgs, allowed: readonly string[]): { params?: Params; error?: string } {
  const base: Params = args.duration !== undefined ? { duration: String(args.duration) } : {};
  const merged = collectVendorParams(scope, base, args.vendor_params, allowed, Object.keys(base));
  return merged.error !== undefined ? { error: merged.error } : { params: merged.params };
}

function addReferences(params: Params, args: VideoArgs, videos = args.reference_video_urls): void {
  putJsonList(params, "reference_images", args.reference_image_paths);
  putJsonList(params, "reference_videos", videos);
  putJsonList(params, "reference_audios", args.reference_audio_urls);
}

/** kling 的 avatar / motion-control 走独立 backend 和固定内部模型。 */
export function videoRouteModel(vendor: VideoVendor, mode: VideoMode, override: string | undefined): { backend: string; modelId: string } {
  const c = VIDEO_VENDOR_CONFIGS[vendor];
  if (vendor === "kling" && (mode === "avatar" || mode === "motion-control")) {
    const route = mode === "avatar" ? "kling-avatar" : "kling-motion-control";
    const backend = mode === "avatar" ? BACKEND.klingAvatar : BACKEND.klingMotionControl;
    // 传了 omni 的 model_id 也回到路由模型；传了别的保留原值，下面报错
    return { backend, modelId: override === undefined || c.modelIds.includes(override) ? route : override };
  }
  return { backend: c.backend, modelId: override ?? c.defaultModel };
}

// ── H3 系列 ──

const H3 = "MiniMax-H3";
const H3_MAX = "MiniMax-H3-Max";
const H3_MAX_TURBO = "MiniMax-H3-Max-Turbo";
const H3_RATIOS = ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"];
const H3_MAX_RATIOS = ["adaptive", ...H3_RATIOS];

function buildH3(args: VideoArgs, region: ReleaseRegion): Built {
  const modelId = args.model_id ?? H3;
  if (modelId === H3_MAX || modelId === H3_MAX_TURBO) return buildH3Max(args, modelId);
  if (modelId !== H3) {
    return { error: `video vendor=MiniMax unsupported model_id=${modelId}. Supported values: ${H3}, ${H3_MAX}, ${H3_MAX_TURBO}.` };
  }
  const scope = `video model_id=${H3}`;
  const m = merge(scope, args, ["aspect_ratio", "resolution", "generate_audio", "prompt_expansion_mode"]);
  if (!m.params) return { error: m.error ?? "" };
  const params = m.params;
  delete params.prompt_expansion_mode; // 只对 Max 系列有意义
  const resolved = resolveModelId("video", VIDEO_VENDOR_CONFIGS.MiniMax, region, H3, scope);
  if (resolved.error !== undefined) return { error: resolved.error };
  fillDefaults(params, { duration: "5", resolution: "768P", generate_audio: "true" });
  const ratioOptions = H3_RATIOS.join(", ");
  const isFrame = args.mode === "i2v" || args.mode === "first-last-frame";
  if (isFrame) {
    if (params.aspect_ratio !== undefined && params.aspect_ratio !== "" && params.aspect_ratio !== "adaptive") {
      return {
        error: `${scope} mode=${args.mode} uses the source frame ratio and does not accept a fixed vendor_params.aspect_ratio=${params.aspect_ratio}. Omit vendor_params.aspect_ratio; the request will use an adaptive aspect ratio.`,
      };
    }
    params.aspect_ratio = "adaptive";
  } else {
    if (params.aspect_ratio === undefined || params.aspect_ratio === "") {
      return { error: `${scope} requires vendor_params.aspect_ratio. The adaptive aspect ratio is disabled for MiniMax-H3 generation; pass one of: ${ratioOptions}.` };
    }
    if (params.aspect_ratio === "adaptive") {
      return { error: `${scope} vendor_params.aspect_ratio=adaptive is disabled for MiniMax-H3 generation. Pass one of: ${ratioOptions}.` };
    }
  }
  const paramError = firstProblem(
    pickIntInRange(scope, params, "duration", 4, 15),
    isFrame ? undefined : pickEnum(scope, params, "aspect_ratio", H3_RATIOS),
    pickEnum(scope, params, "resolution", ["768P", "2K"]),
    pickBool(scope, params, "generate_audio"),
  );
  if (paramError) return { error: paramError };

  const backend = BACKEND.h3Video;
  if (args.mode === "t2v") {
    // params.image_mode 是网关 videoPlan() 的玩法提示：这里必须如实写 t2v。
    // 之前错写成 "reference"，网关会把纯文字的文生视频判成参考生视频（r2va）、
    // 路由到参考族模型（minimax-h3-ref-2k → ref2va 通道），没带参考图直接被平台拒：
    //   「模型 minimax-h3-ref2va 的任务类型 r2va 需要至少 1 张参考图」
    // 实测（2026-10-02，直连平台 /v1/videos）：h3-2k 聚合对 task_type=t2v 正常接单，
    // 路由到 fl2va 通道 —— 文生视频本来就走帧族，跟参考族无关。
    params.image_mode = "text-to-video";
    return body(args, backend, H3, [], params);
  }
  if (isFrame) {
    if (!args.first_frame_image) return { error: `MiniMax-H3 ${args.mode} requires \`first_frame_image\`.` };
    if (args.mode === "first-last-frame" && !args.last_frame_image) return { error: "MiniMax-H3 first-last-frame requires `last_frame_image`." };
    if (refCount(args) > 0) {
      return { error: `MiniMax-H3 ${args.mode} cannot mix first/last frames with reference media. Use mode=multimodal for references.` };
    }
    params.image_mode = "first-last-frame";
    return body(args, backend, H3, [args.first_frame_image, ...(args.last_frame_image ? [args.last_frame_image] : [])], params);
  }
  if (refCount(args) === 0) {
    return { error: "MiniMax-H3 multimodal requires at least one reference image, video, or audio. Use mode=t2v for text-only generation." };
  }
  const typeError = referenceMediaTypeError(args);
  if (typeError) return { error: typeError };
  params.image_mode = "reference";
  addReferences(params, args);
  return body(args, backend, H3, [], params);
}

function buildH3Max(args: VideoArgs, modelId: string): Built {
  const scope = `video model_id=${modelId}`;
  const multimodal = args.mode === "multimodal";
  const supportsMultimodal = modelId === H3_MAX;
  if (args.mode !== "t2v" && args.mode !== "first-last-frame" && !(multimodal && supportsMultimodal)) {
    return {
      error: `${scope} does not support mode=${args.mode}. Supported modes: ` + (supportsMultimodal ? "t2v, first-last-frame, multimodal." : "t2v, first-last-frame."),
    };
  }
  if (!args.prompt.trim()) return { error: `${scope} requires a non-empty prompt.` };
  if ((refCount(args) > 0 || args.audio_path || args.video_url) && !multimodal) {
    return { error: `${scope} mode=${args.mode} does not support reference media, audio_path, or video_url.` };
  }
  const hasFirst = Boolean(args.first_frame_image);
  const hasLast = Boolean(args.last_frame_image);
  if (args.mode === "t2v" && (hasFirst || hasLast)) {
    return { error: `${scope} mode=t2v is text-only. Remove first_frame_image/last_frame_image or use mode=first-last-frame.` };
  }
  if (args.mode === "first-last-frame" && !hasFirst) {
    return { error: `${scope} mode=first-last-frame requires \`first_frame_image\`; \`last_frame_image\` is optional.` };
  }
  if (multimodal && (hasFirst || hasLast || args.audio_path || args.video_url)) {
    return { error: `${scope} mode=multimodal accepts only reference_image_paths, reference_video_urls, and reference_audio_urls.` };
  }
  if (multimodal) {
    const images = args.reference_image_paths?.length ?? 0;
    const videos = args.reference_video_urls?.length ?? 0;
    const audios = args.reference_audio_urls?.length ?? 0;
    if (images + videos === 0) {
      return { error: `${scope} mode=multimodal requires at least one reference image or video; audio-only input is not supported.` };
    }
    if (images > 9 || videos > 3 || audios > 3 || videos + audios > 3) {
      return { error: `${scope} mode=multimodal supports at most 9 images, 3 videos, 3 audios, and 3 videos/audios combined.` };
    }
    const typeError = referenceMediaTypeError(args);
    if (typeError) return { error: typeError };
  }
  const m = merge(scope, args, ["aspect_ratio", "resolution", "prompt_expansion_mode"]);
  if (!m.params) return { error: m.error ?? "" };
  const params = m.params;
  fillDefaults(params, { duration: "5", resolution: "480P", prompt_expansion_mode: "disabled" });
  const isFrame = args.mode === "first-last-frame";
  const ratios = multimodal ? H3_MAX_RATIOS : H3_RATIOS;
  if (isFrame) {
    if (params.aspect_ratio !== undefined && params.aspect_ratio !== "" && params.aspect_ratio !== "adaptive") {
      return {
        error: `${scope} mode=first-last-frame inherits the supplied frame ratio and does not accept vendor_params.aspect_ratio=${params.aspect_ratio}. Omit vendor_params.aspect_ratio.`,
      };
    }
    params.aspect_ratio = "adaptive";
  } else {
    if (params.aspect_ratio === undefined || params.aspect_ratio === "") {
      if (!multimodal) return { error: `${scope} mode=t2v requires vendor_params.aspect_ratio. Pass one of: ${ratios.join(", ")}.` };
      params.aspect_ratio = "adaptive";
    }
    if (!multimodal && params.aspect_ratio === "adaptive") {
      return { error: `${scope} mode=t2v does not support aspect_ratio=adaptive. Pass one of: ${ratios.join(", ")}.` };
    }
  }
  const paramError = firstProblem(
    pickIntInRange(scope, params, "duration", 5, 15),
    isFrame ? undefined : pickEnum(scope, params, "aspect_ratio", ratios),
    pickEnum(scope, params, "resolution", ["480P", "768P"]),
    pickEnum(scope, params, "prompt_expansion_mode", ["disabled", "balanced", "quality"]),
  );
  if (paramError) return { error: paramError };
  params.image_mode = isFrame ? "first-last-frame" : multimodal ? "reference" : "text-to-video";
  if (multimodal) addReferences(params, args);
  const imagePaths = isFrame ? [args.first_frame_image ?? "", ...(args.last_frame_image ? [args.last_frame_image] : [])] : [];
  return body(args, BACKEND.h3Video, modelId, imagePaths, params);
}

// ── seedance ──

const SEEDANCE_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];
const SEEDANCE_RESOLUTIONS = ["480p", "720p", "1080p", "4k"];

function seedanceParamError(scope: string, params: Params, inherited: { aspectRatio: boolean; duration: boolean }): string | undefined {
  const is25 = params.model_name === "seedance2.5";
  const ratioOptions = SEEDANCE_RATIOS.join(", ");
  if (!inherited.aspectRatio && (params.aspect_ratio === undefined || params.aspect_ratio === "")) {
    return `${scope} requires vendor_params.aspect_ratio. The adaptive aspect ratio is disabled for Seedance generation; pass one of: ${ratioOptions}.`;
  }
  if (!inherited.aspectRatio && params.aspect_ratio === "adaptive") {
    return `${scope} vendor_params.aspect_ratio=adaptive is disabled for Seedance generation. Pass one of: ${ratioOptions}.`;
  }
  const e = firstProblem(
    inherited.duration ? undefined : pickIntInRange(scope, params, "duration", 4, is25 ? 30 : 15),
    inherited.aspectRatio ? undefined : pickEnum(scope, params, "aspect_ratio", SEEDANCE_RATIOS),
    pickEnum(scope, params, "resolution", SEEDANCE_RESOLUTIONS),
    pickBool(scope, params, "generate_audio"),
    pickEnum(scope, params, "output_format", ["mp4", "mov"]),
  );
  if (e) return e;
  if (!is25 && params.output_format !== undefined) return `${scope} output_format is only supported by seedance2.5.`;
  if (is25 && params.resolution !== undefined && !["480p", "720p", "1080p"].includes(params.resolution)) {
    return `${scope} seedance2.5 supports resolution=480p/720p/1080p only.`;
  }
  if ((params.model_name === "seedance2.0-fast" || params.model_name === "seedance2.0-mini") && (params.resolution === "1080p" || params.resolution === "4k")) {
    return `${scope} ${params.model_name} supports resolution=480p/720p only. Use seedance2.0 for 1080p/4k.`;
  }
  return undefined;
}

function seedanceReferenceCountError(modelId: string, args: VideoArgs): string | undefined {
  const limits = modelId === "seedance2.5" ? { image: 30, video: 10, audio: 10 } : { image: 9, video: 3, audio: 3 };
  const checks: [string, number, number][] = [
    ["reference_image_paths", args.reference_image_paths?.length ?? 0, limits.image],
    ["reference_video_urls", args.reference_video_urls?.length ?? 0, limits.video],
    ["reference_audio_urls", args.reference_audio_urls?.length ?? 0, limits.audio],
  ];
  for (const [field, actual, max] of checks) {
    if (actual > max) return `video vendor=seedance ${field} accepts at most ${max} items.`;
  }
  return undefined;
}

/** seedance2.5 对参考音视频的时长有上下限；本地文件先探一遍，远程的交给上游。 */
async function seedance25DurationError(modelId: string, args: VideoArgs): Promise<string | undefined> {
  if (modelId !== "seedance2.5") return undefined;
  const isLocal = (p: string) => !/^(https?:\/\/|asset:\/\/|data:)/i.test(p);
  const common = { minDurationSec: 2, maxDurationSec: 30, totalMaxDurationSec: 30 };
  const kinds: ["video" | "audio", string[], typeof common][] = [
    ["video", args.reference_video_urls ?? [], args.mode === "video-edit" ? { ...common, minDurationSec: 4 } : common],
    ["audio", args.reference_audio_urls ?? [], common],
  ];
  for (const [kind, paths, limits] of kinds) {
    const probes = await Promise.all(paths.filter(isLocal).map((p) => probeOneMedia(p)));
    const e = referenceDurationError(kind, probes.map((p) => ({ path: p.file_path, durationSec: p.duration_sec })), limits);
    if (e) return e;
  }
  return undefined;
}

async function buildSeedance(args: VideoArgs, rawModelId: string, region: ReleaseRegion): Promise<Built> {
  const scope = "video vendor=seedance";
  const m = merge(scope, args, ["aspect_ratio", "resolution", "generate_audio", "output_format"]);
  if (!m.params) return { error: m.error ?? "" };
  const params = m.params;
  const resolved = resolveModelId("video", VIDEO_VENDOR_CONFIGS.seedance, region, rawModelId, scope);
  if (resolved.error !== undefined) return { error: resolved.error };
  const modelId = resolved.modelId;
  const is25 = modelId === "seedance2.5";
  const edit25 = is25 && args.mode === "video-edit";
  const extend25 = is25 && args.mode === "video-extend";
  const frame25 = is25 && (args.mode === "i2v" || args.mode === "first-last-frame");
  const inheritsRatio = edit25 || extend25 || frame25;
  fillDefaults(params, {
    model_name: modelId,
    ...(edit25 || extend25 ? { image_mode: args.mode } : {}),
    ...(edit25 ? {} : { duration: "5" }),
    resolution: "720p",
    generate_audio: "true",
  });
  if (inheritsRatio) params.aspect_ratio = "adaptive";
  if (edit25) delete params.duration; // 编辑沿用输入视频时长
  if (is25) fillDefaults(params, { output_format: "mp4" });
  const e =
    seedanceParamError(scope, params, { aspectRatio: inheritsRatio, duration: edit25 }) ??
    seedanceReferenceCountError(modelId, args) ??
    (await seedance25DurationError(modelId, args));
  if (e) return { error: e };

  const backend = BACKEND.seedance;
  if (args.mode === "t2v") return body(args, backend, modelId, [], params);
  if (args.mode === "i2v" || args.mode === "first-last-frame") {
    if (!args.first_frame_image) return { error: `seedance ${args.mode} requires \`first_frame_image\`.` };
    if (args.mode === "first-last-frame" && !args.last_frame_image) return { error: "seedance first-last-frame requires `last_frame_image`." };
    if (refCount(args) > 0) {
      return { error: `seedance ${args.mode} cannot mix first/last frames with reference media. Use mode=multimodal for references.` };
    }
    return body(args, backend, modelId, [args.first_frame_image, ...(args.last_frame_image ? [args.last_frame_image] : [])], params);
  }
  if (args.mode === "video-edit" && (args.reference_video_urls?.length ?? 0) === 0) {
    return { error: "seedance video-edit requires at least one `reference_video_urls` item." };
  }
  const typeError = referenceMediaTypeError(args) ?? seedanceAudioFormatError(args.reference_audio_urls);
  if (typeError) return { error: typeError };
  if (args.mode === "video-extend" && (args.reference_video_urls?.length ?? 0) === 0) {
    return { error: "seedance video-extend requires at least one `reference_video_urls`." };
  }
  if (args.mode === "multimodal" || args.mode === "video-edit" || args.mode === "video-extend") {
    addReferences(params, args);
    return body(args, backend, modelId, [], params);
  }
  return { error: `seedance does not support mode=${args.mode}.` };
}

// ── kling ──

const KLING_MODES = ["std", "pro"];
const KLING_KEEP_SOUND = ["yes", "no"];
const KLING_OMNI_DURATIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

function klingOmniParamError(scope: string, params: Params): string | undefined {
  const e = firstProblem(
    pickEnum(scope, params, "mode", ["std", "pro", "4k"]),
    pickEnum(scope, params, "aspect_ratio", ["16:9", "9:16", "1:1"]),
    pickInt(scope, params, "duration", KLING_OMNI_DURATIONS),
    pickEnum(scope, params, "sound", ["on", "off"]),
    pickBool(scope, params, "multi_shot"),
    requireJsonArray(scope, params, "image_types_json"),
    requireJsonArray(scope, params, "video_list_json"),
  );
  if (e) return e;
  const o1 = params.model_name === "kling-video-o1";
  if (o1 && params.sound === "on") return `${scope} model_id=kling-video-o1 does not support sound=on. Use model_id=kling-v3-omni or sound=off.`;
  if (o1 && params.multi_shot === "true") {
    return `${scope} model_id=kling-video-o1 does not support multi_shot=true. Use multi_shot=false or model_id=kling-v3-omni.`;
  }
  if (o1 && params.duration !== undefined && Number(params.duration) > 10) return `${scope} model_id=kling-video-o1 supports duration up to 10 seconds.`;
  if (params.mode === "4k" && params.model_name !== "kling-v3-omni") return `${scope} mode=4k requires model_id=kling-v3-omni.`;
  return undefined;
}

function klingVideoItems(raw: string | undefined): Record<string, unknown>[] | undefined {
  if (!raw) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return undefined;
    return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item));
  } catch {
    return undefined;
  }
}

function klingReferenceError(scope: string, args: VideoArgs, params: Params): string | undefined {
  const videos = klingVideoItems(params.video_list_json);
  const videoCount = videos?.length ?? 0;
  const imageCount = (args.first_frame_image ? 1 : 0) + (args.last_frame_image ? 1 : 0) + (args.reference_image_paths?.length ?? 0);
  if (videoCount > 1) return `${scope} accepts at most one reference video.`;
  const maxImages = videoCount > 0 ? 4 : 7;
  if (imageCount > maxImages) {
    return `${scope} accepts at most ${maxImages} reference images with ${videoCount > 0 ? "a" : "no"} reference video.`;
  }
  if (videoCount > 0 && params.sound === "on") return `${scope} video reference mode does not support sound=on. Use sound=off.`;
  if (videos?.some((item) => item.refer_type === "base") && params.multi_shot === "true") {
    return `${scope} base video reference mode does not support multi_shot=true.`;
  }
  return undefined;
}

function buildKling(args: VideoArgs, route: { backend: string; modelId: string }, region: ReleaseRegion): Built {
  if (args.mode === "avatar") {
    const scope = "video vendor=kling mode=avatar";
    if (!args.audio_path) return { error: "kling avatar requires `audio_path`." };
    if (!args.first_frame_image) return { error: "kling avatar requires `first_frame_image`." };
    if (route.modelId !== "kling-avatar") return { error: `${scope} uses a fixed internal model; omit model_id (got model_id=${route.modelId}).` };
    const m = collectVendorParams(scope, {}, args.vendor_params, ["mode"]);
    if (m.error !== undefined) return { error: m.error };
    fillDefaults(m.params, { mode: "std" });
    const e = pickEnum(scope, m.params, "mode", KLING_MODES);
    if (e) return { error: e };
    return body(args, route.backend, route.modelId, [args.first_frame_image], { ...m.params, type: "avatar", sound_file: args.audio_path });
  }
  if (args.audio_path) {
    return {
      error:
        "Kling `audio_path` is supported only with mode=avatar. vendor_params.sound=on generates native audio and does not use the supplied audio file. Generation aborted. Do NOT automatically switch models or modes; ask the user whether to use mode=avatar or remove audio_path.",
    };
  }
  if (args.mode === "motion-control") {
    const scope = "video vendor=kling mode=motion-control";
    if (!args.video_url) return { error: "kling motion-control requires `video_url`." };
    const image = args.first_frame_image ?? args.reference_image_paths?.[0];
    if (!image) return { error: "kling motion-control requires `first_frame_image` or `reference_image_paths[0]`." };
    if (route.modelId !== "kling-motion-control") return { error: `${scope} uses a fixed internal model; omit model_id (got model_id=${route.modelId}).` };
    const m = collectVendorParams(scope, {}, args.vendor_params, ["mode", "keep_original_sound", "character_orientation"]);
    if (m.error !== undefined) return { error: m.error };
    fillDefaults(m.params, { mode: "std", keep_original_sound: "yes", character_orientation: "video" });
    const e = firstProblem(
      pickEnum(scope, m.params, "mode", KLING_MODES),
      pickEnum(scope, m.params, "keep_original_sound", KLING_KEEP_SOUND),
      pickEnum(scope, m.params, "character_orientation", ["video", "image"]),
    );
    if (e) return { error: e };
    return body(args, route.backend, route.modelId, [image], { ...m.params, type: "motion_control", video_url: args.video_url });
  }
  if (args.mode === "i2v" && !args.first_frame_image) return { error: "kling i2v requires `first_frame_image`." };
  if (args.mode === "first-last-frame") {
    if (!args.first_frame_image) return { error: "kling first-last-frame requires `first_frame_image`." };
    if (!args.last_frame_image) return { error: "kling first-last-frame requires `last_frame_image`." };
  }

  const scope = `video vendor=kling mode=${args.mode}`;
  const m = merge(scope, args, ["mode", "aspect_ratio", "sound", "multi_shot", "image_types_json", "video_list_json", "video_refer_type", "keep_original_sound"]);
  if (!m.params) return { error: m.error ?? "" };
  const params = m.params;
  const resolved = resolveModelId("video", VIDEO_VENDOR_CONFIGS.kling, region, route.modelId, scope);
  if (resolved.error !== undefined) return { error: resolved.error };
  const modelId = resolved.modelId;
  fillDefaults(params, { model_name: modelId, mode: "pro", aspect_ratio: "16:9", duration: "5", sound: "off", multi_shot: "false" });
  const referError = firstProblem(
    params.video_refer_type ? pickEnum(scope, params, "video_refer_type", ["feature", "base"]) : undefined,
    params.keep_original_sound ? pickEnum(scope, params, "keep_original_sound", KLING_KEEP_SOUND) : undefined,
  );
  if (referError) return { error: referError };
  if (args.video_url) {
    if (params.video_list_json) return { error: `${scope} got both video_url and vendor_params.video_list_json. Use one video source path.` };
    if (params.sound === "on") return { error: `${scope} video_url reference mode does not support sound=on. Use sound=off.` };
    // 参考视频作为 video_list_json 的唯一项；refer_type 缺省 base（输出时长跟随源视频）
    params.video_list_json = JSON.stringify([
      { local_path: args.video_url, refer_type: params.video_refer_type ?? "base", keep_original_sound: params.keep_original_sound },
    ]);
  } else if (params.video_refer_type || params.keep_original_sound) {
    return { error: `${scope} vendor_params.video_refer_type/keep_original_sound require common field video_url.` };
  }
  delete params.video_refer_type;
  delete params.keep_original_sound;
  const paramError = klingOmniParamError(scope, params);
  if (paramError) return { error: paramError };
  const extras = Array.from({ length: args.reference_image_paths?.length ?? 0 }, () => "");
  if (!params.image_types_json) {
    if (args.mode === "i2v" && args.first_frame_image) params.image_types_json = JSON.stringify(["first_frame", ...extras]);
    else if (args.mode === "first-last-frame") params.image_types_json = JSON.stringify(["first_frame", "end_frame", ...extras]);
  }
  const referenceError = klingReferenceError(scope, args, params);
  if (referenceError) return { error: referenceError };
  const refs = [
    ...(args.first_frame_image ? [args.first_frame_image] : []),
    ...(args.last_frame_image ? [args.last_frame_image] : []),
    ...(args.reference_image_paths ?? []),
  ];
  return body(args, route.backend, modelId, refs, params);
}

// ── wan3 ──

const WAN3_MIN_DURATION = 2;
const WAN3_MAX_DURATION = 30;

function wanConflictError(scope: string, args: VideoArgs, params: Params): string | undefined {
  if (args.last_frame_image && !args.first_frame_image) {
    return `${scope} last_frame_image cannot be sent on its own; add first_frame_image or drop the tail frame.`;
  }
  if (!args.first_frame_image && !args.last_frame_image) return undefined;
  const conflicting = [
    (args.reference_image_paths?.length ?? 0) > 0 ? "`reference_image_paths`" : undefined,
    (args.reference_video_urls?.length ?? 0) > 0 ? "`reference_video_urls`" : undefined,
    (args.reference_audio_urls?.length ?? 0) > 0 ? "`reference_audio_urls`" : undefined,
    args.video_url ? "`video_url`" : undefined,
    params.file_url ? "`vendor_params.file_url`" : undefined,
  ].filter((f): f is string => f !== undefined);
  if (conflicting.length === 0) return undefined;
  return `${scope} cannot combine first_frame_image/last_frame_image with ${conflicting.join(", ")}. Wan 3.0 rejects that combination upstream. Keep the keyframes and drop the reference/source inputs, or drop the keyframes and use mode=multimodal.`;
}

function wanIntakeError(scope: string, args: VideoArgs, params: Params, videos: string[]): string | undefined {
  const refs = (args.reference_image_paths?.length ?? 0) + videos.length + (args.reference_audio_urls?.length ?? 0);
  const hasSource = Boolean(params.file_url);
  const hasMedia = Boolean(args.first_frame_image || args.last_frame_image) || refs > 0 || hasSource;
  if (!args.prompt?.trim() && !hasMedia) return `${scope} needs a prompt or at least one media input.`;
  switch (args.mode) {
    case "t2v":
      return hasMedia
        ? `${scope} mode=t2v is text-only. Use mode=i2v/first-last-frame for keyframes, or mode=multimodal for reference media (including a source video to edit or extend) and vendor_params.file_url.`
        : undefined;
    case "i2v":
      return args.first_frame_image
        ? undefined
        : `${scope} mode=i2v requires \`first_frame_image\`. Generic identity/style refs belong in mode=multimodal + \`reference_image_paths\`.`;
    case "first-last-frame":
      return args.first_frame_image ? undefined : `${scope} mode=first-last-frame requires \`first_frame_image\` (\`last_frame_image\` is optional).`;
    case "multimodal":
      return refs === 0 && !hasSource
        ? `${scope} mode=multimodal requires at least one of reference_image_paths / reference_video_urls / reference_audio_urls / vendor_params.file_url. Use mode=t2v for a prompt-only video.`
        : undefined;
    default:
      return `${scope} does not support mode=${args.mode}. Video editing and video extension both run through mode=multimodal with the source clip in \`reference_video_urls\` and the intent written into the prompt.`;
  }
}

function wanReferenceCountError(scope: string, args: VideoArgs, videos: string[]): string | undefined {
  const checks: [string, number, number][] = [
    ["reference_image_paths", args.reference_image_paths?.length ?? 0, 10],
    ["reference_video_urls", videos.length, 5],
    ["reference_audio_urls", args.reference_audio_urls?.length ?? 0, 5],
  ];
  for (const [field, actual, max] of checks) {
    if (actual > max) return `${scope} ${field} accepts at most ${max} items (got ${actual}).`;
  }
  return undefined;
}

function wanDurationError(scope: string, params: Params): string | undefined {
  const raw = params.duration;
  if (raw === undefined || raw === "") {
    return `${scope} requires an explicit duration (${WAN3_MIN_DURATION}..${WAN3_MAX_DURATION} seconds). wan bills per second, so it has no smart duration and no default. When continuing or editing a reference video, pass the intended output length.`;
  }
  return pickIntInRange(scope, params, "duration", WAN3_MIN_DURATION, WAN3_MAX_DURATION)
    ? `${scope} unsupported duration=${raw}. Supported values: ${WAN3_MIN_DURATION}..${WAN3_MAX_DURATION}.`
    : undefined;
}

function buildWan(args: VideoArgs, modelId: string): Built {
  const scope = `video vendor=wan model_id=${modelId}`;
  if (args.audio_path) {
    return {
      error: `${scope} does not accept \`audio_path\`. Wan takes driving and reference audio through \`reference_audio_urls\` (mode=multimodal). If the user needs lip-synced speech, wan cannot do it — ask before switching vendors.`,
    };
  }
  const m = merge(scope, args, ["resolution", "aspect_ratio", "generate_audio", "prompt_extend", "watermark", "seed", "file_url"]);
  if (!m.params) return { error: m.error ?? "" };
  const params = m.params;
  const conflict = wanConflictError(scope, args, params);
  if (conflict) return { error: conflict };
  const videos = [...new Set([...(args.video_url ? [args.video_url] : []), ...(args.reference_video_urls ?? [])].filter(Boolean))];
  const intake = firstProblem(wanIntakeError(scope, args, params, videos), wanReferenceCountError(scope, args, videos));
  if (intake) return { error: intake };
  const typeError = referenceMediaTypeError({ ...args, reference_video_urls: videos });
  if (typeError) return { error: typeError };
  // 按秒计费：带参考视频时不给缺省时长，必须由 agent 明确输出长度
  fillDefaults(params, {
    ...(videos.length > 0 ? {} : { duration: "5" }),
    resolution: "720P",
    aspect_ratio: "adaptive",
    generate_audio: "true",
    prompt_extend: "true",
    watermark: "false",
  });
  const e = firstProblem(
    wanDurationError(scope, params),
    pickEnum(scope, params, "resolution", ["480P", "720P", "1080P"]),
    pickEnum(scope, params, "aspect_ratio", ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"]),
    pickBool(scope, params, "generate_audio"),
    pickBool(scope, params, "prompt_extend"),
    pickBool(scope, params, "watermark"),
    pickIntInRange(scope, params, "seed", -1, 2147483647),
  );
  if (e) return { error: e };
  const imageMode = args.mode === "multimodal" ? "reference" : args.mode === "i2v" || args.mode === "first-last-frame" ? "first-last-frame" : undefined;
  if (imageMode) params.image_mode = imageMode;
  const imagePaths =
    imageMode === "first-last-frame"
      ? [args.first_frame_image, args.last_frame_image].filter((p): p is string => Boolean(p))
      : [...(args.reference_image_paths ?? [])];
  putJsonList(params, "reference_videos", videos);
  putJsonList(params, "reference_audios", args.reference_audio_urls);
  return body(args, BACKEND.wanI2v, modelId, imagePaths, params);
}

export async function buildVideoBody(args: VideoArgs, region: ReleaseRegion): Promise<Built> {
  const modes = VIDEO_SUPPORTED_MODES[args.vendor];
  if (!modes.includes(args.mode)) return { error: `${args.vendor} does not support mode=${args.mode}. Supported modes: ${modes.join(", ")}.` };
  const route = videoRouteModel(args.vendor, args.mode, args.model_id);
  const config = VIDEO_VENDOR_CONFIGS[args.vendor];
  const scope = `video vendor=${args.vendor}`;

  switch (args.vendor) {
    case "MiniMax":
      return buildH3(args, region);
    case "kling":
      return buildKling(args, route, region);
    case "seedance":
      return buildSeedance(args, route.modelId, region);
    case "wan": {
      if ((WAN_RETIRED_MODEL_IDS as readonly string[]).includes(route.modelId)) {
        return {
          error: `${scope} model_id=${route.modelId} is retired and can no longer be generated with. Use model_id=wan3.0-video, or model_id=wan3.0-video-prime for a faster draft. Wan 3.0 covers image-to-video through mode=i2v with \`first_frame_image\`, and takes reference audio through \`reference_audio_urls\` instead of \`audio_path\`.`,
        };
      }
      const r = resolveModelId("video", config, region, route.modelId, scope);
      if (r.error !== undefined) return { error: r.error };
      if (!(WAN3_MODEL_IDS as readonly string[]).includes(r.modelId)) return { error: `${scope} unsupported model_id=${r.modelId}. Supported values: ${WAN3_MODEL_IDS.join(", ")}.` };
      return buildWan(args, r.modelId);
    }
    case "veo3": {
      const m = merge(scope, args, ["aspect_ratio", "resolution"]);
      if (!m.params) return { error: m.error ?? "" };
      const params = m.params;
      const r = resolveModelId("video", config, region, route.modelId, scope);
      if (r.error !== undefined) return { error: r.error };
      fillDefaults(params, { model_name: r.modelId, duration: "8", aspect_ratio: "16:9", resolution: "720p" });
      const e = firstProblem(
        pickEnum(scope, params, "duration", ["8"]),
        pickEnum(scope, params, "aspect_ratio", ["9:16", "16:9"]),
        pickEnum(scope, params, "resolution", ["720p", "1080p"]),
      );
      if (e) return { error: e };
      const imagePaths: string[] = [];
      if (args.mode === "first-last-frame") {
        if (!args.first_frame_image) return { error: "veo3 first-last-frame mode requires `first_frame_image`." };
        if (!args.last_frame_image) return { error: "veo3 first-last-frame mode requires `last_frame_image`." };
        imagePaths.push(args.first_frame_image, args.last_frame_image);
      } else if (args.mode === "i2v") {
        if (!args.first_frame_image) return { error: "veo3 i2v requires `first_frame_image`." };
        imagePaths.push(args.first_frame_image);
      }
      return body(args, config.backend, r.modelId, imagePaths, params);
    }
    case "jimeng": {
      if (!args.video_url) return { error: "jimeng motion-control requires `video_url`." };
      const image = args.first_frame_image ?? args.reference_image_paths?.[0];
      if (!image) return { error: "jimeng motion-control requires `first_frame_image` or `reference_image_paths[0]`." };
      const r = resolveModelId("video", config, region, route.modelId, scope);
      if (r.error !== undefined) return { error: r.error };
      const m = collectVendorParams(scope, {}, args.vendor_params, []);
      if (m.error !== undefined) return { error: m.error };
      return body(args, config.backend, r.modelId, [image], { video_url: args.video_url });
    }
  }
}
