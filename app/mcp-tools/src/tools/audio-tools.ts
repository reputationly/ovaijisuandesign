import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { runFfprobe } from "../ffprobe.js";
import type { GatewayClient } from "../gateway-client.js";
import type { ToolRegistrar } from "../registrar.js";
import { generationErrorReply, generationUnknownReply, structuredReply } from "../replies.js";
import { runAsync } from "../run-async.js";
import { BillingErrorMetadataSchema, FailurePresentationSchema, type GenerateResponse } from "../schemas.js";
import { AUDIO_VENDOR_MODEL_IDS, AUDIO_VENDOR_PICKER_IDS, BACKEND_MUSIC, BACKEND_SEEDAUDIO, BACKEND_TTS } from "./audio-models.js";
import { selectedAudioSeriesError, selectedAudioVendorError } from "./audio-picker-guard.js";
import type { RegisterTools } from "./types.js";
import {
  caseInsensitiveEnumLookup,
  DOMESTIC_GENDERS,
  DOMESTIC_LANGUAGES,
  fetchVoicesWithCache,
  filterByLanguage,
  matchesGender,
  OVERSEAS_GENDERS,
  OVERSEAS_LANGUAGES,
  publicVoice,
  voiceIdValidationError,
  type VoiceInfo,
} from "./voice-catalog.js";

/**
 * 音频四件：generate_audio_speech、generate_audio_music、voice_prepare、audio_meta。
 * 生成走 run-async 的提交 + 轮询；厂商相关的校验只保留会让请求本身出错的那部分，
 * 具体落到哪个模型由 gateway 决定。
 */

/** 参数错误：纯文本、isError，不带 structuredContent（agent 改参数重试即可）。 */
function inputError(msg: string): CallToolResult {
  const content: CallToolResult["content"] = [{ type: "text", text: msg }];
  return { isError: true, content };
}

/** 每处新建一份：同一批实例在一个 schema 里出现两次（顶层 + results[]），转成 JSON Schema 时会变成 $ref。 */
const generationFailureFields = () => ({
  error: z.string().optional(),
  error_code: z.string().optional(),
  user_message: z.string().optional(),
  failure_presentation: FailurePresentationSchema.optional(),
  recovery_handle: z.string().optional(),
  do_not_resubmit: z.boolean().optional(),
  billing: BillingErrorMetadataSchema.optional(),
});

// ── generate_audio_music ──

const MUSIC_VENDORS = ["official"] as const;
const MUSIC_VENDOR_SERIES: Record<(typeof MUSIC_VENDORS)[number], string> = { official: "official-music" };
const MUSIC_DEFAULT_MODEL = "music-3.0";

function registerMusic(r: ToolRegistrar, gw: GatewayClient): void {
  r.registerTool(
    "generate_audio_music",
    {
      confirmable: true,
      vendorParamHints: {
        official: {
          model_id: { type: "enum", values: ["music-3.0"] },
          mode: { type: "enum", values: ["song", "instrumental"] },
        },
      },
      description: "Generate music with Official Music 3.0.\n" +
        "Artifact cardinality: one invocation returns one final track. " +
        "The prompt/lyrics describe a single track; multiple deliverables must be represented as separate asset tasks/tool calls.\n" +
        "\n" +
        "Model selection: call `hub_list_capabilities({modality:\"audio.music\"})` if you need the canonical manifest. " +
        "Use `vendor=official, model_id=music-3.0` for BGM/score/instrumental music and for vocal or lyrics-first songs after lyrics are confirmed.\n" +
        "\n" +
        "Mode selection:\n" +
        "  - vendor=official mode=song: full song WITH vocals. " +
        "`lyrics` REQUIRED; write lyrics directly or use user-provided lyrics, and have the user confirm before passing them in.\n" +
        "  - vendor=official mode=instrumental: pure background music. `lyrics` ignored.",
      inputSchema: {
        vendor: z.enum(MUSIC_VENDORS).optional().default("official").describe("Music vendor. Only official Music 3.0 is supported."),
        model_id: z
          .enum(["music-3.0"])
          .optional()
          .describe("Canonical model id from hub_list_capabilities. Defaults by vendor."),
        mode: z.enum(["song", "instrumental"]).describe("song = vocals/music; instrumental = instrumental BGM."),
        prompt: z
          .string()
          .describe("Single-track style / mood brief for one final artifact. Preserve deliverable topology; separate user-intended outcome units use separate calls."),
        lyrics: z
          .string()
          .optional()
          .describe(
            "Required when mode=song. Use structure tags like [verse], [chorus], [bridge]. Write lyrics directly or use user-provided lyrics, and confirm with the user before passing in.",
          ),
        filename: z.string().describe("Output filename WITHOUT extension."),
      },
      outputSchema: {
        ok: z.boolean(),
        path: z.string().optional(),
        duration: z.number().optional(),
        node_id: z.string().optional(),
        ...generationFailureFields(),
      },
    },
    async (args) => {
      const vendor = args.vendor ?? "official";
      if (!MUSIC_VENDORS.includes(vendor)) return inputError(`Unsupported music vendor: ${String(vendor)}.`);
      const modelId = args.model_id ?? MUSIC_DEFAULT_MODEL;
      const pickerError = await selectedAudioSeriesError(gw, MUSIC_VENDOR_SERIES[vendor], modelId);
      if (pickerError) return inputError(pickerError);

      let params: Record<string, string>;
      if (args.mode === "song") {
        if (!args.lyrics || args.lyrics.trim() === "") {
          return inputError(
            "vendor=official mode=song requires non-empty `lyrics`. Write lyrics directly or use user-provided lyrics, and have the user confirm them first.",
          );
        }
        params = { lyrics: args.lyrics };
      } else {
        params = { is_instrumental: "instrumental" };
      }

      try {
        const res = await runAsync(gw, "music", {
          backend: BACKEND_MUSIC,
          model_id: modelId,
          prompt: args.prompt,
          filename: args.filename,
          params,
          source_tool: `hub_generate_audio_music:${vendor}:${args.mode}`,
        });
        if (!res.ok) return generationErrorReply(res);
        return structuredReply({
          ok: true,
          path: res.path,
          duration: res.duration ?? 0,
          ...(res.node_id ? { node_id: res.node_id } : {}),
        });
      } catch (err) {
        return generationUnknownReply(`Error generating music: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}

// ── generate_audio_speech ──

const EMOTIONS = ["happy", "sad", "angry", "fearful", "disgusted", "surprised", "calm", "fluent"] as const;
const EmotionSchema = z.enum(EMOTIONS).describe("Emotion for speech synthesis. Omit for default behavior.");

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
  "auto",
] as const;

const PronunciationDictSchema = z.object({
  tone: z
    .array(z.string())
    .describe(
      'Pronunciation overrides. Each entry: "<source>/<replacement>". Replacement can be (1) Mandarin pinyin with tone digits in parens, e.g. "处理/(chu3)(li3)"; (2) IPA in parens, e.g. "resume/(rɪˈzjuːm)"; (3) Cantonese pinyin with tone digits 1-6 in parens, e.g. "(sung3)"; (4) plain text replacement, e.g. "omg/oh my god". Multiple rules apply simultaneously.',
    ),
});

const SOUND_EFFECTS = ["spacious_echo", "auditorium_echo", "lofi_telephone", "robotic"] as const;
const SEED_SAMPLE_RATES = ["8000", "16000", "24000", "32000", "44100", "48000"] as const;

const effectRange = (what: string) => z.number().int().min(-100).max(100).optional().describe(what);
const VoiceModifySchema = z.object({
  pitch: effectRange("Pitch adjustment, range [-100, 100]. -100 = lowest, 100 = brightest."),
  intensity: effectRange("Intensity adjustment, range [-100, 100]. -100 = most forceful, 100 = softest."),
  timbre: effectRange("Timbre adjustment, range [-100, 100]. -100 = warmest, 100 = crispest."),
  sound_effects: z
    .enum(SOUND_EFFECTS)
    .optional()
    .describe("One sound effect: spacious_echo (open echo) / auditorium_echo (PA system) / lofi_telephone (phone distortion) / robotic (electronic)."),
});

const SPEECH_MODELS = ["speech-2.8-hd", "speech-2.8-turbo", "seed-audio-1.0"] as const;
const DEFAULT_VOICE = "Friendly_Person";

/** 标量或数组 → 与 texts 等长的数组；数组长度不符报错。 */
function alignToTexts<T>(name: string, v: T | (T | null)[] | undefined, length: number): { values: (T | null)[]; error?: string } {
  if (v === undefined) return { values: Array.from({ length }, () => null) };
  if (Array.isArray(v)) {
    if (v.length !== length) return { values: [], error: `${name} length (${v.length}) does not match texts length (${length}).` };
    return { values: v };
  }
  return { values: Array.from({ length }, () => v) };
}

function speechSuccess(res: Extract<GenerateResponse, { ok: true }>): Record<string, unknown> {
  return {
    ok: true,
    path: res.path,
    duration: res.duration ?? 0,
    ...(res.subtitle_path ? { subtitle_path: res.subtitle_path } : {}),
    ...(res.node_id ? { node_id: res.node_id } : {}),
  };
}

const speechResultItem = z.object({
  ok: z.boolean(),
  path: z.string().optional(),
  duration: z.number().optional(),
  subtitle_path: z.string().optional(),
  node_id: z.string().optional(),
  ...generationFailureFields(),
});

function registerSpeech(r: ToolRegistrar, gw: GatewayClient): void {
  // 两个分支各建一份：同一个实例出现两次，转成 JSON Schema 时第二处会变成 $ref，模型看不到取值范围。
  const numOrList = (item: () => z.ZodNumber) => z.union([item(), z.array(item().nullable())]);
  r.registerTool(
    "generate_audio_speech",
    {
      confirmable: true,
      description: "Generate one or more TTS audio clips via the v2 audio.tts dispatcher.\n" +
        "Artifact cardinality: each `texts` item produces one speech clip. " +
        "Batch size is the length of `texts`; the text item itself is spoken content, not a planning prompt.\n" +
        "\n" +
        "Vendor selection: call `hub_list_capabilities({modality:\"audio.tts\"})`. " +
        "Use `vendor=\"official\"` for plain reading, narration, ordinary dialogue dubbing, and ordinary voice preferences after catalog voice selection. " +
        "Use `vendor=\"seedaudio\"` with `model_name=\"seed-audio-1.0\"` for cinematic/film dubbing, short-drama/radio-drama/trailer performance, reference audio/i" +
        "mage voice replication, clearly custom natural-language voices that catalog prep cannot satisfy, or speech generated together with ambience/BGM/SFX. " +
        "Missing voice_id alone is not a SeedAudio trigger.\n" +
        "\n" +
        "Official speech: pass `texts` as a string for one clip, or an array for batch (multi-speaker dialogue, scene-by-scene narration). " +
        "Per-text array fields (`voice_ids` / `filenames` / `emotions` / `speeds` / `vols` / `pitches`) align by index with `texts`. " +
        "`language_boost` and `pronunciation_dict` are GLOBAL (apply to every text); `language_boost` defaults to `auto`.\n" +
        "\n" +
        "SeedAudio: single clip only. It has no fixed voice catalog and does not use `voice_id`; pass up to 3 `reference_audio_paths` OR one `reference_image_p" +
        "ath` (mutually exclusive). Reference uploaded audio inside the text yourself using @音频1 / @音频2 ... by upload order.\n" +
        "\n" +
        "Voice IDs: use voice_id_source=\"user\" only for an exact ID supplied by the user, \"catalog\" for `hub_voice_prepare` results, and \"tool\" for clone/desig" +
        "n results. Never invent an ID.",
      inputSchema: {
        texts: z.union([z.string(), z.array(z.string())]).describe("Text(s) to synthesise. String = single; array = batch."),
        vendor: z
          .enum(["official", "seedaudio"])
          .optional()
          .describe("TTS vendor. Default/inferred: official for speech-2.8 models, seedaudio for seed-audio-1.0."),
        voice_ids: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe("Voice ID(s). Length must align with `texts` when both are arrays. Defaults to `Friendly_Person` when omitted."),
        voice_id: z.string().optional().describe("Single voice_id shortcut for single-text calls. Mutually exclusive with `voice_ids`."),
        voice_id_source: z
          .enum(["user", "catalog", "tool"])
          .optional()
          .describe("Required with explicit official voice_id(s): user=exact ID supplied by the user; catalog=hub_voice_prepare result; tool=clone/design result."),
        filenames: z.union([z.string(), z.array(z.string())]).optional().describe("Output filename(s) WITHOUT extension."),
        filename: z.string().optional().describe("Single filename shortcut for single-text calls. Mutually exclusive with `filenames`."),
        speeds: numOrList(() => z.number().min(0.5).max(2)).optional().describe("Speed multiplier per text. Range [0.5, 2]. Default 1.0."),
        vols: numOrList(() => z.number().gt(0).max(10)).optional().describe("Official speech volume per text. Range (0, 10]. Default 1.0."),
        volumes: numOrList(() => z.number().min(0.5).max(2)).optional().describe("SeedAudio volume multiplier. Range [0.5, 2]. Default 1.0."),
        pitches: numOrList(() => z.number().int().min(-12).max(12)).optional().describe("Pitch shift in semitones per text. Range [-12, 12]. Default 0."),
        emotions: z.union([EmotionSchema, z.array(EmotionSchema.nullable())]).optional(),
        language_boost: z
          .enum(LANGUAGE_BOOST)
          .default("auto")
          .describe("Official speech only: language recognition enhancement. Use the exact language value for known monolingual text, `Chinese,Yue` for Cantonese, or `auto` (default) for automatic detection."),
        model_name: z
          .enum(SPEECH_MODELS)
          .optional()
          .describe("Model: 'speech-2.8-hd' (default, highest fidelity), 'speech-2.8-turbo' (faster drafts), or 'seed-audio-1.0' (SeedAudio reference-conditioned TTS)."),
        pronunciation_dict: PronunciationDictSchema.optional().describe("Pronunciation overrides (applied globally to every text in the batch)."),
        voice_modify: VoiceModifySchema.optional().describe("Official speech only: post-synthesis effect chain. Use sparingly for stylistic effects."),
        reference_audio_paths: z
          .array(z.string())
          .max(3)
          .optional()
          .describe("SeedAudio only: up to 3 reference audio paths (wav/mp3/pcm/ogg_opus, ≤30s / ≤10MB each). Mutually exclusive with reference_image_path."),
        reference_image_path: z
          .string()
          .optional()
          .describe("SeedAudio only: one reference image path (jpeg/png/webp, ≤10MB). Mutually exclusive with reference_audio_paths."),
        sample_rate: z
          .enum(SEED_SAMPLE_RATES)
          .optional()
          .describe("SeedAudio only: output sample rate in Hz, default 24000."),
        format: z.enum(["wav", "mp3", "pcm", "ogg_opus"]).optional().describe("SeedAudio only: output audio format, default wav."),
      },
      outputSchema: {
        ok: z.boolean(),
        path: z.string().optional(),
        duration: z.number().optional(),
        subtitle_path: z.string().optional(),
        node_id: z.string().optional(),
        results: z.array(speechResultItem).optional(),
        ...generationFailureFields(),
      },
    },
    async (args) => {
      // vendor 缺省按 model_name 推断，model_name 缺省取该 vendor 的默认模型
      const wantsSeed = args.vendor === "seedaudio" || (args.vendor === undefined && args.model_name === "seed-audio-1.0");
      const vendor = wantsSeed ? "seedaudio" : "official";
      const modelName = args.model_name ?? (wantsSeed ? "seed-audio-1.0" : "speech-2.8-hd");
      const pickerError = await selectedAudioVendorError(
        gw,
        vendor === "seedaudio" ? "seedaudio" : "speech",
        modelName,
        AUDIO_VENDOR_PICKER_IDS,
        AUDIO_VENDOR_MODEL_IDS,
      );
      if (pickerError) return inputError(pickerError);

      const texts = Array.isArray(args.texts) ? args.texts : [args.texts];
      const count = texts.length;

      if (vendor === "seedaudio") return seedAudio(gw, args, modelName, texts);
      if (modelName === "seed-audio-1.0") return inputError('model_name="seed-audio-1.0" requires vendor="seedaudio".');

      const explicitVoice = args.voice_ids !== undefined || args.voice_id !== undefined;
      if (explicitVoice && !args.voice_id_source) {
        return inputError("voice_id_source is required with explicit official voice_id(s).");
      }
      const voices: string[] =
        args.voice_ids !== undefined
          ? Array.isArray(args.voice_ids)
            ? args.voice_ids
            : Array.from({ length: count }, () => args.voice_ids as string)
          : Array.from({ length: count }, () => args.voice_id || DEFAULT_VOICE);
      if (voices.length !== count) {
        return inputError(`voice_ids length (${voices.length}) does not match texts length (${count}).`);
      }
      // 用户亲口给的 id 不查目录：可能是目录外的私有音色
      if (args.voice_id_source !== "user") {
        const err = await voiceIdValidationError(gw, voices);
        if (err) return inputError(err);
      }

      const filenames: string[] =
        args.filenames !== undefined
          ? Array.isArray(args.filenames)
            ? args.filenames
            : Array.from({ length: count }, () => args.filenames as string)
          : args.filename
            ? Array.from({ length: count }, () => args.filename as string)
            : [];
      if (filenames.length !== count) {
        return inputError(
          `filenames length (${filenames.length}) does not match texts length (${count}). Pass either \`filename\` (single) or \`filenames\` (length=texts).`,
        );
      }

      const speeds = alignToTexts("speeds", args.speeds, count);
      const vols = alignToTexts("vols", args.vols, count);
      const pitches = alignToTexts("pitches", args.pitches, count);
      const emotions = alignToTexts("emotions", args.emotions, count);
      const alignError = speeds.error ?? vols.error ?? pitches.error ?? emotions.error;
      if (alignError) return inputError(alignError);

      // 这两个是整批共用的，gateway 那边按字符串透传
      const pronunciation = args.pronunciation_dict ? JSON.stringify(args.pronunciation_dict) : undefined;
      const voiceModify = args.voice_modify ? JSON.stringify(args.voice_modify) : undefined;

      const callOne = (i: number) => {
        const params: Record<string, string> = {
          model_name: modelName,
          voice_id: voices[i] as string,
          speed: String(speeds.values[i] ?? 1),
          language_boost: args.language_boost ?? "auto",
        };
        const emotion = emotions.values[i];
        if (emotion) params.emotion = emotion;
        const vol = vols.values[i];
        if (vol !== null && vol !== undefined) params.vol = String(vol);
        const pitch = pitches.values[i];
        if (pitch !== null && pitch !== undefined) params.pitch = String(pitch);
        if (pronunciation) params.pronunciation_dict = pronunciation;
        if (voiceModify) params.voice_modify = voiceModify;
        return runAsync(gw, "speech", {
          backend: BACKEND_TTS,
          model_id: modelName,
          prompt: texts[i],
          filename: filenames[i],
          params,
          source_tool: "hub_generate_audio_speech",
        });
      };

      try {
        if (count === 1) {
          const res = await callOne(0);
          return res.ok ? structuredReply(speechSuccess(res)) : generationErrorReply(res);
        }
        const settled = await Promise.allSettled(Array.from({ length: count }, (_, i) => callOne(i)));
        return structuredReply(aggregateSpeech(settled));
      } catch (err) {
        return generationUnknownReply(`Error generating speech: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}

type SpeechArgs = {
  voice_id?: string;
  voice_ids?: string | string[];
  voice_id_source?: string;
  emotions?: unknown;
  pronunciation_dict?: unknown;
  voice_modify?: unknown;
  reference_audio_paths?: string[];
  reference_image_path?: string;
  filename?: string;
  filenames?: string | string[];
  speeds?: number | (number | null)[];
  vols?: number | (number | null)[];
  volumes?: number | (number | null)[];
  pitches?: number | (number | null)[];
  sample_rate?: string;
  format?: string;
};

async function seedAudio(gw: GatewayClient, args: SpeechArgs, modelName: string, texts: string[]): Promise<CallToolResult> {
  if (modelName !== "seed-audio-1.0") return inputError('SeedAudio requires model_name="seed-audio-1.0".');
  if (texts.length !== 1) {
    return inputError(
      'SeedAudio currently supports one clip per hub_generate_audio_speech call. Call once per line, or use vendor="official" for batch TTS.',
    );
  }
  const hasVoiceArgs = Boolean(args.voice_id) || Boolean(args.voice_ids) || Boolean(args.voice_id_source);
  if (hasVoiceArgs) {
    return inputError(
      "SeedAudio does not use voice_id, voice_ids, or voice_id_source; provide reference_audio_paths or reference_image_path instead.",
    );
  }
  if (args.emotions) return inputError("SeedAudio does not support emotions; describe the desired delivery in texts instead.");
  if (args.pronunciation_dict || args.voice_modify) return inputError("SeedAudio does not support pronunciation_dict or voice_modify.");
  const audioRefs = args.reference_audio_paths?.filter((ref) => ref.trim().length > 0) ?? [];
  const imageRef = args.reference_image_path?.trim();
  if (audioRefs.length > 0 && imageRef) {
    return inputError("reference_audio_paths and reference_image_path are mutually exclusive — provide only one kind.");
  }
  const firstListed = typeof args.filenames === "string" ? args.filenames : args.filenames?.[0];
  const filename = args.filename ?? firstListed;
  if (!filename) return inputError("filename is required for SeedAudio.");
  const speed = alignToTexts("speeds", args.speeds, 1);
  // SeedAudio 的音量叫 volumes；agent 写成 vols 也认
  const volume = alignToTexts("volumes", args.volumes ?? args.vols, 1);
  const pitch = alignToTexts("pitches", args.pitches, 1);
  const alignError = speed.error ?? volume.error ?? pitch.error;
  if (alignError) return inputError(alignError);

  const params: Record<string, string> = {
    model_name: modelName,
    speed: String(speed.values[0] ?? 1),
    volume: String(volume.values[0] ?? 1),
    sample_rate: args.sample_rate ?? "24000",
  };
  const p = pitch.values[0];
  if (p !== null && p !== undefined) params.pitch = String(p);
  if (args.format) params.format = args.format;
  try {
    const res = await runAsync(gw, "speech", {
      backend: BACKEND_SEEDAUDIO,
      model_id: modelName,
      prompt: texts[0],
      filename,
      params,
      ...(audioRefs.length > 0 ? { audio_paths: audioRefs } : {}),
      ...(imageRef ? { image_paths: [imageRef] } : {}),
      source_tool: "hub_generate_audio_speech",
    });
    if (!res.ok) return generationErrorReply(res);
    return structuredReply({ ok: true, path: res.path, duration: res.duration ?? 0, ...(res.node_id ? { node_id: res.node_id } : {}) });
  } catch (err) {
    return generationUnknownReply(`Error generating SeedAudio speech: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 批量结果汇总。顶层 failure_presentation 取最“不确定”的一项：有 recoverable 就 recoverable，
 * 其次 status_unknown；全部是 cancelled 才算用户取消，否则 terminal。
 * 非终态时顶层也带 do_not_resubmit，避免 agent 把整批重跑（已成功的会重复扣费）。
 */
export function aggregateSpeech(settled: PromiseSettledResult<GenerateResponse>[]): Record<string, unknown> {
  const results = settled.map((s): Record<string, unknown> => {
    if (s.status === "rejected") {
      return {
        ok: false,
        error: String(s.reason),
        error_code: "unknown",
        failure_presentation: "status_unknown",
        do_not_resubmit: true,
      };
    }
    const res = s.value;
    if (res.ok) return speechSuccess(res);
    const nonTerminal = res.failure_presentation === "recoverable" || res.failure_presentation === "status_unknown";
    return {
      ok: false,
      error: res.error,
      error_code: res.error_code,
      ...(res.failure_presentation ? { failure_presentation: res.failure_presentation } : {}),
      ...(res.recovery_handle ? { recovery_handle: res.recovery_handle } : {}),
      ...(res.billing ? { billing: res.billing } : {}),
      ...(nonTerminal ? { do_not_resubmit: true } : {}),
    };
  });
  const failures = results.filter((x) => !x.ok);
  const billing = failures.find((x) => x.error_code === "billing_insufficient_balance");
  const presentation = failures.some((x) => x.failure_presentation === "recoverable")
    ? "recoverable"
    : failures.some((x) => x.failure_presentation === "status_unknown")
      ? "status_unknown"
      : failures.length === 0
        ? undefined
        : failures.every((x) => x.failure_presentation === "cancelled")
          ? "cancelled"
          : "terminal";
  return {
    ok: failures.length === 0,
    results,
    ...(billing ? { error_code: "billing_insufficient_balance" } : {}),
    ...(billing?.billing ? { billing: billing.billing } : {}),
    ...(presentation ? { failure_presentation: presentation } : {}),
    ...(presentation === "recoverable" || presentation === "status_unknown" ? { do_not_resubmit: true } : {}),
  };
}

// ── voice_prepare ──

const VoiceCloneResponseSchema = z.object({
  voice_id: z.string(),
  demo_audio: z.string().optional(),
  input_sensitive_type: z.number().optional(),
});
const VoiceDesignResponseSchema = z.object({ voice_id: z.string(), trial_audio_url: z.string() });

/** 克隆 / 设计会走计费确认，超时预算里留出用户确认扣费的时间。 */
const CREDIT_INTERACTION_BUDGET_MS = 15 * 60_000;
const VOICE_CLONE_TIMEOUT_MS = 5 * 60_000 + CREDIT_INTERACTION_BUDGET_MS;
const VOICE_DESIGN_TIMEOUT_MS = 60_000 + CREDIT_INTERACTION_BUDGET_MS;

const VoiceActionSchema = z.enum(["search_catalog", "clone", "design"]);
type VoiceAction = z.infer<typeof VoiceActionSchema>;

interface VoicePrepareItem {
  id?: string;
  action: VoiceAction;
  language?: string;
  gender?: string;
  audio_path?: string;
  prompt_audio_path?: string;
  prompt_text?: string;
  demo_text?: string;
  demo_model?: string;
  need_noise_reduction?: boolean;
  need_volume_normalization?: boolean;
  prompt?: string;
  preview_text?: string;
}

type VoiceResult = Record<string, unknown> & { index: number; action: VoiceAction; ok: boolean };

function failedItem(item: VoicePrepareItem, index: number, error: string, extra: Record<string, unknown> = {}): VoiceResult {
  return { index, ...(item.id ? { id: item.id } : {}), action: item.action, ok: false, error, ...extra };
}

function validateItem(item: VoicePrepareItem, index: number): string | undefined {
  if (item.action === "search_catalog" && !item.language) return `items[${index}].language is required for action=search_catalog.`;
  if (item.action === "clone" && !item.audio_path) return `items[${index}].audio_path is required for action=clone.`;
  const designIncomplete = !item.prompt || !item.preview_text;
  if (item.action === "design" && designIncomplete) {
    return `items[${index}].prompt and preview_text are required for action=design.`;
  }
  return undefined;
}

function voicePrepareReply(results: VoiceResult[]): CallToolResult {
  const failed = results.filter((x) => !x.ok);
  return structuredReply({
    ok: failed.length === 0,
    total: results.length,
    successCount: results.length - failed.length,
    errorCount: failed.length,
    results,
    failed,
  });
}

function registerVoicePrepare(r: ToolRegistrar, gw: GatewayClient, overseas: boolean): void {
  const languages: readonly string[] = overseas ? OVERSEAS_LANGUAGES : DOMESTIC_LANGUAGES;
  const genders: readonly string[] = overseas ? OVERSEAS_GENDERS : DOMESTIC_GENDERS;
  const VoiceCandidateSchema = z.object({
    voice_id: z.string(),
    name: z.string(),
    language: z.string(),
    gender: z.string(),
    age: z.string(),
    accent: z.string(),
    description: z.string(),
    sample_audio: z.string(),
  });
  const ItemSchema = z.object({
    id: z.string().optional().describe("Optional caller id, e.g. role id or asset id."),
    action: VoiceActionSchema,
    language: z
      .preprocess((v) => caseInsensitiveEnumLookup(languages, v), z.enum(languages as [string, ...string[]]))
      .optional()
      .describe("[search_catalog] Voice language. Defaults should match user chat language."),
    gender: z
      .preprocess((v) => caseInsensitiveEnumLookup(genders, v), z.enum(genders as [string, ...string[]]))
      .optional()
      .describe("[search_catalog] Pass only when user explicitly mentioned gender."),
    audio_path: z.string().optional().describe("[clone] Reference audio file path (mp3/m4a/wav, 10s-5min, <=20MB)."),
    prompt_audio_path: z.string().optional().describe("[clone] Optional short prompt audio (<8s, <=20MB)."),
    prompt_text: z.string().optional().describe("[clone] Text matching prompt_audio content."),
    demo_text: z.string().optional().describe("[clone] Optional preview text (<=1000 chars)."),
    demo_model: z
      .enum(["speech-2.8-hd", "speech-2.8-turbo"])
      .optional()
      .default("speech-2.8-hd")
      .describe("[clone] Preview model."),
    need_noise_reduction: z.boolean().optional().describe("[clone] Apply noise reduction."),
    need_volume_normalization: z.boolean().optional().describe("[clone] Apply volume normalization."),
    prompt: z.string().optional().describe("[design] Voice description."),
    preview_text: z.string().max(500).optional().describe("[design] Trial text."),
  });
  const ResultSchema = z.object({
    index: z.number(),
    id: z.string().optional(),
    action: VoiceActionSchema,
    ok: z.boolean(),
    total: z.number().optional().describe("[search_catalog] Number of voices returned."),
    voices: z.array(VoiceCandidateSchema).optional().describe("[search_catalog] Matching voices."),
    voice_id: z.string().optional().describe("[clone/design] Generated voice id."),
    demo_audio: z.string().optional().describe("[clone] Preview audio URL."),
    trial_audio_url: z.string().optional().describe("[design] Trial audio URL."),
    input_sensitive_type: z.number().optional().describe("[clone] Input audio risk type."),
    error: z.string().optional().describe("[failed item] Error message."),
  });

  r.registerTool(
    "voice_prepare",
    {
      description: "Prepare one or more voice_id choices for speech generation. Pass items[]; use a single-element array for one role. " +
        "Default agents use this single tool for voice catalog search, voice cloning, or explicit custom voice design.\n" +
        "\n" +
        "ACTIONS per item:\n" +
        "- `search_catalog`: list preset voices by language and optional gender. Use for normal voice selection.\n" +
        "- `clone`: clone from a user-provided reference audio. Reuse the returned `voice_id`; do not clone repeatedly for the same audio.\n" +
        "- `design`: create a custom voice from text description. " +
        "Use only when the user explicitly asks to design/customize/create a new voice, not for ordinary adjective-based voice selection.",
      inputSchema: {
        items: z.array(ItemSchema).min(1).max(30).describe("Batch of voice preparation requests. Single-role calls must still use items[]."),
      },
      outputSchema: {
        ok: z.boolean(),
        total: z.number(),
        successCount: z.number(),
        errorCount: z.number(),
        results: z.array(ResultSchema),
        failed: z.array(ResultSchema),
      },
    },
    async (args) => {
      const items = args.items as VoicePrepareItem[];
      // 任何一项参数不全就整批不跑：克隆 / 设计会扣费，别让半批先执行
      const invalid = new Map<number, string>();
      items.forEach((item, i) => {
        const e = validateItem(item, i);
        if (e) invalid.set(i, e);
      });
      if (invalid.size > 0) {
        return voicePrepareReply(
          items.map((item, i) => failedItem(item, i, invalid.get(i) ?? "not run because batch validation failed")),
        );
      }

      let voicesPromise: Promise<VoiceInfo[]> | undefined;
      const getVoices = () => (voicesPromise ??= fetchVoicesWithCache(gw));

      const results = await Promise.all(
        items.map(async (item, index): Promise<VoiceResult> => {
          const idPart = item.id ? { id: item.id } : {};
          if (item.action === "search_catalog") {
            const all = await getVoices();
            if (all.length === 0) return failedItem(item, index, "failed to fetch voice list from gateway");
            let voices = filterByLanguage(all, item.language ?? "");
            if (item.gender) voices = voices.filter((v) => matchesGender(v.gender, item.gender as string));
            const list = voices.map(publicVoice);
            return { index, ...idPart, action: "search_catalog", ok: true, total: list.length, voices: list };
          }
          if (item.action === "clone") {
            try {
              const res = await gw.post(
                "/api/speech/voice_clone",
                {
                  audio_path: item.audio_path,
                  ...(item.prompt_audio_path ? { prompt_audio_path: item.prompt_audio_path } : {}),
                  ...(item.prompt_text ? { prompt_text: item.prompt_text } : {}),
                  ...(item.demo_text ? { demo_text: item.demo_text, demo_model: item.demo_model ?? "speech-2.8-hd" } : {}),
                  ...(!item.demo_text && item.demo_model ? { demo_model: item.demo_model } : {}),
                  ...(item.need_noise_reduction ? { need_noise_reduction: true } : {}),
                  ...(item.need_volume_normalization ? { need_volume_normalization: true } : {}),
                },
                VOICE_CLONE_TIMEOUT_MS,
                VoiceCloneResponseSchema,
              );
              // 参考音频被风控标记：id 仍回给 agent，但标失败，让它先问用户
              if (typeof res.input_sensitive_type === "number" && res.input_sensitive_type !== 0) {
                return failedItem(
                  item,
                  index,
                  `reference audio was flagged for risk (type=${res.input_sensitive_type}); ask the user before using it`,
                  { voice_id: res.voice_id, input_sensitive_type: res.input_sensitive_type },
                );
              }
              return {
                index,
                ...idPart,
                action: "clone",
                ok: true,
                voice_id: res.voice_id,
                ...(res.demo_audio ? { demo_audio: res.demo_audio } : {}),
                ...(typeof res.input_sensitive_type === "number" ? { input_sensitive_type: res.input_sensitive_type } : {}),
              };
            } catch (err) {
              return failedItem(item, index, `Error cloning voice: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
          try {
            const res = await gw.post(
              "/api/speech/voice_design",
              { prompt: item.prompt, preview_text: item.preview_text },
              VOICE_DESIGN_TIMEOUT_MS,
              VoiceDesignResponseSchema,
            );
            return { index, ...idPart, action: "design", ok: true, voice_id: res.voice_id, trial_audio_url: res.trial_audio_url };
          } catch (err) {
            return failedItem(item, index, `Error designing voice: ${err instanceof Error ? err.message : String(err)}`);
          }
        }),
      );
      return voicePrepareReply(results);
    },
  );
}

// ── audio_meta ──

function registerAudioMeta(r: ToolRegistrar): void {
  r.registerTool(
    "audio_meta",
    {
      description:
        "Get audio metadata including duration and format. Always call this before audio_subclip_batch or any operation that needs exact audio duration.",
      inputSchema: {
        audio_path: z.string().describe("Audio file path"),
      },
      outputSchema: {
        duration: z.number().describe("Audio duration in seconds"),
        format_name: z.string().optional().describe("Audio format name (e.g. \"mp3\", \"wav\")"),
        size: z.number().optional().describe("File size in bytes"),
        bit_rate: z.number().optional().describe("Bit rate in bps"),
      },
    },
    async (args) => {
      try {
        const stdout = await runFfprobe(["-v", "quiet", "-print_format", "json", "-show_format", args.audio_path]);
        const fmt = ((JSON.parse(stdout) as { format?: Record<string, string> }).format ?? {}) as Record<string, string | undefined>;
        return structuredReply({
          duration: Number.parseFloat(fmt.duration ?? "0"),
          ...(fmt.format_name ? { format_name: fmt.format_name } : {}),
          ...(fmt.size ? { size: Number.parseInt(fmt.size, 10) } : {}),
          ...(fmt.bit_rate ? { bit_rate: Number.parseInt(fmt.bit_rate, 10) } : {}),
        });
      } catch (err) {
        return { isError: true, content: [{ type: "text", text: `Error getting audio metadata: ${String(err)}` }] };
      }
    },
  );
}

export const registerAudioTools: RegisterTools = (registrar, gateway, region) => {
  registerAudioMeta(registrar);
  registerMusic(registrar, gateway);
  registerSpeech(registrar, gateway);
  registerVoicePrepare(registrar, gateway, region === "overseas");
};
