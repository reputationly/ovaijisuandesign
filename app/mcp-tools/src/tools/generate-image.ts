import { z } from "zod";

import type { ReleaseRegion } from "../env.js";
import { nearestAspectRatio, probeOneMedia } from "../ffprobe.js";
import type { GatewayClient } from "../gateway-client.js";
import { generationErrorReply, generationUnknownReply, structuredReply } from "../replies.js";
import { runAsync } from "../run-async.js";
import { BillingErrorMetadataSchema, FailurePresentationSchema, type GenerateResponse } from "../schemas.js";
import { IMAGE_ARTIFACT_CARDINALITY_RULE, imageUserFacingNamingRule } from "./capability-manifest.js";
import {
  fillDefaults,
  firstProblem,
  collectVendorParams,
  pickEnum,
  pickInt,
  pickIntInRange,
  plainError,
  type Params,
} from "./capability-params.js";
import { BATCH_CONCURRENCY, pathsOf, settledInBatches } from "./batch-helpers.js";
import { detectSlotMismatch } from "./media-validation.js";
import {
  buildVendorParamHints,
  canonicalModelIdsByVendor,
  defaultModelForSelection,
  IMAGE_ASPECT_RATIO_OPTIONS,
  IMAGE_MODEL_ID_ENUM,
  IMAGE_RESOLUTION_OPTIONS,
  IMAGE_VENDOR_CONFIGS,
  IMAGE_VENDOR_ENUM,
  MIDJOURNEY_MODEL_IDS,
  normalizePickerIds,
  pickerIdsByVendor,
  resolveModelId,
  type ImageVendor,
} from "./model-catalog.js";
import { pickerSelectionError, selectedModelsForSession } from "./selected-models.js";
import type { RegisterTools } from "./types.js";

/**
 * generate_image：每个产物一次 submit，count>1 时按批（每批 10 个）并发。
 * 画布节点由 gateway 在任务完成时建，MCP 只透传影响落位的 params.order 和 source_tool。
 */

export const LANGUAGE_AWARE_FILENAME_DESCRIPTION =
  'Language-sensitive output filename WITHOUT extension. Match the user language: Chinese user/context -> concise Chinese filename, e.g. "\u96E8\u591C\u8857\u666F"; English user/context -> concise English kebab-case filename, e.g. "rainy-night-street". Describe the asset itself; skip episode / scene / project context.';

export const ASPECT_RATIO_SOURCES = [
  "explicit_user",
  "platform_target",
  "source_ref",
  "canvas_source",
  "project_lock",
  "domain_default",
] as const;

const EVIDENCE_TOOLS = [
  "hub_analyse_media",
  "analyse_media",
  "canvas_get_node",
  "hub_canvas_get_node",
  "user",
  "platform",
  "project",
  "workflow",
] as const;

const AspectRatioEvidenceSchema = z
  .object({
    tool: z.enum(EVIDENCE_TOOLS).optional().describe("Where the aspect-ratio evidence came from."),
    file_path: z.string().optional().describe("Local source media path used by hub_analyse_media. Do not pass CDN URLs here."),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    aspect_ratio: z.string().optional(),
    exact_aspect_ratio: z.string().optional(),
    ok: z.boolean().optional(),
    media_type: z.enum(["image", "video", "audio", "unknown"]).optional(),
    duration_sec: z.number().optional(),
    orientation: z.enum(["landscape", "portrait", "square"]).optional(),
    error: z.string().optional(),
  })
  .strict()
  .optional()
  .describe(
    'Evidence for vendor_params.aspect_ratio. Required when aspect_ratio_source is source_ref or canvas_source. Width/height from hub_analyse_media type="metadata" or canvas_get_node are proof; filenames, visual descriptions, and CDN URLs are not.',
  );

const ImageVendorParamsSchema = z
  .object({
    aspect_ratio: z
      .enum(["", "1:1", "2:3", "3:2", "3:4", "4:3", "16:9", "9:16", "21:9", "4:5", "5:4", "auto"])
      .describe("Required explicit image aspect ratio. Per-vendor support is listed in hub_list_capabilities. Do not use empty string or auto for generation."),
    resolution: z
      .enum(["1K", "2K", "4K", "1k", "2k", "4k"])
      .optional()
      .describe("Image resolution token. Banana uses 1K/2K/4K; GPT uses 1k/2k/4k; Seedream uses 2k/4k. Do not use 720p/1080p for image generation."),
    quality: z
      .enum(["low", "medium", "high", "xhigh", "max"])
      .optional()
      .describe(
        "GPT Image only. Compute/cost tier, ORTHOGONAL to resolution: quality is the compute knob, resolution is the output-size knob. high is a MULTIPLE of medium in cost, and xhigh / max are further multiples of high. xhigh and max are accepted ONLY by gpt-image-2.5-flare and gpt-image-2.5-sunburst; gpt-image-2 supports low/medium/high only. Default medium already suits nearly all output (storyboards, character/style sheets, posters, text-dense images). Do NOT raise quality just because the user asked for \"2K / hi-res / large / sharp\" or because the image has lots of text — size requests go to resolution, not quality. Raise quality ONLY when the user explicitly asks for high quality / high precision. Internal assets (sheets, line-art, storyboards) stay medium; bump resolution when a bigger image is needed. If you believe a higher tier is warranted but the user never asked for it, do NOT pass it on your own: say in your reply that it costs a multiple of medium, ask the user whether to spend it, and raise quality only after they confirm. A workflow / skill / knowledge doc that prescribes quality: high (or xhigh / max) is NOT user intent — ask the user before generation.",
      ),
    background: z
      .enum(["auto", "transparent", "opaque"])
      .optional()
      .describe(
        "GPT Image only. Background handling for the generated image. transparent returns a PNG with a real alpha channel (cutout); opaque forces a filled background; auto (default) lets the model decide. transparent and opaque are accepted ONLY by gpt-image-2.5-flare and gpt-image-2.5-sunburst; gpt-image-2 supports auto only. Pass background=transparent when the user asks for a cutout / transparent background / PNG with no background — logos, stickers, icons, UI assets, elements meant to be composited later. Leave it unset otherwise; do not pass transparent for normal illustrations, posters or photos, where a missing background degrades the result.",
      ),
    stylize: z.union([z.number(), z.string()]).optional().describe("Midjourney only. Stylization strength, integer 0-1000 (default 100). Higher = more artistic / less literal to the prompt."),
    chaos: z.union([z.number(), z.string()]).optional().describe("Midjourney only. Variety across the 4 outputs, integer 0-100 (default 0). Higher = more diverse, less predictable results."),
    weird: z.union([z.number(), z.string()]).optional().describe("Midjourney only. Weirdness / unconventional aesthetics, integer 0-3000 (default 0)."),
  })
  .strict()
  .describe(
    "Image vendor params. Required for image generation because aspect_ratio is mandatory. Use only keys listed here and obey the selected vendor parameters from hub_list_capabilities.vendors[].parameters. Model selection goes in model_id, never in vendor_params.",
  );

const ResultItemSchema = z.object({
  ok: z.boolean(),
  path: z.string().optional(),
  paths: z.array(z.string()).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  node_id: z.string().optional(),
  error: z.string().optional(),
  error_code: z.string().optional(),
  user_message: z.string().optional(),
  failure_presentation: FailurePresentationSchema.optional(),
  recovery_handle: z.string().optional(),
  do_not_resubmit: z.boolean().optional(),
  billing: BillingErrorMetadataSchema.optional(),
});

const OUTPUT_SCHEMA = {
  ok: z.boolean(),
  path: z.string().optional(),
  paths: z.array(z.string()).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  node_id: z.string().optional(),
  error_code: z.string().optional(),
  failure_presentation: FailurePresentationSchema.optional(),
  recovery_handle: z.string().optional(),
  do_not_resubmit: z.boolean().optional(),
  billing: BillingErrorMetadataSchema.optional(),
  results: z.array(ResultItemSchema).optional(),
  error: z.string().optional(),
  user_message: z.string().optional(),
};

const INPUT_SCHEMA = {
  vendor: z.enum(IMAGE_VENDOR_ENUM).describe("Image generation vendor. Call `hub_list_capabilities` for live per-region menu."),
  model_id: z
    .enum(IMAGE_MODEL_ID_ENUM)
    .optional()
    .describe("Canonical model_id from hub_list_capabilities.vendors[].models. Omit to use the vendor default. Do not pass display names or picker ids."),
  prompt: z
    .string()
    .optional()
    .describe(
      "Single-image brief for one final artifact. Required when prompts[] is omitted. Preserve deliverable topology: use count/prompts/filenames for multiple user-intended outcome units. Count does not bind identity or aspect-ratio multiplicity; shared visual identity requires image_paths from a common anchor/ref or sequential approved artifact. If no visual anchor exists, create one before final generation.",
    ),
  prompts: z.array(z.string()).optional().describe("Per-output image briefs. Required when count > 1. Length must equal `count` when provided."),
  count: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(1)
    .describe("Number of final image artifacts to generate. 1..10. Defaults to 1; use count>1 only for multiple alternatives within the same ratio, not as the identity or aspect-ratio consistency mechanism."),
  image_paths: z
    .array(z.string())
    .optional()
    .describe(
      "Reference images for editing / restyle / multi-image reference: HTTP(S) URLs, workspace-relative paths, or absolute paths to user/project/session media assets. Do not pass agent knowledge, workflow, skill, or application installation paths.",
    ),
  filename: z.string().optional().describe(`${LANGUAGE_AWARE_FILENAME_DESCRIPTION} Required when filenames[] is omitted. When \`count\` > 1, prefer filenames[] so every artifact is addressable.`),
  filenames: z.array(z.string()).optional().describe(`Per-image filenames without extension. Length must equal \`count\`. ${LANGUAGE_AWARE_FILENAME_DESCRIPTION}`),
  vendor_params: ImageVendorParamsSchema,
  aspect_ratio_source: z
    .enum(ASPECT_RATIO_SOURCES)
    .optional()
    .describe("Task-level source of vendor_params.aspect_ratio. Required for any image_paths request. Use source_ref/canvas_source only when aspect_ratio_evidence can prove the source dimensions."),
  aspect_ratio_evidence: AspectRatioEvidenceSchema,
  order: z
    .number()
    .int()
    .optional()
    .describe(
      "Optional sequence index for this image, used to sort siblings within an auto-created group (ascending). Set this when output order is meaningful — e.g. storyboard scenes: pass the shot/scene number so canvas_group_recent_outputs lays them out in story order. Omit for unordered outputs. When count > 1, use orders[] instead.",
    ),
  orders: z
    .array(z.number().int())
    .optional()
    .describe("Per-output sequence indices for a batch. Length must equal `count`. Each value sorts its image within the auto-created group (ascending). Use for ordered batches like storyboard scenes (e.g. [1,2,3,4,5]). Omit for unordered outputs."),
};

type ImageArgs = z.objectOutputType<typeof INPUT_SCHEMA, z.ZodTypeAny, "passthrough">;

function description(region: ReleaseRegion): string {
  const naming = imageUserFacingNamingRule(region);
  return [
    "Generate one or more images via the configured vendor.",
    "",
    "Use for semantic image creation or editing: add/remove/replace/repaint visible content, change style/background/composition, colorize/restyle a source, or integrate design/text/logos into the image. Deterministic geometry/format-only operations belong to narrow postprocess tools, not image generation.",
    "",
    `Artifact cardinality: ${IMAGE_ARTIFACT_CARDINALITY_RULE} Do not encode output quantity inside prompt prose or add a summary prompt just to satisfy the schema. Auto-suffixed filenames are NOT generated server-side.`,
    ...(naming ? ["", `User-facing naming: ${naming}`] : []),
    "",
    "Vendor-specific knobs (aspect_ratio, resolution, multi-image references, etc.) go in `vendor_params` as a flat key-value map. Use the common `model_id` field for model selection. GPT native `n` is intentionally not exposed; use top-level `count` for batches, with one image per prompt.",
    "Concurrency: the canonical concurrency model_id is the selected `model_id` (or the vendor default when omitted). For count=N, this call consumes N generation slots for that model.",
    "",
    "Aspect ratio: vendor_params.aspect_ratio is mandatory for every image generation call and must be a concrete ratio, not auto. If the ratio is unknown, ask the user with question before generation. If image_paths are present, also pass top-level aspect_ratio_source. Use explicit_user when the user selected the output frame; use source_ref/canvas_source only when that source intentionally owns the frame and aspect_ratio_evidence proves the dimensions. Filenames, visual descriptions, and CDN URLs are not dimension evidence. Do not rely on vendor square defaults or infer output geometry from reference images.",
    "",
    "Quality (GPT Image only): vendor_params.quality defaults to medium and stays medium for nearly everything. quality=high costs a MULTIPLE of medium, and xhigh / max cost further multiples of high, so any tier above medium needs user intent, not your own judgement: raise it only when the user explicitly asked for high quality / high precision, or after you asked them and they confirmed. When you think a higher tier is worth it but the user never asked, ask first in your reply (state the extra cost) instead of spending it silently. xhigh and max are accepted only by gpt-image-2.5-flare and gpt-image-2.5-sunburst.",
    "",
    "Transparent background (GPT Image only): pass vendor_params.background=transparent when the user wants a cutout / transparent background / PNG with no background \u2014 logos, stickers, icons, UI assets, or elements to be composited later. The backend then returns PNG with a real alpha channel. Leave background unset for normal illustrations, posters and photos. transparent and opaque are accepted only by gpt-image-2.5-flare and gpt-image-2.5-sunburst.",
    "",
    "Reference images: pass every visual input through `image_paths` as HTTP(S) URLs, workspace-relative paths, or absolute paths to user/project/session media assets. `image_paths` is the only visual-input surface for this tool. Never pass paths from agent knowledge, workflow, skill, or application installation directories."
    
  ].join("\n");
}

// ── 校验 ──

const DIMENSION_SOURCES = new Set(["source_ref", "canvas_source"]);
const DIMENSION_TOOLS = new Set(["hub_analyse_media", "analyse_media", "canvas_get_node", "hub_canvas_get_node"]);
const isRemote = (v: string) => /^https?:\/\//i.test(v);

function batchStructureError(args: ImageArgs, count: number): string | undefined {
  if (!args.prompt && !args.prompts) {
    return "Image prompt contract violation: provide `prompt` for one artifact or `prompts[]` aligned with count.";
  }
  if (!args.filename && !args.filenames) {
    return "Image filename contract violation: provide `filename` for one artifact or `filenames[]` aligned with count.";
  }
  if (count <= 1) return undefined;
  if (!args.prompts) {
    return `Image batch contract violation: count=${count} requires per-output prompts[]. A prompt is a single-artifact brief; batch cardinality belongs to count plus aligned prompts/filenames.`;
  }
  if (!args.filenames) {
    return `Image batch contract violation: count=${count} requires per-output filenames[]. A batch call must make each produced artifact addressable without relying on implicit filename suffixes.`;
  }
  return undefined;
}

function aspectRatioRequiredError(args: ImageArgs): string | undefined {
  const ratio = args.vendor_params?.aspect_ratio;
  if (ratio === undefined || ratio === null || String(ratio).trim() === "") {
    return "Image generation vendor_params.aspect_ratio is required. Ask the user with question when the output frame is unknown; do not infer it from prompt text, vendor defaults, or reference image dimensions.";
  }
  if (String(ratio).toLowerCase() === "auto") {
    return "Image generation requires a concrete vendor_params.aspect_ratio; auto is not allowed. Use an explicit supported ratio such as 16:9, 9:16, 1:1, 4:3, or 3:4.";
  }
  return undefined;
}

async function evidenceDimensions(args: ImageArgs): Promise<{ width?: number; height?: number; detail?: string; error?: string }> {
  const ev = args.aspect_ratio_evidence;
  if (ev?.file_path) {
    if (isRemote(ev.file_path)) {
      return {
        error:
          "aspect_ratio_evidence.file_path must be a local path. CDN/HTTP URLs are not dimension evidence; keep the original local attachment path or pass width/height from hub_analyse_media metadata.",
      };
    }
    const p = await probeOneMedia(ev.file_path);
    if (!p.ok || !p.width || !p.height) {
      return { error: `Could not verify aspect_ratio_evidence.file_path=${ev.file_path}: ${p.error ?? "missing width/height"}.` };
    }
    return { width: p.width, height: p.height, detail: `${ev.file_path} (${p.width}x${p.height})` };
  }
  if (ev?.width && ev.height) {
    if (!ev.tool || !DIMENSION_TOOLS.has(ev.tool)) {
      return {
        error:
          "aspect_ratio_evidence.width/height for source_ref or canvas_source must name tool=hub_analyse_media or tool=canvas_get_node. Width/height without a tool source is not evidence.",
      };
    }
    return { width: ev.width, height: ev.height, detail: `aspect_ratio_evidence.tool=${ev.tool} width=${ev.width} height=${ev.height}` };
  }
  // 没给证据时退到第一张本地参考图实测
  const local = args.image_paths?.find((p) => !isRemote(p));
  if (local) {
    const p = await probeOneMedia(local);
    if (p.ok && p.width && p.height) return { width: p.width, height: p.height, detail: `${local} (${p.width}x${p.height})` };
  }
  return {};
}

/**
 * 带参考图时核对画幅来源。source_ref / canvas_source 声称“按源图画幅”，
 * 就必须有可验证的宽高，并且所选比例要等于该 vendor 支持的比例里离源图最近的那个。
 */
export async function aspectRatioEvidenceError(
  args: ImageArgs,
  requested: string,
): Promise<{ error: string; errorCode?: "image_aspect_ratio_conflict" } | undefined> {
  if (!args.aspect_ratio_source) {
    return {
      error:
        "Ref-bearing image requests require top-level aspect_ratio_source in addition to vendor_params.aspect_ratio. Use explicit_user when the user named a ratio, source_ref/canvas_source only with width/height evidence, project_lock/platform_target/domain_default when that context intentionally owns framing.",
    };
  }
  if (!DIMENSION_SOURCES.has(args.aspect_ratio_source)) return undefined;
  const dims = await evidenceDimensions(args);
  if (dims.error) return { error: dims.error };
  if (!dims.width || !dims.height) {
    return {
      error: `aspect_ratio_source=${args.aspect_ratio_source} requires verifiable source dimensions. Provide aspect_ratio_evidence with width+height or a local file_path from hub_analyse_media metadata. Filenames, visual descriptions, and CDN URLs are not valid dimension evidence.`,
    };
  }
  const supported = IMAGE_ASPECT_RATIO_OPTIONS[args.vendor].filter((r) => r !== "" && r !== "auto");
  const expected = nearestAspectRatio(dims.width, dims.height, supported);
  if (requested === expected) return undefined;
  return {
    error: [
      `vendor_params.aspect_ratio=${requested} conflicts with ${args.aspect_ratio_source} dimensions ${dims.width}x${dims.height}; nearest supported ratio for ${args.vendor} is ${expected}.`,
      dims.detail ? `Evidence: ${dims.detail}.` : "",
      "If the user explicitly requested a different output crop, set aspect_ratio_source=explicit_user; otherwise use the source ratio.",
    ]
      .filter(Boolean)
      .join(" "),
    errorCode: "image_aspect_ratio_conflict",
  };
}

/** midjourney 允许在 prompt 里写 --v / --ar 这类旗标，写错的在提交前拦下。 */
function readPromptFlag(prompt: string, names: readonly string[]): { present: boolean; value?: string } {
  const re = new RegExp(`(?:^|\\s)--(?:${names.join("|")})(?=$|[=\\s])(?:[=\\s]+(\\S+))?`, "i");
  const m = prompt.match(re);
  if (!m) return { present: false };
  return { present: true, value: m[1] };
}

export function midjourneyPromptFlagError(prompt: string): string | undefined {
  const scope = "image vendor=midjourney";
  const ver = readPromptFlag(prompt, ["version", "v"]);
  if (ver.present && ver.value !== undefined && !["8.2", "8.1", "7"].includes(ver.value)) {
    return `${scope} prompt flag --v ${ver.value} is invalid. Supported versions: 8.2, 8.1, 7, or --niji 7. Prefer model_id over writing the flag.`;
  }
  const niji = readPromptFlag(prompt, ["niji"]);
  if (niji.present && niji.value !== undefined && niji.value !== "7") {
    return `${scope} prompt flag --niji ${niji.value} is invalid. Only --niji 7 is supported; select model_id=midjourney-niji7.`;
  }
  const ar = readPromptFlag(prompt, ["ar"]);
  if (ar.present && (ar.value === undefined || !/^\d+:\d+$/.test(ar.value))) {
    return `${scope} prompt flag --ar ${ar.value ?? ""} is malformed. Use W:H integers, e.g. --ar 16:9.`;
  }
  const ranges = [
    { names: ["stylize"], label: "stylize", min: 0, max: 1000 },
    { names: ["chaos", "c"], label: "chaos", min: 0, max: 100 },
    { names: ["weird", "w"], label: "weird", min: 0, max: 3000 },
  ];
  for (const { names, label, min, max } of ranges) {
    const flag = readPromptFlag(prompt, names);
    if (!flag.present) continue;
    const n = Number(flag.value);
    if (flag.value === undefined || !Number.isInteger(n) || n < min || n > max) {
      return `${scope} prompt flag --${label} ${flag.value ?? ""} is invalid. Use an integer ${min}..${max}.`;
    }
  }
  return undefined;
}

const ALLOWED_VENDOR_PARAMS: Record<ImageVendor, readonly string[]> = {
  banana: ["aspect_ratio", "resolution"],
  seedream: ["aspect_ratio", "resolution"],
  "gpt-image": ["aspect_ratio", "resolution", "quality", "background"],
  midjourney: ["aspect_ratio", "stylize", "chaos", "weird"],
};

const GPT_IMAGE_25_MODEL_IDS = new Set(["gpt-image-2.5-flare", "gpt-image-2.5-sunburst"]);

/**
 * vendor_params → 提交体 params：白名单、model_id 解析、缺省值、枚举归一，
 * 以及提交前就能判定的逐模型档位限制（seedream 分辨率、gpt-image 质量 / 背景）。
 */
export function imageParams(
  vendor: ImageVendor,
  rawModelId: string,
  vendorParams: Record<string, unknown> | undefined,
  region: ReleaseRegion,
): { modelId?: string; params?: Params; error?: string } {
  const scope = `image vendor=${vendor}`;
  const merged = collectVendorParams(scope, {}, vendorParams, ALLOWED_VENDOR_PARAMS[vendor]);
  if (merged.error !== undefined) return { error: merged.error };
  const params = merged.params;
  const resolved = resolveModelId("image", IMAGE_VENDOR_CONFIGS[vendor], region, rawModelId, scope);
  if (resolved.error !== undefined) return { error: resolved.error };
  const modelId = resolved.modelId;
  const ratios = IMAGE_ASPECT_RATIO_OPTIONS[vendor];
  const resolutions = IMAGE_RESOLUTION_OPTIONS[vendor] ?? [];
  let error: string | undefined;
  switch (vendor) {
    case "banana":
      params.model_name = modelId;
      fillDefaults(params, { resolution: "1K" });
      error = firstProblem(pickEnum(scope, params, "aspect_ratio", ratios), pickEnum(scope, params, "resolution", resolutions));
      if (params.aspect_ratio === "") delete params.aspect_ratio;
      break;
    case "seedream":
      params.model_name = modelId;
      fillDefaults(params, { aspect_ratio: "1:1", resolution: "2k" });
      error = firstProblem(pickEnum(scope, params, "aspect_ratio", ratios), pickEnum(scope, params, "resolution", resolutions));
      if (!error && modelId === "doubao-seedream-5-0-pro-260628" && params.resolution === "4k") {
        error = `${scope} resolution=4k not supported by model_id=${modelId}; use 1k or 2k.`;
      }
      if (!error && modelId === "doubao-seedream-4-5-251128" && params.resolution === "1k") {
        error = `${scope} resolution=1k not supported by model_id=${modelId}; use 2k or 4k.`;
      }
      break;
    case "gpt-image": {
      params.model_name = modelId;
      // n 固定 1：批量走 count，每个 prompt 一张，计费和落位才能一一对应
      fillDefaults(params, { aspect_ratio: "1:1", resolution: "1k", quality: "medium", n: "1" });
      const is25 = GPT_IMAGE_25_MODEL_IDS.has(modelId);
      error = firstProblem(
        pickEnum(scope, params, "aspect_ratio", ratios),
        pickEnum(scope, params, "resolution", resolutions),
        pickEnum(scope, params, "quality", is25 ? ["low", "medium", "high", "xhigh", "max"] : ["low", "medium", "high"]),
        pickEnum(scope, params, "background", is25 ? ["auto", "transparent", "opaque"] : ["auto"]),
        pickInt(scope, params, "n", [1, 2, 3, 4]),
      );
      break;
    }
    case "midjourney":
      if (!(MIDJOURNEY_MODEL_IDS as readonly string[]).includes(modelId)) {
        return { error: `${scope} unsupported model_id=${modelId}. Supported values: ${MIDJOURNEY_MODEL_IDS.join(", ")}.` };
      }
      error = firstProblem(
        pickEnum(scope, params, "aspect_ratio", ratios),
        pickIntInRange(scope, params, "stylize", 0, 1000),
        pickIntInRange(scope, params, "chaos", 0, 100),
        pickIntInRange(scope, params, "weird", 0, 3000),
      );
      break;
  }
  return error ? { error } : { modelId, params };
}

// ── 结果 ──

function successFields(r: Extract<GenerateResponse, { ok: true }>) {
  const paths = pathsOf(r);
  return {
    ok: true,
    path: paths[0],
    paths,
    ...(r.width ? { width: r.width } : {}),
    ...(r.height ? { height: r.height } : {}),
    ...(r.node_id ? { node_id: r.node_id } : {}),
  };
}

function singleResult(r: GenerateResponse) {
  return r.ok ? structuredReply(successFields(r)) : generationErrorReply(r);
}

/** 批量结果总是结构化回话（不置 isError）：部分成功时 agent 要拿到成功的那些路径。 */
export function batchResult(results: PromiseSettledResult<GenerateResponse>[]) {
  const items: Record<string, unknown>[] = results.map((s) => {
    if (s.status === "rejected") {
      return { ok: false, error: String(s.reason), error_code: "unknown", failure_presentation: "status_unknown", do_not_resubmit: true };
    }
    const r = s.value;
    if (r.ok) return successFields(r);
    const nonTerminal = r.failure_presentation === "recoverable" || r.failure_presentation === "status_unknown";
    return {
      ok: false,
      error: r.error,
      error_code: r.error_code,
      ...(r.failure_presentation ? { failure_presentation: r.failure_presentation } : {}),
      ...(r.recovery_handle ? { recovery_handle: r.recovery_handle } : {}),
      ...(r.billing ? { billing: r.billing } : {}),
      ...(nonTerminal ? { do_not_resubmit: true } : {}),
    };
  });
  const failures = items.filter((i) => !i.ok);
  const billing = failures.find((i) => i.error_code === "billing_insufficient_balance");
  // 只有全部失败都是 cancelled 才算用户取消；任何真失败都按 terminal
  const presentation = failures.some((i) => i.failure_presentation === "recoverable")
    ? "recoverable"
    : failures.some((i) => i.failure_presentation === "status_unknown")
      ? "status_unknown"
      : failures.length === 0
        ? undefined
        : failures.every((i) => i.failure_presentation === "cancelled")
          ? "cancelled"
          : "terminal";
  return structuredReply({
    ok: failures.length === 0,
    results: items,
    ...(billing ? { error_code: "billing_insufficient_balance" } : {}),
    ...(billing?.billing ? { billing: billing.billing } : {}),
    ...(presentation ? { failure_presentation: presentation } : {}),
    ...(presentation === "recoverable" || presentation === "status_unknown" ? { do_not_resubmit: true } : {}),
  });
}

function dispatchOne(
  gw: GatewayClient,
  args: ImageArgs,
  modelId: string,
  params: Params,
  prompt: string | undefined,
  filename: string | undefined,
  order: number | undefined,
) {
  return runAsync(gw, "image", {
    backend: IMAGE_VENDOR_CONFIGS[args.vendor].backend,
    model_id: modelId,
    prompt,
    image_paths: args.image_paths ?? [],
    filename,
    params: order !== undefined ? { ...params, order: String(order) } : params,
    source_tool: `hub_generate_image:${args.vendor}`,
  });
}

export const registerGenerateImage: RegisterTools = (registrar, gw, region) => {
  const pickerIds = pickerIdsByVendor("image", IMAGE_VENDOR_CONFIGS, region);
  const canonicalIds = canonicalModelIdsByVendor(IMAGE_VENDOR_CONFIGS);

  registrar.registerTool(
    "generate_image",
    {
      confirmable: true,
      vendorParamHints: buildVendorParamHints("image"),
      description: description(region),
      inputSchema: INPUT_SCHEMA,
      outputSchema: OUTPUT_SCHEMA,
    },
    async (args) => {
      const config = IMAGE_VENDOR_CONFIGS[args.vendor];
      if (!config) return plainError(`Unsupported image vendor: ${args.vendor}`);

      const selected = await selectedModelsForSession(gw, `category=image vendor=${args.vendor}`);
      const selectedIds = selected?.image ? normalizePickerIds("image", config, region, selected.image) : undefined;
      const rawModelId = args.model_id ?? defaultModelForSelection(config, selectedIds);
      // 守卫比较 canonical id：别名（banana_pro 等）先归一；解析不了的留给下面的参数校验报错
      const guardModelId = resolveModelId("image", config, region, rawModelId, `image vendor=${args.vendor}`).modelId ?? rawModelId;
      const pickerError = pickerSelectionError("image", args.vendor, guardModelId, pickerIds, canonicalIds, selectedIds);
      if (pickerError) return plainError(pickerError);

      const count = args.count ?? 1;
      if (args.prompts && args.prompts.length !== count) return plainError(`prompts length (${args.prompts.length}) must match count (${count}).`);
      if (args.filenames && args.filenames.length !== count) return plainError(`filenames length (${args.filenames.length}) must match count (${count}).`);
      if (args.orders && args.orders.length !== count) return plainError(`orders length (${args.orders.length}) must match count (${count}).`);
      const structureError = batchStructureError(args, count) ?? aspectRatioRequiredError(args);
      if (structureError) return plainError(structureError);

      const mismatch = detectSlotMismatch(args.image_paths, "image");
      if (mismatch) {
        return plainError(
          `image_paths expects image files, but received "${mismatch.offender}" which looks like a ${mismatch.detected} file. generate_image only accepts images as references; extract a frame first (e.g. hub_edit_media) and pass that image instead.`,
        );
      }

      const prompts = args.prompts ?? Array.from({ length: count }, () => args.prompt ?? "");
      if (args.vendor === "midjourney") {
        for (const p of prompts) {
          const flagError = midjourneyPromptFlagError(p);
          if (flagError) return plainError(flagError);
        }
      }

      if ((args.image_paths?.length ?? 0) > 0 && args.vendor_params.aspect_ratio) {
        const failure = await aspectRatioEvidenceError(args, String(args.vendor_params.aspect_ratio));
        if (failure) {
          return failure.errorCode ? generationErrorReply({ error: failure.error, error_code: failure.errorCode }) : plainError(failure.error);
        }
      }

      const built = imageParams(args.vendor, rawModelId, args.vendor_params, region);
      if (built.error !== undefined) return plainError(built.error);
      if (!built.modelId || !built.params) return plainError("Internal: image param builder returned no model_id");
      const { modelId, params } = built;

      const filenames = args.filenames ?? Array.from({ length: count }, () => args.filename ?? "");
      const orders = args.orders ?? Array.from({ length: count }, () => args.order);
      try {
        if (count === 1) return singleResult(await dispatchOne(gw, args, modelId, params, prompts[0], filenames[0], orders[0]));
        const tasks = prompts.map((p, i) => () => dispatchOne(gw, args, modelId, params, p, filenames[i], orders[i]));
        return batchResult(await settledInBatches(tasks, BATCH_CONCURRENCY));
      } catch (err) {
        return generationUnknownReply(`Error generating image (${args.vendor}): ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
};
