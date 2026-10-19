// 删掉 `close-unbound.mjs` / `insert-decl.mjs` 插入的声明块（带标记注释的那些）。
//
//   node scripts/desource/undo-inserted.mjs --write <文件…>
//
// 为什么需要：补声明时可能补进一段**自己还引用着其它未解析名字**的代码 ——
// 那样等于把一个悬空引用换成两个，是净负面改动。这类文件要整体撤回。
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(scriptDir, "../..");
const require = createRequire(path.join(scriptDir, "../decompile/package.json"));
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const MARKERS = ["产物里这组声明在还原时丢了", "产物里这一组声明在还原时整块丢了"];
const args = process.argv.slice(2);
const write = args.includes("--write");
const files = args.filter((a) => !a.startsWith("--"));

let total = 0;
for (const rel of files) {
  const file = path.resolve(repo, rel);
  const text = readFileSync(file, "utf8");
  let ast;
  try {
    ast = parser.parse(text, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  } catch (e) {
    console.log(`  跳过 ${rel}（解析失败：${e.message.slice(0, 60)}）`);
    continue;
  }
  const comments = ast.comments ?? [];
  const ranges = [];
  for (const c of comments) {
    if (!MARKERS.some((m) => c.value.includes(m))) continue;
    // 该注释之后紧邻的第一个顶层语句就是插入的声明
    const next = ast.program.body.find((n) => n.start >= c.end);
    if (!next) continue;
    // 连同注释前的换行一起删
    let start = c.start;
    while (start > 0 && (text[start - 1] === " " || text[start - 1] === "\n")) start -= 1;
    let end = next.end;
    while (end < text.length && (text[end] === "\n" || text[end] === " ")) end += 1;
    ranges.push([start, end]);
  }
  if (!ranges.length) continue;
  ranges.sort((a, b) => b[0] - a[0]);
  let out = text;
  for (const [s, e] of ranges) out = out.slice(0, s) + out.slice(e);
  total += ranges.length;
  console.log(`  ${rel}: 撤回 ${ranges.length} 个插入的声明`);
  if (write) writeFileSync(file, out, "utf8");
}
console.log(`\n${write ? "已写入" : "（dry-run）"} 共 ${total} 个声明块`);
