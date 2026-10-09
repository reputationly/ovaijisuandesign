// q.js
import {
  A,
  c2,
  f,
  g,
  h,
} from "./build-inspiration-media-showcase-collections.js";
import { d, U } from "../vendor.js";
var In = (n2, r2) => {
  for (let e2 = r2; e2 < n2.length; e2 += 1) {
    if (n2[e2] === ")") return true;
    if (
      n2[e2] ===
      `
`
    )
      return false;
  }
  return false;
};
var m2 = (n2, r2) => {
  for (let e2 = r2 - 1; e2 >= 0; e2 -= 1) {
    if (n2[e2] === ")") return false;
    if (n2[e2] === "(")
      return e2 > 0 && n2[e2 - 1] === "]" ? In(n2, r2) : false;
    if (
      n2[e2] ===
      `
`
    )
      return false;
  }
  return false;
};
var z2 = (n2, r2) => {
  for (let e2 = r2 - 1; e2 >= 0; e2 -= 1) {
    if (n2[e2] === ">") return false;
    if (n2[e2] === "<") {
      let i2 = e2 + 1 < n2.length ? n2[e2 + 1] : "";
      return (i2 >= "a" && i2 <= "z") || (i2 >= "A" && i2 <= "Z") || i2 === "/";
    }
    if (
      n2[e2] ===
      `
`
    )
      return false;
  }
  return false;
};
var bn = (n2, r2, e2, i2) =>
  !!(
    e2 === "\\" ||
    (n2.includes("$") && h(n2, r2)) ||
    m2(n2, r2) ||
    z2(n2, r2) ||
    e2 === "_" ||
    i2 === "_" ||
    (e2 && i2 && g(e2) && g(i2))
  );
var Tn = (n2) => {
  let r2 = 0,
    e2 = false,
    i2 = n2.length;
  for (let s2 = 0; s2 < i2; s2 += 1) {
    if (
      n2[s2] === "`" &&
      s2 + 2 < i2 &&
      n2[s2 + 1] === "`" &&
      n2[s2 + 2] === "`"
    ) {
      ((e2 = !e2), (s2 += 2));
      continue;
    }
    if (e2 || n2[s2] !== "_") continue;
    let o2 = s2 > 0 ? n2[s2 - 1] : "",
      t2 = s2 < i2 - 1 ? n2[s2 + 1] : "";
    bn(n2, s2, o2, t2) || (r2 += 1);
  }
  return r2;
};
var q = (n2) => {
  let r2 = false;
  for (let e2 = 0; e2 < n2.length; e2 += 1) {
    if (
      n2[e2] === "`" &&
      e2 + 2 < n2.length &&
      n2[e2 + 1] === "`" &&
      n2[e2 + 2] === "`"
    ) {
      ((r2 = !r2), (e2 += 2));
      continue;
    }
    if (
      !r2 &&
      n2[e2] === "_" &&
      n2[e2 - 1] !== "_" &&
      n2[e2 + 1] !== "_" &&
      n2[e2 - 1] !== "\\" &&
      !h(n2, e2) &&
      !m2(n2, e2)
    ) {
      let i2 = e2 > 0 ? n2[e2 - 1] : "",
        s2 = e2 < n2.length - 1 ? n2[e2 + 1] : "";
      if (i2 && s2 && g(i2) && g(s2)) continue;
      return e2;
    }
  }
  return -1;
};
var _n = (n2) => {
  let r2 = n2.length;
  for (
    ;
    r2 > 0 &&
    n2[r2 - 1] ===
      `
`;
  )
    r2 -= 1;
  if (r2 < n2.length) {
    let e2 = n2.slice(0, r2),
      i2 = n2.slice(r2);
    return `${e2}_${i2}`;
  }
  return `${n2}_`;
};
var Pn = (n2) => {
  if (!n2.endsWith("**")) return null;
  let r2 = n2.slice(0, -2);
  if (A(r2) % 2 !== 1) return null;
  let i2 = r2.indexOf("**"),
    s2 = q(r2);
  return i2 !== -1 && s2 !== -1 && i2 < s2 ? `${r2}_**` : null;
};
export var J2 = (n2) => {
  if (!n2.match(U)) return n2;
  let e2 = q(n2);
  if (e2 === -1) return n2;
  let i2 = n2.substring(e2 + 1);
  if (!i2 || d.test(i2) || c2(n2, e2) || f(n2, e2)) return n2;
  if (Tn(n2) % 2 === 1) {
    let o2 = Pn(n2);
    return o2 !== null ? o2 : _n(n2);
  }
  return n2;
};
