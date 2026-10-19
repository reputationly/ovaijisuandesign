/**
 * banana（图像）的能力表。
 *
 * 模型：（共 0 个）。
 * `params` 描述界面能给用户看哪些可调项；`prepare` 把用户的选择翻译成
 * 后端认的请求体（参数一律是字符串字典，见 `capabilities/request` 的 `wire`）。
 *
 * 本文件由 v3 preload 产物还原（../packages/protocol/dist/capabilities/models/vendors/banana.js），类型是按各厂商实际用法补的，见 `shared.ts`。
 */
import { BACKEND_NANO_BANANA } from "../../../backend-ids.js";
import { upperCased } from "../vendor.js";
import { IMAGE_ASPECT_RATIO, IMAGE_RESOLUTION, VendorEntry } from "./shared.js";
import { wire } from "../../request.js";
import { resolution } from "../../tools/image.js";
import { kind, media } from "../../../project-v3/task-mappers.js";

export const banana: VendorEntry = {
  vendor: "banana",
  modality: "image",
  backend: BACKEND_NANO_BANANA,
  knowledgeCard: "vendors/banana.md",
  models: {
    nano_banana_2_flash: {
      description: "Use only when explicitly requested by the user. For fast general-purpose exploration, subject consistency across edits and scenes, multi-reference composition, and pose or expression sets. Useful for real-world places and products; less suited to dense in-image text and precise local edits."
    },
    nano_banana_2: {
      description: "Use only when explicitly requested by the user. For higher-quality final images, subject consistency across edits and scenes, multi-reference composition, and pose or expression sets. Slower than Flash; less suited to dense in-image text and precise local edits."
    }
  },
  params: {
    aspect_ratio: IMAGE_ASPECT_RATIO([
      "1:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "16:9",
      "9:16",
      "21:9",
      "4:5",
      "5:4"
    ]),
    resolution: { ...IMAGE_RESOLUTION(["1k", "2k", "4k"]), default: "2k" }
  },
  native: { resolution: { kind: "enum", values: upperCased("1k", "2k", "4k") } },
  prepare: ({ modelId, prompt, params, media: media2 }) => ({
    backend: BACKEND_NANO_BANANA,
    model_id: modelId,
    prompt,
    params: wire({ resolution: "2k", ...params, model_name: modelId }),
    image_paths: [...media2.image]
  })
};

