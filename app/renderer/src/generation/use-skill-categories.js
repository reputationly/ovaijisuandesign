// use-skill-categories.js
import { API_PATHS, reactExports } from "../vendor.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { getBaseUrl } from "../infra/gateway-http-error.jsx";
import { PENDING_AUTO_UPDATE_KEY } from "./use-mention-models.jsx";

export function normalizeSkillCategoriesResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const rawCategories = value.categories;
  if (!Array.isArray(rawCategories)) return [];
  return rawCategories.flatMap((value2) => {
    if (!value2 || typeof value2 !== "object" || Array.isArray(value2))
      return [];
    const item = value2;
    const tagType = item.tag_type ?? "category";
    if (
      typeof item.category !== "string" ||
      typeof item.cn_name !== "string" ||
      typeof item.en_name !== "string" ||
      typeof item.sort_order !== "number" ||
      (tagType !== "category" && tagType !== "stage")
    ) {
      return [];
    }
    return [
      {
        category: item.category,
        cn_name: item.cn_name,
        en_name: item.en_name,
        sort_order: item.sort_order,
        enabled: item.enabled !== false,
        tag_type: tagType,
        cn_description:
          typeof item.cn_description === "string" ? item.cn_description : "",
        en_description:
          typeof item.en_description === "string" ? item.en_description : "",
        combine_stage:
          typeof item.combine_stage === "boolean" ? item.combine_stage : void 0,
      },
    ];
  });
}

export function useSkillCategories(enabled = true) {
  const [taxonomy, setTaxonomy] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(enabled);
  const [error, setError] = reactExports.useState(null);
  const refresh = reactExports.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await gatewayFetch(
        `${API_PATHS.marketOperatorCategories}?tag_type=all`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data2 = normalizeSkillCategoriesResponse(await response.json());
      setTaxonomy(data2.filter((item) => item.enabled !== false));
    } catch (cause) {
      const nextError =
        cause instanceof Error ? cause : new Error(String(cause));
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);
  reactExports.useEffect(() => {
    if (!enabled) return;
    void refresh().catch(() => void 0);
  }, [enabled, refresh]);
  const categories = reactExports.useMemo(
    () => taxonomy.filter((item) => item.tag_type === "category"),
    [taxonomy],
  );
  const stages = reactExports.useMemo(
    () => taxonomy.filter((item) => item.tag_type === "stage"),
    [taxonomy],
  );
  return {
    categories,
    stages,
    taxonomy,
    loading,
    error,
    refresh,
  };
}

export function readPendingAutoUpdate() {
  try {
    const raw2 = sessionStorage.getItem(PENDING_AUTO_UPDATE_KEY);
    if (!raw2) return null;
    return JSON.parse(raw2);
  } catch {
    return null;
  }
}

export function clearPendingAutoUpdate() {
  try {
    sessionStorage.removeItem(PENDING_AUTO_UPDATE_KEY);
  } catch {}
}

export const filmArtwork =
  "" + new URL("../graphic-design-vBqZO3xO.png", import.meta.url).href;

export const shortDramaArtwork =
  "" + new URL("../short-drama-BlgbvS1F.png", import.meta.url).href;

const TRUSTED_HOME_ASSET_HOSTS = new Set([
  "cdn.hailuoai.com",
  "cdn.hailuoai.video",
]);

// 本地 gateway 的首页示例素材路由。配置里写相对路径，按当前 gateway 地址补全（端口每次启动都可能变）；
// 已补全的绝对地址同源同前缀也放行。
function localHomeShowcaseAssetUrl(text2) {
  let origin;
  try {
    origin = new URL(getBaseUrl() ?? "").origin;
  } catch {
    return void 0;
  }
  try {
    const url2 = text2.startsWith("/") && !text2.startsWith("//") ? new URL(text2, origin) : new URL(text2);
    return url2.origin === origin && url2.pathname.startsWith("/api/v1/home/showcase-assets/") ? url2.toString() : void 0;
  } catch {
    return void 0;
  }
}
export function normalizeHomeQuickStartAssetUrl(value) {
  if (typeof value !== "string") return void 0;
  const text2 = value.trim();
  if (!text2) return void 0;
  const localUrl = localHomeShowcaseAssetUrl(text2);
  if (localUrl) return localUrl;
  try {
    const url2 = new URL(text2);
    const trustedHost = TRUSTED_HOME_ASSET_HOSTS.has(
      url2.hostname.toLowerCase(),
    );
    if (
      url2.protocol !== "https:" ||
      !trustedHost ||
      url2.port !== "" ||
      url2.username !== "" ||
      url2.password !== ""
    ) {
      return void 0;
    }
    return url2.toString();
  } catch {
    return void 0;
  }
}
