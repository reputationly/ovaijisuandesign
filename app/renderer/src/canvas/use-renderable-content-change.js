// use-renderable-content-change.js
import { CanvasNodeType, reactExports } from "../vendor.js";

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
    (node2) =>
      node2.type !== void 0 && RENDERABLE_CANVAS_NODE_TYPES.has(node2.type),
  );
}

function notifyRenderableContentChange(state2, nextValue, callback) {
  if (state2.lastValue === nextValue) return false;
  state2.lastValue = nextValue;
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
