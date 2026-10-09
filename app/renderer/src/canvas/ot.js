// ot.js

var Ie = 65535;

function Dn$1(e2, n2 = Ie) {
  let t2 = [];
  for (let r2 = 0; r2 < e2.length; r2 += n2) {
    let o2 = e2.slice(r2, r2 + n2);
    t2.push(o2);
  }
  return t2;
}

export function L$4(e2, n2) {
  if (n2.length > Ie) {
    let t2 = Dn$1(n2);
    return e2(...t2.map((r2) => e2(...r2)));
  } else return e2(...n2);
}

function Re(e2, n2) {
  return e2.reduce((t2, r2, o2) => ((t2[r2] = n2[o2]), t2), {});
}

export function dt$2(e2, n2, t2, r2) {
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

export function en$3(e2) {
  let n2 = e2.width;
  ((e2.width = e2.height), (e2.height = n2));
}

export function ne$2(e2) {
  e2.y = -e2.y;
}

export function te$2(e2) {
  let n2 = e2.x;
  ((e2.x = e2.y), (e2.y = n2));
}

export function mt(e2, n2, t2) {
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
      for (; u4 > 0;)
        (u4 % 2 && (c3 += a2[u4 + 1]),
          (u4 = (u4 - 1) >> 1),
          (a2[u4] += l2.weight));
      d2 += l2.weight * c3;
    }),
    d2
  );
}

export function le$1(e2, n2, t2) {
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

function xt$1(e2, n2) {
  if (e2.node(n2).dummy) {
    let t2 = e2.predecessors(n2);
    if (t2) return t2.find((r2) => e2.node(r2).dummy);
  }
}

export function dn$2(e2, n2, t2) {
  if (n2 > t2) {
    let o2 = n2;
    ((n2 = t2), (t2 = o2));
  }
  let r2 = e2[n2];
  (r2 || (e2[n2] = r2 = {}), (r2[t2] = true));
}

export function vt(e2, n2) {
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
                (y4 < s2 || f2 < y4) &&
                  !(E3.dummy && e2.node(g2).dummy) &&
                  dn$2(t2, m3, g2);
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

function Tt(e2, n2, t2) {
  if (n2 > t2) {
    let o2 = n2;
    ((n2 = t2), (t2 = o2));
  }
  let r2 = e2[n2];
  return r2 !== void 0 && Object.hasOwn(r2, t2);
}

export function Ot(e2, n2, t2, r2) {
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
              E3 !== void 0 &&
                ((i2[b3] = l2), (i2[l2] = o2[l2] = E3), (d2 = m3));
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

function St$1(e2, n2) {
  return e2.node(n2).width;
}

export function Rt$1(e2, n2) {
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
