// 从任意 chunk 按行区间取回声明（按全局声明边界切）
import { readFileSync, writeFileSync } from "node:fs";
const [,, chunkPath, from, to, outPath, title] = process.argv;
const lines = readFileSync(chunkPath, "utf8").split("\n");
const DECL = /^(?:export\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/;
const all = [];
for (let i = 0; i < lines.length; i++) { const m = DECL.exec(lines[i]); if (m) all.push({ i, name: m[1] }); }
const sel = all.filter((d) => d.i >= Number(from) - 1 && d.i <= Number(to));
if (!sel.length) { console.error("区间内没有声明"); process.exit(1); }
const pieces = [];
for (const d of sel) {
  const g = all.findIndex((x) => x.i === d.i);
  const b = g + 1 < all.length ? all[g + 1].i - 1 : lines.length - 1;
  let body = lines.slice(d.i, b + 1).join("\n").trimEnd();
  if (!body.trim()) continue;
  body = body.replace(/^(function|const|let|class)\s/, "export $1 ");
  pieces.push({ name: d.name, body });
}
const header = `/**\n * ${title}（第 224 轮从 ${chunkPath.split("/").pop()} 取回）。\n *\n * 参考：${from}–${to}，共 ${pieces.length} 个声明。\n */\n\n`;
writeFileSync(outPath, header + pieces.map((p) => p.body).join("\n\n") + "\n", "utf8");
console.log(`${pieces.length} 段 → ${outPath}（${(header + pieces.map((p) => p.body).join("\n\n")).split("\n").length} 行）`);
console.log("声明:", pieces.map((p) => p.name).join(", "));
