import type { ReleaseRegion } from "../env.js";

/**
 * 图片 / 视频（及 list_capabilities 里音频两项）的静态模型目录。
 *
 * vendor、model_id、backend、mode 这些名字是接口事实：agent 配置和知识卡片按它们写，
 * gateway 再把它们映射到我们平台真实可用的模型。这里只保留构造提交体和守卫所需的信息，
 * 不复刻逐模型的参数细则 —— 真正的可用性以 gateway 的 /api/models 目录为准。
 */

export const BACKEND = {
  nanoBanana: "nano_banana",
  kling: "kling",
  openai: "openai",
  midjourney: "midjourney",
  seedream: "seedream",
  h3Video: "minimax_v3",
  veo3: "veo3",
  wanI2v: "wan_i2v",
  speechTts: "minimax_tts",
  seedaudio: "seedaudio",
  musicGen: "minimax_music",
  seedance: "seedance",
  klingAvatar: "kling_avatar",
  klingMotionControl: "kling_motion_control",
  jimengMotionControl: "jimeng_motion_control",
} as const;

export const IMAGE_VENDOR_ENUM = ["gpt-image", "banana", "seedream", "midjourney"] as const;
export const VIDEO_VENDOR_ENUM = ["MiniMax", "veo3", "seedance", "jimeng", "kling", "wan"] as const;
export type ImageVendor = (typeof IMAGE_VENDOR_ENUM)[number];
export type VideoVendor = (typeof VIDEO_VENDOR_ENUM)[number];

export const MIDJOURNEY_MODEL_IDS = ["midjourney-8.2", "midjourney-8.1", "midjourney-7", "midjourney-niji7"] as const;

export const VIDEO_MODE_ENUM = [
  "t2v",
  "i2v",
  "first-last-frame",
  "multimodal",
  "video-edit",
  "video-extend",
  "motion-control",
  "avatar",
  "omni",
] as const;
export type VideoMode = (typeof VIDEO_MODE_ENUM)[number];

/** 工具入参 model_id 的枚举：含 canonical id 和少数历史 / 分区别名（解析时归一）。 */
export const IMAGE_MODEL_ID_ENUM = [
  "banana_2",
  "banana_pro",
  "nano_banana_2_flash",
  "nano_banana_2",
  "doubao-seedream-5-0-pro-260628",
  "doubao-seedream-4-5-251128",
  "g-image-2",
  "gpt-image-2",
  "gpt-image-2.5-flare",
  "gpt-image-2.5-sunburst",
  ...MIDJOURNEY_MODEL_IDS,
] as const;

export const VIDEO_MODEL_ID_ENUM = [
  "MiniMax-H3",
  "MiniMax-H3-Max",
  "MiniMax-H3-Max-Turbo",
  "beta_fast",
  "beta_pro",
  "veo-3.1-fast-generate-001",
  "veo-3.1-generate-001",
  "seedance2.0",
  "seedance2.0-fast",
  "seedance2.0-mini",
  "seedance2.5",
  "jimeng_motion_control",
  "kling-video-o1",
  "kling-v3-omni",
  "wan3.0-video",
  "wan3.0-video-prime",
] as const;

export const WAN3_MODEL_IDS = ["wan3.0-video", "wan3.0-video-prime"] as const;
/** 已下线：显式请求时给出改用 wan3 的提示，不能透传。 */
export const WAN_RETIRED_MODEL_IDS = ["wan2.6-i2v"] as const;

export type ModelType = "image" | "video" | "audio";

export interface VendorConfig {
  vendor: string;
  backend: string;
  /** 调用时 model_id 缺省落到哪个模型。 */
  defaultModel: string;
  /** 顺序即 manifest 的默认与降级链：目录过滤后取第一个。 */
  modelIds: readonly string[];
  knowledgeCard: string;
  capabilities: readonly string[];
  modes?: readonly VideoMode[];
  modelModes?: Record<string, readonly VideoMode[]>;
  pickerAliases?: readonly string[];
  pickerAliasesByRegion?: Partial<Record<ReleaseRegion, readonly string[]>>;
  modelAliases?: Record<string, string>;
  modelAliasesByRegion?: Partial<Record<ReleaseRegion, Record<string, string>>>;
  /** 选择器里一个 vendor 可能对应多个 backend 的行（kling 的 avatar / motion-control）。 */
  pickerBackends?: readonly string[];
  pickerExtraIds?: readonly string[];
  extraModels?: readonly string[];
}

export const IMAGE_VENDOR_CONFIGS: Record<ImageVendor, VendorConfig> = {
  banana: {
    vendor: "banana",
    backend: BACKEND.nanoBanana,
    defaultModel: "nano_banana_2_flash",
    modelIds: ["nano_banana_2_flash", "nano_banana_2"],
    knowledgeCard: "vendors/banana.md",
    capabilities: ["t2i", "i2i", "multi-ref", "fast"],
    pickerAliases: ["banana", "nano-banana", "香蕉", "香蕉系列"],
    pickerAliasesByRegion: { domestic: ["general-image", "general image", "general-image-2", "general-image-pro"] },
    modelAliases: {
      香蕉Pro: "nano_banana_2",
      "Banana Pro": "nano_banana_2",
      香蕉2: "nano_banana_2_flash",
      "Banana Flash": "nano_banana_2_flash",
    },
    modelAliasesByRegion: {
      domestic: { "General Image Pro": "nano_banana_2", "General Image 2": "nano_banana_2_flash" },
    },
  },
  seedream: {
    vendor: "seedream",
    backend: BACKEND.seedream,
    defaultModel: "doubao-seedream-5-0-pro-260628",
    modelIds: ["doubao-seedream-5-0-pro-260628", "doubao-seedream-4-5-251128"],
    knowledgeCard: "vendors/seedream.md",
    capabilities: ["t2i", "i2i", "high-fidelity"],
    pickerAliases: ["seedream"],
    modelAliases: {
      "Seedream 5.0 Pro": "doubao-seedream-5-0-pro-260628",
      "Seedream 4.5": "doubao-seedream-4-5-251128",
    },
  },
  // modelIds[0] 是 manifest 广播的默认，defaultModel 是调用缺省 —— 两者必须一起改
  "gpt-image": {
    vendor: "gpt-image",
    backend: BACKEND.openai,
    defaultModel: "gpt-image-2.5-sunburst",
    modelIds: ["gpt-image-2.5-sunburst", "gpt-image-2", "gpt-image-2.5-flare"],
    knowledgeCard: "vendors/gpt-image.md",
    capabilities: ["t2i", "i2i", "multi-ref", "image-edit", "text-render"],
    pickerAliases: ["gpt-image", "openai-image", "g-image", "g-image-2"],
    pickerAliasesByRegion: { domestic: ["design-image", "design image", "design-image-2"] },
  },
  midjourney: {
    vendor: "midjourney",
    backend: BACKEND.midjourney,
    defaultModel: "midjourney-8.2",
    modelIds: MIDJOURNEY_MODEL_IDS,
    knowledgeCard: "vendors/midjourney.md",
    capabilities: ["t2i", "aesthetic"],
    pickerAliases: ["midjourney"],
  },
};

export const VIDEO_SUPPORTED_MODES: Record<VideoVendor, readonly VideoMode[]> = {
  MiniMax: ["t2v", "i2v", "first-last-frame", "multimodal"],
  veo3: ["t2v", "i2v", "first-last-frame"],
  seedance: ["t2v", "i2v", "first-last-frame", "multimodal", "video-edit", "video-extend"],
  jimeng: ["motion-control"],
  kling: ["t2v", "i2v", "first-last-frame", "avatar", "motion-control", "omni"],
  wan: ["t2v", "i2v", "first-last-frame", "multimodal"],
};

export const VIDEO_VENDOR_CONFIGS: Record<VideoVendor, VendorConfig> = {
  MiniMax: {
    vendor: "MiniMax",
    backend: BACKEND.h3Video,
    defaultModel: "MiniMax-H3",
    modelIds: ["MiniMax-H3", "MiniMax-H3-Max", "MiniMax-H3-Max-Turbo"],
    knowledgeCard: "vendors/minimax.md",
    modes: VIDEO_SUPPORTED_MODES.MiniMax,
    modelModes: {
      "MiniMax-H3": ["t2v", "i2v", "first-last-frame", "multimodal"],
      "MiniMax-H3-Max": ["t2v", "first-last-frame", "multimodal"],
      "MiniMax-H3-Max-Turbo": ["t2v", "first-last-frame"],
    },
    capabilities: ["t2v", "i2v", "first-last-frame", "multimodal", "multi-ref"],
    pickerAliases: ["MiniMax", "MiniMax-H3", "H3"],
    modelAliases: {
      "MiniMax H3": "MiniMax-H3",
      "MiniMax H3 Max": "MiniMax-H3-Max",
      "MiniMax H3 Max Turbo": "MiniMax-H3-Max-Turbo",
    },
  },
  veo3: {
    vendor: "veo3",
    backend: BACKEND.veo3,
    defaultModel: "veo-3.1-fast-generate-001",
    modelIds: ["veo-3.1-fast-generate-001", "veo-3.1-generate-001"],
    knowledgeCard: "vendors/veo.md",
    modes: VIDEO_SUPPORTED_MODES.veo3,
    capabilities: ["t2v", "i2v", "first-last-frame", "high-fidelity"],
    pickerAliases: ["veo3", "beta", "beta_fast", "beta_pro"],
    modelAliases: { "Beta Fast": "veo-3.1-fast-generate-001", "Beta Pro": "veo-3.1-generate-001" },
  },
  seedance: {
    vendor: "seedance",
    backend: BACKEND.seedance,
    defaultModel: "seedance2.0",
    modelIds: ["seedance2.0", "seedance2.0-fast", "seedance2.0-mini", "seedance2.5"],
    knowledgeCard: "vendors/seedance.md",
    modes: VIDEO_SUPPORTED_MODES.seedance,
    capabilities: ["t2v", "i2v", "first-last-frame", "multimodal", "video-edit", "video-extend", "multi-ref"],
    pickerAliases: ["seedance"],
    modelAliases: { "Seedance 2.5": "seedance2.5", "Seedance Fast": "seedance2.0-fast", "Seedance Mini": "seedance2.0-mini" },
  },
  jimeng: {
    vendor: "jimeng",
    backend: BACKEND.jimengMotionControl,
    defaultModel: "jimeng_motion_control",
    modelIds: ["jimeng_motion_control"],
    knowledgeCard: "vendors/jimeng.md",
    modes: VIDEO_SUPPORTED_MODES.jimeng,
    capabilities: ["motion-control"],
    pickerAliases: ["jimeng"],
    extraModels: ["jimeng_motion_control"],
  },
  kling: {
    vendor: "kling",
    backend: BACKEND.kling,
    defaultModel: "kling-video-o1",
    modelIds: ["kling-video-o1", "kling-v3-omni"],
    knowledgeCard: "vendors/kling-omni.md",
    modes: VIDEO_SUPPORTED_MODES.kling,
    capabilities: ["t2v", "i2v", "first-last-frame", "avatar", "motion-control", "multi-shot"],
    pickerAliases: ["kling"],
    pickerBackends: [BACKEND.kling, BACKEND.klingAvatar, BACKEND.klingMotionControl],
    pickerExtraIds: ["kling-avatar", "kling-motion-control"],
  },
  // wan3 复用 wan_i2v 这个 backend id：旧客户端遇到未知 backend 会整表报错
  wan: {
    vendor: "wan",
    backend: BACKEND.wanI2v,
    defaultModel: "wan3.0-video",
    modelIds: [...WAN3_MODEL_IDS],
    knowledgeCard: "vendors/wan.md",
    modes: VIDEO_SUPPORTED_MODES.wan,
    modelModes: { "wan3.0-video": VIDEO_SUPPORTED_MODES.wan, "wan3.0-video-prime": VIDEO_SUPPORTED_MODES.wan },
    capabilities: ["t2v", "i2v", "first-last-frame", "multimodal", "video-edit", "video-extend", "multi-ref"],
    pickerAliases: ["Wan", "Wan 3.0"],
    modelAliases: { "Wan 3.0": "wan3.0-video", "Wan 3.0 Prime": "wan3.0-video-prime" },
  },
};

// list_capabilities 里的音频两项。音频工具本身由 audio-tools 模块负责，这里只描述 manifest。
export const AUDIO_TTS_VENDOR: VendorConfig = {
  vendor: "official",
  backend: BACKEND.speechTts,
  defaultModel: "speech-2.8-hd",
  modelIds: ["speech-2.8-hd", "speech-2.8-turbo"],
  knowledgeCard: "vendors/moss.md",
  capabilities: ["tts", "multi-voice", "emotion", "pronunciation-dict", "voice-modify"],
  pickerAliases: ["official-speech", "speech"],
};
export const AUDIO_TTS_SEEDAUDIO_VENDOR: VendorConfig = {
  vendor: "seedaudio",
  backend: BACKEND.seedaudio,
  defaultModel: "seed-audio-1.0",
  modelIds: ["seed-audio-1.0"],
  knowledgeCard: "vendors/seedaudio.md",
  capabilities: ["tts", "reference-audio", "reference-image", "voice-style-clone"],
  pickerAliases: ["seed-audio", "seed-audio-1.0", "seedaudio"],
};
export const AUDIO_MUSIC_VENDOR: VendorConfig = {
  vendor: "official",
  backend: BACKEND.musicGen,
  defaultModel: "music-3.0",
  modelIds: ["music-3.0"],
  knowledgeCard: "vendors/official-music.md",
  capabilities: ["song", "instrumental"],
  pickerAliases: ["official-music", "music"],
};

// ── 模型注册表的别名面（选择器行 id / model_name / 分区 token → canonical model_id） ──

interface RegistryEntry {
  id: string;
  backend: string;
  model_name?: string;
  publicToken?: string;
  region?: ReleaseRegion;
}

const REGISTRY: Record<ModelType, readonly RegistryEntry[]> = {
  image: [
    { id: "banana-2", publicToken: "banana_2", region: "domestic", backend: BACKEND.nanoBanana, model_name: "nano_banana_2_flash" },
    { id: "banana-pro", publicToken: "banana_pro", region: "domestic", backend: BACKEND.nanoBanana, model_name: "nano_banana_2" },
    { id: "nano_banana_2_flash", region: "overseas", backend: BACKEND.nanoBanana, model_name: "nano_banana_2_flash" },
    { id: "nano_banana_2", region: "overseas", backend: BACKEND.nanoBanana, model_name: "nano_banana_2" },
    { id: "doubao-seedream-5-0-pro-260628", backend: BACKEND.seedream, model_name: "doubao-seedream-5-0-pro-260628" },
    { id: "doubao-seedream-4-5-251128", backend: BACKEND.seedream, model_name: "doubao-seedream-4-5-251128" },
    ...MIDJOURNEY_MODEL_IDS.map((id) => ({ id, backend: BACKEND.midjourney })),
    { id: "g-image-2", region: "domestic", backend: BACKEND.openai, model_name: "gpt-image-2" },
    { id: "gpt-image-2", region: "overseas", backend: BACKEND.openai, model_name: "gpt-image-2" },
    ...(["flare", "sunburst"] as const).flatMap((v): RegistryEntry[] => [
      { id: `g-image-2.5-${v}`, region: "domestic", backend: BACKEND.openai, model_name: `gpt-image-2.5-${v}` },
      { id: `gpt-image-2.5-${v}`, region: "overseas", backend: BACKEND.openai, model_name: `gpt-image-2.5-${v}` },
    ]),
  ],
  video: [
    { id: "MiniMax-H3", backend: BACKEND.h3Video, model_name: "MiniMax-H3" },
    { id: "MiniMax-H3-Max", backend: BACKEND.h3Video, model_name: "MiniMax-H3-Max" },
    { id: "MiniMax-H3-Max-Turbo", backend: BACKEND.h3Video, model_name: "MiniMax-H3-Max-Turbo" },
    { id: "seedance2.0", backend: BACKEND.seedance, model_name: "seedance2.0" },
    { id: "seedance2.0-fast", backend: BACKEND.seedance, model_name: "seedance2.0-fast" },
    { id: "seedance2.0-mini", backend: BACKEND.seedance, model_name: "seedance2.0-mini" },
    { id: "seedance2.5", backend: BACKEND.seedance, model_name: "seedance2.5" },
    { id: "kling-video-o1", backend: BACKEND.kling, model_name: "kling-video-o1" },
    { id: "kling-v3-omni-video", backend: BACKEND.kling, model_name: "kling-v3-omni" },
    { id: "kling-avatar", backend: BACKEND.klingAvatar, model_name: "kling-avatar" },
    { id: "kling-motion-control", backend: BACKEND.klingMotionControl, model_name: "kling-motion-control" },
    { id: "wan2.6-i2v", backend: BACKEND.wanI2v, model_name: "wan2.6-i2v" },
    { id: "wan3.0-video", backend: BACKEND.wanI2v, model_name: "wan3.0-video" },
    { id: "wan3.0-video-prime", backend: BACKEND.wanI2v, model_name: "wan3.0-video-prime" },
    { id: "jimeng_motion_control", backend: BACKEND.jimengMotionControl, model_name: "jimeng_motion_control" },
    { id: "beta-3-1-fast", publicToken: "beta_fast", region: "domestic", backend: BACKEND.veo3, model_name: "veo-3.1-fast-generate-001" },
    { id: "beta-3-1", publicToken: "beta_pro", region: "domestic", backend: BACKEND.veo3, model_name: "veo-3.1-generate-001" },
    { id: "veo-3.1-fast-generate-001", region: "overseas", backend: BACKEND.veo3, model_name: "veo-3.1-fast-generate-001" },
    { id: "veo-3.1-generate-001", region: "overseas", backend: BACKEND.veo3, model_name: "veo-3.1-generate-001" },
  ],
  audio: [],
};

export const unique = <T>(values: readonly (T | undefined | null | "")[]): T[] =>
  [...new Set(values.filter((v): v is T => Boolean(v)))];

function variants(type: ModelType, backend: string, region: ReleaseRegion) {
  return REGISTRY[type]
    .filter((e) => e.backend === backend && (!e.region || e.region === region))
    .map((e) => ({ entry: e, toolName: e.publicToken ?? e.model_name ?? e.id, modelId: e.model_name ?? e.id }));
}

function registryAliases(type: ModelType, backend: string, region: ReleaseRegion): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of variants(type, backend, region)) {
    out[v.toolName] = v.modelId;
    out[v.modelId] = v.modelId;
    out[v.entry.id] = v.modelId;
  }
  return out;
}

export function modelAliasMap(type: ModelType, config: VendorConfig, region: ReleaseRegion): Record<string, string> {
  const aliases = registryAliases(type, config.backend, region);
  for (const m of config.extraModels ?? []) aliases[m] = m;
  aliases[config.defaultModel] ??= config.defaultModel;
  return aliases;
}

/**
 * model_id → canonical（例如 `banana_2` → `nano_banana_2_flash`、`beta_fast` → veo fast）。
 * 不认识的 id 直接拒绝：vendor 和 model 对不上时宁可让 agent 重选，也不静默换模型。
 */
export function resolveModelId(
  type: ModelType,
  config: VendorConfig,
  region: ReleaseRegion,
  raw: string | undefined,
  scope: string,
): { modelId: string; error?: undefined } | { modelId?: undefined; error: string } {
  const aliases = modelAliasMap(type, config, region);
  const requested = raw ?? config.defaultModel;
  const supported = unique([
    config.defaultModel,
    ...config.modelIds,
    ...(config.extraModels ?? []),
    ...Object.keys(aliases),
    ...Object.values(aliases),
  ]);
  if (!supported.includes(requested)) {
    return { error: `${scope} unsupported model_id=${requested}. Supported values: ${supported.join(", ")}.` };
  }
  return { modelId: aliases[requested] ?? requested };
}

// ── 选择器守卫用的 id 集合 ──

export function pickerIdsByVendor(type: ModelType, configs: Record<string, VendorConfig>, region: ReleaseRegion) {
  const out: Record<string, string[]> = {};
  for (const [vendor, c] of Object.entries(configs)) {
    const aliases = modelAliasMap(type, c, region);
    const backendAliases = Object.assign({}, ...(c.pickerBackends ?? [c.backend]).map((b) => registryAliases(type, b, region)));
    out[vendor] = unique([
      c.vendor,
      ...(c.pickerAliases ?? []),
      ...(c.pickerAliasesByRegion?.[region] ?? []),
      ...Object.keys(aliases),
      ...Object.values(aliases),
      ...Object.keys(backendAliases),
      ...(Object.values(backendAliases) as string[]),
      ...(c.pickerExtraIds ?? []),
    ]);
  }
  return out;
}

export function canonicalModelIdsByVendor(configs: Record<string, VendorConfig>): Record<string, string[]> {
  return Object.fromEntries(Object.entries(configs).map(([v, c]) => [v, unique([...c.modelIds, ...(c.pickerExtraIds ?? [])])]));
}

/** 选择器行 id（注册表 id / model_name）归一到 canonical model_id 再比较。 */
export function normalizePickerIds(type: ModelType, config: VendorConfig, region: ReleaseRegion, ids: readonly string[]): string[] {
  const aliases: Record<string, string> = {};
  for (const b of config.pickerBackends ?? [config.backend]) {
    for (const v of variants(type, b, region)) {
      aliases[v.entry.id] = v.modelId;
      if (v.entry.model_name) aliases[v.entry.model_name] = v.modelId;
    }
  }
  return unique(ids.map((id) => aliases[id] ?? id));
}

/** 用户只勾了某些模型时，缺省模型改用勾选里的第一个 canonical id。 */
export function defaultModelForSelection(config: VendorConfig, selected: readonly string[] | undefined): string {
  if (!selected || selected.length === 0) return config.defaultModel;
  const set = new Set(selected);
  if (set.has(config.defaultModel)) return config.defaultModel;
  return config.modelIds.find((m) => set.has(m)) ?? config.defaultModel;
}

// ── 参数规则（manifest 的 parameters，也用来生成 vendorParamHints） ──

export type ParameterRule = {
  model_id?: readonly string[];
  model_name?: readonly string[];
  mode?: readonly string[];
  duration?: readonly number[] | string;
  vendor_params?: Record<string, readonly string[] | string>;
  mode_overrides?: Record<string, Record<string, unknown>>;
  constraints?: readonly string[];
  [k: string]: unknown;
};

const GPT_QUALITIES = ["low", "medium", "high", "xhigh", "max"] as const;
const GPT_BACKGROUNDS = ["auto", "transparent", "opaque"] as const;

export const IMAGE_ASPECT_RATIO_OPTIONS: Record<ImageVendor, readonly string[]> = {
  banana: ["", "1:1", "2:3", "3:2", "3:4", "4:3", "16:9", "9:16", "21:9", "4:5", "5:4"],
  seedream: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"],
  "gpt-image": ["1:1", "16:9", "9:16", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9"],
  midjourney: ["auto", "1:1", "16:9", "9:16", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9"],
};

export const IMAGE_RESOLUTION_OPTIONS: Partial<Record<ImageVendor, readonly string[]>> = {
  banana: ["1K", "2K", "4K"],
  seedream: ["1k", "2k", "4k"],
  "gpt-image": ["1k", "2k", "4k"],
};

export const IMAGE_PARAMETER_RULES: Record<ImageVendor, ParameterRule> = {
  banana: {
    model_id: ["nano_banana_2_flash", "nano_banana_2"],
    vendor_params: { aspect_ratio: IMAGE_ASPECT_RATIO_OPTIONS.banana, resolution: ["1K", "2K", "4K"] },
    constraints: ["resolution takes uppercase 1K/2K/4K; video resolutions such as 720p/1080p are invalid here."],
  },
  seedream: {
    model_id: ["doubao-seedream-5-0-pro-260628", "doubao-seedream-4-5-251128"],
    vendor_params: { aspect_ratio: IMAGE_ASPECT_RATIO_OPTIONS.seedream, resolution: ["1k", "2k", "4k"] },
    constraints: ["The 5.0 Pro model offers 1k/2k; the 4.5 model offers 2k/4k."],
  },
  "gpt-image": {
    model_id: ["gpt-image-2", "gpt-image-2.5-flare", "gpt-image-2.5-sunburst"],
    vendor_params: {
      aspect_ratio: IMAGE_ASPECT_RATIO_OPTIONS["gpt-image"],
      resolution: ["1k", "2k", "4k"],
      quality: GPT_QUALITIES,
      background: GPT_BACKGROUNDS,
    },
    constraints: [
      "resolution takes lowercase 1k/2k/4k and is the output-size knob; quality is the separate compute/cost knob.",
      "quality defaults to medium. Each tier above medium multiplies cost, so raise it only on explicit user request or after the user confirms the extra cost; a workflow or knowledge doc prescribing a tier is not user intent.",
      "quality xhigh/max and background transparent/opaque are only accepted by the 2.5 models (flare, sunburst); gpt-image-2 takes low/medium/high and background auto.",
      "Set background=transparent just for cut-out assets such as a logo, sticker, icon or UI element; otherwise omit it.",
      "There is no native n knob: use top-level count, one image per prompt.",
    ],
  },
  midjourney: {
    model_id: [...MIDJOURNEY_MODEL_IDS],
    vendor_params: {
      aspect_ratio: IMAGE_ASPECT_RATIO_OPTIONS.midjourney,
      stylize: "0..1000 (integer, default 100)",
      chaos: "0..100 (integer, default 0)",
      weird: "0..3000 (integer, default 0)",
    },
    constraints: [
      "The version is chosen by model_id only; do not write version flags into the prompt.",
      "There is no resolution knob.",
    ],
  },
};

export const VIDEO_PARAMETER_RULES: Record<VideoVendor, ParameterRule> = {
  MiniMax: {
    model_id: ["MiniMax-H3", "MiniMax-H3-Max", "MiniMax-H3-Max-Turbo"],
    mode: ["t2v", "i2v", "first-last-frame", "multimodal"],
    duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    vendor_params: {
      resolution: ["480P", "768P", "2K"],
      aspect_ratio: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
      generate_audio: ["true", "false"],
      prompt_expansion_mode: ["disabled", "balanced", "quality"],
    },
    constraints: [
      "model_modes[model_id] is authoritative: H3 does t2v/i2v/first-last-frame/multimodal, H3-Max does t2v/first-last-frame/multimodal, H3-Max-Turbo does t2v/first-last-frame.",
      "Frame modes inherit the frame's ratio: omit aspect_ratio. t2v needs a fixed (non-adaptive) aspect_ratio; H3-Max multimodal may use adaptive.",
      "H3: duration 4..15, resolution 768P/2K (2K when unspecified), generate_audio available. H3-Max family: duration 5..15, resolution 480P/768P (480P when unspecified), prompt_expansion_mode available.",
      "first-last-frame takes only frame images, never reference_* media. H3-Max first-last-frame needs a first frame; the last frame is optional.",
      "multimodal: up to 9 images, 3 videos, 3 audios (videos+audios <= 3). H3-Max needs at least one image or video.",
    ],
  },
  veo3: {
    model_id: ["veo-3.1-fast-generate-001", "veo-3.1-generate-001"],
    mode: ["t2v", "i2v", "first-last-frame"],
    duration: [8],
    vendor_params: { aspect_ratio: ["9:16", "16:9"], resolution: ["720p", "1080p"] },
    constraints: ["Always 8 seconds; aspect ratio is 16:9 or 9:16."],
  },
  seedance: {
    model_id: ["seedance2.0", "seedance2.0-fast", "seedance2.0-mini", "seedance2.5"],
    mode: ["t2v", "i2v", "first-last-frame", "multimodal", "video-edit", "video-extend"],
    duration: "4..15 for the seedance2.0 family, 4..30 for seedance2.5",
    vendor_params: {
      aspect_ratio: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
      resolution: ["480p", "720p", "1080p", "4k"],
      generate_audio: ["true", "false"],
      output_format: ["mp4", "mov"],
    },
    mode_overrides: {
      i2v: { vendor_params: { aspect_ratio: "omit; the input frame's ratio is used." } },
      "first-last-frame": { vendor_params: { aspect_ratio: "omit; the input frames' ratio is used." } },
      "video-edit": {
        duration: "omit; the output keeps the input video's length.",
        vendor_params: { aspect_ratio: "omit; the input video's ratio is used." },
        note: "seedance2.5 only.",
      },
      "video-extend": {
        vendor_params: { aspect_ratio: "omit; the input video's ratio is used." },
        note: "seedance2.5 only. duration is the length of the final video.",
      },
    },
    constraints: [
      "t2v and multimodal need a fixed (non-adaptive) aspect_ratio.",
      "The fast and mini models support 480p/720p only; seedance2.5 supports 480p/720p/1080p; output_format is seedance2.5 only (mp4 default).",
      "Identity/style/scene references go through mode=multimodal with reference_* fields; frame fields are for explicit opening/closing frames only.",
      "multimodal: up to 9 images, 3 videos, 3 audios (12 files total); reference videos total 2..15s, audios <= 15s. seedance2.5 raises this to 30 images, 10 videos, 10 audios, each clip 2..30s and each kind <= 30s.",
      "video-edit / video-extend (seedance2.5): 1..10 reference videos totalling <= 30s; edit inputs 4..30s each, extend inputs 2..30s each. Extension prompts describe only the new continuation.",
      "Reference audio must be mp3 or wav.",
    ],
  },
  jimeng: {
    model_id: ["jimeng_motion_control"],
    mode: ["motion-control"],
    vendor_params: {},
    constraints: [
      "Needs video_url plus first_frame_image (or reference_image_paths[0]). The prompt is not sent upstream: look comes from the image, motion from the video.",
    ],
  },
  kling: {
    model_id: ["kling-video-o1", "kling-v3-omni"],
    mode: ["t2v", "i2v", "first-last-frame", "avatar", "motion-control", "omni"],
    duration: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    vendor_params: {
      mode: ["std", "pro", "4k"],
      aspect_ratio: ["16:9", "9:16", "1:1"],
      sound: ["on", "off"],
      multi_shot: ["true", "false"],
      image_types_json: "JSON array string",
      video_list_json: "JSON array string",
      video_refer_type: ["feature", "base"],
      keep_original_sound: ["yes", "no"],
      character_orientation: ["video", "image"],
    },
    mode_overrides: {
      avatar: {
        duration: "omit; length follows audio_path (up to about 60s per call; split longer speech).",
        required: ["audio_path", "first_frame_image"],
        vendor_params: { mode: ["std", "pro"] },
        note: "Talking-head route: only vendor_params.mode is accepted; ratio follows first_frame_image. Omit model_id.",
      },
      "motion-control": {
        duration: "omit; length follows video_url.",
        required: ["first_frame_image", "video_url"],
        vendor_params: { mode: ["std", "pro"], keep_original_sound: ["yes", "no"], character_orientation: ["video", "image"] },
        note: "Moves the motion of video_url onto the image. Allowed vendor_params: mode, keep_original_sound, character_orientation; nothing else. Leave model_id out.",
      },
    },
    constraints: [
      "kling-video-o1: duration 3..10, no sound=on, no mode=4k, no multi_shot; 11..15s, sound and 4k need kling-v3-omni.",
      "At most 7 images across first/last frame and reference_image_paths, or 4 when a reference video is present.",
      "video_url is one 3..10s reference clip; with video_refer_type=base the output length follows the clip.",
      "audio_path is accepted only with mode=avatar.",
    ],
  },
  wan: {
    model_id: [...WAN3_MODEL_IDS],
    mode: ["t2v", "i2v", "first-last-frame", "multimodal"],
    duration: "2..30",
    vendor_params: {
      resolution: ["480P", "720P", "1080P"],
      aspect_ratio: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"],
      generate_audio: ["true", "false"],
      prompt_extend: ["true", "false"],
      watermark: ["true", "false"],
      seed: "-1 (random) or 0..2147483647",
      file_url: "A single document (docx, pdf, pptx, xlsx, txt, md) given as public link or local file, used as source material in mode=multimodal.",
    },
    constraints: [
      "The two models share one parameter surface; prime is the faster draft variant.",
      "To edit or continue a clip, use mode=multimodal, put the clip in reference_video_urls and describe the change in the prompt; leave aspect_ratio at adaptive for continuations.",
      "Keyframes cannot be combined with reference_* media or file_url; last_frame_image always needs first_frame_image.",
      "An empty prompt is fine only if some media is attached. Limits: 10 images, 5 videos, 5 audios, every clip 1..15s and at most 15s in total per kind. Audio goes in reference_audio_urls; audio_path is refused.",
      "duration is billed per second: always pass it (2..30), including the intended output length when a reference video is attached.",
      "Prompts may address inputs positionally as 图1 / 视频1 / 音频1, numbered per media kind.",
      "wan2.6-i2v is retired; use wan3.0-video.",
    ],
  },
};

export const AUDIO_PARAMETER_RULES: Record<string, ParameterRule> = {
  [BACKEND.speechTts]: { model_name: ["speech-2.8-hd", "speech-2.8-turbo"], speeds: "0.5..2", vols: "0..10", pitches: "-12..12" },
  [BACKEND.musicGen]: { model_id: ["music-3.0"], mode: ["song", "instrumental"], vendor_params: {} },
};

// ── vendorParamHints（推给 gateway 的 UI 参数提示） ──

type Hint = { type: "enum"; values: string[] } | { type: "range"; min: number; max: number };

function enumHint(values: readonly (string | number)[]): Hint | undefined {
  const v = unique(values.map(String));
  return v.length > 0 ? { type: "enum", values: v } : undefined;
}

function durationHint(value: ParameterRule["duration"]): Hint | undefined {
  if (Array.isArray(value)) return enumHint(value);
  const m = typeof value === "string" ? value.match(/^(\d+)\.\.(\d+)$/) : null;
  return m ? { type: "range", min: Number(m[1]), max: Number(m[2]) } : undefined;
}

function hintsFromRule(rule: ParameterRule): Record<string, Hint> {
  const out: Record<string, Hint> = {};
  const add = (k: string, h: Hint | undefined) => h && (out[k] = h);
  if (rule.model_id) add("model_id", enumHint(rule.model_id));
  if (rule.mode) add("mode", enumHint(rule.mode));
  add("duration", durationHint(rule.duration));
  for (const [k, v] of Object.entries(rule.vendor_params ?? {})) if (Array.isArray(v)) add(k, enumHint(v));
  return out;
}

export function buildVendorParamHints(type: "image" | "video"): Record<string, Record<string, Hint>> | undefined {
  const rules: Record<string, ParameterRule> = type === "image" ? IMAGE_PARAMETER_RULES : VIDEO_PARAMETER_RULES;
  const out: Record<string, Record<string, Hint>> = {};
  for (const [vendor, rule] of Object.entries(rules)) {
    const h = hintsFromRule(rule);
    if (Object.keys(h).length > 0) out[vendor] = h;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
