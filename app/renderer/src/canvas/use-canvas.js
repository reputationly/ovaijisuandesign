// use-canvas.js
import {
  CanvasNodeType,
  dedupedToast,
  reactExports,
  useAssetMetadataApi,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStoreApi,
  useTranslation,
} from "../vendor.js";
import { resolvePlaceholderFlowSize } from "./node-registry.js";
import {
  isPluginNode,
  orientUserEdge,
  syncStableZoomSignals,
} from "./separator.jsx";
import {
  FILE_CARD_DEFAULT_SIZE,
  isAssetBackedNode,
  isGenerationErrorStatus,
  isIdleEmptyVideoNode,
  POPOVER_DRAFT_DATA_KEY,
  VIDEO_EMPTY_CARD_SIZE,
} from "./compute-group-bounds-from-children.js";
import {
  CANVAS_COMMAND_IDS,
  getNodePosition,
  getNodeSize,
  sizeOf,
} from "./use-active-mode.js";
import { PROMPT_PREVIEW_MAX } from "./selection-toolbar.js";
import { parseNodeId } from "./find-free-position-from-anchor.js";
import { getAssetMetaByNodeIdFromStore } from "./fullscreen-icon.jsx";
import { useGeneratingStateApi } from "../media-editing/package.jsx";
import {
  resolveCanvasPlatform,
  resolveCanvasShortcut,
} from "../media-editing/use-warn-missing-asset-meta.jsx";
import {
  injectDerivedChildCounts,
  reorderParentsBeforeChildren,
  toFlowEdge,
} from "./reorder-parents-before-children.js";
import { CanvasInstance } from "./canvas-instance.js";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts.js";
import {
  isEdgeAttachedToProtectedNode,
  isNodeDeleteProtected,
  partitionDeletableIds,
} from "./partition-user-removal-elements.js";
import { useCanvasData } from "./use-canvas-data.js";
function collectMeasuredSizes(storeApi) {
  const measured = new Map();
  const { nodeLookup } = storeApi.getState();
  for (const [id2, entry] of nodeLookup) {
    const m3 = entry.measured;
    if (m3?.width && m3?.height && m3.width > 0 && m3.height > 0) {
      measured.set(id2, {
        width: Math.round(m3.width),
        height: Math.round(m3.height),
      });
    }
  }
  return measured.size > 0 ? measured : void 0;
}
function toHistoryActionResult(checkpoint, instance2) {
  const current2 =
    checkpoint && instance2.history.isCheckpointCurrent(checkpoint)
      ? checkpoint
      : null;
  return {
    changed: current2 !== null,
    checkpoint: current2,
  };
}
const KEYBOARD_MOVE_COMMIT_DELAY_MS = 200;
function generateNodeId() {
  return crypto.randomUUID();
}
function isBoxFullyVisible(box2, rect) {
  return (
    box2.x >= rect.x &&
    box2.y >= rect.y &&
    box2.x + box2.width <= rect.x + rect.width &&
    box2.y + box2.height <= rect.y + rect.height
  );
}
const COMMAND_DEFINITIONS = [
  {
    id: CANVAS_COMMAND_IDS.addNode,
    labelKey: "canvas.toolbar.addNode",
    shortcut: "N",
    ariaKeyshortcuts: "N",
  },
  {
    id: CANVAS_COMMAND_IDS.assets,
    labelKey: "canvas.toolbar.assets",
    shortcut: "Shift+I",
    ariaKeyshortcuts: "Shift+I",
  },
  {
    id: CANVAS_COMMAND_IDS.select,
    labelKey: "canvas.toolbar.move",
    shortcut: "V",
    ariaKeyshortcuts: "V",
  },
  {
    id: CANVAS_COMMAND_IDS.handTool,
    labelKey: "canvas.toolbar.handTool",
    shortcut: "H",
    ariaKeyshortcuts: "H",
  },
  {
    id: CANVAS_COMMAND_IDS.comments,
    labelKey: "canvas.toolbar.comments",
  },
  {
    id: CANVAS_COMMAND_IDS.sticker,
    labelKey: "canvas.toolbar.sticker",
    shortcut: "S",
    ariaKeyshortcuts: "S",
  },
  {
    id: CANVAS_COMMAND_IDS.shortcuts,
    labelKey: "canvas.toolbar.shortcuts",
    shortcut: "?",
    ariaKeyshortcuts: "Shift+/",
  },
  {
    id: CANVAS_COMMAND_IDS.help,
    labelKey: "canvas.toolbar.help",
    shortcut: "F1",
    ariaKeyshortcuts: "F1",
  },
  {
    id: CANVAS_COMMAND_IDS.minimap,
    labelKey: "canvas.minimap",
    shortcut: "M",
    ariaKeyshortcuts: "M",
  },
  {
    id: CANVAS_COMMAND_IDS.background,
    labelKey: "canvas.toolbar.background",
  },
  {
    id: CANVAS_COMMAND_IDS.content,
    labelKey: "canvas.toolbar.content",
  },
  {
    id: CANVAS_COMMAND_IDS.zoomOut,
    labelKey: "canvas.zoomOut",
  },
  {
    id: CANVAS_COMMAND_IDS.zoomIn,
    labelKey: "canvas.zoomIn",
  },
  {
    id: CANVAS_COMMAND_IDS.fitView,
    labelKey: "canvas.fitToView",
  },
  {
    id: CANVAS_COMMAND_IDS.focusSelection,
    labelKey: "canvas.focusSelection",
    shortcut: "Shift+2",
    ariaKeyshortcuts: "Shift+2",
  },
];
const DEFINITIONS_BY_ID = new Map(
  COMMAND_DEFINITIONS.map((definition2) => [definition2.id, definition2]),
);
function createCanvasCommandRegistry(resolveHandlers) {
  return {
    definitions: COMMAND_DEFINITIONS,
    get(id2) {
      const definition2 = DEFINITIONS_BY_ID.get(id2);
      if (!definition2) throw new Error(`Unknown canvas command: ${id2}`);
      return definition2;
    },
    hasHandler(id2) {
      return typeof resolveHandlers()[id2] === "function";
    },
    execute(id2, source) {
      const handler = resolveHandlers()[id2];
      if (!handler) return false;
      handler(source);
      return true;
    },
  };
}
function selectMouseAnchor(opts) {
  const { mouseScreen, containerRect, screenToFlow } = opts;
  if (!mouseScreen || !containerRect) return null;
  const { x: x2, y: y4 } = mouseScreen;
  if (
    x2 < containerRect.left ||
    x2 > containerRect.right ||
    y4 < containerRect.top ||
    y4 > containerRect.bottom
  ) {
    return null;
  }
  return screenToFlow(mouseScreen);
}
function selectDropAnchor(opts) {
  return selectMouseAnchor(opts) ?? opts.viewportCenter();
}
function collectCommittablePositionChanges(changes) {
  const moves = [];
  for (const change of changes) {
    if (
      change.type !== "position" ||
      change.positionChangeSource !== "keyboard" ||
      !change.position
    ) {
      continue;
    }
    moves.push({
      id: change.id,
      position: change.position,
    });
  }
  return moves;
}
const COLLAPSED_GROUP_FLOW_SIZE = {
  width: 1,
  height: 1,
};
function toFlowNode(node2, mode2, selectedNodeIds, hidden) {
  const selected2 = selectedNodeIds ? selectedNodeIds.has(node2.id) : void 0;
  const rawSize = isIdleEmptyVideoNode(node2)
    ? VIDEO_EMPTY_CARD_SIZE
    : getNodeSize(node2, mode2);
  const collapsed = !!node2.meta?.collapsed;
  const isCollapsedGroup = collapsed && node2.type === CanvasNodeType.Group;
  const errorData = node2.data;
  const isAutoSizedVideoError =
    node2.type === CanvasNodeType.Video &&
    isGenerationErrorStatus(errorData?.status) &&
    typeof errorData?.errorMessage === "string" &&
    errorData.errorMessage.length > 0;
  const isCompactFile =
    node2.type === CanvasNodeType.File &&
    !isPluginNode(node2) &&
    node2.data?.viewMode !== "preview";
  const size2 = isAutoSizedVideoError
    ? void 0
    : isCollapsedGroup
      ? COLLAPSED_GROUP_FLOW_SIZE
      : node2.type === CanvasNodeType.Placeholder
        ? resolvePlaceholderFlowSize(node2, rawSize)
        : isCompactFile
          ? FILE_CARD_DEFAULT_SIZE
          : rawSize;
  const position2 = getNodePosition(node2, mode2);
  return {
    id: node2.id,
    type: node2.type,
    position: position2,
    data: node2.data,
    ...(size2
      ? {
          width: size2.width,
          height: size2.height,
        }
      : {}),
    ...(node2.meta?.zIndex !== void 0
      ? {
          zIndex: node2.meta.zIndex,
        }
      : {}),
    // Collapsed groups still allow dragging, but only via the floating chip —
    // the `dragHandle` selector below restricts ReactFlow's d3-drag listener
    // to elements matching `.canvas-group-collapsed-drag-handle` (the label
    // text inside the chip). The wrapper itself shrinks to
    // `COLLAPSED_GROUP_FLOW_SIZE` (1x1) and is `pointer-events: none` in
    // `canvas-overrides.css`, so scoping the handle keeps the drag affordance
    // on the chip rather than on an invisible wrapper box.
    draggable: !node2.meta?.locked,
    // Collapsed groups are excluded from the selection set entirely — see
    // `canvas-overrides.css` for the matching wrapper-level pointer-events
    // rule. Force `selected: false` so any stale selection from before the
    // collapse doesn't bleed through into the toolbar / resize chrome.
    ...(collapsed
      ? {
          selectable: false,
          selected: false,
          className: "canvas-group-collapsed",
          dragHandle: ".canvas-group-collapsed-drag-handle",
        }
      : selected2 !== void 0
        ? {
            selected: selected2,
          }
        : {}),
    ...(node2.parentId
      ? {
          parentId: node2.parentId,
        }
      : {}),
    // `hidden` is omitted unless explicitly true so ReactFlow's diff sees a
    // stable shape for the common (always-visible) case. Set by callers when
    // the node's parent group is collapsed.
    ...(hidden
      ? {
          hidden: true,
        }
      : {}),
  };
}
function toFlowNodes(nodes, mode2, selectedNodeIds, hiddenNodeIds) {
  return nodes.map((node2) =>
    toFlowNode(
      node2,
      mode2,
      selectedNodeIds,
      node2.meta?.hidden || hiddenNodeIds?.has(node2.id) || void 0,
    ),
  );
}
function toFlowNodesMemo(cache2, nodes, mode2, selectedNodeIds, hiddenNodeIds) {
  const result = new Array(nodes.length);
  const next2 = new Map();
  for (let i2 = 0; i2 < nodes.length; i2++) {
    const node2 = nodes[i2];
    const selected2 = selectedNodeIds ? selectedNodeIds.has(node2.id) : void 0;
    const hidden =
      node2.meta?.hidden ||
      (hiddenNodeIds ? hiddenNodeIds.has(node2.id) : false);
    const prev = cache2.get(node2.id);
    if (
      prev &&
      prev.input === node2 &&
      prev.selected === selected2 &&
      prev.mode === mode2 &&
      prev.hidden === hidden
    ) {
      result[i2] = prev.output;
      next2.set(node2.id, prev);
    } else {
      const output = toFlowNode(
        node2,
        mode2,
        selectedNodeIds,
        hidden || void 0,
      );
      const entry = {
        input: node2,
        selected: selected2,
        mode: mode2,
        hidden,
        output,
      };
      result[i2] = output;
      next2.set(node2.id, entry);
    }
  }
  cache2.clear();
  for (const [k2, v2] of next2) cache2.set(k2, v2);
  return result;
}
function toFlowEdges(edges, selectedNodeIds, hiddenNodeIds) {
  return edges.map((edge) =>
    toFlowEdge(
      edge,
      selectedNodeIds,
      // An edge is hidden if EITHER endpoint is hidden (collapsed group child).
      // Hiding only when both endpoints are hidden would still leak the edge
      // for cross-group connections where one side is collapsed.
      hiddenNodeIds &&
        (hiddenNodeIds.has(edge.source) || hiddenNodeIds.has(edge.target))
        ? true
        : void 0,
    ),
  );
}
function collectHiddenChildIds(nodes) {
  let collapsedGroups = null;
  let hidden = null;
  for (const node2 of nodes) {
    if (node2.meta?.hidden) {
      hidden ??= new Set();
      hidden.add(node2.id);
    }
    if (node2.type !== CanvasNodeType.Group) continue;
    if (node2.meta?.collapsed) {
      collapsedGroups ??= new Set();
      collapsedGroups.add(node2.id);
    }
  }
  if (collapsedGroups) {
    for (const node2 of nodes) {
      if (node2.parentId && collapsedGroups.has(node2.parentId)) {
        hidden ??= new Set();
        hidden.add(node2.id);
      }
    }
  }
  return hidden && hidden.size > 0 ? hidden : void 0;
}
function prepareNodesForFlow(nodes, childCountByParent) {
  return reorderParentsBeforeChildren(
    injectDerivedChildCounts(nodes, childCountByParent),
  );
}
function mergeHiddenSets(a2, b3) {
  if (!a2) return b3;
  if (!b3) return a2;
  const out = new Set(a2);
  for (const id2 of b3) out.add(id2);
  return out;
}
function buildIndexById(items) {
  return new Map(items.map((item, index2) => [item.id, index2]));
}
function selectionKey(ids2) {
  return Array.from(ids2).sort().join("|");
}
function buildEdgeIdsByNode(edges) {
  const edgeIdsByNode = new Map();
  for (const edge of edges) {
    let sourceEdges = edgeIdsByNode.get(edge.source);
    if (!sourceEdges) {
      sourceEdges = new Set();
      edgeIdsByNode.set(edge.source, sourceEdges);
    }
    sourceEdges.add(edge.id);
    let targetEdges = edgeIdsByNode.get(edge.target);
    if (!targetEdges) {
      targetEdges = new Set();
      edgeIdsByNode.set(edge.target, targetEdges);
    }
    targetEdges.add(edge.id);
  }
  return edgeIdsByNode;
}
function collectMetaHiddenIds(nodes) {
  const ids2 = new Set();
  for (const node2 of nodes) {
    if (node2.meta?.hidden) ids2.add(node2.id);
  }
  return ids2.size > 0 ? ids2 : void 0;
}
function syncFlowGraph(
  instance2,
  graph,
  selected2,
  flowNodeCache,
  setFlowNodes,
  setFlowEdges,
) {
  const mode2 = instance2.getMode();
  const preparedNodes = prepareNodesForFlow(
    graph.nodes,
    instance2.getChildCountByParent(),
  );
  const hiddenIds = mergeHiddenSets(
    collectHiddenChildIds(preparedNodes),
    collectMetaHiddenIds(preparedNodes),
  );
  setFlowNodes(
    toFlowNodesMemo(flowNodeCache, preparedNodes, mode2, selected2, hiddenIds),
  );
  setFlowEdges(toFlowEdges(graph.edges, selected2, hiddenIds));
  if (flowNodeCache.size > preparedNodes.length) {
    const liveIds = new Set(preparedNodes.map((n2) => n2.id));
    for (const id2 of flowNodeCache.keys()) {
      if (!liveIds.has(id2)) flowNodeCache.delete(id2);
    }
  }
}
function useGraphSync(instance2, setFlowNodes, setFlowEdges) {
  const [selectedIds, setSelectedIds] = reactExports.useState([]);
  const selectedIdsRef = reactExports.useRef(new Set());
  const nodeIndexByIdRef = reactExports.useRef(new Map());
  const edgeIndexByIdRef = reactExports.useRef(new Map());
  const edgeIdsByNodeRef = reactExports.useRef(new Map());
  const flowNodeCacheRef = reactExports.useRef(new Map());
  const lastSyncedSelectionKeyRef = reactExports.useRef(null);
  const syncingRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    return instance2.onGraphChange((graph) => {
      syncingRef.current = true;
      const selected2 = new Set(instance2.selection.getSelected());
      selectedIdsRef.current = selected2;
      lastSyncedSelectionKeyRef.current = selectionKey(selected2);
      nodeIndexByIdRef.current = buildIndexById(graph.nodes);
      edgeIndexByIdRef.current = buildIndexById(graph.edges);
      edgeIdsByNodeRef.current = buildEdgeIdsByNode(graph.edges);
      syncFlowGraph(
        instance2,
        graph,
        selected2,
        flowNodeCacheRef.current,
        setFlowNodes,
        setFlowEdges,
      );
      queueMicrotask(() => {
        syncingRef.current = false;
      });
    });
  }, [instance2, setFlowNodes, setFlowEdges]);
  reactExports.useEffect(() => {
    return instance2.eventBus.on(
      "node:data-silent-changed",
      ({ nodeId, data: data2 }) => {
        const entry = flowNodeCacheRef.current.get(nodeId);
        if (entry && entry.output.data !== data2) {
          entry.output = {
            ...entry.output,
            data: data2,
          };
        }
        setFlowNodes((nodes) => {
          const index2 = nodes.findIndex((n2) => n2.id === nodeId);
          if (index2 === -1) return nodes;
          const node2 = nodes[index2];
          if (node2.data === data2) return nodes;
          const next2 = [...nodes];
          next2[index2] = {
            ...node2,
            data: data2,
          };
          return next2;
        });
      },
    );
  }, [instance2, setFlowNodes]);
  reactExports.useEffect(() => {
    return instance2.selection.onChange((ids2) => {
      const prevSelected = selectedIdsRef.current;
      const selected2 = new Set(ids2);
      const changedNodeIds = new Set();
      for (const id2 of prevSelected) {
        if (!selected2.has(id2)) changedNodeIds.add(id2);
      }
      for (const id2 of selected2) {
        if (!prevSelected.has(id2)) changedNodeIds.add(id2);
      }
      selectedIdsRef.current = selected2;
      setSelectedIds(ids2);
      if (changedNodeIds.size === 0) return;
      const key2 = selectionKey(selected2);
      if (key2 === lastSyncedSelectionKeyRef.current) return;
      lastSyncedSelectionKeyRef.current = key2;
      for (const nodeId of changedNodeIds) {
        const entry = flowNodeCacheRef.current.get(nodeId);
        const nextSelected = selected2.has(nodeId);
        if (entry && entry.selected !== nextSelected) {
          entry.selected = nextSelected;
          entry.output = {
            ...entry.output,
            selected: nextSelected,
          };
        }
      }
      setFlowNodes((nodes) => {
        let nextNodes = null;
        let shouldFallback = false;
        for (const nodeId of changedNodeIds) {
          const index2 = nodeIndexByIdRef.current.get(nodeId);
          if (index2 === void 0) {
            shouldFallback = true;
            break;
          }
          const node2 = (nextNodes ?? nodes)[index2];
          if (!node2 || node2.id !== nodeId) {
            shouldFallback = true;
            break;
          }
          const nextSelected = selected2.has(nodeId);
          if (node2.selected === nextSelected) continue;
          nextNodes ??= [...nodes];
          const updated = {
            ...node2,
            selected: nextSelected,
          };
          nextNodes[index2] = updated;
        }
        if (shouldFallback) {
          const preparedNodes = prepareNodesForFlow(
            instance2.getGraph().nodes,
            instance2.getChildCountByParent(),
          );
          return toFlowNodes(
            preparedNodes,
            instance2.getMode(),
            selected2,
            mergeHiddenSets(
              collectHiddenChildIds(preparedNodes),
              collectMetaHiddenIds(preparedNodes),
            ),
          );
        }
        return nextNodes ?? nodes;
      });
      const graph = instance2.getGraph();
      const affectedEdgeIds = new Set();
      for (const nodeId of changedNodeIds) {
        const edgeIds = edgeIdsByNodeRef.current.get(nodeId);
        if (!edgeIds) continue;
        for (const edgeId of edgeIds) affectedEdgeIds.add(edgeId);
      }
      if (affectedEdgeIds.size === 0) return;
      setFlowEdges((edges) => {
        let nextEdges = null;
        let shouldFallback = false;
        for (const edgeId of affectedEdgeIds) {
          const index2 = edgeIndexByIdRef.current.get(edgeId);
          if (index2 === void 0) {
            shouldFallback = true;
            break;
          }
          const edge = (nextEdges ?? edges)[index2];
          if (!edge || edge.id !== edgeId) {
            shouldFallback = true;
            break;
          }
          const nextSelected =
            selected2.has(edge.source) || selected2.has(edge.target);
          if (edge.selected === nextSelected) continue;
          nextEdges ??= [...edges];
          nextEdges[index2] = {
            ...edge,
            selected: nextSelected,
          };
        }
        if (shouldFallback) {
          const preparedNodes = prepareNodesForFlow(
            graph.nodes,
            instance2.getChildCountByParent(),
          );
          return toFlowEdges(
            graph.edges,
            selected2,
            collectHiddenChildIds(preparedNodes),
          );
        }
        return nextEdges ?? edges;
      });
    });
  }, [instance2, setFlowNodes, setFlowEdges]);
  return {
    selectedIds,
    syncingRef,
  };
}
function shortenPrompt(prompt) {
  if (!prompt) return void 0;
  const trimmed = prompt.trim();
  if (!trimmed) return void 0;
  return trimmed.length > PROMPT_PREVIEW_MAX
    ? `${trimmed.slice(0, PROMPT_PREVIEW_MAX)}…`
    : trimmed;
}
function readStr(data2, key2) {
  if (!data2) return void 0;
  const v2 = data2[key2];
  return typeof v2 === "string" && v2.length > 0 ? v2 : void 0;
}
function buildDebugInfo(node2, ctx = {}) {
  const data2 = node2.data ?? {};
  let status = "unknown";
  const placeholderStatus = readStr(data2, "status");
  if (
    placeholderStatus === "pending" ||
    placeholderStatus === "generating" ||
    placeholderStatus === "loading"
  ) {
    status = "generating";
  } else if (isGenerationErrorStatus(placeholderStatus)) {
    status = "error";
  } else if (ctx.meta) {
    status = "success";
  } else if (ctx.generating) {
    status = "generating";
  }
  const cloudTraceId =
    readStr(data2, "cloudTraceId") ??
    ctx.meta?.cloudTraceId ??
    ctx.generating?.traceId;
  const cloudTaskId =
    readStr(data2, "cloudTaskId") ??
    ctx.meta?.cloudTaskId ??
    ctx.generating?.cloudTaskId;
  const providerTaskId =
    readStr(data2, "providerTaskId") ?? ctx.meta?.providerTaskId;
  return {
    timestamp: new Date().toISOString(),
    nodeId: node2.id,
    nodeType: node2.type,
    ...(isAssetBackedNode(node2.type)
      ? {
          assetId: parseNodeId(node2.id).assetId,
        }
      : {}),
    status,
    ...(cloudTraceId
      ? {
          cloudTraceId,
        }
      : {}),
    ...(cloudTaskId
      ? {
          cloudTaskId,
        }
      : {}),
    ...(providerTaskId
      ? {
          providerTaskId,
        }
      : {}),
    ...(status === "error" && readStr(data2, "errorMessage")
      ? {
          errorMessage: readStr(data2, "errorMessage"),
        }
      : {}),
    ...(ctx.meta?.model
      ? {
          model: ctx.meta.model,
        }
      : readStr(data2, "model")
        ? {
            model: readStr(data2, "model"),
          }
        : {}),
    ...(ctx.meta?.backend
      ? {
          backend: ctx.meta.backend,
        }
      : {}),
    ...(ctx.meta?.source_tool
      ? {
          sourceTool: ctx.meta.source_tool,
        }
      : {}),
    ...(ctx.meta?.params
      ? {
          params: ctx.meta.params,
        }
      : {}),
    ...(shortenPrompt(ctx.meta?.prompt ?? readStr(data2, "prompt"))
      ? {
          promptPreview: shortenPrompt(
            ctx.meta?.prompt ?? readStr(data2, "prompt"),
          ),
        }
      : {}),
  };
}
function shortTraceId(traceId) {
  if (!traceId) return void 0;
  return traceId.length > 8 ? `${traceId.slice(0, 8)}…` : traceId;
}
function collectPayloads(instance2, assetStore, generatingStore, nodeIds) {
  const graph = instance2.getGraph();
  const lookup = new Map(graph.nodes.map((n2) => [n2.id, n2]));
  const generating = generatingStore.getState().byNode;
  const payloads = [];
  for (const id2 of nodeIds) {
    const node2 = lookup.get(id2);
    if (!node2) continue;
    payloads.push(
      buildDebugInfo(node2, {
        meta: getAssetMetaByNodeIdFromStore(assetStore, id2),
        generating: generating.get(id2),
      }),
    );
  }
  return payloads;
}
function useCopyDebugInfo(instance2) {
  const { t: t2 } = useTranslation();
  const assetStore = useAssetMetadataApi();
  const generatingStore = useGeneratingStateApi();
  const copyDebugShortcut = resolveCanvasShortcut("copyDebug").join(
    resolveCanvasPlatform() === "mac" ? "" : "+",
  );
  return reactExports.useCallback(
    (args) => {
      const targetIds = args?.nodeIds ?? instance2.selection.getSelected();
      if (targetIds.length === 0) {
        dedupedToast.info(
          t2(
            "canvas.debug.noSelection",
            "Select a node first, then press {{shortcut}}",
            {
              shortcut: copyDebugShortcut,
            },
          ),
        );
        return;
      }
      const payloads = collectPayloads(
        instance2,
        assetStore,
        generatingStore,
        targetIds,
      );
      if (payloads.length === 0) return;
      const serialised = JSON.stringify(
        payloads.length === 1 ? payloads[0] : payloads,
        null,
        2,
      );
      const firstTrace = payloads.find((p3) => p3.cloudTraceId)?.cloudTraceId;
      const tracePreview = shortTraceId(firstTrace);
      const writeClipboard = async () => {
        if (
          typeof navigator === "undefined" ||
          !navigator.clipboard?.writeText
        ) {
          dedupedToast.error(
            t2("canvas.debug.clipboardUnavailable", "Clipboard not available"),
          );
          return;
        }
        try {
          await navigator.clipboard.writeText(serialised);
          if (tracePreview) {
            dedupedToast.success(
              t2(
                "canvas.debug.copied",
                "Debug info copied (Trace ID: {{trace}})",
                {
                  trace: tracePreview,
                },
              ),
            );
          } else {
            dedupedToast.success(
              t2(
                "canvas.debug.copiedNoTrace",
                "Debug info copied (no Trace ID — legacy asset)",
              ),
            );
          }
        } catch (err) {
          dedupedToast.error(
            t2("canvas.debug.copyFailed", "Copy failed: {{message}}", {
              message: err instanceof Error ? err.message : String(err),
            }),
          );
        }
      };
      void writeClipboard();
    },
    [instance2, assetStore, generatingStore, t2, copyDebugShortcut],
  );
}
function useCanvasInstance(mode2, plugins) {
  const pluginsRef = reactExports.useRef(plugins);
  pluginsRef.current = plugins;
  const [instance2] = reactExports.useState(() => {
    const inst = new CanvasInstance(mode2);
    if (pluginsRef.current) {
      for (const plugin of pluginsRef.current) {
        inst.applyPlugin(plugin);
      }
    }
    return inst;
  });
  reactExports.useEffect(() => {
    return () => instance2.dispose();
  }, [instance2]);
  reactExports.useEffect(() => {
    if (instance2.getMode() !== mode2) {
      instance2.switchMode(mode2);
    }
  }, [mode2, instance2]);
  return instance2;
}
export function useCanvas(options) {
  const {
    mode: mode2,
    dataSource,
    plugins,
    isPresented = true,
    onHostKeyboardShortcut,
    commandHandlers,
    onSystemPaste,
    onSystemTextPaste,
    onSystemCopy,
    consumePastePositionOverride,
    getCurrentWorkspace,
    onNodesAdded,
    onFirstNodesPlaced,
  } = options;
  const [flowNodes, setFlowNodes, defaultOnNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, defaultOnEdgesChange] = useEdgesState([]);
  const {
    fitView,
    zoomIn,
    zoomOut,
    screenToFlowPosition,
    setCenter,
    getViewport,
  } = useReactFlow();
  const storeApi = useStoreApi();
  const assetMetadataStore = useAssetMetadataApi();
  const syncStableZoomFromViewport = reactExports.useCallback(() => {
    syncStableZoomSignals(getViewport().zoom);
  }, [getViewport]);
  const syncStableZoomAfterViewportChange = reactExports.useCallback(
    (result) => {
      if (result) {
        void result.then(
          syncStableZoomFromViewport,
          syncStableZoomFromViewport,
        );
        return;
      }
      requestAnimationFrame(syncStableZoomFromViewport);
    },
    [syncStableZoomFromViewport],
  );
  const getViewportCenter = reactExports.useCallback(() => {
    const { domNode } = storeApi.getState();
    if (!domNode)
      return {
        x: 0,
        y: 0,
      };
    const rect = domNode.getBoundingClientRect();
    return screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }, [screenToFlowPosition, storeApi]);
  const getViewportRect2 = reactExports.useCallback(() => {
    const { domNode } = storeApi.getState();
    if (!domNode) return null;
    const rect = domNode.getBoundingClientRect();
    const topLeft = screenToFlowPosition({
      x: rect.left,
      y: rect.top,
    });
    const bottomRight = screenToFlowPosition({
      x: rect.left + rect.width,
      y: rect.top + rect.height,
    });
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }, [screenToFlowPosition, storeApi]);
  const mouseScreenRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const handleMove = (e2) => {
      mouseScreenRef.current = {
        x: e2.clientX,
        y: e2.clientY,
      };
    };
    document.addEventListener("mousemove", handleMove);
    return () => document.removeEventListener("mousemove", handleMove);
  }, []);
  const getPastePosition = reactExports.useCallback(() => {
    const override = consumePastePositionOverride?.();
    if (override) return override;
    const { domNode } = storeApi.getState();
    const rect = domNode?.getBoundingClientRect() ?? null;
    return selectDropAnchor({
      mouseScreen: mouseScreenRef.current,
      containerRect: rect,
      screenToFlow: screenToFlowPosition,
      viewportCenter: getViewportCenter,
    });
  }, [
    consumePastePositionOverride,
    getViewportCenter,
    screenToFlowPosition,
    storeApi,
  ]);
  const getDropPosition = getPastePosition;
  const getInternalPasteAnchor = reactExports.useCallback(() => {
    const override = consumePastePositionOverride?.();
    if (override) return override;
    const { domNode } = storeApi.getState();
    return selectMouseAnchor({
      mouseScreen: mouseScreenRef.current,
      containerRect: domNode?.getBoundingClientRect() ?? null,
      screenToFlow: screenToFlowPosition,
    });
  }, [consumePastePositionOverride, screenToFlowPosition, storeApi]);
  const clientToFlowPosition = reactExports.useCallback(
    (clientX, clientY) =>
      screenToFlowPosition({
        x: clientX,
        y: clientY,
      }),
    [screenToFlowPosition],
  );
  const handleSystemPaste = reactExports.useMemo(() => {
    if (!onSystemPaste) return void 0;
    return (files) => onSystemPaste(files, getPastePosition());
  }, [onSystemPaste, getPastePosition]);
  const handleSystemTextPaste = reactExports.useMemo(() => {
    if (!onSystemTextPaste) return void 0;
    return (text2) => onSystemTextPaste(text2, getPastePosition());
  }, [onSystemTextPaste, getPastePosition]);
  const instance2 = useCanvasInstance(mode2, plugins);
  const commandRegistry = reactExports.useMemo(
    () => createCanvasCommandRegistry(commandHandlers ?? (() => ({}))),
    [commandHandlers],
  );
  const workspaceId2 = getCurrentWorkspace?.();
  const {
    loading,
    initialHydratedNodeCount,
    loadError,
    loadRetrying,
    retryLoad,
    savedPositionsRef,
    hiddenAssetIdsRef,
  } = useCanvasData(instance2, mode2, dataSource, getViewportCenter, {
    onNodesAdded,
    onFirstNodesPlaced,
    workspaceId: workspaceId2,
  });
  const { selectedIds, syncingRef } = useGraphSync(
    instance2,
    setFlowNodes,
    setFlowEdges,
  );
  const handleFitView = reactExports.useCallback(() => {
    syncStableZoomAfterViewportChange(
      fitView({
        padding: 0.2,
        duration: 300,
      }),
    );
  }, [fitView, syncStableZoomAfterViewportChange]);
  const handleZoomIn = reactExports.useCallback(() => {
    syncStableZoomAfterViewportChange(zoomIn());
  }, [zoomIn, syncStableZoomAfterViewportChange]);
  const handleZoomOut = reactExports.useCallback(() => {
    syncStableZoomAfterViewportChange(zoomOut());
  }, [zoomOut, syncStableZoomAfterViewportChange]);
  const handleSystemCopy = reactExports.useMemo(() => {
    if (!onSystemCopy) return void 0;
    return async () => {
      const ids2 = instance2.selection.getSelected();
      if (ids2.length === 0) return null;
      const idSet = new Set(ids2);
      const nodes = instance2.getGraph().nodes.filter((n2) => idSet.has(n2.id));
      return onSystemCopy(nodes);
    };
  }, [onSystemCopy, instance2]);
  const ensureInternalPasteInView = reactExports.useCallback(
    (_pastedIds, pastedBox) => {
      const rect = getViewportRect2();
      if (!rect || isBoxFullyVisible(pastedBox, rect)) return;
      const { transform: transform2 } = storeApi.getState();
      const currentZoom = transform2[2];
      const centerX = pastedBox.x + pastedBox.width / 2;
      const centerY = pastedBox.y + pastedBox.height / 2;
      void setCenter(centerX, centerY, {
        zoom: currentZoom,
        duration: 300,
      });
    },
    [getViewportRect2, setCenter, storeApi],
  );
  const focusDerivedNode = reactExports.useCallback(
    (nodeId, options2) => {
      if (!nodeId) return;
      const focusNow = (node2) => {
        instance2.selection.set([nodeId]);
        const mode22 = instance2.getMode();
        const ns2 = sizeOf(node2, mode22);
        const np = getNodePosition(node2, mode22);
        const nodeBox = {
          x: np.x,
          y: np.y,
          width: ns2.width,
          height: ns2.height,
        };
        if (!options2?.alwaysCenter) {
          const rect = getViewportRect2();
          if (!rect || isBoxFullyVisible(nodeBox, rect)) return;
        }
        const { transform: transform2 } = storeApi.getState();
        const currentZoom = transform2[2];
        const centerX = nodeBox.x + nodeBox.width / 2;
        const centerY = nodeBox.y + nodeBox.height / 2;
        void setCenter(centerX, centerY, {
          zoom: currentZoom,
          duration: options2?.duration ?? 300,
        });
      };
      const existing = instance2
        .getGraph()
        .nodes.find((n2) => n2.id === nodeId);
      if (existing) {
        focusNow(existing);
        return;
      }
      const FOCUS_TIMEOUT_MS = 5e3;
      let timeoutId = null;
      const unsubscribe = instance2.eventBus.on("node:added", (event) => {
        if (event.node.id !== nodeId) return;
        unsubscribe();
        if (timeoutId) clearTimeout(timeoutId);
        requestAnimationFrame(() => focusNow(event.node));
      });
      timeoutId = setTimeout(() => {
        unsubscribe();
        console.warn(
          `[focusDerivedNode] timed out after ${FOCUS_TIMEOUT_MS}ms waiting for node "${nodeId}"`,
        );
      }, FOCUS_TIMEOUT_MS);
    },
    [instance2, getViewportRect2, storeApi, setCenter],
  );
  const focusNextDerivedFrom = reactExports.useCallback(
    (sourceNodeId) => {
      if (!sourceNodeId) return;
      const FOCUS_TIMEOUT_MS = 8e3;
      let timeoutId = null;
      let unsubscribe = null;
      const focusBoth = (derivedId) => {
        const graph = instance2.getGraph();
        const currentSourceNodeId =
          instance2.resolveCurrentNodeId(sourceNodeId);
        const source = graph.nodes.find((n2) => n2.id === currentSourceNodeId);
        const derived = graph.nodes.find((n2) => n2.id === derivedId);
        if (!source || !derived) return;
        instance2.selection.clear();
        const mode22 = instance2.getMode();
        const ss2 = sizeOf(source, mode22);
        const ds = sizeOf(derived, mode22);
        const sp = getNodePosition(source, mode22);
        const dp = getNodePosition(derived, mode22);
        const minX = Math.min(sp.x, dp.x);
        const minY = Math.min(sp.y, dp.y);
        const maxX = Math.max(sp.x + ss2.width, dp.x + ds.width);
        const maxY = Math.max(sp.y + ss2.height, dp.y + ds.height);
        const unionBox = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        };
        const rect = getViewportRect2();
        if (!rect || isBoxFullyVisible(unionBox, rect)) return;
        const { transform: transform2 } = storeApi.getState();
        const currentZoom = transform2[2];
        const PADDING = 0.2;
        const usable = 1 - PADDING * 2;
        const scaleX =
          unionBox.width > 0
            ? (rect.width * usable) / unionBox.width
            : Number.POSITIVE_INFINITY;
        const scaleY =
          unionBox.height > 0
            ? (rect.height * usable) / unionBox.height
            : Number.POSITIVE_INFINITY;
        const targetZoom = currentZoom * Math.min(1, scaleX, scaleY);
        const centerX = unionBox.x + unionBox.width / 2;
        const centerY = unionBox.y + unionBox.height / 2;
        syncStableZoomAfterViewportChange(
          setCenter(centerX, centerY, {
            zoom: targetZoom,
            duration: 300,
          }),
        );
      };
      unsubscribe = instance2.eventBus.on("edge:added", (event) => {
        if (event.edge.source !== instance2.resolveCurrentNodeId(sourceNodeId))
          return;
        const derivedId = event.edge.target;
        unsubscribe?.();
        unsubscribe = null;
        if (timeoutId) clearTimeout(timeoutId);
        requestAnimationFrame(() => focusBoth(derivedId));
      });
      timeoutId = setTimeout(() => {
        unsubscribe?.();
        unsubscribe = null;
        console.warn(
          `[focusNextDerivedFrom] timed out after ${FOCUS_TIMEOUT_MS}ms waiting for a derived edge from "${sourceNodeId}"`,
        );
      }, FOCUS_TIMEOUT_MS);
    },
    [
      instance2,
      getViewportRect2,
      storeApi,
      setCenter,
      syncStableZoomAfterViewportChange,
    ],
  );
  const attachDraftOnNextDerived = reactExports.useCallback(
    (sourceNodeId, key2, draft) => {
      if (!sourceNodeId) return;
      const ATTACH_TIMEOUT_MS = 8e3;
      let timeoutId = null;
      let unsubscribe = null;
      unsubscribe = instance2.eventBus.on("edge:added", (event) => {
        if (event.edge.source !== instance2.resolveCurrentNodeId(sourceNodeId))
          return;
        const derivedId = event.edge.target;
        unsubscribe?.();
        unsubscribe = null;
        if (timeoutId) clearTimeout(timeoutId);
        const node2 = instance2
          .getGraph()
          .nodes.find((n2) => n2.id === derivedId);
        if (!node2) return;
        const prevData = node2.data ?? {};
        const prevMap = prevData[POPOVER_DRAFT_DATA_KEY] ?? {};
        const nextMap = {
          ...prevMap,
          [key2]: {
            ...draft,
            source: "user",
          },
        };
        const nextData = {
          ...prevData,
          [POPOVER_DRAFT_DATA_KEY]: nextMap,
        };
        instance2.updateNodeDataSilent(derivedId, nextData);
      });
      timeoutId = setTimeout(() => {
        unsubscribe?.();
        unsubscribe = null;
      }, ATTACH_TIMEOUT_MS);
    },
    [instance2],
  );
  useKeyboardShortcuts(instance2, {
    enabled: isPresented,
    commandRegistry,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onFitView: handleFitView,
    onHostKeyboardShortcut,
    onSystemPaste: handleSystemPaste,
    onSystemTextPaste: handleSystemTextPaste,
    onSystemCopy: handleSystemCopy,
    getCurrentWorkspace,
    ensureInternalPasteInView,
    getViewportRect: getViewportRect2,
    getViewportCenter,
    getInternalPasteAnchor,
    onCopyDebugInfo: useCopyDebugInfo(instance2),
  });
  const pendingRemoves = reactExports.useRef(null);
  const scheduleBatchRemove = reactExports.useCallback(() => {
    if (!pendingRemoves.current) return;
    queueMicrotask(() => {
      const batch2 = pendingRemoves.current;
      pendingRemoves.current = null;
      if (!batch2) return;
      instance2.removeElements(batch2.nodeIds, batch2.edgeIds);
      instance2.eventBus.emit({
        type: "persist:flush",
      });
    });
  }, [instance2]);
  const onEdgesChange = reactExports.useCallback(
    (changes) => {
      const allRemoves = changes.filter((c3) => c3.type === "remove");
      const others = changes.filter((c3) => c3.type !== "remove");
      let removes = allRemoves;
      if (allRemoves.length > 0) {
        const graph = instance2.getGraph();
        const protectedNodeIds = new Set(
          graph.nodes
            .filter((node2) => isNodeDeleteProtected(node2))
            .map((node2) => node2.id),
        );
        if (protectedNodeIds.size > 0) {
          const edgeById = new Map(graph.edges.map((e2) => [e2.id, e2]));
          removes = allRemoves.filter(
            (c3) =>
              !isEdgeAttachedToProtectedNode(
                edgeById.get(c3.id),
                protectedNodeIds,
              ),
          );
        }
      }
      if (others.length > 0) {
        defaultOnEdgesChange(others);
      }
      if (removes.length > 0) {
        if (!pendingRemoves.current) {
          pendingRemoves.current = {
            nodeIds: [],
            edgeIds: [],
          };
          scheduleBatchRemove();
        }
        pendingRemoves.current.edgeIds.push(...removes.map((c3) => c3.id));
      }
    },
    [defaultOnEdgesChange, scheduleBatchRemove, instance2],
  );
  const commitNodeMoves = reactExports.useCallback(
    (moves) => {
      if (moves.length === 0) return;
      instance2.moveNodes(moves);
      instance2.eventBus.emit({
        type: "persist:request",
      });
    },
    [instance2],
  );
  const pendingKeyboardMovesRef = reactExports.useRef(new Map());
  const keyboardMoveCommitTimerRef = reactExports.useRef(null);
  const flushKeyboardMoves = reactExports.useCallback(() => {
    if (keyboardMoveCommitTimerRef.current) {
      clearTimeout(keyboardMoveCommitTimerRef.current);
      keyboardMoveCommitTimerRef.current = null;
    }
    const pendingMoves = pendingKeyboardMovesRef.current;
    if (pendingMoves.size === 0) return;
    pendingKeyboardMovesRef.current = new Map();
    commitNodeMoves(
      Array.from(pendingMoves, ([id2, position2]) => ({
        id: id2,
        position: position2,
      })),
    );
  }, [commitNodeMoves]);
  const scheduleKeyboardMoves = reactExports.useCallback(
    (moves) => {
      if (moves.length === 0) return;
      const pendingMoves = pendingKeyboardMovesRef.current;
      for (const move of moves) {
        pendingMoves.set(move.id, {
          x: move.position.x,
          y: move.position.y,
        });
      }
      if (keyboardMoveCommitTimerRef.current) {
        clearTimeout(keyboardMoveCommitTimerRef.current);
      }
      keyboardMoveCommitTimerRef.current = setTimeout(() => {
        keyboardMoveCommitTimerRef.current = null;
        flushKeyboardMoves();
      }, KEYBOARD_MOVE_COMMIT_DELAY_MS);
    },
    [flushKeyboardMoves],
  );
  reactExports.useEffect(() => {
    return () => flushKeyboardMoves();
  }, [flushKeyboardMoves]);
  const onNodesChange = reactExports.useCallback(
    (changes) => {
      const allNodeRemoves = changes.filter((c3) => c3.type === "remove");
      const others = changes.filter((c3) => c3.type !== "remove");
      let removes = allNodeRemoves;
      if (allNodeRemoves.length > 0) {
        const nodesById = new Map(
          instance2.getGraph().nodes.map((n2) => [n2.id, n2]),
        );
        const { deletableIds, blockedCount, blockedReason } =
          partitionDeletableIds(
            allNodeRemoves.map((c3) => c3.id),
            (id2) => nodesById.get(id2),
          );
        if (blockedCount > 0) {
          instance2.eventBus.emit({
            type: "delete:blocked",
            count: blockedCount,
            reason: blockedReason ?? "generating",
          });
        }
        if (deletableIds.length !== allNodeRemoves.length) {
          const deletableIdSet = new Set(deletableIds);
          removes = allNodeRemoves.filter((c3) => deletableIdSet.has(c3.id));
        }
      }
      if (others.length > 0) {
        defaultOnNodesChange(others);
      }
      const keyboardMoves = collectCommittablePositionChanges(others);
      scheduleKeyboardMoves(keyboardMoves);
      if (removes.length > 0) {
        flushKeyboardMoves();
        if (!pendingRemoves.current) {
          pendingRemoves.current = {
            nodeIds: [],
            edgeIds: [],
          };
          scheduleBatchRemove();
        }
        pendingRemoves.current.nodeIds.push(...removes.map((c3) => c3.id));
      }
    },
    [
      defaultOnNodesChange,
      flushKeyboardMoves,
      scheduleBatchRemove,
      scheduleKeyboardMoves,
      instance2,
    ],
  );
  const onNodeDragStop = reactExports.useCallback(
    (moves) => {
      flushKeyboardMoves();
      commitNodeMoves(moves);
    },
    [commitNodeMoves, flushKeyboardMoves],
  );
  const onConnect = reactExports.useCallback(
    (connection) => {
      if (!connection.source || !connection.target) return;
      const nodesById = new Map(
        instance2.getGraph().nodes.map((n2) => [n2.id, n2]),
      );
      const oriented = orientUserEdge(
        connection.source,
        connection.target,
        (id2) => nodesById.get(id2),
      );
      const flipped = oriented.source !== connection.source;
      const edge = {
        id: `${oriented.source}->${oriented.target}`,
        source: oriented.source,
        sourceHandle:
          (flipped ? connection.targetHandle : connection.sourceHandle) ??
          void 0,
        target: oriented.target,
        targetHandle:
          (flipped ? connection.sourceHandle : connection.targetHandle) ??
          void 0,
        type: "derivation",
      };
      instance2.addEdge(edge);
      instance2.eventBus.emit({
        type: "persist:flush",
      });
    },
    [instance2],
  );
  const commands = reactExports.useMemo(
    () => ({
      addNode: (props) => {
        const mode22 = instance2.getMode();
        const node2 = {
          id: props.id ?? generateNodeId(),
          type: props.type,
          positions: {
            [mode22]: props.position ?? {
              x: 100,
              y: 100,
            },
          },
          data: props.data ?? {},
          ...(props.size
            ? {
                size: props.size,
              }
            : {}),
          ...(props.isEmpty
            ? {
                isEmpty: true,
              }
            : {}),
        };
        instance2.addNode(node2);
        instance2.eventBus.emit({
          type: "persist:flush",
        });
      },
      removeNodes: (ids2) => {
        instance2.removeNodes(ids2);
        instance2.eventBus.emit({
          type: "persist:flush",
        });
      },
      autoLayout: async (strategy) => {
        let checkpoint = null;
        await instance2.autoLayout(
          strategy,
          collectMeasuredSizes(storeApi),
          (next2) => {
            checkpoint = next2;
          },
        );
        instance2.eventBus.emit({
          type: "persist:request",
        });
        requestAnimationFrame(() => {
          syncStableZoomAfterViewportChange(
            fitView({
              padding: 0.2,
              duration: 300,
            }),
          );
        });
        return toHistoryActionResult(checkpoint, instance2);
      },
      autoLayoutByCategory: async () => {
        let checkpoint = null;
        await instance2.autoLayoutByCategory(
          collectMeasuredSizes(storeApi),
          (next2) => {
            checkpoint = next2;
          },
        );
        instance2.eventBus.emit({
          type: "persist:request",
        });
        requestAnimationFrame(() => {
          syncStableZoomAfterViewportChange(
            fitView({
              padding: 0.2,
              duration: 300,
            }),
          );
        });
        return toHistoryActionResult(checkpoint, instance2);
      },
      autoLayoutAll: async (layout, includeDeps, sortBy = "name") => {
        let checkpoint = null;
        let applied = false;
        const sort = {
          sortBy,
          assetName: (node2) => {
            const assets = assetMetadataStore.getState();
            return (
              assets.get(node2.assetId ?? node2.id)?.name ??
              assets.get(node2.id)?.name
            );
          },
        };
        await instance2.autoLayoutAll(
          layout,
          includeDeps,
          collectMeasuredSizes(storeApi),
          (next2, accepted) => {
            checkpoint = next2;
            applied = accepted === true;
          },
          sort,
        );
        if (applied)
          instance2.eventBus.emit({
            type: "persist:request",
          });
        requestAnimationFrame(() => {
          syncStableZoomAfterViewportChange(
            fitView({
              padding: 0.2,
              duration: 300,
            }),
          );
        });
        return {
          ...toHistoryActionResult(checkpoint, instance2),
          applied,
        };
      },
      autoLayoutSubset: async (
        nodeIds,
        layout,
        includeDeps,
        sortBy = "name",
      ) => {
        let checkpoint = null;
        let applied = false;
        const sort = {
          sortBy,
          assetName: (node2) => {
            const assets = assetMetadataStore.getState();
            return (
              assets.get(node2.assetId ?? node2.id)?.name ??
              assets.get(node2.id)?.name
            );
          },
        };
        await instance2.autoLayoutSubset(
          nodeIds,
          layout,
          includeDeps,
          collectMeasuredSizes(storeApi),
          {
            sort,
            onCommit: (next2, accepted) => {
              checkpoint = next2;
              applied = accepted === true;
            },
          },
        );
        if (applied)
          instance2.eventBus.emit({
            type: "persist:request",
          });
        return {
          ...toHistoryActionResult(checkpoint, instance2),
          applied,
        };
      },
      tidyGroupChildren: async (
        groupId2,
        layout,
        includeDeps,
        sortBy = "name",
      ) => {
        let checkpoint = null;
        let applied = false;
        const sort = {
          sortBy,
          assetName: (node2) => {
            const assets = assetMetadataStore.getState();
            return (
              assets.get(node2.assetId ?? node2.id)?.name ??
              assets.get(node2.id)?.name
            );
          },
        };
        await instance2.relayoutGroupWithDagre(
          groupId2,
          layout,
          includeDeps,
          collectMeasuredSizes(storeApi),
          (next2, accepted) => {
            checkpoint = next2;
            applied = accepted === true;
          },
          sort,
        );
        if (applied)
          instance2.eventBus.emit({
            type: "persist:request",
          });
        return {
          ...toHistoryActionResult(checkpoint, instance2),
          applied,
        };
      },
      tidyGroupChildrenSubset: async (
        groupId2,
        childIds,
        layout,
        sortBy = "name",
      ) => {
        let checkpoint = null;
        let applied = false;
        const sort = {
          sortBy,
          assetName: (node2) => {
            const assets = assetMetadataStore.getState();
            return (
              assets.get(node2.assetId ?? node2.id)?.name ??
              assets.get(node2.id)?.name
            );
          },
        };
        await instance2.autoLayoutGroupChildrenSubset(
          groupId2,
          childIds,
          layout,
          collectMeasuredSizes(storeApi),
          (next2, accepted) => {
            checkpoint = next2;
            applied = accepted === true;
          },
          sort,
        );
        if (applied)
          instance2.eventBus.emit({
            type: "persist:request",
          });
        return {
          ...toHistoryActionResult(checkpoint, instance2),
          applied,
        };
      },
      undo: () => instance2.undo(),
      redo: () => instance2.redo(),
      switchMode: (m3) => instance2.switchMode(m3),
    }),
    [
      instance2,
      fitView,
      syncStableZoomAfterViewportChange,
      storeApi,
      assetMetadataStore,
    ],
  );
  return {
    nodes: flowNodes,
    edges: flowEdges,
    selectedIds,
    loading,
    initialHydratedNodeCount,
    loadError,
    loadRetrying,
    retryLoad,
    mode: instance2.getMode(),
    commandRegistry,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStop,
    commands,
    instance: instance2,
    savedPositionsRef,
    hiddenAssetIdsRef,
    getDropPosition,
    clientToFlowPosition,
    focusDerivedNode,
    focusNextDerivedFrom,
    attachDraftOnNextDerived,
    syncingRef,
  };
}
