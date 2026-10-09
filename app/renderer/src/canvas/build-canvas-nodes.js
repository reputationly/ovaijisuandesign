// build-canvas-nodes.js
import { CanvasNodeType } from "../vendor.js";
import { carryIsEmptyField, mirrorImageFieldsIntoData } from "./build-incremental-node-data.js";
import {
  computeNodeSize,
  defaultNodeSizeForType,
  isAssetBackedNode,
  mediaTypeToNodeType,
} from "./group-nodes-in-canvas.js";
import { displaySizeFromData, normaliseHandle } from "./remap-clipboard.js";
import {
  isFiniteCanvasPosition,
  parseNodeId,
  sanitizeCanvasPositions,
} from "./resolve-derived-collision.js";
function sizeFromItem(item) {
  return computeNodeSize(item.meta.width, item.meta.height);
}
function resolveNodeSize$1(type2, savedSize, item, data2) {
  return (
    displaySizeFromData(type2, data2) ??
    savedSize ??
    (item ? sizeFromItem(item) : void 0) ??
    defaultNodeSizeForType(type2)
  );
}
function metaToData(meta2) {
  const out = {};
  if (meta2.name !== void 0) out.name = meta2.name;
  if (meta2.path !== void 0) out.path = meta2.path;
  if (meta2.prompt !== void 0) out.prompt = meta2.prompt;
  if (meta2.description !== void 0) out.description = meta2.description;
  if (meta2.model !== void 0) out.model = meta2.model;
  if (meta2.model_id !== void 0) out.model_id = meta2.model_id;
  if (meta2.backend !== void 0) out.backend = meta2.backend;
  if (meta2.source_tool !== void 0) out.source_tool = meta2.source_tool;
  if (meta2.params !== void 0) out.params = meta2.params;
  if (meta2.voiceId !== void 0) out.voiceId = meta2.voiceId;
  if (meta2.lyrics !== void 0) out.lyrics = meta2.lyrics;
  if (meta2.compositionPlan !== void 0) out.composition_plan = meta2.compositionPlan;
  if (meta2.width !== void 0) out.width = meta2.width;
  if (meta2.height !== void 0) out.height = meta2.height;
  if (meta2.durationSec !== void 0) out.duration = meta2.durationSec;
  if (meta2.referenceImageIds !== void 0) out.referenceImageIds = meta2.referenceImageIds;
  if (meta2.referenceVideoIds !== void 0) out.referenceVideoIds = meta2.referenceVideoIds;
  if (meta2.referenceAudioIds !== void 0) out.referenceAudioIds = meta2.referenceAudioIds;
  if (meta2.referenceTextIds !== void 0) out.referenceTextIds = meta2.referenceTextIds;
  return out;
}
const warnedRecoveredNodeIds = new Set();
export function buildCanvasNodes(input) {
  const { visibleItems, savedByAssetId, cloneNodes, standaloneNodes, existingOrder } = input;
  const syntheticSavedNodes = new Map();
  const itemByAssetId = input.itemLookup ?? new Map(visibleItems.map((item) => [item.id, item]));
  const nodes = [];
  for (const item of visibleItems) {
    const saved = savedByAssetId.get(item.id);
    const type2 = mediaTypeToNodeType(item.meta.type);
    const nodeId = saved?.id ?? crypto.randomUUID();
    if (!saved) {
      syntheticSavedNodes.set(nodeId, {
        id: nodeId,
        type: type2,
        positions: {},
        assetId: item.id,
      });
    }
    nodes.push({
      id: nodeId,
      type: type2,
      // Pass the full per-mode positions map through unchanged. Missing
      // entries (node never placed in a particular mode) are filled in by
      // `layoutUnsavedNodes` downstream.
      positions: sanitizeCanvasPositions(saved?.positions ?? {}).positions,
      size: resolveNodeSize$1(type2, saved?.size, item, saved?.data),
      data: {
        ...(saved ? mirrorImageFieldsIntoData(saved) : {}),
        assetId: item.id,
      },
      assetId: item.id,
      ...carryIsEmptyField(saved),
      meta: saved?.meta,
      ...(saved?.parentId
        ? {
            parentId: saved.parentId,
          }
        : {}),
      ...carryGroupFields(saved),
    });
  }
  const hiddenAssetIds = input.hiddenAssetIds;
  if (cloneNodes?.length) {
    for (const clone2 of cloneNodes) {
      const assetId =
        typeof clone2.assetId === "string" && clone2.assetId.length > 0
          ? clone2.assetId
          : parseNodeId(clone2.id).assetId;
      const primaryItem = itemByAssetId.get(assetId);
      if (!primaryItem) {
        if (!isAssetBackedNode(clone2.type) || clone2.type === CanvasNodeType.Text) {
          nodes.push({
            id: clone2.id,
            type: clone2.type,
            positions: sanitizeCanvasPositions(clone2.positions ?? {}).positions,
            size: resolveNodeSize$1(clone2.type, clone2.size, void 0, clone2.data),
            data: mirrorImageFieldsIntoData(clone2),
            ...carryAssetIdField(clone2),
            ...carryIsEmptyField(clone2),
            meta: clone2.meta,
            ...(clone2.parentId
              ? {
                  parentId: clone2.parentId,
                }
              : {}),
            ...carryGroupFields(clone2),
          });
          continue;
        }
        continue;
      }
      const type2 = clone2.type || mediaTypeToNodeType(primaryItem.meta.type);
      const primarySaved = savedByAssetId.get(assetId);
      const primaryData = primarySaved ? mirrorImageFieldsIntoData(primarySaved) : {};
      const inheritedData = {
        ...metaToData(primaryItem.meta),
        ...primaryData,
        ...(clone2.data ?? {}),
        // Mirror the backing assetId into data so `useImageNodeView` resolves
        // the shared asset URL. A pasted clone has a random-UUID node id (not
        // `<assetId>~<suffix>`), so `parseNodeId(nodeId)` can't recover the
        // asset, and `data.assetId` was stripped on persist (persist-prune
        // treats it as a redundant runtime mirror). The origin node renders via
        // an AssetMetadataStore alias keyed by its own node id (written in the
        // items loop in use-canvas-data); clones never get that alias, so
        // without this mirror they resolve no meta and render blank on reload.
        assetId,
        // Render-layer clone marker (see `mirrorImageFieldsIntoData`). This
        // branch builds `data` from scratch instead of calling that helper, so
        // re-derive `cloneOf` here too — otherwise `useNodeRename` would treat a
        // reloaded clone as an origin and rename the SHARED physical file.
        ...(clone2.meta?.cloneOf != null
          ? {
              cloneOf: clone2.meta.cloneOf,
            }
          : {}),
      };
      nodes.push({
        id: clone2.id,
        type: type2,
        positions: sanitizeCanvasPositions(clone2.positions ?? {}).positions,
        size: resolveNodeSize$1(type2, clone2.size, primaryItem, inheritedData),
        data: inheritedData,
        ...carryAssetIdField(clone2),
        ...carryIsEmptyField(clone2),
        meta: clone2.meta,
        ...(clone2.parentId
          ? {
              parentId: clone2.parentId,
            }
          : {}),
        ...carryGroupFields(clone2),
      });
    }
  }
  if (standaloneNodes?.length) {
    for (const sn2 of standaloneNodes) {
      nodes.push({
        id: sn2.id,
        type: sn2.type,
        positions: sanitizeCanvasPositions(sn2.positions ?? {}).positions,
        size: resolveNodeSize$1(sn2.type, sn2.size, void 0, sn2.data),
        data: mirrorImageFieldsIntoData(sn2),
        ...carryAssetIdField(sn2),
        ...carryIsEmptyField(sn2),
        meta: sn2.meta,
        ...(sn2.parentId
          ? {
              parentId: sn2.parentId,
            }
          : {}),
        ...carryGroupFields(sn2),
      });
    }
  }
  const allSavedNodes = input.allSavedNodes;
  if (allSavedNodes?.size) {
    const emittedIds = new Set(nodes.map((n2) => n2.id));
    const omittedNodeIds = input.omittedNodeIds;
    const recovered = [];
    for (const [nodeId, saved] of allSavedNodes) {
      if (emittedIds.has(nodeId)) continue;
      if (omittedNodeIds?.has(nodeId)) continue;
      const savedAssetId =
        typeof saved.assetId === "string" && saved.assetId.length > 0 ? saved.assetId : void 0;
      if (savedAssetId && hiddenAssetIds?.has(savedAssetId)) continue;
      const item = savedAssetId ? itemByAssetId.get(savedAssetId) : void 0;
      const assetMissing = savedAssetId !== void 0 && item === void 0;
      nodes.push({
        id: nodeId,
        type: saved.type,
        positions: sanitizeCanvasPositions(saved.positions ?? {}).positions,
        size: resolveNodeSize$1(saved.type, saved.size, item, saved.data),
        // Mirrors the primary branch exactly: asset-projected fields come from
        // the AssetMetadataStore at render time (keyed by assetId / node-id
        // alias), NOT from a metaToData spread here. Adding one would give a
        // recovered node a different data shape than the same node takes on
        // the normal path.
        data: {
          ...mirrorImageFieldsIntoData(saved),
          ...(savedAssetId
            ? {
                assetId: savedAssetId,
              }
            : {}),
          ...(assetMissing
            ? {
                assetMissing: true,
              }
            : {}),
        },
        ...(savedAssetId
          ? {
              assetId: savedAssetId,
            }
          : {}),
        ...carryIsEmptyField(saved),
        meta: saved.meta,
        ...(saved.parentId
          ? {
              parentId: saved.parentId,
            }
          : {}),
        ...carryGroupFields(saved),
      });
      recovered.push(nodeId);
    }
    if (recovered.length > 0) {
      const unreported = recovered.filter((id2) => !warnedRecoveredNodeIds.has(id2));
      if (unreported.length > 0) {
        for (const id2 of unreported) warnedRecoveredNodeIds.add(id2);
        console.warn(
          "[hilo/canvas] superset guard recovered %d on-disk node(s) no build branch emitted: %o",
          unreported.length,
          unreported,
        );
      }
    }
  }
  const orderedNodes =
    existingOrder && existingOrder.length > 0 ? anchorOrder(nodes, existingOrder) : nodes;
  return {
    nodes: orderedNodes,
    syntheticSavedNodes,
  };
}
function anchorOrder(nodes, existingOrder) {
  const byId = new Map();
  for (const n2 of nodes) byId.set(n2.id, n2);
  const result = [];
  const consumed = new Set();
  for (const id2 of existingOrder) {
    const n2 = byId.get(id2);
    if (n2 && !consumed.has(id2)) {
      result.push(n2);
      consumed.add(id2);
    }
  }
  for (const n2 of nodes) {
    if (!consumed.has(n2.id)) {
      result.push(n2);
      consumed.add(n2.id);
    }
  }
  if (result.length === nodes.length) {
    let same = true;
    for (let i2 = 0; i2 < nodes.length; i2++) {
      if (result[i2] !== nodes[i2]) {
        same = false;
        break;
      }
    }
    if (same) return nodes;
  }
  return result;
}
export function filterEdges(nodeIds, savedEdges) {
  const runtime = [];
  for (const e2 of savedEdges) {
    if (!nodeIds.has(e2.source) || !nodeIds.has(e2.target)) continue;
    const sourceHandle = normaliseHandle(e2.sourceHandle);
    const targetHandle = normaliseHandle(e2.targetHandle);
    runtime.push({
      id: e2.id,
      source: e2.source,
      target: e2.target,
      ...(sourceHandle !== void 0
        ? {
            sourceHandle,
          }
        : {}),
      ...(targetHandle !== void 0
        ? {
            targetHandle,
          }
        : {}),
      ...(e2.type !== void 0
        ? {
            type: e2.type,
          }
        : {}),
      ...(e2.data !== void 0
        ? {
            data: e2.data,
          }
        : {}),
    });
  }
  return runtime;
}
function deepEqualJsonLike(a2, b3) {
  if (Object.is(a2, b3)) return true;
  if (a2 === null || b3 === null) return false;
  if (typeof a2 !== "object" || typeof b3 !== "object") return false;
  if (Array.isArray(a2)) {
    if (!Array.isArray(b3) || a2.length !== b3.length) return false;
    for (let i2 = 0; i2 < a2.length; i2++) {
      if (!deepEqualJsonLike(a2[i2], b3[i2])) return false;
    }
    return true;
  }
  if (Array.isArray(b3)) return false;
  const aObj = a2;
  const bObj = b3;
  const keys2 = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
  for (const k2 of keys2) {
    if (!deepEqualJsonLike(aObj[k2], bObj[k2])) return false;
  }
  return true;
}
function sizeEqual(a2, b3) {
  if (a2 === b3) return true;
  if (!a2 || !b3) return false;
  return a2.width === b3.width && a2.height === b3.height;
}
function positionsEqual(a2, b3) {
  const aKeys = Object.keys(a2);
  const bKeys = Object.keys(b3);
  if (aKeys.length !== bKeys.length) return false;
  for (const k2 of aKeys) {
    const ap = a2[k2];
    const bp = b3[k2];
    if (!ap || !bp) {
      if (ap !== bp) return false;
      continue;
    }
    if (ap.x !== bp.x || ap.y !== bp.y) return false;
  }
  return true;
}
function sizesEqual(a2, b3) {
  if (a2 === b3) return true;
  if (!a2 || !b3)
    return a2 === b3 || (Object.keys(a2 ?? {}).length === 0 && Object.keys(b3 ?? {}).length === 0);
  const aKeys = Object.keys(a2);
  const bKeys = Object.keys(b3);
  if (aKeys.length !== bKeys.length) return false;
  for (const k2 of aKeys) {
    if (!sizeEqual(a2[k2], b3[k2])) return false;
  }
  return true;
}
function areCanvasNodesContentEqual(a2, b3) {
  if (a2 === b3) return true;
  if (a2.id !== b3.id) return false;
  if (a2.type !== b3.type) return false;
  if (a2.parentId !== b3.parentId) return false;
  if (a2.groupId !== b3.groupId) return false;
  if (a2.round !== b3.round) return false;
  if (!sizeEqual(a2.size, b3.size)) return false;
  if (!sizesEqual(a2.sizes, b3.sizes)) return false;
  if (!positionsEqual(a2.positions, b3.positions)) return false;
  if (!deepEqualJsonLike(a2.meta, b3.meta)) return false;
  if (!deepEqualJsonLike(a2.data, b3.data)) return false;
  return true;
}
export function reuseUnchangedNodeRefs(freshNodes, currentNodes) {
  const lookup = Array.isArray(currentNodes)
    ? new Map(currentNodes.map((n2) => [n2.id, n2]))
    : currentNodes;
  for (let i2 = 0; i2 < freshNodes.length; i2++) {
    const next2 = freshNodes[i2];
    const prev = lookup.get(next2.id);
    if (prev && areCanvasNodesContentEqual(prev, next2)) {
      freshNodes[i2] = prev;
    }
  }
  return freshNodes;
}
function partitionByPosition(nodes, allSavedNodes, mode2) {
  const withSaved = [];
  const withoutSaved = [];
  for (const n2 of nodes) {
    const savedNode = allSavedNodes.get(n2.id);
    (n2.meta?.hidden || isFiniteCanvasPosition(savedNode?.positions?.[mode2])
      ? withSaved
      : withoutSaved
    ).push(n2);
  }
  return {
    withSaved,
    withoutSaved,
  };
}
function applyPositions(nodes, positions, mode2) {
  return nodes.map((n2) => {
    const pos = positions.get(n2.id);
    return pos
      ? {
          ...n2,
          positions: {
            ...n2.positions,
            [mode2]: pos,
          },
        }
      : n2;
  });
}
export function layoutUnsavedNodes(instance2, nodes, allSavedNodes, mode2, edges, anchor) {
  const { withSaved, withoutSaved } = partitionByPosition(nodes, allSavedNodes, mode2);
  if (withoutSaved.length === 0) {
    return {
      nodes,
      needsPersist: false,
    };
  }
  const positions = instance2.layout.computeIncremental("dagre", withSaved, withoutSaved, edges, {
    mode: mode2,
    ...(anchor
      ? {
          anchor,
        }
      : {}),
  });
  return {
    nodes: applyPositions(nodes, positions, mode2),
    needsPersist: true,
  };
}
function carryGroupFields(saved) {
  if (!saved) return {};
  const out = {};
  if (saved.groupId) out.groupId = saved.groupId;
  if (Number.isInteger(saved.round)) out.round = saved.round;
  return out;
}
function carryAssetIdField(saved) {
  return typeof saved?.assetId === "string" && saved.assetId.length > 0
    ? {
        assetId: saved.assetId,
      }
    : {};
}
