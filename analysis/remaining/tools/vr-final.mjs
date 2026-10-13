// vendor.js 最终清单：合并哈希匹配（decls.json）、CJS 包装比对、同名/邻居归属推断、xyflow 单列、app 代码功能分类
import fs from "node:fs"; import { parse } from "@babel/parser";
const R = "/home/ubuntu/wt-analysis/analysis/remaining/vendor-residual/";
const V = "/home/ubuntu/wt-desource/app/renderer/src/vendor.js";
const code = fs.readFileSync(V, "utf8");
const rows = JSON.parse(fs.readFileSync(R + "decls.json", "utf8"));
const near = new Map(JSON.parse(fs.readFileSync(R + "none-samename.json", "utf8")).map((x) => [x.name, x.sameName]));
const installed = new Set();
for (const e of fs.readdirSync("/home/ubuntu/wt-desource/node_modules/.pnpm")) { const m = /^(@?[^@]+)@([^_]+)/.exec(e); if (m) installed.add(m[1].replace("+", "/") + "@" + m[2]); }
const ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
const declSrc = new Map();
for (const s of ast.program.body) {
  const d = s.type === "ExportNamedDeclaration" && s.declaration ? s.declaration : s;
  if (d.type === "VariableDeclaration") for (const dc of d.declarations) { if (dc.id.type === "Identifier") declSrc.set(dc.id.name, code.slice(dc.start, dc.end)); }
  else if ((d.type === "FunctionDeclaration" || d.type === "ClassDeclaration") && d.id) declSrc.set(d.id.name, code.slice(d.start, d.end));
}
// 非声明语句
const other = { import: 0, export: 0, expr: 0, rest: 0 };
for (const s of ast.program.body) { const b = s.end - s.start;
  if (s.type === "ImportDeclaration") other.import += b; else if (s.type === "ExportNamedDeclaration" && !s.declaration || s.type === "ExportAllDeclaration") other.export += b;
  else if (s.type === "ExpressionStatement") other.expr += b; else if (!/Declaration$/.test(s.type)) other.rest += b; }
// CJS 包装（证据：vr-cjs.mjs 词元相似度，见 cjs-compare.txt）
const CJS = {
  requireJszip_min: ["jszip", "3.10.1", "99.33%（vs jszip@3.10.1 dist/jszip.min.js；源码内含版本串 \"3.10.1\"）"],
  requireExtend: ["extend", "3.0.2", "99.68%"], requireVoidElements: ["void-elements", "3.1.0", "98.36%"],
  "requireCjs$2": ["inline-style-parser", "0.2.4", "93.53%"], "requireCjs$1": ["style-to-object", "1.0.11", "98.22%"],
  requireCjs: ["style-to-js", "1.1.21", "96.60%（cjs/index.js）"], requireUtilities: ["style-to-js", "1.1.21", "99.63%（cjs/utilities.js）"],
  requireReactPropTypesSecret: ["prop-types", "15.8.1", "81.82%（9 词元）"], requireFactoryWithThrowingShims: ["prop-types", "15.8.1", "96.73%"], requirePropTypes: ["prop-types", "15.8.1", "生产分支，34.78%（npm index.js 含开发分支）"],
  requireErrorCorrectLevel: ["qr.js", "0.0.0", "95.24%"], requireMode: ["qr.js", "0.0.0", "96.97%"], require_8BitByte: ["qr.js", "0.0.0", "98.52%"], requireRSBlock: ["qr.js", "0.0.0", "99.81%"],
  requireBitBuffer: ["qr.js", "0.0.0", "99.07%"], requireMath: ["qr.js", "0.0.0", "99.56%"], requirePolynomial: ["qr.js", "0.0.0", "99.32%"], requireUtil: ["qr.js", "0.0.0", "99.87%"], requireQRCode: ["qr.js", "0.0.0", "99.77%"],
  requireLib: ["react-qr-code", "2.0.19~2.0.21", "98.04%（2.1.0 起降到 67%）"], requireQRCodeSvg: ["react-qr-code", "2.0.19~2.0.21", "99.19%"],
};
const cjsOf = new Map();
for (const [fn, v] of Object.entries(CJS)) {
  cjsOf.set(fn, v); const s = declSrc.get(fn) || "";
  const m = /if \((hasRequired[\w$]*)\) return ([\w$]+)/.exec(s); if (m) { cjsOf.set(m[1], v); cjsOf.set(m[2], v); }
}
const HELPER = /^(_mergeNamespaces|commonjsGlobal|getDefaultExportFromCjs\$?\d*|getAugmentedNamespace|__vite_import_meta_env__|__ovVitePreload|requireReact|reactExports|react|hasRequiredReact)$/;
const FALSE_POS = new Set(["unplugin", "vitest"]);
const XY = new Set(["@xyflow/react", "@xyflow/system", "classcat", "zustand"]);
const xyLines = rows.filter((r) => r.pkg === "@xyflow/react" || r.pkg === "@xyflow/system").map((r) => r.line);
const xyFrom = Math.min(...xyLines), xyTo = Math.max(...xyLines);
// 第一步：确定归属
for (const r of rows) {
  r.src = declSrc.get(r.name) || "";
  if (r.pkg && FALSE_POS.has(r.pkg)) { r.falsePositive = r.pkg; r.pkg = null; r.status = "none"; }
  if (cjsOf.has(r.name)) { const [p, v, ev] = cjsOf.get(r.name); r.pkg = p; r.versions = [v]; r.cjs = ev; r.status = installed.has(p + "@" + v) ? "installed-cjs" : "mismatch-cjs"; }
  if (!r.pkg && HELPER.test(r.name)) r.helper = true;
}
// 第二步：无匹配声明的归属推断（同名 + ±40 内有同包已匹配声明；或夹在同包已匹配声明之间 ±5）
const idx = rows.map((r, i) => i);
for (let i = 0; i < rows.length; i++) {
  const r = rows[i]; if (r.pkg || r.helper) continue;
  const sn = near.get(r.name) || [];
  let p = null;
  for (const c of sn) { for (let j = Math.max(0, i - 40); j <= Math.min(rows.length - 1, i + 40); j++) if (rows[j].pkg === c && !rows[j].inferred) { p = c; break; } if (p) break; }
  if (!p) { let L = null, Rr = null;
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) if (rows[j].pkg && !rows[j].inferred) { L = rows[j].pkg; break; }
    for (let j = i + 1; j <= Math.min(rows.length - 1, i + 5); j++) if (rows[j].pkg && !rows[j].inferred) { Rr = rows[j].pkg; break; }
    if (L && L === Rr) p = L; }
  if (!p && r.line >= xyFrom && r.line <= xyTo && (sn.some((c) => XY.has(c)) || /\b(useStore|useStoreApi|ReactFlow|xyflow|react-flow)\b/.test(r.src))) p = "@xyflow/react";
  if (p) { r.pkg = p; r.inferred = true; r.status = "mismatch-inferred"; }
}
// 第三步：app 代码分类（启发式）
const cjk = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;
function category(r) {
  const s = r.src, n = r.name;
  if (r.helper) return "构建器运行时 helper（rollup/vite 互操作、预加载）";
  if (/createFileRoute|createRootRoute|createRoute\(|routeTree|lazyRouteComponent/.test(s)) return "路由";
  if (/["'`]\/api\/|API_PATHS|fetch\(|\bendpoint\b|baseURL|requestJson|\bhttp(Get|Post)\b/.test(s)) return "API 客户端 / 请求";
  if (cjk(s) > 30 || /^(zh|en|ja|ko)[A-Z_]|i18n|Locale|locale|translation|Messages$|RESOURCES/i.test(n) && /[{[]/.test(s.slice(0, 200))) return "i18n 文案 / 资源";
  if (/Icon|Svg|Glyph|Logo/.test(n) || /createLucideIcon|viewBox|\bd: "M[\d.]/.test(s)) return "图标";
  if (/Store$|^use\w*Store|Atom$|Context$/.test(n) || /createStore|useSyncExternalStore|createContext\(|create\(\(set/.test(s)) return "store / context";
  if (/\bjsxs?\(|createElement\(|forwardRef\(|\.memo\(/.test(s)) return "React 组件 / hook";
  if (/^(function|class)\b/.test(s) || /^[\w$]+ = (async )?(\([^)]*\)|[\w$]+) =>|^[\w$]+ = function/.test(s)) return "工具函数 / hook";
  if (/^[\w$]+ = [\w$.]+$/.test(s)) return "导入别名 / 再导出";
  return "常量 / 配置";
}
for (const r of rows) if (!r.pkg) r.category = category(r);
// 汇总
const state = (r) => r.status === "installed-exact" ? "S1" : r.status === "installed-cjs" ? "S1c" : r.pkg ? "S2" : "S3";
const pkgSum = {};
for (const r of rows) { if (!r.pkg) continue; const k = r.pkg; const s = (pkgSum[k] ??= { pkg: k, decls: 0, bytes: 0, S1: [0, 0], S1c: [0, 0], S2: [0, 0], inferred: [0, 0], vers: new Map(), installed: [...installed].filter((x) => x.startsWith(k + "@")).map((x) => x.slice(k.length + 1)) });
  s.decls++; s.bytes += r.bytes; const st = state(r); s[st][0]++; s[st][1] += r.bytes; if (r.inferred) { s.inferred[0]++; s.inferred[1] += r.bytes; }
  if (!r.inferred) for (const v of r.versions || []) s.vers.set(v, (s.vers.get(v) || 0) + 1); }
const pkgOut = Object.values(pkgSum).map((s) => { const exactN = s.decls - s.inferred[0]; const full = [...s.vers].filter(([, n]) => n === exactN).map(([v]) => v);
  return { ...s, vers: Object.fromEntries(s.vers), versionAllDecls: full }; }).sort((a, b) => b.bytes - a.bytes);
const catSum = {}; for (const r of rows) if (!r.pkg) { const c = (catSum[r.category] ??= { decls: 0, bytes: 0, examples: [] }); c.decls++; c.bytes += r.bytes; if (c.examples.length < 12) c.examples.push(`${r.name}@L${r.line}(${r.bytes})`); }
const xy = rows.filter((r) => XY.has(r.pkg) || (r.line >= xyFrom && r.line <= xyTo && r.pkg === "@xyflow/react"));
const xyIn = rows.filter((r) => r.line >= xyFrom && r.line <= xyTo);
const res = { file: { bytes: code.length, declBytes: rows.reduce((a, r) => a + r.bytes, 0), decls: rows.length, other },
  xyflow: { lines: [xyFrom, xyTo], decls: xy.length, bytes: xy.reduce((a, r) => a + r.bytes, 0), byPkg: Object.fromEntries([...XY].map((p) => [p, xy.filter((r) => r.pkg === p).reduce((a, r) => a + r.bytes, 0)])), inferredBytes: xy.filter((r) => r.inferred).reduce((a, r) => a + r.bytes, 0),
    regionAllDeclsBytes: xyIn.reduce((a, r) => a + r.bytes, 0), regionOtherPkgs: Object.fromEntries(Object.entries(xyIn.filter((r) => !XY.has(r.pkg)).reduce((m, r) => (m[r.pkg || "app:" + r.category] = (m[r.pkg || "app:" + r.category] || 0) + r.bytes, m), {}))) },
  packages: pkgOut, categories: catSum };
fs.writeFileSync(R + "final-summary.json", JSON.stringify(res, null, 1));
fs.writeFileSync(R + "decls-final.json", JSON.stringify(rows.map(({ src, ...r }) => ({ ...r, head: src.replace(/\s+/g, " ").slice(0, 120) })), null, 1));
console.log(JSON.stringify(res.file), "\nxyflow", JSON.stringify(res.xyflow));
for (const p of pkgOut) console.log(p.pkg.padEnd(30), p.decls, p.bytes, "S1", p.S1.join("/"), "S1c", p.S1c.join("/"), "S2", p.S2.join("/"), "inf", p.inferred.join("/"), "all:", p.versionAllDecls.slice(-3).join(","), "inst:", p.installed.join(","));
for (const [c, v] of Object.entries(catSum).sort((a, b) => b[1].bytes - a[1].bytes)) console.log(c, v.decls, v.bytes, v.examples.slice(0, 8).join(" "));
