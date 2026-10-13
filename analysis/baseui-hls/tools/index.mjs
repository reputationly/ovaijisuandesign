// 为某个包的每个版本建声明索引（缓存到 ../index/<pkg>@<v>.json）
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { declarations } from "./canon.mjs";
import { moduleFiles } from "./pkgfiles.mjs";
const ROOT = path.resolve(import.meta.dirname, "..");
const PK = path.join(ROOT, "pkgs"), IX = path.join(ROOT, "index");
mkdirSync(IX, { recursive: true });
// import * as X from "./mod" 时，读出 mod 的 export { a as b } 映射 b→a
const resolveFile = (from, spec) => {
  const p = path.resolve(path.dirname(from), spec);
  for (const c of [p, p + ".js", p + ".mjs", p + ".jsx", path.join(p, "index.js")]) if (existsSync(c) && !statSync(c).isDirectory()) return c;
  return null;
};
const exportAliases = (f) => {
  const m = {};
  for (const x of readFileSync(f, "utf8").matchAll(/export\s*\{([^}]*)\}/g)) for (const part of x[1].split(",")) { const mm = part.trim().match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/); if (mm) m[mm[2] || mm[1]] = mm[1]; }
  return m;
};
// spec 无 name：import * as X from spec → spec 的 export 别名表
// spec 带 name：import { name } from spec，若 name 是命名空间再导出则返回被包模块的别名表，否则 null
export function nsResolver(file) {
  return (spec, name) => {
    const f = resolveFile(file, spec);
    if (!f) return null;
    if (!name) return exportAliases(f);
    const src = readFileSync(f, "utf8");
    const esc = name.replace(/\$/g, "\\$");
    let m = src.match(new RegExp("export\\s*\\*\\s*as\\s+" + esc + "\\s+from\\s*[\"']([^\"']+)[\"']"));
    if (!m) { const im = src.match(new RegExp("import\\s*\\*\\s*as\\s+" + esc + "\\s+from\\s*[\"']([^\"']+)[\"']")); if (im && new RegExp("export\\s*\\{[^}]*\\b" + esc + "\\b").test(src)) m = im; }
    if (!m) return null;
    const g = resolveFile(f, m[1]);
    return g ? exportAliases(g) : null;
  };
}
// 包内空函数体导出（打包器会删掉对它们的调用）
export function emptyFnsOf(files) {
  const s = new Set();
  for (const f of files) for (const m of readFileSync(f, "utf8").matchAll(/(?:export )?function ([\w$]+)\([^)]*\)\s*\{\s*\}/g)) s.add(m[1]);
  return s;
}
export function versionsOf(pkg) {
  const pre = pkg.replace("/", "__") + "@";
  return readdirSync(PK).filter((d) => d.startsWith(pre) && existsSync(path.join(PK, d, "package/package.json"))).map((d) => d.slice(pre.length));
}
export function indexOf(pkg, v) {
  const f = path.join(IX, `${pkg.replace("/", "__")}@${v}.json`);
  if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8"));
  const dir = path.join(PK, `${pkg.replace("/", "__")}@${v}`, "package");
  const { files } = moduleFiles(dir);
  const decls = [];
  const emptyFns = emptyFnsOf(files);
  for (const file of files) {
    const rel = path.relative(dir, file);
    for (const d of declarations(readFileSync(file, "utf8"), { nsResolve: nsResolver(file), emptyFns })) decls.push({ file: rel, line: d.line, names: d.names, A: d.A, N: d.N, B: d.B, refs: d.refs });
  }
  const r = { pkg, v, files: files.map((x) => path.relative(dir, x)), decls };
  writeFileSync(f, JSON.stringify(r));
  return r;
}
if (process.argv[1] === import.meta.filename) {
  for (const pkg of process.argv.slice(2)) for (const v of versionsOf(pkg)) { const r = indexOf(pkg, v); console.log(pkg, v, r.files.length, r.decls.length); }
}
