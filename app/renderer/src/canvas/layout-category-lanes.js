// layout-category-lanes.js
import { CanvasNodeType, p$4 as Graph, pe as defineProperty } from "../vendor.js";
import { CanvasMode } from "./compute-group-bounds-from-children.js";
import { getNodePosition, sizeOf } from "./use-active-mode.js";
import { L } from "./ot.js";
export function topoSortLevels(nodeIds, children, parents) {
  const levels = new Map();
  const inDegree = new Map();
  for (const id of nodeIds) {
    inDegree.set(id, parents.get(id)?.length ?? 0);
  }
  const queue = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
      levels.set(id, 0);
    }
  }
  let idx = 0;
  while (idx < queue.length) {
    const current = queue[idx++];
    const currentLevel = levels.get(current) ?? 0;
    for (const child of children.get(current) ?? []) {
      const newLevel = currentLevel + 1;
      levels.set(child, Math.max(levels.get(child) ?? 0, newLevel));
      const remaining = (inDegree.get(child) ?? 0) - 1;
      inDegree.set(child, remaining);
      if (remaining === 0) {
        queue.push(child);
      }
    }
  }
  for (const id of nodeIds) {
    if (!levels.has(id)) levels.set(id, 0);
  }
  return levels;
}
export function buildAdjacency(nodeIds, edges) {
  const children = new Map();
  const parents = new Map();
  for (const id of nodeIds) {
    children.set(id, []);
    parents.set(id, []);
  }
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    children.get(edge.source)?.push(edge.target);
    parents.get(edge.target)?.push(edge.source);
  }
  return {
    children,
    parents,
  };
}
export const COLLISION_MARGIN = 40;
export function rectsOverlap(rectA, rectB, margin = COLLISION_MARGIN) {
  return (
    rectA.x < rectB.x + rectB.w + margin &&
    rectB.x < rectA.x + rectA.w + margin &&
    rectA.y < rectB.y + rectB.h + margin &&
    rectB.y < rectA.y + rectA.h + margin
  );
}
export function nodeToRect(node, mode) {
  const resolvedMode = mode ?? CanvasMode.Workflow;
  const sz = sizeOf(node, resolvedMode);
  const pos = getNodePosition(node, resolvedMode);
  return {
    x: pos.x,
    y: pos.y,
    w: sz.width,
    h: sz.height,
  };
}
const CATEGORY_LANE_ORDER = [
  CanvasNodeType.Image,
  CanvasNodeType.Video,
  CanvasNodeType.Audio,
  CanvasNodeType.Text,
  CanvasNodeType.File,
  CanvasNodeType.Table,
  // Groups are opaque containers that may mix types internally — they get
  // their own lane rather than being torn open.
  CanvasNodeType.Group,
  // Still-generating slots sit last so that, once they resolve into a real
  // asset, the finished node moves to its type lane instead of shuffling the
  // whole board.
  CanvasNodeType.Placeholder,
];
const OTHER_CATEGORY_LANE = "other";
const LANE_RANK = new Map(
  CATEGORY_LANE_ORDER.map((category, index) => [category, index]),
);
function resolveCategoryLane(nodeType) {
  return LANE_RANK.has(nodeType) ? nodeType : OTHER_CATEGORY_LANE;
}
const DEFAULT_ITEM_GAP = 100;
const DEFAULT_LANE_GAP_RATIO = 2.5;
const DEFAULT_MAX_COLS = 8;
export function layoutCategoryLanes(items, options) {
  const positions = new Map();
  if (items.length === 0) return positions;
  const itemGap = DEFAULT_ITEM_GAP;
  const laneGap = Math.round(itemGap * DEFAULT_LANE_GAP_RATIO);
  const maxCols = Math.max(1, DEFAULT_MAX_COLS);
  const buckets = new Map();
  for (const item of items) {
    const lane = resolveCategoryLane(item.type);
    const bucket = buckets.get(lane);
    if (bucket) bucket.push(item);
    else buckets.set(lane, [item]);
  }
  const orderedLanes = [...buckets.keys()].sort(
    (firstLane, secondLane) =>
      (LANE_RANK.get(firstLane) ?? CATEGORY_LANE_ORDER.length) -
      (LANE_RANK.get(secondLane) ?? CATEGORY_LANE_ORDER.length),
  );
  let laneTop = 0;
  for (const lane of orderedLanes) {
    const bucket = buckets.get(lane);
    if (!bucket || bucket.length === 0) continue;
    const cols = Math.min(maxCols, bucket.length);
    const rows = Math.ceil(bucket.length / cols);
    const colWidths = new Array(cols).fill(0);
    const rowHeights = new Array(rows).fill(0);
    bucket.forEach((item, index2) => {
      const columnIndex = index2 % cols;
      const rowIndex = Math.floor(index2 / cols);
      if (item.width > colWidths[columnIndex]) colWidths[columnIndex] = item.width;
      if (item.height > rowHeights[rowIndex]) rowHeights[rowIndex] = item.height;
    });
    const colX = new Array(cols).fill(0);
    for (let columnIndex = 1; columnIndex < cols; columnIndex++)
      colX[columnIndex] = colX[columnIndex - 1] + colWidths[columnIndex - 1] + itemGap;
    const rowY = new Array(rows).fill(0);
    for (let rowIndex = 1; rowIndex < rows; rowIndex++)
      rowY[rowIndex] = rowY[rowIndex - 1] + rowHeights[rowIndex - 1] + itemGap;
    bucket.forEach((item, index2) => {
      const columnIndex = index2 % cols;
      const rowIndex = Math.floor(index2 / cols);
      positions.set(item.id, {
        x: colX[columnIndex],
        y: laneTop + rowY[rowIndex],
      });
    });
    laneTop += rowY[rows - 1] + rowHeights[rows - 1] + laneGap;
  }
  return positions;
}
export function H(rectangle, point) {
  let rectangleX = rectangle.x,
    rectangleY = rectangle.y,
    deltaX = point.x - rectangleX,
    deltaY = point.y - rectangleY,
    halfWidth = rectangle.width / 2,
    halfHeight = rectangle.height / 2;
  if (!deltaX && !deltaY)
    throw new Error(
      "Not possible to find intersection inside of the rectangle",
    );
  let intersectionXOffset, intersectionYOffset;
  return (
    Math.abs(deltaY) * halfWidth > Math.abs(deltaX) * halfHeight
      ? (deltaY < 0 && (halfHeight = -halfHeight), (intersectionXOffset = (halfHeight * deltaX) / deltaY), (intersectionYOffset = halfHeight))
      : (deltaX < 0 && (halfWidth = -halfWidth), (intersectionXOffset = halfWidth), (intersectionYOffset = (halfWidth * deltaY) / deltaX)),
    {
      x: rectangleX + intersectionXOffset,
      y: rectangleY + intersectionYOffset,
    }
  );
}
export function X(graph) {
  let nodeRanks = graph.nodes().map((nodeId) => {
    let nodeRank = graph.node(nodeId).rank;
    return nodeRank === void 0 ? Number.MIN_VALUE : nodeRank;
  });
  return L(Math.max, nodeRanks);
}
var uniqueIdCounter = 0;
export function j(prefix) {
  let generatedId = ++uniqueIdCounter;
  return prefix + ("" + generatedId);
}
export function w$3(graph, dummyType, attributes, prefix) {
  let dummyNodeId = prefix;
  for (; graph.hasNode(dummyNodeId);) dummyNodeId = j(prefix);
  return ((attributes.dummy = dummyType), graph.setNode(dummyNodeId, attributes), dummyNodeId);
}
export function q(graph, prefix, rank, order) {
  let borderNodeLabel = {
    width: 0,
    height: 0,
  };
  return (
    arguments.length >= 4 && ((borderNodeLabel.rank = rank), (borderNodeLabel.order = order)),
    w$3(graph, "border", borderNodeLabel, prefix)
  );
}
export function k(start, limit, step = 1) {
  limit == null && ((limit = start), (start = 0));
  let endCondition = (value) => value < limit;
  step < 0 && (endCondition = (candidate) => limit < candidate);
  let values = [];
  for (let value = start; endCondition(value); value += step) values.push(value);
  return values;
}
export function N(graph) {
  let layers = k(X(graph) + 1).map(() => []);
  return (
    graph.nodes().forEach((nodeId) => {
      let nodeLabel = graph.node(nodeId),
        rank = nodeLabel.rank;
      rank !== void 0 && (layers[rank] || (layers[rank] = []), (layers[rank][nodeLabel.order] = nodeId));
    }),
    layers
  );
}
export function T(source, keys) {
  let selectedProperties = {};
  for (let key of keys) source[key] !== void 0 && (selectedProperties[key] = source[key]);
  return selectedProperties;
}
export function O(source, mapperOrProperty) {
  let mapper;
  return (
    typeof mapperOrProperty == "string" ? (mapper = (value) => value[mapperOrProperty]) : (mapper = mapperOrProperty),
    Object.entries(source).reduce((result, [key, value]) => ((result[key] = mapper(value, key)), result), {})
  );
}
export var _ = "\0";
function removeLinkedListNode(linkedListNode) {
  ((linkedListNode._prev._next = linkedListNode._next),
    (linkedListNode._next._prev = linkedListNode._prev),
    delete linkedListNode._next,
    delete linkedListNode._prev);
}
function omitLinkedListPointers(propertyName, propertyValue) {
  if (propertyName !== "_next" && propertyName !== "_prev") return propertyValue;
}
var LinkedListClass = class List {
  constructor() {
    defineProperty(this, "_sentinel");
    let sentinel = {};
    ((sentinel._next = sentinel._prev = sentinel), (this._sentinel = sentinel));
  }
  dequeue() {
    let sentinel = this._sentinel,
      lastNode = sentinel._prev;
    if (lastNode !== sentinel) return (removeLinkedListNode(lastNode), lastNode);
  }
  enqueue(node) {
    let sentinel = this._sentinel;
    (node._prev && node._next && removeLinkedListNode(node),
      (node._next = sentinel._next),
      (sentinel._next._prev = node),
      (sentinel._next = node),
      (node._prev = sentinel));
  }
  toString() {
    let serializedNodes = [],
      sentinel = this._sentinel,
      currentNode = sentinel._prev;
    for (; currentNode !== sentinel;) (serializedNodes.push(JSON.stringify(currentNode, omitLinkedListPointers)), (currentNode = currentNode._prev));
    return "[" + serializedNodes.join(", ") + "]";
  }
};
var LinkedList = LinkedListClass;
function assignBucket(buckets, zeroIndex, entry) {
  var middleBucket, sinkBucket, sourceBucket;
  entry.out
    ? entry.in
      ? (sourceBucket = buckets[entry.out - entry.in + zeroIndex]) == null || sourceBucket.enqueue(entry)
      : (sinkBucket = buckets[buckets.length - 1]) == null || sinkBucket.enqueue(entry)
    : (middleBucket = buckets[0]) == null || middleBucket.enqueue(entry);
}
function removeNode(graph, buckets, zeroIndex, entry, collectPredecessors) {
  let predecessors = [],
    collectedPredecessors = collectPredecessors ? predecessors : void 0;
  return (
    (graph.inEdges(entry.v) || []).forEach((edge) => {
      let edgeWeight = graph.edge(edge),
        sourceEntry = graph.node(edge.v);
      (collectPredecessors &&
        predecessors.push({
          v: edge.v,
          w: edge.w,
        }),
        (sourceEntry.out -= edgeWeight),
        assignBucket(buckets, zeroIndex, sourceEntry));
    }),
    (graph.outEdges(entry.v) || []).forEach((edge) => {
      let edgeWeight = graph.edge(edge),
        targetNodeId = edge.w,
        targetEntry = graph.node(targetNodeId);
      ((targetEntry.in -= edgeWeight), assignBucket(buckets, zeroIndex, targetEntry));
    }),
    graph.removeNode(entry.v),
    collectedPredecessors
  );
}
export function Bn(graph, buckets, zeroIndex) {
  var middleBucket;
  let feedbackEdges = [],
    sourceBucket = buckets[buckets.length - 1],
    sinkBucket = buckets[0],
    entry;
  for (; graph.nodeCount();) {
    for (; (entry = sinkBucket.dequeue());) removeNode(graph, buckets, zeroIndex, entry);
    for (; (entry = sourceBucket.dequeue());) removeNode(graph, buckets, zeroIndex, entry);
    if (graph.nodeCount()) {
      for (let bucketIndex = buckets.length - 2; bucketIndex > 0; --bucketIndex)
        if (((entry = (middleBucket = buckets[bucketIndex]) == null ? void 0 : middleBucket.dequeue()), entry)) {
          feedbackEdges = feedbackEdges.concat(removeNode(graph, buckets, zeroIndex, entry, true) || []);
          break;
        }
    }
  }
  return feedbackEdges;
}
function range(limit) {
  let values = [];
  for (let value = 0; value < limit; value++) values.push(value);
  return values;
}
export function Yn(graph, weight) {
  let stateGraph = new Graph(),
    maxInWeight = 0,
    maxOutWeight = 0;
  (graph.nodes().forEach((nodeId) => {
    stateGraph.setNode(nodeId, {
      v: nodeId,
      in: 0,
      out: 0,
    });
  }),
    graph.edges().forEach((edge) => {
      let existingWeight = stateGraph.edge(edge.v, edge.w) || 0,
        edgeWeight = weight(edge),
        combinedWeight = existingWeight + edgeWeight;
      stateGraph.setEdge(edge.v, edge.w, combinedWeight);
      let sourceEntry = stateGraph.node(edge.v),
        targetEntry = stateGraph.node(edge.w);
      ((maxOutWeight = Math.max(maxOutWeight, (sourceEntry.out += edgeWeight))), (maxInWeight = Math.max(maxInWeight, (targetEntry.in += edgeWeight))));
    }));
  let buckets = range(maxOutWeight + maxInWeight + 3).map(() => new LinkedList()),
    zeroIndex = maxInWeight + 1;
  return (
    stateGraph.nodes().forEach((nodeId) => {
      assignBucket(buckets, zeroIndex, stateGraph.node(nodeId));
    }),
    {
      graph: stateGraph,
      buckets,
      zeroIdx: zeroIndex,
    }
  );
}
export function S(graph) {
  let visited = {};
  function visitNode(nodeId) {
    let nodeLabel = graph.node(nodeId);
    if (Object.hasOwn(visited, nodeId)) return nodeLabel.rank;
    visited[nodeId] = true;
    let outgoingEdges = graph.outEdges(nodeId),
      candidateRanks = outgoingEdges
        ? outgoingEdges.map((edge) =>
            edge == null
              ? Number.POSITIVE_INFINITY
              : visitNode(edge.w) - graph.edge(edge).minlen,
          )
        : [],
      rank = L(Math.min, candidateRanks);
    return (rank === Number.POSITIVE_INFINITY && (rank = 0), (nodeLabel.rank = rank));
  }
  graph.sources().forEach(visitNode);
}
export function v$4(graph, edge) {
  return graph.node(edge.w).rank - graph.node(edge.v).rank - graph.edge(edge).minlen;
}
function tightTree(tree, graph) {
  function visitNode(nodeId) {
    let incidentEdges = graph.nodeEdges(nodeId);
    incidentEdges &&
      incidentEdges.forEach((edge) => {
        let edgeSource = edge.v,
          edgeTarget = nodeId === edgeSource ? edge.w : edgeSource;
        !tree.hasNode(edgeTarget) &&
          !v$4(graph, edge) &&
          (tree.setNode(edgeTarget, {}), tree.setEdge(nodeId, edgeTarget, {}), visitNode(edgeTarget));
      });
  }
  return (tree.nodes().forEach(visitNode), tree.nodeCount());
}
function findMinSlackEdge(tree, graph) {
  return graph.edges().reduce(
    (bestCandidate, edge) => {
      let edgeSlack = Number.POSITIVE_INFINITY;
      return (
        tree.hasNode(edge.v) !== tree.hasNode(edge.w) && (edgeSlack = v$4(graph, edge)),
        edgeSlack < bestCandidate[0] ? [edgeSlack, edge] : bestCandidate
      );
    },
    [Number.POSITIVE_INFINITY, null],
  )[1];
}
function shiftRanks(tree, graph, rankDelta) {
  tree.nodes().forEach((nodeId) => (graph.node(nodeId).rank += rankDelta));
}
function feasibleTree(graph) {
  let tree = new Graph({
      directed: false,
    }),
    nodes = graph.nodes();
  if (nodes.length === 0) throw new Error("Graph must have at least one node");
  let startNode = nodes[0],
    nodeCount = graph.nodeCount();
  tree.setNode(startNode, {});
  let edge, rankDelta;
  for (; tightTree(tree, graph) < nodeCount && ((edge = findMinSlackEdge(tree, graph)), !!edge);)
    ((rankDelta = tree.hasNode(edge.v) ? v$4(graph, edge) : -v$4(graph, edge)), shiftRanks(tree, graph, rankDelta));
  return tree;
}
export var V = feasibleTree;
export var it = S;
