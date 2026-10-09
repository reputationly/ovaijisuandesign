// compute-group-bounds-from-children.js
import { CanvasNodeType } from "../vendor.js";
const GENERATION_REFERENCE_DATA_KEYS = [
  "referenceImageIds",
  "referenceAudioIds",
  "referenceVideoIds",
  "referenceTextIds",
];
function asDataRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return void 0;
  return value;
}
function collectNodeIdentities(node2) {
  const identities = new Set([node2.id]);
  if (typeof node2.assetId === "string" && node2.assetId.length > 0)
    identities.add(node2.assetId);
  const dataAssetId = asDataRecord(node2.data)?.assetId;
  if (typeof dataAssetId === "string" && dataAssetId.length > 0)
    identities.add(dataAssetId);
  return identities;
}
function collectReferenceIds(node2, options) {
  if (!node2) return [];
  const collected = [];
  const data2 = asDataRecord(node2.data);
  if (data2) {
    for (const key2 of GENERATION_REFERENCE_DATA_KEYS) {
      const references = data2[key2];
      if (!Array.isArray(references)) continue;
      for (const reference of references) {
        if (typeof reference === "string" && reference.length > 0)
          collected.push(reference);
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
export function isGenerationErrorStatus(status) {
  return (
    status === "error" ||
    status === "recoverable_error" ||
    status === "status_unknown"
  );
}
const GENERATION_REFUND_STATUSES = ["none", "pending", "refunded"];
export function isGenerationRefundStatus(value) {
  return GENERATION_REFUND_STATUSES.includes(value);
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
  if (node2.type !== "video" || node2.isEmpty !== true || !!node2.assetId)
    return false;
  const status = node2.data?.status;
  return (
    typeof status !== "string" || !VIDEO_EMPTY_NON_IDLE_STATUSES.has(status)
  );
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
