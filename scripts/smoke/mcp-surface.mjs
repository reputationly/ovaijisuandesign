// 对照：分别起参照的 MCP server（reference/<版本>/mcp-tools/dist/main.js）和我们的，对同一个 gateway 各发一次
// tools/list，逐个比对我们注册的工具：描述、inputSchema、outputSchema、annotations 要和参照一字不差（两个地区都比）。
//
//   node scripts/smoke/mcp-surface.mjs [参照版本，默认 3.0.16]
//
// 先构建 gateway 和 mcp-tools。不一致时列出差异并以 1 退出。
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const version = process.argv[2] ?? "3.0.16";
const ws = mkdtempSync(path.join(tmpdir(), "ov-mcp-surface-"));
const port = 19500 + Math.floor(Math.random() * 400);
const gw = spawn(process.execPath, [path.join(repo, "app/gateway/dist/main.js")], {
  env: { ...process.env, PORT: String(port), HILO_GATEWAY_ROLE: "workspace", WORKSPACE_DIR: ws },
  stdio: "ignore",
});
const base = `http://127.0.0.1:${port}`;
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch(`${base}/api/health/live`)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 100));
}

async function list(entry, region) {
  const p = spawn(process.execPath, [entry], { env: { ...process.env, GATEWAY_URL: base, HILO_RELEASE_REGION: region }, stdio: ["pipe", "pipe", "pipe"] });
  let buf = "";
  let err = "";
  const pending = new Map();
  p.stderr.on("data", (d) => (err += d));
  p.stdout.on("data", (d) => {
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
  const rpc = (method, params) =>
    new Promise((r) => {
      const id = ++n;
      pending.set(id, r);
      p.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  await rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "surface", version: "0" } });
  p.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const r = await rpc("tools/list", {});
  p.kill();
  if (!r.result) throw new Error(`${entry} tools/list failed: ${err.slice(-500)}`);
  return new Map(r.result.tools.map((t) => [t.name, t]));
}

const stable = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));
let diffs = 0;
try {
  for (const region of ["domestic", "overseas"]) {
    const ref = await list(path.join(repo, `reference/${version}/mcp-tools/dist/main.js`), region);
    const ours = await list(path.join(repo, "app/mcp-tools/dist/main.js"), region);
    for (const [name, t] of ours) {
      const r = ref.get(name);
      if (!r) {
        console.log(`[${region}] ${name}: 参照里没有这个工具`);
        diffs++;
        continue;
      }
      for (const part of ["description", "inputSchema", "outputSchema", "annotations"]) {
        if (stable(r[part]) !== stable(t[part])) {
          console.log(`[${region}] ${name}.${part} 不一致`);
          diffs++;
        }
      }
    }
    console.log(`[${region}] 我们 ${ours.size} 个工具，参照 ${ref.size} 个`);
  }
} finally {
  gw.kill();
}
console.log(diffs ? `\n${diffs} 处不一致` : "\n全部一致");
process.exit(diffs ? 1 : 0);
