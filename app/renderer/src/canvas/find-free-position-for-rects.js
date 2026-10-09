// find-free-position-for-rects.js
import { DEFAULT_PLACEMENT_GAP, rectsOverlap$1 } from "./ungroup-in-canvas.js";

const DEFAULTS$3 = {
  gap: DEFAULT_PLACEMENT_GAP,
  rowTolerance: 10,
  collisionMargin: 5,
  maxCols: 8,
  maxShiftAttempts: 50,
};

function verticalClearanceViolation(rect, above, gap, margin) {
  const horizontalOverlap =
    rect.x < above.x + above.w + margin && rect.x + rect.w + margin > above.x;
  if (!horizontalOverlap) return false;
  const aboveBottom = above.y + above.h;
  if (aboveBottom > rect.y) return false;
  return rect.y - aboveBottom < gap;
}

function groupRectsByRows(rects, tolerance) {
  if (rects.length === 0) return [];
  const sorted = [...rects].sort((a2, b3) => a2.y - b3.y);
  const rows = [];
  for (const rect of sorted) {
    const match2 = rows.find((row) => Math.abs(row.y - rect.y) <= tolerance);
    if (match2) {
      match2.rects.push(rect);
      match2.maxHeight = Math.max(match2.maxHeight, rect.h);
    } else {
      rows.push({
        y: rect.y,
        rects: [rect],
        maxHeight: rect.h,
      });
    }
  }
  for (const row of rows) row.rects.sort((a2, b3) => a2.x - b3.x);
  return rows;
}

function rowFirstCandidate(occupied, newSize, gap, maxCols, rowTolerance) {
  const referenceWidth = newSize.width;
  const maxRowWidth = referenceWidth * maxCols + gap * (maxCols - 1);
  if (occupied.length === 0) {
    return {
      position: {
        x: 0,
        y: 0,
      },
      rowStartX: 0,
      maxRowWidth,
    };
  }
  const rows = groupRectsByRows(occupied, rowTolerance);
  const lastRow = rows[rows.length - 1];
  const firstRow = rows[0];
  const rowStartX = firstRow.rects[0].x;
  const lastRect = lastRow.rects[lastRow.rects.length - 1];
  const appendX = lastRect.x + lastRect.w + gap;
  const appendRightEdgeFromStart = appendX + newSize.width - rowStartX;
  if (
    lastRow.rects.length < maxCols &&
    appendRightEdgeFromStart <= maxRowWidth
  ) {
    return {
      position: {
        x: appendX,
        y: lastRow.y,
      },
      rowStartX,
      maxRowWidth,
    };
  }
  return {
    position: {
      x: rowStartX,
      y: lastRow.y + lastRow.maxHeight + gap,
    },
    rowStartX,
    maxRowWidth,
  };
}

export function findFreePositionForRects(occupied, newSize, options) {
  const gap = options?.gap ?? DEFAULTS$3.gap;
  const rowTolerance = options?.rowTolerance ?? DEFAULTS$3.rowTolerance;
  const collisionMargin =
    options?.collisionMargin ?? DEFAULTS$3.collisionMargin;
  const maxCols = options?.maxCols ?? DEFAULTS$3.maxCols;
  const maxShiftAttempts =
    options?.maxShiftAttempts ?? DEFAULTS$3.maxShiftAttempts;
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
    const blocker = occupied.find((occ) =>
      rectsOverlap$1(rect, occ, collisionMargin),
    );
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
      if (!verticalClearanceViolation(rect, occ, gap, collisionMargin))
        continue;
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
