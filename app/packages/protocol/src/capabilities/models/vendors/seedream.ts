/**
 * seedream（图像）的能力表。
 *
 * 模型：`doubao-seedream-5-0-pro-260628`（共 1 个）。
 * `params` 描述界面能给用户看哪些可调项；`prepare` 把用户的选择翻译成
 * 后端认的请求体（参数一律是字符串字典，见 `capabilities/request` 的 `wire`）。
 *
 * 本文件由 v3 preload 产物还原（../packages/protocol/dist/capabilities/models/vendors/seedream.js），类型是按各厂商实际用法补的，见 `shared.ts`。
 */
import { BACKEND_SEEDREAM } from "../../../backend-ids.js";
import { IMAGE_ASPECT_RATIO, IMAGE_RESOLUTION, VendorEntry } from "./shared.js";
import { wire } from "../../request.js";
import { resolution } from "../../tools/image.js";
import { media } from "../../../project-v3/task-mappers.js";

export const seedream: VendorEntry = {
  vendor: "seedream",
  modality: "image",
  backend: BACKEND_SEEDREAM,
  knowledgeCard: "vendors/seedream.md",
  models: {
    "doubao-seedream-5-0-pro-260628": {
      description: "Use only when explicitly requested by the user. Lower-priced, but less capable overall than the gpt-image and nano_banana families. Supports local edits, subject consistency across image series, anime/manhwa characters and sketch-to-render work. Supports 1k/2k output. Average photorealism; less suited to dense in-image text and imaginative or creative work.",
      params: { resolution: ["1k", "2k"] }
    }
  },
  params: {
    aspect_ratio: IMAGE_ASPECT_RATIO(["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"]),
    resolution: { ...IMAGE_RESOLUTION(["1k", "2k"]), default: "2k" }
  },
  prepare: ({ modelId, prompt, params, media: media2 }) => ({
    backend: BACKEND_SEEDREAM,
    model_id: modelId,
    prompt,
    params: wire({ resolution: "2k", ...params, model_name: modelId }),
    image_paths: [...media2.image]
  })
};

