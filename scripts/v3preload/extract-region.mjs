// 按「声明级完整边界」从 bundle 抽取一段连续代码：
// 逐条声明计算其完整结束位置（括号 () [] {} 三者一起配平），
// 只有当某条声明完整结束、且下一条是新的顶层声明时，才算一个可切分边界。
import { readFileSync, writeFileSync } from "node:fs";

const [, , bundle, startLine, outPath] = process.argv;
const src = readFileSync(bundle, "utf8");
const startIdx = src.lastIndexOf("\n", src.indexOf("\n", 0)) ; // 未用

function declEnd(src, from) {
  const stack = [];
  let inStr = null, inTpl = false, sawBrace = false, sawSemicolon = false;
  for (let i = from; i < src.length; i++) {
    const c = src[i], p = src[i - 1];
    if (inStr) { if (c === inStr && p !== "\\") inStr = null; continue; }
    if (inTpl) { if (c === "`" && p !== "\\") inTpl = false; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === "`") { inTpl = true; continue; }
    if (c === "/" && src[i + 1] === "/") { i = src.indexOf("\n", i); continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2) + 1; continue; }
    if ("([{".includes(c)) { stack.push(c); if (c === "{") sawBrace = true; }
    else if (")]}".includes(c)) stack.pop();
    else if (c === ";" && stack.length === 0) { sawSemicolon = true; return i + 1; }
    else if (c === "\n" && stack.length === 0 && sawBrace && !sawSemicolon) return i;
  }
  return src.length;
}

export function region(src, startLine, maxDecls = 300) {
  const lines = src.split("\n");
  // 定位到 startLine 处的声明起点
  let idx = 0;
  for (let i = 0; i < startLine - 1; i++) idx = src.indexOf("\n", idx) + 1;
  const parts = [];
  let pos = idx;
  while (pos < src.length && parts.length < maxDecls) {
    if (!/^(?:async )?(?:function|const|let|var|class)\s+[A-Za-z_$]/.test(src.slice(pos, pos + 60))) break;
    const end = declEnd(src, pos);
    parts.push(src.slice(pos, end));
    pos = end + 1;
  }
  return parts.join("\n");
}

if (process.argv[1] && process.argv[1].endsWith("extract-region.mjs")) {
  const code = region(src, Number(startLine), Number(process.argv[5] ?? 300));
  writeFileSync(outPath, code + "\n", "utf8");
  const n = (code.match(/^(?:async )?(?:function|const|let|var|class)\s+/gm) ?? []).length;
  console.log(`抽出 ${n} 条完整声明，${code.split("\n").length} 行`);
}
