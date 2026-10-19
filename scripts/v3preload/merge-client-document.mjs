#!/usr/bin/env node
/**
 * 把 canvas-v3-document.js 与 canvas-v3-client.js 合成一个模块（第 141 轮）。
 *
 * 理由：这两个文件是同一 bundle 区域被切成的两半，彼此有 50 个同名重复，
 * 逐名字归并会成环（p3-strict 判定）。合并后重复变成「文件内重复」，
 * 用 remove-dupes 一次清掉即可。
 */
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";

const DIR = "app/renderer/src/canvas-v3";
const DOC = path.join(DIR, "canvas-v3-document.js");
const CLI = path.join(DIR, "canvas-v3-client.js");
const OUT = path.join(DIR, "canvas-v3-model.js");

const strip = (src, otherName) => {
  // 去掉对彼此的 import 与 export-from
  const lines = src.split("\n").filter((l) => {
    if (l.startsWith("import") && l.includes(`./${otherName}`)) return false;
    if (l.startsWith("export") && l.includes(`from "./${otherName}"`)) return false;
    return true;
  });
  // 去掉末尾 export 块，稍后统一重建
  let t = lines.join("\n");
  const i = t.lastIndexOf("\nexport {\n");
  if (i >= 0) t = t.slice(0, i);
  return t;
};

const doc = strip(readFileSync(DOC, "utf8"), "canvas-v3-client.js");
const cli = strip(readFileSync(CLI, "utf8"), "canvas-v3-document.js");

const header = `/**
 * v3 的**领域模型**（第 141 轮由 canvas-v3-document.js + canvas-v3-client.js 合并而来）。
 *
 * 合并原因：这两个文件来自 4.0.0 主包同一区域，彼此有 50 个同名重复声明，
 * 逐名字归并会形成 import 环；合并后重复变成文件内重复，可直接清理。
 */
`;
const merged = header + doc + "\n\n// ==================== 原 canvas-v3-client.js ====================\n\n" + cli + "\n";
writeFileSync(OUT, merged, "utf8");
unlinkSync(DOC);
unlinkSync(CLI);
console.log(`已合并为 canvas-v3-model.js（${merged.split("\n").length} 行）`);
