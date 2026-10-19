/**
 * official（音乐）的能力表。
 *
 * 模型：`music-3.0`（共 1 个）。
 * `params` 描述界面能给用户看哪些可调项；`prepare` 把用户的选择翻译成
 * 后端认的请求体（参数一律是字符串字典，见 `capabilities/request` 的 `wire`）。
 *
 * 本文件由 v3 preload 产物还原（../packages/protocol/dist/capabilities/models/vendors/music.js），类型是按各厂商实际用法补的，见 `shared.ts`。
 */
import { BACKEND_MINIMAX_MUSIC } from "../../../backend-ids.js";
import { enumParam } from "../vendor.js";
import { reject, wire } from "../../request.js";
import { kind } from "../../../project-v3/task-mappers.js";
import type { VendorEntry } from "./shared.js";

export const officialMusic: VendorEntry = {
  vendor: "official",
  modality: "audio.music",
  backend: BACKEND_MINIMAX_MUSIC,
  knowledgeCard: "vendors/official-music.md",
  models: {
    "music-3.0": {
      description: "For complete vocal songs, instrumental background music, jingles and scores. Supports user-provided lyrics; does not take reference audio."
    }
  },
  params: {
    mode: enumParam(["song", "instrumental"], "song = vocals/music; instrumental = instrumental BGM."),
    lyrics: {
      type: "string",
      description: "Lyrics for mode=song, with structure tags like [verse], [chorus], [bridge]. Write them or use user-provided lyrics, and confirm them with the user first; when omitted the prompt is sung as the lyrics."
    }
  },
  requiredParams: ["mode"],
  native: {
    mode: {
      kind: "enum",
      name: "is_instrumental",
      values: { song: "vocal", instrumental: "instrumental" }
    }
  },
  prepare: ({ modelId, prompt, params, references }) => {
    if (references.length)
      reject("Music generation does not accept references.");
    const lyrics = typeof params.lyrics === "string" ? params.lyrics : "";
    return {
      backend: BACKEND_MINIMAX_MUSIC,
      model_id: modelId,
      prompt,
      params: wire(params.mode === "song" ? { lyrics } : { is_instrumental: "instrumental" })
    };
  }
};

