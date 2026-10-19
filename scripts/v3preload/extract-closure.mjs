// 从一个大 bundle 里按「名字闭包」抽取一组顶层声明及其依赖。
// 用法: node extract-closure.mjs <bundle> <seedRegex> <out.js>
import { readFileSync, writeFileSync } from "node:fs";

const [, , bundlePath, seedPattern, outPath] = process.argv;
const src = readFileSync(bundlePath, "utf8");
const lines = src.split("\n");

// 1) 收集顶层声明及其行区间（用花括号配平近似到下一个顶层声明前）
const decls = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/);
  if (!m) continue;
  decls.push({ name: m[1], start: i, end: i });
}
for (let k = 0; k < decls.length; k++) decls[k].end = (k + 1 < decls.length ? decls[k + 1].start : lines.length) - 1;

const byName = new Map(decls.map((d) => [d.name, d]));
const text = (d) => lines.slice(d.start, d.end + 1).join("\n");
// 去掉注释、字符串、模板串，再去掉 `.foo` 这样的属性访问 —— 否则 "fail"、".length"
// 这类普通词会把整张图连成一片（实测种子一扩散就是 1.9 万个声明）。
const clean = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/`(?:[^`\\]|\\.)*`/g, '""')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, '""');
const idents = (s) => {
  const out = new Set();
  for (const m of clean(s).matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)/g)) out.add(m[1]);
  return out;
};
const seed = new RegExp(seedPattern);

const chosen = new Set();
const queue = decls.filter((d) => seed.test(d.name)).map((d) => d.name);
for (const n of queue) chosen.add(n);

// 2) 迭代补依赖
while (queue.length) {
  const name = queue.pop();
  const d = byName.get(name);
  if (!d) continue;
  for (const id of idents(text(d))) {
    if (chosen.has(id) || !byName.has(id)) continue;
    chosen.add(id);
    queue.push(id);
  }
}

const picked = [...chosen].map((n) => byName.get(n)).filter(Boolean).sort((a, b) => a.start - b.start);
// 3) 找出仍然未解析的名字（既不在选中集里，也不是 JS 关键字/内建）
const JS = new Set(("var let const function return if else for while do break continue new delete typeof instanceof in of void this null true false undefined async await yield try catch finally throw switch case default class extends super import export from as static get set NaN Infinity parseInt parseFloat isNaN isFinite String Number Boolean Array Object JSON Math Date RegExp Error TypeError Map Set WeakMap WeakSet Promise Symbol BigInt Reflect Proxy globalThis window document console crypto TextEncoder TextDecoder Uint8Array Uint32Array Int32Array Float32Array DataView ArrayBuffer structuredClone queueMicrotask setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame performance navigator localStorage sessionStorage fetch URL URLSearchParams Headers Request Response AbortController AbortSignal Intl").split(" "));
const unresolved = new Map();
for (const d of picked) {
  for (const id of idents(text(d))) {
    if (chosen.has(id) || JS.has(id) || byName.has(id)) continue;
    unresolved.set(id, (unresolved.get(id) ?? 0) + 1);
  }
}
const header = `// 由 scripts/v3preload/extract-closure.mjs 从产物抽取（种子: ${seedPattern}）\n// 选中 ${picked.length} 个顶层声明；仍未解析的外部标识符 ${unresolved.size} 个（见文件末尾清单）\n\n`;
const footer = `\n// ==== 仍未解析的外部标识符（需要从别处 import）====\n// ${[...unresolved.keys()].sort().join(", ")}\n`;
writeFileSync(outPath, header + picked.map(text).join("\n\n") + footer, "utf8");
console.log(`选中 ${picked.length} 个声明；未解析标识符 ${unresolved.size} 个`);
console.log(`输出: ${outPath}`);
console.log("未解析前 15:", [...unresolved.keys()].sort().slice(0, 15).join(", "));
