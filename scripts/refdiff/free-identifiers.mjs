/**
 * 自由标识符（第 356 轮抽出，供 apply-delta 与 merge-conflicts 共用）。
 *
 * 为什么要共用：apply-delta 一直有这道检查，merge-conflicts 没有 —— 结果 4.0.3 的
 * token 级合并把 3142 条写回后界面直接崩（home 9.24% -> 33.7%），因为新语句引用了
 * 我们文件里没声明、也没 import 的名字，运行期 ReferenceError。
 *
 * 口径：文件里没声明（含参数、解构、catch、import）、也不是已知全局的，才算自由标识符。
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../decompile/package.json"));
const traverse = require("@babel/traverse").default;

const GLOBALS = new Set(
  "undefined null true false this window document console Math JSON Object Array String Number Boolean Promise Set Map Date RegExp Error TypeError Symbol globalThis performance requestAnimationFrame cancelAnimationFrame setTimeout clearTimeout setInterval clearInterval fetch URL URLSearchParams Blob File FormData AbortController AbortSignal Intl structuredClone queueMicrotask crypto navigator location localStorage sessionStorage HTMLElement Element Node Event CustomEvent MutationObserver ResizeObserver IntersectionObserver TextEncoder TextDecoder ArrayBuffer Uint8Array Uint16Array Uint32Array Int8Array Int16Array Int32Array Float32Array Float64Array DataView atob btoa process require import arguments",
);

/** 把解构 / 默认值 / rest 里的标识符都收进 declared。 */
export function collectPattern(id, declared) {
  if (!id) return;
  if (id.type === "Identifier") declared.add(id.name);
  else if (id.type === "ObjectPattern") for (const pr of id.properties) collectPattern(pr.value ?? pr.argument, declared);
  else if (id.type === "ArrayPattern") for (const el of id.elements) collectPattern(el, declared);
  else if (id.type === "RestElement") collectPattern(id.argument, declared);
  else if (id.type === "AssignmentPattern") collectPattern(id.left, declared);
}

/** 整个文件的自由标识符：文件里没声明、也没 import、也不是全局的才算。 */
export function freeIdentifiers(code) {
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  const declared = new Set();
  const used = new Set();
  traverse(ast, {
    FunctionDeclaration(p) {
      if (p.node.id) declared.add(p.node.id.name);
    },
    ClassDeclaration(p) {
      if (p.node.id) declared.add(p.node.id.name);
    },
    VariableDeclarator(p) {
      collectPattern(p.node.id, declared);
    },
    // 函数参数必须收：不收的话，参数名会被当成「自由标识符」报出来，把清单淹掉
    Function(p) {
      for (const param of p.node.params) collectPattern(param, declared);
      if (p.node.id) declared.add(p.node.id.name);
    },
    CatchClause(p) {
      if (p.node.param) collectPattern(p.node.param, declared);
    },
    ImportSpecifier(p) {
      declared.add(p.node.local.name);
    },
    ImportDefaultSpecifier(p) {
      declared.add(p.node.local.name);
    },
    ImportNamespaceSpecifier(p) {
      declared.add(p.node.local.name);
    },
    ReferencedIdentifier(p) {
      used.add(p.node.name);
    },
  });
  return [...used].filter((n) => !declared.has(n) && !GLOBALS.has(n));
}
