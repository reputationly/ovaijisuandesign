#!/usr/bin/env node
/**
 * ui-components.js 的可达性分析（第 145 轮，按用户建议）。
 *
 * 从「其它文件实际 import 的 ui-components 导出名」出发，
 * 在文件内部按标识符引用做传递闭包，得到可达声明集合。
 * 不可达的即死代码，可安全删除。
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const DIR = "app/renderer/src/canvas-v3";
const TARGET = path.join(DIR, "ui-components.js");
const src = readFileSync(TARGET, "utf8");

// 1) 目标文件的顶层声明区间
const decls = [];
{
  const re = /^(?:async )?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(src))) decls.push({ name: m[1], start: m.index });
  for (let i = 0; i < decls.length; i++) decls[i].end = i + 1 < decls.length ? decls[i + 1].start : src.length;
}
const byName = new Map();
for (const d of decls) if (!byName.has(d.name)) byName.set(d.name, d);

// 2) 外部实际用到的导出名
const used = new Set();
for (const f of readdirSync(DIR)) {
  if (!/\.(js|jsx)$/.test(f) || f === "ui-components.js") continue;
  const t = readFileSync(path.join(DIR, f), "utf8");
  for (const m of t.matchAll(/^import \{([\s\S]*?)\} from "\.\/ui-components\.js";/gm))
    for (const p of m[1].split(",")) { const s = p.trim(); if (s) used.add(s.split(" as ").pop().trim()); }
}

// 3) 传递闭包
const reachable = new Set();
const queue = [...used].filter((n) => byName.has(n));
while (queue.length) {
  const n = queue.pop();
  if (reachable.has(n)) continue;
  reachable.add(n);
  const d = byName.get(n);
  const body = src.slice(d.start, d.end)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
  for (const m of body.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)/g)) {
    const r = m[1];
    if (r !== n && byName.has(r) && !reachable.has(r)) queue.push(r);
  }
}

const dead = decls.filter((d) => !reachable.has(d.name));
const deadBytes = dead.reduce((s, d) => s + (d.end - d.start), 0);
console.log(`顶层声明        : ${decls.length}`);
console.log(`外部用到        : ${used.size}`);
console.log(`可达            : ${reachable.size}`);
console.log(`不可达（死代码）: ${dead.length}，约 ${Math.round(deadBytes / 1024)} KB`);
writeFileSync("/tmp/v3-dead.json", JSON.stringify(dead.map((d) => ({ name: d.name, start: d.start, end: d.end })), null, 1));
