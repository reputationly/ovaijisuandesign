// 修「属性名对、值名没声明」这一类：`{ reason: reason2 }` —— `reason2` 谁也没声明。
//
//   node scripts/desource/fix-shorthand-rename.mjs [--write] [目录…]
//
// 来由：产物是几百个模块合成一个作用域，rollup 为了避让重名会把局部变量改名
//（`reason` → `reason2`）。还原时把**声明**改回了原名，**使用点**却留着后缀，
// 于是 `{ reason: reason2 }` 里的 `reason2` 成了悬空引用。
//
// 判定条件（三条同时成立才改）：
//   1. 属性名 `X` 和值 `Y` 的**基础名相同**（`Y` 是 `X` 或 `X` 加后缀）；
//   2. `Y` 在文件里**没有任何声明**（否则它可能真是另一个变量）；
//   3. `X` 在文件里**有声明**（否则改成简写也还是悬空）。
// 改成简写 `{ X }` 即等价于 `{ X: X }`。
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(scriptDir, "../..");
const require = createRequire(path.join(scriptDir, "../decompile/package.json"));
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const args = process.argv.slice(2);
const write = args.includes("--write");
const roots = args.filter((a) => !a.startsWith("--"));
const { listSourceFiles } = await import(path.join(scriptDir, "../refdiff/source-index.mjs"));

const targets = (roots.length ? roots : ["app/renderer/src"]).flatMap((r) =>
  listSourceFiles(path.resolve(repo, r)).map((f) => path.resolve(repo, r, f)),
);

let totalFixed = 0;
const filesChanged = [];

for (const file of targets) {
  const text = readFileSync(file, "utf8");
  let ast;
  try {
    ast = parser.parse(text, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  } catch {
    continue;
  }
  const declared = new Set();
  traverse(ast, {
    ImportSpecifier(p) {
      declared.add(p.node.local.name);
    },
    ImportDefaultSpecifier(p) {
      declared.add(p.node.local.name);
    },
    ImportNamespaceSpecifier(p) {
      declared.add(p.node.local.name);
    },
    Function(p) {
      if (p.node.id?.name) declared.add(p.node.id.name);
      for (const param of p.node.params) collect(param, declared);
    },
    VariableDeclarator(p) {
      collect(p.node.id, declared);
    },
    ClassDeclaration(p) {
      if (p.node.id?.name) declared.add(p.node.id.name);
    },
    CatchClause(p) {
      if (p.node.param) collect(p.node.param, declared);
    },
  });

  const edits = [];
  traverse(ast, {
    ObjectProperty(p) {
      const key = p.node.key;
      const value = p.node.value;
      if (p.node.shorthand || !key || key.type !== "Identifier" || value.type !== "Identifier") return;
      const base = value.name.replace(/\$\d+$/, "").replace(/\d+$/, "");
      if (base !== key.name) return;
      if (declared.has(value.name)) return;
      if (!declared.has(key.name)) return;
      edits.push({ start: p.node.start, end: p.node.end, text: key.name });
    },
  });
  if (!edits.length) continue;
  let out = text;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  totalFixed += edits.length;
  filesChanged.push(path.relative(repo, file));
  if (write) writeFileSync(file, out, "utf8");
}

console.log(`${write ? "已写入" : "（dry-run，未写入）"} 共 ${totalFixed} 处，涉及 ${filesChanged.length} 个文件`);
for (const f of filesChanged.slice(0, 20)) console.log(`  ${f}`);
if (filesChanged.length > 20) console.log(`  …另 ${filesChanged.length - 20} 个`);

function collect(node, out) {
  if (!node) return;
  switch (node.type) {
    case "Identifier":
      out.add(node.name);
      break;
    case "ObjectPattern":
      for (const p of node.properties) collect(p.type === "RestElement" ? p.argument : p.value, out);
      break;
    case "ArrayPattern":
      for (const el of node.elements) collect(el, out);
      break;
    case "AssignmentPattern":
      collect(node.left, out);
      break;
    case "RestElement":
      collect(node.argument, out);
      break;
    default:
      break;
  }
}
