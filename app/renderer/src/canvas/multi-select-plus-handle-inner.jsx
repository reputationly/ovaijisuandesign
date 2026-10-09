// multi-select-plus-handle-inner.jsx
import { jsxRuntimeExports, useTranslation, useReactFlow, reactExports, reactDomExports, CompositedSvg, CanvasNodeType, useStoreApi, useStore$3, Position, getBezierPath, findHitTarget, NodeToolbar$1 } from "../vendor.js";
import { isAssetBackedNode } from "./group-nodes-in-canvas.js";
import { useCanvasIsMultiSelect, useCanvasIsBoxSelecting, useCanvasIsDragging } from "../media-editing/parse-item.jsx";
import { parseNodeId } from "./resolve-derived-collision.js";
import { GROUP_COLOR_KEYS } from "./prune-persisted-node-data.js";
import { GROUP_COLOR_PRESETS } from "../media-editing/pdf-viewer.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CLICK_VS_DRAG_THRESHOLD_SQ_PX,
  resolveSelectionConnectionSources,
  targetsFullyConnectedFromAll,
} from "./empty-viewport-toast.jsx";
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
    <CompositedSvg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
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
          <path key={i2} d={d2} fill="none" stroke="var(--canvas-edge)" strokeWidth={1.5} />
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
          const beyondThreshold = dx * dx + dy * dy >= CLICK_VS_DRAG_THRESHOLD_SQ_PX;
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
        const fullyConnected = targetsFullyConnectedFromAll(sources, storeApi.getState().edges);
        const skip = new Set([...sourceSet, ...fullyConnected]);
        const sentinel = sources[0] ?? "";
        const target = findHitTarget(storeApi.getState().nodeLookup, dropFlow, sentinel, skip);
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
          aria-label={t2("canvas.connectSelectionToNewNode", "Connect selection to a new node")}
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
export const MultiSelectPlusHandle = reactExports.memo(MultiSelectPlusHandleInner);
const SWATCH_SIZE = 20;
const TRIGGER_SIZE = 18;
function ResetSwatch({ size: size2 = SWATCH_SIZE }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "block",
        width: size2,
        height: size2,
        borderRadius: "999px",
        background: "var(--canvas-group-swatch-reset-bg)",
        border: "1px solid var(--canvas-group-swatch-border)",
      }}
    />
  );
}
export function GroupColorPicker({ value, onChange, title }) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const triggerRef = reactExports.useRef(null);
  const panelRef = reactExports.useRef(null);
  const [anchor, setAnchor] = reactExports.useState(null);
  const recomputeAnchor = reactExports.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setAnchor({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  }, []);
  reactExports.useLayoutEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }
    recomputeAnchor();
    const onWin = () => recomputeAnchor();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open, recomputeAnchor]);
  reactExports.useEffect(() => {
    if (!open) return;
    const onPointerDown2 = (e2) => {
      const tgt = e2.target;
      if (!tgt) return;
      if (triggerRef.current?.contains(tgt)) return;
      if (panelRef.current?.contains(tgt)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown2, true);
    return () => document.removeEventListener("pointerdown", onPointerDown2, true);
  }, [open]);
  reactExports.useEffect(() => {
    if (!open) return;
    const onKey = (e2) => {
      if (e2.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const currentSwatch = value ? GROUP_COLOR_PRESETS[value]?.swatch : void 0;
  const triggerLabel = title ?? t2("canvas.groupBackground");
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={triggerLabel}
        aria-label={triggerLabel}
        onClick={() => setOpen((prev) => !prev)}
        className="canvas-toolbar-action"
        data-action-ui-id="canvas.group-background-button"
        data-active={open || void 0}
      >
        {currentSwatch ? (
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: TRIGGER_SIZE,
              height: TRIGGER_SIZE,
              borderRadius: "999px",
              background: currentSwatch,
              border: `1px solid ${currentSwatch}`,
            }}
          />
        ) : (
          <ResetSwatch size={TRIGGER_SIZE} />
        )}
        <span className="canvas-toolbar-label whitespace-nowrap">{triggerLabel}</span>
      </button>
      {open &&
        anchor &&
        reactDomExports.createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label={t2("canvas.groupBackground")}
            onContextMenu={(e2) => e2.preventDefault()}
            className="canvas-toolbar-menu flex h-9 items-center gap-[6px] px-2"
            style={{
              position: "fixed",
              top: anchor.top,
              left: anchor.left,
              transform: "translateX(-50%)",
              zIndex: 1e3,
            }}
          >
            <SwatchButton
              selected={value === void 0}
              onClick={() => {
                onChange(void 0);
                setOpen(false);
              }}
              label={t2("canvas.groupColor.reset")}
              dataActionUiId="canvas.group-background-reset"
              selectionColor="var(--canvas-controls-text)"
            >
              <ResetSwatch size={SWATCH_SIZE} />
            </SwatchButton>
            {GROUP_COLOR_KEYS.map((key2) => {
              const preset2 = GROUP_COLOR_PRESETS[key2];
              return (
                <SwatchButton
                  key={key2}
                  selected={value === key2}
                  onClick={() => {
                    onChange(key2);
                    setOpen(false);
                  }}
                  label={t2(`canvas.groupColor.${key2}`, {
                    defaultValue: key2,
                  })}
                  dataActionUiId={`canvas.group-background-${key2}`}
                  selectionColor={preset2.swatch}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "block",
                      width: SWATCH_SIZE,
                      height: SWATCH_SIZE,
                      borderRadius: "999px",
                      background: preset2.swatch,
                      border: `1px solid ${preset2.swatch}`,
                    }}
                  />
                </SwatchButton>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
function SwatchButton({
  selected: selected2,
  onClick,
  label,
  dataActionUiId,
  selectionColor,
  children: children2,
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={selected2}
      onClick={onClick}
      className="relative inline-flex items-center justify-center rounded-full transition-transform hover:scale-110"
      style={{
        width: SWATCH_SIZE,
        height: SWATCH_SIZE,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        outline: selected2 ? `1.5px solid ${selectionColor}` : "none",
        outlineOffset: selected2 ? "1.5px" : void 0,
      }}
      data-action-ui-id={dataActionUiId}
    >
      {children2}
    </button>
  );
}
function getFilename(path2) {
  return path2.split("/").pop() ?? path2;
}
function readStringField(source, key2) {
  const value = source?.[key2];
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
export function selectionToolbarAttachmentsEqual(a2, b3) {
  if (a2 === b3) return true;
  if (a2.length !== b3.length) return false;
  for (let i2 = 0; i2 < a2.length; i2++) {
    if (
      a2[i2].path !== b3[i2].path ||
      a2[i2].nodeId !== b3[i2].nodeId ||
      a2[i2].filename !== b3[i2].filename
    ) {
      return false;
    }
  }
  return true;
}
export function collectSelectionToolbarChatAttachments(allNodes, selectedIds, assets) {
  const nodeById = Array.isArray(allNodes)
    ? new Map(allNodes.map((node2) => [node2.id, node2]))
    : allNodes;
  let childrenByParent = null;
  const childrenOf2 = (parentId) => {
    if (!childrenByParent) {
      childrenByParent = new Map();
      for (const node2 of nodeById.values()) {
        if (!node2.parentId) continue;
        const siblings2 = childrenByParent.get(node2.parentId);
        if (siblings2) siblings2.push(node2);
        else childrenByParent.set(node2.parentId, [node2]);
      }
    }
    return childrenByParent.get(parentId) ?? [];
  };
  const seenPaths = new Set();
  const visited = new Set();
  const result = [];
  const pushPath2 = (nodeId, path2) => {
    if (seenPaths.has(path2)) return;
    seenPaths.add(path2);
    result.push({
      path: path2,
      filename: getFilename(path2),
      nodeId,
    });
  };
  const walk = (nodeId) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node2 = nodeById.get(nodeId);
    if (!node2) return;
    if (node2.type === CanvasNodeType.Group) {
      for (const child of childrenOf2(nodeId)) {
        walk(child.id);
      }
      return;
    }
    if (node2.type === CanvasNodeType.Table) {
      const tablePath = node2.data?.tablePath;
      if (typeof tablePath === "string" && tablePath.length > 0) {
        pushPath2(nodeId, tablePath);
      }
      return;
    }
    const nodeType = node2.type;
    if (typeof nodeType !== "string" || !isAssetBackedNode(nodeType)) return;
    const dataAssetId = readStringField(node2.data, "assetId");
    const dataPath = readStringField(node2.data, "path");
    const { assetId: parsedAssetId } = parseNodeId(nodeId);
    const meta2 =
      assets.get(nodeId) ??
      (node2.assetId ? assets.get(node2.assetId) : void 0) ??
      (dataAssetId ? assets.get(dataAssetId) : void 0) ??
      assets.get(parsedAssetId);
    const path2 = meta2?.path ?? dataPath;
    if (!path2) return;
    pushPath2(nodeId, path2);
  };
  for (const selectedId of selectedIds) {
    walk(selectedId);
  }
  return result;
}
