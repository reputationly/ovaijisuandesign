#!/usr/bin/env node
/**
 * P1：从 CanvasAreaV3 chunk 的 4 条 import 生成 main-exports 边界清单。
 *
 * 每个绑定判成三种状态：
 *   tree      —— 树里已有同名导出
 *   variant   —— 只有 $n 变体（需逐个核对函数体）
 *   missing   —— 主 bundle 有、树里没有（附 bundle 行号）
 *   vendor    —— npm / 标准运行时
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const CHUNK = ".probe/reference/4.0.0/asar/out/renderer/assets/CanvasAreaV3-BMg_Ebke.js";
const BUNDLE = ".probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js";
const ROOT = "app/renderer/src";
const PROTO = "app/packages/protocol/src";

const files = [];
(function walk(d) { for (const e of readdirSync(d)) { const p = path.join(d, e); const s = statSync(p);
  if (s.isDirectory()) walk(p); else if (/\.(js|jsx|ts)$/.test(e)) files.push(p); } })(ROOT);
if (existsSync(PROTO)) (function walk(d) { for (const e of readdirSync(d)) { const p = path.join(d, e); const s = statSync(p);
  if (s.isDirectory()) walk(p); else if (e.endsWith(".ts")) files.push(p); } })(PROTO);

const owner = new Map();
const add = (n, f) => { if (!owner.has(n)) owner.set(n, []); owner.get(n).push(f); };
for (const f of files) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|var|class|enum|type|interface)\s+([A-Za-z_$][\w$]*)/gm)) add(m[1], f);
  for (const m of t.matchAll(/^export\s*\{([^}]*)\}/gm))
    for (const piece of m[1].split(",")) { const nm = piece.trim().split(/\s+as\s+/).pop()?.trim(); if (nm) add(nm, f); }
}

// chunk 的 4 条 import
const chunk = readFileSync(CHUNK, "utf8");
const bindings = [];
for (const m of chunk.matchAll(/^import\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)";/gm)) {
  const src = m[2];
  for (const piece of m[1].split(",")) {
    const s = piece.trim(); if (!s) continue;
    const [local, real] = s.includes(" as ") ? s.split(/\s+as\s+/).map((x) => x.trim()) : [s, s];
    bindings.push({ local, real, from: src });
  }
}

// bundle 里每个名字的声明行号
const bundleText = readFileSync(BUNDLE, "utf8");
const lineOf = new Map();
{
  let idx = 0;
  for (const line of bundleText.split("\n")) {
    idx++;
    const m = /^(?:async )?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (m && !lineOf.has(m[1])) lineOf.set(m[1], idx);
  }
}

const VENDOR = /^(react|react-dom|react\/jsx-runtime|react-i18next|i18next|lucide-react|@tanstack\/|zustand|gfm|jsxRuntimeExports|reactExports|reactDomExports|createLucideIcon|useTranslation|useQuery|useQueryClient|QueryClient|QueryClientProvider|MutationCache|__vitePreload|getDefaultExportFromCjs|_mergeNamespaces|getAugmentedNamespace)$/;

const rows = [];
for (const b of bindings) {
  const cands = (owner.get(b.real) ?? []).filter((f) => !f.includes("canvas-v3/"));
  const stripped = b.real.replace(/\$\d+$/, "");
  const variantCands = stripped !== b.real ? (owner.get(stripped) ?? []) : [];
  let status, file = "";
  if (VENDOR.test(b.real) || VENDOR.test(stripped)) status = "vendor";
  else if (cands.length) { status = "tree"; file = cands[0]; }
  else if (variantCands.length) { status = "variant"; file = variantCands[0]; }
  else status = "missing";
  rows.push({ ...b, status, file, bundleLine: lineOf.get(b.real) ?? lineOf.get(stripped) ?? null });
}

const count = (s) => rows.filter((r) => r.status === s).length;
writeFileSync("/tmp/v3-main-exports.json", JSON.stringify(rows, null, 2) + "\n", "utf8");
console.log(`P1 边界清单：${rows.length} 条绑定（chunk 的 import 总数）`);
for (const s of ["tree", "variant", "missing", "vendor"]) console.log(`  ${s.padEnd(8)}: ${count(s)}`);
const missingNoLine = rows.filter((r) => r.status === "missing" && !r.bundleLine).length;
console.log(`  missing 里没有 bundle 行号的: ${missingNoLine}（多为局部变量泄漏）`);
console.log("\nmissing 前 15（有行号的）：");
for (const r of rows.filter((x) => x.status === "missing" && x.bundleLine).slice(0, 15))
  console.log(`  ${String(r.bundleLine).padStart(7)}  ${r.real}`);
