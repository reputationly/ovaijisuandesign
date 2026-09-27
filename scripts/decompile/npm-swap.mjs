// 阶段 1：把 vendor 里的第三方库逐个换成 npm 包。
//
// 清单在 npm-packages.json（按顺序替换，被依赖的包排在前面）：
//   { "name": "@lezer/common", "version": "1.2.3" }
//   { "name": "react", "version": "19.2.4", "cjs": { "requireReact": "react" } }
//
// ESM 包：拿这个版本的发布文件逐条比对 vendor 语句（去掉空白、注释、局部变量名后比"形状"），
// 认出属于它的语句；它们对外（main 或剩下的 vendor）暴露的名字必须都是包的导出，才整体换成
//   import { NodeType as NodeType3 } from "@lezer/common";
// 有名字对不上导出就不换，报出来人工看。
//
// CommonJS 包：bundle 里是 requireXxx() 包装函数。把清单里的入口 require 函数换成返回 npm 包的
// 导出对象，里面的实现没人引用了就一并删掉。
//
// 换掉的包在 vendor 里不能再有它依赖的包的副本，否则 npm 版会带进来第二份实例（instanceof、
// 模块级状态都会错）。按依赖顺序排清单，工具也会检查。
import _generate from "@babel/generator";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import * as t from "@babel/types";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const traverse = _traverse.default;
const generate = _generate.default;

const KEYWORDS = new Set(
  "break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof let new null return super switch this throw true try typeof var void while with yield async await of static get set undefined".split(" "),
);
// 比"形状"：去掉注释和空白，变量名（不跟在 . 后面的标识符）一律换成 _，关键字、字符串、属性名保留。
// 另外抹掉打包器重新打印带来的差异：单参数箭头函数的括号、单双引号、分号、void 0、改名时的 let X = class Y。
export const norm = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'([^'"\\\n]*)'/g, '"$1"')
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1")
    .replace(/(\.?)([A-Za-z_$][\w$]*)/g, (m, dot, id) => (dot || KEYWORDS.has(id) ? m : "_"))
    .replace(/_\.jsxs?\(/g, "_(")
    .replace(/_(\._)+/g, "_")
    .replace(/\s+/g, "")
    .replace(/,([}\])])/g, "$1")
    .replace(/\(_\)=>/g, "_=>")
    .replace(/void0/g, "undefined")
    .replace(/(?:let|const|var)_=(class|function)_/g, "$1_")
    .replace(/;/g, "");

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], ...opts });

/** 下载并解开 name@version，返回包目录。 */
export function fetchPackage(cacheDir, name, version) {
  const dir = path.join(cacheDir, `${name.replace("/", "__")}@${version}`);
  if (!existsSync(path.join(dir, "package"))) {
    mkdirSync(dir, { recursive: true });
    const tgz = sh("npm", ["pack", `${name}@${version}`, "--silent"], { cwd: dir }).trim().split("\n").pop();
    sh("tar", ["xzf", tgz], { cwd: dir });
  }
  return path.join(dir, "package");
}

// ---- 包的导出表：按 package.json 的 exports / module / main 找 ESM 入口，顺着 export * 展开 ----

const CONDITIONS = ["browser", "import", "module", "default"];
function pickTarget(entry) {
  if (typeof entry === "string") return entry;
  if (Array.isArray(entry)) return entry.map(pickTarget).find(Boolean);
  if (entry && typeof entry === "object") {
    for (const c of CONDITIONS) if (c in entry) {
      const r = pickTarget(entry[c]);
      if (r) return r;
    }
  }
  return null;
}
/** { 子路径: 入口文件 }，子路径 "." 是包本身。带 * 的子路径不展开。 */
function entriesOf(pkgDir) {
  const pj = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8"));
  const out = {};
  if (pj.exports && typeof pj.exports === "object" && Object.keys(pj.exports).some((k) => k.startsWith("."))) {
    for (const [k, v] of Object.entries(pj.exports)) {
      if (k.includes("*") || k.endsWith(".json") || k === "./package.json") continue;
      const target = pickTarget(v);
      if (target && /\.m?js$/.test(target)) out[k] = path.join(pkgDir, target);
    }
  } else {
    const target = pickTarget(pj.exports) ?? pj.module ?? pj.main ?? "index.js";
    out["."] = path.join(pkgDir, target.endsWith(".js") || target.endsWith(".mjs") ? target : `${target}.js`);
  }
  return out;
}
function exportNamesOf(file, seen = new Set()) {
  if (seen.has(file) || !existsSync(file)) return new Set();
  seen.add(file);
  const names = new Set();
  let ast;
  try {
    ast = parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  } catch {
    return names;
  }
  for (const n of ast.program.body) {
    if (t.isExportNamedDeclaration(n)) {
      if (n.declaration) Object.keys(t.getBindingIdentifiers(n.declaration, false, true)).forEach((x) => names.add(x));
      for (const s of n.specifiers) names.add(t.isIdentifier(s.exported) ? s.exported.name : s.exported.value);
    } else if (t.isExportDefaultDeclaration(n)) names.add("default");
    else if (t.isExportAllDeclaration(n)) {
      if (n.exported) names.add(n.exported.name);
      else if (n.source.value.startsWith(".")) {
        let f = path.resolve(path.dirname(file), n.source.value);
        if (!existsSync(f) || statSync(f).isDirectory()) f = [".js", ".mjs", "/index.js", "/index.mjs"].map((x) => f + x).find(existsSync) ?? f;
        for (const x of exportNamesOf(f, seen)) if (x !== "default") names.add(x);
      }
    }
  }
  return names;
}
/** 名字 → 从哪个子路径导入（优先包本身）。 */
function exportMap(pkgDir, name) {
  const map = new Map();
  const entries = Object.entries(entriesOf(pkgDir)).sort(([a], [b]) => (a === "." ? -1 : b === "." ? 1 : a.length - b.length));
  for (const [sub, file] of entries) {
    const spec = sub === "." ? name : `${name}/${sub.slice(2)}`;
    for (const x of exportNamesOf(file)) if (!map.has(x)) map.set(x, spec);
  }
  return map;
}

// ---- vendor 语句之间的关系 ----

function analyze(ast) {
  const body = ast.program.body;
  const index = new Map(body.map((n, i) => [n, i]));
  const topOf = (p) => {
    let cur = p;
    while (cur.parentPath && !cur.parentPath.isProgram()) cur = cur.parentPath;
    return index.get(cur.node);
  };
  const declOf = new Map();
  const namesOf = body.map(() => []);
  const refs = body.map(() => new Set()); // i 引用了哪些名字（顶层）
  const mutates = body.map(() => new Set()); // i 在初始化时给哪些顶层名字挂属性 / 赋值
  traverse.cache.clear();
  traverse(ast, {
    Program(p) {
      for (const [name, b] of Object.entries(p.scope.bindings)) {
        const d = topOf(b.path);
        declOf.set(name, d);
        namesOf[d].push(name);
      }
    },
    ReferencedIdentifier(p) {
      const b = p.scope.getBinding(p.node.name);
      if (b && b.scope.path.isProgram()) refs[topOf(p)].add(p.node.name);
    },
    "AssignmentExpression|UpdateExpression"(p) {
      let target = p.isAssignmentExpression() ? p.node.left : p.node.argument;
      while (t.isMemberExpression(target)) target = target.object;
      if (!t.isIdentifier(target)) return;
      const b = p.scope.getBinding(target.name);
      if (b && b.scope.path.isProgram()) mutates[topOf(p)].add(target.name);
    },
  });
  return { body, declOf, namesOf, refs, mutates };
}

// 打包器生成的辅助函数（CommonJS 互操作、esbuild 的类字段 / 装饰器转换），不属于任何包
const isBundlerHelper = (n) => /^(__|_mergeNamespaces|getDefaultExportFromCjs|getAugmentedNamespace|commonjsGlobal)/.test(n);

// CommonJS 互操作的派生语句：const React = getDefaultExportFromCjs(reactExports) 之类
const isInterop = (n) =>
  t.isVariableDeclaration(n) &&
  n.declarations.every((d) => t.isCallExpression(d.init) && t.isIdentifier(d.init.callee) && isBundlerHelper(d.init.callee.name));

const baseCandidates = (n) => [...new Set([n, n.replace(/\$\d+$/, ""), n.replace(/\$\d+$/, "").replace(/\d+$/, ""), n.replace(/\$/g, "")])];

/**
 * 在 vendor AST 上做替换。src 是 vendor 语句的原文来源（bundle 源码），语句节点带 start/end。
 * externalRefs：main 引用的 vendor 名字。返回每个包的报告。
 */
export function swapPackages(vendorAst, src, externalRefs, list, { cacheDir, log = console.log }) {
  const reports = [];
  const imports = []; // [spec, imported, local]
  // 只分析一次：换掉的语句记进 a.swapped，当作"已由 npm 提供"（相当于 import），后面的包照常看它们
  const a = analyze(vendorAst);
  a.swapped = new Set();
  a.shapes = a.body.map((n) => (n.start == null ? "" : norm(src.slice(n.start, n.end))));
  for (const item of list) {
    const pkgDir = fetchPackage(cacheDir, item.name, item.version);
    const report = { name: item.name, version: item.version };
    reports.push(report);
    const mine = [];
    const removed = item.cjs ? swapCjs(a, item, mine, report) : swapEsm(a, src, externalRefs, item, pkgDir, mine, report);
    if (removed) imports.push(...mine);
    if (!removed) {
      log(`  ✗ ${item.name}@${item.version}：${report.error}`);
      continue;
    }
    for (const i of removed) a.swapped.add(i);
    log(`  ✓ ${item.name}@${item.version}：删 ${removed.size} 条语句（${report.lines} 行），导入 ${report.imports} 个名字`);
  }
  vendorAst.program.body = a.body.filter((_, i) => !a.swapped.has(i));
  // 按包分组写 import
  const bySpec = new Map();
  for (const [spec, imported, local] of imports) {
    if (!bySpec.has(spec)) bySpec.set(spec, []);
    bySpec.get(spec).push([imported, local]);
  }
  // 一条 import 只能有一个默认导入：默认导入各自一条，具名导入合成一条
  const decls = [...bySpec].flatMap(([spec, list]) => {
    const named = list.filter(([imported]) => imported !== "default");
    return [
      ...list.filter(([imported]) => imported === "default").map(([, local]) => t.importDeclaration([t.importDefaultSpecifier(t.identifier(local))], t.stringLiteral(spec))),
      ...(named.length ? [t.importDeclaration(named.map(([imported, local]) => t.importSpecifier(t.identifier(local), t.identifier(imported))), t.stringLiteral(spec))] : []),
    ];
  });
  vendorAst.program.body.unshift(...decls);
  const dropped = dropDead(vendorAst, externalRefs);
  if (dropped) log(`  清理没人引用的定义 ${dropped} 条`);
  return reports;
}

/** ESM 入口顺着相对路径的 import / export … from 能走到的文件（不含 UMD 整合版之类会把依赖打进去的文件）。 */
function moduleGraph(pkgDir) {
  const seen = new Set();
  const resolve = (from, spec) => {
    const f = path.resolve(path.dirname(from), spec);
    return [f, `${f}.js`, `${f}.mjs`, path.join(f, "index.js"), path.join(f, "index.mjs")].find((x) => existsSync(x) && statSync(x).isFile());
  };
  const walk = (file) => {
    if (!file || seen.has(file)) return;
    seen.add(file);
    let ast;
    try {
      ast = parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
    } catch {
      return;
    }
    for (const n of ast.program.body) if ((t.isImportDeclaration(n) || t.isExportNamedDeclaration(n) || t.isExportAllDeclaration(n)) && n.source?.value.startsWith(".")) walk(resolve(file, n.source.value));
  };
  for (const f of Object.values(entriesOf(pkgDir))) walk(f);
  return [...seen];
}

function swapEsm(a, src, externalRefs, item, pkgDir, imports, report) {
  const { body, declOf, namesOf, refs, mutates, swapped } = a;
  const files = moduleGraph(pkgDir);
  if (!files.length) return fail(report, "找不到 ESM 入口");
  const text = files.map((f) => norm(readFileSync(f, "utf8"))).join("\n");
  const shapes = a.shapes;
  const isImport = (i) => swapped.has(i) || t.isImportDeclaration(body[i]);
  const hit = shapes.map((s, i) => !isImport(i) && s.length > 0 && (text.includes(s) || (s.length >= 400 && text.includes(s.slice(0, 400)))));
  const strong = (i) => hit[i] && shapes[i].length >= 40;
  const head = (i) => src.slice(body[i].start, body[i].start + 60).replace(/\s+/g, " ");
  // 属于这个包：长语句命中；短语句命中且前后最近的长语句也是它的；夹在它的长语句中间（≤3 条）没命中的
  // （打包时被改写过，比如 process.env.NODE_ENV 被替换）也算。
  const mine = new Set();
  const strongIdx = body.map((_, i) => i).filter(strong);
  for (const i of strongIdx) mine.add(i);
  for (let k = 0; k + 1 < strongIdx.length; k++) {
    const [lo, hi] = [strongIdx[k], strongIdx[k + 1]];
    if (hi - lo - 1 > 0 && hi - lo - 1 <= 3) for (let i = lo + 1; i < hi; i++) if (!isImport(i)) mine.add(i);
  }
  const near = (i, dir) => {
    for (let j = i + dir; j >= 0 && j < body.length && Math.abs(j - i) <= 5; j += dir) if (strong(j)) return j;
    return -1;
  };
  for (let i = 0; i < body.length; i++) if (hit[i] && !strong(i) && (mine.has(near(i, -1)) || mine.has(near(i, 1)))) mine.add(i);
  if (!mine.size) return fail(report, "vendor 里没找到这个包的代码（版本不对？）");

  // 反复检查三种冲突。冲突落在短语句 / 夹缝语句上（多半是邻居包的，let x = 0 这种形状到处都有）就把它
  // 踢出去重来；落在长语句上说明真有问题，记下来报错。
  const exportsMap = exportMap(pkgDir, item.name);
  const mapName = (n) => baseCandidates(n).find((c) => exportsMap.has(c));
  let problems;
  let mapped;
  for (;;) {
    problems = [];
    const evict = new Set();
    // 1. 外面没认出的语句在初始化时给它的对象挂属性（X.none = …）：命中原文就收进来，否则冲突
    for (let i = 0; i < body.length; i++) {
      if (mine.has(i) || namesOf[i].length || isImport(i)) continue;
      const targets = [...mutates[i]].map((n) => declOf.get(n)).filter((d) => mine.has(d));
      if (!targets.length) continue;
      if (hit[i]) mine.add(i);
      else for (const d of targets) strong(d) ? problems.push(`外面有语句给它的对象挂属性：${head(i)}`) : evict.add(d);
    }
    // 2. 对外暴露的名字都要是包的导出
    const needed = new Set();
    body.forEach((_, i) => {
      if (!mine.has(i) && !isImport(i)) for (const n of refs[i]) if (mine.has(declOf.get(n))) needed.add(n);
    });
    for (const n of externalRefs) if (mine.has(declOf.get(n))) needed.add(n);
    mapped = [];
    for (const n of needed) {
      const e = mapName(n);
      if (e) mapped.push([exportsMap.get(e), e, n]);
      else if (strong(declOf.get(n))) {
        const u = body.findIndex((_, i) => !mine.has(i) && !isImport(i) && refs[i].has(n));
        problems.push(`${n} 不是包的导出（${u < 0 ? "main 在用" : `被 ${head(u)} 引用`}）`);
      } else evict.add(declOf.get(n));
    }
    // 3. 它的代码引用的 vendor 语句只能是已换成 npm 的包、打包器辅助函数或 CommonJS 互操作语句。
    //    否则要么这个包还有没认出来的代码（删一半留一半），要么它依赖的包还没换（npm 版会带进第二份）。
    for (const i of mine) for (const n of refs[i]) {
      const d = declOf.get(n);
      if (d === undefined || mine.has(d) || isImport(d) || isBundlerHelper(n) || isInterop(body[d])) continue;
      if (strong(i)) problems.push(`引用了不属于它的 ${n}（${head(d)}）`);
      else evict.add(i);
    }
    if (!evict.size) break;
    for (const d of evict) mine.delete(d);
  }
  if (problems.length) return fail(report, `${problems.length} 处冲突：\n      ${[...new Set(problems)].slice(0, 6).join("\n      ")}`);

  const pj = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8"));
  report.deps = Object.keys({ ...pj.dependencies, ...pj.peerDependencies });
  imports.push(...mapped);
  report.imports = mapped.length;
  report.lines = [...mine].reduce((s, i) => s + (body[i].loc ? body[i].loc.end.line - body[i].loc.start.line + 1 : 0), 0);
  return mine;
}

function swapCjs(a, item, imports, report) {
  const { body, declOf } = a;
  const replaced = new Set();
  const absent = Object.keys(item.cjs).filter((fn) => declOf.get(fn) === undefined);
  if (absent.length) return fail(report, `vendor 里没有 ${absent.join(", ")}`);
  for (const [fn, spec] of Object.entries(item.cjs)) {
    const d = declOf.get(fn);
    const local = `__ov_${spec.replace(/[^\w]/g, "_")}`;
    imports.push([spec, "default", local]);
    // function requireReact() {…} → function requireReact() { return __ov_react; }（别的包装函数里可能还在调它）
    body[d] = t.functionDeclaration(t.identifier(fn), [], t.blockStatement([t.returnStatement(t.identifier(local))]));
    a.refs[d] = new Set();
    a.mutates[d] = new Set();
    // var reactExports = requireReact(); → import reactExports from "react";
    body.forEach((n, i) => {
      if (!t.isVariableDeclaration(n) || n.declarations.length !== 1) return;
      const [v] = n.declarations;
      if (t.isIdentifier(v.id) && t.isCallExpression(v.init) && t.isIdentifier(v.init.callee, { name: fn }) && !v.init.arguments.length) {
        imports.push([spec, "default", v.id.name]);
        replaced.add(i);
      }
    });
  }
  report.imports = Object.keys(item.cjs).length;
  report.lines = 0;
  report.deps = item.deps ?? [];
  // 实现部分（requireReact_production、hasRequired…、react = { exports: {} }）在最后统一清理没人引用的定义时删掉
  return replaced;
}

/** 删掉没人引用、没有副作用的顶层定义（反复做，直到不再变化）。keep：外部（main）引用的名字。 */
export function dropDead(ast, keep) {
  const pure = (n) =>
    t.isFunctionDeclaration(n) ||
    (t.isVariableDeclaration(n) &&
      n.declarations.every((d) => t.isIdentifier(d.id) && (!d.init || t.isLiteral(d.init) || t.isFunction(d.init) || (t.isObjectExpression(d.init) && d.init.properties.every((p) => t.isObjectProperty(p) && !p.computed && (t.isLiteral(p.value) || t.isObjectExpression(p.value) && !p.value.properties.length))))));
  let dropped = 0;
  for (;;) {
    const a = analyze(ast);
    const used = new Set(keep);
    a.body.forEach((_, i) => {
      for (const n of a.refs[i]) if (a.declOf.get(n) !== i) used.add(n);
      for (const n of a.mutates[i]) if (a.declOf.get(n) !== i) used.add(n);
    });
    const dead = new Set(a.body.flatMap((n, i) => (pure(n) && a.namesOf[i].length && !a.namesOf[i].some((x) => used.has(x)) ? [i] : [])));
    if (!dead.size) break;
    dropped += dead.size;
    ast.program.body = a.body.filter((_, i) => !dead.has(i));
  }
  ast.program.body = ast.program.body.filter((n) => !t.isEmptyStatement(n));
  return dropped;
}

function fail(report, error, extra = {}) {
  Object.assign(report, { error }, extra);
  return null;
}

export { generate };
