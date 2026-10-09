// resolve-derived-collision.js
import { CanvasMode } from "./group-nodes-in-canvas.js";
import {
  DEFAULTS$3,
  DEFAULT_PLACEMENT_GAP,
  DEFAULT_WORKFLOW_LAYER_SPACING,
  DEFAULT_WORKFLOW_NODE_SPACING,
  LEGACY_WORKFLOW_NODE_SPACING,
  rectsOverlap$1,
  rowFirstCandidate,
  verticalClearanceViolation,
} from "./reconcile-group-geometry-for-mode.js";
export function findFreePositionForRects(occupied, newSize, options) {
  const gap = options?.gap ?? DEFAULTS$3.gap;
  const rowTolerance = options?.rowTolerance ?? DEFAULTS$3.rowTolerance;
  const collisionMargin = options?.collisionMargin ?? DEFAULTS$3.collisionMargin;
  const maxCols = options?.maxCols ?? DEFAULTS$3.maxCols;
  const maxShiftAttempts = options?.maxShiftAttempts ?? DEFAULTS$3.maxShiftAttempts;
  const {
    position: candidate,
    rowStartX,
    maxRowWidth,
  } = rowFirstCandidate(occupied, newSize, gap, maxCols, rowTolerance);
  const rect = {
    x: candidate.x,
    y: candidate.y,
    w: newSize.width,
    h: newSize.height,
  };
  for (let attempt = 0; attempt < maxShiftAttempts; attempt++) {
    const blocker = occupied.find((occ) => rectsOverlap$1(rect, occ, collisionMargin));
    if (blocker) {
      const nextX = blocker.x + blocker.w + gap;
      const rightEdgeFromStart = nextX - rowStartX + rect.w;
      if (rightEdgeFromStart <= maxRowWidth) {
        rect.x = nextX;
        continue;
      }
      rect.x = rowStartX;
      rect.y = blocker.y + blocker.h + gap;
      continue;
    }
    let cramper;
    for (const occ of occupied) {
      if (!verticalClearanceViolation(rect, occ, gap, collisionMargin)) continue;
      if (!cramper || occ.y + occ.h > cramper.y + cramper.h) cramper = occ;
    }
    if (!cramper) break;
    rect.y = cramper.y + cramper.h + gap;
  }
  return {
    x: rect.x,
    y: rect.y,
  };
}
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
    const blocker = occupied.find((o2) => rectsOverlap$1(candidate, o2));
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
const MAX_STACK_PER_COLUMN = 5;
const COLUMN_X_TOLERANCE = 10;
const DEFAULT_MAX_DERIVED_COLLISION_SHIFT = 1200;
function resolveDerivedCollision(candidate, fallbackSize, siblingGap, layerGap, collision) {
  const occupied = collision.occupied;
  if (!occupied || occupied.length === 0) return candidate;
  const w3 = collision.newSize?.width ?? fallbackSize.width;
  const h2 = collision.newSize?.height ?? fallbackSize.height;
  const margin = collision.collisionMargin ?? 0;
  const maxShift = collision.maxCollisionShift ?? DEFAULT_MAX_DERIVED_COLLISION_SHIFT;
  const maxAttempts = collision.maxCollisionAttempts ?? Math.max(100, occupied.length + 1);
  const preferAxis = collision.preferAxis ?? "x";
  const originX = candidate.x;
  const originY = candidate.y;
  const budgetX = collision.budgetOrigin?.x ?? originX;
  const budgetY = collision.budgetOrigin?.y ?? originY;
  const rect = {
    x: originX,
    y: originY,
    w: w3,
    h: h2,
  };
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const blocker = occupied.find((o2) => rectsOverlap$1(rect, o2, margin));
    if (!blocker)
      return {
        x: rect.x,
        y: rect.y,
      };
    if (preferAxis === "y") {
      const nextY2 = blocker.y + blocker.h + siblingGap;
      if (nextY2 - budgetY <= maxShift) {
        rect.y = nextY2;
        continue;
      }
      const nextX2 = blocker.x + blocker.w + layerGap;
      rect.y = originY;
      rect.x = nextX2;
      continue;
    }
    const nextX = blocker.x + blocker.w + layerGap;
    if (nextX - budgetX <= maxShift) {
      rect.x = nextX;
      continue;
    }
    const nextY = blocker.y + blocker.h + siblingGap;
    rect.x = originX;
    rect.y = nextY;
  }
  rect.x = originX;
  rect.y = originY;
  for (let attempt = 0; attempt <= occupied.length; attempt++) {
    const blocker = occupied.find((item) => rectsOverlap$1(rect, item, margin));
    if (!blocker)
      return {
        x: rect.x,
        y: rect.y,
      };
    if (preferAxis === "y") {
      rect.x = blocker.x + blocker.w + layerGap;
    } else {
      rect.y = blocker.y + blocker.h + siblingGap;
    }
  }
  return {
    x: rect.x,
    y: rect.y,
  };
}
function rightmostPeerColumn(peers) {
  const columns = [];
  for (const peer of peers) {
    const match2 = columns.find((c3) => Math.abs(c3.x - peer.x) <= COLUMN_X_TOLERANCE);
    if (match2) {
      match2.peers.push(peer);
    } else {
      columns.push({
        x: peer.x,
        peers: [peer],
      });
    }
  }
  return columns.reduce((a2, b3) => (b3.x > a2.x ? b3 : a2)).peers;
}
function localityRectsAreConnected(a2, b3, maxGap) {
  const horizontalGap = Math.max(0, a2.x - (b3.x + b3.width), b3.x - (a2.x + a2.width));
  const verticalGap = Math.max(0, a2.y - (b3.y + b3.height), b3.y - (a2.y + a2.height));
  return horizontalGap <= maxGap && verticalGap <= maxGap;
}
function localityRectGapSquared(a2, b3) {
  const horizontalGap = Math.max(0, a2.x - (b3.x + b3.width), b3.x - (a2.x + a2.width));
  const verticalGap = Math.max(0, a2.y - (b3.y + b3.height), b3.y - (a2.y + a2.height));
  return horizontalGap * horizontalGap + verticalGap * verticalGap;
}
function localDerivedPeers(source, peers, siblingGap, layerGap, newSize) {
  if (peers.length === 0) return peers;
  const sourceSideAnchor = {
    x: source.x + source.width + layerGap,
    y: source.y,
    width: newSize.width,
    height: newSize.height,
  };
  const remaining = peers.map((peer) => ({
    peer,
    rect: {
      x: peer.x,
      y: peer.y,
      width: peer.width ?? newSize.width,
      height: peer.height,
    },
  }));
  const seed = remaining
    .filter(({ rect }) =>
      localityRectsAreConnected(sourceSideAnchor, rect, DEFAULT_MAX_DERIVED_COLLISION_SHIFT),
    )
    .reduce(
      (closest, candidate) => {
        if (!closest) return candidate;
        return localityRectGapSquared(sourceSideAnchor, candidate.rect) <
          localityRectGapSquared(sourceSideAnchor, closest.rect)
          ? candidate
          : closest;
      },
      void 0,
    );
  if (!seed) return [];
  const localityGap = Math.max(siblingGap, LEGACY_WORKFLOW_NODE_SPACING);
  const rowStride = Math.max(source.height, newSize.height, seed.rect.height) + localityGap;
  const minLocalY = seed.rect.y - localityGap;
  const maxLocalY = seed.rect.y + (MAX_STACK_PER_COLUMN - 1) * rowStride;
  const bandPeers = remaining.filter(({ rect }) => rect.y >= minLocalY && rect.y <= maxLocalY);
  const anchors2 = [sourceSideAnchor];
  const local = [];
  let foundConnectedPeer = true;
  while (foundConnectedPeer) {
    foundConnectedPeer = false;
    for (let index2 = bandPeers.length - 1; index2 >= 0; index2 -= 1) {
      const candidate = bandPeers[index2];
      if (
        !anchors2.some((anchor) =>
          localityRectsAreConnected(anchor, candidate.rect, DEFAULT_MAX_DERIVED_COLLISION_SHIFT),
        )
      ) {
        continue;
      }
      local.push(candidate.peer);
      anchors2.push(candidate.rect);
      bandPeers.splice(index2, 1);
      foundConnectedPeer = true;
    }
  }
  return local;
}
export function computeDerivedNodePosition(
  source,
  peers,
  siblingGap = DEFAULT_WORKFLOW_NODE_SPACING,
  collision,
  probeOnStack = false,
  layerGap = DEFAULT_WORKFLOW_LAYER_SPACING,
) {
  const fallbackSize = {
    width: source.width,
    height: source.height,
  };
  const newSize = collision?.newSize ?? fallbackSize;
  const localPeers = localDerivedPeers(source, peers, siblingGap, layerGap, newSize);
  if (localPeers.length === 0) {
    const candidate = {
      x: source.x + source.width + layerGap,
      y: source.y,
    };
    return collision
      ? resolveDerivedCollision(candidate, fallbackSize, siblingGap, layerGap, collision)
      : candidate;
  }
  const column = rightmostPeerColumn(localPeers);
  const fallbackPeerWidth = newSize.width;
  let stackCandidate;
  if (column.length >= MAX_STACK_PER_COLUMN) {
    const rightEdge = column.reduce(
      (max2, peer) => Math.max(max2, peer.x + (peer.width ?? fallbackPeerWidth)),
      Number.NEGATIVE_INFINITY,
    );
    const topY = column.reduce((min2, peer) => Math.min(min2, peer.y), Number.POSITIVE_INFINITY);
    stackCandidate = {
      x: rightEdge + layerGap,
      y: topY,
    };
  } else {
    const bottomMost = column.reduce((a2, b3) => (b3.y + b3.height > a2.y + a2.height ? b3 : a2));
    stackCandidate = {
      x: bottomMost.x,
      y: bottomMost.y + bottomMost.height + siblingGap,
    };
  }
  return probeOnStack && collision
    ? resolveDerivedCollision(stackCandidate, fallbackSize, siblingGap, layerGap, collision)
    : stackCandidate;
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
function asDraftMap$1(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
export function mergePopoverDraftMaps(base2, override) {
  if (override === null) return void 0;
  const baseMap = asDraftMap$1(base2);
  const overrideMap = asDraftMap$1(override);
  if (!baseMap) return overrideMap;
  if (!overrideMap) return baseMap;
  const merged = {
    ...baseMap,
  };
  for (const [key2, overrideEntry] of Object.entries(overrideMap)) {
    if (overrideEntry === null) {
      delete merged[key2];
      continue;
    }
    const baseEntryMap = asDraftMap$1(baseMap[key2]);
    const overrideEntryMap = asDraftMap$1(overrideEntry);
    merged[key2] =
      baseEntryMap && overrideEntryMap
        ? {
            ...baseEntryMap,
            ...overrideEntryMap,
          }
        : overrideEntry;
  }
  return Object.keys(merged).length > 0 ? merged : void 0;
}
export function isCloneNode(node2) {
  return node2.meta?.cloneOf != null;
}
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
  return typeof status === "string" && DRAFT_PROTECTED_GENERATION_STATUSES.has(status);
}
export const TRANSIENT_DATA_KEYS = ["textRevision", "tableRevision", "assetMissing"];
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
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
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
export const GROUP_RELAYOUT_GAP = DEFAULT_WORKFLOW_NODE_SPACING;
export const GROUP_RELAYOUT_VERTICAL_COL_GAP = DEFAULT_WORKFLOW_LAYER_SPACING;
export const GROUP_RELAYOUT_VERTICAL_ROW_GAP = 100;
