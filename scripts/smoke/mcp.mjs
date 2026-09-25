// 冒烟：真 gateway（带身份）+ 真 MCP server（stdio），带 / 不带身份环境变量各调一次写画布的工具。
// 先构建 gateway 和 mcp-tools，再 `node scripts/smoke/mcp.mjs`。带身份应当成功，不带应当被 428 拒。
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ID = { HILO_WORKSPACE_CLAIM: "b".repeat(64), HILO_WORKSPACE_INSTANCE_ID: "inst-mcp", HILO_WORKSPACE_GENERATION: "5" };
const ws = mkdtempSync(path.join(tmpdir(), "ov-mcp-smoke-"));
const port = 19000 + Math.floor(Math.random() * 500);
const gw = spawn(process.execPath, [path.join(repo, "app/gateway/dist/main.js")], {
  env: { ...process.env, PORT: String(port), HILO_GATEWAY_ROLE: "workspace", WORKSPACE_DIR: ws, ...ID },
  stdio: "ignore",
});
const base = `http://127.0.0.1:${port}`;
for (let i = 0; i < 100; i++) {
  try { if ((await fetch(`${base}/api/health/live`)).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 100));
}

async function callTool(extraEnv, name, args) {
  const mcp = spawn(process.execPath, [path.join(repo, "app/mcp-tools/dist/main.js")], {
    env: { ...process.env, GATEWAY_URL: base, ...extraEnv },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let buf = "";
  let stderr = "";
  mcp.stderr.on("data", (d) => (stderr += d));
  const pending = new Map();
  mcp.stdout.on("data", (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      const msg = JSON.parse(line);
      pending.get(msg.id)?.(msg);
    }
  });
  let n = 0;
  const rpc = (method, params) =>
    new Promise((res) => {
      const id = ++n;
      pending.set(id, res);
      mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  await rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "smoke", version: "0" } });
  mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const tools = await rpc("tools/list", {});
  const r = await rpc("tools/call", { name, arguments: args });
  mcp.kill();
  return { tools: tools.result?.tools?.length, result: r.result, stderr };
}

const args = { kind: "text", content: "MCP 写进来的一段字", name: "mcp测试" };
const withId = await callTool(ID, "canvas_write_node", args);
const withoutId = await callTool({}, "canvas_write_node", { ...args, name: "不带身份" });
const canvas = await (await fetch(`${base}/api/canvas`)).json();
gw.kill();

const text = (r) => JSON.stringify(r.result?.content ?? r.result).slice(0, 300);
console.log("工具数:", withId.tools);
console.log("带身份:", withId.result?.isError ? "ERROR" : "OK", text(withId));
console.log("不带身份:", withoutId.result?.isError ? "ERROR" : "OK", text(withoutId));
const nodes = canvas.nodes.filter((n) => n.type === "text").length;
console.log("画布上的文本节点:", nodes);
const inner = (r) => JSON.parse(r.result?.content?.[0]?.text ?? "{}");
const pass = inner(withId).ok === true && /Workspace identity required/.test(inner(withoutId).error ?? "") && nodes === 1;
console.log(pass ? "\n全部通过" : "\n失败");
process.exit(pass ? 0 : 1);
