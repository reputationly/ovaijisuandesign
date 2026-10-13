// 由 final-summary.json / decls-final.json 生成 vendor-residual/TABLES.md
import fs from "node:fs";
const R = "/home/ubuntu/wt-analysis/analysis/remaining/vendor-residual/";
const f = JSON.parse(fs.readFileSync(R + "final-summary.json", "utf8"));
const rows = JSON.parse(fs.readFileSync(R + "decls-final.json", "utf8"));
const XY = new Set(["@xyflow/react", "@xyflow/system", "classcat", "zustand"]);
function verdict(p) {
  const exactN = p.decls - p.inferred[0];
  const inst = p.versionAllDecls.filter((v) => p.installed.includes(v));
  if (p.S1c[0] === p.decls) return ["① 已装、版本一致（CJS 包装，词元相似度判定）", inst.join("、") || p.versionAllDecls.join("、")];
  if (inst.length && p.S2[0] === 0) return ["① 已装、版本一致，可直接换", inst.join("、")];
  if (inst.length && p.S2[0] === p.inferred[0]) return [`①′ 已装版本一致，另有 ${p.inferred[0]} 个声明（${p.inferred[1]} B）对不上`, inst.join("、")];
  return ["② 对不上任何已装版本", (p.versionAllDecls.join("、") || "（各声明分属不同版本）") + (p.installed.length ? `；已装 ${p.installed.join("、")}` : "；未安装")];
}
let t = `# vendor.js 剩余清单（b0e2f29）\n\n文件 ${f.file.bytes} 字节：顶层声明 ${f.file.decls} 个共 ${f.file.declBytes} 字节；import ${f.file.other.import}、export ${f.file.other.export}、表达式语句 ${f.file.other.expr}、其它 ${f.file.other.rest} 字节。\n\n`;
t += "## 按包汇总（不含 xyflow 一族）\n\n| 包 | 状态 | 版本（全部已匹配声明都一致的版本；已装版本） | 声明 | 字节 | 其中形状一致 | 其中 CJS 相似 | 其中仅部分对上 | 其中推断归属（无匹配） |\n|---|---|---|---|---|---|---|---|---|\n";
const pk = f.packages.filter((p) => !XY.has(p.pkg));
for (const p of pk) { const [st, v] = verdict(p); t += `| ${p.pkg} | ${st} | ${v} | ${p.decls} | ${p.bytes} | ${p.S1[0]} / ${p.S1[1]} | ${p.S1c[0]} / ${p.S1c[1]} | ${p.S2[0] - p.inferred[0]} / ${p.S2[1] - p.inferred[1]} | ${p.inferred[0]} / ${p.inferred[1]} |\n`; }
const sumBy = (fn) => { const m = {}; for (const p of pk) { const k = verdict(p)[0].replace(/，另有.*$/, "").replace(/^①′.*/, "①′ 已装版本一致但有声明对不上"); m[k] ??= [0, 0, 0]; m[k][0]++; m[k][1] += p.decls; m[k][2] += p.bytes; } return m; };
t += "\n### 按状态合计（不含 xyflow）\n\n| 状态 | 包数 | 声明 | 字节 |\n|---|---|---|---|\n";
for (const [k, v] of Object.entries(sumBy())) t += `| ${k} | ${v[0]} | ${v[1]} | ${v[2]} |\n`;
const app = rows.filter((r) => !r.pkg);
t += `| ③ 没有匹配，推断是 app 代码 | — | ${app.length} | ${app.reduce((a, r) => a + r.bytes, 0)} |\n`;
t += `\n## xyflow 一族（单列，不分析改动）\n\n行 ${f.xyflow.lines[0]}–${f.xyflow.lines[1]}，${f.xyflow.decls} 个声明，**${f.xyflow.bytes} 字节**：` + Object.entries(f.xyflow.byPkg).map(([p, b]) => `${p} ${b}`).join("、") + `；其中 ${f.xyflow.inferredBytes} 字节是无匹配、按位置/同名归到 xyflow 的（含 17 处 app 改动）。\n`;
t += "\n## ③ 无匹配声明按功能归类（启发式，字节为估算）\n\n| 类别 | 声明 | 字节 | 例子 |\n|---|---|---|---|\n";
for (const [c, v] of Object.entries(f.categories).sort((a, b) => b[1].bytes - a[1].bytes)) t += `| ${c} | ${v.decls} | ${v.bytes} | ${v.examples.slice(0, 8).join(" ")} |\n`;
fs.writeFileSync(R + "TABLES.md", t); console.log(t);
