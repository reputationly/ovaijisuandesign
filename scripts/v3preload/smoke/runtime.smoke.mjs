#!/usr/bin/env node
/**
 * 脱离 React 的冒烟测试（第 177 轮，用户方案第 3 步）。
 *
 * 目的：把「调用阶段的 ReferenceError」和「构造时卡死」在几秒内暴露，
 * 不必每次跑完整门禁。
 *
 * 做法：把 workspace-structure-runtime.js 复制成临时入口，**把它的 import
 * 全部替换成内置桩**，这样不会把整个应用图拉进 bundle。
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

const REPO = process.cwd();
const ESBUILD = path.join(REPO, "node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild");
const SRC = path.join(REPO, "app/renderer/src/workspace/workspace-structure-runtime.js");
const WORKDIR = path.dirname(SRC);
const ENTRY = path.join(WORKDIR, ".smoke-entry.mjs");
const BUNDLE = path.join(WORKDIR, ".smoke-bundle.mjs");

let code = readFileSync(SRC, "utf8");

// 1) 去掉所有 import，替换成内置桩
code = code.replace(/^import\s+\{[^}]*\}\s+from\s+"[^"]+";\s*$/gm, (line) => {
  const inner = line.slice(line.indexOf("{") + 1, line.indexOf("}"));
  const names = inner.split(",").map((s) => s.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean);
  return names.map((n) => `const ${n} = __stub(${JSON.stringify(n)});`).join("\n");
});
// GatewayNotReadyError 需要能 new
code = code.replace(/const GatewayNotReadyError = __stub\("GatewayNotReadyError"\);/,
  "class GatewayNotReadyError extends Error {}");
code = code.replace(/^export\s*\{[^}]*\};?\s*$/gm, "");

const harness = `
const __stub = (name) => new Proxy(function () {}, {
  get: (_t, k) => (k === "then" ? undefined : __stub(name + "." + String(k))),
  apply: () => undefined,
  construct: () => ({}),
});
`;

writeFileSync(ENTRY, harness + code + "\nexport { createWorkspaceStructureRuntime };\n", "utf8");

try {
  execFileSync(ESBUILD, [ENTRY, "--bundle", "--format=esm", "--platform=node",
    "--outfile=" + BUNDLE, "--loader:.js=jsx", "--log-level=error"], { stdio: "pipe" });
} catch (e) {
  console.log(`✗ 打包失败：${String(e.stderr ?? e).slice(0, 300)}`);
  rmSync(ENTRY, { force: true }); process.exit(1);
}

// 2) 最小运行环境
const anyFn = () => new Proxy(function () {}, { get: () => anyFn(), apply: () => undefined });
globalThis.hilo = new Proxy({}, { get: (_t, k) => {
  if (k === "ipcRenderer") return { send() {}, invoke: async () => undefined, on() {}, once() {}, removeListener() {}, removeAllListeners() {} };
  return anyFn();
} });
globalThis.window = globalThis;
globalThis.document = { createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), head: { appendChild() {} }, querySelector: () => null, addEventListener() {}, removeEventListener() {} };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.location = { href: "http://localhost/", search: "", hash: "", pathname: "/", origin: "http://localhost" };
globalThis.history = { state: null, pushState() {}, replaceState() {} };
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };

let mod, importErr = null;
try { mod = await import("file://" + BUNDLE.split(path.sep).join("/")); }
catch (e) { importErr = e; }

rmSync(ENTRY, { force: true });
rmSync(BUNDLE, { force: true });

if (importErr) { console.log(`✗ 导入阶段抛错：${String(importErr.message ?? importErr).slice(0, 240)}`); process.exit(1); }

const fn = mod.createWorkspaceStructureRuntime;
if (typeof fn !== "function") { console.log("✗ 没有导出 createWorkspaceStructureRuntime"); process.exit(1); }

const fakeQC = { setQueryData() {}, invalidateQueries() {}, getQueryData() {}, mount() {}, unmount() {} };
const fakeReq = async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
const fakeHost = () => ({ claim: "c", instanceId: "i", generation: 1 });

let rt = null, err = null;
const t0 = Date.now();
try {
  rt = fn({ workspaceId: "w", instanceId: "i", userId: "u", accountKey: "personal", recoveryAccountKey: "personal" },
    fakeQC, fakeReq, fakeHost, undefined);
} catch (e) { err = e; }
const dt = Date.now() - t0;

if (err) {
  const missing = /^(\w+) is not defined/.exec(String(err.message))?.[1];
  console.log(`✗ 调用抛错（${dt}ms）：${String(err.message).slice(0, 200)}`);
  if (missing) console.log(`  缺失标识符：${missing}`);
  process.exit(1);
}
if (dt > 3000) { console.log(`✗ 构造耗时 ${dt}ms，疑似卡死`); process.exit(1); }

const keys = rt && typeof rt === "object" ? Object.keys(rt) : [];
console.log(`✓ 构造成功（${dt}ms）`);
console.log(`  返回字段：${keys.join(", ") || "(空)"}`);
for (const k of ["workbench", "updateConnection", "dispose"]) console.log(`  ${k}: ${typeof rt?.[k]}`);
try { rt?.dispose?.(); console.log("✓ dispose 正常"); }
catch (e) { console.log(`✗ dispose 抛错：${String(e).slice(0, 160)}`); }
