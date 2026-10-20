#!/usr/bin/env node
/**
 * 跑全部 v3 自检。
 *
 *   node scripts/v3preload/checks/run-all.mjs
 *
 * 每个检查都用 esbuild 打包成单文件后在 node 里跑：
 * 我们的源码树是 `.js` 里写 JSX、`.ts` 混用的，直接 import 会撞加载器问题。
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const esbuild = path.join(root, "node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild");

const checks = readdirSync(here).filter((f) => f.endsWith(".mjs") && f !== "run-all.mjs" && !f.startsWith("build-and-run"));
// L0：占位扫描必须先过（第 213 轮）。占位一旦进入可达代码，四项指标照样全绿。
try {
  execFileSync(process.execPath, [path.join(here, "../check-placeholders.mjs")], { stdio: "inherit" });
} catch {
  console.log("✗ 占位扫描未通过");
  process.exit(1);
}

let failed = 0;

for (const file of checks.sort()) {
  const entry = path.join(here, file);
  const out = `/tmp/v3-check-${file.replace(/\.mjs$/, "")}.mjs`;
  console.log(`\n──── ${file} ────`);
  try {
    execFileSync(esbuild, [entry, "--bundle", "--format=esm", `--outfile=${out}`, "--loader:.js=jsx", "--loader:.png=file", "--loader:.svg=file", "--loader:.jpg=file",
      `--inject:${path.join(here, "dom-stub.mjs")}`,
      "--external:pdfjs-dist", "--external:./use-window-chrome-*", "--external:./index-*",
      "--external:*.css", "--log-level=error"], { stdio: "inherit" });
    execFileSync(process.execPath, [out], { stdio: "inherit" });
  } catch {
    failed++;
  }
}

console.log(failed === 0 ? "\n✓ 全部自检通过" : `\n✗ ${failed} 个自检失败`);
process.exit(failed === 0 ? 0 : 1);
