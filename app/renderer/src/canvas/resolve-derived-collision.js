// resolve-derived-collision.js
import {
  DEFAULT_WORKFLOW_LAYER_SPACING,
  DEFAULT_WORKFLOW_NODE_SPACING,
  rectsOverlap$1,
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
  const w3 = collision.newSize?.width ?? fallbackSize.width;
  const h2 = collision.newSize?.height ?? fallbackSize.height;
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
    const match2 = columns.find(
      (c3) => Math.abs(c3.x - peer.x) <= COLUMN_X_TOLERANCE,
    );
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
  const horizontalGap = Math.max(
    0,
    a2.x - (b3.x + b3.width),
    b3.x - (a2.x + a2.width),
  );
  const verticalGap = Math.max(
    0,
    a2.y - (b3.y + b3.height),
    b3.y - (a2.y + a2.height),
  );
  return horizontalGap <= maxGap && verticalGap <= maxGap;
}

function localityRectGapSquared(a2, b3) {
  const horizontalGap = Math.max(
    0,
    a2.x - (b3.x + b3.width),
    b3.x - (a2.x + a2.width),
  );
  const verticalGap = Math.max(
    0,
    a2.y - (b3.y + b3.height),
    b3.y - (a2.y + a2.height),
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
  const anchors2 = [sourceSideAnchor];
  const local = [];
  let foundConnectedPeer = true;
  while (foundConnectedPeer) {
    foundConnectedPeer = false;
    for (let index2 = bandPeers.length - 1; index2 >= 0; index2 -= 1) {
      const candidate = bandPeers[index2];
      if (
        !anchors2.some((anchor) =>
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
      (max2, peer) =>
        Math.max(max2, peer.x + (peer.width ?? fallbackPeerWidth)),
      Number.NEGATIVE_INFINITY,
    );
    const topY = column.reduce(
      (min2, peer) => Math.min(min2, peer.y),
      Number.POSITIVE_INFINITY,
    );
    stackCandidate = {
      x: rightEdge + layerGap,
      y: topY,
    };
  } else {
    const bottomMost = column.reduce((a2, b3) =>
      b3.y + b3.height > a2.y + a2.height ? b3 : a2,
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
