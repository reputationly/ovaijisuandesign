// ==== 逐文件收敛 ====
import { id$2, invalid$3, keys, object$1, revision$2 } from "../canvas-v3/canvas-v3-model.js";
// create-recently-added-store.js
import { register } from "@base-ui/utils/fastHooks";
import reactExports from "react";
import shimExports from "use-sync-external-store/shim";
import { createStore } from "zustand/vanilla";
import { TooltipProvider$2 } from "./base-ui.js";
import { DEFAULT_WORKFLOW_NODE_SPACING } from "../canvas/ungroup-in-canvas.js";
import { computeDerivedNodePosition } from "../canvas/resolve-derived-collision.js";
import { normalizeLegacyModelId } from "../generation/normalize-skill-detail-metadata.js";
import { useCanvasActions } from "../media-editing/use-canvas-actions.js";
import { CANVAS_TAG_NAME_MAX_LENGTH, PRESET_COLOR_NAME_KEYS, countCanvasTagNameUnits } from "./parse-connector-selection.js";
import { isCanvasTagColor } from "./normalize-v2-registry.js";
export function createModelRegistryStore() {
  return createStore((set) => ({
    image: [],
    video: [],
    audio: [],
    setModels: (kind, models) =>
      set((state) => ({
        ...state,
        [kind]: models,
      })),
  }));
}
const defaultModelRegistryStore = createModelRegistryStore();
// vendor 里的 createStore 是 zustand：对外是 getState。Base UI 的 useStore 会读 getSnapshot，套上去节点头会直接崩。
function useZustandStore(store, selector) {
  return reactExports.useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
export const ModelRegistryStoreContext = reactExports.createContext(null);
export function useModelRegistryApi() {
  return (
    reactExports.useContext(ModelRegistryStoreContext) ??
    defaultModelRegistryStore
  );
}
export const useModelRegistryStore = (selector) =>
  useZustandStore(useModelRegistryApi(), selector);
useModelRegistryStore.getState = defaultModelRegistryStore.getState;
useModelRegistryStore.setState = defaultModelRegistryStore.setState;
useModelRegistryStore.subscribe = defaultModelRegistryStore.subscribe;
function lookupForAsset(state, backend, modelId, type) {
  if (!backend || !modelId) return void 0;
  if (type !== "image" && type !== "video" && type !== "audio")
    return void 0;
  const pool = state[type];
  const id = normalizeLegacyModelId(modelId);
  return pool.find(
    (registryModel) =>
      registryModel.backend === backend &&
      (registryModel.id === id || registryModel.model_name === id || registryModel.pricingId === id),
  );
}
export function useModelForAsset(backend, modelId, type) {
  return useModelRegistryStore((state) =>
    lookupForAsset(state, backend, modelId, type),
  );
}
register({
  before(instance) {
    instance.syncIndex = 0;
    if (!instance.didInitialize) {
      instance.syncTick = 1;
      instance.syncHooks = [];
      instance.didChangeStore = true;
      instance.getSnapshot = () => {
        let didChange = false;
        for (let i = 0; i < instance.syncHooks.length; i += 1) {
          const hook = instance.syncHooks[i];
          const value = hook.selector(
            hook.store.state,
            hook.a1,
            hook.a2,
            hook.a3,
          );
          if (hook.didChange || !Object.is(hook.value, value)) {
            didChange = true;
            hook.value = value;
            hook.didChange = false;
          }
        }
        if (didChange) {
          instance.syncTick += 1;
        }
        return instance.syncTick;
      };
    }
  },
  after(instance) {
    if (instance.syncHooks.length > 0) {
      if (instance.didChangeStore) {
        instance.didChangeStore = false;
        instance.subscribe = (onStoreChange) => {
          const stores = new Set();
          for (const hook of instance.syncHooks) {
            stores.add(hook.store);
          }
          const unsubscribes = [];
          for (const store of stores) {
            unsubscribes.push(store.subscribe(onStoreChange));
          }
          return () => {
            for (const unsubscribe of unsubscribes) {
              unsubscribe();
            }
          };
        };
      }
      shimExports.useSyncExternalStore(
        instance.subscribe,
        instance.getSnapshot,
        instance.getSnapshot,
      );
    }
  },
});
export const TooltipProvider = TooltipProvider$2;
const HTML_TAG_RE = /<\/?(?:a|strong|em|code|br|p|span)(?:\s[^>]*)?\/?>/i;
const HTML_TAG_RE_GLOBAL =
  /<\/?(?:a|strong|em|code|br|p|span)(?:\s[^>]*)?\/?>/gi;
export function looksLikeHtml(text) {
  return HTML_TAG_RE.test(text);
}
function stripWhitelistedTags(html) {
  return html.replace(HTML_TAG_RE_GLOBAL, "");
}
export function stripErrorHtml(html) {
  if (!html) return "";
  if (!looksLikeHtml(html)) return html;
  if (typeof DOMParser === "undefined") return stripWhitelistedTags(html);
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent ?? "";
  } catch {
    return stripWhitelistedTags(html);
  }
}
function registry(value) {
  const raw2 = object$1(value);
  keys(raw2, ["version", "revision", "orderMode", "tags"]);
  if (
    raw2.version !== 2 ||
    (raw2.orderMode !== "default" && raw2.orderMode !== "custom") ||
    !Array.isArray(raw2.tags) ||
    raw2.tags.length > 1e3
  )
    invalid$3();
  const seen = new Set();
  const names = new Set();
  const tags2 = raw2.tags.map((candidate) => {
    const tag = object$1(candidate);
    keys(tag, ["id", "kind", "name", "color", "legacyNameKey"]);
    const tagId = id$2(tag.id);
    if (seen.has(tagId)) invalid$3();
    seen.add(tagId);
    const presetKey = Object.hasOwn(PRESET_COLOR_NAME_KEYS, tagId) ? PRESET_COLOR_NAME_KEYS[tagId] : void 0;
    const kind = presetKey ? "color" : "keyword";
    if (tag.kind !== kind) invalid$3();
    const name2 = tag.name === void 0 ? void 0 : id$2(tag.name).trim();
    if (name2 && (countCanvasTagNameUnits(name2) > CANVAS_TAG_NAME_MAX_LENGTH || names.has(name2))) invalid$3();
    if (name2) names.add(name2);
    if (!name2 && !presetKey) invalid$3();
    if (tag.legacyNameKey !== void 0 && tag.legacyNameKey !== presetKey) invalid$3();
    if (tag.kind === "color" && (typeof tag.color !== "string" || !isCanvasTagColor(tag.color))) invalid$3();
    if (tag.kind === "keyword" && tag.color !== void 0) invalid$3();
    return {
      id: tagId,
      kind,
      ...(name2
        ? {
            name: name2,
          }
        : {}),
      ...(tag.kind === "color"
        ? {
            color: tag.color,
          }
        : {}),
      ...(presetKey && !name2
        ? {
            legacyNameKey: presetKey,
          }
        : {}),
    };
  });
  if (Object.keys(PRESET_COLOR_NAME_KEYS).some((key2) => !seen.has(key2))) invalid$3();
  return {
    version: 2,
    revision: revision$2(raw2.revision),
    orderMode: raw2.orderMode,
    tags: tags2,
  };
}
let lastZoom = 1;
// 产物里这个是 `registry$1 = new Set()`（同文件另有一个叫 `registry` 的校验函数）。
// 还原时 `$1` 被剥掉、且 **Set 的声明整行丢了**，于是这三处都指向那个校验函数 ——
// `registry.add is not a function`，工作区路由整屏挂掉。
// 这里换个不会撞的名字，并把声明补回来。
const zoomCounterRegistry = /* @__PURE__ */ new Set();
export function broadcastZoom(zoom) {
  lastZoom = zoom;
  for (const el of zoomCounterRegistry) {
    el.style.setProperty("--canvas-zoom", String(zoom));
  }
}
function registerZoomCounter(el) {
  zoomCounterRegistry.add(el);
  el.style.setProperty("--canvas-zoom", String(lastZoom));
  return () => {
    zoomCounterRegistry.delete(el);
  };
}
export function useRegisterZoomCounter(ref, enabled = true) {
  reactExports.useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    return registerZoomCounter(el);
  }, [ref, enabled]);
}
export const CanvasTagColorsContext = reactExports.createContext(() => []);
export const CanvasTagFilterActiveContext = reactExports.createContext(false);
export function useCanvasTagFilterActive() {
  return reactExports.useContext(CanvasTagFilterActiveContext);
}
export const renameRequestStore = createStore((set) => ({
  pendingNodeId: null,
  requestRename: (nodeId) =>
    set({
      pendingNodeId: nodeId,
    }),
  consume: (nodeId) =>
    set((prevState) =>
      prevState.pendingNodeId === nodeId
        ? {
            pendingNodeId: null,
          }
        : prevState,
    ),
}));
export function useRenameRequest(nodeId, beginEdit, enabled = true) {
  const pending = useZustandStore(
    renameRequestStore,
    (state) => nodeId != null && state.pendingNodeId === nodeId,
  );
  reactExports.useEffect(() => {
    if (!pending || !nodeId || !enabled) return;
    beginEdit();
    renameRequestStore.getState().consume(nodeId);
  }, [pending, nodeId, enabled, beginEdit]);
}
const NODE_TAG_RING_ZOOM_FLOOR = 0.7;
const NODE_TAG_THEME_SURFACE_TOKEN_BY_PRESET = {
  "#0A84FF": "--canvas-node-tag-blue-surface",
  "#BF5AF2": "--canvas-node-tag-purple-surface",
  "#FF9F0A": "--canvas-node-tag-orange-surface",
  "#5E3DF5": "--canvas-node-tag-deep-purple-surface",
  "#FF5F57": "--canvas-node-tag-red-surface",
  "#30D158": "--canvas-node-tag-green-surface",
  "#FFD60A": "--canvas-node-tag-yellow-surface",
};
export function resolveNodeTagRingColor(color, readThemeToken) {
  const token = NODE_TAG_THEME_SURFACE_TOKEN_BY_PRESET[color.toUpperCase()];
  return (token ? readThemeToken(token).trim() : "") || color;
}
export function getNodeTagRingWidth(zoom) {
  const safeZoom = zoom > 0 ? zoom : 1;
  const visualZoom = Math.max(safeZoom, NODE_TAG_RING_ZOOM_FLOOR);
  const screenWidth = 4 - visualZoom;
  return Math.max(1, Math.min(28, screenWidth / safeZoom));
}
export const CanvasModalGuardContext = reactExports.createContext(null);
export function useIsCanvasModalOpen() {
  const ctx = reactExports.useContext(CanvasModalGuardContext);
  return (ctx?.count ?? 0) > 0;
}
export function createNodeTagColorStore() {
  return createStore((set, get) => ({
    colors: new Map(),
    activeNodeIds: new Set(),
    setColor: (nodeId, color, active = false) => {
      const current = get();
      if (
        current.colors.get(nodeId) === color &&
        current.activeNodeIds.has(nodeId) === active
      ) {
        return;
      }
      if (
        color === void 0 &&
        !current.colors.has(nodeId) &&
        !current.activeNodeIds.has(nodeId)
      ) {
        return;
      }
      const colors = new Map(current.colors);
      const activeNodeIds = new Set(current.activeNodeIds);
      if (color === void 0) colors.delete(nodeId);
      else colors.set(nodeId, color);
      if (color !== void 0 && active) activeNodeIds.add(nodeId);
      else activeNodeIds.delete(nodeId);
      set({
        colors,
        activeNodeIds,
      });
    },
  }));
}
const defaultNodeTagColorStore = createNodeTagColorStore();
export const NodeTagColorStoreContext = reactExports.createContext(null);
export function useNodeTagColorApi() {
  return (
    reactExports.useContext(NodeTagColorStoreContext) ??
    defaultNodeTagColorStore
  );
}
const DEFAULT_TTL_MS = 3e4;
export function createRecentlyAddedStore() {
  const timers = new Map();
  const store = createStore((set, get) => {
    const dropImmediate = (id) => {
      const timer = timers.get(id);
      if (timer) {
        clearTimeout(timer);
        timers.delete(id);
      }
      const current = get().ids;
      if (!current.has(id)) return;
      const next = new Set(current);
      next.delete(id);
      set({
        ids: next,
      });
    };
    return {
      ids: new Set(),
      add: (id, ttlMs = DEFAULT_TTL_MS) => {
        const prev = timers.get(id);
        if (prev) clearTimeout(prev);
        timers.set(
          id,
          setTimeout(() => dropImmediate(id), ttlMs),
        );
        const current = get().ids;
        if (current.has(id)) return;
        const next = new Set(current);
        next.add(id);
        set({
          ids: next,
        });
      },
      addMany: (ids, ttlMs = DEFAULT_TTL_MS) => {
        if (ids.length === 0) return;
        for (const id of ids) {
          const prev = timers.get(id);
          if (prev) clearTimeout(prev);
          timers.set(
            id,
            setTimeout(() => dropImmediate(id), ttlMs),
          );
        }
        const current = get().ids;
        let changed = false;
        const next = new Set(current);
        for (const id of ids) {
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        }
        if (changed)
          set({
            ids: next,
          });
      },
      remove: dropImmediate,
      clear: () => {
        for (const timer of timers.values()) clearTimeout(timer);
        timers.clear();
        if (get().ids.size === 0) return;
        set({
          ids: new Set(),
        });
      },
    };
  });
  return store;
}
export const defaultRecentlyAddedStore = createRecentlyAddedStore();
export const RecentlyAddedStoreContext = reactExports.createContext(null);
export function useRecentlyAddedApi() {
  return (
    reactExports.useContext(RecentlyAddedStoreContext) ??
    defaultRecentlyAddedStore
  );
}
export function getDerivedNodePosition(
  reactFlow,
  sourceNodeId,
  edges,
  fallbackSize,
) {
  const sourceInternal = reactFlow.getInternalNode(sourceNodeId);
  const sourceNode = sourceInternal ?? reactFlow.getNode(sourceNodeId);
  const sourceWidth = sourceNode?.measured?.width ?? fallbackSize;
  const sourceHeight = sourceNode?.measured?.height ?? fallbackSize;
  const sourceAbs = sourceInternal?.internals.positionAbsolute ??
    sourceNode?.position ?? {
      x: 0,
      y: 0,
    };
  const source = {
    x: sourceAbs.x,
    y: sourceAbs.y,
    width: sourceWidth,
    height: sourceHeight,
  };
  const peers = [];
  for (const edge of edges) {
    if (edge.source !== sourceNodeId) continue;
    if ((edge.type ?? "derivation") !== "derivation") continue;
    const internal = reactFlow.getInternalNode(edge.target);
    const node = internal ?? reactFlow.getNode(edge.target);
    if (!node) continue;
    const abs = internal?.internals.positionAbsolute ?? node.position;
    const height = node.measured?.height ?? fallbackSize;
    const width = node.measured?.width ?? fallbackSize;
    peers.push({
      x: abs.x,
      y: abs.y,
      height,
      width,
    });
  }
  let collision;
  if (peers.length === 0) {
    const occupied = [];
    for (const node of reactFlow.getNodes()) {
      if (node.id === sourceNodeId) continue;
      const internal = reactFlow.getInternalNode(node.id);
      const abs = internal?.internals.positionAbsolute ?? node.position;
      const width = node.measured?.width ?? fallbackSize;
      const height = node.measured?.height ?? fallbackSize;
      occupied.push({
        x: abs.x,
        y: abs.y,
        w: width,
        h: height,
      });
    }
    if (occupied.length > 0) {
      collision = {
        occupied,
        newSize: {
          width: sourceWidth,
          height: sourceHeight,
        },
      };
    }
  }
  return computeDerivedNodePosition(
    source,
    peers,
    DEFAULT_WORKFLOW_NODE_SPACING,
    collision,
  );
}
export function useNodeIsEmpty(nodeId) {
  const { getNodeById, subscribeGraphChange } = useCanvasActions();
  const getSnapshot = reactExports.useCallback(() => {
    const node = getNodeById(nodeId);
    return node?.isEmpty === true && !node.assetId;
  }, [getNodeById, nodeId]);
  return reactExports.useSyncExternalStore(
    subscribeGraphChange,
    getSnapshot,
    getSnapshot,
  );
}
