/**
 * seedance（视频）的能力表。
 *
 * 模型：`seedance2.0`、`seedance2.0-fast`、`seedance2.0-mini`、`seedance2.5`（共 4 个）。
 * `params` 描述界面能给用户看哪些可调项；`prepare` 把用户的选择翻译成
 * 后端认的请求体（参数一律是字符串字典，见 `capabilities/request` 的 `wire`）。
 *
 * 本文件由 v3 preload 产物还原（../packages/protocol/dist/capabilities/models/vendors/seedance.js），类型是按各厂商实际用法补的，见 `shared.ts`。
 */
import { BACKEND_SEEDANCE } from "../../../backend-ids.js";
import { TRUE_FALSE, durationParam, enumParam } from "../vendor.js";
import { VIDEO_ASPECT_RATIO, VIDEO_AUDIO, VIDEO_RESOLUTION, VendorEntry, VendorPrepareRequest } from "./shared.js";
import { jsonList, wire } from "../../request.js";
import { resolution } from "../../tools/image.js";
import { kind, media } from "../../../project-v3/task-mappers.js";

const DRAFT_RESOLUTIONS = ["480p", "720p"];
const ADAPTIVE = "adaptive";
function prepareSeedance({ modelId, prompt, params, media: media2, mode }: VendorPrepareRequest) {
  const is25 = modelId === "seedance2.5";
  const { image, video, audio } = media2;
  const frames = mode === "first-last-frame";
  const edits = mode === "video-edit" || mode === "video-extend";
  const inherits = is25 && (edits || frames && image.length > 0);
  return {
    backend: BACKEND_SEEDANCE,
    model_id: modelId,
    prompt,
    params: wire({
      ...params,
      aspect_ratio: inherits ? ADAPTIVE : params.aspect_ratio,
      mode,
      model_name: modelId,
      omni_reference_task_type: is25 && mode === "reference" ? "reference" : undefined,
      ...frames ? {} : {
        reference_images: jsonList(image),
        reference_videos: jsonList(video),
        reference_audios: jsonList(audio)
      }
    }),
    image_paths: frames ? [...image] : []
  };
}
export const seedance: VendorEntry = {
  vendor: "seedance",
  modality: "video",
  backend: BACKEND_SEEDANCE,
  knowledgeCard: "vendors/seedance.md",
  videoTailTrim: true,
  models: {
    "seedance2.0": {
      description: "Use only when explicitly requested by the user. For multi-shot storytelling and multi-reference guidance with native audio. Supports video editing and video continuation through reference inputs.",
      params: { mode: ["reference", "first-last-frame"], output_format: null }
    },
    "seedance2.0-fast": {
      description: "Use only when explicitly requested by the user. For fast drafts of multi-shot storytelling and multi-reference guidance with native audio. Lower-resolution alternative to Seedance 2.0; supports video editing and video continuation through reference inputs.",
      params: {
        mode: ["reference", "first-last-frame"],
        resolution: DRAFT_RESOLUTIONS,
        output_format: null
      }
    },
    "seedance2.0-mini": {
      description: "Use only when explicitly requested by the user. For lightweight drafts of multi-shot storytelling and multi-reference guidance with native audio. Lower-resolution alternative to Seedance 2.0; supports video editing and video continuation through reference inputs.",
      params: {
        mode: ["reference", "first-last-frame"],
        resolution: DRAFT_RESOLUTIONS,
        output_format: null
      }
    },
    "seedance2.5": {
      description: "Default video model for short-drama creation unless the user explicitly requests another model. For other video tasks, use only when explicitly requested by the user. Supports longer clips and larger reference sets than Seedance 2.0, with native audio, video editing, video continuation and audio-only reference input. An edit inherits the source duration; for an extension, duration is the final output length.",
      params: {
        resolution: ["480p", "720p", "1080p"],
        duration: {
          ...durationParam(4, 30),
          description: "Output duration in seconds, rounded up and capped at the model maximum; below the minimum is rejected. Defaults to 5. An extension uses the final output length. video-edit inherits the input length and rejects this parameter.",
          default: 5
        }
      },
      paramsNotInMode: { "video-edit": ["duration"] }
    }
  },
  requiredParams: ["mode"],
  referenceDescription: "first-last-frame binds ordered images to the opening and optional closing frame, with no other media. Only seedance2.5 accepts audio-only reference input; audio references on the 2.0 variants require an image or video. video-edit and video-extend require video references; the first video is the continuation source for video-extend. For the 2.0 variants, reference videos total 2..15 seconds and reference audios total at most 15 seconds.",
  params: {
    mode: enumParam(["reference", "first-last-frame", "video-edit", "video-extend"], "Input handling: reference accepts guidance media or a prompt alone. On the 2.0 variants, reference with a source video edits or extends that video as the prompt describes; on seedance2.5, reference only uses videos as guidance and never edits a source video. first-last-frame binds opening and optional closing frames. When offered (seedance2.5 only), video-edit and video-extend edit or extend the first reference video; use them for any seedance2.5 edit or extension."),
    aspect_ratio: {
      ...VIDEO_ASPECT_RATIO([ADAPTIVE, "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"]),
      description: "Output frame ratio. Defaults to adaptive: it follows the reference media, or the model picks one without any. Editing or extending a source video requires adaptive, as do seedance2.5 first-last-frame inputs with frame images; omit aspect_ratio for them. Pass a fixed ratio only to frame new footage explicitly.",
      default: ADAPTIVE
    },
    resolution: { ...VIDEO_RESOLUTION(["480p", "720p", "1080p", "4k"]), default: "720p" },
    audio: VIDEO_AUDIO,
    output_format: { ...enumParam(["mp4", "mov"], "Output container."), default: "mp4" },
    duration: { ...durationParam(4, 15), default: 5 }
  },
  native: {
    mode: { kind: "enum", name: "image_mode" },
    audio: { kind: "boolean", name: "generate_audio", values: TRUE_FALSE }
  },
  prepare: prepareSeedance
};

