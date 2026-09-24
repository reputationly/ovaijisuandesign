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

const generationFailureFields = {
  error: z.string().optional(),
  error_code: z.string().optional(),
  user_message: z.string().optional(),
  failure_presentation: FailurePresentationSchema.optional(),
  recovery_handle: z.string().optional(),
  do_not_resubmit: z.boolean().optional(),
  billing: BillingErrorMetadataSchema.optional(),
};

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
      description: [
        "Generate one music track (Music 3.0). Each call yields exactly one final track; if the user wants several pieces, make one call per piece.",
        "",
        'Pick vendor `official` + model_id `music-3.0` for everything: BGM, film-style scores, instrumentals, and — after the lyrics are agreed — sung songs. If you want the capability manifest, call `hub_list_capabilities({modality:"audio.music"})`.',
        "",
        "Modes:",
        "  - mode=song: a full song with vocals. `lyrics` is REQUIRED — write them yourself or take the user's, and get the user's confirmation before calling.",
        "  - mode=instrumental: no vocals; `lyrics` is ignored.",
        "",
        "Returns {ok, path, duration, node_id?}. The canvas node is created automatically when the task finishes.",
      ].join("\n"),
      inputSchema: {
        vendor: z.enum(MUSIC_VENDORS).optional().default("official").describe("Music vendor. Only `official` (Music 3.0) is available."),
        model_id: z
          .enum(["music-3.0"])
          .optional()
          .describe("Canonical model id as listed by hub_list_capabilities. Defaults per vendor."),
        mode: z.enum(["song", "instrumental"]).describe("song = with vocals; instrumental = background music without vocals."),
        prompt: z
          .string()
          .describe("Style / mood / instrumentation brief for this single track. Keep separate deliverables in separate calls."),
        lyrics: z
          .string()
          .optional()
          .describe(
            "Required for mode=song. Mark sections with tags such as [verse], [chorus], [bridge]. Confirm the lyrics with the user before passing them.",
          ),
        filename: z.string().describe("Output filename WITHOUT extension."),
      },
      outputSchema: {
        ok: z.boolean(),
        path: z.string().optional(),
        duration: z.number().optional(),
        node_id: z.string().optional(),
        ...generationFailureFields,
      },
    },
    async (args) => {
      const vendor = args.vendor ?? "official";
      if (!MUSIC_VENDORS.includes(vendor)) return inputError(`Unknown music vendor "${String(vendor)}".`);
      const modelId = args.model_id ?? MUSIC_DEFAULT_MODEL;
      const pickerError = await selectedAudioSeriesError(gw, MUSIC_VENDOR_SERIES[vendor], modelId);
      if (pickerError) return inputError(pickerError);

      let params: Record<string, string>;
      if (args.mode === "song") {
        if (!args.lyrics || args.lyrics.trim() === "") {
          return inputError(
            "mode=song needs `lyrics` (non-empty). Draft them or take them from the user, get the user's OK on them, then call again.",
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
        return generationUnknownReply(`Music generation failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}

// ── generate_audio_speech ──

const EMOTIONS = ["happy", "sad", "angry", "fearful", "disgusted", "surprised", "calm", "fluent"] as const;
const EmotionSchema = z.enum(EMOTIONS).describe("Delivery emotion. Omit for the model's default.");

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
      'Pronunciation rules, each "<source>/<replacement>". The replacement may be Mandarin pinyin with tone digits in parentheses ("处理/(chu3)(li3)"), IPA in parentheses ("resume/(rɪˈzjuːm)"), Cantonese jyutping with tones 1-6 in parentheses, or plain replacement text ("omg/oh my god"). All rules apply together.',
    ),
});

const SOUND_EFFECTS = ["spacious_echo", "auditorium_echo", "lofi_telephone", "robotic"] as const;
const SEED_SAMPLE_RATES = ["8000", "16000", "24000", "32000", "44100", "48000"] as const;

const effectRange = (what: string) => z.number().int().min(-100).max(100).optional().describe(what);
const VoiceModifySchema = z.object({
  pitch: effectRange("Pitch shift in [-100, 100]: -100 deepest, 100 brightest."),
  intensity: effectRange("Intensity in [-100, 100]: -100 most forceful, 100 softest."),
  timbre: effectRange("Timbre in [-100, 100]: -100 warmest, 100 crispest."),
  sound_effects: z
    .enum(SOUND_EFFECTS)
    .optional()
    .describe("At most one effect: spacious_echo (open-room echo), auditorium_echo (PA hall), lofi_telephone (phone line), robotic (synthetic)."),
});

const SPEECH_MODELS = ["speech-2.8-hd", "speech-2.8-turbo", "seed-audio-1.0"] as const;
const DEFAULT_VOICE = "Friendly_Person";

/** 标量或数组 → 与 texts 等长的数组；数组长度不符报错。 */
function alignToTexts<T>(name: string, v: T | (T | null)[] | undefined, length: number): { values: (T | null)[]; error?: string } {
  if (v === undefined) return { values: Array.from({ length }, () => null) };
  if (Array.isArray(v)) {
    if (v.length !== length) return { values: [], error: `${name} has ${v.length} entries but texts has ${length}; per-text arrays must be the same length.` };
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
  ...generationFailureFields,
});

function registerSpeech(r: ToolRegistrar, gw: GatewayClient): void {
  const numOrList = (item: z.ZodNumber) => z.union([item, z.array(item.nullable())]);
  r.registerTool(
    "generate_audio_speech",
    {
      confirmable: true,
      description: [
        "Text-to-speech: synthesise one or more speech clips. Every `texts` entry becomes exactly one clip — the entry is the words to be spoken, not an instruction.",
        "",
        'Choosing a vendor (see `hub_list_capabilities({modality:"audio.tts"})`): vendor="official" covers plain reading, narration, everyday dialogue dubbing and ordinary voice preferences resolved through the voice catalog. vendor="seedaudio" with model_name="seed-audio-1.0" is for performed/cinematic dubbing (short drama, radio drama, trailers), cloning a voice from reference audio or an image, natural-language custom voices the catalog cannot satisfy, or speech mixed with ambience/BGM/SFX. Lacking a voice_id is not by itself a reason to pick seedaudio.',
        "",
        'vendor="official": `texts` as a string gives one clip; as an array gives a batch (multi-speaker dialogue, per-scene narration) synthesised in parallel. The per-text fields `voice_ids` / `filenames` / `emotions` / `speeds` / `vols` / `pitches` line up with `texts` by index (a scalar applies to all). `language_boost` (default auto) and `pronunciation_dict` apply to every text.',
        "",
        "SeedAudio: one clip per call; no voice catalog and no voice_id. Give up to 3 `reference_audio_paths` OR a single `reference_image_path` (not both), and refer to uploaded audio inside the text as @音频1 / @音频2 … in upload order.",
        "",
        'Voice ids: set voice_id_source="user" only for an exact id the user gave, "catalog" for ids from `hub_voice_prepare` search, "tool" for ids produced by clone/design. Never make up an id.',
        "",
        "Returns {ok, path, duration, subtitle_path?, node_id?} for one clip, or {ok, results[]} for a batch (per-item success or failure).",
      ].join("\n"),
      inputSchema: {
        texts: z.union([z.string(), z.array(z.string())]).describe("Words to speak. A string = one clip; an array = one clip per entry."),
        vendor: z
          .enum(["official", "seedaudio"])
          .optional()
          .describe("TTS vendor. Inferred when omitted: seedaudio for seed-audio-1.0, otherwise `official`."),
        voice_ids: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe("Voice id(s); an array must match the length of `texts`. Defaults to `Friendly_Person`."),
        voice_id: z.string().optional().describe("Shortcut for a single voice id applied to every text. Do not combine with `voice_ids`."),
        voice_id_source: z
          .enum(["user", "catalog", "tool"])
          .optional()
          .describe("Required whenever a catalog-backed voice id (vendor `official`) is given: user = exact id from the user; catalog = hub_voice_prepare search result; tool = clone/design result."),
        filenames: z.union([z.string(), z.array(z.string())]).optional().describe("Per-text output name(s), no file extension."),
        filename: z.string().optional().describe("Shortcut for a single filename. Do not combine with `filenames`."),
        speeds: numOrList(z.number().min(0.5).max(2)).optional().describe("Speaking-rate multiplier per text, 0.5–2. Default 1.0."),
        vols: numOrList(z.number().gt(0).max(10)).optional().describe("Volume per text for vendor `official`, in (0, 10]. Default 1.0."),
        volumes: numOrList(z.number().min(0.5).max(2)).optional().describe("SeedAudio volume multiplier, 0.5–2. Default 1.0."),
        pitches: numOrList(z.number().int().min(-12).max(12)).optional().describe("Per-text pitch offset (semitones, integer -12..12); 0 when omitted."),
        emotions: z.union([EmotionSchema, z.array(EmotionSchema.nullable())]).optional(),
        language_boost: z
          .enum(LANGUAGE_BOOST)
          .default("auto")
          .describe("Vendor `official` only. Tells the recognizer which language the text is in: name the language when the text is all one language, use `Chinese,Yue` for Cantonese, otherwise leave `auto` (the default)."),
        model_name: z
          .enum(SPEECH_MODELS)
          .optional()
          .describe("speech-2.8-hd (default, best quality), speech-2.8-turbo (faster drafts), or seed-audio-1.0 (SeedAudio, reference-conditioned)."),
        pronunciation_dict: PronunciationDictSchema.optional().describe("Pronunciation rules applied to every text in the call."),
        voice_modify: VoiceModifySchema.optional().describe("Only for vendor `official`: post-processing voice effects. Use sparingly."),
        reference_audio_paths: z
          .array(z.string())
          .max(3)
          .optional()
          .describe("SeedAudio only: up to 3 reference audio files (wav/mp3/pcm/ogg_opus, ≤30s and ≤10MB each). Excludes reference_image_path."),
        reference_image_path: z
          .string()
          .optional()
          .describe("SeedAudio only: one reference image (jpeg/png/webp, ≤10MB). Excludes reference_audio_paths."),
        sample_rate: z
          .enum(SEED_SAMPLE_RATES)
          .optional()
          .describe("Vendor seedaudio only: sample rate of the result in Hz; 24000 when omitted."),
        format: z.enum(["wav", "mp3", "pcm", "ogg_opus"]).optional().describe("SeedAudio only: output format (default wav)."),
      },
      outputSchema: {
        ok: z.boolean(),
        path: z.string().optional(),
        duration: z.number().optional(),
        subtitle_path: z.string().optional(),
        node_id: z.string().optional(),
        results: z.array(speechResultItem).optional(),
        ...generationFailureFields,
      },
    },
    async (args) => {
      // vendor 缺省按 model_name 推断，model_name 缺省取该 vendor 的默认模型
      const wantsSeed = args.vendor === "seedaudio" || (args.vendor === undefined && args.model_name === "seed-audio-1.0");
      const vendor = wantsSeed ? "seedaudio" : "official";
      const modelName = args.model_name || (wantsSeed ? "seed-audio-1.0" : "speech-2.8-hd");
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
      if (modelName === "seed-audio-1.0") return inputError('seed-audio-1.0 is only served by vendor="seedaudio"; set vendor accordingly.');

      const explicitVoice = args.voice_ids !== undefined || args.voice_id !== undefined;
      if (explicitVoice && !args.voice_id_source) {
        return inputError("voice_id_source is required whenever voice_id / voice_ids is given.");
      }
      const voices: string[] =
        args.voice_ids !== undefined
          ? Array.isArray(args.voice_ids)
            ? args.voice_ids
            : Array.from({ length: count }, () => args.voice_ids as string)
          : Array.from({ length: count }, () => args.voice_id || DEFAULT_VOICE);
      if (voices.length !== count) {
        return inputError(`voice_ids has ${voices.length} entries but texts has ${count}; they must line up one-to-one.`);
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
          `Got ${filenames.length} filename(s) for ${count} text(s). Give one \`filename\` for a single clip, or a \`filenames\` array with one entry per text.`,
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
        return generationUnknownReply(`Speech generation failed: ${err instanceof Error ? err.message : String(err)}`);
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
  if (modelName !== "seed-audio-1.0") return inputError('vendor="seedaudio" only has model_name="seed-audio-1.0".');
  if (texts.length !== 1) {
    return inputError(
      'vendor="seedaudio" makes a single clip per call. Issue one call per line, or switch to vendor="official" to batch several texts.',
    );
  }
  const hasVoiceArgs = Boolean(args.voice_id) || Boolean(args.voice_ids) || Boolean(args.voice_id_source);
  if (hasVoiceArgs) {
    return inputError(
      "vendor=\"seedaudio\" has no voice catalog, so voice_id / voice_ids / voice_id_source are not accepted. Condition the voice with reference_audio_paths or reference_image_path.",
    );
  }
  if (args.emotions) return inputError("emotions is not available with vendor=\"seedaudio\"; put the intended delivery into the text itself.");
  if (args.pronunciation_dict || args.voice_modify) return inputError("pronunciation_dict and voice_modify only work with vendor=\"official\", not seedaudio.");
  const audioRefs = args.reference_audio_paths?.filter((ref) => ref.trim().length > 0) ?? [];
  const imageRef = args.reference_image_path?.trim();
  if (audioRefs.length > 0 && imageRef) {
    return inputError("Pass reference_audio_paths or reference_image_path, not both.");
  }
  const firstListed = typeof args.filenames === "string" ? args.filenames : args.filenames?.[0];
  const filename = args.filename ?? firstListed;
  if (!filename) return inputError("vendor=\"seedaudio\" needs a filename.");
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
    return generationUnknownReply(`SeedAudio speech generation failed: ${err instanceof Error ? err.message : String(err)}`);
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
  if (item.action === "search_catalog" && !item.language) return `items[${index}]: search_catalog needs a language.`;
  if (item.action === "clone" && !item.audio_path) return `items[${index}]: clone needs audio_path.`;
  const designIncomplete = !item.prompt || !item.preview_text;
  if (item.action === "design" && designIncomplete) {
    return `items[${index}]: design needs both prompt and preview_text.`;
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
    id: z.string().optional().describe("Optional caller-side id echoed back, e.g. a role or asset id."),
    action: VoiceActionSchema,
    language: z
      .preprocess((v) => caseInsensitiveEnumLookup(languages, v), z.enum(languages as [string, ...string[]]))
      .optional()
      .describe("[search_catalog] Language of the voices to list; normally the user's chat language."),
    gender: z
      .preprocess((v) => caseInsensitiveEnumLookup(genders, v), z.enum(genders as [string, ...string[]]))
      .optional()
      .describe("[search_catalog] Set it only if the user named a gender."),
    audio_path: z.string().optional().describe("[clone] Reference recording to clone (mp3/m4a/wav, 10s–5min, ≤20MB)."),
    prompt_audio_path: z.string().optional().describe("[clone] Optional prompt clip, under 8 seconds and at most 20MB."),
    prompt_text: z.string().optional().describe("[clone] Transcript of prompt_audio_path."),
    demo_text: z.string().optional().describe("[clone] Optional preview sentence (≤1000 chars)."),
    demo_model: z
      .enum(["speech-2.8-hd", "speech-2.8-turbo"])
      .optional()
      .default("speech-2.8-hd")
      .describe("[clone] Model used for the preview."),
    need_noise_reduction: z.boolean().optional().describe("[clone] Denoise the reference first."),
    need_volume_normalization: z.boolean().optional().describe("[clone] Normalise the reference loudness first."),
    prompt: z.string().optional().describe("[design] Natural-language description of the voice."),
    preview_text: z.string().max(500).optional().describe("[design] Sentence spoken in the trial audio."),
  });
  const ResultSchema = z.object({
    index: z.number(),
    id: z.string().optional(),
    action: VoiceActionSchema,
    ok: z.boolean(),
    total: z.number().optional().describe("[search_catalog] How many voices matched."),
    voices: z.array(VoiceCandidateSchema).optional().describe("[search_catalog] Matching voices."),
    voice_id: z.string().optional().describe("[clone/design] The new voice id."),
    demo_audio: z.string().optional().describe("[clone] Preview audio URL."),
    trial_audio_url: z.string().optional().describe("[design] Trial audio URL."),
    input_sensitive_type: z.number().optional().describe("[clone] Risk flag for the reference audio (0 = clean)."),
    error: z.string().optional().describe("[failed item] What went wrong."),
  });

  r.registerTool(
    "voice_prepare",
    {
      description: [
        "Get voice_id values ready for hub_generate_audio_speech. Always pass `items[]` (one element for a single role); items run in parallel.",
        "",
        "Actions per item:",
        "- `search_catalog`: list preset voices for a language (optionally a gender). This is the normal way to pick a voice.",
        "- `clone`: clone a voice from a user-supplied recording. Keep and reuse the returned `voice_id`; never clone the same recording twice.",
        "- `design`: create a brand-new voice from a text description. Only when the user explicitly asks to design / customise / create a voice — not for ordinary adjective-based picking.",
        "",
        "Returns {ok, total, successCount, errorCount, results[], failed[]}; each result carries its `index` (and your `id`).",
      ].join("\n"),
      inputSchema: {
        items: z.array(ItemSchema).min(1).max(30).describe("Voice preparation requests. A single role still goes in a one-element array."),
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
          items.map((item, i) => failedItem(item, i, invalid.get(i) ?? "skipped: another item in this batch has invalid input")),
        );
      }

      let voicesPromise: Promise<VoiceInfo[]> | undefined;
      const getVoices = () => (voicesPromise ??= fetchVoicesWithCache(gw));

      const results = await Promise.all(
        items.map(async (item, index): Promise<VoiceResult> => {
          const idPart = item.id ? { id: item.id } : {};
          if (item.action === "search_catalog") {
            const all = await getVoices();
            if (all.length === 0) return failedItem(item, index, "voice catalog unavailable (gateway returned no voices)");
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
                  `the reference recording was risk-flagged (type=${res.input_sensitive_type}); confirm with the user before using this voice`,
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
              return failedItem(item, index, `Voice clone failed: ${err instanceof Error ? err.message : String(err)}`);
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
            return failedItem(item, index, `Voice design failed: ${err instanceof Error ? err.message : String(err)}`);
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
        "Read an audio file's metadata (duration in seconds, container format, size, bit rate) with a local probe. Call it whenever a later step needs the exact audio duration, e.g. before cutting or aligning clips.",
      inputSchema: {
        audio_path: z.string().describe("Path of the audio file"),
      },
      outputSchema: {
        duration: z.number().describe("Duration in seconds"),
        format_name: z.string().optional().describe('Container format name, e.g. "mp3" or "wav"'),
        size: z.number().optional().describe("File size in bytes"),
        bit_rate: z.number().optional().describe("Bit rate in bits per second"),
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
        return { isError: true, content: [{ type: "text", text: `Error: could not probe audio file: ${err instanceof Error ? err.message : String(err)}` }] };
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
