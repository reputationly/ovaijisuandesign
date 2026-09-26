// 抽出官方代码：平滑归类 → 记录官方代码引用的第三方名字 → 删掉第三方语句 → 还原 JSX → 输出。
//   node 04-extract.mjs <bundle.js> <out-dir>
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { restoreJsx } from "./jsx-lib.mjs";

const traverse = _traverse.default;
const generate = _generate.default;
const [, , bundle, outDir] = process.argv;
mkdirSync(outDir, { recursive: true });

const cls = JSON.parse(readFileSync(new URL("./classified.json", import.meta.url), "utf8"));
const src = readFileSync(bundle, "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
const body = ast.program.body;
if (body.length !== cls.length) throw new Error(`statement count mismatch ${body.length} vs ${cls.length}`);

// 1. 平滑：同一个文件的代码连续排放。夹在官方代码中间、连续不超过 2 条的"第三方"改判为官方
//    （名字撞上库里的同名函数，比如 cn / clamp）；CommonJS 包装一定是第三方，不动。
const kind = cls.map((s) => s.kind);
// 收敛规则明确判过的（pulled / promoted）不参与平滑，否则两边来回翻。
const isWrapper = (i) => (cls[i].pkgs ?? [])[0] === "(cjs-wrapper)" || cls[i].pulled || cls[i].promoted;
for (let i = 0; i < kind.length; i++) {
  if (kind[i] !== "lib" || isWrapper(i)) continue;
  let j = i;
  while (j < kind.length && kind[j] === "lib" && !isWrapper(j)) j++;
  const before = i > 0 ? kind[i - 1] : "lib";
  const after = j < kind.length ? kind[j] : "lib";
  if (j - i <= 2 && before === "app" && after === "app") for (let k = i; k < j; k++) kind[k] = "app";
  i = j - 1;
}

// 2. 官方语句引用了哪些第三方顶层名字
const stmtIndex = new Map(body.map((n, i) => [n, i]));
const topOf = (p) => {
  let cur = p;
  while (cur && !(cur.parentPath && cur.parentPath.isProgram())) cur = cur.parentPath;
  return cur ? stmtIndex.get(cur.node) : undefined;
};
const externals = new Map(); // name -> { pkgs, uses }
const usedBy = {}; // 官方语句下标 -> 用到的第三方名字
traverse(ast, {
  ReferencedIdentifier(p) {
    const b = p.scope.getBinding(p.node.name);
    if (!b || b.scope.block.type !== "Program") return;
    const def = topOf(b.path);
    const use = topOf(p);
    if (def === undefined || use === undefined || kind[def] !== "lib" || kind[use] !== "app") return;
    const e = externals.get(p.node.name) ?? { pkgs: cls[def].pkgs ?? [], defLine: cls[def].start, uses: 0 };
    e.uses++;
    externals.set(p.node.name, e);
    (usedBy[use] ??= new Set()).add(p.node.name);
  },
});

writeFileSync(`${outDir}/used-by.json`, JSON.stringify(Object.fromEntries(Object.entries(usedBy).map(([k, v]) => [k, [...v]]))));
if (process.env.ANALYZE_ONLY) {
  writeFileSync(`${outDir}/kinds.json`, JSON.stringify(kind));
  process.exit(0);
}
// 3. 只留官方语句，还原 JSX，输出
ast.program.body = body.filter((_, i) => kind[i] === "app");
const stats = restoreJsx(ast);
writeFileSync(`${outDir}/app.jsx`, generate(ast, { comments: true, jsescOption: { minimal: true } }).code);
writeFileSync(`${outDir}/externals.json`, JSON.stringify(Object.fromEntries([...externals].sort((a, b) => b[1].uses - a[1].uses)), null, 1));
writeFileSync(`${outDir}/kinds.json`, JSON.stringify(kind));
const count = (k) => kind.filter((x) => x === k).length;
console.log({ app: count("app"), lib: count("lib"), externals: externals.size, ...stats });
