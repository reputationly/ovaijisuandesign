#!/usr/bin/env node
/**
 * 在**参照产物的全部文件**里搜索一个字符串（第 148 轮）。
 *
 * 为什么需要：参照的 assets 下有几个百（4.0.3 是 358 个）动态导入的 chunk，
 * 主 bundle 只是其中之一。只搜主 bundle 会把懒加载里的东西误判为"参照里没有" ——
 * 本会话在 121/138/146 轮各踩过一次。
 *
 * 用法：
 *   node scripts/refdiff/refgrep.mjs <字符串> [版本=4.0.3] [--count]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const [needle, ver = "4.0.3", ...flags] = process.argv.slice(2);
if (!needle) {
  console.error("用法: node scripts/refdiff/refgrep.mjs <字符串> [版本=4.0.3] [--count]");
  process.exit(2);
}
const root = path.resolve(import.meta.dirname, "../..");
const dir = path.join(root, `.probe/reference/${ver}/asar/out`);

/** 递归列出所有文本型产物（js/css/html/json，不含二进制）。 */
function walk(d) {
  const out = [];
  for (const name of readdirSync(d)) {
    const p = path.join(d, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(js|mjs|css|html|json)$/.test(name)) out.push(p);
  }
  return out;
}

let files;
try {
  files = walk(dir);
} catch {
  console.error(`找不到参照产物：${dir}`);
  process.exit(1);
}

const hits = [];
for (const f of files) {
  let s;
  try {
    s = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  if (!s.includes(needle)) continue;
  hits.push({ file: path.relative(dir, f), count: s.split(needle).length - 1 });
}

if (flags.includes("--count")) {
  console.log(hits.reduce((n, h) => n + h.count, 0));
} else if (hits.length === 0) {
  console.log(`未命中（搜了 ${files.length} 个文件）`);
} else {
  console.log(`命中 ${hits.length} 个文件（共搜 ${files.length} 个）：`);
  for (const h of hits) console.log(`  ${h.file}  x${h.count}`);
}
process.exitCode = hits.length > 0 ? 0 : 1;
