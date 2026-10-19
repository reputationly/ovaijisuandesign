// 读我们的源码树：每个文件声明了什么、导出了什么、引用了哪些当前没定义的标识符。
// 三方合并和「新语句建家」都要用这一套判断，所以抽出来放一处，避免两边各写一份慢慢走偏。
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../decompile/package.json"));
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");

export const SOURCE_EXT = [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"];

/** 语言/环境自带的全局名，不算「未定义」。 */
export const GLOBALS = new Set(
  "undefined null true false this window document console Math JSON Object Array String Number Boolean Promise Set Map WeakMap WeakSet Date RegExp Error TypeError RangeError SyntaxError Symbol BigInt globalThis performance requestAnimationFrame cancelAnimationFrame setTimeout clearTimeout setInterval clearInterval queueMicrotask structuredClone fetch Headers Request Response URL URLSearchParams Blob File FormData AbortController AbortSignal Intl crypto navigator location localStorage sessionStorage HTMLElement Element Node NodeList Event CustomEvent MutationObserver ResizeObserver IntersectionObserver Image Audio TextEncoder TextDecoder ArrayBuffer SharedArrayBuffer Uint8Array Uint16Array Uint32Array Int8Array Int16Array Int32Array Float32Array Float64Array BigInt64Array DataView atob btoa process require import arguments module exports globalIterator Reflect Proxy WeakRef FinalizationRegistry DOMParser XMLSerializer CSS CanvasRenderingContext2D OffscreenCanvas createImageBitmap FileReader getComputedStyle matchMedia scrollTo open close alert confirm prompt print".split(
    " ",
  ),
);

// 浏览器/Node 自带的构造函数和工具函数，遗漏一个就会在「未定义标识符」清单里多出一条噪声。
for (const name of "encodeURIComponent decodeURIComponent encodeURI decodeURI parseInt parseFloat isNaN isFinite Infinity NaN escape unescape HTMLInputElement HTMLTextAreaElement HTMLDivElement HTMLButtonElement HTMLCanvasElement HTMLImageElement HTMLVideoElement HTMLAudioElement HTMLAnchorElement HTMLSelectElement HTMLFormElement SVGElement DOMException Path2D ClipboardItem ClipboardEvent DragEvent KeyboardEvent MouseEvent PointerEvent WheelEvent TouchEvent InputEvent FocusEvent MediaQueryList ImageData ResizeObserverEntry IntersectionObserverEntry WebSocket EventSource Worker SharedWorker MessageChannel MessagePort BroadcastChannel AudioContext OfflineAudioContext GainNode MediaRecorder MediaStream MediaStreamTrack RTCPeerConnection FontFace MutationRecord PerformanceObserver TextMetrics CSSStyleDeclaration EventTarget CustomElementRegistry requestIdleCallback".split(" ")) {
  GLOBALS.add(name);
}
// 还漏过这几个，扫描时它们被当成「未定义引用」报了噪声
// 主进程 preload 注入到渲染层的全局（`hilo` 是它的主入口，`__HILO_*__` 是各段配置）。
for (const name of ["hilo", "__HILO_AUTH__", "__HILO_CONFIG__", "__HILO_PLATFORM__", "__HILO_UPDATER_BOOTSTRAP__", "__HILO_V3_NATIVE_HOST__", "__HILO_V3_PORT_HOST__", "__TEST_DRIVER_IPC__"]) {
  GLOBALS.add(name);
}

for (const name of "DOMRect DOMRectReadOnly DOMException DataTransfer DragEvent Notification ImageBitmap PopStateEvent HashChangeEvent StorageEvent PageTransitionEvent BeforeUnloadEvent ResizeObserverEntry IntersectionObserverEntry CustomEvent CloseEvent ErrorEvent ProgressEvent GPUTextureUsage GPUBufferUsage GPUMapMode GPUShaderStage GPUDevice GPUAdapter GPUQueue GPUBuffer GPUTexture GPURenderPipeline GPUShaderModule GPUCommandEncoder GPURenderPassEncoder GPUBindGroup GPUBindGroupLayout GPUSampler GPUTextureView GPUBufferBinding Uint8ClampedArray Float16Array PromiseRejectionEvent MessageEvent StorageManager LockManager NavigatorUAData PerformanceEntry TaskController TaskPriorityChangeEvent self screen Function Generator AsyncFunction AsyncGenerator Symbol BigInt WeakRef OffscreenCanvasRenderingContext2D AudioWorkletNode AudioWorkletGlobalScope Worklet SharedArrayBuffer Atomics WebAssembly structuredClone crypto".split(" ")) {
  GLOBALS.add(name);
}

/** 把解构 / 默认值 / rest 里的标识符都收进 declared。 */
export function collectPattern(id, declared) {
  if (!id) return;
  if (t.isIdentifier(id)) declared.add(id.name);
  else if (t.isObjectPattern(id)) for (const pr of id.properties) collectPattern(pr.value ?? pr.argument, declared);
  else if (t.isArrayPattern(id)) for (const el of id.elements) collectPattern(el, declared);
  else if (t.isRestElement(id)) collectPattern(id.argument, declared);
  else if (t.isAssignmentPattern(id)) collectPattern(id.left, declared);
}

export function parseModule(text) {
  return parse(text, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true, tokens: true });
}

/** 已有的 import：本地名 → 来源模块 + 原名。 */
export function existingImports(text) {
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

/** 文件顶层声明了哪些名字（不含 import）。 */
export function declaredNames(text) {
  const ast = parseModule(text);
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

/** 整个文件的自由标识符：文件里没声明、也没 import、也不是全局的才算。 */
export function freeIdentifiers(code) {
  const ast = parseModule(code);
  const declared = new Set();
  const used = new Set();
  traverse(ast, {
    VariableDeclarator(p) {
      collectPattern(p.node.id, declared);
    },
    Function(p) {
      for (const param of p.node.params) collectPattern(param, declared);
      if (p.node.id) declared.add(p.node.id.name);
    },
    CatchClause(p) {
      if (p.node.param) collectPattern(p.node.param, declared);
    },
    ClassDeclaration(p) {
      if (p.node.id) declared.add(p.node.id.name);
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

/** 列出源码树里的文件（跳过手工维护的第三方 fork）。 */
export function listSourceFiles(root) {
  const out = [];
  const walk = (dir, rel = "") => {
    for (const name of readdirSync(dir).sort()) {
      const abs = path.join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      const st = statSync(abs);
      if (st.isDirectory()) {
        if (/^(vendor-fork|vendor-inline)$/.test(name)) continue;
        walk(abs, r);
      } else if (SOURCE_EXT.includes(path.extname(name)) && st.size < 2 * 1024 * 1024) out.push(r);
    }
  };
  walk(root);
  return out;
}

/** 全树导出索引：导出的名字 → 声明它的文件（记的是**导出名**）。 */
export function buildExportIndex(files, read) {
  const index = new Map();
  for (const rel of files) {
    const text = read(rel);
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

/**
 * 全树的「本地名 → 从哪 import」索引。
 *
 * 为什么需要：新语句里会引用第三方符号（prosemirror 的 `TableMap`、zod 的 `object$1` …），
 * 这些在我们的源码里是从 npm 包导入的，`buildExportIndex` 只覆盖我们自己的文件，接不上。
 * 但同一个符号在别的文件里**已经被 import 过**，把那条 import 抄过来就行 —— 准确且不用猜包名。
 * 同一个本地名在不同文件里来自不同模块时记为歧义，不硬选。
 */
export function buildImportIndex(files, read) {
  const index = new Map();
  for (const rel of files) {
    let text;
    try {
      text = read(rel);
    } catch {
      continue;
    }
    for (const [local, info] of existingImports(text)) {
      if (!index.has(local)) index.set(local, { ...info, sources: new Set([info.from]) });
      else index.get(local).sources.add(info.from);
    }
  }
  for (const [local, info] of index) if (info.sources.size > 1) index.set(local, { ...info, ambiguous: true });
  return index;
}

/**
 * 第三方包的「符号 → 包名」索引。
 *
 * 为什么要它：新语句里会引用第三方符号（prosemirror-tables 的 `TableMap`、framer-motion 的内部模块…）。
 * 这些包**已经在依赖里**，只是我们的源码还没 import 过那个名字，所以 `buildImportIndex` 接不上。
 * 早先误判成「4.0.0 新内联了第三方库」，就是因为用 `grep -r` 查 node_modules ——
 * pnpm 用的是符号链接，`grep -r` 默认不跟进目标，查了个空。改成读 package.json 再解析真实入口。
 */
export function buildNodeModulesIndex(packageRoot) {
  const index = new Map(); // 导出名 → { package: name, entry }
  // 展开 scope 目录：`@tiptap/core` 在 node_modules 里是 `@tiptap/` 下面的一层，
  // 早先只把 `@tiptap` 当包名去读 package.json（读不到就 continue），
  // 结果**所有 scoped 包都被整片跳过** —— `mergeAttributes`、`Extension`
  // 这些明明在依赖里的符号全查成「没有」。
  const dirs = [];
  try {
    for (const name of readdirSync(packageRoot)) {
      if (name.startsWith(".")) continue;
      const abs = path.join(packageRoot, name);
      if (name.startsWith("@")) {
        try {
          for (const sub of readdirSync(abs)) if (!sub.startsWith(".")) dirs.push(`${name}/${sub}`);
        } catch {
          // 读不了就跳过这个 scope
        }
        continue;
      }
      dirs.push(name);
    }
  } catch {
    return index;
  }
  const EXPORT_NAMED = /export\s*\{([^}]*)\}/g;
  const EXPORT_DECL = /export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/g;
  const CJS_ASSIGN = /(?:exports|module\.exports)\.([A-Za-z_$][\w$]*)\s*=/g;
  for (const name of dirs) {
    const dir = path.join(packageRoot, name);
    let entries = [];
    let pkgName = name;
    try {
      const pj = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
      pkgName = pj.name ?? name;
      const cands = [];
      const fromExports = (v) => {
        if (typeof v === "string") cands.push(v);
        else if (v && typeof v === "object") {
          for (const key of ["import", "module", "require", "default", "."]) if (v[key]) fromExports(v[key]);
          for (const sub of Object.values(v)) if (sub && typeof sub === "object") fromExports(sub);
        }
      };
      if (pj.exports) fromExports(pj.exports);
      if (pj.module) cands.push(pj.module);
      if (pj.main) cands.push(pj.main);
      // ESM 和 CJS 两份入口的导出名不一定一样（`isCellSelection` 就只在 dist/index.js 里），
      // 所以候选全收，不能碰到第一个文件就停。
      cands.push("index.js", "index.mjs", "dist/index.js", "dist/index.mjs", "dist/index.cjs", "dist/index.umd.js");
      entries = cands
        .map((c) => path.join(dir, c))
        .filter((p) => {
          try {
            return statSync(p).isFile();
          } catch {
            return false;
          }
        })
        .filter((p, i, arr) => arr.indexOf(p) === i)
        .slice(0, 4);
    } catch {
      continue;
    }
    if (!entries.length) continue;
    const add = (sym) => {
      if (!index.has(sym)) index.set(sym, { package: pkgName });
    };
    // 入口文件常常只是 `export * from "./xxx.js"` 的转发，只读入口会漏掉大量符号
    //（prosemirror-tables 的 `checkTextSelection` 就是这么漏的）。跟着相对再导出走几层。
    const seen = new Set();
    const queue = entries.map((e) => ({ file: e, depth: 0 }));
    const FOLLOW = /export\s*(?:\*|\{[^}]*\})\s*from\s*["'](\.{1,2}\/[^"']+)["']/g;
    while (queue.length) {
      const { file: cur, depth } = queue.shift();
      if (seen.has(cur)) continue;
      seen.add(cur);
      let text;
      try {
        if (statSync(cur).size > 8 * 1024 * 1024) continue;
        text = readFileSync(cur, "utf8");
      } catch {
        continue;
      }
      for (const m of text.matchAll(EXPORT_NAMED)) {
        for (const part of m[1].split(",")) {
          const pieces = part.trim().split(/\s+as\s+/).map((x) => x.trim());
          const exported = pieces[pieces.length - 1];
          if (/^[A-Za-z_$][\w$]*$/.test(exported)) add(exported);
        }
      }
      for (const m of text.matchAll(EXPORT_DECL)) add(m[1]);
      for (const m of text.matchAll(CJS_ASSIGN)) add(m[1]);
      if (depth >= 3 || seen.size > 24) continue;
      for (const m of text.matchAll(FOLLOW)) {
        const target = path.resolve(path.dirname(cur), m[1]);
        for (const cand of [target, `${target}.js`, `${target}.mjs`, `${target}.cjs`, path.join(target, "index.js")]) {
          try {
            if (statSync(cand).isFile()) {
              queue.push({ file: cand, depth: depth + 1 });
              break;
            }
          } catch {
            continue;
          }
        }
      }
    }
  }
  return index;
}

/**
 * node_modules 里出现过的**全部标识符**（不只是导出的）。
 *
 * 用途是分类，不是解析：新语句如果引用了某个包的**内部**名字（`isCellSelection`、`checkTextSelection`
 * 这类没导出的函数），那这条语句本身就是那份第三方代码被内联进来的，不是应用代码。
 * 只查 exported 是看不出来的 —— 必须扫全量标识符。
 *
 * 只扫小于 1 MB 的文件并设总字节上限，够用且不会把内存吃掉。
 */
export function collectPackageIdentifiers(packageRoot, { maxBytes = 160 * 1024 * 1024, maxFileBytes = 1024 * 1024 } = {}) {
  const ids = new Set();
  let budget = maxBytes;
  const queue = [packageRoot];
  while (queue.length && budget > 0) {
    const dir = queue.shift();
    let names;
    try {
      names = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      const abs = path.join(dir, name);
      let st;
      try {
        st = statSync(abs);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        queue.push(abs);
        continue;
      }
      if (!/\.(m?js|cjs|ts)$/.test(name) || st.size > maxFileBytes) continue;
      if (budget - st.size < 0) return ids;
      budget -= st.size;
      let text;
      try {
        text = readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      for (const m of text.matchAll(/[A-Za-z_$][\w$]*/g)) ids.add(m[0]);
    }
  }
  return ids;
}

/** 在一段代码里把一个标识符改名（AST 级，不碰属性名和 JSX 属性名）。 */
export function renameIdentifier(code, from, to) {
  if (from === to) return code;
  const ast = parseModule(code);
  traverse(ast, {
    Identifier(p) {
      if (p.parentPath.isMemberExpression() && p.key === "property" && !p.parent.computed) return;
      if (p.parentPath.isObjectProperty() && p.key === "key" && !p.parent.computed) return;
      if (p.parentPath.isJSXAttribute() && p.key === "name") return;
      if (p.parentPath.isJSXMemberExpression() && p.key === "property") return;
      if (p.node.name === from) p.node.name = to;
    },
  });
  const generate = require("@babel/generator").default;
  return generate(ast, { comments: true, jsescOption: { minimal: true } }).code;
}

/** 两个源文件之间的相对 import 路径。 */
export function relativeImport(fromRel, toRel) {
  const rel = path.posix.relative(path.posix.dirname(fromRel), toRel);
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/**
 * 在最后一条 import 之后插入新的 import；同一模块已 import 过就并进去。
 *
 * `needed` 的每项可以是字符串，也可以是 `{ imported, local }`。
 * 别名必须写成 `import { imported as local }` —— 早先只写本地名，
 * 生成了 `import { tags$1 } from "@lezer/highlight"`，rollup 直接报 not exported。
 */
export function insertImports(text, needed) {
  let out = text;
  const appended = [];
  const spec = (x) => (typeof x === "string" ? x : x.imported === x.local ? x.imported : `${x.imported} as ${x.local}`);
  for (const [from, names] of [...needed].sort(([a], [b]) => a.localeCompare(b))) {
    const unique = [...new Set(names.map(spec))].sort();
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existing = new RegExp(`^[ \\t]*import\\s*\\{([^}]*)\\}\\s*from\\s*["']${escaped}["'];`, "m");
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
