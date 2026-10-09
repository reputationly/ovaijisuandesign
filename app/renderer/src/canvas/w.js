// w.js
import { T } from "./layout-category-lanes.js";
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
function ie(e2, n2 = []) {
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
function Et(e2) {
  let n2 = [];
  function t2(o2) {
    return (i2) => {
      i2.merged ||
        ((i2.barycenter === void 0 ||
          o2.barycenter === void 0 ||
          i2.barycenter >= o2.barycenter) &&
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
  return n2
    .filter((o2) => !o2.merged)
    .map((o2) => T(o2, ["vs", "i", "barycenter", "weight"]));
}
function se(e2, n2) {
  let t2 = {};
  (e2.forEach((o2, i2) => {
    let s2 = {
      indegree: 0,
      in: [],
      out: [],
      vs: [o2.v],
      i: i2,
    };
    (o2.barycenter !== void 0 &&
      ((s2.barycenter = o2.barycenter), (s2.weight = o2.weight)),
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
function on(e2, n2, t2) {
  let r2;
  for (; n2.length && (r2 = n2[n2.length - 1]).i <= t2;)
    (n2.pop(), e2.push(r2.vs), t2++);
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
function ae(e2, n2) {
  let t2 = Ce(e2, (u4) => Object.hasOwn(u4, "barycenter")),
    r2 = t2.lhs,
    o2 = t2.rhs.sort((u4, c3) => c3.i - u4.i),
    i2 = [],
    s2 = 0,
    a2 = 0,
    d2 = 0;
  (r2.sort(yt2(!!n2)),
    (d2 = on(i2, o2, d2)),
    r2.forEach((u4) => {
      ((d2 += u4.vs.length),
        i2.push(u4.vs),
        (s2 += u4.barycenter * u4.weight),
        (a2 += u4.weight),
        (d2 = on(i2, o2, d2)));
    }));
  let l2 = {
    vs: i2.flat(1),
  };
  return (a2 && ((l2.barycenter = s2 / a2), (l2.weight = a2)), l2);
}
function wt(e2, n2) {
  e2.forEach((t2) => {
    t2.vs = t2.vs.flatMap((r2) => (n2[r2] ? n2[r2].vs : r2));
  });
}
function Nt(e2, n2) {
  e2.barycenter !== void 0
    ? ((e2.barycenter =
        (e2.barycenter * e2.weight + n2.barycenter * n2.weight) /
        (e2.weight + n2.weight)),
      (e2.weight += n2.weight))
    : ((e2.barycenter = n2.barycenter), (e2.weight = n2.weight));
}
export function W(e2, n2, t2, r2) {
  let o2 = e2.children(n2),
    i2 = e2.node(n2),
    s2 = i2 ? i2.borderLeft : void 0,
    a2 = i2 ? i2.borderRight : void 0,
    d2 = {};
  s2 && (o2 = o2.filter((h2) => h2 !== s2 && h2 !== a2));
  let l2 = ie(e2, o2);
  l2.forEach((h2) => {
    if (e2.children(h2.v).length) {
      let f2 = W(e2, h2.v, t2, r2);
      ((d2[h2.v] = f2), Object.hasOwn(f2, "barycenter") && Nt(h2, f2));
    }
  });
  let u4 = se(l2, t2);
  wt(u4, d2);
  let c3 = ae(u4, r2);
  if (s2 && a2) {
    c3.vs = [s2, c3.vs, a2].flat(1);
    let h2 = e2.predecessors(s2);
    if (h2 && h2.length) {
      let f2 = e2.node(h2[0]),
        g2 = e2.predecessors(a2),
        b3 = e2.node(g2[0]);
      (Object.hasOwn(c3, "barycenter") ||
        ((c3.barycenter = 0), (c3.weight = 0)),
        (c3.barycenter =
          (c3.barycenter * c3.weight + f2.order + b3.order) / (c3.weight + 2)),
        (c3.weight += 2));
    }
  }
  return c3;
}
