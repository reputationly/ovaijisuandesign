// 声明级规范化：把 dist 模块 / vendor.js 顶层语句变成可比较的两种形状
//   A（构建等价）：模拟生产构建（NODE_ENV=production 常量折叠 + 删死分支、undefined→void 0、去注释/指令），
//      import 绑定换成被导入名（React.x / reactExports.x → x），顶层名去掉 rollup 的 $N 后缀，
//      局部绑定按出现顺序 alpha 重命名。A 相等 = 同一份源码经同一构建得到。
//   B（归一化）：在 A 的基础上把所有变量位置的标识符都抹成 _（只保留属性名、字面量和结构）。
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import * as t from "@babel/types";
const traverse = _traverse.default, generate = _generate.default;

const NS_MODULES = /^(react|react-dom|react-dom\/client|react\/jsx-runtime|react\/jsx-dev-runtime|use-sync-external-store\/shim(\/index\.js)?|use-sync-external-store\/shim\/with-selector(\.js)?)$/;
// 还原树里 React/shim 的 CJS 包装对象（vendor.js 导出 reactExports 等），按命名空间处理
const NS_EXPORT_NAMES = /^(reactExports|reactDomExports|clientExports|jsxRuntimeExports|shimExports|withSelectorExports|__ov_\w+)$/;
// 生产版 react/jsx-runtime 中 jsxs === jsx（仅开发版校验 static children）
const JSX_ALIAS = { jsxs: "jsx", jsxDEV: "jsx" };
// 包间再导出：@base-ui/utils/owner.js `export { getWindow as ownerWindow } from '@floating-ui/utils/dom'`（0.2.3–0.2.9 均如此）
const REEXPORT_ALIAS = { "@base-ui/utils/owner#ownerWindow": "getWindow", "@base-ui-components/utils/owner#ownerWindow": "getWindow" };
const stripSuffix = (n) => n.replace(/\$(\d+|[a-z])$/, "");

// R14 源码里的多余括号（如 `throw (/* c */ new Error())`）只是打印形式，去掉 extra.parenthesized，由生成器按需加括号
function dropParens(n) {
  if (!n || typeof n !== "object") return;
  if (Array.isArray(n)) { for (const x of n) dropParens(x); return; }
  if (n.extra && n.extra.parenthesized) { delete n.extra.parenthesized; delete n.extra.parenStart; }
  for (const k in n) if (k !== "loc" && k !== "extra" && k !== "leadingComments" && k !== "trailingComments" && k !== "innerComments") dropParens(n[k]);
}
export function parseFile(src) {
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  dropParens(ast);
  return ast;
}

function fold(ast) {
  traverse(ast, {
    MemberExpression(p) {
      if (p.matchesPattern("process.env.NODE_ENV")) p.replaceWith(t.stringLiteral("production"));
    },
    Identifier(p) {
      if (p.node.name === "undefined" && p.isReferencedIdentifier() && !p.scope.getBinding("undefined")) p.replaceWith(t.unaryExpression("void", t.numericLiteral(0)));
    },
  });
  const lit = (n) => (t.isBooleanLiteral(n) ? { v: n.value } : null);
  traverse(ast, {
    exit(p) {
      const n = p.node;
      if (p.isBinaryExpression() && t.isStringLiteral(n.left) && t.isStringLiteral(n.right) && ["===", "!==", "==", "!="].includes(n.operator)) {
        const eq = n.left.value === n.right.value;
        p.replaceWith(t.booleanLiteral(n.operator.startsWith("=") ? eq : !eq));
      } else if (p.isUnaryExpression({ operator: "!" }) && lit(n.argument)) {
        p.replaceWith(t.booleanLiteral(!n.argument.value));
      } else if (p.isLogicalExpression() && lit(n.left)) {
        const v = n.left.value;
        if (n.operator === "&&") p.replaceWith(v ? n.right : n.left);
        else if (n.operator === "||") p.replaceWith(v ? n.left : n.right);
      } else if (p.isConditionalExpression() && lit(n.test)) {
        p.replaceWith(n.test.value ? n.consequent : n.alternate);
      } else if (p.isIfStatement() && lit(n.test)) {
        const keep = n.test.value ? n.consequent : n.alternate;
        if (!keep) p.remove();
        else if (t.isBlockStatement(keep) && !keep.body.some((s) => t.isVariableDeclaration(s) && s.kind !== "var")) p.replaceWithMultiple(keep.body);
        else p.replaceWith(keep);
      } else if (p.isExpressionStatement() && t.isBooleanLiteral(n.expression)) {
        p.remove();
      }
    },
  });
  if (ast.program.directives) ast.program.directives = [];
}

// import 绑定 → 规范名；namespace/default 导入 React 一类 → 成员访问 ns.x 直接变成 x
function importMap(ast, nsResolve) {
  const m = new Map();
  for (const s of ast.program.body) {
    if (!t.isImportDeclaration(s)) continue;
    const src = s.source.value;
    for (const sp of s.specifiers) {
      const imported = t.isImportSpecifier(sp) ? (t.isIdentifier(sp.imported) ? sp.imported.name : sp.imported.value) : null;
      const nsAlias = imported && src.startsWith(".") ? nsResolve?.(src, imported) : null;
      if (imported && NS_EXPORT_NAMES.test(imported)) m.set(sp.local.name, { kind: "ns", src });
      else if (nsAlias) m.set(sp.local.name, { kind: "ns", src, alias: nsAlias });
      else if (imported) m.set(sp.local.name, { kind: "named", name: JSX_ALIAS[imported] && /jsx-runtime/.test(src) ? JSX_ALIAS[imported] : (REEXPORT_ALIAS[src + "#" + imported] || (/(^|\/)owner(\.js)?$/.test(src) && imported === "ownerWindow" ? "getWindow" : null)) || stripSuffix(imported), src });
      else if (t.isImportNamespaceSpecifier(sp) && src.startsWith(".")) m.set(sp.local.name, { kind: "ns", src, alias: nsResolve?.(src) || null });
      else if (NS_MODULES.test(src)) m.set(sp.local.name, { kind: "ns", src });
      else m.set(sp.local.name, { kind: "default", name: src.split("/").pop().replace(/\.(m?js|cjs)$/, ""), src });
    }
  }
  return m;
}

function declNames(n) {
  if (t.isExportNamedDeclaration(n) && n.declaration) return declNames(n.declaration);
  if (t.isExportDefaultDeclaration(n) && n.declaration?.id) return [n.declaration.id.name];
  if (t.isVariableDeclaration(n)) return n.declarations.flatMap((d) => (t.isIdentifier(d.id) ? [d.id.name] : []));
  if ((t.isFunctionDeclaration(n) || t.isClassDeclaration(n)) && n.id) return [n.id.name];
  return [];
}

// React 自动 runtime 的 JSX 编译：<T a={x} {...s} key={k}>c</T> → jsx(T, {a:x, ...s, children:c}, k)
function jsxText(raw) {
  const lines = raw.split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((l, i) => { if (/[^ \t]/.test(l)) last = i; });
  let str = "";
  lines.forEach((l, i) => {
    let x = l.replace(/\t/g, " ");
    if (i !== 0) x = x.replace(/^[ ]+/, "");
    if (i !== lines.length - 1) x = x.replace(/[ ]+$/, "");
    if (x) { if (i !== last) x += " "; str += x; }
  });
  return str;
}
function desugarJSX(file) {
  const tagExpr = (n) => {
    if (t.isJSXIdentifier(n)) return /^[a-z]/.test(n.name) || n.name.includes("-") ? t.stringLiteral(n.name) : t.identifier(n.name);
    if (t.isJSXMemberExpression(n)) return t.memberExpression(tagExpr(n.object), t.identifier(n.property.name));
    if (t.isJSXNamespacedName(n)) return t.stringLiteral(n.namespace.name + ":" + n.name.name);
  };
  const conv = (node) => {
    const isFrag = t.isJSXFragment(node);
    const type = isFrag ? t.identifier("Fragment") : tagExpr(node.openingElement.name);
    const props = [];
    let key = null;
    for (const a of isFrag ? [] : node.openingElement.attributes) {
      if (t.isJSXSpreadAttribute(a)) { props.push(t.spreadElement(a.argument)); continue; }
      const name = t.isJSXNamespacedName(a.name) ? a.name.namespace.name + ":" + a.name.name.name : a.name.name;
      let v = a.value == null ? t.booleanLiteral(true) : t.isJSXExpressionContainer(a.value) ? a.value.expression : t.isStringLiteral(a.value) ? t.stringLiteral(a.value.value) : a.value;
      if (name === "key") { key = v; continue; }
      props.push(t.objectProperty(t.isValidIdentifier(name) ? t.identifier(name) : t.stringLiteral(name), v));
    }
    const kids = [];
    for (const c of node.children) {
      if (t.isJSXText(c)) { const s = jsxText(c.value); if (s) kids.push(t.stringLiteral(s)); }
      else if (t.isJSXExpressionContainer(c)) { if (!t.isJSXEmptyExpression(c.expression)) kids.push(c.expression); }
      else if (t.isJSXSpreadChild(c)) kids.push(t.spreadElement(c.expression));
      else kids.push(c);
    }
    if (kids.length === 1) props.push(t.objectProperty(t.identifier("children"), kids[0]));
    else if (kids.length > 1) props.push(t.objectProperty(t.identifier("children"), t.arrayExpression(kids)));
    const args = [type, t.objectExpression(props)];
    if (key) args.push(key);
    return t.callExpression(t.identifier("jsx"), args);
  };
  traverse(file, {
    JSXElement: { exit(p) { p.replaceWith(conv(p.node)); } },
    JSXFragment: { exit(p) { p.replaceWith(conv(p.node)); } },
  });
}

// N（归一化）：在 A 上再消掉打包器（rollup/vite 生产构建）引入、语义等价的改写
//  R2 相邻字符串字面量 "a"+"b" 折叠；R3 switch 末尾空 default: 删除；
//  R4 if(纯表达式){} 且无 else → 删除；R5 块内函数声明 function f(){} ≡ let f=function(){}（统一成后者）；
//  R6 对空函数体函数（如 disableEslintWarning）的调用语句、实参均为标识符 → 删除
const isPure = (n) => t.isIdentifier(n) || t.isLiteral(n) && !t.isTemplateLiteral(n) || (t.isBinaryExpression(n) || t.isLogicalExpression(n)) && isPure(n.left) && isPure(n.right) || t.isUnaryExpression(n) && n.operator !== "delete" && isPure(n.argument);
function normalizeBuild(file, { emptyFns = new Set() } = {}) {
  traverse(file, {
    BinaryExpression: { exit(p) { const n = p.node; if (n.operator === "+" && t.isStringLiteral(n.left) && t.isStringLiteral(n.right)) p.replaceWith(t.stringLiteral(n.left.value + n.right.value)); } },
    SwitchStatement(p) { const cs = p.node.cases; const last = cs[cs.length - 1]; if (last && !last.test && (last.consequent.length === 0 || last.consequent.length === 1 && t.isBreakStatement(last.consequent[0]) && !last.consequent[0].label)) cs.pop(); },
    // R7 生产版 jsx-runtime 中 jsxs===jsx；R8 对象属性 {k:k} ≡ {k}；R10 if(x); ≡ if(x){}
    Identifier(p) { if (p.node.name === "jsxs" && !p.scope.getBinding("jsxs")) p.node.name = "jsx"; },
    ObjectProperty(p) { const n = p.node; if (!n.computed && t.isIdentifier(n.key) && t.isIdentifier(n.value) && n.key.name === n.value.name) n.shorthand = true; },
    EmptyStatement(p) { if (p.parentPath.isIfStatement()) p.replaceWith(t.blockStatement([])); },
    // R11 多 declarator 拆成多条
    VariableDeclaration(p) { const n = p.node; if (n.declarations.length > 1 && (p.parentPath.isBlockStatement() || p.parentPath.isProgram())) p.replaceWithMultiple(n.declarations.map((d) => t.variableDeclaration(n.kind, [d]))); },
    IfStatement(p) { const n = p.node; if (!n.alternate && t.isBlockStatement(n.consequent) && n.consequent.body.length === 0 && isPure(n.test)) p.remove(); },
    ExpressionStatement(p) { const e = p.node.expression; if (t.isCallExpression(e) && t.isIdentifier(e.callee) && emptyFns.has(e.callee.name) && e.arguments.every((a) => t.isIdentifier(a))) p.remove(); },
    FunctionDeclaration(p) {
      if (!p.parentPath.isBlockStatement() || p.parentPath.parentPath.isFunction()) return;
      const n = p.node;
      p.replaceWith(t.variableDeclaration("let", [t.variableDeclarator(n.id, t.functionExpression(null, n.params, n.body, n.generator, n.async))]));
    },
  });
}

// 对单条顶层语句生成 A/B 形状
function shapes(stmtPath, imports, ownNames, opts = {}) {
  let node = stmtPath.node;
  if (t.isExportNamedDeclaration(node) || t.isExportDefaultDeclaration(node)) {
    if (!node.declaration || !(t.isDeclaration(node.declaration))) return null;
  }
  const clone = t.cloneNode(t.isExportNamedDeclaration(node) || t.isExportDefaultDeclaration(node) ? node.declaration : node, true);
  const file = t.file(t.program([clone], [], "module"));
  desugarJSX(file);
  const refs = new Set();
  traverse(file, {
    "Identifier|JSXIdentifier"(p) {
      if ((p.isReferencedIdentifier() || p.isJSXIdentifier()) && !p.scope.getBinding(p.node.name) && p.node.name !== "undefined") refs.add(p.node.name);
    },
  });
  // 局部绑定 alpha 重命名；自由引用：import 绑定 → 规范名，其余去 $N
  let counter = 0;
  const renamed = new Map(); // binding -> new name
  const order = [];
  traverse(file, {
    "Identifier|JSXIdentifier"(p) {
      const b = p.scope.getBinding(p.node.name);
      if (!b || b.scope.path.isProgram() || renamed.has(b)) return;
      if (!(p.isReferencedIdentifier() || p.isBindingIdentifier() || b.identifier === p.node)) return;
      renamed.set(b, "_L" + counter++);
      order.push(b);
    },
  });
  for (const [b, nn] of renamed) {
    const ids = [b.identifier, ...b.referencePaths.map((r) => r.node), ...b.constantViolations.flatMap((c) => Object.values(c.getBindingIdentifiers()).filter((i) => i.name === b.identifier.name))];
    for (const id of ids) if (t.isIdentifier(id) || t.isJSXIdentifier(id)) id.name = nn;
  }
  traverse(file, {
    MemberExpression(p) {
      const o = p.node.object;
      if (t.isIdentifier(o) && imports.get(o.name)?.kind === "ns" && !p.scope.getBinding(o.name) && !p.node.computed) {
        const al = imports.get(o.name).alias;
        p.replaceWith(t.identifier(stripSuffix((al && al[p.node.property.name]) || p.node.property.name)));
        p.skip();
      }
    },
    Identifier(p) {
      const n = p.node.name;
      if (n.startsWith("_L")) return;
      if (!(p.isReferencedIdentifier() || p.isBindingIdentifier())) return;
      const im = imports.get(n);
      if (im && im.kind !== "ns") p.node.name = im.name;
      else if (im) p.node.name = "React";
      else p.node.name = stripSuffix(n);
    },
  });
  traverse(file, {
    StringLiteral(p) { delete p.node.extra; },
    NumericLiteral(p) { delete p.node.extra; },
  });
  const gen = (f) => generate(f, { comments: false, compact: true, jsescOption: { minimal: true, quotes: "double" } }).code;
  const A = gen(file);
  normalizeBuild(file, opts);
  const N = gen(file);
  traverse(file, {
    Identifier(p) {
      if (p.isReferencedIdentifier() || p.isBindingIdentifier()) p.node.name = "_";
    },
    JSXIdentifier(p) {},
  });
  const B = gen(file);
  return { A, N, B, refs: [...refs] };
}

// 输出：[{ names, A, B, start, end, type }]
export function declarations(src, { foldEnv = true, nsResolve = null, emptyFns = new Set() } = {}) {
  const ast = parseFile(src);
  if (foldEnv) fold(ast);
  const imports = importMap(ast, nsResolve);
  const out = [];
  traverse(ast, {
    Program(pp) {
      for (const sp of pp.get("body")) {
        const n = sp.node;
        if (t.isImportDeclaration(n) || (t.isExportNamedDeclaration(n) && !n.declaration) || t.isExportAllDeclaration(n)) continue;
        const names = declNames(n);
        let s;
        try { s = shapes(sp, imports, names, { emptyFns }); } catch (e) { s = { A: "ERR:" + e.message, N: "ERR:" + e.message, B: "ERR", refs: [] }; }
        if (!s) continue;
        out.push({ names: names.map(stripSuffix), rawNames: names, A: s.A, N: s.N, B: s.B, refs: s.refs, start: n.start, end: n.end, line: n.loc?.start.line, type: n.type });
      }
      pp.stop();
    },
  });
  return out;
}
