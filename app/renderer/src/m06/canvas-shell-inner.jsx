// canvas-shell-inner.jsx
import { jsxRuntimeExports, useReactFlow, reactExports, CanvasNodeType, useStoreApi, useStore$3, useConnection, ReactFlow$1, SelectionMode, ConnectionTargetMarker } from "../vendor.js";
import { BackgroundCanvas, CanvasMiniMap, getCanvasMinimapPositionStyle } from "../m15/canvas-mini-map.jsx";
import { commitStableZoomTier, commitStableZoomBucket, seedStableZoomTier, seedStableZoomBucket } from "../m15/canvas-surface-recovery-scheduler.jsx";
import { CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM } from "../m15/create-html-iframe-pool-store.jsx";
import { useIsCanvasModalOpen, broadcastZoom } from "../m15/create-recently-added-store.jsx";
import { computeClickPanViewport, EdgesCanvas, getMinimapViewportColor } from "../m15/edges-canvas.jsx";
import { DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT } from "../m15/handle-position-style.jsx";
import { useActiveMode, useAlignmentSnapPreferenceStore, isNodeHeaderHidden, NODE_HEADERS_HIDDEN_CLASS, PAN_OFF_DEBOUNCE_MS, ZOOM_COMMIT_DEBOUNCE_MS, PAN_ON_DRAG_WITH_LEFT, PAN_ON_DRAG, EMPTY_DELETE_KEY_CODE, DELETE_KEY_CODE, grabCanvasStyle, defaultCanvasStyle, NodeTagRingsCanvas, ConnectingDisabledMarker } from "../m15/node-tag-rings-canvas.jsx";
import { CanvasActiveProvider, CanvasInteractionProvider } from "../m15/parse-item.jsx";
import { useCanvasOverlayApi } from "../m15/use-file-bytes.js";
import { useSpacePan, useStableViewportOnContainerShift } from "../m15/use-image-mask-painter.js";
import { useMultiImageOverlayApi } from "../m15/use-multi-image-actions.js";
import { useEdgeCulling, useNodeAlignmentSnap, useMiddleButtonPanCursor } from "../m15/use-node-alignment-snap.js";
import { CanvasToolModeProvider } from "../m04/ready-sub-video-card.jsx";
import { CanvasModalGuardProvider } from "../m01/use-inline-rename.jsx";
import { CanvasRootElementProvider } from "../m03/comfy-ui-plugin-launcher.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { CanvasCropOverlay, CanvasEraseOverlay } from "./canvas-crop-overlay.jsx";
import { CanvasMoveObjectOverlay, CanvasOutpaintOverlay } from "./canvas-move-object-overlay.jsx";
import { CanvasRedrawOverlay } from "./canvas-redraw-overlay.jsx";
import { EdgeInteractionLayer, useRenderableContentChange } from "./edge-interaction-layer.jsx";
import {
  CANVAS_TOOL_DOCK_BOTTOM_PX,
  CANVAS_TOOL_DOCK_HEIGHT_PX,
  CANVAS_TOOL_DOCK_SAFE_BOTTOM_PX,
  CanvasE2EMarkers,
  EmptyCanvasHint,
  NodeAlignmentGuides,
  getCanvasToneBackground,
  getCanvasViewportControlsPositionStyle,
} from "./node-alignment-guides.jsx";
function CanvasModeLayers() {
  const mode2 = useActiveMode();
  return (
    <>
      {mode2.isCropping && <CanvasCropOverlay />}
      {mode2.isOutpainting && <CanvasOutpaintOverlay />}
      {mode2.isErasing && <CanvasEraseOverlay />}
      {mode2.isRedrawing && <CanvasRedrawOverlay />}
      {mode2.isMovingObject && <CanvasMoveObjectOverlay />}
    </>
  );
}
export const CANVAS_BACKGROUND_PATTERNS = ["dots", "grid", "none"];
export function getCanvasViewportStorage() {
  if (typeof window === "undefined") return void 0;
  try {
    return window.localStorage;
  } catch {
    return void 0;
  }
}
const CANVAS_CHROME_Z_INDEX = 10100;
const CANVAS_UTILITY_Z_INDEX = 20;
const CANVAS_UTILITY_CONTROLS_INSET = {
  bottom: 10,
  right: 12,
};
function isPaneClick(target) {
  return (
    !!target.closest(".react-flow__pane") &&
    !target.closest(".react-flow__node") &&
    !target.closest(".react-flow__nodesselection")
  );
}
function isEditableElement(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
function isCanvasChromeElement(target) {
  return target instanceof Element && target.closest('[data-canvas-chrome="true"]') !== null;
}
export function CanvasShell(props) {
  const {
    toolbar,
    viewportControls,
    utilityControls,
    toolbarPlacement: requestedToolbarPlacement,
    onRenderableContentChange,
    suppressSelectionChrome = false,
    ...rest
  } = props;
  const toolbarPlacement = requestedToolbarPlacement ?? DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT;
  const activeMode = useActiveMode();
  const toolMode = props.stickerMode ? "sticker" : props.handTool ? "hand" : "select";
  useRenderableContentChange(rest.nodes, onRenderableContentChange);
  const handleDoubleClick2 = reactExports.useCallback(
    (e2) => {
      if (!rest.onPaneDoubleClick) return;
      if (isPaneClick(e2.target)) {
        e2.preventDefault();
        window.getSelection()?.removeAllRanges();
        rest.onPaneDoubleClick(e2);
      }
    },
    [rest.onPaneDoubleClick],
  );
  const handleContextMenu = reactExports.useCallback(
    (e2) => {
      if (!rest.onPaneContextMenu) return;
      if (isPaneClick(e2.target)) {
        e2.preventDefault();
        rest.onPaneContextMenu(e2);
      }
    },
    [rest.onPaneContextMenu],
  );
  const handleMouseDownCapture = reactExports.useCallback((e2) => {
    if (isEditableElement(e2.target) || isCanvasChromeElement(e2.target)) return;
    e2.currentTarget.focus();
  }, []);
  const canvasOverlayStore = useCanvasOverlayApi();
  reactExports.useEffect(() => () => canvasOverlayStore.getState().reset(), [canvasOverlayStore]);
  const rootRef = reactExports.useRef(null);
  const [rootEl, setRootEl] = reactExports.useState(null);
  const onRootElChange = rest.onRootElChange;
  const assignRootRef = reactExports.useCallback((el) => {
    rootRef.current = el;
    setRootEl(el);
  }, []);
  reactExports.useEffect(() => {
    onRootElChange?.(rootRef.current);
    return () => onRootElChange?.(null);
  }, [onRootElChange]);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: canvas pane interaction handlers
    <div
      ref={assignRootRef}
      data-hilo-canvas-root="true"
      data-sticker-mode={props.stickerMode ? "true" : "false"}
      data-selection-chrome-suppressed={suppressSelectionChrome ? "true" : "false"}
      data-action-ui-id="canvas.pane"
      tabIndex={0}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        containerType: "inline-size",
        containerName: "canvas-shell",
        background: getCanvasToneBackground(props.canvasTone ?? "default"),
        "--canvas-tool-dock-bottom": `${CANVAS_TOOL_DOCK_BOTTOM_PX}px`,
        "--canvas-tool-dock-height": `${CANVAS_TOOL_DOCK_HEIGHT_PX}px`,
        "--canvas-tool-dock-safe-bottom": `${CANVAS_TOOL_DOCK_SAFE_BOTTOM_PX}px`,
      }}
      onMouseDownCapture={handleMouseDownCapture}
      onDoubleClick={handleDoubleClick2}
      onContextMenu={handleContextMenu}
      onDragEnter={rest.onCanvasDragEnter}
      onDragOver={rest.onCanvasDragOver}
      onDragLeave={rest.onCanvasDragLeave}
      onDrop={rest.onCanvasDrop}
    >
      <CanvasRootElementProvider value={rootEl}>
        {toolbar && !activeMode.isAnyActive && (
          <div
            data-canvas-chrome="true"
            style={{
              position: "absolute",
              left: "50%",
              bottom: CANVAS_TOOL_DOCK_BOTTOM_PX,
              transform: "translateX(-50%)",
              zIndex: CANVAS_CHROME_Z_INDEX,
              display: "flex",
              gap: 4,
            }}
          >
            {toolbar}
          </div>
        )}
        {viewportControls && (
          <div
            data-action-ui-id="canvas.viewport-controls"
            data-canvas-chrome="true"
            data-canvas-corner={toolbarPlacement}
            style={{
              position: "absolute",
              ...getCanvasViewportControlsPositionStyle(toolbarPlacement),
              zIndex: CANVAS_CHROME_Z_INDEX,
              display: "flex",
              gap: 4,
            }}
          >
            {viewportControls}
          </div>
        )}
        {utilityControls && (
          <div
            data-canvas-chrome="true"
            style={{
              position: "absolute",
              bottom: CANVAS_UTILITY_CONTROLS_INSET.bottom,
              right: CANVAS_UTILITY_CONTROLS_INSET.right,
              // Deliberately *below* CANVAS_CHROME_Z_INDEX: full-pane editor
              // surfaces (plugin editor, text fullscreen) portal into this
              // same root at the chrome layer and must cover this utility.
              zIndex: CANVAS_UTILITY_Z_INDEX,
              display: "flex",
              alignItems: "center",
              gap: 8,
              pointerEvents: "none",
            }}
          >
            {utilityControls}
          </div>
        )}
        <CanvasModalGuardProvider>
          <CanvasToolModeProvider value={toolMode}>
            <CanvasShellInner {...rest} toolbarPlacement={toolbarPlacement} />
          </CanvasToolModeProvider>
        </CanvasModalGuardProvider>
      </CanvasRootElementProvider>
    </div>
  );
}
function CanvasShellInner({
  nodes,
  edges,
  registry: registry2,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onConnectEnd,
  onNodeDrag,
  onNodeDragStop,
  onSelectionChange,
  onPaneClick,
  onNodeClick,
  onMinimapNodeSelect,
  onNodeContextMenu,
  onSelectionContextMenu,
  minimap = true,
  edgesVisible = true,
  background = "dots",
  toolbarPlacement = DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT,
  stickerMode = false,
  handTool = false,
  children: children2,
  active: active2 = true,
  layoutRelocationKey,
  onViewportChangeEnd,
}) {
  const registryVersion = registry2.getVersion();
  const [selectedCount, setSelectedCount] = reactExports.useState(0);
  const storeApi = useStoreApi();
  const activeMode = useActiveMode();
  const isModalOpen = useIsCanvasModalOpen();
  const showBackgroundGrid = useStore$3((s2) => s2.transform[2] > 0.5);
  const culledEdges = useEdgeCulling(edges, {
    active: active2,
  });
  const interactionsSuspended = activeMode.hasViewportLock || isModalOpen;
  const nodeInteractionsSuspended = interactionsSuspended || activeMode.isOutpainting;
  const isSpacePanning = useSpacePan(active2);
  const isHandPanning = handTool || isSpacePanning;
  const alignmentSnapEnabled = useAlignmentSnapPreferenceStore((state2) => state2.enabled);
  const alignmentSnap = useNodeAlignmentSnap(
    alignmentSnapEnabled && active2 && !nodeInteractionsSuspended && !isHandPanning && !stickerMode,
  );
  useMiddleButtonPanCursor(active2);
  const isAnyOverlayActive = activeMode.isAnyActive;
  const isConnecting = useConnection((c3) => c3.inProgress);
  const reactFlow = useReactFlow();
  const handleMinimapClick = reactExports.useCallback(
    (_event, position2) => {
      const { zoom: zoom2 } = reactFlow.getViewport();
      const { width, height } = storeApi.getState();
      const target = computeClickPanViewport(
        position2,
        {
          width,
          height,
        },
        zoom2,
      );
      void reactFlow.setViewport(target, {
        duration: 250,
        interpolate: "linear",
      });
    },
    [reactFlow, storeApi],
  );
  const existingEdgeKeys = reactExports.useMemo(() => {
    const set2 = new Set();
    for (const edge of edges) set2.add(`${edge.source}->${edge.target}`);
    return set2;
  }, [edges]);
  const isValidConnection = reactExports.useCallback(
    (conn) => {
      if (!conn.target || conn.source === conn.target) return false;
      if (existingEdgeKeys.has(`${conn.source}->${conn.target}`)) return false;
      const lookup = storeApi.getState().nodeLookup;
      if (lookup.get(conn.source)?.type === CanvasNodeType.Group) return false;
      if (lookup.get(conn.target)?.type === CanvasNodeType.Group) return false;
      return true;
    },
    [existingEdgeKeys, storeApi],
  );
  const nodeTypes2 = reactExports.useMemo(
    () => registry2.getNodeComponentMap(),
    [registry2, registryVersion],
  );
  const edgeTypes = reactExports.useMemo(
    () => registry2.getEdgeComponentMap(),
    [registry2, registryVersion],
  );
  const handleNodeDragStop = reactExports.useCallback(
    (_event, _node, draggedNodes) => {
      onNodeDragStop?.(
        draggedNodes.map((n2) => ({
          id: n2.id,
          position: n2.position,
        })),
      );
    },
    [onNodeDragStop],
  );
  const handleSelectionChange = reactExports.useCallback(
    ({ nodes: selectedNodes }) => {
      setSelectedCount(selectedNodes.length);
      onSelectionChange?.(selectedNodes.map((n2) => n2.id));
    },
    [onSelectionChange],
  );
  const multiImageOverlayStore = useMultiImageOverlayApi();
  const handlePaneClick = reactExports.useCallback(
    (event) => {
      activeMode.cancelDismissibleMode();
      multiImageOverlayStore.getState().closeAll();
      onPaneClick?.(event);
    },
    [activeMode, multiImageOverlayStore, onPaneClick],
  );
  const containerRef = reactExports.useRef(null);
  const syncNodeHeaderVisibility = reactExports.useCallback((zoom2) => {
    const container = containerRef.current;
    if (!container) return;
    const hidden = isNodeHeaderHidden(zoom2);
    if (container.classList.contains(NODE_HEADERS_HIDDEN_CLASS) === hidden) return;
    container.classList.toggle(NODE_HEADERS_HIDDEN_CLASS, hidden);
  }, []);
  const panningOffTimerRef = reactExports.useRef(null);
  const setPanning = reactExports.useCallback((active22) => {
    const el = containerRef.current;
    if (!el) return;
    if (active22) {
      if (panningOffTimerRef.current !== null) {
        clearTimeout(panningOffTimerRef.current);
        panningOffTimerRef.current = null;
      }
      el.classList.add("canvas-panning");
      return;
    }
    if (panningOffTimerRef.current !== null) clearTimeout(panningOffTimerRef.current);
    panningOffTimerRef.current = setTimeout(() => {
      containerRef.current?.classList.remove("canvas-panning");
      panningOffTimerRef.current = null;
    }, PAN_OFF_DEBOUNCE_MS);
  }, []);
  const clearPanningNow = reactExports.useCallback(() => {
    if (panningOffTimerRef.current !== null) {
      clearTimeout(panningOffTimerRef.current);
      panningOffTimerRef.current = null;
    }
    containerRef.current?.classList.remove("canvas-panning");
  }, []);
  const gestureRef = reactExports.useRef({
    kind: "idle",
    startZoom: null,
  });
  const zoomCommitTimerRef = reactExports.useRef(null);
  const commitZoomDebounced = reactExports.useCallback((zoom2) => {
    if (zoomCommitTimerRef.current !== null) clearTimeout(zoomCommitTimerRef.current);
    zoomCommitTimerRef.current = setTimeout(() => {
      zoomCommitTimerRef.current = null;
      commitStableZoomTier(zoom2);
      commitStableZoomBucket(zoom2);
    }, ZOOM_COMMIT_DEBOUNCE_MS);
  }, []);
  const handleMoveStart = reactExports.useCallback(
    (_event, viewport) => {
      gestureRef.current = {
        kind: "pan",
        startZoom: viewport.zoom,
      };
      setPanning(true);
    },
    [setPanning],
  );
  const handleMove = reactExports.useCallback(
    (_event, viewport) => {
      syncNodeHeaderVisibility(viewport.zoom);
      const g2 = gestureRef.current;
      if (g2.kind !== "pan") return;
      if (g2.startZoom !== null && viewport.zoom !== g2.startZoom) {
        gestureRef.current = {
          kind: "zoom",
          startZoom: g2.startZoom,
        };
        clearPanningNow();
      }
    },
    [clearPanningNow, syncNodeHeaderVisibility],
  );
  const handleMoveEnd = reactExports.useCallback(
    (_event, viewport) => {
      commitZoomDebounced(viewport.zoom);
      onViewportChangeEnd?.(viewport);
      const wasZoom = gestureRef.current.kind === "zoom";
      gestureRef.current = {
        kind: "idle",
        startZoom: null,
      };
      if (wasZoom) return;
      setPanning(false);
    },
    [setPanning, commitZoomDebounced, onViewportChangeEnd],
  );
  const handleInit = reactExports.useCallback(
    (instance2) => {
      const zoom2 = instance2.getViewport().zoom;
      syncNodeHeaderVisibility(zoom2);
      seedStableZoomTier(zoom2);
      seedStableZoomBucket(zoom2);
    },
    [syncNodeHeaderVisibility],
  );
  reactExports.useEffect(
    () => () => {
      clearPanningNow();
      if (zoomCommitTimerRef.current !== null) {
        clearTimeout(zoomCommitTimerRef.current);
        zoomCommitTimerRef.current = null;
      }
    },
    [clearPanningNow],
  );
  useStableViewportOnContainerShift(containerRef, active2, layoutRelocationKey);
  reactExports.useEffect(() => {
    if (!active2) return;
    let prevZoom = storeApi.getState().transform[2];
    broadcastZoom(prevZoom);
    return storeApi.subscribe(() => {
      const next2 = storeApi.getState().transform[2];
      if (next2 === prevZoom) return;
      prevZoom = next2;
      broadcastZoom(next2);
    });
  }, [active2, storeApi]);
  return (
    <CanvasActiveProvider active={active2}>
      <CanvasInteractionProvider>
        <div
          ref={containerRef}
          data-selection-count={selectedCount}
          className={
            [
              isNodeHeaderHidden(storeApi.getState().transform[2])
                ? NODE_HEADERS_HIDDEN_CLASS
                : null,
              isHandPanning ? "canvas-space-pan" : null,
              isConnecting ? "is-connecting" : null,
            ]
              .filter(Boolean)
              .join(" ") || void 0
          }
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <ReactFlow$1
            nodes={nodes}
            edges={culledEdges}
            nodeTypes={nodeTypes2}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={handleNodeDragStop}
            nodeDragSnapResolver={alignmentSnap.resolve}
            onNodeDragSnapEnd={alignmentSnap.clear}
            onSelectionChange={handleSelectionChange}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onSelectionContextMenu={onSelectionContextMenu}
            onPaneClick={handlePaneClick}
            onMoveStart={handleMoveStart}
            onMove={handleMove}
            onMoveEnd={handleMoveEnd}
            onInit={handleInit}
            onlyRenderVisibleElements={true}
            minZoom={CANVAS_MIN_ZOOM}
            maxZoom={CANVAS_MAX_ZOOM}
            isValidConnection={isValidConnection}
            selectionOnDrag={!nodeInteractionsSuspended && !isHandPanning && !stickerMode}
            selectionMode={SelectionMode.Partial}
            panOnDrag={
              interactionsSuspended ? false : isHandPanning ? PAN_ON_DRAG_WITH_LEFT : PAN_ON_DRAG
            }
            panOnScroll={!interactionsSuspended}
            zoomOnScroll={!interactionsSuspended}
            zoomOnPinch={!interactionsSuspended}
            nodesDraggable={!nodeInteractionsSuspended && !isHandPanning && !stickerMode}
            nodesConnectable={!activeMode.blocksConnection}
            disableKeyboardA11y={!active2 || nodeInteractionsSuspended}
            zoomOnDoubleClick={false}
            deleteKeyCode={
              // ReactFlow's delete handler listens on `document`, so every
              // mounted canvas (inactive workspaces are kept mounted via
              // `display:none`, not unmounted) would otherwise receive the
              // same Backspace/Delete keypress and each delete its own
              // selection — wiping nodes across workspaces. Hand inactive
              // canvases an empty key code so only the active one listens.
              !active2 || nodeInteractionsSuspended ? EMPTY_DELETE_KEY_CODE : DELETE_KEY_CODE
            }
            multiSelectionKeyCode="Shift"
            paneClickDistance={4}
            proOptions={{
              hideAttribution: true,
            }}
            style={isHandPanning ? grabCanvasStyle : defaultCanvasStyle}
          >
            {(background === "dots" || background === "grid") && showBackgroundGrid && (
              <BackgroundCanvas active={active2} variant={background} />
            )}
            {nodes.length === 0 && !isAnyOverlayActive && <EmptyCanvasHint />}
            {edges.length > 0 ? (
              <EdgesCanvas active={active2} onlySelectedNodes={!edgesVisible} />
            ) : null}
            <EdgeInteractionLayer active={active2} onlySelectedNodes={!edgesVisible} />
            <NodeTagRingsCanvas active={active2} />
            <NodeAlignmentGuides store={alignmentSnap.guidesStore} />
            {active2 && minimap && !isAnyOverlayActive && (
              <CanvasMiniMap
                viewportColor={getMinimapViewportColor}
                position={toolbarPlacement}
                style={getCanvasMinimapPositionStyle(toolbarPlacement)}
                onClick={handleMinimapClick}
                onNodeSelect={onMinimapNodeSelect}
              />
            )}
            {active2 ? <ConnectingDisabledMarker edges={edges} /> : null}
            {active2 ? <ConnectionTargetMarker edges={edges} /> : null}
            {children2}
          </ReactFlow$1>
        </div>
      </CanvasInteractionProvider>
      {active2 ? <CanvasModeLayers /> : null}
      {active2 ? <CanvasE2EMarkers nodes={nodes} /> : null}
    </CanvasActiveProvider>
  );
}
export function buildStickerFollowIndex(nodes) {
  const nodeById = new Map();
  const childIdsByParentId = new Map();
  const stickersByTargetId = new Map();
  for (const node2 of nodes) {
    nodeById.set(node2.id, node2);
    if (node2.parentId) {
      const children2 = childIdsByParentId.get(node2.parentId);
      if (children2) children2.push(node2.id);
      else childIdsByParentId.set(node2.parentId, [node2.id]);
    }
    if (node2.type !== CanvasNodeType.Sticker) continue;
    const targetId = node2.data?.targetId;
    if (typeof targetId !== "string" || targetId.length === 0) continue;
    const stickers = stickersByTargetId.get(targetId);
    if (stickers) stickers.push(node2);
    else stickersByTargetId.set(targetId, [node2]);
  }
  return {
    nodeById,
    childIdsByParentId,
    stickersByTargetId,
  };
}
export function collectAffectedStickerNodes(index2, directlyAffectedNodeIds) {
  if (index2.stickersByTargetId.size === 0 || directlyAffectedNodeIds.length === 0) return [];
  const affectedIds = new Set(directlyAffectedNodeIds);
  const queue = [...affectedIds];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const childId of index2.childIdsByParentId.get(queue[cursor]) ?? []) {
      if (affectedIds.has(childId)) continue;
      affectedIds.add(childId);
      queue.push(childId);
    }
  }
  const result = [];
  const seenStickerIds = new Set();
  for (const targetId of affectedIds) {
    for (const sticker of index2.stickersByTargetId.get(targetId) ?? []) {
      if (seenStickerIds.has(sticker.id)) continue;
      seenStickerIds.add(sticker.id);
      result.push(sticker);
    }
  }
  return result;
}
export function createCanvasResizeActions(instance2) {
  const requestPersist = () =>
    instance2.eventBus.emit({
      type: "persist:request",
    });
  return {
    resizeNode: (nodeId, width, height) => {
      instance2.resizeNode(nodeId, {
        width,
        height,
      });
      requestPersist();
    },
    updateNodeDataAndResize: (nodeId, data2, width, height) => {
      instance2.updateNodeDataAndResize(nodeId, data2, {
        width,
        height,
      });
      requestPersist();
    },
    moveAndResizeNode: (nodeId, x2, y4, width, height, data2) => {
      instance2.moveAndResizeNode(
        nodeId,
        {
          x: x2,
          y: y4,
        },
        {
          width,
          height,
        },
        data2,
      );
      requestPersist();
    },
    moveAndResizeImageGroupMembers: (nodeId, x2, y4, width, height, data2) => {
      instance2.moveAndResizeImageGroupMembers(
        nodeId,
        {
          x: x2,
          y: y4,
        },
        {
          width,
          height,
        },
        data2,
      );
      requestPersist();
    },
  };
}
