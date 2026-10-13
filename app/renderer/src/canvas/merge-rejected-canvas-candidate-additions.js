// merge-rejected-canvas-candidate-additions.js

export function mergeRejectedCanvasCandidateAdditions(
  lastGood,
  candidate,
  deletionReplay,
) {
  const replayedNodeIds = new Set(deletionReplay?.removedNodeIds ?? []);
  const replayedEdgeIds = new Set(deletionReplay?.removedEdgeIds ?? []);
  const durableNodes = lastGood.nodes.filter(
    (node) => !replayedNodeIds.has(node.id),
  );
  const durableNodeIds = new Set(durableNodes.map((node) => node.id));
  const durableEdges = lastGood.edges.filter(
    (edge) =>
      !replayedEdgeIds.has(edge.id) &&
      durableNodeIds.has(edge.source) &&
      durableNodeIds.has(edge.target),
  );
  const candidateNodeById = new Map();
  for (const node of candidate.nodes) {
    if (
      !node.id ||
      replayedNodeIds.has(node.id) ||
      durableNodeIds.has(node.id) ||
      candidateNodeById.has(node.id)
    ) {
      continue;
    }
    candidateNodeById.set(node.id, node);
  }
  const validCandidateNodeIds = new Set();
  const invalidCandidateNodeIds = new Set();
  for (const startId of candidateNodeById.keys()) {
    if (
      validCandidateNodeIds.has(startId) ||
      invalidCandidateNodeIds.has(startId)
    )
      continue;
    const path = [];
    const pathIndexes = new Map();
    let currentId = startId;
    let valid = false;
    while (currentId) {
      if (
        durableNodeIds.has(currentId) ||
        validCandidateNodeIds.has(currentId)
      ) {
        valid = true;
        break;
      }
      if (invalidCandidateNodeIds.has(currentId) || pathIndexes.has(currentId))
        break;
      const current = candidateNodeById.get(currentId);
      if (!current) break;
      pathIndexes.set(currentId, path.length);
      path.push(currentId);
      if (!current.parentId) {
        valid = true;
        break;
      }
      currentId = current.parentId;
    }
    const destination = valid
      ? validCandidateNodeIds
      : invalidCandidateNodeIds;
    for (const nodeId of path) destination.add(nodeId);
  }
  const candidateAdditions = [...candidateNodeById.values()].filter((node) =>
    validCandidateNodeIds.has(node.id),
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
