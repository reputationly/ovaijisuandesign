// relight-popover.jsx
import {
  NodeToolbar$1,
  Position,
  reactExports,
  useNodeId,
  useStore$3,
  useTranslation,
  X$7,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { RelightEditor } from "./relight-editor.jsx";
import {
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
} from "./package.jsx";
import { NODE_POPOVER_SAFE_GAP } from "./use-warn-missing-asset-meta.jsx";

const RELIGHT_POPOVER_WIDTH = 658;

const RELIGHT_POPOVER_MAX_HEIGHT = 536;

const RELIGHT_POPOVER_MIN_HEIGHT = 360;

const RELIGHT_POPOVER_VIEWPORT_MARGIN = 16;

export function RelightPopover({
  onClose,
  imageUrl,
  imagePath,
  imageWidth,
  imageHeight,
}) {
  const { t: t2 } = useTranslation();
  const nodeId = useNodeId() ?? "";
  const onCloseRef = reactExports.useRef(onClose);
  onCloseRef.current = onClose;
  const selected2 = useStore$3(
    reactExports.useCallback(
      (state2) => (nodeId ? !!state2.nodeLookup.get(nodeId)?.selected : true),
      [nodeId],
    ),
  );
  const sourceScreenBottom = useStore$3((state2) => {
    const sourceNode = nodeId ? state2.nodeLookup.get(nodeId) : void 0;
    const sourcePosition = sourceNode?.internals.positionAbsolute;
    const sourceHeight = sourceNode?.measured.height ?? sourceNode?.height ?? 0;
    if (!sourcePosition) return 0;
    const [, viewportY, zoom2] = state2.transform;
    return viewportY + (sourcePosition.y + sourceHeight) * zoom2;
  });
  const isDragging = useCanvasIsDragging();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  reactExports.useEffect(() => {
    if (!selected2) onCloseRef.current();
  }, [selected2]);
  const hidden = isDragging || isMultiSelect || isBoxSelecting;
  const availableHeight =
    window.innerHeight -
    sourceScreenBottom -
    NODE_POPOVER_SAFE_GAP -
    RELIGHT_POPOVER_VIEWPORT_MARGIN;
  const popoverHeight = Math.max(
    RELIGHT_POPOVER_MIN_HEIGHT,
    Math.min(RELIGHT_POPOVER_MAX_HEIGHT, availableHeight),
  );
  return (
    <NodeToolbar$1
      isVisible={true}
      position={Position.Bottom}
      offset={NODE_POPOVER_SAFE_GAP}
      align="center"
      style={{
        zIndex: 1100,
      }}
    >
      <div
        className="nodrag nopan nowheel relative flex max-w-[calc(100vw-4rem)] flex-col overflow-hidden rounded-lg bg-background shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
        style={{
          width: RELIGHT_POPOVER_WIDTH,
          height: popoverHeight,
          display: hidden ? "none" : void 0,
        }}
        data-action-ui-id="canvas.relight.popover"
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-md text-[var(--canvas-controls-text-muted)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"
          aria-label={t2("common.close", "Close")}
          data-action-ui-id="canvas.relight.close"
        >
          <X$7 size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <RelightEditor
          nodeId={nodeId}
          imageUrl={imageUrl}
          imagePath={imagePath}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          onClose={onClose}
        />
      </div>
    </NodeToolbar$1>
  );
}
