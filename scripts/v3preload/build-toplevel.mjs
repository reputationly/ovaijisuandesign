/**
 * 重建 .probe/refdiff/toplevel-4.0.0.json（第 228 轮）。
 *
 * 为什么重建：旧文件的**字节偏移是错的**（app 区域整体漂移），
 * 于是 `failure` / `notify` / `storage` / `owners` 这类名字是从错位文本里刮出来的假名字，
 * 让闭包结果混进一堆「内层作用域名」，怎么补 import 都补不上。
 *
 * 新做法：用 @babel/parser 解析整个 bundle，按 **AST 的 start/end** 记录每个顶层声明。
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const REPO = process.cwd();
const require = createRequire(path.join(REPO, "scripts/decompile/package.json"));
const parser = require("@babel/parser");

const BUNDLE = ".probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js";
const OUT = ".probe/refdiff/toplevel-4.0.0.json";
const src = readFileSync(BUNDLE, "utf8");
const ast = parser.parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true, allowUndeclaredExports: true });

const rows = [];
for (const n of ast.program.body) {
  const d = n.type.startsWith("Export") && n.declaration ? n.declaration : n;
  let names = [];
  if (d.type === "FunctionDeclaration" || d.type === "ClassDeclaration") names = d.id ? [d.id.name] : [];
  else if (d.type === "VariableDeclaration") names = d.declarations.map((v) => v.id?.name).filter(Boolean);
  if (!names.length) continue;
  rows.push({ i: rows.length, start: n.start, end: n.end, names, type: d.type });
}
writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), bundle: BUNDLE, rows }));
console.log(`顶层声明 ${rows.length} 个 → ${OUT}`);
for (const probe of ["useChatSessionAdapter", "getNativeWorkbenchOwner", "CANVAS_V3_IMAGE_MAX_BYTES", "failure"]) {
  const r = rows.find((x) => x.names.includes(probe));
  if (!r) { console.log(`  ${probe}: 未找到`); continue; }
  console.log(`  ${probe}: start=${r.start} → ${JSON.stringify(src.slice(r.start, r.start + 50).replace(/\n/g, " "))}`);
}
