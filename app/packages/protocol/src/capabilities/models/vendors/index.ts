/**
 * 厂商能力表的汇总。
 *
 * 分组决定「什么模态下能选到谁」：图像按名字索引（键是模型族名，界面按它分组），
 * 视频按厂商名索引，语音和音乐是列表。
 *
 * `klingAvatar` 不放进 `VIDEO_VENDORS` 而是单独追加 —— 它的键（`klingAvatar`）
 * 和视频那套「按厂商名」的索引不一致，硬塞进去会让那条分组的键名失去意义。
 *
 * 上游产物里这些是不带 `export` 的（preload 只用到其中几个厂商，rollup 把没人用的
 * 导出丢掉了）。定义本身在，所以这里补回导出 —— 它们是这个模块存在的意义。
 */
import { banana } from "./banana.js";
import { elevenlabsMusic } from "./elevenlabs.js";
import { gptImage } from "./gpt-image.js";
import { klingAvatar } from "./kling-avatar.js";
import { kling } from "./kling.js";
import { midjourney } from "./midjourney.js";
import { minimaxAudio } from "./minimax-audio.js";
import { minimax } from "./minimax.js";
import { officialMusic } from "./music.js";
import { seedance } from "./seedance.js";
import { seedream } from "./seedream.js";
import { officialSpeech, seedAudio } from "./speech.js";
import { veo } from "./veo.js";
import { wan } from "./wan.js";

export const IMAGE_VENDORS = {
  "gpt-image": gptImage,
  banana,
  seedream,
  midjourney
};
export const VIDEO_VENDORS = {
  MiniMax: minimax,
  veo3: veo,
  seedance,
  kling,
  wan
};
export const SPEECH_VENDORS = [
  seedAudio,
  officialSpeech,
  minimaxAudio
];
export const MUSIC_VENDORS = [officialMusic, elevenlabsMusic];
export const VENDORS_BY_MODALITY = {
  image: Object.values(IMAGE_VENDORS),
  video: [...Object.values(VIDEO_VENDORS), klingAvatar],
  "audio.tts": SPEECH_VENDORS,
  "audio.music": MUSIC_VENDORS
};
export const VENDORS = Object.values(VENDORS_BY_MODALITY).flat();

