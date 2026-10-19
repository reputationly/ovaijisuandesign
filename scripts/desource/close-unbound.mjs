// 把某个文件里「引用但没声明」的名字逐个补上，直到补不动为止。
//
//   node scripts/desource/close-unbound.mjs <文件> [--dry-run] [--max-rounds N]
//
// 为什么需要「循环」：补一个组件会牵出它依赖的几个（上下文、辅助组件、工具函数），
// 那些又要继续补。手工一个个点太慢，也容易漏。
//
// 三类来源，优先级从高到低：
//
//   1. **已知的包/本地模块**（`reactExports`、`jsxRuntimeExports`、`cn$N`…）——加 import；
//      这些名字是 rollup 为重名变量加的别名，原模块里就叫 `react`、`cn`。
//   2. **产物里的顶层声明** —— 从 4.0.0 的产物里按名提取、原样搬回。
//   3. 都找不到 —— 记下来，交人工判断（可能是另一个模块该 import 的，也可能是名字被压缩过）。
//
// 只动目标文件，不改别处。
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(scriptDir, "../..");
const require = createRequire(path.join(scriptDir, "../decompile/package.json"));
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const globals = require("globals");

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const maxRounds = Number(args[args.indexOf("--max-rounds") + 1]) || 12;
if (!target) {
  console.error("用法: node scripts/desource/close-unbound.mjs <文件> [--dry-run] [--max-rounds N]");
  process.exit(2);
}
const filePath = path.resolve(repo, target);

const ALLOWED_GLOBALS = new Set(
  ["browser", "worker", "es2024"].flatMap((n) => Object.keys(globals[n] ?? {})),
);
for (const n of Object.keys(globals.node ?? {})) ALLOWED_GLOBALS.add(n);
ALLOWED_GLOBALS.add("WebKitCSSMatrix");
for (const n of ["__HILO_AUTH__", "hilo"]) ALLOWED_GLOBALS.add(n);

const { buildExportIndex, existingImports, listSourceFiles } = await import(
  path.join(scriptDir, "../refdiff/source-index.mjs")
).catch(() => ({}));
const SRC_ROOT = path.join(repo, "app/renderer/src");
let importIndex = new Map();
let exportIndex = new Map();
if (listSourceFiles && existingImports && buildExportIndex) {
  // listSourceFiles 返回的是**相对给定根**的路径，不能拿去做 path.relative(repo, …)
  const files = listSourceFiles(SRC_ROOT).map((f) => path.join("app/renderer/src", f));
  const read = (rel) => readFileSync(path.join(repo, rel), "utf8");
  exportIndex = buildExportIndex(files, read);
  // 自建 import 索引：`buildImportIndex` 不带来源文件，而我们**需要**它才能把这个
  // 相对 import 换算成相对于目标文件的路径。同一个名字在不同文件里来源不同时记为歧义。
  for (const rel of files) {
    let text;
    try {
      text = read(rel);
    } catch {
      continue;
    }
    for (const [local, info] of existingImports(text)) {
      const prev = importIndex.get(local);
      if (!prev) importIndex.set(local, { ...info, file: rel });
      else if (prev.from !== info.from) importIndex.set(local, { ...prev, ambiguous: true });
    }
  }
}

const REF_DIR = path.join(repo, ".probe/reference/4.0.0/asar/out/renderer/assets");
const REF_FILE = path.join(REF_DIR, "index-BBp4hclA.js");
let refText = existsSync(REF_FILE) ? readFileSync(REF_FILE, "utf8") : "";

/** 已知别名 → 该怎么 import。键是产物里带后缀的形态（用正则匹配）。 */
const KNOWN_IMPORTS = [
  { re: /^reactExports$/, from: "react", imported: "default", local: "reactExports" },
  { re: /^jsxRuntimeExports$/, from: "react/jsx-runtime", imported: "default", local: "jsxRuntimeExports" },
  { re: /^reactDomExports$/, from: "react-dom", imported: "default", local: "reactDomExports" },
  // `cn$N` 是 rollup 给重名变量加的别名；仓库里这份叫 mergeTailwindClasses
  { re: /^cn\$\d+$/, localModule: "app/renderer/src/infra/dialog-content.jsx", named: "mergeTailwindClasses" },
];

/** 从当前文件到仓库内某个文件的相对 import 路径。 */
function relativeImport(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

/** 找出文件里所有「引用但没声明」的名字（不做类型判断，只看绑定）。 */
function unboundNames(source) {
  let ast;
  try {
    ast = parser.parse(source, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  } catch {
    return [];
  }
  const declared = new Set();
  const referenced = new Map();
  traverse(ast, {
    Declaration(p) {
      if (p.node.id?.name) declared.add(p.node.id.name);
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
    // 所有函数形态的参数解构都要收进来 —— 只处理 FunctionDeclaration 会漏掉
    // 箭头函数与函数表达式，于是 `({ height }) => …` 里的 `height` 被当成「未声明」
    Function(p) {
      if (p.node.id?.name) declared.add(p.node.id.name);
      for (const param of p.node.params) collectPattern(param, declared);
    },
    VariableDeclarator(p) {
      collectPattern(p.node.id, declared);
    },
    ClassDeclaration(p) {
      if (p.node.id?.name) declared.add(p.node.id.name);
    },
    // `catch (err) {}` 的参数不是普通声明，漏掉的话 `err` 会被当成「未声明」误报
    CatchClause(p) {
      if (p.node.param) collect(p.node.param, declared);
    },
    ReferencedIdentifier(p) {
      const name = p.node.name;
      if (!referenced.has(name)) referenced.set(name, { line: p.node.loc?.start.line ?? 0, text: "" });
    },
  });
  const lines = source.split("\n");
  const out = [];
  for (const [name, info] of referenced) {
    if (declared.has(name) || ALLOWED_GLOBALS.has(name)) continue;
    out.push({ name, line: info.line, text: (lines[info.line - 1] ?? "").trim() });
  }
  return out.sort((a, b) => a.line - b.line);
}

function collectPattern(node, out) {
  if (!node) return;
  switch (node.type) {
    case "Identifier":
      out.add(node.name);
      break;
    case "ObjectPattern":
      for (const p of node.properties) collectPattern(p.type === "RestElement" ? p.argument : p.value, out);
      break;
    case "ArrayPattern":
      for (const el of node.elements) collectPattern(el, out);
      break;
    case "AssignmentPattern":
      collectPattern(node.left, out);
      break;
    case "RestElement":
      collectPattern(node.argument, out);
      break;
    default:
      break;
  }
}

function matchDelimiter(text, open) {
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const close = pairs[text[open]];
  if (!close) return -1;
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === text[open]) depth += 1;
    else if (text[i] === close) {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/**
 * 这个文件里出现过的**带后缀**名字（`AlertDescription$1`、`cn$5`）。
 * 产物是几百个模块合进一个作用域的，短名字（`previous`、`alert`）到处重名 ——
 * 按名字从产物里捞，捞到的很可能是别的模块里的同名东西。
 * 所以只对「有后缀」或「唯一」的名字动手，其余交人工。
 */
function isSafeToExtract(name) {
  if (/\$\d+$/.test(name)) return true;
  if (/^[A-Z]/.test(name)) return true;
  // 小写名字也不是不能取 —— 只要产物里**只有一处**顶层声明，就没有认错的风险。
  // 这是「先分类再动手」的直接收益：上一轮不敢碰的短名字，现在有判据了。
  return countTopLevel(name) === 1;
}

/** 产物里这个名字有几个顶层声明。多于一处的不能用（分不清是哪个模块的）。 */
function countTopLevel(name) {
  if (!refText) return 0;
  const esc = name.replace(/\$/g, "\\$");
  return [...refText.matchAll(new RegExp(`(?:^|\\n)(?:const|let|var|function)\\s+${esc}\\b`, "g"))].length;
}

/**
 * 在产物里给「使用点」定位：拿那一行的片段去搜。
 * 我们的文件就是从产物切出来的，所以使用点的代码在产物里基本原样存在。
 * 定位到之后，只在它附近找声明 —— 否则会捞到别的模块里的同名东西。
 */
function locateInBundle(usageLine) {
  if (!refText || !usageLine) return -1;
  // 去空白后取一段足够长的片段做锚（太短的片段会到处命中）
  const compact = usageLine.replace(/\s+/g, " ").trim();
  if (compact.length < 24) return -1;
  const probes = [compact.slice(0, 60), compact.slice(0, 40), compact.slice(-60), compact.slice(-40)];
  for (const probe of probes) {
    if (probe.replace(/\s+/g, "").length < 24) continue;
    const idx = refText.indexOf(probe);
    if (idx >= 0) return idx;
  }
  // 产物里的写法可能被合并过：退化成「按空白切词后找最长的几段」
  const words = compact.split(/[^A-Za-z0-9_$]+/).filter((w) => w.length >= 6);
  for (const w of words) {
    const idx = refText.indexOf(w);
    if (idx >= 0) return idx;
  }
  return -1;
}

/** 在 `around` 附近找这个名字的顶层声明。取**最近的一处**。 */
function extractDeclNear(name, around) {
  if (!refText || !isSafeToExtract(name)) return undefined;
  const esc = name.replace(/\$/g, "\\$");
  const re = new RegExp(`(?:^|\\n)(?:const|let|var|function)\\s+${esc}\\b`, "g");
  const hits = [];
  let m;
  while ((m = re.exec(refText)) !== null) hits.push(refText[m.index] === "\n" ? m.index + 1 : m.index);
  if (!hits.length) return undefined;
  if (around < 0) {
    // 定不了位就只在全产物唯一时才用
    return hits.length === 1 ? extractAt(name, hits[0]) : undefined;
  }
  hits.sort((a, b) => Math.abs(a - around) - Math.abs(b - around));
  return extractAt(name, hits[0]);
}

/** 从产物里 `start` 处那个声明开始，取出完整的声明文本。 */
function extractAt(name, start) {
  const isFunction = /^function\b/.test(refText.slice(start, start + 9));
  if (isFunction) {
    const ps = refText.indexOf("(", start);
    const pe = matchDelimiter(refText, ps);
    if (pe < 0) return undefined;
    let i = pe;
    while (i < refText.length && /[\s:]/.test(refText[i])) i += 1;
    if (refText[i] !== "{") return refText.slice(start, pe);
    const be = matchDelimiter(refText, i);
    return be > 0 ? refText.slice(start, be) : undefined;
  }
  let depth = 0;
  for (let i = start; i < refText.length; i += 1) {
    const c = refText[i];
    if ("{([".includes(c)) depth += 1;
    else if ("})]".includes(c)) {
      depth -= 1;
      if (depth === 0 && (refText[i + 1] === ";" || c === "}")) return refText.slice(start, refText[i + 1] === ";" ? i + 2 : i + 1);
    } else if (c === ";" && depth === 0) return refText.slice(start, i + 1);
  }
  return undefined;
}

/** 这个名字在产物里所有顶层声明的位置。 */
function declPositions(name) {
  const esc = name.replace(/\$/g, "\\$");
  const re = new RegExp(`(?:^|\\n)(?:const|let|var|function)\\s+${esc}\\b`, "g");
  const out = [];
  let m;
  while ((m = re.exec(refText)) !== null) out.push(refText[m.index] === "\n" ? m.index + 1 : m.index);
  return out;
}

/**
 * 从产物里取出这个名字的声明。
 *
 * **先定位、再取**：产物是几百个模块合成一个作用域，短名字到处重名，
 * 直接按名字捞很可能捞到别的模块里的同名东西（第一版就这么干，
 * 把 vendor 里的 `function previous(...)` 当成我们文件里的 `previous` 搬了进来）。
 *
 * 定位办法：拿**使用点那一行的原文**去产物里搜 —— 我们的文件本来就是从产物切出来的，
 * 使用点的代码在产物里基本原样存在。定位到之后取**离它最近**的那处声明。
 * 定不了位时只在全产物唯一的情况下才敢用。
 */
function extractDecl(name, usageLine) {
  if (!refText || !isSafeToExtract(name)) return undefined;
  const hits = declPositions(name);
  if (!hits.length) return undefined;
  // 产物里只有一处声明：没有认错的风险，直接用（距离判据就没意义了 ——
  // 同一个模块的声明和使用点本来就可能隔很远，`rich-user-prompt-content` 里就隔了几万字符）
  if (hits.length === 1) return extractAt(name, hits[0]);
  const around = locateInBundle(usageLine);
  if (around < 0) return undefined;
  hits.sort((a, b) => Math.abs(a - around) - Math.abs(b - around));
  // 有多处候选时才要求「离使用点近」，否则多半是另一个模块里的同名东西
  if (Math.abs(hits[0] - around) > 400_000) return undefined;
  return extractAt(name, hits[0]);
}

/** 把一行 import 加到 import 块末尾。 */
function addImport(source, line) {
  const lines = source.split("\n");
  let at = 0;
  for (let i = 0; i < lines.length; i += 1) if (/^import\b/.test(lines[i])) at = i + 1;
  lines.splice(at, 0, line);
  return lines.join("\n");
}

/** 把一段顶层声明插到 import 块之后。 */
function addDecl(source, decl, sourceName) {
  const lines = source.split("\n");
  let at = 0;
  for (let i = 0; i < lines.length; i += 1) if (/^import\b/.test(lines[i])) at = i + 1;
  lines.splice(at, 0, `// 产物里这组声明在还原时丢了（构建不报错、运行时才炸）。来源：${sourceName}`, decl, "");
  return lines.join("\n");
}

let source = readFileSync(filePath, "utf8");
const unresolved = new Set();
let rounds = 0;

for (; rounds < maxRounds; rounds += 1) {
  const pending = unboundNames(source).filter((u) => !unresolved.has(u.name));
  if (!pending.length) break;
  let progressed = 0;
  for (const { name, text } of pending) {
    // 优先级 2：我们自己这棵树里已经有这个名字的 import —— 把那条 import 抄过来
    //（`X$N` 是 rollup 为避让重名加的后缀，原模块里就是 `X`）
    const base = name.replace(/\$\d+$/, "");
    const imported = importIndex.get(name) ?? (base !== name ? importIndex.get(base) : undefined);
    if (imported && !imported.ambiguous) {
      const from = imported.from.startsWith(".")
        ? relativeImport(filePath, path.resolve(path.dirname(path.join(repo, imported.file)), imported.from))
        : imported.from;
      const spec = imported.imported === "default" ? name : `${imported.imported} as ${name}`;
      source = addImport(source, `import ${imported.imported === "default" ? "" : "{ "}${spec}${imported.imported === "default" ? "" : " }"} from "${from}";`);
      console.log(`  import ${name} ← ${from}（照抄同树里的写法）`);
      progressed += 1;
      continue;
    }
    // 优先级 3：我们自己这棵树里有这个名字的导出 —— 从那儿 import
    const exported = exportIndex.get(name) ?? (base !== name ? exportIndex.get(base) : undefined);
    if (exported && exported.length === 1) {
      const from = relativeImport(filePath, path.join(repo, exported[0].file));
      source = addImport(source, `import { ${base} as ${name} } from "${from}";`);
      console.log(`  import ${name} ← ${from}（同树里的导出）`);
      progressed += 1;
      continue;
    }

    const known = KNOWN_IMPORTS.find((k) => k.re.test(name));
    if (known) {
      const line = known.localModule
        ? `import { ${known.named} as ${name} } from "${relativeImport(filePath, path.join(repo, known.localModule))}";`
        : `import ${name} from "${known.from}";`;
      source = addImport(source, line);
      console.log(`  import ${name} ← ${known.localModule ?? known.from}`);
      progressed += 1;
      continue;
    }
    const decl = extractDecl(name, text);
    if (decl && !new RegExp(`(?:^|\\n)(?:const|let|var|function)\\s+${name.replace(/\$/g, "\\$")}\\b`).test(source)) {
      source = addDecl(source, decl, "index-BBp4hclA.js");
      console.log(`  搬回 ${name}（${decl.length} 字符）`);
      progressed += 1;
      continue;
    }
    unresolved.add(name);
    console.log(`  无解 ${name}（产物里没有顶层声明，需要人工判断）`);
  }
  if (!progressed) break;
}

if (!dryRun && source !== readFileSync(filePath, "utf8")) writeFileSync(filePath, source, "utf8");
console.log(
  `\n${path.relative(repo, filePath)}: ${rounds} 轮，${
    dryRun ? "（dry-run，未写入）" : "已写入"
  }${unresolved.size ? `；无解 ${unresolved.size} 个：${[...unresolved].slice(0, 10).join(" ")}` : ""}`,
);
