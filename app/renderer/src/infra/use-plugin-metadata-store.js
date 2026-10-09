// use-plugin-metadata-store.js
import {
  DEFAULT_MAX_RECOVERIES_PER_FRAME,
  DEFAULT_RECOVERY_FRAME_BUDGET_MS,
} from "../canvas/separator.jsx";
import { createHtmlFullscreenStore } from "./create-html-fullscreen-store.js";
import {
  CanvasNodeType,
  create$2,
  createStore$1,
  reactExports,
  useStore$2,
} from "../vendor.js";
import { useCanvasBridge } from "../media-editing/package.jsx";

export const DEFAULT_CANVAS_RENDER_POLICY = Object.freeze({
  contentVisibility: "auto",
  recoverAfterResume: false,
  reason: "default",
  recoveryFrameBudgetMs: DEFAULT_RECOVERY_FRAME_BUDGET_MS,
  recoveryMaxPerFrame: DEFAULT_MAX_RECOVERIES_PER_FRAME,
});

function createInitialSnapshot() {
  return {
    profile: DEFAULT_CANVAS_RENDER_POLICY.reason,
    contentVisibility: DEFAULT_CANVAS_RENDER_POLICY.contentVisibility,
    resumeRecovery: DEFAULT_CANVAS_RENDER_POLICY.recoverAfterResume,
    recoveryFrameBudgetMs: DEFAULT_CANVAS_RENDER_POLICY.recoveryFrameBudgetMs,
    recoveryMaxPerFrame: DEFAULT_CANVAS_RENDER_POLICY.recoveryMaxPerFrame,
    resumeEpoch: 0,
  };
}

export let snapshot$3 = createInitialSnapshot();

export function recordCanvasRenderPolicy(policy) {
  snapshot$3 = {
    ...snapshot$3,
    profile: policy.reason,
    contentVisibility: policy.contentVisibility,
    resumeRecovery: policy.recoverAfterResume,
    recoveryFrameBudgetMs: policy.recoveryFrameBudgetMs,
    recoveryMaxPerFrame: policy.recoveryMaxPerFrame,
  };
}

export function recordCanvasResumeEpoch(resumeEpoch) {
  snapshot$3 = {
    ...snapshot$3,
    resumeEpoch: Math.max(snapshot$3.resumeEpoch, resumeEpoch),
  };
}

export function recordCanvasSurfaceRecovery(result) {
  snapshot$3 = {
    ...snapshot$3,
    resumeEpoch: Math.max(snapshot$3.resumeEpoch, result.resumeEpoch),
    lastRecovery: {
      ...result,
    },
  };
}

const DEFAULT_CONTEXT = {
  policy: DEFAULT_CANVAS_RENDER_POLICY,
  registerSurface: () => ({
    dispose: () => void 0,
    notifyEligibilityChanged: () => void 0,
  }),
};

export const CanvasRenderRuntimeContext =
  reactExports.createContext(DEFAULT_CONTEXT);

const defaultHtmlFullscreenStore = createHtmlFullscreenStore();

export const HtmlFullscreenStoreContext = reactExports.createContext(null);

export function HtmlFullscreenStoreProvider({ store, children: children2 }) {
  return reactExports.createElement(
    HtmlFullscreenStoreContext.Provider,
    {
      value: store,
    },
    children2,
  );
}

export function useHtmlFullscreenApi() {
  return (
    reactExports.useContext(HtmlFullscreenStoreContext) ??
    defaultHtmlFullscreenStore
  );
}

export const useHtmlFullscreenStore = (selector2) =>
  useStore$2(useHtmlFullscreenApi(), selector2);

useHtmlFullscreenStore.getState = defaultHtmlFullscreenStore.getState;

useHtmlFullscreenStore.setState = defaultHtmlFullscreenStore.setState;

useHtmlFullscreenStore.subscribe = defaultHtmlFullscreenStore.subscribe;

export function useIsHtmlFullscreen(nodeId) {
  return useHtmlFullscreenStore(
    (s2) => s2.nodeId === nodeId && s2.presentation === "fullscreen",
  );
}

export function useHtmlViewerPresentation(nodeId) {
  return useHtmlFullscreenStore((s2) =>
    s2.nodeId === nodeId ? s2.presentation : null,
  );
}

export function useFullscreenContainerEl() {
  return useHtmlFullscreenStore((s2) => s2.containerEl);
}

function createHtmlViewerHandleStore() {
  return createStore$1((set2) => ({
    byNode: new Map(),
    set: (nodeId, handle2) =>
      set2((state2) => {
        const next2 = new Map(state2.byNode);
        next2.set(nodeId, handle2);
        return {
          byNode: next2,
        };
      }),
    clear: (nodeId) =>
      set2((state2) => {
        if (!state2.byNode.has(nodeId)) return state2;
        const next2 = new Map(state2.byNode);
        next2.delete(nodeId);
        return {
          byNode: next2,
        };
      }),
  }));
}

const defaultHtmlViewerHandleStore = createHtmlViewerHandleStore();

const HtmlViewerHandleStoreContext = reactExports.createContext(null);

export function useHtmlViewerHandleApi() {
  return (
    reactExports.useContext(HtmlViewerHandleStoreContext) ??
    defaultHtmlViewerHandleStore
  );
}

const useHtmlViewerHandleStore = (selector2) =>
  useStore$2(useHtmlViewerHandleApi(), selector2);

useHtmlViewerHandleStore.getState = defaultHtmlViewerHandleStore.getState;

useHtmlViewerHandleStore.setState = defaultHtmlViewerHandleStore.setState;

useHtmlViewerHandleStore.subscribe = defaultHtmlViewerHandleStore.subscribe;

export function useHtmlViewerHandle(nodeId) {
  return useHtmlViewerHandleStore((s2) => s2.byNode.get(nodeId));
}

export const usePluginMetadataStore = create$2((set2, get3) => ({
  plugins: new Map(),
  setPluginMetas: (entries2) => {
    const next2 = new Map();
    for (const entry of entries2) {
      if (!entry?.id) continue;
      next2.set(entry.id, {
        id: entry.id,
        name: entry.name ?? {},
        description: entry.description ?? {},
        iconUrl: entry.iconUrl ?? {},
        ...(entry.version
          ? {
              version: entry.version,
            }
          : {}),
        ...(entry.source
          ? {
              source: entry.source,
            }
          : {}),
        ...(entry.displayMode
          ? {
              displayMode: entry.displayMode,
            }
          : {}),
        ...(entry.agent
          ? {
              agent: entry.agent,
            }
          : {}),
      });
    }
    set2({
      plugins: next2,
    });
  },
  get: (id2) => get3().plugins.get(id2),
  clear: () =>
    set2({
      plugins: new Map(),
    }),
}));

export function usePluginMeta(pluginId) {
  return usePluginMetadataStore((s2) =>
    pluginId ? s2.plugins.get(pluginId) : void 0,
  );
}

export function setPluginMetas(entries2) {
  usePluginMetadataStore.getState().setPluginMetas(entries2);
}

export function getPluginMeta(id2) {
  return usePluginMetadataStore.getState().get(id2);
}

function createPluginRunStateStore() {
  return createStore$1((set2) => ({
    byNode: new Map(),
    set: (nodeId, info2) =>
      set2((state2) => {
        const next2 = new Map(state2.byNode);
        next2.set(nodeId, info2);
        return {
          byNode: next2,
        };
      }),
    clear: (nodeId) =>
      set2((state2) => {
        if (!state2.byNode.has(nodeId)) return state2;
        const next2 = new Map(state2.byNode);
        next2.delete(nodeId);
        return {
          byNode: next2,
        };
      }),
  }));
}

const defaultPluginRunStateStore = createPluginRunStateStore();

const PluginRunStateStoreContext = reactExports.createContext(null);

export function usePluginRunStateApi() {
  return (
    reactExports.useContext(PluginRunStateStoreContext) ??
    defaultPluginRunStateStore
  );
}

const usePluginRunStateStore = (selector2) =>
  useStore$2(usePluginRunStateApi(), selector2);

usePluginRunStateStore.getState = defaultPluginRunStateStore.getState;

usePluginRunStateStore.setState = defaultPluginRunStateStore.setState;

usePluginRunStateStore.subscribe = defaultPluginRunStateStore.subscribe;

export function usePluginRunInfo(nodeId) {
  return usePluginRunStateStore((s2) => s2.byNode.get(nodeId));
}

const MAX_PATH_VERSION_ENTRIES = 1e3;

const fileVersionStore = createStore$1((set2) => ({
  globalVersion: 0,
  pathVersions: new Map(),
  bump: (paths) =>
    set2((state2) => {
      if (!paths || paths.length === 0) {
        return {
          globalVersion: state2.globalVersion + 1,
        };
      }
      const next2 = new Map(state2.pathVersions);
      for (const path2 of paths) {
        if (!path2) continue;
        const version2 = (next2.get(path2) ?? 0) + 1;
        next2.delete(path2);
        next2.set(path2, version2);
      }
      while (next2.size > MAX_PATH_VERSION_ENTRIES) {
        const oldest = next2.keys().next().value;
        if (oldest === void 0) break;
        next2.delete(oldest);
      }
      return {
        pathVersions: next2,
      };
    }),
  resetForTest: () =>
    set2({
      globalVersion: 0,
      pathVersions: new Map(),
    }),
}));

export function useFileVersion(path2, scope = "all") {
  return useStore$2(
    fileVersionStore,
    (s2) =>
      (scope === "all" ? s2.globalVersion : 0) +
      (path2 ? (s2.pathVersions.get(path2) ?? 0) : 0),
  );
}

export function usePathFileVersion(path2) {
  return useStore$2(fileVersionStore, (s2) =>
    path2 ? (s2.pathVersions.get(path2) ?? 0) : 0,
  );
}

export function bumpFileVersion(paths) {
  fileVersionStore.getState().bump(typeof paths === "string" ? [paths] : paths);
}

export const CANVAS_FILE_VERSION_QUERY_KEY = "_canvas_v";

export function appendCanvasFileVersion(url2, version2) {
  const separator = url2.includes("?") ? "&" : "?";
  return `${url2}${separator}${CANVAS_FILE_VERSION_QUERY_KEY}=${version2}`;
}

export function useFileUrl(filePath, options) {
  const cacheBust = options?.cacheBust ?? true;
  const { resolveFileUrl } = useCanvasBridge();
  const version2 = useFileVersion(filePath, options?.versionScope ?? "all");
  return reactExports.useMemo(() => {
    if (!filePath || !resolveFileUrl) return void 0;
    try {
      const base2 = resolveFileUrl(filePath);
      if (!cacheBust) return base2;
      return appendCanvasFileVersion(base2, version2);
    } catch {
      return void 0;
    }
  }, [filePath, resolveFileUrl, version2, cacheBust]);
}

export const CANVAS_MIN_ZOOM = 0.1;

export const CANVAS_MAX_ZOOM = 4;

export const CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT = 20;

const DEFAULT_WORKSPACE_SCOPE$1 = "__default__";

export const HEAVY_FILE_VIEWER_KINDS = new Set([
  "pdf",
  "code",
  "docx",
  "zip",
  "html",
]);

export function createState$1() {
  return {
    canvasNodeCount: 0,
    canvasEdgeCount: 0,
    canvasFileNodeCount: 0,
    fileViewers: new Map(),
    nextViewerRegistrationId: 1,
    updatedAtMs: Date.now(),
  };
}

export const statesByWorkspace = new Map();

export function workspaceScope$1(workspaceId2) {
  return workspaceId2?.trim() || DEFAULT_WORKSPACE_SCOPE$1;
}

export function getOrCreateState(workspaceId2) {
  const scope = workspaceScope$1(workspaceId2);
  let state2 = statesByWorkspace.get(scope);
  if (!state2) {
    state2 = createState$1();
    statesByWorkspace.set(scope, state2);
  }
  return state2;
}

export function touch(state2) {
  state2.updatedAtMs = Date.now();
}

export const WorkspaceContentBudgetScopeContext =
  reactExports.createContext(void 0);

export function useWorkspaceContentBudgetScope() {
  return reactExports.useContext(WorkspaceContentBudgetScopeContext);
}

export function recordCanvasGraphMetrics(input, workspaceId2) {
  const state2 = getOrCreateState(workspaceId2);
  state2.canvasNodeCount = input.nodes.length;
  state2.canvasEdgeCount = input.edges.length;
  state2.canvasFileNodeCount = input.nodes.filter(
    (node2) => node2.type === CanvasNodeType.File,
  ).length;
  touch(state2);
}

export function resetWorkspaceCanvasGraphMetrics(workspaceId2) {
  const state2 = getOrCreateState(workspaceId2);
  state2.canvasNodeCount = 0;
  state2.canvasEdgeCount = 0;
  state2.canvasFileNodeCount = 0;
  touch(state2);
}
