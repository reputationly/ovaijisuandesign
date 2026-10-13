// 无匹配声明的同名归属：npm 索引里同名声明所在的包（非压缩库名字保留），结合邻居投票
import fs from "node:fs";
const R = "/home/ubuntu/wt-analysis/analysis/remaining/vendor-residual/";
const rows = JSON.parse(fs.readFileSync(R + "decls.json", "utf8"));
const npm = fs.readFileSync(R + "scan/npm-index-all.jsonl", "utf8").trim().split("\n").map((l) => JSON.parse(l));
const pname = (id) => id.replace(/@[^@]+$/, "");
const byName = new Map(); for (const r of npm) { if (!r.n || r.n.length < 4) continue; (byName.get(r.n) || byName.set(r.n, new Set()).get(r.n)).add(pname(r.p)); }
const strip = (n) => n.replace(/\$\d*$/, "").replace(/\$\d+$/, "");
const out = [];
for (const r of rows) {
  if (r.status !== "none") continue;
  const s = byName.get(strip(r.name)); const c = s && s.size <= 4 ? [...s] : [];
  out.push({ line: r.line, name: r.name, bytes: r.bytes, sameName: c });
}
fs.writeFileSync(R + "none-samename.json", JSON.stringify(out, null, 1));
const agg = {}; for (const x of out) for (const p of x.sameName) { const a = (agg[p] ??= { n: 0, b: 0, names: [] }); a.n++; a.b += x.bytes; if (a.names.length < 8) a.names.push(x.name + "@L" + x.line); }
for (const [p, a] of Object.entries(agg).sort((x, y) => y[1].b - x[1].b).slice(0, 40)) console.log(p.padEnd(32), a.n, a.b, a.names.join(" "));
console.log("none with no same-name", out.filter((x) => !x.sameName.length).length, out.filter((x) => !x.sameName.length).reduce((a, x) => a + x.bytes, 0));
