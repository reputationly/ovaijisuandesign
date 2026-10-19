/**
 * veo3（视频）的能力表。
 *
 * 模型：`veo-3.1-fast-generate-001`、`veo-3.1-generate-001`（共 2 个）。
 * `params` 描述界面能给用户看哪些可调项；`prepare` 把用户的选择翻译成
 * 后端认的请求体（参数一律是字符串字典，见 `capabilities/request` 的 `wire`）。
 *
 * 本文件由 v3 preload 产物还原（../packages/protocol/dist/capabilities/models/vendors/veo.js），类型是按各厂商实际用法补的，见 `shared.ts`。
 */
import { BACKEND_VEO3 } from "../../../backend-ids.js";
import { durationParam } from "../vendor.js";
import { VIDEO_ASPECT_RATIO, VIDEO_RESOLUTION, VendorEntry } from "./shared.js";
import { wire } from "../../request.js";
import { resolution } from "../../tools/image.js";
import { media } from "../../../project-v3/task-mappers.js";

export const veo: VendorEntry = {
  vendor: "veo3",
  modality: "video",
  backend: BACKEND_VEO3,
  knowledgeCard: "vendors/veo.md",
  models: {
    "veo-3.1-fast-generate-001": {
      description: "Use only when explicitly requested by the user. For cinematic, photoreal single shots. Faster Veo variant for iteration; supports opening and closing frames. Less suited to multi-shot storytelling; general reference input is not supported."
    },
    "veo-3.1-generate-001": {
      description: "Use only when explicitly requested by the user. For cinematic, photoreal single shots. Higher-quality Veo variant for final hero shots; supports opening and closing frames. Less suited to multi-shot storytelling; general reference input is not supported."
    }
  },
  referenceOverrides: { min: 0, max: 2, kinds: { image: 2 } },
  referenceDescription: "Without images, generates from the prompt alone. The first image anchors the opening frame and an optional second image anchors the closing frame; they are not general style references.",
  params: {
    aspect_ratio: { ...VIDEO_ASPECT_RATIO(["9:16", "16:9"]), default: "16:9" },
    resolution: { ...VIDEO_RESOLUTION(["720p", "1080p"]), default: "720p" },
    duration: { ...durationParam(8, 8), default: 8 }
  },
  prepare: ({ modelId, prompt, params, media: media2 }) => ({
    backend: BACKEND_VEO3,
    model_id: modelId,
    prompt,
    params: wire({ ...params, model_name: modelId }),
    // Every veo mode is text or frames: the frames are the whole image input.
    image_paths: [...media2.image]
  })
};

