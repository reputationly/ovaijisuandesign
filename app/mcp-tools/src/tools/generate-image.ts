import { z } from "zod";

import type { ReleaseRegion } from "../env.js";
import { nearestAspectRatio, probeOneMedia } from "../ffprobe.js";
import type { GatewayClient } from "../gateway-client.js";
import { generationErrorReply, generationUnknownReply, structuredReply } from "../replies.js";
import { runAsync } from "../run-async.js";
import { BillingErrorMetadataSchema, FailurePresentationSchema, type GenerateResponse } from "../schemas.js";
import { imageNamingRule, IMAGE_ARTIFACT_RULE } from "./capability-manifest.js";
import {
  fillDefaults,
  firstProblem,
  collectVendorParams,
  pickEnum,
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

export const FILENAME_DESCRIPTION =
  'Output filename WITHOUT extension, written in the user\'s language: a short Chinese name for Chinese context (e.g. "雨夜街景"), short English kebab-case for English context (e.g. "rainy-night-street"). Name the asset itself, not the episode/scene/project.';

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
    tool: z.enum(EVIDENCE_TOOLS).optional().describe("Which tool or party produced the evidence."),
    file_path: z.string().optional().describe("Local source media path that was measured (hub_analyse_media). CDN URLs are not accepted."),
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
    'Backs up vendor_params.aspect_ratio and is mandatory for aspect_ratio_source=source_ref or canvas_source. Only dimensions actually measured (hub_analyse_media with type="metadata", or canvas_get_node) qualify; a filename, a description or a CDN link does not.',
  );

const ImageVendorParamsSchema = z
  .object({
    aspect_ratio: z
      .enum(["", "1:1", "2:3", "3:2", "3:4", "4:3", "16:9", "9:16", "21:9", "4:5", "5:4", "auto"])
      .describe("Mandatory concrete output ratio (never empty or auto). Per-vendor support is listed by hub_list_capabilities."),
    resolution: z
      .enum(["1K", "2K", "4K", "1k", "2k", "4k"])
      .optional()
      .describe("Output size token: banana uses 1K/2K/4K, gpt-image 1k/2k/4k, seedream 1k/2k/4k depending on model. Video tokens like 720p are invalid."),
    quality: z
      .enum(["low", "medium", "high", "xhigh", "max"])
      .optional()
      .describe(
        "gpt-image: how much compute (and money) each image gets; unrelated to size, which is resolution. Leave it at medium. Each step up costs several times more, so go higher only on a direct user request, or after telling the user the cost and getting a yes. xhigh and max exist only on the 2.5 models.",
      ),
    background: z
      .enum(["auto", "transparent", "opaque"])
      .optional()
      .describe(
        "gpt-image: transparent gives a PNG with an alpha channel, for cut-out assets such as logos, stickers, icons or pieces to composite later; opaque always paints a background; auto leaves it to the model. The 2.5 models alone support transparent/opaque. Do not set it for regular pictures or photos.",
      ),
    stylize: z.union([z.number(), z.string()]).optional().describe("midjourney: how strongly its own style is applied; whole number 0..1000, 100 if omitted."),
    chaos: z.union([z.number(), z.string()]).optional().describe("midjourney: how different the outputs are from each other; whole number 0..100, 0 if omitted."),
    weird: z.union([z.number(), z.string()]).optional().describe("midjourney: amount of offbeat, unusual styling; whole number 0..3000, 0 if omitted."),
  })
  .strict()
  .describe(
    "Flat vendor knobs. Required because aspect_ratio is mandatory. Only the listed keys, within the vendor's parameters from hub_list_capabilities; the model goes in model_id, never here.",
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
  vendor: z.enum(IMAGE_VENDOR_ENUM).describe("Image vendor. hub_list_capabilities shows which vendors are live in this session."),
  model_id: z
    .enum(IMAGE_MODEL_ID_ENUM)
    .optional()
    .describe("One of the ids in hub_list_capabilities vendors[].models (leave out to get the vendor default). Display names and picker ids are rejected."),
  prompt: z
    .string()
    .optional()
    .describe(
      "Brief for a single final image; required unless prompts[] is given. Multiple intended outcomes go through count/prompts/filenames. Consistent identity across images needs image_paths from a shared anchor, not count; generate the anchor first if none exists.",
    ),
  prompts: z.array(z.string()).optional().describe("One brief per output; required when count > 1 and must have exactly `count` entries."),
  count: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(1)
    .describe("How many final images (1..10, default 1). Use >1 only for alternatives in the same ratio, not for identity or ratio variants."),
  image_paths: z
    .array(z.string())
    .optional()
    .describe(
      "Source/reference images for editing, restyling or combining several references. Accepts web URLs plus relative or absolute paths to media the user, project or session owns; files from agent knowledge, workflow, skill or install folders are not allowed.",
    ),
  filename: z.string().optional().describe(`${FILENAME_DESCRIPTION} Required unless filenames[] is given; with count > 1 prefer filenames[].`),
  filenames: z.array(z.string()).optional().describe(`One filename per output (no extension); exactly \`count\` entries. ${FILENAME_DESCRIPTION}`),
  vendor_params: ImageVendorParamsSchema,
  aspect_ratio_source: z
    .enum(ASPECT_RATIO_SOURCES)
    .optional()
    .describe("Why vendor_params.aspect_ratio was chosen. Required whenever image_paths is set; source_ref/canvas_source need aspect_ratio_evidence proving the source dimensions."),
  aspect_ratio_evidence: AspectRatioEvidenceSchema,
  order: z
    .number()
    .int()
    .optional()
    .describe(
      "Optional sort index inside the auto-created canvas group (ascending), e.g. the shot number of a storyboard frame so canvas_group_recent_outputs keeps story order. Omit when order does not matter; use orders[] when count > 1.",
    ),
  orders: z
    .array(z.number().int())
    .optional()
    .describe("Per-output sort indices for a batch, exactly `count` entries (e.g. [1,2,3,4,5] for storyboard scenes). Omit for unordered outputs."),
};

type ImageArgs = z.objectOutputType<typeof INPUT_SCHEMA, z.ZodTypeAny, "passthrough">;

function description(region: ReleaseRegion): string {
  const naming = imageNamingRule(region);
  return [
    "Generate one or more images with the chosen vendor/model.",
    "",
    "For semantic creation or editing: adding, removing or replacing content, repainting, changing style, background or composition, colorizing, or integrating text/logos into a design. Pure geometry/format operations belong to postprocess tools.",
    "",
    `Cardinality: ${IMAGE_ARTIFACT_RULE} Do not put the number of outputs into prompt text or write a summary prompt to satisfy the schema. Filenames are never auto-suffixed server-side.`,
    ...(naming ? ["", `User-facing naming: ${naming}`] : []),
    "",
    "Choose the model through model_id; put vendor settings such as aspect_ratio or resolution directly inside vendor_params. Multiple images come from top-level count (one prompt each), never from a vendor n setting.",
    "Concurrency: the slot model is the chosen model_id (or the vendor default); count=N takes N slots of that model.",
    "",
    "Frame: every call carries an explicit ratio in vendor_params.aspect_ratio (auto is refused); if you do not know it, ask. When image_paths are given, add aspect_ratio_source as well — explicit_user if the user decided, source_ref/canvas_source only if the source is meant to set the frame and aspect_ratio_evidence carries its measured size. Names, descriptions and CDN links are not measurements; do not fall back to square or infer the frame from references.",
    "",
    "gpt-image quality: medium by default and almost always sufficient. Higher tiers multiply cost, so use them only on explicit user request or after asking (state the cost). xhigh/max only on gpt-image-2.5-flare / gpt-image-2.5-sunburst.",
    "gpt-image transparency: vendor_params.background=transparent yields an alpha-channel PNG for cut-out assets like a logo, sticker, icon, UI element or compositing layer; leave it unset otherwise. transparent/opaque only on the 2.5 models.",
    "",
    "Inputs: all visual inputs travel in image_paths — web links, or relative/absolute paths to media belonging to the user, project or session. Files under the agent's own knowledge, workflow, skill or installation folders must not be used.",
    "",
    "Returns {ok, path, paths[], width?, height?, node_id?} for one image, or {ok, results[]} for a batch. A failure marked do_not_resubmit means the task may still complete or was already charged: do not resubmit.",
  ].join("\n");
}

// ── 校验 ──

const DIMENSION_SOURCES = new Set(["source_ref", "canvas_source"]);
const DIMENSION_TOOLS = new Set(["hub_analyse_media", "analyse_media", "canvas_get_node", "hub_canvas_get_node"]);
const isRemote = (v: string) => /^https?:\/\//i.test(v);

function batchStructureError(args: ImageArgs, count: number): string | undefined {
  if (!args.prompt && !args.prompts) return "Missing prompt: give `prompt` for a single image, or `prompts[]` with one entry per output.";
  if (!args.filename && !args.filenames) return "Missing filename: give `filename` for a single image, or `filenames[]` with one entry per output.";
  if (count <= 1) return undefined;
  if (!args.prompts) return `count=${count} needs prompts[] with one brief per image; a single prompt only ever describes one image.`;
  if (!args.filenames) return `count=${count} needs filenames[] with one name per image, so each result can be referred to.`;
  return undefined;
}

function aspectRatioRequiredError(args: ImageArgs): string | undefined {
  const ratio = args.vendor_params?.aspect_ratio;
  if (ratio === undefined || String(ratio).trim() === "") {
    return "vendor_params.aspect_ratio is missing. If you do not know the frame the user wants, ask them (question tool); never guess it from prompt wording, a vendor default or the size of a reference image.";
  }
  if (String(ratio).toLowerCase() === "auto") {
    return "vendor_params.aspect_ratio=auto is rejected; image generation needs a real ratio like 16:9, 9:16, 1:1, 4:3 or 3:4.";
  }
  return undefined;
}

async function evidenceDimensions(args: ImageArgs): Promise<{ width?: number; height?: number; detail?: string; error?: string }> {
  const ev = args.aspect_ratio_evidence;
  if (ev?.file_path) {
    if (isRemote(ev.file_path)) {
      return {
        error:
          "aspect_ratio_evidence.file_path has to point at a file on disk; a web/CDN link cannot be measured as proof. Use the local path of the original attachment, or supply the width/height reported by hub_analyse_media metadata.",
      };
    }
    const p = await probeOneMedia(ev.file_path);
    if (!p.ok || !p.width || !p.height) {
      return { error: `Measuring aspect_ratio_evidence.file_path=${ev.file_path} failed: ${p.error ?? "no width/height found"}.` };
    }
    return { width: p.width, height: p.height, detail: `${ev.file_path} (${p.width}x${p.height})` };
  }
  if (ev?.width && ev.height) {
    if (!ev.tool || !DIMENSION_TOOLS.has(ev.tool)) {
      return {
        error:
          "Width/height given as proof for source_ref or canvas_source must also name the measuring tool (hub_analyse_media or canvas_get_node in the tool field); numbers without a source do not count.",
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
        "Calls with image_paths must also say why the ratio was chosen via top-level aspect_ratio_source: explicit_user if the user picked it; source_ref or canvas_source only together with measured width/height; project_lock, platform_target or domain_default when that context decides the frame.",
    };
  }
  if (!DIMENSION_SOURCES.has(args.aspect_ratio_source)) return undefined;
  const dims = await evidenceDimensions(args);
  if (dims.error) return { error: dims.error };
  if (!dims.width || !dims.height) {
    return {
      error: `aspect_ratio_source=${args.aspect_ratio_source} only works with a measured source size. Put width and height, or a local file_path measured by hub_analyse_media, into aspect_ratio_evidence; names, descriptions and CDN links are not measurements.`,
    };
  }
  const supported = IMAGE_ASPECT_RATIO_OPTIONS[args.vendor].filter((r) => r !== "" && r !== "auto");
  const expected = nearestAspectRatio(dims.width, dims.height, supported);
  if (requested === expected) return undefined;
  return {
    error: [
      `vendor_params.aspect_ratio=${requested} conflicts with ${args.aspect_ratio_source} dimensions ${dims.width}x${dims.height}; nearest supported ratio for ${args.vendor} is ${expected}.`,
      dims.detail ? `Evidence: ${dims.detail}.` : "",
      "Switch aspect_ratio_source to explicit_user only if the user really asked for another crop; otherwise match the source.",
    ]
      .filter(Boolean)
      .join(" "),
    errorCode: "image_aspect_ratio_conflict",
  };
}

const ALLOWED_VENDOR_PARAMS: Record<ImageVendor, readonly string[]> = {
  banana: ["aspect_ratio", "resolution"],
  seedream: ["aspect_ratio", "resolution"],
  "gpt-image": ["aspect_ratio", "resolution", "quality", "background"],
  midjourney: ["aspect_ratio", "stylize", "chaos", "weird"],
};

/**
 * vendor_params → 提交体 params。只做白名单、缺省值和枚举大小写归一；
 * 逐模型的档位限制交给 gateway（它按自己的平台模型能力裁决）。
 */
export function imageParams(vendor: ImageVendor, modelId: string, vendorParams: Record<string, unknown> | undefined): { params?: Params; error?: string } {
  const scope = `image vendor=${vendor}`;
  const merged = collectVendorParams(scope, {}, vendorParams, ALLOWED_VENDOR_PARAMS[vendor]);
  if (merged.error !== undefined) return { error: merged.error };
  const params = merged.params;
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
      break;
    case "gpt-image":
      params.model_name = modelId;
      // n 固定 1：批量走 count，每个 prompt 一张，计费和落位才能一一对应
      fillDefaults(params, { aspect_ratio: "1:1", resolution: "1k", quality: "medium", n: "1" });
      error = firstProblem(
        pickEnum(scope, params, "aspect_ratio", ratios),
        pickEnum(scope, params, "resolution", resolutions),
        pickEnum(scope, params, "quality", ["low", "medium", "high", "xhigh", "max"]),
        pickEnum(scope, params, "background", ["auto", "transparent", "opaque"]),
      );
      break;
    case "midjourney":
      error = firstProblem(
        pickEnum(scope, params, "aspect_ratio", ratios),
        pickIntInRange(scope, params, "stylize", 0, 1000),
        pickIntInRange(scope, params, "chaos", 0, 100),
        pickIntInRange(scope, params, "weird", 0, 3000),
      );
      break;
  }
  return error ? { error } : { params };
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
      ...(r.user_message ? { user_message: r.user_message } : {}),
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
      const resolved = resolveModelId("image", config, region, args.model_id ?? defaultModelForSelection(config, selectedIds), `image vendor=${args.vendor}`);
      if (resolved.error !== undefined) return plainError(resolved.error);
      const modelId = resolved.modelId;
      const pickerError = pickerSelectionError("image", args.vendor, modelId, pickerIds, canonicalIds, selectedIds);
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
          `image_paths got "${mismatch.offender}", which appears to be a ${mismatch.detected} file. Only still images can serve as references here; take a frame from the clip and pass that.`,
        );
      }

      if ((args.image_paths?.length ?? 0) > 0) {
        const failure = await aspectRatioEvidenceError(args, String(args.vendor_params.aspect_ratio));
        if (failure) {
          return failure.errorCode ? generationErrorReply({ error: failure.error, error_code: failure.errorCode }) : plainError(failure.error);
        }
      }

      const built = imageParams(args.vendor, modelId, args.vendor_params);
      if (built.error || !built.params) return plainError(built.error ?? "Internal: image params builder returned nothing");
      const params = built.params;

      const prompts = args.prompts ?? Array.from({ length: count }, () => args.prompt ?? "");
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
