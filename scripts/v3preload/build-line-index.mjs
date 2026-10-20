/**
 * bundle 行号索引（第 214 轮）。
 *
 * 解决的问题：参照 bundle 里 `$n` 后缀的名字（`owners$1` / `id$6`）与树里的名字不是一对一，
 * 按名字匹配会失败。这里改用**函数体哈希**匹配 —— 同一个实体的体是一样的，名字不重要。
 *
 * 输出 scripts/v3preload/bundle-line-index.json：
 *   { generatedAt, bundle, entries: [{ startLine, endLine, bundleName, file, treeName, hash }], unmatched }
 *
 * 用法：node scripts/v3preload/build-line-index.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const BUNDLE = ".probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js";
const ROOT = "app/renderer/src";
const OUT = "scripts/v3preload/bundle-line-index.json";

const DECL = /^(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/;
const norm = (s) =>
  createHash("sha256")
    .update(s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ").replace(/\s+/g, ""))
    .digest("hex")
    .slice(0, 16);

function declsOf(lines, allowIndent = false) {
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    const m = DECL.exec(lines[i]);
    if (m) starts.push({ i, name: m[1] });
  }
  const out = [];
  for (let k = 0; k < starts.length; k++) {
    const a = starts[k].i;
    const b = k + 1 < starts.length ? starts[k + 1].i - 1 : lines.length - 1;
    const body = lines.slice(a, b + 1).join("\n");
    if (body.replace(/\s+/g, "").length < 300) continue; // 太小，哈希没有区分度
    out.push({ name: starts[k].name, start: a + 1, end: b + 1, text: body, hash: norm(body) });
  }
  return out;
}

const bundleLines = readFileSync(BUNDLE, "utf8").split("\n");
const bundleDecls = declsOf(bundleLines);
console.log(`bundle 顶层声明 ${bundleDecls.length} 个`);

const byHash = new Map();
for (const d of bundleDecls) {
  if (!byHash.has(d.hash)) byHash.set(d.hash, []);
  byHash.get(d.hash).push(d);
}

const files = [];
(function w(d) {
  for (const e of readdirSync(d)) {
    const p = path.join(d, e);
    const st = statSync(p);
    if (st.isDirectory()) { if (e !== "node_modules") w(p); }
    else if (/\.(js|jsx)$/.test(e) && !/\.test\./.test(p)) files.push(p);
  }
})(ROOT);
console.log(`树内文件 ${files.length} 个`);

const entries = [];
const matchedBundle = new Set();
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  for (const d of declsOf(lines)) {
    const cands = byHash.get(d.hash);
    if (!cands) continue;
    for (const c of cands) {
      entries.push({
        startLine: c.start, endLine: c.end, bundleName: c.name,
        file: f.replace(ROOT + "/", ""), treeName: d.name, hash: c.hash,
      });
      matchedBundle.add(c.start);
    }
  }
}
entries.sort((a, b) => a.startLine - b.startLine);
const unmatched = bundleDecls.filter((d) => !matchedBundle.has(d.start)).map((d) => ({ startLine: d.start, endLine: d.end, name: d.name }));

writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(),
  bundle: BUNDLE,
  bundleDecls: bundleDecls.length,
  treeFiles: files.length,
  matched: entries.length,
  unmatchedCount: unmatched.length,
  entries,
  unmatched,
}, null, 1));

console.log(`匹配 ${entries.length} 条（覆盖 bundle 声明 ${matchedBundle.size}/${bundleDecls.length}）`);
console.log(`未匹配 ${unmatched.length} 个 bundle 声明`);
console.log(`已写入 ${OUT}`);
