// dagre-layout.js
// Graph 和 layout 必须来自同一模块，避免布局内部新建的图和传入的图各用一份类。
import { Graph, layout } from "@dagrejs/dagre";
import {
  DEFAULT_NODE_SIZE,
  getNodePosition,
  setNodePosition,
  sizeOf,
} from "./use-active-mode.js";
import {
  DEFAULT_WORKFLOW_LAYER_SPACING,
  DEFAULT_WORKFLOW_NODE_SPACING,
} from "./ungroup-in-canvas.js";
import {
  buildAdjacency,
  nodeToRect,
  rectsOverlap,
  topoSortLevels,
} from "./layout-category-lanes.js";
import { GridSlotLayout } from "./grid-slot-layout.js";
import { CanvasMode } from "./compute-group-bounds-from-children.js";
import { findFreePositionForRects } from "./find-free-position-for-rects.js";
function findConnectedComponents(nodeIds, edges) {
  const adj = new Map();
  for (const id of nodeIds) adj.set(id, []);
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    adj.get(edge.source).push(edge.target);
    adj.get(edge.target).push(edge.source);
  }
  const visited = new Set();
  const components = [];
  for (const start of nodeIds) {
    if (visited.has(start)) continue;
    const component = [];
    const queue = [start];
    visited.add(start);
    let idx = 0;
    while (idx < queue.length) {
      const cur = queue[idx++];
      component.push(cur);
      for (const neighbor of adj.get(cur) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    components.push(component);
  }
  return components;
}

const DIRECTION_MAP = {
  LR: "LR",
  RL: "RL",
  TB: "TB",
  BT: "BT",
};
const DEFAULT_NODE_SPACING = DEFAULT_WORKFLOW_NODE_SPACING;
const DEFAULT_LAYER_SPACING = DEFAULT_WORKFLOW_LAYER_SPACING;
const DEFAULT_INCREMENTAL_NODE_SPACING = DEFAULT_NODE_SPACING;
const DEFAULT_INCREMENTAL_LAYER_SPACING = DEFAULT_LAYER_SPACING;
const MAX_INCREMENTAL_SHIFT_ATTEMPTS = 80;
const INCREMENTAL_COLLISION_MARGIN = 12;
const MAX_INCREMENTAL_ITEMS_PER_COLUMN = 5;
function maxTopoDepth(nodeIds, edges) {
  const { children, parents } = buildAdjacency(nodeIds, edges);
  const levels = topoSortLevels(nodeIds, children, parents);
  let max = 0;
  for (const level of levels.values()) {
    if (level > max) max = level;
  }
  return max + 1;
}
function pickPrimaryParent(parents, mode) {
  if (parents.length === 0) return void 0;
  return parents.reduce((best, candidateParent) => {
    const bestPos = getNodePosition(best, mode);
    const pPos = getNodePosition(candidateParent, mode);
    const bestRight = bestPos.x + sizeOf(best, mode).width;
    const pRight = pPos.x + sizeOf(candidateParent, mode).width;
    if (pRight !== bestRight) return pRight > bestRight ? candidateParent : best;
    return pPos.y < bestPos.y ? candidateParent : best;
  });
}
function placeWrappedItem(
  slotIndex,
  origin,
  itemWidth,
  itemHeight,
  rowGap,
  columnGap,
) {
  const rowIndex = slotIndex % MAX_INCREMENTAL_ITEMS_PER_COLUMN;
  const columnIndex = Math.floor(slotIndex / MAX_INCREMENTAL_ITEMS_PER_COLUMN);
  return {
    x: origin.x + columnIndex * (itemWidth + columnGap),
    y: origin.y + rowIndex * (itemHeight + rowGap),
  };
}
const ALIGN_TOLERANCE = 2;
function buildLayerEntries(nodes, localPositions, layerAxis, mode) {
  return nodes
    .map((node) => {
      const pos = localPositions.get(node.id);
      if (!pos) return null;
      const size = sizeOf(node, mode);
      const extent = layerAxis === "x" ? size.width : size.height;
      return {
        id: node.id,
        pos,
        size,
        lead: pos[layerAxis],
        center: pos[layerAxis] + extent / 2,
      };
    })
    .filter((entry) => entry !== null);
}
function clusterByLayerAlignment(entries) {
  const parent = entries.map((_entry, entryIndex) => entryIndex);
  const findRoot = (entryIndex) => {
    while (parent[entryIndex] !== entryIndex) {
      parent[entryIndex] = parent[parent[entryIndex]];
      entryIndex = parent[entryIndex];
    }
    return entryIndex;
  };
  const union = (leftRoot, rightRoot) => {
    const ra = findRoot(leftRoot);
    const rb = findRoot(rightRoot);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };
  for (let leftIndex = 0; leftIndex < entries.length; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex++) {
      const sameLead =
        Math.abs(entries[leftIndex].lead - entries[rightIndex].lead) <= ALIGN_TOLERANCE;
      const sameCenter =
        Math.abs(entries[leftIndex].center - entries[rightIndex].center) <= ALIGN_TOLERANCE;
      if (sameLead || sameCenter) union(leftIndex, rightIndex);
    }
  }
  const groups = new Map();
  entries.forEach((entry, entryIndex) => {
    const root = findRoot(entryIndex);
    const bucket = groups.get(root);
    if (bucket) bucket.push(entry);
    else groups.set(root, [entry]);
  });
  return [...groups.values()];
}
function normalizeLayerSpacing(
  localPositions,
  nodes,
  options,
  nodeSpacing,
  mode,
) {
  const direction = options?.direction ?? "LR";
  const stackAxis = direction === "TB" || direction === "BT" ? "x" : "y";
  const layerAxis = stackAxis === "y" ? "x" : "y";
  const entries = buildLayerEntries(nodes, localPositions, layerAxis, mode);
  const clusters = clusterByLayerAlignment(entries);
  for (const bucket of clusters) {
    if (bucket.length < 2) continue;
    const extentOf = (entry) =>
      stackAxis === "y" ? entry.size.height : entry.size.width;
    bucket.sort((previousEntry, nextEntry) => previousEntry.pos[stackAxis] - nextEntry.pos[stackAxis]);
    const originalCenter =
      bucket.reduce(
        (sum, entry) => sum + entry.pos[stackAxis] + extentOf(entry) / 2,
        0,
      ) / bucket.length;
    const totalExtent = bucket.reduce((sum, entry) => sum + extentOf(entry), 0);
    const span = totalExtent + nodeSpacing * (bucket.length - 1);
    let cursor = originalCenter - span / 2;
    for (const entry of bucket) {
      const next = {
        ...entry.pos,
        [stackAxis]: cursor,
      };
      localPositions.set(entry.id, next);
      cursor += extentOf(entry) + nodeSpacing;
    }
  }
}
function collectLeafFanOutGroups(nodes, edges) {
  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const { children: childrenByParent, parents } = buildAdjacency(
    nodeIdSet,
    edges,
  );
  const groups = [];
  for (const [parentId, childIds] of childrenByParent) {
    if (!parentId) continue;
    const leaves = childIds.filter(
      (id) =>
        (parents.get(id)?.length ?? 0) === 1 &&
        (childrenByParent.get(id)?.length ?? 0) === 0,
    );
    if (leaves.length <= MAX_INCREMENTAL_ITEMS_PER_COLUMN) continue;
    groups.push({
      parentId,
      leafIds: leaves,
    });
  }
  return groups;
}
function rewrapLeafFanOuts(
  localPositions,
  nodes,
  edges,
  nodeById,
  columnGap,
  nodeSpacing,
  mode,
  direction,
) {
  if (direction === "TB" || direction === "BT") return;
  const groups = collectLeafFanOutGroups(nodes, edges);
  if (groups.length === 0) return;
  const entries = buildLayerEntries(nodes, localPositions, "x", mode);
  const clusters = clusterByLayerAlignment(entries);
  const minLead = (cluster) => Math.min(...cluster.map((entry) => entry.lead));
  clusters.sort((leftCluster, rightCluster) => minLead(leftCluster) - minLead(rightCluster));
  const clusterIndexById = new Map();
  clusters.forEach((cluster, index) => {
    for (const entry of cluster) clusterIndexById.set(entry.id, index);
  });
  const groupsByCluster = new Map();
  const wrappedLeafIds = new Set();
  for (const group of groups) {
    const counts = new Map();
    for (const id of group.leafIds) {
      const ci = clusterIndexById.get(id);
      if (ci === void 0) continue;
      counts.set(ci, (counts.get(ci) ?? 0) + 1);
    }
    let best = -1;
    let bestCount = 0;
    for (const [ci, count] of counts) {
      if (
        count > bestCount ||
        (count === bestCount && (best === -1 || ci < best))
      ) {
        best = ci;
        bestCount = count;
      }
    }
    if (best === -1) continue;
    const bucket = groupsByCluster.get(best);
    if (bucket) bucket.push(group);
    else groupsByCluster.set(best, [group]);
    for (const id of group.leafIds) wrappedLeafIds.add(id);
  }
  if (groupsByCluster.size === 0) return;
  const handled = new Set();
  let cumulativeShift = 0;
  for (let ci = 0; ci < clusters.length; ci++) {
    const cluster = clusters[ci];
    if (cumulativeShift !== 0) {
      for (const entry of cluster) {
        if (handled.has(entry.id)) continue;
        const pos = localPositions.get(entry.id);
        if (pos)
          localPositions.set(entry.id, {
            x: pos.x + cumulativeShift,
            y: pos.y,
          });
      }
    }
    const clusterGroups = groupsByCluster.get(ci);
    if (!clusterGroups || clusterGroups.length === 0) continue;
    const live = cluster.filter((entry) => !handled.has(entry.id));
    let colLeft = Number.POSITIVE_INFINITY;
    let oldRight = Number.NEGATIVE_INFINITY;
    for (const entry of live) {
      const pos = localPositions.get(entry.id);
      if (!pos) continue;
      colLeft = Math.min(colLeft, pos.x);
      oldRight = Math.max(oldRight, pos.x + entry.size.width);
    }
    if (!Number.isFinite(colLeft) || !Number.isFinite(oldRight)) continue;
    const tiles = [];
    const gridRights = [];
    for (const group of clusterGroups) {
      const ordered = group.leafIds
        .map((id) => ({
          id,
          pos: localPositions.get(id),
        }))
        .filter((entry) => entry.pos !== void 0)
        .sort((previousEntry, nextEntry) => previousEntry.pos.y - nextEntry.pos.y || previousEntry.pos.x - nextEntry.pos.x);
      if (ordered.length <= MAX_INCREMENTAL_ITEMS_PER_COLUMN) continue;
      const sizes = ordered.map(({ id }) => {
        const node = nodeById.get(id);
        return node ? sizeOf(node, mode) : DEFAULT_NODE_SIZE;
      });
      const itemWidth = Math.max(...sizes.map((itemSize) => itemSize.width));
      const itemHeight = Math.max(...sizes.map((itemSize) => itemSize.height));
      const rows = Math.min(ordered.length, MAX_INCREMENTAL_ITEMS_PER_COLUMN);
      const cols = Math.ceil(ordered.length / MAX_INCREMENTAL_ITEMS_PER_COLUMN);
      const gridHeight = rows * itemHeight + (rows - 1) * nodeSpacing;
      const orderKey =
        ordered.reduce(
          (sum, { pos }, itemIndex) => sum + pos.y + sizes[itemIndex].height / 2,
          0,
        ) / ordered.length;
      tiles.push({
        orderKey,
        extent: gridHeight,
        place: (topY) => {
          ordered.forEach(({ id }, slotIndex) => {
            localPositions.set(
              id,
              placeWrappedItem(
                slotIndex,
                {
                  x: colLeft,
                  y: topY,
                },
                itemWidth,
                itemHeight,
                nodeSpacing,
                columnGap,
              ),
            );
            handled.add(id);
          });
        },
      });
      gridRights.push(colLeft + cols * itemWidth + (cols - 1) * columnGap);
    }
    if (gridRights.length === 0) continue;
    let nodeTileCount = 0;
    for (const entry of live) {
      if (wrappedLeafIds.has(entry.id)) continue;
      const pos = localPositions.get(entry.id);
      if (!pos) continue;
      tiles.push({
        orderKey: pos.y + entry.size.height / 2,
        extent: entry.size.height,
        place: (topY) =>
          localPositions.set(entry.id, {
            x: pos.x,
            y: topY,
          }),
      });
      nodeTileCount++;
    }
    tiles.sort((firstTile, secondTile) => firstTile.orderKey - secondTile.orderKey);
    const span =
      tiles.reduce((sum, tile) => sum + tile.extent, 0) +
      nodeSpacing * (tiles.length - 1);
    let anchorTop;
    const isPureLeafColumn = clusterGroups.length === 1 && nodeTileCount === 0;
    if (isPureLeafColumn) {
      const parentId = clusterGroups[0].parentId;
      const parentPos = localPositions.get(parentId);
      const parentNode = nodeById.get(parentId);
      if (parentPos && parentNode) {
        const parentCenterY =
          parentPos.y + sizeOf(parentNode, mode).height / 2;
        anchorTop = parentCenterY - span / 2;
      } else {
        anchorTop = live.reduce(
          (min, entry) =>
            Math.min(min, localPositions.get(entry.id)?.y ?? min),
          Number.POSITIVE_INFINITY,
        );
      }
    } else {
      let centerSum = 0;
      let centerCount = 0;
      for (const entry of live) {
        const pos = localPositions.get(entry.id);
        if (!pos) continue;
        centerSum += pos.y + entry.size.height / 2;
        centerCount++;
      }
      const centroid = centerCount > 0 ? centerSum / centerCount : 0;
      anchorTop = centroid - span / 2;
    }
    let cursor = anchorTop;
    for (const tile of tiles) {
      tile.place(cursor);
      cursor += tile.extent + nodeSpacing;
    }
    let newRight = Math.max(...gridRights);
    for (const entry of live) {
      if (wrappedLeafIds.has(entry.id)) continue;
      const pos = localPositions.get(entry.id);
      if (pos) newRight = Math.max(newRight, pos.x + entry.size.width);
    }
    cumulativeShift += Math.max(0, newRight - oldRight);
  }
}
function createParentPlacementPlan(
  node,
  parentNodes,
  primaryParent,
  children,
  placedById,
  layerGap,
  siblingGap,
  mode,
) {
  const size = sizeOf(node, mode);
  const maxParentRight = Math.max(
    ...parentNodes.map(
      (parent) =>
        getNodePosition(parent, mode).x + sizeOf(parent, mode).width,
    ),
  );
  const siblings = (children.get(primaryParent.id) ?? [])
    .filter((childId) => childId !== node.id)
    .map((childId) => placedById.get(childId))
    .filter((child) => Boolean(child));
  const itemWidth = Math.max(
    size.width,
    ...siblings.map((child) => sizeOf(child, mode).width),
  );
  const itemHeight = Math.max(
    size.height,
    ...siblings.map((child) => sizeOf(child, mode).height),
  );
  const parentCenterY = getNodePosition(primaryParent, mode).y;
  const origin = {
    x: maxParentRight + layerGap,
    y: parentCenterY,
  };
  return {
    slotIndex: siblings.length,
    placeAt: (slotIndex) =>
      placeWrappedItem(
        slotIndex,
        origin,
        itemWidth,
        itemHeight,
        siblingGap,
        layerGap,
      ),
  };
}

function dagreLayoutWorkflow(nodes, edges, options) {
  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const direction = DIRECTION_MAP[options?.direction ?? "LR"] ?? "LR";
  const nodeSpacing = options?.spacing?.y ?? DEFAULT_NODE_SPACING;
  const layerSpacing = options?.spacing?.x ?? DEFAULT_LAYER_SPACING;
  const mode = options?.mode ?? CanvasMode.Workflow;
  const graph = new Graph({
    directed: true,
  });
  graph.setGraph({
    rankdir: direction,
    // dagre's nodesep is the within-rank (same-layer) gap → maps to ELK's
    // elk.spacing.nodeNode. ranksep is the between-rank gap → maps to
    // elk.layered.spacing.nodeNodeBetweenLayers.
    nodesep: nodeSpacing,
    ranksep: layerSpacing,
    // network-simplex is dagre's tightest, highest-quality ranker (matches
    // the intent of ELK's NETWORK_SIMPLEX layering) and is still ~30x faster
    // than elkjs at this scale.
    ranker: "network-simplex",
  });
  graph.setDefaultEdgeLabel(() => ({}));
  const sizeById = new Map();
  for (const node of nodes) {
    sizeById.set(node.id, sizeOf(node, mode));
  }
  for (let index = nodes.length - 1; index >= 0; index--) {
    const node = nodes[index];
    const sz = sizeById.get(node.id) ?? DEFAULT_NODE_SIZE;
    graph.setNode(node.id, {
      width: sz.width,
      height: sz.height,
    });
  }
  for (let index = edges.length - 1; index >= 0; index--) {
    const edge = edges[index];
    if (nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }
  layout(graph);
  const positions = new Map();
  for (const id of graph.nodes()) {
    const node = graph.node(id);
    if (!node) continue;
    const sz = sizeById.get(id) ?? DEFAULT_NODE_SIZE;
    positions.set(id, {
      x: node.x - sz.width / 2,
      y: node.y - sz.height / 2,
    });
  }
  return positions;
}
export class DagreLayout {
  name = "dagre";
  compute(_nodes, _edges, _options) {
    throw new Error("DagreLayout requires async execution; use computeAsync()");
  }
  computeIncremental(existingNodes, newNodes, edges, options) {
    if (newNodes.length === 0) return new Map();
    const mode = options?.mode ?? CanvasMode.Workflow;
    const layerGap = options?.spacing?.x ?? DEFAULT_INCREMENTAL_LAYER_SPACING;
    const siblingGap = options?.spacing?.y ?? DEFAULT_INCREMENTAL_NODE_SPACING;
    const originalOrder = new Map(
      newNodes.map((node, index) => [node.id, index]),
    );
    const allNodeIds = new Set([
      ...existingNodes.map((node) => node.id),
      ...newNodes.map((node) => node.id),
    ]);
    const { children, parents } = buildAdjacency(allNodeIds, edges);
    const levels = topoSortLevels(allNodeIds, children, parents);
    const orderedNewNodes = [...newNodes].sort((leftNode, rightNode) => {
      const levelDiff = (levels.get(leftNode.id) ?? 0) - (levels.get(rightNode.id) ?? 0);
      if (levelDiff !== 0) return levelDiff;
      return (originalOrder.get(leftNode.id) ?? 0) - (originalOrder.get(rightNode.id) ?? 0);
    });
    const placedById = new Map(existingNodes.map((node) => [node.id, node]));
    const occupied = existingNodes.map((node) => nodeToRect(node, mode));
    const positions = new Map();
    for (const node of orderedNewNodes) {
      const parentNodes = (parents.get(node.id) ?? [])
        .map((parentId) => placedById.get(parentId))
        .filter((parent) => Boolean(parent));
      const nodePosition = this.placeIncrementalNode({
        node,
        parentNodes,
        primaryParent: pickPrimaryParent(parentNodes, mode),
        children,
        placedById,
        occupied,
        layerGap,
        siblingGap,
        mode,
      });
      positions.set(node.id, nodePosition);
      const placedNode = {
        ...node,
        positions: {
          ...node.positions,
        },
      };
      setNodePosition(placedNode, mode, nodePosition);
      placedById.set(node.id, placedNode);
      occupied.push(nodeToRect(placedNode, mode));
    }
    return positions;
  }
  async computeAsync(nodes, edges, options) {
    if (nodes.length === 0) return new Map();
    const mode = options?.mode ?? CanvasMode.Workflow;
    const nodeSpacing = options?.spacing?.y ?? DEFAULT_NODE_SPACING;
    const layerSpacing = options?.spacing?.x ?? DEFAULT_LAYER_SPACING;
    const nodeIdSet = new Set(nodes.map((node) => node.id));
    const relevantEdges = edges.filter(
      (edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target),
    );
    const components = findConnectedComponents(nodeIdSet, relevantEdges);
    const edgeNodeIds = new Set();
    for (const edge of relevantEdges) {
      edgeNodeIds.add(edge.source);
      edgeNodeIds.add(edge.target);
    }
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const workflows = [];
    const discreteNodes = [];
    for (const comp of components) {
      const hasEdge = comp.some((id) => edgeNodeIds.has(id));
      if (hasEdge) {
        const compSet = new Set(comp);
        workflows.push({
          ids: compSet,
          nodes: comp.map((id) => nodeById.get(id)),
          edges: relevantEdges.filter(
            (edge) => compSet.has(edge.source) && compSet.has(edge.target),
          ),
        });
      } else {
        for (const id of comp) {
          const node = nodeById.get(id);
          if (node) discreteNodes.push(node);
        }
      }
    }
    const depthByWorkflow = new Map();
    for (const wf of workflows) {
      depthByWorkflow.set(wf.ids, maxTopoDepth(wf.ids, wf.edges));
    }
    workflows.sort((leftWorkflow, rightWorkflow) => {
      const depthA = depthByWorkflow.get(leftWorkflow.ids) ?? 0;
      const depthB = depthByWorkflow.get(rightWorkflow.ids) ?? 0;
      if (depthB !== depthA) return depthB - depthA;
      return rightWorkflow.nodes.length - leftWorkflow.nodes.length;
    });
    const positions = new Map();
    const laidOut = workflows.map((wf) => {
      const localPositions = dagreLayoutWorkflow(wf.nodes, wf.edges, options);
      normalizeLayerSpacing(
        localPositions,
        wf.nodes,
        options,
        nodeSpacing,
        mode,
      );
      rewrapLeafFanOuts(
        localPositions,
        wf.nodes,
        wf.edges,
        nodeById,
        layerSpacing,
        nodeSpacing,
        mode,
        options?.direction ?? "LR",
      );
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const [id, pos] of localPositions) {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        const node = nodeById.get(id);
        const sz = node
          ? sizeOf(node, mode)
          : {
              width: 0,
              height: 0,
            };
        maxX = Math.max(maxX, pos.x + sz.width);
        maxY = Math.max(maxY, pos.y + sz.height);
      }
      const bboxHeight = Number.isFinite(maxY - minY) ? maxY - minY : 0;
      const bboxWidth = Number.isFinite(maxX - minX) ? maxX - minX : 0;
      return {
        localPositions,
        minX,
        minY,
        bboxHeight,
        bboxWidth,
      };
    });
    const clusterArrangement = options?.clusterArrangement;
    const colGap = options?.spacing?.y ?? nodeSpacing;
    const rowGap = options?.spacing?.x ?? nodeSpacing;
    if (clusterArrangement === "grid") {
      const packTilesIntoGrid = (tiles, originY) => {
        if (tiles.length === 0) return 0;
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
          colX[columnIndex] = colX[columnIndex - 1] + colWidths[columnIndex - 1] + rowGap;
        const rowYLocal = new Array(rows).fill(0);
        for (let rowIndex = 1; rowIndex < rows; rowIndex++)
          rowYLocal[rowIndex] = rowYLocal[rowIndex - 1] + rowHeights[rowIndex - 1] + colGap;
        tiles.forEach((tile, tileIndex) => {
          const columnIndex = tileIndex % cols;
          const rowIndex = Math.floor(tileIndex / cols);
          tile.place(colX[columnIndex], originY + rowYLocal[rowIndex]);
        });
        return rowYLocal[rows - 1] + rowHeights[rows - 1];
      };
      const workflowTiles = laidOut.map(
        ({ localPositions, minX, minY, bboxWidth, bboxHeight }) => ({
          width: bboxWidth,
          height: bboxHeight,
          place: (originX, originY) => {
            for (const [id, pos] of localPositions) {
              positions.set(id, {
                x: pos.x - minX + originX,
                y: pos.y - minY + originY,
              });
            }
          },
        }),
      );
      const discreteTiles = discreteNodes.map((node) => {
        const sz = sizeOf(node, mode);
        return {
          width: sz.width,
          height: sz.height,
          place: (originX, originY) =>
            positions.set(node.id, {
              x: originX,
              y: originY,
            }),
        };
      });
      const wfHeight = packTilesIntoGrid(workflowTiles, 0);
      const discreteOriginY = wfHeight > 0 ? wfHeight + colGap : 0;
      packTilesIntoGrid(discreteTiles, discreteOriginY);
    } else {
      let workflowMaxBottom = 0;
      if (clusterArrangement === "horizontal") {
        let cursorX = 0;
        for (const { localPositions, minX, minY, bboxWidth } of laidOut) {
          for (const [id, pos] of localPositions) {
            positions.set(id, {
              x: pos.x - minX + cursorX,
              y: pos.y - minY,
            });
          }
          cursorX += bboxWidth + rowGap;
        }
        for (const { bboxHeight } of laidOut) {
          workflowMaxBottom = Math.max(workflowMaxBottom, bboxHeight);
        }
      } else {
        let cursorY = 0;
        for (const { localPositions, minX, minY, bboxHeight } of laidOut) {
          for (const [id, pos] of localPositions) {
            positions.set(id, {
              x: pos.x - minX,
              y: pos.y - minY + cursorY,
            });
          }
          cursorY += bboxHeight + nodeSpacing;
        }
        workflowMaxBottom = cursorY;
      }
      if (discreteNodes.length > 0) {
        if (clusterArrangement === "vertical") {
          let stackY = workflowMaxBottom + (workflowMaxBottom > 0 ? colGap : 0);
          for (const node of discreteNodes) {
            positions.set(node.id, {
              x: 0,
              y: stackY,
            });
            stackY += sizeOf(node, mode).height + colGap;
          }
        } else if (clusterArrangement === "horizontal") {
          let stackX = 0;
          const rowYPos =
            workflowMaxBottom + (workflowMaxBottom > 0 ? colGap : 0);
          for (const node of discreteNodes) {
            positions.set(node.id, {
              x: stackX,
              y: rowYPos,
            });
            stackX += sizeOf(node, mode).width + rowGap;
          }
        } else {
          const gridLayout = new GridSlotLayout();
          const gridPositions = gridLayout.compute(discreteNodes, [], options);
          for (const [id, pos] of gridPositions) {
            positions.set(id, {
              x: pos.x,
              y: pos.y + workflowMaxBottom,
            });
          }
        }
      }
    }
    let finalMinX = Number.POSITIVE_INFINITY;
    let finalMinY = Number.POSITIVE_INFINITY;
    for (const pos of positions.values()) {
      finalMinX = Math.min(finalMinX, pos.x);
      finalMinY = Math.min(finalMinY, pos.y);
    }
    if (
      Number.isFinite(finalMinX) &&
      Number.isFinite(finalMinY) &&
      (finalMinX !== 0 || finalMinY !== 0)
    ) {
      for (const [id, pos] of positions) {
        positions.set(id, {
          x: pos.x - finalMinX,
          y: pos.y - finalMinY,
        });
      }
    }
    return positions;
  }
  placeIncrementalNode({
    node,
    parentNodes,
    primaryParent,
    children,
    placedById,
    occupied,
    layerGap,
    siblingGap,
    mode,
  }) {
    const parentPlan =
      parentNodes.length > 0 && primaryParent
        ? createParentPlacementPlan(
            node,
            parentNodes,
            primaryParent,
            children,
            placedById,
            layerGap,
            siblingGap,
            mode,
          )
        : void 0;
    const size = sizeOf(node, mode);
    if (!parentPlan) {
      const gap = siblingGap;
      return findFreePositionForRects(occupied, size, {
        gap,
      });
    }
    let nextPosition = parentPlan.placeAt(parentPlan.slotIndex);
    const candidate = {
      x: nextPosition.x,
      y: nextPosition.y,
      w: size.width,
      h: size.height,
    };
    for (let attempt = 0; attempt < MAX_INCREMENTAL_SHIFT_ATTEMPTS; attempt++) {
      const blocker = occupied.find((rect) =>
        rectsOverlap(candidate, rect, INCREMENTAL_COLLISION_MARGIN),
      );
      if (!blocker) break;
      parentPlan.slotIndex += 1;
      nextPosition = parentPlan.placeAt(parentPlan.slotIndex);
      candidate.x = nextPosition.x;
      candidate.y = nextPosition.y;
    }
    return {
      x: candidate.x,
      y: candidate.y,
    };
  }
}
