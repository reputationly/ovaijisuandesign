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

function inputHandleOffset(sourcePos, size) {
  switch (sourcePos) {
    case Position.Right:
      return {
        x: 0,
        y: size.height / 2,
      };
    case Position.Left:
      return {
        x: size.width,
        y: size.height / 2,
      };
    case Position.Bottom:
      return {
        x: size.width / 2,
        y: 0,
      };
    case Position.Top:
      return {
        x: size.width / 2,
        y: size.height,
      };
    default: {
      const _exhaustive = sourcePos;
      throw new Error(`Unhandled handle position: ${String(_exhaustive)}`);
    }
  }
}

function offsetAlongHandle(point, pos, distance) {
  switch (pos) {
    case Position.Right:
      return {
        x: point.x + distance,
        y: point.y,
      };
    case Position.Left:
      return {
        x: point.x - distance,
        y: point.y,
      };
    case Position.Bottom:
      return {
        x: point.x,
        y: point.y + distance,
      };
    case Position.Top:
      return {
        x: point.x,
        y: point.y - distance,
      };
    default: {
      const _exhaustive = pos;
      throw new Error(`Unhandled handle position: ${String(_exhaustive)}`);
    }
  }
}

function newSourcesForTarget(sources, target, edges) {
  const existing = new Set();
  for (const edge of edges) {
    if (edge.target === target) existing.add(edge.source);
  }
  const result = [];
  const seen = new Set();
  for (const source of sources) {
    if (source === target) continue;
    if (existing.has(source)) continue;
    if (seen.has(source)) continue;
    result.push(source);
    seen.add(source);
  }
  return result;
}

const NO_NEW_NODE_SOURCE_TYPES = new Set([CanvasNodeType.Table]);

function getNodePluginId(data) {
  if (!data || typeof data !== "object" || !("pluginId" in data))
    return void 0;
  return typeof data.pluginId === "string" ? data.pluginId : void 0;
}

export function useConnectToAddNode({
  instance,
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
      for (const edge of instance.getGraph().edges) {
        if (edge.source === sourceId) connectedTargets.add(edge.target);
      }
      const { nodeLookup, transform } = storeApi.getState();
      const zoom = transform[2];
      if (
        findConnectionTarget(nodeLookup, dropFlow, sourceId, zoom) !== null
      ) {
        const target = findConnectionTarget(
          nodeLookup,
          dropFlow,
          sourceId,
          zoom,
          connectedTargets,
        );
        if (target) {
          const nodesById = new Map(
            instance.getGraph().nodes.map((node) => [node.id, node]),
          );
          const oriented = orientUserEdge(sourceId, target, (id) =>
            nodesById.get(id),
          );
          instance.addEdge({
            id: `${oriented.source}->${oriented.target}`,
            source: oriented.source,
            target: oriented.target,
            type: "derivation",
          });
          instance.eventBus.emit({
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
      instance,
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
        for (const id of sourceNodeIds) {
          const node = nodeLookup.get(id);
          if (!node) continue;
          const width = node.measured?.width ?? node.width ?? 0;
          const height = node.measured?.height ?? node.height ?? 0;
          if (!width || !height) continue;
          points.push({
            sourceFlowX: node.internals.positionAbsolute.x + width,
            sourceFlowY: node.internals.positionAbsolute.y + height / 2,
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
        instance.getGraph().edges,
      );
      if (todo.length === 0) return;
      const nodesById = new Map(
        instance.getGraph().nodes.map((node) => [node.id, node]),
      );
      for (const source of todo) {
        const oriented = orientUserEdge(source, targetNodeId, (id) =>
          nodesById.get(id),
        );
        instance.addEdge({
          id: `${oriented.source}->${oriented.target}`,
          source: oriented.source,
          target: oriented.target,
          type: "derivation",
        });
      }
      instance.eventBus.emit({
        type: "persist:flush",
      });
    },
    [instance],
  );
  const handleAddNode = reactExports.useCallback(
    async (type) => {
      const startedAt = Date.now();
      const pending = pendingConnectionRef.current;
      clearPendingConnection();
      const pluginId = parsePluginAddNodeType(type);
      const source = !pending
        ? "pane_menu"
        : pending.sourceNodeIds.length > 1
          ? pending.isPlusClick
            ? "multi_plus_click"
            : "multi_drop"
          : pending.isPlusClick
            ? "connect_plus_click"
            : "connect_drop";
      if (!pending) {
        if (pluginId) {
          const nodeId = await bridgeInstantiatePlugin?.({
            pluginId,
            position: getAddNodePosition(),
          });
          if (nodeId) {
            instance.selection.set([nodeId]);
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
        const newNodeId = await bridgeAddNode(type);
        if (
          newNodeId &&
          (type === CanvasNodeType.Image ||
            type === CanvasNodeType.Video ||
            type === CanvasNodeType.Audio ||
            type === CanvasNodeType.Text)
        ) {
          instance.selection.set([newNodeId]);
        }
        if (newNodeId)
          onNodeAdd?.({
            nodeType: type,
            source,
          });
        return;
      }
      if (pluginId) {
        const nodeId = await bridgeInstantiatePlugin?.({
          pluginId,
          position: getAddNodePosition(),
          sourceNodeIds: pending.sourceNodeIds,
        });
        if (nodeId) {
          instance.selection.set([nodeId]);
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
      const dropPoint = getAddNodePosition();
      const size = defaultNodeSizeForType(type);
      const offset = inputHandleOffset(pending.sourceHandlePosition, size);
      const position = {
        x: dropPoint.x - offset.x,
        y: dropPoint.y - offset.y,
      };
      const wireEdges = (targetNodeId) => {
        const todo = newSourcesForTarget(
          pending.sourceNodeIds,
          targetNodeId,
          instance.getGraph().edges,
        );
        const nodesById = new Map(
          instance.getGraph().nodes.map((node) => [node.id, node]),
        );
        for (const sourceId of todo) {
          const oriented = orientUserEdge(sourceId, targetNodeId, (id) =>
            nodesById.get(id),
          );
          instance.addEdge({
            id: `${oriented.source}->${oriented.target}`,
            source: oriented.source,
            target: oriented.target,
            type: "derivation",
          });
        }
      };
      if (
        type === CanvasNodeType.Image ||
        type === CanvasNodeType.Video ||
        type === CanvasNodeType.Audio
      ) {
        const nodeId = crypto.randomUUID();
        let nodeData;
        if (
          type === CanvasNodeType.Audio &&
          pending.sourceNodeType === CanvasNodeType.Text &&
          pending.sourceNodeIds.length === 1 &&
          loadSourceText
        ) {
          const text = (
            await loadSourceText(pending.sourceNodeIds[0])
          ).trim();
          if (text) {
            const draftMap = {
              t2a: {
                prompt: text,
              },
            };
            nodeData = {
              [POPOVER_DRAFT_DATA_KEY]: draftMap,
            };
          }
        }
        const { size: emptySize, aspectRatio } = emptyMediaNodeInit(
          type,
          getLastUsedModelParams,
        );
        if (aspectRatio)
          nodeData = {
            ...(nodeData ?? {}),
            aspectRatio,
          };
        commands.addNode({
          type,
          id: nodeId,
          position,
          data: nodeData,
          size: emptySize,
          isEmpty: true,
        });
        wireEdges(nodeId);
        instance.selection.set([nodeId]);
        instance.eventBus.emit({
          type: "persist:flush",
        });
        onNodeAdd?.({
          nodeType: type,
          source,
        });
        return;
      }
      const newNodeId = await bridgeAddNode(type, position);
      if (!newNodeId) return;
      wireEdges(newNodeId);
      instance.selection.set([newNodeId]);
      instance.eventBus.emit({
        type: "persist:flush",
      });
      onNodeAdd?.({
        nodeType: type,
        source,
      });
    },
    [
      bridgeAddNode,
      bridgeInstantiatePlugin,
      commands,
      instance,
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
