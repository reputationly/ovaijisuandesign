import type { ReleaseRegion } from "../env.js";

/**
 * 音频模型目录（语音 / 音乐）。list_capabilities 与音频选择器守卫共用。
 * id / seriesId / backend / model_name 是接口事实（选择器勾选的就是这些 id）；
 * 真正能用哪些模型以 gateway 的 /api/models 为准，这里只是静态清单。
 */
export interface AudioModelEntry {
  id: string;
  name: string;
  seriesId?: string;
  backend: string;
  model_name?: string;
  region?: ReleaseRegion;
  /** 这个模型属于哪类音频能力。 */
  kind?: "tts" | "music" | "audio-extension";
  promptMaxLength?: number;
  /** 参考图上限。 */
  max_refs?: number;
  /** 参考音频上限。 */
  max_audio_refs?: number;
}

export const BACKEND_V3 = "minimax_v3";
export const BACKEND_TTS = "minimax_tts";
export const BACKEND_SEEDAUDIO = "seedaudio";
export const BACKEND_MUSIC = "minimax_music";
export const BACKEND_ELEVENLABS_MUSIC = "elevenlabs_music";

export const AUDIO_MODELS: readonly AudioModelEntry[] = [
  // 参考音频续写
  {
    id: "MiniMax-H3 Audio",
    name: "H3 Audio",
    seriesId: "MiniMax",
    backend: BACKEND_V3,
    model_name: "MiniMax-H3 Audio",
    kind: "audio-extension",
    max_refs: 0,
    max_audio_refs: 1,
  },
  { id: "speech-2.8-hd", name: "Speech-2.8-HD", seriesId: "official-speech", backend: BACKEND_TTS, kind: "tts", max_refs: 0, promptMaxLength: 10_000 },
  {
    id: "seed-audio-1.0",
    name: "Seed Audio 1.0",
    seriesId: "seedaudio",
    backend: BACKEND_SEEDAUDIO,
    model_name: "seed-audio-1.0",
    kind: "tts",
    max_refs: 1,
    max_audio_refs: 3,
    promptMaxLength: 3_000,
  },
  {
    id: "music-3.0",
    name: "Music-3.0",
    seriesId: "official-music",
    backend: BACKEND_MUSIC,
    model_name: "music-3.0",
    kind: "music",
    max_refs: 0,
    promptMaxLength: 2_000,
  },
  {
    id: "elevenlabs-music-v2",
    name: "ElevenLabs Music v2",
    seriesId: "elevenlabs-music",
    backend: BACKEND_ELEVENLABS_MUSIC,
    model_name: "music_v2",
    kind: "music",
    max_refs: 0,
    promptMaxLength: 2_000,
  },
];

/** 选择器按系列勾选；系列 → 具体模型 id。 */
export const AUDIO_SERIES_MODELS: Readonly<Record<string, string[]>> = (() => {
  const out: Record<string, string[]> = {};
  for (const m of AUDIO_MODELS) (out[m.seriesId ?? m.id] ??= []).push(m.id);
  return out;
})();

/** 按 vendor 分的具体模型 id（语音守卫用；后两个 vendor 是音乐）。 */
export const AUDIO_VENDOR_MODEL_IDS: Readonly<Record<string, readonly string[]>> = {
  speech: ["speech-2.8-hd", "speech-2.8-turbo"],
  seedaudio: ["seed-audio-1.0"],
  official: ["music-3.0"],
  elevenlabs: ["elevenlabs-music-v2"],
};

/**
 * 选择器里可能出现的 id（系列名、别名、具体模型）。守卫先看用户勾没勾这个 vendor，
 * 再看勾没勾具体模型。
 */
export const AUDIO_VENDOR_PICKER_IDS: Readonly<Record<string, readonly string[]>> = {
  speech: ["official-speech", ...(AUDIO_VENDOR_MODEL_IDS.speech ?? [])],
  seedaudio: ["seedaudio", "seed-audio", ...(AUDIO_VENDOR_MODEL_IDS.seedaudio ?? [])],
  official: ["official-music", "music", ...(AUDIO_VENDOR_MODEL_IDS.official ?? [])],
  elevenlabs: ["elevenlabs-music", "11labs", "11labs-music", ...(AUDIO_VENDOR_MODEL_IDS.elevenlabs ?? [])],
};
