/**
 * 解析 bundle/chunk 的 import（第 236 轮）。
 *
 * bundle 里的写法是 `import { r as reactExports } from "./use-window-chrome-XXX.js"`，
 * 其中 `r` 是目标 chunk 的**导出别名**。目标 chunk 末尾有
 *   `export { RealName as r, ... }`
 * 所以要先读别名表，才能把 `reactExports` 解析回真实名字，再去树里找。
 *
 * 用法（供其它脚本 import）：
 *   import { buildAliasMap, resolveImport } from "./resolve-chunk-imports.mjs";
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ASSETS = ".probe/reference/4.0.0/asar/out/renderer/assets";

/** 读一个 chunk 的 `export { RealName as alias }` 别名表 */
export function buildAliasMap(chunkFile) {
  const src = readFileSync(path.join(ASSETS, chunkFile), "utf8");
  const idx = src.lastIndexOf("export {");
  if (idx < 0) return new Map();
  const end = src.indexOf("};", idx);
  if (end < 0) return new Map();
  const body = src.slice(idx + 8, end);
  const map = new Map();
  for (const part of body.split(",")) {
    const t = part.trim();
    if (!t) continue;
    const m = /^(.+?)\s+as\s+(\S+)$/.exec(t);
    if (m) map.set(m[2], m[1]);
    else map.set(t, t);
  }
  return map;
}

/** 解析一个 import 说明符到别名表（找不到 chunk 就返回 null） */
export function aliasTableFor(specifier) {
  const file = specifier.replace(/^\.\//, "");
  try {
    readdirSync(ASSETS);
    return buildAliasMap(file);
  } catch {
    return null;
  }
}
