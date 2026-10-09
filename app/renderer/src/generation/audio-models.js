// audio-models.js
import {
  BACKEND_ELEVENLABS_MUSIC,
  BACKEND_MINIMAX_MUSIC,
  BACKEND_MINIMAX_TTS,
  BACKEND_MINIMAX_V3,
  BACKEND_SEEDAUDIO,
} from "./normalize-skill-detail-metadata.js";

const TTS_VOICE_OPTIONS = [
  "Friendly_Person",
  "Calm_Woman",
  "Energetic_Male",
  "Professional_Female",
  "Deep_Male",
  "Young_Female",
];

const TTS_SPEED_PRESETS = ["0.5", "0.75", "1", "1.25", "1.5", "1.75", "2"];

const TTS_SPEED_SLIDER = {
  type: "slider",
  label: "语速",
  min: 0.5,
  max: 2,
  step: 0.25,
  marks: TTS_SPEED_PRESETS,
  default: "1",
};

const TTS_EMOTIONS_BASIC = [
  "calm",
  "happy",
  "sad",
  "angry",
  "fearful",
  "disgusted",
  "surprised",
  "fluent",
];

const TTS_EMOTION_FIELD = {
  type: "select",
  label: "情绪",
  options: TTS_EMOTIONS_BASIC,
  default: "",
  optional: true,
};

const SEEDAUDIO_SPEED_SLIDER = {
  type: "slider",
  label: "语速",
  min: 0.5,
  max: 2,
  step: 0.1,
  marks: ["0.5", "1", "1.5", "2"],
  default: "1",
};

const SEEDAUDIO_VOLUME_SLIDER = {
  type: "slider",
  label: "音量",
  min: 0.5,
  max: 2,
  step: 0.1,
  marks: ["0.5", "1", "1.5", "2"],
  default: "1",
};

const SEEDAUDIO_PITCH_SLIDER = {
  type: "slider",
  label: "音调",
  min: -12,
  max: 12,
  step: 1,
  marks: ["-12", "0", "12"],
  default: "0",
};

const SEEDAUDIO_SAMPLE_RATE_FIELD = {
  type: "select",
  label: "采样率",
  options: ["8000", "16000", "24000", "32000", "44100", "48000"],
  default: "24000",
};

export const AUDIO_MODELS = [
  // MiniMax H3 reference-audio continuation.
  {
    id: "MiniMax-H3 Audio",
    name: "MiniMax H3 Audio",
    seriesId: "MiniMax",
    backend: BACKEND_MINIMAX_V3,
    model_name: "MiniMax-H3 Audio",
    pricingId: "MiniMax-H3-audio-continuation",
    max_refs: 0,
    max_audio_refs: 1,
    promptLabel: "text",
    params: {
      duration: {
        type: "select",
        label: "时长",
        options: [
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "11",
          "12",
          "13",
          "14",
          "15",
          "16",
          "17",
          "18",
          "19",
          "20",
        ],
        default: "5",
      },
    },
    audioExtension: {
      inputMinDurationSec: 1,
      inputMaxDurationSec: 20,
      outputMinDurationSec: 5,
      outputMaxDurationSec: 20,
    },
  },
  // speech-2.8 系列：当前唯一支持的版本，最高保真度
  {
    id: "speech-2.8-hd",
    name: "Speech-2.8-HD",
    seriesId: "official-speech",
    backend: BACKEND_MINIMAX_TTS,
    max_refs: 0,
    promptLabel: "text",
    promptMaxLength: 1e4,
    params: {
      voice_id: {
        type: "select",
        label: "音色",
        options: TTS_VOICE_OPTIONS,
        default: "Friendly_Person",
      },
      speed: TTS_SPEED_SLIDER,
      emotion: TTS_EMOTION_FIELD,
    },
  },
  // SeedAudio 1.0（字节 openspeech seed-audio）
  // - 参考文件：音频 ≤3（wav/mp3/pcm/ogg_opus，≤30s/≤10MB），或图片 1 张
  //   （jpeg/png/webp，≤10MB）；音频与图片不可同时 ref（popover 侧互斥）。
  // - @音频N 逻辑保持：由用户自己在 text 里写引用，前端/网关不自动注入。
  // - Speed / Volume UI 显示 0.5-2 倍，网关侧映射 (x-1)*100 后透传上游
  //   speech_rate / loudness_rate；Pitch / SampleRate 与上游直接对齐。
  {
    id: "seed-audio-1.0",
    name: "Seed Audio 1.0",
    seriesId: "seedaudio",
    backend: BACKEND_SEEDAUDIO,
    model_name: "seed-audio-1.0",
    max_refs: 1,
    // 参考图最多 1 张
    max_audio_refs: 3,
    // 参考音频最多 3 条
    promptLabel: "text",
    promptMaxLength: 3e3,
    params: {
      speed: SEEDAUDIO_SPEED_SLIDER,
      volume: SEEDAUDIO_VOLUME_SLIDER,
      pitch: SEEDAUDIO_PITCH_SLIDER,
      sample_rate: SEEDAUDIO_SAMPLE_RATE_FIELD,
    },
  },
  // MiniMax Music
  // Proto carries `model` + `is_instrumental`; local gateway forwards both and
  // Go provider reads them. is_instrumental=true skips lyrics and generates a
  // vocal-free track.
  {
    id: "music-3.0",
    name: "Music-3.0",
    seriesId: "official-music",
    backend: BACKEND_MINIMAX_MUSIC,
    model_name: "music-3.0",
    max_refs: 0,
    promptMaxLength: 2e3,
    params: {
      is_instrumental: {
        type: "select",
        label: "canvas.params.musicMode",
        options: ["vocal", "instrumental"],
        default: "vocal",
      },
      lyrics: {
        type: "textarea",
        label: "歌词",
        placeholder: "输入歌词,不填则使用上方描述作为歌词",
        default: "",
      },
    },
  },
  // ElevenLabs Music v2 — prompt-only song generation.
  {
    id: "elevenlabs-music-v2",
    name: "ElevenLabs Music v2",
    seriesId: "elevenlabs-music",
    backend: BACKEND_ELEVENLABS_MUSIC,
    model_name: "music_v2",
    max_refs: 0,
    promptLabel: "musicStyle",
    promptMaxLength: 2e3,
    params: {
      music_length_ms: {
        type: "select",
        label: "canvas.params.duration",
        options: ["auto", "30s", "1m", "2m", "4m", "6m", "custom"],
        default: "auto",
      },
      is_instrumental: {
        type: "select",
        label: "canvas.params.musicMode",
        options: ["auto", "instrumental"],
        default: "auto",
      },
    },
  },
];
