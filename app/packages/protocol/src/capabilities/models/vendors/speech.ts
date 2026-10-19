/**
 * 语音合成的两张能力表：`official`（speech-2.8-hd）与 `seedAudio`（seed-audio-1.0）。
 *
 * 两者同文件是因为它们的入参形状几乎一样（音色、语速、音量、情绪），差别只在
 * 音色目录与参数名 —— 放一起才好比对，改一处时不容易漏另一处。
 *
 * 音色是**外部数据**：真正的可用列表由调用方在生成前查好、通过请求的 `voices` 传进来，
 * 这里只负责校验「给的这个音色确实在目录里」，避免后端报一个看不懂的错。
 *
 * 本文件由 v3 preload 产物还原，类型按实际用法补（见 `shared.ts`）。
 */
import { BACKEND_MINIMAX_TTS, BACKEND_SEEDAUDIO } from "../../../backend-ids.js";
import { enumParam } from "../vendor.js";
import { reject, wire } from "../../request.js";
import { media } from "../../../project-v3/task-mappers.js";

const SPEECH_PARAMS = {
  speed: {
    type: "number",
    minimum: 0.5,
    maximum: 2,
    description: "Speed multiplier per text. Range [0.5, 2]. Default 1.0.",
    default: 1
  },
  pitch: {
    type: "integer",
    minimum: -12,
    maximum: 12,
    description: "Pitch shift in semitones per text. Range [-12, 12]. Default 0."
  }
};
const LANGUAGE_BOOST = [
  "Chinese",
  "Chinese,Yue",
  "English",
  "Arabic",
  "Russian",
  "Spanish",
  "French",
  "Portuguese",
  "German",
  "Turkish",
  "Dutch",
  "Ukrainian",
  "Vietnamese",
  "Indonesian",
  "Japanese",
  "Italian",
  "Korean",
  "Thai",
  "Polish",
  "Romanian",
  "Greek",
  "Czech",
  "Finnish",
  "Hindi",
  "Bulgarian",
  "Danish",
  "Hebrew",
  "Malay",
  "Persian",
  "Slovak",
  "Swedish",
  "Croatian",
  "Filipino",
  "Hungarian",
  "Norwegian",
  "Slovenian",
  "Catalan",
  "Nynorsk",
  "Tamil",
  "Afrikaans",
  "auto"
];
const voiceModifyAxis = (description: string) => ({
  type: "integer",
  minimum: -100,
  maximum: 100,
  description
});
const isUncataloguedVoice = (id2: string) => id2 === "Friendly_Person" || id2.startsWith("hub_") || id2.startsWith("ttv");
import type { VendorPrepareRequest, VoiceEntry } from "./shared.js";

function checkVoice(id2: string, voices: ReadonlyArray<VoiceEntry>) {
  if (!voices.length || isUncataloguedVoice(id2) || voices.some((v) => v.voice_id === id2))
    return;
  const needle = id2.toLowerCase();
  const suggestions = voices.filter((v) => v.voice_id.toLowerCase().includes(needle) || needle.includes(v.voice_id.toLowerCase())).slice(0, 5);
  reject(`voice_id "${id2}" not found in current voice catalog.${suggestions.length ? `
Did you mean: ${suggestions.map((v) => `${v.voice_id} (${v.name}, ${v.language})`).join(", ")}` : "\nSearch the voice catalog for available voices."}`);
}
function prepareOfficialSpeech({ modelId, prompt, params, references, voices }: VendorPrepareRequest) {
  if (references.length)
    reject("Official speech uses a prepared voice, not media references");
  const { voice_id_source, ...rest } = params;
  if (voice_id_source !== "user")
    checkVoice(String(rest.voice_id), voices ?? []);
  return {
    backend: BACKEND_MINIMAX_TTS,
    model_id: modelId,
    prompt,
    params: wire({ ...rest, model_name: modelId })
  };
}
function prepareSeedAudio({ modelId, prompt, params, media: media2 }: VendorPrepareRequest) {
  const { image, audio } = media2;
  return {
    backend: BACKEND_SEEDAUDIO,
    model_id: modelId,
    prompt,
    params: wire({ ...params, model_name: modelId }),
    ...audio.length ? { audio_paths: [...audio] } : {},
    ...image.length ? { image_paths: [...image] } : {}
  };
}
import type { VendorEntry } from "./shared.js";

export const officialSpeech: VendorEntry = {
  vendor: "official",
  modality: "audio.tts",
  backend: BACKEND_MINIMAX_TTS,
  knowledgeCard: "vendors/moss.md",
  models: {
    "speech-2.8-hd": {
      description: "For speech that must use a preset catalog voice (voice_id), exact pronunciation overrides or voice effects, or when the user asks for this model. Not the default speech model."
    }
  },
  params: {
    ...SPEECH_PARAMS,
    voice_id: {
      type: "string",
      description: "Official voice ID for this narration. Defaults to the catalog default voice.",
      default: "Friendly_Person"
    },
    voice_id_source: {
      ...enumParam(["user", "catalog", "tool"], "Where voice_id comes from: user=exact ID supplied by the user (not checked against the catalog); catalog=voice_search result or the default voice; tool=voiceId of a voice_clone/voice_design output. Defaults to catalog."),
      default: "catalog"
    },
    vol: {
      type: "number",
      exclusiveMinimum: 0,
      maximum: 10,
      description: "Official speech volume per text. Range (0, 10]. Default 1.0."
    },
    emotion: enumParam(["happy", "sad", "angry", "fearful", "disgusted", "surprised", "calm", "fluent"], "Emotion for speech synthesis. Omit for default behavior."),
    language_boost: {
      type: "string",
      enum: LANGUAGE_BOOST,
      default: "auto",
      description: "Official speech only: language recognition enhancement. Use the exact language value for known monolingual text, `Chinese,Yue` for Cantonese, or `auto` (default) for automatic detection."
    },
    pronunciation_dict: {
      type: "object",
      properties: {
        tone: {
          type: "array",
          items: { type: "string" },
          description: 'Pronunciation overrides. Each entry: "<source>/<replacement>". Replacement can be (1) Mandarin pinyin with tone digits in parens, e.g. "处理/(chu3)(li3)"; (2) IPA in parens, e.g. "resume/(rɪˈzjuːm)"; (3) Cantonese pinyin with tone digits 1-6 in parens, e.g. "(sung3)"; (4) plain text replacement, e.g. "omg/oh my god". Multiple rules apply simultaneously.'
        }
      },
      required: ["tone"],
      description: "Pronunciation overrides (applied globally to every text in the batch)."
    },
    voice_modify: {
      type: "object",
      properties: {
        pitch: voiceModifyAxis("Pitch adjustment, range [-100, 100]. -100 = lowest, 100 = brightest."),
        intensity: voiceModifyAxis("Intensity adjustment, range [-100, 100]. -100 = most forceful, 100 = softest."),
        timbre: voiceModifyAxis("Timbre adjustment, range [-100, 100]. -100 = warmest, 100 = crispest."),
        sound_effects: enumParam(["spacious_echo", "auditorium_echo", "lofi_telephone", "robotic"], "One sound effect: spacious_echo (open echo) / auditorium_echo (PA system) / lofi_telephone (phone distortion) / robotic (electronic).")
      },
      description: "Official speech only: post-synthesis effect chain. Use sparingly for stylistic effects."
    }
  },
  prepare: prepareOfficialSpeech
};
export const seedAudio: VendorEntry = {
  vendor: "seedaudio",
  modality: "audio.tts",
  backend: BACKEND_SEEDAUDIO,
  knowledgeCard: "vendors/seedaudio.md",
  models: {
    "seed-audio-1.0": {
      description: "Default speech model for narration, voiceover, dialogue and character acting, with or without ambience and sound effects. The prompt describes the voice; optional audio or image references carry a voice identity. Does not use catalog voice_id."
    }
  },
  params: {
    ...SPEECH_PARAMS,
    pitch: { ...SPEECH_PARAMS.pitch, default: 0 },
    volume: {
      type: "number",
      minimum: 0.5,
      maximum: 2,
      description: "SeedAudio volume multiplier. Range [0.5, 2]. Default 1.0.",
      default: 1
    },
    sample_rate: {
      ...enumParam(["8000", "16000", "24000", "32000", "44100", "48000"], "SeedAudio only: output sample rate in Hz, default 24000."),
      default: "24000"
    },
    format: enumParam(["wav", "mp3", "pcm", "ogg_opus"], "SeedAudio only: output audio format, default wav.")
  },
  prepare: prepareSeedAudio
};

