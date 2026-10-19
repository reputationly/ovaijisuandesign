#!/usr/bin/env node
/** 把 gaps 里「树里已有 / $n 变体 / lucide 图标 / 标准运行时」四类接上 import。 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const buckets = JSON.parse(readFileSync("/tmp/v3-buckets.json", "utf8"));
const ROOT = "app/renderer/src";
const files = [];
(function walk(d) { for (const e of readdirSync(d)) { const p = path.join(d, e); const s = statSync(p);
  if (s.isDirectory()) walk(p); else if (/\.(js|jsx)$/.test(e)) files.push(p); } })(ROOT);

const owner = new Map();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) if (!owner.has(m[1])) owner.set(m[1], f);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm))
    for (const p of m[1].split(",")) { const nm = p.trim().split(/\s+as\s+/).pop()?.trim(); if (nm && !owner.has(nm)) owner.set(nm, f); }
}

const TARGETS = readdirSync("app/renderer/src/canvas-v3").filter((f) => /\.(js|jsx)$/.test(f)).map((f) => path.join("app/renderer/src/canvas-v3", f));
const rel = (from, to) => { let r = path.relative(path.dirname(from), to).replace(/\\/g, "/"); return r.startsWith(".") ? r : "./" + r; };

// 每个目标文件：把 buckets 里能解析的名字都加进去（多余的 import 由后续 esbuild 清理）
const assignments = { std: [], icon: [], tree: new Map(), variant: new Map() };
for (const n of buckets.std) assignments.std.push(n);
for (const n of buckets.icon) assignments.icon.push(n);
for (const n of buckets.tree) { const f = owner.get(n); if (f) { if (!assignments.tree.has(f)) assignments.tree.set(f, []); assignments.tree.get(f).push(n); } }
for (const n of buckets.variant) { const base = n.replace(/\$\d+$/, ""); const f = owner.get(base); if (f) { if (!assignments.variant.has(f)) assignments.variant.set(f, []); assignments.variant.get(f).push(`${base} as ${n}`); } }

let touched = 0;
for (const t of TARGETS) {
  let src = readFileSync(t, "utf8");
  const lines = [];
  if (assignments.std.length) lines.push(`import { ${assignments.std.join(", ")} } from "react/jsx-runtime";`);
  if (assignments.icon.length) lines.push(`import { ${assignments.icon.map((n) => n.replace(/\$\d+$/, "")).join(", ")} } from "lucide-react";`);
  for (const [f, ns] of assignments.tree) lines.push(`import { ${[...new Set(ns)].sort().join(", ")} } from "${rel(t, f)}";`);
  for (const [f, ns] of assignments.variant) lines.push(`import { ${[...new Set(ns)].sort().join(", ")} } from "${rel(t, f)}";`);
  const at = src.indexOf(" */\n");
  const i = at >= 0 ? at + 4 : 0;
  src = src.slice(0, i) + "// ==== 缺口收敛：按来源分类后批量接入 ====\n" + lines.join("\n") + "\n" + src.slice(i);
  writeFileSync(t, src, "utf8");
  touched++;
}
console.log(`已为 ${touched} 个文件插入 import：std ${assignments.std.length}、icon ${assignments.icon.length}、tree ${[...assignments.tree.values()].flat().length}、variant ${[...assignments.variant.values()].flat().length}`);
