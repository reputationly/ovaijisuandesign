#!/usr/bin/env node
/**
 * P2-1b：用**函数体**判定 vendor（不靠名字）。
 *
 * 做法：把 npm 里所有相关包的 dist 源码归一化成一个大语料，
 * 然后对 ui-components.js 的每条声明取主体归一化后的 120 字符签名做包含判断。
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const NM = "app/renderer/node_modules";
const PKGS = ["prosemirror-model", "prosemirror-state", "prosemirror-view", "prosemirror-transform",
  "prosemirror-commands", "prosemirror-keymap", "prosemirror-history", "prosemirror-inputrules",
  "prosemirror-schema-list", "prosemirror-dropcursor", "prosemirror-gapcursor", "prosemirror-tables",
  "@tiptap/core", "@tiptap/pm", "@tiptap/react", "@tiptap/starter-kit",
  "@lezer/common", "@lezer/lr", "@lezer/markdown", "@lezer/highlight",
  "linkifyjs", "fast-equals"];
const TARGET = "app/renderer/src/canvas-v3/ui-components.js";

const norm = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ")
  .replace(/\s+/g, "").replace(/;+$/g, "");

// 语料
let corpus = "";
for (const pkg of PKGS) {
  const dir = path.join(NM, pkg);
  if (!existsSync(dir)) continue;
  (function walk(d) {
    for (const e of readdirSync(d)) {
      const p = path.join(d, e);
      const st = statSync(p);
      if (st.isDirectory()) { walk(p); continue; }
      if (!/\.(js|mjs|cjs)$/.test(e)) continue;
      if (st.size > 4 * 1024 * 1024) continue;
      corpus += norm(readFileSync(p, "utf8")) + "\n";
    }
  })(dir);
}
console.log(`vendor 语料: ${(corpus.length / 1e6).toFixed(1)} MB`);

// 目标声明
const tgt = readFileSync(TARGET, "utf8");
const spans = [];
const re = /^(?:async )?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
let m;
while ((m = re.exec(tgt))) spans.push({ name: m[1], start: m.index });
for (let i = 0; i < spans.length; i++) spans[i].end = i + 1 < spans.length ? spans[i + 1].start : tgt.length;

const vendor = [], keep = [];
for (const s of spans) {
  const body = norm(tgt.slice(s.start, s.end));
  if (body.length < 120) { keep.push(s.name); continue; }
  // 取中段 120 字符做签名（避开声明头，头部名字常被改写）
  const sig = body.slice(Math.floor(body.length / 2), Math.floor(body.length / 2) + 120);
  if (corpus.includes(sig)) vendor.push(s.name);
  else keep.push(s.name);
}
console.log(`声明 ${spans.length}：vendor(函数体命中) ${vendor.length}，保留 ${keep.length}`);
writeFileSync("/tmp/v3-vendor-body-names.txt", vendor.join("\n") + "\n", "utf8");
console.log("\nvendor 前 20:", vendor.slice(0, 20).join(", "));
