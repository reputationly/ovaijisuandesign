// domestic-param-labels.jsx
import { getRuntimeConfig } from "../infra/runtime-config.js";
import reactExports from "react";
import { AudioLines, Music, Scissors, Video } from "../media-editing/lucide-icon-wraps.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { mergeTailwindClasses as cn } from "../infra/dialog-content.jsx";
import { VIDEO_DISPATCHER_TOOL } from "../chat/use-tool-confirm-settlement.js";
import { resolveMediaTaskCategory } from "../chat/has-structured-success-payload.js";
import { Clapperboard, ImageOutlineIcon } from "../media-editing/package.jsx";
function nextProductionPlanExpanded(expanded, event) {
  if (event === "plan-discovered") return expanded ?? true;
  if (event === "message-sent" || event === "manually-collapsed") return false;
  if (event === "timeline-opened" || event === "manually-expanded") return true;
  return expanded ?? false;
}
export function updateProductionPlanDisclosureState(
  current,
  conversationKey,
  event,
) {
  const expanded = current.get(conversationKey);
  const nextExpanded = nextProductionPlanExpanded(expanded, event);
  if (expanded === nextExpanded) return current;
  const next = new Map(current);
  next.set(conversationKey, nextExpanded);
  return next;
}
export function canOpenProductionPlan(activePlanId, requestedPlanId) {
  return Boolean(activePlanId && requestedPlanId === activePlanId);
}
export function productionPlanDisclosureKey(sessionId) {
  return sessionId ? `session:${sessionId}` : void 0;
}
export const ToolConfirmEditsContext = reactExports.createContext(null);
export const INTERNAL_KEYS = new Set([
  // system-injected / opaque
  "filename",
  "filenames",
  "source_node_id",
  "source_node_ids",
  "cover_feature_id",
  "source_tool",
  "backend",
  "workflow_id",
  "repair_operations",
  "input_bindings",
  "input_values",
  // Capability dispatcher routing / evidence (LLM-only contract).
  "vendor",
  "aspect_ratio_source",
  "aspect_ratio_evidence",
  // TTS micro-adjustments
  "vol",
  "vols",
  "pitch",
  "pitches",
  "pronunciation_dict",
  "voice_modify",
  "voice_modifies",
  // Image diffusion knobs
  "guidance_scale",
  "seed",
  // Video implementation switches
  "shot_type",
  "sequential_frames",
  "should_lip_sync",
  // Kling multi-shot / reference-mode
  "image_types",
  "video_refer_type",
  "keep_original_sound",
  "multi_shot",
  "multi_prompt",
  "character_orientation",
  // Voice clone augmentation
  "need_noise_reduction",
  "need_volume_normalization",
  "demo_text",
  "demo_model",
  "prompt_audio_path",
  "prompt_text",
  // Voice isolation
  "language",
  // merge_videos custom-size knobs (relevant only when scale_mode='custom')
  "target_width",
  "target_height",
]);
export const MODEL_NAME_KEYS = new Set(["model", "model_name", "model_id"]);
const MINIMAX_H3_MODEL_ID = "MiniMax-H3";
const MINIMAX_H3_RESOLUTIONS = ["768P", "2K"];
const BATCH_PROMPT_KEYS = new Set(["prompts", "texts"]);
export const LOCKED_COMFYUI_DRAFT_VALUE = "minimax h3";
export function comfyUiDraftParameters(value) {
  if (!Array.isArray(value)) return [];
  const controls = new Set([
    "text",
    "textarea",
    "number",
    "enum",
    "boolean",
    "media",
  ]);
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const entry = item;
    if (
      typeof entry.node_id !== "string" ||
      typeof entry.parameter !== "string" ||
      typeof entry.label !== "string" ||
      !entry.control ||
      !controls.has(entry.control) ||
      (entry.value !== null &&
        typeof entry.value !== "string" &&
        typeof entry.value !== "number" &&
        typeof entry.value !== "boolean")
    ) {
      return [];
    }
    return [entry];
  });
}
export function comfyUiInputBindings(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const binding = item;
    return typeof binding.node_id === "string" &&
      typeof binding.parameter === "string" &&
      typeof binding.workspace_path === "string"
      ? [binding]
      : [];
  });
}
export function isProtectedComfyUiModelParameter(parameter) {
  return /^(?:model(?:_name|_id)?|ckpt(?:_name)?|checkpoint(?:_name)?|vae(?:_name)?|unet(?:_name)?|clip(?:_name)?|lora(?:_name)?|diffusion_model(?:_name)?)$/i.test(
    parameter,
  );
}
export function comfyUiRunInputValues(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const entry = item;
    return typeof entry.node_id === "string" &&
      typeof entry.parameter === "string" &&
      !isProtectedComfyUiModelParameter(entry.parameter)
      ? [
          {
            node_id: entry.node_id,
            parameter: entry.parameter,
            value: entry.value,
          },
        ]
      : [];
  });
}
export function isComfyUiPromptParameter(parameter) {
  return /(?:^|[._])(?:positive_prompt|negative_prompt|prompt)$/i.test(
    parameter,
  );
}
export function mergeComfyUiInputValues(preflightValues, explicitValues) {
  const values = new Map();
  for (const entry of preflightValues) {
    values.set(`${entry.node_id}:${entry.parameter}`, entry);
  }
  for (const entry of explicitValues) {
    const key = `${entry.node_id}:${entry.parameter}`;
    values.set(key, {
      ...values.get(key),
      ...entry,
    });
  }
  return [...values.values()];
}
export const VENDOR_PARAM_KEYS = new Set([
  // image dispatcher
  "aspect_ratio",
  "resolution",
  // video dispatcher
  "mode",
  "sound",
  "generate_audio",
  // The remaining vendor_params fields (multi_shot / shot_type /
  // image_types_json / multi_prompt_json /
  // video_list_json / video_refer_type / keep_original_sound /
  // character_orientation) are intentionally NOT promoted here — they
  // sit in the PM-decided "advanced" bucket (INTERNAL_KEYS) and never
  // render in the inline card.
]);
export function isVendorParamsObject(vendorParams) {
  return vendorParams != null && typeof vendorParams === "object" && !Array.isArray(vendorParams);
}
function isMiniMaxH3ModelValue(value) {
  return typeof value === "string" && value.trim() === MINIMAX_H3_MODEL_ID;
}
function isMiniMaxH3ConfirmArgs(args) {
  for (const key of MODEL_NAME_KEYS) {
    if (isMiniMaxH3ModelValue(args[key])) return true;
  }
  const vendorParams = args.vendor_params;
  if (isVendorParamsObject(vendorParams)) {
    for (const key of MODEL_NAME_KEYS) {
      if (isMiniMaxH3ModelValue(vendorParams[key])) return true;
    }
  }
  return false;
}
export function withMiniMaxH3ParamHints(args, hints) {
  if (!isMiniMaxH3ConfirmArgs(args)) return hints;
  const resolutionHint = {
    type: "enum",
    values: MINIMAX_H3_RESOLUTIONS,
  };
  if (hints?.resolution?.description) {
    resolutionHint.description = hints.resolution.description;
  }
  return {
    ...hints,
    resolution: resolutionHint,
  };
}
const DOMESTIC_PARAM_LABELS = {
  // content
  prompt: "提示词",
  prompts: "提示词",
  text: "文本",
  texts: "文本",
  lyrics: "歌词",
  positive_prompt: "正向提示词",
  negative_prompt: "负向提示词",
  // model / style
  model: "模型",
  model_name: "模型",
  // Capability dispatcher's canonical model selector
  // (IMAGE_MODEL_ID_ENUM / VIDEO_MODEL_ID_ENUM).
  model_id: "模型",
  style: "风格",
  quality: "质量",
  mode: "模式",
  // geometry / size
  aspect_ratio: "画面比例",
  aspect_ratios: "画面比例",
  resolution: "清晰度",
  // batch / duration
  count: "数量",
  n: "数量",
  seed: "随机种子",
  steps: "采样步数",
  cfg: "提示词引导强度",
  sampler_name: "采样器",
  scheduler: "调度器",
  denoise: "降噪强度",
  duration: "时长",
  durations: "时长",
  // audio toggle
  generate_audio: "带音频",
  sound: "带音频",
  // TTS
  voice_id: "音色",
  voice_ids: "音色",
  speed: "语速",
  speeds: "语速",
  emotion: "情绪",
  emotions: "情绪",
  // media inputs (primary / ref / first-last frame)
  image_path: "图片",
  image_paths: "图片",
  first_frame_image: "首帧图片",
  first_frame_images: "首帧图片",
  first_frame_image_path: "首帧图片",
  last_frame_image: "尾帧图片",
  last_frame_images: "尾帧图片",
  last_frame_image_path: "尾帧图片",
  audio_path: "音频",
  audio_paths: "音频",
  video_path: "视频",
  video_paths: "视频",
  reference_image_paths: "参考图片",
  reference_images: "参考图片",
  reference_video_url: "参考视频",
  reference_video_urls: "参考视频",
  video_url: "驱动视频",
  reference_audio_urls: "参考音频",
  audio: "参考音频",
  // music cover oneshot
  // editing
  scale_mode: "缩放模式",
  // image generation
  background: "背景",
  // DAG
  inputs: "参数",
};
export function getParamLabel(key) {
  if (getRuntimeConfig().region === "domestic") {
    return DOMESTIC_PARAM_LABELS[key] ?? key;
  }
  return key;
}
export const CATEGORY_ICON = {
  imageGen: ImageOutlineIcon,
  videoGen: Video,
  videoEdit: Scissors,
  audioGen: AudioLines,
  musicGen: Music,
  other: Clapperboard,
};
export const resolveTaskCategory = resolveMediaTaskCategory;
export function mediaKindForKey(key) {
  if (
    key === "image_path" ||
    key === "image_paths" ||
    key === "first_frame_image" ||
    key === "first_frame_images" ||
    key === "first_frame_image_path" ||
    key === "last_frame_image" ||
    key === "last_frame_images" ||
    key === "last_frame_image_path" ||
    key === "reference_image_paths" ||
    key === "reference_images"
  ) {
    return "image";
  }
  if (
    key === "video_path" ||
    key === "video_paths" ||
    key === "reference_video_url" ||
    key === "reference_video_urls" ||
    key === "video_url"
  ) {
    return "video";
  }
  if (
    key === "audio_path" ||
    key === "audio_paths" ||
    key === "reference_audio_urls" ||
    key === "audio"
  ) {
    return "audio";
  }
  return void 0;
}
export function acceptForMediaKind(kind) {
  if (kind === "image") return "image/*";
  if (kind === "video") return "video/*";
  if (kind === "audio") return "audio/*";
  return void 0;
}
export function mediaValues(value) {
  if (typeof value === "string" && value.length > 0) {
    if (value.startsWith("[")) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (item) => typeof item === "string" && item.length > 0,
          );
        }
      } catch {}
    }
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.length > 0);
  }
  return [];
}
export function stringifyParamValue(value) {
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value ?? "");
}
export function isInheritedSeedance25Param(tool, args, paramKey) {
  if (
    tool !== VIDEO_DISPATCHER_TOOL ||
    args.vendor !== "seedance" ||
    args.model_id !== "seedance2.5"
  ) {
    return false;
  }
  const mode = args.mode;
  if (paramKey === "aspect_ratio") {
    return (
      mode === "i2v" ||
      mode === "first-last-frame" ||
      mode === "video-edit" ||
      mode === "video-extend"
    );
  }
  return paramKey === "duration" && mode === "video-edit";
}
export function batchPageCountForArgs(args, keys) {
  let count = 1;
  for (const key of keys) {
    const value = args[key];
    if (
      BATCH_PROMPT_KEYS.has(key) &&
      Array.isArray(value) &&
      value.length > count
    ) {
      count = value.length;
    }
  }
  return count;
}
export function valueAtBatchPage(value, pageIndex, pageCount) {
  if (pageCount > 1 && Array.isArray(value) && value.length === pageCount) {
    return value[pageIndex];
  }
  return value;
}
export function mediaItemId(paramKey, index) {
  return `${paramKey}:${index}`;
}
export function uploadedRelativePath(body) {
  if (!body || typeof body !== "object") return void 0;
  const record = body;
  if (typeof record.relative === "string" && record.relative.length > 0)
    return record.relative;
  if (typeof record.path === "string" && record.path.length > 0)
    return record.path;
  return void 0;
}
export function updateIndexedMediaValue(current, index, nextPath) {
  if (!Array.isArray(current)) return nextPath;
  return current.map((item, itemIndex) => (itemIndex === index ? nextPath : item));
}
export function AudioBarsIcon({ className }) {
  return (
    <AudioLines
      aria-hidden="true"
      className={cn("size-4", className)}
      strokeWidth={2}
    />
  );
}
