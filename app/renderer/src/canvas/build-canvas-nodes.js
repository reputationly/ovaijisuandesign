// build-canvas-nodes.js
import {
  computeNodeSize,
  defaultNodeSizeForType,
  isAssetBackedNode,
} from "./compute-group-bounds-from-children.js";
import { CanvasNodeType } from "../vendor.js";
import { mirrorImageFieldsIntoData } from "./build-incremental-node-data.js";
import {
  parseNodeId,
  sanitizeCanvasPositions,
} from "./find-free-position-from-anchor.js";
function mediaTypeToNodeType(fileType) {
  switch (fileType) {
    case "image":
      return CanvasNodeType.Image;
    case "video":
      return CanvasNodeType.Video;
    case "audio":
      return CanvasNodeType.Audio;
    case "text":
      return CanvasNodeType.Text;
    case "file":
      return CanvasNodeType.File;
    default:
      return CanvasNodeType.File;
  }
}
function carryIsEmptyField(saved) {
  return saved?.isEmpty && !saved.assetId
    ? {
        isEmpty: true,
      }
    : {};
}
function displaySizeFromData(type2, data2) {
  if (type2 !== "image") return void 0;
  const value = data2?.displaySize;
  if (!value || typeof value !== "object") return void 0;
  const { width, height } = value;
  if (
    typeof width !== "number" ||
    width <= 0 ||
    typeof height !== "number" ||
    height <= 0
  ) {
    return void 0;
  }
  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}
function sizeFromItem(item) {
  return computeNodeSize(item.meta.width, item.meta.height);
}
function resolveNodeSize(type2, savedSize, item, data2) {
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
  if (meta2.compositionPlan !== void 0)
    out.composition_plan = meta2.compositionPlan;
  if (meta2.width !== void 0) out.width = meta2.width;
  if (meta2.height !== void 0) out.height = meta2.height;
  if (meta2.durationSec !== void 0) out.duration = meta2.durationSec;
  if (meta2.referenceImageIds !== void 0)
    out.referenceImageIds = meta2.referenceImageIds;
  if (meta2.referenceVideoIds !== void 0)
    out.referenceVideoIds = meta2.referenceVideoIds;
  if (meta2.referenceAudioIds !== void 0)
    out.referenceAudioIds = meta2.referenceAudioIds;
  if (meta2.referenceTextIds !== void 0)
    out.referenceTextIds = meta2.referenceTextIds;
  return out;
}
const warnedRecoveredNodeIds = new Set();
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
export function buildCanvasNodes(input) {
  const {
    visibleItems,
    savedByAssetId,
    cloneNodes,
    standaloneNodes,
    existingOrder,
  } = input;
  const syntheticSavedNodes = new Map();
  const itemByAssetId =
    input.itemLookup ?? new Map(visibleItems.map((item) => [item.id, item]));
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
      size: resolveNodeSize(type2, saved?.size, item, saved?.data),
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
        if (
          !isAssetBackedNode(clone2.type) ||
          clone2.type === CanvasNodeType.Text
        ) {
          nodes.push({
            id: clone2.id,
            type: clone2.type,
            positions: sanitizeCanvasPositions(clone2.positions ?? {})
              .positions,
            size: resolveNodeSize(
              clone2.type,
              clone2.size,
              void 0,
              clone2.data,
            ),
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
      const primaryData = primarySaved
        ? mirrorImageFieldsIntoData(primarySaved)
        : {};
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
        size: resolveNodeSize(type2, clone2.size, primaryItem, inheritedData),
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
        size: resolveNodeSize(sn2.type, sn2.size, void 0, sn2.data),
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
        typeof saved.assetId === "string" && saved.assetId.length > 0
          ? saved.assetId
          : void 0;
      if (savedAssetId && hiddenAssetIds?.has(savedAssetId)) continue;
      const item = savedAssetId ? itemByAssetId.get(savedAssetId) : void 0;
      const assetMissing = savedAssetId !== void 0 && item === void 0;
      nodes.push({
        id: nodeId,
        type: saved.type,
        positions: sanitizeCanvasPositions(saved.positions ?? {}).positions,
        size: resolveNodeSize(saved.type, saved.size, item, saved.data),
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
      const unreported = recovered.filter(
        (id2) => !warnedRecoveredNodeIds.has(id2),
      );
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
    existingOrder && existingOrder.length > 0
      ? anchorOrder(nodes, existingOrder)
      : nodes;
  return {
    nodes: orderedNodes,
    syntheticSavedNodes,
  };
}
