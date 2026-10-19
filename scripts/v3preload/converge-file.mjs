#!/usr/bin/env node
/**
 * 把单个 canvas-v3 文件的缺口跑到 0（可重复执行，幂等）。
 *
 * 循环：fix-file-gaps（可解析的接 import）→ resolve-names（主包取回）→
 *       dedupe（文件内去重）→ 重建导出 → 清 GLSL 伪声明。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const target = process.argv[2];
const MAX = Number(process.argv[3] ?? 6);
const ROOT = process.cwd();

const run = (cmd, args) => {
  try { return execFileSync(cmd, args, { stdio: "pipe", maxBuffer: 256 * 1024 * 1024 }).toString(); }
  catch (e) { return String(e.stderr ?? "") + String(e.stdout ?? ""); }
};

const countGaps = () => {
  const out = run(process.execPath, ["scripts/desource/check-undef.mjs"]);
  const rel = path.relative(ROOT, target).replace(/\\/g, "/");
  const set = new Set();
  for (const line of out.split("\n")) {
    const m = new RegExp(`^${rel.replace(/[$]/g, "\\$")}:\\d+:\\d+ \\[unbound\\]\\s*(\\S+)`).exec(line);
    if (m) set.add(m[1]);
  }
  return set;
};

const rebuildExports = () => {
  const t = readFileSync(target, "utf8");
  const i = t.lastIndexOf("\nexport {\n");
  const head = i >= 0 ? t.slice(0, i) : t;
  const decl = new Set([...head.matchAll(/^(?:async )?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]));
  const imported = new Set();
  for (const m of head.matchAll(/^import \{ (.*) \} from "[^"]+";$/gm))
    for (const x of m[1].split(",")) { const s = x.trim(); if (s) imported.add(s.split(" as ").pop().trim()); }
  const GLSL = new Set(["float","vec2","vec3","vec4","mat2","mat3","mat4","uniform","precision",
    "varying","attribute","sampler2D","epsilon","PI","RGB2Y","matRGBtoROMM","matROMMtoRGB","mx",
    "blackVertexSource","vertexSource","blackPaletteFragment","passFragment","brightnessFragment",
    "contrastFragment","blacksFragment","dehazeFragment","bloomFragment","glamourFragment",
    "clarityFragment","kernelFragment","blurFragment","vignetteFragment","grainFragment",
    "lutFragment","PALETTE_SIZE","SHARPEN_KERNEL"]);
  const names = [...decl].filter((n) => !imported.has(n) && !GLSL.has(n)).sort();
  writeFileSync(target, head.replace(/\s+$/, "") + "\n\nexport {\n" + names.map((n) => `  ${n},`).join("\n") + "\n};\n", "utf8");
  return names.length;
};

const cleanGlsl = () => {
  for (let i = 0; i < 4; i++) {
    const out = run("node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild",
      [target, "--bundle", "--format=esm", "--outfile=/dev/null", "--loader:.js=jsx", "--loader:.png=file", "--log-limit=0"]);
    const bad = new Set([...out.matchAll(/"([A-Za-z_$][\w$]*)" is not declared in this file/g)].map((m) => m[1]));
    if (!bad.size) return true;
    const lines = readFileSync(target, "utf8").split("\n")
      .filter((l) => !(l.startsWith("  ") && l.trim().replace(/,$/, "") && bad.has(l.trim().replace(/,$/, ""))));
    writeFileSync(target, lines.join("\n"), "utf8");
  }
  return false;
};

const stripNative = () => {
  const lines = readFileSync(target, "utf8").split("\n").filter((l) => !l.includes("[native code]"));
  writeFileSync(target, lines.join("\n"), "utf8");
};

for (let round = 1; round <= MAX; round++) {
  let gaps = countGaps();
  console.log(`第 ${round} 轮：缺口 ${gaps.size}`);
  if (!gaps.size) break;

  // 1) 可解析的接 import
  run(process.execPath, ["scripts/v3preload/fix-file-gaps.mjs", target, "--apply"]);
  stripNative();
  rebuildExports();
  cleanGlsl();

  // 2) 剩下的从主包取回
  gaps = countGaps();
  if (gaps.size) {
    const out = run(process.execPath, ["/tmp/resolve-names.mjs", ...[...gaps]]);
    const body = readFileSync("/tmp/extra-names.js", "utf8")
      .split("\n").filter((l) => !l.includes("[native code]") && !l.startsWith("import ") && !l.startsWith("export ")).join("\n").trim();
    if (body) {
      let t = readFileSync(target, "utf8");
      const i = t.lastIndexOf("\nexport {\n");
      if (i >= 0) t = t.slice(0, i) + "\n\n// converge 取回\n" + body + t.slice(i);
      else t += "\n\n// converge 取回\n" + body;
      writeFileSync(target, t, "utf8");
      rebuildExports();
      cleanGlsl();
    }
  }
  // 3) 文件内去重
  run(process.execPath, ["/tmp/dedupe.mjs", target]);
  rebuildExports();
  cleanGlsl();
  console.log(`  导出 ${rebuildExports()}`);
}
console.log(`最终缺口 ${countGaps().size}`);
