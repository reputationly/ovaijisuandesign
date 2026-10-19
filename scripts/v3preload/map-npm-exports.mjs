#!/usr/bin/env node
/**
 * 为 ui-components.js 需要的每个内部工具名，在真实包里 **grep 确定导出**。
 *
 * 不再按名字猜 state/view/model/core —— 第 148 轮就是因为猜错包名失败的。
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const NM = "app/renderer/node_modules";
const PKGS = [
  "prosemirror-state", "prosemirror-view", "prosemirror-model", "prosemirror-commands",
  "prosemirror-keymap", "prosemirror-history", "prosemirror-inputrules", "prosemirror-transform",
  "prosemirror-schema-list", "prosemirror-dropcursor", "prosemirror-gapcursor", "prosemirror-tables",
  "@tiptap/core", "@tiptap/react", "@tiptap/extensions",
];

// 目标文件里所有「被 import 但本地没有声明」的名字
const target = "app/renderer/src/canvas-v3/ui-components.js";
let undef = "";
try { execFileSync(process.execPath, ["scripts/desource/check-undef.mjs"], { stdio: "pipe", maxBuffer: 256 * 1024 * 1024 }); }
catch (e) { undef = String(e.stderr ?? ""); }
// 这里要的是「文件当前 import 了哪些名字」，直接从 import 行取
const src = readFileSync(target, "utf8");
const wanted = new Set();
for (const m of src.matchAll(/^import \{ (.*) \} from "(?:prosemirror-[^"]+|@tiptap\/[^"]+)";$/gm))
  for (const x of m[1].split(",")) { const s = x.trim(); if (s) wanted.add(s.split(" as ")[0].trim()); }

const exportedBy = new Map(); // name -> [pkg]
for (const pkg of PKGS) {
  const dir = path.join(NM, pkg);
  if (!existsSync(dir)) continue;
  const files = [];
  (function walk(d) {
    for (const e of readdirSync(d)) {
      const p = path.join(d, e); const st = statSync(p);
      if (st.isDirectory()) { if (e !== "node_modules") walk(p); }
      else if (/\.(js|mjs|cjs|d\.ts)$/.test(e) && st.size < 4 * 1024 * 1024) files.push(p);
    }
  })(dir);
  for (const f of files) {
    const body = readFileSync(f, "utf8");
    for (const m of body.matchAll(/^export\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|class|interface|type)\s+([A-Za-z_$][\w$]*)/gm)) {
      if (!exportedBy.has(m[1])) exportedBy.set(m[1], new Set());
      exportedBy.get(m[1]).add(pkg);
    }
    for (const m of body.matchAll(/^export\s*\{([^}]*)\}/gm))
      for (const p of m[1].split(",")) {
        const nm = p.trim().split(/\s+as\s+/).pop()?.trim();
        if (nm) { if (!exportedBy.has(nm)) exportedBy.set(nm, new Set()); exportedBy.get(nm).add(pkg); }
      }
    for (const m of body.matchAll(/^exports\.([A-Za-z_$][\w$]*)\s*=/gm)) {
      if (!exportedBy.has(m[1])) exportedBy.set(m[1], new Set());
      exportedBy.get(m[1]).add(pkg);
    }
  }
}

const map = {}, missing = [];
for (const n of [...wanted].sort()) {
  const pkgs = exportedBy.get(n);
  if (pkgs) map[n] = [...pkgs];
  else missing.push(n);
}
console.log(`目标文件当前 import 的 npm 名字: ${wanted.size}`);
console.log(`能在真实包里确认导出的: ${Object.keys(map).length}`);
console.log(`确认不到的: ${missing.length}`);
for (const [n, p] of Object.entries(map).slice(0, 28)) console.log(`  ${n.padEnd(26)} ${p.join(", ")}`);
if (missing.length) console.log("\n确认不到（需另找来源或本地实现）:", missing.slice(0, 20).join(", "));
writeFileSync("/tmp/v3-npm-map.json", JSON.stringify({ map, missing }, null, 1));
