// layout-engine.js
import { CanvasNodeType, p$4, pe, R$4, tr$2 } from "../vendor.js";
import { CanvasMode } from "./group-nodes-in-canvas.js";
import {
  DEFAULT_NODE_SIZE,
  computeCentroid,
  getNodePosition,
  sizeOf,
} from "./node-tag-rings-canvas.jsx";
import {
  DEFAULT_PLACEMENT_GAP,
  DEFAULT_WORKFLOW_LAYER_SPACING,
  DEFAULT_WORKFLOW_NODE_SPACING,
  resolveGroupMainId,
} from "./reconcile-group-geometry-for-mode.js";
import { deriveEdgeId, findFreePositionForRects } from "./resolve-derived-collision.js";
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
      if (typeof item === "string" && item.length > 0 && !ids2.includes(item)) ids2.push(item);
    }
  }
  if (ids2.length > 0) return ids2;
  for (const item of resolveReferenceIds?.(node2.id) ?? []) {
    if (typeof item === "string" && item.length > 0 && !ids2.includes(item)) ids2.push(item);
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
  const sourceNodes = [...previousNodes, ...nextNodes.filter((node2) => !byId.has(node2.id))];
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
      ownReferenceIds.length > 0 ? ownReferenceIds : nodeReferenceIds(oldMain, resolveReferenceIds);
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
          edge.source === referenceId || nodeMatchesReference(byId.get(edge.source), referenceId),
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
      const previous2 = previousNodes.find((candidate) => candidate.id === node2.id);
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
  const seenEndpoints = new Set(edges.map((edge) => `${edge.source}->${edge.target}`));
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
export function applyDetachedReferenceEdges(draft, previousGraph, nextNodes, resolveReferenceIds) {
  const additions = buildDetachedReferenceEdgesForMutation(
    previousGraph.nodes,
    previousGraph.edges,
    nextNodes,
    resolveReferenceIds,
  );
  draft.edges = mergeDetachedReferenceEdges(draft.edges, additions);
}
export function topoSortLevels(nodeIds, children2, parents) {
  const levels = new Map();
  const inDegree = new Map();
  for (const id2 of nodeIds) {
    inDegree.set(id2, parents.get(id2)?.length ?? 0);
  }
  const queue = [];
  for (const [id2, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id2);
      levels.set(id2, 0);
    }
  }
  let idx = 0;
  while (idx < queue.length) {
    const current2 = queue[idx++];
    const currentLevel = levels.get(current2) ?? 0;
    for (const child of children2.get(current2) ?? []) {
      const newLevel = currentLevel + 1;
      levels.set(child, Math.max(levels.get(child) ?? 0, newLevel));
      const remaining = (inDegree.get(child) ?? 0) - 1;
      inDegree.set(child, remaining);
      if (remaining === 0) {
        queue.push(child);
      }
    }
  }
  for (const id2 of nodeIds) {
    if (!levels.has(id2)) levels.set(id2, 0);
  }
  return levels;
}
export function buildAdjacency(nodeIds, edges) {
  const children2 = new Map();
  const parents = new Map();
  for (const id2 of nodeIds) {
    children2.set(id2, []);
    parents.set(id2, []);
  }
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    children2.get(edge.source)?.push(edge.target);
    parents.get(edge.target)?.push(edge.source);
  }
  return {
    children: children2,
    parents,
  };
}
export function findConnectedComponents(nodeIds, edges) {
  const adj = new Map();
  for (const id2 of nodeIds) adj.set(id2, []);
  for (const e2 of edges) {
    if (!nodeIds.has(e2.source) || !nodeIds.has(e2.target)) continue;
    adj.get(e2.source).push(e2.target);
    adj.get(e2.target).push(e2.source);
  }
  const visited = new Set();
  const components2 = [];
  for (const start2 of nodeIds) {
    if (visited.has(start2)) continue;
    const component = [];
    const queue = [start2];
    visited.add(start2);
    let idx = 0;
    while (idx < queue.length) {
      const cur = queue[idx++];
      component.push(cur);
      for (const neighbor of adj.get(cur) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    components2.push(component);
  }
  return components2;
}
const COLLISION_MARGIN = 40;
const LEVEL_GAP = 40;
const MAX_COLLISION_ATTEMPTS = 50;
export function rectsOverlap(a2, b3, margin = COLLISION_MARGIN) {
  return (
    a2.x < b3.x + b3.w + margin &&
    b3.x < a2.x + a2.w + margin &&
    a2.y < b3.y + b3.h + margin &&
    b3.y < a2.y + a2.h + margin
  );
}
export function nodeToRect(n2, mode2) {
  const resolvedMode = mode2 ?? CanvasMode.Workflow;
  const sz = sizeOf(n2, resolvedMode);
  const pos = getNodePosition(n2, resolvedMode);
  return {
    x: pos.x,
    y: pos.y,
    w: sz.width,
    h: sz.height,
  };
}
export class LayoutEngine {
  strategies = new Map();
  register(strategy) {
    this.strategies.set(strategy.name, strategy);
  }
  unregister(name2) {
    this.strategies.delete(name2);
  }
  compute(strategyName, nodes, edges, options) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Layout strategy "${strategyName}" not registered`);
    }
    return strategy.compute(nodes, edges, options);
  }
  async computeAsync(strategyName, nodes, edges, options) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Layout strategy "${strategyName}" not registered`);
    }
    if (strategy.computeAsync) {
      return strategy.computeAsync(nodes, edges, options);
    }
    return strategy.compute(nodes, edges, options);
  }
  /**
   * Incremental placement for new nodes among existing ones.
   *
   * Delegates to the strategy's own `computeIncremental` when available
   * (e.g. GridSlotLayout scans for the first free slot). Falls back to a
   * topological-level algorithm for workflow/DAG modes.
   */
  computeIncremental(strategyName, existingNodes, newNodes, edges, options) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Layout strategy "${strategyName}" not registered`);
    }
    if (newNodes.length === 0) return new Map();
    if (strategy.computeIncremental) {
      return strategy.computeIncremental(existingNodes, newNodes, edges, options);
    }
    const mode2 = options?.mode ?? CanvasMode.Workflow;
    const anchor = options?.anchor ?? computeCentroid(existingNodes, mode2);
    const occupied = existingNodes.map((n2) => nodeToRect(n2, mode2));
    const allNodeIds = new Set([
      ...existingNodes.map((n2) => n2.id),
      ...newNodes.map((n2) => n2.id),
    ]);
    const { children: children2, parents } = buildAdjacency(allNodeIds, edges);
    const levels = topoSortLevels(allNodeIds, children2, parents);
    const newByLevel = new Map();
    for (const n2 of newNodes) {
      const level = levels.get(n2.id) ?? 0;
      if (!newByLevel.has(level)) newByLevel.set(level, []);
      newByLevel.get(level)?.push(n2);
    }
    const result = new Map();
    const levelGap = options?.spacing?.x ?? LEVEL_GAP;
    const sortedLevels = [...newByLevel.keys()].sort((a2, b3) => a2 - b3);
    for (const level of sortedLevels) {
      const nodesAtLevel = newByLevel.get(level) ?? [];
      for (let i2 = 0; i2 < nodesAtLevel.length; i2++) {
        const node2 = nodesAtLevel[i2];
        const sz = sizeOf(node2, mode2);
        const pos = {
          x: anchor.x + level * levelGap,
          y: anchor.y + i2 * (sz.height + COLLISION_MARGIN),
        };
        const candidate = {
          x: pos.x,
          y: pos.y,
          w: sz.width,
          h: sz.height,
        };
        for (let attempt = 0; attempt < MAX_COLLISION_ATTEMPTS; attempt++) {
          const blocker = occupied.find((occ) => rectsOverlap(candidate, occ));
          if (!blocker) break;
          candidate.x = blocker.x + blocker.w + COLLISION_MARGIN;
        }
        const finalPos = {
          x: candidate.x,
          y: candidate.y,
        };
        result.set(node2.id, finalPos);
        occupied.push({
          x: finalPos.x,
          y: finalPos.y,
          w: sz.width,
          h: sz.height,
        });
      }
    }
    return result;
  }
  listStrategies() {
    return Array.from(this.strategies.keys());
  }
}
const CATEGORY_LANE_ORDER = [
  CanvasNodeType.Image,
  CanvasNodeType.Video,
  CanvasNodeType.Audio,
  CanvasNodeType.Text,
  CanvasNodeType.File,
  CanvasNodeType.Table,
  // Groups are opaque containers that may mix types internally — they get
  // their own lane rather than being torn open.
  CanvasNodeType.Group,
  // Still-generating slots sit last so that, once they resolve into a real
  // asset, the finished node moves to its type lane instead of shuffling the
  // whole board.
  CanvasNodeType.Placeholder,
];
const OTHER_CATEGORY_LANE = "other";
const LANE_RANK = new Map(CATEGORY_LANE_ORDER.map((category, index2) => [category, index2]));
function resolveCategoryLane(nodeType) {
  return LANE_RANK.has(nodeType) ? nodeType : OTHER_CATEGORY_LANE;
}
const DEFAULT_ITEM_GAP = 100;
const DEFAULT_LANE_GAP_RATIO = 2.5;
const DEFAULT_MAX_COLS = 8;
export function layoutCategoryLanes(items, options) {
  const positions = new Map();
  if (items.length === 0) return positions;
  const itemGap = DEFAULT_ITEM_GAP;
  const laneGap = Math.round(itemGap * DEFAULT_LANE_GAP_RATIO);
  const maxCols = Math.max(1, DEFAULT_MAX_COLS);
  const buckets2 = new Map();
  for (const item of items) {
    const lane = resolveCategoryLane(item.type);
    const bucket = buckets2.get(lane);
    if (bucket) bucket.push(item);
    else buckets2.set(lane, [item]);
  }
  const orderedLanes = [...buckets2.keys()].sort(
    (a2, b3) =>
      (LANE_RANK.get(a2) ?? CATEGORY_LANE_ORDER.length) -
      (LANE_RANK.get(b3) ?? CATEGORY_LANE_ORDER.length),
  );
  let laneTop = 0;
  for (const lane of orderedLanes) {
    const bucket = buckets2.get(lane);
    if (!bucket || bucket.length === 0) continue;
    const cols = Math.min(maxCols, bucket.length);
    const rows = Math.ceil(bucket.length / cols);
    const colWidths = new Array(cols).fill(0);
    const rowHeights = new Array(rows).fill(0);
    bucket.forEach((item, index2) => {
      const c3 = index2 % cols;
      const r2 = Math.floor(index2 / cols);
      if (item.width > colWidths[c3]) colWidths[c3] = item.width;
      if (item.height > rowHeights[r2]) rowHeights[r2] = item.height;
    });
    const colX = new Array(cols).fill(0);
    for (let c3 = 1; c3 < cols; c3++) colX[c3] = colX[c3 - 1] + colWidths[c3 - 1] + itemGap;
    const rowY = new Array(rows).fill(0);
    for (let r2 = 1; r2 < rows; r2++) rowY[r2] = rowY[r2 - 1] + rowHeights[r2 - 1] + itemGap;
    bucket.forEach((item, index2) => {
      const c3 = index2 % cols;
      const r2 = Math.floor(index2 / cols);
      positions.set(item.id, {
        x: colX[c3],
        y: laneTop + rowY[r2],
      });
    });
    laneTop += rowY[rows - 1] + rowHeights[rows - 1] + laneGap;
  }
  return positions;
}
function w$3(e2, n2, t2, r2) {
  let o2 = r2;
  for (; e2.hasNode(o2);) o2 = j$2(r2);
  return ((t2.dummy = n2), e2.setNode(o2, t2), o2);
}
function xe(e2) {
  let n2 = new p$4().setGraph(e2.graph());
  return (
    e2.nodes().forEach((t2) => n2.setNode(t2, e2.node(t2))),
    e2.edges().forEach((t2) => {
      let r2 = n2.edge(t2.v, t2.w) || {
          weight: 0,
          minlen: 1,
        },
        o2 = e2.edge(t2);
      n2.setEdge(t2.v, t2.w, {
        weight: r2.weight + o2.weight,
        minlen: Math.max(r2.minlen, o2.minlen),
      });
    }),
    n2
  );
}
function A$3(e2) {
  let n2 = new p$4({
    multigraph: e2.isMultigraph(),
  }).setGraph(e2.graph());
  return (
    e2.nodes().forEach((t2) => {
      e2.children(t2).length || n2.setNode(t2, e2.node(t2));
    }),
    e2.edges().forEach((t2) => {
      n2.setEdge(t2, e2.edge(t2));
    }),
    n2
  );
}
function H$2(e2, n2) {
  let t2 = e2.x,
    r2 = e2.y,
    o2 = n2.x - t2,
    i2 = n2.y - r2,
    s2 = e2.width / 2,
    a2 = e2.height / 2;
  if (!o2 && !i2) throw new Error("Not possible to find intersection inside of the rectangle");
  let d2, l2;
  return (
    Math.abs(i2) * s2 > Math.abs(o2) * a2
      ? (i2 < 0 && (a2 = -a2), (d2 = (a2 * o2) / i2), (l2 = a2))
      : (o2 < 0 && (s2 = -s2), (d2 = s2), (l2 = (s2 * i2) / o2)),
    {
      x: t2 + d2,
      y: r2 + l2,
    }
  );
}
function N$1(e2) {
  let n2 = k$3(X$3(e2) + 1).map(() => []);
  return (
    e2.nodes().forEach((t2) => {
      let r2 = e2.node(t2),
        o2 = r2.rank;
      o2 !== void 0 && (n2[o2] || (n2[o2] = []), (n2[o2][r2.order] = t2));
    }),
    n2
  );
}
function Te$1(e2) {
  let n2 = e2.nodes().map((r2) => {
      let o2 = e2.node(r2).rank;
      return o2 === void 0 ? Number.MAX_VALUE : o2;
    }),
    t2 = L$4(Math.min, n2);
  e2.nodes().forEach((r2) => {
    let o2 = e2.node(r2);
    Object.hasOwn(o2, "rank") && (o2.rank -= t2);
  });
}
function Oe$1(e2) {
  let n2 = e2
      .nodes()
      .map((s2) => e2.node(s2).rank)
      .filter((s2) => s2 !== void 0),
    t2 = L$4(Math.min, n2),
    r2 = [];
  e2.nodes().forEach((s2) => {
    let a2 = e2.node(s2).rank - t2;
    (r2[a2] || (r2[a2] = []), r2[a2].push(s2));
  });
  let o2 = 0,
    i2 = e2.graph().nodeRankFactor;
  Array.from(r2).forEach((s2, a2) => {
    s2 === void 0 && a2 % i2 !== 0
      ? --o2
      : s2 !== void 0 && o2 && s2.forEach((d2) => (e2.node(d2).rank += o2));
  });
}
function q$2(e2, n2, t2, r2) {
  let o2 = {
    width: 0,
    height: 0,
  };
  return (arguments.length >= 4 && ((o2.rank = t2), (o2.order = r2)), w$3(e2, "border", o2, n2));
}
function Dn$1(e2, n2 = Ie) {
  let t2 = [];
  for (let r2 = 0; r2 < e2.length; r2 += n2) {
    let o2 = e2.slice(r2, r2 + n2);
    t2.push(o2);
  }
  return t2;
}
var Ie = 65535;
function L$4(e2, n2) {
  if (n2.length > Ie) {
    let t2 = Dn$1(n2);
    return e2(...t2.map((r2) => e2(...r2)));
  } else return e2(...n2);
}
function X$3(e2) {
  let t2 = e2.nodes().map((r2) => {
    let o2 = e2.node(r2).rank;
    return o2 === void 0 ? Number.MIN_VALUE : o2;
  });
  return L$4(Math.max, t2);
}
function Ce(e2, n2) {
  let t2 = {
    lhs: [],
    rhs: [],
  };
  return (
    e2.forEach((r2) => {
      n2(r2) ? t2.lhs.push(r2) : t2.rhs.push(r2);
    }),
    t2
  );
}
var An$2 = 0;
function j$2(e2) {
  let n2 = ++An$2;
  return e2 + ("" + n2);
}
function k$3(e2, n2, t2 = 1) {
  n2 == null && ((n2 = e2), (e2 = 0));
  let r2 = (i2) => i2 < n2;
  t2 < 0 && (r2 = (i2) => n2 < i2);
  let o2 = [];
  for (let i2 = e2; r2(i2); i2 += t2) o2.push(i2);
  return o2;
}
function T$3(e2, n2) {
  let t2 = {};
  for (let r2 of n2) e2[r2] !== void 0 && (t2[r2] = e2[r2]);
  return t2;
}
function O$3(e2, n2) {
  let t2;
  return (
    typeof n2 == "string" ? (t2 = (r2) => r2[n2]) : (t2 = n2),
    Object.entries(e2).reduce((r2, [o2, i2]) => ((r2[o2] = t2(i2, o2)), r2), {})
  );
}
function Re(e2, n2) {
  return e2.reduce((t2, r2, o2) => ((t2[r2] = n2[o2]), t2), {});
}
var _$2 = "\0";
var K$3 = class K {
  constructor() {
    pe(this, "_sentinel");
    let n2 = {};
    ((n2._next = n2._prev = n2), (this._sentinel = n2));
  }
  dequeue() {
    let n2 = this._sentinel,
      t2 = n2._prev;
    if (t2 !== n2) return (Pe$1(t2), t2);
  }
  enqueue(n2) {
    let t2 = this._sentinel;
    (n2._prev && n2._next && Pe$1(n2),
      (n2._next = t2._next),
      (t2._next._prev = n2),
      (t2._next = n2),
      (n2._prev = t2));
  }
  toString() {
    let n2 = [],
      t2 = this._sentinel,
      r2 = t2._prev;
    for (; r2 !== t2;) (n2.push(JSON.stringify(r2, Vn)), (r2 = r2._prev));
    return "[" + n2.join(", ") + "]";
  }
};
function Pe$1(e2) {
  ((e2._prev._next = e2._next), (e2._next._prev = e2._prev), delete e2._next, delete e2._prev);
}
function Vn(e2, n2) {
  if (e2 !== "_next" && e2 !== "_prev") return n2;
}
var Me = K$3;
var Wn$2 = () => 1;
function Q$3(e2, n2) {
  if (e2.nodeCount() <= 1) return [];
  let t2 = Yn(e2, n2 || Wn$2);
  return Bn$2(t2.graph, t2.buckets, t2.zeroIdx).flatMap((o2) => e2.outEdges(o2.v, o2.w) || []);
}
function Bn$2(e2, n2, t2) {
  var a2;
  let r2 = [],
    o2 = n2[n2.length - 1],
    i2 = n2[0],
    s2;
  for (; e2.nodeCount();) {
    for (; (s2 = i2.dequeue());) $$5(e2, n2, t2, s2);
    for (; (s2 = o2.dequeue());) $$5(e2, n2, t2, s2);
    if (e2.nodeCount()) {
      for (let d2 = n2.length - 2; d2 > 0; --d2)
        if (((s2 = (a2 = n2[d2]) == null ? void 0 : a2.dequeue()), s2)) {
          r2 = r2.concat($$5(e2, n2, t2, s2, true) || []);
          break;
        }
    }
  }
  return r2;
}
function $$5(e2, n2, t2, r2, o2) {
  let i2 = [],
    s2 = o2 ? i2 : void 0;
  return (
    (e2.inEdges(r2.v) || []).forEach((a2) => {
      let d2 = e2.edge(a2),
        l2 = e2.node(a2.v);
      (o2 &&
        i2.push({
          v: a2.v,
          w: a2.w,
        }),
        (l2.out -= d2),
        J$3(n2, t2, l2));
    }),
    (e2.outEdges(r2.v) || []).forEach((a2) => {
      let d2 = e2.edge(a2),
        l2 = a2.w,
        u4 = e2.node(l2);
      ((u4.in -= d2), J$3(n2, t2, u4));
    }),
    e2.removeNode(r2.v),
    s2
  );
}
function Yn(e2, n2) {
  let t2 = new p$4(),
    r2 = 0,
    o2 = 0;
  (e2.nodes().forEach((a2) => {
    t2.setNode(a2, {
      v: a2,
      in: 0,
      out: 0,
    });
  }),
    e2.edges().forEach((a2) => {
      let d2 = t2.edge(a2.v, a2.w) || 0,
        l2 = n2(a2),
        u4 = d2 + l2;
      t2.setEdge(a2.v, a2.w, u4);
      let c3 = t2.node(a2.v),
        h2 = t2.node(a2.w);
      ((o2 = Math.max(o2, (c3.out += l2))), (r2 = Math.max(r2, (h2.in += l2))));
    }));
  let i2 = zn$2(o2 + r2 + 3).map(() => new Me()),
    s2 = r2 + 1;
  return (
    t2.nodes().forEach((a2) => {
      J$3(i2, s2, t2.node(a2));
    }),
    {
      graph: t2,
      buckets: i2,
      zeroIdx: s2,
    }
  );
}
function J$3(e2, n2, t2) {
  var r2, o2, i2;
  t2.out
    ? t2.in
      ? (i2 = e2[t2.out - t2.in + n2]) == null || i2.enqueue(t2)
      : (o2 = e2[e2.length - 1]) == null || o2.enqueue(t2)
    : (r2 = e2[0]) == null || r2.enqueue(t2);
}
function zn$2(e2) {
  let n2 = [];
  for (let t2 = 0; t2 < e2; t2++) n2.push(t2);
  return n2;
}
function je$1(e2) {
  (e2.graph().acyclicer === "greedy" ? Q$3(e2, t2(e2)) : Hn$1(e2)).forEach((r2) => {
    let o2 = e2.edge(r2);
    (e2.removeEdge(r2),
      (o2.forwardName = r2.name),
      (o2.reversed = true),
      e2.setEdge(r2.w, r2.v, o2, j$2("rev")));
  });
  function t2(r2) {
    return (o2) => r2.edge(o2).weight;
  }
}
function Hn$1(e2) {
  let n2 = [],
    t2 = {},
    r2 = {};
  function o2(i2) {
    Object.hasOwn(r2, i2) ||
      ((r2[i2] = true),
      (t2[i2] = true),
      e2.outEdges(i2).forEach((s2) => {
        Object.hasOwn(t2, s2.w) ? n2.push(s2) : o2(s2.w);
      }),
      delete t2[i2]);
  }
  return (e2.nodes().forEach(o2), n2);
}
function Se(e2) {
  e2.edges().forEach((n2) => {
    let t2 = e2.edge(n2);
    if (t2.reversed) {
      e2.removeEdge(n2);
      let r2 = t2.forwardName;
      (delete t2.reversed, delete t2.forwardName, e2.setEdge(n2.w, n2.v, t2, r2));
    }
  });
}
function Fe$1(e2) {
  ((e2.graph().dummyChains = []), e2.edges().forEach((n2) => Xn$2(e2, n2)));
}
function Xn$2(e2, n2) {
  let t2 = n2.v,
    r2 = e2.node(t2).rank,
    o2 = n2.w,
    i2 = e2.node(o2).rank,
    s2 = n2.name,
    a2 = e2.edge(n2),
    d2 = a2.labelRank;
  if (i2 === r2 + 1) return;
  e2.removeEdge(n2);
  let l2, u4, c3;
  for (c3 = 0, ++r2; r2 < i2; ++c3, ++r2)
    ((a2.points = []),
      (u4 = {
        width: 0,
        height: 0,
        edgeLabel: a2,
        edgeObj: n2,
        rank: r2,
      }),
      (l2 = w$3(e2, "edge", u4, "_d")),
      r2 === d2 &&
        ((u4.width = a2.width),
        (u4.height = a2.height),
        (u4.dummy = "edge-label"),
        (u4.labelpos = a2.labelpos)),
      e2.setEdge(
        t2,
        l2,
        {
          weight: a2.weight,
        },
        s2,
      ),
      c3 === 0 && e2.graph().dummyChains.push(l2),
      (t2 = l2));
  e2.setEdge(
    t2,
    o2,
    {
      weight: a2.weight,
    },
    s2,
  );
}
function De$1(e2) {
  e2.graph().dummyChains.forEach((n2) => {
    let t2 = e2.node(n2),
      r2 = t2.edgeLabel,
      o2;
    for (e2.setEdge(t2.edgeObj, r2); t2.dummy;)
      ((o2 = e2.successors(n2)[0]),
        e2.removeNode(n2),
        r2.points.push({
          x: t2.x,
          y: t2.y,
        }),
        t2.dummy === "edge-label" &&
          ((r2.x = t2.x), (r2.y = t2.y), (r2.width = t2.width), (r2.height = t2.height)),
        (n2 = o2),
        (t2 = e2.node(n2)));
  });
}
function S$4(e2) {
  let n2 = {};
  function t2(r2) {
    let o2 = e2.node(r2);
    if (Object.hasOwn(n2, r2)) return o2.rank;
    n2[r2] = true;
    let i2 = e2.outEdges(r2),
      s2 = i2
        ? i2.map((d2) => (d2 == null ? Number.POSITIVE_INFINITY : t2(d2.w) - e2.edge(d2).minlen))
        : [],
      a2 = L$4(Math.min, s2);
    return (a2 === Number.POSITIVE_INFINITY && (a2 = 0), (o2.rank = a2));
  }
  e2.sources().forEach(t2);
}
function v$4(e2, n2) {
  return e2.node(n2.w).rank - e2.node(n2.v).rank - e2.edge(n2).minlen;
}
var V$3 = Kn$1;
function Kn$1(e2) {
  let n2 = new p$4({
      directed: false,
    }),
    t2 = e2.nodes();
  if (t2.length === 0) throw new Error("Graph must have at least one node");
  let r2 = t2[0],
    o2 = e2.nodeCount();
  n2.setNode(r2, {});
  let i2, s2;
  for (; $n$2(n2, e2) < o2 && ((i2 = Jn$1(n2, e2)), !!i2);)
    ((s2 = n2.hasNode(i2.v) ? v$4(e2, i2) : -v$4(e2, i2)), Qn(n2, e2, s2));
  return n2;
}
function $n$2(e2, n2) {
  function t2(r2) {
    let o2 = n2.nodeEdges(r2);
    o2 &&
      o2.forEach((i2) => {
        let s2 = i2.v,
          a2 = r2 === s2 ? i2.w : s2;
        !e2.hasNode(a2) && !v$4(n2, i2) && (e2.setNode(a2, {}), e2.setEdge(r2, a2, {}), t2(a2));
      });
  }
  return (e2.nodes().forEach(t2), e2.nodeCount());
}
function Jn$1(e2, n2) {
  return n2.edges().reduce(
    (r2, o2) => {
      let i2 = Number.POSITIVE_INFINITY;
      return (
        e2.hasNode(o2.v) !== e2.hasNode(o2.w) && (i2 = v$4(n2, o2)),
        i2 < r2[0] ? [i2, o2] : r2
      );
    },
    [Number.POSITIVE_INFINITY, null],
  )[1];
}
function Qn(e2, n2, t2) {
  e2.nodes().forEach((r2) => (n2.node(r2).rank += t2));
}
var { preorder: Zn$1, postorder: et$1 } = R$4;
var Ve$1 = x$5;
x$5.initLowLimValues = ee$2;
x$5.initCutValues = Z$2;
x$5.calcCutValue = We$1;
x$5.leaveEdge = Ye;
x$5.enterEdge = ze;
x$5.exchangeEdges = He$1;
function x$5(e2) {
  ((e2 = xe(e2)), S$4(e2));
  let n2 = V$3(e2);
  (ee$2(n2), Z$2(n2, e2));
  let t2, r2;
  for (; (t2 = Ye(n2));) ((r2 = ze(n2, e2, t2)), He$1(n2, e2, t2, r2));
}
function Z$2(e2, n2) {
  let t2 = et$1(e2, e2.nodes());
  ((t2 = t2.slice(0, t2.length - 1)), t2.forEach((r2) => nt$1(e2, n2, r2)));
}
function nt$1(e2, n2, t2) {
  let o2 = e2.node(t2).parent,
    i2 = e2.edge(t2, o2);
  i2.cutvalue = We$1(e2, n2, t2);
}
function We$1(e2, n2, t2) {
  let o2 = e2.node(t2).parent,
    i2 = true,
    s2 = n2.edge(t2, o2),
    a2 = 0;
  (s2 || ((i2 = false), (s2 = n2.edge(o2, t2))), (a2 = s2.weight));
  let d2 = n2.nodeEdges(t2);
  return (
    d2 &&
      d2.forEach((l2) => {
        let u4 = l2.v === t2,
          c3 = u4 ? l2.w : l2.v;
        if (c3 !== o2) {
          let h2 = u4 === i2,
            f2 = n2.edge(l2).weight;
          if (((a2 += h2 ? f2 : -f2), rt$1(e2, t2, c3))) {
            let b3 = e2.edge(t2, c3).cutvalue;
            a2 += h2 ? -b3 : b3;
          }
        }
      }),
    a2
  );
}
function ee$2(e2, n2) {
  (arguments.length < 2 && (n2 = e2.nodes()[0]), Be$1(e2, {}, 1, n2));
}
function Be$1(e2, n2, t2, r2, o2) {
  let i2 = t2,
    s2 = e2.node(r2);
  n2[r2] = true;
  let a2 = e2.neighbors(r2);
  return (
    a2 &&
      a2.forEach((d2) => {
        Object.hasOwn(n2, d2) || (t2 = Be$1(e2, n2, t2, d2, r2));
      }),
    (s2.low = i2),
    (s2.lim = t2++),
    o2 ? (s2.parent = o2) : delete s2.parent,
    t2
  );
}
function Ye(e2) {
  return e2.edges().find((n2) => e2.edge(n2).cutvalue < 0);
}
function ze(e2, n2, t2) {
  let r2 = t2.v,
    o2 = t2.w;
  n2.hasEdge(r2, o2) || ((r2 = t2.w), (o2 = t2.v));
  let i2 = e2.node(r2),
    s2 = e2.node(o2),
    a2 = i2,
    d2 = false;
  return (
    i2.lim > s2.lim && ((a2 = s2), (d2 = true)),
    n2
      .edges()
      .filter((u4) => d2 === Ae$1(e2, e2.node(u4.v), a2) && d2 !== Ae$1(e2, e2.node(u4.w), a2))
      .reduce((u4, c3) => (v$4(n2, c3) < v$4(n2, u4) ? c3 : u4))
  );
}
function He$1(e2, n2, t2, r2) {
  let o2 = t2.v,
    i2 = t2.w;
  (e2.removeEdge(o2, i2), e2.setEdge(r2.v, r2.w, {}), ee$2(e2), Z$2(e2, n2), tt$1(e2, n2));
}
function tt$1(e2, n2) {
  let t2 = e2.nodes().find((o2) => !e2.node(o2).parent);
  if (!t2) return;
  let r2 = Zn$1(e2, [t2]);
  ((r2 = r2.slice(1)),
    r2.forEach((o2) => {
      let s2 = e2.node(o2).parent,
        a2 = n2.edge(o2, s2),
        d2 = false;
      (a2 || ((a2 = n2.edge(s2, o2)), (d2 = true)),
        (n2.node(o2).rank = n2.node(s2).rank + (d2 ? a2.minlen : -a2.minlen)));
    }));
}
function rt$1(e2, n2, t2) {
  return e2.hasEdge(n2, t2);
}
function Ae$1(e2, n2, t2) {
  return t2.low <= n2.lim && n2.lim <= t2.lim;
}
var Xe = ot$1;
function ot$1(e2) {
  let n2 = e2.graph().ranker;
  if (typeof n2 == "function") return n2(e2);
  switch (n2) {
    case "network-simplex":
      qe$1(e2);
      break;
    case "tight-tree":
      st$1(e2);
      break;
    case "longest-path":
      it$1(e2);
      break;
    case "none":
      break;
    default:
      qe$1(e2);
  }
}
var it$1 = S$4;
function st$1(e2) {
  (S$4(e2), V$3(e2));
}
function qe$1(e2) {
  Ve$1(e2);
}
var Ue = at$1;
function at$1(e2) {
  let n2 = lt2(e2);
  e2.graph().dummyChains.forEach((t2) => {
    let r2 = e2.node(t2),
      o2 = r2.edgeObj,
      i2 = dt$2(e2, n2, o2.v, o2.w),
      s2 = i2.path,
      a2 = i2.lca,
      d2 = 0,
      l2 = s2[d2],
      u4 = true;
    for (; t2 !== o2.w;) {
      if (((r2 = e2.node(t2)), u4)) {
        for (; (l2 = s2[d2]) !== a2 && e2.node(l2).maxRank < r2.rank;) d2++;
        l2 === a2 && (u4 = false);
      }
      if (!u4) {
        for (; d2 < s2.length - 1 && e2.node(s2[d2 + 1]).minRank <= r2.rank;) d2++;
        l2 = s2[d2];
      }
      (l2 !== void 0 && e2.setParent(t2, l2), (t2 = e2.successors(t2)[0]));
    }
  });
}
function dt$2(e2, n2, t2, r2) {
  let o2 = [],
    i2 = [],
    s2 = Math.min(n2[t2].low, n2[r2].low),
    a2 = Math.max(n2[t2].lim, n2[r2].lim),
    d2;
  d2 = t2;
  do ((d2 = e2.parent(d2)), o2.push(d2));
  while (d2 && (n2[d2].low > s2 || a2 > n2[d2].lim));
  let l2 = d2,
    u4 = r2;
  for (; (u4 = e2.parent(u4)) !== l2;) i2.push(u4);
  return {
    path: o2.concat(i2.reverse()),
    lca: l2,
  };
}
function lt2(e2) {
  let n2 = {},
    t2 = 0;
  function r2(o2) {
    let i2 = t2;
    (e2.children(o2).forEach(r2),
      (n2[o2] = {
        low: i2,
        lim: t2++,
      }));
  }
  return (e2.children(_$2).forEach(r2), n2);
}
function Ke(e2) {
  let n2 = w$3(e2, "root", {}, "_root"),
    t2 = ut(e2),
    r2 = Object.values(t2),
    o2 = L$4(Math.max, r2) - 1,
    i2 = 2 * o2 + 1;
  ((e2.graph().nestingRoot = n2), e2.edges().forEach((a2) => (e2.edge(a2).minlen *= i2)));
  let s2 = ct$1(e2) + 1;
  (e2.children(_$2).forEach((a2) => $e$2(e2, n2, i2, s2, o2, t2, a2)),
    (e2.graph().nodeRankFactor = i2));
}
function $e$2(e2, n2, t2, r2, o2, i2, s2) {
  var c3;
  let a2 = e2.children(s2);
  if (!a2.length) {
    s2 !== n2 &&
      e2.setEdge(n2, s2, {
        weight: 0,
        minlen: t2,
      });
    return;
  }
  let d2 = q$2(e2, "_bt"),
    l2 = q$2(e2, "_bb"),
    u4 = e2.node(s2);
  (e2.setParent(d2, s2),
    (u4.borderTop = d2),
    e2.setParent(l2, s2),
    (u4.borderBottom = l2),
    a2.forEach((h2) => {
      var y4;
      $e$2(e2, n2, t2, r2, o2, i2, h2);
      let f2 = e2.node(h2),
        g2 = f2.borderTop ? f2.borderTop : h2,
        b3 = f2.borderBottom ? f2.borderBottom : h2,
        m3 = f2.borderTop ? r2 : 2 * r2,
        E3 = g2 !== b3 ? 1 : o2 - ((y4 = i2[s2]) != null ? y4 : 0) + 1;
      (e2.setEdge(d2, g2, {
        weight: m3,
        minlen: E3,
        nestingEdge: true,
      }),
        e2.setEdge(b3, l2, {
          weight: m3,
          minlen: E3,
          nestingEdge: true,
        }));
    }),
    e2.parent(s2) ||
      e2.setEdge(n2, d2, {
        weight: 0,
        minlen: o2 + ((c3 = i2[s2]) != null ? c3 : 0),
      }));
}
function ut(e2) {
  let n2 = {};
  function t2(r2, o2) {
    let i2 = e2.children(r2);
    (i2 && i2.length && i2.forEach((s2) => t2(s2, o2 + 1)), (n2[r2] = o2));
  }
  return (e2.children(_$2).forEach((r2) => t2(r2, 1)), n2);
}
function ct$1(e2) {
  return e2.edges().reduce((n2, t2) => n2 + e2.edge(t2).weight, 0);
}
function Je(e2) {
  let n2 = e2.graph();
  (e2.removeNode(n2.nestingRoot),
    delete n2.nestingRoot,
    e2.edges().forEach((t2) => {
      e2.edge(t2).nestingEdge && e2.removeEdge(t2);
    }));
}
var Ze$1 = ft$1;
function ft$1(e2) {
  function n2(t2) {
    let r2 = e2.children(t2),
      o2 = e2.node(t2);
    if ((r2.length && r2.forEach(n2), Object.hasOwn(o2, "minRank"))) {
      ((o2.borderLeft = []), (o2.borderRight = []));
      for (let i2 = o2.minRank, s2 = o2.maxRank + 1; i2 < s2; ++i2)
        (Qe(e2, "borderLeft", "_bl", t2, o2, i2), Qe(e2, "borderRight", "_br", t2, o2, i2));
    }
  }
  e2.children(_$2).forEach(n2);
}
function Qe(e2, n2, t2, r2, o2, i2) {
  let s2 = {
      width: 0,
      height: 0,
      rank: i2,
      borderType: n2,
    },
    a2 = o2[n2][i2 - 1],
    d2 = w$3(e2, "border", s2, t2);
  ((o2[n2][i2] = d2),
    e2.setParent(d2, r2),
    a2 &&
      e2.setEdge(a2, d2, {
        weight: 1,
      }));
}
function nn$2(e2) {
  var t2;
  let n2 = (t2 = e2.graph().rankdir) == null ? void 0 : t2.toLowerCase();
  (n2 === "lr" || n2 === "rl") && rn$2(e2);
}
function tn$2(e2) {
  var t2;
  let n2 = (t2 = e2.graph().rankdir) == null ? void 0 : t2.toLowerCase();
  ((n2 === "bt" || n2 === "rl") && bt$1(e2), (n2 === "lr" || n2 === "rl") && (gt(e2), rn$2(e2)));
}
function rn$2(e2) {
  (e2.nodes().forEach((n2) => en$3(e2.node(n2))), e2.edges().forEach((n2) => en$3(e2.edge(n2))));
}
function en$3(e2) {
  let n2 = e2.width;
  ((e2.width = e2.height), (e2.height = n2));
}
function bt$1(e2) {
  (e2.nodes().forEach((n2) => ne$2(e2.node(n2))),
    e2.edges().forEach((n2) => {
      var r2;
      let t2 = e2.edge(n2);
      ((r2 = t2.points) == null || r2.forEach(ne$2), Object.hasOwn(t2, "y") && ne$2(t2));
    }));
}
function ne$2(e2) {
  e2.y = -e2.y;
}
function gt(e2) {
  (e2.nodes().forEach((n2) => te$2(e2.node(n2))),
    e2.edges().forEach((n2) => {
      var r2;
      let t2 = e2.edge(n2);
      ((r2 = t2.points) == null || r2.forEach(te$2), Object.hasOwn(t2, "x") && te$2(t2));
    }));
}
function te$2(e2) {
  let n2 = e2.x;
  ((e2.x = e2.y), (e2.y = n2));
}
function re$3(e2) {
  let n2 = {},
    t2 = e2.nodes().filter((d2) => !e2.children(d2).length),
    r2 = t2.map((d2) => e2.node(d2).rank),
    o2 = L$4(Math.max, r2),
    i2 = k$3(o2 + 1).map(() => []);
  function s2(d2) {
    if (n2[d2]) return;
    n2[d2] = true;
    let l2 = e2.node(d2);
    i2[l2.rank].push(d2);
    let u4 = e2.successors(d2);
    u4 && u4.forEach(s2);
  }
  return (t2.sort((d2, l2) => e2.node(d2).rank - e2.node(l2).rank).forEach(s2), i2);
}
function oe$1(e2, n2) {
  let t2 = 0;
  for (let r2 = 1; r2 < n2.length; ++r2) t2 += mt(e2, n2[r2 - 1], n2[r2]);
  return t2;
}
function mt(e2, n2, t2) {
  let r2 = Re(
      t2,
      t2.map((l2, u4) => u4),
    ),
    o2 = n2.flatMap((l2) => {
      let u4 = e2.outEdges(l2);
      return u4
        ? u4
            .map((c3) => ({
              pos: r2[c3.w],
              weight: e2.edge(c3).weight,
            }))
            .sort((c3, h2) => c3.pos - h2.pos)
        : [];
    }),
    i2 = 1;
  for (; i2 < t2.length;) i2 <<= 1;
  let s2 = 2 * i2 - 1;
  i2 -= 1;
  let a2 = new Array(s2).fill(0),
    d2 = 0;
  return (
    o2.forEach((l2) => {
      let u4 = l2.pos + i2;
      a2[u4] += l2.weight;
      let c3 = 0;
      for (; u4 > 0;) (u4 % 2 && (c3 += a2[u4 + 1]), (u4 = (u4 - 1) >> 1), (a2[u4] += l2.weight));
      d2 += l2.weight * c3;
    }),
    d2
  );
}
function ie$1(e2, n2 = []) {
  return n2.map((t2) => {
    let r2 = e2.inEdges(t2);
    if (!r2 || !r2.length)
      return {
        v: t2,
      };
    {
      let o2 = r2.reduce(
        (i2, s2) => {
          let a2 = e2.edge(s2),
            d2 = e2.node(s2.v);
          return {
            sum: i2.sum + a2.weight * d2.order,
            weight: i2.weight + a2.weight,
          };
        },
        {
          sum: 0,
          weight: 0,
        },
      );
      return {
        v: t2,
        barycenter: o2.sum / o2.weight,
        weight: o2.weight,
      };
    }
  });
}
function se$1(e2, n2) {
  let t2 = {};
  (e2.forEach((o2, i2) => {
    let s2 = {
      indegree: 0,
      in: [],
      out: [],
      vs: [o2.v],
      i: i2,
    };
    (o2.barycenter !== void 0 && ((s2.barycenter = o2.barycenter), (s2.weight = o2.weight)),
      (t2[o2.v] = s2));
  }),
    n2.edges().forEach((o2) => {
      let i2 = t2[o2.v],
        s2 = t2[o2.w];
      i2 !== void 0 && s2 !== void 0 && (s2.indegree++, i2.out.push(s2));
    }));
  let r2 = Object.values(t2).filter((o2) => !o2.indegree);
  return Et(r2);
}
function Et(e2) {
  let n2 = [];
  function t2(o2) {
    return (i2) => {
      i2.merged ||
        ((i2.barycenter === void 0 || o2.barycenter === void 0 || i2.barycenter >= o2.barycenter) &&
          Lt(o2, i2));
    };
  }
  function r2(o2) {
    return (i2) => {
      (i2.in.push(o2), --i2.indegree === 0 && e2.push(i2));
    };
  }
  for (; e2.length;) {
    let o2 = e2.pop();
    (n2.push(o2), o2.in.reverse().forEach(t2(o2)), o2.out.forEach(r2(o2)));
  }
  return n2.filter((o2) => !o2.merged).map((o2) => T$3(o2, ["vs", "i", "barycenter", "weight"]));
}
function Lt(e2, n2) {
  let t2 = 0,
    r2 = 0;
  (e2.weight && ((t2 += e2.barycenter * e2.weight), (r2 += e2.weight)),
    n2.weight && ((t2 += n2.barycenter * n2.weight), (r2 += n2.weight)),
    (e2.vs = n2.vs.concat(e2.vs)),
    (e2.barycenter = t2 / r2),
    (e2.weight = r2),
    (e2.i = Math.min(n2.i, e2.i)),
    (n2.merged = true));
}
function ae$1(e2, n2) {
  let t2 = Ce(e2, (u4) => Object.hasOwn(u4, "barycenter")),
    r2 = t2.lhs,
    o2 = t2.rhs.sort((u4, c3) => c3.i - u4.i),
    i2 = [],
    s2 = 0,
    a2 = 0,
    d2 = 0;
  (r2.sort(yt2(!!n2)),
    (d2 = on$2(i2, o2, d2)),
    r2.forEach((u4) => {
      ((d2 += u4.vs.length),
        i2.push(u4.vs),
        (s2 += u4.barycenter * u4.weight),
        (a2 += u4.weight),
        (d2 = on$2(i2, o2, d2)));
    }));
  let l2 = {
    vs: i2.flat(1),
  };
  return (a2 && ((l2.barycenter = s2 / a2), (l2.weight = a2)), l2);
}
function on$2(e2, n2, t2) {
  let r2;
  for (; n2.length && (r2 = n2[n2.length - 1]).i <= t2;) (n2.pop(), e2.push(r2.vs), t2++);
  return t2;
}
function yt2(e2) {
  return (n2, t2) =>
    n2.barycenter < t2.barycenter
      ? -1
      : n2.barycenter > t2.barycenter
        ? 1
        : e2
          ? t2.i - n2.i
          : n2.i - t2.i;
}
function W$4(e2, n2, t2, r2) {
  let o2 = e2.children(n2),
    i2 = e2.node(n2),
    s2 = i2 ? i2.borderLeft : void 0,
    a2 = i2 ? i2.borderRight : void 0,
    d2 = {};
  s2 && (o2 = o2.filter((h2) => h2 !== s2 && h2 !== a2));
  let l2 = ie$1(e2, o2);
  l2.forEach((h2) => {
    if (e2.children(h2.v).length) {
      let f2 = W$4(e2, h2.v, t2, r2);
      ((d2[h2.v] = f2), Object.hasOwn(f2, "barycenter") && Nt(h2, f2));
    }
  });
  let u4 = se$1(l2, t2);
  wt$1(u4, d2);
  let c3 = ae$1(u4, r2);
  if (s2 && a2) {
    c3.vs = [s2, c3.vs, a2].flat(1);
    let h2 = e2.predecessors(s2);
    if (h2 && h2.length) {
      let f2 = e2.node(h2[0]),
        g2 = e2.predecessors(a2),
        b3 = e2.node(g2[0]);
      (Object.hasOwn(c3, "barycenter") || ((c3.barycenter = 0), (c3.weight = 0)),
        (c3.barycenter = (c3.barycenter * c3.weight + f2.order + b3.order) / (c3.weight + 2)),
        (c3.weight += 2));
    }
  }
  return c3;
}
function wt$1(e2, n2) {
  e2.forEach((t2) => {
    t2.vs = t2.vs.flatMap((r2) => (n2[r2] ? n2[r2].vs : r2));
  });
}
function Nt(e2, n2) {
  e2.barycenter !== void 0
    ? ((e2.barycenter =
        (e2.barycenter * e2.weight + n2.barycenter * n2.weight) / (e2.weight + n2.weight)),
      (e2.weight += n2.weight))
    : ((e2.barycenter = n2.barycenter), (e2.weight = n2.weight));
}
function de$2(e2, n2, t2, r2) {
  r2 || (r2 = e2.nodes());
  let o2 = Gt(e2),
    i2 = new p$4({
      compound: true,
    })
      .setGraph({
        root: o2,
      })
      .setDefaultNodeLabel((s2) => e2.node(s2));
  return (
    r2.forEach((s2) => {
      let a2 = e2.node(s2),
        d2 = e2.parent(s2);
      if (a2.rank === n2 || (a2.minRank <= n2 && n2 <= a2.maxRank)) {
        (i2.setNode(s2), i2.setParent(s2, d2 || o2));
        let l2 = e2[t2](s2);
        (l2 &&
          l2.forEach((u4) => {
            let c3 = u4.v === s2 ? u4.w : u4.v,
              h2 = i2.edge(c3, s2),
              f2 = h2 !== void 0 ? h2.weight : 0;
            i2.setEdge(c3, s2, {
              weight: e2.edge(u4).weight + f2,
            });
          }),
          Object.hasOwn(a2, "minRank") &&
            i2.setNode(s2, {
              borderLeft: a2.borderLeft[n2],
              borderRight: a2.borderRight[n2],
            }));
      }
    }),
    i2
  );
}
function Gt(e2) {
  let n2;
  for (; e2.hasNode((n2 = j$2("_root"))););
  return n2;
}
function le$1(e2, n2, t2) {
  let r2 = {},
    o2;
  t2.forEach((i2) => {
    let s2 = e2.parent(i2),
      a2,
      d2;
    for (; s2;) {
      if (
        ((a2 = e2.parent(s2)),
        a2 ? ((d2 = r2[a2]), (r2[a2] = s2)) : ((d2 = o2), (o2 = s2)),
        d2 && d2 !== s2)
      ) {
        n2.setEdge(d2, s2);
        return;
      }
      s2 = a2;
    }
  });
}
function B$4(e2, n2 = {}) {
  if (typeof n2.customOrder == "function") {
    n2.customOrder(e2, B$4);
    return;
  }
  let t2 = X$3(e2),
    r2 = sn$2(e2, k$3(1, t2 + 1), "inEdges"),
    o2 = sn$2(e2, k$3(t2 - 1, -1, -1), "outEdges"),
    i2 = re$3(e2);
  if ((an$2(e2, i2), n2.disableOptimalOrderHeuristic)) return;
  let s2 = Number.POSITIVE_INFINITY,
    a2,
    d2 = n2.constraints || [];
  for (let l2 = 0, u4 = 0; u4 < 4; ++l2, ++u4) {
    (kt$1(l2 % 2 ? r2 : o2, l2 % 4 >= 2, d2), (i2 = N$1(e2)));
    let c3 = oe$1(e2, i2);
    c3 < s2
      ? ((u4 = 0), (a2 = Object.assign({}, i2)), (s2 = c3))
      : c3 === s2 && (a2 = structuredClone(i2));
  }
  an$2(e2, a2);
}
function sn$2(e2, n2, t2) {
  let r2 = new Map(),
    o2 = (i2, s2) => {
      (r2.has(i2) || r2.set(i2, []), r2.get(i2).push(s2));
    };
  for (let i2 of e2.nodes()) {
    let s2 = e2.node(i2);
    if (
      (typeof s2.rank == "number" && o2(s2.rank, i2),
      typeof s2.minRank == "number" && typeof s2.maxRank == "number")
    )
      for (let a2 = s2.minRank; a2 <= s2.maxRank; a2++) a2 !== s2.rank && o2(a2, i2);
  }
  return n2.map(function (i2) {
    return de$2(e2, i2, t2, r2.get(i2) || []);
  });
}
function kt$1(e2, n2, t2) {
  let r2 = new p$4();
  e2.forEach(function (o2) {
    t2.forEach((a2) => r2.setEdge(a2.left, a2.right));
    let i2 = o2.graph().root,
      s2 = W$4(o2, i2, r2, n2);
    (s2.vs.forEach((a2, d2) => (o2.node(a2).order = d2)), le$1(o2, r2, s2.vs));
  });
}
function an$2(e2, n2) {
  Object.values(n2).forEach((t2) => t2.forEach((r2, o2) => (e2.node(r2).order = o2)));
}
function vt(e2, n2) {
  let t2 = {};
  function r2(o2, i2) {
    let s2 = 0,
      a2 = 0,
      d2 = o2.length,
      l2 = i2[i2.length - 1];
    return (
      i2.forEach((u4, c3) => {
        let h2 = xt$1(e2, u4),
          f2 = h2 ? e2.node(h2).order : d2;
        (h2 || u4 === l2) &&
          (i2.slice(a2, c3 + 1).forEach((g2) => {
            let b3 = e2.predecessors(g2);
            b3 &&
              b3.forEach((m3) => {
                let E3 = e2.node(m3),
                  y4 = E3.order;
                (y4 < s2 || f2 < y4) && !(E3.dummy && e2.node(g2).dummy) && dn$2(t2, m3, g2);
              });
          }),
          (a2 = c3 + 1),
          (s2 = f2));
      }),
      i2
    );
  }
  return (n2.length && n2.reduce(r2), t2);
}
function _t$1(e2, n2) {
  let t2 = {};
  function r2(i2, s2, a2, d2, l2) {
    k$3(s2, a2).forEach((u4) => {
      let c3 = i2[u4];
      if (c3 !== void 0 && e2.node(c3).dummy) {
        let h2 = e2.predecessors(c3);
        h2 &&
          h2.forEach((f2) => {
            if (f2 === void 0) return;
            let g2 = e2.node(f2);
            g2.dummy && (g2.order < d2 || g2.order > l2) && dn$2(t2, f2, c3);
          });
      }
    });
  }
  function o2(i2, s2) {
    let a2 = -1,
      d2 = -1,
      l2 = 0;
    return (
      s2.forEach((u4, c3) => {
        if (e2.node(u4).dummy === "border") {
          let h2 = e2.predecessors(u4);
          if (h2 && h2.length) {
            let f2 = h2[0];
            if (f2 === void 0) return;
            ((d2 = e2.node(f2).order), r2(s2, l2, c3, a2, d2), (l2 = c3), (a2 = d2));
          }
        }
        r2(s2, l2, s2.length, d2, i2.length);
      }),
      s2
    );
  }
  return (n2.length && n2.reduce(o2), t2);
}
function xt$1(e2, n2) {
  if (e2.node(n2).dummy) {
    let t2 = e2.predecessors(n2);
    if (t2) return t2.find((r2) => e2.node(r2).dummy);
  }
}
function dn$2(e2, n2, t2) {
  if (n2 > t2) {
    let o2 = n2;
    ((n2 = t2), (t2 = o2));
  }
  let r2 = e2[n2];
  (r2 || (e2[n2] = r2 = {}), (r2[t2] = true));
}
function Tt(e2, n2, t2) {
  if (n2 > t2) {
    let o2 = n2;
    ((n2 = t2), (t2 = o2));
  }
  let r2 = e2[n2];
  return r2 !== void 0 && Object.hasOwn(r2, t2);
}
function Ot(e2, n2, t2, r2) {
  let o2 = {},
    i2 = {},
    s2 = {};
  return (
    n2.forEach((a2) => {
      a2.forEach((d2, l2) => {
        ((o2[d2] = d2), (i2[d2] = d2), (s2[d2] = l2));
      });
    }),
    n2.forEach((a2) => {
      let d2 = -1;
      a2.forEach((l2) => {
        let u4 = r2(l2);
        if (u4 && u4.length) {
          let c3 = u4.sort((f2, g2) => {
              let b3 = s2[f2],
                m3 = s2[g2];
              return (b3 !== void 0 ? b3 : 0) - (m3 !== void 0 ? m3 : 0);
            }),
            h2 = (c3.length - 1) / 2;
          for (let f2 = Math.floor(h2), g2 = Math.ceil(h2); f2 <= g2; ++f2) {
            let b3 = c3[f2];
            if (b3 === void 0) continue;
            let m3 = s2[b3];
            if (m3 !== void 0 && i2[l2] === l2 && d2 < m3 && !Tt(t2, l2, b3)) {
              let E3 = o2[b3];
              E3 !== void 0 && ((i2[b3] = l2), (i2[l2] = o2[l2] = E3), (d2 = m3));
            }
          }
        }
      });
    }),
    {
      root: o2,
      align: i2,
    }
  );
}
function It(e2, n2, t2, r2, o2 = false) {
  let i2 = {},
    s2 = Ct$1(e2, n2, t2, o2),
    a2 = o2 ? "borderLeft" : "borderRight";
  function d2(f2, g2) {
    let b3 = s2.nodes().slice(),
      m3 = {},
      E3 = b3.pop();
    for (; E3;) {
      if (m3[E3]) f2(E3);
      else {
        ((m3[E3] = true), b3.push(E3));
        for (let y4 of g2(E3)) b3.push(y4);
      }
      E3 = b3.pop();
    }
  }
  function l2(f2) {
    let g2 = s2.inEdges(f2);
    g2
      ? (i2[f2] = g2.reduce((b3, m3) => {
          var I2;
          let E3 = (I2 = i2[m3.v]) != null ? I2 : 0,
            y4 = s2.edge(m3);
          return Math.max(b3, E3 + (y4 !== void 0 ? y4 : 0));
        }, 0))
      : (i2[f2] = 0);
  }
  function u4(f2) {
    let g2 = s2.outEdges(f2),
      b3 = Number.POSITIVE_INFINITY;
    g2 &&
      (b3 = g2.reduce((E3, y4) => {
        let I2 = i2[y4.w],
          be2 = s2.edge(y4);
        return Math.min(E3, (I2 !== void 0 ? I2 : 0) - (be2 !== void 0 ? be2 : 0));
      }, Number.POSITIVE_INFINITY));
    let m3 = e2.node(f2);
    b3 !== Number.POSITIVE_INFINITY &&
      m3.borderType !== a2 &&
      (i2[f2] = Math.max(i2[f2] !== void 0 ? i2[f2] : 0, b3));
  }
  function c3(f2) {
    return s2.predecessors(f2) || [];
  }
  function h2(f2) {
    return s2.successors(f2) || [];
  }
  return (
    d2(l2, c3),
    d2(u4, h2),
    Object.keys(r2).forEach((f2) => {
      var b3;
      let g2 = t2[f2];
      g2 !== void 0 && (i2[f2] = (b3 = i2[g2]) != null ? b3 : 0);
    }),
    i2
  );
}
function Ct$1(e2, n2, t2, r2) {
  let o2 = new p$4(),
    i2 = e2.graph(),
    s2 = jt$1(i2.nodesep, i2.edgesep, r2);
  return (
    n2.forEach((a2) => {
      let d2;
      a2.forEach((l2) => {
        let u4 = t2[l2];
        if (u4 !== void 0) {
          if ((o2.setNode(u4), d2 !== void 0)) {
            let c3 = t2[d2];
            if (c3 !== void 0) {
              let h2 = o2.edge(c3, u4);
              o2.setEdge(c3, u4, Math.max(s2(e2, l2, d2), h2 || 0));
            }
          }
          d2 = l2;
        }
      });
    }),
    o2
  );
}
function Rt$1(e2, n2) {
  return Object.values(n2).reduce(
    (t2, r2) => {
      let o2 = Number.NEGATIVE_INFINITY,
        i2 = Number.POSITIVE_INFINITY;
      Object.entries(r2).forEach(([a2, d2]) => {
        let l2 = St$1(e2, a2) / 2;
        ((o2 = Math.max(d2 + l2, o2)), (i2 = Math.min(d2 - l2, i2)));
      });
      let s2 = o2 - i2;
      return (s2 < t2[0] && (t2 = [s2, r2]), t2);
    },
    [Number.POSITIVE_INFINITY, null],
  )[1];
}
function Pt(e2, n2) {
  let t2 = Object.values(n2),
    r2 = L$4(Math.min, t2),
    o2 = L$4(Math.max, t2);
  ["u", "d"].forEach((i2) => {
    ["l", "r"].forEach((s2) => {
      let a2 = i2 + s2,
        d2 = e2[a2];
      if (!d2 || d2 === n2) return;
      let l2 = Object.values(d2),
        u4 = r2 - L$4(Math.min, l2);
      (s2 !== "l" && (u4 = o2 - L$4(Math.max, l2)), u4 && (e2[a2] = O$3(d2, (c3) => c3 + u4)));
    });
  });
}
function Mt(e2, n2 = void 0) {
  let t2 = e2.ul;
  return t2
    ? O$3(t2, (r2, o2) => {
        var s2, a2;
        if (n2) {
          let d2 = n2.toLowerCase(),
            l2 = e2[d2];
          if (l2 && l2[o2] !== void 0) return l2[o2];
        }
        let i2 = Object.values(e2)
          .map((d2) => {
            let l2 = d2[o2];
            return l2 !== void 0 ? l2 : 0;
          })
          .sort((d2, l2) => d2 - l2);
        return (((s2 = i2[1]) != null ? s2 : 0) + ((a2 = i2[2]) != null ? a2 : 0)) / 2;
      })
    : {};
}
function ln$2(e2) {
  let n2 = N$1(e2),
    t2 = Object.assign(vt(e2, n2), _t$1(e2, n2)),
    r2 = {},
    o2;
  ["u", "d"].forEach((s2) => {
    ((o2 = s2 === "u" ? n2 : Object.values(n2).reverse()),
      ["l", "r"].forEach((a2) => {
        a2 === "r" && (o2 = o2.map((c3) => Object.values(c3).reverse()));
        let l2 = Ot(
            e2,
            o2,
            t2,
            (c3) => (s2 === "u" ? e2.predecessors(c3) : e2.successors(c3)) || [],
          ),
          u4 = It(e2, o2, l2.root, l2.align, a2 === "r");
        (a2 === "r" && (u4 = O$3(u4, (c3) => -c3)), (r2[s2 + a2] = u4));
      }));
  });
  let i2 = Rt$1(e2, r2);
  return (Pt(r2, i2), Mt(r2, e2.graph().align));
}
function jt$1(e2, n2, t2) {
  return (r2, o2, i2) => {
    let s2 = r2.node(o2),
      a2 = r2.node(i2),
      d2 = 0,
      l2;
    if (((d2 += s2.width / 2), Object.hasOwn(s2, "labelpos")))
      switch (s2.labelpos.toLowerCase()) {
        case "l":
          l2 = -s2.width / 2;
          break;
        case "r":
          l2 = s2.width / 2;
          break;
      }
    if (
      (l2 && (d2 += t2 ? l2 : -l2),
      (l2 = void 0),
      (d2 += (s2.dummy ? n2 : e2) / 2),
      (d2 += (a2.dummy ? n2 : e2) / 2),
      (d2 += a2.width / 2),
      Object.hasOwn(a2, "labelpos"))
    )
      switch (a2.labelpos.toLowerCase()) {
        case "l":
          l2 = a2.width / 2;
          break;
        case "r":
          l2 = -a2.width / 2;
          break;
      }
    return (l2 && (d2 += t2 ? l2 : -l2), d2);
  };
}
function St$1(e2, n2) {
  return e2.node(n2).width;
}
function un$2(e2) {
  ((e2 = A$3(e2)), Ft$1(e2), Object.entries(ln$2(e2)).forEach(([n2, t2]) => (e2.node(n2).x = t2)));
}
function Ft$1(e2) {
  let n2 = N$1(e2),
    t2 = e2.graph(),
    r2 = t2.ranksep,
    o2 = t2.rankalign,
    i2 = 0;
  n2.forEach((s2) => {
    let a2 = s2.reduce((d2, l2) => {
      var c3;
      let u4 = (c3 = e2.node(l2).height) != null ? c3 : 0;
      return d2 > u4 ? d2 : u4;
    }, 0);
    (s2.forEach((d2) => {
      let l2 = e2.node(d2);
      o2 === "top"
        ? (l2.y = i2 + l2.height / 2)
        : o2 === "bottom"
          ? (l2.y = i2 + a2 - l2.height / 2)
          : (l2.y = i2 + a2 / 2);
    }),
      (i2 += a2 + r2));
  });
}
export function Dt$1(e2, n2, t2) {
  (n2("    makeSpaceForEdgeLabels", () => Ut$1(e2)),
    n2("    removeSelfEdges", () => rr(e2)),
    n2("    acyclic", () => je$1(e2)),
    n2("    nestingGraph.run", () => Ke(e2)),
    n2("    rank", () => Xe(A$3(e2))),
    n2("    injectEdgeLabelProxies", () => Kt(e2)),
    n2("    removeEmptyRanks", () => Oe$1(e2)),
    n2("    nestingGraph.cleanup", () => Je(e2)),
    n2("    normalizeRanks", () => Te$1(e2)),
    n2("    assignRankMinMax", () => $t$1(e2)),
    n2("    removeEdgeLabelProxies", () => Jt$1(e2)),
    n2("    normalize.run", () => Fe$1(e2)),
    n2("    parentDummyChains", () => Ue(e2)),
    n2("    addBorderSegments", () => Ze$1(e2)),
    n2("    order", () => B$4(e2, t2)),
    n2("    insertSelfEdges", () => or$1(e2)),
    n2("    adjustCoordinateSystem", () => nn$2(e2)),
    n2("    position", () => un$2(e2)),
    n2("    positionSelfEdges", () => ir(e2)),
    n2("    removeBorderNodes", () => tr$2(e2)),
    n2("    normalize.undo", () => De$1(e2)),
    n2("    fixupEdgeLabelCoords", () => er(e2)),
    n2("    undoCoordinateSystem", () => tn$2(e2)),
    n2("    translateGraph", () => Qt(e2)),
    n2("    assignNodeIntersects", () => Zt$1(e2)),
    n2("    reversePoints", () => nr(e2)),
    n2("    acyclic.undo", () => Se(e2)));
}
var Vt = ["nodesep", "edgesep", "ranksep", "marginx", "marginy"];
var Wt$1 = {
  ranksep: 50,
  edgesep: 20,
  nodesep: 50,
  rankdir: "TB",
  rankalign: "center",
};
var Bt = ["acyclicer", "ranker", "rankdir", "align", "rankalign"];
var Yt$1 = ["width", "height", "rank"];
var cn$3 = {
  width: 0,
  height: 0,
};
var zt$1 = ["minlen", "weight", "width", "height", "labeloffset"];
var Ht = {
  minlen: 1,
  weight: 1,
  width: 0,
  height: 0,
  labeloffset: 10,
  labelpos: "r",
};
var qt$1 = ["labelpos"];
export function Xt$1(e2) {
  let n2 = new p$4({
      multigraph: true,
      compound: true,
    }),
    t2 = ce$1(e2.graph());
  return (
    n2.setGraph(Object.assign({}, Wt$1, ue$1(t2, Vt), T$3(t2, Bt))),
    e2.nodes().forEach((r2) => {
      let o2 = ce$1(e2.node(r2)),
        i2 = ue$1(o2, Yt$1);
      (Object.keys(cn$3).forEach((a2) => {
        i2[a2] === void 0 && (i2[a2] = cn$3[a2]);
      }),
        n2.setNode(r2, i2));
      let s2 = e2.parent(r2);
      s2 !== void 0 && n2.setParent(r2, s2);
    }),
    e2.edges().forEach((r2) => {
      let o2 = ce$1(e2.edge(r2));
      n2.setEdge(r2, Object.assign({}, Ht, ue$1(o2, zt$1), T$3(o2, qt$1)));
    }),
    n2
  );
}
function Ut$1(e2) {
  let n2 = e2.graph();
  ((n2.ranksep /= 2),
    e2.edges().forEach((t2) => {
      let r2 = e2.edge(t2);
      ((r2.minlen *= 2),
        r2.labelpos.toLowerCase() !== "c" &&
          (n2.rankdir === "TB" || n2.rankdir === "BT"
            ? (r2.width += r2.labeloffset)
            : (r2.height += r2.labeloffset)));
    }));
}
function Kt(e2) {
  e2.edges().forEach((n2) => {
    let t2 = e2.edge(n2);
    if (t2.width && t2.height) {
      let r2 = e2.node(n2.v),
        i2 = {
          rank: (e2.node(n2.w).rank - r2.rank) / 2 + r2.rank,
          e: n2,
        };
      w$3(e2, "edge-proxy", i2, "_ep");
    }
  });
}
function $t$1(e2) {
  let n2 = 0;
  (e2.nodes().forEach((t2) => {
    let r2 = e2.node(t2);
    r2.borderTop &&
      ((r2.minRank = e2.node(r2.borderTop).rank),
      (r2.maxRank = e2.node(r2.borderBottom).rank),
      (n2 = Math.max(n2, r2.maxRank)));
  }),
    (e2.graph().maxRank = n2));
}
function Jt$1(e2) {
  e2.nodes().forEach((n2) => {
    let t2 = e2.node(n2);
    if (t2.dummy === "edge-proxy") {
      let r2 = t2;
      ((e2.edge(r2.e).labelRank = t2.rank), e2.removeNode(n2));
    }
  });
}
function Qt(e2) {
  let n2 = Number.POSITIVE_INFINITY,
    t2 = 0,
    r2 = Number.POSITIVE_INFINITY,
    o2 = 0,
    i2 = e2.graph(),
    s2 = i2.marginx || 0,
    a2 = i2.marginy || 0;
  function d2(l2) {
    let u4 = l2.x,
      c3 = l2.y,
      h2 = l2.width,
      f2 = l2.height;
    ((n2 = Math.min(n2, u4 - h2 / 2)),
      (t2 = Math.max(t2, u4 + h2 / 2)),
      (r2 = Math.min(r2, c3 - f2 / 2)),
      (o2 = Math.max(o2, c3 + f2 / 2)));
  }
  (e2.nodes().forEach((l2) => d2(e2.node(l2))),
    e2.edges().forEach((l2) => {
      let u4 = e2.edge(l2);
      Object.hasOwn(u4, "x") && d2(u4);
    }),
    (n2 -= s2),
    (r2 -= a2),
    e2.nodes().forEach((l2) => {
      let u4 = e2.node(l2);
      ((u4.x -= n2), (u4.y -= r2));
    }),
    e2.edges().forEach((l2) => {
      let u4 = e2.edge(l2);
      (u4.points.forEach((c3) => {
        ((c3.x -= n2), (c3.y -= r2));
      }),
        Object.hasOwn(u4, "x") && (u4.x -= n2),
        Object.hasOwn(u4, "y") && (u4.y -= r2));
    }),
    (i2.width = t2 - n2 + s2),
    (i2.height = o2 - r2 + a2));
}
function Zt$1(e2) {
  e2.edges().forEach((n2) => {
    let t2 = e2.edge(n2),
      r2 = e2.node(n2.v),
      o2 = e2.node(n2.w),
      i2,
      s2;
    (t2.points
      ? ((i2 = t2.points[0]), (s2 = t2.points[t2.points.length - 1]))
      : ((t2.points = []), (i2 = o2), (s2 = r2)),
      t2.points.unshift(H$2(r2, i2)),
      t2.points.push(H$2(o2, s2)));
  });
}
function er(e2) {
  e2.edges().forEach((n2) => {
    let t2 = e2.edge(n2);
    if (Object.hasOwn(t2, "x"))
      switch (
        ((t2.labelpos === "l" || t2.labelpos === "r") && (t2.width -= t2.labeloffset), t2.labelpos)
      ) {
        case "l":
          t2.x -= t2.width / 2 + t2.labeloffset;
          break;
        case "r":
          t2.x += t2.width / 2 + t2.labeloffset;
          break;
      }
  });
}
function nr(e2) {
  e2.edges().forEach((n2) => {
    let t2 = e2.edge(n2);
    t2.reversed && t2.points.reverse();
  });
}
function rr(e2) {
  e2.edges().forEach((n2) => {
    if (n2.v === n2.w) {
      let t2 = e2.node(n2.v);
      (t2.selfEdges || (t2.selfEdges = []),
        t2.selfEdges.push({
          e: n2,
          label: e2.edge(n2),
        }),
        e2.removeEdge(n2));
    }
  });
}
function or$1(e2) {
  N$1(e2).forEach((t2) => {
    let r2 = 0;
    t2.forEach((o2, i2) => {
      let s2 = e2.node(o2);
      ((s2.order = i2 + r2),
        (s2.selfEdges || []).forEach((a2) => {
          w$3(
            e2,
            "selfedge",
            {
              width: a2.label.width,
              height: a2.label.height,
              rank: s2.rank,
              order: i2 + ++r2,
              e: a2.e,
              label: a2.label,
            },
            "_se",
          );
        }),
        delete s2.selfEdges);
    });
  });
}
function ir(e2) {
  e2.nodes().forEach((n2) => {
    let t2 = e2.node(n2);
    if (t2.dummy === "selfedge") {
      let r2 = t2,
        o2 = e2.node(r2.e.v),
        i2 = o2.x + o2.width / 2,
        s2 = o2.y,
        a2 = t2.x - i2,
        d2 = o2.height / 2;
      (e2.setEdge(r2.e, r2.label),
        e2.removeNode(n2),
        (r2.label.points = [
          {
            x: i2 + (2 * a2) / 3,
            y: s2 - d2,
          },
          {
            x: i2 + (5 * a2) / 6,
            y: s2 - d2,
          },
          {
            x: i2 + a2,
            y: s2,
          },
          {
            x: i2 + (5 * a2) / 6,
            y: s2 + d2,
          },
          {
            x: i2 + (2 * a2) / 3,
            y: s2 + d2,
          },
        ]),
        (r2.label.x = t2.x),
        (r2.label.y = t2.y));
    }
  });
}
function ue$1(e2, n2) {
  return O$3(T$3(e2, n2), Number);
}
function ce$1(e2) {
  let n2 = {};
  return (
    e2 &&
      Object.entries(e2).forEach(([t2, r2]) => {
        (typeof t2 == "string" && (t2 = t2.toLowerCase()), (n2[t2] = r2));
      }),
    n2
  );
}
const DEFAULT_NODE_WIDTH = 350;
const MAX_COLS = 8;
function computeMaxRowWidth(nodes, gap, mode2) {
  if (nodes.length === 0) return MAX_COLS * DEFAULT_NODE_WIDTH + (MAX_COLS - 1) * gap;
  const maxW = Math.max(...nodes.map((n2) => sizeOf(n2, mode2).width));
  return maxW * MAX_COLS + gap * (MAX_COLS - 1);
}
export class GridSlotLayout {
  name = "grid-slot";
  compute(nodes, _edges, options) {
    if (nodes.length === 0) return new Map();
    const mode2 = options?.mode ?? CanvasMode.Workflow;
    const gap = options?.spacing?.x ?? DEFAULT_PLACEMENT_GAP;
    const maxRowW = computeMaxRowWidth(nodes, gap, mode2);
    const positions = new Map();
    let curX = 0;
    let curY = 0;
    let colCount = 0;
    let rowMaxH = 0;
    let accW = 0;
    for (const node2 of nodes) {
      const sz = sizeOf(node2, mode2);
      if (colCount > 0) {
        const widthIfAdd = accW + gap + sz.width;
        if (colCount >= MAX_COLS || widthIfAdd > maxRowW) {
          curX = 0;
          curY += rowMaxH + gap;
          colCount = 0;
          rowMaxH = 0;
          accW = 0;
        }
      }
      positions.set(node2.id, {
        x: curX,
        y: curY,
      });
      curX += sz.width + gap;
      accW += (colCount > 0 ? gap : 0) + sz.width;
      rowMaxH = Math.max(rowMaxH, sz.height);
      colCount++;
    }
    return positions;
  }
  /**
   * Row-first incremental placement.
   *
   * Adapts CanvasNode → Rect, then delegates each placement to the
   * shared `findFreePositionForRects` algorithm in @hilo/protocol.
   * Each just-placed node is appended to the occupied list so that
   * successive new nodes don't overlap each other.
   */
  computeIncremental(existingNodes, newNodes, _edges, options) {
    if (newNodes.length === 0) return new Map();
    const mode2 = options?.mode ?? CanvasMode.Workflow;
    const gap = options?.spacing?.x ?? DEFAULT_PLACEMENT_GAP;
    if (existingNodes.length === 0) {
      return this.compute(newNodes, [], options);
    }
    const occupied = existingNodes.map((n2) => nodeToRect(n2, mode2));
    const result = new Map();
    for (const node2 of newNodes) {
      const sz = sizeOf(node2, mode2);
      const pos = findFreePositionForRects(occupied, sz, {
        gap,
      });
      result.set(node2.id, pos);
      occupied.push({
        x: pos.x,
        y: pos.y,
        w: sz.width,
        h: sz.height,
      });
    }
    return result;
  }
}
export const DIRECTION_MAP = {
  LR: "LR",
  RL: "RL",
  TB: "TB",
  BT: "BT",
};
export const DEFAULT_NODE_SPACING = DEFAULT_WORKFLOW_NODE_SPACING;
export const DEFAULT_LAYER_SPACING = DEFAULT_WORKFLOW_LAYER_SPACING;
export const DEFAULT_INCREMENTAL_NODE_SPACING = DEFAULT_NODE_SPACING;
export const DEFAULT_INCREMENTAL_LAYER_SPACING = DEFAULT_LAYER_SPACING;
export const MAX_INCREMENTAL_SHIFT_ATTEMPTS = 80;
export const INCREMENTAL_COLLISION_MARGIN = 12;
const MAX_INCREMENTAL_ITEMS_PER_COLUMN = 5;
export function maxTopoDepth(nodeIds, edges) {
  const { children: children2, parents } = buildAdjacency(nodeIds, edges);
  const levels = topoSortLevels(nodeIds, children2, parents);
  let max2 = 0;
  for (const level of levels.values()) {
    if (level > max2) max2 = level;
  }
  return max2 + 1;
}
export function pickPrimaryParent(parents, mode2) {
  if (parents.length === 0) return void 0;
  return parents.reduce((best, p3) => {
    const bestPos = getNodePosition(best, mode2);
    const pPos = getNodePosition(p3, mode2);
    const bestRight = bestPos.x + sizeOf(best, mode2).width;
    const pRight = pPos.x + sizeOf(p3, mode2).width;
    if (pRight !== bestRight) return pRight > bestRight ? p3 : best;
    return pPos.y < bestPos.y ? p3 : best;
  });
}
export function placeWrappedItem(slotIndex, origin, itemWidth, itemHeight, rowGap, columnGap) {
  const rowIndex = slotIndex % MAX_INCREMENTAL_ITEMS_PER_COLUMN;
  const columnIndex = Math.floor(slotIndex / MAX_INCREMENTAL_ITEMS_PER_COLUMN);
  return {
    x: origin.x + columnIndex * (itemWidth + columnGap),
    y: origin.y + rowIndex * (itemHeight + rowGap),
  };
}
const ALIGN_TOLERANCE = 2;
function buildLayerEntries(nodes, localPositions, layerAxis, mode2) {
  return nodes
    .map((node2) => {
      const pos = localPositions.get(node2.id);
      if (!pos) return null;
      const size2 = sizeOf(node2, mode2);
      const extent2 = layerAxis === "x" ? size2.width : size2.height;
      return {
        id: node2.id,
        pos,
        size: size2,
        lead: pos[layerAxis],
        center: pos[layerAxis] + extent2 / 2,
      };
    })
    .filter((e2) => e2 !== null);
}
function clusterByLayerAlignment(entries2) {
  const parent = entries2.map((_2, i2) => i2);
  const find2 = (i2) => {
    while (parent[i2] !== i2) {
      parent[i2] = parent[parent[i2]];
      i2 = parent[i2];
    }
    return i2;
  };
  const union = (a2, b3) => {
    const ra = find2(a2);
    const rb = find2(b3);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };
  for (let i2 = 0; i2 < entries2.length; i2++) {
    for (let j2 = i2 + 1; j2 < entries2.length; j2++) {
      const sameLead = Math.abs(entries2[i2].lead - entries2[j2].lead) <= ALIGN_TOLERANCE;
      const sameCenter = Math.abs(entries2[i2].center - entries2[j2].center) <= ALIGN_TOLERANCE;
      if (sameLead || sameCenter) union(i2, j2);
    }
  }
  const groups = new Map();
  entries2.forEach((entry, i2) => {
    const root2 = find2(i2);
    const bucket = groups.get(root2);
    if (bucket) bucket.push(entry);
    else groups.set(root2, [entry]);
  });
  return [...groups.values()];
}
export function normalizeLayerSpacing(localPositions, nodes, options, nodeSpacing, mode2) {
  const direction = options?.direction ?? "LR";
  const stackAxis = direction === "TB" || direction === "BT" ? "x" : "y";
  const layerAxis = stackAxis === "y" ? "x" : "y";
  const entries2 = buildLayerEntries(nodes, localPositions, layerAxis, mode2);
  const clusters = clusterByLayerAlignment(entries2);
  for (const bucket of clusters) {
    if (bucket.length < 2) continue;
    const extentOf = (e2) => (stackAxis === "y" ? e2.size.height : e2.size.width);
    bucket.sort((a2, b3) => a2.pos[stackAxis] - b3.pos[stackAxis]);
    const originalCenter =
      bucket.reduce((sum2, e2) => sum2 + e2.pos[stackAxis] + extentOf(e2) / 2, 0) / bucket.length;
    const totalExtent = bucket.reduce((sum2, e2) => sum2 + extentOf(e2), 0);
    const span = totalExtent + nodeSpacing * (bucket.length - 1);
    let cursor = originalCenter - span / 2;
    for (const entry of bucket) {
      const next2 = {
        ...entry.pos,
        [stackAxis]: cursor,
      };
      localPositions.set(entry.id, next2);
      cursor += extentOf(entry) + nodeSpacing;
    }
  }
}
function collectLeafFanOutGroups(nodes, edges) {
  const nodeIdSet = new Set(nodes.map((n2) => n2.id));
  const { children: childrenByParent, parents } = buildAdjacency(nodeIdSet, edges);
  const groups = [];
  for (const [parentId, childIds] of childrenByParent) {
    if (!parentId) continue;
    const leaves = childIds.filter(
      (id2) =>
        (parents.get(id2)?.length ?? 0) === 1 && (childrenByParent.get(id2)?.length ?? 0) === 0,
    );
    if (leaves.length <= MAX_INCREMENTAL_ITEMS_PER_COLUMN) continue;
    groups.push({
      parentId,
      leafIds: leaves,
    });
  }
  return groups;
}
export function rewrapLeafFanOuts(
  localPositions,
  nodes,
  edges,
  nodeById,
  columnGap,
  nodeSpacing,
  mode2,
  direction,
) {
  if (direction === "TB" || direction === "BT") return;
  const groups = collectLeafFanOutGroups(nodes, edges);
  if (groups.length === 0) return;
  const entries2 = buildLayerEntries(nodes, localPositions, "x", mode2);
  const clusters = clusterByLayerAlignment(entries2);
  const minLead = (cluster) => Math.min(...cluster.map((e2) => e2.lead));
  clusters.sort((a2, b3) => minLead(a2) - minLead(b3));
  const clusterIndexById = new Map();
  clusters.forEach((cluster, index2) => {
    for (const entry of cluster) clusterIndexById.set(entry.id, index2);
  });
  const groupsByCluster = new Map();
  const wrappedLeafIds = new Set();
  for (const group of groups) {
    const counts = new Map();
    for (const id2 of group.leafIds) {
      const ci = clusterIndexById.get(id2);
      if (ci === void 0) continue;
      counts.set(ci, (counts.get(ci) ?? 0) + 1);
    }
    let best = -1;
    let bestCount = 0;
    for (const [ci, count2] of counts) {
      if (count2 > bestCount || (count2 === bestCount && (best === -1 || ci < best))) {
        best = ci;
        bestCount = count2;
      }
    }
    if (best === -1) continue;
    const bucket = groupsByCluster.get(best);
    if (bucket) bucket.push(group);
    else groupsByCluster.set(best, [group]);
    for (const id2 of group.leafIds) wrappedLeafIds.add(id2);
  }
  if (groupsByCluster.size === 0) return;
  const handled = new Set();
  let cumulativeShift = 0;
  for (let ci = 0; ci < clusters.length; ci++) {
    const cluster = clusters[ci];
    if (cumulativeShift !== 0) {
      for (const entry of cluster) {
        if (handled.has(entry.id)) continue;
        const pos = localPositions.get(entry.id);
        if (pos)
          localPositions.set(entry.id, {
            x: pos.x + cumulativeShift,
            y: pos.y,
          });
      }
    }
    const clusterGroups = groupsByCluster.get(ci);
    if (!clusterGroups || clusterGroups.length === 0) continue;
    const live = cluster.filter((entry) => !handled.has(entry.id));
    let colLeft = Number.POSITIVE_INFINITY;
    let oldRight = Number.NEGATIVE_INFINITY;
    for (const entry of live) {
      const pos = localPositions.get(entry.id);
      if (!pos) continue;
      colLeft = Math.min(colLeft, pos.x);
      oldRight = Math.max(oldRight, pos.x + entry.size.width);
    }
    if (!Number.isFinite(colLeft) || !Number.isFinite(oldRight)) continue;
    const tiles = [];
    const gridRights = [];
    for (const group of clusterGroups) {
      const ordered = group.leafIds
        .map((id2) => ({
          id: id2,
          pos: localPositions.get(id2),
        }))
        .filter((entry) => entry.pos !== void 0)
        .sort((a2, b3) => a2.pos.y - b3.pos.y || a2.pos.x - b3.pos.x);
      if (ordered.length <= MAX_INCREMENTAL_ITEMS_PER_COLUMN) continue;
      const sizes = ordered.map(({ id: id2 }) => {
        const node2 = nodeById.get(id2);
        return node2 ? sizeOf(node2, mode2) : DEFAULT_NODE_SIZE;
      });
      const itemWidth = Math.max(...sizes.map((s2) => s2.width));
      const itemHeight = Math.max(...sizes.map((s2) => s2.height));
      const rows = Math.min(ordered.length, MAX_INCREMENTAL_ITEMS_PER_COLUMN);
      const cols = Math.ceil(ordered.length / MAX_INCREMENTAL_ITEMS_PER_COLUMN);
      const gridHeight = rows * itemHeight + (rows - 1) * nodeSpacing;
      const orderKey =
        ordered.reduce((sum2, { pos }, i2) => sum2 + pos.y + sizes[i2].height / 2, 0) /
        ordered.length;
      tiles.push({
        orderKey,
        extent: gridHeight,
        place: (top2) => {
          ordered.forEach(({ id: id2 }, slotIndex) => {
            localPositions.set(
              id2,
              placeWrappedItem(
                slotIndex,
                {
                  x: colLeft,
                  y: top2,
                },
                itemWidth,
                itemHeight,
                nodeSpacing,
                columnGap,
              ),
            );
            handled.add(id2);
          });
        },
      });
      gridRights.push(colLeft + cols * itemWidth + (cols - 1) * columnGap);
    }
    if (gridRights.length === 0) continue;
    let nodeTileCount = 0;
    for (const entry of live) {
      if (wrappedLeafIds.has(entry.id)) continue;
      const pos = localPositions.get(entry.id);
      if (!pos) continue;
      tiles.push({
        orderKey: pos.y + entry.size.height / 2,
        extent: entry.size.height,
        place: (top2) =>
          localPositions.set(entry.id, {
            x: pos.x,
            y: top2,
          }),
      });
      nodeTileCount++;
    }
    tiles.sort((a2, b3) => a2.orderKey - b3.orderKey);
    const span =
      tiles.reduce((sum2, tile) => sum2 + tile.extent, 0) + nodeSpacing * (tiles.length - 1);
    let anchorTop;
    const isPureLeafColumn = clusterGroups.length === 1 && nodeTileCount === 0;
    if (isPureLeafColumn) {
      const parentId = clusterGroups[0].parentId;
      const parentPos = localPositions.get(parentId);
      const parentNode2 = nodeById.get(parentId);
      if (parentPos && parentNode2) {
        const parentCenterY = parentPos.y + sizeOf(parentNode2, mode2).height / 2;
        anchorTop = parentCenterY - span / 2;
      } else {
        anchorTop = live.reduce(
          (min2, entry) => Math.min(min2, localPositions.get(entry.id)?.y ?? min2),
          Number.POSITIVE_INFINITY,
        );
      }
    } else {
      let centerSum = 0;
      let centerCount = 0;
      for (const entry of live) {
        const pos = localPositions.get(entry.id);
        if (!pos) continue;
        centerSum += pos.y + entry.size.height / 2;
        centerCount++;
      }
      const centroid = centerCount > 0 ? centerSum / centerCount : 0;
      anchorTop = centroid - span / 2;
    }
    let cursor = anchorTop;
    for (const tile of tiles) {
      tile.place(cursor);
      cursor += tile.extent + nodeSpacing;
    }
    let newRight = Math.max(...gridRights);
    for (const entry of live) {
      if (wrappedLeafIds.has(entry.id)) continue;
      const pos = localPositions.get(entry.id);
      if (pos) newRight = Math.max(newRight, pos.x + entry.size.width);
    }
    cumulativeShift += Math.max(0, newRight - oldRight);
  }
}
