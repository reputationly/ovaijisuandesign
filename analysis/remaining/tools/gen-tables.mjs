// 由配对 JSON 生成逐声明 Markdown 表
import fs from "node:fs";
const R = "/home/ubuntu/wt-analysis/analysis/remaining/";
const J = (f) => JSON.parse(fs.readFileSync(R + f, "utf8"));
const V = { exact: "一致", diff: "有差异", "ext-same": "外部引用相同", "src-inline/npm-ext": "src 内联 / npm 外部导入" };
const BUILD_EQ = {
  "chat/streamdown.jsx#unicodeLetterPattern": "构建等价：`/\\p{L}/u` 被降级成 `new RegExp(\"\\\\p{L}\", \"u\")`",
  "chat/streamdown.jsx#MermaidRenderer": "构建等价：`import(\"./mermaid-GHXKKRXX.js\")` 因 chunk 合并被内联成 `Promise.resolve().then(() => 模块命名空间)`",
  "chat/st.jsx#LazyHighlightedCodeBlockBody": "构建等价：`import(\"./highlighted-body-OFNGDK62.js\")` 只是改了文件名并包了一层 IIFE",
};
function table(pairs, title) {
  const rows = pairs.filter((p) => !/^(global|ext):/.test(p.src));
  const by = {}; for (const p of rows) (by[p.src.split("#")[0]] ??= []).push(p);
  let s = `## ${title}\n\n`;
  for (const [f, l] of Object.entries(by)) {
    s += `### ${f}（${l.length} 条）\n\n| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |\n|---|---|---|---|---|---|\n`;
    for (const p of l.sort((a, b) => (a.srcLine || 0) - (b.srcLine || 0))) {
      const note = BUILD_EQ[p.src] || V[p.verdict] || p.verdict;
      s += `| \`${p.src.split("#")[1]}\` | ${p.srcLine ?? ""} | ${p.bytes ?? ""} | \`${p.npm}\` | ${p.npmLine ?? ""} | ${note} |\n`;
    }
    s += "\n";
  }
  return s;
}
const r130 = J("s2/remend-1.3.0.json"), sd = J("s2/streamdown-2.5.0.json");
fs.writeFileSync(R + "s2/DECLARATIONS.md", "# s2.js 闭包逐声明配对（跨模块 helper 映射后）\n\n由 `tools/t1-s2.mjs` + `tools/gen-tables.mjs` 生成。\n\n" + table(r130.pairs, "remend 闭包 ↔ remend@1.3.0/dist/index.js") + table(sd.pairs, "createAnimatePlugin 闭包 ↔ streamdown@2.5.0/dist/chunk-BO2N2NFS.js"));
const s25 = J("streamdown/streamdown-2.5.0.json");
fs.writeFileSync(R + "streamdown/DECLARATIONS.md", "# chat/streamdown.jsx 闭包逐声明配对 ↔ streamdown@2.5.0\n\n由 `tools/t2-streamdown.mjs` + `tools/gen-tables.mjs` 生成。种子：`chat/streamdown.jsx#Streamdown` ↔ `dist/index.js` 导出 `Streamdown`，沿引用闭包传播配对。\n\n" + table(s25.pairs, "配对结果") + `## npm 侧未配对\n\n${s25.npmUnpaired.map((x) => `- \`${x.npm}\`（${x.bytes} 字节）`).join("\n")}\n`);
// 任务 3
const acc = J("scan/matches-accepted.json");
const MANUAL = { hono: "假阳性：通用 Error 子类结构", effect: "假阳性：通用字符串格式化箭头函数", "@xyflow/react": "假阳性：通用 zustand/context hook 结构（且 xyflow 不在本次范围）" };
let t = "# 任务 3：全量扫描命中表\n\n由 `tools/t3-index.mjs`（src/npm 两侧形状哈希）+ `tools/t3-match.mjs` 生成，人工复核列见“复核”。完整机器结果：`matches-accepted.json`（接受）、`matches-all.json`（含因短/通用被拒的）。\n\n| 文件 | 声明 | 行 | 字节 | 匹配包@版本 | 是否一致 | 复核 |\n|---|---|---|---|---|---|---|\n";
const pdfRows = acc.filter((r) => r.file.startsWith("pdf.worker"));
t += `| pdf.worker.min-yatZIOMy.mjs | （${pdfRows.length} 条声明，逐条略，见 matches-accepted.json） | | ${pdfRows.reduce((a, r) => a + r.bytes, 0)} | pdfjs-dist@4.10.38 | 一致 | 整文件与 pdfjs-dist@4.10.38 build/pdf.worker.min.mjs 字节一致（cmp 相同）；pdf-parse 命中是它内置的同源 pdf.js，忽略 |\n`;
for (const r of acc) {
  if (r.file.startsWith("pdf.worker")) continue;
  const pk = Object.entries(r.packages).map(([p, v]) => `${p}@${v.join("/")}`).join("、");
  const pkeys = Object.keys(r.packages);
  const man = pkeys.map((p) => MANUAL[p]).find(Boolean) || (r.file.startsWith("pdf.worker") ? "整文件与 pdfjs-dist@4.10.38 build/pdf.worker.min.mjs 字节一致" : "真命中");
  t += `| ${r.file} | \`${r.decl}\` | ${r.line} | ${r.bytes} | ${pk} | ${r.exact ? "一致（形状哈希相同）" : "近似（仅字面量不同）"} | ${man} |\n`;
}
const sumP = J("scan/summary-by-package.json");
t += "\n## 按包汇总（机器接受数，未扣除假阳性）\n\n| 包 | 声明数 | 形状一致 | 字节 | 文件数 | 命中版本 |\n|---|---|---|---|---|---|\n";
for (const x of sumP) t += `| ${x.pkg} | ${x.decls} | ${x.exact} | ${x.bytes} | ${x.files.length} | ${x.versions.join("、")} |\n`;
fs.writeFileSync(R + "scan/TABLE.md", t);
console.log("ok", acc.length);
