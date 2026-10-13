// get-alignment-reference-ids.js
import { createStore$1 as createStore } from "../vendor.js";
export const DEFAULT_BUFFER_RATIO = 1.5;
export const MIN_EDGES_TO_CULL = 32;
export function applyEdgeCullingVisibility(edges, hiddenIds) {
  if (hiddenIds.size === 0) return edges;
  let dirty = false;
  const updatedEdges = new Array(edges.length);
  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
    const edge = edges[edgeIndex];
    const wantHidden = Boolean(edge.hidden) || hiddenIds.has(edge.id);
    if (Boolean(edge.hidden) === wantHidden) {
      updatedEdges[edgeIndex] = edge;
      continue;
    }
    updatedEdges[edgeIndex] = {
      ...edge,
      hidden: wantHidden,
    };
    dirty = true;
  }
  return dirty ? updatedEdges : edges;
}
export function computeHiddenEdgeIds(state2, edges, bufferRatio) {
  const hidden = new Set();
  const [tx, ty, zoom2] = state2.transform;
  if (!zoom2 || zoom2 <= 0) return hidden;
  const vLeft = -tx / zoom2;
  const vTop = -ty / zoom2;
  const vWidth = state2.width / zoom2;
  const vHeight = state2.height / zoom2;
  const vRight = vLeft + vWidth;
  const vBottom = vTop + vHeight;
  const bufW = vWidth * Math.max(0, bufferRatio - 1) * 0.5;
  const bufH = vHeight * Math.max(0, bufferRatio - 1) * 0.5;
  const bLeft = vLeft - bufW;
  const bTop = vTop - bufH;
  const bRight = vRight + bufW;
  const bBottom = vBottom + bufH;
  for (const edge of edges) {
    const sourceNode = state2.nodeLookup.get(edge.source);
    const targetNode = state2.nodeLookup.get(edge.target);
    if (!sourceNode || !targetNode) continue;
    const srcPos = sourceNode.internals?.positionAbsolute ?? sourceNode.position;
    const tgtPos = targetNode.internals?.positionAbsolute ?? targetNode.position;
    if (!srcPos || !tgtPos) continue;
    const srcW = sourceNode.measured?.width ?? sourceNode.width ?? 0;
    const srcH = sourceNode.measured?.height ?? sourceNode.height ?? 0;
    const tgtW = targetNode.measured?.width ?? targetNode.width ?? 0;
    const tgtH = targetNode.measured?.height ?? targetNode.height ?? 0;
    const eLeft = Math.min(srcPos.x, tgtPos.x);
    const eTop = Math.min(srcPos.y, tgtPos.y);
    const eRight = Math.max(srcPos.x + srcW, tgtPos.x + tgtW);
    const eBottom = Math.max(srcPos.y + srcH, tgtPos.y + tgtH);
    const intersects2 = !(
      eRight < bLeft ||
      eLeft > bRight ||
      eBottom < bTop ||
      eTop > bBottom
    );
    if (!intersects2) hidden.add(edge.id);
  }
  return hidden;
}
export function sameMembership(leftSet, rightSet) {
  if (leftSet === rightSet) return true;
  if (leftSet.size !== rightSet.size) return false;
  for (const nodeId of leftSet) {
    if (!rightSet.has(nodeId)) return false;
  }
  return true;
}
export const MIDDLE_DRAG_CLASS = "hilo-canvas-middle-pan";
export const STYLE_ELEMENT_ID = "hilo-middle-pan-style";
function ancestors(node2, byId) {
  const result = [];
  const seen2 = new Set([node2.id]);
  let parentId = node2.parentId;
  while (parentId && !seen2.has(parentId)) {
    seen2.add(parentId);
    result.push(parentId);
    parentId = byId.get(parentId)?.parentId;
  }
  return result;
}
export function getAlignmentReferenceIds(nodes, draggedIds) {
  const byId = new Map(nodes.map((node2) => [node2.id, node2]));
  const dragged = new Set(draggedIds);
  const chains = new Map(
    nodes.map((node2) => [node2.id, ancestors(node2, byId)]),
  );
  const roots = nodes.filter(
    (node2) =>
      dragged.has(node2.id) &&
      !chains.get(node2.id)?.some((ancestorId) => dragged.has(ancestorId)),
  );
  if (roots.length === 0 || roots.some((node2) => node2.collapsed)) return [];
  const scopes = [...(chains.get(roots[0].id) ?? []), void 0];
  const scope = scopes.find((scopeId) =>
    roots.every(
      (node2) => scopeId === void 0 || chains.get(node2.id)?.includes(scopeId),
    ),
  );
  const movingAncestors = new Set(
    roots.flatMap((node2) => chains.get(node2.id) ?? []),
  );
  const affected = new Set(
    nodes
      .filter(
        (node2) =>
          dragged.has(node2.id) ||
          chains.get(node2.id)?.some((ancestorId) => dragged.has(ancestorId)),
      )
      .map((node2) => node2.id),
  );
  return nodes
    .filter((node2) => {
      if (
        node2.parentId !== scope ||
        affected.has(node2.id) ||
        movingAncestors.has(node2.id)
      ) {
        return false;
      }
      if (
        node2.hidden ||
        node2.collapsed ||
        chains.get(node2.id)?.some((ancestorId) => byId.get(ancestorId)?.hidden)
      )
        return false;
      if (
        node2.type === "sticker" &&
        affected.has(String(node2.data?.targetId ?? ""))
      )
        return false;
      return true;
    })
    .map((node2) => node2.id);
}
export function intersectsViewport(firstRect, secondRect) {
  return (
    firstRect.width > 0 &&
    firstRect.height > 0 &&
    secondRect.width > 0 &&
    secondRect.height > 0 &&
    firstRect.x < secondRect.x + secondRect.width &&
    firstRect.x + firstRect.width > secondRect.x &&
    firstRect.y < secondRect.y + secondRect.height &&
    firstRect.y + firstRect.height > secondRect.y
  );
}
export const EMPTY_GUIDES = [];
export function createAlignmentGuidesStore() {
  return createStore(() => ({
    guides: EMPTY_GUIDES,
    transform: [0, 0, 1],
  }));
}
