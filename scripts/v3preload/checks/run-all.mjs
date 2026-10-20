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

// L0 常量对照（第 232 轮改为**阻断模式**）：
// 37 处不一致已逐条处理完（14+1 处改成参照值、18 处登记进 constants-intentional.json）。
// 现在有新的未登记差异就会失败。
try {
  execFileSync(process.execPath, [path.join(here, "../check-constants.mjs")], { stdio: "inherit" });
} catch {
  console.log("✗ 常量对照未通过：有未登记的不一致（真缺陷请修，非缺陷请登记进 constants-intentional.json）");
  process.exit(1);
}

// L0 gateway 协议对比（第 243 轮，用户方案硬规则 5）：拿录好的参照夹具比对我们的 gateway。
// 需要先构建 gateway；构建产物不在时跳过并提示（不静默通过）。
try {
  const gw = execFileSync(process.execPath, [path.join(here, "../../gateway-compare/compare.mjs")], { encoding: "utf-8", stdio: "pipe" });
  console.log("✓ gateway 协议与参照一致");
} catch (e) {
  const out = String(e.stdout ?? "");
  if (out.includes("没起来")) {
    console.log("⚠ gateway 协议对比跳过（gateway 未构建，先跑 cd app/gateway && pnpm run build）");
  } else {
    console.log("✗ gateway 协议不一致");
    console.log(out.split("\n").filter((l) => l.startsWith("  ")).join("\n"));
    process.exit(1);
  }
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
