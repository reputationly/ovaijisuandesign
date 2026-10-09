// create-html-iframe-pool-store.jsx
import {
  classifyFileType,
  createStore$1 as createStore,
  PlaybackPlayIcon$1 as PlaybackPlayIcon,
  reactExports,
  useNodeId,
  useStore$2 as useStore,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FileTypeIcon } from "./file-type-icon.jsx";
import { Button } from "../canvas/node-shell-inner.jsx";
import { ViewerLoading } from "../media-editing/input.jsx";
import { HtmlViewerInner } from "../media-editing/html-viewer-inner.jsx";
import { useHtmlViewerHandleApi } from "./use-plugin-metadata-store.js";
const DEFAULT_MAX_ACTIVE = 6;
const DEFAULT_HOLDER = "__default__";
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
function createHtmlIframePoolStore(opts = {}) {
  const maxActive = opts.maxActive ?? DEFAULT_MAX_ACTIVE;
  return createStore((set2, get3) => ({
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
const defaultHtmlIframePoolStore = createHtmlIframePoolStore();
const HtmlIframePoolStoreContext = reactExports.createContext(null);
function useHtmlIframePoolApi() {
  return (
    reactExports.useContext(HtmlIframePoolStoreContext) ??
    defaultHtmlIframePoolStore
  );
}
const useHtmlIframePoolStore = (selector2) =>
  useStore(useHtmlIframePoolApi(), selector2);
useHtmlIframePoolStore.getState = defaultHtmlIframePoolStore.getState;
useHtmlIframePoolStore.setState = defaultHtmlIframePoolStore.setState;
useHtmlIframePoolStore.subscribe = defaultHtmlIframePoolStore.subscribe;
function useIsHtmlIframeActive(nodeId) {
  return useHtmlIframePoolStore((s2) => s2.active.has(nodeId));
}
function HtmlViewerPlaceholder({ displayName: displayName2, onActivate }) {
  const { t: t2 } = useTranslation();
  const label = displayName2?.trim() || t2("canvas.file.untitled");
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted px-6 text-center">
      <FileTypeIcon
        {...classifyFileType({
          filename: displayName2,
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
        onClick={(e2) => {
          e2.stopPropagation();
          onActivate();
        }}
        onMouseDown={(e2) => e2.stopPropagation()}
        data-action-ui-id="canvas.file-node.html-activate"
      >
        <PlaybackPlayIcon />
        {t2("canvas.file.html.activatePreview")}
      </Button>
    </div>
  );
}
let htmlViewerHolderCounter = 0;
export function HtmlViewer({
  filePath,
  interactive,
  displayName: displayName2,
  eagerActivate,
  pluginOpenRequest,
  supportsCanvasPresentation,
  surface,
  requestExitFullscreen,
}) {
  const nodeId = useNodeId() ?? "";
  const [holderId2] = reactExports.useState(
    () => `html-viewer-${++htmlViewerHolderCounter}`,
  );
  const poolApi = useHtmlIframePoolApi();
  const handleStoreApi = useHtmlViewerHandleApi();
  const isPoolActive = useIsHtmlIframeActive(nodeId);
  const [eager] = reactExports.useState(() => !!eagerActivate);
  reactExports.useEffect(() => {
    if (!nodeId) return;
    if (eager) poolApi.getState().activateManual(nodeId, holderId2);
    else poolApi.getState().requestAuto(nodeId, holderId2);
    return () => {
      poolApi.getState().release(nodeId, holderId2);
    };
  }, [nodeId, poolApi, holderId2, eager]);
  const handleManualActivate = reactExports.useCallback(() => {
    if (!nodeId) return;
    poolApi.getState().activateManual(nodeId, holderId2);
  }, [nodeId, poolApi, holderId2]);
  const [reloadKey, setReloadKey] = reactExports.useState(0);
  const reload = reactExports.useCallback(() => {
    setReloadKey((key2) => key2 + 1);
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
        displayName={displayName2}
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
      displayName={displayName2}
      onActivate={handleManualActivate}
    />
  );
}
