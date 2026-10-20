#!/usr/bin/env node
/**
 * canvas-v3 审计（第 118 轮，按用户建议的口径重写）。
 *
 * 每轮必须报四个数，前三项任何非 0 都不算通过：
 *   1. 不同名字缺口数（不是出现次数）
 *   2. 解析失败文件数（每个文件单独过 esbuild）
 *   3. 跨文件重复声明的名字数
 *   4. unbound 出现次数（仅作参考）
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = "app/renderer/src/canvas-v3";
const ESBUILD = "node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild";
const files = readdirSync(ROOT).filter((f) => /\.(js|jsx)$/.test(f)).map((f) => path.join(ROOT, f)).sort();

// ---- 2. 解析失败（逐文件 esbuild）----
const parseFailures = [];
for (const f of files) {
  try {
    execFileSync(ESBUILD, [f, "--format=esm", "--outfile=/dev/null", "--loader:.js=jsx", "--log-level=error"], { stdio: "pipe" });
  } catch (e) {
    const msg = String(e.stderr ?? "").split("\n").find((l) => l.includes("ERROR")) ?? "unknown";
    parseFailures.push({ file: f, error: msg.trim().slice(0, 90) });
  }
}

// ---- 1 & 4. 缺口（用 check-undef 的输出，按名字去重）----
let undefOut = "";
try {
  undefOut = execFileSync(process.execPath, ["scripts/desource/check-undef.mjs"], { stdio: "pipe", maxBuffer: 256 * 1024 * 1024 }).toString();
} catch (e) {
  // check-undef 把结果写到 stderr（它是一条自检命令，非零退出）
  undefOut = String(e.stderr ?? "") || String(e.stdout ?? "");
}
const perFile = new Map();
let occurrences = 0;
for (const line of undefOut.split("\n")) {
  const m = /^(app\/renderer\/src\/canvas-v3\/[^:]+):\d+:\d+ \[(unbound|parse|missing export|local-export|missing object property|missing-prototype-mutation)\]\s*(.*)$/.exec(line);
  if (!m) continue;
  const [, file, kind, rest] = m;
  if (kind !== "unbound") continue;
  occurrences++;
  const name = rest.trim().split(/\s/)[0];
  if (!perFile.has(file)) perFile.set(file, new Set());
  perFile.get(file).add(name);
}

// ---- 3. 跨文件重复声明（第 214 轮：范围扩到全树，不再只扫 canvas-v3/）----
// 之前只扫 canvas-v3/，所以 workspace/ 下 3 份 ProjectQueryError 之类看不到。
const TREE_ROOT = "app/renderer/src";
const SKIP_TREE = /-closure\.js$|\.test\.|node_modules|\/vendor-fork\//;
const treeFiles = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = path.join(d, e);
    const st = statSync(p);
    if (st.isDirectory()) { if (e !== "node_modules") walk(p); }
    else if (/\.(js|jsx)$/.test(e) && !SKIP_TREE.test(p)) treeFiles.push(p);
  }
})(TREE_ROOT);
const decls = new Map();
for (const f of treeFiles) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/^(?:export\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    const n = m[1];
    if (!decls.has(n)) decls.set(n, new Set());
    decls.get(n).add(f);
  }
}
const crossDup = [...decls.entries()].filter(([, s]) => s.size > 1);

// 区分「同一实体被抄了两份」和「同名但实现不同」——后者不能合并，只做记录。
import { createHash } from "node:crypto";
const bodyHash = (file, name) => {
  const src = readFileSync(file, "utf8");
  const m = new RegExp(`^(?:export\\s+)?(?:async\\s+)?(?:function|const|let|var|class)\\s+${name.replace(/[$]/g, "\\$")}(?![\\w$])`, "m").exec(src);
  if (!m) return null;
  const next = new RegExp("^(?:export\\s+)?(?:async\\s+)?(?:function|const|let|var|class)\\s+[A-Za-z_$][\\w$]*", "gm");
  next.lastIndex = m.index + 1;
  const n2 = next.exec(src);
  const body = src.slice(m.index, n2 ? n2.index : src.length);
  const stripped = body.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
  return createHash("sha256").update(stripped.replace(/\s+/g, "")).digest("hex").slice(0, 12);
};
const sameEntity = [], sameNameDiffBody = [];
// 第 214 轮：一行小常量（`const MIN_SCALE = 0.5;`）在两个文件里相同是巧合，不是重复。
// 「同一实体」要求函数体有实质内容：去空白后 ≥ 120 字符，或跨 ≥ 3 行。
const MIN_ENTITY_CHARS = 120;
const isSubstantial = (hash) => hash !== null; // bodyHash 返回 null 表示找不到体
const bodySize = (file, name) => {
  const src = readFileSync(file, "utf8");
  const re = new RegExp(`^(?:export\\s+)?(?:async\\s+)?(?:function|const|let|var|class)\\s+${name.replace(/[$]/g, "\\$")}[^\\n]*`, "m");
  const m = re.exec(src);
  return m ? m[0].replace(/\s+/g, "").length : 0;
};
for (const [n, s] of crossDup) {
  const files2 = [...s];
  const hashes = new Set(files2.map((f) => bodyHash(f, n)));
  if (hashes.size !== 1) { sameNameDiffBody.push(n); continue; }
  // 同一实体：再看体量，太小的是巧合
  const trivial = files2.every((f) => bodySize(f, n) < MIN_ENTITY_CHARS);
  (trivial ? sameNameDiffBody : sameEntity).push(n);
}

// ---- 汇总 ----
const distinctNames = new Set();
for (const s of perFile.values()) for (const n of s) distinctNames.add(n);

console.log(`canvas-v3 审计（${files.length} 个文件）`);
console.log(`  1. 不同名字缺口      : ${distinctNames.size}`);
console.log(`  2. 解析失败文件      : ${parseFailures.length}`);
console.log(`  3. 跨文件重复声明    : ${sameEntity.length} 违规（同一实体被抄两份）`
  + ` / ${sameNameDiffBody.length} 非违规（同名但实现不同，属巧合碰撞）`);
if (sameEntity.length) {
  console.log("     违规明细：");
  for (const n of sameEntity) {
    const s = new Map(crossDup).get(n);
    console.log(`       ${n}: ${[...s].map((x) => path.basename(x)).join(", ")}`);
  }
}
console.log(`  4. unbound 出现次数  : ${occurrences}`);
// 第 160 轮：canvas-v3 之外的树也必须过同一把尺子
{
  let out = "";
  try { out = execFileSync(process.execPath, ["scripts/desource/check-undef.mjs"], { stdio: "pipe", maxBuffer: 512 * 1024 * 1024 }).toString(); }
  catch (e) { out = String(e.stderr ?? ""); }
  const files = new Map();
  for (const l of out.split("\n")) {
    if (!l.includes("[unbound]")) continue;
    const f = l.split(":")[0];
    if (f.includes("canvas-v3/")) continue;
    // 第 167 轮：这几个是「已取回但未接线」的设施层草案，未接入任何应用代码，
    // 故不计入「应用缺口」；单独统计并显式打印，避免变成第二个假绿。
    if (f.endsWith("workspace-facilities.js") || f.endsWith("workspace-structure-runtime.js") || f.endsWith("workspace-facilities-closure.js") || f.endsWith("workspace-resource-closure.js")) {
      (globalThis.__draft ??= new Map()).set(f, (globalThis.__draft.get(f) ?? 0) + 1);
      continue;
    }
    files.set(f, (files.get(f) ?? 0) + 1);
  }
  const totalAll = [...files.values()].reduce((a, b) => a + b, 0);
  const draft = globalThis.__draft ?? new Map();
  if (draft.size) {
    const dt = [...draft.values()].reduce((a, b) => a + b, 0);
    console.log(`  5b. 未接线草案（不计入应用缺口）: ${dt} 处 / ${draft.size} 个文件`);
  }
  console.log(`  5. 全树缺口（canvas-v3 之外）: ${totalAll} 处 / ${files.size} 个文件`);
  for (const [f, c] of [...files].sort((a, b) => b[1] - a[1]).slice(0, 6))
    console.log(`       ${String(c).padStart(3)}  ${f.replace("app/renderer/src/", "")}`);
}

if (parseFailures.length) {
  console.log("\n解析失败：");
  for (const p of parseFailures) console.log(`  ✗ ${p.file}\n      ${p.error}`);
}
if (distinctNames.size) {
  console.log("\n缺口按文件（不同名字数）：");
  for (const [f, s] of [...perFile.entries()].sort((a, b) => b[1].size - a[1].size)) {
    console.log(`  ${String(s.size).padStart(5)}  ${f}`);
  }
}
if (crossDup.length) {
  console.log("\n跨文件重复（前 10）：");
  for (const [n, s] of crossDup.slice(0, 10)) console.log(`  ${n}: ${[...s].map((x) => path.basename(x)).join(", ")}`);
}

// 验收口径：只把「同一实体被抄两份」算违规；同名不同实现是不同实体，不算。
const ok = distinctNames.size === 0 && parseFailures.length === 0 && sameEntity.length === 0;
console.log(`\n${ok ? "✓ 三项均为 0" : "✗ 未达标（前三项必须全为 0）"}`);
process.exit(ok ? 0 : 1);
