#!/usr/bin/env node
/** 生成 canvas-v3/main-exports.js：CanvasAreaV3 chunk 的 import 绑定 → 主树转发。 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const CHUNK = ".probe/reference/4.0.0/asar/out/renderer/assets/CanvasAreaV3-BMg_Ebke.js";
const ROOT = "app/renderer/src";
const V3 = path.join(ROOT, "canvas-v3");

const files = [];
(function walk(d) { for (const e of readdirSync(d)) { const p = path.join(d, e); const s = statSync(p);
  if (s.isDirectory()) walk(p); else if (/\.(js|jsx)$/.test(e)) files.push(p); } })(ROOT);

const SKIP_SELF = new Set([path.join(ROOT, 'canvas-v3/main-exports.js')]);
const owner = new Map();
for (const f of files) {
  if (SKIP_SELF.has(f)) continue;
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) if (!owner.has(m[1])) owner.set(m[1], f);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm))
    for (const p of m[1].split(",")) { const nm = p.trim().split(/\s+as\s+/).pop()?.trim(); if (nm && !owner.has(nm)) owner.set(nm, f); }
}

const bindings = [];
for (const m of readFileSync(CHUNK, "utf8").matchAll(/^import\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)";/gm))
  for (const piece of m[1].split(",")) {
    const s = piece.trim(); if (!s) continue;
    bindings.push(s.includes(" as ") ? s.split(/\s+as\s+/)[1].trim() : s);
  }

const byFile = new Map(); const unresolved = [];
for (const n of new Set(bindings)) {
  const f = owner.get(n);
  if (!f) { unresolved.push(n); continue; }
  if (!byFile.has(f)) byFile.set(f, []);
  byFile.get(f).push(n);
}
const rel = (from, to) => { let r = path.relative(path.dirname(from), to).replace(/\\/g, "/"); return r.startsWith(".") ? r : "./" + r; };
const target = path.join(V3, "main-exports.js");
const lines = [...byFile.entries()].sort().map(([f, ns]) => `export { ${[...new Set(ns)].sort().join(", ")} } from "${rel(target, f)}";`);

writeFileSync(target, `/**
 * v3 画布对主包的**唯一边界**（脚本生成，勿手改）。
 *
 * 逐条复刻 \`CanvasAreaV3-BMg_Ebke.js\` 的 ${bindings.length} 条 import 绑定；
 * \`canvas-area-v3.js\` 只允许从这里取东西（\`check-tdz.mjs\` 的 R2 强制）。
 *
 * 覆盖 ${[...byFile.values()].flat().length} 个名字；无法解析 ${unresolved.length} 个（见 KNOWN_EXCEPTIONS）。
 */

` + lines.join("\n") + "\n", "utf8");
console.log(`main-exports.js：${lines.length} 条，覆盖 ${[...byFile.values()].flat().length}/${new Set(bindings).size}，未解析 ${unresolved.length}`);
