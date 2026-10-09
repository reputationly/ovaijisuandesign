// create-recently-added-store.js
import {
  createStore$1,
  hooks,
  reactExports,
  shimExports,
  TooltipProvider$2,
  useStore$2,
} from "../vendor.js";
import { DEFAULT_WORKFLOW_NODE_SPACING } from "../canvas/ungroup-in-canvas.js";
import { computeDerivedNodePosition } from "../canvas/resolve-derived-collision.js";
import { normalizeLegacyModelId } from "../generation/normalize-skill-detail-metadata.js";
import { useCanvasActions } from "../media-editing/use-canvas-actions.js";

export function createModelRegistryStore() {
  return createStore$1((set2) => ({
    image: [],
    video: [],
    audio: [],
    setModels: (kind, models) =>
      set2((state2) => ({
        ...state2,
        [kind]: models,
      })),
  }));
}

const defaultModelRegistryStore = createModelRegistryStore();

export const ModelRegistryStoreContext = reactExports.createContext(null);

export function useModelRegistryApi() {
  return (
    reactExports.useContext(ModelRegistryStoreContext) ??
    defaultModelRegistryStore
  );
}

export const useModelRegistryStore = (selector2) =>
  useStore$2(useModelRegistryApi(), selector2);

useModelRegistryStore.getState = defaultModelRegistryStore.getState;

useModelRegistryStore.setState = defaultModelRegistryStore.setState;

useModelRegistryStore.subscribe = defaultModelRegistryStore.subscribe;

function lookupForAsset(state2, backend, modelId, type2) {
  if (!backend || !modelId) return void 0;
  if (type2 !== "image" && type2 !== "video" && type2 !== "audio")
    return void 0;
  const pool = state2[type2];
  const id2 = normalizeLegacyModelId(modelId);
  return pool.find(
    (m3) =>
      m3.backend === backend &&
      (m3.id === id2 || m3.model_name === id2 || m3.pricingId === id2),
  );
}

export function useModelForAsset(backend, modelId, type2) {
  return useModelRegistryStore((s2) =>
    lookupForAsset(s2, backend, modelId, type2),
  );
}

function register(hook) {
  hooks.push(hook);
}

register({
  before(instance2) {
    instance2.syncIndex = 0;
    if (!instance2.didInitialize) {
      instance2.syncTick = 1;
      instance2.syncHooks = [];
      instance2.didChangeStore = true;
      instance2.getSnapshot = () => {
        let didChange2 = false;
        for (let i2 = 0; i2 < instance2.syncHooks.length; i2 += 1) {
          const hook = instance2.syncHooks[i2];
          const value = hook.selector(
            hook.store.state,
            hook.a1,
            hook.a2,
            hook.a3,
          );
          if (hook.didChange || !Object.is(hook.value, value)) {
            didChange2 = true;
            hook.value = value;
            hook.didChange = false;
          }
        }
        if (didChange2) {
          instance2.syncTick += 1;
        }
        return instance2.syncTick;
      };
    }
  },
  after(instance2) {
    if (instance2.syncHooks.length > 0) {
      if (instance2.didChangeStore) {
        instance2.didChangeStore = false;
        instance2.subscribe = (onStoreChange) => {
          const stores = new Set();
          for (const hook of instance2.syncHooks) {
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
        instance2.subscribe,
        instance2.getSnapshot,
        instance2.getSnapshot,
      );
    }
  },
});

export const TooltipProvider$1 = TooltipProvider$2;

const HTML_TAG_RE = /<\/?(?:a|strong|em|code|br|p|span)(?:\s[^>]*)?\/?>/i;

const HTML_TAG_RE_GLOBAL =
  /<\/?(?:a|strong|em|code|br|p|span)(?:\s[^>]*)?\/?>/gi;

export function looksLikeHtml(s2) {
  return HTML_TAG_RE.test(s2);
}

function stripWhitelistedTags(html2) {
  return html2.replace(HTML_TAG_RE_GLOBAL, "");
}

export function stripErrorHtml(html2) {
  if (!html2) return "";
  if (!looksLikeHtml(html2)) return html2;
  if (typeof DOMParser === "undefined") return stripWhitelistedTags(html2);
  try {
    const doc2 = new DOMParser().parseFromString(html2, "text/html");
    return doc2.body.textContent ?? "";
  } catch {
    return stripWhitelistedTags(html2);
  }
}

const registry = new Set();

let lastZoom = 1;

export function broadcastZoom(zoom2) {
  lastZoom = zoom2;
  for (const el of registry) {
    el.style.setProperty("--canvas-zoom", String(zoom2));
  }
}

function registerZoomCounter(el) {
  registry.add(el);
  el.style.setProperty("--canvas-zoom", String(lastZoom));
  return () => {
    registry.delete(el);
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

export const renameRequestStore = createStore$1((set2) => ({
  pendingNodeId: null,
  requestRename: (nodeId) =>
    set2({
      pendingNodeId: nodeId,
    }),
  consume: (nodeId) =>
    set2((s2) =>
      s2.pendingNodeId === nodeId
        ? {
            pendingNodeId: null,
          }
        : s2,
    ),
}));

export function useRenameRequest(nodeId, beginEdit, enabled = true) {
  const pending2 = useStore$2(
    renameRequestStore,
    (s2) => nodeId != null && s2.pendingNodeId === nodeId,
  );
  reactExports.useEffect(() => {
    if (!pending2 || !nodeId || !enabled) return;
    beginEdit();
    renameRequestStore.getState().consume(nodeId);
  }, [pending2, nodeId, enabled, beginEdit]);
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

export function resolveNodeTagRingColor(color2, readThemeToken) {
  const token2 = NODE_TAG_THEME_SURFACE_TOKEN_BY_PRESET[color2.toUpperCase()];
  return (token2 ? readThemeToken(token2).trim() : "") || color2;
}

export function getNodeTagRingWidth(zoom2) {
  const safeZoom2 = zoom2 > 0 ? zoom2 : 1;
  const visualZoom = Math.max(safeZoom2, NODE_TAG_RING_ZOOM_FLOOR);
  const screenWidth = 4 - visualZoom;
  return Math.max(1, Math.min(28, screenWidth / safeZoom2));
}

export const CanvasModalGuardContext = reactExports.createContext(null);

export function useIsCanvasModalOpen() {
  const ctx = reactExports.useContext(CanvasModalGuardContext);
  return (ctx?.count ?? 0) > 0;
}

export function createNodeTagColorStore() {
  return createStore$1((set2, get3) => ({
    colors: new Map(),
    activeNodeIds: new Set(),
    setColor: (nodeId, color2, active2 = false) => {
      const current2 = get3();
      if (
        current2.colors.get(nodeId) === color2 &&
        current2.activeNodeIds.has(nodeId) === active2
      ) {
        return;
      }
      if (
        color2 === void 0 &&
        !current2.colors.has(nodeId) &&
        !current2.activeNodeIds.has(nodeId)
      ) {
        return;
      }
      const colors = new Map(current2.colors);
      const activeNodeIds = new Set(current2.activeNodeIds);
      if (color2 === void 0) colors.delete(nodeId);
      else colors.set(nodeId, color2);
      if (color2 !== void 0 && active2) activeNodeIds.add(nodeId);
      else activeNodeIds.delete(nodeId);
      set2({
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
  const store = createStore$1((set2, get3) => {
    const dropImmediate = (id2) => {
      const t2 = timers.get(id2);
      if (t2) {
        clearTimeout(t2);
        timers.delete(id2);
      }
      const current2 = get3().ids;
      if (!current2.has(id2)) return;
      const next2 = new Set(current2);
      next2.delete(id2);
      set2({
        ids: next2,
      });
    };
    return {
      ids: new Set(),
      add: (id2, ttlMs = DEFAULT_TTL_MS) => {
        const prev = timers.get(id2);
        if (prev) clearTimeout(prev);
        timers.set(
          id2,
          setTimeout(() => dropImmediate(id2), ttlMs),
        );
        const current2 = get3().ids;
        if (current2.has(id2)) return;
        const next2 = new Set(current2);
        next2.add(id2);
        set2({
          ids: next2,
        });
      },
      addMany: (ids2, ttlMs = DEFAULT_TTL_MS) => {
        if (ids2.length === 0) return;
        for (const id2 of ids2) {
          const prev = timers.get(id2);
          if (prev) clearTimeout(prev);
          timers.set(
            id2,
            setTimeout(() => dropImmediate(id2), ttlMs),
          );
        }
        const current2 = get3().ids;
        let changed = false;
        const next2 = new Set(current2);
        for (const id2 of ids2) {
          if (!next2.has(id2)) {
            next2.add(id2);
            changed = true;
          }
        }
        if (changed)
          set2({
            ids: next2,
          });
      },
      remove: dropImmediate,
      clear: () => {
        for (const t2 of timers.values()) clearTimeout(t2);
        timers.clear();
        if (get3().ids.size === 0) return;
        set2({
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
    const internal2 = reactFlow.getInternalNode(edge.target);
    const node2 = internal2 ?? reactFlow.getNode(edge.target);
    if (!node2) continue;
    const abs = internal2?.internals.positionAbsolute ?? node2.position;
    const h2 = node2.measured?.height ?? fallbackSize;
    const w3 = node2.measured?.width ?? fallbackSize;
    peers.push({
      x: abs.x,
      y: abs.y,
      height: h2,
      width: w3,
    });
  }
  let collision;
  if (peers.length === 0) {
    const occupied = [];
    for (const node2 of reactFlow.getNodes()) {
      if (node2.id === sourceNodeId) continue;
      const internal2 = reactFlow.getInternalNode(node2.id);
      const abs = internal2?.internals.positionAbsolute ?? node2.position;
      const w3 = node2.measured?.width ?? fallbackSize;
      const h2 = node2.measured?.height ?? fallbackSize;
      occupied.push({
        x: abs.x,
        y: abs.y,
        w: w3,
        h: h2,
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
  const getSnapshot2 = reactExports.useCallback(() => {
    const node2 = getNodeById(nodeId);
    return node2?.isEmpty === true && !node2.assetId;
  }, [getNodeById, nodeId]);
  return reactExports.useSyncExternalStore(
    subscribeGraphChange,
    getSnapshot2,
    getSnapshot2,
  );
}
