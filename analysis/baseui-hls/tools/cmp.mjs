import { readFileSync } from "node:fs";
const R = "/home/ubuntu/baseui-hls-analysis/";
const closure = JSON.parse(readFileSync(R + "closure-baseui.json"));
const per = JSON.parse(readFileSync(R + "perstmt-baseui.json"));
const m = (k) => new Map(per[k]);
const show = (i) => `${closure[i].file}:${closure[i].line} ${closure[i].names.join(",")}`;
// utils 0.2.6 vs 0.2.7 vs 0.2.8
const u6 = m("@base-ui/utils@0.2.6"), u7 = m("@base-ui/utils@0.2.7"), u8 = m("@base-ui/utils@0.2.8"), u9 = m("@base-ui/utils@0.2.9");
console.log("== utils 不同分类");
for (const [i, c] of u6) if (c !== u7.get(i) || c !== u8.get(i) || c !== u9.get(i)) console.log(" ", show(i), "0.2.6", c, "0.2.7", u7.get(i), "0.2.8", u8.get(i), "0.2.9", u9.get(i));
console.log("== utils 0.2.7 非 exact");
for (const [i, c] of u7) if (c !== "exact") console.log(" ", show(i), c, "react1.3.0:", m("@base-ui/react@1.3.0").get(i));
// floating-ui/react 独有命中
const baseKeys = Object.keys(per).filter((k) => /^@base-ui/.test(k));
const fuKeys = Object.keys(per).filter((k) => k.startsWith("@floating-ui/react@"));
const baseHit = new Set(); for (const k of baseKeys) for (const [i, c] of per[k]) if (c === "exact" || c === "norm") baseHit.add(i);
const fuOnly = new Map(); for (const k of fuKeys) for (const [i, c] of per[k]) if ((c === "exact" || c === "norm") && !baseHit.has(i)) { if (!fuOnly.has(i)) fuOnly.set(i, []); fuOnly.get(i).push(k.split("@")[2]); }
console.log("== 只在 @floating-ui/react 命中、任何 base-ui 版本都不命中:", fuOnly.size);
for (const [i, vs] of fuOnly) console.log(" ", show(i), vs.length, vs[0], "..", vs[vs.length - 1]);
for (const k of ["tabbable@6.4.0", "reselect@5.1.1"]) for (const [i, c] of per[k] || []) console.log("==", k, show(i), c);
// react 1.3.0 diff/missing 在其它版本中是否命中
const r13 = m("@base-ui/react@1.3.0");
const rk = Object.keys(per).filter((k) => /^@base-ui(-components)?\/react@/.test(k));
console.log("== react 1.3.0 非 exact/norm，及其在其它版本中命中");
for (const [i, c] of r13) if (c === "diff" || c === "missing") {
  const hits = rk.filter((k) => { const x = new Map(per[k]).get(i); return x === "exact" || x === "norm"; }).map((k) => k.replace(/^@base-ui(-components)?\/react@/, ""));
  const u = u7.get(i);
  console.log(" ", c, show(i), "| 其它版本命中:", hits.join(" ") || "-", u ? "| utils0.2.7:" + u : "");
}
