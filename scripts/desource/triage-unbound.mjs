// 把「未声明却在使用」的名字按**来源**分类，决定各自该怎么修。
//
//   node scripts/desource/triage-unbound.mjs [--json]
//
// 为什么需要分类：这些名字看着都一样（都是构建不报错、运行时才炸），但修法完全不同：
//
//   - 同树里已经有 → 补个 import 就行（机械）
//   - 只在 4.0.0 产物里有 → 是 4.0.0 新增的代码，得先把它**整块搬进源码**再说（另一件事）
//   - 两边都有 → 我们这份是从 3.0.21 切出来的，声明可能在切的时候掉了
//   - 只在 3.0.21 里有 → 4.0.0 删掉了，但还有引用残留（要判断是漏删还是改名）
//
// 不分类直接动手，就会出现上一轮那种「按名字从产物里捞，捞到别的模块的同名东西」。
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(scriptDir, "../..");
const require = createRequire(path.join(scriptDir, "../decompile/package.json"));
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const globals = require("globals");

// 和内建检查器用同一份全局表，否则 `Number`/`window`/`Map` 会淹没真正的缺口
const ALLOWED_GLOBALS = new Set(
  ["browser", "worker", "es2024"].flatMap((n) => Object.keys(globals[n] ?? {})),
);
for (const n of Object.keys(globals.node ?? {})) ALLOWED_GLOBALS.add(n);
ALLOWED_GLOBALS.add("WebKitCSSMatrix");
for (const n of ["__HILO_AUTH__", "hilo"]) ALLOWED_GLOBALS.add(n);

const asJson = process.argv.includes("--json");
/** `--kind=new-only`：只列出这一类，方便按类逐个处理。 */
const kindArg = process.argv.find((a) => a.startsWith("--kind="))?.slice("--kind=".length);

/** 产物里所有顶层声明过的名字。 */
function declsInBundle(file) {
  if (!existsSync(file)) return new Set();
  const text = readFileSync(file, "utf8");
  const out = new Set();
  for (const m of text.matchAll(/(?:^|\n)(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) out.add(m[1]);
  return out;
}

function bundleDir(version) {
  return path.join(repo, `.probe/reference/${version}/asar/out/renderer/assets`);
}

function allDecls(version) {
  const dir = bundleDir(version);
  if (!existsSync(dir)) return new Set();
  const out = new Set();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    for (const n of declsInBundle(path.join(dir, f))) out.add(n);
  }
  return out;
}

/** 我们这棵树里出现过的名字（导出 + import 的本地名 + 顶层声明）。 */
function treeNames() {
  const root = path.join(repo, "app/renderer/src");
  const out = new Map();
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(js|jsx)$/.test(entry)) continue;
      const text = readFileSync(full, "utf8");
      for (const m of text.matchAll(/^\s*export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) out.set(m[1], full);
      for (const m of text.matchAll(/^\s*import\s+\{([^}]*)\}/gm)) {
        for (const part of m[1].split(",")) {
          const [orig, local] = part.split(/\s+as\s+/).map((x) => x.trim());
          if (orig) out.set(local ?? orig, full);
        }
      }
    }
  };
  walk(root);
  return out;
}

/** 一个文件里所有「引用但没声明」的名字。 */
function unboundIn(file) {
  const text = readFileSync(file, "utf8");
  let ast;
  try {
    ast = parser.parse(text, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  } catch {
    return [];
  }
  const declared = new Set();
  const referenced = new Set();
  traverse(ast, {
    ImportSpecifier(p) {
      declared.add(p.node.local.name);
    },
    ImportDefaultSpecifier(p) {
      declared.add(p.node.local.name);
    },
    ImportNamespaceSpecifier(p) {
      declared.add(p.node.local.name);
    },
    Function(p) {
      if (p.node.id?.name) declared.add(p.node.id.name);
      for (const param of p.node.params) collect(param, declared);
    },
    VariableDeclarator(p) {
      collect(p.node.id, declared);
    },
    ClassDeclaration(p) {
      if (p.node.id?.name) declared.add(p.node.id.name);
    },
    // `catch (err) {}` 的参数不是普通声明，漏掉的话 `err` 会被当成「未声明」误报
    CatchClause(p) {
      if (p.node.param) collect(p.node.param, declared);
    },
    ReferencedIdentifier(p) {
      referenced.add(p.node.name);
    },
  });
  return [...referenced].filter((n) => !declared.has(n) && !ALLOWED_GLOBALS.has(n));
}

function collect(node, out) {
  if (!node) return;
  switch (node.type) {
    case "Identifier":
      out.add(node.name);
      break;
    case "ObjectPattern":
      for (const p of node.properties) collect(p.type === "RestElement" ? p.argument : p.value, out);
      break;
    case "ArrayPattern":
      for (const el of node.elements) collect(el, out);
      break;
    case "AssignmentPattern":
      collect(node.left, out);
      break;
    case "RestElement":
      collect(node.argument, out);
      break;
    default:
      break;
  }
}

const oldDecls = allDecls("3.0.21");
const newDecls = allDecls("4.0.0");
const tree = treeNames();
console.log(`产物顶层声明：3.0.21 ${oldDecls.size} 个，4.0.0 ${newDecls.size} 个；我们这棵树里 ${tree.size} 个名字`);

const rows = [];
const walkSrc = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkSrc(full);
      continue;
    }
    if (!/\.(js|jsx)$/.test(entry)) continue;
    const names = unboundIn(full);
    if (!names.length) continue;
    for (const name of names) {
      const base = name.replace(/\$\d+$/, "");
      const inTree = tree.has(name) || tree.has(base);
      const inOld = oldDecls.has(name) || oldDecls.has(base);
      const inNew = newDecls.has(name) || newDecls.has(base);
      let kind;
      if (inTree) kind = "in-tree";
      else if (inNew && inOld) kind = "both-bundles";
      else if (inNew) kind = "new-only";
      else if (inOld) kind = "old-only";
      else kind = "unknown";
      rows.push({ file: path.relative(repo, full), name, kind });
    }
  }
};
walkSrc(path.join(repo, "app/renderer/src"));

const byKind = new Map();
for (const r of rows) {
  if (!byKind.has(r.kind)) byKind.set(r.kind, []);
  byKind.get(r.kind).push(r);
}
console.log(`\n未声明名字共 ${rows.length} 处：`);
for (const [kind, list] of [...byKind].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${kind.padEnd(14)} ${String(list.length).padStart(5)}  （${[...new Set(list.map((r) => r.name))].slice(0, 6).join(", ")}…）`);
}

if (kindArg) {
  for (const r of rows.filter((x) => x.kind === kindArg).sort((a, b) => a.file.localeCompare(b.file))) {
    console.log(`${r.file.replace("app/renderer/src/", "").padEnd(54)} ${r.name}`);
  }
  process.exit(0);
} else if (asJson) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log("\n按类别看几个例子：");
  for (const [kind, list] of [...byKind].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n--- ${kind} ---`);
    for (const r of list.slice(0, 5)) console.log(`  ${r.file}  ${r.name}`);
  }
}
