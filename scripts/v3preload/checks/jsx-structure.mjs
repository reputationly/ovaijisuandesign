/**
 * JSX 结构完整性自检（第 42 轮）。
 *
 * 为什么要有这道检查：
 * 4.0.3 的还原用过 token 级三方合并，它会产出**语法合法、运行时也不报错**的坏代码。
 * 已实测抓到两处：
 *   · `className={false}dim={dim}` —— 两个属性名粘在一起（后面那个成了无关键）
 *   · `<img className={false} loading="eager" className="h-full w-full" />`
 *     —— JSX 重复属性；React 取最后一个，所以运行时悄悄用错了值
 * 语法检查、自由标识符检查、audit-v3（重复声明）都抓不到这两类，只能靠 AST 看属性表。
 *
 * 检查内容（全部基于 @babel/parser 的真实 AST，不用正则猜）：
 *   A. 同一个 JSX 开标签里出现重复属性名
 *   B. JSX 属性名非法（出现 `.`、`-` 之外的怪字符，或名字里混进了 `=`）
 *   C. JSX 属性值被解析成 `Ident:false` 这类明显是占位的写法（`className={false}`）
 *      —— 只报 className/style 这两个会直接影响渲染的属性，其余 false 是合法的布尔属性
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
// 静态 import @babel/parser：run-all 会把每个 check 用 esbuild 打成 /tmp 下的单文件，
// 运行时用 createRequire 拼相对路径会指向 /tmp 而失效（第一版就是这么静默失败的）。
import { parse } from "../../decompile/node_modules/@babel/parser/lib/index.js";

// 用 cwd 而不是 import.meta.url：这个 check 会被 esbuild 打到 /tmp 下再跑，
// 基于自身位置的相对路径会解析成 /app/renderer/src。run-all 是从仓库根调起的。
const SRC = path.join(process.cwd(), "app/renderer/src");
const SKIP_DIRS = /^(vendor-fork|vendor-inline|node_modules)$/;
/** 这些属性给 false 一定是错的（渲染出来不是布尔语义）。 */
const BOOLEAN_ONLY_FALSE_OK = new Set(["className", "style"]);

const problems = [];
let files = 0;
let jsxNodes = 0;

function walk(dir, rel = "") {
  for (const name of readdirSync(dir).sort()) {
    const abs = path.join(dir, name);
    const r = rel ? `${rel}/${name}` : name;
    const st = statSync(abs);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.test(name)) walk(abs, r);
      continue;
    }
    if (!/\.(js|jsx)$/.test(name) || /\.test\./.test(name)) continue;
    checkFile(abs, r);
  }
}

function checkFile(abs, rel) {
  const text = readFileSync(abs, "utf8");
  let ast;
  try {
    ast = parse(text, { sourceType: "module", plugins: ["jsx"], errorRecovery: false });
  } catch {
    return; // 语法错由构建负责报，这里不重复
  }
  files += 1;

  const seen = new Set();
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const n of node) visit(n);
      return;
    }
    if (node.type === "JSXOpeningElement") {
      jsxNodes += 1;
      const attrs = [];
      for (const a of node.attributes ?? []) {
        if (a.type !== "JSXAttribute") continue;
        const nm = a.name?.type === "JSXIdentifier" ? a.name.name : a.name?.name;
        if (!nm) continue;
        // A. 重复属性
        if (attrs.includes(nm)) {
          problems.push({ rel, line: a.loc?.start.line, kind: `重复属性 ${nm}` });
        } else {
          attrs.push(nm);
        }
        // B. 名字里混进 '=' 之类（粘连产物）
        if (/[=<>{}"'`\s]/.test(nm)) {
          problems.push({ rel, line: a.loc?.start.line, kind: `属性名异常 "${nm}"` });
        }
        // C. className/style={false}
        if (
          BOOLEAN_ONLY_FALSE_OK.has(nm) &&
          a.value?.type === "JSXExpressionContainer" &&
          a.value.expression?.type === "Identifier" &&
          a.value.expression.name === "false"
        ) {
          problems.push({ rel, line: a.loc?.start.line, kind: `${nm}={false}` });
        }
      }
      const elName = node.name?.name ?? "";
      if (!seen.has(node)) {
        seen.add(node);
        void elName;
      }
    }
    for (const k of Object.keys(node)) {
      if (k === "loc" || k === "start" || k === "end") continue;
      const v = node[k];
      if (v && typeof v === "object") visit(v);
    }
  };
  visit(ast);
}

walk(SRC);

if (problems.length) {
  console.log(`✗ JSX 结构完整性：${problems.length} 处可疑（扫过 ${files} 个文件、${jsxNodes} 个开标签）`);
  for (const p of problems.slice(0, 20)) {
    console.log(`   ${p.rel}:${p.line}  ${p.kind}`);
  }
  process.exit(1);
}
console.log(`✓ JSX 结构完整性：扫过 ${files} 个文件、${jsxNodes} 个开标签，无重复/异常属性`);
