#!/usr/bin/env node
/**
 * 第 153 轮：把 TDZ 判据放宽到「顶层语句子树里的任何标识符」。
 *
 * 只排除三类真正惰性的位置：
 *   1. React 副作用/记忆化回调（useEffect / useLayoutEffect / useMemo / useCallback）
 *   2. 事件处理器属性（onClick / onChange / …）
 *   3. 属性名与成员访问
 * 其余一律视为「求值期可能被读到」—— 多报无妨，上移声明是无害的。
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const parser = (await import("/Users/reputationly/Desktop/code/api/ovaijisuandesign/node_modules/.pnpm/@babel+parser@7.29.9/node_modules/@babel/parser/lib/index.js")).default;
const DIR = "app/renderer/src/canvas-v3";
const LAZY_CALLS = new Set(["useEffect", "useLayoutEffect", "useMemo", "useCallback", "useInsertionEffect"]);

let total = 0;
for (const f of readdirSync(DIR).filter((x) => /\.(js|jsx)$/.test(x)).map((x) => path.join(DIR, x))) {
  const src = readFileSync(f, "utf8");
  let ast;
  try { ast = parser.parse(src, { sourceType: "module", plugins: ["jsx"] }); } catch { console.log(`跳过 ${f}`); continue; }

  const decls = new Map();
  for (const st of ast.program.body)
    if (st.type === "VariableDeclaration" && (st.kind === "const" || st.kind === "let"))
      for (const d of st.declarations) if (d.id.type === "Identifier") decls.set(d.id.name, d.loc.start.line);

  const out = [];
  for (const st of ast.program.body) {
    if (st.type === "FunctionDeclaration" || st.type === "ClassDeclaration") continue;
    const refs = [];
    (function walk(node, mode, lazy) {
      if (!node || typeof node.type !== "string") return;
      // 惰性判定
      let nowLazy = lazy;
      if (node.type === "CallExpression" && node.callee?.type === "Identifier" && LAZY_CALLS.has(node.callee.name)) nowLazy = true;
      if ((node.type === "ObjectProperty" || node.type === "JSXAttribute")) {
        const k = node.key?.name ?? node.name?.name;
        if (typeof k === "string" && k.startsWith("on")) nowLazy = true;
      }
      if (!nowLazy && node.type === "Identifier" && mode !== "member" && mode !== "prop" && mode !== "declid")
        refs.push({ name: node.name, line: node.loc.start.line });
      for (const k of Object.keys(node)) {
        if (k === "loc" || k === "start" || k === "end") continue;
        let m = null;
        if ((node.type === "MemberExpression" || node.type === "OptionalMemberExpression") && k === "property") m = "member";
        if (/ObjectProperty|ObjectMethod|ClassProperty|Property/.test(node.type) && k === "key") m = "prop";
        if (node.type === "VariableDeclarator" && k === "id") m = "declid";
        const v = node[k];
        if (Array.isArray(v)) v.forEach((c) => walk(c, m, nowLazy));
        else if (v && typeof v.type === "string") walk(v, m, nowLazy);
      }
    })(st, null, false);

    for (const r of refs) {
      const dl = decls.get(r.name);
      if (dl && dl > st.loc.start.line) out.push({ name: r.name, use: r.line, decl: dl, stmtStart: st.loc.start.line });
    }
  }
  const seen = new Set(); const uniq = [];
  for (const o of out) { const k = `${o.name}@${o.use}`; if (!seen.has(k)) { seen.add(k); uniq.push(o); } }
  if (uniq.length) {
    console.log(`\n${path.basename(f)}: ${uniq.length} 处`);
    for (const o of uniq.slice(0, 10)) console.log(`  ${o.name.padEnd(38)} 用 ${o.use} → 声明 ${o.decl}（所在顶层语句 ${o.stmtStart}）`);
    total += uniq.length;
  }
}
console.log(`\n合计 TDZ 风险: ${total}`);
