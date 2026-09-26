import { type Client, type MediaConfig, PlatformError, audio, image, route, video } from "@ov/maas-media";

import { loadCoverFeature } from "../music/cover-features.js";

export type MediaType = "image" | "video" | "speech" | "music";

/**
 * 四条 submit 的请求体。字段名是调用方（MCP / 渲染层）的契约，**多余的键原样保留**：
 * 它们要跟着记录落盘、写进节点的 retry 信息，丢了就没法原样重试。
 */
export interface GenerationRequest {
  backend?: string;
  model_id?: string;
  prompt?: string;
  display_prompt?: string;
  filename?: string;
  image_paths?: string[];
  video_paths?: string[];
  audio_paths?: string[];
  params?: Record<string, unknown>;
  source_tool?: string;
  source_node_id?: string;
  replace_node_id?: string;
  session_id?: string;
  // 视频的扁平写法（旧调用方）：和 image_paths 的帧槽位等价。
  mode?: string;
  first_frame_image?: string;
  last_frame_image?: string;
  reference_image_paths?: string[];
  reference_video_urls?: string[];
  reference_audio_urls?: string[];
  duration?: number | string;
  // 音乐 / 语音的顶层写法。
  lyrics?: string;
  voice_id?: string;
  texts?: string[];
  [extra: string]: unknown;
}

/** 这次生成最终用的平台模型（给节点和资产记 `model`）。认不出就回调用方给的名字。 */
export function displayModel(cfg: MediaConfig, media: MediaType, req: GenerationRequest): string {
  const want = str(req.model_id) ?? str(req.params?.model_name);
  const modality =
    media === "image"
      ? (req.image_paths ?? []).some(nonEmpty)
        ? route.Modality.ImageEdit
        : route.Modality.Image
      : media === "video"
        ? route.Modality.Video
        : media === "speech"
          ? route.Modality.Speech
          : route.Modality.Music;
  return route.route(cfg.models, want, modality)?.model ?? want ?? req.backend ?? media;
}

/** 平台跑完的结果：一个或多个可下载的地址。 */
export interface PlatformOutput {
  urls: string[];
}

/**
 * 按媒体类型调平台。异步任务（视频 / 语音 / 音乐）的平台任务号经 `client.onTaskSubmitted`
 * 交给调用方落盘，同步的出图没有任务号。
 */
export async function runOnPlatform(client: Client, cfg: MediaConfig, root: string, media: MediaType, req: GenerationRequest): Promise<PlatformOutput> {
  switch (media) {
    case "image":
      return { urls: [await runImage(client, cfg, root, req)] };
    case "video":
      return { urls: [await runVideo(client, cfg, root, req)] };
    case "speech":
      return { urls: [await runSpeech(client, cfg, req)] };
    case "music":
      return { urls: [await runMusic(client, cfg, root, req)] };
  }
}

async function runImage(client: Client, cfg: MediaConfig, root: string, req: GenerationRequest): Promise<string> {
  const images = await image.loadImageInputs(root, (req.image_paths ?? []).filter(nonEmpty));
  const p = req.params ?? {};
  return image.generate(client, cfg, req.prompt ?? "", images, str(p.aspect_ratio) ?? str(p.ratio) ?? "", str(p.resolution) ?? "", str(req.model_id) ?? str(p.model_name));
}

// ---------------------------------------------------------------------------
// 视频
// ---------------------------------------------------------------------------

/**
 * 这次视频是哪种玩法。**说了就听说了的**（`mode` → `params.image_mode` → `source_tool` 第三段），
 * 没说再按输入推。只给首帧和只给尾帧在平台侧是同一个输入形态（都是一张图），张数分不出来，
 * 弄反了画面会朝相反方向发展，而且不报错。
 */
export function videoPlan(req: GenerationRequest): video.VideoPlan {
  const frames = videoFrames(req);
  const refs = videoReferences(req);
  const hasRefs = refs.images.length + refs.videos.length + refs.audios.length > 0;
  return planOf(videoMode(req), !!frames.first, !!frames.last, hasRefs);
}

export function videoMode(req: GenerationRequest): string | undefined {
  return str(req.mode) ?? str(req.params?.image_mode) ?? str(req.source_tool?.split(":")[2]);
}

export function planOf(mode: string | undefined, first: boolean, last: boolean, refs: boolean): video.VideoPlan {
  if (mode) {
    const m = mode.toLowerCase().replace(/[ _]/g, "-");
    // 顺序有讲究：`first-last-frame` 同时含 first 和 last，先判 last 会被当成"只给尾帧"。
    if (m.includes("ref") || m === "r2va") return video.VideoPlan.Reference;
    if ((m.includes("first") && m.includes("last")) || m === "flf2v") return video.VideoPlan.FirstLastFrame;
    if (m.includes("last") || m === "l2va") return video.VideoPlan.LastFrame;
    if (m.includes("first") || m.includes("image") || m === "i2v") return video.VideoPlan.ImageToVideo;
    if (m.includes("text") || m === "t2v") return video.VideoPlan.TextToVideo;
    // 认不出的玩法不当失败，往下按输入推 —— 调用方随时会加新玩法。
  }
  if (refs) return video.VideoPlan.Reference;
  if (first && last) return video.VideoPlan.FirstLastFrame;
  if (first) return video.VideoPlan.ImageToVideo;
  if (last) return video.VideoPlan.LastFrame;
  return video.VideoPlan.TextToVideo;
}

/**
 * 首尾帧。`image_paths` 在首尾帧玩法里是**固定槽位**：`['', tail]` 表示只有尾帧，
 * 过滤掉空串再取第一个的话尾帧会被当成首帧。
 */
export function videoFrames(req: GenerationRequest): { first?: string; last?: string } {
  if (req.first_frame_image || req.last_frame_image) {
    return { first: str(req.first_frame_image), last: str(req.last_frame_image) };
  }
  const mode = videoMode(req)?.toLowerCase() ?? "";
  if (mode.includes("ref")) return {};
  const slots = req.image_paths ?? [];
  return { first: str(slots[0]), last: str(slots[1]) };
}

export function videoReferences(req: GenerationRequest): { images: string[]; videos: string[]; audios: string[] } {
  const p = req.params ?? {};
  const mode = videoMode(req)?.toLowerCase() ?? "";
  const imageRefs = mode.includes("ref") ? (req.image_paths ?? []) : [];
  return {
    images: uniq([...(req.reference_image_paths ?? []), ...imageRefs, ...arr(p.reference_images)]),
    videos: uniq([...(req.reference_video_urls ?? []), ...(req.video_paths ?? []), ...arr(p.reference_videos)]),
    audios: uniq([...(req.reference_audio_urls ?? []), ...(req.audio_paths ?? []), ...arr(p.reference_audios)]),
  };
}

/** 按玩法挑出要发的帧，顺序 [首帧, 尾帧]。缺帧报错而不是降级：flf2v 少一张会被平台当成 i2v。 */
export function framesFor(plan: video.VideoPlan, first?: string, last?: string): string[] {
  const need = (what: string) => PlatformError.config(`这种玩法需要${what}`);
  switch (plan) {
    case video.VideoPlan.FirstLastFrame:
      if (!first) throw need("首帧图（first_frame_image）");
      if (!last) throw need("尾帧图（last_frame_image）");
      return [first, last];
    case video.VideoPlan.ImageToVideo:
      if (!first) throw need("首帧图（first_frame_image）");
      return [first];
    case video.VideoPlan.LastFrame:
      if (!last) throw need("尾帧图（last_frame_image）");
      return [last];
    default:
      return [];
  }
}

async function runVideo(client: Client, cfg: MediaConfig, root: string, req: GenerationRequest): Promise<string> {
  const plan = videoPlan(req);
  const f = videoFrames(req);
  const refs = videoReferences(req);
  const p = req.params ?? {};
  const duration = Number(req.duration ?? p.duration);
  const generateAudio = p.generate_audio === undefined ? null : p.generate_audio === true || p.generate_audio === "true";
  const job: video.VideoJob = {
    plan,
    prompt: req.prompt ?? "",
    frames: await image.loadImageInputs(root, framesFor(plan, f.first, f.last)),
    refImages: await image.loadImageInputs(root, refs.images),
    refVideos: await image.loadMediaInputs(root, refs.videos),
    refAudios: await image.loadMediaInputs(root, refs.audios),
    duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
    aspectRatio: str(p.aspect_ratio) ?? str(p.ratio) ?? "",
    resolution: str(p.resolution) ?? "",
    generateAudio,
    modelId: str(req.model_id) ?? str(p.model_name) ?? null,
  };
  return video.generate(client, cfg, job);
}

// ---------------------------------------------------------------------------
// 语音 / 音乐
// ---------------------------------------------------------------------------

async function runSpeech(client: Client, cfg: MediaConfig, req: GenerationRequest): Promise<string> {
  const text = (str(req.prompt) ?? req.texts?.find(nonEmpty) ?? "").trim();
  if (!text) throw PlatformError.config("语音合成没有给文本");
  const voice = str(req.params?.voice_id) ?? str(req.voice_id);
  // 音色缺失在联网前就报，并列出可选项：挑一个顶上，用户会听到一个陌生的声音而没有任何提示。
  if (!voice) {
    const known = Object.keys(cfg.models.voice_map);
    throw PlatformError.config(`语音合成要指定 voice_id。可用音色：${known.length ? known.join(" / ") : "（没有，去设置里配置音色映射）"}`);
  }
  return audio.synthesizeSpeech(client, cfg, text, voice, str(req.model_id) ?? str(req.params?.model_name));
}

/** `song` / `instrumental`：`params.mode` → `source_tool` 后缀。没说就是 undefined，交给歌词推断。 */
export function musicInstrumental(req: GenerationRequest): boolean | undefined {
  const mode = (str(req.params?.mode) ?? str(req.mode) ?? str(req.source_tool?.split(":")[1]))?.toLowerCase();
  if (mode === "instrumental" || mode === "bgm") return true;
  if (mode === "song" || mode === "vocal" || mode === "vocals") return false;
  return undefined;
}

async function runMusic(client: Client, cfg: MediaConfig, root: string, req: GenerationRequest): Promise<string> {
  const p = req.params ?? {};
  const lyrics = str(p.lyrics) ?? str(req.lyrics) ?? "";
  const model = str(req.model_id) ?? str(p.model_name);
  // 两步翻唱：先 /api/music/cover/preprocess 拿 cover_feature_id，生成时凭它取回那段参考音频。
  const featureId = str(p.cover_feature_id);
  const featureAudio = featureId ? await loadCoverFeature(root, featureId) : undefined;
  if (featureId && !featureAudio) throw PlatformError.config(`cover_feature_id 不认识或已失效：${featureId}，请重新预处理参考音频`);
  const cover = str(p.audio) ?? str(p.reference_audio) ?? featureAudio ?? (req.audio_paths ?? []).find(nonEmpty);
  if (cover) {
    const [src] = await image.loadMediaInputs(root, [cover]);
    if (!src) throw PlatformError.config("翻唱缺少参考音频");
    return audio.editMusic(client, cfg, audio.MusicEdit.Cover, req.prompt ?? "", src, lyrics, model);
  }
  const intent = audio.MusicIntent.infer(musicInstrumental(req) ?? null, lyrics);
  return audio.generateMusic(client, cfg, req.prompt ?? "", lyrics, intent, model);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : undefined;
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function nonEmpty(s: unknown): s is string {
  return typeof s === "string" && s.trim() !== "";
}

function uniq(xs: string[]): string[] {
  return [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
}
