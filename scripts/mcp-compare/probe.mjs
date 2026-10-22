/**
 * 我方 MCP 服务的 tools/list 探针（第 255 轮，M6 验收基准）。
 *
 * 用法：node scripts/mcp-compare/probe.mjs
 * 输出 scripts/mcp-compare/ours-tools.json，并与参照的 reference-tools.json 对比。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const REPO = process.cwd();
const ENTRY = process.env.OVMCP_ENTRY ?? path.join(REPO, "app/mcp-tools/dist/main.js");
// 第 349 轮：支持生成**参照**快照。OVMCP_ENTRY 指向冻结的 sidecar，
// OVMCP_OUT 指定输出、OVMCP_SOURCE 写来源标签，OVMCP_SKIP_COMPARE=1 只生成不比对。
const OUT = process.env.OVMCP_OUT ?? "scripts/mcp-compare/ours-tools.json";
const SOURCE = process.env.OVMCP_SOURCE ?? "our mcp-tools（真跑 tools/list）";
const SKIP_COMPARE = process.env.OVMCP_SKIP_COMPARE === "1";

const child = spawn(process.execPath, [ENTRY], {
  cwd: REPO,
  env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined,
    HILO_PROJECT_ARCHITECTURE: "resource_v3",
    HILO_AGENT_CALLER_KEY: process.env.HILO_AGENT_CALLER_KEY ?? "probe",
    ...(process.env.GATEWAY_URL ? { GATEWAY_URL: process.env.GATEWAY_URL } : {}) },
  stdio: ["pipe", "pipe", "pipe"],
});
let buf = "";
const frames = [];
child.stdout.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (!line) continue;
    try { frames.push(JSON.parse(line)); } catch { /* 非 JSON 行忽略 */ }
  }
});
child.stderr.on("data", () => {});

child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize",
  params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "probe", version: "1" } } }) + "\n");
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) + "\n");

const deadline = Date.now() + 20000;
while (Date.now() < deadline && !frames.some((f) => f.id === 2)) await new Promise((r) => setTimeout(r, 200));
child.kill("SIGKILL");

const result = frames.find((f) => f.id === 2);
if (!result?.result?.tools) { console.error("✗ 没拿到 tools/list"); process.exit(1); }
const tools = result.result.tools;
writeFileSync(OUT, JSON.stringify({ source: SOURCE, count: tools.length, tools }, null, 1));

if (SKIP_COMPARE) {
  console.log(`✓ 已写 ${OUT}（${tools.length} 个工具，来源：${SOURCE}）`);
  process.exit(0);
}
const ref = JSON.parse(readFileSync("scripts/mcp-compare/reference-tools.json", "utf8"));
const ours = new Set(tools.map((t) => t.name));
const refs = new Set(ref.tools.map((t) => t.name));
const missing = [...refs].filter((n) => !ours.has(n));
const extra = [...ours].filter((n) => !refs.has(n));
console.log(`我方 ${tools.length} 个 / 参照 ${ref.tools.length} 个`);
console.log(`缺 ${missing.length}: ${missing.join(", ") || "无"}`);
console.log(`多 ${extra.length}: ${extra.join(", ") || "无"}`);
process.exit(missing.length || extra.length ? 1 : 0);
