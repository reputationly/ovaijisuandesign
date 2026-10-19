// 体检：源码里有没有「引用了但没定义」的标识符，以及有没有重复的顶层声明。
//
//   node scripts/refdiff/check-dangling.mjs
//
// 为什么必须单独查：**构建不会报这类错**。rollup 遇到未知标识符会当成外部全局，
// 打包照过、退出码 0，只有运行时才 ReferenceError。这一轮就是靠这个检查才发现
// 有 45 个名字是悬空的（其中 8 个是删定义造成的、其余是模块依赖被裁剪造成的）。
import { readFileSync } from "node:fs";
import path from "node:path";
import { declaredNames, freeIdentifiers, listSourceFiles } from "./source-index.mjs";

const SRC_ROOT = "app/renderer/src";
const files = listSourceFiles(SRC_ROOT);

const danglingByFile = new Map();
const names = new Map();
let dup = 0;
const dupFiles = [];

for (const rel of files) {
  const text = readFileSync(path.join(SRC_ROOT, rel), "utf8");
  let free = [];
  try {
    free = freeIdentifiers(text);
  } catch {
    free = [];
  }
  if (free.length) {
    danglingByFile.set(rel, free);
    for (const n of free) names.set(n, [...(names.get(n) ?? []), rel]);
  }
  const declared = declaredNames(text);
  const seen = new Set();
  const d = [];
  for (const n of declared) {
    if (seen.has(n)) d.push(n);
    else seen.add(n);
  }
  if (d.length) {
    dup += d.length;
    dupFiles.push(`${rel}: ${d.slice(0, 3).join(", ")}`);
  }
}

console.log(`扫过 ${files.length} 个源文件`);
console.log(`未定义引用：${[...danglingByFile.values()].reduce((s, v) => s + v.length, 0)} 处，涉及 ${names.size} 个名字、${danglingByFile.size} 个文件`);
if (names.size) {
  console.log(`  名字（按被引用次数排序）：`);
  for (const [n, f] of [...names].sort((a, b) => b[1].length - a[1].length).slice(0, 30)) {
    console.log(`    ${n}  ×${f.length}  ${f.slice(0, 2).join(", ")}`);
  }
}
console.log(`重复顶层声明：${dup} 处`);
for (const d of dupFiles.slice(0, 8)) console.log(`  ${d}`);
process.exitCode = names.size || dup ? 1 : 0;
