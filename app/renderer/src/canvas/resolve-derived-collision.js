// resolve-derived-collision.js
import {
  DEFAULT_WORKFLOW_LAYER_SPACING,
  DEFAULT_WORKFLOW_NODE_SPACING,
  rectsOverlap,
} from "./ungroup-in-canvas.js";
const LEGACY_WORKFLOW_NODE_SPACING = 100;
const MAX_STACK_PER_COLUMN = 5;
const COLUMN_X_TOLERANCE = 10;
const DEFAULT_MAX_DERIVED_COLLISION_SHIFT = 1200;
function resolveDerivedCollision(
  candidate,
  fallbackSize,
  siblingGap,
  layerGap,
  collision,
) {
  const occupied = collision.occupied;
  if (!occupied || occupied.length === 0) return candidate;
  const width = collision.newSize?.width ?? fallbackSize.width;
  const height = collision.newSize?.height ?? fallbackSize.height;
  const margin = collision.collisionMargin ?? 0;
  const maxShift =
    collision.maxCollisionShift ?? DEFAULT_MAX_DERIVED_COLLISION_SHIFT;
  const maxAttempts =
    collision.maxCollisionAttempts ?? Math.max(100, occupied.length + 1);
  const preferAxis = collision.preferAxis ?? "x";
  const originX = candidate.x;
  const originY = candidate.y;
  const budgetX = collision.budgetOrigin?.x ?? originX;
  const budgetY = collision.budgetOrigin?.y ?? originY;
  const rect = {
    x: originX,
    y: originY,
    w: width,
    h: height,
  };
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const blocker = occupied.find((occupiedRect) => rectsOverlap(rect, occupiedRect, margin));
    if (!blocker)
      return {
        x: rect.x,
        y: rect.y,
      };
    if (preferAxis === "y") {
      const nextY = blocker.y + blocker.h + siblingGap;
      if (nextY - budgetY <= maxShift) {
        rect.y = nextY;
        continue;
      }
      const nextX = blocker.x + blocker.w + layerGap;
      rect.y = originY;
      rect.x = nextX;
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
    const blocker = occupied.find((item) => rectsOverlap(rect, item, margin));
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
    const match = columns.find(
      (column) => Math.abs(column.x - peer.x) <= COLUMN_X_TOLERANCE,
    );
    if (match) {
      match.peers.push(peer);
    } else {
      columns.push({
        x: peer.x,
        peers: [peer],
      });
    }
  }
  return columns.reduce((firstColumn, secondColumn) => (secondColumn.x > firstColumn.x ? secondColumn : firstColumn)).peers;
}
function localityRectsAreConnected(firstRect, secondRect, maxGap) {
  const horizontalGap = Math.max(
    0,
    firstRect.x - (secondRect.x + secondRect.width),
    secondRect.x - (firstRect.x + firstRect.width),
  );
  const verticalGap = Math.max(
    0,
    firstRect.y - (secondRect.y + secondRect.height),
    secondRect.y - (firstRect.y + firstRect.height),
  );
  return horizontalGap <= maxGap && verticalGap <= maxGap;
}
function localityRectGapSquared(anchorRect, candidateRect) {
  const horizontalGap = Math.max(
    0,
    anchorRect.x - (candidateRect.x + candidateRect.width),
    candidateRect.x - (anchorRect.x + anchorRect.width),
  );
  const verticalGap = Math.max(
    0,
    anchorRect.y - (candidateRect.y + candidateRect.height),
    candidateRect.y - (anchorRect.y + anchorRect.height),
  );
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
      localityRectsAreConnected(
        sourceSideAnchor,
        rect,
        DEFAULT_MAX_DERIVED_COLLISION_SHIFT,
      ),
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
  const rowStride =
    Math.max(source.height, newSize.height, seed.rect.height) + localityGap;
  const minLocalY = seed.rect.y - localityGap;
  const maxLocalY = seed.rect.y + (MAX_STACK_PER_COLUMN - 1) * rowStride;
  const bandPeers = remaining.filter(
    ({ rect }) => rect.y >= minLocalY && rect.y <= maxLocalY,
  );
  const anchors = [sourceSideAnchor];
  const local = [];
  let foundConnectedPeer = true;
  while (foundConnectedPeer) {
    foundConnectedPeer = false;
    for (let index = bandPeers.length - 1; index >= 0; index -= 1) {
      const candidate = bandPeers[index];
      if (
        !anchors.some((anchor) =>
          localityRectsAreConnected(
            anchor,
            candidate.rect,
            DEFAULT_MAX_DERIVED_COLLISION_SHIFT,
          ),
        )
      ) {
        continue;
      }
      local.push(candidate.peer);
      anchors.push(candidate.rect);
      bandPeers.splice(index, 1);
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
  const localPeers = localDerivedPeers(
    source,
    peers,
    siblingGap,
    layerGap,
    newSize,
  );
  if (localPeers.length === 0) {
    const candidate = {
      x: source.x + source.width + layerGap,
      y: source.y,
    };
    return collision
      ? resolveDerivedCollision(
          candidate,
          fallbackSize,
          siblingGap,
          layerGap,
          collision,
        )
      : candidate;
  }
  const column = rightmostPeerColumn(localPeers);
  const fallbackPeerWidth = newSize.width;
  let stackCandidate;
  if (column.length >= MAX_STACK_PER_COLUMN) {
    const rightEdge = column.reduce(
      (max, peer) =>
        Math.max(max, peer.x + (peer.width ?? fallbackPeerWidth)),
      Number.NEGATIVE_INFINITY,
    );
    const topY = column.reduce(
      (min, peer) => Math.min(min, peer.y),
      Number.POSITIVE_INFINITY,
    );
    stackCandidate = {
      x: rightEdge + layerGap,
      y: topY,
    };
  } else {
    const bottomMost = column.reduce((currentPeer, candidatePeer) =>
      candidatePeer.y + candidatePeer.height > currentPeer.y + currentPeer.height ? candidatePeer : currentPeer,
    );
    stackCandidate = {
      x: bottomMost.x,
      y: bottomMost.y + bottomMost.height + siblingGap,
    };
  }
  return probeOnStack && collision
    ? resolveDerivedCollision(
        stackCandidate,
        fallbackSize,
        siblingGap,
        layerGap,
        collision,
      )
    : stackCandidate;
}
