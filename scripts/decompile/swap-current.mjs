// 对着现有的 app/renderer/src/vendor.js 把 npm-packages.json 里还没换成 npm 的包换掉。
// 不重新生成整棵源码树。换不上的包留在原地，成功的语句从原文里切掉，其余字节不动。
//
//   node scripts/decompile/swap-current.mjs
//   ONLY=@floating-ui/core node scripts/decompile/swap-current.mjs
import { parse } from "@babel/parser";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generate, swapPackages } from "./npm-swap.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const vendorPath = path.join(repo, "app/renderer/src/vendor.js");
const srcRoot = path.join(repo, "app/renderer/src");
const only = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    const st = statSync(file);
    if (st.isDirectory()) walk(file, out);
    else if (/\.(js|jsx)$/.test(name) && file !== vendorPath) out.push(file);
  }
  return out;
}

function externalRefs() {
  const names = new Set();
  for (const file of walk(srcRoot)) {
    let ast;
    try {
      ast = parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
    } catch {
      continue;
    }
    for (const node of ast.program.body) {
      const source = node.source?.value;
      if (!source || !source.endsWith("/vendor.js") && source !== "./vendor.js") continue;
      if (node.type !== "ImportDeclaration" && node.type !== "ExportNamedDeclaration") continue;
      for (const spec of node.specifiers ?? []) {
        if (spec.type === "ImportSpecifier" || spec.type === "ExportSpecifier") names.add(spec.imported?.name ?? spec.local.name);
        else if (spec.type === "ImportDefaultSpecifier") names.add("default");
      }
    }
  }
  return names;
}

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

const installed = new Set(Object.keys(JSON.parse(readFileSync(path.join(repo, "app/renderer/package.json"), "utf8")).dependencies));
let list = JSON.parse(readFileSync(path.join(here, "npm-packages.json"), "utf8")).filter((item) => !installed.has(item.name));
if (only) list = list.filter((item) => only.has(item.name));
if (!list.length) {
  console.log("没有要换的包");
  process.exit(0);
}

console.log(`收集 vendor.js 的外部引用…`);
const refs = externalRefs();
console.log(`外部名字 ${refs.size} 个；待换 ${list.length} 个包`);

const src = readFileSync(vendorPath, "utf8");
console.log(`解析 vendor.js（${(src.length / 1024 / 1024).toFixed(1)}MB）…`);
const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
const reports = swapPackages(ast, src, refs, list, { cacheDir: path.join(repo, ".probe/decompile/pkg-cache") });
const done = reports.filter((r) => !r.error);
if (!done.length) {
  console.log("一个都没换成，vendor.js 不改");
  process.exit(0);
}

const defined = new Set();
for (const node of ast.program.body) {
  if (node.type === "ImportDeclaration") for (const spec of node.specifiers) defined.add(spec.local.name);
  else if ((node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") && node.id) defined.add(node.id.name);
  else if (node.type === "VariableDeclaration") for (const decl of node.declarations) if (decl.id.type === "Identifier") defined.add(decl.id.name);
}
const parts = ast.program.body.map((node) => {
  // 整库导出把已经删掉的内部名也列着。只留还在的绑定，避免导出未定义的名字。
  if (node.type === "ExportNamedDeclaration" && !node.source) {
    node.specifiers = node.specifiers.filter((spec) => defined.has(spec.local.name));
    return generate(node, { comments: true, jsescOption: { minimal: true } }).code;
  }
  if (node.start != null && node.end != null) return src.slice(node.start, node.end);
  return generate(node, { comments: true, jsescOption: { minimal: true } }).code;
});
const next = parts.join("\n") + "\n";
parse(next, { sourceType: "module", plugins: ["jsx"] });
writeFileSync(vendorPath, next);
writeDependencies(done);
console.log(`写回 vendor.js，换成 ${done.length} 个包，留下 ${reports.length - done.length} 个`);
