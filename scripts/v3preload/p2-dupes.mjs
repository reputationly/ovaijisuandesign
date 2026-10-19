#!/usr/bin/env node
/**
 * P2-2 第一步：找出 ui-components.js 与主树「同名但可能同一实体」的声明。
 *
 * 比对用**归一化函数体**（去注释/空白/分号），不用名字 —— `$n` 不可靠。
 * 只报告，不改文件。
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const TARGET = "app/renderer/src/canvas-v3/ui-components.js";
const ROOT = "app/renderer/src";

function declSpans(src) {
  const out = [];
  const re = /^(?:async )?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(src))) out.push({ name: m[1], start: m.index });
  for (let i = 0; i < out.length; i++) out[i].end = i + 1 < out.length ? out[i + 1].start : src.length;
  return out;
}

const norm = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ")
    .replace(/\s+/g, "").replace(/;+$/g, "");

const hash = (s) => createHash("sha256").update(norm(s)).digest("hex").slice(0, 16);

// 主树（不含 canvas-v3）的所有声明
const tree = new Map();
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = path.join(d, e);
    const st = statSync(p);
    if (st.isDirectory()) { if (!p.endsWith("canvas-v3")) walk(p); continue; }
    if (!/\.(js|jsx)$/.test(e)) continue;
    const src = readFileSync(p, "utf8");
    for (const d2 of declSpans(src)) {
      const body = src.slice(d2.start, d2.end);
      if (!tree.has(d2.name)) tree.set(d2.name, []);
      tree.get(d2.name).push({ file: p, hash: hash(body), len: body.length });
    }
  }
})(ROOT);

// 目标文件
const tgt = readFileSync(TARGET, "utf8");
const rows = [];
for (const d of declSpans(tgt)) {
  const body = tgt.slice(d.start, d.end);
  const h = hash(body);
  const cands = tree.get(d.name) ?? [];
  let status;
  if (!cands.length) status = "only-in-ui-components";
  else if (cands.some((c) => c.hash === h)) status = "identical";
  else status = "differs";
  rows.push({ name: d.name, len: body.length, hash: h, status, treeFile: cands[0]?.file ?? null, treeLen: cands[0]?.len ?? null });
}

const count = (s) => rows.filter((r) => r.status === s).length;
console.log(`ui-components.js 声明: ${rows.length}`);
console.log(`  与主树完全一致（归一化后哈希相同）: ${count("identical")}`);
console.log(`  同名但实现不同:                     ${count("differs")}`);
console.log(`  主树没有:                           ${count("only-in-ui-components")}`);

const identical = rows.filter((r) => r.status === "identical");
const bytes = identical.reduce((s, r) => s + r.len, 0);
console.log(`\n可安全删除（identical）: ${identical.length} 条 / ${bytes.toLocaleString()} 字符`);

console.log("\ndiffers 前 12（需合并，不能直接删）：");
for (const r of rows.filter((x) => x.status === "differs").slice(0, 12))
  console.log(`  ${r.name.padEnd(34)} ui=${String(r.len).padStart(6)}  tree=${String(r.treeLen).padStart(6)}  ${path.basename(r.treeFile ?? "")}`);

writeFileSync("/tmp/v3-dup-identical.txt", identical.map((r) => r.name).join("\n") + "\n", "utf8");
writeFileSync("/tmp/v3-dup-differs.json", JSON.stringify(rows.filter((r) => r.status === "differs"), null, 2) + "\n", "utf8");
