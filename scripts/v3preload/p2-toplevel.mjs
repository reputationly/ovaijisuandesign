#!/usr/bin/env node
/**
 * P2-3 第一步：建立「主 bundle 顶层声明 → 行号」表，并为 ui-components.js 里
 * 主树没有的 1323 个声明计算它们在 bundle 中的连续区间。
 *
 * 输出：
 *   /tmp/v3-toplevel-4.0.0.json   { name: line }
 *   /tmp/v3-ranges.json           连续区间清单
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const BUNDLE = ".probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js";
const TARGET = "app/renderer/src/canvas-v3/ui-components.js";
const ROOT = "app/renderer/src";

const lines = readFileSync(BUNDLE, "utf8").split("\n");
const topLevel = new Map();
for (let i = 0; i < lines.length; i++) {
  const m = /^(?:async )?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/.exec(lines[i]);
  if (m && !topLevel.has(m[1])) topLevel.set(m[1], i + 1);
}

// 主树（不含 canvas-v3）已有的声明名
const treeNames = new Set();
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = path.join(d, e);
    const st = statSync(p);
    if (st.isDirectory()) { if (!p.endsWith("canvas-v3")) walk(p); continue; }
    if (!/\.(js|jsx)$/.test(e)) continue;
    for (const m of readFileSync(p, "utf8").matchAll(/^(?:export\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) treeNames.add(m[1]);
  }
})(ROOT);

// 目标文件里主树没有的声明
const tgt = readFileSync(TARGET, "utf8");
const names = [];
for (const m of tgt.matchAll(/^(?:async )?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) names.push(m[1]);
const only = [...new Set(names)].filter((n) => !treeNames.has(n));

// 映射到 bundle 行号；缺失的标记
const withLine = [];
const noLine = [];
for (const n of only) (topLevel.has(n) ? withLine : noLine).push({ name: n, line: topLevel.get(n) ?? null });

withLine.sort((a, b) => a.line - b.line);

// 连续区间（行号间隔 <= 400 视为同一段）
const GAP = 400;
const ranges = [];
for (const it of withLine) {
  const last = ranges[ranges.length - 1];
  if (last && it.line - last.end <= GAP) { last.end = it.line; last.names.push(it.name); }
  else ranges.push({ start: it.line, end: it.line, names: [it.name] });
}

writeFileSync("/tmp/v3-toplevel-4.0.0.json", JSON.stringify(Object.fromEntries(topLevel), null, 1) + "\n", "utf8");
writeFileSync("/tmp/v3-ranges.json", JSON.stringify(ranges, null, 1) + "\n", "utf8");

console.log(`bundle 顶层声明: ${topLevel.size}`);
console.log(`ui-components 里主树没有的: ${only.length}`);
console.log(`  能在 bundle 找到行号: ${withLine.length}`);
console.log(`  找不到（局部变量/GLSL 泄漏等）: ${noLine.length}`);
console.log(`\n连续区间（间隔 ≤ ${GAP} 行）: ${ranges.length} 段`);
const span = withLine.length ? withLine[withLine.length - 1].line - withLine[0].line : 0;
console.log(`覆盖行范围: ${withLine[0]?.line} – ${withLine[withLine.length - 1]?.line}（跨 ${span} 行）`);
console.log("\n最大的 8 段：");
for (const r of [...ranges].sort((a, b) => b.names.length - a.names.length).slice(0, 8))
  console.log(`  ${String(r.names.length).padStart(4)} 个  ${r.start} – ${r.end}`);
console.log("\n找不到行号的前 20：", noLine.slice(0, 20).map((x) => x.name).join(", "));
