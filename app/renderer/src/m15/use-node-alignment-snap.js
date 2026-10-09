// use-node-alignment-snap.js
import { reactExports, createStore$1, useStoreApi } from "../vendor.js";
const DEFAULT_BUFFER_RATIO = 1.5;
const MIN_EDGES_TO_CULL = 32;
function applyEdgeCullingVisibility(edges, hiddenIds) {
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
export function useEdgeCulling(edges, options) {
  const bufferRatio = options?.bufferRatio ?? DEFAULT_BUFFER_RATIO;
  const minEdges = options?.minEdges ?? MIN_EDGES_TO_CULL;
  const disabled2 = options?.disabled ?? false;
  const active2 = options?.active ?? true;
  const storeApi = useStoreApi();
  const emptyHiddenRef = reactExports.useRef(new Set());
  const [hiddenIds, setHiddenIds] = reactExports.useState(emptyHiddenRef.current);
  const edgesRef = reactExports.useRef(edges);
  edgesRef.current = edges;
  const optsRef = reactExports.useRef({
    bufferRatio,
    minEdges,
    disabled: disabled2,
  });
  optsRef.current = {
    bufferRatio,
    minEdges,
    disabled: disabled2,
  };
  reactExports.useEffect(() => {
    if (!active2) {
      setHiddenIds(emptyHiddenRef.current);
      return;
    }
    let rafId2 = 0;
    let cancelled = false;
    const recompute = () => {
      rafId2 = 0;
      if (cancelled) return;
      const opts = optsRef.current;
      const list2 = edgesRef.current;
      let next2;
      if (opts.disabled || list2.length < opts.minEdges) {
        next2 = emptyHiddenRef.current;
      } else {
        const state2 = storeApi.getState();
        next2 = computeHiddenEdgeIds(state2, list2, opts.bufferRatio);
      }
      setHiddenIds((prev) => (sameMembership(prev, next2) ? prev : next2));
    };
    recompute();
    const unsubscribe = storeApi.subscribe(() => {
      if (rafId2 !== 0) return;
      rafId2 = requestAnimationFrame(recompute);
    });
    return () => {
      cancelled = true;
      if (rafId2 !== 0) cancelAnimationFrame(rafId2);
      unsubscribe();
    };
  }, [active2, storeApi]);
  reactExports.useEffect(() => {
    if (!active2) {
      setHiddenIds(emptyHiddenRef.current);
      return;
    }
    const opts = optsRef.current;
    let next2;
    if (opts.disabled || edges.length < opts.minEdges) {
      next2 = emptyHiddenRef.current;
    } else {
      const state2 = storeApi.getState();
      next2 = computeHiddenEdgeIds(state2, edges, opts.bufferRatio);
    }
    setHiddenIds((prev) => (sameMembership(prev, next2) ? prev : next2));
  }, [active2, edges, storeApi]);
  return reactExports.useMemo(
    () => applyEdgeCullingVisibility(edges, hiddenIds),
    [edges, hiddenIds],
  );
}
function computeHiddenEdgeIds(state2, edges, bufferRatio) {
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
    const intersects2 = !(eRight < bLeft || eLeft > bRight || eBottom < bTop || eTop > bBottom);
    if (!intersects2) hidden.add(edge.id);
  }
  return hidden;
}
function sameMembership(a2, b3) {
  if (a2 === b3) return true;
  if (a2.size !== b3.size) return false;
  for (const id2 of a2) {
    if (!b3.has(id2)) return false;
  }
  return true;
}
const MIDDLE_DRAG_CLASS = "hilo-canvas-middle-pan";
const STYLE_ELEMENT_ID = "hilo-middle-pan-style";
export function useMiddleButtonPanCursor(active2 = true) {
  reactExports.useEffect(() => {
    if (!active2) return;
    let isDragging = false;
    const ensureStyle = () => {
      if (document.getElementById(STYLE_ELEMENT_ID)) return;
      const style2 = document.createElement("style");
      style2.id = STYLE_ELEMENT_ID;
      style2.textContent = `body.${MIDDLE_DRAG_CLASS}, body.${MIDDLE_DRAG_CLASS} .react-flow__pane { cursor: grabbing !important; }`;
      document.head.appendChild(style2);
    };
    const handleDown = (event) => {
      if (event.button !== 1) return;
      const target = event.target;
      if (!target?.closest(".react-flow__pane")) return;
      event.preventDefault();
      isDragging = true;
      ensureStyle();
      document.body.classList.add(MIDDLE_DRAG_CLASS);
    };
    const stop = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove(MIDDLE_DRAG_CLASS);
    };
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("mouseup", stop);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("blur", stop);
      document.body.classList.remove(MIDDLE_DRAG_CLASS);
      document.getElementById(STYLE_ELEMENT_ID)?.remove();
    };
  }, [active2]);
}
const ALIGNMENT_SNAP_DISTANCE = 5;
const ALIGNMENT_RELEASE_DISTANCE = 8;
const EPSILON = 1e-6;
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
function getAlignmentReferenceIds(nodes, draggedIds) {
  const byId = new Map(nodes.map((node2) => [node2.id, node2]));
  const dragged = new Set(draggedIds);
  const chains = new Map(nodes.map((node2) => [node2.id, ancestors(node2, byId)]));
  const roots = nodes.filter(
    (node2) => dragged.has(node2.id) && !chains.get(node2.id)?.some((id2) => dragged.has(id2)),
  );
  if (roots.length === 0 || roots.some((node2) => node2.collapsed)) return [];
  const scopes = [...(chains.get(roots[0].id) ?? []), void 0];
  const scope = scopes.find((id2) =>
    roots.every((node2) => id2 === void 0 || chains.get(node2.id)?.includes(id2)),
  );
  const movingAncestors = new Set(roots.flatMap((node2) => chains.get(node2.id) ?? []));
  const affected = new Set(
    nodes
      .filter(
        (node2) => dragged.has(node2.id) || chains.get(node2.id)?.some((id2) => dragged.has(id2)),
      )
      .map((node2) => node2.id),
  );
  return nodes
    .filter((node2) => {
      if (node2.parentId !== scope || affected.has(node2.id) || movingAncestors.has(node2.id)) {
        return false;
      }
      if (
        node2.hidden ||
        node2.collapsed ||
        chains.get(node2.id)?.some((id2) => byId.get(id2)?.hidden)
      )
        return false;
      if (node2.type === "sticker" && affected.has(String(node2.data?.targetId ?? "")))
        return false;
      return true;
    })
    .map((node2) => node2.id);
}
function intersectsViewport(a2, b3) {
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
const otherAxis = (axis) => (axis === "x" ? "y" : "x");
const length = (rect, axis) => (axis === "x" ? rect.width : rect.height);
const end = (rect, axis) => rect[axis] + length(rect, axis);
const anchors = (rect, axis) => [rect[axis], rect[axis] + length(rect, axis) / 2, end(rect, axis)];
const inViewport = (value, viewport, axis) =>
  value >= viewport[axis] && value <= end(viewport, axis);
function candidatesForAxis(moving, references, viewport, axis, tolerance) {
  const candidates2 = [];
  const cross2 = otherAxis(axis);
  const movingAnchors = anchors(moving, axis);
  for (const ref of references) {
    const separation = Math.max(
      0,
      ref[cross2] - end(moving, cross2),
      moving[cross2] - end(ref, cross2),
    );
    for (const [targetIndex, target] of anchors(ref, axis).entries()) {
      if (!inViewport(target, viewport, axis)) continue;
      for (const [sourceIndex, source] of movingAnchors.entries()) {
        const delta = target - source;
        if (Math.abs(delta) > tolerance || !inViewport(source, viewport, axis)) continue;
        candidates2.push({
          key: `align:${ref.id}:${targetIndex}:${sourceIndex}`,
          delta,
          priority: sourceIndex === targetIndex ? 0 : 1,
          separation,
        });
      }
    }
  }
  return candidates2;
}
function chooseCandidate(candidates2, zoom2, lock) {
  const retained = candidates2.find(
    (candidate) =>
      candidate.key === lock && Math.abs(candidate.delta) * zoom2 <= ALIGNMENT_RELEASE_DISTANCE,
  );
  if (retained) return retained;
  return candidates2
    .filter((candidate) => Math.abs(candidate.delta) * zoom2 <= ALIGNMENT_SNAP_DISTANCE)
    .sort(
      (a2, b3) =>
        Math.abs(a2.delta) - Math.abs(b3.delta) ||
        a2.priority - b3.priority ||
        a2.separation - b3.separation ||
        a2.key.localeCompare(b3.key),
    )[0];
}
function alignmentGuides(moving, references, viewport, axis) {
  const cross2 = otherAxis(axis);
  const lines = new Map();
  for (const source of anchors(moving, axis)) {
    if (!inViewport(source, viewport, axis)) continue;
    for (const ref of references) {
      if (!anchors(ref, axis).some((target) => Math.abs(target - source) < EPSILON)) continue;
      const line = lines.get(source) ?? {
        start: moving[cross2],
        end: end(moving, cross2),
      };
      line.start = Math.min(line.start, ref[cross2]);
      line.end = Math.max(line.end, end(ref, cross2));
      lines.set(source, line);
    }
  }
  return Array.from(lines, ([position2, line]) =>
    axis === "x"
      ? {
          kind: "alignment",
          x1: position2,
          x2: position2,
          y1: line.start,
          y2: line.end,
        }
      : {
          kind: "alignment",
          y1: position2,
          y2: position2,
          x1: line.start,
          x2: line.end,
        },
  );
}
function resolveNodeAlignmentSnap(input, locks = {}) {
  const { movingBounds: moving, viewport, zoom: zoom2 } = input;
  const empty2 = {
    delta: {
      x: 0,
      y: 0,
    },
    guides: [],
    locks: {},
  };
  if (
    input.bypass ||
    !Number.isFinite(zoom2) ||
    zoom2 <= 0 ||
    !intersectsViewport(moving, viewport)
  )
    return empty2;
  const references = input.references.filter((ref) => intersectsViewport(ref, viewport));
  const chosen = {};
  for (const axis of ["x", "y"]) {
    chosen[axis] = chooseCandidate(
      candidatesForAxis(moving, references, viewport, axis, ALIGNMENT_RELEASE_DISTANCE / zoom2),
      zoom2,
      locks[axis],
    );
  }
  const snapped = {
    ...moving,
    x: moving.x + (chosen.x?.delta ?? 0),
    y: moving.y + (chosen.y?.delta ?? 0),
  };
  const guides = [];
  const nextLocks = {};
  for (const axis of ["x", "y"]) {
    const candidate = chosen[axis];
    if (!candidate) continue;
    nextLocks[axis] = candidate.key;
    guides.push(...alignmentGuides(snapped, references, viewport, axis));
  }
  return {
    delta: {
      x: chosen.x?.delta ?? 0,
      y: chosen.y?.delta ?? 0,
    },
    guides,
    locks: nextLocks,
  };
}
const EMPTY_GUIDES = [];
function createAlignmentGuidesStore() {
  return createStore$1(() => ({
    guides: EMPTY_GUIDES,
    transform: [0, 0, 1],
  }));
}
export function useNodeAlignmentSnap(enabled) {
  const flowStore = useStoreApi();
  const guidesStore = reactExports.useMemo(createAlignmentGuidesStore, []);
  const session = reactExports.useRef(null);
  const clear = reactExports.useCallback(() => {
    session.current = null;
    if (guidesStore.getState().guides.length > 0) {
      guidesStore.setState({
        guides: EMPTY_GUIDES,
      });
    }
  }, [guidesStore]);
  const resolve = reactExports.useCallback(
    (input) => {
      if (!enabled) {
        clear();
        return void 0;
      }
      const state2 = flowStore.getState();
      if (session.current?.source !== input.referenceBounds) {
        session.current = {
          source: input.referenceBounds,
          referenceIds: getAlignmentReferenceIds(
            Array.from(state2.nodeLookup.values(), (node2) => ({
              id: node2.id,
              parentId: node2.parentId,
              type: node2.type,
              data: node2.data,
              hidden: node2.hidden,
              collapsed: node2.className?.includes("canvas-group-collapsed"),
              ...node2.internals.positionAbsolute,
              width: node2.measured.width ?? 0,
              height: node2.measured.height ?? 0,
            })),
            input.draggedIds,
          ),
          locks: {},
        };
      }
      const [x2, y4, zoom2] = state2.transform;
      const viewport = {
        x: -x2 / zoom2,
        y: -y4 / zoom2,
        width: state2.width / zoom2,
        height: state2.height / zoom2,
      };
      const references = [];
      const bounds = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };
      for (const id2 of session.current.referenceIds) {
        const node2 = state2.nodeLookup.get(id2);
        if (!node2 || node2.hidden || node2.className?.includes("canvas-group-collapsed")) continue;
        bounds.x = node2.internals.positionAbsolute.x;
        bounds.y = node2.internals.positionAbsolute.y;
        bounds.width = node2.measured.width ?? 0;
        bounds.height = node2.measured.height ?? 0;
        if (intersectsViewport(bounds, viewport))
          references.push({
            id: id2,
            ...bounds,
          });
      }
      const result = resolveNodeAlignmentSnap(
        {
          movingBounds: input.movingBounds,
          references,
          viewport,
          zoom: zoom2,
          bypass: input.bypass,
        },
        session.current.locks,
      );
      session.current.locks = result.locks;
      if (result.guides.length > 0 || guidesStore.getState().guides.length > 0) {
        guidesStore.setState({
          guides: result.guides,
          transform: state2.transform,
        });
      }
      return {
        delta: result.delta,
      };
    },
    [clear, enabled, flowStore, guidesStore],
  );
  reactExports.useEffect(() => {
    if (!enabled) clear();
    window.addEventListener("blur", clear);
    const unsubscribe = flowStore.subscribe((state2, previous2) => {
      if (state2.transform !== previous2.transform && guidesStore.getState().guides.length > 0) {
        guidesStore.setState({
          guides: EMPTY_GUIDES,
        });
      }
    });
    return () => {
      window.removeEventListener("blur", clear);
      unsubscribe();
      clear();
    };
  }, [clear, enabled, flowStore, guidesStore]);
  return {
    resolve,
    clear,
    guidesStore,
  };
}
