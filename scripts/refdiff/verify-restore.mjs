// 地面真值检验：能不能从 3.0.21 的 bundle 里，把我们**现有源码**里的语句重新生成出来。
//
//   node scripts/refdiff/verify-restore.mjs [样本数]
//
// 为什么这是有效的检验：`app/renderer/src` 就是从那份 bundle 还原出来的，
// 如果生成器能把已知的成品重新生成到一致（归一化后），那它对 4.0.0 的新语句也可信。
// 归一化口径和 scripts/refdiff/toplevel.mjs 的 normalizeStatement 一致（标识符一律抹成 `_`），
// 所以 `$2` 后缀、局部改名都不影响判定。
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import { normalizeStatement } from "./toplevel.mjs";
import { restoreStatementText } from "./restore-statement.mjs";

const SAMPLE = Number(process.argv[2] ?? 150);
const bundle = readFileSync(".probe/reference/3.0.21/asar/out/renderer/assets/index-ZNI5SgRm.js", "utf8");
const rows = JSON.parse(readFileSync(".probe/refdiff/toplevel-3.0.21.json", "utf8")).rows;
const srcRoot = "app/renderer/src";

function walk(dir, rel = "", out = []) {
  for (const name of readdirSync(dir).sort()) {
    const abs = path.join(dir, name);
    const r = rel ? `${rel}/${name}` : name;
    const st = statSync(abs);
    if (st.isDirectory()) {
      if (/^(vendor-fork|vendor-inline)$/.test(name)) continue;
      walk(abs, r, out);
    } else if (/\.(jsx?|mjs|cjs)$/.test(name)) out.push(r);
  }
  return out;
}

/** 源文件 → 顶层语句：名字 → 原文。用 babel 真解析，不用正则。 */
function statementsOf(text) {
  const ast = parse(text, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
  const map = new Map();
  for (const node of ast.program.body) {
    const code = text.slice(node.start, node.end);
    const names = [];
    for (const d of node.declarations ?? []) if (d.id?.name) names.push(d.id.name);
    if (node.id?.name) names.push(node.id.name);
    for (const n of names) if (!map.has(n)) map.set(n, code);
  }
  return map;
}

const fileCache = new Map();
const fileStatements = (rel) => {
  if (!fileCache.has(rel)) fileCache.set(rel, statementsOf(readFileSync(path.join(srcRoot, rel), "utf8")));
  return fileCache.get(rel);
};

// 名字 → 源文件（唯一命中的才算）
const byName = new Map();
for (const rel of walk(srcRoot)) {
  for (const n of fileStatements(rel).keys()) {
    const k = n.replace(/\$\d+$/, "");
    if (!byName.has(k)) byName.set(k, new Set());
    byName.get(k).add(rel);
  }
}

const verdicts = { exact: 0, near: 0, far: 0, skipped: 0 };
const details = [];
function ratio(a, b) {
  // 简单的最长公共前后缀比例，够用来分档；不做完整编辑距离
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  let j = 0;
  while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j += 1;
  return (i + j) / Math.max(a.length, b.length);
}

let tested = 0;
for (const row of rows) {
  if (tested >= SAMPLE) break;
  const names = (row.names ?? []).map((n) => n.replace(/\$\d+$/, ""));
  if (names.length !== 1) continue;
  const [name] = names;
  const files = byName.get(name);
  if (!files || files.size !== 1) continue;
  const rel = [...files][0];
  const sourceCode = fileStatements(rel).get(name) ?? fileStatements(rel).get(names[0]);
  if (!sourceCode) continue;
  tested += 1;
  const out = await restoreStatementText(bundle.slice(row.start, row.end));
  const a = normalizeStatement(out.code);
  const b = normalizeStatement(sourceCode);
  if (a === b) verdicts.exact += 1;
  else {
    const r = ratio(a, b);
    if (r >= 0.9) verdicts.near += 1;
    else verdicts.far += 1;
    if (details.length < 12) details.push({ name, rel, ratio: Number(r.toFixed(3)), a, b });
  }
}

console.log(`抽查 ${tested} 条（名字唯一、且在源码里唯一命中的）`);
console.log(`  归一化后完全一致: ${verdicts.exact}`);
console.log(`  接近（>=0.9）   : ${verdicts.near}`);
console.log(`  差得远（<0.9）  : ${verdicts.far}`);
console.log(`  一致率: ${((100 * (verdicts.exact + verdicts.near)) / Math.max(tested, 1)).toFixed(1)}%`);
console.log();
for (const d of details.slice(0, 6)) {
  console.log(`--- ${d.name} @ ${d.rel}  (相似度 ${d.ratio})`);
  console.log(`  生成: ${d.a.slice(0, 200)}`);
  console.log(`  源码: ${d.b.slice(0, 200)}`);
}
