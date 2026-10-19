#!/usr/bin/env node
/**
 * 按 closure-manifest 的**字节偏移**整段取回（第 173 轮）。
 *
 * 与按行号切片的区别：start/end 来自 toplevel-4.0.0.json 的 AST 偏移，
 * 天然对齐顶层声明边界，不会出现「切片差一行」。
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const REPO = process.cwd();
const MANIFEST = path.join(REPO, "scripts/v3preload/closure-manifest.json");
const BUNDLE = path.join(REPO, ".probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js");
const OUT = path.join(REPO, ".probe/facility-segments");
const APPLY = process.argv.includes("--apply");

const man = JSON.parse(readFileSync(MANIFEST, "utf8"));
const bundle = readFileSync(BUNDLE, "utf8");

// 合并相邻区间（gap ≤ 40 视为同一段，与 closure-plan 一致）
const GAP = 40;
const segs = [];
for (const it of [...man.items].sort((a, b) => a.i - b.i)) {
  const last = segs.at(-1);
  if (last && it.i - last.lastI <= GAP) { last.items.push(it); last.lastI = it.i; }
  else segs.push({ items: [it], lastI: it.i });
}

mkdirSync(OUT, { recursive: true });
let n = 0;
for (const s of segs) {
  const todo = s.items.filter((x) => x.status !== "restored");
  if (!todo.length) continue;
  const from = s.items[0].i, to = s.items.at(-1).i;
  // 逐项取，不取「最小到最大」的连续块 —— 后者会把中间已还原项的**函数体**带进来，
  // 造成「切片差一行 / 半个函数」的损坏（第 173 轮踩到）。
  const code = todo.map((x) => bundle.slice(x.start, x.end).replace(/\s+$/, "")).join("\n\n");
  const start = Math.min(...todo.map((x) => x.start));
  const end = Math.max(...todo.map((x) => x.end));
  const names = todo.flatMap((x) => x.names).join(", ");
  const header = `/**
 * 设施层区间 ${from}–${to}（第 173 轮整段取回）。
 *
 * 字节偏移 ${start}–${end}，来自 toplevel-4.0.0.json，非行号。
 * 段内声明：${names.slice(0, 400)}
 *
 * 按 bundle 原始顺序放置，因此求值顺序与上游一致，不会产生 TDZ。
 */

`;
  const file = path.join(OUT, `segment-${String(from).padStart(6, "0")}-${to}.js`);
  if (APPLY) writeFileSync(file, header + code + "\n", "utf8");
  console.log(`${from}–${to}  ${todo.length} 个  ${code.split("\n").length} 行  → ${path.relative(REPO, file)}`);
  n++;
}
console.log(`\n${APPLY ? "已写" : "待写"} ${n} 个文件`);
