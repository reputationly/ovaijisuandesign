// w.js
import { T } from "./layout-category-lanes.js";
function partitionEntries(entries, predicate) {
  let partitions = {
    lhs: [],
    rhs: [],
  };
  return (
    entries.forEach((entry) => {
      predicate(entry) ? partitions.lhs.push(entry) : partitions.rhs.push(entry);
    }),
    partitions
  );
}
function barycenter(graph, movableNodes = []) {
  return movableNodes.map((nodeId) => {
    let incomingEdges = graph.inEdges(nodeId);
    if (!incomingEdges || !incomingEdges.length)
      return {
        v: nodeId,
      };
    {
      let weightedPosition = incomingEdges.reduce(
        (accumulated, edge) => {
          let edgeLabel = graph.edge(edge),
            sourceNode = graph.node(edge.v);
          return {
            sum: accumulated.sum + edgeLabel.weight * sourceNode.order,
            weight: accumulated.weight + edgeLabel.weight,
          };
        },
        {
          sum: 0,
          weight: 0,
        },
      );
      return {
        v: nodeId,
        barycenter: weightedPosition.sum / weightedPosition.weight,
        weight: weightedPosition.weight,
      };
    }
  });
}
function mergeEntries(targetEntry, sourceEntry) {
  let weightedSum = 0,
    totalWeight = 0;
  (targetEntry.weight && ((weightedSum += targetEntry.barycenter * targetEntry.weight), (totalWeight += targetEntry.weight)),
    sourceEntry.weight && ((weightedSum += sourceEntry.barycenter * sourceEntry.weight), (totalWeight += sourceEntry.weight)),
    (targetEntry.vs = sourceEntry.vs.concat(targetEntry.vs)),
    (targetEntry.barycenter = weightedSum / totalWeight),
    (targetEntry.weight = totalWeight),
    (targetEntry.i = Math.min(sourceEntry.i, targetEntry.i)),
    (sourceEntry.merged = true));
}
function doResolveConflicts(sourceSet) {
  let orderedEntries = [];
  function handleIncomingEntry(currentEntry) {
    return (incomingEntry) => {
      incomingEntry.merged ||
        ((incomingEntry.barycenter === void 0 ||
          currentEntry.barycenter === void 0 ||
          incomingEntry.barycenter >= currentEntry.barycenter) &&
          mergeEntries(currentEntry, incomingEntry));
    };
  }
  function handleOutgoingEntry(currentEntry) {
    return (outgoingEntry) => {
      (outgoingEntry.in.push(currentEntry), --outgoingEntry.indegree === 0 && sourceSet.push(outgoingEntry));
    };
  }
  for (; sourceSet.length;) {
    let currentEntry = sourceSet.pop();
    (orderedEntries.push(currentEntry), currentEntry.in.reverse().forEach(handleIncomingEntry(currentEntry)), currentEntry.out.forEach(handleOutgoingEntry(currentEntry)));
  }
  return orderedEntries
    .filter((entry) => !entry.merged)
    .map((entry) => T(entry, ["vs", "i", "barycenter", "weight"]));
}
function resolveConflicts(entries, constraintGraph) {
  let mappedEntries = {};
  (entries.forEach((entry, index) => {
    let mappedEntry = {
      indegree: 0,
      in: [],
      out: [],
      vs: [entry.v],
      i: index,
    };
    (entry.barycenter !== void 0 &&
      ((mappedEntry.barycenter = entry.barycenter), (mappedEntry.weight = entry.weight)),
      (mappedEntries[entry.v] = mappedEntry));
  }),
    constraintGraph.edges().forEach((edge) => {
      let sourceEntry = mappedEntries[edge.v],
        targetEntry = mappedEntries[edge.w];
      sourceEntry !== void 0 && targetEntry !== void 0 && (targetEntry.indegree++, sourceEntry.out.push(targetEntry));
    }));
  let sourceEntries = Object.values(mappedEntries).filter((entry) => !entry.indegree);
  return doResolveConflicts(sourceEntries);
}
function consumeUnsortable(orderedGroups, unsortableEntries, nextIndex) {
  let lastEntry;
  for (; unsortableEntries.length && (lastEntry = unsortableEntries[unsortableEntries.length - 1]).i <= nextIndex;)
    (unsortableEntries.pop(), orderedGroups.push(lastEntry.vs), nextIndex++);
  return nextIndex;
}
function compareBarycenter(reverseOrder) {
  return (entryA, entryB) =>
    entryA.barycenter < entryB.barycenter
      ? -1
      : entryA.barycenter > entryB.barycenter
        ? 1
        : reverseOrder
          ? entryB.i - entryA.i
          : entryA.i - entryB.i;
}
function sortEntries(entries, reverseOrder) {
  let partitions = partitionEntries(entries, (entry) => Object.hasOwn(entry, "barycenter")),
    sortableEntries = partitions.lhs,
    unsortableEntries = partitions.rhs.sort((left, right) => right.i - left.i),
    orderedGroups = [],
    weightedSum = 0,
    totalWeight = 0,
    nextIndex = 0;
  (sortableEntries.sort(compareBarycenter(!!reverseOrder)),
    (nextIndex = consumeUnsortable(orderedGroups, unsortableEntries, nextIndex)),
    sortableEntries.forEach((entry) => {
      ((nextIndex += entry.vs.length),
        orderedGroups.push(entry.vs),
        (weightedSum += entry.barycenter * entry.weight),
        (totalWeight += entry.weight),
        (nextIndex = consumeUnsortable(orderedGroups, unsortableEntries, nextIndex)));
    }));
  let result = {
    vs: orderedGroups.flat(1),
  };
  return (totalWeight && ((result.barycenter = weightedSum / totalWeight), (result.weight = totalWeight)), result);
}
function expandSubgraphs(entries, subgraphs) {
  entries.forEach((entry) => {
    entry.vs = entry.vs.flatMap((nodeId) => (subgraphs[nodeId] ? subgraphs[nodeId].vs : nodeId));
  });
}
function mergeBarycenters(target, other) {
  target.barycenter !== void 0
    ? ((target.barycenter =
        (target.barycenter * target.weight + other.barycenter * other.weight) /
        (target.weight + other.weight)),
      (target.weight += other.weight))
    : ((target.barycenter = other.barycenter), (target.weight = other.weight));
}
export function W(graph, parentId, constraintGraph, reverseOrder) {
  let children = graph.children(parentId),
    parentNode = graph.node(parentId),
    borderLeft = parentNode ? parentNode.borderLeft : void 0,
    borderRight = parentNode ? parentNode.borderRight : void 0,
    nestedResults = {};
  borderLeft && (children = children.filter((h2) => h2 !== borderLeft && h2 !== borderRight));
  let childBarycenters = barycenter(graph, children);
  childBarycenters.forEach((childEntry) => {
    if (graph.children(childEntry.v).length) {
      let childResult = W(graph, childEntry.v, constraintGraph, reverseOrder);
      ((nestedResults[childEntry.v] = childResult), Object.hasOwn(childResult, "barycenter") && mergeBarycenters(childEntry, childResult));
    }
  });
  let resolvedEntries = resolveConflicts(childBarycenters, constraintGraph);
  expandSubgraphs(resolvedEntries, nestedResults);
  let sortedResult = sortEntries(resolvedEntries, reverseOrder);
  if (borderLeft && borderRight) {
    sortedResult.vs = [borderLeft, sortedResult.vs, borderRight].flat(1);
    let predecessors = graph.predecessors(borderLeft);
    if (predecessors && predecessors.length) {
      let leftBorderPredecessor = graph.node(predecessors[0]),
        rightBorderPredecessors = graph.predecessors(borderRight),
        rightBorderPredecessor = graph.node(rightBorderPredecessors[0]);
      (Object.hasOwn(sortedResult, "barycenter") ||
        ((sortedResult.barycenter = 0), (sortedResult.weight = 0)),
        (sortedResult.barycenter =
          (sortedResult.barycenter * sortedResult.weight + leftBorderPredecessor.order + rightBorderPredecessor.order) / (sortedResult.weight + 2)),
        (sortedResult.weight += 2));
    }
  }
  return sortedResult;
}
