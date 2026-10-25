#!/usr/bin/env node
/**
 * T-5 的同类扫描之二：对象字面量 / 解构模式里的**重复键**。
 *
 * 和参数改名遮蔽同源，都是 desource 阶段的产物：参照里同一个对象的两个键被改名成
 * `xxx` + `xxx2`，生成器把两个都写成同一个键，后一个静默覆盖前一个。已经修掉的实例：
 *
 * - `workspace/app-root.jsx`：路由的 `validateSearch`（解析 `?projectId=`）被写成第二个
 *   `component`，搜索参数校验整段被丢弃；
 * - `infra/project-asset-thumbnail-generation.jsx`：`muted: muted, muted: muted2`。
 *
 * 不报的两类：
 *   1. 同一个键的 `get` / `set` 访问器对（`get onStatus()` + `set onStatus()`），这是合法的；
 *   2. `export-engine/` 下的第三方镜像文件（参照发行包原样，保真优先，`audit-v3` 那边同样处理）。
 *
 * 用法：
 *   node scripts/v3preload/scan-dup-keys.mjs [源码根] [--json]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";

const traverse = traverseModule.default ?? traverseModule;

const args = process.argv.slice(2);
const JSON_ONLY = args.includes("--json");
const ROOT = args.find((a) => !a.startsWith("--")) ?? "app/renderer/src";
/** 参照发行包原样镜像的第三方 chunk，保真优先。 */
const MIRROR = /(^|\/)export-engine\/(editor-interface|panorama-viewer)\.js$/;

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const p = path.join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(js|jsx)$/.test(entry) && !/\.test\./.test(entry) && !MIRROR.test(p)) files.push(p);
  }
})(ROOT);

const findings = [];
const parseFailures = [];

/** 同名键里，get+set 组合算一组合法访问器；其余重复才是覆盖。 */
function duplicates(properties) {
  const byName = new Map();
  for (const prop of properties) {
    if (prop.type !== "ObjectProperty" && prop.type !== "ObjectMethod") continue;
    if (prop.computed) continue;
    const name = prop.key?.name ?? prop.key?.value;
    if (typeof name !== "string") continue;
    const kind = prop.kind ?? "init";
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push({ kind, line: prop.loc?.start.line ?? 0 });
  }
  const out = [];
  for (const [name, entries] of byName) {
    if (entries.length < 2) continue;
    const kinds = entries.map((e) => e.kind).sort().join(",");
    if (kinds === "get,set") continue;
    out.push({ name, count: entries.length, kinds });
  }
  return out;
}

for (const file of files) {
  let ast;
  try {
    ast = parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  } catch (error) {
    parseFailures.push({ file, error: error instanceof Error ? error.message.split("\n")[0] : String(error) });
    continue;
  }
  traverse(ast, {
    "ObjectExpression|ObjectPattern"(p) {
      for (const dup of duplicates(p.node.properties)) {
        findings.push({ file, line: p.node.loc?.start.line ?? 0, ...dup });
      }
    },
  });
}

if (JSON_ONLY) {
  console.log(JSON.stringify({ scanned: files.length, parseFailures, findings }, null, 2));
} else {
  console.log(`重复键扫描：${files.length} 个文件，解析失败 ${parseFailures.length}，命中 ${findings.length}`);
  for (const f of findings) console.log(`  ${f.file}:${f.line}  ${f.name} ×${f.count}（${f.kinds}）`);
  for (const p of parseFailures) console.log(`  ✗ 解析失败 ${p.file}: ${p.error}`);
}
process.exit(parseFailures.length ? 2 : 0);
