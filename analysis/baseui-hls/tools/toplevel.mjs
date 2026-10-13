// lists vendor.js top-level statements: index, startLine, endLine, declared names
import { parse } from "@babel/parser";
import { readFileSync, writeFileSync } from "node:fs";
const file = process.argv[2], out = process.argv[3];
const src = readFileSync(file, "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
const names = (n) => {
  if (n.type === "VariableDeclaration") return n.declarations.flatMap((d) => d.id.type === "Identifier" ? [d.id.name] : ["<pattern>"]);
  if (/Declaration$/.test(n.type) && n.id) return [n.id.name];
  if (n.type === "ExportNamedDeclaration" && n.declaration) return names(n.declaration);
  return [];
};
const rows = ast.program.body.map((n, i) => ({ i, type: n.type, s: n.loc.start.line, e: n.loc.end.line, start: n.start, end: n.end, names: names(n) }));
writeFileSync(out, JSON.stringify(rows));
console.log(rows.length);
