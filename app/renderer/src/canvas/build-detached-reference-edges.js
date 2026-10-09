// build-detached-reference-edges.js
import { resolveGroupMainId } from "./ungroup-in-canvas.js";
import { deriveEdgeId } from "./find-free-position-from-anchor.js";

const GENERATION_REFERENCE_DATA_KEYS = [
  "referenceImageIds",
  "referenceAudioIds",
  "referenceVideoIds",
  "referenceTextIds",
];

function nodeDataRecord(node2) {
  return node2?.data ?? {};
}

function nodeReferenceIds(node2, resolveReferenceIds) {
  if (!node2) return [];
  const data2 = nodeDataRecord(node2);
  const ids2 = [];
  for (const key2 of GENERATION_REFERENCE_DATA_KEYS) {
    const value = data2[key2];
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (typeof item === "string" && item.length > 0 && !ids2.includes(item))
        ids2.push(item);
    }
  }
  if (ids2.length > 0) return ids2;
  for (const item of resolveReferenceIds?.(node2.id) ?? []) {
    if (typeof item === "string" && item.length > 0 && !ids2.includes(item))
      ids2.push(item);
  }
  return ids2;
}

function nodeMatchesReference(node2, referenceId) {
  if (!node2) return false;
  if (node2.id === referenceId || node2.assetId === referenceId) return true;
  return nodeDataRecord(node2).assetId === referenceId;
}

function buildDetachedReferenceEdges(
  previousNodes,
  previousEdges,
  nextNodes,
  detachedIds,
  resolveReferenceIds,
) {
  if (detachedIds.length === 0) return [];
  const byId = new Map(previousNodes.map((node2) => [node2.id, node2]));
  const sourceNodes = [
    ...previousNodes,
    ...nextNodes.filter((node2) => !byId.has(node2.id)),
  ];
  const additions = [];
  const seen2 = new Set();
  for (const targetId of detachedIds) {
    const oldTarget = byId.get(targetId);
    const nextTarget = nextNodes.find((node2) => node2.id === targetId);
    if (!oldTarget || !nextTarget) continue;
    const oldMainId = resolveGroupMainId(previousNodes, targetId);
    const oldMain = byId.get(oldMainId);
    const ownReferenceIds = [
      ...nodeReferenceIds(nextTarget, resolveReferenceIds),
      ...nodeReferenceIds(oldTarget, resolveReferenceIds),
    ];
    const referenceIds =
      ownReferenceIds.length > 0
        ? ownReferenceIds
        : nodeReferenceIds(oldMain, resolveReferenceIds);
    const incoming = previousEdges.filter(
      (edge) =>
        edge.type === "derivation" &&
        (edge.target === oldMainId || edge.target === targetId) &&
        edge.source !== targetId,
    );
    const sourceIds = new Set();
    for (const referenceId of referenceIds) {
      const incomingSource = incoming.find(
        (edge) =>
          edge.source === referenceId ||
          nodeMatchesReference(byId.get(edge.source), referenceId),
      )?.source;
      const source = incomingSource
        ? byId.get(incomingSource)
        : sourceNodes.find((node2) => nodeMatchesReference(node2, referenceId));
      if (source && source.id !== targetId) sourceIds.add(source.id);
    }
    if (referenceIds.length === 0) {
      for (const edge of incoming) sourceIds.add(edge.source);
    }
    for (const sourceId of sourceIds) {
      if (sourceId === targetId) continue;
      const template = incoming.find((edge) => edge.source === sourceId);
      const id2 = deriveEdgeId(sourceId, targetId);
      if (seen2.has(id2)) continue;
      seen2.add(id2);
      additions.push({
        ...(template ?? {}),
        id: id2,
        source: sourceId,
        target: targetId,
        type: "derivation",
      });
    }
  }
  return additions;
}

function buildDetachedReferenceEdgesForMutation(
  previousNodes,
  previousEdges,
  nextNodes,
  resolveReferenceIds,
) {
  const detachedIds = nextNodes
    .filter((node2) => {
      const previous2 = previousNodes.find(
        (candidate) => candidate.id === node2.id,
      );
      return !!previous2?.groupId && !node2.groupId;
    })
    .map((node2) => node2.id);
  return buildDetachedReferenceEdges(
    previousNodes,
    previousEdges,
    nextNodes,
    detachedIds,
    resolveReferenceIds,
  );
}

function mergeDetachedReferenceEdges(edges, additions) {
  if (additions.length === 0) return [...edges];
  const seenIds = new Set(edges.map((edge) => edge.id));
  const seenEndpoints = new Set(
    edges.map((edge) => `${edge.source}->${edge.target}`),
  );
  const next2 = [...edges];
  for (const edge of additions) {
    const endpoint = `${edge.source}->${edge.target}`;
    if (seenIds.has(edge.id) || seenEndpoints.has(endpoint)) continue;
    seenIds.add(edge.id);
    seenEndpoints.add(endpoint);
    next2.push(edge);
  }
  return next2;
}

export function applyDetachedReferenceEdges(
  draft,
  previousGraph,
  nextNodes,
  resolveReferenceIds,
) {
  const additions = buildDetachedReferenceEdgesForMutation(
    previousGraph.nodes,
    previousGraph.edges,
    nextNodes,
    resolveReferenceIds,
  );
  draft.edges = mergeDetachedReferenceEdges(draft.edges, additions);
}
