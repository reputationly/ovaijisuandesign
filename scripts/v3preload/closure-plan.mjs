#!/usr/bin/env node
/**
 * 把「设施层」在 4.0.0 主 bundle 里的完整闭包**一次算到不动点**（第 172 轮）。
 *
 * 停止边界 = 树里已有的名字（不再往下追）。
 * 输出写成仓库里的固定清单 `scripts/v3preload/closure-manifest.json`：
 * **清单入库，以后只减不增。**
 *
 * 用法：
 *   node scripts/v3preload/closure-plan.mjs           # 打印摘要
 *   node scripts/v3preload/closure-plan.mjs --write   # 同时写清单
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const REPO = process.cwd();
const require = createRequire(path.join(REPO, "scripts/decompile/package.json"));
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const SRC = path.join(REPO, "app/renderer/src");
const BUNDLE = path.join(REPO, ".probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js");
const ROWS = path.join(REPO, ".probe/refdiff/toplevel-4.0.0.json");
const SET = process.argv.includes("--resource") ? "resource" : process.argv.includes("--task") ? "task" : process.argv.includes("--shell") ? "shell" : "structure";
const MANIFEST = path.join(REPO, SET === "resource"
  ? "scripts/v3preload/closure-manifest-resource.json"
  : SET === "task" ? "scripts/v3preload/closure-manifest-task.json"
  : SET === "shell" ? "scripts/v3preload/closure-manifest-shell.json"
  : "scripts/v3preload/closure-manifest.json");
const OUT_MANIFEST = process.argv.includes("--extend")
  ? path.join(REPO, "scripts/v3preload/closure-manifest-extended.json")
  : MANIFEST;

// 第 4 项（资源视图）的种子。第一份清单（结构订阅）已入库，
// 这里换一批种子重新算，输出到 closure-manifest-resource.json。
const TASK_SEEDS = [
  "parseTaskServerMessage",
  "parseEditorServerMessage",
  "mapProjectTaskSnapshot",
];
const SHELL_SEEDS = [
  "WorkspaceCompositionActions",
  "WorkspaceStructurePresentation",
];
const RESOURCE_SEEDS = [
  "StructureDirectory",
  "StructureContents",
  "ModuleErrorBoundary",
];
const STRUCTURE_SEEDS = [
  "createWorkspaceStructureRuntime",
  "useWorkspaceStructureEvents",
  "createTaskSubscriptionNegotiation",
  "WorkspaceStructureProvider",
];
const BASE_SEEDS = SET === "resource" ? RESOURCE_SEEDS : SET === "task" ? TASK_SEEDS : SET === "shell" ? SHELL_SEEDS : STRUCTURE_SEEDS;

// 第 174 轮：第二遍把上一份清单里 status != restored 的名字也当种子，
// 这样「已还原项的邻居」也会被追到，闭包才真正闭合。
const EXTEND = process.argv.includes("--extend");
const SEEDS = (() => {
  if (!EXTEND) return BASE_SEEDS;
  const prev = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const extra = prev.items.filter((x) => x.status !== "restored").flatMap((x) => x.names);
  return [...new Set([...BASE_SEEDS, ...extra])];
})();

const bundle = readFileSync(BUNDLE, "utf8");
const rows = JSON.parse(readFileSync(ROWS, "utf8")).rows;
const rowOf = new Map();
for (const r of rows) for (const n of r.names ?? []) if (!rowOf.has(n)) rowOf.set(n, r);

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const f = path.join(d, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(f);
    return /\.(m?js|jsx)$/.test(e.name) ? [f] : [];
  });

const tree = new Set();
const treeLoose = new Set();
// 第 172 轮：npm 依赖的导出也算「树里已有」，否则闭包会把库代码当应用代码算进来
const NPM_PROVIDED = {
  "fractional-indexing": ["generateKeyBetween", "generateNKeysBetween", "incrementInteger",
    "decrementInteger", "validateOrderKey", "midpoint", "BASE_62_DIGITS", "BASE_52_DIGITS",
    "digitIndexCache"],
};
for (const names of Object.values(NPM_PROVIDED)) for (const n of names) { tree.add(n); treeLoose.add(n); }
const DRAFT = /workspace-(facilities|structure-events|structure-runtime)\.js$/;
for (const f of walk(SRC)) {
  if (/pdf\.worker|wasm-/.test(f)) continue;
  if (DRAFT.test(f)) continue;              // 本轮新加的三个设施文件不计入「树里已有」
  let ast;
  try { ast = parser.parse(readFileSync(f, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: true }); } catch { continue; }
  for (const n of ast.program.body) {
    const d = n.type.startsWith("Export") && n.declaration ? n.declaration : n;
    const ns = d.id?.name ? [d.id.name] : d.type === "VariableDeclaration" ? d.declarations.map((v) => v.id.name).filter(Boolean) : [];
    for (const x of ns) { tree.add(x); treeLoose.add(x.replace(/\$\d+$/, "")); }
  }
}

const freeCache = new Map();
function free(r) {
  if (freeCache.has(r.i)) return freeCache.get(r.i);
  const text = bundle.slice(r.start, r.end);
  const out = new Set();
  try {
    const ast = parser.parse(text, { sourceType: "module", plugins: ["jsx"], errorRecovery: true, allowUndeclaredExports: true });
    traverse(ast, { Program(p) { for (const [name] of Object.entries(p.scope.globals)) out.add(name); } });
  } catch {
    for (const m of text.matchAll(/(?<![\w$.])[A-Za-z_$][\w$]*/g)) out.add(m[0]);
  }
  freeCache.set(r.i, out);
  return out;
}

function closure(mode) {
  const stop = (n) => (mode === "strict" ? tree.has(n) : tree.has(n) || treeLoose.has(n.replace(/\$\d+$/, "")));
  const need = new Map();
  let ring = 0;
  let frontier = SEEDS.map((s) => rowOf.get(s)).filter(Boolean);
  for (const s of frontier) need.set(s.i, 0);
  const perRing = [frontier.length];
  while (frontier.length) {
    ring++;
    const next = [];
    for (const r of frontier) for (const n of free(r)) {
      if (stop(n)) continue;
      const rr = rowOf.get(n);
      if (!rr || need.has(rr.i)) continue;
      need.set(rr.i, ring);
      next.push(rr);
    }
    if (next.length) perRing.push(next.length);
    frontier = next;
  }
  const reached = [...need.entries()].map(([i, ring2]) => ({ ...rows[i], ring: ring2 })).sort((a, b) => a.i - b.i);
  return { reached, perRing };
}

const strict = closure("strict");
const loose = closure("loose");
const lines = strict.reached.reduce((a, r) => a + (bundle.slice(r.start, r.end).match(/\n/g)?.length ?? 0) + 1, 0);

// 现有三个设施文件里已实现的
const draftCode = ["workspace-facilities.js", "workspace-structure-events.js", "workspace-structure-runtime.js"]
  .map((f) => { try { return readFileSync(path.join(SRC, "workspace", f), "utf8"); } catch { return ""; } })
  .join("\n");
const isStub = (l) => /=>\s*(undefined|null|\{\s*\}|\(\{\}\))\s*;?$|占位|stub/i.test(l ?? "");
const statusOf = (name) => {
  const esc = name.replace(/\$/g, "\\$");
  const m = draftCode.match(new RegExp(`^(?:export )?(?:async )?(?:function\\*?|const|let|var|class)\\s+${esc}(?![\\w$])[^\\n]*`, "m"));
  if (m) return isStub(m[0]) ? "stub" : "restored";
  return "todo";
};

const items = strict.reached.map((r) => ({
  i: r.i,
  names: r.names ?? [],
  start: r.start,
  end: r.end,
  ring: r.ring,
  status: statusOf(r.names?.[0] ?? ""),
}));

// 连续区间分组：相邻 row 索引差 ≤40 视为同一段（同属上游一个模块）
const GAP = Number(process.env.GAP ?? 40);
const segments = [];
for (const it of items) {
  const last = segments.at(-1);
  if (last && it.i - last.lastI <= GAP) { last.items.push(it); last.lastI = it.i; }
  else segments.push({ items: [it], lastI: it.i });
}

const byStatus = {};
for (const it of items) byStatus[it.status] = (byStatus[it.status] ?? 0) + 1;

console.log(`${EXTEND ? "[扩展]" : "[基础]"} 闭包（严格口径）: ${items.length} 个声明，约 ${lines} 行`);
console.log(`每圈新增: ${strict.perRing.join(" → ")}`);
console.log(`宽松口径: ${loose.reached.length}（两者接近说明停止边界稳定）`);
console.log(`状态: ${Object.entries(byStatus).map(([k, v]) => `${k} ${v}`).join(" / ")}`);
console.log(`\n连续区间 ${segments.length} 段（前 6）:`);
for (const s of segments.slice(0, 6)) {
  const a = s.items[0], b = s.items.at(-1);
  console.log(`  ${String(a.i).padStart(6)}–${String(b.i).padEnd(6)} ${String(s.items.length).padStart(3)} 个  行 ${a.start}–${b.end}  ${a.names[0] ?? ""}`);
}

if (process.argv.includes("--write")) {
  writeFileSync(OUT_MANIFEST, JSON.stringify({ generatedFor: "4.0.0", seeds: SEEDS, total: items.length, lines, perRing: strict.perRing, byStatus, items, segments: segments.map((s) => ({ from: s.items[0].i, to: s.items.at(-1).i, start: s.items[0].start, end: s.items.at(-1).end, count: s.items.length })) }, null, 1), "utf8");
  console.log(`\n已写入 ${path.relative(REPO, OUT_MANIFEST)}`);
}
