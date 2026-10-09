// proximity-handle-inner.jsx
import {
  CompositedSvg,
  Handle,
  jsxRuntimeExports,
  Position,
  reactExports,
  useStore$3,
  useStoreApi,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { createTracker } from "../generation/create-tracker.js";
import { trackers$1 } from "../generation/missing-asset-card.jsx";
import { useRegisterZoomCounter } from "../infra/create-recently-added-store.js";
import { useCanvasActions } from "../media-editing/use-canvas-actions.js";
import {
  useCanvasIsBoxSelecting,
  useCanvasIsMultiSelect,
} from "../media-editing/package.jsx";
import { useCanvasNodeIsDragging } from "./fullscreen-icon.jsx";

function registerHandleProximity(element2) {
  const root2 = element2.closest(".react-flow");
  const node2 = element2.closest(".react-flow__node");
  if (!root2 || !node2) return null;
  const tracker2 = trackers$1.get(root2) ?? createTracker(root2);
  trackers$1.set(root2, tracker2);
  return tracker2.register(element2, node2);
}

const HANDLE_BASE = {
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  padding: 0,
  background: "transparent",
  border: "none",
  borderRadius: 0,
  overflow: "visible",
  zIndex: 20,
};

const HANDLE_TARGET = {
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  padding: 0,
  background: "transparent",
  border: "none",
  borderRadius: 0,
  overflow: "visible",
  zIndex: 20,
  pointerEvents: "none",
};

function HandleIcon() {
  return (
    <CompositedSvg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="node-handle-icon"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="8.25" />
      <path d="M9 5.5v7M5.5 9h7" strokeLinecap="round" />
    </CompositedSvg>
  );
}

function ProximityHandleInner({ nodeId, handlePosition, selected: selected2 }) {
  const isMultiSelect = useCanvasIsMultiSelect();
  const isDragging = useCanvasNodeIsDragging(nodeId);
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const { openAddNodeMenu } = useCanvasActions();
  const flowStore = useStoreApi();
  const forceHidden = isMultiSelect || isDragging || isBoxSelecting;
  const side = handlePosition === Position.Left ? "left" : "right";
  const entryRef = reactExports.useRef(null);
  const proximityRef = reactExports.useRef(null);
  useRegisterZoomCounter(entryRef);
  reactExports.useEffect(() => {
    const element2 = entryRef.current;
    if (!element2 || forceHidden) return;
    const registration = registerHandleProximity(element2);
    proximityRef.current = registration;
    return () => {
      registration?.dispose();
      proximityRef.current = null;
    };
  }, [forceHidden]);
  const handleMouseDown2 = reactExports.useCallback(
    (event) => {
      const isConnectionSource = !!event.currentTarget.closest(
        ".react-flow__handle.source",
      );
      proximityRef.current?.beginGesture(
        event.nativeEvent,
        isConnectionSource ? flowStore.getState().connectionDragThreshold : 5,
      );
    },
    [flowStore],
  );
  const handleClick2 = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      if (forceHidden || proximityRef.current?.didDrag()) return;
      const element2 = entryRef.current;
      if (!element2) return;
      const rect = element2.getBoundingClientRect();
      openAddNodeMenu({
        sourceNodeId: nodeId,
        handlePosition,
        screenX: rect.left + rect.width / 2,
        screenY: rect.top + rect.height / 2,
      });
      proximityRef.current?.retainForMenu();
    },
    [forceHidden, nodeId, handlePosition, openAddNodeMenu],
  );
  return (
    // Pointer-only affordance over the existing ReactFlow Handle. The
    // passive proximity tracker does not add a separate DOM hit surface.
    // biome-ignore lint/a11y/noStaticElementInteractions: connection drag surface
    // biome-ignore lint/a11y/useKeyWithClickEvents: pointer affordance over ReactFlow Handle
    <div
      ref={entryRef}
      data-action-ui-id="canvas.node-handle-plus"
      data-selected={selected2 || void 0}
      data-hidden={forceHidden || void 0}
      data-side={side}
      className="node-handle-plus nodrag nopan"
      onMouseDown={handleMouseDown2}
      onClick={handleClick2}
    >
      <span className="node-handle-hit-area" aria-hidden="true" />
      <HandleIcon />
    </div>
  );
}

const ProximityHandle = reactExports.memo(ProximityHandleInner);

function NodeHandlesInner({
  nodeId,
  selected: selected2,
  showSourceAffordance = true,
  sourcePosition = Position.Right,
}) {
  const connectable = useStore$3((s2) => s2.nodesConnectable);
  const targetPosition =
    sourcePosition === Position.Left ? Position.Right : Position.Left;
  if (!nodeId) {
    return (
      <Handle type="target" position={targetPosition} style={HANDLE_TARGET} />
    );
  }
  return (
    <>
      <Handle type="target" position={targetPosition} style={HANDLE_TARGET} />
      <Handle type="source" position={sourcePosition} style={HANDLE_BASE}>
        {connectable && showSourceAffordance ? (
          <ProximityHandle
            nodeId={nodeId}
            handlePosition={sourcePosition}
            selected={!!selected2}
          />
        ) : null}
      </Handle>
    </>
  );
}

export const NodeHandles = reactExports.memo(NodeHandlesInner);
