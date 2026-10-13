// 跨模块声明形状：在 baseui-hls/tools/canon.mjs 的 A/N 形状基础上，把"自由引用"（顶层名、import、全局）
// 换成按出现顺序编号的占位符 $F<i>，并记录每个占位符解析到的全局 key：
//   <绝对文件路径>#<顶层名>   模块内声明
//   ext:<包说明符>#<导出名>   npm 外部 import（react 一类的默认导入按命名空间处理：ns.x → ext:react#x）
//   global:<名字>             浏览器/JS 全局
// F = 占位符化后的 A 形状；FN = 再做构建器归一化（R2–R11，同 canon.mjs）。F 相等且引用一一配对 = 声明逐字一致（仅命名不同）。
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import * as t from "@babel/types";
const traverse = _traverse.default, generate = _generate.default;

const NS_MODULES = /^(react|react-dom|react-dom\/client|react\/jsx-runtime|react\/jsx-dev-runtime|use-sync-external-store\/shim(\/index\.js)?|use-sync-external-store\/shim\/with-selector(\.js)?)$/;
const JSX_ALIAS = { jsxs: "jsx", jsxDEV: "jsx" };

export function normKey(k) {
  // 生产版 react/jsx-runtime 中 jsxs === jsx；Fragment 与 react 的 Fragment 是同一个 Symbol
  let m = /^ext:(react\/jsx-(?:dev-)?runtime)#(\w+)$/.exec(k);
  if (m) { if (m[2] === "Fragment") return "ext:react#Fragment"; return "ext:react/jsx-runtime#" + (JSX_ALIAS[m[2]] || m[2]); }
  return k;
}

function dropParens(n) {
  if (!n || typeof n !== "object") return;
  if (Array.isArray(n)) { for (const x of n) dropParens(x); return; }
  if (n.extra && n.extra.parenthesized) { delete n.extra.parenthesized; delete n.extra.parenStart; }
  for (const k in n) if (k !== "loc" && k !== "extra" && k !== "leadingComments" && k !== "trailingComments" && k !== "innerComments") dropParens(n[k]);
}

function fold(ast) {
  traverse(ast, {
    MemberExpression(p) { if (p.matchesPattern("process.env.NODE_ENV")) p.replaceWith(t.stringLiteral("production")); },
    Identifier(p) { if (p.node.name === "undefined" && p.isReferencedIdentifier() && !p.scope.getBinding("undefined")) p.replaceWith(t.unaryExpression("void", t.numericLiteral(0))); },
  });
  const lit = (n) => (t.isBooleanLiteral(n) ? { v: n.value } : null);
  traverse(ast, {
    exit(p) {
      const n = p.node;
      if (p.isBinaryExpression() && t.isStringLiteral(n.left) && t.isStringLiteral(n.right) && ["===", "!==", "==", "!="].includes(n.operator)) {
        const eq = n.left.value === n.right.value; p.replaceWith(t.booleanLiteral(n.operator.startsWith("=") ? eq : !eq));
      } else if (p.isUnaryExpression({ operator: "!" }) && lit(n.argument)) p.replaceWith(t.booleanLiteral(!n.argument.value));
      else if (p.isLogicalExpression() && lit(n.left)) { const v = n.left.value; if (n.operator === "&&") p.replaceWith(v ? n.right : n.left); else if (n.operator === "||") p.replaceWith(v ? n.left : n.right); }
      else if (p.isConditionalExpression() && lit(n.test)) p.replaceWith(n.test.value ? n.consequent : n.alternate);
      else if (p.isIfStatement() && lit(n.test)) {
        const keep = n.test.value ? n.consequent : n.alternate;
        if (!keep) p.remove();
        else if (t.isBlockStatement(keep) && !keep.body.some((s) => t.isVariableDeclaration(s) && s.kind !== "var")) p.replaceWithMultiple(keep.body);
        else p.replaceWith(keep);
      } else if (p.isExpressionStatement() && t.isBooleanLiteral(n.expression)) p.remove();
    },
  });
}

function jsxText(raw) {
  const lines = raw.split(/\r\n|\n|\r/); let last = 0;
  lines.forEach((l, i) => { if (/[^ \t]/.test(l)) last = i; });
  let str = "";
  lines.forEach((l, i) => { let x = l.replace(/\t/g, " "); if (i !== 0) x = x.replace(/^[ ]+/, ""); if (i !== lines.length - 1) x = x.replace(/[ ]+$/, ""); if (x) { if (i !== last) x += " "; str += x; } });
  return str;
}
// JSX → jsx(type, {...props, children}, key)，jsx/Fragment 用保留名 __JSX__/__FRAG__，之后解析成 react/jsx-runtime
function desugarJSX(file) {
  const tagExpr = (n) => {
    if (t.isJSXIdentifier(n)) return /^[a-z]/.test(n.name) || n.name.includes("-") ? t.stringLiteral(n.name) : t.identifier(n.name);
    if (t.isJSXMemberExpression(n)) return t.memberExpression(t.isJSXIdentifier(n.object) ? t.identifier(n.object.name) : tagExpr(n.object), t.identifier(n.property.name));
    if (t.isJSXNamespacedName(n)) return t.stringLiteral(n.namespace.name + ":" + n.name.name);
  };
  const conv = (node) => {
    const isFrag = t.isJSXFragment(node);
    const type = isFrag ? t.identifier("__FRAG__") : tagExpr(node.openingElement.name);
    const props = []; let key = null;
    for (const a of isFrag ? [] : node.openingElement.attributes) {
      if (t.isJSXSpreadAttribute(a)) { props.push(t.spreadElement(a.argument)); continue; }
      const name = t.isJSXNamespacedName(a.name) ? a.name.namespace.name + ":" + a.name.name.name : a.name.name;
      const v = a.value == null ? t.booleanLiteral(true) : t.isJSXExpressionContainer(a.value) ? a.value.expression : t.isStringLiteral(a.value) ? t.stringLiteral(a.value.value) : a.value;
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
    const args = [type, t.objectExpression(props)]; if (key) args.push(key);
    return t.callExpression(t.identifier("__JSX__"), args);
  };
  traverse(file, { JSXElement: { exit(p) { p.replaceWith(conv(p.node)); } }, JSXFragment: { exit(p) { p.replaceWith(conv(p.node)); } } });
}

const isPure = (n) => t.isIdentifier(n) || t.isLiteral(n) && !t.isTemplateLiteral(n) || (t.isBinaryExpression(n) || t.isLogicalExpression(n)) && isPure(n.left) && isPure(n.right) || t.isUnaryExpression(n) && n.operator !== "delete" && isPure(n.argument);
function normalizeBuild(file) {
  traverse(file, {
    BinaryExpression: { exit(p) { const n = p.node; if (n.operator === "+" && t.isStringLiteral(n.left) && t.isStringLiteral(n.right)) p.replaceWith(t.stringLiteral(n.left.value + n.right.value)); } },
    SwitchStatement(p) { const cs = p.node.cases; const last = cs[cs.length - 1]; if (last && !last.test && (last.consequent.length === 0 || last.consequent.length === 1 && t.isBreakStatement(last.consequent[0]) && !last.consequent[0].label)) cs.pop(); },
    ObjectProperty(p) { const n = p.node; if (!n.computed && t.isIdentifier(n.key) && t.isIdentifier(n.value) && n.key.name === n.value.name) n.shorthand = true; },
    EmptyStatement(p) { if (p.parentPath.isIfStatement()) p.replaceWith(t.blockStatement([])); },
    VariableDeclaration(p) { const n = p.node; if (n.declarations.length > 1 && (p.parentPath.isBlockStatement() || p.parentPath.isProgram())) p.replaceWithMultiple(n.declarations.map((d) => t.variableDeclaration(n.kind, [d]))); },
    IfStatement(p) { const n = p.node; if (!n.alternate && t.isBlockStatement(n.consequent) && n.consequent.body.length === 0 && isPure(n.test)) p.remove(); },
    FunctionDeclaration(p) {
      if (!p.parentPath.isBlockStatement() || p.parentPath.parentPath.isFunction()) return;
      const n = p.node; p.replaceWith(t.variableDeclaration("let", [t.variableDeclarator(n.id, t.functionExpression(null, n.params, n.body, n.generator, n.async))]));
    },
  });
}

const EXTS = ["", ".js", ".jsx", ".mjs", ".ts", ".tsx", "/index.js", "/index.jsx", "/index.mjs"];
export function resolveFile(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const e of EXTS) { const f = base + e; if (fs.existsSync(f) && fs.statSync(f).isFile()) return f; }
  return null;
}
const gen = (f) => generate(f, { comments: false, compact: true, jsescOption: { minimal: true, quotes: "double" } }).code;

// 一个模块图：按需加载文件，解析 import/export/顶层声明
export class Graph {
  constructor({ bareResolver = null } = {}) { this.mods = new Map(); this.bareResolver = bareResolver; this.shapeCache = new Map(); }
  mod(file) {
    let m = this.mods.get(file); if (m) return m;
    const src = fs.readFileSync(file, "utf8");
    const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
    dropParens(ast);
    m = { file, src, ast, decls: new Map(), imports: new Map(), exports: new Map(), stars: [], other: [] };
    for (const [si, s] of ast.program.body.entries()) {
      if (t.isImportDeclaration(s)) {
        const from = s.source.value;
        for (const sp of s.specifiers) {
          const imported = t.isImportSpecifier(sp) ? (t.isIdentifier(sp.imported) ? sp.imported.name : sp.imported.value) : t.isImportDefaultSpecifier(sp) ? "default" : "*";
          m.imports.set(sp.local.name, { from, name: imported });
        }
        if (!s.specifiers.length) m.other.push({ kind: "side-effect-import", from, si });
        continue;
      }
      if (t.isExportAllDeclaration(s)) { m.stars.push(s.source.value); continue; }
      if (t.isExportNamedDeclaration(s) && !s.declaration) {
        for (const sp of s.specifiers) {
          const ex = t.isIdentifier(sp.exported) ? sp.exported.name : sp.exported.value;
          const lo = sp.local ? (t.isIdentifier(sp.local) ? sp.local.name : sp.local.value) : "default";
          m.exports.set(ex, s.source ? { from: s.source.value, name: lo } : { local: lo });
        }
        continue;
      }
      let d = s, exported = false;
      if (t.isExportNamedDeclaration(s) || t.isExportDefaultDeclaration(s)) { d = s.declaration; exported = true; }
      if (t.isExportDefaultDeclaration(s) && !(d.id && (t.isFunctionDeclaration(d) || t.isClassDeclaration(d)))) {
        m.decls.set("default", { name: "default", node: d, kind: "default-expr", start: s.start, end: s.end, line: s.loc.start.line, si });
        m.exports.set("default", { local: "default" }); continue;
      }
      if (t.isVariableDeclaration(d)) {
        for (const dc of d.declarations) {
          if (!t.isIdentifier(dc.id)) { m.other.push({ kind: "destructure", si, line: s.loc.start.line }); continue; }
          m.decls.set(dc.id.name, { name: dc.id.name, node: dc, kind: "var", start: dc.start, end: dc.end, stmtStart: s.start, stmtEnd: s.end, line: dc.loc.start.line, si });
          if (exported) m.exports.set(dc.id.name, { local: dc.id.name });
        }
      } else if ((t.isFunctionDeclaration(d) || t.isClassDeclaration(d)) && d.id) {
        m.decls.set(d.id.name, { name: d.id.name, node: d, kind: t.isClassDeclaration(d) ? "class" : "function", start: s.start, end: s.end, line: s.loc.start.line, si });
        if (exported) m.exports.set(t.isExportDefaultDeclaration(s) ? "default" : d.id.name, { local: d.id.name });
      } else m.other.push({ kind: s.type, si, line: s.loc.start.line, start: s.start, end: s.end });
    }
    this.mods.set(file, m); return m;
  }
  bare(spec, name) {
    if (this.bareResolver) { const r = this.bareResolver(spec, name); if (r) return r; }
    if (NS_MODULES.test(spec) && (name === "default" || name === "*")) return "ns:" + spec.replace(/\/index\.js$|\.js$/, "");
    return normKey("ext:" + spec + "#" + name);
  }
  // 顶层名（本模块作用域里的名字）→ key
  resolveLocal(file, name) {
    const m = this.mod(file);
    if (m.decls.has(name)) {
      // rollup commonjs 互操作：const X = getDefaultExportFromCjs(Y) 视同 Y
      const d = m.decls.get(name), init = d.kind === "var" && d.node.init;
      if (init && init.type === "CallExpression" && init.callee.type === "Identifier" && /^getDefaultExportFromCjs/.test(init.callee.name) && init.arguments.length === 1 && init.arguments[0].type === "Identifier" && init.arguments[0].name !== name)
        return this.resolveLocal(file, init.arguments[0].name);
      return file + "#" + name;
    }
    const im = m.imports.get(name);
    if (im) return this.resolveImport(file, im.from, im.name);
    return "global:" + name;
  }
  resolveImport(fromFile, spec, name, seen = new Set()) {
    if (!spec.startsWith(".") && !spec.startsWith("/")) return this.bare(spec, name);
    const f = resolveFile(fromFile, spec);
    if (!f) return "missing:" + spec + "#" + name;
    return this.resolveExport(f, name, seen);
  }
  resolveExport(file, name, seen = new Set()) {
    const sk = file + "#" + name; if (seen.has(sk)) return "cycle:" + sk; seen.add(sk);
    const m = this.mod(file);
    if (name === "*") return "nsmod:" + file;
    const e = m.exports.get(name);
    if (e) { if (e.local) return this.resolveLocal(file, e.local); return this.resolveImport(file, e.from, e.name, seen); }
    for (const st of m.stars) { const r = this.resolveImport(file, st, name, seen); if (!r.startsWith("missing") && !r.startsWith("noexport")) return r; }
    return "noexport:" + file + "#" + name;
  }
  isInternal(key) { return /^\//.test(key); }
  declOf(key) { const i = key.lastIndexOf("#"); const file = key.slice(0, i), name = key.slice(i + 1); const m = this.mod(file); return { m, d: m.decls.get(name) }; }
  // 声明形状
  shape(key) {
    if (this.shapeCache.has(key)) return this.shapeCache.get(key);
    const { m, d } = this.declOf(key);
    if (!d) { const r = { err: "no-decl" }; this.shapeCache.set(key, r); return r; }
    let stmt;
    if (d.kind === "var") stmt = t.variableDeclaration("var", [t.cloneNode(d.node, true)]);
    else if (d.kind === "default-expr") stmt = t.expressionStatement(t.cloneNode(d.node, true));
    else stmt = t.cloneNode(d.node, true);
    const file = t.file(t.program([stmt], [], "module"));
    let r;
    try { r = this._shape(file, m, d.name); } catch (e) { r = { err: e.message }; }
    r.bytes = (d.stmtEnd && m.decls.size && d.kind === "var") ? d.end - d.start : d.end - d.start;
    this.shapeCache.set(key, r); return r;
  }
  _shape(file, m, ownName) {
    fold(file); desugarJSX(file);
    traverse(file, { Program(p) { p.scope.crawl(); } });
    // 局部绑定 α 重命名
    let counter = 0; const renamed = new Map();
    traverse(file, {
      "Identifier|JSXIdentifier"(p) {
        const b = p.scope.getBinding(p.node.name);
        if (!b || b.scope.path.isProgram() || renamed.has(b)) return;
        if (!(p.isReferencedIdentifier() || p.isBindingIdentifier() || b.identifier === p.node)) return;
        renamed.set(b, "_L" + counter++);
      },
    });
    for (const [b, nn] of renamed) {
      const ids = [b.identifier, ...b.referencePaths.map((r) => r.node), ...b.constantViolations.flatMap((c) => Object.values(c.getBindingIdentifiers()).filter((i) => i.name === b.identifier.name))];
      for (const id of ids) if (t.isIdentifier(id) || t.isJSXIdentifier(id)) id.name = nn;
    }
    // 自由引用 → $F<i>
    const refs = [];
    const keyOf = (n) => {
      if (n === "__JSX__") return "ext:react/jsx-runtime#jsx";
      if (n === "__FRAG__") return "ext:react#Fragment";
      return this.resolveLocal(m.file, n);
    };
    const ph = (key) => { refs.push(normKey(key)); return t.identifier("$F" + (refs.length - 1)); };
    traverse(file, {
      MemberExpression(p) {
        const o = p.node.object;
        if (!t.isIdentifier(o) || o.name.startsWith("_L") || o.name.startsWith("$F") || p.scope.getBinding(o.name) && !p.scope.getBinding(o.name).scope.path.isProgram()) return;
        if (o.name === ownName) return;
        const k = keyOf(o.name);
        // CJS 包（react 等）的 default 导入就是 exports 对象：React.X 与具名导入 X 等价
        const cjsNs = /^ext:(react|react-dom|react-dom\/client|react\/jsx-runtime|scheduler)#default$/.exec(k);
        if (cjsNs && !p.node.computed && t.isIdentifier(p.node.property)) { p.replaceWith(ph("ext:" + cjsNs[1] + "#" + p.node.property.name)); p.skip(); return; }
        if (k.startsWith("ns:") && !p.node.computed && t.isIdentifier(p.node.property)) { p.replaceWith(ph("ext:" + k.slice(3) + "#" + p.node.property.name)); p.skip(); }
      },
      Identifier(p) {
        const n = p.node.name;
        if (n.startsWith("_L") || /^\$F\d+$/.test(n)) return;
        const parent = p.parent;
        const isLval = (p.parentPath.isAssignmentExpression() && p.key === "left") || p.parentPath.isUpdateExpression();
        const decl = p.parentPath.isVariableDeclarator() && p.key === "id" || (p.parentPath.isFunctionDeclaration() || p.parentPath.isClassDeclaration()) && p.key === "id";
        if (decl && p.scope.path.isProgram() || decl && n === ownName) { p.node.name = "$D"; return; }
        if (!(t.isReferenced(p.node, parent, p.parentPath.parent) || isLval)) return;
        const b = p.scope.getBinding(n);
        if (b && !b.scope.path.isProgram()) return;
        p.replaceWith(ph(keyOf(n))); p.skip();
      },
    });
    traverse(file, { UnaryExpression(p) { const a = p.node.argument; if (p.node.operator === "!" && t.isNumericLiteral(a) && (a.value === 0 || a.value === 1)) p.replaceWith(t.booleanLiteral(a.value === 0)); },
      StringLiteral(p) { delete p.node.extra; }, NumericLiteral(p) { delete p.node.extra; },
      // 模板字符串按 cooked 值比较：`\u200B` 与字面零宽空格、`\n` 与真实换行是同一个字符串
      TemplateElement(p) { const c = p.node.value.cooked; if (c != null) p.node.value.raw = c.replace(/[\\`]|\$\{/g, (x) => "\\" + x).replace(/[^\x20-\x7e]/g, (ch) => "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0")); } });
    const F = gen(file);
    const refsF = refs.slice();
    normalizeBuild(file);
    const FN = gen(file);
    traverse(file, { Identifier(p) { if (p.isReferencedIdentifier() || p.isBindingIdentifier()) p.node.name = "_"; } });
    const B = gen(file);
    return { F, FN, B, refs: refsF };
  }
}
export const mask = (s) => s.replace(/\$F\d+/g, "$F");
export const refOrder = (s) => [...s.matchAll(/\$F(\d+)/g)].map((x) => +x[1]);
