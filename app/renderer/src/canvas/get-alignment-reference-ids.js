// get-alignment-reference-ids.js
import { createStore$1 as createStore } from "../vendor.js";
export const DEFAULT_BUFFER_RATIO = 1.5;
export const MIN_EDGES_TO_CULL = 32;
export function applyEdgeCullingVisibility(edges, hiddenIds) {
  if (hiddenIds.size === 0) return edges;
  let dirty = false;
  const out = new Array(edges.length);
  for (let i2 = 0; i2 < edges.length; i2++) {
    const edge = edges[i2];
    const wantHidden = Boolean(edge.hidden) || hiddenIds.has(edge.id);
    if (Boolean(edge.hidden) === wantHidden) {
      out[i2] = edge;
      continue;
    }
    out[i2] = {
      ...edge,
      hidden: wantHidden,
    };
    dirty = true;
  }
  return dirty ? out : edges;
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
    const src = state2.nodeLookup.get(edge.source);
    const tgt = state2.nodeLookup.get(edge.target);
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
export function sameMembership(a2, b3) {
  if (a2 === b3) return true;
  if (a2.size !== b3.size) return false;
  for (const id2 of a2) {
    if (!b3.has(id2)) return false;
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
      !chains.get(node2.id)?.some((id2) => dragged.has(id2)),
  );
  if (roots.length === 0 || roots.some((node2) => node2.collapsed)) return [];
  const scopes = [...(chains.get(roots[0].id) ?? []), void 0];
  const scope = scopes.find((id2) =>
    roots.every(
      (node2) => id2 === void 0 || chains.get(node2.id)?.includes(id2),
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
          chains.get(node2.id)?.some((id2) => dragged.has(id2)),
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
        chains.get(node2.id)?.some((id2) => byId.get(id2)?.hidden)
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
export function intersectsViewport(a2, b3) {
  return (
    a2.width > 0 &&
    a2.height > 0 &&
    b3.width > 0 &&
    b3.height > 0 &&
    a2.x < b3.x + b3.width &&
    a2.x + a2.width > b3.x &&
    a2.y < b3.y + b3.height &&
    a2.y + a2.height > b3.y
  );
}
export const EMPTY_GUIDES = [];
export function createAlignmentGuidesStore() {
  return createStore(() => ({
    guides: EMPTY_GUIDES,
    transform: [0, 0, 1],
  }));
}
