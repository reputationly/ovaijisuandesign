#!/usr/bin/env node
/**
 * P2-1 第一步：识别 ui-components.js 里的 vendor 声明。
 *
 * 判据（三者同时满足）：
 *   1. 名字在 ui-components.js 顶层声明；
 *   2. 名字能在 npm 包里找到同名导出（按包名白名单）；
 *   3. 名字不在主树 app/renderer/src 的其它文件里被声明。
 *
 * 只做「识别 + 报告」，不改文件。
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const TARGET = "app/renderer/src/canvas-v3/ui-components.js";
const ROOT = "app/renderer/src";
const NM = "app/renderer/node_modules";

const VENDOR_PKGS = [
  "@tiptap/core", "@tiptap/react", "@tiptap/pm", "@tiptap/starter-kit", "@tiptap/extensions",
  "prosemirror-state", "prosemirror-view", "prosemirror-model", "prosemirror-commands",
  "prosemirror-keymap", "prosemirror-schema-list", "prosemirror-history", "prosemirror-dropcursor",
  "prosemirror-gapcursor", "prosemirror-inputrules", "prosemirror-transform", "prosemirror-tables",
  "linkifyjs", "linkify-react", "fast-equals",
];

// 收集 npm 导出名
const npmExports = new Map();
for (const pkg of VENDOR_PKGS) {
  const dir = path.join(NM, pkg);
  if (!existsSync(dir)) continue;
  const pj = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
  for (const [sub, rel] of Object.entries({ ".": pj.main ?? "index.js", ...(pj.exports ?? {}) })) {
    const entry = typeof rel === "string" ? rel : rel?.import ?? rel?.require ?? rel?.default;
    if (typeof entry !== "string") continue;
    const p = path.join(dir, entry);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, "utf8");
    for (const m of src.matchAll(/(?:^|[\s,{])([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)/g)) npmExports.set(m[2], pkg);
    for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) npmExports.set(m[1], pkg);
    // CJS：exports.X = X
    for (const m of src.matchAll(/^exports\.([A-Za-z_$][\w$]*)\s*=/gm)) npmExports.set(m[1], pkg);
    for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm))
      for (const piece of m[1].split(",")) { const nm = piece.trim().split(/\s+as\s+/).pop()?.trim(); if (nm) npmExports.set(nm, pkg); }
  }
}

// 主树其它文件的声明名
const treeDecl = new Map();
(function walk(d) { for (const e of readdirSync(d)) { const p = path.join(d, e); const s = statSync(p);
  if (s.isDirectory()) { if (!p.includes("canvas-v3")) walk(p); }
  else if (/\.(js|jsx)$/.test(e) && p !== TARGET) {
    for (const m of readFileSync(p, "utf8").matchAll(/^(?:async )?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm))
      if (!treeDecl.has(m[1])) treeDecl.set(m[1], p);
  } } })(ROOT);

// 目标文件的声明
const tgt = readFileSync(TARGET, "utf8");
const decls = [];
for (const m of tgt.matchAll(/^(?:async )?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) decls.push(m[1]);
const uniq = [...new Set(decls)];

const vendor = [], keep = [];
for (const n of uniq) {
  // 直接同名，或去掉 $n 后缀后同名（bundle 里 vendor 常量被改名成 X$2 这种）
  const base = n.replace(/\$\d+$/, "");
  const pkg = npmExports.get(n) ?? (base !== n ? npmExports.get(base) : undefined);
  if (pkg && !treeDecl.has(n)) vendor.push({ name: n, pkg, base });
  else keep.push(n);
}
console.log(`ui-components.js 顶层声明（去重）: ${uniq.length}`);
console.log(`  可判为 vendor（npm 有同名导出、主树没有）: ${vendor.length}`);
console.log(`  保留: ${keep.length}`);
const byPkg = new Map();
for (const v of vendor) byPkg.set(v.pkg, (byPkg.get(v.pkg) ?? 0) + 1);
console.log("\n按包分组（前 12）：");
for (const [p, c] of [...byPkg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${String(c).padStart(4)}  ${p}`);
import("node:fs").then(({ writeFileSync }) => {
  writeFileSync("/tmp/v3-vendor.json", JSON.stringify(vendor, null, 2) + "\n", "utf8");
  writeFileSync("/tmp/v3-vendor-names.txt", vendor.map((v) => v.name).join("\n") + "\n", "utf8");
});
