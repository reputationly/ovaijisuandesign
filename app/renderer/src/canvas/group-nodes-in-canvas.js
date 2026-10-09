// group-nodes-in-canvas.js
import { CanvasNodeType, normalizeLabel$1 } from "../vendor.js";
const GENERATION_REFERENCE_DATA_KEYS$1 = [
  "referenceImageIds",
  "referenceAudioIds",
  "referenceVideoIds",
  "referenceTextIds",
];
function asDataRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
  return value;
}
function collectNodeIdentities(node2) {
  const identities = new Set([node2.id]);
  if (typeof node2.assetId === "string" && node2.assetId.length > 0) identities.add(node2.assetId);
  const dataAssetId = asDataRecord(node2.data)?.assetId;
  if (typeof dataAssetId === "string" && dataAssetId.length > 0) identities.add(dataAssetId);
  return identities;
}
function collectReferenceIds(node2, options) {
  if (!node2) return [];
  const collected = [];
  const data2 = asDataRecord(node2.data);
  if (data2) {
    for (const key2 of GENERATION_REFERENCE_DATA_KEYS$1) {
      const references = data2[key2];
      if (!Array.isArray(references)) continue;
      for (const reference of references) {
        if (typeof reference === "string" && reference.length > 0) collected.push(reference);
      }
    }
  }
  if (collected.length > 0) return collected;
  return options?.resolveReferenceIds?.(node2) ?? [];
}
export function isArtifactProvenanceEdge(edge, nodes, options) {
  if (edge.type !== "derivation") return false;
  const sourceNode = nodes.find((node2) => node2.id === edge.source);
  const targetNode = nodes.find((node2) => node2.id === edge.target);
  if (!sourceNode || !targetNode) return false;
  const references = collectReferenceIds(targetNode, options);
  if (references.length === 0) return false;
  const sourceIdentities = collectNodeIdentities(sourceNode);
  return references.some((reference) => sourceIdentities.has(reference));
}
export const CanvasMode = {
  Freeform: "freeform",
  Workflow: "workflow",
};
const ASSET_BACKED_TYPES = new Set([
  CanvasNodeType.Image,
  CanvasNodeType.Video,
  CanvasNodeType.Audio,
  CanvasNodeType.Text,
  CanvasNodeType.File,
]);
export function isAssetBackedNode(type2) {
  return ASSET_BACKED_TYPES.has(type2);
}
export function mediaTypeToNodeType(fileType) {
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
export function isGenerationErrorStatus(status) {
  return status === "error" || status === "recoverable_error" || status === "status_unknown";
}
const GENERATION_REFUND_STATUSES = ["none", "pending", "refunded"];
export function isGenerationRefundStatus(value) {
  return GENERATION_REFUND_STATUSES.includes(value);
}
const GROUP_NODE_PREFIX = "group-";
function createGroupNodeId() {
  return `${GROUP_NODE_PREFIX}${crypto.randomUUID()}`;
}
export const POPOVER_DRAFT_DATA_KEY = "popoverDraft";
const NODE_SIZE_MIN = 100;
export const NODE_SIZE_MAX = 350;
export const VIDEO_EMPTY_CARD_SIZE = {
  width: 350,
  height: 280,
};
const VIDEO_EMPTY_NON_IDLE_STATUSES = new Set([
  "pending",
  "generating",
  "loading",
  "queue_paused",
  "error",
]);
export const AUDIO_CARD_SIZE = {
  width: 350,
  height: 150,
};
export const TEXT_CARD_DEFAULT_SIZE = {
  width: 350,
  height: 500,
};
export const IMAGE_CARD_DEFAULT_SIZE = {
  width: 350,
  height: 350,
};
export const TABLE_CARD_DEFAULT_SIZE = {
  width: 350,
  height: 200,
};
export const FILE_CARD_DEFAULT_SIZE = {
  width: 350,
  height: 76,
};
const PLACEHOLDER_CARD_WIDTH = 350;
const PLACEHOLDER_CARD_HEIGHTS = {
  pending: 188,
  queue_paused: 188,
  generating: 248,
  error: 216,
  // Recovery-retained failure renders the same error chrome as `error`.
  recoverable_error: 216,
  // Unknown submit outcome uses neutral chrome with the same footprint.
  status_unknown: 216,
};
export function parseAspectRatio(ratio) {
  if (!ratio) return void 0;
  const trimmed = ratio.trim().toLowerCase();
  if (trimmed === "" || trimmed === "auto") return void 0;
  const match2 = trimmed.match(/^(\d+(?:\.\d+)?)\s*[:x/]\s*(\d+(?:\.\d+)?)$/);
  if (!match2) return void 0;
  const w3 = Number(match2[1]);
  const h2 = Number(match2[2]);
  if (!w3 || !h2) return void 0;
  return {
    w: w3,
    h: h2,
  };
}
export function placeholderNodeSize(status, aspectRatio, mediaType) {
  if (status !== "error" && status !== "recoverable_error" && status !== "status_unknown") {
    if (mediaType === "audio") return AUDIO_CARD_SIZE;
    const ratio = parseAspectRatio(aspectRatio);
    if (ratio) {
      const media = computeNodeSize(ratio.w, ratio.h);
      if (media) return media;
    }
    if (mediaType === "image" || mediaType === "video") return IMAGE_CARD_DEFAULT_SIZE;
  }
  const height = PLACEHOLDER_CARD_HEIGHTS[status] ?? PLACEHOLDER_CARD_HEIGHTS.generating;
  return {
    width: PLACEHOLDER_CARD_WIDTH,
    height,
  };
}
export const GROUP_NODE_PADDING = {
  /** Left/right inner padding (px). */
  x: 24,
  /** Top inner padding — accommodates label height + spacing (px). */
  top: 48,
  /** Bottom inner padding (px). */
  bottom: 24,
};
export function computeNodeSize(w3, h2) {
  if (!w3 || !h2 || w3 <= 0 || h2 <= 0) return void 0;
  const scale2 = Math.min(NODE_SIZE_MAX / w3, NODE_SIZE_MAX / h2);
  return {
    width: Math.max(NODE_SIZE_MIN, Math.round(w3 * scale2)),
    height: Math.max(NODE_SIZE_MIN, Math.round(h2 * scale2)),
  };
}
export function isIdleEmptyVideoNode(node2) {
  if (node2.type !== "video" || node2.isEmpty !== true || !!node2.assetId) return false;
  const status = node2.data?.status;
  return typeof status !== "string" || !VIDEO_EMPTY_NON_IDLE_STATUSES.has(status);
}
export function defaultNodeSizeForType(type2) {
  switch (type2) {
    case "audio":
      return AUDIO_CARD_SIZE;
    case "text":
      return TEXT_CARD_DEFAULT_SIZE;
    case "table":
      return TABLE_CARD_DEFAULT_SIZE;
    case "file":
      return FILE_CARD_DEFAULT_SIZE;
    case "sticker":
      return {
        width: 56,
        height: 56,
      };
    default:
      return IMAGE_CARD_DEFAULT_SIZE;
  }
}
export function resolveNodeFootprint(node2, mode2, fallback) {
  if (isIdleEmptyVideoNode(node2)) {
    return VIDEO_EMPTY_CARD_SIZE;
  }
  if (node2.type === "placeholder") {
    const data2 = node2.data;
    return placeholderNodeSize(data2?.status, data2?.aspectRatio, data2?.mediaType);
  }
  return node2.sizes?.[mode2] ?? node2.size ?? fallback ?? defaultNodeSizeForType(node2.type);
}
export function computeGroupBoundsFromChildren(children2) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const child of children2) {
    const size2 = child.size ?? defaultNodeSizeForType(child.type ?? "");
    minX = Math.min(minX, child.position.x);
    minY = Math.min(minY, child.position.y);
    maxX = Math.max(maxX, child.position.x + size2.width);
    maxY = Math.max(maxY, child.position.y + size2.height);
  }
  return {
    position: {
      x: minX - GROUP_NODE_PADDING.x,
      y: minY - GROUP_NODE_PADDING.top,
    },
    size: {
      width: maxX - minX + GROUP_NODE_PADDING.x * 2,
      height: maxY - minY + GROUP_NODE_PADDING.top + GROUP_NODE_PADDING.bottom,
    },
  };
}
export function readGroupSize(node2, mode2) {
  return node2.sizes?.[mode2] ?? node2.size;
}
const GROUP_Z_INDEX = -100;
export function withParentId(node2, parentId) {
  if (parentId === void 0) {
    const { parentId: _drop, ...rest } = node2;
    return rest;
  }
  return {
    ...node2,
    parentId,
  };
}
export function readGroupFrameMode(node2) {
  const raw2 = node2.data?.frameMode;
  return raw2 === "manual" ? "manual" : "auto";
}
export function groupNodesInCanvas(canvas, nodeIds, options) {
  const mode2 = canvas.mode;
  const nodeById = new Map(canvas.nodes.map((n2) => [n2.id, n2]));
  const selectedGroups = [];
  const outsiders = [];
  const skippedNodes = [];
  const seen2 = new Set();
  for (const id2 of nodeIds) {
    if (seen2.has(id2)) continue;
    seen2.add(id2);
    const node2 = nodeById.get(id2);
    if (!node2) {
      skippedNodes.push({
        nodeId: id2,
        reason: "unknown",
      });
      continue;
    }
    if (node2.type === CanvasNodeType.Group) {
      selectedGroups.push(node2);
      continue;
    }
    if (node2.parentId) {
      skippedNodes.push({
        nodeId: id2,
        reason: "already-grouped",
        parentId: node2.parentId,
      });
      continue;
    }
    outsiders.push(node2);
  }
  const skipFields =
    skippedNodes.length > 0
      ? {
          skippedNodes,
        }
      : {};
  if (selectedGroups.length === 0) {
    if (outsiders.length < 2) {
      return {
        canvas,
        addedNodes: [],
        removedNodeIds: [],
        updatedNodes: [],
        groupId: null,
        ...skipFields,
      };
    }
    const allModes2 = new Set();
    allModes2.add(mode2);
    for (const o2 of outsiders) {
      for (const m3 of Object.keys(o2.positions ?? {})) {
        allModes2.add(m3);
      }
    }
    const boundsByMode = new Map();
    for (const m3 of allModes2) {
      const allHavePos = outsiders.every((o2) => o2.positions?.[m3] !== void 0);
      if (!allHavePos) continue;
      const childrenAbs = outsiders.map((n2) => ({
        position: n2.positions?.[m3],
        size: n2.size,
        type: n2.type,
      }));
      boundsByMode.set(m3, computeGroupBoundsFromChildren(childrenAbs));
    }
    const activeBounds = boundsByMode.get(mode2);
    if (!activeBounds) {
      const missingNodeIds = outsiders.filter((o2) => !o2.positions?.[mode2]).map((o2) => o2.id);
      return {
        canvas,
        addedNodes: [],
        removedNodeIds: [],
        updatedNodes: [],
        groupId: null,
        error: {
          code: "incomplete-positions",
          mode: mode2,
          missingNodeIds,
        },
        ...skipFields,
      };
    }
    const { size: size2 } = activeBounds;
    const groupId2 = createGroupNodeId();
    const childIdSet = new Set(outsiders.map((n2) => n2.id));
    const positionsRecord = {};
    const sizesRecord = {};
    for (const [m3, b3] of boundsByMode) {
      positionsRecord[m3] = b3.position;
      sizesRecord[m3] = b3.size;
    }
    const normalizedLabel = normalizeLabel$1(options?.label);
    const groupData = normalizedLabel
      ? {
          label: normalizedLabel,
        }
      : {};
    const groupNode = {
      id: groupId2,
      type: CanvasNodeType.Group,
      positions: positionsRecord,
      // Legacy `size` mirrors the active mode's bbox; `sizes` carries the
      // full per-mode map so future mode switches read the right frame
      // without falling back to the active mode's value.
      size: size2,
      sizes: sizesRecord,
      // GroupNodeData is a concrete interface; cast to the wider data shape
      // accepted by the persistence schema (Record<string, unknown>).
      data: groupData,
      meta: {
        zIndex: GROUP_Z_INDEX,
        addedAt: Date.now(),
      },
    };
    const updatedChildren = [];
    const nextNodes2 = new Array(canvas.nodes.length + 1);
    let i2 = 0;
    for (const node2 of canvas.nodes) {
      if (childIdSet.has(node2.id)) {
        const newPositions = {
          ...(node2.positions ?? {}),
        };
        for (const [m3, b3] of boundsByMode) {
          const abs = node2.positions?.[m3];
          if (!abs) continue;
          newPositions[m3] = {
            x: abs.x - b3.position.x,
            y: abs.y - b3.position.y,
          };
        }
        const child = withParentId(
          {
            ...node2,
            positions: newPositions,
          },
          groupId2,
        );
        nextNodes2[i2++] = child;
        updatedChildren.push(child);
      } else {
        nextNodes2[i2++] = node2;
      }
    }
    nextNodes2[i2] = groupNode;
    return {
      canvas: {
        ...canvas,
        nodes: nextNodes2,
      },
      addedNodes: [groupNode],
      removedNodeIds: [],
      updatedNodes: updatedChildren,
      groupId: groupId2,
      ...skipFields,
    };
  }
  const mergeTarget = selectedGroups[0];
  const dissolvingGroups = selectedGroups.slice(1);
  const dissolvingGroupById = new Map(dissolvingGroups.map((g2) => [g2.id, g2]));
  const crossGroupChildren = [];
  if (dissolvingGroupById.size > 0) {
    for (const node2 of canvas.nodes) {
      if (!node2.parentId) continue;
      const parent = dissolvingGroupById.get(node2.parentId);
      if (parent)
        crossGroupChildren.push({
          node: node2,
          parentGroup: parent,
        });
    }
  }
  if (outsiders.length === 0 && dissolvingGroups.length === 0) {
    return {
      canvas,
      addedNodes: [],
      removedNodeIds: [],
      updatedNodes: [],
      groupId: null,
      ...skipFields,
    };
  }
  const existingMtChildren = [];
  for (const node2 of canvas.nodes) {
    if (node2.parentId === mergeTarget.id) existingMtChildren.push(node2);
  }
  const allModes = new Set();
  allModes.add(mode2);
  for (const m3 of Object.keys(mergeTarget.positions ?? {})) allModes.add(m3);
  for (const o2 of outsiders) {
    for (const m3 of Object.keys(o2.positions ?? {})) allModes.add(m3);
  }
  for (const c3 of existingMtChildren) {
    for (const m3 of Object.keys(c3.positions ?? {})) allModes.add(m3);
  }
  for (const { node: node2, parentGroup } of crossGroupChildren) {
    for (const m3 of Object.keys(node2.positions ?? {})) allModes.add(m3);
    for (const m3 of Object.keys(parentGroup.positions ?? {})) allModes.add(m3);
  }
  const dataByMode = new Map();
  for (const m3 of allModes) {
    const oldMtPos = mergeTarget.positions?.[m3];
    if (!oldMtPos) continue;
    let allPresent = true;
    for (const c3 of existingMtChildren) {
      if (!c3.positions?.[m3]) {
        allPresent = false;
        break;
      }
    }
    if (allPresent) {
      for (const o2 of outsiders) {
        if (!o2.positions?.[m3]) {
          allPresent = false;
          break;
        }
      }
    }
    if (allPresent) {
      for (const { node: node2, parentGroup } of crossGroupChildren) {
        if (!node2.positions?.[m3] || !parentGroup.positions?.[m3]) {
          allPresent = false;
          break;
        }
      }
    }
    if (!allPresent) continue;
    const survivors = [];
    const adoptionMap = new Map();
    for (const c3 of existingMtChildren) {
      const rel = c3.positions?.[m3];
      survivors.push({
        position: {
          x: oldMtPos.x + rel.x,
          y: oldMtPos.y + rel.y,
        },
        size: c3.size,
        type: c3.type,
      });
    }
    for (const o2 of outsiders) {
      const abs = o2.positions?.[m3];
      survivors.push({
        position: {
          ...abs,
        },
        size: o2.size,
        type: o2.type,
      });
      adoptionMap.set(o2.id, {
        ...abs,
      });
    }
    for (const { node: node2, parentGroup } of crossGroupChildren) {
      const parentAbs = parentGroup.positions?.[m3];
      const rel = node2.positions?.[m3];
      const absPos = {
        x: parentAbs.x + rel.x,
        y: parentAbs.y + rel.y,
      };
      survivors.push({
        position: absPos,
        size: node2.size,
        type: node2.type,
      });
      adoptionMap.set(node2.id, absPos);
    }
    const mtSize =
      readGroupSize(mergeTarget, m3) ??
      mergeTarget.size ??
      defaultNodeSizeForType(mergeTarget.type);
    const newBounds =
      survivors.length > 0
        ? computeGroupBoundsFromChildren(survivors)
        : {
            position: oldMtPos,
            size: mtSize,
          };
    dataByMode.set(m3, {
      oldMtPos,
      newPos: newBounds.position,
      newSize: newBounds.size,
      dx: oldMtPos.x - newBounds.position.x,
      dy: oldMtPos.y - newBounds.position.y,
      adoptionMap,
    });
  }
  const activeData = dataByMode.get(mode2);
  if (!activeData) {
    const candidates2 = [
      mergeTarget,
      ...existingMtChildren,
      ...outsiders,
      ...crossGroupChildren.map((c3) => c3.node),
      ...crossGroupChildren.map((c3) => c3.parentGroup),
    ];
    const seenIds = new Set();
    const missingNodeIds = [];
    for (const n2 of candidates2) {
      if (seenIds.has(n2.id)) continue;
      seenIds.add(n2.id);
      if (!n2.positions?.[mode2]) missingNodeIds.push(n2.id);
    }
    return {
      canvas,
      addedNodes: [],
      removedNodeIds: [],
      updatedNodes: [],
      groupId: null,
      error: {
        code: "incomplete-positions",
        mode: mode2,
        missingNodeIds,
      },
      ...skipFields,
    };
  }
  const activeNewSize = activeData.newSize;
  const adoptionIds = new Set();
  for (const o2 of outsiders) adoptionIds.add(o2.id);
  for (const { node: node2 } of crossGroupChildren) adoptionIds.add(node2.id);
  const updatedNodes = [];
  const nextNodes = [];
  for (const node2 of canvas.nodes) {
    if (dissolvingGroupById.has(node2.id)) continue;
    if (node2.id === mergeTarget.id) {
      const newPositions = {
        ...(node2.positions ?? {}),
      };
      const newSizes = {
        ...(node2.sizes ?? {}),
      };
      for (const [m3, d2] of dataByMode) {
        newPositions[m3] = d2.newPos;
        newSizes[m3] = d2.newSize;
      }
      const existingData = node2.data ?? {};
      const nextData = {
        ...existingData,
        frameMode: "auto",
      };
      const next2 = {
        ...node2,
        positions: newPositions,
        // Legacy `size` mirrors the active mode's bbox so older clients render
        // the right frame; per-mode entries live in `sizes`.
        size: activeNewSize,
        sizes: newSizes,
        data: nextData,
      };
      nextNodes.push(next2);
      updatedNodes.push(next2);
      continue;
    }
    if (node2.parentId === mergeTarget.id) {
      const newPositions = {
        ...(node2.positions ?? {}),
      };
      let modified = false;
      for (const [m3, d2] of dataByMode) {
        if (d2.dx === 0 && d2.dy === 0) continue;
        const rel = node2.positions?.[m3];
        if (!rel) continue;
        newPositions[m3] = {
          x: rel.x + d2.dx,
          y: rel.y + d2.dy,
        };
        modified = true;
      }
      if (modified) {
        const next2 = {
          ...node2,
          positions: newPositions,
        };
        nextNodes.push(next2);
        updatedNodes.push(next2);
      } else {
        nextNodes.push(node2);
      }
      continue;
    }
    if (adoptionIds.has(node2.id)) {
      const newPositions = {
        ...(node2.positions ?? {}),
      };
      for (const [m3, d2] of dataByMode) {
        const abs = d2.adoptionMap.get(node2.id);
        if (!abs) continue;
        newPositions[m3] = {
          x: abs.x - d2.newPos.x,
          y: abs.y - d2.newPos.y,
        };
      }
      const next2 = withParentId(
        {
          ...node2,
          positions: newPositions,
        },
        mergeTarget.id,
      );
      nextNodes.push(next2);
      updatedNodes.push(next2);
      continue;
    }
    nextNodes.push(node2);
  }
  const removedNodeIds = dissolvingGroups.map((g2) => g2.id);
  return {
    canvas: {
      ...canvas,
      nodes: nextNodes,
    },
    addedNodes: [],
    removedNodeIds,
    updatedNodes,
    groupId: mergeTarget.id,
    ...skipFields,
  };
}
