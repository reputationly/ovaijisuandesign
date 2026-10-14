// build-detached-reference-edges.js
import { resolveGroupMainId } from "./ungroup-in-canvas.js";
import { deriveEdgeId } from "./find-free-position-from-anchor.js";

const GENERATION_REFERENCE_DATA_KEYS = [
  "referenceImageIds",
  "referenceAudioIds",
  "referenceVideoIds",
  "referenceTextIds",
];

function nodeDataRecord(node) {
  return node?.data ?? {};
}

function nodeReferenceIds(node, resolveReferenceIds) {
  if (!node) return [];
  const data = nodeDataRecord(node);
  const ids = [];
  for (const key of GENERATION_REFERENCE_DATA_KEYS) {
    const value = data[key];
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (typeof item === "string" && item.length > 0 && !ids.includes(item))
        ids.push(item);
    }
  }
  if (ids.length > 0) return ids;
  for (const item of resolveReferenceIds?.(node.id) ?? []) {
    if (typeof item === "string" && item.length > 0 && !ids.includes(item))
      ids.push(item);
  }
  return ids;
}

function nodeMatchesReference(node, referenceId) {
  if (!node) return false;
  if (node.id === referenceId || node.assetId === referenceId) return true;
  return nodeDataRecord(node).assetId === referenceId;
}

function buildDetachedReferenceEdges(
  previousNodes,
  previousEdges,
  nextNodes,
  detachedIds,
  resolveReferenceIds,
) {
  if (detachedIds.length === 0) return [];
  const byId = new Map(previousNodes.map((node) => [node.id, node]));
  const sourceNodes = [
    ...previousNodes,
    ...nextNodes.filter((node) => !byId.has(node.id)),
  ];
  const additions = [];
  const seen = new Set();
  for (const targetId of detachedIds) {
    const oldTarget = byId.get(targetId);
    const nextTarget = nextNodes.find((node) => node.id === targetId);
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
        : sourceNodes.find((node) => nodeMatchesReference(node, referenceId));
      if (source && source.id !== targetId) sourceIds.add(source.id);
    }
    if (referenceIds.length === 0) {
      for (const edge of incoming) sourceIds.add(edge.source);
    }
    for (const sourceId of sourceIds) {
      if (sourceId === targetId) continue;
      const template = incoming.find((edge) => edge.source === sourceId);
      const id = deriveEdgeId(sourceId, targetId);
      if (seen.has(id)) continue;
      seen.add(id);
      additions.push({
        ...(template ?? {}),
        id,
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
    .filter((node) => {
      const previous = previousNodes.find(
        (candidate) => candidate.id === node.id,
      );
      return !!previous?.groupId && !node.groupId;
    })
    .map((node) => node.id);
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
  const next = [...edges];
  for (const edge of additions) {
    const endpoint = `${edge.source}->${edge.target}`;
    if (seenIds.has(edge.id) || seenEndpoints.has(endpoint)) continue;
    seenIds.add(edge.id);
    seenEndpoints.add(endpoint);
    next.push(edge);
  }
  return next;
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
