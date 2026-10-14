// empty-viewport-toast.jsx
import { reactExports, useTranslation, X$7 as XIcon } from "../vendor.js";
import { Panel, useReactFlow, useStoreApi } from "../vendor-fork/xyflow/react/index.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button } from "./node-shell-inner.jsx";
import { CANVAS_TOOL_DOCK_SAFE_BOTTOM_PX } from "./cursor-icon.jsx";
import { syncStableZoomSignals } from "./separator.jsx";
import { useActiveMode } from "./use-active-mode.js";
import {
  useCanvasActive,
  useCanvasIsDragging,
} from "../media-editing/package.jsx";
import { ReferenceNavigationContext } from "../media-editing/get-reference-navigation-defaults.jsx";
const RECENTER_PADDING = 0.5;
const RECENTER_MAX_ZOOM = 0.2;
function isUsableNode(node) {
  if (node.hidden) return false;
  const width = node.measured?.width ?? node.width ?? 0;
  const height = node.measured?.height ?? node.height ?? 0;
  return width > 0 && height > 0;
}
function readBox(node) {
  if (node.hidden) return null;
  const width = node.measured?.width ?? node.width ?? 0;
  const height = node.measured?.height ?? node.height ?? 0;
  if (width === 0 || height === 0) return null;
  return {
    left: node.position.x,
    top: node.position.y,
    right: node.position.x + width,
    bottom: node.position.y + height,
  };
}
function findLastNodeId(state) {
  let last = null;
  for (const [id, node] of state.nodeLookup) {
    if (isUsableNode(node)) last = id;
  }
  return last;
}
function recenterToNodes(args) {
  const id = findLastNodeId(args.state);
  if (!id) return void 0;
  return args.fitView({
    nodes: [
      {
        id,
      },
    ],
    padding: RECENTER_PADDING,
    maxZoom: RECENTER_MAX_ZOOM,
    duration: args.duration ?? 500,
  });
}
function selectIsViewportEmpty(state) {
  if (state.nodeLookup.size === 0) return false;
  const [tx, ty, zoom] = state.transform;
  if (state.width === 0 || state.height === 0 || zoom === 0) return false;
  const vpLeft = -tx / zoom;
  const vpTop = -ty / zoom;
  const vpRight = (state.width - tx) / zoom;
  const vpBottom = (state.height - ty) / zoom;
  let consideredCount = 0;
  for (const node of state.nodeLookup.values()) {
    if (node.dragging) return false;
    const box = readBox(node);
    if (!box) continue;
    consideredCount += 1;
    if (
      box.right >= vpLeft &&
      box.left <= vpRight &&
      box.bottom >= vpTop &&
      box.top <= vpBottom
    ) {
      return false;
    }
  }
  return consideredCount > 0;
}
function CanvasBottomToast(props) {
  const { show } = props;
  const [retained, setRetained] = reactExports.useState(show);
  const lastVisibleProps = reactExports.useRef(props);
  if (show) lastVisibleProps.current = props;
  reactExports.useEffect(() => {
    if (show) {
      setRetained(true);
      return;
    }
    const timer = setTimeout(() => setRetained(false), 200);
    return () => clearTimeout(timer);
  }, [show]);
  if (!show && !retained) return null;
  const {
    message,
    action,
    dismiss,
    dataActionUiId,
  } = lastVisibleProps.current;
  return (
    <Panel
      position="bottom-center"
      className={show ? "!pointer-events-auto" : "!pointer-events-none"}
      style={{
        marginBottom: `var(--canvas-tool-dock-safe-bottom, ${CANVAS_TOOL_DOCK_SAFE_BOTTOM_PX}px)`,
      }}
      data-action-ui-id={dataActionUiId}
    >
      <div
        role="status"
        aria-hidden={!show}
        data-state={show ? "open" : "closed"}
        className="canvas-bottom-toast flex min-h-[calc(2lh+0.75rem+var(--divider-width)*2)] select-none items-center gap-3 rounded-lg border px-3 py-1.5 text-xs"
        style={{
          background: "var(--canvas-controls-bg)",
          borderColor: "var(--canvas-controls-border)",
          borderWidth: "var(--divider-width)",
          boxShadow: "var(--canvas-shadow-dropdown)",
          color: "var(--canvas-controls-text-muted)",
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onAnimationEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.animationName === "canvas-bottom-toast-exit" &&
            !show
          )
            setRetained(false);
        }}
      >
        <span className="min-w-0">{message}</span>
        <Button
          size="sm"
          variant={action.variant}
          disabled={!show}
          onClick={action.onClick}
          className="rounded-sm"
          data-action-ui-id={action.dataActionUiId}
        >
          {action.label}
        </Button>
        {dismiss && (
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={!show}
            aria-label={dismiss.label}
            data-action-ui-id={dismiss.dataActionUiId}
            onClick={dismiss.onClick}
          >
            <XIcon size={16} strokeWidth={1.5} />
          </Button>
        )}
      </div>
    </Panel>
  );
}
export function EmptyViewportToast({ duration = 500, quietDelay = 1e3 }) {
  const { t: translate } = useTranslation();
  const referenceNavigation = reactExports.useContext(
    ReferenceNavigationContext,
  );
  const { fitView, getViewport } = useReactFlow();
  const storeApi = useStoreApi();
  const active = useCanvasActive();
  const isDragging = useCanvasIsDragging();
  const { isAnyActive } = useActiveMode();
  const [shouldShow, setShouldShow] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!active || isAnyActive || isDragging) {
      setShouldShow(false);
      return;
    }
    let rafId = 0;
    let pendingTimer = null;
    let prevTransform = storeApi.getState().transform;
    const cancelTimer = () => {
      if (pendingTimer !== null) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    };
    const check = () => {
      rafId = 0;
      const state = storeApi.getState();
      const next = state.transform;
      const transformChanged =
        next[0] !== prevTransform[0] ||
        next[1] !== prevTransform[1] ||
        next[2] !== prevTransform[2];
      prevTransform = next;
      const empty = selectIsViewportEmpty(state);
      if (!empty) {
        cancelTimer();
        setShouldShow(false);
        return;
      }
      if (transformChanged) {
        cancelTimer();
        setShouldShow(false);
        pendingTimer = setTimeout(() => setShouldShow(true), quietDelay);
        return;
      }
      if (pendingTimer === null) {
        pendingTimer = setTimeout(() => setShouldShow(true), quietDelay);
      }
    };
    check();
    const unsubscribe = storeApi.subscribe(() => {
      if (rafId !== 0) return;
      rafId = requestAnimationFrame(check);
    });
    return () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      cancelTimer();
      unsubscribe();
    };
  }, [active, isAnyActive, isDragging, storeApi, quietDelay]);
  const handleBack = reactExports.useCallback(() => {
    const result = recenterToNodes({
      state: storeApi.getState(),
      fitView,
      duration,
    });
    const sync = () => syncStableZoomSignals(getViewport().zoom);
    if (result) void result.then(sync, sync);
  }, [fitView, getViewport, storeApi, duration]);
  const focused = Boolean(
    referenceNavigation?.record && !referenceNavigation.record.returning,
  );
  return (
    <CanvasBottomToast
      show={active && (focused || shouldShow)}
      message={translate(
        focused ? "canvas.referenceNavigation.focused" : "canvas.emptyViewport",
      )}
      dataActionUiId={
        focused ? "canvas.reference-focus-toast" : "canvas.empty-viewport-toast"
      }
      action={
        focused
          ? {
              label: translate("canvas.referenceNavigation.return"),
              variant: "secondary",
              onClick: () => void referenceNavigation?.returnToNode(),
              dataActionUiId: "canvas.reference-return",
            }
          : {
              label: translate("canvas.backToContent"),
              variant: "default",
              onClick: handleBack,
              dataActionUiId: "canvas.empty-viewport-back",
            }
      }
      dismiss={
        focused && referenceNavigation
          ? {
              label: translate("canvas.referenceNavigation.dismiss"),
              onClick: referenceNavigation.dismiss,
              dataActionUiId: "canvas.reference-return-dismiss",
            }
          : void 0
      }
    />
  );
}
