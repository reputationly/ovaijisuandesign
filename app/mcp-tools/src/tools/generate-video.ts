import { z } from "zod";

import { generationErrorReply, generationUnknownReply, structuredReply } from "../replies.js";
import { runAsync } from "../run-async.js";
import { BillingErrorMetadataSchema, FailurePresentationSchema } from "../schemas.js";
import { plainError } from "./capability-params.js";
import { scalarSlotMismatch } from "./media-validation.js";
import {
  buildVendorParamHints,
  canonicalModelIdsByVendor,
  normalizePickerIds,
  pickerIdsByVendor,
  resolveModelId,
  VIDEO_MODE_ENUM,
  VIDEO_MODEL_ID_ENUM,
  VIDEO_VENDOR_CONFIGS,
  VIDEO_VENDOR_ENUM,
} from "./model-catalog.js";
import { pickerSelectionError, selectedModelsForSession } from "./selected-models.js";
import type { RegisterTools } from "./types.js";
import { buildVideoBody, videoRouteModel, type VideoArgs } from "./video-body.js";

/**
 * generate_video：一次调用一个视频。提交体见 video-body.ts；
 * params.order 透传给 gateway 用于自动分组内排序。
 */

const Boolish = z.union([z.boolean(), z.enum(["true", "false"])]);

const VIDEO_VENDOR_PARAM_SHAPE = {
  resolution: z
    .enum(["480p", "720p", "1080p", "4k", "480P", "720P", "768P", "1080P", "2K"])
    .optional()
    .describe(
      "Video resolution token. MiniMax-H3 supports 768P/2K; use resolution=2K when the user does not specify a resolution. MiniMax-H3-Max and MiniMax-H3-Max-Turbo support 480P/768P; use resolution=480P when unspecified. Seedance uses 480p/720p/1080p/4k; veo3 uses 720p/1080p; Kling uses 720P/768P/1080P; wan uses 480P/720P/1080P. Obey the selected model rules from hub_list_capabilities.",
    ),
  aspect_ratio: z
    .enum(["adaptive", "16:9", "9:16", "1:1", "4:3", "3:4", "21:9"])
    .optional()
    .describe(
      "Unified video aspect ratio for every vendor that exposes a framing control. MiniMax-H3 t2v/multimodal requires an explicit non-adaptive ratio; MiniMax-H3-Max multimodal also accepts adaptive, but its t2v still requires a fixed ratio. Omit this key for MiniMax-H3 i2v/first-last-frame and MiniMax-H3-Max family first-last-frame because they inherit the supplied frame ratio; fixed ratios are rejected.",
    ),
  mode: z.enum(["std", "pro", "4k"]).optional().describe("Kling quality mode."),
  sound: z.enum(["on", "off"]).optional().describe("Kling native audio switch."),
  multi_shot: Boolish.optional().describe("Kling multi-shot switch."),
  generate_audio: Boolish.optional().describe("Seedance / MiniMax-H3 / wan audio switch."),
  prompt_extend: Boolish.optional().describe("wan upstream prompt rewriting switch. Default true; set false to send the prompt verbatim."),
  watermark: Boolish.optional().describe("wan watermark switch. Default false."),
  seed: z.union([z.number().int(), z.string()]).optional().describe("wan random seed: -1 for random, otherwise 0..2147483647."),
  file_url: z.string().optional().describe("wan source document (docx/pdf/pptx/xlsx/txt/md) as a public URL or local path, usable with mode=multimodal."),
  prompt_expansion_mode: z.enum(["disabled", "balanced", "quality"]).optional().describe("MiniMax-H3-Max family prompt expansion mode."),
  output_format: z.enum(["mp4", "mov"]).optional().describe("Seedance 2.5 output container."),
  image_types_json: z.string().optional().describe("Kling JSON array string."),
  video_list_json: z.string().optional().describe("Kling JSON array string."),
  video_refer_type: z.enum(["feature", "base"]).optional(),
  keep_original_sound: z.enum(["yes", "no"]).optional(),
  character_orientation: z.enum(["video", "image"]).optional().describe("Kling motion-control only."),
};

const MISPLACED_KEYS = Object.keys(VIDEO_VENDOR_PARAM_SHAPE).filter((k) => k !== "mode"); // 顶层 mode 是生成模式，同名合法

const INPUT_SCHEMA = {
  vendor: z.enum(VIDEO_VENDOR_ENUM).describe("Video generation vendor. Call `hub_list_capabilities` for live per-region menu."),
  mode: z
    .enum(VIDEO_MODE_ENUM)
    .describe("Generation mode. Not every (vendor, model_id, mode) combination is supported; see `hub_list_capabilities` vendors[].model_modes when present, otherwise vendors[].modes."),
  model_id: z
    .enum(VIDEO_MODEL_ID_ENUM)
    .optional()
    .describe("Canonical model_id from hub_list_capabilities.vendors[].models. Omit to use the vendor+mode default. Do not pass display names or picker ids."),
  prompt: z.string().describe("Single-video brief for one final artifact. Preserve deliverable topology; separate user-intended outcome units use separate calls."),
  filename: z.string().describe("Output filename WITHOUT extension."),
  duration: z
    .number()
    .optional()
    .describe("Duration in seconds. Per-vendor allowed range differs; see hub_list_capabilities parameters. IGNORED by kling mode=avatar (length follows the input audio, up to ~60s per generation) and kling mode=motion-control (length follows the source motion video) — do not pass it for those modes."),
  first_frame_image: z
    .string()
    .optional()
    .describe(
      "Explicit opening/head keyframe path or URL. Mutually exclusive with reference_image_paths, reference_video_urls, and reference_audio_urls. Use only when the user asks for the video to start from this image; generic character/style/scene refs belong in reference_image_paths. Do not pass private asset prefixes from MCP.",
    ),
  last_frame_image: z
    .string()
    .optional()
    .describe("Explicit tail keyframe for vendors/modes that support first-last-frame; mutually exclusive with reference_image_paths, reference_video_urls, and reference_audio_urls. MiniMax-H3-Max and MiniMax-H3-Max-Turbo require first_frame_image and accept last_frame_image only as an optional closing frame."),
  reference_image_paths: z
    .array(z.string())
    .optional()
    .describe("Reference images for identity/style/design/world/action guidance. This is the default multimodal slot for generated or attached image refs; multimodal restricts these to image extensions."),
  reference_video_urls: z.array(z.string()).optional().describe("Reference video URLs for multimodal references. Seedance also uses this field for video-edit / video-extend."),
  reference_audio_urls: z.array(z.string()).optional().describe("Reference audio URLs (MiniMax-H3 multimodal; Seedance multimodal / video-edit). Only mp3 and wav are supported for Seedance; convert other formats first."),
  audio_path: z.string().optional().describe("Audio driving file for supported avatar or audio-driven modes. Workspace-relative / absolute / URL."),
  video_url: z.string().optional().describe("Driving video URL for motion-control modes."),
  vendor_params: z
    .object(VIDEO_VENDOR_PARAM_SHAPE)
    .strict()
    .optional()
    .describe("Video vendor params. Use only keys listed here and obey the selected vendor parameters from hub_list_capabilities.vendors[].parameters. Model selection goes in model_id, never in vendor_params."),
  order: z
    .number()
    .int()
    .optional()
    .describe(
      "Optional sequence index for this video, used to sort siblings within an auto-created group (ascending). Set this when output order is meaningful — e.g. storyboard shot videos: pass the shot/scene number so canvas_group_recent_outputs lays them out in story order. Generate shots one call at a time, each with its own order. Omit for unordered outputs.",
    ),
};

const OUTPUT_SCHEMA = {
  ok: z.boolean(),
  path: z.string().optional(),
  duration: z.number().optional(),
  node_id: z.string().optional(),
  effective_params: z.record(z.string()).optional(),
  error: z.string().optional(),
  error_code: z.string().optional(),
  user_message: z.string().optional(),
  failure_presentation: FailurePresentationSchema.optional(),
  recovery_handle: z.string().optional(),
  do_not_resubmit: z.boolean().optional(),
  billing: BillingErrorMetadataSchema.optional(),
};

const DESCRIPTION = "Generate one video via the configured vendor + mode combo.\n" +
  "Artifact cardinality: one invocation returns one final video. " +
  "The prompt is a single-video brief; multiple deliverables must be represented as separate asset tasks/tool calls.\n" +
  "\n" +
  "Use for semantic video creation, source-video editing, or extension: change action, motion, scene, subject, background, style, camera intent, or meani" +
  "ng-bearing audio/visual content. Deterministic trim/merge/crop/transcode/mux/subtitle/timeline operations belong to narrow postprocess tools.\n" +
  "\n" +
  "Mode selection: t2v (text-only) / multimodal (Seedance all-purpose refs across image/video/audio) / i2v (explicit opening-frame anchor) / first-last-f" +
  "rame (explicit head and/or tail keyframes) / video-edit / video-extend / motion-control / avatar / omni. " +
  "Not every (vendor, model_id, mode) combo is supported — see hub_list_capabilities.vendors[].model_modes when present, otherwise vendors[].modes.\n" +
  "\n" +
  "Reference routing: images/videos/audios that should guide identity, style, design, world, or action are references by default. " +
  "For Seedance, use mode=multimodal with `reference_image_paths` / `reference_video_urls` / `reference_audio_urls`; do not put a generated character/sty" +
  "le/scene image into `first_frame_image` unless the user explicitly asked it to be the opening frame.\n" +
  "\n" +
  "Seedance i2v/first-last-frame: `first_frame_image` and `last_frame_image` are timeline keyframes. " +
  "Use them only for explicit start/end/opening/closing frame or keyframe-transition requests. " +
  "Do not pass private asset prefixes; Seedance private-avatar retry is handled inside the gateway when needed.\n" +
  "\n" +
  "Frame/reference exclusivity: if either `first_frame_image` or `last_frame_image` is provided, do not pass `reference_image_paths`, `reference_video_ur" +
  "ls`, or `reference_audio_urls`. Explicit keyframes and reference media cannot be combined for any vendor or mode.\n" +
  "\n" +
  "Seedance multimodal: reference images / videos / audios must each go in their own slot (mixing video extensions into `reference_image_paths` will be r" +
  "ejected with a clear error).\n" +
  "\n" +
  "Wan (wan3.0-video / wan3.0-video-prime) is one entry point whose operation follows the attached media: keyframes and reference media (plus `vendor_par" +
  "ams.file_url`) are mutually exclusive groups, and the prompt may address the attached media positionally as 图1 / 视频1 / 音频1. " +
  "It has no video-edit / video-extend mode but still does both: use mode=multimodal with the source clip in `reference_video_urls` and the edit or conti" +
  "nuation intent in the prompt, keeping the default adaptive aspect_ratio.\n" +
  "\n" +
  "Vendor knobs not in the common schema (resolution, aspect ratio, multi-shot, sound on/off, character_orientation, etc.) MUST go in `vendor_params` as " +
  "a flat key-value map; never put them at the top level. " +
  "All video vendors use the same framing key, for example: `vendor_params: { aspect_ratio: \"9:16\", resolution: \"720p\", generate_audio: true }`. " +
  "Use the common `model_id` field for model selection.\n" +
  "Concurrency: the canonical concurrency model_id is the selected `model_id` (or the vendor+mode default when omitted). " +
  "One video invocation consumes one generation slot for that model.\n";

function misplacedParamsError(raw: Record<string, unknown>): string | undefined {
  const misplaced = MISPLACED_KEYS.filter((k) => k in raw);
  if (misplaced.length === 0) return undefined;
  return `Nothing was submitted: ${misplaced.map((k) => `\`${k}\``).join(", ")} sit at the top level but are vendor settings. Put them inside vendor_params as ${misplaced
    .map((k) => `\`vendor_params.${k}\``)
    .join(", ")}.`;
}

function frameReferenceConflict(args: VideoArgs): string | undefined {
  if (!args.first_frame_image && !args.last_frame_image) return undefined;
  const fields = (["reference_image_paths", "reference_video_urls", "reference_audio_urls"] as const).filter((f) => (args[f]?.length ?? 0) > 0);
  if (fields.length === 0) return undefined;
  return `Keyframes (first_frame_image / last_frame_image) and ${fields.join(", ")} are mutually exclusive. Either keep the frames and drop the references, or drop the frames and use a mode that takes references.`;
}

/** 回给 agent 的实际生效参数（字符串值、不含 order），便于它复述或复用。 */
function effectiveParams(params: Record<string, string>): Record<string, string> | undefined {
  const entries = Object.entries(params).filter(([k, v]) => k !== "order" && typeof v === "string");
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export const registerGenerateVideo: RegisterTools = (registrar, gw, region) => {
  const pickerIds = pickerIdsByVendor("video", VIDEO_VENDOR_CONFIGS, region);
  const canonicalIds = canonicalModelIdsByVendor(VIDEO_VENDOR_CONFIGS);

  registrar.registerTool(
    "generate_video",
    {
      confirmable: true,
      vendorParamHints: buildVendorParamHints("video"),
      description: DESCRIPTION,
      inputSchema: INPUT_SCHEMA,
      outputSchema: OUTPUT_SCHEMA,
    },
    async (raw) => {
      const misplaced = misplacedParamsError(raw as Record<string, unknown>);
      if (misplaced) return plainError(misplaced);
      const args = raw as unknown as VideoArgs;
      const conflict = frameReferenceConflict(args);
      if (conflict) return plainError(conflict);
      const slot = scalarSlotMismatch(args);
      if (slot) {
        const hint = slot.expected === "image" ? "This slot needs a still image; grab a frame from the video first if that is all you have." : "This slot needs a video file or link; a still image cannot drive the motion.";
        return plainError(`${slot.field} expects ${slot.expected} files, but received "${slot.offender}" which looks like a ${slot.detected} file. ${hint}`);
      }

      const config = VIDEO_VENDOR_CONFIGS[args.vendor];
      // 守卫比较 canonical id：别名（beta_fast 等）先归一，免得被误判成不支持
      const route = videoRouteModel(args.vendor, args.mode, args.model_id);
      const resolved = resolveModelId("video", config, region, route.modelId, `video vendor=${args.vendor}`);
      const guardModelId = resolved.modelId ?? route.modelId;
      const selected = await selectedModelsForSession(gw, `category=video vendor=${args.vendor}`);
      const selectedIds = selected?.video ? normalizePickerIds("video", config, region, selected.video) : undefined;
      const pickerError = pickerSelectionError("video", args.vendor, guardModelId, pickerIds, canonicalIds, selectedIds);
      if (pickerError) return plainError(pickerError);

      const built = await buildVideoBody(args, region);
      if (built.error !== undefined) return plainError(built.error);
      const body = built.body;
      if (args.order !== undefined) body.params = { ...body.params, order: String(args.order) };

      try {
        const r = await runAsync(gw, "video", body);
        if (!r.ok) return generationErrorReply({ ...r, error: `Error (${args.vendor}:${args.mode}): ${r.error}` });
        const eff = effectiveParams(body.params);
        return structuredReply({
          ok: true,
          path: r.path,
          ...(r.duration ? { duration: r.duration } : {}),
          ...(r.node_id ? { node_id: r.node_id } : {}),
          ...(eff ? { effective_params: eff } : {}),
        });
      } catch (err) {
        return generationUnknownReply(`Error (${args.vendor}:${args.mode}): ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
};
