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

function resolveChildSize(child, mode2) {
  return resolveNodeFootprint(child, mode2);
}

function pickGridCols(n2) {
  return Math.max(1, Math.round(Math.sqrt(n2)));
}

function placeGrid(children2, cols, cell, gap) {
  const placed = [];
  if (children2.length === 0) {
    return {
      children: placed,
      contentSize: {
        width: 0,
        height: 0,
      },
    };
  }
  const rowCount = Math.ceil(children2.length / cols);
  const rowHeights = new Array(rowCount).fill(0);
  for (let i2 = 0; i2 < children2.length; i2++) {
    const row = Math.floor(i2 / cols);
    const h2 = children2[i2].size.height;
    if (h2 > rowHeights[row]) rowHeights[row] = h2;
  }
  const rowYs = new Array(rowCount);
  let cursor = 0;
  for (let r2 = 0; r2 < rowCount; r2++) {
    rowYs[r2] = cursor;
    cursor += rowHeights[r2] + (r2 < rowCount - 1 ? gap : 0);
  }
  const totalHeight = cursor;
  for (let i2 = 0; i2 < children2.length; i2++) {
    const c3 = children2[i2];
    const row = Math.floor(i2 / cols);
    const col = i2 % cols;
    const cellX = col * (cell.width + gap);
    placed.push({
      id: c3.id,
      relX: cellX + (cell.width - c3.size.width) / 2,
      relY: rowYs[row],
      width: c3.size.width,
      height: c3.size.height,
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

function placeVerticalLinear(children2, gap, transpose = false) {
  if (transpose) {
    const colWidth = children2.reduce(
      (m3, c3) => Math.max(m3, c3.size.width),
      0,
    );
    let cursor2 = 0;
    const placed2 = [];
    for (const c3 of children2) {
      placed2.push({
        id: c3.id,
        relX: (colWidth - c3.size.width) / 2,
        relY: cursor2,
        width: c3.size.width,
        height: c3.size.height,
      });
      cursor2 += c3.size.height + gap;
    }
    const totalHeight = cursor2 - (children2.length > 0 ? gap : 0);
    return {
      children: placed2,
      contentSize: {
        width: colWidth,
        height: Math.max(0, totalHeight),
      },
    };
  }
  const rowHeight = children2.reduce(
    (m3, c3) => Math.max(m3, c3.size.height),
    0,
  );
  let cursor = 0;
  const placed = [];
  for (const c3 of children2) {
    placed.push({
      id: c3.id,
      relX: cursor,
      relY: (rowHeight - c3.size.height) / 2,
      width: c3.size.width,
      height: c3.size.height,
    });
    cursor += c3.size.width + gap;
  }
  const totalWidth = cursor - (children2.length > 0 ? gap : 0);
  return {
    children: placed,
    contentSize: {
      width: Math.max(0, totalWidth),
      height: rowHeight,
    },
  };
}

function placeVerticalLayered(
  children2,
  edges,
  colGap,
  rowGap,
  transpose = false,
) {
  const orderIndex = new Map();
  for (let i2 = 0; i2 < children2.length; i2++) {
    orderIndex.set(children2[i2].id, i2);
  }
  const ids2 = new Set(children2.map((c3) => c3.id));
  const innerEdges = edges.filter(
    (e2) => ids2.has(e2.source) && ids2.has(e2.target),
  );
  const adj = new Map();
  const inDeg = new Map();
  for (const c3 of children2) {
    adj.set(c3.id, []);
    inDeg.set(c3.id, 0);
  }
  for (const e2 of innerEdges) {
    const list2 = adj.get(e2.source);
    if (!list2) continue;
    if (!list2.includes(e2.target)) {
      list2.push(e2.target);
      inDeg.set(e2.target, (inDeg.get(e2.target) ?? 0) + 1);
    }
  }
  for (const list2 of adj.values()) {
    list2.sort(
      (a2, b3) => (orderIndex.get(a2) ?? 0) - (orderIndex.get(b3) ?? 0),
    );
  }
  const depth2 = new Map();
  const remaining = new Map(inDeg);
  const queue = children2
    .filter((c3) => (remaining.get(c3.id) ?? 0) === 0)
    .map((c3) => c3.id);
  for (const id2 of queue) depth2.set(id2, 0);
  let visited = 0;
  while (queue.length > 0) {
    const u4 = queue.shift();
    visited++;
    const dU = depth2.get(u4) ?? 0;
    for (const v2 of adj.get(u4) ?? []) {
      depth2.set(v2, Math.max(depth2.get(v2) ?? 0, dU + 1));
      const r2 = (remaining.get(v2) ?? 0) - 1;
      remaining.set(v2, r2);
      if (r2 === 0) queue.push(v2);
    }
  }
  if (visited < children2.length) {
    return placeVerticalLinear(
      children2,
      transpose ? rowGap : colGap,
      transpose,
    );
  }
  const rowIdx = new Map();
  const visitedSet = new Set();
  let cursor = 0;
  const assign = (node2) => {
    if (visitedSet.has(node2)) return;
    visitedSet.add(node2);
    const allChildren = adj.get(node2) ?? [];
    const unvisited = allChildren.filter((t2) => !visitedSet.has(t2));
    for (const t2 of unvisited) assign(t2);
    if (allChildren.length === 0) {
      rowIdx.set(node2, cursor++);
      return;
    }
    if (unvisited.length === 0) {
      rowIdx.set(node2, cursor++);
      return;
    }
    const ys = [];
    for (const c3 of allChildren) {
      const y4 = rowIdx.get(c3);
      if (y4 !== void 0) ys.push(y4);
    }
    if (ys.length === 0) {
      rowIdx.set(node2, cursor++);
      return;
    }
    let mn2 = ys[0];
    let mx = ys[0];
    for (const y4 of ys) {
      if (y4 < mn2) mn2 = y4;
      if (y4 > mx) mx = y4;
    }
    rowIdx.set(node2, (mn2 + mx) / 2);
  };
  for (const c3 of children2) {
    if ((inDeg.get(c3.id) ?? 0) === 0) assign(c3.id);
  }
  for (const c3 of children2) assign(c3.id);
  const layerSizeOf = (c3) => (transpose ? c3.size.height : c3.size.width);
  const laneSizeOf = (c3) => (transpose ? c3.size.width : c3.size.height);
  let maxCol = 0;
  for (const c3 of children2) {
    const d2 = depth2.get(c3.id) ?? 0;
    if (d2 > maxCol) maxCol = d2;
  }
  const layerCount = maxCol + 1;
  const layerExtents = new Array(layerCount).fill(0);
  for (const c3 of children2) {
    const d2 = depth2.get(c3.id) ?? 0;
    const s2 = layerSizeOf(c3);
    if (s2 > layerExtents[d2]) layerExtents[d2] = s2;
  }
  const layerOrigins = new Array(layerCount);
  {
    let cur = 0;
    for (let d2 = 0; d2 < layerCount; d2++) {
      layerOrigins[d2] = cur;
      cur += layerExtents[d2] + (d2 < layerCount - 1 ? colGap : 0);
    }
  }
  const totalLayer =
    layerCount > 0
      ? layerOrigins[layerCount - 1] + layerExtents[layerCount - 1]
      : 0;
  const laneCount = Math.max(1, cursor);
  const laneExtents = new Array(laneCount).fill(0);
  for (const c3 of children2) {
    const r2 = rowIdx.get(c3.id) ?? 0;
    if (Number.isInteger(r2) && r2 >= 0 && r2 < laneCount) {
      const s2 = laneSizeOf(c3);
      if (s2 > laneExtents[r2]) laneExtents[r2] = s2;
    }
  }
  let fallbackLane = 0;
  for (const c3 of children2) {
    const s2 = laneSizeOf(c3);
    if (s2 > fallbackLane) fallbackLane = s2;
  }
  for (let i2 = 0; i2 < laneCount; i2++) {
    if (laneExtents[i2] === 0) laneExtents[i2] = fallbackLane;
  }
  const laneOrigins = new Array(laneCount);
  {
    let cur = 0;
    for (let i2 = 0; i2 < laneCount; i2++) {
      laneOrigins[i2] = cur;
      cur += laneExtents[i2] + (i2 < laneCount - 1 ? rowGap : 0);
    }
  }
  const totalLane =
    laneCount > 0 ? laneOrigins[laneCount - 1] + laneExtents[laneCount - 1] : 0;
  const placed = [];
  for (const c3 of children2) {
    const d2 = depth2.get(c3.id) ?? 0;
    const r2 = rowIdx.get(c3.id) ?? 0;
    const layerCoord =
      layerOrigins[d2] + (layerExtents[d2] - layerSizeOf(c3)) / 2;
    let laneCoord;
    if (Number.isInteger(r2)) {
      const ri = Math.max(0, Math.min(laneCount - 1, r2));
      laneCoord = laneOrigins[ri];
    } else {
      const i0 = Math.max(0, Math.min(laneCount - 1, Math.floor(r2)));
      const i1 = Math.max(0, Math.min(laneCount - 1, Math.ceil(r2)));
      const frac = r2 - i0;
      laneCoord = laneOrigins[i0] + frac * (laneOrigins[i1] - laneOrigins[i0]);
    }
    placed.push({
      id: c3.id,
      relX: transpose ? laneCoord : layerCoord,
      relY: transpose ? layerCoord : laneCoord,
      width: c3.size.width,
      height: c3.size.height,
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
  tiles.forEach((t2, i2) => {
    const c3 = i2 % cols;
    const r2 = Math.floor(i2 / cols);
    if (t2.width > colWidths[c3]) colWidths[c3] = t2.width;
    if (t2.height > rowHeights[r2]) rowHeights[r2] = t2.height;
  });
  const colX = new Array(cols).fill(0);
  for (let c3 = 1; c3 < cols; c3++)
    colX[c3] = colX[c3 - 1] + colWidths[c3 - 1] + gap;
  const rowY = new Array(rows).fill(0);
  for (let r2 = 1; r2 < rows; r2++)
    rowY[r2] = rowY[r2 - 1] + rowHeights[r2 - 1] + gap;
  tiles.forEach((t2, i2) => {
    const c3 = i2 % cols;
    const r2 = Math.floor(i2 / cols);
    t2.place(colX[c3], originY + rowY[r2]);
  });
  return {
    width: colX[cols - 1] + colWidths[cols - 1],
    height: rowY[rows - 1] + rowHeights[rows - 1],
  };
}

function placeGridClustered(children2, edges, cell, gap) {
  const ids2 = new Set(children2.map((c3) => c3.id));
  const innerEdges = edges.filter(
    (e2) =>
      ids2.has(e2.source) && ids2.has(e2.target) && e2.source !== e2.target,
  );
  if (innerEdges.length === 0) {
    return placeGrid(children2, pickGridCols(children2.length), cell, gap);
  }
  const adj = new Map();
  for (const c3 of children2) adj.set(c3.id, []);
  for (const e2 of innerEdges) {
    adj.get(e2.source)?.push(e2.target);
    adj.get(e2.target)?.push(e2.source);
  }
  const byId = new Map(children2.map((c3) => [c3.id, c3]));
  const orderIndex = new Map(children2.map((c3, i2) => [c3.id, i2]));
  const visited = new Set();
  const workflowComponents = [];
  const discrete = [];
  for (const c3 of children2) {
    if (visited.has(c3.id)) continue;
    visited.add(c3.id);
    const memberIds = [];
    const queue = [c3.id];
    while (queue.length > 0) {
      const id2 = queue.shift();
      memberIds.push(id2);
      for (const nb of adj.get(id2) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    if (memberIds.length === 1) {
      discrete.push(c3);
      continue;
    }
    memberIds.sort(
      (a2, b3) => (orderIndex.get(a2) ?? 0) - (orderIndex.get(b3) ?? 0),
    );
    workflowComponents.push(memberIds.map((id2) => byId.get(id2)));
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
        for (const p3 of out.children) {
          placed.push({
            ...p3,
            relX: p3.relX + originX,
            relY: p3.relY + originY,
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
      width: discrete.reduce((m3, c3) => Math.max(m3, c3.size.width), 0),
      height: discrete.reduce((m3, c3) => Math.max(m3, c3.size.height), 0),
    };
    const out = placeGrid(
      discrete,
      pickGridCols(discrete.length),
      discreteCell,
      gap,
    );
    const originY = workflowSize.height > 0 ? workflowSize.height + gap : 0;
    for (const p3 of out.children) {
      placed.push({
        ...p3,
        relY: p3.relY + originY,
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

function extractOrderValue(node2) {
  const data2 = node2.data;
  const params = data2?.params;
  const raw2 = params?.order;
  if (raw2 === void 0 || raw2 === null) return void 0;
  const n2 = typeof raw2 === "number" ? raw2 : Number.parseFloat(String(raw2));
  return Number.isFinite(n2) ? n2 : void 0;
}

function sortedByRowBand(rawChildren, mode2, rowBand) {
  const positional = (a2, b3) => {
    const pa = a2.node.positions?.[mode2];
    const pb = b3.node.positions?.[mode2];
    const ay = pa?.y ?? 0;
    const by = pb?.y ?? 0;
    if (Math.abs(ay - by) > rowBand) return ay - by;
    return (pa?.x ?? 0) - (pb?.x ?? 0);
  };
  return [...rawChildren].sort((a2, b3) => {
    const oa = extractOrderValue(a2.node);
    const ob = extractOrderValue(b3.node);
    if (oa !== void 0 && ob === void 0) return -1;
    if (oa === void 0 && ob !== void 0) return 1;
    if (oa !== void 0 && ob !== void 0) {
      if (oa !== ob) return oa - ob;
      return positional(a2, b3);
    }
    return positional(a2, b3);
  });
}

export function relayoutGroupChildren(canvas, groupId2, layout) {
  const mode2 = canvas.mode;
  const groupNode = canvas.nodes.find((n2) => n2.id === groupId2);
  if (!groupNode || groupNode.type !== CanvasNodeType.Group) {
    return {
      canvas,
      updatedNodes: [],
      changed: false,
    };
  }
  const rawChildren = canvas.nodes
    .filter((n2) => n2.parentId === groupId2)
    .map((n2) => ({
      node: n2,
      size: resolveChildSize(n2, mode2),
    }));
  if (rawChildren.length === 0) {
    return {
      canvas,
      updatedNodes: [],
      changed: false,
    };
  }
  const cellW = rawChildren.reduce((m3, c3) => Math.max(m3, c3.size.width), 0);
  const cellH = rawChildren.reduce((m3, c3) => Math.max(m3, c3.size.height), 0);
  const cell = {
    width: cellW,
  };
  const rowBand = Math.max(1, cellH * 0.5);
  const children2 = sortedByRowBand(rawChildren, mode2, rowBand);
  const inputs = children2.map(({ node: node2, size: size2 }) => ({
    id: node2.id,
    size: size2,
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
  const prevGroupSize = readGroupSize(groupNode, mode2);
  const newChildPositions = new Map();
  for (const p3 of placed) {
    newChildPositions.set(p3.id, {
      x: GROUP_NODE_PADDING.x + p3.relX,
      y: GROUP_NODE_PADDING.top + p3.relY,
    });
  }
  let anyChanged =
    !prevGroupSize ||
    prevGroupSize.width !== newGroupSize.width ||
    prevGroupSize.height !== newGroupSize.height;
  if (!anyChanged) {
    for (const { node: node2 } of children2) {
      const want = newChildPositions.get(node2.id);
      const cur = node2.positions?.[mode2];
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
  const nextNodes = canvas.nodes.map((node2) => {
    if (node2.id === groupId2) {
      const existingData = node2.data ?? {};
      const nextData = {
        ...existingData,
        frameMode: "auto",
      };
      return {
        ...node2,
        positions: {
          ...(node2.positions ?? {}),
        },
        sizes: {
          ...(node2.sizes ?? {}),
          [mode2]: newGroupSize,
        },
        size: newGroupSize,
        data: nextData,
      };
    }
    const next2 = newChildPositions.get(node2.id);
    if (!next2) return node2;
    const updated = {
      ...node2,
      positions: {
        ...(node2.positions ?? {}),
        [mode2]: next2,
      },
    };
    updatedChildren.push(updated);
    return updated;
  });
  const groupOut = nextNodes.find((n2) => n2.id === groupId2);
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
