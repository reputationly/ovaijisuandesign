// multi-select-plus-handle-inner.jsx
import {
  CompositedSvg,
  findHitTarget,
  getBezierPath,
  jsxRuntimeExports,
  NodeToolbar$1,
  Position,
  reactDomExports,
  reactExports,
  useReactFlow,
  useStore$3,
  useStoreApi,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
} from "../media-editing/package.jsx";
import { CLICK_VS_DRAG_THRESHOLD_SQ_PX } from "./click-vs-drag-threshold-sq-px.js";

function targetsFullyConnectedFromAll(sources, edges) {
  if (sources.length === 0) return new Set();
  const sourceSet = new Set(sources);
  const reach = new Map();
  for (const e2 of edges) {
    if (!sourceSet.has(e2.source)) continue;
    const bucket = reach.get(e2.target) ?? new Set();
    bucket.add(e2.source);
    reach.set(e2.target, bucket);
  }
  const fullyConnected = new Set();
  for (const [target, bucket] of reach) {
    if (bucket.size === sourceSet.size) fullyConnected.add(target);
  }
  return fullyConnected;
}

function resolveSelectionConnectionSources(nodes, selectedIds) {
  const nodesById = new Map(nodes.map((node2) => [node2.id, node2]));
  const childIdsByParent = new Map();
  for (const node2 of nodes) {
    if (!node2.parentId) continue;
    const childIds = childIdsByParent.get(node2.parentId) ?? [];
    childIds.push(node2.id);
    childIdsByParent.set(node2.parentId, childIds);
  }
  const sourceNodeIds = [];
  const seenSourceIds = new Set();
  for (const selectedId of selectedIds) {
    const selectedNode = nodesById.get(selectedId);
    const resolvedIds =
      selectedNode?.type === "group"
        ? (childIdsByParent.get(selectedId) ?? [])
        : [selectedId];
    for (const resolvedId of resolvedIds) {
      if (seenSourceIds.has(resolvedId)) continue;
      seenSourceIds.add(resolvedId);
      sourceNodeIds.push(resolvedId);
    }
  }
  return {
    sourceNodeIds,
    isSingleGroupSelection:
      selectedIds.length === 1 &&
      nodesById.get(selectedIds[0])?.type === "group",
  };
}

const ICON_SIZE = 24;

const ICON_BUTTON_STYLE = {
  width: ICON_SIZE,
  height: ICON_SIZE,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  background: "var(--canvas-handle-bg)",
  border: "none",
  padding: 0,
  borderRadius: "50%",
  color: "var(--canvas-handle)",
  // The toolbar is positioned in flow space and inherits the viewport
  // transform; keep our own pointer events on so click/drag still works.
  pointerEvents: "auto",
  // Reset any inherited line-height that would offset the SVG.
  lineHeight: 0,
};

function PlusIcon() {
  return (
    <CompositedSvg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="10"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M11 6.75v8.5M6.75 11h8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </CompositedSvg>
  );
}

function DragPreview({ cursorScreenX, cursorScreenY, sourceAnchors }) {
  const { flowToScreenPosition } = useReactFlow();
  useStore$3(
    (s2) => ({
      x: s2.transform[0],
      y: s2.transform[1],
      zoom: s2.transform[2],
    }),
    (a2, b3) => a2.x === b3.x && a2.y === b3.y && a2.zoom === b3.zoom,
  );
  const paths = [];
  for (const anchor of sourceAnchors) {
    const screen2 = flowToScreenPosition({
      x: anchor.flowX,
      y: anchor.flowY,
    });
    const [path2] = getBezierPath({
      sourceX: screen2.x,
      sourceY: screen2.y,
      sourcePosition: Position.Right,
      targetX: cursorScreenX,
      targetY: cursorScreenY,
      targetPosition: Position.Left,
    });
    paths.push(path2);
  }
  const preview = (
    <>
      <svg
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 49,
        }}
      >
        {paths.map((d2, i2) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: paths are positionally tied to sourceAnchors order
          <path
            key={i2}
            d={d2}
            fill="none"
            stroke="var(--canvas-edge)"
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: cursorScreenX,
          top: cursorScreenY,
          transform: "translate(-50%, -50%)",
          width: ICON_SIZE,
          height: ICON_SIZE,
          color: "var(--canvas-handle)",
          background: "var(--canvas-handle-bg)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 50,
          lineHeight: 0,
        }}
      >
        <PlusIcon />
      </div>
    </>
  );
  return typeof document === "undefined"
    ? preview
    : reactDomExports.createPortal(preview, document.body);
}

function MultiSelectPlusHandleInner({
  selectedIds,
  onOpenAddNodeMenu,
  onWireEdgesToTarget,
  hideAnchor = false,
}) {
  const { t: t2 } = useTranslation();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isDragging = useCanvasIsDragging();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const connectable = useStore$3((s2) => s2.nodesConnectable);
  const { sourceNodeIds, isSingleGroupSelection } = useStore$3(
    reactExports.useCallback(
      (s2) => resolveSelectionConnectionSources(s2.nodes, selectedIds),
      [selectedIds],
    ),
    (a2, b3) =>
      a2.isSingleGroupSelection === b3.isSingleGroupSelection &&
      a2.sourceNodeIds.length === b3.sourceNodeIds.length &&
      a2.sourceNodeIds.every((id2, index2) => id2 === b3.sourceNodeIds[index2]),
  );
  const buttonRef = reactExports.useRef(null);
  const [drag2, setDrag] = reactExports.useState(null);
  const sourceNodeIdsRef = reactExports.useRef(sourceNodeIds);
  sourceNodeIdsRef.current = sourceNodeIds;
  const cleanupRef = reactExports.useRef(null);
  const { screenToFlowPosition } = useReactFlow();
  const storeApi = useStoreApi();
  const visible =
    connectable &&
    sourceNodeIds.length > 0 &&
    (isMultiSelect || isSingleGroupSelection) &&
    !isDragging &&
    !isBoxSelecting;
  reactExports.useEffect(() => {
    if (!visible && cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
      setDrag(null);
    }
  }, [visible]);
  reactExports.useEffect(
    () => () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    },
    [],
  );
  const onPointerDown2 = reactExports.useCallback(
    (e2) => {
      if (e2.button !== 0) return;
      e2.stopPropagation();
      e2.preventDefault();
      const button = buttonRef.current;
      if (!button) return;
      const nodeLookup = storeApi.getState().nodeLookup;
      const sourceAnchors = [];
      for (const id2 of sourceNodeIdsRef.current) {
        const node2 = nodeLookup.get(id2);
        if (!node2) continue;
        const w3 = node2.measured?.width ?? node2.width ?? 0;
        const h2 = node2.measured?.height ?? node2.height ?? 0;
        if (!w3 || !h2) continue;
        sourceAnchors.push({
          flowX: node2.internals.positionAbsolute.x + w3,
          flowY: node2.internals.positionAbsolute.y + h2 / 2,
        });
      }
      const rect = button.getBoundingClientRect();
      const startScreenX = rect.left + rect.width / 2;
      const startScreenY = rect.top + rect.height / 2;
      setDrag({
        startScreenX,
        startScreenY,
        cursorScreenX: e2.clientX,
        cursorScreenY: e2.clientY,
        isDragging: false,
        sourceAnchors,
      });
      const onMove = (ev) => {
        setDrag((prev) => {
          if (!prev) return null;
          const dx = ev.clientX - prev.startScreenX;
          const dy = ev.clientY - prev.startScreenY;
          const beyondThreshold =
            dx * dx + dy * dy >= CLICK_VS_DRAG_THRESHOLD_SQ_PX;
          return {
            ...prev,
            cursorScreenX: ev.clientX,
            cursorScreenY: ev.clientY,
            isDragging: prev.isDragging || beyondThreshold,
          };
        });
      };
      const onUp = (ev) => {
        cleanup();
        const sources = sourceNodeIdsRef.current;
        const dx = ev.clientX - startScreenX;
        const dy = ev.clientY - startScreenY;
        const wasDrag = dx * dx + dy * dy >= CLICK_VS_DRAG_THRESHOLD_SQ_PX;
        setDrag(null);
        if (sources.length === 0) return;
        if (!wasDrag) {
          onOpenAddNodeMenu({
            sourceNodeIds: sources,
            screenX: startScreenX,
            screenY: startScreenY,
          });
          return;
        }
        const dropFlow = screenToFlowPosition({
          x: ev.clientX,
          y: ev.clientY,
        });
        const sourceSet = new Set(sources);
        const fullyConnected = targetsFullyConnectedFromAll(
          sources,
          storeApi.getState().edges,
        );
        const skip = new Set([...sourceSet, ...fullyConnected]);
        const sentinel = sources[0] ?? "";
        const target = findHitTarget(
          storeApi.getState().nodeLookup,
          dropFlow,
          sentinel,
          skip,
        );
        if (target) {
          onWireEdgesToTarget(sources, target);
          return;
        }
        onOpenAddNodeMenu({
          sourceNodeIds: sources,
          screenX: ev.clientX,
          screenY: ev.clientY,
          dropFlow,
        });
      };
      const onCancel = () => {
        cleanup();
        setDrag(null);
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        cleanupRef.current = null;
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      cleanupRef.current = cleanup;
    },
    [onOpenAddNodeMenu, onWireEdgesToTarget, screenToFlowPosition, storeApi],
  );
  if (!visible) return null;
  return (
    <>
      <NodeToolbar$1
        nodeId={selectedIds}
        isVisible={true}
        position={Position.Right}
        offset={12}
        align="center"
      >
        <button
          ref={buttonRef}
          type="button"
          data-action-ui-id="canvas.selection-connect-plus"
          aria-label={t2(
            "canvas.connectSelectionToNewNode",
            "Connect selection to a new node",
          )}
          style={{
            ...ICON_BUTTON_STYLE,
            // Hide the anchored "+" while dragging (DragPreview shows the
            // cursor-following clone) or while pinned (ConnectionLineOverlay
            // shows the released-position cap). Keep the element mounted so
            // NodeToolbar's transform stays alive — flipping back to visible
            // when the menu closes is instant.
            visibility: drag2?.isDragging || hideAnchor ? "hidden" : "visible",
          }}
          onPointerDown={onPointerDown2}
          onClick={(e2) => e2.stopPropagation()}
        >
          <PlusIcon />
        </button>
      </NodeToolbar$1>
      {drag2?.isDragging && (
        <DragPreview
          cursorScreenX={drag2.cursorScreenX}
          cursorScreenY={drag2.cursorScreenY}
          sourceAnchors={drag2.sourceAnchors}
        />
      )}
    </>
  );
}

export const MultiSelectPlusHandle = reactExports.memo(
  MultiSelectPlusHandleInner,
);
