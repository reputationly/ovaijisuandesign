#!/usr/bin/env node
/**
 * P4：检查主树与 canvas-v3 的「单向 + 只懒加载」约束。
 *
 * 三条规则：
 *   R1 主树**不允许静态 import** `canvas-v3/canvas-area-v3.js`（只能 React.lazy / 动态 import）
 *   R2 `canvas-area-v3.js` **只允许**从 `main-exports.js` + npm + 少量已知模块导入
 *   R3 canvas-v3 内部不允许出现 import 环
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = "app/renderer/src";
const V3DIR = path.join(ROOT, "canvas-v3");
const AREA = path.join(V3DIR, "canvas-area-v3.js");

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = path.join(d, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(js|jsx)$/.test(e)) files.push(p);
  }
})(ROOT);

let failed = 0;
const fail = (msg) => { console.log(`✗ ${msg}`); failed++; };

// ---- R1 ----
for (const f of files) {
  if (f === AREA) continue;
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/^import\s[^;]*from\s*"([^"]*canvas-area-v3[^"]*)";/gm))
    fail(`R1 ${f} 静态 import 了 canvas-area-v3（只允许 React.lazy）`);
  for (const m of src.matchAll(/^import\s*"([^"]*canvas-area-v3[^"]*)";/gm))
    fail(`R1 ${f} 副作用 import 了 canvas-area-v3`);
}
console.log("R1 主树对 canvas-area-v3 只允许懒加载：检查完毕");

// ---- R2 ----
const areaSrc = readFileSync(AREA, "utf8");
const ALLOWED = [/^\.\/main-exports\.js$/, /^\.\/(clip-media-id|use-window-chrome|use-plugin-navigate)[^"]*$/, /^[a-z@][^./]/];
// 已知例外：这些名字在 main-exports 里解析不出来（58 个，多为 bundle 内部改名/局部泄漏），
// 暂时直接从原模块取。清单见 docs/4.0.0-v3-boundary.md「未解析」一节。
const KNOWN_EXCEPTIONS = new Set([
  "../generation/missing-asset-card.jsx",
  "../canvas/separator.jsx",
  "../infra/dialog-content.jsx",
  "../media-editing/customize-toolbar-dialog-2.jsx",
  "../media-editing/package.jsx",
  "../vendor-fork/xyflow/react/index.js",
  "../assets/credit-query-keys.jsx",
  "../generation/select-content.jsx",
  "../../../packages/protocol/src/project-v3/task-mappers.ts",
  // 下面 3 个来自「逐文件补缺」：canvas-area-v3 原先的 17 个缺口里有 5 个能解析，
  // 但它们不在 chunk 的 import 绑定里，所以不属于 main-exports 边界。
  "./project-resource-tags.js",
  "../workspace/context-menu-content.jsx",
  "../media-editing/lucide-icon-wraps.js",
  "./ui-components.js",
]);
for (const m of areaSrc.matchAll(/^import\s[^;]*from\s*"([^"]+)";/gm)) {
  const src = m[1];
  if (KNOWN_EXCEPTIONS.has(src)) continue;
  if (!ALLOWED.some((re) => re.test(src))) fail(`R2 canvas-area-v3 从非边界模块导入：${src}`);
}
console.log("R2 canvas-area-v3 只从 main-exports / npm / 已知 chunk 导入：检查完毕");

// ---- R3 环检测 ----
const graph = new Map();
for (const f of files.filter((x) => x.startsWith(V3DIR))) {
  const src = readFileSync(f, "utf8");
  const deps = [];
  for (const m of src.matchAll(/^import\s[^;]*from\s*"(\.\/[^"]+)";/gm)) deps.push(path.join(V3DIR, m[1]));
  graph.set(f, deps);
}
const WHITE = 0, GRAY = 1, BLACK = 2;
const color = new Map([...graph.keys()].map((k) => [k, WHITE]));
const stack = [];
function dfs(n) {
  color.set(n, GRAY); stack.push(n);
  for (const d of graph.get(n) ?? []) {
    if (!color.has(d)) continue;
    const c = color.get(d);
    if (c === GRAY) {
      const i = stack.indexOf(d);
      fail(`R3 import 环：${[...stack.slice(i), d].map((x) => path.basename(x)).join(" → ")}`);
    } else if (c === WHITE) dfs(d);
  }
  stack.pop(); color.set(n, BLACK);
}
for (const n of graph.keys()) if (color.get(n) === WHITE) dfs(n);
console.log(`R3 canvas-v3 内部 import 环：检查完毕（${graph.size} 个模块）`);

console.log(failed === 0 ? "\n✓ P4 约束全部满足" : `\n✗ ${failed} 处违规`);
process.exit(failed === 0 ? 0 : 1);
