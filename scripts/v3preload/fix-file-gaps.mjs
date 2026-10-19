#!/usr/bin/env node
/**
 * 逐文件收敛缺口：只给**这个文件真正引用、但没有声明**的名字加 import。
 *
 * 用法：node fix-file-gaps.mjs <文件> [--apply]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = "app/renderer/src";
const target = process.argv[2];
const apply = process.argv.includes("--apply");

// 该文件的 unbound 名字（来自 check-undef）
let out = "";
try { execFileSync(process.execPath, ["scripts/desource/check-undef.mjs"], { stdio: "pipe", maxBuffer: 256 * 1024 * 1024 }); }
catch (e) { out = String(e.stderr ?? ""); }
const rel = path.relative(process.cwd(), target).replace(/\\/g, "/");
const BUILTINS = new Set(["hasOwnProperty","isPrototypeOf","propertyIsEnumerable","toString","valueOf",
  "toLocaleString","constructor","__proto__","__defineGetter__","__defineSetter__","__lookupGetter__","__lookupSetter__"]);
const names = new Set();
for (const line of out.split("\n")) {
  const m = new RegExp(`^${rel.replace(/[$]/g, "\\$")}:\\d+:\\d+ \\[unbound\\]\\s*(\\S+)`).exec(line);
  if (m && !BUILTINS.has(m[1])) names.add(m[1]);
}
if (!names.size) { console.log(`${rel}：无缺口`); process.exit(0); }

// 主树的导出索引
const files = [];
(function walk(d) { for (const e of readdirSync(d)) { const p = path.join(d, e); const s = statSync(p);
  if (s.isDirectory()) walk(p); else if (/\.(js|jsx)$/.test(e)) files.push(p); } })(ROOT);
const owner = new Map();
for (const f of files) {
  if (f === target) continue;
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) if (!owner.has(m[1])) owner.set(m[1], f);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm))
    for (const p of m[1].split(",")) { const nm = p.trim().split(/\s+as\s+/).pop()?.trim(); if (nm && !owner.has(nm)) owner.set(nm, f); }
}

const STD_MAP = {
  reactExports: 'import reactExports from "react";',
  reactDomExports: 'import reactDomExports from "react-dom";',
  jsxRuntimeExports: 'import jsxRuntimeExports from "react/jsx-runtime";',
  useTranslation: 'import { useTranslation } from "react-i18next";',
  instance: 'import instance from "i18next";',
};
const stdLines = [];
const byFile = new Map(); const unresolved = [];
for (const n of names) {
  if (STD_MAP[n]) { stdLines.push(STD_MAP[n]); continue; }
  const base = n.replace(/\$\d+$/, "");
  const f = owner.get(n) ?? (base !== n ? owner.get(base) : undefined);
  if (!f) { unresolved.push(n); continue; }
  if (!byFile.has(f)) byFile.set(f, []);
  byFile.get(f).push(base !== n && !owner.has(n) ? `${base} as ${n}` : n);
}

const lines = [...new Set(stdLines)];
for (const [f, ns] of byFile) {
  let r = path.relative(path.dirname(target), f).replace(/\\/g, "/");
  if (!r.startsWith(".")) r = "./" + r;
  lines.push(`import { ${[...new Set(ns)].sort().join(", ")} } from "${r}";`);
}
console.log(`${rel}：缺口 ${names.size}，可解析 ${names.size - unresolved.length}（${byFile.size} 个模块），未解析 ${unresolved.length}`);
if (unresolved.length) console.log(`  未解析: ${unresolved.slice(0, 12).join(", ")}`);
if (!apply) { console.log(lines.join("\n")); process.exit(0); }

let src = readFileSync(target, "utf8");
const at = src.indexOf(" */\n");
const i = at >= 0 ? at + 4 : 0;
src = src.slice(0, i) + "// ==== 逐文件收敛 ====\n" + lines.join("\n") + "\n" + src.slice(i);
writeFileSync(target, src, "utf8");
console.log("已写入");
