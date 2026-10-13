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
function displaySizeFromData(type, data) {
  if (type !== "image") return void 0;
  const value = data?.displaySize;
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
function resolveNodeSize(type, savedSize, item, data) {
  return (
    displaySizeFromData(type, data) ??
    savedSize ??
    (item ? sizeFromItem(item) : void 0) ??
    defaultNodeSizeForType(type)
  );
}
function metaToData(meta) {
  const out = {};
  if (meta.name !== void 0) out.name = meta.name;
  if (meta.path !== void 0) out.path = meta.path;
  if (meta.prompt !== void 0) out.prompt = meta.prompt;
  if (meta.description !== void 0) out.description = meta.description;
  if (meta.model !== void 0) out.model = meta.model;
  if (meta.model_id !== void 0) out.model_id = meta.model_id;
  if (meta.backend !== void 0) out.backend = meta.backend;
  if (meta.source_tool !== void 0) out.source_tool = meta.source_tool;
  if (meta.params !== void 0) out.params = meta.params;
  if (meta.voiceId !== void 0) out.voiceId = meta.voiceId;
  if (meta.lyrics !== void 0) out.lyrics = meta.lyrics;
  if (meta.compositionPlan !== void 0)
    out.composition_plan = meta.compositionPlan;
  if (meta.width !== void 0) out.width = meta.width;
  if (meta.height !== void 0) out.height = meta.height;
  if (meta.durationSec !== void 0) out.duration = meta.durationSec;
  if (meta.referenceImageIds !== void 0)
    out.referenceImageIds = meta.referenceImageIds;
  if (meta.referenceVideoIds !== void 0)
    out.referenceVideoIds = meta.referenceVideoIds;
  if (meta.referenceAudioIds !== void 0)
    out.referenceAudioIds = meta.referenceAudioIds;
  if (meta.referenceTextIds !== void 0)
    out.referenceTextIds = meta.referenceTextIds;
  return out;
}
const warnedRecoveredNodeIds = new Set();
function anchorOrder(nodes, existingOrder) {
  const byId = new Map();
  for (const node of nodes) byId.set(node.id, node);
  const result = [];
  const consumed = new Set();
  for (const id of existingOrder) {
    const node = byId.get(id);
    if (node && !consumed.has(id)) {
      result.push(node);
      consumed.add(id);
    }
  }
  for (const node of nodes) {
    if (!consumed.has(node.id)) {
      result.push(node);
      consumed.add(node.id);
    }
  }
  if (result.length === nodes.length) {
    let same = true;
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
      if (result[nodeIndex] !== nodes[nodeIndex]) {
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
    const type = mediaTypeToNodeType(item.meta.type);
    const nodeId = saved?.id ?? crypto.randomUUID();
    if (!saved) {
      syntheticSavedNodes.set(nodeId, {
        id: nodeId,
        type,
        positions: {},
        assetId: item.id,
      });
    }
    nodes.push({
      id: nodeId,
      type,
      // Pass the full per-mode positions map through unchanged. Missing
      // entries (node never placed in a particular mode) are filled in by
      // `layoutUnsavedNodes` downstream.
      positions: sanitizeCanvasPositions(saved?.positions ?? {}).positions,
      size: resolveNodeSize(type, saved?.size, item, saved?.data),
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
    for (const clone of cloneNodes) {
      const assetId =
        typeof clone.assetId === "string" && clone.assetId.length > 0
          ? clone.assetId
          : parseNodeId(clone.id).assetId;
      const primaryItem = itemByAssetId.get(assetId);
      if (!primaryItem) {
        if (
          !isAssetBackedNode(clone.type) ||
          clone.type === CanvasNodeType.Text
        ) {
          nodes.push({
            id: clone.id,
            type: clone.type,
            positions: sanitizeCanvasPositions(clone.positions ?? {})
              .positions,
            size: resolveNodeSize(
              clone.type,
              clone.size,
              void 0,
              clone.data,
            ),
            data: mirrorImageFieldsIntoData(clone),
            ...carryAssetIdField(clone),
            ...carryIsEmptyField(clone),
            meta: clone.meta,
            ...(clone.parentId
              ? {
                  parentId: clone.parentId,
                }
              : {}),
            ...carryGroupFields(clone),
          });
          continue;
        }
        continue;
      }
      const type = clone.type || mediaTypeToNodeType(primaryItem.meta.type);
      const primarySaved = savedByAssetId.get(assetId);
      const primaryData = primarySaved
        ? mirrorImageFieldsIntoData(primarySaved)
        : {};
      const inheritedData = {
        ...metaToData(primaryItem.meta),
        ...primaryData,
        ...(clone.data ?? {}),
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
        ...(clone.meta?.cloneOf != null
          ? {
              cloneOf: clone.meta.cloneOf,
            }
          : {}),
      };
      nodes.push({
        id: clone.id,
        type,
        positions: sanitizeCanvasPositions(clone.positions ?? {}).positions,
        size: resolveNodeSize(type, clone.size, primaryItem, inheritedData),
        data: inheritedData,
        ...carryAssetIdField(clone),
        ...carryIsEmptyField(clone),
        meta: clone.meta,
        ...(clone.parentId
          ? {
              parentId: clone.parentId,
            }
          : {}),
        ...carryGroupFields(clone),
      });
    }
  }
  if (standaloneNodes?.length) {
    for (const sn of standaloneNodes) {
      nodes.push({
        id: sn.id,
        type: sn.type,
        positions: sanitizeCanvasPositions(sn.positions ?? {}).positions,
        size: resolveNodeSize(sn.type, sn.size, void 0, sn.data),
        data: mirrorImageFieldsIntoData(sn),
        ...carryAssetIdField(sn),
        ...carryIsEmptyField(sn),
        meta: sn.meta,
        ...(sn.parentId
          ? {
              parentId: sn.parentId,
            }
          : {}),
        ...carryGroupFields(sn),
      });
    }
  }
  const allSavedNodes = input.allSavedNodes;
  if (allSavedNodes?.size) {
    const emittedIds = new Set(nodes.map((node) => node.id));
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
        (id) => !warnedRecoveredNodeIds.has(id),
      );
      if (unreported.length > 0) {
        for (const id of unreported) warnedRecoveredNodeIds.add(id);
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
