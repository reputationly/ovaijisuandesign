// vendor.js 剩余清单：对 vendor.js 每个顶层声明做形状哈希匹配，并按包/版本/状态汇总
// 状态：installed-exact（已装版本一致）| mismatch（只对上未装版本或仅粗哈希）| none（无匹配）
import fs from "node:fs";
const R = "/home/ubuntu/wt-analysis/analysis/remaining/vendor-residual/";
const read = (f) => fs.readFileSync(R + f, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => !r.err);
const npm = read("scan/npm-index-all.jsonl"), src = read("scan/vendor-index.jsonl").sort((a, b) => a.o - b.o);
// 已安装 = 仓库 pnpm store 里有的 name@version
const installed = new Set();
for (const e of fs.readdirSync("/home/ubuntu/wt-desource/node_modules/.pnpm")) { const m = /^(@?[^@]+)@([^_]+)/.exec(e); if (m) installed.add(m[1].replace("+", "/") + "@" + m[2]); }
const byH = new Map(), byC = new Map();
for (const r of npm) { (byH.get(r.h) || byH.set(r.h, []).get(r.h)).push(r); (byC.get(r.c) || byC.set(r.c, []).get(r.c)).push(r); }
const pname = (id) => id.replace(/@[^@]+$/, ""), pver = (id) => id.slice(pname(id).length + 1);
const SHORT = 150, GENERIC = 5, NB = 3, VOTE = 12;
const info = src.map((r) => {
  const ex = byH.get(r.h) || [], co = ex.length ? [] : byC.get(r.c) || [];
  const hits = ex.length ? ex : co;
  const pk = new Map(); for (const h of hits) { const n = pname(h.p); (pk.get(n) || pk.set(n, new Set()).get(n)).add(pver(h.p)); }
  return { r, exact: ex.length > 0, pk, generic: hits.length > 0 && (r.k < SHORT || pk.size > GENERIC), hits };
});
// 第一轮：非通用且唯一包的声明定锚
for (const x of info) if (x.pk.size && !x.generic && x.pk.size === 1) x.pkg = [...x.pk.keys()][0];
// 第二轮：多包/通用声明用邻居投票（±VOTE 内已定锚声明的包），通用声明还要求 ±NB 内有同包锚
for (let pass = 0; pass < 2; pass++) for (let i = 0; i < info.length; i++) {
  const x = info[i]; if (x.pkg || !x.pk.size) continue;
  const votes = new Map();
  for (let j = Math.max(0, i - VOTE); j <= Math.min(info.length - 1, i + VOTE); j++) { const y = info[j]; if (j !== i && y.pkg && x.pk.has(y.pkg)) votes.set(y.pkg, (votes.get(y.pkg) || 0) + (Math.abs(i - j) <= NB ? 2 : 1)); }
  let best = null, bv = 0; for (const [p, v] of votes) if (v > bv) { best = p; bv = v; }
  if (x.generic) { if (best && [...Array(2 * NB + 1).keys()].some((d) => { const y = info[i - NB + d]; return y && y !== x && y.pkg === best; })) x.pkg = best; }
  else x.pkg = best || [...x.pk.keys()].sort()[0];
}
const rows = info.map((x) => {
  const r = x.r, vers = x.pkg ? [...x.pk.get(x.pkg)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) : [];
  const inst = vers.filter((v) => installed.has(x.pkg + "@" + v));
  const status = !x.pkg ? "none" : x.exact && inst.length ? "installed-exact" : "mismatch";
  return { o: r.o, line: r.l, name: r.n, bytes: r.b, fn: r.fn, pkg: x.pkg || null, versions: vers, installedVersions: inst, exact: x.exact, generic: x.generic, status,
    candidates: x.pk.size && !x.pkg ? [...x.pk.keys()].slice(0, 6) : undefined };
});
fs.writeFileSync(R + "decls.json", JSON.stringify(rows, null, 1));
// 包汇总：按包，版本取该包所有 installed-exact 声明的已装版本交集
const sum = {};
for (const x of rows) {
  const k = x.pkg || "(无匹配)"; const s = (sum[k] ??= { pkg: k, decls: 0, bytes: 0, st: {}, stBytes: {}, verSets: [] });
  s.decls++; s.bytes += x.bytes; s.st[x.status] = (s.st[x.status] || 0) + 1; s.stBytes[x.status] = (s.stBytes[x.status] || 0) + x.bytes;
  if (x.pkg && x.exact) s.verSets.push(x.versions);
}
const out = Object.values(sum).map((s) => {
  let inter = null; for (const v of s.verSets) inter = inter ? inter.filter((x) => v.includes(x)) : [...v];
  const all = [...new Set(s.verSets.flat())];
  return { pkg: s.pkg, decls: s.decls, bytes: s.bytes, status: s.st, statusBytes: s.stBytes, versionsAllExact: inter || [], versionsSeen: all.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    installedVersions: [...installed].filter((x) => pname(x) === s.pkg).map(pver) };
}).sort((a, b) => b.bytes - a.bytes);
fs.writeFileSync(R + "summary-by-package.json", JSON.stringify(out, null, 1));
const tot = rows.reduce((a, x) => a + x.bytes, 0);
console.log("decls", rows.length, "bytes", tot);
for (const st of ["installed-exact", "mismatch", "none"]) { const l = rows.filter((x) => x.status === st); console.log(st, l.length, l.reduce((a, x) => a + x.bytes, 0)); }
for (const s of out) console.log(s.pkg.padEnd(34), String(s.decls).padStart(4), String(s.bytes).padStart(8), JSON.stringify(s.status), "allExact:", s.versionsAllExact.slice(-3).join(","), "| seen:", s.versionsSeen.slice(-4).join(","), "| inst:", s.installedVersions.join(","));
