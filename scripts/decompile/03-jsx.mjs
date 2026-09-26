// jsxRuntimeExports.jsx / jsxs(...) → JSX。没法安全还原的保持原样。
//   node 03-jsx.mjs <in.js> <out.jsx>
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import * as t from "@babel/types";
import { readFileSync, writeFileSync } from "node:fs";

const traverse = _traverse.default;
const generate = _generate.default;

const RUNTIME = "jsxRuntimeExports";
const isRuntimeMember = (n, prop) => t.isMemberExpression(n) && t.isIdentifier(n.object, { name: RUNTIME }) && t.isIdentifier(n.property, { name: prop });
const isFragment = (n) => isRuntimeMember(n, "Fragment") || (t.isMemberExpression(n) && t.isIdentifier(n.object, { name: "reactExports" }) && t.isIdentifier(n.property, { name: "Fragment" }));

function toJsxName(n) {
  if (t.isIdentifier(n)) return /^[A-Z_$]/.test(n.name) ? t.jsxIdentifier(n.name) : null;
  if (t.isMemberExpression(n) && !n.computed && t.isIdentifier(n.property)) {
    const obj = t.isIdentifier(n.object) ? t.jsxIdentifier(n.object.name) : t.isMemberExpression(n.object) ? toJsxName(n.object) : null;
    return obj ? t.jsxMemberExpression(obj, t.jsxIdentifier(n.property.name)) : null;
  }
  return null;
}

const ATTR_NAME = /^[A-Za-z_$][\w$-]*$/;
function toChild(n) {
  if (t.isJSXElement(n) || t.isJSXFragment(n)) return n;
  if (t.isStringLiteral(n) && n.value.trim() === n.value && n.value && !/[{}<>\n]/.test(n.value)) return t.jsxText(n.value);
  return t.jsxExpressionContainer(n);
}

let converted = 0;
let kept = 0;
function convert(path) {
  const { node } = path;
  if (!(isRuntimeMember(node.callee, "jsx") || isRuntimeMember(node.callee, "jsxs"))) return;
  const [type, props, key] = node.arguments;
  const fragment = isFragment(type);
  let name = null;
  if (!fragment) {
    if (t.isStringLiteral(type) && /^[a-z][\w-]*$/.test(type.value)) name = t.jsxIdentifier(type.value);
    else name = toJsxName(type);
    if (!name) return void kept++;
  }
  const attrs = [];
  let children = [];
  if (props && !t.isObjectExpression(props)) attrs.push(t.jsxSpreadAttribute(props));
  else if (props) {
    for (const p of props.properties) {
      if (t.isSpreadElement(p)) {
        attrs.push(t.jsxSpreadAttribute(p.argument));
        continue;
      }
      if (!t.isObjectProperty(p) || p.computed) return void kept++;
      const k = t.isIdentifier(p.key) ? p.key.name : t.isStringLiteral(p.key) ? p.key.value : null;
      if (k === null || !ATTR_NAME.test(k)) return void kept++;
      if (k === "children") {
        children = t.isArrayExpression(p.value) && isRuntimeMember(node.callee, "jsxs") ? p.value.elements.map(toChild) : [toChild(p.value)];
        continue;
      }
      const v = p.value;
      const value = t.isStringLiteral(v) && !/["\n\\]/.test(v.value) ? t.stringLiteral(v.value) : t.isBooleanLiteral(v, { value: true }) && false ? null : t.jsxExpressionContainer(v);
      attrs.push(t.jsxAttribute(t.jsxIdentifier(k), value));
    }
  }
  if (key !== undefined) {
    if (fragment) return void kept++; // 带 key 的片段要写成 <Fragment key>，这里不处理
    attrs.unshift(t.jsxAttribute(t.jsxIdentifier("key"), t.jsxExpressionContainer(key)));
  }
  if (fragment && attrs.length) return void kept++;
  const el = fragment
    ? t.jsxFragment(t.jsxOpeningFragment(), t.jsxClosingFragment(), children)
    : t.jsxElement(t.jsxOpeningElement(name, attrs, children.length === 0), children.length ? t.jsxClosingElement(name) : null, children, children.length === 0);
  path.replaceWith(el);
  converted++;
}

const src = readFileSync(process.argv[2], "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
// 打包器加的 PURE 标注：原始源码里没有，留着会在 JSX 子节点之间变成文本。
const PURE = /^\s*[#@]__PURE__\s*$/;
ast.comments = ast.comments.filter((c) => !PURE.test(c.value));
traverse(ast, {
  enter(path) {
    for (const k of ["leadingComments", "trailingComments", "innerComments"]) {
      if (path.node[k]) path.node[k] = path.node[k].filter((c) => !PURE.test(c.value));
    }
  },
});
// 自底向上：先换内层，外层 children 里拿到的就已经是 JSX
traverse(ast, { CallExpression: { exit: convert } });
const out = generate(ast, { retainLines: false, comments: true, jsescOption: { minimal: true } }).code;
writeFileSync(process.argv[3], out);
console.log("converted", converted, "kept as call", kept);
