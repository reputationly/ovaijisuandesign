// it.js
import { p$4 as Graph } from "../vendor.js";
function sep(nodeSep, edgeSep, reverseSep) {
  return (graph, v, w) => {
    let vLabel = graph.node(v),
      wLabel = graph.node(w),
      sum = 0,
      delta;
    if (((sum += vLabel.width / 2), Object.hasOwn(vLabel, "labelpos")))
      switch (vLabel.labelpos.toLowerCase()) {
        case "l":
          delta = -vLabel.width / 2;
          break;
        case "r":
          delta = vLabel.width / 2;
          break;
      }
    if (
      (delta && (sum += reverseSep ? delta : -delta),
      (delta = void 0),
      (sum += (vLabel.dummy ? edgeSep : nodeSep) / 2),
      (sum += (wLabel.dummy ? edgeSep : nodeSep) / 2),
      (sum += wLabel.width / 2),
      Object.hasOwn(wLabel, "labelpos"))
    )
      switch (wLabel.labelpos.toLowerCase()) {
        case "l":
          delta = wLabel.width / 2;
          break;
        case "r":
          delta = -wLabel.width / 2;
          break;
      }
    return (delta && (sum += reverseSep ? delta : -delta), sum);
  };
}
function buildBlockGraph(graph, layering, root, reverseSep) {
  let blockGraph = new Graph(),
    graphLabel = graph.graph(),
    separation = sep(graphLabel.nodesep, graphLabel.edgesep, reverseSep);
  return (
    layering.forEach((layer) => {
      let previousNode;
      layer.forEach((node) => {
        let blockNode = root[node];
        if (blockNode !== void 0) {
          if ((blockGraph.setNode(blockNode), previousNode !== void 0)) {
            let previousBlockNode = root[previousNode];
            if (previousBlockNode !== void 0) {
              let previousEdgeWeight = blockGraph.edge(previousBlockNode, blockNode);
              blockGraph.setEdge(previousBlockNode, blockNode, Math.max(separation(graph, node, previousNode), previousEdgeWeight || 0));
            }
          }
          previousNode = node;
        }
      });
    }),
    blockGraph
  );
}
export function It(graph, layering, root, align, reverseSep = false) {
  let xs = {},
    blockGraph = buildBlockGraph(graph, layering, root, reverseSep),
    borderType = reverseSep ? "borderLeft" : "borderRight";
  function iterateBlocks(setCoordinate, getNextBlocks) {
    let blockStack = blockGraph.nodes().slice(),
      visitedBlocks = {},
      currentBlock = blockStack.pop();
    for (; currentBlock;) {
      if (visitedBlocks[currentBlock]) setCoordinate(currentBlock);
      else {
        ((visitedBlocks[currentBlock] = true), blockStack.push(currentBlock));
        for (let nextBlock of getNextBlocks(currentBlock)) blockStack.push(nextBlock);
      }
      currentBlock = blockStack.pop();
    }
  }
  function assignMinimumX(block) {
    let incomingEdges = blockGraph.inEdges(block);
    incomingEdges
      ? (xs[block] = incomingEdges.reduce((minimumX, edge) => {
          var sourceXValue;
          let sourceX = (sourceXValue = xs[edge.v]) != null ? sourceXValue : 0,
            edgeWeight = blockGraph.edge(edge);
          return Math.max(minimumX, sourceX + (edgeWeight !== void 0 ? edgeWeight : 0));
        }, 0))
      : (xs[block] = 0);
  }
  function assignMaximumX(block) {
    let outgoingEdges = blockGraph.outEdges(block),
      minimumSuccessorX = Number.POSITIVE_INFINITY;
    outgoingEdges &&
      (minimumSuccessorX = outgoingEdges.reduce((minimumX, successorEdge) => {
        let successorX = xs[successorEdge.w],
          edgeWeight = blockGraph.edge(successorEdge);
        return Math.min(
          minimumX,
          (successorX !== void 0 ? successorX : 0) - (edgeWeight !== void 0 ? edgeWeight : 0),
        );
      }, Number.POSITIVE_INFINITY));
    let node = graph.node(block);
    minimumSuccessorX !== Number.POSITIVE_INFINITY &&
      node.borderType !== borderType &&
      (xs[block] = Math.max(xs[block] !== void 0 ? xs[block] : 0, minimumSuccessorX));
  }
  function predecessorsWrapper(block) {
    return blockGraph.predecessors(block) || [];
  }
  function successorsWrapper(block) {
    return blockGraph.successors(block) || [];
  }
  return (
    iterateBlocks(assignMinimumX, predecessorsWrapper),
    iterateBlocks(assignMaximumX, successorsWrapper),
    Object.keys(align).forEach((nodeId) => {
      var rootX;
      let rootId = root[nodeId];
      rootId !== void 0 && (xs[nodeId] = (rootX = xs[rootId]) != null ? rootX : 0);
    }),
    xs
  );
}
