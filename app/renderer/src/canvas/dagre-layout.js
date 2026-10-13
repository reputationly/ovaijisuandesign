// dagre-layout.js
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
  _,
  Bn,
  buildAdjacency,
  H,
  it,
  j,
  k,
  N,
  nodeToRect,
  O,
  q,
  rectsOverlap,
  T,
  topoSortLevels,
  w$3,
  X,
  Yn,
} from "./layout-category-lanes.js";
import { dt, en, L, le, mt, ne, Ot, Rt, te, vt } from "./ot.js";
import {
  _t,
  de,
  Ft,
  GridSlotLayout,
  lt2,
  Mt,
  Pt,
  Qe,
  st,
} from "./grid-slot-layout.js";
import { It } from "./it.js";
import { p$4 as p, tr$2 as tr, z$4 as z } from "../vendor.js";
import { W } from "./w.js";
import { qe } from "./we.js";
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
function asNonCompoundGraph(graph) {
  let simplified = new p({
    multigraph: graph.isMultigraph(),
  }).setGraph(graph.graph());
  return (
    graph.nodes().forEach((v) => {
      graph.children(v).length || simplified.setNode(v, graph.node(v));
    }),
    graph.edges().forEach((e) => {
      simplified.setEdge(e, graph.edge(e));
    }),
    simplified
  );
}
function normalizeRanks(graph) {
  let nodeRanks = graph.nodes().map((v) => {
      let rank = graph.node(v).rank;
      return rank === void 0 ? Number.MAX_VALUE : rank;
    }),
    min = L(Math.min, nodeRanks);
  graph.nodes().forEach((v) => {
    let node = graph.node(v);
    Object.hasOwn(node, "rank") && (node.rank -= min);
  });
}
function removeEmptyRanks(graph) {
  let nodeRanks = graph
      .nodes()
      .map((rank) => graph.node(rank).rank)
      .filter((rank) => rank !== void 0),
    offset = L(Math.min, nodeRanks),
    layers = [];
  graph.nodes().forEach((v) => {
    let rank = graph.node(v).rank - offset;
    (layers[rank] || (layers[rank] = []), layers[rank].push(v));
  });
  let delta = 0,
    nodeRankFactor = graph.graph().nodeRankFactor;
  Array.from(layers).forEach((vs, i) => {
    vs === void 0 && i % nodeRankFactor !== 0
      ? --delta
      : vs !== void 0 && delta && vs.forEach((v) => (graph.node(v).rank += delta));
  });
}
var defaultEdgeWeight = () => 1;
function findGreedyFeedbackEdges(graph, weightFn) {
  if (graph.nodeCount() <= 1) return [];
  let state = Yn(graph, weightFn || defaultEdgeWeight);
  return Bn(state.graph, state.buckets, state.zeroIdx).flatMap(
    (edge) => graph.outEdges(edge.v, edge.w) || [],
  );
}
function findDepthFirstFeedbackEdges(graph) {
  let feedbackEdges = [],
    activeStack = {},
    visited = {};
  function visitNode(nodeId) {
    Object.hasOwn(visited, nodeId) ||
      ((visited[nodeId] = true),
      (activeStack[nodeId] = true),
      graph.outEdges(nodeId).forEach((edge) => {
        Object.hasOwn(activeStack, edge.w) ? feedbackEdges.push(edge) : visitNode(edge.w);
      }),
      delete activeStack[nodeId]);
  }
  return (graph.nodes().forEach(visitNode), feedbackEdges);
}
function makeAcyclic(graph) {
  (graph.graph().acyclicer === "greedy" ? findGreedyFeedbackEdges(graph, makeWeightFunction(graph)) : findDepthFirstFeedbackEdges(graph)).forEach((feedbackEdge) => {
    let edgeLabel = graph.edge(feedbackEdge);
    (graph.removeEdge(feedbackEdge),
      (edgeLabel.forwardName = feedbackEdge.name),
      (edgeLabel.reversed = true),
      graph.setEdge(feedbackEdge.w, feedbackEdge.v, edgeLabel, j("rev")));
  });
  function makeWeightFunction(graph) {
    return (edge) => graph.edge(edge).weight;
  }
}
function restoreAcyclicEdges(graph) {
  graph.edges().forEach((edge) => {
    let edgeLabel = graph.edge(edge);
    if (edgeLabel.reversed) {
      graph.removeEdge(edge);
      let forwardName = edgeLabel.forwardName;
      (delete edgeLabel.reversed,
        delete edgeLabel.forwardName,
        graph.setEdge(edge.w, edge.v, edgeLabel, forwardName));
    }
  });
}
function normalizeEdge(graph, edge) {
  let v = edge.v,
    vRank = graph.node(v).rank,
    w = edge.w,
    wRank = graph.node(w).rank,
    edgeName = edge.name,
    edgeLabel = graph.edge(edge),
    labelRank = edgeLabel.labelRank;
  if (wRank === vRank + 1) return;
  graph.removeEdge(edge);
  let dummy, attrs, i;
  for (i = 0, ++vRank; vRank < wRank; ++i, ++vRank)
    ((edgeLabel.points = []),
      (attrs = {
        width: 0,
        height: 0,
        edgeLabel,
        edgeObj: edge,
        rank: vRank,
      }),
      (dummy = w$3(graph, "edge", attrs, "_d")),
      vRank === labelRank &&
        ((attrs.width = edgeLabel.width),
        (attrs.height = edgeLabel.height),
        (attrs.dummy = "edge-label"),
        (attrs.labelpos = edgeLabel.labelpos)),
      graph.setEdge(
        v,
        dummy,
        {
          weight: edgeLabel.weight,
        },
        edgeName,
      ),
      i === 0 && graph.graph().dummyChains.push(dummy),
      (v = dummy));
  graph.setEdge(
    v,
    w,
    {
      weight: edgeLabel.weight,
    },
    edgeName,
  );
}
function normalizeEdges(graph) {
  ((graph.graph().dummyChains = []), graph.edges().forEach((edge) => normalizeEdge(graph, edge)));
}
function restoreNormalizedEdges(graph) {
  graph.graph().dummyChains.forEach((dummyNodeId) => {
    let node = graph.node(dummyNodeId),
      originalLabel = node.edgeLabel,
      nextNodeId;
    for (graph.setEdge(node.edgeObj, originalLabel); node.dummy;)
      ((nextNodeId = graph.successors(dummyNodeId)[0]),
        graph.removeNode(dummyNodeId),
        originalLabel.points.push({
          x: node.x,
          y: node.y,
        }),
        node.dummy === "edge-label" &&
          ((originalLabel.x = node.x),
          (originalLabel.y = node.y),
          (originalLabel.width = node.width),
          (originalLabel.height = node.height)),
        (dummyNodeId = nextNodeId),
        (node = graph.node(dummyNodeId)));
  });
}
function runConfiguredRanker(graph) {
  let ranker = graph.graph().ranker;
  if (typeof ranker == "function") return ranker(graph);
  switch (ranker) {
    case "network-simplex":
      qe(graph);
      break;
    case "tight-tree":
      st(graph);
      break;
    case "longest-path":
      it(graph);
      break;
    case "none":
      break;
    default:
      qe(graph);
  }
}
var rankGraph = runConfiguredRanker;
function assignDummyChainParents(graph) {
  let postorderNums = lt2(graph);
  graph.graph().dummyChains.forEach((dummyNodeId) => {
    let dummyNode = graph.node(dummyNodeId),
      originalEdge = dummyNode.edgeObj,
      pathInfo = dt(graph, postorderNums, originalEdge.v, originalEdge.w),
      path = pathInfo.path,
      lca = pathInfo.lca,
      pathIndex = 0,
      parentCandidate = path[pathIndex],
      insideSourceSubgraph = true;
    for (; dummyNodeId !== originalEdge.w;) {
      if (((dummyNode = graph.node(dummyNodeId)), insideSourceSubgraph)) {
        for (; (parentCandidate = path[pathIndex]) !== lca && graph.node(parentCandidate).maxRank < dummyNode.rank;) pathIndex++;
        parentCandidate === lca && (insideSourceSubgraph = false);
      }
      if (!insideSourceSubgraph) {
        for (; pathIndex < path.length - 1 && graph.node(path[pathIndex + 1]).minRank <= dummyNode.rank;)
          pathIndex++;
        parentCandidate = path[pathIndex];
      }
      (parentCandidate !== void 0 && graph.setParent(dummyNodeId, parentCandidate), (dummyNodeId = graph.successors(dummyNodeId)[0]));
    }
  });
}
var assignDummyParents = assignDummyChainParents;
function buildNestingGraphForNode(graph, root, nodeSep, weight, height, depths, nodeId) {
  var nodeDepth;
  let children = graph.children(nodeId);
  if (!children.length) {
    nodeId !== root &&
      graph.setEdge(root, nodeId, {
        weight: 0,
        minlen: nodeSep,
      });
    return;
  }
  let borderTop = q(graph, "_bt"),
    borderBottom = q(graph, "_bb"),
    nodeLabel = graph.node(nodeId);
  (graph.setParent(borderTop, nodeId),
    (nodeLabel.borderTop = borderTop),
    graph.setParent(borderBottom, nodeId),
    (nodeLabel.borderBottom = borderBottom),
    children.forEach((childId) => {
      var childDepth;
      buildNestingGraphForNode(graph, root, nodeSep, weight, height, depths, childId);
      let childLabel = graph.node(childId),
        childTop = childLabel.borderTop ? childLabel.borderTop : childId,
        childBottom = childLabel.borderBottom ? childLabel.borderBottom : childId,
        edgeWeight = childLabel.borderTop ? weight : 2 * weight,
        minlen = childTop !== childBottom ? 1 : height - ((childDepth = depths[nodeId]) != null ? childDepth : 0) + 1;
      (graph.setEdge(borderTop, childTop, {
        weight: edgeWeight,
        minlen,
        nestingEdge: true,
      }),
        graph.setEdge(childBottom, borderBottom, {
          weight: edgeWeight,
          minlen,
          nestingEdge: true,
        }));
    }),
    graph.parent(nodeId) ||
      graph.setEdge(root, borderTop, {
        weight: 0,
        minlen: height + ((nodeDepth = depths[nodeId]) != null ? nodeDepth : 0),
      }));
}
function treeDepths(graph) {
  let depths = {};
  function assignDepth(nodeId, depth) {
    let children = graph.children(nodeId);
    (children && children.length && children.forEach((childId) => assignDepth(childId, depth + 1)), (depths[nodeId] = depth));
  }
  return (graph.children(_).forEach((nodeId) => assignDepth(nodeId, 1)), depths);
}
function sumWeights(graph) {
  return graph.edges().reduce((totalWeight, edge) => totalWeight + graph.edge(edge).weight, 0);
}
function runNestingGraph(graph) {
  let root = w$3(graph, "root", {}, "_root"),
    depths = treeDepths(graph),
    depthValues = Object.values(depths),
    height = L(Math.max, depthValues) - 1,
    nodeSep = 2 * height + 1;
  ((graph.graph().nestingRoot = root),
    graph.edges().forEach((edge) => (graph.edge(edge).minlen *= nodeSep)));
  let weight = sumWeights(graph) + 1;
  (graph.children(_).forEach((childId) => buildNestingGraphForNode(graph, root, nodeSep, weight, height, depths, childId)),
    (graph.graph().nodeRankFactor = nodeSep));
}
function cleanupNestingGraph(graph) {
  let graphLabel = graph.graph();
  (graph.removeNode(graphLabel.nestingRoot),
    delete graphLabel.nestingRoot,
    graph.edges().forEach((edge) => {
      graph.edge(edge).nestingEdge && graph.removeEdge(edge);
    }));
}
function addBorderSegments(graph) {
  function addBorderSegmentsForNode(nodeId) {
    let children = graph.children(nodeId),
      nodeLabel = graph.node(nodeId);
    if ((children.length && children.forEach(addBorderSegmentsForNode), Object.hasOwn(nodeLabel, "minRank"))) {
      ((nodeLabel.borderLeft = []), (nodeLabel.borderRight = []));
      for (let rank = nodeLabel.minRank, endRank = nodeLabel.maxRank + 1; rank < endRank; ++rank)
        (Qe(graph, "borderLeft", "_bl", nodeId, nodeLabel, rank),
          Qe(graph, "borderRight", "_br", nodeId, nodeLabel, rank));
    }
  }
  graph.children(_).forEach(addBorderSegmentsForNode);
}
var insertBorderSegments = addBorderSegments;
function swapWidthHeight(graph) {
  (graph.nodes().forEach((nodeId) => en(graph.node(nodeId))),
    graph.edges().forEach((edgeId) => en(graph.edge(edgeId))));
}
function adjustCoordinateSystem(graph) {
  var rankdirValue;
  let rankdir = (rankdirValue = graph.graph().rankdir) == null ? void 0 : rankdirValue.toLowerCase();
  (rankdir === "lr" || rankdir === "rl") && swapWidthHeight(graph);
}
function reverseYCoordinates(graph) {
  (graph.nodes().forEach((nodeId) => ne(graph.node(nodeId))),
    graph.edges().forEach((edgeId) => {
      var points;
      let edgeLabel = graph.edge(edgeId);
      ((points = edgeLabel.points) == null || points.forEach(ne),
        Object.hasOwn(edgeLabel, "y") && ne(edgeLabel));
    }));
}
function swapXYCoordinates(graph) {
  (graph.nodes().forEach((nodeId) => te(graph.node(nodeId))),
    graph.edges().forEach((edgeId) => {
      var points;
      let edgeLabel = graph.edge(edgeId);
      ((points = edgeLabel.points) == null || points.forEach(te),
        Object.hasOwn(edgeLabel, "x") && te(edgeLabel));
    }));
}
function undoCoordinateSystem(graph) {
  var rankdirValue;
  let rankdir = (rankdirValue = graph.graph().rankdir) == null ? void 0 : rankdirValue.toLowerCase();
  ((rankdir === "bt" || rankdir === "rl") && reverseYCoordinates(graph),
    (rankdir === "lr" || rankdir === "rl") && (swapXYCoordinates(graph), swapWidthHeight(graph)));
}
function buildInitialOrder(graph) {
  let visited = {},
    leafNodes = graph.nodes().filter((nodeId) => !graph.children(nodeId).length),
    leafRanks = leafNodes.map((nodeId) => graph.node(nodeId).rank),
    maxRank = L(Math.max, leafRanks),
    layers = k(maxRank + 1).map(() => []);
  function assignToLayer(nodeId) {
    if (visited[nodeId]) return;
    visited[nodeId] = true;
    let nodeLabel = graph.node(nodeId);
    layers[nodeLabel.rank].push(nodeId);
    let successors = graph.successors(nodeId);
    successors && successors.forEach(assignToLayer);
  }
  return (
    leafNodes.sort((leftNode, rightNode) => graph.node(leftNode).rank - graph.node(rightNode).rank).forEach(assignToLayer),
    layers
  );
}
function crossCount(graph, layers) {
  let totalCrossings = 0;
  for (let layerIndex = 1; layerIndex < layers.length; ++layerIndex) totalCrossings += mt(graph, layers[layerIndex - 1], layers[layerIndex]);
  return totalCrossings;
}
function buildLayerGraphs(graph, ranks, relationship) {
  let nodesByRank = new Map(),
    addNodeToRank = (rank, nodeId) => {
      (nodesByRank.has(rank) || nodesByRank.set(rank, []), nodesByRank.get(rank).push(nodeId));
    };
  for (let nodeId of graph.nodes()) {
    let nodeLabel = graph.node(nodeId);
    if (
      (typeof nodeLabel.rank == "number" && addNodeToRank(nodeLabel.rank, nodeId),
      typeof nodeLabel.minRank == "number" && typeof nodeLabel.maxRank == "number")
    )
      for (let rank = nodeLabel.minRank; rank <= nodeLabel.maxRank; rank++)
        rank !== nodeLabel.rank && addNodeToRank(rank, nodeId);
  }
  return ranks.map(function (rank) {
    return de(graph, rank, relationship, nodesByRank.get(rank) || []);
  });
}
function sortLayerGraphs(layerGraphs, ascending, constraints) {
  let constraintGraph = new p();
  layerGraphs.forEach(function (layerGraph) {
    constraints.forEach((constraint) => constraintGraph.setEdge(constraint.left, constraint.right));
    let root = layerGraph.graph().root,
      sortedSubgraph = W(layerGraph, root, constraintGraph, ascending);
    (sortedSubgraph.vs.forEach((nodeId, orderIndex) => (layerGraph.node(nodeId).order = orderIndex)), le(layerGraph, constraintGraph, sortedSubgraph.vs));
  });
}
function assignOrder(graph, layers) {
  Object.values(layers).forEach((layer) =>
    layer.forEach((nodeId, orderIndex) => (graph.node(nodeId).order = orderIndex)),
  );
}
function order(graph, options = {}) {
  if (typeof options.customOrder == "function") {
    options.customOrder(graph, order);
    return;
  }
  let maxRank = X(graph),
    incomingLayerGraphs = buildLayerGraphs(graph, k(1, maxRank + 1), "inEdges"),
    outgoingLayerGraphs = buildLayerGraphs(graph, k(maxRank - 1, -1, -1), "outEdges"),
    currentLayering = buildInitialOrder(graph);
  if ((assignOrder(graph, currentLayering), options.disableOptimalOrderHeuristic)) return;
  let bestCrossings = Number.POSITIVE_INFINITY,
    bestLayering,
    constraints = options.constraints || [];
  for (let sweepIndex = 0, sweepCount = 0; sweepCount < 4; ++sweepIndex, ++sweepCount) {
    (sortLayerGraphs(sweepIndex % 2 ? incomingLayerGraphs : outgoingLayerGraphs, sweepIndex % 4 >= 2, constraints), (currentLayering = N(graph)));
    let crossings = crossCount(graph, currentLayering);
    crossings < bestCrossings
      ? ((sweepCount = 0), (bestLayering = Object.assign({}, currentLayering)), (bestCrossings = crossings))
      : crossings === bestCrossings && (bestLayering = structuredClone(currentLayering));
  }
  assignOrder(graph, bestLayering);
}
function positionX(graph) {
  let layers = N(graph),
    verticalAlignments = Object.assign(vt(graph, layers), _t(graph, layers)),
    coordinates = {},
    order;
  ["u", "d"].forEach((verticalDirection) => {
    ((order = verticalDirection === "u" ? layers : Object.values(layers).reverse()),
      ["l", "r"].forEach((horizontalDirection) => {
        horizontalDirection === "r" && (order = order.map((layer) => Object.values(layer).reverse()));
        let alignment = Ot(
            graph,
            order,
            verticalAlignments,
            (nodeId) =>
              (verticalDirection === "u" ? graph.predecessors(nodeId) : graph.successors(nodeId)) || [],
          ),
          xCoordinates = It(graph, order, alignment.root, alignment.align, horizontalDirection === "r");
        (horizontalDirection === "r" && (xCoordinates = O(xCoordinates, (xCoordinate) => -xCoordinate)), (coordinates[verticalDirection + horizontalDirection] = xCoordinates));
      }));
  });
  let smallestAlignment = Rt(graph, coordinates);
  return (Pt(coordinates, smallestAlignment), Mt(coordinates, graph.graph().align));
}
function position(graph) {
  ((graph = asNonCompoundGraph(graph)),
    Ft(graph),
    Object.entries(positionX(graph)).forEach(([nodeId, xCoordinate]) => (graph.node(nodeId).x = xCoordinate)));
}
var GRAPH_ATTRIBUTE_NAMES = ["nodesep", "edgesep", "ranksep", "marginx", "marginy"];
var DEFAULT_GRAPH_ATTRIBUTES = {
  ranksep: 50,
  edgesep: 20,
  nodesep: 50,
  rankdir: "TB",
  rankalign: "center",
};
var LAYOUT_ATTRIBUTE_NAMES = ["acyclicer", "ranker", "rankdir", "align", "rankalign"];
var NODE_ATTRIBUTE_NAMES = ["width", "height", "rank"];
var cn = {
  width: 0,
  height: 0,
};
var zt = ["minlen", "weight", "width", "height", "labeloffset"];
var DEFAULT_EDGE_ATTRIBUTES = {
  minlen: 1,
  weight: 1,
  width: 0,
  height: 0,
  labeloffset: 10,
  labelpos: "r",
};
var qt = ["labelpos"];
function makeSpaceForEdgeLabels(graph) {
  let graphLabel = graph.graph();
  ((graphLabel.ranksep /= 2),
    graph.edges().forEach((edgeId) => {
      let edgeLabel = graph.edge(edgeId);
      ((edgeLabel.minlen *= 2),
        edgeLabel.labelpos.toLowerCase() !== "c" &&
          (graphLabel.rankdir === "TB" || graphLabel.rankdir === "BT"
            ? (edgeLabel.width += edgeLabel.labeloffset)
            : (edgeLabel.height += edgeLabel.labeloffset)));
    }));
}
function injectEdgeLabelProxies(graph) {
  graph.edges().forEach((edgeId) => {
    let edgeLabel = graph.edge(edgeId);
    if (edgeLabel.width && edgeLabel.height) {
      let sourceNode = graph.node(edgeId.v),
        proxyLabel = {
          rank: (graph.node(edgeId.w).rank - sourceNode.rank) / 2 + sourceNode.rank,
          e: edgeId,
        };
      w$3(graph, "edge-proxy", proxyLabel, "_ep");
    }
  });
}
function assignRankMinMax(graph) {
  let maxRank = 0;
  (graph.nodes().forEach((nodeId) => {
    let nodeLabel = graph.node(nodeId);
    nodeLabel.borderTop &&
      ((nodeLabel.minRank = graph.node(nodeLabel.borderTop).rank),
      (nodeLabel.maxRank = graph.node(nodeLabel.borderBottom).rank),
      (maxRank = Math.max(maxRank, nodeLabel.maxRank)));
  }),
    (graph.graph().maxRank = maxRank));
}
function removeEdgeLabelProxies(graph) {
  graph.nodes().forEach((nodeId) => {
    let nodeLabel = graph.node(nodeId);
    if (nodeLabel.dummy === "edge-proxy") {
      let proxyLabel = nodeLabel;
      ((graph.edge(proxyLabel.e).labelRank = nodeLabel.rank), graph.removeNode(nodeId));
    }
  });
}
function translateGraph(graph) {
  let minX = Number.POSITIVE_INFINITY,
    maxX = 0,
    minY = Number.POSITIVE_INFINITY,
    maxY = 0,
    graphLabel = graph.graph(),
    marginX = graphLabel.marginx || 0,
    marginY = graphLabel.marginy || 0;
  function includeInBounds(labelObject) {
    let x = labelObject.x,
      y = labelObject.y,
      width = labelObject.width,
      height = labelObject.height;
    ((minX = Math.min(minX, x - width / 2)),
      (maxX = Math.max(maxX, x + width / 2)),
      (minY = Math.min(minY, y - height / 2)),
      (maxY = Math.max(maxY, y + height / 2)));
  }
  (graph.nodes().forEach((nodeId) => includeInBounds(graph.node(nodeId))),
    graph.edges().forEach((edgeId) => {
      let edgeLabel = graph.edge(edgeId);
      Object.hasOwn(edgeLabel, "x") && includeInBounds(edgeLabel);
    }),
    (minX -= marginX),
    (minY -= marginY),
    graph.nodes().forEach((nodeId) => {
      let nodeLabel = graph.node(nodeId);
      ((nodeLabel.x -= minX), (nodeLabel.y -= minY));
    }),
    graph.edges().forEach((edgeId) => {
      let edgeLabel = graph.edge(edgeId);
      (edgeLabel.points.forEach((point) => {
        ((point.x -= minX), (point.y -= minY));
      }),
        Object.hasOwn(edgeLabel, "x") && (edgeLabel.x -= minX),
        Object.hasOwn(edgeLabel, "y") && (edgeLabel.y -= minY));
    }),
    (graphLabel.width = maxX - minX + marginX),
    (graphLabel.height = maxY - minY + marginY));
}
function assignNodeIntersects(graph) {
  graph.edges().forEach((edgeId) => {
    let edgeLabel = graph.edge(edgeId),
      sourceNode = graph.node(edgeId.v),
      targetNode = graph.node(edgeId.w),
      firstPoint,
      lastPoint;
    (edgeLabel.points
      ? ((firstPoint = edgeLabel.points[0]), (lastPoint = edgeLabel.points[edgeLabel.points.length - 1]))
      : ((edgeLabel.points = []), (firstPoint = targetNode), (lastPoint = sourceNode)),
      edgeLabel.points.unshift(H(sourceNode, firstPoint)),
      edgeLabel.points.push(H(targetNode, lastPoint)));
  });
}
function fixupEdgeLabelCoords(graph) {
  graph.edges().forEach((edgeId) => {
    let edgeLabel = graph.edge(edgeId);
    if (Object.hasOwn(edgeLabel, "x"))
      switch (
        ((edgeLabel.labelpos === "l" || edgeLabel.labelpos === "r") &&
          (edgeLabel.width -= edgeLabel.labeloffset),
        edgeLabel.labelpos)
      ) {
        case "l":
          edgeLabel.x -= edgeLabel.width / 2 + edgeLabel.labeloffset;
          break;
        case "r":
          edgeLabel.x += edgeLabel.width / 2 + edgeLabel.labeloffset;
          break;
      }
  });
}
function reversePointsForReversedEdges(graph) {
  graph.edges().forEach((edgeId) => {
    let edgeLabel = graph.edge(edgeId);
    edgeLabel.reversed && edgeLabel.points.reverse();
  });
}
function removeSelfEdges(graph) {
  graph.edges().forEach((edge) => {
    if (edge.v === edge.w) {
      let nodeLabel = graph.node(edge.v);
      (nodeLabel.selfEdges || (nodeLabel.selfEdges = []),
        nodeLabel.selfEdges.push({
          e: edge,
          label: graph.edge(edge),
        }),
        graph.removeEdge(edge));
    }
  });
}
function insertSelfEdges(graph) {
  N(graph).forEach((layer) => {
    let orderOffset = 0;
    layer.forEach((nodeId, layerIndex) => {
      let nodeLabel = graph.node(nodeId);
      ((nodeLabel.order = layerIndex + orderOffset),
        (nodeLabel.selfEdges || []).forEach((selfEdge) => {
          w$3(
            graph,
            "selfedge",
            {
              width: selfEdge.label.width,
              height: selfEdge.label.height,
              rank: nodeLabel.rank,
              order: layerIndex + ++orderOffset,
              e: selfEdge.e,
              label: selfEdge.label,
            },
            "_se",
          );
        }),
        delete nodeLabel.selfEdges);
    });
  });
}
function positionSelfEdges(graph) {
  graph.nodes().forEach((nodeId) => {
    let dummyLabel = graph.node(nodeId);
    if (dummyLabel.dummy === "selfedge") {
      let selfEdgeLabel = dummyLabel,
        sourceNode = graph.node(selfEdgeLabel.e.v),
        sourceRightX = sourceNode.x + sourceNode.width / 2,
        sourceCenterY = sourceNode.y,
        loopOffsetX = dummyLabel.x - sourceRightX,
        halfNodeHeight = sourceNode.height / 2;
      (graph.setEdge(selfEdgeLabel.e, selfEdgeLabel.label),
        graph.removeNode(nodeId),
        (selfEdgeLabel.label.points = [
          {
            x: sourceRightX + (2 * loopOffsetX) / 3,
            y: sourceCenterY - halfNodeHeight,
          },
          {
            x: sourceRightX + (5 * loopOffsetX) / 6,
            y: sourceCenterY - halfNodeHeight,
          },
          {
            x: sourceRightX + loopOffsetX,
            y: sourceCenterY,
          },
          {
            x: sourceRightX + (5 * loopOffsetX) / 6,
            y: sourceCenterY + halfNodeHeight,
          },
          {
            x: sourceRightX + (2 * loopOffsetX) / 3,
            y: sourceCenterY + halfNodeHeight,
          },
        ]),
        (selfEdgeLabel.label.x = dummyLabel.x),
        (selfEdgeLabel.label.y = dummyLabel.y));
    }
  });
}
function runLayoutStages(graph, timeStage, options) {
  (timeStage("    makeSpaceForEdgeLabels", () => makeSpaceForEdgeLabels(graph)),
    timeStage("    removeSelfEdges", () => removeSelfEdges(graph)),
    timeStage("    acyclic", () => makeAcyclic(graph)),
    timeStage("    nestingGraph.run", () => runNestingGraph(graph)),
    timeStage("    rank", () => rankGraph(asNonCompoundGraph(graph))),
    timeStage("    injectEdgeLabelProxies", () => injectEdgeLabelProxies(graph)),
    timeStage("    removeEmptyRanks", () => removeEmptyRanks(graph)),
    timeStage("    nestingGraph.cleanup", () => cleanupNestingGraph(graph)),
    timeStage("    normalizeRanks", () => normalizeRanks(graph)),
    timeStage("    assignRankMinMax", () => assignRankMinMax(graph)),
    timeStage("    removeEdgeLabelProxies", () => removeEdgeLabelProxies(graph)),
    timeStage("    normalize.run", () => normalizeEdges(graph)),
    timeStage("    parentDummyChains", () => assignDummyParents(graph)),
    timeStage("    addBorderSegments", () => insertBorderSegments(graph)),
    timeStage("    order", () => order(graph, options)),
    timeStage("    insertSelfEdges", () => insertSelfEdges(graph)),
    timeStage("    adjustCoordinateSystem", () => adjustCoordinateSystem(graph)),
    timeStage("    position", () => position(graph)),
    timeStage("    positionSelfEdges", () => positionSelfEdges(graph)),
    timeStage("    removeBorderNodes", () => tr(graph)),
    timeStage("    normalize.undo", () => restoreNormalizedEdges(graph)),
    timeStage("    fixupEdgeLabelCoords", () => fixupEdgeLabelCoords(graph)),
    timeStage("    undoCoordinateSystem", () => undoCoordinateSystem(graph)),
    timeStage("    translateGraph", () => translateGraph(graph)),
    timeStage("    assignNodeIntersects", () => assignNodeIntersects(graph)),
    timeStage("    reversePoints", () => reversePointsForReversedEdges(graph)),
    timeStage("    acyclic.undo", () => restoreAcyclicEdges(graph)));
}
function ue(attributes, attributeNames) {
  return O(T(attributes, attributeNames), Number);
}
function ce(attributes) {
  let normalizedAttributes = {};
  return (
    attributes &&
      Object.entries(attributes).forEach(([attributeName, attributeValue]) => {
        (typeof attributeName == "string" && (attributeName = attributeName.toLowerCase()), (normalizedAttributes[attributeName] = attributeValue));
      }),
    normalizedAttributes
  );
}
function buildLayoutGraph(inputGraph) {
  let layoutGraph = new p({
      multigraph: true,
      compound: true,
    }),
    graphLabel = ce(inputGraph.graph());
  return (
    layoutGraph.setGraph(Object.assign({}, DEFAULT_GRAPH_ATTRIBUTES, ue(graphLabel, GRAPH_ATTRIBUTE_NAMES), T(graphLabel, LAYOUT_ATTRIBUTE_NAMES))),
    inputGraph.nodes().forEach((nodeId) => {
      let nodeLabel = ce(inputGraph.node(nodeId)),
        nodeAttrs = ue(nodeLabel, NODE_ATTRIBUTE_NAMES);
      (Object.keys(cn).forEach((attributeName) => {
        nodeAttrs[attributeName] === void 0 && (nodeAttrs[attributeName] = cn[attributeName]);
      }),
        layoutGraph.setNode(nodeId, nodeAttrs));
      let parentId = inputGraph.parent(nodeId);
      parentId !== void 0 && layoutGraph.setParent(nodeId, parentId);
    }),
    inputGraph.edges().forEach((edgeId) => {
      let edgeLabel = ce(inputGraph.edge(edgeId));
      layoutGraph.setEdge(edgeId, Object.assign({}, DEFAULT_EDGE_ATTRIBUTES, ue(edgeLabel, zt), T(edgeLabel, qt)));
    }),
    layoutGraph
  );
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
function logTiming(label, callback) {
  let startTime = Date.now();
  try {
    return callback();
  } finally {
    console.log(label + " time: " + (Date.now() - startTime) + "ms");
  }
}
function runWithoutTiming(label, callback) {
  return callback();
}
function updateInputGraph(inputGraph, layoutGraph) {
  (inputGraph.nodes().forEach((nodeId) => {
    let inputNode = inputGraph.node(nodeId),
      layoutNode = layoutGraph.node(nodeId);
    inputNode &&
      ((inputNode.x = layoutNode.x),
      (inputNode.y = layoutNode.y),
      (inputNode.order = layoutNode.order),
      (inputNode.rank = layoutNode.rank),
      layoutGraph.children(nodeId).length &&
        ((inputNode.width = layoutNode.width), (inputNode.height = layoutNode.height)));
  }),
    inputGraph.edges().forEach((edgeId) => {
      let inputEdge = inputGraph.edge(edgeId),
        layoutEdge = layoutGraph.edge(edgeId);
      ((inputEdge.points = layoutEdge.points),
        Object.hasOwn(layoutEdge, "x") && ((inputEdge.x = layoutEdge.x), (inputEdge.y = layoutEdge.y)));
    }),
    (inputGraph.graph().width = layoutGraph.graph().width),
    (inputGraph.graph().height = layoutGraph.graph().height));
}
function he(inputGraph, options = {}) {
  let timeStage = options.debugTiming ? logTiming : runWithoutTiming;
  return timeStage("layout", () => {
    let layoutGraph = timeStage("  buildLayoutGraph", () => buildLayoutGraph(inputGraph));
    return (
      timeStage("  runLayout", () => runLayoutStages(layoutGraph, timeStage, options)),
      timeStage("  updateInputGraph", () => updateInputGraph(inputGraph, layoutGraph)),
      layoutGraph
    );
  });
}
function dagreLayoutWorkflow(nodes, edges, options) {
  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const direction = DIRECTION_MAP[options?.direction ?? "LR"] ?? "LR";
  const nodeSpacing = options?.spacing?.y ?? DEFAULT_NODE_SPACING;
  const layerSpacing = options?.spacing?.x ?? DEFAULT_LAYER_SPACING;
  const mode = options?.mode ?? CanvasMode.Workflow;
  const graph = new z.Graph({
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
  he(graph);
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
