#!/usr/bin/env node
/** 把 canvas-v3 的不同名字缺口按来源分类（口径与用户第 118 轮的分析一致）。 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = "app/renderer/src";
const files = [];
(function walk(d) { for (const e of readdirSync(d)) { const p = path.join(d, e); const s = statSync(p);
  if (s.isDirectory()) walk(p); else if (/\.(js|jsx)$/.test(e)) files.push(p); } })(ROOT);

const exported = new Map(), declared = new Map();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/^(?:export\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    if (!declared.has(m[1])) declared.set(m[1], f);
    if (m[0].startsWith("export")) if (!exported.has(m[1])) exported.set(m[1], f);
  }
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm))
    for (const p of m[1].split(",")) { const nm = p.trim().split(/\s+as\s+/).pop()?.trim(); if (nm && !exported.has(nm)) exported.set(nm, f); }
}

let out = "";
try { execFileSync(process.execPath, ["scripts/desource/check-undef.mjs"], { stdio: "pipe", maxBuffer: 256 * 1024 * 1024 }); }
catch (e) { out = String(e.stderr ?? ""); }

const gaps = new Set();
for (const line of out.split("\n")) {
  const m = /^(app\/renderer\/src\/canvas-v3\/[^:]+):\d+:\d+ \[unbound\]\s*(\S+)/.exec(line);
  if (m) gaps.add(m[2]);
}

const lucideDir = "app/renderer/node_modules/lucide-react/dist/esm/icons";
const lucide = new Set(existsSync(lucideDir) ? readdirSync(lucideDir).filter((f) => f.endsWith(".js"))
  .map((f) => f.replace(/\.js$/, "").split("-").map((x) => x[0].toUpperCase() + x.slice(1)).join("")) : []);
const STD = /^(react|jsxRuntime|useTranslation|useQuery|useQueryClient|QueryClient|QueryClientProvider|MutationCache|__vite|getDefaultExportFromCjs|_mergeNamespaces|getAugmentedNamespace|i18n|instance|shallow$)/;

const buckets = { std: [], tree: [], variant: [], icon: [], declaredOnly: [], bundleOnly: [] };
for (const n of gaps) {
  const base = n.replace(/\$\d+$/, "");
  if (STD.test(n)) buckets.std.push(n);
  else if (exported.has(n)) buckets.tree.push(n);
  else if (base !== n && exported.has(base)) buckets.variant.push(n);
  else if (lucide.has(base)) buckets.icon.push(n);
  else if (declared.has(n)) buckets.declaredOnly.push(n);
  else buckets.bundleOnly.push(n);
}
console.log(`不同名字缺口: ${gaps.size}`);
for (const [k, v] of Object.entries(buckets)) console.log(`  ${k.padEnd(14)}: ${v.length}`);
console.log("\nbundleOnly 前 25:", buckets.bundleOnly.slice(0, 25).join(", "));
console.log("\ndeclaredOnly 前 15:", buckets.declaredOnly.slice(0, 15).join(", "));
import("node:fs").then(({ writeFileSync }) => writeFileSync("/tmp/v3-buckets.json", JSON.stringify(buckets, null, 1)));
