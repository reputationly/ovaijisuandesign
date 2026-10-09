// grid-slot-layout.js
import { sizeOf } from "./use-active-mode.js";
import {
  _,
  j,
  k,
  N,
  nodeToRect,
  O,
  S,
  V,
  w$3,
} from "./layout-category-lanes.js";
import { CanvasMode } from "./compute-group-bounds-from-children.js";
import { DEFAULT_PLACEMENT_GAP } from "./ungroup-in-canvas.js";
import { findFreePositionForRects } from "./find-free-position-for-rects.js";
import { dn, L } from "./ot.js";
import { p$4 as p } from "../vendor.js";
export function st(e2) {
  (S(e2), V(e2));
}
export function lt2(e2) {
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
  return (e2.children(_).forEach(r2), n2);
}
export function Qe(e2, n2, t2, r2, o2, i2) {
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
function Gt(e2) {
  let n2;
  for (; e2.hasNode((n2 = j("_root"))););
  return n2;
}
export function de(e2, n2, t2, r2) {
  r2 || (r2 = e2.nodes());
  let o2 = Gt(e2),
    i2 = new p({
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
export function _t(e2, n2) {
  let t2 = {};
  function r2(i2, s2, a2, d2, l2) {
    k(s2, a2).forEach((u4) => {
      let c3 = i2[u4];
      if (c3 !== void 0 && e2.node(c3).dummy) {
        let h2 = e2.predecessors(c3);
        h2 &&
          h2.forEach((f2) => {
            if (f2 === void 0) return;
            let g2 = e2.node(f2);
            g2.dummy && (g2.order < d2 || g2.order > l2) && dn(t2, f2, c3);
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
            ((d2 = e2.node(f2).order),
              r2(s2, l2, c3, a2, d2),
              (l2 = c3),
              (a2 = d2));
          }
        }
        r2(s2, l2, s2.length, d2, i2.length);
      }),
      s2
    );
  }
  return (n2.length && n2.reduce(o2), t2);
}
export function Pt(e2, n2) {
  let t2 = Object.values(n2),
    r2 = L(Math.min, t2),
    o2 = L(Math.max, t2);
  ["u", "d"].forEach((i2) => {
    ["l", "r"].forEach((s2) => {
      let a2 = i2 + s2,
        d2 = e2[a2];
      if (!d2 || d2 === n2) return;
      let l2 = Object.values(d2),
        u4 = r2 - L(Math.min, l2);
      (s2 !== "l" && (u4 = o2 - L(Math.max, l2)),
        u4 && (e2[a2] = O(d2, (c3) => c3 + u4)));
    });
  });
}
export function Mt(e2, n2 = void 0) {
  let t2 = e2.ul;
  return t2
    ? O(t2, (r2, o2) => {
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
        return (
          (((s2 = i2[1]) != null ? s2 : 0) + ((a2 = i2[2]) != null ? a2 : 0)) /
          2
        );
      })
    : {};
}
export function Ft(e2) {
  let n2 = N(e2),
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
const DEFAULT_NODE_WIDTH = 350;
const MAX_COLS = 8;
function computeMaxRowWidth(nodes, gap, mode2) {
  if (nodes.length === 0)
    return MAX_COLS * DEFAULT_NODE_WIDTH + (MAX_COLS - 1) * gap;
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
