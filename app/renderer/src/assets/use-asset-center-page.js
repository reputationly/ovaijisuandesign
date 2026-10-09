// use-asset-center-page.js
import { reactExports } from "../vendor.js";
import { useEntities } from "./check-cloud-asset-upload.js";
import { buildWorkspaceSearch } from "../workspace/create-visible-preview-tabs-store.js";
export function assetCenterSearchWithoutAction(returnWorkspaceId) {
  return returnWorkspaceId
    ? {
        returnWorkspaceId,
      }
    : {};
}
export function buildAssetCenterWorkspaceReturn(returnWorkspaceId) {
  return {
    to: "/workspace",
    search: buildWorkspaceSearch(returnWorkspaceId),
    replace: true,
  };
}
const VIEW_MODE_STORAGE_KEY = "assetCenter.viewMode";
function readInitialViewMode() {
  try {
    const raw2 = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (raw2 === "grid" || raw2 === "list") return raw2;
  } catch {}
  return "grid";
}
export function useAssetCenterPage() {
  const [typeFilter, setTypeFilter] = reactExports.useState("all");
  const [search2, setSearch] = reactExports.useState("");
  const [sort, setSort] = reactExports.useState("updated_at");
  const [viewMode, setViewMode] = reactExports.useState(readInitialViewMode);
  reactExports.useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {}
  }, [viewMode]);
  const listOpts = reactExports.useMemo(() => {
    const opts = {};
    if (typeFilter !== "all") opts.type = typeFilter;
    if (search2.trim()) opts.q = search2.trim();
    return opts;
  }, [typeFilter, search2]);
  const entitiesQuery = useEntities(listOpts);
  const entities = reactExports.useMemo(() => {
    const data2 = entitiesQuery.data ?? [];
    if (sort === "use_count") {
      return [...data2].sort((a2, b3) => b3.useCount - a2.useCount || b3.updatedAt - a2.updatedAt);
    }
    return data2;
  }, [entitiesQuery.data, sort]);
  const isLoading = entitiesQuery.isPending;
  const isEmpty2 =
    !entitiesQuery.isPending &&
    !entitiesQuery.isError &&
    entities.length === 0 &&
    !search2.trim() &&
    typeFilter === "all";
  const loadError = entitiesQuery.error ?? null;
  return {
    isLoading,
    loadError,
    typeFilter,
    search: search2,
    sort,
    viewMode,
    entities,
    isEmpty: isEmpty2,
    setTypeFilter,
    setSearch,
    setSort,
    setViewMode,
  };
}
