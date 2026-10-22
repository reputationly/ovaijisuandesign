#!/usr/bin/env node
/**
 * 把某个版本的参考产物 `out/renderer` 铺成 `app/desktop/out/reference-ui`，
 * 让界面走查可以用 `OV_UI=reference` 跑**原版界面**，从而录出真基线。
 *
 * 用法：
 *   node scripts/ui-compare/stage-reference-ui.mjs              # 默认 4.0.0
 *   node scripts/ui-compare/stage-reference-ui.mjs 4.0.3        # 铺 4.0.3
 *
 * 为什么需要按版本传参：门禁比的是「我们 vs 基线」，
 * 而基线是用哪个版本的参考界面录的，决定了这个比较有没有意义。
 * 还原 4.0.3 却拿 4.0.0 的基线去比，方向是相反的（见 docs/4.0.3-gate-baseline-truth.md）。
 *
 * 只复制静态资源，不改任何字节。
 */
import { cpSync, existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const repo = path.resolve(import.meta.dirname, "../..");
// 版本可由第一个参数指定，缺省 4.0.0 —— 保证原有调用不受影响。
const version = process.argv[2] || "4.0.0";
const src = path.join(repo, `.probe/reference/${version}/asar/out/renderer`);
const dst = path.join(repo, "app/desktop/out/reference-ui");

if (!existsSync(path.join(src, "index.html"))) {
  console.error(`找不到参考界面：${src}`);
  process.exit(1);
}
rmSync(dst, { recursive: true, force: true });
cpSync(src, dst, { recursive: true });
writeFileSync(path.join(dst, ".reference"), `${version}\n`);
console.log(`已铺好参考界面：${dst}（版本 ${version}）`);
