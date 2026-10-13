// 闭包外（vendor 内其它库/业务 + 其它文件）对 base-ui 闭包的引用；以及 npm 外部依赖的使用方
const fs = require("fs"), path = require("path");
const T = path.join(process.env.HOME, "baseui-hls-analysis/tools/node_modules/");
const { parse } = require(T + "@babel/parser");
const SRC = path.join(process.env.HOME, "ov-desource/app/renderer/src/vendor.js");
const closure = JSON.parse(fs.readFileSync(process.argv[2]));
const inC = new Set(closure.filter((s) => s.file === "vendor.js").map((s) => s.line));
const cNames = new Set(closure.filter((s) => s.file === "vendor.js").flatMap((s) => s.rawNames));
const ast = parse(fs.readFileSync(SRC, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
const ids = (n, out) => { if (!n || typeof n !== "object") return; if (Array.isArray(n)) { for (const x of n) ids(x, out); return; } if (n.type === "Identifier" || n.type === "JSXIdentifier") out.add(n.name); for (const k in n) if (k !== "loc" && k !== "extra" && !k.endsWith("Comments")) ids(n[k], out); };
const npmLocal = new Map();
for (const st of ast.program.body) if (st.type === "ImportDeclaration" && /^(@floating-ui|tabbable|reselect|use-sync-external-store)/.test(st.source.value)) for (const sp of st.specifiers) npmLocal.set(sp.local.name, st.source.value);
const outside = new Map(), npmUse = new Map();
for (const st of ast.program.body) {
  if (st.type === "ImportDeclaration" || st.type === "ExportNamedDeclaration" && !st.declaration) continue;
  const line = st.loc.start.line; const s = new Set(); ids(st, s);
  const self = inC.has(line);
  for (const n of s) {
    if (npmLocal.has(n)) { const k = npmLocal.get(n); if (!npmUse.has(k)) npmUse.set(k, { inC: new Set(), out: new Map() }); const u = npmUse.get(k); if (self) u.inC.add(n); else u.out.set(line, (u.out.get(line) || []).concat(n)); }
    if (!self && cNames.has(n)) { if (!outside.has(n)) outside.set(n, []); outside.get(n).push(line); }
  }
}
console.log("== vendor.js 内闭包外声明引用的闭包名:", outside.size);
for (const [n, ls] of [...outside].sort((a, b) => b[1].length - a[1].length)) console.log(" ", n, ls.length, "lines", ls.slice(0, 5).join(","));
console.log("== npm 外部依赖：闭包内使用 / 闭包外使用");
for (const [k, u] of npmUse) console.log(" ", k, "in-closure:", [...u.inC].join(","), "| outside:", [...u.out].slice(0, 6).map(([l, n]) => l + ":" + n.join("+")).join(" "));
