// 里程碑 1：整份主 bundle 作为一个源文件（还原 JSX、去掉 __vitePreload 包装），连同懒加载文件和资源
// 组成一个可以用 Vite 重新构建的工程。第三方代码原样留在里面。
//   node 08-source.mjs <assets-dir> <out-src-dir>
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import * as t from "@babel/types";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { restoreJsx } from "./jsx-lib.mjs";

const traverse = _traverse.default;
const generate = _generate.default;
const [assets, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const MAIN = readdirSync(assets).find((n) => /^index-[\w-]{8}\.js$/.test(n) && readFileSync(path.join(assets, n), "utf8").includes("__vite__mapDeps"));

// __vitePreload(fn, deps, url) → fn()：deps 是构建产物里的旧文件名，重新构建后就不存在了，
// 预加载失败会让整个 import 抛错。
function stripPreload(ast) {
  let n = 0;
  traverse(ast, {
    CallExpression(p) {
      if (t.isIdentifier(p.node.callee, { name: "__vitePreload" }) && p.node.arguments.length >= 1) {
        const fn = p.node.arguments[0];
        p.replaceWith(t.callExpression(fn, []));
        n++;
      }
    },
  });
  return n;
}

const rewriteMainImport = (code) => code.replaceAll(`"./${MAIN}"`, '"./main.jsx"');

for (const name of readdirSync(assets)) {
  const file = path.join(assets, name);
  if (name === MAIN) {
    const ast = parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
    const preload = stripPreload(ast);
    const jsx = restoreJsx(ast);
    writeFileSync(path.join(outDir, "main.jsx"), generate(ast, { comments: true, jsescOption: { minimal: true } }).code);
    console.log("main.jsx", { preload, ...jsx });
  } else if (/\.m?js$/.test(name)) {
    const code = readFileSync(file, "utf8");
    if (code.includes("__vitePreload(")) {
      const ast = parse(code, { sourceType: "module", errorRecovery: true });
      stripPreload(ast);
      writeFileSync(path.join(outDir, name), rewriteMainImport(generate(ast, { comments: true }).code));
    } else writeFileSync(path.join(outDir, name), rewriteMainImport(code));
  } else copyFileSync(file, path.join(outDir, name));
}
