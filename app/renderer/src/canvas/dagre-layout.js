// dagre-layout.js
import {
  DEFAULT_NODE_SIZE,
  getNodePosition,
  setNodePosition,
  sizeOf,
} from "./use-active-mode.js";
import {
  DEFAULT_WORKFLOW_LAYER_SPACING,
  DEFAULT_WORKFLOW_NODE_SPACING,
} from "./ungroup-in-canvas.js";
import {
  _$2,
  Bn$2,
  buildAdjacency,
  H$2,
  it$1,
  j$2,
  k$3,
  N$1,
  nodeToRect,
  O$3,
  q$2,
  rectsOverlap,
  T$3,
  topoSortLevels,
  w$3,
  X$3,
  Yn,
} from "./layout-category-lanes.js";
import { dt$2, en$3, L$4, le$1, mt, ne$2, Ot, Rt$1, te$2, vt } from "./ot.js";
import {
  _t$1,
  de$2,
  Ft$1,
  GridSlotLayout,
  lt2,
  Mt,
  Pt,
  Qe,
  st$1,
} from "./grid-slot-layout.js";
import { It } from "./it.js";
import { p$4, tr$2, z$4 } from "../vendor.js";
import { W$4 } from "./w.js";
import { qe$1 } from "./we.js";
import { CanvasMode } from "./compute-group-bounds-from-children.js";
import { findFreePositionForRects } from "./find-free-position-for-rects.js";

function findConnectedComponents(nodeIds, edges) {
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

var Wn$2 = () => 1;

function Q$3(e2, n2) {
  if (e2.nodeCount() <= 1) return [];
  let t2 = Yn(e2, n2 || Wn$2);
  return Bn$2(t2.graph, t2.buckets, t2.zeroIdx).flatMap(
    (o2) => e2.outEdges(o2.v, o2.w) || [],
  );
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

function je$1(e2) {
  (e2.graph().acyclicer === "greedy" ? Q$3(e2, t2(e2)) : Hn$1(e2)).forEach(
    (r2) => {
      let o2 = e2.edge(r2);
      (e2.removeEdge(r2),
        (o2.forwardName = r2.name),
        (o2.reversed = true),
        e2.setEdge(r2.w, r2.v, o2, j$2("rev")));
    },
  );
  function t2(r2) {
    return (o2) => r2.edge(o2).weight;
  }
}

function Se(e2) {
  e2.edges().forEach((n2) => {
    let t2 = e2.edge(n2);
    if (t2.reversed) {
      e2.removeEdge(n2);
      let r2 = t2.forwardName;
      (delete t2.reversed,
        delete t2.forwardName,
        e2.setEdge(n2.w, n2.v, t2, r2));
    }
  });
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

function Fe$1(e2) {
  ((e2.graph().dummyChains = []), e2.edges().forEach((n2) => Xn$2(e2, n2)));
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
          ((r2.x = t2.x),
          (r2.y = t2.y),
          (r2.width = t2.width),
          (r2.height = t2.height)),
        (n2 = o2),
        (t2 = e2.node(n2)));
  });
}

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

var Xe = ot$1;

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
        for (; d2 < s2.length - 1 && e2.node(s2[d2 + 1]).minRank <= r2.rank;)
          d2++;
        l2 = s2[d2];
      }
      (l2 !== void 0 && e2.setParent(t2, l2), (t2 = e2.successors(t2)[0]));
    }
  });
}

var Ue = at$1;

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

function Ke(e2) {
  let n2 = w$3(e2, "root", {}, "_root"),
    t2 = ut(e2),
    r2 = Object.values(t2),
    o2 = L$4(Math.max, r2) - 1,
    i2 = 2 * o2 + 1;
  ((e2.graph().nestingRoot = n2),
    e2.edges().forEach((a2) => (e2.edge(a2).minlen *= i2)));
  let s2 = ct$1(e2) + 1;
  (e2.children(_$2).forEach((a2) => $e$2(e2, n2, i2, s2, o2, t2, a2)),
    (e2.graph().nodeRankFactor = i2));
}

function Je(e2) {
  let n2 = e2.graph();
  (e2.removeNode(n2.nestingRoot),
    delete n2.nestingRoot,
    e2.edges().forEach((t2) => {
      e2.edge(t2).nestingEdge && e2.removeEdge(t2);
    }));
}

function ft$1(e2) {
  function n2(t2) {
    let r2 = e2.children(t2),
      o2 = e2.node(t2);
    if ((r2.length && r2.forEach(n2), Object.hasOwn(o2, "minRank"))) {
      ((o2.borderLeft = []), (o2.borderRight = []));
      for (let i2 = o2.minRank, s2 = o2.maxRank + 1; i2 < s2; ++i2)
        (Qe(e2, "borderLeft", "_bl", t2, o2, i2),
          Qe(e2, "borderRight", "_br", t2, o2, i2));
    }
  }
  e2.children(_$2).forEach(n2);
}

var Ze$1 = ft$1;

function rn$2(e2) {
  (e2.nodes().forEach((n2) => en$3(e2.node(n2))),
    e2.edges().forEach((n2) => en$3(e2.edge(n2))));
}

function nn$2(e2) {
  var t2;
  let n2 = (t2 = e2.graph().rankdir) == null ? void 0 : t2.toLowerCase();
  (n2 === "lr" || n2 === "rl") && rn$2(e2);
}

function bt$1(e2) {
  (e2.nodes().forEach((n2) => ne$2(e2.node(n2))),
    e2.edges().forEach((n2) => {
      var r2;
      let t2 = e2.edge(n2);
      ((r2 = t2.points) == null || r2.forEach(ne$2),
        Object.hasOwn(t2, "y") && ne$2(t2));
    }));
}

function gt(e2) {
  (e2.nodes().forEach((n2) => te$2(e2.node(n2))),
    e2.edges().forEach((n2) => {
      var r2;
      let t2 = e2.edge(n2);
      ((r2 = t2.points) == null || r2.forEach(te$2),
        Object.hasOwn(t2, "x") && te$2(t2));
    }));
}

function tn$2(e2) {
  var t2;
  let n2 = (t2 = e2.graph().rankdir) == null ? void 0 : t2.toLowerCase();
  ((n2 === "bt" || n2 === "rl") && bt$1(e2),
    (n2 === "lr" || n2 === "rl") && (gt(e2), rn$2(e2)));
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
  return (
    t2.sort((d2, l2) => e2.node(d2).rank - e2.node(l2).rank).forEach(s2),
    i2
  );
}

function oe$1(e2, n2) {
  let t2 = 0;
  for (let r2 = 1; r2 < n2.length; ++r2) t2 += mt(e2, n2[r2 - 1], n2[r2]);
  return t2;
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
      for (let a2 = s2.minRank; a2 <= s2.maxRank; a2++)
        a2 !== s2.rank && o2(a2, i2);
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
  Object.values(n2).forEach((t2) =>
    t2.forEach((r2, o2) => (e2.node(r2).order = o2)),
  );
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
            (c3) =>
              (s2 === "u" ? e2.predecessors(c3) : e2.successors(c3)) || [],
          ),
          u4 = It(e2, o2, l2.root, l2.align, a2 === "r");
        (a2 === "r" && (u4 = O$3(u4, (c3) => -c3)), (r2[s2 + a2] = u4));
      }));
  });
  let i2 = Rt$1(e2, r2);
  return (Pt(r2, i2), Mt(r2, e2.graph().align));
}

function un$2(e2) {
  ((e2 = A$3(e2)),
    Ft$1(e2),
    Object.entries(ln$2(e2)).forEach(([n2, t2]) => (e2.node(n2).x = t2)));
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
        ((t2.labelpos === "l" || t2.labelpos === "r") &&
          (t2.width -= t2.labeloffset),
        t2.labelpos)
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

function Dt$1(e2, n2, t2) {
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

function Xt$1(e2) {
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

const DIRECTION_MAP = {
  LR: "LR",
  RL: "RL",
  TB: "TB",
  BT: "BT",
};

const DEFAULT_NODE_SPACING = DEFAULT_WORKFLOW_NODE_SPACING;

const DEFAULT_LAYER_SPACING = DEFAULT_WORKFLOW_LAYER_SPACING;

const DEFAULT_INCREMENTAL_NODE_SPACING = DEFAULT_NODE_SPACING;

const DEFAULT_INCREMENTAL_LAYER_SPACING = DEFAULT_LAYER_SPACING;

const MAX_INCREMENTAL_SHIFT_ATTEMPTS = 80;

const INCREMENTAL_COLLISION_MARGIN = 12;

const MAX_INCREMENTAL_ITEMS_PER_COLUMN = 5;

function maxTopoDepth(nodeIds, edges) {
  const { children: children2, parents } = buildAdjacency(nodeIds, edges);
  const levels = topoSortLevels(nodeIds, children2, parents);
  let max2 = 0;
  for (const level of levels.values()) {
    if (level > max2) max2 = level;
  }
  return max2 + 1;
}

function pickPrimaryParent(parents, mode2) {
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

function placeWrappedItem(
  slotIndex,
  origin,
  itemWidth,
  itemHeight,
  rowGap,
  columnGap,
) {
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
      const sameLead =
        Math.abs(entries2[i2].lead - entries2[j2].lead) <= ALIGN_TOLERANCE;
      const sameCenter =
        Math.abs(entries2[i2].center - entries2[j2].center) <= ALIGN_TOLERANCE;
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

function normalizeLayerSpacing(
  localPositions,
  nodes,
  options,
  nodeSpacing,
  mode2,
) {
  const direction = options?.direction ?? "LR";
  const stackAxis = direction === "TB" || direction === "BT" ? "x" : "y";
  const layerAxis = stackAxis === "y" ? "x" : "y";
  const entries2 = buildLayerEntries(nodes, localPositions, layerAxis, mode2);
  const clusters = clusterByLayerAlignment(entries2);
  for (const bucket of clusters) {
    if (bucket.length < 2) continue;
    const extentOf = (e2) =>
      stackAxis === "y" ? e2.size.height : e2.size.width;
    bucket.sort((a2, b3) => a2.pos[stackAxis] - b3.pos[stackAxis]);
    const originalCenter =
      bucket.reduce(
        (sum2, e2) => sum2 + e2.pos[stackAxis] + extentOf(e2) / 2,
        0,
      ) / bucket.length;
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
  const { children: childrenByParent, parents } = buildAdjacency(
    nodeIdSet,
    edges,
  );
  const groups = [];
  for (const [parentId, childIds] of childrenByParent) {
    if (!parentId) continue;
    const leaves = childIds.filter(
      (id2) =>
        (parents.get(id2)?.length ?? 0) === 1 &&
        (childrenByParent.get(id2)?.length ?? 0) === 0,
    );
    if (leaves.length <= MAX_INCREMENTAL_ITEMS_PER_COLUMN) continue;
    groups.push({
      parentId,
      leafIds: leaves,
    });
  }
  return groups;
}

function rewrapLeafFanOuts(
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
      if (
        count2 > bestCount ||
        (count2 === bestCount && (best === -1 || ci < best))
      ) {
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
        ordered.reduce(
          (sum2, { pos }, i2) => sum2 + pos.y + sizes[i2].height / 2,
          0,
        ) / ordered.length;
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
      tiles.reduce((sum2, tile) => sum2 + tile.extent, 0) +
      nodeSpacing * (tiles.length - 1);
    let anchorTop;
    const isPureLeafColumn = clusterGroups.length === 1 && nodeTileCount === 0;
    if (isPureLeafColumn) {
      const parentId = clusterGroups[0].parentId;
      const parentPos = localPositions.get(parentId);
      const parentNode2 = nodeById.get(parentId);
      if (parentPos && parentNode2) {
        const parentCenterY =
          parentPos.y + sizeOf(parentNode2, mode2).height / 2;
        anchorTop = parentCenterY - span / 2;
      } else {
        anchorTop = live.reduce(
          (min2, entry) =>
            Math.min(min2, localPositions.get(entry.id)?.y ?? min2),
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

function createParentPlacementPlan(
  node2,
  parentNodes,
  primaryParent,
  children2,
  placedById,
  layerGap,
  siblingGap,
  mode2,
) {
  const size2 = sizeOf(node2, mode2);
  const maxParentRight = Math.max(
    ...parentNodes.map(
      (parent) =>
        getNodePosition(parent, mode2).x + sizeOf(parent, mode2).width,
    ),
  );
  const siblings2 = (children2.get(primaryParent.id) ?? [])
    .filter((childId) => childId !== node2.id)
    .map((childId) => placedById.get(childId))
    .filter((child) => Boolean(child));
  const itemWidth = Math.max(
    size2.width,
    ...siblings2.map((child) => sizeOf(child, mode2).width),
  );
  const itemHeight = Math.max(
    size2.height,
    ...siblings2.map((child) => sizeOf(child, mode2).height),
  );
  const parentCenterY = getNodePosition(primaryParent, mode2).y;
  const origin = {
    x: maxParentRight + layerGap,
    y: parentCenterY,
  };
  return {
    slotIndex: siblings2.length,
    placeAt: (slotIndex) =>
      placeWrappedItem(
        slotIndex,
        origin,
        itemWidth,
        itemHeight,
        siblingGap,
        layerGap,
      ),
  };
}

function P$4(e2, n2) {
  let t2 = Date.now();
  try {
    return n2();
  } finally {
    console.log(e2 + " time: " + (Date.now() - t2) + "ms");
  }
}

function M$4(e2, n2) {
  return n2();
}

function At$1(e2, n2) {
  (e2.nodes().forEach((t2) => {
    let r2 = e2.node(t2),
      o2 = n2.node(t2);
    r2 &&
      ((r2.x = o2.x),
      (r2.y = o2.y),
      (r2.order = o2.order),
      (r2.rank = o2.rank),
      n2.children(t2).length &&
        ((r2.width = o2.width), (r2.height = o2.height)));
  }),
    e2.edges().forEach((t2) => {
      let r2 = e2.edge(t2),
        o2 = n2.edge(t2);
      ((r2.points = o2.points),
        Object.hasOwn(o2, "x") && ((r2.x = o2.x), (r2.y = o2.y)));
    }),
    (e2.graph().width = n2.graph().width),
    (e2.graph().height = n2.graph().height));
}

function he$1(e2, n2 = {}) {
  let t2 = n2.debugTiming ? P$4 : M$4;
  return t2("layout", () => {
    let r2 = t2("  buildLayoutGraph", () => Xt$1(e2));
    return (
      t2("  runLayout", () => Dt$1(r2, t2, n2)),
      t2("  updateInputGraph", () => At$1(e2, r2)),
      r2
    );
  });
}

function dagreLayoutWorkflow(nodes, edges, options) {
  const nodeIdSet = new Set(nodes.map((n2) => n2.id));
  const direction = DIRECTION_MAP[options?.direction ?? "LR"] ?? "LR";
  const nodeSpacing = options?.spacing?.y ?? DEFAULT_NODE_SPACING;
  const layerSpacing = options?.spacing?.x ?? DEFAULT_LAYER_SPACING;
  const mode2 = options?.mode ?? CanvasMode.Workflow;
  const g2 = new z$4.Graph({
    directed: true,
  });
  g2.setGraph({
    rankdir: direction,
    // dagre's nodesep is the within-rank (same-layer) gap → maps to ELK's
    // elk.spacing.nodeNode. ranksep is the between-rank gap → maps to
    // elk.layered.spacing.nodeNodeBetweenLayers.
    nodesep: nodeSpacing,
    ranksep: layerSpacing,
    // network-simplex is dagre's tightest, highest-quality ranker (matches
    // the intent of ELK's NETWORK_SIMPLEX layering) and is still ~30x faster
    // than elkjs at this scale.
    ranker: "network-simplex",
  });
  g2.setDefaultEdgeLabel(() => ({}));
  const sizeById = new Map();
  for (const n2 of nodes) {
    sizeById.set(n2.id, sizeOf(n2, mode2));
  }
  for (let i2 = nodes.length - 1; i2 >= 0; i2--) {
    const n2 = nodes[i2];
    const sz = sizeById.get(n2.id) ?? DEFAULT_NODE_SIZE;
    g2.setNode(n2.id, {
      width: sz.width,
      height: sz.height,
    });
  }
  for (let i2 = edges.length - 1; i2 >= 0; i2--) {
    const e2 = edges[i2];
    if (nodeIdSet.has(e2.source) && nodeIdSet.has(e2.target)) {
      g2.setEdge(e2.source, e2.target);
    }
  }
  he$1(g2);
  const positions = new Map();
  for (const id2 of g2.nodes()) {
    const node2 = g2.node(id2);
    if (!node2) continue;
    const sz = sizeById.get(id2) ?? DEFAULT_NODE_SIZE;
    positions.set(id2, {
      x: node2.x - sz.width / 2,
      y: node2.y - sz.height / 2,
    });
  }
  return positions;
}

export class DagreLayout {
  name = "dagre";
  compute(_nodes, _edges, _options) {
    throw new Error("DagreLayout requires async execution; use computeAsync()");
  }
  computeIncremental(existingNodes, newNodes, edges, options) {
    if (newNodes.length === 0) return new Map();
    const mode2 = options?.mode ?? CanvasMode.Workflow;
    const layerGap = options?.spacing?.x ?? DEFAULT_INCREMENTAL_LAYER_SPACING;
    const siblingGap = options?.spacing?.y ?? DEFAULT_INCREMENTAL_NODE_SPACING;
    const originalOrder = new Map(
      newNodes.map((node2, index2) => [node2.id, index2]),
    );
    const allNodeIds = new Set([
      ...existingNodes.map((node2) => node2.id),
      ...newNodes.map((node2) => node2.id),
    ]);
    const { children: children2, parents } = buildAdjacency(allNodeIds, edges);
    const levels = topoSortLevels(allNodeIds, children2, parents);
    const orderedNewNodes = [...newNodes].sort((a2, b3) => {
      const levelDiff = (levels.get(a2.id) ?? 0) - (levels.get(b3.id) ?? 0);
      if (levelDiff !== 0) return levelDiff;
      return (originalOrder.get(a2.id) ?? 0) - (originalOrder.get(b3.id) ?? 0);
    });
    const placedById = new Map(existingNodes.map((node2) => [node2.id, node2]));
    const occupied = existingNodes.map((n2) => nodeToRect(n2, mode2));
    const positions = new Map();
    for (const node2 of orderedNewNodes) {
      const parentNodes = (parents.get(node2.id) ?? [])
        .map((parentId) => placedById.get(parentId))
        .filter((parent) => Boolean(parent));
      const position2 = this.placeIncrementalNode({
        node: node2,
        parentNodes,
        primaryParent: pickPrimaryParent(parentNodes, mode2),
        children: children2,
        placedById,
        occupied,
        layerGap,
        siblingGap,
        mode: mode2,
      });
      positions.set(node2.id, position2);
      const placedNode = {
        ...node2,
        positions: {
          ...node2.positions,
        },
      };
      setNodePosition(placedNode, mode2, position2);
      placedById.set(node2.id, placedNode);
      occupied.push(nodeToRect(placedNode, mode2));
    }
    return positions;
  }
  async computeAsync(nodes, edges, options) {
    if (nodes.length === 0) return new Map();
    const mode2 = options?.mode ?? CanvasMode.Workflow;
    const nodeSpacing = options?.spacing?.y ?? DEFAULT_NODE_SPACING;
    const layerSpacing = options?.spacing?.x ?? DEFAULT_LAYER_SPACING;
    const nodeIdSet = new Set(nodes.map((n2) => n2.id));
    const relevantEdges = edges.filter(
      (e2) => nodeIdSet.has(e2.source) && nodeIdSet.has(e2.target),
    );
    const components2 = findConnectedComponents(nodeIdSet, relevantEdges);
    const edgeNodeIds = new Set();
    for (const e2 of relevantEdges) {
      edgeNodeIds.add(e2.source);
      edgeNodeIds.add(e2.target);
    }
    const nodeById = new Map(nodes.map((n2) => [n2.id, n2]));
    const workflows = [];
    const discreteNodes = [];
    for (const comp of components2) {
      const hasEdge = comp.some((id2) => edgeNodeIds.has(id2));
      if (hasEdge) {
        const compSet = new Set(comp);
        workflows.push({
          ids: compSet,
          nodes: comp.map((id2) => nodeById.get(id2)),
          edges: relevantEdges.filter(
            (e2) => compSet.has(e2.source) && compSet.has(e2.target),
          ),
        });
      } else {
        for (const id2 of comp) {
          const node2 = nodeById.get(id2);
          if (node2) discreteNodes.push(node2);
        }
      }
    }
    const depthByWorkflow = new Map();
    for (const wf of workflows) {
      depthByWorkflow.set(wf.ids, maxTopoDepth(wf.ids, wf.edges));
    }
    workflows.sort((a2, b3) => {
      const depthA = depthByWorkflow.get(a2.ids) ?? 0;
      const depthB = depthByWorkflow.get(b3.ids) ?? 0;
      if (depthB !== depthA) return depthB - depthA;
      return b3.nodes.length - a2.nodes.length;
    });
    const positions = new Map();
    const laidOut = workflows.map((wf) => {
      const localPositions = dagreLayoutWorkflow(wf.nodes, wf.edges, options);
      normalizeLayerSpacing(
        localPositions,
        wf.nodes,
        options,
        nodeSpacing,
        mode2,
      );
      rewrapLeafFanOuts(
        localPositions,
        wf.nodes,
        wf.edges,
        nodeById,
        layerSpacing,
        nodeSpacing,
        mode2,
        options?.direction ?? "LR",
      );
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const [id2, pos] of localPositions) {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        const node2 = nodeById.get(id2);
        const sz = node2
          ? sizeOf(node2, mode2)
          : {
              width: 0,
              height: 0,
            };
        maxX = Math.max(maxX, pos.x + sz.width);
        maxY = Math.max(maxY, pos.y + sz.height);
      }
      const bboxHeight = Number.isFinite(maxY - minY) ? maxY - minY : 0;
      const bboxWidth = Number.isFinite(maxX - minX) ? maxX - minX : 0;
      return {
        localPositions,
        minX,
        minY,
        bboxHeight,
        bboxWidth,
      };
    });
    const clusterArrangement = options?.clusterArrangement;
    const colGap = options?.spacing?.y ?? nodeSpacing;
    const rowGap = options?.spacing?.x ?? nodeSpacing;
    if (clusterArrangement === "grid") {
      const packTilesIntoGrid2 = (tiles, originY) => {
        if (tiles.length === 0) return 0;
        const cols = Math.max(1, Math.round(Math.sqrt(tiles.length)));
        const rows = Math.ceil(tiles.length / cols);
        const colWidths = new Array(cols).fill(0);
        const rowHeights = new Array(rows).fill(0);
        tiles.forEach((t2, i2) => {
          const c3 = i2 % cols;
          const r2 = Math.floor(i2 / cols);
          if (t2.width > colWidths[c3]) colWidths[c3] = t2.width;
          if (t2.height > rowHeights[r2]) rowHeights[r2] = t2.height;
        });
        const colX = new Array(cols).fill(0);
        for (let c3 = 1; c3 < cols; c3++)
          colX[c3] = colX[c3 - 1] + colWidths[c3 - 1] + rowGap;
        const rowYLocal = new Array(rows).fill(0);
        for (let r2 = 1; r2 < rows; r2++)
          rowYLocal[r2] = rowYLocal[r2 - 1] + rowHeights[r2 - 1] + colGap;
        tiles.forEach((t2, i2) => {
          const c3 = i2 % cols;
          const r2 = Math.floor(i2 / cols);
          t2.place(colX[c3], originY + rowYLocal[r2]);
        });
        return rowYLocal[rows - 1] + rowHeights[rows - 1];
      };
      const workflowTiles = laidOut.map(
        ({ localPositions, minX, minY, bboxWidth, bboxHeight }) => ({
          width: bboxWidth,
          height: bboxHeight,
          place: (originX, originY) => {
            for (const [id2, pos] of localPositions) {
              positions.set(id2, {
                x: pos.x - minX + originX,
                y: pos.y - minY + originY,
              });
            }
          },
        }),
      );
      const discreteTiles = discreteNodes.map((node2) => {
        const sz = sizeOf(node2, mode2);
        return {
          width: sz.width,
          height: sz.height,
          place: (originX, originY) =>
            positions.set(node2.id, {
              x: originX,
              y: originY,
            }),
        };
      });
      const wfHeight = packTilesIntoGrid2(workflowTiles, 0);
      const discreteOriginY = wfHeight > 0 ? wfHeight + colGap : 0;
      packTilesIntoGrid2(discreteTiles, discreteOriginY);
    } else {
      let workflowMaxBottom = 0;
      if (clusterArrangement === "horizontal") {
        let cursorX = 0;
        for (const { localPositions, minX, minY, bboxWidth } of laidOut) {
          for (const [id2, pos] of localPositions) {
            positions.set(id2, {
              x: pos.x - minX + cursorX,
              y: pos.y - minY,
            });
          }
          cursorX += bboxWidth + rowGap;
        }
        for (const { bboxHeight } of laidOut) {
          workflowMaxBottom = Math.max(workflowMaxBottom, bboxHeight);
        }
      } else {
        let cursorY = 0;
        for (const { localPositions, minX, minY, bboxHeight } of laidOut) {
          for (const [id2, pos] of localPositions) {
            positions.set(id2, {
              x: pos.x - minX,
              y: pos.y - minY + cursorY,
            });
          }
          cursorY += bboxHeight + nodeSpacing;
        }
        workflowMaxBottom = cursorY;
      }
      if (discreteNodes.length > 0) {
        if (clusterArrangement === "vertical") {
          let stackY = workflowMaxBottom + (workflowMaxBottom > 0 ? colGap : 0);
          for (const node2 of discreteNodes) {
            positions.set(node2.id, {
              x: 0,
              y: stackY,
            });
            stackY += sizeOf(node2, mode2).height + colGap;
          }
        } else if (clusterArrangement === "horizontal") {
          let stackX = 0;
          const rowYPos =
            workflowMaxBottom + (workflowMaxBottom > 0 ? colGap : 0);
          for (const node2 of discreteNodes) {
            positions.set(node2.id, {
              x: stackX,
              y: rowYPos,
            });
            stackX += sizeOf(node2, mode2).width + rowGap;
          }
        } else {
          const gridLayout = new GridSlotLayout();
          const gridPositions = gridLayout.compute(discreteNodes, [], options);
          for (const [id2, pos] of gridPositions) {
            positions.set(id2, {
              x: pos.x,
              y: pos.y + workflowMaxBottom,
            });
          }
        }
      }
    }
    let finalMinX = Number.POSITIVE_INFINITY;
    let finalMinY = Number.POSITIVE_INFINITY;
    for (const pos of positions.values()) {
      finalMinX = Math.min(finalMinX, pos.x);
      finalMinY = Math.min(finalMinY, pos.y);
    }
    if (
      Number.isFinite(finalMinX) &&
      Number.isFinite(finalMinY) &&
      (finalMinX !== 0 || finalMinY !== 0)
    ) {
      for (const [id2, pos] of positions) {
        positions.set(id2, {
          x: pos.x - finalMinX,
          y: pos.y - finalMinY,
        });
      }
    }
    return positions;
  }
  placeIncrementalNode({
    node: node2,
    parentNodes,
    primaryParent,
    children: children2,
    placedById,
    occupied,
    layerGap,
    siblingGap,
    mode: mode2,
  }) {
    const parentPlan =
      parentNodes.length > 0 && primaryParent
        ? createParentPlacementPlan(
            node2,
            parentNodes,
            primaryParent,
            children2,
            placedById,
            layerGap,
            siblingGap,
            mode2,
          )
        : void 0;
    const size2 = sizeOf(node2, mode2);
    if (!parentPlan) {
      const gap = siblingGap;
      return findFreePositionForRects(occupied, size2, {
        gap,
      });
    }
    let nextPosition = parentPlan.placeAt(parentPlan.slotIndex);
    const candidate = {
      x: nextPosition.x,
      y: nextPosition.y,
      w: size2.width,
      h: size2.height,
    };
    for (let attempt = 0; attempt < MAX_INCREMENTAL_SHIFT_ATTEMPTS; attempt++) {
      const blocker = occupied.find((rect) =>
        rectsOverlap(candidate, rect, INCREMENTAL_COLLISION_MARGIN),
      );
      if (!blocker) break;
      parentPlan.slotIndex += 1;
      nextPosition = parentPlan.placeAt(parentPlan.slotIndex);
      candidate.x = nextPosition.x;
      candidate.y = nextPosition.y;
    }
    return {
      x: candidate.x,
      y: candidate.y,
    };
  }
}
