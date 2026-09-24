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

const ARTIFACT_RULE =
  "Each generation prompt describes exactly one final artifact. Keep one user-intended outcome per artifact unless the deliverable itself is a composed layout. Splitting work with count/prompts does not make identities match: shared identity needs a common reference or a previously approved artifact, so create an anchor first when none exists. Video uses one tool call per deliverable.";
export const IMAGE_ARTIFACT_RULE = `${ARTIFACT_RULE} For images, each aspect ratio is its own final artifact, not a sample multiplier: use count=1 for each ratio, and a higher count only when the user wants several options at one ratio, and then align prompts/filenames with count.`;
const CONSULT_RULE = "Decide vendors, models, aliases, capabilities and allowed parameter values from this manifest alone; it reflects what is callable right now.";
const CATALOG_RULE =
  "Keep the identifiers in this manifest (models, default_model, vendor, backend, model_aliases, aliases, knowledge_card) to yourself: users must never see vendor family names or card paths. Whenever you mention a model to the user, quote a user_visible_models[].display_name verbatim, as it comes from the live catalog, with no shortening or replacement. If a vendor lists no user_visible_models, do not offer it to the user at all.";

const ALIAS_RULE_DOMESTIC =
  'People often refer to a vendor by a nickname listed in vendors[].aliases ("design image" means gpt-image, "beta" means veo3, "general image" or "banana" means banana). Translating such a nickname is recognising the vendor, not swapping models, so do it rather than refusing. A nickname that points at one variant ("General Image Pro") is looked up in vendors[].model_aliases; without a variant hint, take default_model. Compare loosely: ignore letter case and any spaces, hyphens or underscores. Only answer model_unavailable if nothing in aliases or model_aliases fits.';
const ALIAS_RULE_OVERSEAS =
  'People often refer to a vendor by a nickname listed in vendors[].aliases ("gpt image" means gpt-image, "veo" means veo3, "nano banana" or "banana" means banana). Translating such a nickname is recognising the vendor, not swapping models, so do it rather than refusing. A nickname that points at one variant ("Banana Pro") is looked up in vendors[].model_aliases; without a variant hint, take default_model. Compare loosely: ignore letter case and any spaces, hyphens or underscores. Only answer model_unavailable if nothing in aliases or model_aliases fits.';

export const DOMESTIC_IMAGE_NAMING_RULE =
  'Users only ever see product names, never vendor/model_id/backend/tool ids. Name mapping: vendor=banana is "General Image"; nano_banana_2_flash is "General Image 2"; nano_banana_2 is "General Image Pro"; gpt-image-2 is "Design Image 2"; gpt-image-2.5-sunburst is "Design Image 2.5 Sunburst"; gpt-image-2.5-flare is "Design Image 2.5 Flare". When a user says something like "GPT模型" or "GPT 图像模型", they mean vendor=gpt-image: until a model_id is picked, call it by that vendor\'s listed default_model, afterwards by the chosen model\'s exact name. Only translate words that refer to an image model — a banana/香蕉 that is fruit, or "GPT" as text to render, a subject, a quote or a filename, stays as written. Tool arguments keep the canonical ids, and no reply (errors, retries, fallbacks included) may reveal them.';

export function imageNamingRule(region: ReleaseRegion): string | undefined {
  return region === "domestic" ? DOMESTIC_IMAGE_NAMING_RULE : undefined;
}

function imagePolicy(region: ReleaseRegion): Record<string, unknown> {
  const naming = imageNamingRule(region);
  return {
    consult_knowledge: CONSULT_RULE,
    default_model_rule:
      "Fallback choice when nothing constrains it (no picker selection, no model requested, no capability that rules it out): gpt-image-2.5-sunburst under vendor=gpt-image if present, else gpt-image-2, else whatever else is listed. An absent default is not callable. Because vendors[].models is already narrowed to the user's picker choice, that choice beats this fallback.",
    operation_boundary:
      "Use image generation when pixels must change in meaning: adding, removing or swapping things, repainting, restyling, new backgrounds or composition, designed text/logos. Mechanical resizing, format changes, extraction or layout go to postprocess tools.",
    unavailable_vendor_rule: "A vendor that is not in vendors[] is off limits: answer model_unavailable rather than quietly using another one.",
    alias_resolution_rule: region === "domestic" ? ALIAS_RULE_DOMESTIC : ALIAS_RULE_OVERSEAS,
    model_id_rule: "model_id must be one value from the vendor's models; display names, picker ids and aliases are not model ids.",
    aspect_ratio_rule:
      'The frame shape belongs to the task, not to a vendor. Always send an explicit vendor_params.aspect_ratio; calls with image_paths add aspect_ratio_source, and if the source image dictates the frame, attach aspect_ratio_evidence whose width/height were measured by hub_analyse_media (type="metadata") or canvas_get_node. Names, prose descriptions and CDN links prove nothing, and a silent square default is never acceptable. Several requested ratios mean several artifacts, one call with count=1 per ratio.',
    artifact_cardinality_rule: IMAGE_ARTIFACT_RULE,
    ...(naming ? { user_facing_naming_rule: naming } : {}),
  };
}

const VIDEO_POLICY = {
  consult_knowledge: CONSULT_RULE,
  operation_boundary:
    "Use video generation when the content itself must change: what moves and how, the scene, the subject, the look, or an edit/continuation of a source clip. Mechanical work such as cutting, joining, cropping, re-encoding, muxing, captions or timeline assembly goes to postprocess tools instead.",
  reference_routing_rule:
    "Treat supplied media as guidance, not as frames, unless told otherwise: identity, look, setting and motion cues go through mode=multimodal and the reference_* fields where the vendor has them. Reserve first_frame_image/last_frame_image for a requested start or end frame, or for vendors that offer no reference mode.",
  alias_resolution_rule:
    'Users may name a vendor by alias (vendors[].aliases, e.g. "beta" -> veo3). Mapping it is identification, not a model switch; variants (e.g. "Beta Fast") map through vendors[].model_aliases, otherwise use default_model. Match case-insensitively ignoring spaces, hyphens and underscores; report model_unavailable only when nothing matches.',
  model_id_rule:
    "model_id is always one of the vendor's models. If model_modes is present, only the modes listed under that model_id are valid; the vendor-level modes list is a union and not enough.",
  artifact_cardinality_rule: ARTIFACT_RULE,
};

const TTS_POLICY = {
  default_order: ["official:speech-2.8-hd", "official:speech-2.8-turbo"],
  use_hd_first_when: ["final delivery", "emotional speech", "character voice quality"],
  use_turbo_first_when: ["draft preview", "fast iteration"],
  use_seedaudio_when: [
    "the user names SeedAudio (Seed Audio) directly",
    "cinematic dubbing, drama/trailer performance or role-performance speech",
    "voice style must be replicated from a reference audio or image",
    "a voice described in free text that no catalog voice matches",
    "speech must be produced together with ambience, BGM or SFX in one clip",
  ],
  model_id_rule:
    "Pass vendor plus one value from models as model_name (SeedAudio: vendor=seedaudio, model_name=seed-audio-1.0). A missing voice_id alone is not a reason to use SeedAudio; prepare a catalog voice first.",
  artifact_cardinality_rule: ARTIFACT_RULE,
};

const MUSIC_POLICY = {
  default_order: ["official:music-3.0"],
  rule: "Use vendor=official, model_id=music-3.0 for BGM, score and instrumentals (mode=instrumental), and for vocal songs once lyrics are confirmed. Target duration is not a generation parameter; trim or loop in post-processing.",
  model_id_rule: "Only vendor=official + model_id=music-3.0 exists.",
  artifact_cardinality_rule: ARTIFACT_RULE,
};

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
      selection_policy: imagePolicy(region),
      vendors: IMAGE_VENDOR_ENUM.map((v) => manifestVendor("image", IMAGE_VENDOR_CONFIGS[v], region)),
    },
    {
      modality: "video",
      tool: "hub_generate_video",
      selection_policy: VIDEO_POLICY,
      vendors: VIDEO_VENDOR_ENUM.map((v) => manifestVendor("video", VIDEO_VENDOR_CONFIGS[v], region)),
    },
    {
      modality: "audio.tts",
      tool: "hub_generate_audio_speech",
      selection_policy: TTS_POLICY,
      vendors: [manifestVendor("audio", AUDIO_TTS_VENDOR, region), manifestVendor("audio", AUDIO_TTS_SEEDAUDIO_VENDOR, region)],
    },
    {
      modality: "audio.music",
      tool: "hub_generate_audio_music",
      selection_policy: MUSIC_POLICY,
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
      selection_policy: { ...modality.selection_policy, user_facing_catalog_rule: CATALOG_RULE },
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
