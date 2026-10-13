// place-vertical-layered.js
import {
  DEFAULT_WORKFLOW_LAYER_SPACING,
  DEFAULT_WORKFLOW_NODE_SPACING,
} from "./ungroup-in-canvas.js";
import { resolveNodeFootprint } from "./placeholder-node-size.js";
import { CanvasNodeType } from "../vendor.js";
import {
  GROUP_NODE_PADDING,
  readGroupSize,
} from "./compute-group-bounds-from-children.js";

const GROUP_RELAYOUT_GAP = DEFAULT_WORKFLOW_NODE_SPACING;

const GROUP_RELAYOUT_VERTICAL_COL_GAP = DEFAULT_WORKFLOW_LAYER_SPACING;

const GROUP_RELAYOUT_VERTICAL_ROW_GAP = 100;

function resolveChildSize(child, mode) {
  return resolveNodeFootprint(child, mode);
}

function pickGridCols(childCount) {
  return Math.max(1, Math.round(Math.sqrt(childCount)));
}

function placeGrid(children, cols, cell, gap) {
  const placed = [];
  if (children.length === 0) {
    return {
      children: placed,
      contentSize: {
        width: 0,
        height: 0,
      },
    };
  }
  const rowCount = Math.ceil(children.length / cols);
  const rowHeights = new Array(rowCount).fill(0);
  for (let childIndex = 0; childIndex < children.length; childIndex++) {
    const row = Math.floor(childIndex / cols);
    const childHeight = children[childIndex].size.height;
    if (childHeight > rowHeights[row]) rowHeights[row] = childHeight;
  }
  const rowYs = new Array(rowCount);
  let cursor = 0;
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    rowYs[rowIndex] = cursor;
    cursor += rowHeights[rowIndex] + (rowIndex < rowCount - 1 ? gap : 0);
  }
  const totalHeight = cursor;
  for (let childIndex = 0; childIndex < children.length; childIndex++) {
    const child = children[childIndex];
    const row = Math.floor(childIndex / cols);
    const col = childIndex % cols;
    const cellX = col * (cell.width + gap);
    placed.push({
      id: child.id,
      relX: cellX + (cell.width - child.size.width) / 2,
      relY: rowYs[row],
      width: child.size.width,
      height: child.size.height,
    });
  }
  return {
    children: placed,
    contentSize: {
      width: cols * cell.width + (cols - 1) * gap,
      height: totalHeight,
    },
  };
}

function placeVerticalLinear(children, gap, transpose = false) {
  if (transpose) {
    const colWidth = children.reduce(
      (maxWidth, child) => Math.max(maxWidth, child.size.width),
      0,
    );
    let cursor = 0;
    const placed = [];
    for (const child of children) {
      placed.push({
        id: child.id,
        relX: (colWidth - child.size.width) / 2,
        relY: cursor,
        width: child.size.width,
        height: child.size.height,
      });
      cursor += child.size.height + gap;
    }
    const totalHeight = cursor - (children.length > 0 ? gap : 0);
    return {
      children: placed,
      contentSize: {
        width: colWidth,
        height: Math.max(0, totalHeight),
      },
    };
  }
  const rowHeight = children.reduce(
    (maxHeight, child) => Math.max(maxHeight, child.size.height),
    0,
  );
  let cursor = 0;
  const placed = [];
  for (const child of children) {
    placed.push({
      id: child.id,
      relX: cursor,
      relY: (rowHeight - child.size.height) / 2,
      width: child.size.width,
      height: child.size.height,
    });
    cursor += child.size.width + gap;
  }
  const totalWidth = cursor - (children.length > 0 ? gap : 0);
  return {
    children: placed,
    contentSize: {
      width: Math.max(0, totalWidth),
      height: rowHeight,
    },
  };
}

function placeVerticalLayered(
  children,
  edges,
  colGap,
  rowGap,
  transpose = false,
) {
  const orderIndex = new Map();
  for (let childIndex = 0; childIndex < children.length; childIndex++) {
    orderIndex.set(children[childIndex].id, childIndex);
  }
  const ids = new Set(children.map((child) => child.id));
  const innerEdges = edges.filter(
    (edge) => ids.has(edge.source) && ids.has(edge.target),
  );
  const adj = new Map();
  const inDeg = new Map();
  for (const child of children) {
    adj.set(child.id, []);
    inDeg.set(child.id, 0);
  }
  for (const edge of innerEdges) {
    const list = adj.get(edge.source);
    if (!list) continue;
    if (!list.includes(edge.target)) {
      list.push(edge.target);
      inDeg.set(edge.target, (inDeg.get(edge.target) ?? 0) + 1);
    }
  }
  for (const list2 of adj.values()) {
    list2.sort(
      (firstChildId, secondChildId) => (orderIndex.get(firstChildId) ?? 0) - (orderIndex.get(secondChildId) ?? 0),
    );
  }
  const depth = new Map();
  const remaining = new Map(inDeg);
  const queue = children
    .filter((child) => (remaining.get(child.id) ?? 0) === 0)
    .map((child) => child.id);
  for (const id of queue) depth.set(id, 0);
  let visited = 0;
  while (queue.length > 0) {
    const currentNodeId = queue.shift();
    visited++;
    const currentDepth = depth.get(currentNodeId) ?? 0;
    for (const neighborId of adj.get(currentNodeId) ?? []) {
      depth.set(neighborId, Math.max(depth.get(neighborId) ?? 0, currentDepth + 1));
      const remainingInDegree = (remaining.get(neighborId) ?? 0) - 1;
      remaining.set(neighborId, remainingInDegree);
      if (remainingInDegree === 0) queue.push(neighborId);
    }
  }
  if (visited < children.length) {
    return placeVerticalLinear(
      children,
      transpose ? rowGap : colGap,
      transpose,
    );
  }
  const rowIdx = new Map();
  const visitedSet = new Set();
  let cursor = 0;
  const assign = (node) => {
    if (visitedSet.has(node)) return;
    visitedSet.add(node);
    const allChildren = adj.get(node) ?? [];
    const unvisited = allChildren.filter((childId) => !visitedSet.has(childId));
    for (const childId of unvisited) assign(childId);
    if (allChildren.length === 0) {
      rowIdx.set(node, cursor++);
      return;
    }
    if (unvisited.length === 0) {
      rowIdx.set(node, cursor++);
      return;
    }
    const ys = [];
    for (const child of allChildren) {
      const childRowIndex = rowIdx.get(child);
      if (childRowIndex !== void 0) ys.push(childRowIndex);
    }
    if (ys.length === 0) {
      rowIdx.set(node, cursor++);
      return;
    }
    let minimumRowIndex = ys[0];
    let mx = ys[0];
    for (const rowIndex of ys) {
      if (rowIndex < minimumRowIndex) minimumRowIndex = rowIndex;
      if (rowIndex > mx) mx = rowIndex;
    }
    rowIdx.set(node, (minimumRowIndex + mx) / 2);
  };
  for (const child of children) {
    if ((inDeg.get(child.id) ?? 0) === 0) assign(child.id);
  }
  for (const child of children) assign(child.id);
  const layerSizeOf = (child) => (transpose ? child.size.height : child.size.width);
  const laneSizeOf = (child) => (transpose ? child.size.width : child.size.height);
  let maxCol = 0;
  for (const child of children) {
    const layerIndex = depth.get(child.id) ?? 0;
    if (layerIndex > maxCol) maxCol = layerIndex;
  }
  const layerCount = maxCol + 1;
  const layerExtents = new Array(layerCount).fill(0);
  for (const child of children) {
    const layerIndex = depth.get(child.id) ?? 0;
    const layerExtent = layerSizeOf(child);
    if (layerExtent > layerExtents[layerIndex]) layerExtents[layerIndex] = layerExtent;
  }
  const layerOrigins = new Array(layerCount);
  {
    let cur = 0;
    for (let layerIndex = 0; layerIndex < layerCount; layerIndex++) {
      layerOrigins[layerIndex] = cur;
      cur += layerExtents[layerIndex] + (layerIndex < layerCount - 1 ? colGap : 0);
    }
  }
  const totalLayer =
    layerCount > 0
      ? layerOrigins[layerCount - 1] + layerExtents[layerCount - 1]
      : 0;
  const laneCount = Math.max(1, cursor);
  const laneExtents = new Array(laneCount).fill(0);
  for (const child of children) {
    const rowIndex = rowIdx.get(child.id) ?? 0;
    if (Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < laneCount) {
      const laneExtent = laneSizeOf(child);
      if (laneExtent > laneExtents[rowIndex]) laneExtents[rowIndex] = laneExtent;
    }
  }
  let fallbackLane = 0;
  for (const child of children) {
    const laneExtent = laneSizeOf(child);
    if (laneExtent > fallbackLane) fallbackLane = laneExtent;
  }
  for (let laneIndex = 0; laneIndex < laneCount; laneIndex++) {
    if (laneExtents[laneIndex] === 0) laneExtents[laneIndex] = fallbackLane;
  }
  const laneOrigins = new Array(laneCount);
  {
    let cur = 0;
    for (let laneIndex = 0; laneIndex < laneCount; laneIndex++) {
      laneOrigins[laneIndex] = cur;
      cur += laneExtents[laneIndex] + (laneIndex < laneCount - 1 ? rowGap : 0);
    }
  }
  const totalLane =
    laneCount > 0 ? laneOrigins[laneCount - 1] + laneExtents[laneCount - 1] : 0;
  const placed = [];
  for (const child of children) {
    const layerIndex = depth.get(child.id) ?? 0;
    const rowIndex = rowIdx.get(child.id) ?? 0;
    const layerCoord =
      layerOrigins[layerIndex] + (layerExtents[layerIndex] - layerSizeOf(child)) / 2;
    let laneCoord;
    if (Number.isInteger(rowIndex)) {
      const ri = Math.max(0, Math.min(laneCount - 1, rowIndex));
      laneCoord = laneOrigins[ri];
    } else {
      const lowerLaneIndex = Math.max(0, Math.min(laneCount - 1, Math.floor(rowIndex)));
      const upperLaneIndex = Math.max(0, Math.min(laneCount - 1, Math.ceil(rowIndex)));
      const frac = rowIndex - lowerLaneIndex;
      laneCoord = laneOrigins[lowerLaneIndex] + frac * (laneOrigins[upperLaneIndex] - laneOrigins[lowerLaneIndex]);
    }
    placed.push({
      id: child.id,
      relX: transpose ? laneCoord : layerCoord,
      relY: transpose ? layerCoord : laneCoord,
      width: child.size.width,
      height: child.size.height,
    });
  }
  return {
    children: placed,
    contentSize: {
      width: transpose ? totalLane : totalLayer,
      height: transpose ? totalLayer : totalLane,
    },
  };
}

function packTilesIntoGrid(tiles, gap, originY) {
  if (tiles.length === 0)
    return {
      width: 0,
      height: 0,
    };
  const cols = Math.max(1, Math.round(Math.sqrt(tiles.length)));
  const rows = Math.ceil(tiles.length / cols);
  const colWidths = new Array(cols).fill(0);
  const rowHeights = new Array(rows).fill(0);
  tiles.forEach((tile, tileIndex) => {
    const columnIndex = tileIndex % cols;
    const rowIndex = Math.floor(tileIndex / cols);
    if (tile.width > colWidths[columnIndex]) colWidths[columnIndex] = tile.width;
    if (tile.height > rowHeights[rowIndex]) rowHeights[rowIndex] = tile.height;
  });
  const colX = new Array(cols).fill(0);
  for (let columnIndex = 1; columnIndex < cols; columnIndex++)
    colX[columnIndex] = colX[columnIndex - 1] + colWidths[columnIndex - 1] + gap;
  const rowY = new Array(rows).fill(0);
  for (let rowIndex = 1; rowIndex < rows; rowIndex++)
    rowY[rowIndex] = rowY[rowIndex - 1] + rowHeights[rowIndex - 1] + gap;
  tiles.forEach((tile, tileIndex) => {
    const columnIndex = tileIndex % cols;
    const rowIndex = Math.floor(tileIndex / cols);
    tile.place(colX[columnIndex], originY + rowY[rowIndex]);
  });
  return {
    width: colX[cols - 1] + colWidths[cols - 1],
    height: rowY[rows - 1] + rowHeights[rows - 1],
  };
}

function placeGridClustered(children, edges, cell, gap) {
  const ids = new Set(children.map((child) => child.id));
  const innerEdges = edges.filter(
    (edge) =>
      ids.has(edge.source) && ids.has(edge.target) && edge.source !== edge.target,
  );
  if (innerEdges.length === 0) {
    return placeGrid(children, pickGridCols(children.length), cell, gap);
  }
  const adj = new Map();
  for (const child of children) adj.set(child.id, []);
  for (const edge of innerEdges) {
    adj.get(edge.source)?.push(edge.target);
    adj.get(edge.target)?.push(edge.source);
  }
  const byId = new Map(children.map((child) => [child.id, child]));
  const orderIndex = new Map(children.map((child, childIndex) => [child.id, childIndex]));
  const visited = new Set();
  const workflowComponents = [];
  const discrete = [];
  for (const child of children) {
    if (visited.has(child.id)) continue;
    visited.add(child.id);
    const memberIds = [];
    const queue = [child.id];
    while (queue.length > 0) {
      const id = queue.shift();
      memberIds.push(id);
      for (const nb of adj.get(id) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    if (memberIds.length === 1) {
      discrete.push(child);
      continue;
    }
    memberIds.sort(
      (firstChildId, secondChildId) => (orderIndex.get(firstChildId) ?? 0) - (orderIndex.get(secondChildId) ?? 0),
    );
    workflowComponents.push(memberIds.map((id) => byId.get(id)));
  }
  const placed = [];
  const tiles = workflowComponents.map((members) => {
    const out = placeVerticalLayered(
      members,
      innerEdges,
      GROUP_RELAYOUT_VERTICAL_COL_GAP,
      GROUP_RELAYOUT_VERTICAL_ROW_GAP,
      false,
    );
    return {
      width: out.contentSize.width,
      height: out.contentSize.height,
      place: (originX, originY) => {
        for (const placement of out.children) {
          placed.push({
            ...placement,
            relX: placement.relX + originX,
            relY: placement.relY + originY,
          });
        }
      },
    };
  });
  const workflowSize = packTilesIntoGrid(tiles, gap, 0);
  let discreteSize = {
    width: 0,
    height: 0,
  };
  if (discrete.length > 0) {
    const discreteCell = {
      width: discrete.reduce((maxWidth, child) => Math.max(maxWidth, child.size.width), 0),
      height: discrete.reduce((maxHeight, child) => Math.max(maxHeight, child.size.height), 0),
    };
    const out = placeGrid(
      discrete,
      pickGridCols(discrete.length),
      discreteCell,
      gap,
    );
    const originY = workflowSize.height > 0 ? workflowSize.height + gap : 0;
    for (const placement of out.children) {
      placed.push({
        ...placement,
        relY: placement.relY + originY,
      });
    }
    discreteSize = out.contentSize;
  }
  const bothTiers = workflowSize.height > 0 && discrete.length > 0;
  return {
    children: placed,
    contentSize: {
      width: Math.max(workflowSize.width, discreteSize.width),
      height: workflowSize.height + (bothTiers ? gap : 0) + discreteSize.height,
    },
  };
}

function extractOrderValue(node) {
  const data = node.data;
  const params = data?.params;
  const raw = params?.order;
  if (raw === void 0 || raw === null) return void 0;
  const numericValue = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
  return Number.isFinite(numericValue) ? numericValue : void 0;
}

function sortedByRowBand(rawChildren, mode, rowBand) {
  const positional = (firstChild, secondChild) => {
    const pa = firstChild.node.positions?.[mode];
    const pb = secondChild.node.positions?.[mode];
    const ay = pa?.y ?? 0;
    const by = pb?.y ?? 0;
    if (Math.abs(ay - by) > rowBand) return ay - by;
    return (pa?.x ?? 0) - (pb?.x ?? 0);
  };
  return [...rawChildren].sort((firstChild, secondChild) => {
    const oa = extractOrderValue(firstChild.node);
    const ob = extractOrderValue(secondChild.node);
    if (oa !== void 0 && ob === void 0) return -1;
    if (oa === void 0 && ob !== void 0) return 1;
    if (oa !== void 0 && ob !== void 0) {
      if (oa !== ob) return oa - ob;
      return positional(firstChild, secondChild);
    }
    return positional(firstChild, secondChild);
  });
}

export function relayoutGroupChildren(canvas, groupId, layout) {
  const mode = canvas.mode;
  const groupNode = canvas.nodes.find((node) => node.id === groupId);
  if (!groupNode || groupNode.type !== CanvasNodeType.Group) {
    return {
      canvas,
      updatedNodes: [],
      changed: false,
    };
  }
  const rawChildren = canvas.nodes
    .filter((node) => node.parentId === groupId)
    .map((node) => ({
      node,
      size: resolveChildSize(node, mode),
    }));
  if (rawChildren.length === 0) {
    return {
      canvas,
      updatedNodes: [],
      changed: false,
    };
  }
  const cellW = rawChildren.reduce((maxWidth, child) => Math.max(maxWidth, child.size.width), 0);
  const cellH = rawChildren.reduce((maxHeight, child) => Math.max(maxHeight, child.size.height), 0);
  const cell = {
    width: cellW,
  };
  const rowBand = Math.max(1, cellH * 0.5);
  const children = sortedByRowBand(rawChildren, mode, rowBand);
  const inputs = children.map(({ node, size }) => ({
    id: node.id,
    size,
  }));
  let placed;
  let contentSize;
  if (layout === "vertical" || layout === "horizontal") {
    const out = placeVerticalLayered(
      inputs,
      canvas.edges,
      GROUP_RELAYOUT_VERTICAL_COL_GAP,
      GROUP_RELAYOUT_VERTICAL_ROW_GAP,
      layout === "horizontal",
    );
    placed = out.children;
    contentSize = out.contentSize;
  } else {
    const out = placeGridClustered(
      inputs,
      canvas.edges,
      cell,
      GROUP_RELAYOUT_GAP,
    );
    placed = out.children;
    contentSize = out.contentSize;
  }
  const newGroupSize = {
    width: contentSize.width + GROUP_NODE_PADDING.x * 2,
    height:
      contentSize.height + GROUP_NODE_PADDING.top + GROUP_NODE_PADDING.bottom,
  };
  const prevGroupSize = readGroupSize(groupNode, mode);
  const newChildPositions = new Map();
  for (const placement of placed) {
    newChildPositions.set(placement.id, {
      x: GROUP_NODE_PADDING.x + placement.relX,
      y: GROUP_NODE_PADDING.top + placement.relY,
    });
  }
  let anyChanged =
    !prevGroupSize ||
    prevGroupSize.width !== newGroupSize.width ||
    prevGroupSize.height !== newGroupSize.height;
  if (!anyChanged) {
    for (const { node } of children) {
      const want = newChildPositions.get(node.id);
      const cur = node.positions?.[mode];
      if (!want || !cur || cur.x !== want.x || cur.y !== want.y) {
        anyChanged = true;
        break;
      }
    }
  }
  const prevFrameMode = groupNode.data?.frameMode;
  if (!anyChanged && prevFrameMode === "manual") anyChanged = true;
  if (!anyChanged) {
    return {
      canvas,
      updatedNodes: [],
      changed: false,
    };
  }
  const updatedChildren = [];
  const nextNodes = canvas.nodes.map((node) => {
    if (node.id === groupId) {
      const existingData = node.data ?? {};
      const nextData = {
        ...existingData,
        frameMode: "auto",
      };
      return {
        ...node,
        positions: {
          ...(node.positions ?? {}),
        },
        sizes: {
          ...(node.sizes ?? {}),
          [mode]: newGroupSize,
        },
        size: newGroupSize,
        data: nextData,
      };
    }
    const next = newChildPositions.get(node.id);
    if (!next) return node;
    const updated = {
      ...node,
      positions: {
        ...(node.positions ?? {}),
        [mode]: next,
      },
    };
    updatedChildren.push(updated);
    return updated;
  });
  const groupOut = nextNodes.find((node) => node.id === groupId);
  const updatedNodes = groupOut
    ? [groupOut, ...updatedChildren]
    : updatedChildren;
  return {
    canvas: {
      ...canvas,
      nodes: nextNodes,
      edges: canvas.edges,
    },
    updatedNodes,
    changed: true,
  };
}
