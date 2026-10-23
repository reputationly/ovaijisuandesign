// use-plugin-metadata-store.js
import {
  DEFAULT_MAX_RECOVERIES_PER_FRAME,
  DEFAULT_RECOVERY_FRAME_BUDGET_MS,
} from "../canvas/separator.jsx";
import { createHtmlFullscreenStore } from "./create-html-fullscreen-store.js";
import { CanvasNodeType } from "../canvas/canvas-geometry.js";
import reactExports from "react";
import { create, useStore } from "zustand";
import { createStore } from "zustand/vanilla";
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
export let snapshot = createInitialSnapshot();
export function recordCanvasRenderPolicy(policy) {
  snapshot = {
    ...snapshot,
    profile: policy.reason,
    contentVisibility: policy.contentVisibility,
    resumeRecovery: policy.recoverAfterResume,
    recoveryFrameBudgetMs: policy.recoveryFrameBudgetMs,
    recoveryMaxPerFrame: policy.recoveryMaxPerFrame,
  };
}
export function recordCanvasResumeEpoch(resumeEpoch) {
  snapshot = {
    ...snapshot,
    resumeEpoch: Math.max(snapshot.resumeEpoch, resumeEpoch),
  };
}
export function recordCanvasSurfaceRecovery(result) {
  snapshot = {
    ...snapshot,
    resumeEpoch: Math.max(snapshot.resumeEpoch, result.resumeEpoch),
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
export function HtmlFullscreenStoreProvider({ store, children }) {
  return reactExports.createElement(
    HtmlFullscreenStoreContext.Provider,
    {
      value: store,
    },
    children,
  );
}
export function useHtmlFullscreenApi() {
  return (
    reactExports.useContext(HtmlFullscreenStoreContext) ??
    defaultHtmlFullscreenStore
  );
}
export const useHtmlFullscreenStore = (selector) =>
  useStore(useHtmlFullscreenApi(), selector);
useHtmlFullscreenStore.getState = defaultHtmlFullscreenStore.getState;
useHtmlFullscreenStore.setState = defaultHtmlFullscreenStore.setState;
useHtmlFullscreenStore.subscribe = defaultHtmlFullscreenStore.subscribe;
export function useIsHtmlFullscreen(nodeId) {
  return useHtmlFullscreenStore(
    (state) => state.nodeId === nodeId && state.presentation === "fullscreen",
  );
}
export function useHtmlViewerPresentation(nodeId) {
  return useHtmlFullscreenStore((state) =>
    state.nodeId === nodeId ? state.presentation : null,
  );
}
export function useFullscreenContainerEl() {
  return useHtmlFullscreenStore((state) => state.containerEl);
}
function createHtmlViewerHandleStore() {
  return createStore((set) => ({
    byNode: new Map(),
    set: (nodeId, handle) =>
      set((state) => {
        const next = new Map(state.byNode);
        next.set(nodeId, handle);
        return {
          byNode: next,
        };
      }),
    clear: (nodeId) =>
      set((state) => {
        if (!state.byNode.has(nodeId)) return state;
        const next = new Map(state.byNode);
        next.delete(nodeId);
        return {
          byNode: next,
        };
      }),
  }));
}
const defaultHtmlViewerHandleStore = createHtmlViewerHandleStore();
export const HtmlViewerHandleStoreContext = reactExports.createContext(null);
export function useHtmlViewerHandleApi() {
  return (
    reactExports.useContext(HtmlViewerHandleStoreContext) ??
    defaultHtmlViewerHandleStore
  );
}
const useHtmlViewerHandleStore = (selector) =>
  useStore(useHtmlViewerHandleApi(), selector);
useHtmlViewerHandleStore.getState = defaultHtmlViewerHandleStore.getState;
useHtmlViewerHandleStore.setState = defaultHtmlViewerHandleStore.setState;
useHtmlViewerHandleStore.subscribe = defaultHtmlViewerHandleStore.subscribe;
export function useHtmlViewerHandle(nodeId) {
  return useHtmlViewerHandleStore((state) => state.byNode.get(nodeId));
}
export const usePluginMetadataStore = create((set, get) => ({
  plugins: new Map(),
  setPluginMetas: (entries) => {
    const next = new Map();
    for (const entry of entries) {
      if (!entry?.id) continue;
      next.set(entry.id, {
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
    set({
      plugins: next,
    });
  },
  get: (id) => get().plugins.get(id),
  clear: () =>
    set({
      plugins: new Map(),
    }),
}));
export function usePluginMeta(pluginId) {
  return usePluginMetadataStore((state) =>
    pluginId ? state.plugins.get(pluginId) : void 0,
  );
}
export function setPluginMetas(entries) {
  usePluginMetadataStore.getState().setPluginMetas(entries);
}
export function getPluginMeta(id) {
  return usePluginMetadataStore.getState().get(id);
}
function createPluginRunStateStore() {
  return createStore((set) => ({
    byNode: new Map(),
    set: (nodeId, info) =>
      set((state) => {
        const next = new Map(state.byNode);
        next.set(nodeId, info);
        return {
          byNode: next,
        };
      }),
    clear: (nodeId) =>
      set((state) => {
        if (!state.byNode.has(nodeId)) return state;
        const next = new Map(state.byNode);
        next.delete(nodeId);
        return {
          byNode: next,
        };
      }),
  }));
}
const defaultPluginRunStateStore = createPluginRunStateStore();
export const PluginRunStateStoreContext = reactExports.createContext(null);
export function usePluginRunStateApi() {
  return (
    reactExports.useContext(PluginRunStateStoreContext) ??
    defaultPluginRunStateStore
  );
}
const usePluginRunStateStore = (selector) =>
  useStore(usePluginRunStateApi(), selector);
usePluginRunStateStore.getState = defaultPluginRunStateStore.getState;
usePluginRunStateStore.setState = defaultPluginRunStateStore.setState;
usePluginRunStateStore.subscribe = defaultPluginRunStateStore.subscribe;
export function usePluginRunInfo(nodeId) {
  return usePluginRunStateStore((state) => state.byNode.get(nodeId));
}
const MAX_PATH_VERSION_ENTRIES = 1e3;
const fileVersionStore = createStore((set) => ({
  globalVersion: 0,
  pathVersions: new Map(),
  bump: (paths) =>
    set((state) => {
      if (!paths || paths.length === 0) {
        return {
          globalVersion: state.globalVersion + 1,
        };
      }
      const next = new Map(state.pathVersions);
      for (const path of paths) {
        if (!path) continue;
        const version = (next.get(path) ?? 0) + 1;
        next.delete(path);
        next.set(path, version);
      }
      while (next.size > MAX_PATH_VERSION_ENTRIES) {
        const oldest = next.keys().next().value;
        if (oldest === void 0) break;
        next.delete(oldest);
      }
      return {
        pathVersions: next,
      };
    }),
  resetForTest: () =>
    set({
      globalVersion: 0,
      pathVersions: new Map(),
    }),
}));
export function useFileVersion(path, scope = "all") {
  return useStore(
    fileVersionStore,
    (state) =>
      (scope === "all" ? state.globalVersion : 0) +
      (path ? (state.pathVersions.get(path) ?? 0) : 0),
  );
}
export function usePathFileVersion(path) {
  return useStore(fileVersionStore, (state) =>
    path ? (state.pathVersions.get(path) ?? 0) : 0,
  );
}
export function bumpFileVersion(paths) {
  fileVersionStore.getState().bump(typeof paths === "string" ? [paths] : paths);
}
export const CANVAS_FILE_VERSION_QUERY_KEY = "_canvas_v";
export function appendCanvasFileVersion(url, version) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${CANVAS_FILE_VERSION_QUERY_KEY}=${version}`;
}
export function useFileUrl(filePath, options) {
  const cacheBust = options?.cacheBust ?? true;
  const { resolveFileUrl } = useCanvasBridge();
  const version = useFileVersion(filePath, options?.versionScope ?? "all");
  return reactExports.useMemo(() => {
    if (!filePath || !resolveFileUrl) return void 0;
    try {
      const base = resolveFileUrl(filePath);
      if (!cacheBust) return base;
      return appendCanvasFileVersion(base, version);
    } catch {
      return void 0;
    }
  }, [filePath, resolveFileUrl, version, cacheBust]);
}
export const CANVAS_MIN_ZOOM = 0.1;
export const CANVAS_MAX_ZOOM = 4;
export const CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT = 20;
const DEFAULT_WORKSPACE_SCOPE = "__default__";
export const HEAVY_FILE_VIEWER_KINDS = new Set([
  "pdf",
  "code",
  "docx",
  "zip",
  "html",
]);
export function createState() {
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
export function workspaceScope(workspaceId) {
  return workspaceId?.trim() || DEFAULT_WORKSPACE_SCOPE;
}
export function getOrCreateState(workspaceId) {
  const scope = workspaceScope(workspaceId);
  let state = statesByWorkspace.get(scope);
  if (!state) {
    state = createState();
    statesByWorkspace.set(scope, state);
  }
  return state;
}
export function touch(state) {
  state.updatedAtMs = Date.now();
}
export const WorkspaceContentBudgetScopeContext =
  reactExports.createContext(void 0);
export function useWorkspaceContentBudgetScope() {
  return reactExports.useContext(WorkspaceContentBudgetScopeContext);
}
export function recordCanvasGraphMetrics(input, workspaceId) {
  const state = getOrCreateState(workspaceId);
  state.canvasNodeCount = input.nodes.length;
  state.canvasEdgeCount = input.edges.length;
  state.canvasFileNodeCount = input.nodes.filter(
    (node) => node.type === CanvasNodeType.File,
  ).length;
  touch(state);
}
export function resetWorkspaceCanvasGraphMetrics(workspaceId) {
  const state = getOrCreateState(workspaceId);
  state.canvasNodeCount = 0;
  state.canvasEdgeCount = 0;
  state.canvasFileNodeCount = 0;
  touch(state);
}
