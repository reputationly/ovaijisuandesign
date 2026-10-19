#!/usr/bin/env node
/**
 * P3 修正版：只归并**同时满足三个条件**的重复名字。
 *
 * 1. 两份实现的归一化函数体哈希**相同**；
 * 2. keeper 文件**确实 export** 该名字；
 * 3. 不是会被重新赋值的 `var`、不是 GLSL 文本里的伪声明。
 *
 * 只输出计划，不改文件。
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const DIR = "app/renderer/src/canvas-v3";
const files = readdirSync(DIR).filter((f) => /\.(js|jsx)$/.test(f)).map((f) => path.join(DIR, f));

const GLSL = new Set(["float","vec2","vec3","vec4","mat2","mat3","mat4","uniform","precision",
  "varying","attribute","sampler2D","epsilon","PI","RGB2Y","matRGBtoROMM","matROMMtoRGB","mx",
  "blackVertexSource","vertexSource","blackPaletteFragment","passFragment","brightnessFragment"]);

function spans(src) {
  const out = [];
  const re = /^(?:async )?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(src))) out.push({ name: m[1], start: m.index, line: src.slice(0, m.index).split("\n").length });
  for (let i = 0; i < out.length; i++) out[i].end = i + 1 < out.length ? out[i + 1].start : src.length;
  return out;
}
const norm = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ")
  .replace(/\s+/g, "").replace(/;+$/g, "");
const hash = (s) => createHash("sha256").update(norm(s)).digest("hex").slice(0, 16);

const byName = new Map();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const exported = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|var|class|enum|type|interface)\s+([A-Za-z_$][\w$]*)/gm)) exported.add(m[1]);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm))
    for (const p of m[1].split(",")) { const nm = p.trim().split(/\s+as\s+/).pop()?.trim(); if (nm) exported.add(nm); }
  for (const s of spans(src)) {
    const body = src.slice(s.start, s.end);
    const isVar = /^var\s/.test(body.trim());
    const reassigned = new RegExp(`(?:^|[^.\\w$])${s.name.replace(/[$]/g, "\\$")}\\s*=[^=]`, "m").test(src.replace(/^(?:var|let|const|function|class)[^\n]*\n/gm, ""));
    if (!byName.has(s.name)) byName.set(s.name, []);
    byName.get(s.name).push({ file: f, hash: hash(body), len: body.length, exported: exported.has(s.name), isVar, reassigned, line: s.line });
  }
}

const plan = [];
const rejected = [];
for (const [name, list] of byName) {
  if (list.length < 2) continue;
  if (GLSL.has(name)) { rejected.push({ name, why: "GLSL 伪声明" }); continue; }
  if (list.some((x) => x.isVar || x.reassigned)) { rejected.push({ name, why: "会被重新赋值的 var" }); continue; }
  const hashes = new Set(list.map((x) => x.hash));
  if (hashes.size !== 1) { rejected.push({ name, why: "实现不同" }); continue; }
  const keep = list.find((x) => x.exported);
  if (!keep) { rejected.push({ name, why: "没有一份 export" }); continue; }
  // 条件 4：归并后不能形成 import 环
  const deps = new Map();
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    deps.set(f, [...src.matchAll(/^import\s[^;]*from\s*"(\.\/[^"]+)";/gm)].map((m) => path.join(DIR, m[1])));
  }
  const reaches = (from, to, seen = new Set()) => {
    if (from === to) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    for (const d of deps.get(from) ?? []) if (reaches(d, to, seen)) return true;
    return false;
  };
  const cyclic = list.filter((x) => x !== keep).some((x) => reaches(keep.file, x.file));
  if (cyclic) { rejected.push({ name, why: "归并后会成环" }); continue; }
  plan.push({ name, keep: keep.file, drop: list.filter((x) => x !== keep).map((x) => x.file) });
}

console.log(`严格判据下可安全归并: ${plan.length}`);
console.log(`被拒绝: ${rejected.length}`);
const why = new Map();
for (const r of rejected) why.set(r.why, (why.get(r.why) ?? 0) + 1);
for (const [w, n] of [...why.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${w}`);
writeFileSync("/tmp/v3-strict-plan.json", JSON.stringify(plan, null, 1) + "\n");
console.log("\n前 12 条：");
for (const p of plan.slice(0, 12)) console.log(`  ${p.name.padEnd(30)} keep=${path.basename(p.keep)} drop=${p.drop.map((d) => path.basename(d)).join(",")}`);
