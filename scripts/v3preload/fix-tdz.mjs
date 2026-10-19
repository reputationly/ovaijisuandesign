#!/usr/bin/env node
/** 按 find-tdz 的结果，把「被更早引用的顶层 const/let」上移到最早引用之前。 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const parser = (await import("/Users/reputationly/Desktop/code/api/ovaijisuandesign/node_modules/.pnpm/@babel+parser@7.29.9/node_modules/@babel/parser/lib/index.js")).default;
const DIR = "app/renderer/src/canvas-v3";
const APPLY = process.argv.includes("--apply");

function analyze(file) {
  const src = readFileSync(file, "utf8");
  const ast = parser.parse(src, { sourceType: "module", plugins: ["jsx"] });
  const decls = new Map();
  for (const st of ast.program.body) {
    if (st.type === "VariableDeclaration" && (st.kind === "const" || st.kind === "let")) {
      for (const d of st.declarations) if (d.id.type === "Identifier")
        decls.set(d.id.name, { start: st.start, end: st.end, line: st.loc.start.line });
    }
  }
  // 顶层函数表 + 通用标识符收集（第 153 轮：覆盖跨语句间接引用）
  const fnByName = new Map();
  for (const st of ast.program.body) {
    if (st.type === "FunctionDeclaration" && st.id) fnByName.set(st.id.name, st);
    if (st.type === "VariableDeclaration")
      for (const d of st.declarations)
        if (d.id.type === "Identifier" && d.init && /Function/.test(d.init.type)) fnByName.set(d.id.name, d.init);
  }
  const collectIds = (node) => {
    const acc = [];
    (function w(n, mode) {
      if (!n || typeof n.type !== "string") return;
      if (n.type === "Identifier" && mode !== "member" && mode !== "prop" && mode !== "declid")
        acc.push({ name: n.name, start: n.start, line: n.loc.start.line });
      for (const k of Object.keys(n)) {
        if (k === "loc" || k === "start" || k === "end") continue;
        let m = null;
        if ((n.type === "MemberExpression" || n.type === "OptionalMemberExpression") && k === "property") m = "member";
        if (/ObjectProperty|ObjectMethod|ClassProperty|Property/.test(n.type) && k === "key") m = "prop";
        if (n.type === "VariableDeclarator" && k === "id") m = "declid";
        const v = n[k];
        if (Array.isArray(v)) v.forEach((c) => w(c, m));
        else if (v && typeof v.type === "string") w(v, m);
      }
    })(node, null);
    return acc;
  };

  const issues = [];
  for (const st of ast.program.body) {
    if (st.type === "FunctionDeclaration" || st.type === "ClassDeclaration") continue;
    const refs = [];
    (function walk(node, mode, lazy) {
      if (!node || typeof node.type !== "string") return;
      let nowLazy = lazy;
      if (node.type === "CallExpression" && node.callee?.type === "Identifier" &&
          ["useEffect","useLayoutEffect","useMemo","useCallback","useInsertionEffect"].includes(node.callee.name)) nowLazy = true;
      if (node.type === "ObjectProperty" || node.type === "JSXAttribute") {
        const k = node.key?.name ?? node.name?.name;
        if (typeof k === "string" && k.startsWith("on")) nowLazy = true;
      }
      if (!nowLazy && node.type === "Identifier" && mode !== "member" && mode !== "prop" && mode !== "declid")
        refs.push({ name: node.name, pos: node.start, line: node.loc.start.line });
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
    // 跨语句：本语句引用的顶层函数，其体内标识符也算求值期
    const fnQueue = [...new Set(refs.map((r) => r.name).filter((n) => fnByName.has(n)))];
    const seenFn = new Set();
    while (fnQueue.length) {
      const fname = fnQueue.pop();
      if (seenFn.has(fname)) continue;
      seenFn.add(fname);
      for (const r of collectIds(fnByName.get(fname))) {
        refs.push(r);
        if (fnByName.has(r.name)) fnQueue.push(r.name);
      }
    }
    for (const r of refs) {
      const d = decls.get(r.name);
      if (d && d.start > st.start) issues.push({ name: r.name, usePos: st.start, declStart: d.start, declEnd: d.end, use: st.loc.start.line, decl: d.line });
    }
  }
  // 每个名字只取最早的一次
  const first = new Map();
  for (const i of issues) if (!first.has(i.name) || i.usePos < first.get(i.name).usePos) first.set(i.name, i);
  const stmts = ast.program.body.map((s) => ({ start: s.start, end: s.end }));
  return { src, stmts, first: [...first.values()].sort((a, b) => a.usePos - b.usePos) };
}

let totalMoved = 0;
for (const f of readdirSync(DIR).filter((x) => /\.(js|jsx)$/.test(x)).map((x) => path.join(DIR, x))) {
  let moved = 0;
  for (let pass = 0; pass < 80; pass++) {
    let a;
    try { a = analyze(f); } catch { break; }
    if (!a.first.length) break;
    const it = a.first[0];
    const src0 = a.src;
    const block = src0.slice(it.declStart, it.declEnd + 1);
    // 目标：最早使用所在行的行首（在**原始**坐标里算）
    // 插入点 = 包含这次使用的**顶层语句**的起点（不能在语句中间插）
    const owner = a.stmts.find((s) => it.usePos >= s.start && it.usePos < s.end) ?? { start: it.usePos };
    const at0 = owner.start;
    let src;
    if (at0 <= it.declStart) {
      // 先插入，再删除（删除点要后移 block 长度 + 注释行）
      const ins = `// [tdz] ${it.name} 上移（原第 ${it.decl} 行，被第 ${it.use} 行引用）\n` + block + "\n";
      src = src0.slice(0, at0) + ins + src0.slice(at0);
      const ds = it.declStart + ins.length, de = it.declEnd + 1 + ins.length;
      src = src.slice(0, ds) + src.slice(de);
    } else {
      // 先删除，再按偏移插入
      src = src0.slice(0, it.declStart) + src0.slice(it.declEnd + 1);
      const ins = `// [tdz] ${it.name} 上移（原第 ${it.decl} 行，被第 ${it.use} 行引用）\n` + block + "\n";
      const at = at0 - (it.declEnd + 1 - it.declStart);
      src = src.slice(0, at) + ins + src.slice(at);
    }
    if (APPLY) { writeFileSync(f, src, "utf8"); moved++; totalMoved++; }
    else { moved++; break; }
  }
  if (moved) console.log(`${path.basename(f)}: ${APPLY ? "移动" : "待移动"} ${moved} 次`);
}
console.log(APPLY ? `共移动 ${totalMoved}` : "（预览模式，加 --apply 执行）");
