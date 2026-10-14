// use-canvas.js
import { CanvasNodeType, reactExports, useTranslation } from "../vendor.js";
import { useEdgesState, useNodesState, useReactFlow, useStoreApi } from "../vendor-fork/xyflow/react/index.js";
import { dedupedToast, useAssetMetadataApi } from "../infra/agent-http-client.js";
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
  for (const [id, entry] of nodeLookup) {
    const measuredSize = entry.measured;
    if (measuredSize?.width && measuredSize?.height && measuredSize.width > 0 && measuredSize.height > 0) {
      measured.set(id, {
        width: Math.round(measuredSize.width),
        height: Math.round(measuredSize.height),
      });
    }
  }
  return measured.size > 0 ? measured : void 0;
}
function toHistoryActionResult(checkpoint, instance) {
  const current =
    checkpoint && instance.history.isCheckpointCurrent(checkpoint)
      ? checkpoint
      : null;
  return {
    changed: current !== null,
    checkpoint: current,
  };
}
const KEYBOARD_MOVE_COMMIT_DELAY_MS = 200;
function generateNodeId() {
  return crypto.randomUUID();
}
function isBoxFullyVisible(box, rect) {
  return (
    box.x >= rect.x &&
    box.y >= rect.y &&
    box.x + box.width <= rect.x + rect.width &&
    box.y + box.height <= rect.y + rect.height
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
  COMMAND_DEFINITIONS.map((definition) => [definition.id, definition]),
);
function createCanvasCommandRegistry(resolveHandlers) {
  return {
    definitions: COMMAND_DEFINITIONS,
    get(id) {
      const definition = DEFINITIONS_BY_ID.get(id);
      if (!definition) throw new Error(`Unknown canvas command: ${id}`);
      return definition;
    },
    hasHandler(id) {
      return typeof resolveHandlers()[id] === "function";
    },
    execute(id, source) {
      const handler = resolveHandlers()[id];
      if (!handler) return false;
      handler(source);
      return true;
    },
  };
}
function selectMouseAnchor(opts) {
  const { mouseScreen, containerRect, screenToFlow } = opts;
  if (!mouseScreen || !containerRect) return null;
  const { x: mouseClientX, y: mouseClientY } = mouseScreen;
  if (
    mouseClientX < containerRect.left ||
    mouseClientX > containerRect.right ||
    mouseClientY < containerRect.top ||
    mouseClientY > containerRect.bottom
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
function toFlowNode(node, mode, selectedNodeIds, hidden) {
  const selected = selectedNodeIds ? selectedNodeIds.has(node.id) : void 0;
  const rawSize = isIdleEmptyVideoNode(node)
    ? VIDEO_EMPTY_CARD_SIZE
    : getNodeSize(node, mode);
  const collapsed = !!node.meta?.collapsed;
  const isCollapsedGroup = collapsed && node.type === CanvasNodeType.Group;
  const errorData = node.data;
  const isAutoSizedVideoError =
    node.type === CanvasNodeType.Video &&
    isGenerationErrorStatus(errorData?.status) &&
    typeof errorData?.errorMessage === "string" &&
    errorData.errorMessage.length > 0;
  const isCompactFile =
    node.type === CanvasNodeType.File &&
    !isPluginNode(node) &&
    node.data?.viewMode !== "preview";
  const size = isAutoSizedVideoError
    ? void 0
    : isCollapsedGroup
      ? COLLAPSED_GROUP_FLOW_SIZE
      : node.type === CanvasNodeType.Placeholder
        ? resolvePlaceholderFlowSize(node, rawSize)
        : isCompactFile
          ? FILE_CARD_DEFAULT_SIZE
          : rawSize;
  const position = getNodePosition(node, mode);
  return {
    id: node.id,
    type: node.type,
    position,
    data: node.data,
    ...(size
      ? {
          width: size.width,
          height: size.height,
        }
      : {}),
    ...(node.meta?.zIndex !== void 0
      ? {
          zIndex: node.meta.zIndex,
        }
      : {}),
    // Collapsed groups still allow dragging, but only via the floating chip —
    // the `dragHandle` selector below restricts ReactFlow's d3-drag listener
    // to elements matching `.canvas-group-collapsed-drag-handle` (the label
    // text inside the chip). The wrapper itself shrinks to
    // `COLLAPSED_GROUP_FLOW_SIZE` (1x1) and is `pointer-events: none` in
    // `canvas-overrides.css`, so scoping the handle keeps the drag affordance
    // on the chip rather than on an invisible wrapper box.
    draggable: !node.meta?.locked,
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
      : selected !== void 0
        ? {
            selected,
          }
        : {}),
    ...(node.parentId
      ? {
          parentId: node.parentId,
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
function toFlowNodes(nodes, mode, selectedNodeIds, hiddenNodeIds) {
  return nodes.map((node) =>
    toFlowNode(
      node,
      mode,
      selectedNodeIds,
      node.meta?.hidden || hiddenNodeIds?.has(node.id) || void 0,
    ),
  );
}
function toFlowNodesMemo(cache, nodes, mode, selectedNodeIds, hiddenNodeIds) {
  const result = new Array(nodes.length);
  const next = new Map();
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    const selected = selectedNodeIds ? selectedNodeIds.has(node.id) : void 0;
    const hidden =
      node.meta?.hidden ||
      (hiddenNodeIds ? hiddenNodeIds.has(node.id) : false);
    const prev = cache.get(node.id);
    if (
      prev &&
      prev.input === node &&
      prev.selected === selected &&
      prev.mode === mode &&
      prev.hidden === hidden
    ) {
      result[index] = prev.output;
      next.set(node.id, prev);
    } else {
      const output = toFlowNode(
        node,
        mode,
        selectedNodeIds,
        hidden || void 0,
      );
      const entry = {
        input: node,
        selected,
        mode,
        hidden,
        output,
      };
      result[index] = output;
      next.set(node.id, entry);
    }
  }
  cache.clear();
  for (const [nodeId, cacheEntry] of next) cache.set(nodeId, cacheEntry);
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
  for (const node of nodes) {
    if (node.meta?.hidden) {
      hidden ??= new Set();
      hidden.add(node.id);
    }
    if (node.type !== CanvasNodeType.Group) continue;
    if (node.meta?.collapsed) {
      collapsedGroups ??= new Set();
      collapsedGroups.add(node.id);
    }
  }
  if (collapsedGroups) {
    for (const node of nodes) {
      if (node.parentId && collapsedGroups.has(node.parentId)) {
        hidden ??= new Set();
        hidden.add(node.id);
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
function mergeHiddenSets(firstSet, secondSet) {
  if (!firstSet) return secondSet;
  if (!secondSet) return firstSet;
  const out = new Set(firstSet);
  for (const id of secondSet) out.add(id);
  return out;
}
function buildIndexById(items) {
  return new Map(items.map((item, index) => [item.id, index]));
}
function selectionKey(ids) {
  return Array.from(ids).sort().join("|");
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
  const ids = new Set();
  for (const node of nodes) {
    if (node.meta?.hidden) ids.add(node.id);
  }
  return ids.size > 0 ? ids : void 0;
}
function syncFlowGraph(
  instance,
  graph,
  selected,
  flowNodeCache,
  setFlowNodes,
  setFlowEdges,
) {
  const mode = instance.getMode();
  const preparedNodes = prepareNodesForFlow(
    graph.nodes,
    instance.getChildCountByParent(),
  );
  const hiddenIds = mergeHiddenSets(
    collectHiddenChildIds(preparedNodes),
    collectMetaHiddenIds(preparedNodes),
  );
  setFlowNodes(
    toFlowNodesMemo(flowNodeCache, preparedNodes, mode, selected, hiddenIds),
  );
  setFlowEdges(toFlowEdges(graph.edges, selected, hiddenIds));
  if (flowNodeCache.size > preparedNodes.length) {
    const liveIds = new Set(preparedNodes.map((node) => node.id));
    for (const id of flowNodeCache.keys()) {
      if (!liveIds.has(id)) flowNodeCache.delete(id);
    }
  }
}
function useGraphSync(instance, setFlowNodes, setFlowEdges) {
  const [selectedIds, setSelectedIds] = reactExports.useState([]);
  const selectedIdsRef = reactExports.useRef(new Set());
  const nodeIndexByIdRef = reactExports.useRef(new Map());
  const edgeIndexByIdRef = reactExports.useRef(new Map());
  const edgeIdsByNodeRef = reactExports.useRef(new Map());
  const flowNodeCacheRef = reactExports.useRef(new Map());
  const lastSyncedSelectionKeyRef = reactExports.useRef(null);
  const syncingRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    return instance.onGraphChange((graph) => {
      syncingRef.current = true;
      const selected = new Set(instance.selection.getSelected());
      selectedIdsRef.current = selected;
      lastSyncedSelectionKeyRef.current = selectionKey(selected);
      nodeIndexByIdRef.current = buildIndexById(graph.nodes);
      edgeIndexByIdRef.current = buildIndexById(graph.edges);
      edgeIdsByNodeRef.current = buildEdgeIdsByNode(graph.edges);
      syncFlowGraph(
        instance,
        graph,
        selected,
        flowNodeCacheRef.current,
        setFlowNodes,
        setFlowEdges,
      );
      queueMicrotask(() => {
        syncingRef.current = false;
      });
    });
  }, [instance, setFlowNodes, setFlowEdges]);
  reactExports.useEffect(() => {
    return instance.eventBus.on(
      "node:data-silent-changed",
      ({ nodeId, data }) => {
        const entry = flowNodeCacheRef.current.get(nodeId);
        if (entry && entry.output.data !== data) {
          entry.output = {
            ...entry.output,
            data,
          };
        }
        setFlowNodes((nodes) => {
          const index = nodes.findIndex((candidateNode) => candidateNode.id === nodeId);
          if (index === -1) return nodes;
          const node = nodes[index];
          if (node.data === data) return nodes;
          const next = [...nodes];
          next[index] = {
            ...node,
            data,
          };
          return next;
        });
      },
    );
  }, [instance, setFlowNodes]);
  reactExports.useEffect(() => {
    return instance.selection.onChange((ids) => {
      const prevSelected = selectedIdsRef.current;
      const selected = new Set(ids);
      const changedNodeIds = new Set();
      for (const id of prevSelected) {
        if (!selected.has(id)) changedNodeIds.add(id);
      }
      for (const id of selected) {
        if (!prevSelected.has(id)) changedNodeIds.add(id);
      }
      selectedIdsRef.current = selected;
      setSelectedIds(ids);
      if (changedNodeIds.size === 0) return;
      const key = selectionKey(selected);
      if (key === lastSyncedSelectionKeyRef.current) return;
      lastSyncedSelectionKeyRef.current = key;
      for (const nodeId of changedNodeIds) {
        const entry = flowNodeCacheRef.current.get(nodeId);
        const nextSelected = selected.has(nodeId);
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
          const index = nodeIndexByIdRef.current.get(nodeId);
          if (index === void 0) {
            shouldFallback = true;
            break;
          }
          const node = (nextNodes ?? nodes)[index];
          if (!node || node.id !== nodeId) {
            shouldFallback = true;
            break;
          }
          const nextSelected = selected.has(nodeId);
          if (node.selected === nextSelected) continue;
          nextNodes ??= [...nodes];
          const updated = {
            ...node,
            selected: nextSelected,
          };
          nextNodes[index] = updated;
        }
        if (shouldFallback) {
          const preparedNodes = prepareNodesForFlow(
            instance.getGraph().nodes,
            instance.getChildCountByParent(),
          );
          return toFlowNodes(
            preparedNodes,
            instance.getMode(),
            selected,
            mergeHiddenSets(
              collectHiddenChildIds(preparedNodes),
              collectMetaHiddenIds(preparedNodes),
            ),
          );
        }
        return nextNodes ?? nodes;
      });
      const graph = instance.getGraph();
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
          const index = edgeIndexByIdRef.current.get(edgeId);
          if (index === void 0) {
            shouldFallback = true;
            break;
          }
          const edge = (nextEdges ?? edges)[index];
          if (!edge || edge.id !== edgeId) {
            shouldFallback = true;
            break;
          }
          const nextSelected =
            selected.has(edge.source) || selected.has(edge.target);
          if (edge.selected === nextSelected) continue;
          nextEdges ??= [...edges];
          nextEdges[index] = {
            ...edge,
            selected: nextSelected,
          };
        }
        if (shouldFallback) {
          const preparedNodes = prepareNodesForFlow(
            graph.nodes,
            instance.getChildCountByParent(),
          );
          return toFlowEdges(
            graph.edges,
            selected,
            collectHiddenChildIds(preparedNodes),
          );
        }
        return nextEdges ?? edges;
      });
    });
  }, [instance, setFlowNodes, setFlowEdges]);
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
function readStr(data, key) {
  if (!data) return void 0;
  const value = data[key];
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function buildDebugInfo(node, ctx = {}) {
  const data = node.data ?? {};
  let status = "unknown";
  const placeholderStatus = readStr(data, "status");
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
    readStr(data, "cloudTraceId") ??
    ctx.meta?.cloudTraceId ??
    ctx.generating?.traceId;
  const cloudTaskId =
    readStr(data, "cloudTaskId") ??
    ctx.meta?.cloudTaskId ??
    ctx.generating?.cloudTaskId;
  const providerTaskId =
    readStr(data, "providerTaskId") ?? ctx.meta?.providerTaskId;
  return {
    timestamp: new Date().toISOString(),
    nodeId: node.id,
    nodeType: node.type,
    ...(isAssetBackedNode(node.type)
      ? {
          assetId: parseNodeId(node.id).assetId,
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
    ...(status === "error" && readStr(data, "errorMessage")
      ? {
          errorMessage: readStr(data, "errorMessage"),
        }
      : {}),
    ...(ctx.meta?.model
      ? {
          model: ctx.meta.model,
        }
      : readStr(data, "model")
        ? {
            model: readStr(data, "model"),
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
    ...(shortenPrompt(ctx.meta?.prompt ?? readStr(data, "prompt"))
      ? {
          promptPreview: shortenPrompt(
            ctx.meta?.prompt ?? readStr(data, "prompt"),
          ),
        }
      : {}),
  };
}
function shortTraceId(traceId) {
  if (!traceId) return void 0;
  return traceId.length > 8 ? `${traceId.slice(0, 8)}…` : traceId;
}
function collectPayloads(instance, assetStore, generatingStore, nodeIds) {
  const graph = instance.getGraph();
  const lookup = new Map(graph.nodes.map((node) => [node.id, node]));
  const generating = generatingStore.getState().byNode;
  const payloads = [];
  for (const id of nodeIds) {
    const node = lookup.get(id);
    if (!node) continue;
    payloads.push(
      buildDebugInfo(node, {
        meta: getAssetMetaByNodeIdFromStore(assetStore, id),
        generating: generating.get(id),
      }),
    );
  }
  return payloads;
}
function useCopyDebugInfo(instance) {
  const { t: translate } = useTranslation();
  const assetStore = useAssetMetadataApi();
  const generatingStore = useGeneratingStateApi();
  const copyDebugShortcut = resolveCanvasShortcut("copyDebug").join(
    resolveCanvasPlatform() === "mac" ? "" : "+",
  );
  return reactExports.useCallback(
    (args) => {
      const targetIds = args?.nodeIds ?? instance.selection.getSelected();
      if (targetIds.length === 0) {
        dedupedToast.info(
          translate(
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
        instance,
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
      const firstTrace = payloads.find((payload) => payload.cloudTraceId)?.cloudTraceId;
      const tracePreview = shortTraceId(firstTrace);
      const writeClipboard = async () => {
        if (
          typeof navigator === "undefined" ||
          !navigator.clipboard?.writeText
        ) {
          dedupedToast.error(
            translate("canvas.debug.clipboardUnavailable", "Clipboard not available"),
          );
          return;
        }
        try {
          await navigator.clipboard.writeText(serialised);
          if (tracePreview) {
            dedupedToast.success(
              translate(
                "canvas.debug.copied",
                "Debug info copied (Trace ID: {{trace}})",
                {
                  trace: tracePreview,
                },
              ),
            );
          } else {
            dedupedToast.success(
              translate(
                "canvas.debug.copiedNoTrace",
                "Debug info copied (no Trace ID — legacy asset)",
              ),
            );
          }
        } catch (err) {
          dedupedToast.error(
            translate("canvas.debug.copyFailed", "Copy failed: {{message}}", {
              message: err instanceof Error ? err.message : String(err),
            }),
          );
        }
      };
      void writeClipboard();
    },
    [instance, assetStore, generatingStore, translate, copyDebugShortcut],
  );
}
function useCanvasInstance(mode, plugins) {
  const pluginsRef = reactExports.useRef(plugins);
  pluginsRef.current = plugins;
  const [instance] = reactExports.useState(() => {
    const inst = new CanvasInstance(mode);
    if (pluginsRef.current) {
      for (const plugin of pluginsRef.current) {
        inst.applyPlugin(plugin);
      }
    }
    return inst;
  });
  reactExports.useEffect(() => {
    return () => instance.dispose();
  }, [instance]);
  reactExports.useEffect(() => {
    if (instance.getMode() !== mode) {
      instance.switchMode(mode);
    }
  }, [mode, instance]);
  return instance;
}
export function useCanvas(options) {
  const {
    mode,
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
  const getViewportRect = reactExports.useCallback(() => {
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
    const handleMove = (mouseEvent) => {
      mouseScreenRef.current = {
        x: mouseEvent.clientX,
        y: mouseEvent.clientY,
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
    return (text) => onSystemTextPaste(text, getPastePosition());
  }, [onSystemTextPaste, getPastePosition]);
  const instance = useCanvasInstance(mode, plugins);
  const commandRegistry = reactExports.useMemo(
    () => createCanvasCommandRegistry(commandHandlers ?? (() => ({}))),
    [commandHandlers],
  );
  const workspaceId = getCurrentWorkspace?.();
  const {
    loading,
    initialHydratedNodeCount,
    loadError,
    loadRetrying,
    retryLoad,
    savedPositionsRef,
    hiddenAssetIdsRef,
  } = useCanvasData(instance, mode, dataSource, getViewportCenter, {
    onNodesAdded,
    onFirstNodesPlaced,
    workspaceId,
  });
  const { selectedIds, syncingRef } = useGraphSync(
    instance,
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
      const ids = instance.selection.getSelected();
      if (ids.length === 0) return null;
      const idSet = new Set(ids);
      const nodes = instance.getGraph().nodes.filter((node) => idSet.has(node.id));
      return onSystemCopy(nodes);
    };
  }, [onSystemCopy, instance]);
  const ensureInternalPasteInView = reactExports.useCallback(
    (_pastedIds, pastedBox) => {
      const rect = getViewportRect();
      if (!rect || isBoxFullyVisible(pastedBox, rect)) return;
      const { transform } = storeApi.getState();
      const currentZoom = transform[2];
      const centerX = pastedBox.x + pastedBox.width / 2;
      const centerY = pastedBox.y + pastedBox.height / 2;
      void setCenter(centerX, centerY, {
        zoom: currentZoom,
        duration: 300,
      });
    },
    [getViewportRect, setCenter, storeApi],
  );
  const focusDerivedNode = reactExports.useCallback(
    (nodeId, options) => {
      if (!nodeId) return;
      const focusNow = (node) => {
        instance.selection.set([nodeId]);
        const mode = instance.getMode();
        const nodeSize = sizeOf(node, mode);
        const np = getNodePosition(node, mode);
        const nodeBox = {
          x: np.x,
          y: np.y,
          width: nodeSize.width,
          height: nodeSize.height,
        };
        if (!options?.alwaysCenter) {
          const rect = getViewportRect();
          if (!rect || isBoxFullyVisible(nodeBox, rect)) return;
        }
        const { transform } = storeApi.getState();
        const currentZoom = transform[2];
        const centerX = nodeBox.x + nodeBox.width / 2;
        const centerY = nodeBox.y + nodeBox.height / 2;
        void setCenter(centerX, centerY, {
          zoom: currentZoom,
          duration: options?.duration ?? 300,
        });
      };
      const existing = instance
        .getGraph()
        .nodes.find((node) => node.id === nodeId);
      if (existing) {
        focusNow(existing);
        return;
      }
      const FOCUS_TIMEOUT_MS = 5e3;
      let timeoutId = null;
      const unsubscribe = instance.eventBus.on("node:added", (event) => {
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
    [instance, getViewportRect, storeApi, setCenter],
  );
  const focusNextDerivedFrom = reactExports.useCallback(
    (sourceNodeId) => {
      if (!sourceNodeId) return;
      const FOCUS_TIMEOUT_MS = 8e3;
      let timeoutId = null;
      let unsubscribe = null;
      const focusBoth = (derivedId) => {
        const graph = instance.getGraph();
        const currentSourceNodeId =
          instance.resolveCurrentNodeId(sourceNodeId);
        const source = graph.nodes.find((node) => node.id === currentSourceNodeId);
        const derived = graph.nodes.find((node) => node.id === derivedId);
        if (!source || !derived) return;
        instance.selection.clear();
        const mode = instance.getMode();
        const sourceSize = sizeOf(source, mode);
        const ds = sizeOf(derived, mode);
        const sp = getNodePosition(source, mode);
        const dp = getNodePosition(derived, mode);
        const minX = Math.min(sp.x, dp.x);
        const minY = Math.min(sp.y, dp.y);
        const maxX = Math.max(sp.x + sourceSize.width, dp.x + ds.width);
        const maxY = Math.max(sp.y + sourceSize.height, dp.y + ds.height);
        const unionBox = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        };
        const rect = getViewportRect();
        if (!rect || isBoxFullyVisible(unionBox, rect)) return;
        const { transform } = storeApi.getState();
        const currentZoom = transform[2];
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
      unsubscribe = instance.eventBus.on("edge:added", (event) => {
        if (event.edge.source !== instance.resolveCurrentNodeId(sourceNodeId))
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
      instance,
      getViewportRect,
      storeApi,
      setCenter,
      syncStableZoomAfterViewportChange,
    ],
  );
  const attachDraftOnNextDerived = reactExports.useCallback(
    (sourceNodeId, key, draft) => {
      if (!sourceNodeId) return;
      const ATTACH_TIMEOUT_MS = 8e3;
      let timeoutId = null;
      let unsubscribe = null;
      unsubscribe = instance.eventBus.on("edge:added", (event) => {
        if (event.edge.source !== instance.resolveCurrentNodeId(sourceNodeId))
          return;
        const derivedId = event.edge.target;
        unsubscribe?.();
        unsubscribe = null;
        if (timeoutId) clearTimeout(timeoutId);
        const node = instance
          .getGraph()
          .nodes.find((node) => node.id === derivedId);
        if (!node) return;
        const prevData = node.data ?? {};
        const prevMap = prevData[POPOVER_DRAFT_DATA_KEY] ?? {};
        const nextMap = {
          ...prevMap,
          [key]: {
            ...draft,
            source: "user",
          },
        };
        const nextData = {
          ...prevData,
          [POPOVER_DRAFT_DATA_KEY]: nextMap,
        };
        instance.updateNodeDataSilent(derivedId, nextData);
      });
      timeoutId = setTimeout(() => {
        unsubscribe?.();
        unsubscribe = null;
      }, ATTACH_TIMEOUT_MS);
    },
    [instance],
  );
  useKeyboardShortcuts(instance, {
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
    getViewportRect,
    getViewportCenter,
    getInternalPasteAnchor,
    onCopyDebugInfo: useCopyDebugInfo(instance),
  });
  const pendingRemoves = reactExports.useRef(null);
  const scheduleBatchRemove = reactExports.useCallback(() => {
    if (!pendingRemoves.current) return;
    queueMicrotask(() => {
      const batch = pendingRemoves.current;
      pendingRemoves.current = null;
      if (!batch) return;
      instance.removeElements(batch.nodeIds, batch.edgeIds);
      instance.eventBus.emit({
        type: "persist:flush",
      });
    });
  }, [instance]);
  const onEdgesChange = reactExports.useCallback(
    (changes) => {
      const allRemoves = changes.filter((change) => change.type === "remove");
      const others = changes.filter((change) => change.type !== "remove");
      let removes = allRemoves;
      if (allRemoves.length > 0) {
        const graph = instance.getGraph();
        const protectedNodeIds = new Set(
          graph.nodes
            .filter((node) => isNodeDeleteProtected(node))
            .map((node) => node.id),
        );
        if (protectedNodeIds.size > 0) {
          const edgeById = new Map(graph.edges.map((edge) => [edge.id, edge]));
          removes = allRemoves.filter(
            (change) =>
              !isEdgeAttachedToProtectedNode(
                edgeById.get(change.id),
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
        pendingRemoves.current.edgeIds.push(...removes.map((change) => change.id));
      }
    },
    [defaultOnEdgesChange, scheduleBatchRemove, instance],
  );
  const commitNodeMoves = reactExports.useCallback(
    (moves) => {
      if (moves.length === 0) return;
      instance.moveNodes(moves);
      instance.eventBus.emit({
        type: "persist:request",
      });
    },
    [instance],
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
      Array.from(pendingMoves, ([id, position]) => ({
        id,
        position,
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
      const allNodeRemoves = changes.filter((change) => change.type === "remove");
      const others = changes.filter((change) => change.type !== "remove");
      let removes = allNodeRemoves;
      if (allNodeRemoves.length > 0) {
        const nodesById = new Map(
          instance.getGraph().nodes.map((node) => [node.id, node]),
        );
        const { deletableIds, blockedCount, blockedReason } =
          partitionDeletableIds(
            allNodeRemoves.map((change) => change.id),
            (id) => nodesById.get(id),
          );
        if (blockedCount > 0) {
          instance.eventBus.emit({
            type: "delete:blocked",
            count: blockedCount,
            reason: blockedReason ?? "generating",
          });
        }
        if (deletableIds.length !== allNodeRemoves.length) {
          const deletableIdSet = new Set(deletableIds);
          removes = allNodeRemoves.filter((change) => deletableIdSet.has(change.id));
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
        pendingRemoves.current.nodeIds.push(...removes.map((change) => change.id));
      }
    },
    [
      defaultOnNodesChange,
      flushKeyboardMoves,
      scheduleBatchRemove,
      scheduleKeyboardMoves,
      instance,
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
        instance.getGraph().nodes.map((node) => [node.id, node]),
      );
      const oriented = orientUserEdge(
        connection.source,
        connection.target,
        (id) => nodesById.get(id),
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
      instance.addEdge(edge);
      instance.eventBus.emit({
        type: "persist:flush",
      });
    },
    [instance],
  );
  const commands = reactExports.useMemo(
    () => ({
      addNode: (props) => {
        const mode = instance.getMode();
        const node = {
          id: props.id ?? generateNodeId(),
          type: props.type,
          positions: {
            [mode]: props.position ?? {
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
        instance.addNode(node);
        instance.eventBus.emit({
          type: "persist:flush",
        });
      },
      removeNodes: (ids) => {
        instance.removeNodes(ids);
        instance.eventBus.emit({
          type: "persist:flush",
        });
      },
      autoLayout: async (strategy) => {
        let checkpoint = null;
        await instance.autoLayout(
          strategy,
          collectMeasuredSizes(storeApi),
          (next) => {
            checkpoint = next;
          },
        );
        instance.eventBus.emit({
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
        return toHistoryActionResult(checkpoint, instance);
      },
      autoLayoutByCategory: async () => {
        let checkpoint = null;
        await instance.autoLayoutByCategory(
          collectMeasuredSizes(storeApi),
          (next) => {
            checkpoint = next;
          },
        );
        instance.eventBus.emit({
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
        return toHistoryActionResult(checkpoint, instance);
      },
      autoLayoutAll: async (layout, includeDeps, sortBy = "name") => {
        let checkpoint = null;
        let applied = false;
        const sort = {
          sortBy,
          assetName: (node) => {
            const assets = assetMetadataStore.getState();
            return (
              assets.get(node.assetId ?? node.id)?.name ??
              assets.get(node.id)?.name
            );
          },
        };
        await instance.autoLayoutAll(
          layout,
          includeDeps,
          collectMeasuredSizes(storeApi),
          (next, accepted) => {
            checkpoint = next;
            applied = accepted === true;
          },
          sort,
        );
        if (applied)
          instance.eventBus.emit({
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
          ...toHistoryActionResult(checkpoint, instance),
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
          assetName: (node) => {
            const assets = assetMetadataStore.getState();
            return (
              assets.get(node.assetId ?? node.id)?.name ??
              assets.get(node.id)?.name
            );
          },
        };
        await instance.autoLayoutSubset(
          nodeIds,
          layout,
          includeDeps,
          collectMeasuredSizes(storeApi),
          {
            sort,
            onCommit: (next, accepted) => {
              checkpoint = next;
              applied = accepted === true;
            },
          },
        );
        if (applied)
          instance.eventBus.emit({
            type: "persist:request",
          });
        return {
          ...toHistoryActionResult(checkpoint, instance),
          applied,
        };
      },
      tidyGroupChildren: async (
        groupId,
        layout,
        includeDeps,
        sortBy = "name",
      ) => {
        let checkpoint = null;
        let applied = false;
        const sort = {
          sortBy,
          assetName: (node) => {
            const assets = assetMetadataStore.getState();
            return (
              assets.get(node.assetId ?? node.id)?.name ??
              assets.get(node.id)?.name
            );
          },
        };
        await instance.relayoutGroupWithDagre(
          groupId,
          layout,
          includeDeps,
          collectMeasuredSizes(storeApi),
          (next, accepted) => {
            checkpoint = next;
            applied = accepted === true;
          },
          sort,
        );
        if (applied)
          instance.eventBus.emit({
            type: "persist:request",
          });
        return {
          ...toHistoryActionResult(checkpoint, instance),
          applied,
        };
      },
      tidyGroupChildrenSubset: async (
        groupId,
        childIds,
        layout,
        sortBy = "name",
      ) => {
        let checkpoint = null;
        let applied = false;
        const sort = {
          sortBy,
          assetName: (node) => {
            const assets = assetMetadataStore.getState();
            return (
              assets.get(node.assetId ?? node.id)?.name ??
              assets.get(node.id)?.name
            );
          },
        };
        await instance.autoLayoutGroupChildrenSubset(
          groupId,
          childIds,
          layout,
          collectMeasuredSizes(storeApi),
          (next, accepted) => {
            checkpoint = next;
            applied = accepted === true;
          },
          sort,
        );
        if (applied)
          instance.eventBus.emit({
            type: "persist:request",
          });
        return {
          ...toHistoryActionResult(checkpoint, instance),
          applied,
        };
      },
      undo: () => instance.undo(),
      redo: () => instance.redo(),
      switchMode: (mode) => instance.switchMode(mode),
    }),
    [
      instance,
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
    mode: instance.getMode(),
    commandRegistry,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStop,
    commands,
    instance,
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
