// node-resize-frame-inner.jsx
import { NodeResizer, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useRegisterZoomCounter } from "./create-recently-added-store.js";
import { useCanvasActions } from "../media-editing/use-canvas-actions.js";

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
  if (cursor.startsWith("nwse"))
    document.body.classList.add("canvas-resizing-nwse");
  else if (cursor.startsWith("nesw"))
    document.body.classList.add("canvas-resizing-nesw");
  else if (cursor.startsWith("ns"))
    document.body.classList.add("canvas-resizing-ns");
  else if (cursor.startsWith("ew"))
    document.body.classList.add("canvas-resizing-ew");
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
