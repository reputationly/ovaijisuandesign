import { z } from "zod";

import { currentSessionId } from "../context.js";
import type { ReleaseRegion } from "../env.js";
import { errorMessage, type GatewayClient } from "../gateway-client.js";
import { structuredReply } from "../replies.js";
import {
  buildStaticManifest,
  ConcurrencyLimitsSchema,
  ConcurrencyUsageSchema,
  filterCatalogBySelection,
  filterManifestByCatalog,
  limitsMap,
  ModelsResponseSchema,
  withTaskConcurrency,
  type ManifestModality,
} from "./capability-manifest.js";
import { plainError } from "./capability-params.js";
import type { RegisterTools } from "./types.js";

/**
 * list_capabilities / get_model_concurrency。
 * 目录以 gateway 的 `/api/models?agent_version=2` 为准；目录拿不到时返回空 vendor 列表
 * （宁可让 agent 报“没有可用模型”，也不让它去调一个实际不存在的模型）。
 */

const LIMITS_PATH = "/api/v1/models/concurrency/limits";
const USAGE_PATH = "/api/v1/models/concurrency/usage";

const log = (line: string) => process.stderr.write(`[hilo-tools] ${line}\n`);

export async function buildLiveManifest(gw: GatewayClient, region: ReleaseRegion): Promise<ManifestModality[]> {
  const staticManifest = buildStaticManifest(region);
  let manifest: ManifestModality[];
  try {
    const sessionId = currentSessionId();
    const [catalog, selected] = await Promise.all([
      gw.get("/api/models?agent_version=2", 10_000, ModelsResponseSchema),
      sessionId ? gw.getSelectedMediaModels(sessionId) : Promise.resolve(null),
    ]);
    manifest = filterManifestByCatalog(staticManifest, filterCatalogBySelection(catalog, selected));
  } catch (err) {
    log(`list_capabilities: /api/models failed, answering with an empty vendor list: ${errorMessage(err)}`);
    return filterManifestByCatalog(staticManifest, { imageModels: [], videoModels: [], audioModels: [] });
  }
  try {
    const limits = await gw.get(LIMITS_PATH, 10_000, ConcurrencyLimitsSchema);
    return withTaskConcurrency(manifest, limitsMap(limits.items));
  } catch (err) {
    log(`list_capabilities: concurrency limits lookup failed, omitting task_concurrency: ${errorMessage(err)}`);
    return manifest;
  }
}

const LIST_DESCRIPTION = [
  "List the generation capabilities behind the four hub_generate_* tools (image, video, speech, music).",
  "",
  "Call it when a requested model may not exist in this session (answer model_unavailable with the available options), or when planning needs the real modes/parameters of a vendor.",
  "",
  "Returns {ok, region, modalities[]}: per modality a selection_policy and vendors[]. The list is intersected with the live model catalog and the session's model-picker selection (Auto keeps the full catalog). Each vendor carries canonical models (the values for model_id), default_model, modes/model_modes, capabilities, parameters, aliases/model_aliases, knowledge_card, user_visible_models (exact display names from the catalog) and task_concurrency.models[model_id] = {limited, limit} static per-model limits (limit 0 = no configured limit; live usage is not included, see get_model_concurrency). Default choices follow selection_policy; model_id only ever takes a value from models.",
  "",
  "Everything except display names is internal (knowledge_card, vendor, backend, model ids) and must stay out of replies to the user. Refer to a model only by its user_visible_models[].display_name, copied exactly; a vendor family name is never a model option.",
].join("\n");

const CONCURRENCY_DESCRIPTION = [
  "Report current task concurrency (limit, used, available) for generation model_ids.",
  "",
  "Use it before firing several concurrent calls at the same model when you need live free slots; static limits are already in hub_list_capabilities vendors[].task_concurrency. Not needed for a single simple generation.",
  "",
  "model_id naming: image/video use their model_id; speech uses the model_name value (e.g. speech-2.8-hd); music tools state their fixed model id in their descriptions.",
  "",
  "Contract: when a limited model shows available=0, do not call generation for it; let running tasks finish or check with the user; picking a different model just to get around the cap is only fine if the user wants it. available is null when the model has no limit.",
].join("\n");

function normalizeModels(models: readonly string[]): string[] {
  return [...new Set(models.map((m) => m.trim()).filter(Boolean))];
}

export const registerCapabilityTools: RegisterTools = (registrar, gw, region) => {
  registrar.registerTool(
    "get_model_concurrency",
    {
      description: CONCURRENCY_DESCRIPTION,
      inputSchema: {
        models: z
          .array(z.string())
          .min(1)
          .max(50)
          .describe("Canonical concurrency model ids: model_id for image/video, model_name for speech, the stated fixed id for music tools."),
      },
      outputSchema: {
        models: z.array(
          z.object({
            model_id: z.string(),
            limited: z.boolean(),
            limit: z.number(),
            used: z.number(),
            available: z.number().nullable(),
          }),
        ),
      },
    },
    async (args) => {
      const models = normalizeModels(args.models ?? []);
      if (models.length === 0) return plainError("Error: pass at least one non-empty model id in models.");
      try {
        const [limitsResp, usageResp] = await Promise.all([
          gw.get(LIMITS_PATH, 10_000, ConcurrencyLimitsSchema),
          gw.post(USAGE_PATH, { models }, 10_000, ConcurrencyUsageSchema),
        ]);
        const limits = limitsMap(limitsResp.items);
        const used = new Map(usageResp.items.map((i) => [i.model.trim(), Math.max(0, Math.trunc(i.used_concurrency))]));
        return structuredReply({
          models: models.map((model) => {
            const limit = limits.get(model) ?? 0;
            const u = used.get(model) ?? 0;
            return { model_id: model, limited: limit > 0, limit, used: u, available: limit > 0 ? Math.max(0, limit - u) : null };
          }),
        });
      } catch (err) {
        return plainError(`Error: concurrency lookup failed: ${errorMessage(err)}`);
      }
    },
  );

  registrar.registerTool(
    "list_capabilities",
    {
      description: LIST_DESCRIPTION,
      inputSchema: {
        modality: z
          .enum(["image", "video", "audio.tts", "audio.music", "all"])
          .optional()
          .describe('Restrict to one modality; omit or pass "all" for everything.'),
      },
      outputSchema: { ok: z.boolean(), region: z.string(), modalities: z.array(z.any()) },
    },
    async (args) => {
      const filter = args.modality && args.modality !== "all" ? args.modality : null;
      const manifest = await buildLiveManifest(gw, region);
      const modalities = filter ? manifest.filter((m) => m.modality === filter) : manifest;
      return structuredReply({ ok: true, region, modalities });
    },
  );
};
