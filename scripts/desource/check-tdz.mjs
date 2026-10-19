// 找出「模块求值期就读了后面才定义的顶层绑定」——也就是 TDZ 崩溃。
//
// 为什么要单独查：还原出来的文件大多是把产物里的若干模块**拼**在一起的，拼接顺序一旦和
// 产物里的求值顺序不一致，就会出现 `Cannot access 'X' before initialization`。
// 这类错误只在运行时炸，构建完全不报错（rollup 会把它当成两个模块之间的正常引用）。
//
//   node scripts/desource/check-tdz.mjs [目录…]
//
// 判定只看**模块求值期真正会执行到的引用**：函数体（含箭头函数、方法）内部的引用不算 ——
// 它们要等被调用时才解析，那时顶层早已初始化完。反过来，顶层的
// `x.map(...)`、`{ a: x }`、`Object.keys(x)`、以及类字段初始化 / static 块都算。
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default ?? _traverse;
const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

const TOP_LEVEL_DECL = new Set(["VariableDeclaration", "ClassDeclaration", "FunctionDeclaration"]);
/** 这些声明会被提升，先引用后定义是合法的。 */
const HOISTED = new Set(["FunctionDeclaration"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(js|jsx|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

/** 顶层绑定名 → 它所在语句的起止偏移（按源码顺序）。 */
function collectTopLevel(ast) {
  const order = new Map();
  for (const node of ast.program.body) {
    if (!TOP_LEVEL_DECL.has(node.type)) continue;
    const names = [];
    if (node.type === "VariableDeclaration") {
      for (const d of node.declarations) collectPatternNames(d.id, names);
    } else if (node.id) {
      names.push(node.id.name);
    }
    for (const name of names) order.set(name, { start: node.start, end: node.end, hoisted: HOISTED.has(node.type) });
  }
  return order;
}

function collectPatternNames(node, out) {
  if (!node) return;
  switch (node.type) {
    case "Identifier":
      out.push(node.name);
      break;
    case "ObjectPattern":
      for (const p of node.properties) {
        if (p.type === "RestElement") collectPatternNames(p.argument, out);
        else collectPatternNames(p.value, out);
      }
      break;
    case "ArrayPattern":
      for (const el of node.elements) collectPatternNames(el, out);
      break;
    case "AssignmentPattern":
      collectPatternNames(node.left, out);
      break;
    default:
      break;
  }
}

/** 顶层语句里「直接会被求值」的表达式范围。函数/类体内部不算。 */
function collectEagerExpressions(ast) {
  const eager = [];
  for (const node of ast.program.body) {
    if (node.type === "FunctionDeclaration") continue; // 提升，且体不立即求值
    if (node.type === "ClassDeclaration") {
      // 类体里的 static 块与字段初始化**会**立即求值，方法体不会
      if (node.superClass) eager.push(node.superClass);
      for (const el of node.body.body) {
        if (el.type === "StaticBlock") eager.push(...el.body);
        else if (el.type === "PropertyDefinition" && !el.computed && el.value) eager.push(el.value);
      }
      continue;
    }
    if (node.type === "VariableDeclaration") {
      for (const d of node.declarations) if (d.init) eager.push(d.init);
      continue;
    }
    eager.push(node);
  }
  return eager;
}

const targets = process.argv.slice(2).map((p) => path.resolve(repo, p));
const files = (targets.length ? targets : [path.join(repo, "app/renderer/src")]).flatMap((t) => {
  try {
    return statSync(t).isDirectory() ? walk(t) : [t];
  } catch {
    return [];
  }
});

let problems = 0;
for (const file of files) {
  let ast;
  try {
    ast = parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  } catch {
    continue;
  }
  const order = collectTopLevel(ast);
  const eager = collectEagerExpressions(ast);
  if (!eager.length) continue;
  const seen = new Set();
  for (const expr of eager) {
    traverse(
      { type: "File", program: { type: "Program", body: [expr], directives: [], sourceType: "module" }, comments: [], tokens: [] },
      {
        // 函数/箭头/方法体不立即求值 —— 里面的引用要等被调用时才解析
        Function(p) {
          p.skip();
        },
        ReferencedIdentifier(p) {
          const name = p.node.name;
          const decl = order.get(name);
          if (!decl || decl.hoisted) return;
          if (decl.start < expr.start) return;
          if (seen.has(name)) return;
          seen.add(name);
          problems += 1;
          const line = readFileSync(file, "utf8").slice(0, expr.start).split("\n").length;
          const declLine = readFileSync(file, "utf8").slice(0, decl.start).split("\n").length;
          console.log(`${path.relative(repo, file)}:${line} 在模块求值期读取了第 ${declLine} 行才定义的 '${name}'`);
        },
      },
    );
  }
}
console.log(problems ? `\n共 ${problems} 处（会导致运行时 TDZ 崩溃）` : "\n没有发现模块求值期的 TDZ 引用");
process.exit(problems ? 1 : 0);
