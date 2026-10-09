// empty-viewport-toast.jsx
import {
  Panel,
  reactExports,
  useReactFlow,
  useStoreApi,
  useTranslation,
  X$7,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button$2 } from "./node-shell-inner.jsx";
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

function isUsableNode(node2) {
  if (node2.hidden) return false;
  const w3 = node2.measured?.width ?? node2.width ?? 0;
  const h2 = node2.measured?.height ?? node2.height ?? 0;
  return w3 > 0 && h2 > 0;
}

function readBox(node2) {
  if (node2.hidden) return null;
  const w3 = node2.measured?.width ?? node2.width ?? 0;
  const h2 = node2.measured?.height ?? node2.height ?? 0;
  if (w3 === 0 || h2 === 0) return null;
  return {
    left: node2.position.x,
    top: node2.position.y,
    right: node2.position.x + w3,
    bottom: node2.position.y + h2,
  };
}

function findLastNodeId(state2) {
  let last2 = null;
  for (const [id2, node2] of state2.nodeLookup) {
    if (isUsableNode(node2)) last2 = id2;
  }
  return last2;
}

function recenterToNodes(args) {
  const id2 = findLastNodeId(args.state);
  if (!id2) return void 0;
  return args.fitView({
    nodes: [
      {
        id: id2,
      },
    ],
    padding: RECENTER_PADDING,
    maxZoom: RECENTER_MAX_ZOOM,
    duration: args.duration ?? 500,
  });
}

function selectIsViewportEmpty(s2) {
  if (s2.nodeLookup.size === 0) return false;
  const [tx, ty, zoom2] = s2.transform;
  if (s2.width === 0 || s2.height === 0 || zoom2 === 0) return false;
  const vpLeft = -tx / zoom2;
  const vpTop = -ty / zoom2;
  const vpRight = (s2.width - tx) / zoom2;
  const vpBottom = (s2.height - ty) / zoom2;
  let consideredCount = 0;
  for (const node2 of s2.nodeLookup.values()) {
    if (node2.dragging) return false;
    const box2 = readBox(node2);
    if (!box2) continue;
    consideredCount += 1;
    if (
      box2.right >= vpLeft &&
      box2.left <= vpRight &&
      box2.bottom >= vpTop &&
      box2.top <= vpBottom
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
    const timer2 = setTimeout(() => setRetained(false), 200);
    return () => clearTimeout(timer2);
  }, [show]);
  if (!show && !retained) return null;
  const {
    message: message2,
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
        <span className="min-w-0">{message2}</span>
        <Button$2
          size="sm"
          variant={action.variant}
          disabled={!show}
          onClick={action.onClick}
          className="rounded-sm"
          data-action-ui-id={action.dataActionUiId}
        >
          {action.label}
        </Button$2>
        {dismiss && (
          <Button$2
            size="icon-sm"
            variant="ghost"
            disabled={!show}
            aria-label={dismiss.label}
            data-action-ui-id={dismiss.dataActionUiId}
            onClick={dismiss.onClick}
          >
            <X$7 size={16} strokeWidth={1.5} />
          </Button$2>
        )}
      </div>
    </Panel>
  );
}

export function EmptyViewportToast({ duration = 500, quietDelay = 1e3 }) {
  const { t: t2 } = useTranslation();
  const referenceNavigation = reactExports.useContext(
    ReferenceNavigationContext,
  );
  const { fitView, getViewport } = useReactFlow();
  const storeApi = useStoreApi();
  const active2 = useCanvasActive();
  const isDragging = useCanvasIsDragging();
  const { isAnyActive } = useActiveMode();
  const [shouldShow, setShouldShow] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!active2 || isAnyActive || isDragging) {
      setShouldShow(false);
      return;
    }
    let rafId2 = 0;
    let pendingTimer = null;
    let prevTransform = storeApi.getState().transform;
    const cancelTimer = () => {
      if (pendingTimer !== null) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    };
    const check = () => {
      rafId2 = 0;
      const state2 = storeApi.getState();
      const next2 = state2.transform;
      const transformChanged =
        next2[0] !== prevTransform[0] ||
        next2[1] !== prevTransform[1] ||
        next2[2] !== prevTransform[2];
      prevTransform = next2;
      const empty2 = selectIsViewportEmpty(state2);
      if (!empty2) {
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
      if (rafId2 !== 0) return;
      rafId2 = requestAnimationFrame(check);
    });
    return () => {
      if (rafId2 !== 0) cancelAnimationFrame(rafId2);
      cancelTimer();
      unsubscribe();
    };
  }, [active2, isAnyActive, isDragging, storeApi, quietDelay]);
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
      show={active2 && (focused || shouldShow)}
      message={t2(
        focused ? "canvas.referenceNavigation.focused" : "canvas.emptyViewport",
      )}
      dataActionUiId={
        focused ? "canvas.reference-focus-toast" : "canvas.empty-viewport-toast"
      }
      action={
        focused
          ? {
              label: t2("canvas.referenceNavigation.return"),
              variant: "secondary",
              onClick: () => void referenceNavigation?.returnToNode(),
              dataActionUiId: "canvas.reference-return",
            }
          : {
              label: t2("canvas.backToContent"),
              variant: "default",
              onClick: handleBack,
              dataActionUiId: "canvas.empty-viewport-back",
            }
      }
      dismiss={
        focused && referenceNavigation
          ? {
              label: t2("canvas.referenceNavigation.dismiss"),
              onClick: referenceNavigation.dismiss,
              dataActionUiId: "canvas.reference-return-dismiss",
            }
          : void 0
      }
    />
  );
}
