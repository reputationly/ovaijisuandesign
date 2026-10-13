// ot.js

var MAX_CHUNK_SIZE = 65535;
function chunkArguments(values, chunkSize = MAX_CHUNK_SIZE) {
  let chunks = [];
  for (let offset = 0; offset < values.length; offset += chunkSize) {
    let chunk = values.slice(offset, offset + chunkSize);
    chunks.push(chunk);
  }
  return chunks;
}
export function L(fn, values) {
  if (values.length > MAX_CHUNK_SIZE) {
    let chunks = chunkArguments(values);
    return fn(...chunks.map((chunk) => fn(...chunk)));
  } else return fn(...values);
}
function zipObject(keys, values) {
  return keys.reduce((result, key, index) => ((result[key] = values[index]), result), {});
}
export function dt(tree, nodeLowLim, sourceId, targetId) {
  let pathToRoot = [],
    pathFromRoot = [],
    lowerLim = Math.min(nodeLowLim[sourceId].low, nodeLowLim[targetId].low),
    upperLim = Math.max(nodeLowLim[sourceId].lim, nodeLowLim[targetId].lim),
    currentNode;
  currentNode = sourceId;
  do ((currentNode = tree.parent(currentNode)), pathToRoot.push(currentNode));
  while (currentNode && (nodeLowLim[currentNode].low > lowerLim || upperLim > nodeLowLim[currentNode].lim));
  let lowestCommonAncestor = currentNode,
    nodeId = targetId;
  for (; (nodeId = tree.parent(nodeId)) !== lowestCommonAncestor;) pathFromRoot.push(nodeId);
  return {
    path: pathToRoot.concat(pathFromRoot.reverse()),
    lca: lowestCommonAncestor,
  };
}
export function en(dimensions) {
  let width = dimensions.width;
  ((dimensions.width = dimensions.height), (dimensions.height = width));
}
export function ne(point) {
  point.y = -point.y;
}
export function te(point) {
  let x = point.x;
  ((point.x = point.y), (point.y = x));
}
export function mt(graph, upperLayer, lowerLayer) {
  let orderByNodeId = zipObject(
      lowerLayer,
      lowerLayer.map((nodeId, index) => index),
    ),
    edgeCandidates = upperLayer.flatMap((nodeId) => {
      let outgoingEdges = graph.outEdges(nodeId);
      return outgoingEdges
        ? outgoingEdges
            .map((edge) => ({
              pos: orderByNodeId[edge.w],
              weight: graph.edge(edge).weight,
            }))
            .sort((left, right) => left.pos - right.pos)
        : [];
    }),
    leafOffset = 1;
  for (; leafOffset < lowerLayer.length;) leafOffset <<= 1;
  let segmentTreeSize = 2 * leafOffset - 1;
  leafOffset -= 1;
  let crossingWeights = new Array(segmentTreeSize).fill(0),
    crossingCount = 0;
  return (
    edgeCandidates.forEach((edgeCandidate) => {
      let leafIndex = edgeCandidate.pos + leafOffset;
      crossingWeights[leafIndex] += edgeCandidate.weight;
      let crossingsBefore = 0;
      for (; leafIndex > 0;)
        (leafIndex % 2 && (crossingsBefore += crossingWeights[leafIndex + 1]),
          (leafIndex = (leafIndex - 1) >> 1),
          (crossingWeights[leafIndex] += edgeCandidate.weight));
      crossingCount += edgeCandidate.weight * crossingsBefore;
    }),
    crossingCount
  );
}
export function le(graph, constraintGraph, nodeIds) {
  let nodeByAncestor = {},
    previousTopLevelNode;
  nodeIds.forEach((nodeId) => {
    let parentId = graph.parent(nodeId),
      grandparentId,
      previousNode;
    for (; parentId;) {
      if (
        ((grandparentId = graph.parent(parentId)),
        grandparentId ? ((previousNode = nodeByAncestor[grandparentId]), (nodeByAncestor[grandparentId] = parentId)) : ((previousNode = previousTopLevelNode), (previousTopLevelNode = parentId)),
        previousNode && previousNode !== parentId)
      ) {
        constraintGraph.setEdge(previousNode, parentId);
        return;
      }
      parentId = grandparentId;
    }
  });
}
function xt(graph, nodeId) {
  if (graph.node(nodeId).dummy) {
    let predecessorIds = graph.predecessors(nodeId);
    if (predecessorIds) return predecessorIds.find((predecessorId) => graph.node(predecessorId).dummy);
  }
}
export function dn(conflictMap, firstNode, secondNode) {
  if (firstNode > secondNode) {
    let originalFirstNode = firstNode;
    ((firstNode = secondNode), (secondNode = originalFirstNode));
  }
  let conflictsByFirstNode = conflictMap[firstNode];
  (conflictsByFirstNode || (conflictMap[firstNode] = conflictsByFirstNode = {}), (conflictsByFirstNode[secondNode] = true));
}
export function vt(graph, layers) {
  let conflictMap = {};
  function findLayerConflicts(upperLayer, currentLayer) {
    let previousOrder = 0,
      layerStart = 0,
      previousLayerEnd = upperLayer.length,
      previousInnerSegment = currentLayer[currentLayer.length - 1];
    return (
      currentLayer.forEach((nodeId, order) => {
        let innerSegmentNode = xt(graph, nodeId),
          boundaryOrder = innerSegmentNode ? graph.node(innerSegmentNode).order : previousLayerEnd;
        (innerSegmentNode || nodeId === previousInnerSegment) &&
          (currentLayer.slice(layerStart, order + 1).forEach((currentNodeId) => {
            let predecessorIds = graph.predecessors(currentNodeId);
            predecessorIds &&
              predecessorIds.forEach((predecessorId) => {
                let predecessorNode = graph.node(predecessorId),
                  predecessorOrder = predecessorNode.order;
                (predecessorOrder < previousOrder || boundaryOrder < predecessorOrder) &&
                  !(predecessorNode.dummy && graph.node(currentNodeId).dummy) &&
                  dn(conflictMap, predecessorId, currentNodeId);
              });
          }),
          (layerStart = order + 1),
          (previousOrder = boundaryOrder));
      }),
      currentLayer
    );
  }
  return (layers.length && layers.reduce(findLayerConflicts), conflictMap);
}
function hasConflict(conflictMap, firstNode, secondNode) {
  if (firstNode > secondNode) {
    let originalFirstNode = firstNode;
    ((firstNode = secondNode), (secondNode = originalFirstNode));
  }
  let conflictsByFirstNode = conflictMap[firstNode];
  return conflictsByFirstNode !== void 0 && Object.hasOwn(conflictsByFirstNode, secondNode);
}
export function Ot(graph, layers, constraintGraph, predecessorIds) {
  let rootByNode = {},
    alignmentByNode = {},
    positionByNode = {};
  return (
    layers.forEach((layer) => {
      layer.forEach((nodeId, order) => {
        ((rootByNode[nodeId] = nodeId), (alignmentByNode[nodeId] = nodeId), (positionByNode[nodeId] = order));
      });
    }),
    layers.forEach((layer) => {
      let previousAlignedOrder = -1;
      layer.forEach((nodeId) => {
        let predecessorCandidates = predecessorIds(nodeId);
        if (predecessorCandidates && predecessorCandidates.length) {
          let sortedPredecessors = predecessorCandidates.sort((left, right) => {
              let leftOrder = positionByNode[left],
                rightOrder = positionByNode[right];
              return (leftOrder !== void 0 ? leftOrder : 0) - (rightOrder !== void 0 ? rightOrder : 0);
            }),
            medianIndex = (sortedPredecessors.length - 1) / 2;
          for (let index = Math.floor(medianIndex), upperMedianIndex = Math.ceil(medianIndex); index <= upperMedianIndex; ++index) {
            let predecessorId = sortedPredecessors[index];
            if (predecessorId === void 0) continue;
            let predecessorOrder = positionByNode[predecessorId];
            if (predecessorOrder !== void 0 && alignmentByNode[nodeId] === nodeId && previousAlignedOrder < predecessorOrder && !hasConflict(constraintGraph, nodeId, predecessorId)) {
              let rootId = rootByNode[predecessorId];
              rootId !== void 0 &&
                ((alignmentByNode[predecessorId] = nodeId), (alignmentByNode[nodeId] = rootByNode[nodeId] = rootId), (previousAlignedOrder = predecessorOrder));
            }
          }
        }
      });
    }),
    {
      root: rootByNode,
      align: alignmentByNode,
    }
  );
}
function getNodeWidth(graph, nodeId) {
  return graph.node(nodeId).width;
}
export function Rt(graph, alignments) {
  return Object.values(alignments).reduce(
    (bestWidthAndAlignment, alignment) => {
      let rightmost = Number.NEGATIVE_INFINITY,
        leftmost = Number.POSITIVE_INFINITY;
      Object.entries(alignment).forEach(([nodeId, position]) => {
        let halfNodeWidth = getNodeWidth(graph, nodeId) / 2;
        ((rightmost = Math.max(position + halfNodeWidth, rightmost)), (leftmost = Math.min(position - halfNodeWidth, leftmost)));
      });
      let width = rightmost - leftmost;
      return (width < bestWidthAndAlignment[0] && (bestWidthAndAlignment = [width, alignment]), bestWidthAndAlignment);
    },
    [Number.POSITIVE_INFINITY, null],
  )[1];
}
