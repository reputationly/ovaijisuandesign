// 把 bundle 里的一段顶层语句还原成接近我们源码风格的文本。
//
//   node scripts/refdiff/restore-statement.mjs <bundle.js> <start> <end>
//
// 做的三件事，顺序不能换：
//   1. 去掉 Vite 的 `__vitePreload(fn, deps, url)` 包装 —— deps 是旧构建的文件名，重构建后不存在；
//   2. 把 `jsxRuntimeExports.jsx/jsxs(...)` 还原成 JSX（复用 scripts/decompile/jsx-lib.mjs）；
//   3. 用 prettier 排版，压成源码的样子。
//
// 不做的事（有意不做，避免猜）：不解析自由标识符到 import、不改 `$2` 后缀。
// 这两件由上层 apply-delta.mjs 按名字索引去解。
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import { restoreJsx } from "../decompile/jsx-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../decompile/package.json"));
const generate = require("@babel/generator").default;
const prettier = require("prettier");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");

/** `__vitePreload(fn, deps, url)` → `fn()`。 */
function stripPreload(ast) {
  let n = 0;
  traverse(ast, {
    CallExpression(p) {
      if (t.isIdentifier(p.node.callee, { name: "__vitePreload" }) && p.node.arguments.length >= 1) {
        p.replaceWith(t.callExpression(p.node.arguments[0], []));
        n += 1;
      }
    },
  });
  return n;
}

/**
 * 一段 bundle 语句 → 源码文本。
 * @param {string} code 语句原文（从 bundle 里按字节区间取出来的完整语句）
 * @param {{ parser?: "babel" | "babel-ts" }} [opts]
 */
export async function restoreStatementText(code, opts = {}) {
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  const preloads = stripPreload(ast);
  const jsx = restoreJsx(ast);
  const generated = generate(ast, { comments: true, retainLines: false, jsescOption: { minimal: true } }).code;
  const formatted = await prettier.format(generated, {
    parser: opts.parser ?? "babel",
    printWidth: 120,
    semi: true,
    singleQuote: false,
    trailingComma: "all",
  });
  return { code: formatted.trimEnd(), stats: { preloads, jsx } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import("node:fs");
  const [, , bundlePath, start, end] = process.argv;
  if (!bundlePath || start === undefined || end === undefined) {
    console.error("用法：node scripts/refdiff/restore-statement.mjs <bundle.js> <start> <end>");
    process.exit(2);
  }
  const buf = readFileSync(bundlePath, "utf8");
  const out = await restoreStatementText(buf.slice(Number(start), Number(end)));
  console.log(out.code);
  console.error(`# stats ${JSON.stringify(out.stats)}`);
}
