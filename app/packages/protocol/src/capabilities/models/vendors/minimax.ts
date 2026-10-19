/**
 * MiniMax（视频）的能力表。
 *
 * 模型：`MiniMax-H3`、`MiniMax-H3-Max`、`MiniMax-H3-Max-Turbo`、`first-last-frame`…（共 5 个）。
 * `params` 描述界面能给用户看哪些可调项；`prepare` 把用户的选择翻译成
 * 后端认的请求体（参数一律是字符串字典，见 `capabilities/request` 的 `wire`）。
 *
 * 本文件由 v3 preload 产物还原（../packages/protocol/dist/capabilities/models/vendors/minimax.js），类型是按各厂商实际用法补的，见 `shared.ts`。
 */
import { BACKEND_MINIMAX_V3 } from "../../../backend-ids.js";
import { TRUE_FALSE, durationParam, enumParam, upperCased } from "../vendor.js";
import { VIDEO_ASPECT_RATIO, VIDEO_AUDIO, VIDEO_RESOLUTION, VendorEntry, VendorPrepareRequest } from "./shared.js";
import { jsonList, reject, wire } from "../../request.js";
import { resolution } from "../../tools/image.js";
import { kind, media, phase } from "../../../project-v3/task-mappers.js";

const FIXED_RATIOS = "16:9, 4:3, 1:1, 3:4, 9:16, 21:9";
function prepareMiniMax({ modelId, prompt, params, references, media: media2, mode }: VendorPrepareRequest) {
  const scope = modelId;
  const standard = modelId === "MiniMax-H3";
  const frames = mode === "first-last-frame";
  const reference = mode === "reference";
  if (!standard && !(prompt ?? '').trim())
    reject(`${scope} requires a non-empty prompt.`);
  const ratio = params.aspect_ratio ?? "adaptive";
  if (!frames && ratio === "adaptive" && !standard && !reference)
    reject(`${scope} mode=${mode} requires a fixed params.aspect_ratio. Pass one of: ${FIXED_RATIOS}.`);
  const { image, video, audio } = media2;
  if (standard && !prompt.trim() && !image.length && !video.length && !audio.length)
    reject(`${scope} requires a prompt or reference media.`);
  if (reference && !standard && !image.length && !video.length)
    reject(`${scope} mode=reference requires at least one reference image or video.`);
  return {
    backend: BACKEND_MINIMAX_V3,
    model_id: modelId,
    prompt,
    params: wire({
      ...params,
      aspect_ratio: frames ? "adaptive" : ratio,
      mode,
      ...reference ? {
        reference_images: jsonList(image),
        reference_videos: jsonList(video),
        reference_audios: jsonList(audio)
      } : {}
    }),
    // The Backend reads an empty opening frame as the empty path before the closing one.
    image_paths: frames ? [...references[0] === null ? [""] : [], ...image] : []
  };
}
export const minimax: VendorEntry = {
  vendor: "MiniMax",
  modality: "video",
  backend: BACKEND_MINIMAX_V3,
  knowledgeCard: "vendors/minimax.md",
  models: {
    "MiniMax-H3": {
      description: "Default video model unless the user explicitly requests another model; for short-drama creation, default to seedance2.5 instead. Strong in photoreal human faces and close-ups. Supports video editing and video continuation through reference inputs.",
      params: {
        mode: ["reference", "first-last-frame"],
        resolution: { ...VIDEO_RESOLUTION(["768p", "2k"]), default: "2k" },
        prompt_expansion_mode: null
      },
      // Upstream rejects any H3 request without text: "content 必须包含一个非空 text 项(prompt 必填)
      // (2013)", seen live for first-last-frame and for reference with one image
      // (traceId 6ac8a97f00000000a4b5f06fe56dce92). Prompt-only generation is reference mode.
      promptModes: { reference: "required", "first-last-frame": "required" },
      paramDerivations: [
        // Legacy popover: a frame request with a prompt but no frame is text-only generation.
        {
          phase: "submit",
          when: { mode: ["first-last-frame"], references: "none", prompt: "some" },
          set: { mode: { value: "reference" } }
        },
        // Text-only generation (reference without material) carries a fixed ratio upstream.
        {
          phase: "submit",
          when: {
            mode: ["reference"],
            references: "none",
            paramIn: { aspect_ratio: ["adaptive"] }
          },
          set: { aspect_ratio: { from: "firstOption", exclude: ["adaptive"] } }
        }
      ]
    },
    "MiniMax-H3-Max": {
      description: "Use only when explicitly requested by the user. For higher-tier MiniMax rendering. Supports video editing through reference inputs.",
      params: {
        mode: ["text-to-video", "first-last-frame", "reference"],
        resolution: { ...VIDEO_RESOLUTION(["480p", "768p"]), default: "768p" },
        audio: null,
        duration: { ...durationParam(5, 15), default: 5 }
      },
      // With audioNeedsVisual from the contract, at least one image or video.
      minReferencesInMode: { reference: 1 },
      paramDerivations: [
        {
          phase: "submit",
          when: { mode: ["first-last-frame"], references: "none", prompt: "some" },
          set: { mode: { value: "text-to-video" } }
        }
      ]
    },
    "MiniMax-H3-Max-Turbo": {
      description: "Use only when explicitly requested by the user. For fast MiniMax drafts using text or opening and closing frames. General reference input and video editing are not supported.",
      params: {
        mode: ["text-to-video", "first-last-frame"],
        resolution: { ...VIDEO_RESOLUTION(["480p", "768p"]), default: "768p" },
        audio: null,
        duration: { ...durationParam(5, 15), default: 5 }
      },
      paramDerivations: [
        {
          phase: "submit",
          when: { mode: ["first-last-frame"], references: "none", prompt: "some" },
          set: { mode: { value: "text-to-video" } }
        }
      ]
    }
  },
  requiredParams: ["mode"],
  paramValuesInMode: {
    "first-last-frame": { aspect_ratio: ["adaptive"] },
    "text-to-video": { aspect_ratio: FIXED_RATIOS.split(", ") }
  },
  lastFrameOnly: true,
  referenceDescription: "first-last-frame binds ordered images to the opening and optional closing frame, with no other media. For standard H3 continuation, pass one source video in reference mode and describe the subsequent action. In reference mode the H3 Max family needs an image or video; audio-only input is not supported.",
  params: {
    mode: enumParam(["reference", "first-last-frame", "text-to-video"], "Input handling: reference uses guidance media, including a source video for editing. Standard H3 also generates from a prompt alone or continues a source video in reference. first-last-frame binds input frames. The H3 Max family uses text-to-video for prompt-only generation."),
    resolution: {
      ...VIDEO_RESOLUTION(["480p", "768p", "2k"]),
      description: "Output size tier. MiniMax-H3 defaults to 2k; the H3 Max family defaults to 768p. A tier above the default increases cost and requires the user's requested tier or acceptance of a cost proposal."
    },
    aspect_ratio: {
      ...VIDEO_ASPECT_RATIO(["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"]),
      description: "Output frame ratio. Defaults to adaptive: it follows the references, or 16:9 without them. first-last-frame uses the source frame; a fixed ratio is rejected. The H3 Max family requires a fixed ratio for text-to-video.",
      default: "adaptive"
    },
    audio: VIDEO_AUDIO,
    prompt_expansion_mode: {
      ...enumParam(["disabled", "balanced", "quality"], "Prompt expansion mode."),
      default: "disabled"
    },
    duration: {
      ...durationParam(4, 15),
      description: "Output duration in seconds, rounded up and capped at the model maximum; below the minimum is rejected. Defaults to 5.",
      default: 5
    }
  },
  native: {
    mode: { kind: "enum", name: "image_mode" },
    resolution: { kind: "enum", values: upperCased("480p", "768p", "2k") },
    audio: { kind: "boolean", name: "generate_audio", values: TRUE_FALSE }
  },
  prepare: prepareMiniMax
};

