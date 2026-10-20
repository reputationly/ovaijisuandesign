/**
 * 把 paths.json 里的每个 (method, path) 重放给一个 gateway，记录状态码与响应形状（第 249 轮）。
 *
 * 用法：
 *   node scripts/gateway-compare/replay.mjs --target ours      [--out ours.json]
 *   node scripts/gateway-compare/replay.mjs --target <baseUrl> [--out ref.json]
 *
 * `--target ours` 会自己拉起我们的 gateway（需要先 pnpm run build）。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const targetArg = args[args.indexOf("--target") + 1] ?? "ours";
const outIdx = args.indexOf("--out");
const OUT = outIdx >= 0 ? args[outIdx + 1] : `scripts/gateway-compare/replay-${targetArg === "ours" ? "ours" : "ref"}.json`;
const PORT = Number(process.env.GW_COMPARE_PORT ?? 39735);
const REPO = process.cwd();

const { items } = JSON.parse(readFileSync("scripts/gateway-compare/paths.json", "utf8"));

function shapeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return v.length ? `[${shapeOf(v[0])}]` : "[]";
  if (typeof v === "object") return "{" + Object.keys(v).sort().map((k) => `${k}:${shapeOf(v[k])}`).join(",") + "}";
  return typeof v;
}

let child = null;
if (targetArg === "ours") {
  child = spawn(process.execPath, ["app/gateway/dist/main.js"], {
    cwd: REPO,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined, HILO_GATEWAY_ROLE: "workspace",
      WORKSPACE_DIR: path.join(REPO, ".probe/gw-compare-ws"),
      HILO_PROJECT_ARCHITECTURE: "resource_v3",
      HILO_DATA_DIR: path.join(REPO, ".probe/gw-compare-data"),
      PORT: String(PORT), HILO_PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
}
const BASE = targetArg === "ours" ? `http://127.0.0.1:${PORT}` : targetArg;
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

const results = [];
try {
  if (!await waitReady()) { console.error("✗ gateway 没起来"); process.exit(1); }
  for (const item of items) {
    const init = { method: item.method, signal: AbortSignal.timeout(8000) };
    if (item.method !== "GET") { init.headers = { "content-type": "application/json" }; init.body = "{}"; }
    let status = 0, body = null;
    try {
      const res = await fetch(`${BASE}${item.path}`, init);
      status = res.status;
      body = await res.json().catch(() => null);
    } catch { status = 0; }
    results.push({ method: item.method, path: item.path, status, shape: shapeOf(body) });
  }
} finally {
  child?.kill("SIGKILL");
}

writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), target: targetArg, total: results.length,
  byStatus: results.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {}), results }, null, 1));
console.log(`${results.length} 条 → ${OUT}`);
console.log("状态分布:", JSON.stringify(results.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {})));
