// get-alignment-reference-ids.js
import { createStore$1 as createStore } from "../vendor.js";
export const DEFAULT_BUFFER_RATIO = 1.5;
export const MIN_EDGES_TO_CULL = 32;
export function applyEdgeCullingVisibility(edges, hiddenIds) {
  if (hiddenIds.size === 0) return edges;
  let dirty = false;
  const out = new Array(edges.length);
  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
    const edge = edges[edgeIndex];
    const wantHidden = Boolean(edge.hidden) || hiddenIds.has(edge.id);
    if (Boolean(edge.hidden) === wantHidden) {
      out[edgeIndex] = edge;
      continue;
    }
    out[edgeIndex] = {
      ...edge,
      hidden: wantHidden,
    };
    dirty = true;
  }
  return dirty ? out : edges;
}
export function computeHiddenEdgeIds(state, edges, bufferRatio) {
  const hidden = new Set();
  const [tx, ty, zoom] = state.transform;
  if (!zoom || zoom <= 0) return hidden;
  const vLeft = -tx / zoom;
  const vTop = -ty / zoom;
  const vWidth = state.width / zoom;
  const vHeight = state.height / zoom;
  const vRight = vLeft + vWidth;
  const vBottom = vTop + vHeight;
  const bufW = vWidth * Math.max(0, bufferRatio - 1) * 0.5;
  const bufH = vHeight * Math.max(0, bufferRatio - 1) * 0.5;
  const bLeft = vLeft - bufW;
  const bTop = vTop - bufH;
  const bRight = vRight + bufW;
  const bBottom = vBottom + bufH;
  for (const edge of edges) {
    const src = state.nodeLookup.get(edge.source);
    const tgt = state.nodeLookup.get(edge.target);
    if (!src || !tgt) continue;
    const srcPos = src.internals?.positionAbsolute ?? src.position;
    const tgtPos = tgt.internals?.positionAbsolute ?? tgt.position;
    if (!srcPos || !tgtPos) continue;
    const srcW = src.measured?.width ?? src.width ?? 0;
    const srcH = src.measured?.height ?? src.height ?? 0;
    const tgtW = tgt.measured?.width ?? tgt.width ?? 0;
    const tgtH = tgt.measured?.height ?? tgt.height ?? 0;
    const eLeft = Math.min(srcPos.x, tgtPos.x);
    const eTop = Math.min(srcPos.y, tgtPos.y);
    const eRight = Math.max(srcPos.x + srcW, tgtPos.x + tgtW);
    const eBottom = Math.max(srcPos.y + srcH, tgtPos.y + tgtH);
    const intersects = !(
      eRight < bLeft ||
      eLeft > bRight ||
      eBottom < bTop ||
      eTop > bBottom
    );
    if (!intersects) hidden.add(edge.id);
  }
  return hidden;
}
export function sameMembership(leftSet, rightSet) {
  if (leftSet === rightSet) return true;
  if (leftSet.size !== rightSet.size) return false;
  for (const id of leftSet) {
    if (!rightSet.has(id)) return false;
  }
  return true;
}
export const MIDDLE_DRAG_CLASS = "hilo-canvas-middle-pan";
export const STYLE_ELEMENT_ID = "hilo-middle-pan-style";
function ancestors(node, byId) {
  const result = [];
  const seen = new Set([node.id]);
  let parentId = node.parentId;
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    result.push(parentId);
    parentId = byId.get(parentId)?.parentId;
  }
  return result;
}
export function getAlignmentReferenceIds(nodes, draggedIds) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const dragged = new Set(draggedIds);
  const chains = new Map(
    nodes.map((node) => [node.id, ancestors(node, byId)]),
  );
  const roots = nodes.filter(
    (node) =>
      dragged.has(node.id) &&
      !chains.get(node.id)?.some((id) => dragged.has(id)),
  );
  if (roots.length === 0 || roots.some((node) => node.collapsed)) return [];
  const scopes = [...(chains.get(roots[0].id) ?? []), void 0];
  const scope = scopes.find((id) =>
    roots.every(
      (node) => id === void 0 || chains.get(node.id)?.includes(id),
    ),
  );
  const movingAncestors = new Set(
    roots.flatMap((node) => chains.get(node.id) ?? []),
  );
  const affected = new Set(
    nodes
      .filter(
        (node) =>
          dragged.has(node.id) ||
          chains.get(node.id)?.some((id) => dragged.has(id)),
      )
      .map((node) => node.id),
  );
  return nodes
    .filter((node) => {
      if (
        node.parentId !== scope ||
        affected.has(node.id) ||
        movingAncestors.has(node.id)
      ) {
        return false;
      }
      if (
        node.hidden ||
        node.collapsed ||
        chains.get(node.id)?.some((id) => byId.get(id)?.hidden)
      )
        return false;
      if (
        node.type === "sticker" &&
        affected.has(String(node.data?.targetId ?? ""))
      )
        return false;
      return true;
    })
    .map((node) => node.id);
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
