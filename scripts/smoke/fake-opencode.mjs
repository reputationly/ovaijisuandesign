#!/usr/bin/env node
// 假 opencode（给 electron.sh 用）：只实现 serve 的健康检查和事件流；起来后按配置拉起 MCP、调一次写画布的工具，
// 再加载插件触发一次回连 gateway，把看到的东西写进 $FAKE_OC_DUMP_DIR/<pid>.json。
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.argv[process.argv.indexOf("--port") + 1]);
const dumpDir = process.env.FAKE_OC_DUMP_DIR ?? "/tmp";
mkdirSync(dumpDir, { recursive: true });
const dump = { cwd: process.cwd(), env: {}, mcp: null, plugin: null };
for (const k of ["GATEWAY_URL", "HILO_WORKSPACE_CLAIM", "HILO_WORKSPACE_INSTANCE_ID", "HILO_WORKSPACE_GENERATION"]) dump.env[k] = process.env[k];
const config = JSON.parse(readFileSync(process.env.OPENCODE_CONFIG, "utf8"));
dump.mcpEnvironment = Object.fromEntries(Object.entries(config.mcp.hub.environment).filter(([k]) => /HILO_WORKSPACE|GATEWAY_URL/.test(k)));
const save = () => writeFileSync(path.join(dumpDir, `${process.pid}.json`), JSON.stringify(dump, null, 2));

createServer((req, res) => {
  if (req.url.startsWith("/global/health")) {
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify({ healthy: true, version: "0.0.0-fake" }));
  }
  if (req.url.startsWith("/global/event") || req.url.startsWith("/event")) {
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write(": hi\n\n");
    return;
  }
  res.statusCode = 404;
  res.end();
}).listen(port, "127.0.0.1", () => {
  console.log(`opencode server listening on http://127.0.0.1:${port}`);
  setTimeout(exercise, 500);
});

async function exercise() {
  // MCP：照配置里的 command / environment 拉起来
  try {
    const [cmd, ...args] = config.mcp.hub.command;
    const mcp = spawn(cmd, args, { env: { ...process.env, ...config.mcp.hub.environment }, stdio: ["pipe", "pipe", "pipe"] });
    let buf = "";
    const pending = new Map();
    mcp.stdout.on("data", (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        if (line.trim()) {
          const m = JSON.parse(line);
          pending.get(m.id)?.(m);
        }
      }
    });
    let n = 0;
    const rpc = (method, params) => new Promise((r) => { const id = ++n; pending.set(id, r); mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"); });
    await rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "fake-oc", version: "0" } });
    mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
    const r = await rpc("tools/call", { name: "canvas_write_node", arguments: { kind: "text", content: "从 Electron 里的 MCP 写进来", name: "电子冒烟" } });
    dump.mcp = r.result?.content?.[0]?.text ?? r;
    mcp.kill();
  } catch (e) {
    dump.mcp = "exception: " + e.message;
  }
  // 插件：tool.execute.before 会回连 gateway 问工具确认
  try {
    const url = config.plugin.find((p) => p.includes("opencode-plugin-hilo"));
    const mod = await import(url);
    const hooks = await mod.default({ directory: process.cwd() });
    const out = { args: { prompt: "猫" } };
    await hooks["tool.execute.before"]({ tool: "hub_generate_image", sessionID: "ses_fake", callID: "call_1" }, out);
    dump.plugin = "tool allowed";
  } catch (e) {
    dump.plugin = "threw: " + e.message;
  }
  save();
}

