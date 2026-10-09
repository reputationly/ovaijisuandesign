// runtime-node-to-file-node.js
import { CanvasNodeType } from "../vendor.js";

function runtimeNodeToFileNode(node2, mode2) {
  const isGroup = node2.type === CanvasNodeType.Group;
  const sizesField =
    isGroup && (node2.sizes || node2.size)
      ? {
          sizes: {
            ...(node2.sizes ?? {}),
            ...(node2.size
              ? {
                  [mode2]: node2.size,
                }
              : {}),
          },
        }
      : {};
  return {
    id: node2.id,
    type: node2.type,
    positions: {
      ...node2.positions,
    },
    ...(node2.size
      ? {
          size: node2.size,
        }
      : {}),
    ...sizesField,
    ...(node2.assetId
      ? {
          assetId: node2.assetId,
        }
      : {}),
    // Keep empty placeholders stable across runtime ↔ protocol snapshots.
    ...(node2.isEmpty === true
      ? {
          isEmpty: true,
        }
      : {}),
    ...(node2.parentId
      ? {
          parentId: node2.parentId,
        }
      : {}),
    ...(node2.groupId
      ? {
          groupId: node2.groupId,
        }
      : {}),
    ...(Number.isInteger(node2.round)
      ? {
          round: node2.round,
        }
      : {}),
    ...(node2.data !== void 0
      ? {
          data: node2.data,
        }
      : {}),
    ...(node2.meta
      ? {
          meta: node2.meta,
        }
      : {}),
  };
}

export function buildCanvasFileSnapshot(graph, mode2) {
  return {
    version: 1,
    mode: mode2,
    nodes: graph.nodes.map((n2) => runtimeNodeToFileNode(n2, mode2)),
    // Pure functions that only mutate node geometry (group / ungroup) ignore
    // edges entirely. `relayoutGroupChildren`, however, reads the inner edges
    // of a group in every mode (grid packs edge-connected components as
    // layered blocks; vertical / horizontal are the layered tree and its
    // transpose), so we pass them through verbatim. Runtime `CanvasEdge` and
    // protocol `CanvasFileEdge` share the same shape modulo a defaulted
    // `type` -- hand-rolling the conversion keeps the protocol package
    // edge-agnostic.
    edges: graph.edges.map((e2) => ({
      id: e2.id,
      source: e2.source,
      sourceHandle: e2.sourceHandle,
      target: e2.target,
      targetHandle: e2.targetHandle,
      type: e2.type ?? "derivation",
      data: e2.data,
    })),
  };
}
