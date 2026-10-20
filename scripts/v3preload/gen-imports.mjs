/**
 * 给定一批未定义名字，在仓库里找出它们各自的导出位置，生成 import 语句。
 * 用法：node scripts/v3preload/gen-imports.mjs name1 name2 ...  [--from <dir>]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
const fromIdx = args.indexOf("--from");
const fromDir = fromIdx >= 0 ? args[fromIdx + 1] : "app/renderer/src/workspace";
const need = args.filter((a, i) => i !== fromIdx && i !== fromIdx + 1);
const ROOT = "app/renderer/src";
const DRAFT = /-closure\.js$|workbench-events\.js$|facilities/;
const files = [];
(function w(d) { for (const e of readdirSync(d)) { const p = path.join(d, e); const st = statSync(p);
  if (st.isDirectory()) { if (!/node_modules/.test(e)) w(p); } else if (/\.(js|jsx)$/.test(e) && !DRAFT.test(p)) files.push(p); } })(ROOT);
const owner = new Map();
for (const f of files) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) if (!owner.has(m[1])) owner.set(m[1], f);
  for (const m of t.matchAll(/^export\s*\{([^}]*)\}/gm)) for (const q of m[1].split(",")) { const r = q.trim(); if (!r) continue;
    const [o, a] = r.split(/\s+as\s+/).map(s => s.trim()); if (!owner.has(a ?? o)) owner.set(a ?? o, f); }
}
// 第 247 轮：npm 导出的名字直接给包名，不再算"找不到"
let npmByName = new Map();
try {
  const generated = JSON.parse(readFileSync("scripts/v3preload/npm-exports.json", "utf8"));
  for (const [pkg, names] of Object.entries(generated.byPackage ?? {})) {
    for (const n of names) if (!npmByName.has(n)) npmByName.set(n, pkg);
  }
} catch { /* 没生成过就跳过 */ }

const by = new Map(); const missing = [];
// 第 229 轮：`$n` 后缀是 Rollup 给同名实体的重命名。树里通常只保留了基础名，
// 所以精确名找不到时，回退到去掉 `$n` 的名字。
const lookup = (n) => owner.get(n) ?? owner.get(n.replace(/\$\d+$/, "")) ?? null;
for (const n of need) {
  const f = lookup(n);
  if (!f) {
    const pkg = npmByName.get(n);
    if (pkg) { (by.get(`npm:${pkg}`) ?? by.set(`npm:${pkg}`, []).get(`npm:${pkg}`)).push(n); continue; }
    missing.push(n);
    continue;
  }
  const rel = "./" + path.relative(fromDir, f).replace(/\\/g, "/");
  (by.get(rel) ?? by.set(rel, []).get(rel)).push(n);
}
for (const [k, ns] of [...by.entries()].sort()) console.log(`import { ${[...new Set(ns)].sort().join(", ")} } from "${k}";`);
if (missing.length) { console.error("未找到: " + missing.join(", ")); process.exitCode = 1; }
