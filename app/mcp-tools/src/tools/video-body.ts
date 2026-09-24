import type { ReleaseRegion } from "../env.js";
import { probeOneMedia } from "../ffprobe.js";
import {
  putJsonList,
  fillDefaults,
  firstProblem,
  collectVendorParams,
  pickBool,
  pickEnum,
  requireJsonArray,
  type Params,
} from "./capability-params.js";
import { referenceMediaTypeError } from "./media-validation.js";
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
 * image_mode / type 这类路由字段）是 gateway 的契约，逐 vendor 保持；
 * 逐模型的时长 / 分辨率档位只做缺省，不在这里裁决 —— 由 gateway 按平台模型能力判断。
 * 保留的校验只针对“提交了也一定错”的输入：模式不支持、必需素材缺失、素材类型错位、互斥组合。
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

function commonDuration(args: VideoArgs): Params {
  return args.duration !== undefined ? { duration: String(args.duration) } : {};
}

function merge(scope: string, args: VideoArgs, allowed: readonly string[]): { params?: Params; error?: string } {
  const base = commonDuration(args);
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

const H3_MAX_MODELS = new Set(["MiniMax-H3-Max", "MiniMax-H3-Max-Turbo"]);

function buildH3(args: VideoArgs, modelId: string): Built {
  const backend = BACKEND.h3Video;
  const scope = `video model_id=${modelId}`;
  const isFrame = args.mode === "i2v" || args.mode === "first-last-frame";

  if (H3_MAX_MODELS.has(modelId)) {
    const multimodal = args.mode === "multimodal";
    const allowed: VideoMode[] = modelId === "MiniMax-H3-Max" ? ["t2v", "first-last-frame", "multimodal"] : ["t2v", "first-last-frame"];
    if (!allowed.includes(args.mode)) return { error: `${scope} has no mode=${args.mode}; it offers ${allowed.join(", ")}.` };
    if (!args.prompt.trim()) return { error: `${scope} requires a non-empty prompt.` };
    if (!multimodal && (refCount(args) > 0 || args.audio_path || args.video_url)) {
      return { error: `${scope} mode=${args.mode} takes no reference_*, audio_path or video_url inputs.` };
    }
    if (args.mode === "t2v" && (args.first_frame_image || args.last_frame_image)) {
      return { error: `${scope} mode=t2v works from text alone; drop the frame images or switch to mode=first-last-frame.` };
    }
    if (args.mode === "first-last-frame" && !args.first_frame_image) {
      return { error: `${scope} mode=first-last-frame needs first_frame_image (the closing frame is optional).` };
    }
    if (multimodal) {
      if (args.first_frame_image || args.last_frame_image || args.audio_path || args.video_url) {
        return { error: `${scope} mode=multimodal takes its media only through the three reference_* lists; remove frames, audio_path and video_url.` };
      }
      if ((args.reference_image_paths?.length ?? 0) + (args.reference_video_urls?.length ?? 0) === 0) {
        return { error: `${scope} mode=multimodal needs an image or video reference; audio alone is not enough.` };
      }
      const typeError = referenceMediaTypeError(args);
      if (typeError) return { error: typeError };
    }
    const m = merge(scope, args, ["aspect_ratio", "resolution", "prompt_expansion_mode"]);
    if (!m.params) return { error: m.error ?? "" };
    const params = m.params;
    fillDefaults(params, { duration: "5", resolution: "480P", prompt_expansion_mode: "disabled" });
    if (args.mode === "first-last-frame") {
      if (params.aspect_ratio && params.aspect_ratio !== "adaptive") {
        return { error: `${scope} mode=first-last-frame takes its ratio from the frames; remove vendor_params.aspect_ratio=${params.aspect_ratio}.` };
      }
      params.aspect_ratio = "adaptive";
    } else if (!params.aspect_ratio) {
      if (!multimodal) return { error: `${scope} mode=t2v needs an explicit vendor_params.aspect_ratio.` };
      params.aspect_ratio = "adaptive";
    } else if (!multimodal && params.aspect_ratio === "adaptive") {
      return { error: `${scope} mode=t2v has nothing to adapt to; choose a fixed aspect_ratio instead of adaptive.` };
    }
    params.image_mode = args.mode === "first-last-frame" ? "first-last-frame" : multimodal ? "reference" : "text-to-video";
    if (multimodal) addReferences(params, args);
    const imagePaths = args.mode === "first-last-frame" ? [args.first_frame_image ?? "", ...(args.last_frame_image ? [args.last_frame_image] : [])] : [];
    return body(args, backend, modelId, imagePaths, params);
  }

  if (modelId !== "MiniMax-H3") {
    return { error: `${modelId} is not an H3 model; use one of MiniMax-H3, MiniMax-H3-Max, MiniMax-H3-Max-Turbo.` };
  }
  const m = merge(scope, args, ["aspect_ratio", "resolution", "generate_audio", "prompt_expansion_mode"]);
  if (!m.params) return { error: m.error ?? "" };
  const params = m.params;
  delete params.prompt_expansion_mode; // 只对 Max 系列有意义
  fillDefaults(params, { duration: "5", resolution: "768P", generate_audio: "true" });
  if (isFrame) {
    if (params.aspect_ratio && params.aspect_ratio !== "adaptive") {
      return { error: `${scope} mode=${args.mode} takes its ratio from the frame; remove vendor_params.aspect_ratio=${params.aspect_ratio}.` };
    }
    params.aspect_ratio = "adaptive";
  } else if (!params.aspect_ratio || params.aspect_ratio === "adaptive") {
    return { error: `${scope} mode=${args.mode} requires a fixed vendor_params.aspect_ratio (adaptive is not allowed here).` };
  }
  const boolError = pickBool(scope, params, "generate_audio");
  if (boolError) return { error: boolError };

  if (args.mode === "t2v") {
    params.image_mode = "reference";
    return body(args, backend, modelId, [], params);
  }
  if (isFrame) {
    if (!args.first_frame_image) return { error: `MiniMax-H3 ${args.mode} requires \`first_frame_image\`.` };
    if (args.mode === "first-last-frame" && !args.last_frame_image) return { error: "MiniMax-H3 first-last-frame requires `last_frame_image`." };
    params.image_mode = "first-last-frame";
    return body(args, backend, modelId, [args.first_frame_image, ...(args.last_frame_image ? [args.last_frame_image] : [])], params);
  }
  if (refCount(args) === 0) {
    return { error: `${scope} mode=multimodal got no reference media; attach an image, video or audio, or switch to mode=t2v for a text-only clip.` };
  }
  const typeError = referenceMediaTypeError(args);
  if (typeError) return { error: typeError };
  params.image_mode = "reference";
  addReferences(params, args);
  return body(args, backend, modelId, [], params);
}

// ── seedance ──

const SEEDANCE_AUDIO_EXTS = [".mp3", ".wav"];

async function seedance25DurationError(args: VideoArgs): Promise<string | undefined> {
  const isLocal = (p: string) => !/^(https?:\/\/|asset:\/\/|data:)/i.test(p);
  const kinds: [string, string[], number][] = [
    ["video", args.reference_video_urls ?? [], args.mode === "video-edit" ? 4 : 2],
    ["audio", args.reference_audio_urls ?? [], 2],
  ];
  for (const [kind, paths, min] of kinds) {
    const probes = await Promise.all(paths.filter(isLocal).map((p) => probeOneMedia(p)));
    let total = 0;
    for (const p of probes) {
      const d = p.duration_sec;
      if (!d || d <= 0) continue;
      if (d < min || d > 30) return `reference_${kind}_urls item "${p.file_path}" is ${d}s; expected ${min}-30s.`;
      total += d;
    }
    if (total > 30) return `reference_${kind}_urls known total is ${total}s; expected <= 30s.`;
  }
  return undefined;
}

async function buildSeedance(args: VideoArgs, modelId: string): Promise<Built> {
  const scope = "video vendor=seedance";
  const m = merge(scope, args, ["aspect_ratio", "resolution", "generate_audio", "output_format"]);
  if (!m.params) return { error: m.error ?? "" };
  const params = m.params;
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
  if (!inheritsRatio && (!params.aspect_ratio || params.aspect_ratio === "adaptive")) {
    return { error: `${scope} requires a fixed vendor_params.aspect_ratio (16:9, 9:16, 1:1, 4:3, 3:4, 21:9); adaptive is disabled for generation.` };
  }
  const paramError = firstProblem(pickBool(scope, params, "generate_audio"));
  if (paramError) return { error: paramError };
  if (!is25 && params.output_format !== undefined) return { error: `${scope} output_format is only supported by seedance2.5.` };
  const durationError = is25 ? await seedance25DurationError(args) : undefined;
  if (durationError) return { error: durationError };

  const backend = BACKEND.seedance;
  if (args.mode === "t2v") return body(args, backend, modelId, [], params);
  if (args.mode === "i2v" || args.mode === "first-last-frame") {
    if (!args.first_frame_image) return { error: `seedance ${args.mode} requires \`first_frame_image\`.` };
    if (args.mode === "first-last-frame" && !args.last_frame_image) return { error: "seedance first-last-frame requires `last_frame_image`." };
    return body(args, backend, modelId, [args.first_frame_image, ...(args.last_frame_image ? [args.last_frame_image] : [])], params);
  }
  const typeError = referenceMediaTypeError(args);
  if (typeError) return { error: typeError };
  const badAudio = (args.reference_audio_urls ?? []).find((u) => {
    const cleaned = u.split("?")[0]?.split("#")[0] ?? "";
    const dot = cleaned.lastIndexOf(".");
    return dot >= 0 && /^\.[a-z0-9]+$/i.test(cleaned.slice(dot)) && !SEEDANCE_AUDIO_EXTS.includes(cleaned.slice(dot).toLowerCase());
  });
  if (badAudio) return { error: `reference_audio_urls only supports ${SEEDANCE_AUDIO_EXTS.join(", ")} files, but received "${badAudio}". Convert it to mp3 or wav first.` };
  if ((args.mode === "video-edit" || args.mode === "video-extend") && (args.reference_video_urls?.length ?? 0) === 0) {
    return { error: `seedance ${args.mode} requires at least one \`reference_video_urls\` item.` };
  }
  addReferences(params, args);
  return body(args, backend, modelId, [], params);
}

// ── kling ──

function buildKling(args: VideoArgs, route: { backend: string; modelId: string }, region: ReleaseRegion): Built {
  if (args.mode === "avatar" || args.mode === "motion-control") {
    const scope = `video vendor=kling mode=${args.mode}`;
    const expected = args.mode === "avatar" ? "kling-avatar" : "kling-motion-control";
    if (route.modelId !== expected) return { error: `${scope} always runs on its own dedicated model, so model_id must be left out (received ${route.modelId}).` };
    if (args.mode === "avatar") {
      if (!args.audio_path) return { error: "kling avatar needs the speech file in `audio_path`." };
      if (!args.first_frame_image) return { error: "kling avatar needs the face image in `first_frame_image`." };
      const m = collectVendorParams(scope, {}, args.vendor_params, ["mode"]);
      if (m.error !== undefined) return { error: m.error };
      fillDefaults(m.params, { mode: "std" });
      const e = pickEnum(scope, m.params, "mode", ["std", "pro"]);
      if (e) return { error: e };
      return body(args, route.backend, route.modelId, [args.first_frame_image], { ...m.params, type: "avatar", sound_file: args.audio_path });
    }
    if (!args.video_url) return { error: "kling motion-control needs the motion source in `video_url`." };
    const image = args.first_frame_image ?? args.reference_image_paths?.[0];
    if (!image) return { error: "kling motion-control needs a character image: set `first_frame_image` (or put it first in `reference_image_paths`)." };
    const m = collectVendorParams(scope, {}, args.vendor_params, ["mode", "keep_original_sound", "character_orientation"]);
    if (m.error !== undefined) return { error: m.error };
    fillDefaults(m.params, { mode: "std", keep_original_sound: "yes", character_orientation: "video" });
    return body(args, route.backend, route.modelId, [image], { ...m.params, type: "motion_control", video_url: args.video_url });
  }
  if (args.audio_path) {
    return {
      error:
        "Nothing was submitted: kling reads `audio_path` only in mode=avatar (vendor_params.sound=on makes its own soundtrack and would ignore the file). Do not change the model or mode yourself; ask the user whether they want mode=avatar or to remove audio_path.",
    };
  }
  if ((args.mode === "i2v" || args.mode === "first-last-frame") && !args.first_frame_image) return { error: `kling ${args.mode} requires \`first_frame_image\`.` };
  if (args.mode === "first-last-frame" && !args.last_frame_image) return { error: "kling first-last-frame requires `last_frame_image`." };

  const scope = `video vendor=kling mode=${args.mode}`;
  const resolved = resolveModelId("video", VIDEO_VENDOR_CONFIGS.kling, region, route.modelId, scope);
  if (resolved.error !== undefined) return { error: resolved.error };
  const modelId = resolved.modelId;
  const m = merge(scope, args, ["mode", "aspect_ratio", "sound", "multi_shot", "image_types_json", "video_list_json", "video_refer_type", "keep_original_sound"]);
  if (!m.params) return { error: m.error ?? "" };
  const params = m.params;
  fillDefaults(params, { model_name: modelId, mode: "pro", aspect_ratio: "16:9", duration: "5", sound: "off", multi_shot: "false" });
  if (args.video_url) {
    if (params.video_list_json) return { error: `${scope} got both video_url and vendor_params.video_list_json. Use one video source.` };
    // 参考视频作为 video_list_json 的唯一项；refer_type 缺省 base（输出时长跟随源视频）
    params.video_list_json = JSON.stringify([
      { local_path: args.video_url, refer_type: params.video_refer_type ?? "base", keep_original_sound: params.keep_original_sound },
    ]);
  } else if (params.video_refer_type || params.keep_original_sound) {
    return { error: `${scope} vendor_params.video_refer_type/keep_original_sound require common field video_url.` };
  }
  delete params.video_refer_type;
  delete params.keep_original_sound;
  const e = firstProblem(
    pickBool(scope, params, "multi_shot"),
    requireJsonArray(scope, params, "image_types_json"),
    requireJsonArray(scope, params, "video_list_json"),
  );
  if (e) return { error: e };
  const extras = Array.from({ length: args.reference_image_paths?.length ?? 0 }, () => "");
  if (!params.image_types_json) {
    if (args.mode === "i2v" && args.first_frame_image) params.image_types_json = JSON.stringify(["first_frame", ...extras]);
    else if (args.mode === "first-last-frame") params.image_types_json = JSON.stringify(["first_frame", "end_frame", ...extras]);
  }
  const refs = [
    ...(args.first_frame_image ? [args.first_frame_image] : []),
    ...(args.last_frame_image ? [args.last_frame_image] : []),
    ...(args.reference_image_paths ?? []),
  ];
  return body(args, route.backend, modelId, refs, params);
}

// ── wan3 ──

function buildWan(args: VideoArgs, modelId: string): Built {
  const scope = `video vendor=wan model_id=${modelId}`;
  if (args.audio_path) {
    return { error: `${scope} has no audio_path input; pass audio as reference_audio_urls under mode=multimodal. wan does not lip-sync, so check with the user before moving to another vendor.` };
  }
  const m = merge(scope, args, ["resolution", "aspect_ratio", "generate_audio", "prompt_extend", "watermark", "seed", "file_url"]);
  if (!m.params) return { error: m.error ?? "" };
  const params = m.params;
  if (args.last_frame_image && !args.first_frame_image) return { error: `${scope} a closing frame alone is not accepted; supply first_frame_image too, or remove last_frame_image.` };
  if ((args.first_frame_image || args.last_frame_image) && (refCount(args) > 0 || args.video_url || params.file_url)) {
    return { error: `${scope} keyframes exclude reference media, video_url and vendor_params.file_url (the service fails such tasks); keep one group only.` };
  }
  const videos = [...new Set([...(args.video_url ? [args.video_url] : []), ...(args.reference_video_urls ?? [])])];
  const refs = (args.reference_image_paths?.length ?? 0) + videos.length + (args.reference_audio_urls?.length ?? 0);
  const hasMedia = Boolean(args.first_frame_image || args.last_frame_image) || refs > 0 || Boolean(params.file_url);
  if (!args.prompt?.trim() && !hasMedia) return { error: `${scope} got neither prompt text nor any media.` };
  if (args.mode === "t2v" && hasMedia) return { error: `${scope} mode=t2v works from text alone; frames belong to i2v/first-last-frame, references to multimodal.` };
  if ((args.mode === "i2v" || args.mode === "first-last-frame") && !args.first_frame_image) return { error: `${scope} mode=${args.mode} requires \`first_frame_image\`.` };
  if (args.mode === "multimodal" && refs === 0 && !params.file_url) {
    return { error: `${scope} mode=multimodal has nothing to work from; attach references or vendor_params.file_url, or use mode=t2v for text only.` };
  }
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
  if (!params.duration) {
    return { error: `${scope} requires an explicit duration (2..30 seconds); wan bills per second and has no default when a reference video is attached.` };
  }
  const e = firstProblem(
    pickBool(scope, params, "generate_audio"),
    pickBool(scope, params, "prompt_extend"),
    pickBool(scope, params, "watermark"),
  );
  if (e) return { error: e };
  const imageMode = args.mode === "multimodal" ? "reference" : args.mode === "t2v" ? undefined : "first-last-frame";
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
  if (!modes.includes(args.mode)) return { error: `${args.vendor} has no mode=${args.mode}; it offers ${modes.join(", ")}.` };
  const route = videoRouteModel(args.vendor, args.mode, args.model_id);
  const config = VIDEO_VENDOR_CONFIGS[args.vendor];
  const scope = `video vendor=${args.vendor}`;

  switch (args.vendor) {
    case "MiniMax":
      return buildH3(args, route.modelId);
    case "kling":
      return buildKling(args, route, region);
    case "wan": {
      if ((WAN_RETIRED_MODEL_IDS as readonly string[]).includes(route.modelId)) {
        return { error: `${scope} model_id=${route.modelId} is retired. Use model_id=wan3.0-video (or wan3.0-video-prime for faster drafts); image-to-video is mode=i2v with first_frame_image.` };
      }
      const r = resolveModelId("video", config, region, route.modelId, scope);
      if (r.error !== undefined) return { error: r.error };
      if (!(WAN3_MODEL_IDS as readonly string[]).includes(r.modelId)) return { error: `${scope} unsupported model_id=${r.modelId}. Supported values: ${WAN3_MODEL_IDS.join(", ")}.` };
      return buildWan(args, r.modelId);
    }
    default:
      break;
  }

  const r = resolveModelId("video", config, region, route.modelId, scope);
  if (r.error !== undefined) return { error: r.error };
  const modelId = r.modelId;

  if (args.vendor === "seedance") return buildSeedance(args, modelId);

  if (args.vendor === "veo3") {
    const m = merge(scope, args, ["aspect_ratio", "resolution"]);
    if (!m.params) return { error: m.error ?? "" };
    fillDefaults(m.params, { model_name: modelId, duration: "8", aspect_ratio: "16:9", resolution: "720p" });
    const imagePaths: string[] = [];
    if (args.mode === "i2v" || args.mode === "first-last-frame") {
      if (!args.first_frame_image) return { error: `veo3 ${args.mode} requires \`first_frame_image\`.` };
      imagePaths.push(args.first_frame_image);
      if (args.mode === "first-last-frame") {
        if (!args.last_frame_image) return { error: "veo3 first-last-frame also needs the closing frame in `last_frame_image`." };
        imagePaths.push(args.last_frame_image);
      }
    }
    return body(args, config.backend, modelId, imagePaths, m.params);
  }

  // jimeng：只有动作迁移
  if (!args.video_url) return { error: "jimeng motion-control needs the motion source in `video_url`." };
  const image = args.first_frame_image ?? args.reference_image_paths?.[0];
  if (!image) return { error: "jimeng motion-control needs a character image: set `first_frame_image` (or put it first in `reference_image_paths`)." };
  const m = collectVendorParams(scope, {}, args.vendor_params, []);
  if (m.error !== undefined) return { error: m.error };
  return body(args, config.backend, modelId, [image], { video_url: args.video_url });
}
