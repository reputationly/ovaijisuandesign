/**
 * v3 工具 schema 深比较（第 329 轮）。
 *
 * 用 SDK 自己的 toJsonSchemaCompat（也就是 tools/list 实际发出去的那套转换）
 * 把我们的 zod shape 转成 JSON Schema，再与参照抓包**逐层**比对。
 *
 * 为什么需要它：原来的 v3-spec.test.ts 只比顶层参数名和必填项，给了「通过」的错觉。
 * 实测（本脚本）：**完全一致 0/25**，差异集中在三类：
 *   1. additionalProperties: 我们 false / 参照 true（z.object 默认 strict，需 .passthrough()）
 *   2. 嵌套对象的 description 丢失（execute.properties.output.description 等）
 *   3. 约束丢失（minItems: 0、additionalProperties 上的 maxLength、type: ["string","null"]）
 *
 * 用法：cd app/mcp-tools && npx tsx ../../scripts/mcp-compare/deep-schema-diff.mjs
 */
import { readFileSync } from "node:fs";
import { z } from "zod";
import { toJsonSchemaCompat } from "@modelcontextprotocol/sdk/server/zod-json-schema-compat.js";
import { V3_TOOL_SPECS } from "../../app/mcp-tools/src/tools/v3-tool-specs.ts";

const ref = new Map(
  JSON.parse(readFileSync("../../scripts/mcp-compare/reference-tools.json", "utf8")).tools.map(
    (t) => [t.name, t.inputSchema],
  ),
);
/** 解析参照里的同文档 $ref（#/a/b/c），把它展开成实际节点再比。 */
function deref(node, root) {
  if (Array.isArray(node)) return node.map((v) => deref(v, root));
  if (node && typeof node === "object") {
    if (typeof node.$ref === "string" && node.$ref.startsWith("#/")) {
      let cur = root;
      for (const k of node.$ref.slice(2).split("/")) cur = cur?.[k];
      if (cur !== undefined) {
        // $ref 同级可能还有 description，展开后合并
        const { $ref, ...rest } = node;
        return deref({ ...JSON.parse(JSON.stringify(cur)), ...rest }, root);
      }
    }
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = deref(v, root);
    return out;
  }
  return node;
}

function cmp(a, b, p, out) {
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${p}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
    return;
  }
  const skip = new Set(["$schema", "title"]);
  const ka = Object.keys(a).filter((k) => !skip.has(k));
  const kb = Object.keys(b).filter((k) => !skip.has(k));
  for (const k of kb) if (!ka.includes(k)) out.push(`${p}.${k}: 缺`);
  for (const k of ka) if (!kb.includes(k)) out.push(`${p}.${k}: 多`);
  for (const k of ka) if (kb.includes(k)) cmp(a[k], b[k], `${p}.${k}`, out);
}
let ok = 0;
const bad = [];
for (const [name, spec] of Object.entries(V3_TOOL_SPECS)) {
  let mine;
  try { mine = toJsonSchemaCompat(z.object(spec.shape).passthrough()); } catch (e) { bad.push([name, -1, [String(e).slice(0, 80)]]); continue; }
  const d = [];
  const refResolved = deref(JSON.parse(JSON.stringify(ref.get(name) ?? {})), ref.get(name) ?? {});
  cmp(mine, refResolved, name, d);
  if (d.length) bad.push([name, d.length, d.slice(0, 3)]); else ok++;
}
const total = Object.keys(V3_TOOL_SPECS).length;
console.log(`完全一致 ${ok}/${total}`);
for (const [n, c, s] of bad.slice(0, 10)) console.log(` ${n} (${c}) ${s.join(" | ").slice(0, 190)}`);
