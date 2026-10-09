// use-canvas-tag-filter.js
import {
  reactExports,
  Tag$1,
  API_PATHS,
  useGatewayScope,
  useQuery,
  MEDIA_LINEAGE_MAX_REFERENCES,
  logMediaLineage,
  ArrowUpRight,
  Minus,
  Grid3X3,
} from "../vendor.js";
import { accountScopeKey, useOptionalTeamAccount } from "./apply-asset-change.jsx";
import { Brush, Circle, MousePointer2, Square, Type$1 } from "./parse-item.jsx";
import { mapPricingResponse } from "./push-inline.js";
import { useCanvasAssetNodeIds } from "./track-events.js";
import { useGatewayFetch } from "./use-resizable-width.js";
import { Emitter } from "./vs-buffer.js";
import { WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY } from "./workspace-failure-diagnosis-registry.js";
export function resolveWorkspaceFailureDiagnosis(code2, t2, language2) {
  if (!code2) return void 0;
  const meta2 = WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY[code2];
  return {
    code: code2,
    category: meta2.category,
    severity: meta2.severity,
    title: translate(meta2.title, t2, language2),
    message: translate(meta2.message, t2, language2),
    primaryAction: translate(meta2.primaryAction, t2, language2),
    suggestions: meta2.suggestions.map((suggestion) => translate(suggestion, t2, language2)),
    runbook: meta2.runbook,
  };
}
function translate(copy2, t2, language2) {
  return t2(copy2.key, {
    defaultValue: language2.startsWith("zh") ? copy2.zh : copy2.en,
  });
}
export function logReferenceSubmission(paths, context, assets) {
  try {
    for (const [referenceIndex, path2] of paths.slice(0, MEDIA_LINEAGE_MAX_REFERENCES).entries()) {
      let assetId;
      if (assets) {
        for (const [, asset] of assets) {
          if (asset.path !== path2) continue;
          assetId = asset.url?.match(/\/files\/id\/([\w-]+)/)?.[1];
          if (assetId) break;
        }
      }
      logMediaLineage({
        ...context,
        stage: "reference.client-submit",
        referenceIndex,
        referenceCount: paths.length,
        path: path2,
        assetId,
      });
    }
    if (paths.length > MEDIA_LINEAGE_MAX_REFERENCES)
      logMediaLineage({
        ...context,
        stage: "reference.omitted",
        omittedCount: paths.length - MEDIA_LINEAGE_MAX_REFERENCES,
      });
  } catch {}
}
export const TOOLS = [
  {
    tool: "select",
    icon: MousePointer2,
    labelKey: "imageEdit.toolSelect",
  },
  {
    tool: "rectangle",
    icon: Square,
    labelKey: "imageEdit.toolRectangle",
  },
  {
    tool: "ellipse",
    icon: Circle,
    labelKey: "imageEdit.toolEllipse",
  },
  {
    tool: "arrow",
    icon: ArrowUpRight,
    labelKey: "imageEdit.toolArrow",
  },
  {
    tool: "line",
    icon: Minus,
    labelKey: "imageEdit.toolLine",
  },
  {
    tool: "brush",
    icon: Brush,
    labelKey: "imageEdit.toolBrush",
  },
  {
    tool: "text",
    icon: Type$1,
    labelKey: "imageEdit.toolText",
  },
  {
    tool: "tag",
    icon: Tag$1,
    labelKey: "imageEdit.toolTag",
  },
  {
    tool: "mosaic",
    icon: Grid3X3,
    labelKey: "imageEdit.toolMosaic",
  },
];
class PluginEvents {
  _onPluginsChanged = new Emitter();
  onPluginsChanged = this._onPluginsChanged.event;
  firePluginsChanged(id2, kind) {
    this._onPluginsChanged.fire({
      id: id2,
      kind,
    });
  }
}
export const pluginEvents = new PluginEvents();
export const ASSET_VIRTUALIZATION_MIN_ITEMS = 40;
export const GRID_OVERSCAN_ROWS = 3;
export const ASSET_VIEW_INITIAL_RECT = {
  width: 480,
  height: 384,
};
const DEFAULT_STALE_MS = 60 * 60 * 1e3;
const MIN_STALE_MS = 60 * 1e3;
const LEGACY_PERSONAL_PRICING_SCOPE = "LEGACY_PERSONAL";
const CANONICAL_PRICING_PENDING_SCOPE = "CANONICAL_PENDING";
async function fetchPricing(gatewayFetch2) {
  const resp = await gatewayFetch2(API_PATHS.billingPricing);
  const raw2 = await resp.json();
  return mapPricingResponse(raw2);
}
export function usePricingConfig() {
  const gatewayFetch2 = useGatewayFetch();
  const { scopeKey, baseUrl, gatewayBinding } = useGatewayScope();
  const teamAccount = useOptionalTeamAccount();
  const workspaceInstanceId = gatewayBinding?.instanceId;
  const workspaceGeneration = gatewayBinding?.generation;
  const canonicalScopeKey = accountScopeKey(teamAccount?.activeScope ?? null);
  const canonicalIntegrationActive = teamAccount?.integrationEnabled === true;
  const canonicalAccountReady =
    !canonicalIntegrationActive ||
    (teamAccount.accountDataVisible === true && canonicalScopeKey !== null);
  const pricingAccountScope = !canonicalIntegrationActive
    ? LEGACY_PERSONAL_PRICING_SCOPE
    : canonicalAccountReady
      ? canonicalScopeKey
      : CANONICAL_PRICING_PENDING_SCOPE;
  return useQuery({
    queryKey: [
      "billing-pricing",
      scopeKey,
      baseUrl,
      workspaceInstanceId,
      workspaceGeneration,
      pricingAccountScope,
    ],
    enabled: Boolean(baseUrl) && canonicalAccountReady,
    queryFn: () => fetchPricing(gatewayFetch2),
    // 动态 staleTime：活动期内按服务端下发的 endUnix 精准失效，
    // 活动外用默认 1h。失效后下一次组件挂载/聚焦会自动重新拉取。
    // 注意：全局 QueryClient retry/refetch 都是关闭的。workspace gateway
    // 重启时第一次请求可能命中短暂 Failed to fetch；这里必须局部有限重试，
    // 且 queryKey 同时带 gateway instance/generation 与 canonical account
    // scope：gateway rebind 或 Personal/Team 切换后都不能沿用旧实例、旧计费空间
    // 的价格。切换中使用永不 fetch 的 pending key，避免短暂展示上个账号的优惠价。
    retry: 2,
    staleTime: (query) => {
      const endUnix = query.state.data?.promotionEndUnix;
      if (!endUnix) return DEFAULT_STALE_MS;
      const remaining = endUnix * 1e3 - query.state.dataUpdatedAt;
      return Math.max(MIN_STALE_MS, remaining);
    },
  });
}
export const OPEN_BROWSER_EVENT = "hilo:open-browser";
const STORAGE_KEY$2 = "workspaceSessionTabs";
const LOCAL_CACHE_KEY = `hilo:storage:global.${STORAGE_KEY$2}`;
const MAX_WORKSPACE_RECORDS = 100;
function isRecord$6(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function uniqueStrings$1(value) {
  if (!Array.isArray(value)) return [];
  const seen2 = new Set();
  const result = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0 || seen2.has(item)) continue;
    seen2.add(item);
    result.push(item);
  }
  return result;
}
function normalizeTabsState(value) {
  if (!isRecord$6(value)) return null;
  const openedTabIds = uniqueStrings$1(value.openedTabIds);
  const rawFocused = value.focusedSessionId;
  const focusedSessionId =
    typeof rawFocused === "string" && openedTabIds.includes(rawFocused) ? rawFocused : null;
  const updatedAt =
    typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt) ? value.updatedAt : 0;
  return {
    openedTabIds,
    focusedSessionId,
    updatedAt,
  };
}
function normalizeTabsRecord(value) {
  if (!isRecord$6(value)) return {};
  const result = {};
  for (const [workspaceKey, rawState] of Object.entries(value)) {
    if (!workspaceKey) continue;
    const state2 = normalizeTabsState(rawState);
    if (state2) result[workspaceKey] = state2;
  }
  return result;
}
function pruneTabsRecord(value) {
  const entries2 = Object.entries(value).sort((a2, b3) => b3[1].updatedAt - a2[1].updatedAt);
  return Object.fromEntries(entries2.slice(0, MAX_WORKSPACE_RECORDS));
}
function readLocalCache() {
  if (typeof localStorage === "undefined") return {};
  try {
    return normalizeTabsRecord(JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) ?? "{}"));
  } catch {
    return {};
  }
}
function writeLocalCache(value) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(value));
  } catch {}
}
export class SessionTabsPersister {
  constructor(getStorage) {
    this.getStorage = getStorage;
  }
  queue = Promise.resolve();
  /** Read the saved tab state for a workspace. */
  async load(workspaceKey) {
    if (!workspaceKey) return null;
    const storage = this.getStorage();
    if (storage) {
      try {
        const record2 = normalizeTabsRecord(await storage.globalGet(STORAGE_KEY$2));
        writeLocalCache(record2);
        return record2[workspaceKey] ?? null;
      } catch {}
    }
    return readLocalCache()[workspaceKey] ?? null;
  }
  /** Enqueue a persist operation (serial, non-blocking). */
  persist(workspaceKey, snapshot2) {
    if (!workspaceKey) return Promise.resolve();
    this.queue = this.queue
      .catch(() => {})
      .then(async () => {
        const storage = this.getStorage();
        let current2 = readLocalCache();
        if (storage) {
          try {
            current2 = normalizeTabsRecord(await storage.globalGet(STORAGE_KEY$2));
          } catch {}
        }
        const next2 = pruneTabsRecord({
          ...current2,
          [workspaceKey]: {
            openedTabIds: [...snapshot2.openedTabIds],
            focusedSessionId: snapshot2.focusedSessionId,
            updatedAt: Date.now(),
          },
        });
        writeLocalCache(next2);
        if (storage) await storage.globalSet(STORAGE_KEY$2, next2);
      });
    return this.queue;
  }
  /**
   * Remove a workspace's tab state (e.g. when user deletes the workspace
   * from recents). Best-effort: if IPC fails, the entry will eventually be
   * pruned by {@link MAX_WORKSPACE_RECORDS}.
   */
  async remove(workspaceKey) {
    if (!workspaceKey) return;
    const storage = this.getStorage();
    let current2 = readLocalCache();
    if (storage) {
      try {
        current2 = normalizeTabsRecord(await storage.globalGet(STORAGE_KEY$2));
      } catch {}
    }
    if (!(workspaceKey in current2)) return;
    const { [workspaceKey]: _2, ...rest } = current2;
    writeLocalCache(rest);
    if (storage) {
      try {
        await storage.globalSet(STORAGE_KEY$2, rest);
      } catch {}
    }
  }
}
export async function removeWorkspaceSessionTabs(workspaceKey, getStorage) {
  const persister = new SessionTabsPersister(getStorage);
  return persister.remove(workspaceKey);
}
export const WorkspaceRemoteToolContext = reactExports.createContext(null);
export function useWorkspaceRemoteToolOptional() {
  return reactExports.useContext(WorkspaceRemoteToolContext);
}
export function useWorkspaceRemoteTool() {
  const ctx = useWorkspaceRemoteToolOptional();
  if (!ctx) throw new Error("useWorkspaceRemoteTool must be used within WorkspaceChatProvider");
  return ctx;
}
const TAG_FILTER_FOCUS_ZOOM = 0.8;
const TAG_FILTER_MIN_READABLE_ZOOM = 0.25;
function isEditableTarget$1(target) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}
function hasForegroundKeyboardSurface(target) {
  const selector2 =
    '[role="dialog"]:not([aria-hidden="true"]), [role="menu"]:not([aria-hidden="true"]), [role="listbox"]:not([aria-hidden="true"])';
  if (target instanceof Element && target.closest(selector2)) return true;
  return document.querySelector(selector2) !== null;
}
function releaseTagFilterToolbarFocus() {
  const activeElement2 = document.activeElement;
  if (
    activeElement2 instanceof HTMLElement &&
    activeElement2.closest('[data-action-ui-id="canvas.tag-filter-toolbar"]')
  ) {
    activeElement2.blur();
  }
}
export function useCanvasTagFilter({
  canvasViewRef,
  isPresented,
  workspaceAssets,
  workspaceId: workspaceId2,
}) {
  const canvasNodeIdsByAsset = useCanvasAssetNodeIds(workspaceId2);
  const [activeTagId, setActiveTagIdState] = reactExports.useState();
  const [focusedNodeId, setFocusedNodeId] = reactExports.useState(null);
  const getMatchedNodeIds = reactExports.useCallback(
    (tagId) => {
      if (!tagId) return [];
      const matchingAssetIds = new Set(
        workspaceAssets.filter((asset) => asset.tagIds?.includes(tagId)).map((asset) => asset.id),
      );
      const nodeIds = [];
      for (const [assetId, assetNodeIds] of canvasNodeIdsByAsset) {
        if (matchingAssetIds.has(assetId)) nodeIds.push(...assetNodeIds);
      }
      return nodeIds;
    },
    [canvasNodeIdsByAsset, workspaceAssets],
  );
  const matchedNodeIds = reactExports.useMemo(
    () => getMatchedNodeIds(activeTagId),
    [activeTagId, getMatchedNodeIds],
  );
  const cancelPendingFocus = reactExports.useCallback(() => {
    canvasViewRef.current?.cancelPendingFocus();
  }, [canvasViewRef]);
  const focusOverview = reactExports.useCallback(
    (nodeIds) => {
      if (isPresented === false || nodeIds.length === 0) return;
      canvasViewRef.current?.focusNodeIds(nodeIds, {
        expandAncestorGroups: true,
        visibilityPriority: {
          minReadableZoom: TAG_FILTER_MIN_READABLE_ZOOM,
        },
      });
    },
    [canvasViewRef, isPresented],
  );
  const focusNode = reactExports.useCallback(
    (nodeId) => {
      if (isPresented === false) return;
      canvasViewRef.current?.focusNodeIds([nodeId], {
        expandAncestorGroups: true,
        zoom: TAG_FILTER_FOCUS_ZOOM,
      });
    },
    [canvasViewRef, isPresented],
  );
  const setActiveTagId = reactExports.useCallback(
    (tagId) => {
      cancelPendingFocus();
      setActiveTagIdState(tagId);
      setFocusedNodeId(null);
      if (tagId) focusOverview(getMatchedNodeIds(tagId));
    },
    [cancelPendingFocus, focusOverview, getMatchedNodeIds],
  );
  const clearFilter = reactExports.useCallback(() => setActiveTagId(void 0), [setActiveTagId]);
  const locateNode = reactExports.useCallback(
    (nodeId) => {
      cancelPendingFocus();
      focusNode(nodeId);
    },
    [cancelPendingFocus, focusNode],
  );
  const focusPrevious = reactExports.useCallback(() => {
    if (matchedNodeIds.length < 2) return;
    const currentIndex = focusedNodeId ? matchedNodeIds.indexOf(focusedNodeId) : -1;
    const previousIndex =
      currentIndex < 0
        ? matchedNodeIds.length - 1
        : (currentIndex - 1 + matchedNodeIds.length) % matchedNodeIds.length;
    const previousNodeId = matchedNodeIds[previousIndex];
    if (!previousNodeId) return;
    setFocusedNodeId(previousNodeId);
    focusNode(previousNodeId);
  }, [focusNode, focusedNodeId, matchedNodeIds]);
  const focusNext = reactExports.useCallback(() => {
    if (matchedNodeIds.length < 2) return;
    const currentIndex = focusedNodeId ? matchedNodeIds.indexOf(focusedNodeId) : -1;
    const nextNodeId = matchedNodeIds[(currentIndex + 1) % matchedNodeIds.length];
    if (!nextNodeId) return;
    setFocusedNodeId(nextNodeId);
    focusNode(nextNodeId);
  }, [focusNode, focusedNodeId, matchedNodeIds]);
  const focusedNodeIndex = focusedNodeId ? matchedNodeIds.indexOf(focusedNodeId) : -1;
  reactExports.useEffect(() => {
    if (!focusedNodeId || focusedNodeIndex >= 0) return;
    cancelPendingFocus();
    setFocusedNodeId(null);
    focusOverview(matchedNodeIds);
  }, [cancelPendingFocus, focusOverview, focusedNodeId, focusedNodeIndex, matchedNodeIds]);
  const presented = isPresented !== false;
  const wasPresentedRef = reactExports.useRef(presented);
  reactExports.useEffect(() => {
    if (wasPresentedRef.current === presented) return;
    wasPresentedRef.current = presented;
    cancelPendingFocus();
    if (!presented || !activeTagId) return;
    if (focusedNodeId && focusedNodeIndex >= 0) focusNode(focusedNodeId);
    else focusOverview(matchedNodeIds);
  }, [
    activeTagId,
    cancelPendingFocus,
    focusNode,
    focusOverview,
    focusedNodeId,
    focusedNodeIndex,
    matchedNodeIds,
    presented,
  ]);
  const previousWorkspaceIdRef = reactExports.useRef(workspaceId2);
  reactExports.useEffect(() => {
    if (previousWorkspaceIdRef.current === workspaceId2) return;
    previousWorkspaceIdRef.current = workspaceId2;
    cancelPendingFocus();
  }, [cancelPendingFocus, workspaceId2]);
  reactExports.useEffect(() => cancelPendingFocus, [cancelPendingFocus]);
  const returnToOverview = reactExports.useCallback(() => {
    cancelPendingFocus();
    setFocusedNodeId(null);
    focusOverview(matchedNodeIds);
  }, [cancelPendingFocus, focusOverview, matchedNodeIds]);
  const handleKeyboardShortcut = reactExports.useCallback(
    (event) => {
      if (
        !activeTagId ||
        !presented ||
        event.defaultPrevented ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditableTarget$1(event.target) ||
        hasForegroundKeyboardSurface(event.target)
      ) {
        return false;
      }
      if (event.key === "ArrowLeft" && matchedNodeIds.length > 1) focusPrevious();
      else if (event.key === "ArrowRight" && matchedNodeIds.length > 1) focusNext();
      else if (event.key === "Escape") {
        if (!focusedNodeId) {
          clearFilter();
          releaseTagFilterToolbarFocus();
        } else returnToOverview();
      } else return false;
      return true;
    },
    [
      activeTagId,
      clearFilter,
      focusNext,
      focusPrevious,
      focusedNodeId,
      matchedNodeIds.length,
      presented,
      returnToOverview,
    ],
  );
  reactExports.useEffect(() => {
    if (!activeTagId || !presented) return;
    const handleActiveFilterKeyDown = (event) => {
      if (!handleKeyboardShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", handleActiveFilterKeyDown, true);
    return () => window.removeEventListener("keydown", handleActiveFilterKeyDown, true);
  }, [activeTagId, handleKeyboardShortcut, presented]);
  return {
    activeTagId,
    clearFilter,
    focusNext,
    focusPrevious,
    focusedNodeIndex: focusedNodeIndex < 0 ? null : focusedNodeIndex,
    handleKeyboardShortcut,
    locateNode,
    matchedNodeIds,
    setActiveTagId,
    tagFilterActive: activeTagId !== void 0,
  };
}
