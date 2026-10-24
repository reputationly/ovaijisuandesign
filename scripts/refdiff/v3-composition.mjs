// 用法：node --max-old-space-size=12288 scripts/refdiff/v3-composition.mjs（仓库根目录运行；结果写 /tmp/v3comp/rows.json）
// v3 运行时代码构成：按顶层语句把每个 chunk 分成「第三方库 / 与主界面共享 / v3 独有」。
// 指纹 = 字符串字面量（>=4 字符）+ 非计算属性名/成员名（压缩不改属性名），按语句取集合。
import { createRequire } from "node:module";
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
const require = createRequire(path.resolve("scripts/decompile/package.json"));
const acorn = require("acorn");

const V3 = ".probe/reference/4.0.3/asar/out/renderer/v3/assets";
const MAIN = ".probe/reference/4.0.3/asar/out/renderer/assets";

const STOP = new Set(["length", "prototype", "default", "value", "call", "apply", "push", "then", "type", "props", "children", "className", "key", "ref", "current", "jsx", "jsxs", "toString", "map", "filter", "forEach", "get", "set", "has", "slice", "concat", "indexOf", "join", "keys", "name", "data", "result", "error", "message", "replace", "split", "trim", "test", "exec", "match", "some", "every", "find", "reduce", "assign", "create", "freeze", "defineProperty", "useState", "useEffect", "useMemo", "useCallback", "useRef", "createElement", "Fragment"]);

function tokens(node) {
  const out = new Set();
  const walk = (n) => {
    if (!n || typeof n.type !== "string") return;
    switch (n.type) {
      case "Literal":
        if (typeof n.value === "string" && n.value.length >= 4) out.add("s:" + n.value.slice(0, 120));
        break;
      case "TemplateElement":
        if (n.value.cooked && n.value.cooked.length >= 4) out.add("s:" + n.value.cooked.slice(0, 120));
        break;
      case "MemberExpression":
        if (!n.computed && n.property.type === "Identifier" && !STOP.has(n.property.name) && n.property.name.length >= 3) out.add("p:" + n.property.name);
        break;
      case "Property":
      case "MethodDefinition":
      case "PropertyDefinition":
        if (!n.computed && n.key.type === "Identifier" && !STOP.has(n.key.name) && n.key.name.length >= 3) out.add("p:" + n.key.name);
        break;
    }
    for (const k in n) {
      if (k === "type" || k === "start" || k === "end") continue;
      const v = n[k];
      if (Array.isArray(v)) for (const x of v) walk(x);
      else if (v && typeof v === "object" && typeof v.type === "string") walk(v);
    }
  };
  walk(node);
  return out;
}

function statements(file) {
  const src = readFileSync(file, "utf8");
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module", allowHashBang: true });
  } catch (e) {
    return { src, stmts: null, err: String(e).slice(0, 120) };
  }
  // 压缩器会把相邻的 var 合成一条、把语句并成逗号表达式 —— 拆回到单个声明/表达式再比
  const units = [];
  for (const s of ast.body) {
    if (s.type === "VariableDeclaration") units.push(...s.declarations);
    else if (s.type === "ExportNamedDeclaration" && s.declaration?.type === "VariableDeclaration") units.push(...s.declaration.declarations);
    else if (s.type === "ExpressionStatement" && s.expression.type === "SequenceExpression") units.push(...s.expression.expressions);
    else units.push(s);
  }
  return { src, stmts: units.map((s) => ({ bytes: s.end - s.start, tok: tokens(s) })) };
}

// ---- 主界面参照索引 ----
const mainStmts = [];
for (const f of readdirSync(MAIN)) {
  if (!f.endsWith(".js")) continue;
  const { stmts } = statements(path.join(MAIN, f));
  if (stmts) for (const s of stmts) if (s.tok.size >= 3) mainStmts.push(s.tok);
}
const df = new Map();
const inv = new Map();
mainStmts.forEach((t, i) => {
  for (const x of t) {
    df.set(x, (df.get(x) ?? 0) + 1);
    if (!inv.has(x)) inv.set(x, []);
    inv.get(x).push(i);
  }
});
const mainTok = new Set(df.keys());
console.error(`main statements indexed: ${mainStmts.length}, tokens ${mainTok.size}`);

// ---- npm 依赖的字面量（判第三方用） ----
const npmTok = new Set();
const renderDeps = Object.keys(JSON.parse(readFileSync("app/renderer/package.json", "utf8")).dependencies);
const pnpm = "node_modules/.pnpm";
const pkgDirs = [];
for (const d of readdirSync(pnpm)) {
  const nm = path.join(pnpm, d, "node_modules");
  if (!existsSync(nm)) continue;
  for (const e of readdirSync(nm)) {
    if (e.startsWith("@")) for (const s of readdirSync(path.join(nm, e))) pkgDirs.push(path.join(nm, e, s));
    else pkgDirs.push(path.join(nm, e));
  }
}
const seenPkg = new Set();
let npmFiles = 0;
const scanJs = (dir, depth = 0) => {
  if (depth > 4) return;
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) scanJs(p, depth + 1);
    else if (/\.(m?js|cjs)$/.test(e.name) && !/\.min\.|\.d\.|test|spec/.test(e.name)) {
      let s;
      try { if (statSync(p).size > 6e6) continue; s = readFileSync(p, "utf8"); } catch { continue; }
      npmFiles++;
      for (const m of s.matchAll(/"((?:[^"\\\n]|\\.){4,120})"|'((?:[^'\\\n]|\\.){4,120})'/g)) npmTok.add("s:" + (m[1] ?? m[2]));
      for (const m of s.matchAll(/\.([A-Za-z_$][\w$]{2,})\b/g)) if (!STOP.has(m[1])) npmTok.add("p:" + m[1]);
      for (const m of s.matchAll(/[{,]\s*([A-Za-z_$][\w$]{2,})\s*:/g)) if (!STOP.has(m[1])) npmTok.add("p:" + m[1]);
    }
  }
};
for (const p of pkgDirs) {
  const real = p;
  if (seenPkg.has(real)) continue;
  seenPkg.add(real);
  const base = path.basename(p);
  if (base === "electron" || base === "typescript" || base.startsWith("@types")) continue;
  scanJs(p);
}
console.error(`npm files scanned: ${npmFiles}, tokens ${npmTok.size}`);

// 我们源码里的字面量（判「我们已有」）
const oursTok = new Set();
const walkOurs = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walkOurs(p);
    else if (/\.(js|jsx)$/.test(e.name)) {
      const s = readFileSync(p, "utf8");
      for (const m of s.matchAll(/"((?:[^"\\\n]|\\.){4,120})"|'((?:[^'\\\n]|\\.){4,120})'/g)) oursTok.add("s:" + (m[1] ?? m[2]));
      for (const m of s.matchAll(/\.([A-Za-z_$][\w$]{2,})\b/g)) oursTok.add("p:" + m[1]);
    }
  }
};
walkOurs("app/renderer/src");

const frac = (t, set) => { let n = 0; for (const x of t) if (set.has(x)) n++; return t.size ? n / t.size : 0; };
function bestMain(t) {
  // 只用稀有 token 召回候选
  const cand = new Map();
  for (const x of t) {
    const d = df.get(x);
    if (!d || d > 40) continue;
    for (const i of inv.get(x)) cand.set(i, (cand.get(i) ?? 0) + 1);
  }
  let best = 0;
  for (const [i, inter] of cand) {
    const u = t.size + mainStmts[i].size - inter;
    const j = inter / u;
    if (j > best) best = j;
  }
  return best;
}

const rows = [];
const tot = { lib: 0, shared: 0, sharedOurs: 0, loose: 0, v3only: 0, tiny: 0, all: 0 };
for (const f of readdirSync(V3)) {
  if (!f.endsWith(".js")) continue;
  const { src, stmts, err } = statements(path.join(V3, f));
  const r = { f, kb: Math.round(src.length / 1024), lib: 0, shared: 0, sharedOurs: 0, loose: 0, v3only: 0, tiny: 0 };
  if (!stmts) { r.err = err; r.lib = src.length; rows.push(r); continue; }
  for (const s of stmts) {
    const b = s.bytes;
    if (s.tok.size < 3) { r.tiny += b; continue; }
    const strs = new Set([...s.tok].filter((x) => x.startsWith("s:")));
    const basis = strs.size >= 3 ? strs : s.tok;
    const inNpm = frac(basis, npmTok);
    const j = bestMain(s.tok);
    const inMain = frac(basis, mainTok);
    if (inNpm >= 0.8) r.lib += b;
    else if (j >= 0.5) { r.shared += b; if (frac(basis, oursTok) >= 0.8) r.sharedOurs += b; }
    else if (inMain >= 0.8) r.loose += b;
    else r.v3only += b;
  }
  rows.push(r);
}
for (const r of rows) for (const k of ["lib", "shared", "sharedOurs", "loose", "v3only", "tiny"]) tot[k] += r[k] ?? 0;
tot.all = tot.lib + tot.shared + tot.loose + tot.v3only + tot.tiny;
const kb = (x) => Math.round(x / 1024);
rows.sort((a, b) => b.kb - a.kb);
const app = rows.filter((r) => (r.kb >= 25 && (r.lib + r.shared + r.loose + r.v3only) > 20000) || r.v3only > 20000);
console.log("chunk | KB | lib | shared(我们已有) | loose | v3-only | tiny");
for (const r of app) console.log(`${r.f} | ${r.kb} | ${kb(r.lib)} | ${kb(r.shared)} (${kb(r.sharedOurs)}) | ${kb(r.loose)} | ${kb(r.v3only)} | ${kb(r.tiny)}${r.err ? " | parse err " + r.err : ""}`);
console.log(`TOTAL | ${kb(tot.all)} | ${kb(tot.lib)} | ${kb(tot.shared)} (${kb(tot.sharedOurs)}) | ${kb(tot.loose)} | ${kb(tot.v3only)} | ${kb(tot.tiny)}`);
mkdirSync("/tmp/v3comp", { recursive: true });
writeFileSync("/tmp/v3comp/rows.json", JSON.stringify(rows, null, 1));
// 真正只在 v3 里出现的字符串（主界面参照、npm、我们源码都没有）
const novel = new Map();
for (const f of readdirSync(V3)) {
  if (!f.endsWith(".js")) continue;
  const { stmts } = statements(path.join(V3, f));
  if (!stmts) continue;
  for (const s of stmts) for (const x of s.tok) if (x.startsWith("s:") && !mainTok.has(x) && !npmTok.has(x) && !oursTok.has(x) && x.length > 8) novel.set(x, (novel.get(x) ?? "") || f);
}
const byFile = {};
for (const [x, f] of novel) (byFile[f] ??= []).push(x.slice(2));
for (const [f, xs] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length).slice(0, 8)) console.log("NOVEL", f, xs.length, JSON.stringify(xs.slice(0, 25)).slice(0, 900));

