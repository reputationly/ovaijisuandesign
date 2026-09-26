// 拆分结果按第三方包汇总：vendor 里每个包占多少行、多少条语句，决定逐个换成 npm 包的先后。
//   node --max-old-space-size=16384 scripts/decompile/split-report.mjs [bundle.js] > report.txt
import { parse } from "@babel/parser";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { splitProgram } from "./split.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const B = process.argv[2] ?? path.join(repo, "reference/3.0.16/app/out/renderer/assets/index-C4qF1HE0.js");
const cls = JSON.parse(readFileSync(path.join(repo, ".probe/decompile/classified.json"), "utf8"));
const ast = parse(readFileSync(B, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
const r = splitProgram(ast, cls, { debug: true });
const by = {};
cls.forEach((s, i) => {
  if (r.debug.kind[i] !== "lib") return;
  const k = (s.pkgs ?? ["(unknown)"]).join(" | ");
  by[k] ??= { stmts: 0, lines: 0 };
  by[k].stmts++; by[k].lines += s.lines;
});
const rows = Object.entries(by).sort((a, b) => b[1].lines - a[1].lines);
console.log(`${rows.length} 组（行数 / 语句数 / 包）`, r.stats);
for (const [k, v] of rows) console.log(String(v.lines).padStart(7), String(v.stmts).padStart(5), k.slice(0, 120));
