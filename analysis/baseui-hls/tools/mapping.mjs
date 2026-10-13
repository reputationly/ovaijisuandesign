// 逐声明 mapping：闭包每条声明 → 选定版本里对应的 npm dist 声明（文件:行）+ 判定
// 用法：node mapping.mjs <family> <out.json> <pkg@ver> [<pkg@ver> ...]
import { readFileSync, writeFileSync } from "node:fs";
const R = "/home/ubuntu/baseui-hls-analysis/";
const [fam, out, ...vers] = process.argv.slice(2);
const closure = JSON.parse(readFileSync(R + `closure-${fam}.json`));
const rank = { exact: 3, norm: 2, diff: 1, missing: 0 };
const idx = vers.map((pv) => {
  const at = pv.lastIndexOf("@"); const pkg = pv.slice(0, at), v = pv.slice(at + 1);
  const j = JSON.parse(readFileSync(R + `index/${pkg.replace("/", "__")}@${v}.json`));
  const byName = new Map(); for (const d of j.decls) for (const n of d.names) { if (!byName.has(n)) byName.set(n, []); byName.get(n).push(d); }
  return { pkg, v, decls: j.decls, byName };
});
const rows = closure.map((s, i) => {
  const per = [];
  for (const r of idx) {
    if (!s.owners.includes(r.pkg)) continue;
    let cs = s.names.flatMap((n) => r.byName.get(n) || []);
    if (!s.names.length) cs = r.decls.filter((d) => !d.names.length && (d.A === s.A || d.N === s.N));
    const cls = (d) => (d.A === s.A ? "exact" : d.N === s.N ? "norm" : "diff");
    const m = cs.map((d) => ({ d, c: cls(d) })).sort((a, b) => rank[b.c] - rank[a.c]);
    per.push(m.length ? { pkg: r.pkg, version: r.v, verdict: m[0].c, npmFile: m[0].d.file, npmLine: m[0].d.line, otherCandidates: m.length - 1 }
                      : { pkg: r.pkg, version: r.v, verdict: "missing", npmFile: null, npmLine: null, otherCandidates: 0 });
  }
  per.sort((a, b) => rank[b.verdict] - rank[a.verdict]);
  const best = per[0] || { verdict: "n/a" };
  return { i, srcFile: s.file, srcLine: s.line, names: s.names, rawNames: s.rawNames, type: s.type, how: s.how, bestSim: s.bestSim, owners: s.owners,
    verdict: best.verdict, npmPkg: best.pkg ?? null, npmVersion: best.version ?? null, npmFile: best.npmFile ?? null, npmLine: best.npmLine ?? null, perPackage: per };
});
writeFileSync(out, JSON.stringify(rows, null, 1));
const cnt = {}; for (const r of rows) cnt[r.verdict] = (cnt[r.verdict] || 0) + 1;
console.log(out, rows.length, JSON.stringify(cnt));
