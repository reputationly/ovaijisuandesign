// 行为对照：同一组调用分别打给参照的 MCP server 和我们的，比对返回的文字和结构化结果。
// 两边各起一个 gateway（各自的临时工作区、同一个假平台），场景里的准备步骤两边都做一遍，互不串。
//
//   node scripts/smoke/mcp-behavior.mjs scripts/smoke/mcp-scenarios/*.json [--only 名字片段] [--show]
//
// 场景文件是数组，每项：
//   { "name": "…", "tool": "canvas_read_text", "args": {…},
//     "files": { "a.md": "内容", "b.png": "@png" },   // 可选：先写进工作区（@png 是一张 1x1 PNG）
//     "before": [{ "tool": "canvas_write_node", "args": {…}, "save": "node" }],  // 可选：先调的工具；save 把结果里的 nodeId 存成变量
//     "env": { "HILO_KNOWLEDGE_DIR": "{ws}/kb" },       // 可选：给 MCP 进程加的环境变量，{ws} 换成该侧工作区
//     "allow": "说明"                                    // 可选：已知且有意的差异，只报告不算失败
//   }
// args 里的 "$node" 这类字符串会换成 before 里存下的值。
// 先构建 gateway 和 mcp-tools。有未说明的差异时以 1 退出。
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : undefined;
const show = argv.includes("--show");
const files = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--only");
const scenarios = files.flatMap((f) => JSON.parse(readFileSync(f, "utf8")).map((s) => ({ ...s, file: path.basename(f) })));
const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000" + "1f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082", "hex");

// 假平台：对话回固定文字，出图 / 视频直接成功。
const platform = createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const host = `http://${req.headers.host}`;
    res.setHeader("content-type", "application/json");
    if (req.url === "/v1/chat/completions") return res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: "ok" }, finish_reason: "stop" }] }));
    if (req.url === "/v1/images/generations" || req.url === "/v1/images/edits") return res.end(JSON.stringify({ data: [{ url: `${host}/f/out.png` }] }));
    if (req.url === "/v1/videos" && req.method === "POST") return res.end(JSON.stringify({ task_id: "vt-1" }));
    if (req.url?.startsWith("/v1/videos/")) return res.end(JSON.stringify({ status: "completed", metadata: { url: `${host}/f/out.png` } }));
    if (req.url === "/f/out.png") {
      res.setHeader("content-type", "image/png");
      return res.end(PNG);
    }
    res.statusCode = 404;
    res.end("{}");
  });
});
await new Promise((r) => platform.listen(0, "127.0.0.1", r));
const platformBase = `http://127.0.0.1:${platform.address().port}`;

async function startSide(entry, extraEnv = {}) {
  const ws = mkdtempSync(path.join(tmpdir(), "ov-mcp-behavior-"));
  const cfg = path.join(mkdtempSync(path.join(tmpdir(), "ov-mcp-behavior-cfg-")), "config.json");
  writeFileSync(cfg, JSON.stringify({ platform: { base_url: `${platformBase}/v1`, api_key: "k", chat_model: "chat" }, models: { image: "qwen-image-pro", image_edit: "qwen-image-pro", video: "minimax-h3-fl2va" } }));
  const port = 20000 + Math.floor(Math.random() * 5000);
  const gw = spawn(process.execPath, [path.join(repo, "app/gateway/dist/main.js")], {
    env: { ...process.env, PORT: String(port), HILO_GATEWAY_ROLE: "workspace", WORKSPACE_DIR: ws, OV_CONFIG_PATH: cfg },
    stdio: "ignore",
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${base}/api/health/live`)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  const env = { ...process.env, GATEWAY_URL: base, HILO_RELEASE_REGION: "domestic", HILO_DATA_DIR: path.join(ws, ".data") };
  for (const [k, v] of Object.entries(extraEnv)) env[k] = v.split("{ws}").join(ws);
  const p = spawn(process.execPath, [entry], { cwd: ws, env, stdio: ["pipe", "pipe", "pipe"] });
  let buf = "";
  const pending = new Map();
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
  p.stderr.on("data", () => {});
  let n = 0;
  const rpc = (method, params) =>
    new Promise((resolve) => {
      const id = ++n;
      const t = setTimeout(() => resolve({ error: { message: "timeout" } }), 30_000);
      pending.set(id, (m) => {
        clearTimeout(t);
        resolve(m);
      });
      p.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  await rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "behavior", version: "0" } });
  p.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  return { ws, rpc, stop: () => (p.kill(), gw.kill()) };
}

/** 路径、id、时间戳换成占位，两边才能逐字比。 */
function normalize(v, side) {
  let s = JSON.stringify(v);
  s = s.split(side.ws).join("<WS>");
  s = s.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<UUID>");
  s = s.replace(/gen_[0-9a-f]{32}/g, "<TASK>");
  s = s.replace(/\.hilo\/tables\/[A-Za-z0-9_-]+\.htable/g, ".hilo/tables/<TABLE>.htable");
  s = s.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, "<TIME>");
  s = s.replace(/"(duration_ms|elapsed_ms|elapsedMs)":\d+/g, '"$1":<N>');
  return JSON.parse(s);
}

function subst(v, vars) {
  if (typeof v === "string") return v.startsWith("$") && vars[v.slice(1)] !== undefined ? vars[v.slice(1)] : v;
  if (Array.isArray(v)) return v.map((x) => subst(x, vars));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, subst(x, vars)]));
  return v;
}

async function runOn(side, sc) {
  for (const [rel, body] of Object.entries(sc.files ?? {})) {
    const abs = path.join(side.ws, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, body === "@png" ? PNG : body);
  }
  const vars = {};
  for (const b of sc.before ?? []) {
    const r = await side.rpc("tools/call", { name: b.tool, arguments: subst(b.args ?? {}, vars) });
    // 准备步骤失败时返回的是纯文字，解析不了就当没拿到 id，交给正式调用去暴露差异
    let sc2 = r.result?.structuredContent;
    if (!sc2) {
      try {
        sc2 = JSON.parse(r.result?.content?.[0]?.text ?? "{}");
      } catch {
        sc2 = {};
      }
    }
    if (b.save) vars[b.save] = sc2.nodeId ?? sc2.results?.[0]?.nodeId ?? sc2.node_id ?? sc2.plan_id;
  }
  const r = await side.rpc("tools/call", { name: sc.tool, arguments: subst(sc.args ?? {}, vars) });
  const res = r.result ?? { rpcError: r.error };
  return normalize({ isError: res.isError ?? false, text: res.content?.map((c) => c.text).join("\n"), structured: res.structuredContent, rpcError: res.rpcError }, side);
}

let bad = 0;
let allowed = 0;
let same = 0;
for (const sc of scenarios) {
  if (only && !`${sc.file} ${sc.tool} ${sc.name}`.includes(only)) continue;
  const ref = await startSide(path.join(repo, "reference/3.0.16/mcp-tools/dist/main.js"), sc.env);
  const ours = await startSide(path.join(repo, "app/mcp-tools/dist/main.js"), sc.env);
  let a;
  let b;
  try {
    [a, b] = await Promise.all([runOn(ref, sc), runOn(ours, sc)]);
  } finally {
    ref.stop();
    ours.stop();
  }
  const eq = JSON.stringify(a) === JSON.stringify(b);
  if (eq) same++;
  else if (sc.allow) allowed++;
  else bad++;
  const tag = eq ? "SAME " : sc.allow ? "ALLOW" : "DIFF ";
  console.log(`${tag} ${sc.tool} :: ${sc.name}${!eq && sc.allow ? `  (${sc.allow})` : ""}`);
  if (!eq && (show || !sc.allow)) {
    console.log("  ref :", JSON.stringify(a).slice(0, 1500));
    console.log("  ours:", JSON.stringify(b).slice(0, 1500));
  }
}
platform.close();
console.log(`\n一致 ${same}，有意差异 ${allowed}，不一致 ${bad}`);
process.exit(bad ? 1 : 0);
