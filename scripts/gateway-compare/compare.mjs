/**
 * gateway 协议对比（第 243 轮，用户方案硬规则 5 的第一个增量）。
 *
 * 做法：把参照 gateway 的实测响应存成固定夹具（reference-fixtures.json），
 * 然后启动**我们的** gateway，打同一组请求，逐字段比较。
 *
 * 不需要参照 gateway 在场 —— 夹具是录好的，所以这个脚本可以进 L0。
 *
 * 用法：node scripts/gateway-compare/compare.mjs [--verbose]
 */
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const REPO = process.cwd();
const FIXTURES = path.join(REPO, "scripts/gateway-compare/reference-fixtures.json");
const PORT = Number(process.env.GW_COMPARE_PORT ?? 39733);
const BASE = `http://127.0.0.1:${PORT}`;
const VERBOSE = process.argv.includes("--verbose");

const { cases } = JSON.parse(readFileSync(FIXTURES, "utf8"));

// 启动我们的 gateway
const child = spawn(process.execPath, ["app/gateway/dist/main.js"], {
  cwd: REPO,
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: undefined,
    HILO_GATEWAY_ROLE: "workspace",
    WORKSPACE_DIR: path.join(REPO, ".probe/gw-compare-ws"),
    HILO_PROJECT_ARCHITECTURE: "resource_v3",
    HILO_DATA_DIR: path.join(REPO, ".probe/gw-compare-data"),
    PORT: String(PORT),
    HILO_PORT: String(PORT),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "";
child.stdout.on("data", (d) => { log += d; });
child.stderr.on("data", (d) => { log += d; });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitReady() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/api/v3/tasks`, { signal: AbortSignal.timeout(2000) });
      if (r.status < 500) return true;
    } catch { /* 还没起来 */ }
    await sleep(400);
  }
  return false;
}

/** 形状比较：忽略具体值，只比结构与类型；字符串值要比对 */
function shapeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return v.length ? `[${shapeOf(v[0])}]` : "[]";
  if (typeof v === "object") {
    return "{" + Object.keys(v).sort().map((k) => `${k}:${shapeOf(v[k])}`).join(",") + "}";
  }
  return typeof v;
}

function diff(name, expected, actual, p = "") {
  const out = [];
  if (expected === null || actual === null) {
    if (expected !== actual) out.push(`${p || "."}: 期望 ${expected}，实际 ${actual}`);
    return out;
  }
  if (typeof expected !== typeof actual) {
    out.push(`${p || "."}: 类型不同 期望 ${typeof expected}，实际 ${typeof actual}`);
    return out;
  }
  if (Array.isArray(expected) !== Array.isArray(actual)) {
    out.push(`${p || "."}: 一个数组一个不是`);
    return out;
  }
  if (typeof expected === "object") {
    for (const k of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
      if (!(k in expected)) out.push(`${p}.${k}: 我们多了这个字段`);
      else if (!(k in actual)) out.push(`${p}.${k}: 我们缺这个字段`);
      else out.push(...diff(name, expected[k], actual[k], `${p}.${k}`));
    }
    return out;
  }
  // 叶子：字符串必须相等；数字/布尔只比类型（具体值不固定）
  if (typeof expected === "string" && !/^<.*>$/.test(expected) && expected !== actual) {
    out.push(`${p}: 期望 "${expected}"，实际 "${actual}"`);
  }
  return out;
}

const problems = [];
try {
  if (!await waitReady()) {
    console.error("✗ 我们的 gateway 没起来");
    console.error(log.slice(-800));
    process.exit(1);
  }
  for (const c of cases) {
    const res = await fetch(`${BASE}${c.path}`, { method: c.method, signal: AbortSignal.timeout(15000) }).catch(() => null);
    const status = res?.status ?? 0;
    const body = res ? await res.json().catch(() => null) : null;
    if (status !== c.status) problems.push(`${c.name}: 状态码 期望 ${c.status}，实际 ${status}`);
    const errs = diff(c.name, c.body, body);
    for (const e of errs) problems.push(`${c.name}: ${e}`);
    console.log(`${problems.some((x) => x.startsWith(c.name + ":")) ? "✗" : "✓"} ${c.name.padEnd(14)} ${status}  ${shapeOf(body).slice(0, 90)}`);
    if (VERBOSE) console.log("   ", JSON.stringify(body).slice(0, 200));
  }
} finally {
  child.kill("SIGKILL");
}

console.log("");
if (problems.length) {
  console.log(`✗ 协议不一致 ${problems.length} 处：`);
  for (const p of problems) console.log("  " + p);
  process.exit(1);
}
console.log("✓ 协议完全一致（状态码 + 结构 + 固定字符串）");
