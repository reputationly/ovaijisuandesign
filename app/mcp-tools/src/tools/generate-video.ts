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
      "Output resolution token; accepted values depend on vendor/model (hub_list_capabilities parameters). MiniMax-H3: 768P/2K (2K if unspecified); H3-Max family: 480P/768P (480P if unspecified); seedance 480p..4k; veo3 720p/1080p; kling 720P/768P/1080P; wan 480P/720P/1080P.",
    ),
  aspect_ratio: z
    .enum(["adaptive", "16:9", "9:16", "1:1", "4:3", "3:4", "21:9"])
    .optional()
    .describe(
      "Framing for every vendor that has one. Text-to-video and most reference modes need a fixed ratio; frame-driven modes (i2v / first-last-frame) inherit the frame ratio, so omit it there. adaptive is only valid where the vendor allows it (e.g. H3-Max multimodal, wan).",
    ),
  mode: z.enum(["std", "pro", "4k"]).optional().describe("kling quality tier."),
  sound: z.enum(["on", "off"]).optional().describe("kling native audio."),
  multi_shot: Boolish.optional().describe("kling multi-shot."),
  generate_audio: Boolish.optional().describe("Native audio for seedance / MiniMax-H3 / wan."),
  prompt_extend: Boolish.optional().describe("wan prompt rewriting (default true; false sends the prompt verbatim)."),
  watermark: Boolish.optional().describe("wan watermark (default false)."),
  seed: z.union([z.number().int(), z.string()]).optional().describe("wan seed: -1 random, else 0..2147483647."),
  file_url: z.string().optional().describe("wan: a document (docx, pdf, pptx, xlsx, txt or md) to turn into video, as a public link or local file; mode=multimodal only."),
  prompt_expansion_mode: z.enum(["disabled", "balanced", "quality"]).optional().describe("Prompt expansion for the MiniMax-H3-Max family."),
  output_format: z.enum(["mp4", "mov"]).optional().describe("seedance2.5 output container."),
  image_types_json: z.string().optional().describe("kling: JSON array string."),
  video_list_json: z.string().optional().describe("kling: JSON array string."),
  video_refer_type: z.enum(["feature", "base"]).optional(),
  keep_original_sound: z.enum(["yes", "no"]).optional(),
  character_orientation: z.enum(["video", "image"]).optional().describe("kling motion-control only."),
};

const MISPLACED_KEYS = Object.keys(VIDEO_VENDOR_PARAM_SHAPE).filter((k) => k !== "mode"); // 顶层 mode 是生成模式，同名合法

const INPUT_SCHEMA = {
  vendor: z.enum(VIDEO_VENDOR_ENUM).describe("Video vendor. hub_list_capabilities shows which vendors are live in this session."),
  mode: z
    .enum(VIDEO_MODE_ENUM)
    .describe("Generation mode. Only some (vendor, model_id, mode) combinations exist: check model_modes (or modes) in hub_list_capabilities."),
  model_id: z
    .enum(VIDEO_MODEL_ID_ENUM)
    .optional()
    .describe("One of the ids in hub_list_capabilities vendors[].models (leave out to get the default for this vendor and mode). Display names and picker ids are rejected."),
  prompt: z.string().describe("Brief for one final video. Separate deliverables go in separate calls."),
  filename: z.string().describe("Output filename without extension."),
  duration: z
    .number()
    .optional()
    .describe("Seconds; the allowed range differs per vendor/model (see hub_list_capabilities). Ignored by kling avatar (follows the audio) and kling motion-control (follows the source video)."),
  first_frame_image: z
    .string()
    .optional()
    .describe(
      "Explicit opening keyframe (path or URL), only when the user wants the video to start from this image. Cannot be combined with reference_* fields; generic character/style/scene references belong in reference_image_paths.",
    ),
  last_frame_image: z
    .string()
    .optional()
    .describe("Explicit closing keyframe for first-last-frame modes; cannot be combined with reference_* fields. The H3-Max family needs first_frame_image and treats this as optional."),
  reference_image_paths: z
    .array(z.string())
    .optional()
    .describe("Reference images guiding identity/style/design/world/action; the default slot for image refs in multimodal (image files only)."),
  reference_video_urls: z.array(z.string()).optional().describe("Reference videos for multimodal; seedance also takes the source clip here for video-edit / video-extend."),
  reference_audio_urls: z.array(z.string()).optional().describe("Reference audios (MiniMax-H3 multimodal, seedance multimodal / video-edit, wan). seedance accepts mp3 and wav only."),
  audio_path: z.string().optional().describe("Driving audio for avatar / audio-driven modes (workspace-relative, absolute or URL)."),
  video_url: z.string().optional().describe("Driving video for motion-control modes."),
  vendor_params: z
    .object(VIDEO_VENDOR_PARAM_SHAPE)
    .strict()
    .optional()
    .describe("Flat vendor knobs, only the listed keys and within the vendor's parameters from hub_list_capabilities. The model goes in model_id, never here."),
  order: z
    .number()
    .int()
    .optional()
    .describe(
      "Position of this clip among its siblings when the canvas groups them (smaller first) — typically the shot number, so canvas_group_recent_outputs arranges the story correctly. Make one call per shot and give each its own value.",
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

const DESCRIPTION = [
  "Generate one video with the chosen vendor + mode. One call returns one final video; the prompt briefs that single video, and multiple deliverables need separate calls.",
  "",
  "Use it when the content must change: new footage, or edits/continuations of a clip that alter action, movement, setting, subject, backdrop, look, camera direction or meaningful sound and picture. Mechanical cutting, joining, cropping, re-encoding, muxing, captions or timeline assembly go to postprocess tools.",
  "",
  "Modes: t2v = from text alone; multimodal = guided by image/video/audio references; i2v = starts on a given frame; first-last-frame = pinned start and/or end frame; plus video-edit, video-extend, motion-control, avatar and omni. Which vendor/model supports which mode is in hub_list_capabilities (model_modes, falling back to modes).",
  "",
  "Guidance media (who, what it looks like, where, how it moves) are references, not frames. With seedance, pass them via mode=multimodal in the reference_* field for their kind — images, videos and audios each in their own list; an image becomes first_frame_image only if the user wants the clip to open on it. No vendor accepts frame fields and reference_* fields together.",
  "",
  "wan (wan3.0-video and its -prime variant) decides what to do from the media you attach: either keyframes, or references/vendor_params.file_url, never both. Prompts can point at inputs as 图1 / 视频1 / 音频1. For editing or continuing a clip, attach it as a reference video under mode=multimodal and leave aspect_ratio adaptive.",
  "",
  'Anything vendor-specific (resolution, aspect ratio, multi-shot, sound, character_orientation and so on) belongs in the flat vendor_params object and never beside the common fields — for example vendor_params: { resolution: "1080p", aspect_ratio: "16:9" }. The model is chosen through model_id.',
  "Concurrency: the slot model is the chosen model_id (or the vendor+mode default); one call takes one slot.",
  "",
  "Returns {ok, path, duration?, node_id?, effective_params?}. A failure with do_not_resubmit means the task may still finish or was already charged: do not resubmit.",
].join("\n");

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
