/**
 * L0：主进程 / preload 的非测试代码里禁止类型逃逸（第 298 轮，用户要求）。
 *
 * 为什么需要：本轮 12 环链路的最后一环 —— `mainFrame.postMessage(bootstrap as never, …)`
 * 把「第一个参数应该是频道名」这个错误整个藏住了，tsc 也没报。
 * 同类写法还有 `as any` / `@ts-ignore`。
 *
 * 规则：
 *   - `as never` / `as any` / `@ts-ignore` / `@ts-expect-error` 一律不许出现
 *   - `@ts-nocheck` 只允许出现在**整份镜像的参照文件**里（列在 MIRRORED 白名单）
 *   - 注释里提到这些词不算违规
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOTS = ["app/desktop/src/main", "app/desktop/src/preload"];
const SKIP = /\.test\.ts$|\.d\.ts$/;
/** 整份镜像自参照的文件，保留原形态，允许 @ts-nocheck。 */
const MIRRORED = new Set([
  "app/desktop/src/main/persistence/renderer-persistence-service.ts",
  "app/desktop/src/preload/v3-workbench/index.ts",
]);
const BANNED = [
  [/\bas\s+never\b/, "as never"],
  [/\bas\s+any\b/, "as any"],
  [/@ts-ignore/, "@ts-ignore"],
  [/@ts-expect-error/, "@ts-expect-error"],
];

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = path.join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".ts") && !SKIP.test(p)) files.push(p);
  }
})(ROOTS[0]);
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = path.join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".ts") && !SKIP.test(p)) files.push(p);
  }
})(ROOTS[1]);

const hits = [];
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  let inBlock = false;
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // 粗略剥离注释：块注释与行注释
    if (trimmed.startsWith("/*")) inBlock = true;
    if (inBlock) {
      if (trimmed.includes("*/")) inBlock = false;
      return;
    }
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    const code = line.replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/, "");
    for (const [re, label] of BANNED) {
      if (re.test(code)) hits.push({ file: f, line: i + 1, label, text: trimmed.slice(0, 110) });
    }
    if (code.includes("@ts-nocheck") && !MIRRORED.has(f.replace(/\\/g, "/"))) {
      hits.push({ file: f, line: i + 1, label: "@ts-nocheck（未在白名单）", text: trimmed.slice(0, 110) });
    }
  });
}

console.log(`类型逃逸扫描：${files.length} 个文件，命中 ${hits.length} 处`);
for (const h of hits) console.log(`  ${h.file}:${h.line}  ${h.label}  — ${h.text}`);
process.exit(hits.length ? 1 : 0);
