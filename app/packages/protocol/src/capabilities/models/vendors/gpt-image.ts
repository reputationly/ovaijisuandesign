/**
 * gpt-image（图像）的能力表。
 *
 * 模型：`gpt-image-2.5-sunburst`、`gpt-image-2`、`gpt-image-2.5-flare`（共 3 个）。
 * `params` 描述界面能给用户看哪些可调项；`prepare` 把用户的选择翻译成
 * 后端认的请求体（参数一律是字符串字典，见 `capabilities/request` 的 `wire`）。
 *
 * 本文件由 v3 preload 产物还原（../packages/protocol/dist/capabilities/models/vendors/gpt-image.js），类型是按各厂商实际用法补的，见 `shared.ts`。
 */
import { BACKEND_OPENAI } from "../../../backend-ids.js";
import { enumParam } from "../vendor.js";
import { IMAGE_ASPECT_RATIO, IMAGE_RESOLUTION, VendorEntry } from "./shared.js";
import { wire } from "../../request.js";
import { resolution } from "../../tools/image.js";
import { media } from "../../../project-v3/task-mappers.js";

const GPT_IMAGE_BASE_QUALITIES = ["low", "medium", "high"];
const GPT_IMAGE_EXTENDED_QUALITIES = ["low", "medium", "high", "xhigh", "max"];
const GPT_IMAGE_BASE_BACKGROUNDS = ["auto", "opaque"];
const GPT_IMAGE_EXTENDED_BACKGROUNDS = ["auto", "transparent", "opaque"];
const GPT_IMAGE_25_MODEL_IDS = /* @__PURE__ */ new Set([
  "gpt-image-2.5-flare",
  "gpt-image-2.5-sunburst"
]);
function qualitySchema(modelId: string) {
  const is25 = GPT_IMAGE_25_MODEL_IDS.has(modelId);
  return {
    ...enumParam(is25 ? GPT_IMAGE_EXTENDED_QUALITIES : GPT_IMAGE_BASE_QUALITIES, "Compute and cost tier, independent of output resolution. A tier above this model's default increases cost and requires the user's requested tier or acceptance of a cost proposal."),
    default: is25 ? "high" : "medium"
  };
}
function resolutionSchema(modelId: string) {
  return {
    ...IMAGE_RESOLUTION(["1k", "2k", "4k"]),
    default: GPT_IMAGE_25_MODEL_IDS.has(modelId) ? "2k" : "1k"
  };
}
export const gptImage: VendorEntry = {
  vendor: "gpt-image",
  modality: "image",
  backend: BACKEND_OPENAI,
  knowledgeCard: "vendors/gpt-image.md",
  // Sunburst is the default; the other variants require an explicit user choice.
  // Domestic registry ids are g-image-*, but their model_name is gpt-image-*,
  // so one set serves both regions.
  models: {
    "gpt-image-2.5-sunburst": {
      description: "Default image model unless the user explicitly requests another model. Strong in subject consistency across edits and scenes, in-image text and layout including dense CJK text, infographics and UI, style transfer, photoreal character anchors and multi-reference composition. Supports transparent backgrounds."
    },
    "gpt-image-2": {
      description: "Use only when explicitly requested by the user. Strong in photorealism, subject consistency across scenes, in-image text and layout, style transfer and multi-reference composition. Older variant without transparent backgrounds or the highest quality tiers.",
      params: {
        resolution: resolutionSchema("gpt-image-2"),
        quality: qualitySchema("gpt-image-2"),
        background: enumParam(GPT_IMAGE_BASE_BACKGROUNDS, "Both auto and opaque produce an opaque background. Transparent output requires a model with alpha-channel support.")
      }
    },
    "gpt-image-2.5-flare": {
      description: "Use only when explicitly requested by the user. Faster than gpt-image-2.5-sunburst, but slightly weaker on complex tasks, exacting image-quality requirements and fine-detail edits. Suited to everyday visuals and rapid iteration. Supports transparent backgrounds."
    }
  },
  params: {
    aspect_ratio: IMAGE_ASPECT_RATIO([
      "1:1",
      "16:9",
      "9:16",
      "3:4",
      "4:3",
      "3:2",
      "2:3",
      "5:4",
      "4:5",
      "21:9"
    ]),
    resolution: resolutionSchema("gpt-image-2.5-sunburst"),
    quality: qualitySchema("gpt-image-2.5-sunburst"),
    background: {
      ...enumParam(GPT_IMAGE_EXTENDED_BACKGROUNDS, "Background handling. transparent produces an alpha channel when the user requests transparent output; otherwise leave the default background."),
      default: "auto"
    }
  },
  prepare: ({ modelId, prompt, params, media: media2 }) => {
    const is25 = GPT_IMAGE_25_MODEL_IDS.has(modelId);
    const { background, ...rest } = params;
    return {
      backend: BACKEND_OPENAI,
      model_id: modelId,
      prompt,
      params: wire({
        ...rest,
        ...is25 || background !== "opaque" ? { background } : {},
        model_name: modelId,
        n: 1
      }),
      image_paths: [...media2.image]
    };
  }
};

