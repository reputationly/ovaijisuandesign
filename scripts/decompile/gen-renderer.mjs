// 阶段 0：把参照渲染层的编译产物转成一份能用 Vite 重新构建的源码树（app/renderer/src）。
//
//   node scripts/decompile/gen-renderer.mjs [参照版本，默认 3.0.16]
//
// 做的事：
//   - 主 bundle：去掉 __vitePreload 包装，按归类（split.mjs）拆成 src/vendor.js（第三方库，原样）和
//     src/main.jsx（参照自己的代码，还原 JSX，从 vendor.js 导入用到的库名字）。vendor 之后逐个换成 npm 包。
//     归类文件默认取 .probe/decompile/classified.json（跑 run-all.sh 生成），不存在就不拆。
//   - 其余懒加载 chunk、worker、图片等原样拷过去；chunk 里对主 bundle 的 import 改指 ./main.jsx。
//   - JSX 编译回 `__jsx(type, props, ...children)`（vite.config 里配），这里在 main.jsx 顶部定义它，转发到 bundle
//     自带的 jsxRuntimeExports.jsx / jsxs：和编译产物调的是同一个运行时，key、children 的处理完全一样。
//
// 生成结果是阶段 1、2 的起点，之后在它上面改；重新生成会覆盖 app/renderer/src。
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import * as t from "@babel/types";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { restoreJsx } from "./jsx-lib.mjs";
import { swapPackages } from "./npm-swap.mjs";
import { splitProgram } from "./split.mjs";

const traverse = _traverse.default;
const generate = _generate.default;
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const version = process.argv[2] ?? "3.0.16";
const assets = path.join(repo, "reference", version, "app/out/renderer/assets");
const outDir = path.join(repo, "app/renderer/src");
const swapList = JSON.parse(readFileSync(path.join(here, "npm-packages.json"), "utf8"));
// 阶段计时（OV_TIME=1 时打印）：改 swapEsm 的规则时，先看时间花在哪一段。
const T0 = process.env.OV_TIME ? Date.now() : 0;
const mark = (label) => { if (T0) console.log(`[计时] ${label}: ${((Date.now() - T0) / 1000).toFixed(1)}s`); };
// 换成 npm 的包写进 app/renderer/package.json（精确版本）。被换的包之间的依赖在根 package.json 的
// pnpm.overrides 里按 "父>子" 钉成同一个版本，保证依赖树里只有一份实例（只影响这些包，不碰仓库里别的包）。
function writeDependencies(done) {
  const version = Object.fromEntries(done.map((r) => [r.name, r.version]));
  const file = path.join(repo, "app/renderer/package.json");
  const pj = JSON.parse(readFileSync(file, "utf8"));
  pj.dependencies = Object.fromEntries(Object.entries({ ...pj.dependencies, ...version }).sort());
  writeFileSync(file, JSON.stringify(pj, null, 2) + "\n");
  const pins = Object.fromEntries(done.flatMap((r) => (r.deps ?? []).filter((d) => version[d]).map((d) => [`${r.name}>${d}`, version[d]])));
  if (!Object.keys(pins).length) return;
  const rootFile = path.join(repo, "package.json");
  const root = JSON.parse(readFileSync(rootFile, "utf8"));
  root.pnpm ??= {};
  root.pnpm.overrides = Object.fromEntries(Object.entries({ ...root.pnpm.overrides, ...pins }).sort());
  writeFileSync(rootFile, JSON.stringify(root, null, 2) + "\n");
}
const classified = process.env.CLASSIFIED ?? path.join(repo, ".probe/decompile/classified.json");

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

const declares = (n, name) => (t.isVariableDeclaration(n) ? n.declarations : []).some((d) => t.isIdentifier(d.id, { name })) || n.id?.name === name;

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
    const bundleSrc = readFileSync(file, "utf8");
    let ast = parse(bundleSrc, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
    const preload = stripPreload(ast);
    let header = "";
    if (existsSync(classified)) {
      const { vendor, main, exportNames, stats } = splitProgram(ast, JSON.parse(readFileSync(classified, "utf8")));
      // JSX 适配函数和 Fragment 要用 jsxRuntimeExports，即使它在 vendor 里也得导入
      const imports = [...new Set([...exportNames, ...(vendor.program.body.some((n) => declares(n, "jsxRuntimeExports")) ? ["jsxRuntimeExports"] : [])])].sort();
      // main 语句实际引用的 vendor 名：main 的 import 表是"宁多勿少"的语句粒度导出，
      // 其中很多名字 main 并不使用（也不被 chunk re-export），把全集传给 swapEsm 会让"包的内部名
      // 恰好在表里"变成假冲突（unwrapElement）。main 尾部的 export {...} 不受影响——那些名字
      // 依然从 vendor import（import 行见下），只是不再要求被换的包认领它们。
      const imported = new Set(imports);
      const mainRefs = new Set();
      // split 后的 main 还没有 import 行（header 最后才拼），"main 在用"的判据是：
      // 名字在 import 表里且 main 内部没有同名绑定（split 保证 main 不重定义 vendor 的名字）。
      // split.mjs 内部 traverse 过同一个 Program 节点，babel 的 scope 缓存还在上面：
      // body 被替换后 getBinding 仍会返回已移到 vendor 的定义，下面的判定就永远不成立。
      // 清掉缓存让这次 traverse 重建 scope。
      traverse.cache.clear();
      traverse(main, {
        ReferencedIdentifier(p) {
          if (imported.has(p.node.name) && !p.scope.getBinding(p.node.name)) mainRefs.add(p.node.name);
        },
      });
            if (swapList.length) {
        console.log(`换成 npm 包（${swapList.length} 个）：`);
        mark("拆分+归类")
        const reports = swapPackages(vendor, bundleSrc, [...mainRefs], swapList, { cacheDir: path.join(repo, ".probe/decompile/pkg-cache") });
        mark("swapPackages")
        writeDependencies(reports.filter((r) => !r.error));
        if (reports.some((r) => r.error) && process.env.SWAP_STRICT !== "0") throw new Error("有包没换成，见上面的 ✗");
      }
      const vendorCode = generate(vendor, { comments: true, jsescOption: { minimal: true } }).code + `\nexport { ${imports.join(", ")} };\n`;
      writeFileSync(path.join(outDir, "vendor.js"), renameViteHelpers(vendorCode));
      {
        // main 的 import 行同样收紧：mainRefs ∪（export 表里仍由 vendor 提供的原名）。
        // export 表 618 项里 508 项的原名是 main 自己定义的组件，不需要 import；
        // 死名字（requireType 之类）定义已被换成 npm 的包删掉，import 了反而是未定义错误。
        const exportOrigins = (generate(main).code.match(/export \{([\s\S]*?)\};?\s*$/) ?? ["", ""])[1]
          .split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter((n) => imported.has(n));
        const need = [...new Set([...mainRefs, ...exportOrigins])].sort();
        header = `import { ${need.join(", ")} } from "./vendor.js";\n`;
      }
      ast = main;
      mark("生成 vendor/main 文本")
      console.log(`拆分：vendor ${stats.lib} 条语句，main ${stats.app} 条，导出 ${imports.length} 个名字，收敛 ${stats.rounds} 轮`);
    }
    const jsx = restoreJsx(ast);
    const code = generate(ast, { comments: true, jsescOption: { minimal: true } }).code;
    writeFileSync(path.join(outDir, "main.jsx"), renameViteHelpers(header + JSX_ADAPTER + code));
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
mark("全部完成")
console.log(`其余 ${chunks} 个 chunk 和资源已拷到 ${path.relative(repo, outDir)}`);
