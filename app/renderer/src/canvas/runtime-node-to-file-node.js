// runtime-node-to-file-node.js
import { CanvasNodeType } from "../vendor.js";

function runtimeNodeToFileNode(node, mode) {
  const isGroup = node.type === CanvasNodeType.Group;
  const sizesField =
    isGroup && (node.sizes || node.size)
      ? {
          sizes: {
            ...(node.sizes ?? {}),
            ...(node.size
              ? {
                  [mode]: node.size,
                }
              : {}),
          },
        }
      : {};
  return {
    id: node.id,
    type: node.type,
    positions: {
      ...node.positions,
    },
    ...(node.size
      ? {
          size: node.size,
        }
      : {}),
    ...sizesField,
    ...(node.assetId
      ? {
          assetId: node.assetId,
        }
      : {}),
    // Keep empty placeholders stable across runtime ↔ protocol snapshots.
    ...(node.isEmpty === true
      ? {
          isEmpty: true,
        }
      : {}),
    ...(node.parentId
      ? {
          parentId: node.parentId,
        }
      : {}),
    ...(node.groupId
      ? {
          groupId: node.groupId,
        }
      : {}),
    ...(Number.isInteger(node.round)
      ? {
          round: node.round,
        }
      : {}),
    ...(node.data !== void 0
      ? {
          data: node.data,
        }
      : {}),
    ...(node.meta
      ? {
          meta: node.meta,
        }
      : {}),
  };
}

export function buildCanvasFileSnapshot(graph, mode) {
  return {
    version: 1,
    mode,
    nodes: graph.nodes.map((node) => runtimeNodeToFileNode(node, mode)),
    // Pure functions that only mutate node geometry (group / ungroup) ignore
    // edges entirely. `relayoutGroupChildren`, however, reads the inner edges
    // of a group in every mode (grid packs edge-connected components as
    // layered blocks; vertical / horizontal are the layered tree and its
    // transpose), so we pass them through verbatim. Runtime `CanvasEdge` and
    // protocol `CanvasFileEdge` share the same shape modulo a defaulted
    // `type` -- hand-rolling the conversion keeps the protocol package
    // edge-agnostic.
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
      type: edge.type ?? "derivation",
      data: edge.data,
    })),
  };
}
