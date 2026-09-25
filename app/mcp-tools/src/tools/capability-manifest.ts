import { z } from "zod";

import type { ReleaseRegion } from "../env.js";
import {
  AUDIO_MUSIC_VENDOR,
  AUDIO_PARAMETER_RULES,
  AUDIO_TTS_SEEDAUDIO_VENDOR,
  AUDIO_TTS_VENDOR,
  IMAGE_PARAMETER_RULES,
  IMAGE_VENDOR_CONFIGS,
  IMAGE_VENDOR_ENUM,
  unique,
  VIDEO_PARAMETER_RULES,
  VIDEO_VENDOR_CONFIGS,
  VIDEO_VENDOR_ENUM,
  type ModelType,
  type ParameterRule,
  type VendorConfig,
} from "./model-catalog.js";

/**
 * list_capabilities 的 manifest：静态 vendor 表 ∩ gateway 运行时目录（再 ∩ 选择器勾选），
 * 附上每个模型的静态并发上限。agent 以它为准选 vendor / model_id。
 */

export const CatalogModelSchema = z
  .object({
    id: z.string(),
    backend: z.string(),
    model_name: z.string().optional(),
    display_name: z.string().optional(),
    visibility: z.string().optional(),
  })
  .passthrough();
export type CatalogModel = z.infer<typeof CatalogModelSchema>;

export const ModelsResponseSchema = z
  .object({
    imageModels: z.array(CatalogModelSchema),
    videoModels: z.array(CatalogModelSchema),
    audioModels: z.array(CatalogModelSchema),
    // 本工具不用文本模型；缺了不该让整张目录解析失败
    textModels: z.array(z.unknown()).optional(),
    defaultTextModelId: z.string().optional(),
  })
  .passthrough();
export type ModelCatalog = z.infer<typeof ModelsResponseSchema>;

export const ConcurrencyLimitsSchema = z.object({
  items: z.array(z.object({ model: z.string(), total_concurrency: z.number() })),
});
export const ConcurrencyUsageSchema = z.object({
  items: z.array(z.object({ model: z.string(), used_concurrency: z.number() })),
});

export interface ManifestVendor {
  vendor: string;
  backend: string;
  default_model: string;
  knowledge_card: string;
  knowledge_card_audience: "agent_internal";
  modes?: readonly string[];
  model_modes?: Record<string, readonly string[]>;
  capabilities: readonly string[];
  models: string[];
  user_visible_models: { model_id: string; display_name: string }[];
  aliases?: string[];
  model_aliases?: Record<string, string>;
  parameters?: ParameterRule;
  task_concurrency?: { usage_is_dynamic: true; models: Record<string, { limited: boolean; limit: number }> };
}

export interface ManifestModality {
  modality: "image" | "video" | "audio.tts" | "audio.music";
  tool: string;
  selection_policy: Record<string, unknown>;
  vendors: ManifestVendor[];
}

// ── 选择策略（给 agent 看的规则文本） ──

const ARTIFACT_CARDINALITY_RULE = "A generation prompt describes one final artifact. Preserve deliverable topology: one user-intended outcome unit per artifact unless the requested deliverable is a composed layout. Count/prompts split artifacts but do not bind identity; shared visual identity requires a common ref/anchor or sequential approved artifact. If no visual anchor exists, create one first, then generate finals from it. Video uses separate tool calls per deliverable.";
export const IMAGE_ARTIFACT_CARDINALITY_RULE = `${ARTIFACT_CARDINALITY_RULE} For image tasks, aspect-ratio variants are separate final artifacts, not sample multipliers. Keep count=1 per ratio unless the user explicitly asks for multiple alternatives within the same ratio; only then use count with aligned prompts/filenames.`;
const CONSULT_KNOWLEDGE_RULE = "Use this manifest as the source of truth for vendor selection, model availability, aliases, capabilities, and legal parameters.";
const IMAGE_SELECTION_POLICY = {
  consult_knowledge: CONSULT_KNOWLEDGE_RULE,
  default_model_rule: "When the session carries no image-model selection, the user has not named a model, and no hard capability requirement excludes it, default to vendor=gpt-image with model_id=gpt-image-2.5-sunburst when that entry is listed in this manifest. If it is not listed, fall back to gpt-image-2, then to the remaining listed vendors/models; never treat an unavailable default as callable. A user model selection outranks this default: vendors[].models already reflects the current selection, so choose from the listed models instead of forcing the default when the default is absent from them.",
  operation_boundary: "Image generation/editing owns content-plane changes: adding, removing, replacing, repainting, restyling, background changes, composition changes, and scene-integrated design/text/logo work. Postprocess owns only deterministic geometry/format/extraction/layout transforms.",
  unavailable_vendor_rule: "If a vendor is not listed in vendors[], do not call it. Return model_unavailable instead of substituting silently.",
  alias_resolution_rule: 'A user may name a vendor by a display name or spoken alias (see vendors[].aliases, e.g. "design image"/"Design Image" \u2192 vendor=gpt-image, "beta" \u2192 vendor=veo3, "general image"/"banana" \u2192 vendor=banana). Resolving such an alias to its listed vendor is identification, NOT a silent model switch \u2014 do it instead of rejecting the request. When the alias names a specific variant (e.g. "General Image Pro", "General Image 2"), consult vendors[].model_aliases to map it to the exact model_id; without a variant cue, use the vendor default_model. Match aliases and model_aliases SEMANTICALLY: case-insensitive, ignoring spaces / hyphens / underscores between tokens (so "general image pro", "General-Image-Pro", and "GENERAL_IMAGE_PRO" all match the listed "General Image Pro"). The manifest lists one canonical form per name, not every variant. Only return model_unavailable when the name matches no vendor alias AND no model_alias under this fuzzy matching.',
  model_id_rule: "Use only vendor + one value from models as model_id. Do not use display names, picker ids, or aliases in model_id; aliases identify the vendor only.",
  aspect_ratio_rule: 'Aspect ratio is a task-level framing decision, not a vendor preference. For any ref-bearing image task, call hub_generate_image with vendor_params.aspect_ratio plus top-level aspect_ratio_source. If the source/canvas asset owns the frame, include aspect_ratio_evidence with width/height from hub_analyse_media type="metadata" or canvas_get_node; filenames, visual descriptions, and CDN URLs are not evidence. Do not fall back to square defaults. When the user asks for the same design in multiple aspect ratios, treat each ratio as a separate final artifact and keep count=1 unless the user explicitly asks for multiple alternatives within the same ratio.',
  artifact_cardinality_rule: IMAGE_ARTIFACT_CARDINALITY_RULE
};
const OVERSEAS_IMAGE_ALIAS_RESOLUTION_RULE = 'A user may name a vendor by a display name or spoken alias (see vendors[].aliases, e.g. "gpt image"/"GPT Image" \u2192 vendor=gpt-image, "veo"/"Veo" \u2192 vendor=veo3, "nano banana"/"banana" \u2192 vendor=banana). Resolving such an alias to its listed vendor is identification, NOT a silent model switch \u2014 do it instead of rejecting the request. When the alias names a specific variant (e.g. "Banana Pro", "Banana Flash"), consult vendors[].model_aliases to map it to the exact model_id; without a variant cue, use the vendor default_model. Match aliases and model_aliases SEMANTICALLY: case-insensitive, ignoring spaces / hyphens / underscores between tokens. The manifest lists one canonical form per name, not every variant. Only return model_unavailable when the name matches no vendor alias AND no model_alias under this fuzzy matching.';
const DOMESTIC_IMAGE_USER_FACING_NAMING_RULE = 'Canonical vendor, model_id, backend, and tool identifiers are internal-only. In natural-language messages visible to the user, call vendor=banana "General Image", model_id=nano_banana_2_flash "General Image 2", model_id=nano_banana_2 "General Image Pro", and vendor/model gpt-image/gpt-image-2 "Design Image 2", model_id=gpt-image-2.5-sunburst "Design Image 2.5 Sunburst", and model_id=gpt-image-2.5-flare "Design Image 2.5 Flare". Treat user-spoken "GPT\u6A21\u578B", "GPT \u56FE\u50CF\u6A21\u578B", and "GPT image model" as aliases for vendor=gpt-image; in a pre-tool-call explanation issued before the exact model_id is selected, name the default_model listed for vendor=gpt-image in this manifest. Once a model_id is selected, use its exact display name instead of repeating the user-spoken alias or paraphrasing it as a "high-quality Banana version". Apply these mappings SEMANTICALLY only when the terms denote an image model, vendor, or tool. If "banana"/"\u9999\u8549" denotes fruit, or "GPT" denotes requested visible text, a visual subject, quoted user content, a filename, or any other non-model meaning, preserve the original word. Example: for user text "\u7528\u9999\u8549\u6A21\u578B\u751F\u6210\u4E00\u4E2A\u9999\u8549" with model_id=nano_banana_2_flash, say "\u6211\u4F1A\u7528 General Image 2 \u751F\u6210\u4E00\u5F20\u4EE5\u9999\u8549\u4E3A\u4E3B\u4F53\u7684\u56FE\u7247", never "\u6211\u4F1A\u7528\u9999\u8549\u6A21\u578B". For user text "\u7528 General Image \u6A21\u578B\u751F\u6210\u4E00\u4E2A banana" with model_id=nano_banana_2, say "\u6211\u4F1A\u7528 General Image Pro \u751F\u6210\u53E6\u4E00\u5F20\u9999\u8549\u56FE\u7247", never "\u6211\u4F1A\u7528 Banana \u7684\u9AD8\u8D28\u91CF\u7248\u672C". For user text "\u7528GPT\u6A21\u578B\u751F\u6210\u4E00\u4E2AGPT\u5B57\u6BCD\u7684\u56FE\u7247" with model_id=gpt-image-2.5-sunburst, say "\u6211\u4F1A\u4F7F\u7528 Design Image 2.5 Sunburst\uFF0C\u751F\u6210\u4E00\u5F20\u4EE5\u201CGPT\u201D\u4E09\u4E2A\u5B57\u6BCD\u4E3A\u4E3B\u4F53\u7684\u65B9\u5F62\u8BBE\u8BA1\u56FE", never "\u6211\u4F1A\u4F7F\u7528 GPT \u56FE\u50CF\u6A21\u578B". Tool-call arguments must still use the canonical vendor and model_id. Never expose canonical identifiers in user-facing explanations, including error, retry, fallback, and availability messages.';
export function imageUserFacingNamingRule(region: ReleaseRegion): string | undefined {
  return region === "domestic" ? DOMESTIC_IMAGE_USER_FACING_NAMING_RULE : void 0;
}
const VIDEO_SELECTION_POLICY = {
  consult_knowledge: CONSULT_KNOWLEDGE_RULE,
  operation_boundary: "Video generation/editing owns content-plane changes: action, motion, scene, subject, style, source-video edits, and extensions. Postprocess owns only deterministic trim/merge/crop/transcode/mux/subtitle/timeline operations.",
  reference_routing_rule: "Reference media are not keyframes by default. When Seedance can accept refs, route identity/style/design/world/action guidance through mode=multimodal + reference_*; use first_frame_image/last_frame_image only for explicit opening/ending/start/end/keyframe requests or vendors with no reference mode.",
  alias_resolution_rule: 'A user may name a vendor by a display name or spoken alias (see vendors[].aliases, e.g. "beta" \u2192 vendor=veo3). Resolving such an alias to its listed vendor is identification, NOT a silent model switch \u2014 do it instead of rejecting the request. When the alias names a specific variant (e.g. "beta_fast"/"beta_pro"), consult vendors[].model_aliases to map it to the exact model_id; without a variant cue, use the vendor default_model. Match aliases and model_aliases SEMANTICALLY: case-insensitive, ignoring spaces / hyphens / underscores between tokens (so "beta fast", "Beta-Fast", "BETA_FAST" all match the listed "Beta Fast"). The manifest lists one canonical form per name, not every variant. Only return model_unavailable when the name matches no vendor alias AND no model_alias under this fuzzy matching.',
  model_id_rule: "Use only vendor + one value from models as model_id. When model_modes is present, mode must come from model_modes[model_id], not merely the vendor-level modes union. Do not use picker ids or aliases in model_id; aliases identify the vendor only.",
  artifact_cardinality_rule: ARTIFACT_CARDINALITY_RULE
};
const AUDIO_TTS_SELECTION_POLICY = {
  default_order: ["official:speech-2.8-hd", "official:speech-2.8-turbo"],
  use_hd_first_when: ["final delivery", "emotional speech", "character voice quality"],
  use_turbo_first_when: ["draft preview", "fast iteration"],
  use_seedaudio_when: [
    "user explicitly asks for SeedAudio / Seed Audio",
    "film/cinematic dubbing, short-drama/radio-drama/trailer performance, or role-performance speech is requested",
    "reference audio or reference image voice-style replication is required",
    "a clear custom natural-language voice description cannot be satisfied by official catalog selection",
    "speech must be generated together with ambience, BGM, or SFX in the same clip"
  ],
  model_id_rule: "Use vendor + one value from models as model_name. Do not use display names or aliases. For SeedAudio use vendor=seedaudio and model_name=seed-audio-1.0. Missing voice_id alone is not a SeedAudio trigger; try official catalog voice prep first.",
  artifact_cardinality_rule: ARTIFACT_CARDINALITY_RULE
};
const AUDIO_MUSIC_SELECTION_POLICY = {
  default_order: ["official:music-3.0"],
  rule: "Use vendor=official model_id=music-3.0 for all BGM/score/instrumental music and for vocal or lyrics-first songs after lyrics are confirmed. Use mode=instrumental for instrumental BGM requests. Duration targeting is not a generation parameter on this tool and must be handled by deterministic post-processing.",
  model_id_rule: "Use vendor=official with model_id=music-3.0.",
  artifact_cardinality_rule: ARTIFACT_CARDINALITY_RULE
};

/** 地区差异照参照：国内版换一套别名说明，并加上面向用户的命名规则。 */
function imageSelectionPolicy(region: ReleaseRegion): Record<string, unknown> {
  const userFacingNamingRule = imageUserFacingNamingRule(region);
  return {
    ...IMAGE_SELECTION_POLICY,
    alias_resolution_rule: region === "domestic" ? IMAGE_SELECTION_POLICY.alias_resolution_rule : OVERSEAS_IMAGE_ALIAS_RESOLUTION_RULE,
    ...(userFacingNamingRule ? { user_facing_naming_rule: userFacingNamingRule } : {}),
    consult_knowledge: CONSULT_KNOWLEDGE_RULE,
  };
}

const USER_FACING_CATALOG_RULE =
  "Canonical vendor, backend, default_model, models, aliases, model_aliases, and knowledge_card are Agent-internal fields. Never expose vendor family names or knowledge-card paths in user-visible replies. When naming available or selected models to the user, use only the exact user_visible_models[].display_name values from this live Apollo catalog; do not invent, abbreviate, or substitute a vendor label. If user_visible_models is empty, do not present that vendor as a user-visible model option.";

function manifestVendor(type: ModelType, c: VendorConfig, region: ReleaseRegion): ManifestVendor {
  const models = unique<string>(c.modelIds);
  const rule = type === "image" ? IMAGE_PARAMETER_RULES[c.vendor as keyof typeof IMAGE_PARAMETER_RULES] : type === "video" ? VIDEO_PARAMETER_RULES[c.vendor as keyof typeof VIDEO_PARAMETER_RULES] : AUDIO_PARAMETER_RULES[c.backend];
  const parameters = rule && "model_id" in rule ? { ...rule, model_id: models } : rule;
  const redundant = new Set([c.vendor, ...models]);
  const aliases = unique<string>([...(c.pickerAliases ?? []), ...(c.pickerAliasesByRegion?.[region] ?? [])]).filter((a) => !redundant.has(a));
  const visible = new Set(models);
  const modelAliases = Object.fromEntries(
    Object.entries({ ...(c.modelAliases ?? {}), ...(c.modelAliasesByRegion?.[region] ?? {}) }).filter(([, m]) => visible.has(m)),
  );
  const modelModes = c.modelModes ? Object.fromEntries(Object.entries(c.modelModes).filter(([m]) => visible.has(m))) : undefined;
  return {
    vendor: c.vendor,
    backend: c.backend,
    default_model: models[0] ?? c.defaultModel,
    knowledge_card: c.knowledgeCard,
    knowledge_card_audience: "agent_internal",
    ...(c.modes ? { modes: c.modes } : {}),
    ...(modelModes && Object.keys(modelModes).length > 0 ? { model_modes: modelModes } : {}),
    capabilities: c.capabilities,
    models,
    user_visible_models: [],
    ...(aliases.length > 0 ? { aliases } : {}),
    ...(Object.keys(modelAliases).length > 0 ? { model_aliases: modelAliases } : {}),
    ...(parameters ? { parameters } : {}),
  };
}

export function buildStaticManifest(region: ReleaseRegion): ManifestModality[] {
  return [
    {
      modality: "image",
      tool: "hub_generate_image",
      selection_policy: imageSelectionPolicy(region),
      vendors: IMAGE_VENDOR_ENUM.map((v) => manifestVendor("image", IMAGE_VENDOR_CONFIGS[v], region)),
    },
    {
      modality: "video",
      tool: "hub_generate_video",
      selection_policy: { ...VIDEO_SELECTION_POLICY, consult_knowledge: CONSULT_KNOWLEDGE_RULE },
      vendors: VIDEO_VENDOR_ENUM.map((v) => manifestVendor("video", VIDEO_VENDOR_CONFIGS[v], region)),
    },
    {
      modality: "audio.tts",
      tool: "hub_generate_audio_speech",
      selection_policy: AUDIO_TTS_SELECTION_POLICY,
      vendors: [manifestVendor("audio", AUDIO_TTS_VENDOR, region), manifestVendor("audio", AUDIO_TTS_SEEDAUDIO_VENDOR, region)],
    },
    {
      modality: "audio.music",
      tool: "hub_generate_audio_music",
      selection_policy: AUDIO_MUSIC_SELECTION_POLICY,
      vendors: [manifestVendor("audio", AUDIO_MUSIC_VENDOR, region)],
    },
  ];
}

const matches = (m: CatalogModel, backend: string, modelId: string) =>
  m.backend === backend && (m.id === modelId || m.model_name === modelId);

/**
 * 静态表 ∩ 运行时目录：目录里没有（同 backend 且 id 或 model_name 相等）的模型删掉，
 * 删空的 vendor 整个去掉；display_name 来自目录，hidden 的不进 user_visible_models。
 */
export function filterManifestByCatalog(manifest: ManifestModality[], catalog: Pick<ModelCatalog, "imageModels" | "videoModels" | "audioModels">): ManifestModality[] {
  return manifest.map((modality) => {
    const pools = { image: catalog.imageModels, video: catalog.videoModels } as Record<string, CatalogModel[]>;
    const pool = pools[modality.modality] ?? catalog.audioModels;
    return {
      ...modality,
      selection_policy: { ...modality.selection_policy, user_facing_catalog_rule: USER_FACING_CATALOG_RULE },
      vendors: modality.vendors.flatMap((vendor) => {
        const models = vendor.models.filter((id) => pool.some((m) => matches(m, vendor.backend, id)));
        if (models.length === 0) return [];
        const user_visible_models = models.flatMap((id) => {
          const m = pool.find((c) => matches(c, vendor.backend, id));
          const name = m?.display_name?.trim();
          return name && m?.visibility !== "hidden" ? [{ model_id: id, display_name: name }] : [];
        });
        const { model_aliases, model_modes, parameters, ...base } = vendor;
        const aliases = model_aliases ? Object.fromEntries(Object.entries(model_aliases).filter(([, m]) => models.includes(m))) : {};
        const modes = model_modes ? Object.fromEntries(Object.entries(model_modes).filter(([m]) => models.includes(m))) : {};
        return [
          {
            ...base,
            models,
            user_visible_models,
            default_model: models.includes(vendor.default_model) ? vendor.default_model : (models[0] as string),
            ...(parameters ? { parameters: Array.isArray(parameters.model_id) ? { ...parameters, model_id: models } : parameters } : {}),
            ...(Object.keys(aliases).length > 0 ? { model_aliases: aliases } : {}),
            ...(Object.keys(modes).length > 0 ? { model_modes: modes } : {}),
          },
        ];
      }),
    };
  });
}

/** 勾选过滤：用户在选择器里只勾了部分模型时，目录也只留这些（按 id 或 model_name）。 */
export function filterCatalogBySelection(
  catalog: ModelCatalog,
  selected: { image?: string[]; video?: string[]; audio?: string[] } | null,
): ModelCatalog {
  if (!selected) return catalog;
  const keep = (models: CatalogModel[], ids?: string[]) => {
    if (!ids || ids.length === 0) return models;
    const set = new Set(ids);
    return models.filter((m) => set.has(m.id) || Boolean(m.model_name && set.has(m.model_name)));
  };
  return {
    ...catalog,
    imageModels: keep(catalog.imageModels, selected.image),
    videoModels: keep(catalog.videoModels, selected.video),
    audioModels: keep(catalog.audioModels, selected.audio),
  };
}

export function limitsMap(items: { model: string; total_concurrency: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const it of items) {
    const model = it.model.trim();
    if (model) out.set(model, Math.max(0, Math.trunc(it.total_concurrency)));
  }
  return out;
}

/** limit=0 表示没配上限；实时占用不在这里（要查 get_model_concurrency）。 */
export function withTaskConcurrency(manifest: ManifestModality[], limits: Map<string, number>): ManifestModality[] {
  return manifest.map((modality) => ({
    ...modality,
    vendors: modality.vendors.map((v) => ({
      ...v,
      task_concurrency: {
        usage_is_dynamic: true as const,
        models: Object.fromEntries(
          v.models.map((m) => {
            const limit = limits.get(m) ?? 0;
            return [m, { limited: limit > 0, limit }];
          }),
        ),
      },
    })),
  }));
}
