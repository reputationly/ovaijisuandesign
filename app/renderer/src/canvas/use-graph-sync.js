// use-graph-sync.js
import { CanvasNodeType, reactExports } from "../vendor.js";
import { toFlowNode } from "./apply-changeset-to-draft.js";
import { INTERNAL_COPY_HTML_MARKER, normaliseHandle } from "./remap-clipboard.js";
import { GROUP_DERIVED_CHILD_COUNT_KEY, GROUP_DERIVED_COLLAPSED_KEY } from "./use-file-bytes.js";
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
    const hidden = node2.meta?.hidden || (hiddenNodeIds ? hiddenNodeIds.has(node2.id) : false);
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
      const output = toFlowNode(node2, mode2, selectedNodeIds, hidden || void 0);
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
function toFlowEdge(edge, selectedNodeIds, hidden) {
  const selected2 = selectedNodeIds
    ? selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target)
    : void 0;
  const sourceHandle = normaliseHandle(edge.sourceHandle);
  const targetHandle = normaliseHandle(edge.targetHandle);
  return {
    id: edge.id,
    source: edge.source,
    ...(sourceHandle !== void 0
      ? {
          sourceHandle,
        }
      : {}),
    target: edge.target,
    ...(targetHandle !== void 0
      ? {
          targetHandle,
        }
      : {}),
    type: edge.type ?? "default",
    data: edge.data ?? {},
    ...(selected2 !== void 0
      ? {
          selected: selected2,
        }
      : {}),
    // Mirrors the `hidden` treatment in `toFlowNode`: omitted unless explicitly
    // true so ReactFlow's diff sees a stable shape for the common (always-
    // visible) case. Set by callers when either endpoint sits inside a
    // collapsed group — otherwise the edge would still render as a dangling
    // line floating across the canvas while its child node is hidden.
    ...(hidden
      ? {
          hidden: true,
        }
      : {}),
  };
}
function toFlowEdges(edges, selectedNodeIds, hiddenNodeIds) {
  return edges.map((edge) =>
    toFlowEdge(
      edge,
      selectedNodeIds,
      // An edge is hidden if EITHER endpoint is hidden (collapsed group child).
      // Hiding only when both endpoints are hidden would still leak the edge
      // for cross-group connections where one side is collapsed.
      hiddenNodeIds && (hiddenNodeIds.has(edge.source) || hiddenNodeIds.has(edge.target))
        ? true
        : void 0,
    ),
  );
}
function buildChildCountByParent(nodes) {
  const counts = new Map();
  for (const n2 of nodes) {
    if (!n2.parentId) continue;
    counts.set(n2.parentId, (counts.get(n2.parentId) ?? 0) + 1);
  }
  return counts;
}
function injectDerivedChildCounts(nodes, childCountByParent) {
  const counts = childCountByParent ?? buildChildCountByParent(nodes);
  let mutated = false;
  const result = nodes.map((n2) => {
    if (n2.type !== CanvasNodeType.Group) return n2;
    const next2 = counts.get(n2.id) ?? 0;
    const collapsedRaw = !!n2.meta?.collapsed;
    const data2 = n2.data;
    const prevCount = data2?.[GROUP_DERIVED_CHILD_COUNT_KEY];
    const prevCollapsed = data2?.[GROUP_DERIVED_COLLAPSED_KEY];
    if (prevCount === next2 && prevCollapsed === collapsedRaw) return n2;
    mutated = true;
    return {
      ...n2,
      data: {
        ...(data2 ?? {}),
        [GROUP_DERIVED_CHILD_COUNT_KEY]: next2,
        [GROUP_DERIVED_COLLAPSED_KEY]: collapsedRaw,
      },
    };
  });
  return mutated ? result : nodes;
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
function reorderParentsBeforeChildren(nodes) {
  let hasParented = false;
  for (const n2 of nodes) {
    if (n2.parentId) {
      hasParented = true;
      break;
    }
  }
  if (!hasParented) return nodes;
  const parentOf = (n2) => n2.parentId;
  const childrenByParent = new Map();
  for (const n2 of nodes) {
    const pid = parentOf(n2);
    if (!pid) continue;
    let bucket = childrenByParent.get(pid);
    if (!bucket) {
      bucket = [];
      childrenByParent.set(pid, bucket);
    }
    bucket.push(n2);
  }
  const seen2 = new Set();
  const result = [];
  for (const n2 of nodes) {
    if (parentOf(n2)) continue;
    if (seen2.has(n2.id)) continue;
    seen2.add(n2.id);
    result.push(n2);
    const children2 = childrenByParent.get(n2.id);
    if (children2) {
      for (const c3 of children2) {
        if (seen2.has(c3.id)) continue;
        seen2.add(c3.id);
        result.push(c3);
      }
    }
  }
  for (const n2 of nodes) {
    if (seen2.has(n2.id)) continue;
    seen2.add(n2.id);
    result.push(n2);
  }
  return result;
}
function prepareNodesForFlow(nodes, childCountByParent) {
  return reorderParentsBeforeChildren(injectDerivedChildCounts(nodes, childCountByParent));
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
function syncFlowGraph(instance2, graph, selected2, flowNodeCache, setFlowNodes, setFlowEdges) {
  const mode2 = instance2.getMode();
  const preparedNodes = prepareNodesForFlow(graph.nodes, instance2.getChildCountByParent());
  const hiddenIds = mergeHiddenSets(
    collectHiddenChildIds(preparedNodes),
    collectMetaHiddenIds(preparedNodes),
  );
  setFlowNodes(toFlowNodesMemo(flowNodeCache, preparedNodes, mode2, selected2, hiddenIds));
  setFlowEdges(toFlowEdges(graph.edges, selected2, hiddenIds));
  if (flowNodeCache.size > preparedNodes.length) {
    const liveIds = new Set(preparedNodes.map((n2) => n2.id));
    for (const id2 of flowNodeCache.keys()) {
      if (!liveIds.has(id2)) flowNodeCache.delete(id2);
    }
  }
}
export function useGraphSync(instance2, setFlowNodes, setFlowEdges) {
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
    return instance2.eventBus.on("node:data-silent-changed", ({ nodeId, data: data2 }) => {
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
    });
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
          const nextSelected = selected2.has(edge.source) || selected2.has(edge.target);
          if (edge.selected === nextSelected) continue;
          nextEdges ??= [...edges];
          nextEdges[index2] = {
            ...edge,
            selected: nextSelected,
          };
        }
        if (shouldFallback) {
          const preparedNodes = prepareNodesForFlow(graph.nodes, instance2.getChildCountByParent());
          return toFlowEdges(graph.edges, selected2, collectHiddenChildIds(preparedNodes));
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
export function buildInternalClipboardItemData(blobs = null) {
  return {
    ...(blobs ?? {}),
    "text/html": new Blob([INTERNAL_COPY_HTML_MARKER], {
      type: "text/html",
    }),
  };
}
export async function writeCanvasSystemClipboard(onSystemCopy) {
  let result;
  if (onSystemCopy) {
    try {
      result = await onSystemCopy();
    } catch (error) {
      console.warn("[canvas] onSystemCopy failed:", error);
    }
  }
  if (result && "kind" in result && result.kind === "native") return;
  if (typeof navigator === "undefined" || !navigator.clipboard?.write) return;
  const blobs = (result && !("kind" in result) ? result : null) ?? null;
  try {
    await navigator.clipboard.write([new ClipboardItem(buildInternalClipboardItemData(blobs))]);
  } catch (error) {
    console.warn("[canvas] system copy write failed:", error);
  }
}
export function makeAssetPathResolver(assetMetadataStore) {
  return (assetId) => assetMetadataStore.getState().get(assetId)?.path;
}
export function isEditableTarget$2(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
