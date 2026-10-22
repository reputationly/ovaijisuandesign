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
import { readdirSync, readFileSync } from "node:fs";
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

// L0 未绑定/对象属性（第 306 轮，用户要求）：
// 之前这类问题只是「打印出来」不阻断，于是 image-annotation-dialog.jsx 里
// `TOOLS.map is not a function`（用户点「标注图片」必崩）一直躺在输出里没人管。
// 现在改为阻断：命中数必须与 scripts/desource/undef-allowlist.json 登记的总额相等。
// check-undef 命中时退出码是 1，所以用 try 包住并从 e.stdout 取输出
let out = "";
try {
  out = execFileSync(process.execPath, [path.join(here, "../../desource/check-undef.mjs")], {
    encoding: "utf8",
  });
} catch (e) {
  // check-undef 把结果写 stderr，不是 stdout
  out = String(e?.stderr ?? "") + String(e?.stdout ?? "");
  if (!out) {
    console.log(`✗ 未绑定检查未能运行：${String(e).slice(0, 160)}`);
    process.exit(1);
  }
}
const m = /Found (\d+) unresolved/.exec(out);
const found = m ? Number(m[1]) : 0;
const allow = JSON.parse(
  readFileSync(path.join(here, "../../desource/undef-allowlist.json"), "utf8"),
);
const allowed = (allow.entries ?? []).reduce((n, e) => n + (e.count ?? 0), 0);
if (found !== allowed) {
  console.log(`✗ 未绑定/对象属性检查：实际 ${found} 处，白名单登记 ${allowed} 处`);
  console.log(out.split("\n").filter((l) => l.includes("[")).slice(0, 12).join("\n"));
  process.exit(1);
}
console.log(`未绑定/对象属性：${found} 处，与白名单登记的 ${allowed} 处一致`);

// L0 类型逃逸（第 298 轮，用户要求）：main / preload 的非测试代码里禁止
// `as never` / `as any` / `@ts-ignore` / `@ts-expect-error`。
// 本轮 12 环链路的最后一环就是被 `postMessage(bootstrap as never, …)` 藏起来的。
try {
  execFileSync(process.execPath, [path.join(here, "../../desource/check-type-escapes.mjs")], { stdio: "inherit" });
} catch {
  console.log("✗ 类型逃逸扫描未通过：见上面每条（确属必要的请加进白名单并写明理由）");
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
  console.log("✓ gateway 协议与参照一致（7 条夹具）");
  // 第 252 轮：再加 71 条真实路径的重放对比（真差异必须为 0）
  const replay = execFileSync(process.execPath,
    [path.join(here, "../../gateway-compare/replay.mjs"), "--target", "ours", "--check"],
    { encoding: "utf-8", stdio: "pipe", timeout: 300000 });
  console.log(replay.trim().split("\n").at(-1));
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
    execFileSync(esbuild, [entry, "--bundle", "--format=esm",
      // 第 42 轮：要加 --platform=node，否则检查脚本里的 `node:fs` / `node:path` 解析不了
      "--platform=node", `--outfile=${out}`, "--loader:.js=jsx", "--loader:.png=file", "--loader:.svg=file", "--loader:.jpg=file",
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
