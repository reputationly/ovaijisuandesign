// layout-category-lanes.js
import { CanvasNodeType, p$4, pe } from "../vendor.js";
import { CanvasMode } from "./compute-group-bounds-from-children.js";
import { getNodePosition, sizeOf } from "./use-active-mode.js";
import { L$4 } from "./ot.js";

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

export const COLLISION_MARGIN = 40;

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

const LANE_RANK = new Map(
  CATEGORY_LANE_ORDER.map((category, index2) => [category, index2]),
);

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
    for (let c3 = 1; c3 < cols; c3++)
      colX[c3] = colX[c3 - 1] + colWidths[c3 - 1] + itemGap;
    const rowY = new Array(rows).fill(0);
    for (let r2 = 1; r2 < rows; r2++)
      rowY[r2] = rowY[r2 - 1] + rowHeights[r2 - 1] + itemGap;
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

export function H$2(e2, n2) {
  let t2 = e2.x,
    r2 = e2.y,
    o2 = n2.x - t2,
    i2 = n2.y - r2,
    s2 = e2.width / 2,
    a2 = e2.height / 2;
  if (!o2 && !i2)
    throw new Error(
      "Not possible to find intersection inside of the rectangle",
    );
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

export function X$3(e2) {
  let t2 = e2.nodes().map((r2) => {
    let o2 = e2.node(r2).rank;
    return o2 === void 0 ? Number.MIN_VALUE : o2;
  });
  return L$4(Math.max, t2);
}

var An$2 = 0;

export function j$2(e2) {
  let n2 = ++An$2;
  return e2 + ("" + n2);
}

export function w$3(e2, n2, t2, r2) {
  let o2 = r2;
  for (; e2.hasNode(o2);) o2 = j$2(r2);
  return ((t2.dummy = n2), e2.setNode(o2, t2), o2);
}

export function q$2(e2, n2, t2, r2) {
  let o2 = {
    width: 0,
    height: 0,
  };
  return (
    arguments.length >= 4 && ((o2.rank = t2), (o2.order = r2)),
    w$3(e2, "border", o2, n2)
  );
}

export function k$3(e2, n2, t2 = 1) {
  n2 == null && ((n2 = e2), (e2 = 0));
  let r2 = (i2) => i2 < n2;
  t2 < 0 && (r2 = (i2) => n2 < i2);
  let o2 = [];
  for (let i2 = e2; r2(i2); i2 += t2) o2.push(i2);
  return o2;
}

export function N$1(e2) {
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

export function T$3(e2, n2) {
  let t2 = {};
  for (let r2 of n2) e2[r2] !== void 0 && (t2[r2] = e2[r2]);
  return t2;
}

export function O$3(e2, n2) {
  let t2;
  return (
    typeof n2 == "string" ? (t2 = (r2) => r2[n2]) : (t2 = n2),
    Object.entries(e2).reduce((r2, [o2, i2]) => ((r2[o2] = t2(i2, o2)), r2), {})
  );
}

export var _$2 = "\0";

function Pe$1(e2) {
  ((e2._prev._next = e2._next),
    (e2._next._prev = e2._prev),
    delete e2._next,
    delete e2._prev);
}

function Vn(e2, n2) {
  if (e2 !== "_next" && e2 !== "_prev") return n2;
}

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

var Me = K$3;

function J$3(e2, n2, t2) {
  var r2, o2, i2;
  t2.out
    ? t2.in
      ? (i2 = e2[t2.out - t2.in + n2]) == null || i2.enqueue(t2)
      : (o2 = e2[e2.length - 1]) == null || o2.enqueue(t2)
    : (r2 = e2[0]) == null || r2.enqueue(t2);
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

export function Bn$2(e2, n2, t2) {
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

function zn$2(e2) {
  let n2 = [];
  for (let t2 = 0; t2 < e2; t2++) n2.push(t2);
  return n2;
}

export function Yn(e2, n2) {
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

export function S$4(e2) {
  let n2 = {};
  function t2(r2) {
    let o2 = e2.node(r2);
    if (Object.hasOwn(n2, r2)) return o2.rank;
    n2[r2] = true;
    let i2 = e2.outEdges(r2),
      s2 = i2
        ? i2.map((d2) =>
            d2 == null
              ? Number.POSITIVE_INFINITY
              : t2(d2.w) - e2.edge(d2).minlen,
          )
        : [],
      a2 = L$4(Math.min, s2);
    return (a2 === Number.POSITIVE_INFINITY && (a2 = 0), (o2.rank = a2));
  }
  e2.sources().forEach(t2);
}

export function v$4(e2, n2) {
  return e2.node(n2.w).rank - e2.node(n2.v).rank - e2.edge(n2).minlen;
}

function $n$2(e2, n2) {
  function t2(r2) {
    let o2 = n2.nodeEdges(r2);
    o2 &&
      o2.forEach((i2) => {
        let s2 = i2.v,
          a2 = r2 === s2 ? i2.w : s2;
        !e2.hasNode(a2) &&
          !v$4(n2, i2) &&
          (e2.setNode(a2, {}), e2.setEdge(r2, a2, {}), t2(a2));
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

export var V$3 = Kn$1;

export var it$1 = S$4;
