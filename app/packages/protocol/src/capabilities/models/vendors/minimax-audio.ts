/**
 * minimax-audio（语音合成）的能力表。
 *
 * 模型：`MiniMax-H3 Audio`（共 1 个）。
 * `params` 描述界面能给用户看哪些可调项；`prepare` 把用户的选择翻译成
 * 后端认的请求体（参数一律是字符串字典，见 `capabilities/request` 的 `wire`）。
 *
 * 本文件由 v3 preload 产物还原（../packages/protocol/dist/capabilities/models/vendors/minimax-audio.js），类型是按各厂商实际用法补的，见 `shared.ts`。
 */
import { BACKEND_MINIMAX_V3 } from "../../../backend-ids.js";
import { durationParam } from "../vendor.js";
import { reject, wire } from "../../request.js";
import { media } from "../../../project-v3/task-mappers.js";
import type { VendorEntry } from "./shared.js";

export const minimaxAudio: VendorEntry = {
  vendor: "minimax-audio",
  modality: "audio.tts",
  backend: BACKEND_MINIMAX_V3,
  surfaces: ["canvas"],
  models: {
    "MiniMax-H3 Audio": {
      pricing: "MiniMax-H3-audio-continuation",
      description: "For continuing one source audio clip as the prompt describes, to a longer total length."
    }
  },
  referenceDescription: "Exactly one source audio to continue.",
  params: {
    duration: {
      ...durationParam(5, 20),
      description: "Total output length in seconds, 5..20, at least one second past the source audio."
    }
  },
  requiredParams: ["duration"],
  prepare: ({ modelId, prompt, params, media: media2 }) => {
    if (!prompt.trim())
      reject("Audio continuation needs a prompt describing how to continue.");
    return {
      backend: BACKEND_MINIMAX_V3,
      model_id: modelId,
      prompt,
      params: wire({ duration: params.duration }),
      audio_paths: [...media2.audio]
    };
  }
};

