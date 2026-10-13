// we.js
import { p$4 as Graph, R$4 as graphAlgorithms } from "../vendor.js";
import { S, V, v$4 } from "./layout-category-lanes.js";
function simplify(graph) {
  let simplifiedGraph = new Graph().setGraph(graph.graph());
  return (
    graph.nodes().forEach((nodeId) => simplifiedGraph.setNode(nodeId, graph.node(nodeId))),
    graph.edges().forEach((edge) => {
      let simplifiedEdge = simplifiedGraph.edge(edge.v, edge.w) || {
          weight: 0,
          minlen: 1,
        },
        originalEdge = graph.edge(edge);
      simplifiedGraph.setEdge(edge.v, edge.w, {
        weight: simplifiedEdge.weight + originalEdge.weight,
        minlen: Math.max(simplifiedEdge.minlen, originalEdge.minlen),
      });
    }),
    simplifiedGraph
  );
}
var { preorder, postorder } = graphAlgorithms;
function dfsAssignLowLim(tree, visitedNodes, nextLim, nodeId, parentId) {
  let currentLim = nextLim,
    node = tree.node(nodeId);
  visitedNodes[nodeId] = true;
  let neighbors = tree.neighbors(nodeId);
  return (
    neighbors &&
      neighbors.forEach((neighborId) => {
        Object.hasOwn(visitedNodes, neighborId) || (nextLim = dfsAssignLowLim(tree, visitedNodes, nextLim, neighborId, nodeId));
      }),
    (node.low = currentLim),
    (node.lim = nextLim++),
    parentId ? (node.parent = parentId) : delete node.parent,
    nextLim
  );
}
function initLowLimValues(tree, root) {
  (arguments.length < 2 && (root = tree.nodes()[0]), dfsAssignLowLim(tree, {}, 1, root));
}
function leaveEdge(tree) {
  return tree.edges().find((edge) => tree.edge(edge).cutvalue < 0);
}
function updateRanks(tree, graph) {
  let rootNode = tree.nodes().find((nodeId) => !tree.node(nodeId).parent);
  if (!rootNode) return;
  let preorderNodes = preorder(tree, [rootNode]);
  ((preorderNodes = preorderNodes.slice(1)),
    preorderNodes.forEach((nodeId) => {
      let parentId = tree.node(nodeId).parent,
        parentEdge = graph.edge(nodeId, parentId),
        isReversed = false;
      (parentEdge || ((parentEdge = graph.edge(parentId, nodeId)), (isReversed = true)),
        (graph.node(nodeId).rank = graph.node(parentId).rank + (isReversed ? parentEdge.minlen : -parentEdge.minlen)));
    }));
}
function isTreeEdge(tree, sourceId, targetId) {
  return tree.hasEdge(sourceId, targetId);
}
function calcCutValue(tree, graph, childId) {
  let parentId = tree.node(childId).parent,
    isOutgoingTreeEdge = true,
    parentEdge = graph.edge(childId, parentId),
    cutValue = 0;
  (parentEdge || ((isOutgoingTreeEdge = false), (parentEdge = graph.edge(parentId, childId))), (cutValue = parentEdge.weight));
  let incidentEdges = graph.nodeEdges(childId);
  return (
    incidentEdges &&
      incidentEdges.forEach((edge) => {
        let edgeStartsAtChild = edge.v === childId,
          adjacentNode = edgeStartsAtChild ? edge.w : edge.v;
        if (adjacentNode !== parentId) {
          let followsTreeOrientation = edgeStartsAtChild === isOutgoingTreeEdge,
            edgeWeight = graph.edge(edge).weight;
          if (((cutValue += followsTreeOrientation ? edgeWeight : -edgeWeight), isTreeEdge(tree, childId, adjacentNode))) {
            let edgeCutValue = tree.edge(childId, adjacentNode).cutvalue;
            cutValue += followsTreeOrientation ? -edgeCutValue : edgeCutValue;
          }
        }
      }),
    cutValue
  );
}
function assignCutValue(tree, graph, childId) {
  let parentId = tree.node(childId).parent,
    treeEdge = tree.edge(childId, parentId);
  treeEdge.cutvalue = calcCutValue(tree, graph, childId);
}
function initCutValues(tree, graph) {
  let postorderNodes = postorder(tree, tree.nodes());
  ((postorderNodes = postorderNodes.slice(0, postorderNodes.length - 1)), postorderNodes.forEach((childId) => assignCutValue(tree, graph, childId)));
}
function exchangeEdges(tree, graph, leavingEdge, enteringEdge) {
  let leavingSource = leavingEdge.v,
    leavingTarget = leavingEdge.w;
  (tree.removeEdge(leavingSource, leavingTarget),
    tree.setEdge(enteringEdge.v, enteringEdge.w, {}),
    initLowLimValues(tree),
    initCutValues(tree, graph),
    updateRanks(tree, graph));
}
function isDescendant(treeGraph, ancestor, descendant) {
  return descendant.low <= ancestor.lim && ancestor.lim <= descendant.lim;
}
function enterEdge(tree, graph, leavingEdge) {
  let sourceId = leavingEdge.v,
    targetId = leavingEdge.w;
  graph.hasEdge(sourceId, targetId) || ((sourceId = leavingEdge.w), (targetId = leavingEdge.v));
  let sourceNode = tree.node(sourceId),
    targetNode = tree.node(targetId),
    subtreeRoot = sourceNode,
    sourceIsRoot = false;
  return (
    sourceNode.lim > targetNode.lim && ((subtreeRoot = targetNode), (sourceIsRoot = true)),
    graph
      .edges()
      .filter(
        (edge) =>
          sourceIsRoot === isDescendant(tree, tree.node(edge.v), subtreeRoot) && sourceIsRoot !== isDescendant(tree, tree.node(edge.w), subtreeRoot),
      )
      .reduce((currentBestEdge, candidateEdge) => (v$4(graph, candidateEdge) < v$4(graph, currentBestEdge) ? candidateEdge : currentBestEdge))
  );
}
networkSimplex.initLowLimValues = initLowLimValues;
networkSimplex.initCutValues = initCutValues;
networkSimplex.calcCutValue = calcCutValue;
networkSimplex.leaveEdge = leaveEdge;
networkSimplex.enterEdge = enterEdge;
networkSimplex.exchangeEdges = exchangeEdges;
function networkSimplex(graph) {
  ((graph = simplify(graph)), S(graph));
  let feasibleTree = V(graph);
  (initLowLimValues(feasibleTree), initCutValues(feasibleTree, graph));
  let leavingEdge, enteringEdge;
  for (; (leavingEdge = leaveEdge(feasibleTree));) ((enteringEdge = enterEdge(feasibleTree, graph, leavingEdge)), exchangeEdges(feasibleTree, graph, leavingEdge, enteringEdge));
}
var networkSimplexFn = networkSimplex;
export function qe(graph) {
  networkSimplexFn(graph);
}
