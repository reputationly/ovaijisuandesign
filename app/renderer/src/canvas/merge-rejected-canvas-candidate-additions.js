// merge-rejected-canvas-candidate-additions.js

export function mergeRejectedCanvasCandidateAdditions(
  lastGood,
  candidate,
  deletionReplay,
) {
  const replayedNodeIds = new Set(deletionReplay?.removedNodeIds ?? []);
  const replayedEdgeIds = new Set(deletionReplay?.removedEdgeIds ?? []);
  const durableNodes = lastGood.nodes.filter(
    (node2) => !replayedNodeIds.has(node2.id),
  );
  const durableNodeIds = new Set(durableNodes.map((node2) => node2.id));
  const durableEdges = lastGood.edges.filter(
    (edge) =>
      !replayedEdgeIds.has(edge.id) &&
      durableNodeIds.has(edge.source) &&
      durableNodeIds.has(edge.target),
  );
  const candidateNodeById = new Map();
  for (const node2 of candidate.nodes) {
    if (
      !node2.id ||
      replayedNodeIds.has(node2.id) ||
      durableNodeIds.has(node2.id) ||
      candidateNodeById.has(node2.id)
    ) {
      continue;
    }
    candidateNodeById.set(node2.id, node2);
  }
  const validCandidateNodeIds = new Set();
  const invalidCandidateNodeIds = new Set();
  for (const startId of candidateNodeById.keys()) {
    if (
      validCandidateNodeIds.has(startId) ||
      invalidCandidateNodeIds.has(startId)
    )
      continue;
    const path2 = [];
    const pathIndexes = new Map();
    let currentId = startId;
    let valid2 = false;
    while (currentId) {
      if (
        durableNodeIds.has(currentId) ||
        validCandidateNodeIds.has(currentId)
      ) {
        valid2 = true;
        break;
      }
      if (invalidCandidateNodeIds.has(currentId) || pathIndexes.has(currentId))
        break;
      const current2 = candidateNodeById.get(currentId);
      if (!current2) break;
      pathIndexes.set(currentId, path2.length);
      path2.push(currentId);
      if (!current2.parentId) {
        valid2 = true;
        break;
      }
      currentId = current2.parentId;
    }
    const destination = valid2
      ? validCandidateNodeIds
      : invalidCandidateNodeIds;
    for (const nodeId of path2) destination.add(nodeId);
  }
  const candidateAdditions = [...candidateNodeById.values()].filter((node2) =>
    validCandidateNodeIds.has(node2.id),
  );
  const finalNodeIds = new Set([...durableNodeIds, ...validCandidateNodeIds]);
  const durableEdgeIds = new Set(durableEdges.map((edge) => edge.id));
  const admittedEdgeIds = new Set(durableEdgeIds);
  const candidateEdges = candidate.edges.filter((edge) => {
    if (
      !edge.id ||
      replayedEdgeIds.has(edge.id) ||
      admittedEdgeIds.has(edge.id) ||
      !finalNodeIds.has(edge.source) ||
      !finalNodeIds.has(edge.target)
    ) {
      return false;
    }
    admittedEdgeIds.add(edge.id);
    return true;
  });
  return {
    canvas: {
      ...lastGood,
      nodes: [...durableNodes, ...candidateAdditions],
      edges: [...durableEdges, ...candidateEdges],
    },
    preservedNodeCount: candidateAdditions.length,
    preservedEdgeCount: candidateEdges.length,
    replayedNodeCount: lastGood.nodes.length - durableNodes.length,
    replayedEdgeCount: lastGood.edges.length - durableEdges.length,
  };
}
