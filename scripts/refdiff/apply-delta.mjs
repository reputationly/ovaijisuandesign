// 把 4.0.0 的语句差异应用到 app/renderer/src。
//
//   node scripts/refdiff/apply-delta.mjs [--apply] [--only <glob>] [--limit N]
//
// 默认 dry-run：只生成提案和报告，不动源码。加 `--apply` 才写回。
//
// 为什么从「我们的文件」出发而不是从 bundle 出发：源文件是按功能手工分的，
// 不是 bundle 的连续区间（实测顺序一致率只有 60%），反过来挂会引入歧义。
// 从文件出发的流程是：
//
//   文件里的语句 s（有名字）
//     → 在 3.0.21 bundle 里按**同名**找到它的出处 old
//     → 在 4.0.0 bundle 里按同名找 new
//     → 三者比形状（归一化后）：
//         old == new            → 上游没动，跳过
//         s   != old            → 我们本地改过这一条 → 冲突，只报告不自动改
//         s   == old != new     → 上游改了、我们没动 → 自动替换（安全区）
//
// 这条「只在 s 还等于 old 时才自动替换」的规则，就是三方合并的纪律。
// 它挡掉了把产品改造（品牌、去登录、清空模型表…）当成上游更新覆盖掉的风险。
//
// 不做的事：不自动加 import（新引用的标识符单独报出来）、不删语句（删除单独报）。
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import { atomsOf } from "./token-merge.mjs";
import { restoreStatementText } from "./restore-statement.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../decompile/package.json"));
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");

const SRC_ROOT = "app/renderer/src";

/**
 * 比对用的归一化：在 normalizeStatement 之前先做一次「简写还原」。
 *
 * 为什么需要：rollup 遇到名字冲突会把 `role` 改名成 `role2`，于是源码里的简写 `{ role }`
 * 在 bundle 里变成 `{ role: role2 }`。normalizeStatement 把标识符一律抹成 `_` 之后，
 * 这两者就成了 `{_}` 和 `{_: _}`，看起来是两种写法 —— 会把大量「其实没改」的语句
 * 误判成冲突。所以先按「去掉数字后缀后同名」把这种展开收回简写，再归一化。
 */
const normForCompare = (text) => atomsOf(text).map((x) => x.norm).join(" ");

function parseArgs(argv) {
  const a = { apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--apply") a.apply = true;
    else if (argv[i].startsWith("--")) a[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return a;
}

/** 源文件 → 顶层语句 [{name, code, start, end}]。只保留有名字的。 */
function statementsOf(text) {
  const ast = parse(text, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
  const out = [];
  for (const node of ast.program.body) {
    const names = [];
    for (const d of node.declarations ?? []) if (d.id?.name) names.push(d.id.name);
    if (node.id?.name) names.push(node.id.name);
    if (!names.length) continue;
    out.push({ names, code: text.slice(node.start, node.end), start: node.start, end: node.end });
  }
  return out;
}

/** bundle 语句表：精确名 → 行；别名（去掉 $N）→ 行。 */
function bundleIndex(rows) {
  const exact = new Map();
  const stripped = new Map();
  rows.forEach((r, i) => {
    const row = { ...r, i };
    for (const n of r.names ?? []) {
      if (!exact.has(n)) exact.set(n, []);
      exact.get(n).push(row);
      const k = n.replace(/\$\d+$/, "");
      if (!stripped.has(k)) stripped.set(k, []);
      stripped.get(k).push(row);
    }
  });
  return { exact, stripped };
}

/** 在候选里挑归一化形状最像我们源码那一条的（用于同名撞车时消歧）。 */
function pickBest(candidates, reference) {
  if (!candidates?.length) return null;
  if (candidates.length === 1) return candidates[0];
  const target = normalizeStatement(reference);
  let best = null;
  let bestScore = -1;
  for (const c of candidates) {
    const a = normalizeStatement(c.head ?? "");
    let i = 0;
    while (i < a.length && i < target.length && a[i] === target[i]) i += 1;
    if (i > bestScore) {
      bestScore = i;
      best = c;
    }
  }
  return best;
}

/**
 * 按语句 sha 缓存「重生成 + 归一化」的结果。
 * 比对必须拿**还原过 JSX** 的文本比：bundle 里是 `jsxRuntimeExports.jsx("div", {...})`，
 * 我们源码里是 `<div>`，不还原就对不上，会把每条 JSX 语句都误判成冲突。
 */
const regenCache = new Map();
async function regen(bundleSource, row) {
  if (regenCache.has(row.sha)) return regenCache.get(row.sha);
  const raw = bundleSource.slice(row.start, row.end);
  const out = await restoreStatementText(raw);
  const value = { code: out.code, norm: normForCompare(out.code) };
  regenCache.set(row.sha, value);
  return value;
}

/**
 * 全树导出索引：名字 → 声明它的文件。用于把新语句里的自由标识符接回 import。
 * `X$2` 这种 rollup 冲突后缀按去掉后缀的名字查。
 */
function buildExportIndex(files, read) {
  const index = new Map();
  for (const rel of files) {
    const text = read(rel);
    // 记的是**导出的名字**（`export { Foo$1 as Foo }` 记 `Foo`），
    // 早先按「基名」猜导出名，结果 `Bold$1` 被写成 `Bold`，rollup 直接报 not exported。
    const add = (name, kind, exported) => {
      if (!index.has(name)) index.set(name, []);
      index.get(name).push({ file: rel, kind, exported });
    };
    for (const m of text.matchAll(/^[ \t]*export\s+(?:async\s+)?(?:function\*?|class)\s+([A-Za-z_$][\w$]*)/gm)) add(m[1], "export", m[1]);
    for (const m of text.matchAll(/^[ \t]*export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) add(m[1], "export", m[1]);
    for (const m of text.matchAll(/^[ \t]*export\s*\{([^}]*)\}/gm)) {
      for (const part of m[1].split(",")) {
        const pieces = part.trim().split(/\s+as\s+/).map((x) => x.trim());
        const exported = pieces[pieces.length - 1];
        if (/^[A-Za-z_$][\w$]*$/.test(exported)) add(exported, "re-export", exported);
      }
    }
  }
  return index;
}

/** 已有的 import：本地名 → 来源模块 + 原始名。 */
function existingImports(text) {
  const map = new Map();
  for (const m of text.matchAll(/^[ \t]*import\s+([^;]+?)\s+from\s+["']([^"']+)["']/gm)) {
    const clause = m[1];
    const named = /\{([^}]*)\}/.exec(clause);
    if (named) {
      for (const part of named[1].split(",")) {
        const [orig, local] = part.split(/\s+as\s+/).map((x) => x.trim());
        if (orig) map.set(local ?? orig, { from: m[2], imported: orig });
      }
    }
    const def = clause.replace(/\{[^}]*\}/, "").replace(/^,|,$/g, "").trim();
    if (def && /^[A-Za-z_$][\w$]*$/.test(def)) map.set(def, { from: m[2], imported: "default" });
  }
  return map;
}

/**
 * 按遍历顺序取出一段代码里的标识符（跳过属性名、对象键、JSX 属性名这些非「名字」的位置）。
 * 用来把「旧版 bundle 语句」和「我们的源码语句」里同一个变量的两种叫法配起来。
 */
function identifierSequence(code) {
  const ast = parse(code, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
  const out = [];
  traverse(ast, {
    Identifier(p) {
      if (p.parentPath.isMemberExpression() && p.key === "property" && !p.parent.computed) return;
      if (p.parentPath.isObjectProperty() && p.key === "key" && !p.parent.computed) return;
      if (p.parentPath.isJSXAttribute() && p.key === "name") return;
      if (p.parentPath.isJSXMemberExpression() && p.key === "property") return;
      out.push(p.node.name);
    },
  });
  return out;
}

/**
 * 从「旧版语句 ↔ 我们源码语句」这一对推出改名表：bundle 里的叫法 → 我们源码里的叫法。
 *
 * 为什么需要：bundle 里 `anchor` 被 rollup 改名成 `anchor2`、`id2` 这类带数字的写法，
 * 而我们的源码在还原时把它们改回了可读名字（`animationFrameId` 等），
 * 有些还记在 scripts/desource/rename/names/*.tsv 里。直接把重生成的新语句贴回去，
 * 会把已经整理好的名字重新弄脏（`animationFrameId` → `id2`）。
 * 用这一对做对照，就能拿到「这个语句里」的准确对应关系，比查 TSV 更准（TSV 是按下标存的）。
 */
function deriveRenameMap(oldCode, ourCode) {
  const a = identifierSequence(oldCode);
  const b = identifierSequence(ourCode);
  if (a.length !== b.length) return new Map();
  const map = new Map();
  const usedTargets = new Set();
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === b[i]) continue;
    if (map.has(a[i]) && map.get(a[i]) !== b[i]) return new Map(); // 一对多，不可靠，放弃
    if (usedTargets.has(b[i])) return new Map();
    map.set(a[i], b[i]);
    usedTargets.add(b[i]);
  }
  return map;
}

/**
 * 在一段代码上做标识符改名（AST 级，不会碰到字符串和属性名），然后重新排版。
 * 排版必须和 restoreStatementText 用同一套 prettier 配置，否则贴回文件里格式会和周围不一致
 * （babel 的 generate 默认不加尾逗号、换行也不一样）。
 * 顺带把改名造出来的 `{ X: X }` 收回简写 `{ X }`。
 */
async function renameIdentifiers(code, map) {
  const ast = parse(code, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
  if (map.size) {
    traverse(ast, {
      Identifier(p) {
        if (p.parentPath.isMemberExpression() && p.key === "property" && !p.parent.computed) return;
        if (p.parentPath.isObjectProperty() && p.key === "key" && !p.parent.computed) return;
        if (p.parentPath.isJSXAttribute() && p.key === "name") return;
        if (p.parentPath.isJSXMemberExpression() && p.key === "property") return;
        if (map.has(p.node.name)) p.node.name = map.get(p.node.name);
      },
    });
  }
  const generated = require("@babel/generator").default(ast, { comments: true, jsescOption: { minimal: true } }).code;
  const prettier = require("prettier");
  const formatted = await prettier.format(generated, { parser: "babel", printWidth: 120, semi: true, singleQuote: false, trailingComma: "all" });
  // 改名之后会留下 `{ anchor: anchor }` 这种冗余长写，收回简写。
  // 放在 prettier 之后用文本处理：在 AST 上替换对象属性容易踩到路径复用的问题，
  // 而排版后的文本形状是确定的，两种上下文（对象字面量 / 解构）里简写都合法。
  let out = formatted;
  for (let i = 0; i < 5; i += 1) {
    const next = out.replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:\s*\2(\s*[,}])/g, "$1$2$3");
    if (next === out) break;
    out = next;
  }
  return out.trimEnd();
}

/** 文件顶层声明了哪些名字（不含 import）。 */
function declaredNames(text) {
  const ast = parse(text, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
  const set = new Set();
  for (const node of ast.program.body) {
    for (const d of node.declarations ?? []) collectPattern(d.id, set);
    if (node.id?.name) set.add(node.id.name);
    if (node.declaration) {
      for (const d of node.declaration.declarations ?? []) collectPattern(d.id, set);
      if (node.declaration.id?.name) set.add(node.declaration.id.name);
    }
  }
  return [...set];
}

/** 把解构 / 默认值 / rest 里的标识符都收进 declared。 */
function collectPattern(id, declared) {
  if (!id) return;
  if (t.isIdentifier(id)) declared.add(id.name);
  else if (t.isObjectPattern(id)) for (const pr of id.properties) collectPattern(pr.value ?? pr.argument, declared);
  else if (t.isArrayPattern(id)) for (const el of id.elements) collectPattern(el, declared);
  else if (t.isRestElement(id)) collectPattern(id.argument, declared);
  else if (t.isAssignmentPattern(id)) collectPattern(id.left, declared);
}

/** 整个文件的自由标识符：文件里没声明、也没 import、也不是全局的才算。 */
function freeIdentifiers(code) {
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  const declared = new Set();
  const used = new Set();
  const GLOBALS = new Set(
    "undefined null true false this window document console Math JSON Object Array String Number Boolean Promise Set Map Date RegExp Error TypeError Symbol globalThis performance requestAnimationFrame cancelAnimationFrame setTimeout clearTimeout setInterval clearInterval fetch URL URLSearchParams Blob File FormData AbortController AbortSignal Intl structuredClone queueMicrotask crypto navigator location localStorage sessionStorage HTMLElement Element Node Event CustomEvent MutationObserver ResizeObserver IntersectionObserver TextEncoder TextDecoder ArrayBuffer Uint8Array Uint16Array Uint32Array Int8Array Int16Array Int32Array Float32Array Float64Array DataView atob btoa process require import arguments".split(" "),
  );
  traverse(ast, {
    FunctionDeclaration(p) {
      if (p.node.id) declared.add(p.node.id.name);
    },
    ClassDeclaration(p) {
      if (p.node.id) declared.add(p.node.id.name);
    },
    VariableDeclarator(p) {
      collectPattern(p.node.id, declared);
    },
    // 函数参数必须收：不收的话，参数名会被当成「自由标识符」报出来，把清单淹掉
    Function(p) {
      for (const param of p.node.params) collectPattern(param, declared);
      if (p.node.id) declared.add(p.node.id.name);
    },
    CatchClause(p) {
      if (p.node.param) collectPattern(p.node.param, declared);
    },
    ImportSpecifier(p) {
      declared.add(p.node.local.name);
    },
    ImportDefaultSpecifier(p) {
      declared.add(p.node.local.name);
    },
    ImportNamespaceSpecifier(p) {
      declared.add(p.node.local.name);
    },
    ReferencedIdentifier(p) {
      used.add(p.node.name);
    },
  });
  return [...used].filter((n) => !declared.has(n) && !GLOBALS.has(n));
}

// Vite 会把懒加载的模块切成 `./名字-构建哈希.js`。bundle 里保留下的是这种带哈希的名字，
// 我们的源码里是真实模块路径。要把它换回模块路径，换不回去就不能应用这条语句 ——
// 留着会让 rollup 直接报 "Could not resolve"。
const CHUNK_IMPORT = /(["'`])\.\/([A-Za-z0-9_][A-Za-z0-9_.-]*?)-([A-Za-z0-9_-]{8})\.(js|css)\1/g;

/** 两个源文件之间的相对 import 路径（仓库里的写法带 .js/.jsx 后缀）。 */
function relativeImport(fromRel, toRel) {
  const rel = path.posix.relative(path.posix.dirname(fromRel), toRel);
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/** 在最后一条 import 之后插入新的 import。 */
function insertImports(text, needed) {
  let out = text;
  const appended = [];
  for (const [from, names] of [...needed].sort(([a], [b]) => a.localeCompare(b))) {
    const unique = [...new Set(names)].sort();
    // 同一个模块已经 import 过就并进去，不要再加一行 —— 重复 import 同一个模块虽然合法，
    // 但和仓库现有的写法不一致，还会让后面的审查看不出改了什么。
    const existing = new RegExp(`^[ \\t]*import\\s*\\{([^}]*)\\}\\s*from\\s*["']${from.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}["'];`, "m");
    const m = existing.exec(out);
    if (m) {
      const merged = [...new Set(m[1].split(",").map((x) => x.trim()).filter(Boolean).concat(unique))].sort();
      out = out.slice(0, m.index) + `import { ${merged.join(", ")} } from "${from}";` + out.slice(m.index + m[0].length);
    } else {
      appended.push(`import { ${unique.join(", ")} } from "${from}";`);
    }
  }
  if (!appended.length) return out;
  const matches = [...out.matchAll(/^[ \t]*import\s[^;]+;\s*$/gm)];
  if (!matches.length) return `${appended.join("\n")}\n${out}`;
  const last = matches[matches.length - 1];
  const at = last.index + last[0].length;
  return `${out.slice(0, at)}\n${appended.join("\n")}${out.slice(at)}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(".");
  // 第 353 轮（4.0.3 增量）：旧/新两侧可指定，默认仍是 3.0.21 -> 4.0.0。
  // 做 4.0.0 -> 4.0.3 时传：
  //   --old .probe/refdiff/toplevel-4.0.0.json
  //   --new .probe/refdiff/toplevel-4.0.3.json
  //   --old-src .probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js
  //   --new-src .probe/reference/4.0.3/asar/out/renderer/assets/index-B3Ss5vz1.js
  const OLD_LEDGER = args.old ?? ".probe/refdiff/toplevel-3.0.21.json";
  const NEW_LEDGER = args.new ?? ".probe/refdiff/toplevel-4.0.0.json";
  const OLD_BUNDLE = args["old-src"] ?? ".probe/reference/3.0.21/asar/out/renderer/assets/index-ZNI5SgRm.js";
  const NEW_BUNDLE = args["new-src"] ?? ".probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js";
  const oldRows = JSON.parse(readFileSync(OLD_LEDGER, "utf8")).rows;
  const newRows = JSON.parse(readFileSync(NEW_LEDGER, "utf8")).rows;
  const oldSrc = readFileSync(OLD_BUNDLE, "utf8");
  const newSrc = readFileSync(NEW_BUNDLE, "utf8");
  const OLD = bundleIndex(oldRows);
  const NEW = bundleIndex(newRows);

  const files = [];
  const walk = (dir, rel = "") => {
    for (const name of readdirSync(dir).sort()) {
      const abs = path.join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      const st = statSync(abs);
      if (st.isDirectory()) {
        if (/^(vendor-fork|vendor-inline)$/.test(name)) continue;
        walk(abs, r);
      } else if (/\.(jsx?|mjs|cjs)$/.test(name) && st.size < 2 * 1024 * 1024) files.push(r);
    }
  };
  walk(path.join(root, SRC_ROOT));

  const proposalDir = path.join(root, ".probe/refdiff/proposed");
  mkdirSync(proposalDir, { recursive: true });

  const stats = { files: 0, touched: 0, replaced: 0, renamedTotal: 0, renameFallback: 0, needsModule: 0, conflicts: 0, deleted: 0, alreadyNew: 0, freeIds: new Set(), unresolved: new Set(), importsAdded: 0 };
  const exportIndex = buildExportIndex(files, (rel) => readFileSync(path.join(root, SRC_ROOT, rel), "utf8"));
  const moduleByBase = new Map();
  for (const rel of files) {
    const base = path.basename(rel).replace(/\.[^.]+$/, "");
    if (!moduleByBase.has(base)) moduleByBase.set(base, []);
    moduleByBase.get(base).push(rel);
  }
  const report = [];
  const limit = args.limit ? Number(args.limit) : Infinity;
  const only = args.only ? new RegExp(args.only) : null;

  for (const rel of files) {
    if (stats.touched >= limit) break;
    if (only && !only.test(rel)) continue;
    const text = readFileSync(path.join(root, SRC_ROOT, rel), "utf8");
    const fileIdentifiers = new Set(text.match(/[A-Za-z_$][\w$]*/g) ?? []);
    const fileBindings = new Set([...existingImports(text).keys(), ...declaredNames(text)]);
    let stmts;
    try {
      stmts = statementsOf(text);
    } catch {
      continue;
    }
    stats.files += 1;
    const edits = [];
    for (const s of stmts) {
      if (s.names.length !== 1) continue;
      const name = s.names[0];
      const old = pickBest(OLD.exact.get(name), s.code);
      if (!old) {
        // 名字在 3.0.21 里没有：可能是我们本地新增的，也可能是还原时改过名，不当成上游变化
        continue;
      }
      const next = pickBest(NEW.exact.get(name), s.code);
      const sNorm = normForCompare(s.code);
      const oldRegen = await regen(oldSrc, old);
      if (!next) {
        if (sNorm === oldRegen.norm) {
          stats.deleted += 1;
          edits.push({ kind: "deleted-upstream", name, from: s.start, to: s.end, note: "上游没有同名语句了；我们这条还等于旧版原文" });
        }
        continue;
      }
      const newRegen = await regen(newSrc, next);
      if (oldRegen.norm === newRegen.norm) continue; // 上游没动
      if (sNorm === newRegen.norm) continue; // 我们已经和新版一致（本地早就改过或值本来就是新的）
      if (sNorm !== oldRegen.norm) {
        stats.conflicts += 1;
        edits.push({ kind: "conflict", name, from: s.start, to: s.end, note: "上游改了，我们本地也改过 —— 要人工合" });
        continue;
      }
      // 安全区：上游改了、我们没动。
      // 先用「旧版语句 ↔ 我们源码语句」推改名表，再套到重生成的新语句上，
      // 这样贴回去不会把我们整理好的可读变量名弄回 bundle 的 `x2` 形态。
      // 先处理懒加载 chunk：能按模块基名找到对应源码文件就改写成相对路径，找不到就整条跳过。
      const missingModules = [];
      let newCode = newRegen.code.replace(CHUNK_IMPORT, (m, q, base) => {
        const target = moduleByBase.get(base)?.[0];
        if (!target) {
          missingModules.push(`${base}.js`);
          return m;
        }
        return `${q}${relativeImport(rel, target)}${q}`;
      });
      if (missingModules.length) {
        stats.needsModule += 1;
        edits.push({ kind: "needs-module", name, from: s.start, to: s.end, note: `引用了我们还没有的模块：${missingModules.join(", ")}` });
        continue;
      }
      const renameMap = deriveRenameMap(oldRegen.code, s.code);
      // 再补一条：bundle 里为避让冲突会把 `anchor` 写成 `anchor2`。如果去掉尾数字后的名字
      // 就是我们文件里在用的名字，那就改回去 —— 但只在改名后不会和本语句里另一个名字撞车时。
      const newIds = new Set(identifierSequence(newCode));
      const targets = new Set(renameMap.values());
      for (const id of newIds) {
        if (!/\d$/.test(id)) continue;
        const base = id.replace(/\d+$/, "");
        // 三个条件都要满足才改：基础名是我们文件里在用的、语句里没被别的名字占用、
        // 也不是已有映射的目标。少任何一个都可能造出重名（babel 会直接抛 Duplicate declaration）。
        if (!base || renameMap.has(id) || targets.has(base)) continue;
        if (fileIdentifiers.has(base) && !newIds.has(base)) {
          renameMap.set(id, base);
          targets.add(base);
        }
      }
      // 万一还是撞了名字，退回不改名的版本 —— 宁可名字难看，也不能让文件坏掉。
      let renamed = newCode;
      if (renameMap.size) {
        try {
          renamed = await renameIdentifiers(newCode, renameMap);
        } catch {
          stats.renameFallback += 1;
          renamed = newCode;
        }
      }
      edits.push({ kind: "replace", name, from: s.start, to: s.end, replacement: renamed, renamed: renameMap.size });
    }
    if (!edits.length) continue;

    const replacements = edits.filter((e) => e.kind === "replace");
    if (replacements.length) {
      stats.replaced += replacements.length;
      for (const e of replacements) stats.renamedTotal += e.renamed ?? 0;
      stats.touched += 1;
      let next = text;
      for (const e of [...replacements].sort((a, b) => b.from - a.from)) {
        next = next.slice(0, e.from) + e.replacement + next.slice(e.to);
      }
      // 自由标识符按**整个新文件**算：单看一条语句的话，文件内其它函数和 import 也会被算成自由变量。
      const introduced = freeIdentifiers(next).filter((n) => !freeIdentifiers(text).includes(n));
      // 把新冒出来的符号接回 import：`X$2` 先去后缀查，查到就把生成文本里的名字改成导出名，
      // 并在 import 区补一行。查不到的不猜，如实留在 unresolved 里。
      const imports = existingImports(next);
      const needed = new Map(); // from → [{imported, local}]
      const unresolved = [];
      for (const raw of introduced) {
        if (imports.has(raw)) continue;
        const base = raw.replace(/\$\d+$/, "");
        // 文件里已经有这个名字（自己声明或从别处 import 的）就不能再加一条 import ——
        // 加了会变成重复声明，rollup 会直接报错。基名已存在时把生成代码里的 `X$2` 改回 `X`。
        if (fileBindings.has(raw)) continue;
        if (fileBindings.has(base)) {
          if (raw !== base) next = next.split(raw).join(base);
          continue;
        }
        const hit = (exportIndex.get(raw) ?? exportIndex.get(base) ?? []).filter((h) => h.file !== rel);
        if (!hit.length) {
          unresolved.push(raw);
          continue;
        }
        const target = hit.find((h) => h.kind === "export") ?? hit[0];
        // 用目标文件**真正导出的名字**，不是我们猜的基名。
        const exportedName = target.exported ?? raw;
        if (raw !== exportedName) next = next.split(raw).join(exportedName);
        const relPath = relativeImport(rel, target.file);
        const existing = imports.get(exportedName);
        if (existing) {
          if (existing.from !== relPath) unresolved.push(`${exportedName}（已在 ${existing.from} 里，冲突）`);
          continue;
        }
        imports.set(exportedName, { from: relPath, imported: exportedName });
        needed.set(relPath, [...(needed.get(relPath) ?? []), exportedName]);
      }
      if (needed.size) next = insertImports(next, needed);
      for (const n of introduced) stats.freeIds.add(n);
      for (const n of unresolved) stats.unresolved.add(n);
      writeFileSync(path.join(proposalDir, rel.replace(/\//g, "__")), next);
      const last = edits.filter((e) => e.kind === "replace").at(-1);
      if (last) last.free = introduced;
      if (last) last.needsImport = [...needed].map(([from, names]) => ({ from, names }));
      if (last) last.unresolved = unresolved;
      if (args.apply) writeFileSync(path.join(root, SRC_ROOT, rel), next);
    }
    report.push({ file: rel, edits: edits.map((e) => ({ ...e, replacement: undefined })) });
  }

  writeFileSync(
    path.join(root, ".probe/refdiff/apply-delta-report.json"),
    `${JSON.stringify({ mode: args.apply ? "apply" : "dry-run", stats: { ...stats, freeIds: [...stats.freeIds].sort(), unresolved: [...stats.unresolved].sort() }, files: report }, null, 2)}\n`,
  );

  console.log(`模式：${args.apply ? "写回源码" : "dry-run（只出提案）"}`);
  console.log(`扫过 ${stats.files} 个源文件；有改动提案的 ${stats.touched} 个`);
  console.log(`  可自动替换（上游改了、我们没动）: ${stats.replaced}（沿用我们命名的变量 ${stats.renamedTotal} 处）`);
  console.log(`  冲突（两边都改）              : ${stats.conflicts}`);
  console.log(`  上游删除（我们这条还没动）    : ${stats.deleted}`);
  console.log(`  需要新模块（先跳过）          : ${stats.needsModule}`);
  console.log(`  新出现的自由标识符            : ${stats.freeIds.size}（其中 ${stats.freeIds.size - stats.unresolved.size} 已接回 import）`);
  if (stats.unresolved.size) console.log(`  接不回去的（要人工处理）      : ${stats.unresolved.size}\n    ${[...stats.unresolved].slice(0, 25).join(", ")}`);
  console.log(`报告 → .probe/refdiff/apply-delta-report.json`);
  if (!args.apply && stats.touched) console.log(`提案 → .probe/refdiff/proposed/`);
}

await main();
