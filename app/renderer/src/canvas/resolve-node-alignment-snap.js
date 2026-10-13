// resolve-node-alignment-snap.js
import { intersectsViewport } from "./get-alignment-reference-ids.js";

const ALIGNMENT_SNAP_DISTANCE = 5;

const ALIGNMENT_RELEASE_DISTANCE = 8;

const EPSILON = 1e-6;

const otherAxis = (axis) => (axis === "x" ? "y" : "x");

const length = (rect, axis) => (axis === "x" ? rect.width : rect.height);

const end = (rect, axis) => rect[axis] + length(rect, axis);

const anchors = (rect, axis) => [
  rect[axis],
  rect[axis] + length(rect, axis) / 2,
  end(rect, axis),
];

const inViewport = (value, viewport, axis) =>
  value >= viewport[axis] && value <= end(viewport, axis);

function candidatesForAxis(moving, references, viewport, axis, tolerance) {
  const candidates = [];
  const cross = otherAxis(axis);
  const movingAnchors = anchors(moving, axis);
  for (const ref of references) {
    const separation = Math.max(
      0,
      ref[cross] - end(moving, cross),
      moving[cross] - end(ref, cross),
    );
    for (const [targetIndex, target] of anchors(ref, axis).entries()) {
      if (!inViewport(target, viewport, axis)) continue;
      for (const [sourceIndex, source] of movingAnchors.entries()) {
        const delta = target - source;
        if (Math.abs(delta) > tolerance || !inViewport(source, viewport, axis))
          continue;
        candidates.push({
          key: `align:${ref.id}:${targetIndex}:${sourceIndex}`,
          delta,
          priority: sourceIndex === targetIndex ? 0 : 1,
          separation,
        });
      }
    }
  }
  return candidates;
}

function chooseCandidate(candidates, zoom, lock) {
  const retained = candidates.find(
    (candidate) =>
      candidate.key === lock &&
      Math.abs(candidate.delta) * zoom <= ALIGNMENT_RELEASE_DISTANCE,
  );
  if (retained) return retained;
  return candidates
    .filter(
      (candidate) =>
        Math.abs(candidate.delta) * zoom <= ALIGNMENT_SNAP_DISTANCE,
    )
    .sort(
      (leftCandidate, rightCandidate) =>
        Math.abs(leftCandidate.delta) - Math.abs(rightCandidate.delta) ||
        leftCandidate.priority - rightCandidate.priority ||
        leftCandidate.separation - rightCandidate.separation ||
        leftCandidate.key.localeCompare(rightCandidate.key),
    )[0];
}

function alignmentGuides(moving, references, viewport, axis) {
  const cross = otherAxis(axis);
  const lines = new Map();
  for (const source of anchors(moving, axis)) {
    if (!inViewport(source, viewport, axis)) continue;
    for (const ref of references) {
      if (
        !anchors(ref, axis).some(
          (target) => Math.abs(target - source) < EPSILON,
        )
      )
        continue;
      const line = lines.get(source) ?? {
        start: moving[cross],
        end: end(moving, cross),
      };
      line.start = Math.min(line.start, ref[cross]);
      line.end = Math.max(line.end, end(ref, cross));
      lines.set(source, line);
    }
  }
  return Array.from(lines, ([position, line]) =>
    axis === "x"
      ? {
          kind: "alignment",
          x1: position,
          x2: position,
          y1: line.start,
          y2: line.end,
        }
      : {
          kind: "alignment",
          y1: position,
          y2: position,
          x1: line.start,
          x2: line.end,
        },
  );
}

export function resolveNodeAlignmentSnap(input, locks = {}) {
  const { movingBounds: moving, viewport, zoom } = input;
  const empty = {
    delta: {
      x: 0,
      y: 0,
    },
    guides: [],
    locks: {},
  };
  if (
    input.bypass ||
    !Number.isFinite(zoom) ||
    zoom <= 0 ||
    !intersectsViewport(moving, viewport)
  )
    return empty;
  const references = input.references.filter((ref) =>
    intersectsViewport(ref, viewport),
  );
  const chosen = {};
  for (const axis of ["x", "y"]) {
    chosen[axis] = chooseCandidate(
      candidatesForAxis(
        moving,
        references,
        viewport,
        axis,
        ALIGNMENT_RELEASE_DISTANCE / zoom,
      ),
      zoom,
      locks[axis],
    );
  }
  const snapped = {
    ...moving,
    x: moving.x + (chosen.x?.delta ?? 0),
    y: moving.y + (chosen.y?.delta ?? 0),
  };
  const guides = [];
  const nextLocks = {};
  for (const axis of ["x", "y"]) {
    const candidate = chosen[axis];
    if (!candidate) continue;
    nextLocks[axis] = candidate.key;
    guides.push(...alignmentGuides(snapped, references, viewport, axis));
  }
  return {
    delta: {
      x: chosen.x?.delta ?? 0,
      y: chosen.y?.delta ?? 0,
    },
    guides,
    locks: nextLocks,
  };
}
