// 冒烟：独立启动构建好的 gateway（带工作区身份）+ 假平台，用真 HTTP / WS 过一遍 P2 加的路由。
// 先 `pnpm turbo run build --filter=@ov/gateway`，再 `node scripts/smoke/gateway.mjs`；缩略图那项要本机有 ffmpeg。
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, renameSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const req = createRequire(path.join(repo, "app/gateway/package.json"));
const sharp = req("sharp");
const WebSocket = req("ws");

let failures = 0;
const ok = (cond, label, extra) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && extra !== undefined ? "  → " + JSON.stringify(extra).slice(0, 300) : ""}`);
  if (!cond) failures++;
};

// 假平台：对话、同步出图、超分、视频任务
const platformCalls = [];
const platform = createServer((rq, rs) => {
  let raw = "";
  rq.on("data", (c) => (raw += c));
  rq.on("end", async () => {
    const body = raw ? JSON.parse(raw) : undefined;
    platformCalls.push({ url: rq.url, body });
    const host = `http://${rq.headers.host}`;
    rs.setHeader("content-type", "application/json");
    if (rq.url === "/v1/chat/completions") return rs.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: "标题：猫" }, finish_reason: "stop" }] }));
    if (rq.url === "/v1/images/generations") return rs.end(JSON.stringify({ data: [{ url: `${host}/img/512x512.png` }] }));
    if (rq.url === "/v1/images/edits") return rs.end(JSON.stringify({ data: [{ url: `${host}/img/${body.size}.png` }] }));
    const m = /^\/img\/(\d+)x(\d+)\.png$/.exec(rq.url);
    if (m) {
      rs.setHeader("content-type", "image/png");
      return rs.end(await sharp({ create: { width: +m[1], height: +m[2], channels: 3, background: "#468" } }).png().toBuffer());
    }
    rs.statusCode = 404;
    rs.end("{}");
  });
});
await new Promise((r) => platform.listen(0, "127.0.0.1", r));
const pbase = `http://127.0.0.1:${platform.address().port}`;

const ws = mkdtempSync(path.join(tmpdir(), "ov-smoke-ws-"));
const cfg = path.join(mkdtempSync(path.join(tmpdir(), "ov-smoke-cfg-")), "config.json");
writeFileSync(cfg, JSON.stringify({ platform: { base_url: `${pbase}/v1`, api_key: "k", chat_model: "chat" }, models: { image: "qwen-image-pro", image_upscale: "swiftvr" } }));
const ID = { claim: "a".repeat(64), instance: "inst-smoke", generation: "2" };
const H = { "x-hilo-workspace": ID.claim, "x-hilo-workspace-instance": ID.instance, "x-hilo-workspace-generation": ID.generation };
const port = 18000 + Math.floor(Math.random() * 1000);
const gw = spawn(process.execPath, [path.join(repo, "app/gateway/dist/main.js")], {
  env: {
    ...process.env,
    PORT: String(port),
    HILO_GATEWAY_ROLE: "workspace",
    WORKSPACE_DIR: ws,
    OV_CONFIG_PATH: cfg,
    HILO_WORKSPACE_CLAIM: ID.claim,
    HILO_WORKSPACE_INSTANCE_ID: ID.instance,
    HILO_WORKSPACE_GENERATION: ID.generation,
    NODE_ENV: "development",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "";
gw.stdout.on("data", (d) => (log += d));
gw.stderr.on("data", (d) => (log += d));
const base = `http://127.0.0.1:${port}`;
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch(`${base}/api/health/live`)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 100));
}

const call = async (method, p, body, headers = H) => {
  const r = await fetch(base + p, { method, headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, body: json, headers: r.headers };
};

try {
  // ---- 身份校验
  ok((await call("GET", "/api/health", undefined, {})).status === 200, "身份：健康探测不带头放行");
  const noIdGet = await call("GET", "/api/canvas", undefined, {});
  ok(noIdGet.status === 428 && noIdGet.body.code === "WORKSPACE_IDENTITY_REQUIRED", "身份：其余 GET 不带头 428", noIdGet);
  const noId = await call("POST", "/api/canvas/selection", { nodeIds: [] }, {});
  ok(noId.status === 428 && noId.body.code === "WORKSPACE_IDENTITY_REQUIRED" && noId.body.statusCode === 428, "身份：POST 不带头 428", noId);
  const stale = await call("POST", "/api/canvas/selection", { nodeIds: [] }, { ...H, "x-hilo-workspace-generation": "1" });
  ok(stale.status === 409 && stale.body.code === "WORKSPACE_IDENTITY_MISMATCH", "身份：旧 generation 409", stale);
  ok((await call("POST", "/api/canvas/selection", { nodeIds: [] })).status === 204, "身份：带对了照常（204）");
  const pre = await fetch(base + "/api/canvas/selection", { method: "OPTIONS", headers: { Origin: "app://x", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,x-hilo-workspace,x-hilo-workspace-instance,x-hilo-workspace-generation" } });
  ok(pre.status < 300 && /x-hilo-workspace/i.test(pre.headers.get("access-control-allow-headers") ?? ""), "身份：CORS 预检放行并允许身份头", { status: pre.status, h: pre.headers.get("access-control-allow-headers") });
  const wsCode = await new Promise((res) => {
    const s = new WebSocket(`ws://127.0.0.1:${port}/ws?hilo_workspace_instance=other`);
    s.on("close", (c) => res(c));
    s.on("error", () => {});
  });
  ok(wsCode === 1008, "身份：/ws 带错身份被 1008 关掉", wsCode);
  const wsNoId = await new Promise((res) => {
    const s = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    s.on("close", (c) => res(c));
    s.on("error", () => {});
  });
  ok(wsNoId === 1008, "身份：/ws 不带身份被 1008 关掉", wsNoId);
  const wsOk = await new Promise((res) => {
    const s = new WebSocket(`ws://127.0.0.1:${port}/ws?hilo_workspace=${ID.claim}&hilo_workspace_instance=${ID.instance}&hilo_workspace_generation=${ID.generation}`);
    s.on("open", () => { s.send(JSON.stringify({ type: "ping" })); });
    s.on("message", (d) => { res(JSON.parse(String(d)).type); s.close(); });
    s.on("error", (e) => res("error " + e.message));
  });
  ok(wsOk === "pong", "身份：/ws 带对身份能用", wsOk);

  // ---- 素材 + 画布
  await sharp({ create: { width: 416, height: 232, channels: 3, background: "#963" } }).png().toFile(path.join(ws, "源图.png"));
  // 图片直接放进工作区，用 reconcile 登记
  const rec1 = await call("POST", "/api/assets/reconcile");
  ok(rec1.body.status === "completed" && rec1.body.enrolled >= 1, "对账：新文件被登记", rec1.body);
  const node = await call("POST", "/api/canvas/media-node", { assetPath: "源图.png" });
  ok(node.status === 201, "画布：media-node", node);
  const src = node.body.nodeId;

  // ---- 超分
  const sr = await call("POST", "/api/edit/super-resolution", { image_path: "源图.png", resolution: "2K", filename: "源图-2k", source_node_id: src });
  ok(sr.status === 201 && sr.body.ok === true && sr.body.path === "源图-2k.png" && Object.keys(sr.body).length === 2, "超分：只回 {ok, path}", sr.body);
  ok(platformCalls.find((c) => c.url === "/v1/images/edits")?.body?.size === "2048x1144", "超分：平台收到精确 size");
  const srAsset = (await call("GET", `/api/assets?path=${encodeURIComponent("源图-2k.png")}`)).body.assets[0];
  const cv = (await call("GET", "/api/canvas")).body;
  const srNode = cv.nodes.find((n) => n.assetId === srAsset?.id);
  ok(srNode && cv.edges.some((e) => e.source === src && e.target === srNode.id), "超分：从源节点连边");

  // ---- 同步生成 / 文本
  const g = await call("POST", "/api/generate/image", { backend: "nano_banana", prompt: "一只猫", filename: "猫" });
  ok(g.status === 201 && g.body.ok && g.body.path === "猫.png" && g.body.node_id, "同步出图：回结果本身", g.body);
  const t = await call("POST", "/api/generate/text", { model_id: "chat", prompt: "起个标题" }, { ...H, "x-hilo-source": "canvas" });
  ok(t.status === 201 && t.body.ok && t.body.path === "起个标题.md", "generate/text：写进文本节点", t);
  const tAgent = await call("POST", "/api/generate/text", { model_id: "chat", prompt: "起个标题" });
  ok(tAgent.body.error_code === "client_error", "generate/text：非画布来源拒绝", tAgent.body);
  const act = await call("GET", "/api/health/activity", undefined, H);
  ok(act.body.agent_running === false && act.body.safe_to_suspend === true, "活动：没有 agent 时可挂起", act.body);

  // ---- 画布新路由
  const pg = await call("POST", "/api/canvas/placeholder-group", { sourceNodeId: src, cells: [{ prompt: "A", model: "m" }, { prompt: "B", model: "m" }] });
  ok(pg.status === 201 && pg.body.placeholderIds.length === 2 && pg.body.groupId, "placeholder-group", pg.body);
  const tn = await call("POST", "/api/canvas/text-node", { content: "夜晚，街上下雨。", name: "剧本" });
  const rv = await call("POST", "/api/canvas/text-node/revert-edits", { nodeId: tn.body.nodeId, edits: [{ annotationId: "a", exact: "夜晚", replacement: "黄昏" }] });
  ok(rv.body.status === "applied" && rv.body.content === "黄昏，街上下雨。", "revert-edits", rv.body);
  writeFileSync(path.join(ws, "说明.pdf"), "%PDF-1.4");
  await call("POST", "/api/assets/reconcile");
  const fn = await call("POST", "/api/canvas/file-node", { assetPath: "说明.pdf" });
  ok(fn.status === 201 && fn.body.viewMode === "card", "file-node", fn.body);
  const pd = await call("POST", "/api/canvas/plugin-data", { nodeId: src, key: "k", value: 1 });
  ok(pd.status === 400, "plugin-data：非插件节点 400", pd.body);
  // 大画布保存（>100kb）
  const big = (await call("GET", "/api/canvas")).body;
  big.nodes.find((n) => n.id === src).data = { ...(big.nodes.find((n) => n.id === src).data ?? {}), note: "x".repeat(300_000) };
  const save = await call("POST", "/api/canvas", big);
  ok(save.status < 300, "画布：300KB 整份保存不再 413", save.status);
  const longText = await call("PUT", "/api/files/content", { path: "长.md", content: "字".repeat(200_000) });
  ok(longText.status === 200, "文本：600KB 写入不再 413", longText.status);
  // /api/edit 整个放宽了（编辑要传整张大图），默认上限拿别的路由验。
  const small = await call("POST", "/api/safety/check-text", { text: "x".repeat(200_000) });
  ok(small.status === 413, "其他路由仍是默认 100kb 上限", small.status);

  // ---- 缩略图
  const hasFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;
  if (hasFfmpeg) {
    spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=10:duration=2", "-pix_fmt", "yuv420p", path.join(ws, "片.mp4")]);
    const th = await fetch(`${base}/api/thumbnail/${encodeURIComponent("片.mp4")}?w=160`, { headers: H });
    const meta = await sharp(Buffer.from(await th.arrayBuffer())).metadata();
    ok(th.status === 200 && meta.width === 160, "缩略图：视频抽帧", { status: th.status, meta: meta.width });
    const png = await call("GET", "/api/thumbnail/源图.png");
    ok(png.status === 400, "缩略图：图片 400");
  } else ok(false, "缩略图：本机没有 ffmpeg，跳过");

  // ---- 对账：改名保 id、删掉标 missing
  const before = (await call("GET", `/api/assets?path=${encodeURIComponent("说明.pdf")}`)).body.assets[0];
  renameSync(path.join(ws, "说明.pdf"), path.join(ws, "说明-改名.pdf"));
  const rec2 = await call("POST", "/api/assets/reconcile");
  const after = (await call("GET", `/api/assets?path=${encodeURIComponent("说明-改名.pdf")}`)).body.assets[0];
  ok(rec2.body.rebound === 1 && after?.id === before.id, "对账：改名后 id 不变", rec2.body);
} catch (err) {
  ok(false, "脚本异常", String(err?.stack ?? err));
} finally {
  gw.kill("SIGTERM");
  platform.close();
  const errLines = log.split("\n").filter((l) => /ERROR|Error:|TypeError/.test(l));
  console.log(`\ngateway 日志里的错误行 ${errLines.length} 条`);
  for (const l of errLines.slice(0, 10)) console.log("  " + l.slice(0, 200));
  console.log(failures ? `\n${failures} 项失败` : "\n全部通过");
  process.exit(failures ? 1 : 0);
}
