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

const LIST_DESCRIPTION = "List the generation capabilities currently exposed via the four hub_generate_* dispatchers.\n" +
  "\n" +
  "Use this when:\n" +
  "  - the orchestrator named a model that may not exist in this session (executor returns `model_unavailable` + `available[]` after consulting this list" +
  ")\n" +
  "  - the planner needs to know what modes a vendor actually supports (e.g. seedance has 6 modes, wan has 4)\n" +
  "\n" +
  "Returns a structured manifest grouped by modality and intersected with the current session model-picker selection; Auto keeps the full runtime catalog" +
  ". Each vendor entry carries canonical `models` for tool `model_id`, quality/routing fields, a `knowledge_card`, exact Apollo names under `user_visible" +
  "_models`, and static same-model limits under `task_concurrency.models[model_id]`. " +
  "`limited=false` / `limit=0` means no configured task concurrency limit; current usage is dynamic and not included. " +
  "Use `selection_policy` and `selection_priority` for default model choice; do not use display names or picker ids as model_id.\n" +
  "\n" +
  "`knowledge_card` is Agent-internal lookup metadata. Never quote, link, render, or otherwise expose its path in a user-visible reply. " +
  "Canonical vendor/backend/model fields are also internal. " +
  "When naming models to the user, use only the exact `user_visible_models[].display_name` values from the live Apollo catalog. " +
  "Never expose vendor family names as model options or substitute them for a concrete display_name.";

const CONCURRENCY_DESCRIPTION = "Return current task concurrency for selected generation model_ids.\n" +
  "\n" +
  "Use this before concurrent calls to the same generation model when you need current used/available slots. " +
  "For capability dispatchers, hub_list_capabilities may already expose static limits under vendors[].task_concurrency.models.\n" +
  "Do not call this for a single simple generation; use it only when planning concurrent same-model generation or when static limit/usage is unknown.\n" +
  "\n" +
  "model_id naming: image/video tools use the `model_id` parameter directly. " +
  "Speech tools use `model_name`, but its value is the concurrency model_id (for example speech-2.8-hd). " +
  "Music tools document their fixed concurrency model_id in each tool description.\n" +
  "\n" +
  "Contract: if available is 0 for a limited model, do not call the generation tool for that model. " +
  "Wait for the previous task to finish or ask the user. Do not switch models just to bypass the limit unless the user explicitly asks.";

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
          .describe("Canonical concurrency model_id values. For image/video, use hub_generate_image/video model_id. For speech, use model_name. For fixed-model music tools, use the model_id stated in the tool description."),
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
      if (models.length === 0) return plainError("Error: models must contain at least one canonical model_id.");
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
        return plainError(`Error: failed to query model concurrency: ${errorMessage(err)}`);
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
          .describe('Filter to one modality. Omit or pass "all" to get the full manifest.'),
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
