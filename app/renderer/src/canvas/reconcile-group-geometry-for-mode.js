// reconcile-group-geometry-for-mode.js
import { CanvasNodeType } from "../vendor.js";
import {
  computeGroupBoundsFromChildren,
  defaultNodeSizeForType,
  GROUP_NODE_PADDING,
  readGroupSize,
} from "./compute-group-bounds-from-children.js";

function readGroupFrameMode(node) {
  const raw = node.data?.frameMode;
  return raw === "manual" ? "manual" : "auto";
}

export function reconcileGroupGeometryForMode(canvas, mode) {
  const childrenByParent = new Map();
  for (const node of canvas.nodes) {
    if (!node.parentId) continue;
    const bucket = childrenByParent.get(node.parentId);
    if (bucket) bucket.push(node);
    else childrenByParent.set(node.parentId, [node]);
  }
  if (childrenByParent.size === 0) {
    return {
      canvas,
      updatedNodes: [],
      changed: false,
    };
  }
  const updatedById = new Map();
  for (const node of canvas.nodes) {
    if (node.type !== CanvasNodeType.Group) continue;
    const children = childrenByParent.get(node.id);
    if (!children || children.length === 0) continue;
    const visibleChildren = children.filter((child) => !child.meta?.hidden);
    if (visibleChildren.length === 0) continue;
    let allVisibleChildrenHavePos = true;
    for (const child of visibleChildren) {
      if (!child.positions?.[mode]) {
        allVisibleChildrenHavePos = false;
        break;
      }
    }
    if (!allVisibleChildrenHavePos) continue;
    const groupPos = node.positions?.[mode];
    if (!groupPos) {
      const absChildren = visibleChildren.map((child) => {
        const childPosition = child.positions?.[mode];
        return {
          position: childPosition,
          size: child.size,
          type: child.type,
        };
      });
      const { position: newGroupPos, size: newGroupSize } =
        computeGroupBoundsFromChildren(absChildren);
      updatedById.set(node.id, {
        ...node,
        positions: {
          ...(node.positions ?? {}),
          [mode]: newGroupPos,
        },
        sizes: {
          ...(node.sizes ?? {}),
          [mode]: newGroupSize,
        },
      });
      for (const child of children) {
        const abs = child.positions?.[mode];
        if (!abs) continue;
        const newRel = {
          x: abs.x - newGroupPos.x,
          y: abs.y - newGroupPos.y,
        };
        updatedById.set(child.id, {
          ...child,
          positions: {
            ...(child.positions ?? {}),
            [mode]: newRel,
          },
        });
      }
      continue;
    }
    const groupSize = readGroupSize(node, mode);
    if (!groupSize) continue;
    let relMinX = Number.POSITIVE_INFINITY;
    let relMinY = Number.POSITIVE_INFINITY;
    let relMaxX = Number.NEGATIVE_INFINITY;
    let relMaxY = Number.NEGATIVE_INFINITY;
    for (const child of visibleChildren) {
      const childPosition = child.positions?.[mode];
      const sz = child.size ?? defaultNodeSizeForType(child.type);
      relMinX = Math.min(relMinX, childPosition.x);
      relMinY = Math.min(relMinY, childPosition.y);
      relMaxX = Math.max(relMaxX, childPosition.x + sz.width);
      relMaxY = Math.max(relMaxY, childPosition.y + sz.height);
    }
    const disjoint =
      relMaxX <= 0 ||
      relMinX >= groupSize.width ||
      relMaxY <= 0 ||
      relMinY >= groupSize.height;
    const frameMode = readGroupFrameMode(node);
    if (disjoint && frameMode !== "manual") {
      const absChildren = visibleChildren.map((child) => {
        const childPosition = child.positions?.[mode];
        return {
          position: childPosition,
          size: child.size,
          type: child.type,
        };
      });
      const { position: newGroupPos, size: newGroupSize } =
        computeGroupBoundsFromChildren(absChildren);
      const sameGeometry =
        newGroupPos.x === groupPos.x &&
        newGroupPos.y === groupPos.y &&
        newGroupSize.width === groupSize.width &&
        newGroupSize.height === groupSize.height;
      if (sameGeometry) continue;
      updatedById.set(node.id, {
        ...node,
        positions: {
          ...(node.positions ?? {}),
          [mode]: newGroupPos,
        },
        // Reconcile only fixes the broken mode — write `sizes[mode]` so other
        // modes' bboxes stay intact. Legacy `size` is left alone on purpose;
        // mirroring it here would corrupt the other mode's frame visually.
        sizes: {
          ...(node.sizes ?? {}),
          [mode]: newGroupSize,
        },
      });
      for (const child of children) {
        const abs = child.positions?.[mode];
        if (!abs) continue;
        const newRel = {
          x: abs.x - newGroupPos.x,
          y: abs.y - newGroupPos.y,
        };
        updatedById.set(child.id, {
          ...child,
          positions: {
            ...(child.positions ?? {}),
            [mode]: newRel,
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
    updatedById.set(node.id, {
      ...node,
      positions: {
        ...(node.positions ?? {}),
        [mode]: newGroupPos,
      },
      sizes: {
        ...(node.sizes ?? {}),
        [mode]: newSize,
      },
    });
    if (shiftX !== 0 || shiftY !== 0) {
      for (const child of children) {
        const rel = child.positions?.[mode];
        if (!rel) continue;
        const newRel = {
          x: rel.x - shiftX,
          y: rel.y - shiftY,
        };
        updatedById.set(child.id, {
          ...child,
          positions: {
            ...(child.positions ?? {}),
            [mode]: newRel,
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
  const nextNodes = canvas.nodes.map((node) => updatedById.get(node.id) ?? node);
  return {
    canvas: {
      ...canvas,
      nodes: nextNodes,
    },
    updatedNodes: Array.from(updatedById.values()),
    changed: true,
  };
}
