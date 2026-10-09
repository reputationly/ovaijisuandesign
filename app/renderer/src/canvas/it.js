// it.js
import { p$4 as p } from "../vendor.js";
function jt(e2, n2, t2) {
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
function Ct(e2, n2, t2, r2) {
  let o2 = new p(),
    i2 = e2.graph(),
    s2 = jt(i2.nodesep, i2.edgesep, r2);
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
export function It(e2, n2, t2, r2, o2 = false) {
  let i2 = {},
    s2 = Ct(e2, n2, t2, o2),
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
        return Math.min(
          E3,
          (I2 !== void 0 ? I2 : 0) - (be2 !== void 0 ? be2 : 0),
        );
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
