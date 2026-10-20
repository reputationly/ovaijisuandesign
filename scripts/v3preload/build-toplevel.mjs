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

// 第 247 轮（用户方案 A.1）：支持为第二个共享 chunk 建索引。
// use-window-chrome 是主界面的共享 chunk（index.html 有 modulepreload），
// 它有 2,254 个顶层声明，闭包工具原本完全看不见它。
const BUNDLE = process.argv.includes("--chunk")
  ? ".probe/reference/4.0.0/asar/out/renderer/assets/use-window-chrome-DbNyfMCt.js"
  : ".probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js";
const OUT = process.argv.includes("--chunk")
  ? ".probe/refdiff/toplevel-uwc-4.0.0.json"
  : ".probe/refdiff/toplevel-4.0.0.json";
const src = readFileSync(BUNDLE, "utf8");
// **不要用 errorRecovery**：它在恢复区域会产生不可靠的 start/end，
// 之前正是它让 toplevel 偏移整体错位。
let ast;
try {
  ast = parser.parse(src, { sourceType: "module", plugins: ["jsx"], allowUndeclaredExports: true });
} catch (e) {
  console.error("✗ 严格解析失败：", e.message);
  console.error("  错误发生在 offset", e.pos, "，附近文本：");
  console.error("  " + JSON.stringify(src.slice(Math.max(0, e.pos - 80), e.pos + 80)));
  process.exit(1);
}

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
