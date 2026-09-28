// 调试单个包为什么没认全：对报冲突的名字，把 vendor 里的语句形状和该包 npm dist 的文本对一遍。
//   node scripts/decompile/dbg-swap.mjs <包名> <版本> <名字>...
// 名字用 swapEsm 报冲突时打印的原名（如 cmpRange、mac$1）。对每个名字输出：
//   - 语句头 60 字（vendor 里长什么样）；
//   - 形状（norm 后）能否在包 dist 拼接文本里找到、形状长度；
//   - dist 里同名定义的原文片段（截断），没有就提示。
// 另外对整包打印：dist 的顶层函数 / 类，vendor 里形状对不上的清单（发现"拆散了 / 版本不对"）。
import { parse } from "@babel/parser";
import * as t from "@babel/types";
import _traverse from "@babel/traverse";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchPackage, moduleGraph, norm } from "./npm-swap.mjs";

const traverse = _traverse.default;
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const probe = path.join(repo, ".probe/decompile");

const [pkg, version, ...names] = process.argv.slice(2);
if (!pkg || !version) throw new Error("用法：dbg-swap.mjs <包名> <版本> <名字>...");

// 从上一次 gen-renderer 落盘的 vendor.js 里找名字（和 swapEsm 看到的是同一份语句）。
// gen-renderer.mjs 会整目录覆盖 app/renderer/src，调试前先跑过一次才有 vendor.js。
const vendorPath = path.join(repo, "app/renderer/src/vendor.js");
const vendorSrc = readFileSync(vendorPath, "utf8");
const vendorAst = parse(vendorSrc, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });

// 名字 → 定义它的顶层语句
const stmtOf = new Map();
traverse(vendorAst, {
  Program(p) {
    for (const [name, b] of Object.entries(p.scope.bindings)) {
      let cur = b.path;
      while (cur.parentPath && !cur.parentPath.isProgram()) cur = cur.parentPath;
      if (!stmtOf.has(name)) stmtOf.set(name, cur.node);
    }
  },
});

const pkgDir = fetchPackage(path.join(probe, "pkg-cache"), pkg, version);
const files = moduleGraph(pkgDir);
if (!files.length) throw new Error(`${pkg}@${version} 找不到 ESM 入口`);
const distText = files.map((f) => norm(readFileSync(f, "utf8"))).join("\n");

const tryIncludes = (s) => distText.includes(s) || distText.includes(s + ";") || distText.includes(s + ",");

const show = (n, label) => {
  const node = stmtOf.get(n);
  if (!node) {
    console.log(`\n== ${n}（${label}）：vendor 顶层没有这个名字`);
    return;
  }
  const text = vendorSrc.slice(node.start, node.end);
  const shape = norm(text);
  console.log(`\n== ${n}（${label}）`);
  console.log(`  语句头：${text.slice(0, 60).replace(/\s+/g, " ")}`);
  console.log(`  形状长度 ${shape.length}，dist ${tryIncludes(shape) ? "✓ 命中" : "✗ 未命中"}`);
  for (const re of [
    new RegExp(`(?:^|[,;\\n])function\\s+${n}\\s*\\(`, "m"),
    new RegExp(`(?:^|[,;\\n])(?:var|let|const)\\s+${n}\\s*=`, "m"),
    new RegExp(`(?:^|[,;\\n])class\\s+${n}\\b`, "m"),
  ]) {
    const m = distText.match(re);
    if (m) {
      const at = m.index + m[0].length;
      console.log(`  dist 同名定义：${distText.slice(at, at + 120)}`);
      return;
    }
  }
  console.log(`  dist 里没有 ${n} 的同名定义`);
};

if (names.length) {
  for (const n of names) {
    show(n, "vendor");
    const base = n.replace(/\$\d+$/, "");
    if (base !== n) show(base, "vendor，剥 $ 后缀");
  }
}

// 整包视角：dist 的每个顶层函数 / 类，vendor 里有没有形状一致的对应
console.log(`\n== ${pkg}@${version} 整包：dist ${files.length} 个文件`);
const vendorShapes = new Set(vendorAst.program.body.map((n) => (n.start == null ? null : norm(vendorSrc.slice(n.start, n.end)))).filter(Boolean));
let found = 0;
const missing = [];
for (const f of files) {
  const code = readFileSync(f, "utf8");
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  for (const n of ast.program.body) {
    if (!t.isFunctionDeclaration(n) && !t.isClassDeclaration(n)) continue;
    const shape = norm(code.slice(n.start, n.end));
    if (shape.length < 40) continue;
    // vendor 是 generate 重新打印的、名字可能带打包器后缀（NodeType3 / NodeType$1），不能按名字找；
    // 直接看 vendor 里有没有任何语句的形状和它一致
    if (vendorShapes.has(shape)) found++;
    else missing.push(`${n.id.name}（${path.relative(pkgDir, f)}，形状 ${shape.length}）`);
  }
}
console.log(`  dist 顶层函数/类共 ${found + missing.length} 个，vendor 形状对上 ${found} 个`);
if (missing.length) console.log(`  没对上：\n    ${missing.slice(0, 20).join("\n    ")}`);
