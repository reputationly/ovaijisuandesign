// normalize-model-info.js
import { API_PATHS } from "../infra/workspace-gateway.js";
import { useGatewayScope } from "../infra/runtime-config.js";
import { useQuery } from "@tanstack/react-query";
import {
  useGatewayFetch,
  useModelCatalogScopeKey,
} from "./use-model-catalog-scope-key.js";

export const QUERY_KEY$1 = ["models"];
const QUERY_KEY = QUERY_KEY$1;

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
/** 图片超分可用性单独一条查询的前缀。 */
export const IMAGE_UPSCALE_QUERY_KEY = "image-upscale-available";

/**
 * 图片超分能不能用：**单独一条查询**，不挂在模型数组上。
 *
 * 为什么不能挂在数组上：React Query 会做结构共享（模型没变就返回旧数组、变了就新建数组），
 * 挂上去的不可枚举属性要么跟着旧数组存活（配置改了也不更新），要么直接丢（入口被误隐藏）。
 * 这条查询只读 `/api/v1/models/config` 的 `imageUpscaleAvailable`，和模型列表互不影响。
 *
 * 判据仍然只有 gateway 那份生效配置（含兜底表与平台目录），不用主进程的 `platformService.get()`。
 */
export function imageUpscaleQueryOptions(gatewayFetch, catalogScopeKey, enabled) {
  return {
    queryKey: [IMAGE_UPSCALE_QUERY_KEY, catalogScopeKey],
    queryFn: async ({ signal }) => {
      const resp = await gatewayFetch(API_PATHS.modelsConfig, { signal });
      if (!resp.ok)
        throw new Error(`image upscale availability failed with HTTP ${resp.status}`);
      const payload = await resp.json();
      return Boolean(payload && typeof payload === "object" && !Array.isArray(payload) && payload.imageUpscaleAvailable === true);
    },
    staleTime: STALE_24H,
    retry: REGISTRY_RETRY_COUNT,
    retryDelay: REGISTRY_RETRY_DELAY_MS,
    enabled,
  };
}

/** 画布的"高清"入口据此显示/隐藏。数据还没回来时按不可用处理（不闪一下入口）。 */
export function useImageUpscaleAvailable() {
  const gatewayFetch = useGatewayFetch();
  const catalogScopeKey = useModelCatalogScopeKey();
  const { gatewayReady } = useGatewayScope();
  const query = useQuery(imageUpscaleQueryOptions(gatewayFetch, catalogScopeKey, gatewayReady));
  return query.data === true;
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
          return normalizeMediaModelsResponse({ models: grouped });
        }
        return normalizeMediaModelsResponse(payload);
      }
      return normalizeMediaModelsResponse(payload);
    },
    staleTime: STALE_24H,
    retry: REGISTRY_RETRY_COUNT,
    retryDelay: REGISTRY_RETRY_DELAY_MS,
    enabled: gatewayReady,
  });
}
