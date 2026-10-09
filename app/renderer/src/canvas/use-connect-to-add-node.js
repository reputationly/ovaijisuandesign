// use-connect-to-add-node.js
import {
  CanvasNodeType,
  findConnectionTarget,
  Position,
  reactExports,
  useReactFlow,
  useStoreApi,
} from "../vendor.js";
import { orientUserEdge } from "./separator.jsx";
import {
  defaultNodeSizeForType,
  POPOVER_DRAFT_DATA_KEY,
} from "./compute-group-bounds-from-children.js";
import { parsePluginAddNodeType } from "../media-editing/resolve-panorama-generation-presentation.js";
import { emptyMediaNodeInit } from "../media-editing/base-backend.jsx";
import { CLICK_VS_DRAG_THRESHOLD_SQ_PX } from "./click-vs-drag-threshold-sq-px.js";

const PLUS_CLICK_FLOW_OFFSET = 120;

const PLUS_CLICK_MENU_GAP_PX = 16;

function inputHandleOffset(sourcePos, size2) {
  switch (sourcePos) {
    case Position.Right:
      return {
        x: 0,
        y: size2.height / 2,
      };
    case Position.Left:
      return {
        x: size2.width,
        y: size2.height / 2,
      };
    case Position.Bottom:
      return {
        x: size2.width / 2,
        y: 0,
      };
    case Position.Top:
      return {
        x: size2.width / 2,
        y: size2.height,
      };
    default: {
      const _exhaustive = sourcePos;
      throw new Error(`Unhandled handle position: ${String(_exhaustive)}`);
    }
  }
}

function offsetAlongHandle(point2, pos, distance2) {
  switch (pos) {
    case Position.Right:
      return {
        x: point2.x + distance2,
        y: point2.y,
      };
    case Position.Left:
      return {
        x: point2.x - distance2,
        y: point2.y,
      };
    case Position.Bottom:
      return {
        x: point2.x,
        y: point2.y + distance2,
      };
    case Position.Top:
      return {
        x: point2.x,
        y: point2.y - distance2,
      };
    default: {
      const _exhaustive = pos;
      throw new Error(`Unhandled handle position: ${String(_exhaustive)}`);
    }
  }
}

function newSourcesForTarget(sources, target, edges) {
  const existing = new Set();
  for (const e2 of edges) {
    if (e2.target === target) existing.add(e2.source);
  }
  const result = [];
  const seen2 = new Set();
  for (const source of sources) {
    if (source === target) continue;
    if (existing.has(source)) continue;
    if (seen2.has(source)) continue;
    result.push(source);
    seen2.add(source);
  }
  return result;
}

const NO_NEW_NODE_SOURCE_TYPES = new Set([CanvasNodeType.Table]);

function getNodePluginId(data2) {
  if (!data2 || typeof data2 !== "object" || !("pluginId" in data2))
    return void 0;
  return typeof data2.pluginId === "string" ? data2.pluginId : void 0;
}

export function useConnectToAddNode({
  instance: instance2,
  commands,
  bridgeAddNode,
  bridgeInstantiatePlugin,
  openContextMenuAt,
  getAddNodePosition,
  onNodeAdd,
  loadSourceText,
  getLastUsedModelParams,
}) {
  const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();
  const storeApi = useStoreApi();
  const pendingConnectionRef = reactExports.useRef(null);
  const [connectionSource, setConnectionSource] = reactExports.useState(null);
  const [sourceNodeType, setSourceNodeType] = reactExports.useState(void 0);
  const [sourceNodePluginId, setSourceNodePluginId] =
    reactExports.useState(void 0);
  const clearPendingConnection = reactExports.useCallback(() => {
    pendingConnectionRef.current = null;
    setConnectionSource(null);
    setSourceNodeType(void 0);
    setSourceNodePluginId(void 0);
  }, []);
  const handleConnectEnd = reactExports.useCallback(
    (event, connectionState) => {
      if (connectionState.isValid) return;
      if (
        !connectionState.fromNode ||
        !connectionState.from ||
        !connectionState.fromPosition
      )
        return;
      const clientX =
        "clientX" in event
          ? event.clientX
          : (event.changedTouches?.[0]?.clientX ?? 0);
      const clientY =
        "clientY" in event
          ? event.clientY
          : (event.changedTouches?.[0]?.clientY ?? 0);
      const sourceScreen = flowToScreenPosition(connectionState.from);
      const dx = clientX - sourceScreen.x;
      const dy = clientY - sourceScreen.y;
      if (dx * dx + dy * dy < CLICK_VS_DRAG_THRESHOLD_SQ_PX) return;
      const sourceId = connectionState.fromNode.id;
      const dropFlow = screenToFlowPosition({
        x: clientX,
        y: clientY,
      });
      const connectedTargets = new Set();
      for (const edge of instance2.getGraph().edges) {
        if (edge.source === sourceId) connectedTargets.add(edge.target);
      }
      const { nodeLookup, transform: transform2 } = storeApi.getState();
      const zoom2 = transform2[2];
      if (
        findConnectionTarget(nodeLookup, dropFlow, sourceId, zoom2) !== null
      ) {
        const target = findConnectionTarget(
          nodeLookup,
          dropFlow,
          sourceId,
          zoom2,
          connectedTargets,
        );
        if (target) {
          const nodesById = new Map(
            instance2.getGraph().nodes.map((n2) => [n2.id, n2]),
          );
          const oriented = orientUserEdge(sourceId, target, (id2) =>
            nodesById.get(id2),
          );
          instance2.addEdge({
            id: `${oriented.source}->${oriented.target}`,
            source: oriented.source,
            target: oriented.target,
            type: "derivation",
          });
          instance2.eventBus.emit({
            type: "persist:flush",
          });
        }
        return;
      }
      if (
        connectionState.fromNode.type &&
        NO_NEW_NODE_SOURCE_TYPES.has(connectionState.fromNode.type)
      )
        return;
      pendingConnectionRef.current = {
        sourceNodeIds: [sourceId],
        sourceHandlePosition: connectionState.fromPosition,
        isPlusClick: false,
        sourceNodeType: connectionState.fromNode.type,
      };
      setSourceNodeType(connectionState.fromNode.type);
      const sourceData = connectionState.fromNode.data;
      setSourceNodePluginId(getNodePluginId(sourceData));
      setConnectionSource({
        points: [
          {
            sourceFlowX: connectionState.from.x,
            sourceFlowY: connectionState.from.y,
            handlePosition: connectionState.fromPosition,
          },
        ],
        endX: clientX,
        endY: clientY,
      });
      openContextMenuAt(
        {
          x: clientX,
          y: clientY,
        },
        screenToFlowPosition({
          x: clientX,
          y: clientY,
        }),
      );
    },
    [
      screenToFlowPosition,
      flowToScreenPosition,
      openContextMenuAt,
      storeApi,
      instance2,
    ],
  );
  const openAddNodeMenuRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    openAddNodeMenuRef.current = ({
      sourceNodeId,
      handlePosition,
      screenX,
      screenY,
    }) => {
      const nodeType = storeApi.getState().nodeLookup.get(sourceNodeId)?.type;
      const sourceNode = storeApi.getState().nodeLookup.get(sourceNodeId);
      const sourceData = sourceNode?.data;
      if (nodeType && NO_NEW_NODE_SOURCE_TYPES.has(nodeType)) return;
      pendingConnectionRef.current = {
        sourceNodeIds: [sourceNodeId],
        sourceHandlePosition: handlePosition,
        isPlusClick: true,
        sourceNodeType: nodeType,
      };
      setSourceNodeType(nodeType);
      setSourceNodePluginId(getNodePluginId(sourceData));
      setConnectionSource(null);
      const menuScreen = offsetAlongHandle(
        {
          x: screenX,
          y: screenY,
        },
        handlePosition,
        PLUS_CLICK_MENU_GAP_PX,
      );
      const handleFlow = screenToFlowPosition({
        x: screenX,
        y: screenY,
      });
      const dropFlow = offsetAlongHandle(
        handleFlow,
        handlePosition,
        PLUS_CLICK_FLOW_OFFSET,
      );
      openContextMenuAt(
        {
          x: menuScreen.x,
          y: menuScreen.y,
        },
        dropFlow,
      );
    };
  }, [screenToFlowPosition, openContextMenuAt, storeApi]);
  const openAddNodeMenu = reactExports.useCallback((args) => {
    openAddNodeMenuRef.current?.(args);
  }, []);
  const openAddNodeMenuFromMultiRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    openAddNodeMenuFromMultiRef.current = ({
      sourceNodeIds,
      screenX,
      screenY,
      dropFlow,
    }) => {
      if (sourceNodeIds.length === 0) return;
      pendingConnectionRef.current = {
        sourceNodeIds: [...sourceNodeIds],
        // Multi-source always uses Right — the selection toolbar "+" sits
        // on the right edge of the bounding box, so the new node's input
        // handle should be on its left edge.
        sourceHandlePosition: Position.Right,
        isPlusClick: dropFlow === void 0,
      };
      setSourceNodeType(void 0);
      setSourceNodePluginId(void 0);
      if (dropFlow !== void 0) {
        const nodeLookup = storeApi.getState().nodeLookup;
        const points = [];
        for (const id2 of sourceNodeIds) {
          const node2 = nodeLookup.get(id2);
          if (!node2) continue;
          const w3 = node2.measured?.width ?? node2.width ?? 0;
          const h2 = node2.measured?.height ?? node2.height ?? 0;
          if (!w3 || !h2) continue;
          points.push({
            sourceFlowX: node2.internals.positionAbsolute.x + w3,
            sourceFlowY: node2.internals.positionAbsolute.y + h2 / 2,
            handlePosition: Position.Right,
          });
        }
        setConnectionSource(
          points.length > 0
            ? {
                points,
                endX: screenX,
                endY: screenY,
                showEndCap: true,
              }
            : null,
        );
      } else {
        setConnectionSource(null);
      }
      const menuScreen = offsetAlongHandle(
        {
          x: screenX,
          y: screenY,
        },
        Position.Right,
        PLUS_CLICK_MENU_GAP_PX,
      );
      const flowAnchor =
        dropFlow ??
        offsetAlongHandle(
          screenToFlowPosition({
            x: screenX,
            y: screenY,
          }),
          Position.Right,
          PLUS_CLICK_FLOW_OFFSET,
        );
      openContextMenuAt(
        {
          x: menuScreen.x,
          y: menuScreen.y,
        },
        flowAnchor,
      );
    };
  }, [screenToFlowPosition, openContextMenuAt, storeApi]);
  const openAddNodeMenuFromMulti = reactExports.useCallback((args) => {
    openAddNodeMenuFromMultiRef.current?.(args);
  }, []);
  const wireEdgesFromMultiToTarget = reactExports.useCallback(
    (sourceNodeIds, targetNodeId) => {
      const todo = newSourcesForTarget(
        sourceNodeIds,
        targetNodeId,
        instance2.getGraph().edges,
      );
      if (todo.length === 0) return;
      const nodesById = new Map(
        instance2.getGraph().nodes.map((n2) => [n2.id, n2]),
      );
      for (const source of todo) {
        const oriented = orientUserEdge(source, targetNodeId, (id2) =>
          nodesById.get(id2),
        );
        instance2.addEdge({
          id: `${oriented.source}->${oriented.target}`,
          source: oriented.source,
          target: oriented.target,
          type: "derivation",
        });
      }
      instance2.eventBus.emit({
        type: "persist:flush",
      });
    },
    [instance2],
  );
  const handleAddNode = reactExports.useCallback(
    async (type2) => {
      const startedAt = Date.now();
      const pending2 = pendingConnectionRef.current;
      clearPendingConnection();
      const pluginId = parsePluginAddNodeType(type2);
      const source = !pending2
        ? "pane_menu"
        : pending2.sourceNodeIds.length > 1
          ? pending2.isPlusClick
            ? "multi_plus_click"
            : "multi_drop"
          : pending2.isPlusClick
            ? "connect_plus_click"
            : "connect_drop";
      if (!pending2) {
        if (pluginId) {
          const nodeId = await bridgeInstantiatePlugin?.({
            pluginId,
            position: getAddNodePosition(),
          });
          if (nodeId) {
            instance2.selection.set([nodeId]);
            onNodeAdd?.({
              nodeType:
                pluginId === "comfyui" ? "comfyui" : CanvasNodeType.File,
              pluginId,
              nodeId,
              durationMs: Date.now() - startedAt,
              source,
              ...(pluginId === "comfyui" && source === "pane_menu"
                ? {
                    entryPoint: "right_click_comfyui",
                  }
                : {}),
            });
          }
          return;
        }
        const newNodeId2 = await bridgeAddNode(type2);
        if (
          newNodeId2 &&
          (type2 === CanvasNodeType.Image ||
            type2 === CanvasNodeType.Video ||
            type2 === CanvasNodeType.Audio ||
            type2 === CanvasNodeType.Text)
        ) {
          instance2.selection.set([newNodeId2]);
        }
        if (newNodeId2)
          onNodeAdd?.({
            nodeType: type2,
            source,
          });
        return;
      }
      if (pluginId) {
        const nodeId = await bridgeInstantiatePlugin?.({
          pluginId,
          position: getAddNodePosition(),
          sourceNodeIds: pending2.sourceNodeIds,
        });
        if (nodeId) {
          instance2.selection.set([nodeId]);
          onNodeAdd?.({
            nodeType: pluginId === "comfyui" ? "comfyui" : CanvasNodeType.File,
            pluginId,
            nodeId,
            durationMs: Date.now() - startedAt,
            source,
          });
        }
        return;
      }
      const dropPoint2 = getAddNodePosition();
      const size2 = defaultNodeSizeForType(type2);
      const offset2 = inputHandleOffset(pending2.sourceHandlePosition, size2);
      const position2 = {
        x: dropPoint2.x - offset2.x,
        y: dropPoint2.y - offset2.y,
      };
      const wireEdges = (targetNodeId) => {
        const todo = newSourcesForTarget(
          pending2.sourceNodeIds,
          targetNodeId,
          instance2.getGraph().edges,
        );
        const nodesById = new Map(
          instance2.getGraph().nodes.map((n2) => [n2.id, n2]),
        );
        for (const sourceId of todo) {
          const oriented = orientUserEdge(sourceId, targetNodeId, (id2) =>
            nodesById.get(id2),
          );
          instance2.addEdge({
            id: `${oriented.source}->${oriented.target}`,
            source: oriented.source,
            target: oriented.target,
            type: "derivation",
          });
        }
      };
      if (
        type2 === CanvasNodeType.Image ||
        type2 === CanvasNodeType.Video ||
        type2 === CanvasNodeType.Audio
      ) {
        const nodeId = crypto.randomUUID();
        let nodeData;
        if (
          type2 === CanvasNodeType.Audio &&
          pending2.sourceNodeType === CanvasNodeType.Text &&
          pending2.sourceNodeIds.length === 1 &&
          loadSourceText
        ) {
          const text2 = (
            await loadSourceText(pending2.sourceNodeIds[0])
          ).trim();
          if (text2) {
            const draftMap = {
              t2a: {
                prompt: text2,
              },
            };
            nodeData = {
              [POPOVER_DRAFT_DATA_KEY]: draftMap,
            };
          }
        }
        const { size: emptySize, aspectRatio } = emptyMediaNodeInit(
          type2,
          getLastUsedModelParams,
        );
        if (aspectRatio)
          nodeData = {
            ...(nodeData ?? {}),
            aspectRatio,
          };
        commands.addNode({
          type: type2,
          id: nodeId,
          position: position2,
          data: nodeData,
          size: emptySize,
          isEmpty: true,
        });
        wireEdges(nodeId);
        instance2.selection.set([nodeId]);
        instance2.eventBus.emit({
          type: "persist:flush",
        });
        onNodeAdd?.({
          nodeType: type2,
          source,
        });
        return;
      }
      const newNodeId = await bridgeAddNode(type2, position2);
      if (!newNodeId) return;
      wireEdges(newNodeId);
      instance2.selection.set([newNodeId]);
      instance2.eventBus.emit({
        type: "persist:flush",
      });
      onNodeAdd?.({
        nodeType: type2,
        source,
      });
    },
    [
      bridgeAddNode,
      bridgeInstantiatePlugin,
      commands,
      instance2,
      getAddNodePosition,
      clearPendingConnection,
      onNodeAdd,
      loadSourceText,
      getLastUsedModelParams,
    ],
  );
  return {
    connectionSource,
    sourceNodeType,
    sourceNodePluginId,
    openAddNodeMenu,
    openAddNodeMenuFromMulti,
    wireEdgesFromMultiToTarget,
    handleConnectEnd,
    handleAddNode,
    clearPendingConnection,
  };
}
