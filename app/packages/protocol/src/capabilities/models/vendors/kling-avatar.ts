/**
 * kling（视频）的能力表。
 *
 * 模型：`kling-avatar`（共 1 个）。
 * `params` 描述界面能给用户看哪些可调项；`prepare` 把用户的选择翻译成
 * 后端认的请求体（参数一律是字符串字典，见 `capabilities/request` 的 `wire`）。
 *
 * 本文件由 v3 preload 产物还原（../packages/protocol/dist/capabilities/models/vendors/kling-avatar.js），类型是按各厂商实际用法补的，见 `shared.ts`。
 */
import { BACKEND_KLING_AVATAR } from "../../../backend-ids.js";
import { enumParam } from "../vendor.js";
import { KLING_NATIVE } from "./kling.js";
import { wire } from "../../request.js";
import { media } from "../../../project-v3/task-mappers.js";
import type { VendorEntry } from "./shared.js";

export const klingAvatar: VendorEntry = {
  vendor: "kling",
  modality: "video",
  backend: BACKEND_KLING_AVATAR,
  knowledgeCard: "vendors/kling-omni.md",
  models: {
    "kling-avatar": {
      description: "Use only when explicitly requested by the user. For audio-driven talking portraits and lip-synced delivery. Uses one portrait image and one audio track; output duration follows the audio."
    }
  },
  referenceDescription: "The image defines the portrait; the audio drives speech and determines output duration.",
  params: {
    quality_tier: {
      ...enumParam(["std", "pro"], "Output resolution: std=720p (default), pro=1080p. A tier above the default increases cost and requires the user's requested tier or acceptance of a cost proposal."),
      default: "std"
    }
  },
  native: KLING_NATIVE,
  prepare: ({ modelId, prompt, params, media: media2 }) => ({
    backend: BACKEND_KLING_AVATAR,
    model_id: modelId,
    prompt,
    params: wire({ ...params, type: "avatar", sound_file: media2.audio[0] }),
    image_paths: [...media2.image]
  })
};

