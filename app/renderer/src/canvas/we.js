// we.js
import { p$4 as p, R$4 as R } from "../vendor.js";
import { S, V, v$4 } from "./layout-category-lanes.js";
function xe(e2) {
  let n2 = new p().setGraph(e2.graph());
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
var { preorder: Zn, postorder: et } = R;
function Be(e2, n2, t2, r2, o2) {
  let i2 = t2,
    s2 = e2.node(r2);
  n2[r2] = true;
  let a2 = e2.neighbors(r2);
  return (
    a2 &&
      a2.forEach((d2) => {
        Object.hasOwn(n2, d2) || (t2 = Be(e2, n2, t2, d2, r2));
      }),
    (s2.low = i2),
    (s2.lim = t2++),
    o2 ? (s2.parent = o2) : delete s2.parent,
    t2
  );
}
function ee(e2, n2) {
  (arguments.length < 2 && (n2 = e2.nodes()[0]), Be(e2, {}, 1, n2));
}
function Ye(e2) {
  return e2.edges().find((n2) => e2.edge(n2).cutvalue < 0);
}
function tt(e2, n2) {
  let t2 = e2.nodes().find((o2) => !e2.node(o2).parent);
  if (!t2) return;
  let r2 = Zn(e2, [t2]);
  ((r2 = r2.slice(1)),
    r2.forEach((o2) => {
      let s2 = e2.node(o2).parent,
        a2 = n2.edge(o2, s2),
        d2 = false;
      (a2 || ((a2 = n2.edge(s2, o2)), (d2 = true)),
        (n2.node(o2).rank = n2.node(s2).rank + (d2 ? a2.minlen : -a2.minlen)));
    }));
}
function rt(e2, n2, t2) {
  return e2.hasEdge(n2, t2);
}
function We(e2, n2, t2) {
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
          if (((a2 += h2 ? f2 : -f2), rt(e2, t2, c3))) {
            let b3 = e2.edge(t2, c3).cutvalue;
            a2 += h2 ? -b3 : b3;
          }
        }
      }),
    a2
  );
}
function nt(e2, n2, t2) {
  let o2 = e2.node(t2).parent,
    i2 = e2.edge(t2, o2);
  i2.cutvalue = We(e2, n2, t2);
}
function Z(e2, n2) {
  let t2 = et(e2, e2.nodes());
  ((t2 = t2.slice(0, t2.length - 1)), t2.forEach((r2) => nt(e2, n2, r2)));
}
function He(e2, n2, t2, r2) {
  let o2 = t2.v,
    i2 = t2.w;
  (e2.removeEdge(o2, i2),
    e2.setEdge(r2.v, r2.w, {}),
    ee(e2),
    Z(e2, n2),
    tt(e2, n2));
}
function Ae(e2, n2, t2) {
  return t2.low <= n2.lim && n2.lim <= t2.lim;
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
      .filter(
        (u4) =>
          d2 === Ae(e2, e2.node(u4.v), a2) && d2 !== Ae(e2, e2.node(u4.w), a2),
      )
      .reduce((u4, c3) => (v$4(n2, c3) < v$4(n2, u4) ? c3 : u4))
  );
}
x.initLowLimValues = ee;
x.initCutValues = Z;
x.calcCutValue = We;
x.leaveEdge = Ye;
x.enterEdge = ze;
x.exchangeEdges = He;
function x(e2) {
  ((e2 = xe(e2)), S(e2));
  let n2 = V(e2);
  (ee(n2), Z(n2, e2));
  let t2, r2;
  for (; (t2 = Ye(n2));) ((r2 = ze(n2, e2, t2)), He(n2, e2, t2, r2));
}
var Ve = x;
export function qe(e2) {
  Ve(e2);
}
