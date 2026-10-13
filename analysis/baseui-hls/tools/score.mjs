// 用法: node score.mjs <family>   family = baseui | hls
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import semver from "semver";
import * as diffPkg from "diff";
import { declarations } from "./canon.mjs";
import { versionsOf, indexOf, nsResolver } from "./index.mjs";
const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(process.env.HOME, "ov-desource/app/renderer/src");
const FAM = {
  baseui: ["@base-ui/react", "@base-ui/utils", "@base-ui-components/react", "@base-ui-components/utils", "@floating-ui/react", "tabbable", "reselect"],
  hls: ["hls.js"],
};
const fam = process.argv[2];
const strip = (n) => n.replace(/\$\d+$/, "");
// 1) 还原树全部顶层声明（缓存）
const VC = path.join(ROOT, "src-decls.json");
let srcDecls;
if (existsSync(VC)) srcDecls = JSON.parse(readFileSync(VC, "utf8"));
else {
  srcDecls = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const f = path.join(d, n); if (statSync(f).isDirectory()) { if (n !== "node_modules") walk(f); } else if (/\.(m?js|jsx)$/.test(n)) {
    for (const x of declarations(readFileSync(f, "utf8"), { nsResolve: nsResolver(f) })) srcDecls.push({ file: path.relative(SRC, f), line: x.line, type: x.type, names: x.names, rawNames: x.rawNames, A: x.A, N: x.N, B: x.B, refs: x.refs, len: x.end - x.start });
  } } };
  walk(SRC);
  writeFileSync(VC, JSON.stringify(srcDecls));
}
// 2) 候选版本索引
const idx = [];
for (const pkg of FAM[fam]) for (const v of versionsOf(pkg).sort(semver.compare)) idx.push(indexOf(pkg, v));
const nameOwners = new Map(), bShapes = new Map(), allByName = new Map();
for (const r of idx) for (const d of r.decls) {
  for (const n of d.names) {
    if (!nameOwners.has(n)) nameOwners.set(n, new Set()); nameOwners.get(n).add(r.pkg);
    if (!allByName.has(n)) allByName.set(n, new Map());
    const m = allByName.get(n); if (!m.has(d.A)) m.set(d.A, { N: d.N, B: d.B }); }
  if (!bShapes.has(d.B)) bShapes.set(d.B, new Set()); bShapes.get(d.B).add(r.pkg);
}
// 3) 闭包
//   种子：同名且任一版本 A/N/B 相同；或 B 形状相同且 ≥60 字符（改名搬家）
//   扩展：同名、token 相似度 ≥0.6，且与闭包内声明有引用关系（任一方向），迭代到不动点
//   其余同名声明（应用自己的 shadcn 包装、clamp、getSnapshot 等）记为重名排除
const SIM = 0.6;
const tok = (a) => a.match(/[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|"(?:[^"\\]|\\.)*"|\S/g) || [];
function sim(a, b) {
  const ta = tok(a), tb = tok(b);
  const lr = Math.min(ta.length, tb.length) / Math.max(ta.length, tb.length);
  if (lr < SIM) return lr;
  let common = 0;
  for (const c of diffPkg.diffArrays(ta, tb)) if (!c.added && !c.removed) common += c.count;
  return (2 * common) / (ta.length + tb.length);
}
const cand = [];
srcDecls.forEach((s, i) => {
  const named = s.names.some((n) => nameOwners.has(n));
  const shaped = bShapes.has(s.B) && s.B.length >= 60;
  if (!named && !shaped) return;
  let how = null, bestSim = 0;
  if (named) {
    const cs = s.names.flatMap((n) => [...(allByName.get(n) || new Map())]);
    if (cs.some(([A]) => A === s.A)) how = "A";
    else if (cs.some(([, x]) => x.N === s.N)) how = "N";
    else if (cs.some(([, x]) => x.B === s.B)) how = "B";
    else for (const [A] of cs) bestSim = Math.max(bestSim, sim(s.A, A));
  }
  if (!how && shaped) how = "shape";
  if (how) bestSim = 1;
  cand.push({ i, s, named, shaped, how, bestSim });
});
const inClosure = new Set(cand.filter((c) => c.how).map((c) => c.i));
const nameSet = () => { const ns = new Set(); for (const i of inClosure) for (const n of srcDecls[i].rawNames) { ns.add(n); ns.add(strip(n)); } return ns; };
for (let changed = true; changed;) {
  changed = false;
  const ns = nameSet();
  const refd = new Set(); for (const i of inClosure) for (const r of srcDecls[i].refs) { refd.add(r); refd.add(strip(r)); }
  for (const c of cand) {
    if (inClosure.has(c.i) || c.bestSim < SIM) continue;
    const linked = c.s.refs.some((r) => ns.has(r) || ns.has(strip(r))) || c.s.rawNames.some((n) => refd.has(n));
    if (linked) { inClosure.add(c.i); c.how = "sim+ref"; changed = true; }
  }
}
// ref-dep：vendor.js 内被闭包声明按名引用的同名候选（同模块绑定唯一），相似度低也并入
for (let changed = true; changed;) {
  changed = false;
  const refd = new Set(); for (const i of inClosure) if (srcDecls[i].file === "vendor.js") for (const r of srcDecls[i].refs) refd.add(r);
  for (const c of cand) if (!inClosure.has(c.i) && c.s.file === "vendor.js" && c.named && c.s.rawNames.some((n) => refd.has(n))) { inClosure.add(c.i); c.how = "ref-dep"; changed = true; }
}
const closure = [], excluded = [];
for (const c of cand) {
  if (!inClosure.has(c.i)) { excluded.push({ file: c.s.file, line: c.s.line, names: c.s.names, bestSim: +c.bestSim.toFixed(3) }); continue; }
  const owners = new Set();
  for (const n of c.s.names) for (const p of nameOwners.get(n) || []) owners.add(p);
  if (c.shaped) for (const p of bShapes.get(c.s.B)) owners.add(p);
  closure.push({ ...c.s, srcIndex: c.i, how: c.how, bestSim: c.bestSim, owners: [...owners] });
}
// 4) 打分：exact=A 相同；norm=N 相同（A 不同）；diff=有同名声明但都不同；missing=该版本无此名
const rows = [], perStmt = {};
for (const r of idx) {
  const byName = new Map(), aSet = new Set(r.decls.map((d) => d.A)), nSet = new Set(r.decls.map((d) => d.N));
  for (const d of r.decls) for (const n of d.names) { if (!byName.has(n)) byName.set(n, []); byName.get(n).push(d); }
  const cnt = { exact: 0, norm: 0, diff: 0, missing: 0 };
  const cls = [];
  closure.forEach((s, i) => {
    if (!s.owners.includes(r.pkg)) return;
    const cs = s.names.flatMap((n) => byName.get(n) || []);
    let c;
    if (cs.some((d) => d.A === s.A) || (!s.names.length && aSet.has(s.A))) c = "exact";
    else if (cs.some((d) => d.N === s.N) || (!s.names.length && nSet.has(s.N))) c = "norm";
    else if (cs.length) c = "diff";
    else c = "missing";
    cnt[c]++; cls.push([i, c]);
  });
  rows.push({ pkg: r.pkg, v: r.v, total: cls.length, ...cnt });
  perStmt[`${r.pkg}@${r.v}`] = cls;
}
writeFileSync(path.join(ROOT, `closure-${fam}.json`), JSON.stringify(closure));
writeFileSync(path.join(ROOT, `excluded-${fam}.json`), JSON.stringify(excluded, null, 1));
writeFileSync(path.join(ROOT, `perstmt-${fam}.json`), JSON.stringify(perStmt));
writeFileSync(path.join(ROOT, `scores-${fam}.json`), JSON.stringify(rows, null, 1));
const how = {}; for (const s of closure) how[s.how] = (how[s.how] || 0) + 1;
console.log("closure", closure.length, JSON.stringify(how), "excluded", excluded.length);
const files = {}; for (const s of closure) files[s.file] = (files[s.file] || 0) + 1; console.log(JSON.stringify(files));
for (const r of rows) console.log([r.pkg, r.v, "total", r.total, "exact", r.exact, "norm", r.norm, "diff", r.diff, "missing", r.missing].join("\t"));
