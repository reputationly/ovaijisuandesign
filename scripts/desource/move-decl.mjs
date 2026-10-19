// 把某个顶层声明的整块**往前挪**到另一个声明之前，修掉模块求值期的 TDZ。
//
//   node scripts/desource/move-decl.mjs <文件> <要挪的声明名> <挪到哪个声明之前>
//
// 只挪完完整整的一个顶层语句（从它第一个字符到分号/右花括号），不重排文件里其它东西 ——
// 这种修复要的是「和产物里的求值顺序一致」，不是顺手把文件整理一遍。
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";

const [file, moving, before] = process.argv.slice(2);
if (!file || !moving || !before) {
  console.error("用法: node scripts/desource/move-decl.mjs <文件> <要挪的声明名> <挪到哪个声明之前>");
  process.exit(2);
}

const src = readFileSync(file, "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });

/** 找出定义了 `name` 的那个顶层语句的 [start, end)。 */
function statementDefining(name) {
  for (const node of ast.program.body) {
    if (node.type !== "VariableDeclaration") continue;
    for (const d of node.declarations) {
      if (d.id.type === "Identifier" && d.id.name === name) {
        // 连同后面的空行一起挪，免得留下孤立的空行
        let end = src.indexOf("\n", node.end);
        while (src[end] === "\n" && src[end + 1] === "\n") end += 1;
        return { start: node.start, end: end === -1 ? node.end : end + 1, node };
      }
    }
  }
  return undefined;
}

const move = statementDefining(moving);
const target = statementDefining(before);
if (!move) throw new Error(`找不到定义 ${moving} 的顶层语句`);
if (!target) throw new Error(`找不到定义 ${before} 的顶层语句`);
if (move.start < target.start) throw new Error(`${moving} 已经在 ${before} 之前了`);

const block = src.slice(move.start, move.end);
const rest = src.slice(0, move.start) + src.slice(move.end);
// 用「挪完之后目标声明的起点」重新定位：前面的删除会让偏移前移
const targetStart = target.start - move.start;
writeFileSync(file, rest.slice(0, targetStart) + block + rest.slice(targetStart), "utf8");
console.log(`${path.basename(file)}: 把 ${moving} 挪到 ${before} 之前`);
