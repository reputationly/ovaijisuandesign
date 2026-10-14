// proximity-handle-inner.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { CompositedSvg } from "../media-editing/icon-compositing.js";
import { Handle, useStore, useStoreApi } from "../vendor-fork/xyflow/react/index.js";
import { Position } from "../vendor-fork/xyflow/system/index.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { createTracker } from "../generation/create-tracker.js";
import { trackers } from "../generation/missing-asset-card.jsx";
import { useRegisterZoomCounter } from "../infra/create-recently-added-store.js";
import { useCanvasActions } from "../media-editing/use-canvas-actions.js";
import {
  useCanvasIsBoxSelecting,
  useCanvasIsMultiSelect,
} from "../media-editing/package.jsx";
import { useCanvasNodeIsDragging } from "./fullscreen-icon.jsx";
function registerHandleProximity(element) {
  const root = element.closest(".react-flow");
  const node = element.closest(".react-flow__node");
  if (!root || !node) return null;
  const tracker = trackers.get(root) ?? createTracker(root);
  trackers.set(root, tracker);
  return tracker.register(element, node);
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
function ProximityHandleInner({ nodeId, handlePosition, selected }) {
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
    const element = entryRef.current;
    if (!element || forceHidden) return;
    const registration = registerHandleProximity(element);
    proximityRef.current = registration;
    return () => {
      registration?.dispose();
      proximityRef.current = null;
    };
  }, [forceHidden]);
  const handleMouseDown = reactExports.useCallback(
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
  const handleClick = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      if (forceHidden || proximityRef.current?.didDrag()) return;
      const element = entryRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
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
      data-selected={selected || void 0}
      data-hidden={forceHidden || void 0}
      data-side={side}
      className="node-handle-plus nodrag nopan"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <span className="node-handle-hit-area" aria-hidden="true" />
      <HandleIcon />
    </div>
  );
}
const ProximityHandle = reactExports.memo(ProximityHandleInner);
function NodeHandlesInner({
  nodeId,
  selected,
  showSourceAffordance = true,
  sourcePosition = Position.Right,
}) {
  const connectable = useStore((storeState) => storeState.nodesConnectable);
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
            selected={!!selected}
          />
        ) : null}
      </Handle>
    </>
  );
}
export const NodeHandles = reactExports.memo(NodeHandlesInner);
