// create-html-iframe-pool-store.jsx
import {
  CanvasNodeType,
  reactExports,
  createStore$1,
  useStore$2,
  create$2,
  NodeResizer,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CanvasSurfaceRecoveryScheduler,
  DEFAULT_MAX_RECOVERIES_PER_FRAME,
  DEFAULT_RECOVERY_FRAME_BUDGET_MS,
} from "../canvas/canvas-surface-recovery-scheduler.jsx";
import { useRegisterZoomCounter } from "./create-recently-added-store.jsx";
import { useCanvasActions, useCanvasBridge } from "../media-editing/parse-item.jsx";
const DEFAULT_CANVAS_RENDER_POLICY = Object.freeze({
  contentVisibility: "auto",
  recoverAfterResume: false,
  reason: "default",
  recoveryFrameBudgetMs: DEFAULT_RECOVERY_FRAME_BUDGET_MS,
  recoveryMaxPerFrame: DEFAULT_MAX_RECOVERIES_PER_FRAME,
});
export function resolveCanvasRenderPolicy(platform2, override = {}) {
  const isMacX64Canary =
    platform2?.os === "darwin" &&
    platform2.arch === "x64" &&
    platform2.runningUnderARM64Translation === false;
  const contentVisibility = override.contentVisibility ?? (isMacX64Canary ? "visible" : "auto");
  const recoverAfterResume = override.recoverAfterResume ?? isMacX64Canary;
  const reason =
    override.contentVisibility === "visible"
      ? "runtime-forced-visible"
      : override.contentVisibility === "auto"
        ? "runtime-forced-auto"
        : isMacX64Canary
          ? "mac-x64-canary"
          : "default";
  if (
    contentVisibility === DEFAULT_CANVAS_RENDER_POLICY.contentVisibility &&
    recoverAfterResume === DEFAULT_CANVAS_RENDER_POLICY.recoverAfterResume &&
    reason === DEFAULT_CANVAS_RENDER_POLICY.reason
  ) {
    return DEFAULT_CANVAS_RENDER_POLICY;
  }
  return {
    ...DEFAULT_CANVAS_RENDER_POLICY,
    contentVisibility,
    recoverAfterResume,
    reason,
  };
}
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
let snapshot$3 = createInitialSnapshot();
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
function recordCanvasResumeEpoch(resumeEpoch) {
  snapshot$3 = {
    ...snapshot$3,
    resumeEpoch: Math.max(snapshot$3.resumeEpoch, resumeEpoch),
  };
}
function recordCanvasSurfaceRecovery(result) {
  snapshot$3 = {
    ...snapshot$3,
    resumeEpoch: Math.max(snapshot$3.resumeEpoch, result.resumeEpoch),
    lastRecovery: {
      ...result,
    },
  };
}
export function getCanvasRenderDiagnosticsSnapshot() {
  return {
    ...snapshot$3,
    ...(snapshot$3.lastRecovery
      ? {
          lastRecovery: {
            ...snapshot$3.lastRecovery,
          },
        }
      : {}),
  };
}
const DEFAULT_CONTEXT = {
  policy: DEFAULT_CANVAS_RENDER_POLICY,
  registerSurface: () => ({
    dispose: () => void 0,
    notifyEligibilityChanged: () => void 0,
  }),
};
export const CanvasRenderRuntimeContext = reactExports.createContext(DEFAULT_CONTEXT);
export function CanvasRenderPolicyProvider({
  policy = DEFAULT_CANVAS_RENDER_POLICY,
  resumeEpoch = 0,
  onRecovery,
  children: children2,
}) {
  const onRecoveryRef = reactExports.useRef(onRecovery);
  onRecoveryRef.current = onRecovery;
  const scheduler2 = reactExports.useMemo(
    () =>
      new CanvasSurfaceRecoveryScheduler({
        maxPerFrame: policy.recoveryMaxPerFrame,
        frameBudgetMs: policy.recoveryFrameBudgetMs,
        onComplete: (result) => {
          recordCanvasSurfaceRecovery(result);
          onRecoveryRef.current?.(result);
        },
      }),
    [policy.recoveryFrameBudgetMs, policy.recoveryMaxPerFrame],
  );
  reactExports.useEffect(() => {
    scheduler2.activate();
    return () => scheduler2.dispose();
  }, [scheduler2]);
  reactExports.useEffect(() => {
    recordCanvasRenderPolicy(policy);
  }, [policy]);
  reactExports.useEffect(() => {
    recordCanvasResumeEpoch(resumeEpoch);
    if (policy.recoverAfterResume) scheduler2.scheduleRecovery(resumeEpoch);
  }, [policy.recoverAfterResume, resumeEpoch, scheduler2]);
  const value = reactExports.useMemo(
    () => ({
      policy,
      registerSurface: (registration) => scheduler2.register(registration),
    }),
    [policy, scheduler2],
  );
  return (
    <CanvasRenderRuntimeContext.Provider value={value}>
      {children2}
    </CanvasRenderRuntimeContext.Provider>
  );
}
const RESIZE_BODY_CLASSES = [
  "canvas-resizing-nwse",
  "canvas-resizing-nesw",
  "canvas-resizing-ns",
  "canvas-resizing-ew",
];
function clearResizeBodyClass() {
  for (const cls of RESIZE_BODY_CLASSES) {
    document.body.classList.remove(cls);
  }
}
function applyResizeBodyClass(cursor) {
  clearResizeBodyClass();
  if (cursor.startsWith("nwse")) document.body.classList.add("canvas-resizing-nwse");
  else if (cursor.startsWith("nesw")) document.body.classList.add("canvas-resizing-nesw");
  else if (cursor.startsWith("ns")) document.body.classList.add("canvas-resizing-ns");
  else if (cursor.startsWith("ew")) document.body.classList.add("canvas-resizing-ew");
}
function NodeResizeFrameInner({
  nodeId,
  minWidth = 80,
  minHeight = 60,
  maxWidth = Number.MAX_VALUE,
  maxHeight = Number.MAX_VALUE,
  keepAspectRatio = false,
  onResize,
  onCommit,
}) {
  const { moveAndResizeNode } = useCanvasActions();
  const frameRef = reactExports.useRef(null);
  useRegisterZoomCounter(frameRef);
  const lastRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    return () => {
      clearResizeBodyClass();
    };
  }, []);
  const handleResizeStart = reactExports.useCallback((evt) => {
    const target = evt.sourceEvent?.target;
    if (!target) return;
    const cursor = getComputedStyle(target).cursor;
    if (cursor) applyResizeBodyClass(cursor);
  }, []);
  const handleResize = reactExports.useCallback(
    (_evt, params) => {
      lastRef.current = {
        x: params.x,
        y: params.y,
        width: params.width,
        height: params.height,
      };
      onResize?.(params.width, params.height);
    },
    [onResize],
  );
  const handleResizeEnd = reactExports.useCallback(
    (_evt, params) => {
      clearResizeBodyClass();
      const final = lastRef.current ?? params;
      lastRef.current = null;
      const commit = onCommit ?? moveAndResizeNode;
      commit(nodeId, final.x, final.y, final.width, final.height);
    },
    [nodeId, moveAndResizeNode, onCommit],
  );
  return (
    <div ref={frameRef} className="canvas-node-resize-frame contents">
      <NodeResizer
        autoScale={false}
        minWidth={minWidth}
        minHeight={minHeight}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
        keepAspectRatio={keepAspectRatio}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
      />
    </div>
  );
}
export const NodeResizeFrame = reactExports.memo(NodeResizeFrameInner);
function isSamePluginOpenRequest(left, right) {
  return (
    left === right ||
    (left !== null &&
      right !== null &&
      left.requestId === right.requestId &&
      left.command === right.command &&
      left.workflow === right.workflow &&
      left.workflowId === right.workflowId &&
      left.target === right.target)
  );
}
export function createHtmlFullscreenStore() {
  return createStore$1((set2) => ({
    nodeId: null,
    containerEl: null,
    containerElByNode: new Map(),
    pluginOpenRequest: null,
    presentation: null,
    returnPresentation: null,
    enter: (nodeId, request, presentation = "fullscreen") =>
      set2((state2) => {
        const nextRequest = request ?? null;
        if (
          state2.nodeId === nodeId &&
          isSamePluginOpenRequest(state2.pluginOpenRequest, nextRequest) &&
          state2.presentation === presentation
        ) {
          return state2;
        }
        const containerEl = state2.containerElByNode.get(nodeId) ?? null;
        return {
          nodeId,
          containerEl,
          pluginOpenRequest: nextRequest,
          presentation,
          returnPresentation: null,
        };
      }),
    setPresentation: (nodeId, presentation) =>
      set2((state2) => {
        if (state2.nodeId !== nodeId) return state2;
        return {
          presentation,
          returnPresentation:
            presentation === "fullscreen" && state2.presentation === "canvas" ? "canvas" : null,
        };
      }),
    leaveFullscreen: (nodeId) =>
      set2((state2) => {
        if (state2.nodeId !== nodeId || state2.presentation !== "fullscreen") return state2;
        if (state2.returnPresentation === "canvas") {
          return {
            presentation: "canvas",
            returnPresentation: null,
          };
        }
        return {
          nodeId: null,
          containerEl: null,
          pluginOpenRequest: null,
          presentation: null,
          returnPresentation: null,
        };
      }),
    exit: (nodeId) =>
      set2((state2) => {
        if (state2.nodeId !== nodeId) return state2;
        return {
          nodeId: null,
          containerEl: null,
          pluginOpenRequest: null,
          presentation: null,
          returnPresentation: null,
        };
      }),
    setContainerEl: (nodeId, el) =>
      set2((state2) => {
        const existing = state2.containerElByNode.get(nodeId);
        const isCurrent = state2.nodeId === nodeId;
        if (existing === el) {
          if (isCurrent && state2.containerEl !== el) {
            return {
              containerEl: el,
            };
          }
          return state2;
        }
        const nextRegistry = new Map(state2.containerElByNode);
        if (el) {
          nextRegistry.set(nodeId, el);
        } else {
          nextRegistry.delete(nodeId);
        }
        const patch2 = {
          containerElByNode: nextRegistry,
        };
        if (isCurrent) patch2.containerEl = el;
        return patch2;
      }),
  }));
}
const defaultHtmlFullscreenStore = createHtmlFullscreenStore();
const HtmlFullscreenStoreContext = reactExports.createContext(null);
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
  return reactExports.useContext(HtmlFullscreenStoreContext) ?? defaultHtmlFullscreenStore;
}
export function useOptionalHtmlFullscreenApi() {
  return reactExports.useContext(HtmlFullscreenStoreContext);
}
const useHtmlFullscreenStore = (selector2) => useStore$2(useHtmlFullscreenApi(), selector2);
useHtmlFullscreenStore.getState = defaultHtmlFullscreenStore.getState;
useHtmlFullscreenStore.setState = defaultHtmlFullscreenStore.setState;
useHtmlFullscreenStore.subscribe = defaultHtmlFullscreenStore.subscribe;
export function useIsHtmlFullscreen(nodeId) {
  return useHtmlFullscreenStore((s2) => s2.nodeId === nodeId && s2.presentation === "fullscreen");
}
export function useHtmlViewerPresentation(nodeId) {
  return useHtmlFullscreenStore((s2) => (s2.nodeId === nodeId ? s2.presentation : null));
}
export function usePluginOpenRequest(nodeId) {
  return useHtmlFullscreenStore((s2) => (s2.nodeId === nodeId ? s2.pluginOpenRequest : null));
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
  return reactExports.useContext(HtmlViewerHandleStoreContext) ?? defaultHtmlViewerHandleStore;
}
const useHtmlViewerHandleStore = (selector2) => useStore$2(useHtmlViewerHandleApi(), selector2);
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
  return usePluginMetadataStore((s2) => (pluginId ? s2.plugins.get(pluginId) : void 0));
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
  return reactExports.useContext(PluginRunStateStoreContext) ?? defaultPluginRunStateStore;
}
const usePluginRunStateStore = (selector2) => useStore$2(usePluginRunStateApi(), selector2);
usePluginRunStateStore.getState = defaultPluginRunStateStore.getState;
usePluginRunStateStore.setState = defaultPluginRunStateStore.setState;
usePluginRunStateStore.subscribe = defaultPluginRunStateStore.subscribe;
export function usePluginRunInfo(nodeId) {
  return usePluginRunStateStore((s2) => s2.byNode.get(nodeId));
}
const DEFAULT_MAX_ACTIVE = 6;
const DEFAULT_HOLDER = "__default__";
function createHtmlIframePoolStore(opts = {}) {
  const maxActive = opts.maxActive ?? DEFAULT_MAX_ACTIVE;
  return createStore$1((set2, get3) => ({
    active: new Map(),
    maxActive,
    requestAuto: (nodeId, holderId2 = DEFAULT_HOLDER) => {
      const cur = get3().active;
      const existing = cur.get(nodeId);
      if (existing) {
        const next22 = new Map(cur);
        next22.set(nodeId, {
          activatedAt: Date.now(),
          sticky: existing.sticky,
          holders: withHolder(existing.holders, holderId2),
        });
        set2({
          active: next22,
        });
        return true;
      }
      if (cur.size < maxActive) {
        const next22 = new Map(cur);
        next22.set(nodeId, {
          activatedAt: Date.now(),
          sticky: false,
          holders: new Set([holderId2]),
        });
        set2({
          active: next22,
        });
        return true;
      }
      const evictId = oldestNonStickyId(cur);
      if (evictId == null) {
        return false;
      }
      const next2 = new Map(cur);
      next2.delete(evictId);
      next2.set(nodeId, {
        activatedAt: Date.now(),
        sticky: false,
        holders: new Set([holderId2]),
      });
      set2({
        active: next2,
      });
      return true;
    },
    activateManual: (nodeId, holderId2 = DEFAULT_HOLDER) => {
      const cur = get3().active;
      const existing = cur.get(nodeId);
      if (existing) {
        const next22 = new Map(cur);
        next22.set(nodeId, {
          activatedAt: Date.now(),
          sticky: true,
          holders: withHolder(existing.holders, holderId2),
        });
        set2({
          active: next22,
        });
        return;
      }
      const next2 = new Map(cur);
      if (cur.size >= maxActive) {
        const evictId = oldestNonStickyId(cur) ?? oldestId(cur);
        if (evictId != null) next2.delete(evictId);
      }
      next2.set(nodeId, {
        activatedAt: Date.now(),
        sticky: true,
        holders: new Set([holderId2]),
      });
      set2({
        active: next2,
      });
    },
    release: (nodeId, holderId2 = DEFAULT_HOLDER) => {
      const cur = get3().active;
      const existing = cur.get(nodeId);
      if (!existing?.holders.has(holderId2)) return;
      const next2 = new Map(cur);
      if (existing.holders.size > 1) {
        const holders = new Set(existing.holders);
        holders.delete(holderId2);
        next2.set(nodeId, {
          ...existing,
          holders,
        });
      } else {
        next2.delete(nodeId);
      }
      set2({
        active: next2,
      });
    },
  }));
}
function withHolder(holders, holderId2) {
  if (holders.has(holderId2)) return holders;
  const next2 = new Set(holders);
  next2.add(holderId2);
  return next2;
}
function oldestNonStickyId(active2) {
  let oldestId2 = null;
  let oldestTs = Number.POSITIVE_INFINITY;
  for (const [id2, entry] of active2) {
    if (entry.sticky) continue;
    if (entry.activatedAt < oldestTs) {
      oldestTs = entry.activatedAt;
      oldestId2 = id2;
    }
  }
  return oldestId2;
}
function oldestId(active2) {
  let id2 = null;
  let ts2 = Number.POSITIVE_INFINITY;
  for (const [k2, entry] of active2) {
    if (entry.activatedAt < ts2) {
      ts2 = entry.activatedAt;
      id2 = k2;
    }
  }
  return id2;
}
const defaultHtmlIframePoolStore = createHtmlIframePoolStore();
const HtmlIframePoolStoreContext = reactExports.createContext(null);
export function useHtmlIframePoolApi() {
  return reactExports.useContext(HtmlIframePoolStoreContext) ?? defaultHtmlIframePoolStore;
}
const useHtmlIframePoolStore = (selector2) => useStore$2(useHtmlIframePoolApi(), selector2);
useHtmlIframePoolStore.getState = defaultHtmlIframePoolStore.getState;
useHtmlIframePoolStore.setState = defaultHtmlIframePoolStore.setState;
useHtmlIframePoolStore.subscribe = defaultHtmlIframePoolStore.subscribe;
export function useIsHtmlIframeActive(nodeId) {
  return useHtmlIframePoolStore((s2) => s2.active.has(nodeId));
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
      (scope === "all" ? s2.globalVersion : 0) + (path2 ? (s2.pathVersions.get(path2) ?? 0) : 0),
  );
}
export function usePathFileVersion(path2) {
  return useStore$2(fileVersionStore, (s2) => (path2 ? (s2.pathVersions.get(path2) ?? 0) : 0));
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
const CONTENT_BUDGET_CANVAS_NODE_WARN_COUNT = 200;
const CONTENT_BUDGET_MOUNTED_FILE_VIEWER_WARN_COUNT = 20;
const CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT = 20;
const CONTENT_BUDGET_PRESSURE_FILE_VIEWER_UNLOAD_MS = 5e3;
const DEFAULT_WORKSPACE_SCOPE$1 = "__default__";
const HEAVY_FILE_VIEWER_KINDS = new Set(["pdf", "code", "docx", "zip", "html"]);
function createState$1() {
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
function getOrCreateState(workspaceId2) {
  const scope = workspaceScope$1(workspaceId2);
  let state2 = statesByWorkspace.get(scope);
  if (!state2) {
    state2 = createState$1();
    statesByWorkspace.set(scope, state2);
  }
  return state2;
}
function getExistingStates() {
  return [...statesByWorkspace.values()];
}
function touch(state2) {
  state2.updatedAtMs = Date.now();
}
function incrementKindCount(byKind, kind) {
  byKind[kind] = (byKind[kind] ?? 0) + 1;
}
function buildWarnings(input) {
  const warnings = [];
  if (input.canvasNodeCount > CONTENT_BUDGET_CANVAS_NODE_WARN_COUNT) {
    warnings.push({
      code: "canvas_node_count_high",
      actual: input.canvasNodeCount,
      limit: CONTENT_BUDGET_CANVAS_NODE_WARN_COUNT,
    });
  }
  if (input.mountedFileViewerCount > CONTENT_BUDGET_MOUNTED_FILE_VIEWER_WARN_COUNT) {
    warnings.push({
      code: "mounted_file_viewer_count_high",
      actual: input.mountedFileViewerCount,
      limit: CONTENT_BUDGET_MOUNTED_FILE_VIEWER_WARN_COUNT,
    });
  }
  const attemptedHeavyFileViewerCount = input.heavyFileViewerCount + input.deniedHeavyViewerCount;
  if (attemptedHeavyFileViewerCount > CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT) {
    warnings.push({
      code: "heavy_file_viewer_count_high",
      actual: attemptedHeavyFileViewerCount,
      limit: CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT,
    });
  }
  return warnings;
}
function snapshotFromState(state2) {
  const byKind = {};
  const uniquePaths = new Set();
  let heavyMountedCount = 0;
  let deniedHeavyCount = 0;
  for (const viewer of state2.fileViewers.values()) {
    if (!viewer.admitted) {
      if (HEAVY_FILE_VIEWER_KINDS.has(viewer.kind)) deniedHeavyCount += 1;
      continue;
    }
    incrementKindCount(byKind, viewer.kind);
    uniquePaths.add(viewer.filePath);
    if (HEAVY_FILE_VIEWER_KINDS.has(viewer.kind)) heavyMountedCount += 1;
  }
  const mountedCount = [...state2.fileViewers.values()].filter((viewer) => viewer.admitted).length;
  const warnings = buildWarnings({
    canvasNodeCount: state2.canvasNodeCount,
    canvasFileNodeCount: state2.canvasFileNodeCount,
    mountedFileViewerCount: mountedCount,
    heavyFileViewerCount: heavyMountedCount,
    deniedHeavyViewerCount: deniedHeavyCount,
  });
  return {
    canvas: {
      nodeCount: state2.canvasNodeCount,
      edgeCount: state2.canvasEdgeCount,
      fileNodeCount: state2.canvasFileNodeCount,
    },
    fileViewers: {
      mountedCount,
      heavyMountedCount,
      deniedHeavyCount,
      uniquePathCount: uniquePaths.size,
      byKind,
    },
    warnings,
    overBudget: warnings.length > 0,
    updatedAtMs: state2.updatedAtMs,
  };
}
function emptySnapshot() {
  return snapshotFromState(createState$1());
}
function aggregateSnapshots(snapshots2) {
  if (snapshots2.length === 0) {
    return {
      ...emptySnapshot(),
      workspaces: {
        count: 0,
        overBudgetCount: 0,
      },
    };
  }
  const byKind = {};
  let nodeCount = 0;
  let edgeCount = 0;
  let fileNodeCount = 0;
  let mountedCount = 0;
  let heavyMountedCount = 0;
  let deniedHeavyCount = 0;
  let uniquePathCount = 0;
  let updatedAtMs = 0;
  let overBudgetCount = 0;
  for (const snapshot2 of snapshots2) {
    nodeCount += snapshot2.canvas.nodeCount;
    edgeCount += snapshot2.canvas.edgeCount;
    fileNodeCount += snapshot2.canvas.fileNodeCount;
    mountedCount += snapshot2.fileViewers.mountedCount;
    heavyMountedCount += snapshot2.fileViewers.heavyMountedCount;
    deniedHeavyCount += snapshot2.fileViewers.deniedHeavyCount;
    uniquePathCount += snapshot2.fileViewers.uniquePathCount;
    updatedAtMs = Math.max(updatedAtMs, snapshot2.updatedAtMs);
    if (snapshot2.overBudget) overBudgetCount += 1;
    for (const [kind, count2] of Object.entries(snapshot2.fileViewers.byKind)) {
      if (!count2) continue;
      const viewerKind = kind;
      byKind[viewerKind] = (byKind[viewerKind] ?? 0) + count2;
    }
  }
  const warnings = buildWarnings({
    canvasNodeCount: nodeCount,
    mountedFileViewerCount: mountedCount,
    heavyFileViewerCount: heavyMountedCount,
    deniedHeavyViewerCount: deniedHeavyCount,
  });
  return {
    canvas: {
      nodeCount,
      edgeCount,
      fileNodeCount,
    },
    fileViewers: {
      mountedCount,
      heavyMountedCount,
      deniedHeavyCount,
      uniquePathCount,
      byKind,
    },
    warnings,
    overBudget: warnings.length > 0 || overBudgetCount > 0,
    updatedAtMs,
    workspaces: {
      count: snapshots2.length,
      overBudgetCount,
    },
  };
}
export const WorkspaceContentBudgetScopeContext = reactExports.createContext(void 0);
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
function registerWorkspaceFileViewerWithAdmission(input) {
  const state2 = getOrCreateState(input.workspaceId);
  const admitted = isWorkspaceFileViewerAdmissionAvailable(input.kind, state2);
  const id2 = state2.nextViewerRegistrationId++;
  if (!admitted) {
    state2.fileViewers.set(id2, {
      kind: input.kind,
      filePath: input.filePath,
      admitted: false,
    });
    touch(state2);
    return {
      admitted: false,
      unregister: () => {
        if (!state2.fileViewers.delete(id2)) return;
        touch(state2);
      },
    };
  }
  state2.fileViewers.set(id2, {
    kind: input.kind,
    filePath: input.filePath,
    admitted: true,
  });
  touch(state2);
  return {
    admitted: true,
    unregister: () => {
      if (!state2.fileViewers.delete(id2)) return;
      touch(state2);
    },
  };
}
export function useWorkspaceFileViewerAdmission(input) {
  const admissionKey = workspaceFileViewerAdmissionKey(input);
  const [admission, setAdmission] = reactExports.useState(() =>
    defaultWorkspaceFileViewerAdmission(input, admissionKey),
  );
  reactExports.useLayoutEffect(() => {
    if (input.active === false || !input.filePath || input.kind === "none") {
      setAdmission({
        admissionKey,
        admitted: true,
        overLimit: false,
      });
      return;
    }
    const registration = registerWorkspaceFileViewerWithAdmission({
      kind: input.kind,
      filePath: input.filePath,
      workspaceId: input.workspaceId,
    });
    setAdmission({
      admissionKey,
      admitted: registration.admitted,
      overLimit: !registration.admitted,
    });
    return registration.unregister;
  }, [admissionKey, input.active, input.filePath, input.kind, input.workspaceId]);
  if (admission.admissionKey !== admissionKey) {
    return defaultWorkspaceFileViewerAdmission(input, admissionKey);
  }
  return {
    admitted: admission.admitted,
    overLimit: admission.overLimit,
  };
}
export function getWorkspaceContentBudgetSnapshot(workspaceId2) {
  if (workspaceId2 !== void 0) return snapshotFromState(getOrCreateState(workspaceId2));
  return aggregateSnapshots(getExistingStates().map(snapshotFromState));
}
function resolveWorkspaceFileViewerUnloadMs(requestedMs, workspaceId2) {
  if (!Number.isFinite(requestedMs) || requestedMs <= 0)
    return CONTENT_BUDGET_PRESSURE_FILE_VIEWER_UNLOAD_MS;
  const snapshot2 = getWorkspaceContentBudgetSnapshot(workspaceId2);
  if (!snapshot2.overBudget) return requestedMs;
  return Math.min(requestedMs, CONTENT_BUDGET_PRESSURE_FILE_VIEWER_UNLOAD_MS);
}
export function resetWorkspaceCanvasGraphMetrics(workspaceId2) {
  const state2 = getOrCreateState(workspaceId2);
  state2.canvasNodeCount = 0;
  state2.canvasEdgeCount = 0;
  state2.canvasFileNodeCount = 0;
  touch(state2);
}
function isWorkspaceFileViewerAdmissionAvailable(kind, state2) {
  if (!HEAVY_FILE_VIEWER_KINDS.has(kind)) return true;
  let heavyMountedCount = 0;
  for (const viewer of state2.fileViewers.values()) {
    if (!viewer.admitted) continue;
    if (HEAVY_FILE_VIEWER_KINDS.has(viewer.kind)) heavyMountedCount += 1;
  }
  return heavyMountedCount < CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT;
}
function workspaceFileViewerAdmissionKey(input) {
  return `${workspaceScope$1(input.workspaceId)}\0${input.kind}\0${input.filePath ?? ""}\0${input.active === false ? "idle" : "active"}`;
}
function defaultWorkspaceFileViewerAdmission(input, admissionKey) {
  const requiresAdmission =
    input.active !== false &&
    !!input.filePath &&
    input.kind !== "none" &&
    HEAVY_FILE_VIEWER_KINDS.has(input.kind);
  return {
    admissionKey,
    admitted: !requiresAdmission,
    overLimit: false,
  };
}
const DEFAULT_UNLOAD_MS = 15e3;
function isHostOffscreen(host) {
  const rect = host.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return true;
  return (
    rect.bottom <= 0 ||
    rect.right <= 0 ||
    rect.top >= window.innerHeight ||
    rect.left >= window.innerWidth
  );
}
export function useViewerActive(opts = {}) {
  const workspaceId2 = useWorkspaceContentBudgetScope();
  const unloadAfterMs = resolveWorkspaceFileViewerUnloadMs(
    opts.unloadAfterMs ?? DEFAULT_UNLOAD_MS,
    workspaceId2,
  );
  const [hostEl, setHostEl] = reactExports.useState(null);
  const [active2, setActive2] = reactExports.useState(true);
  reactExports.useEffect(() => {
    if (!hostEl) return;
    if (typeof IntersectionObserver === "undefined") return;
    let timer2 = null;
    let rafId2 = null;
    let firstCallback = true;
    const clearTimer2 = () => {
      if (timer2 != null) {
        clearTimeout(timer2);
        timer2 = null;
      }
    };
    const clearRaf = () => {
      if (rafId2 != null) {
        cancelAnimationFrame(rafId2);
        rafId2 = null;
      }
    };
    const observer2 = new IntersectionObserver((entries2) => {
      const visible = entries2[0]?.isIntersecting ?? false;
      if (visible) {
        clearTimer2();
        clearRaf();
        setActive2(true);
      } else if (firstCallback) {
        clearTimer2();
        clearRaf();
        rafId2 = requestAnimationFrame(() => {
          rafId2 = null;
          if (isHostOffscreen(hostEl)) setActive2(false);
        });
      } else {
        clearTimer2();
        timer2 = setTimeout(() => {
          setActive2(false);
          timer2 = null;
        }, unloadAfterMs);
      }
      firstCallback = false;
    });
    observer2.observe(hostEl);
    return () => {
      observer2.disconnect();
      clearTimer2();
      clearRaf();
    };
  }, [hostEl, unloadAfterMs]);
  return [setHostEl, active2];
}
