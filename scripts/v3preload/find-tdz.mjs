#!/usr/bin/env node
/**
 * 静态找全 canvas-v3 里的 TDZ（第 152 轮）。
 *
 * 判据：顶层 `const/let` 的**求值期**语句（不在函数/箭头函数体里）
 * 引用了在同一文件里**更晚**声明的 `const/let`。
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const parser = (await import("/Users/reputationly/Desktop/code/api/ovaijisuandesign/node_modules/.pnpm/@babel+parser@7.29.9/node_modules/@babel/parser/lib/index.js")).default;
const DIR = "app/renderer/src/canvas-v3";

const files = readdirSync(DIR).filter((f) => /\.(js|jsx)$/.test(f)).map((f) => path.join(DIR, f));
let total = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  let ast;
  try { ast = parser.parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch { console.log(`跳过（解析失败）${f}`); continue; }

  // 顶层 const/let 的声明位置
  const decls = new Map();
  for (const st of ast.program.body) {
    if (st.type === "VariableDeclaration" && (st.kind === "const" || st.kind === "let")) {
      for (const d of st.declarations) {
        if (d.id.type === "Identifier") decls.set(d.id.name, { line: d.loc.start.line, end: st.loc.end.line });
      }
    }
  }

  // 顶层函数的「被调用即求值」闭包：从顶层表达式里被调用的函数开始，递归收集
  const fnByName = new Map();
  for (const st of ast.program.body) {
    if (st.type === "FunctionDeclaration" && st.id) fnByName.set(st.id.name, st);
    if (st.type === "VariableDeclaration")
      for (const d of st.declarations)
        if (d.id.type === "Identifier" && d.init &&
            (d.init.type === "FunctionExpression" || d.init.type === "ArrowFunctionExpression"))
          fnByName.set(d.id.name, d.init);
  }

  // 逐顶层语句：如果是 const/let 声明，检查它的初始化表达式；其它语句也检查（但不含函数声明）
  const issues = [];
  for (const st of ast.program.body) {
    if (st.type === "FunctionDeclaration" || st.type === "ClassDeclaration") continue;
    const startLine = st.loc.start.line;
    // 收集该语句里「不在函数体内」的标识符
    const refs = [];
    (function walk(node, inFn, parentKey, inMember) {
      if (!node || typeof node.type !== "string") return;
      const fn = inFn || node.type === "FunctionDeclaration" || node.type === "FunctionExpression" ||
        node.type === "ArrowFunctionExpression" || node.type === "ClassMethod" || node.type === "ObjectMethod" ||
        node.type === "ObjectProperty" && false;
      if (!fn && node.type === "Identifier") {
        // 排除：非计算属性名、成员访问的 property、标签
        const isPropKey = (parentKey === "key" || parentKey === "value") && inMember === "prop";
        const isMemberProp = inMember === "member";
        if (!isPropKey && !isMemberProp) refs.push({ name: node.name, line: node.loc.start.line });
      }
      for (const k of Object.keys(node)) {
        if (k === "loc" || k === "start" || k === "end") continue;
        const v = node[k];
        let mode = null;
        if (node.type === "MemberExpression" && k === "property") mode = "member";
        if ((node.type === "ObjectProperty" || node.type === "ObjectMethod" || node.type === "ClassProperty") && k === "key") mode = "prop";
        if (node.type === "OptionalMemberExpression" && k === "property") mode = "member";
        if (Array.isArray(v)) v.forEach((c) => walk(c, fn, k, mode));
        else if (v && typeof v.type === "string") walk(v, fn, k, mode);
      }
    })(st, false, null, null);
    // 被本语句调用的顶层函数，其函数体也算「求值期」
    const called = new Set(refs.map((r) => r.name).filter((n) => fnByName.has(n)));
    const seenFn = new Set();
    const queue2 = [...called];
    while (queue2.length) {
      const fnName = queue2.pop();
      if (seenFn.has(fnName)) continue;
      seenFn.add(fnName);
      const fnNode = fnByName.get(fnName);
      const inner = [];
      (function walk2(node, inFn) {
        if (!node || typeof node.type !== "string") return;
        const fn = inFn || /Function|ArrowFunctionExpression|ClassMethod|ObjectMethod/.test(node.type);
        if (!fn && node.type === "Identifier") inner.push({ name: node.name, line: node.loc.start.line });
        for (const k of Object.keys(node)) {
          if (k === "loc" || k === "start" || k === "end") continue;
          const v = node[k];
          if (Array.isArray(v)) v.forEach((c) => walk2(c, fn));
          else if (v && typeof v.type === "string") walk2(v, fn);
        }
      })(fnNode, true);
      for (const r of inner) {
        if (fnByName.has(r.name)) queue2.push(r.name);
        refs.push(r);
      }
    }
    for (const r of refs) {
      const d = decls.get(r.name);
      if (d && d.line > st.loc.start.line) issues.push({ name: r.name, use: r.line, decl: d.line });
    }
  }
  // 去重
  const uniq = [];
  const seen = new Set();
  for (const i of issues) { const k = `${i.name}@${i.use}`; if (!seen.has(k)) { seen.add(k); uniq.push(i); } }
  if (uniq.length) {
    console.log(`\n${path.basename(f)}: ${uniq.length} 处`);
    for (const i of uniq.slice(0, 12)) console.log(`  ${i.name.padEnd(38)} 用 ${i.use} → 声明 ${i.decl}`);
    total += uniq.length;
  }
}
console.log(`\n合计 TDZ 风险: ${total}`);
