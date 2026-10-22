#!/usr/bin/env node
/**
 * 把「缺的符号」按**改动性质**分成四类（第 75 轮）。
 *
 * 为什么需要：只按"缺什么符号"排列没法安排工作 —— 缺一个数字和缺一个组件的工作量差两个数量级，
 * 而"缺一个 class 字符串"其实是视觉改版，需要门禁验证，性质完全不同。
 *
 * 判据（看参照里该符号的定义形态）：
 *   number   const X = 123 / 1e3 / 0.5          -> 补数值，最小改动
 *   class     const X = "..."（看起来像 className）-> 改视觉，要过门禁
 *   icon      const X = withIconCompositing(...)  -> 新图标，但模式固定
 *   function  function X(...) {}                  -> 补小函数，看体量
 *   component function X(...) { ...jsx... }       -> 新组件，最大
 *   unknown   找不到                                -> 需人工看
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REF = path.join(ROOT, ".probe/reference");
const cache = {};
function src(ver) {
  if (!cache[ver]) {
    const dir = path.join(REF, ver, "asar/out/renderer/assets");
    cache[ver] = readdirSync(dir)
      .filter((f) => f.endsWith(".js"))
      .map((f) => readFileSync(path.join(dir, f), "utf8"));
  }
  return cache[ver];
}
function defineOf(name) {
  for (const s of src("4.0.3")) {
    for (const pat of [`const ${name} =`, `var ${name} =`, `function ${name}(`, `class ${name} `]) {
      const i = s.indexOf(pat);
      if (i > 0) {
        const j = s.indexOf("\nfunction ", i + 10);
        return s.slice(i, j > 0 ? j : i + 1500);
      }
    }
  }
  return "";
}

function kindOf(name) {
  const d = defineOf(name);
  if (!d) return { kind: "unknown", size: 0 };
  const size = d.length;
  if (/^const \w+ = -?\d/.test(d)) return { kind: "number", size };
  const m = /^(?:const|var) \w+ = "([^"]*)"/.exec(d);
  if (m) {
    const v = m[1];
    const looksClass = /(^|\s)(rounded|border|bg-|text-|shadow|px-|py-|h-|min-w|max-w|flex|grid)/.test(v);
    return { kind: looksClass ? "class" : "string", size };
  }
  if (/withIconCompositing|createLucideIcon/.test(d)) return { kind: "icon", size };
  if (d.startsWith("function ") || /\bfunction \w+\(/.test(d.slice(0, 60))) {
    const hasJsx = /jsxRuntimeExports\.jsx|__jsx|jsx\(/.test(d);
    return { kind: hasJsx ? "component" : "function", size };
  }
  return { kind: "unknown", size };
}

const classes = JSON.parse(readFileSync("/tmp/conflict-classes.json", "utf8"));
const seen = new Map();
for (const c of classes.needsNew) {
  for (const m of c.missing ?? []) {
    if (!seen.has(m)) seen.set(m, { symbol: m, files: [] });
    seen.get(m).files.push(`${c.file}::${c.name}`);
  }
}

const order = { number: 0, string: 1, function: 2, icon: 3, class: 4, component: 5, unknown: 6 };
const rows = [...seen.values()].map((x) => ({ ...x, ...kindOf(x.symbol) }));
rows.sort((a, b) => order[a.kind] - order[b.kind] || a.symbol.localeCompare(b.symbol));

const label = {
  number: "① 补数值（最小改动）",
  string: "② 补字符串",
  function: "③ 补小函数",
  icon: "④ 新图标（模式固定）",
  class: "⑤ **改视觉**（要过门禁）",
  component: "⑥ **新组件**（工作量最大）",
  unknown: "⑦ 需人工看",
};
let cur = null;
for (const r of rows) {
  if (r.kind !== cur) {
    cur = r.kind;
    console.log(`\n${label[cur]}`);
  }
  console.log(`  ${r.symbol.padEnd(32)} ${String(r.size).padStart(5)}B  用于 ${r.files.length} 处（例：${r.files[0]}）`);
}
const counts = {};
for (const r of rows) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
console.log("\n合计：" + Object.entries(counts).map(([k, v]) => `${label[k] ?? k} ${v}`).join(" · "));


// ── 按组件聚合的工作项视图（第 83 轮）─────────────────────────────────────────
// 上一版的输出是「按符号散列」：同一个对话框改造的四个碎片会被算成四条独立工作项，
// 看起来像四件小事，实际是一件较大的事。
// 这里改成按「冲突所在文件」聚合：同一个文件里缺的所有符号合起来算一项。
if (process.argv.includes("--by-component")) {
  const byFile = new Map();
  for (const c of classes.needsNew) {
    if (!byFile.has(c.file)) byFile.set(c.file, { file: c.file, symbols: new Set(), statements: [] });
    const item = byFile.get(c.file);
    for (const m of c.missing ?? []) item.symbols.add(m);
    item.statements.push(c.name);
  }
  const items = [...byFile.values()].sort((a, b) => a.symbols.size - b.symbols.size);
  console.log(`按组件聚合：${items.length} 项工作（原来按符号算是 ${classes.needsNew.length} 条）\n`);
  for (const it of items) {
    const kinds = [...it.symbols].map((s) => kindOf(s).kind);
    const size = [...it.symbols].reduce((n, s) => n + kindOf(s).size, 0);
    console.log(`${it.file}`);
    console.log(`   涉及语句 ${it.statements.length} 条 · 缺 ${it.symbols.size} 个符号 · 约 ${size}B`);
    console.log(`   性质 ${[...new Set(kinds)].join("/")} · 符号 ${[...it.symbols].join(", ")}`);
    console.log();
  }
}
