// use-renderable-content-change.js
import { CanvasNodeType } from "./canvas-geometry.js";
import reactExports from "react";

const RENDERABLE_CANVAS_NODE_TYPES = new Set([
  CanvasNodeType.Image,
  CanvasNodeType.Video,
  CanvasNodeType.Audio,
  CanvasNodeType.Text,
  CanvasNodeType.File,
  CanvasNodeType.Table,
]);

function hasRenderableCanvasContent(nodes) {
  return nodes.some(
    (node) =>
      node.type !== void 0 && RENDERABLE_CANVAS_NODE_TYPES.has(node.type),
  );
}

function notifyRenderableContentChange(state, nextValue, callback) {
  if (state.lastValue === nextValue) return false;
  state.lastValue = nextValue;
  callback?.(nextValue);
  return true;
}

export function useRenderableContentChange(nodes, callback) {
  const callbackRef = reactExports.useRef(callback);
  const notificationStateRef = reactExports.useRef({});
  const hasRenderableContent = hasRenderableCanvasContent(nodes);
  reactExports.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  reactExports.useEffect(() => {
    notifyRenderableContentChange(
      notificationStateRef.current,
      hasRenderableContent,
      callbackRef.current,
    );
  }, [hasRenderableContent]);
}
