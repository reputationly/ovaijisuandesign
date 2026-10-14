// create-html-iframe-pool-store.jsx
import {
  classifyFileType,
  createStore$1 as createStore,
  PlaybackPlayIcon$1 as PlaybackPlayIcon,
  reactExports,
  useStore$2 as useStore,
  useTranslation,
} from "../vendor.js";
import { useNodeId } from "../vendor-fork/xyflow/react/index.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FileTypeIcon } from "./file-type-icon.jsx";
import { Button } from "../canvas/node-shell-inner.jsx";
import { ViewerLoading } from "../media-editing/input.jsx";
import { HtmlViewerInner } from "../media-editing/html-viewer-inner.jsx";
import { useHtmlViewerHandleApi } from "./use-plugin-metadata-store.js";
const DEFAULT_MAX_ACTIVE = 6;
const DEFAULT_HOLDER = "__default__";
function withHolder(holders, holderId) {
  if (holders.has(holderId)) return holders;
  const next = new Set(holders);
  next.add(holderId);
  return next;
}
function oldestNonStickyId(active) {
  let oldestId = null;
  let oldestTs = Number.POSITIVE_INFINITY;
  for (const [id, entry] of active) {
    if (entry.sticky) continue;
    if (entry.activatedAt < oldestTs) {
      oldestTs = entry.activatedAt;
      oldestId = id;
    }
  }
  return oldestId;
}
function oldestId(active) {
  let id = null;
  let ts = Number.POSITIVE_INFINITY;
  for (const [entryId, entry] of active) {
    if (entry.activatedAt < ts) {
      ts = entry.activatedAt;
      id = entryId;
    }
  }
  return id;
}
function createHtmlIframePoolStore(opts = {}) {
  const maxActive = opts.maxActive ?? DEFAULT_MAX_ACTIVE;
  return createStore((set, get) => ({
    active: new Map(),
    maxActive,
    requestAuto: (nodeId, holderId = DEFAULT_HOLDER) => {
      const cur = get().active;
      const existing = cur.get(nodeId);
      if (existing) {
        const next = new Map(cur);
        next.set(nodeId, {
          activatedAt: Date.now(),
          sticky: existing.sticky,
          holders: withHolder(existing.holders, holderId),
        });
        set({
          active: next,
        });
        return true;
      }
      if (cur.size < maxActive) {
        const next = new Map(cur);
        next.set(nodeId, {
          activatedAt: Date.now(),
          sticky: false,
          holders: new Set([holderId]),
        });
        set({
          active: next,
        });
        return true;
      }
      const evictId = oldestNonStickyId(cur);
      if (evictId == null) {
        return false;
      }
      const next = new Map(cur);
      next.delete(evictId);
      next.set(nodeId, {
        activatedAt: Date.now(),
        sticky: false,
        holders: new Set([holderId]),
      });
      set({
        active: next,
      });
      return true;
    },
    activateManual: (nodeId, holderId = DEFAULT_HOLDER) => {
      const cur = get().active;
      const existing = cur.get(nodeId);
      if (existing) {
        const next = new Map(cur);
        next.set(nodeId, {
          activatedAt: Date.now(),
          sticky: true,
          holders: withHolder(existing.holders, holderId),
        });
        set({
          active: next,
        });
        return;
      }
      const next = new Map(cur);
      if (cur.size >= maxActive) {
        const evictId = oldestNonStickyId(cur) ?? oldestId(cur);
        if (evictId != null) next.delete(evictId);
      }
      next.set(nodeId, {
        activatedAt: Date.now(),
        sticky: true,
        holders: new Set([holderId]),
      });
      set({
        active: next,
      });
    },
    release: (nodeId, holderId = DEFAULT_HOLDER) => {
      const cur = get().active;
      const existing = cur.get(nodeId);
      if (!existing?.holders.has(holderId)) return;
      const next = new Map(cur);
      if (existing.holders.size > 1) {
        const holders = new Set(existing.holders);
        holders.delete(holderId);
        next.set(nodeId, {
          ...existing,
          holders,
        });
      } else {
        next.delete(nodeId);
      }
      set({
        active: next,
      });
    },
  }));
}
const defaultHtmlIframePoolStore = createHtmlIframePoolStore();
const HtmlIframePoolStoreContext = reactExports.createContext(null);
function useHtmlIframePoolApi() {
  return (
    reactExports.useContext(HtmlIframePoolStoreContext) ??
    defaultHtmlIframePoolStore
  );
}
const useHtmlIframePoolStore = (selector) =>
  useStore(useHtmlIframePoolApi(), selector);
useHtmlIframePoolStore.getState = defaultHtmlIframePoolStore.getState;
useHtmlIframePoolStore.setState = defaultHtmlIframePoolStore.setState;
useHtmlIframePoolStore.subscribe = defaultHtmlIframePoolStore.subscribe;
function useIsHtmlIframeActive(nodeId) {
  return useHtmlIframePoolStore((state) => state.active.has(nodeId));
}
function HtmlViewerPlaceholder({ displayName, onActivate }) {
  const { t } = useTranslation();
  const label = displayName?.trim() || t("canvas.file.untitled");
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted px-6 text-center">
      <FileTypeIcon
        {...classifyFileType({
          filename: displayName,
        })}
        size={48}
        decorative={true}
      />
      <div
        className="max-w-full truncate text-xs text-muted-foreground"
        title={label}
      >
        {label}
      </div>
      <Button
        size="sm"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          onActivate();
        }}
        onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
        data-action-ui-id="canvas.file-node.html-activate"
      >
        <PlaybackPlayIcon />
        {t("canvas.file.html.activatePreview")}
      </Button>
    </div>
  );
}
let htmlViewerHolderCounter = 0;
export function HtmlViewer({
  filePath,
  interactive,
  displayName,
  eagerActivate,
  pluginOpenRequest,
  supportsCanvasPresentation,
  surface,
  requestExitFullscreen,
}) {
  const nodeId = useNodeId() ?? "";
  const [holderId] = reactExports.useState(
    () => `html-viewer-${++htmlViewerHolderCounter}`,
  );
  const poolApi = useHtmlIframePoolApi();
  const handleStoreApi = useHtmlViewerHandleApi();
  const isPoolActive = useIsHtmlIframeActive(nodeId);
  const [eager] = reactExports.useState(() => !!eagerActivate);
  reactExports.useEffect(() => {
    if (!nodeId) return;
    if (eager) poolApi.getState().activateManual(nodeId, holderId);
    else poolApi.getState().requestAuto(nodeId, holderId);
    return () => {
      poolApi.getState().release(nodeId, holderId);
    };
  }, [nodeId, poolApi, holderId, eager]);
  const handleManualActivate = reactExports.useCallback(() => {
    if (!nodeId) return;
    poolApi.getState().activateManual(nodeId, holderId);
  }, [nodeId, poolApi, holderId]);
  const [reloadKey, setReloadKey] = reactExports.useState(0);
  const reload = reactExports.useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);
  reactExports.useEffect(() => {
    if (!nodeId) return;
    handleStoreApi.getState().set(nodeId, {
      reload,
      activate: handleManualActivate,
    });
    return () => {
      handleStoreApi.getState().clear(nodeId);
    };
  }, [nodeId, reload, handleManualActivate, handleStoreApi]);
  if (!nodeId) return <ViewerLoading />;
  if (isPoolActive) {
    return (
      <HtmlViewerInner
        filePath={filePath}
        interactive={interactive}
        displayName={displayName}
        pluginOpenRequest={pluginOpenRequest}
        supportsCanvasPresentation={supportsCanvasPresentation}
        surface={surface}
        requestExitFullscreen={requestExitFullscreen}
        reloadKey={reloadKey}
      />
    );
  }
  return (
    <HtmlViewerPlaceholder
      displayName={displayName}
      onActivate={handleManualActivate}
    />
  );
}
