/**
 * kling（视频）的能力表。
 *
 * 模型：`kling-v3-omni`（共 1 个）。
 * `params` 描述界面能给用户看哪些可调项；`prepare` 把用户的选择翻译成
 * 后端认的请求体（参数一律是字符串字典，见 `capabilities/request` 的 `wire`）。
 *
 * 本文件由 v3 preload 产物还原（../packages/protocol/dist/capabilities/models/vendors/kling.js），类型是按各厂商实际用法补的，见 `shared.ts`。
 */
import { BACKEND_KLING } from "../../../backend-ids.js";
import { TRUE_FALSE, booleanParam, durationParam, enumParam } from "../vendor.js";
import { VIDEO_ASPECT_RATIO, VIDEO_AUDIO, VendorEntry, VendorPrepareRequest } from "./shared.js";
import { reject, wire } from "../../request.js";
import { kind, media } from "../../../project-v3/task-mappers.js";

function prepareKling(request: VendorPrepareRequest) {
  const { modelId, prompt, media: media2 } = request;
  const scope = modelId;
  const { video_refer_type, keep_source_audio, audio, ...params } = request.params;
  const video = media2.video[0];
  const referType = video_refer_type ?? "base";
  if (video && referType === "base" && params.multi_shot === true)
    reject(`${scope} base video reference mode does not support multi_shot=true.`);
  return {
    backend: BACKEND_KLING,
    model_id: modelId,
    prompt,
    params: wire({
      ...params,
      model_name: modelId,
      ...video ? {
        video_list_json: [
          {
            local_path: video,
            refer_type: referType,
            // The list is one opaque JSON param, so it carries Kling's own
            // spelling instead of going through the top-level translation.
            ...keep_source_audio === undefined ? {} : {
              keep_original_sound: KLING_NATIVE.keep_source_audio.values[String(keep_source_audio) === "true" ? "true" : "false"]
            }
          }
        ]
      } : { audio }
    }),
    image_paths: [...media2.image]
  };
}
export const KLING_NATIVE = {
  audio: { kind: "boolean", name: "sound", values: { true: "on", false: "off" } },
  keep_source_audio: {
    kind: "boolean",
    name: "keep_original_sound",
    values: { true: "yes", false: "no" }
  },
  quality_tier: { kind: "enum", name: "mode", values: { std: "std", pro: "pro", max: "4k" } },
  multi_shot: { kind: "boolean", values: TRUE_FALSE }
};
export const kling: VendorEntry = {
  vendor: "kling",
  modality: "video",
  backend: BACKEND_KLING,
  knowledgeCard: "vendors/kling-omni.md",
  models: {
    "kling-v3-omni": {
      description: "Use only when explicitly requested by the user. For subject and product consistency, multi-reference guidance and multi-shot storytelling with native audio. Supports video editing; native audio generation is unavailable with a video reference. With a video reference, video_refer_type=base inherits the source duration; feature caps output at 10 seconds."
    }
  },
  referenceDescription: "Images guide the generated video as references. A source video can be edited using video_refer_type=base. When a video reference is present, at most four image references may accompany it. A reference video must be 3..10 seconds and at most 200MB.",
  params: {
    quality_tier: {
      ...enumParam(["std", "pro", "max"], "Output resolution: std=720p, pro=1080p (default), max=4K. A tier above the default increases cost and requires the user's requested tier or acceptance of a cost proposal."),
      default: "pro"
    },
    aspect_ratio: { ...VIDEO_ASPECT_RATIO(["16:9", "9:16", "1:1"]), default: "16:9" },
    audio: {
      ...VIDEO_AUDIO,
      description: "Native audio generation switch. Ignored when a video reference is supplied; keep_source_audio controls that source audio instead.",
      default: false
    },
    multi_shot: {
      ...booleanParam("Multi-shot switch. true is rejected with a video reference using video_refer_type=base."),
      default: false
    },
    video_refer_type: enumParam(["feature", "base"], "Video reference use: feature guides a new output; base edits the source and retains its length. Defaults to base when a video is supplied; ignored without one."),
    keep_source_audio: booleanParam("Whether to retain the reference video audio. Ignored without a video reference."),
    duration: {
      ...durationParam(3, 15),
      description: "Output duration in seconds, rounded up and capped at the model maximum; below the minimum is rejected. Defaults to 5. With video_refer_type=feature the output is capped at 10 seconds; base uses the source length and ignores duration.",
      default: 5
    }
  },
  native: KLING_NATIVE,
  prepare: prepareKling
};

