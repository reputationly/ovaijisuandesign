// find-free-position-from-anchor.js
import { CanvasMode } from "./compute-group-bounds-from-children.js";
import { DEFAULT_PLACEMENT_GAP, rectsOverlap } from "./ungroup-in-canvas.js";
export function findFreePositionFromAnchor(anchor, size2, occupied, options) {
  const gap = options?.gap ?? DEFAULT_PLACEMENT_GAP;
  const maxIterations = options?.maxIterations ?? 200;
  const shiftAxis = options?.shiftAxis ?? "x";
  const maxShift = options?.maxShift ?? Number.POSITIVE_INFINITY;
  const candidate = {
    x: anchor.x,
    y: anchor.y,
    w: size2.width,
    h: size2.height,
  };
  for (let i2 = 0; i2 < maxIterations; i2++) {
    const blocker = occupied.find((o2) => rectsOverlap(candidate, o2));
    if (!blocker) break;
    if (shiftAxis === "x") {
      const nextX = blocker.x + blocker.w + gap;
      if (nextX - anchor.x <= maxShift) {
        candidate.x = nextX;
        continue;
      }
      const nextY = blocker.y + blocker.h + gap;
      if (nextY - anchor.y > maxShift)
        return {
          x: anchor.x,
          y: anchor.y,
        };
      candidate.x = anchor.x;
      candidate.y = nextY;
    } else {
      const nextY = blocker.y + blocker.h + gap;
      if (nextY - anchor.y <= maxShift) {
        candidate.y = nextY;
        continue;
      }
      const nextX = blocker.x + blocker.w + gap;
      if (nextX - anchor.x > maxShift)
        return {
          x: anchor.x,
          y: anchor.y,
        };
      candidate.y = anchor.y;
      candidate.x = nextX;
    }
  }
  return {
    x: candidate.x,
    y: candidate.y,
  };
}
export const DRAFT_PROTECTED_GENERATION_STATUSES = new Set([
  "pending",
  "generating",
  "loading",
  "error",
  "recoverable_error",
  "status_unknown",
  "queue_paused",
]);
export function deriveEdgeId(sourceId, targetId) {
  return `${sourceId}->${targetId}`;
}
export function parseNodeId(id2) {
  const sep = id2.lastIndexOf("~");
  if (sep === -1)
    return {
      assetId: id2,
    };
  return {
    assetId: id2.slice(0, sep),
    cloneId: id2.slice(sep + 1),
  };
}
export function isEmptyNode(node2) {
  return node2.isEmpty === true;
}
export function isUnmaterialisedGenerationNode(node2) {
  const status = node2.data?.status;
  return (
    typeof status === "string" &&
    DRAFT_PROTECTED_GENERATION_STATUSES.has(status)
  );
}
export const TRANSIENT_DATA_KEYS = [
  "textRevision",
  "tableRevision",
  "assetMissing",
];
export const ASSET_PROJECTED_DATA_KEYS = [
  "prompt",
  "description",
  "model",
  "model_id",
  "params",
  "backend",
  "source_tool",
  "cloudTraceId",
  "cloudTaskId",
  "providerTaskId",
  "time",
  "width",
  "height",
  "referenceImageIds",
  "referenceVideoIds",
  "referenceAudioIds",
  // Unlike media references, text references are not projected by the asset
  // REST contract, so node.data remains their durable source across reloads.
  "voiceId",
  "lyrics",
];
const VALID_CANVAS_MODES = new Set(Object.values(CanvasMode));
export function isFiniteCanvasPosition(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return false;
  const candidate = value;
  return Number.isFinite(candidate.x) && Number.isFinite(candidate.y);
}
export function sanitizeCanvasPositions(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {
      positions: {},
      changed: true,
      repairedPositionCount: 0,
    };
  }
  const positions = {};
  let changed = false;
  let repairedPositionCount = 0;
  for (const [mode2, position2] of Object.entries(value)) {
    if (!VALID_CANVAS_MODES.has(mode2) || !isFiniteCanvasPosition(position2)) {
      changed = true;
      repairedPositionCount += 1;
      continue;
    }
    const candidate = position2;
    positions[mode2] = {
      x: candidate.x,
      y: candidate.y,
    };
    if (Object.keys(candidate).length !== 2) {
      changed = true;
      repairedPositionCount += 1;
    }
  }
  if (!changed) {
    return {
      positions: value,
      changed: false,
      repairedPositionCount: 0,
    };
  }
  return {
    positions,
    changed: true,
    repairedPositionCount,
  };
}
export function sanitizeCanvasFileNodePositions(nodes) {
  let changed = false;
  let repairedNodeCount = 0;
  let repairedPositionCount = 0;
  const sanitizedNodes = nodes.map((node2) => {
    const sanitized = sanitizeCanvasPositions(node2.positions);
    if (!sanitized.changed) return node2;
    changed = true;
    repairedNodeCount += 1;
    repairedPositionCount += sanitized.repairedPositionCount;
    return {
      ...node2,
      positions: sanitized.positions,
    };
  });
  if (!changed) {
    return {
      // The sanitizer never mutates this array. Preserve the caller's array
      // identity so clean snapshots do not cause needless cache invalidation.
      nodes,
      changed: false,
      repairedNodeCount: 0,
      repairedPositionCount: 0,
    };
  }
  return {
    nodes: sanitizedNodes,
    changed: true,
    repairedNodeCount,
    repairedPositionCount,
  };
}
