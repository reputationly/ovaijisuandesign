// 阶段 0：把参照渲染层的编译产物转成一份能用 Vite 重新构建的源码树（app/renderer/src）。
//
//   node scripts/decompile/gen-renderer.mjs [参照版本，默认 3.0.16]
//
// 做的事：
//   - 主 bundle：还原 JSX（jsx-lib.mjs）、去掉 __vitePreload 包装，写成 src/main.jsx。第三方库暂时原样留着，
//     阶段 1 再逐个换成 npm 包。
//   - 其余懒加载 chunk、worker、图片等原样拷过去；chunk 里对主 bundle 的 import 改指 ./main.jsx。
//   - JSX 编译回 `__jsx(type, props, ...children)`（vite.config 里配），这里在 main.jsx 顶部定义它，转发到 bundle
//     自带的 jsxRuntimeExports.jsx / jsxs：和编译产物调的是同一个运行时，key、children 的处理完全一样。
//
// 生成结果是阶段 1、2 的起点，之后在它上面改；重新生成会覆盖 app/renderer/src。
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import * as t from "@babel/types";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { restoreJsx } from "./jsx-lib.mjs";

const traverse = _traverse.default;
const generate = _generate.default;
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const version = process.argv[2] ?? "3.0.16";
const assets = path.join(repo, "reference", version, "app/out/renderer/assets");
const outDir = path.join(repo, "app/renderer/src");

const MAIN = readdirSync(assets).find((n) => /^index-[\w-]{8}\.js$/.test(n) && readFileSync(path.join(assets, n), "utf8").includes("__vite__mapDeps"));
if (!MAIN) throw new Error("找不到主 bundle");

// __vitePreload(fn, deps, url) → fn()：deps 是编译产物里的旧文件名，重新构建后就不存在了，
// 预加载失败会让整个 import 抛错。
function stripPreload(ast) {
  let n = 0;
  traverse(ast, {
    CallExpression(p) {
      if (t.isIdentifier(p.node.callee, { name: "__vitePreload" }) && p.node.arguments.length >= 1) {
        p.replaceWith(t.callExpression(p.node.arguments[0], []));
        n++;
      }
    },
  });
  return n;
}

// JSX 适配：classic 形式的 (type, props, ...children) → 运行时的 jsx / jsxs(type, props含children, key)。
// 多个 children 对应原来的 jsxs（静态子节点数组），一个或没有对应 jsx。
const JSX_ADAPTER = `
function __jsx(type, props, ...children) {
  const { key, ...rest } = props ?? {};
  if (children.length === 1) rest.children = children[0];
  else if (children.length > 1) rest.children = children;
  return children.length > 1 ? jsxRuntimeExports.jsxs(type, rest, key) : jsxRuntimeExports.jsx(type, rest, key);
}
`;

const rewriteMainImport = (code) => code.replaceAll(`"./${MAIN}"`, '"./main.jsx"');

// Vite 构建时会往每个含 import() 的模块注入自己的 __vitePreload（以及 __vite__mapDeps），和产物里留下的
// 同名变量撞车（"Identifier has already been declared"）。原来那两个改个名让路；预加载调用已经去掉了，
// 改名后它们只剩定义和导出，不影响行为。
const renameViteHelpers = (code) => code.replace(/\b__vitePreload\b/g, "__ovVitePreload").replace(/\b__vite__mapDeps\b/g, "__ovViteMapDeps");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
let chunks = 0;
for (const name of readdirSync(assets)) {
  const file = path.join(assets, name);
  if (name === MAIN) {
    const ast = parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
    const preload = stripPreload(ast);
    const jsx = restoreJsx(ast);
    const code = generate(ast, { comments: true, jsescOption: { minimal: true } }).code;
    writeFileSync(path.join(outDir, "main.jsx"), JSX_ADAPTER + renameViteHelpers(code));
    console.log(`main.jsx：去掉 ${preload} 处预加载包装，还原 ${jsx.converted} 处 JSX（${jsx.kept} 处保留为调用）`);
  } else if (/\.m?js$/.test(name)) {
    const code = readFileSync(file, "utf8");
    if (code.includes("__vitePreload(")) {
      const ast = parse(code, { sourceType: "module", errorRecovery: true });
      stripPreload(ast);
      writeFileSync(path.join(outDir, name), renameViteHelpers(rewriteMainImport(generate(ast, { comments: true }).code)));
    } else writeFileSync(path.join(outDir, name), renameViteHelpers(rewriteMainImport(code)));
    chunks++;
  } else copyFileSync(file, path.join(outDir, name));
}
console.log(`其余 ${chunks} 个 chunk 和资源已拷到 ${path.relative(repo, outDir)}`);
