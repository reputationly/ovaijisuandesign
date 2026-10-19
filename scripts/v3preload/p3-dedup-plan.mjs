#!/usr/bin/env node
/**
 * P3：为 canvas-v3 的跨文件重复声明生成归并计划。
 *
 * 对每个重复名字：
 *   - 统计它在哪些文件被声明、在哪些文件被**引用**；
 *   - 建议的 owner = 引用次数最多（含自身）的那份，平手时取「模块职责最贴近」的规则；
 *   - 输出需要改成 import 的其他文件。
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const DIR = "app/renderer/src/canvas-v3";
const files = readdirSync(DIR).filter((f) => /\.(js|jsx)$/.test(f)).map((f) => path.join(DIR, f));

const decls = new Map();   // name -> [file]
const refs = new Map();    // name -> Map(file -> count)
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/^(?:async )?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    if (!decls.has(m[1])) decls.set(m[1], []);
    decls.get(m[1]).push(f);
  }
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ").replace(/`[^`]*`/g, '""').replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, '""');
  for (const m of clean.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)/g)) {
    if (!refs.has(m[1])) refs.set(m[1], new Map());
    const mm = refs.get(m[1]);
    mm.set(f, (mm.get(f) ?? 0) + 1);
  }
}

const dup = [...decls.entries()].filter(([, fs]) => fs.length > 1);
const plan = [];
for (const [name, owners] of dup) {
  const refCount = refs.get(name) ?? new Map();
  const scored = owners.map((f) => ({ file: f, score: refCount.get(f) ?? 0 }));
  scored.sort((a, b) => b.score - a.score);
  plan.push({ name, owners, keep: scored[0].file, drop: scored.slice(1).map((s) => s.file), scores: scored });
}
plan.sort((a, b) => b.owners.length - a.owners.length || a.name.localeCompare(b.name));

console.log(`跨文件重复名字: ${plan.length}`);
const byOwner = new Map();
for (const p of plan) byOwner.set(p.keep, (byOwner.get(p.keep) ?? 0) + 1);
console.log("\n按建议 owner 分组（前 10）：");
for (const [f, n] of [...byOwner.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10))
  console.log(`  ${String(n).padStart(4)}  ${path.basename(f)}`);

console.log("\n前 12 条计划：");
for (const p of plan.slice(0, 12))
  console.log(`  ${p.name.padEnd(32)} keep=${path.basename(p.keep)} drop=${p.drop.map((d) => path.basename(d)).join(",")}`);

import("node:fs").then(({ writeFileSync }) => writeFileSync("/tmp/v3-dedup-plan.json", JSON.stringify(plan, null, 1) + "\n"));
