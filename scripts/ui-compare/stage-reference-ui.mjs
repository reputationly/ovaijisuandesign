#!/usr/bin/env node
/**
 * 把 4.0.0 参考产物的 `out/renderer` 铺成 `app/desktop/out/reference-ui`，
 * 让界面走查可以用 `OV_UI=reference` 跑**原版界面**，从而录出真基线。
 *
 * 只复制静态资源，不改任何字节。
 */
import { cpSync, existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const repo = path.resolve(import.meta.dirname, "../..");
const src = path.join(repo, ".probe/reference/4.0.0/asar/out/renderer");
const dst = path.join(repo, "app/desktop/out/reference-ui");

if (!existsSync(path.join(src, "index.html"))) {
  console.error(`找不到参考界面：${src}`);
  process.exit(1);
}
rmSync(dst, { recursive: true, force: true });
cpSync(src, dst, { recursive: true });
writeFileSync(path.join(dst, ".reference"), "4.0.0\n");
console.log(`已铺好参考界面：${dst}`);
