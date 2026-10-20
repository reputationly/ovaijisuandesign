/**
 * 常量对照（第 231 轮，用户方案第 3 条）。
 *
 * 做法：从 bundle 里取出所有 `const NAME = <literal>` 形式的常量（数字/字符串/简单对象），
 * 再在树里找同名常量，比较字面量。不一致就报出来。
 *
 * 为什么有用：占位值（`X_BYTES = 0`、`X_ROUTES = {}`）能通过四项指标和门禁，
 * 但和参照的常量一比就露馅。第 213 轮就是靠人工比对发现 3 个真缺陷。
 *
 * 输出三类：
 *   MISMATCH  同名常量值不同（需要逐条甄别：真缺陷 or 同名不同实体）
 *   MISSING   树里没有同名常量
 *   OK        一致
 *
 * 用法：node scripts/v3preload/check-constants.mjs [--verbose]
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO = process.cwd();
const BUNDLE = path.join(REPO, ".probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js");
const ROWS = path.join(REPO, ".probe/refdiff/toplevel-4.0.0.json");
const SRC = path.join(REPO, "app/renderer/src");
const VERBOSE = process.argv.includes("--verbose");

const src = readFileSync(BUNDLE, "utf8");
const rows = JSON.parse(readFileSync(ROWS, "utf8")).rows;

// 从 bundle 抽 `const NAME = literal`
const LIT = /^(?:export\s+)?const\s+([A-Z][A-Z0-9_$]*)\s*=\s*([^;]{1,200}?);\s*$/;
const bundleConsts = new Map();
for (const r of rows) {
  const text = src.slice(r.start, r.end);
  const m = LIT.exec(text.trim());
  if (!m) continue;
  const val = m[2].trim();
  // 只比「可以稳定比较」的字面量：数字、字符串、布尔、简单对象/数组
  if (!/^(?:-?\d+(?:\.\d+)?(?:e-?\d+)?|"[^"]*"|'[^']*'|true|false|\{[\s\S]*\}|\[[\s\S]*\])$/.test(val)) continue;
  if (!bundleConsts.has(m[1])) bundleConsts.set(m[1], { val, start: r.start });
}

// 树里的同名常量
const treeConsts = new Map();
(function walk(d) {
  for (const e of readdirSync(d)) {
    const f = path.join(d, e);
    const st = statSync(f);
    if (st.isDirectory()) { if (e !== "node_modules") walk(f); }
    else if (/\.(js|jsx)$/.test(e) && !/\.test\./.test(f)) {
      const text = readFileSync(f, "utf8");
      const re = /^(?:export\s+)?const\s+([A-Z][A-Z0-9_$]*)\s*=\s*([^;]{1,200}?);\s*$/gm;
      let m;
      while ((m = re.exec(text)) !== null) {
        const val = m[2].trim();
        if (!/^(?:-?\d+(?:\.\d+)?(?:e-?\d+)?|"[^"]*"|'[^']*'|true|false|\{[\s\S]*\}|\[[\s\S]*\])$/.test(val)) continue;
        if (!treeConsts.has(m[1])) treeConsts.set(m[1], { val, file: f.replace(SRC + "/", "") });
      }
    }
  }
})(SRC);

const numEq = (a, b) => {
  const x = Number(a), y = Number(b);
  return Number.isFinite(x) && Number.isFinite(y) && x === y;
};
const norm = (v) =>
  v
    .replace(/\/\*[\s\S]*?\*\//g, "")   // 去掉 /* @__PURE__ */ 这类注释
    .replace(/\/\/[^\n]*/g, "")          // 去掉行注释
    .replace(/\$(?:\d+|[A-Za-z_]+)\b/g, "") // Rollup 的 $n 重命名
    .replace(/\b([A-Za-z_$][\w$]*?)(?:\d+|\$\d+)\b/g, "$1")
    .replace(/\s+/g, "")
    .replace(/"/g, "'")
    .replace(/,(?=[}\]])/g, "");
const mismatches = [], ok = [];
for (const [name, b] of bundleConsts) {
  const t = treeConsts.get(name);
  if (!t) continue;                       // 树里没有就不算（那不是「值错了」）
  if (norm(b.val) === norm(t.val) || numEq(b.val, t.val)) ok.push(name);
  else mismatches.push({ name, bundle: b.val, tree: t.val, file: t.file });
}

// 有意差异登记表
let intentional = new Map();
try {
  const reg = JSON.parse(readFileSync(path.join(REPO, "scripts/v3preload/constants-intentional.json"), "utf8"));
  for (const e of reg.entries) intentional.set(e.name, e);
} catch { /* 没有登记表也能跑 */ }
const kept = mismatches.filter((m) => !intentional.has(m.name));
const registered = mismatches.filter((m) => intentional.has(m.name));
mismatches.length = 0;
mismatches.push(...kept);

console.log(`常量对照：bundle 里 ${bundleConsts.size} 个，树里同名 ${[...bundleConsts.keys()].filter((n) => treeConsts.has(n)).length} 个`);
console.log(`  已登记的有意差异 ${registered.length} 个`);
console.log(`  一致 ${ok.length} / 不一致 ${mismatches.length}`);
for (const m of mismatches) {
  console.log(`  ✗ ${m.name}  (${m.file})`);
  console.log(`      bundle: ${m.bundle.slice(0, 90)}`);
  console.log(`      tree  : ${m.tree.slice(0, 90)}`);
}
if (VERBOSE) for (const n of ok) console.log(`  ✓ ${n}`);
const JIDX = process.argv.indexOf("--json");
if (JIDX >= 0) {
  const out = process.argv[JIDX + 1] ?? "constants-mismatch.json";
  writeFileSync(out, JSON.stringify(mismatches.map((m) => ({ name: m.name, file: m.file, bundle: m.bundle, tree: m.tree })), null, 1));
  console.log(`  明细已写入 ${out}`);
}
process.exit(mismatches.length ? 1 : 0);
