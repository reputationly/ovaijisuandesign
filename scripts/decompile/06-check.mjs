// 一致性检查：第三方语句不应引用官方语句定义的顶层名字。列出违例（按第三方语句）。
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { readFileSync, writeFileSync } from "node:fs";

const traverse = _traverse.default;
const kind = JSON.parse(readFileSync(new URL("./out/kinds.json", import.meta.url), "utf8"));
const cls = JSON.parse(readFileSync(new URL("./classified.json", import.meta.url), "utf8"));
const src = readFileSync(process.argv[2], "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
const body = ast.program.body;
const stmtIndex = new Map(body.map((n, i) => [n, i]));
const topOf = (p) => {
  let cur = p;
  while (cur && !(cur.parentPath && cur.parentPath.isProgram())) cur = cur.parentPath;
  return cur ? stmtIndex.get(cur.node) : undefined;
};
const bad = new Map(); // lib stmt -> Set(app names)
const referencedApp = new Set(); // 被第三方引用的官方语句下标
traverse(ast, {
  ReferencedIdentifier(p) {
    const b = p.scope.getBinding(p.node.name);
    if (!b || b.scope.block.type !== "Program") return;
    const def = topOf(b.path);
    const use = topOf(p);
    if (def === undefined || use === undefined || kind[use] !== "lib" || kind[def] !== "app") return;
    (bad.get(use) ?? bad.set(use, new Set()).get(use)).add(p.node.name);
    referencedApp.add(def);
  },
});
const rows = [...bad].map(([i, names]) => ({ i, line: cls[i].start, stmt: cls[i].names[0] ?? cls[i].head.slice(0, 40), pkgs: cls[i].pkgs, uses: [...names].slice(0, 6) }));
writeFileSync(new URL("./out/lib-uses-app.json", import.meta.url), JSON.stringify(rows, null, 1));
// FIX=1：被第三方引用的官方语句改判为第三方（第三方库不可能依赖官方代码），写回 classified.json
if (process.env.FIX) {
  let pulled = 0;
  for (const i of referencedApp) {
    if (cls[i].marker) continue;
    pulled++;
    cls[i].kind = "lib";
    cls[i].pulled = true;
  }
  writeFileSync(new URL("./classified.json", import.meta.url), JSON.stringify(cls));
  console.log("pulled into lib:", pulled);
}
if (!process.env.FIX) {
  for (const r of rows.slice(0, 25)) console.log(String(r.line).padStart(6), r.stmt.padEnd(30), (r.pkgs ?? []).join(","), "->", r.uses.join(","));
  console.log("lib statements referencing app names:", rows.length);
}
