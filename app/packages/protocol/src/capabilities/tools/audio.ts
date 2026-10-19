/** 由 v3 preload 产物还原：../packages/protocol/dist/capabilities/tools/audio.js */
import { reject } from "../request.js";
import { fixed, objectParams } from "./fixed.js";
import { id, operation } from "../../project-v3/task-mappers.js";

const VOICE_CLONE_MODEL = "voice-clone";
const VOICE_DESIGN_MODEL = "voice-design";
const VOICE_PREVIEW_MODEL = "speech-2.8-hd";
interface VoiceReference {
  path: string;
  media: { durationSeconds?: number };
}

function voiceClip(reference: VoiceReference | undefined, role: string, fits: (seconds: number) => boolean, window2: string): void {
  if (!reference)
    return;
  if (!/\.(mp3|m4a|wav)$/i.test(reference.path))
    reject(`${role} must be an mp3, m4a or wav file`);
  const seconds = reference.media.durationSeconds;
  if (seconds === undefined || !fits(seconds))
    reject(`${role} needs a measured duration ${window2}`);
}
export const AUDIO_TOOLS = [
  {
    id: "generate_speech:voice_isolation",
    operation: "generate_speech",
    displayName: "Voice Isolator",
    description: "Keep only the voice of one audio recording of at most 300 seconds, removing background noise and music; the speech itself is unchanged.",
    prompt: { use: "none" },
    references: { min: 1, max: 1, kinds: { audio: 1 } },
    surfaces: ["agent", "canvas"],
    paramSchema: objectParams({}),
    execution: fixed({
      backend: "minimax_tts",
      model: "voice-isolation",
      pricing: "voice-isolation"
    })
  },
  {
    id: "generate_speech:voice_clone",
    operation: "generate_speech",
    displayName: "Voice Clone",
    description: `Create a reusable voice from a recording of the target speaker. prompt is the preview text the new voice speaks. Delivers that preview as audio; the output's voiceId is the new voice_id for speech generation (voice_id_source="tool"). Every call creates and charges a new voice, so reuse a returned voiceId.`,
    prompt: { use: "required", maxLength: 1e3 },
    references: {
      min: 1,
      max: 2,
      kinds: { audio: 2 },
      description: "First: the speaker sample, mp3/m4a/wav, 10s to 5min, at most 20MB. Optional second: a clip under 8s whose exact transcript is params.promptText, to improve similarity."
    },
    surfaces: ["agent"],
    paramSchema: objectParams({
      promptText: {
        type: "string",
        pattern: "\\S",
        description: "Exact transcript of the second reference; required with it."
      },
      noiseReduction: { type: "boolean", description: "Reduce noise in the sample." },
      volumeNormalization: { type: "boolean", description: "Normalize the sample volume." }
    }),
    execution: fixed({ backend: "minimax_tts", model: VOICE_CLONE_MODEL, pricing: VOICE_CLONE_MODEL }, ({ params, references }) => {
      const [sample, prompt] = references;
      // 引用项的字段由 paramSchema 在运行时校验，这里按已知形状断言
      voiceClip(sample as unknown as VoiceReference | undefined, "The speaker sample", (s: number) => s >= 10 && s <= 300, "from 10s to 5min");
      voiceClip(prompt as unknown as VoiceReference | undefined, "The prompt clip", (s: number) => s > 0 && s < 8, "under 8s");
      if (Boolean(prompt) !== (params.promptText !== undefined))
        reject("A prompt clip and promptText are given together");
      return {
        params: {
          demo_model: VOICE_PREVIEW_MODEL,
          prompt_text: params.promptText,
          need_noise_reduction: params.noiseReduction || undefined,
          need_volume_normalization: params.volumeNormalization || undefined
        }
      };
    })
  },
  {
    id: "generate_speech:voice_design",
    operation: "generate_speech",
    displayName: "Voice Design",
    description: `Create a new reusable voice from a text description, only when the user asks for a custom voice. prompt is the preview text the new voice speaks. Delivers that preview as audio; the output's voiceId is the new voice_id for speech generation (voice_id_source="tool"). Every call creates and charges a new voice, so reuse a returned voiceId.`,
    prompt: { use: "required", maxLength: 500 },
    references: { min: 0, max: 0 },
    surfaces: ["agent"],
    paramSchema: objectParams({
      voiceDescription: {
        type: "string",
        pattern: "\\S",
        description: "The voice to create: timbre, age, gender, accent and speaking style."
      }
    }, ["voiceDescription"]),
    execution: fixed({ backend: "minimax_tts", model: VOICE_DESIGN_MODEL, pricing: VOICE_DESIGN_MODEL }, ({ params }) => ({ params: { voice_prompt: params.voiceDescription } }))
  }
];

