// 解析主 bundle，列出每条顶层语句：类型、声明的名字、行号范围。输出 toplevel.json。
import { parse } from "@babel/parser";
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
const src = readFileSync(file, "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });

const names = (node) => {
  switch (node.type) {
    case "FunctionDeclaration":
    case "ClassDeclaration":
      return node.id ? [node.id.name] : [];
    case "VariableDeclaration":
      return node.declarations.flatMap((d) => (d.id.type === "Identifier" ? [d.id.name] : []));
    case "ExportNamedDeclaration":
      return node.declaration ? names(node.declaration) : [];
    default:
      return [];
  }
};

const out = ast.program.body.map((n, i) => ({
  i,
  type: n.type,
  names: names(n),
  start: n.loc.start.line,
  end: n.loc.end.line,
  lines: n.loc.end.line - n.loc.start.line + 1,
  // 第一行的前 100 个字符，便于肉眼看
  head: src.slice(n.start, Math.min(n.end, n.start + 100)).replace(/\s+/g, " "),
}));
writeFileSync(process.argv[3], JSON.stringify(out));
const byType = {};
for (const s of out) byType[s.type] = (byType[s.type] ?? 0) + 1;
console.log("statements", out.length, byType);
