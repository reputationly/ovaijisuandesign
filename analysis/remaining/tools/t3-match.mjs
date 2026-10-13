// 任务 3 匹配：src 顶层函数/类声明 对 npm 已安装包声明，按形状哈希（精确）和粗哈希（字面量抹平）匹配；
// 短声明 / 多包撞车的通用声明，要求同文件相邻声明（±3）也命中同一个包才算数。
import fs from "node:fs";
const D = "/home/ubuntu/wt-analysis/analysis/remaining/scan/";
const read = (f) => fs.readFileSync(D + f, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => !r.err);
const npm = read("npm-index.jsonl"), src = read("src-index.jsonl");
const byH = new Map(), byC = new Map();
for (const r of npm) { (byH.get(r.h) || byH.set(r.h, []).get(r.h)).push(r); (byC.get(r.c) || byC.set(r.c, []).get(r.c)).push(r); }
const pname = (id) => id.replace(/@[^@]+$/, "");
const SHORT = 150, GENERIC_PKGS = 5;
const files = new Map(); for (const r of src) (files.get(r.f) || files.set(r.f, []).get(r.f)).push(r);
const rows = [];
for (const [f, list] of files) {
  list.sort((a, b) => a.o - b.o);
  const info = list.map((r) => {
    const ex = byH.get(r.h) || [], co = (byC.get(r.c) || []).filter((x) => x.h !== r.h);
    const hits = ex.length ? ex : co;
    const pk = new Map(); for (const h of hits) { const n = pname(h.p); (pk.get(n) || pk.set(n, new Set()).get(n)).add(h.p.slice(n.length + 1)); }
    const generic = hits.length && (r.k < SHORT || pk.size > GENERIC_PKGS);
    return { r, exact: ex.length > 0, hits, pk, generic };
  });
  const strong = (i) => info[i] && info[i].hits.length && !info[i].generic;
  for (let i = 0; i < info.length; i++) {
    const x = info[i]; if (!x.hits.length) continue;
    let ok = !x.generic, ctxPk = null;
    if (!ok) for (let j = Math.max(0, i - 3); j <= Math.min(info.length - 1, i + 3); j++) {
      if (j === i || !strong(j)) continue;
      const common = [...x.pk.keys()].filter((p) => info[j].pk.has(p)); if (common.length) { ok = true; ctxPk = common; break; }
    }
    const pk = ctxPk ? new Map(ctxPk.map((p) => [p, x.pk.get(p)])) : x.pk;
    rows.push({ file: f, decl: x.r.n, line: x.r.l, bytes: x.r.b, exact: x.exact, generic: !!x.generic, accepted: ok, packages: Object.fromEntries([...pk].map(([p, v]) => [p, [...v].sort()])),
      npmDecl: x.hits.slice(0, 3).map((h) => `${h.p}/${h.f}#${h.n}`) });
  }
}
fs.writeFileSync(D + "matches-all.json", JSON.stringify(rows, null, 1));
const acc = rows.filter((r) => r.accepted);
const sum = {}; for (const r of acc) for (const p of Object.keys(r.packages)) { const s = (sum[p] ??= { decls: 0, exact: 0, bytes: 0, files: new Set(), versions: new Set() }); s.decls++; if (r.exact) s.exact++; s.bytes += r.bytes; s.files.add(r.file); r.packages[p].forEach((v) => s.versions.add(v)); }
const sumOut = Object.entries(sum).map(([p, s]) => ({ pkg: p, decls: s.decls, exact: s.exact, bytes: s.bytes, files: [...s.files].sort(), versions: [...s.versions] })).sort((a, b) => b.bytes - a.bytes);
fs.writeFileSync(D + "matches-accepted.json", JSON.stringify(acc, null, 1));
fs.writeFileSync(D + "summary-by-package.json", JSON.stringify(sumOut, null, 1));
console.log("src decls", src.length, "with hits", rows.length, "accepted", acc.length, "rejected(generic, no ctx)", rows.length - acc.length);
for (const s of sumOut) console.log(s.pkg.padEnd(36), "decls", s.decls, "exact", s.exact, "bytes", s.bytes, "files", s.files.length, s.files.slice(0, 4).join(","), "| v", s.versions.slice(0, 6).join(","));
