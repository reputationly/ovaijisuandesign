// 把产物里某个顶层声明整块搬进还原出来的文件里。
//
//   node scripts/desource/insert-decl.mjs <目标文件> <声明名> [声明名…]
//
// 用在「构建不报错、运行时才炸」的那一类缺陷上：产物里有一组声明，还原时整块丢了，
// 只剩下引用。rollup 会把未定义的标识符当成外部全局量放过，所以构建全程绿灯。
//
// 只搬**顶层**声明，并且搬到目标文件里第一次用到它的位置之前 —— 不重排别的代码。
// 找不到声明（说明它不是这个模块的，或者名字被压缩过）就报错退出，绝不猜。
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const REF_DIR = path.join(repo, ".probe/reference/4.0.0/asar/out/renderer/assets");

const [target, ...names] = process.argv.slice(2);
if (!target || !names.length) {
  console.error("用法: node scripts/desource/insert-decl.mjs <目标文件> <声明名> [声明名…]");
  process.exit(2);
}

const refFiles = existsSync(REF_DIR) ? [path.join(REF_DIR, "index-BBp4hclA.js")] : [];
function readRefs() {
  return refFiles.map((f) => ({ file: f, text: readFileSync(f, "utf8") }));
}

/**
 * 从 `from` 处开始找声明的结尾。
 *
 * 分两步走，不能只数字符配平：`function f({ a }) {}` 的参数表里就有花括号，
 * 单纯看「深度回到 0」会在参数表的 `)` 上收尾，把整个函数体截掉
 *（第一版就是这样，插进去的代码直接语法错误，还得手工回退）。
 *
 * 所以先配平参数表，**再**往后找函数体；非函数声明才退回整体配平。
 */
function balancedEnd(text, from) {
  const isFunction = /^function\b/.test(text.slice(from, from + 9));
  if (isFunction) {
    const parenStart = text.indexOf("(", from);
    const parenEnd = matchDelimiter(text, parenStart);
    if (parenEnd < 0) return -1;
    // 参数表之后是函数体（中间可能还有 TS 的返回类型标注）
    let i = parenEnd;
    while (i < text.length && /[\s:]/.test(text[i])) i += 1;
    if (text[i] !== "{") return parenEnd;
    const bodyEnd = matchDelimiter(text, i);
    return bodyEnd < 0 ? -1 : bodyEnd;
  }
  // 变量声明：一直配平到深度归零后的分号/换行
  let depth = 0;
  for (let i = from; i < text.length; i += 1) {
    const c = text[i];
    if (c === "{" || c === "(" || c === "[") depth += 1;
    else if (c === "}" || c === ")" || c === "]") {
      depth -= 1;
      if (depth === 0 && text[i + 1] === ";") return i + 2;
      if (depth === 0 && c === "}") return i + 1;
    } else if (c === ";" && depth === 0) {
      return i + 1;
    }
  }
  return -1;
}

/** 返回从 `open` 处那个括号开始、配对的那个括号的**下一个**位置。 */
function matchDelimiter(text, open) {
  if (open < 0) return -1;
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const close = pairs[text[open]];
  if (!close) return -1;
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    const c = text[i];
    if (c === text[open]) depth += 1;
    else if (c === close) {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** 在产物里找一个顶层 `const|let|var|function X` 声明。 */
function extractDecl(text, name) {
  const re = new RegExp(`(?:^|\\n)(?:const|let|var|function)\\s+${name.replace(/\$/g, "\\$")}\\b`, "g");
  let m;
  while ((m = re.exec(text)) !== null) {
    const start = m.index + (text[m.index] === "\n" ? 1 : 0);
    const head = text.slice(start, start + 12);
    if (!/^(?:const|let|var|function)/.test(head)) continue;
    const end = balancedEnd(text, start);
    if (end > 0) return text.slice(start, end);
  }
  return undefined;
}

const refs = readRefs();
let source = readFileSync(path.resolve(repo, target), "utf8");
const inserted = [];

for (const name of names) {
  if (new RegExp(`(?:^|\\n)(?:const|let|var|function)\\s+${name.replace(/\$/g, "\\$")}\\b`).test(source)) {
    console.log(`  跳过 ${name}：目标文件里已经有它的声明`);
    continue;
  }
  let decl;
  let from = "";
  for (const ref of refs) {
    decl = extractDecl(ref.text, name);
    if (decl) {
      from = path.basename(ref.file);
      break;
    }
  }
  if (!decl) {
    console.error(`  找不到 ${name} 的顶层声明 —— 需要人工判断它是该 import 还是本地声明`);
    process.exitCode = 1;
    continue;
  }
  // 插在 import 块之后。不插在「第一次用到的那一行之前」——那样很可能插进某个函数体里，
  // 变成语法错误。顶层函数声明会提升，放在这儿和放在使用点之前等价。
  const lines = source.split("\n");
  let insertAt = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^import\b/.test(lines[i]) || /^\s+\S/.test(lines[i] || "") && insertAt > 0 && !/^\s*$/.test(lines[i])) {
      if (/^import\b/.test(lines[i])) insertAt = i + 1;
    }
  }
  lines.splice(insertAt, 0, `// 产物里这一组声明在还原时整块丢了（构建不报错，运行时才炸）。来源：${from}`, decl, "");
  source = lines.join("\n");
  inserted.push(name);
  console.log(`  插入 ${name}（${decl.length} 字符）到第 ${insertAt + 1} 行`);
}

if (inserted.length) {
  writeFileSync(path.resolve(repo, target), source, "utf8");
  console.log(`${target}: 插入 ${inserted.length} 个声明`);
}
