// reconcile-group-geometry-for-mode.js
import { CanvasNodeType } from "../vendor.js";
import {
  computeGroupBoundsFromChildren,
  defaultNodeSizeForType,
  GROUP_NODE_PADDING,
  readGroupSize,
} from "./compute-group-bounds-from-children.js";

function readGroupFrameMode(node2) {
  const raw2 = node2.data?.frameMode;
  return raw2 === "manual" ? "manual" : "auto";
}

export function reconcileGroupGeometryForMode(canvas, mode2) {
  const childrenByParent = new Map();
  for (const node2 of canvas.nodes) {
    if (!node2.parentId) continue;
    const bucket = childrenByParent.get(node2.parentId);
    if (bucket) bucket.push(node2);
    else childrenByParent.set(node2.parentId, [node2]);
  }
  if (childrenByParent.size === 0) {
    return {
      canvas,
      updatedNodes: [],
      changed: false,
    };
  }
  const updatedById = new Map();
  for (const node2 of canvas.nodes) {
    if (node2.type !== CanvasNodeType.Group) continue;
    const children2 = childrenByParent.get(node2.id);
    if (!children2 || children2.length === 0) continue;
    const visibleChildren = children2.filter((c3) => !c3.meta?.hidden);
    if (visibleChildren.length === 0) continue;
    let allVisibleChildrenHavePos = true;
    for (const c3 of visibleChildren) {
      if (!c3.positions?.[mode2]) {
        allVisibleChildrenHavePos = false;
        break;
      }
    }
    if (!allVisibleChildrenHavePos) continue;
    const groupPos = node2.positions?.[mode2];
    if (!groupPos) {
      const absChildren = visibleChildren.map((c3) => {
        const p3 = c3.positions?.[mode2];
        return {
          position: p3,
          size: c3.size,
          type: c3.type,
        };
      });
      const { position: newGroupPos2, size: newGroupSize } =
        computeGroupBoundsFromChildren(absChildren);
      updatedById.set(node2.id, {
        ...node2,
        positions: {
          ...(node2.positions ?? {}),
          [mode2]: newGroupPos2,
        },
        sizes: {
          ...(node2.sizes ?? {}),
          [mode2]: newGroupSize,
        },
      });
      for (const c3 of children2) {
        const abs = c3.positions?.[mode2];
        if (!abs) continue;
        const newRel = {
          x: abs.x - newGroupPos2.x,
          y: abs.y - newGroupPos2.y,
        };
        updatedById.set(c3.id, {
          ...c3,
          positions: {
            ...(c3.positions ?? {}),
            [mode2]: newRel,
          },
        });
      }
      continue;
    }
    const groupSize = readGroupSize(node2, mode2);
    if (!groupSize) continue;
    let relMinX = Number.POSITIVE_INFINITY;
    let relMinY = Number.POSITIVE_INFINITY;
    let relMaxX = Number.NEGATIVE_INFINITY;
    let relMaxY = Number.NEGATIVE_INFINITY;
    for (const c3 of visibleChildren) {
      const p3 = c3.positions?.[mode2];
      const sz = c3.size ?? defaultNodeSizeForType(c3.type);
      relMinX = Math.min(relMinX, p3.x);
      relMinY = Math.min(relMinY, p3.y);
      relMaxX = Math.max(relMaxX, p3.x + sz.width);
      relMaxY = Math.max(relMaxY, p3.y + sz.height);
    }
    const disjoint =
      relMaxX <= 0 ||
      relMinX >= groupSize.width ||
      relMaxY <= 0 ||
      relMinY >= groupSize.height;
    const frameMode = readGroupFrameMode(node2);
    if (disjoint && frameMode !== "manual") {
      const absChildren = visibleChildren.map((c3) => {
        const p3 = c3.positions?.[mode2];
        return {
          position: p3,
          size: c3.size,
          type: c3.type,
        };
      });
      const { position: newGroupPos2, size: newGroupSize } =
        computeGroupBoundsFromChildren(absChildren);
      const sameGeometry =
        newGroupPos2.x === groupPos.x &&
        newGroupPos2.y === groupPos.y &&
        newGroupSize.width === groupSize.width &&
        newGroupSize.height === groupSize.height;
      if (sameGeometry) continue;
      updatedById.set(node2.id, {
        ...node2,
        positions: {
          ...(node2.positions ?? {}),
          [mode2]: newGroupPos2,
        },
        // Reconcile only fixes the broken mode — write `sizes[mode]` so other
        // modes' bboxes stay intact. Legacy `size` is left alone on purpose;
        // mirroring it here would corrupt the other mode's frame visually.
        sizes: {
          ...(node2.sizes ?? {}),
          [mode2]: newGroupSize,
        },
      });
      for (const c3 of children2) {
        const abs = c3.positions?.[mode2];
        if (!abs) continue;
        const newRel = {
          x: abs.x - newGroupPos2.x,
          y: abs.y - newGroupPos2.y,
        };
        updatedById.set(c3.id, {
          ...c3,
          positions: {
            ...(c3.positions ?? {}),
            [mode2]: newRel,
          },
        });
      }
      continue;
    }
    let newLeft;
    let newTop;
    let newRight;
    let newBottom;
    if (frameMode === "manual") {
      newLeft = relMinX < 0 ? relMinX - GROUP_NODE_PADDING.x : 0;
      newTop = relMinY < 0 ? relMinY - GROUP_NODE_PADDING.top : 0;
      newRight =
        relMaxX > groupSize.width
          ? relMaxX + GROUP_NODE_PADDING.x
          : groupSize.width;
      newBottom =
        relMaxY > groupSize.height
          ? relMaxY + GROUP_NODE_PADDING.bottom
          : groupSize.height;
    } else {
      newLeft = relMinX - GROUP_NODE_PADDING.x;
      newTop = relMinY - GROUP_NODE_PADDING.top;
      newRight = relMaxX + GROUP_NODE_PADDING.x;
      newBottom = relMaxY + GROUP_NODE_PADDING.bottom;
    }
    const shiftX = newLeft;
    const shiftY = newTop;
    const newSize = {
      width: newRight - newLeft,
      height: newBottom - newTop,
    };
    const sameFrame =
      shiftX === 0 &&
      shiftY === 0 &&
      newSize.width === groupSize.width &&
      newSize.height === groupSize.height;
    if (sameFrame) continue;
    const newGroupPos = {
      x: groupPos.x + shiftX,
      y: groupPos.y + shiftY,
    };
    updatedById.set(node2.id, {
      ...node2,
      positions: {
        ...(node2.positions ?? {}),
        [mode2]: newGroupPos,
      },
      sizes: {
        ...(node2.sizes ?? {}),
        [mode2]: newSize,
      },
    });
    if (shiftX !== 0 || shiftY !== 0) {
      for (const c3 of children2) {
        const rel = c3.positions?.[mode2];
        if (!rel) continue;
        const newRel = {
          x: rel.x - shiftX,
          y: rel.y - shiftY,
        };
        updatedById.set(c3.id, {
          ...c3,
          positions: {
            ...(c3.positions ?? {}),
            [mode2]: newRel,
          },
        });
      }
    }
  }
  if (updatedById.size === 0) {
    return {
      canvas,
      updatedNodes: [],
      changed: false,
    };
  }
  const nextNodes = canvas.nodes.map((n2) => updatedById.get(n2.id) ?? n2);
  return {
    canvas: {
      ...canvas,
      nodes: nextNodes,
    },
    updatedNodes: Array.from(updatedById.values()),
    changed: true,
  };
}
