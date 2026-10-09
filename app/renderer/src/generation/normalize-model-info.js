// normalize-model-info.js
import {
  API_PATHS,
  QUERY_KEY$1 as QUERY_KEY,
  useGatewayScope,
  useQuery,
} from "../vendor.js";
import {
  useGatewayFetch,
  useModelCatalogScopeKey,
} from "./use-model-catalog-scope-key.js";
const STALE_24H = 24 * 60 * 60 * 1e3;
const REGISTRY_RETRY_COUNT = 5;
const REGISTRY_RETRY_DELAY_MS = 300;
function normalizeMediaModelParams(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  const params = value;
  const resolution = params.resolution;
  if (
    !resolution ||
    typeof resolution !== "object" ||
    Array.isArray(resolution)
  )
    return void 0;
  const options = resolution.options;
  if (!Array.isArray(options)) return void 0;
  return {
    resolution: {
      options: options.filter((option2) => typeof option2 === "string"),
    },
  };
}
function normalizePromotion(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  const promotion = value;
  if (
    typeof promotion.toastTitle !== "string" ||
    typeof promotion.toast !== "string" ||
    typeof promotion.startTime !== "number" ||
    typeof promotion.endTime !== "number"
  ) {
    return void 0;
  }
  return {
    toastTitle: promotion.toastTitle,
    toast: promotion.toast,
    startTime: promotion.startTime,
    endTime: promotion.endTime,
    ...(typeof promotion.cost === "number"
      ? {
          cost: promotion.cost,
        }
      : {}),
    ...(typeof promotion.costPerSecond === "number"
      ? {
          costPerSecond: promotion.costPerSecond,
        }
      : {}),
    ...(typeof promotion.costPerImage === "number"
      ? {
          costPerImage: promotion.costPerImage,
        }
      : {}),
  };
}
function normalizeModelInfo(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const model = value;
  if (
    typeof model.id !== "string" ||
    typeof model.type !== "string" ||
    typeof model.display_name !== "string"
  ) {
    return null;
  }
  const promotion = normalizePromotion(model.promotion);
  const params = normalizeMediaModelParams(model.params);
  return {
    id: model.id,
    type: model.type,
    display_name: model.display_name,
    ...(typeof model.model_name === "string"
      ? {
          model_name: model.model_name,
        }
      : {}),
    description: typeof model.description === "string" ? model.description : "",
    tool_names: Array.isArray(model.tool_names)
      ? model.tool_names.filter((name2) => typeof name2 === "string")
      : [],
    visibility: typeof model.visibility === "string" ? model.visibility : "",
    icon_url: typeof model.icon_url === "string" ? model.icon_url : "",
    series_id: typeof model.series_id === "string" ? model.series_id : "",
    hot: model.hot === true,
    ...(promotion
      ? {
          promotion,
        }
      : {}),
    ...(params
      ? {
          params,
        }
      : {}),
  };
}
function normalizeMediaModelsResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("media model registry returned an invalid response");
  }
  const models = value.models;
  if (!Array.isArray(models)) {
    throw new Error("media model registry response is missing models");
  }
  const normalized = models.flatMap((model) => {
    const normalized2 = normalizeModelInfo(model);
    return normalized2 ? [normalized2] : [];
  });
  if (normalized.length === 0) {
    throw new Error("media model registry returned no valid models");
  }
  return normalized;
}
export function useMediaModels() {
  const gatewayFetch2 = useGatewayFetch();
  const catalogScopeKey = useModelCatalogScopeKey();
  const { gatewayReady, scopeKey, gatewayBinding } = useGatewayScope();
  const registryScopeKey = [
    scopeKey,
    gatewayBinding?.instanceId ?? "pending",
    gatewayBinding?.generation ?? 0,
  ].join(":");
  return useQuery({
    queryKey: [...QUERY_KEY, catalogScopeKey, registryScopeKey],
    queryFn: async ({ signal }) => {
      const resp = await gatewayFetch2(API_PATHS.modelsConfig, {
        signal,
      });
      if (!resp.ok)
        throw new Error(`model registry failed with HTTP ${resp.status}`);
      const payload = await resp.json();
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        const typed = payload;
        const grouped = ["imageModels", "videoModels", "audioModels"].flatMap(
          (key2) => (Array.isArray(typed[key2]) ? typed[key2] : []),
        );
        if (grouped.length > 0) {
          return normalizeMediaModelsResponse({
            models: grouped,
          });
        }
      }
      return normalizeMediaModelsResponse(payload);
    },
    staleTime: STALE_24H,
    retry: REGISTRY_RETRY_COUNT,
    retryDelay: REGISTRY_RETRY_DELAY_MS,
    enabled: gatewayReady,
  });
}
