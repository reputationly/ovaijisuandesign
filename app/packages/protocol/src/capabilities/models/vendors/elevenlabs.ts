/**
 * elevenlabs（音乐）的能力表。
 *
 * 模型：`elevenlabs-music-v2`（共 1 个）。
 * `params` 描述界面能给用户看哪些可调项；`prepare` 把用户的选择翻译成
 * 后端认的请求体（参数一律是字符串字典，见 `capabilities/request` 的 `wire`）。
 *
 * 本文件由 v3 preload 产物还原（../packages/protocol/dist/capabilities/models/vendors/elevenlabs.js），类型是按各厂商实际用法补的，见 `shared.ts`。
 */
import { BACKEND_ELEVENLABS_MUSIC } from "../../../backend-ids.js";
import { enumParam } from "../vendor.js";
import { reject, wire } from "../../request.js";
import { kind } from "../../../project-v3/task-mappers.js";

const MUSIC_MIN_SECONDS = 3;
const MUSIC_MAX_SECONDS = 600;
function musicLengthSeconds(value: string) {
  const match = /^(?:(\d+)s|(\d+)m|(\d{1,2}):(\d{1,2}))$/.exec(value.trim());
  if (!match)
    return undefined;
  const [, seconds, minutes, mm, ss] = match;
  if (seconds !== undefined)
    return Number(seconds);
  if (minutes !== undefined)
    return Number(minutes) * 60;
  return Number(ss) < 60 ? Number(mm) * 60 + Number(ss) : undefined;
}
import type { VendorEntry } from "./shared.js";

export const elevenlabsMusic: VendorEntry = {
  vendor: "elevenlabs",
  modality: "audio.music",
  backend: BACKEND_ELEVENLABS_MUSIC,
  surfaces: ["agent", "canvas"],
  models: {
    "elevenlabs-music-v2": {
      pricing: "music_v2",
      description: "For instrumental background music from a style description, at a chosen length. Does not take vocals, lyrics or references."
    }
  },
  params: {
    mode: enumParam(["instrumental"], "Instrumental music only, without vocals."),
    length: {
      type: "string",
      pattern: "^(auto|[1-9]\\d*[sm]|\\d{1,2}:[0-5]?\\d)$",
      default: "auto",
      description: `Output length: auto (the model decides), Ns, Nm or m:ss; ${MUSIC_MIN_SECONDS}\u2013${MUSIC_MAX_SECONDS}s.`
    }
  },
  native: {
    mode: {
      kind: "enum",
      name: "is_instrumental",
      values: { instrumental: "instrumental" }
    },
    length: { kind: "enum", name: "music_length_ms" }
  },
  prepare: ({ modelId, prompt, params, references }) => {
    if (references.length)
      reject("Music generation does not accept references.");
    const length = typeof params.length === "string" ? params.length : "auto";
    const seconds = musicLengthSeconds(length);
    if (length !== "auto" && (seconds === undefined || seconds < MUSIC_MIN_SECONDS))
      reject(`Music length must be at least ${MUSIC_MIN_SECONDS} seconds.`);
    if (seconds !== undefined && seconds > MUSIC_MAX_SECONDS)
      reject(`Music length must be at most ${MUSIC_MAX_SECONDS} seconds.`);
    return {
      backend: BACKEND_ELEVENLABS_MUSIC,
      model_id: modelId,
      prompt,
      params: wire({
        music_length_ms: length,
        is_instrumental: "instrumental"
      })
    };
  }
};

