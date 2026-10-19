/**
 * wan（视频）的能力表。
 *
 * 模型：`wan3.0-video`、`wan3.0-video-prime`（共 2 个）。
 * `params` 描述界面能给用户看哪些可调项；`prepare` 把用户的选择翻译成
 * 后端认的请求体（参数一律是字符串字典，见 `capabilities/request` 的 `wire`）。
 *
 * 本文件由 v3 preload 产物还原（../packages/protocol/dist/capabilities/models/vendors/wan.js），类型是按各厂商实际用法补的，见 `shared.ts`。
 */
import { BACKEND_WAN_I2V } from "../../../backend-ids.js";
import { TRUE_FALSE, booleanParam, durationParam, enumParam, upperCased } from "../vendor.js";
import { VIDEO_ASPECT_RATIO, VIDEO_AUDIO, VIDEO_RESOLUTION, VendorEntry, VendorPrepareRequest } from "./shared.js";
import { intInRange, jsonList, reject, wire } from "../../request.js";
import { resolution } from "../../tools/image.js";
import { kind, media } from "../../../project-v3/task-mappers.js";

const WAN3_RESOLUTIONS = ["480p", "720p", "1080p"];
const WAN3_ASPECT_RATIOS = ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"];
const WAN3_MIN_DURATION = 2;
const WAN3_MAX_DURATION = 30;
const WAN3_SEED_MAX = 2147483647;
function prepareWan({ modelId, prompt, params, media: media2, mode }: VendorPrepareRequest) {
  const scope = modelId;
  const { image, video, audio } = media2;
  const hasSource = params.file_url !== undefined;
  if (mode === "first-last-frame" && hasSource)
    reject(`${scope} cannot combine keyframe references with params.file_url. Wan 3.0 rejects that combination upstream. Keep the keyframes and drop params.file_url, or drop the keyframes and use mode=reference.`);
  if (!prompt.trim() && !image.length && !video.length && !audio.length && !hasSource)
    reject(`${scope} needs a prompt or at least one media input.`);
  intInRange(scope, "seed", params.seed, -1, WAN3_SEED_MAX);
  return {
    backend: BACKEND_WAN_I2V,
    model_id: modelId,
    prompt,
    params: wire({
      ...params,
      mode,
      reference_videos: jsonList(video),
      reference_audios: jsonList(audio)
    }),
    // Keyframes, or the reference images: upstream reads image_paths by mode.
    image_paths: [...image]
  };
}
export const wan: VendorEntry = {
  vendor: "wan",
  modality: "video",
  // Wan 3.0 reuses the `wan_i2v` backend id: shipped clients hard-fail their
  // whole catalog on an unknown backend, so model_id alone decides the surface.
  backend: BACKEND_WAN_I2V,
  knowledgeCard: "vendors/wan.md",
  models: {
    "wan3.0-video": {
      description: "Use only when explicitly requested by the user. For Chinese cultural scenes and realistic physical motion with multi-reference guidance. Supports video editing and video continuation through reference inputs; better suited to reference-guided work than prompt-only generation."
    },
    "wan3.0-video-prime": {
      description: "Use only when explicitly requested by the user. For fast drafts of Chinese cultural scenes and realistic physical motion with multi-reference guidance. Supports video editing and video continuation through reference inputs; same controls as Wan 3.0."
    }
  },
  requiredParams: ["mode"],
  // Wan bills every second, so the output length is the Agent's decision;
  // with a source clip a default would also silently cut it.
  agentParams: ["duration"],
  referenceDescription: "Frame modes accept only an opening image and optional closing image in that order; they cannot be combined with other reference media or file_url. A closing frame needs an opening frame.",
  params: {
    mode: enumParam(["reference", "first-last-frame"], "Input handling: reference accepts a prompt alone, media references or file_url; first-last-frame binds opening and optional closing frames. Video editing and extension use reference with a source video and the requested prompt intent."),
    resolution: { ...VIDEO_RESOLUTION(WAN3_RESOLUTIONS), default: "720p" },
    aspect_ratio: {
      ...VIDEO_ASPECT_RATIO(WAN3_ASPECT_RATIOS),
      description: "Output frame ratio. Defaults to adaptive. Use adaptive when continuing a source video; a fixed ratio is rejected upstream for continuation. Other reference-based generation may specify a fixed ratio.",
      default: "adaptive"
    },
    audio: VIDEO_AUDIO,
    prompt_extend: {
      ...booleanParam("Upstream prompt rewriting. Default true; set false to send the prompt verbatim."),
      default: true
    },
    watermark: { ...booleanParam("Watermark switch. Default false."), default: false },
    seed: {
      anyOf: [{ type: "integer" }, { type: "string" }],
      description: `Random seed: -1 for random, otherwise 0..${WAN3_SEED_MAX}.`
    },
    file_url: {
      type: "string",
      description: "Source document as a public URL or local path. Use mode=reference; first-last-frame does not accept it."
    },
    duration: {
      ...durationParam(WAN3_MIN_DURATION, WAN3_MAX_DURATION),
      description: "Intended output duration in seconds, billed per second; always pass it. Rounded up and capped at the model maximum; below the minimum is rejected. With a video reference pass the source length to preserve the clip or a longer length to extend it; reference videos plus the output total at most 30 seconds. Output is 30fps.",
      default: 5
    }
  },
  native: {
    mode: { kind: "enum", name: "image_mode" },
    resolution: { kind: "enum", values: upperCased(...WAN3_RESOLUTIONS) },
    audio: { kind: "boolean", name: "generate_audio", values: TRUE_FALSE },
    prompt_extend: { kind: "boolean", values: TRUE_FALSE },
    watermark: { kind: "boolean", values: TRUE_FALSE }
  },
  prepare: prepareWan
};

