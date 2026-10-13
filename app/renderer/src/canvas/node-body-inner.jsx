// node-body-inner.jsx
import { reactExports, useNodeId } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { NodeFrameStroke } from "./node-shell-inner.jsx";
import {
  useIsCanvasModalOpen,
  useNodeTagColorApi,
  useRegisterZoomCounter,
} from "../infra/create-recently-added-store.js";
import { MEDIA_NODE_RADIUS } from "../media-editing/package.jsx";
import { useNodeTagColors } from "./use-inline-rename.jsx";
function resolveNodeTagHighlight(selected, tags) {
  const activeTagColor = tags.find((tag) => tag.active)?.color;
  return {
    activeTagColor,
    outlineColor: selected
      ? "var(--canvas-node-border-selected)"
      : "transparent",
  };
}
const DRAG_THRESHOLD_PX = 4;
function preservePanelContentInset(padding) {
  if (typeof padding === "number") return padding + 1;
  const values = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index <= padding.length; index += 1) {
    if (padding[index] === "(") depth += 1;
    if (padding[index] === ")") depth -= 1;
    if (index === padding.length || (depth === 0 && /\s/.test(padding[index]))) {
      if (start < index) {
        const value = padding.slice(start, index);
        values.push(`calc(${value === "0" ? "0px" : value} + 1px)`);
      }
      start = index + 1;
    }
  }
  return values.join(" ");
}
function NodeBodyInner({
  width,
  height,
  selected,
  tagIds,
  children,
  variant = "media",
  className,
  borderRadius,
  onDoubleClick,
  dataActionUiId,
  panelPadding,
}) {
  const isPanel = variant === "panel";
  const isModalOpen = useIsCanvasModalOpen();
  const resolvedTags = useNodeTagColors(tagIds);
  const primaryTagColor = resolvedTags[0]?.color;
  const { activeTagColor } = resolveNodeTagHighlight(!!selected, resolvedTags);
  const publishedTagColor = activeTagColor ?? primaryTagColor;
  const nodeId = useNodeId();
  const tagColorStore = useNodeTagColorApi();
  reactExports.useEffect(() => {
    if (!nodeId) return;
    const { setColor } = tagColorStore.getState();
    setColor(nodeId, publishedTagColor, !!activeTagColor);
    return () => setColor(nodeId, void 0);
  }, [activeTagColor, nodeId, publishedTagColor, tagColorStore]);
  const bodyRef = reactExports.useRef(null);
  useRegisterZoomCounter(bodyRef);
  const downPosRef = reactExports.useRef(null);
  const draggedRef = reactExports.useRef(false);
  const handlePointerDown = reactExports.useCallback((pointerEvent) => {
    downPosRef.current = {
      x: pointerEvent.clientX,
      y: pointerEvent.clientY,
    };
    draggedRef.current = false;
  }, []);
  const handlePointerMove = reactExports.useCallback((pointerEvent) => {
    const start = downPosRef.current;
    if (!start || draggedRef.current) return;
    if (
      Math.hypot(pointerEvent.clientX - start.x, pointerEvent.clientY - start.y) >
      DRAG_THRESHOLD_PX
    ) {
      draggedRef.current = true;
    }
  }, []);
  const handleDoubleClick = reactExports.useCallback(
    (mouseEvent) => {
      if (isModalOpen) return;
      if (draggedRef.current) return;
      onDoubleClick?.(mouseEvent);
    },
    [isModalOpen, onDoubleClick],
  );
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: ReactFlow node body
    <div
      ref={bodyRef}
      className={`canvas-node-frame overflow-hidden rounded-lg ${className ?? ""}`}
      style={{
        width,
        ...(height
          ? {
              height,
            }
          : {}),
        position: "relative",
        background: isPanel ? "var(--canvas-node-bg, #fff)" : void 0,
        borderStyle: "none",
        borderWidth: 0,
        borderColor: "transparent",
        outlineStyle: "none",
        ...(isPanel
          ? {
              padding: preservePanelContentInset(panelPadding ?? "12px 16px"),
            }
          : {}),
        borderRadius: borderRadius ?? MEDIA_NODE_RADIUS,
      }}
      onPointerDown={onDoubleClick ? handlePointerDown : void 0}
      onPointerMove={onDoubleClick ? handlePointerMove : void 0}
      onDoubleClick={onDoubleClick ? handleDoubleClick : void 0}
      data-action-ui-id={dataActionUiId}
      data-node-frame-variant={variant}
      data-node-selected={selected ? "true" : "false"}
      data-tag-highlighted={activeTagColor ? "true" : void 0}
    >
      {children}
      <NodeFrameStroke />
    </div>
  );
}
export const NodeBody = reactExports.memo(NodeBodyInner);
