#!/usr/bin/env node
/**
 * 在线路径：归档种子 + 真实 /api/v3/execute 任务，验证卡片不在离线分支。
 *
 * T-3：每次运行把证据写到 `.probe/pw/design-execute/<ts>-online/result.json`
 *      （帧、请求、任务 JSON、资源查询、卡片文案；`sk-` 串一律脱敏）。
 * T-2：轮询间隔只统计**卡片自己的**请求，并按推送就绪前/后分段；其他来源
 *      （任务面板、队列）单独列出来，不再混进同一个平均间隔。
 */
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./launch-app.mjs";

const repo = path.resolve(import.meta.dirname, "../..");
const Database = createRequire(path.join(repo, "app/gateway/package.json"))("better-sqlite3");
const key = process.env.OV_PLATFORM_KEY;
if (!key) throw new Error("OV_PLATFORM_KEY is required");
const config = {
  platform: { base_url: "https://maas.ovaijisuan.com/v1", api_key: key, chat_model: "deepseek-v4-1-flash" },
  models: { image: "qwen-image-pro-enhanced", image_edit: null, video: null, video_ref: null, video_upscale: null, music: null, music_edit: null, speech: null, music_engine: null, enhance_music_caption: false, voice_map: {}, image_upscale: null },
};
const out = path.resolve(repo, `.probe/pw/design-execute/${new Date().toISOString().replace(/[:.]/g, "-")}-online`);
mkdirSync(out, { recursive: true });

/** 落盘前先脱敏：`sk-` 开头的串只留前 3 位。 */
const redact = (value) => {
  if (typeof value === "string") return value.replace(/sk-[A-Za-z0-9_-]{6,}/g, (m) => `${m.slice(0, 3)}…redacted(${m.length})`);
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v)]));
  return value;
};

const first = await launchApp({ port: 9361, config });
await first.close();
try { execFileSync("pkill", ["-9", "-f", "app/desktop"]); } catch {}
await new Promise((resolve) => setTimeout(resolve, 1200));
const xdg = first.xdg;
const ws = first.workspace;
const dbPath = path.join(xdg, "..", "opencode.db");
const now = Date.now();
const oldDir = "/tmp/old-ws";
const payload = {
  format: "opencode-sessions-v1", exportedAt: new Date(now).toISOString(), sourceDirectory: oldDir, sessionCount: 1,
  sessions: [{ id: "ses_online", parent_id: null, directory: oldDir, title: "PW online", time_created: now, time_updated: now, slug: "online", version: "1.0" }],
  messages: [
    { id: "msg_online_user", session_id: "ses_online", time_created: now, time_updated: now, data: JSON.stringify({ role: "user", sessionID: "ses_online", time: { created: now }, agent: "general", model: { providerID: "custom", modelID: "deepseek-v4-1-flash" }, modelID: "deepseek-v4-1-flash", providerID: "custom", mode: "general", cost: 0, tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, path: { cwd: oldDir, root: oldDir } }) },
    { id: "msg_online_assistant", session_id: "ses_online", time_created: now + 1, time_updated: now + 1, data: JSON.stringify({ role: "assistant", sessionID: "ses_online", time: { created: now + 1, completed: now + 2 }, parentID: "msg_online_user", agent: "general", model: { providerID: "custom", modelID: "deepseek-v4-1-flash" }, modelID: "deepseek-v4-1-flash", providerID: "custom", mode: "general", cost: 0, tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, path: { cwd: oldDir, root: oldDir } }) },
  ],
  parts: [{ id: "prt_online", message_id: "msg_online_assistant", session_id: "ses_online", time_created: now + 1, time_updated: now + 1, data: JSON.stringify({ type: "tool", tool: "design_execute", callID: "tool-online", messageID: "msg_online_assistant", state: { status: "running", title: "design_execute", metadata: {}, input: { capabilityId: "generate_image:qwen-image-pro-enhanced", prompt: "真实任务：红色苹果", output: { resources: [{ key: "primary", mode: "create", name: "苹果" }], composition: { name: "苹果组", type: { label: "Generated" }, placements: [{ role: "image" }] } } }, output: "{}", time: { start: now } } }) }],
  todos: [],
};
const gw = spawn(process.execPath, [path.join(repo, "app/gateway/dist/main.js")], {
  env: { ...process.env, PORT: "39737", HILO_GATEWAY_ROLE: "app", HILO_PROJECT_ARCHITECTURE: "resource_v3", XDG_DATA_HOME: xdg, HOME: path.join(xdg, "..", "home"), HILO_OPENCODE_DB: dbPath, WORKSPACE_DIR: ws, OV_CONFIG_PATH: path.join(xdg, "..", "config.json") },
  stdio: "ignore",
});
const base = "http://127.0.0.1:39737";
for (let i = 0; i < 80; i++) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const imp = await fetch(`${base}/api/projects/archive/import`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload, oldDir, newDir: ws }) });
console.log("import", imp.status, await imp.text());
gw.kill("SIGTERM");

const app = await launchApp({ port: 9362, xdg, reset: false, config, callerKey: "pw-caller" });
const frameLog = [];
const requests = [];
app.page.on("websocket", (ws2) => {
  ws2.on("framesent", (event) => frameLog.push({ dir: "sent", at: Date.now(), payload: String(event.payload) }));
  ws2.on("framereceived", (event) => frameLog.push({ dir: "recv", at: Date.now(), payload: String(event.payload) }));
});
// T-2：记完整 URL + 时间戳，事后按来源分类，不再一锅算。
app.page.on("request", (request) => requests.push({ at: Date.now(), method: request.method(), url: request.url() }));
const db = new Database(dbPath, { readonly: true });
const row = db.prepare("SELECT id FROM session WHERE title = 'PW online'").get();
db.close();
await app.page.evaluate(({ ws, sid }) => window.hilo.ipcRenderer.invoke("storage:global-set", "workspaceSessionTabs", { [ws]: { focusedSessionId: sid, openedTabIds: [sid], updatedAt: Date.now() } }), { ws, sid: row.id });
await app.page.goto(`app://./workspace?workspaceId=${encodeURIComponent(ws)}`, { waitUntil: "domcontentloaded" });
await app.page.waitForTimeout(8000);

// 从主日志解析工作区 gateway 端口；对每个端口建任务，卡片所在端口会命中。
const log = readFileSync(path.join(xdg, "..", "ud", "logs", "main.log"), "utf8");
const wsUrls = [...log.matchAll(/ws:\/\/127\.0\.0\.1:(\d+)\/ws\?hilo_workspace=([0-9a-f]+)&hilo_workspace_instance=([0-9a-f-]+)&hilo_workspace_generation=(\d+)/g)].map((m) => ({ port: m[1], claim: m[2], instance: m[3], generation: m[4] }));
const ports = wsUrls.slice(-2);
const headersOf = ({ claim, instance, generation }) => ({ "x-hilo-workspace": claim, "x-hilo-workspace-instance": instance, "x-hilo-workspace-generation": generation });
const bodies = ports.map(async (item) => {
  const response = await fetch(`http://127.0.0.1:${item.port}/api/v3/execute`, { method: "POST", headers: { "Content-Type": "application/json", "x-hilo-agent-caller": "pw-caller", "x-session-id": row.id, "x-tool-use-id": "tool-online", ...headersOf(item) }, body: JSON.stringify({ capabilityId: "generate_image:qwen-image-pro-enhanced", prompt: "真实任务：红色苹果", output: { resources: [{ mode: "create", name: "苹果" }], composition: { name: "苹果组", type: { label: "Generated" }, placements: [{ role: "image" }] } } }) });
  const caps = await fetch(`http://127.0.0.1:${item.port}/api/v3/capabilities`, { headers: headersOf(item) }).then(async (r) => ({ status: r.status, body: (await r.text()).slice(0, 500) })).catch((error) => ({ status: 0, body: String(error) }));
  return { ...item, status: response.status, body: await response.text(), caps };
});
const created = await Promise.all(bodies);
console.log("execute", JSON.stringify(redact(created), null, 2));
// 等卡片从查询拿到任务（最多 90s），记录离线文案是否还在。
const started = Date.now();
let cardText = "";
let offline = false;
while (Date.now() - started < 90_000) {
  await app.page.waitForTimeout(3000);
  cardText = await app.page.locator('[data-action-ui-id="chat-design-execute"]').innerText().catch(() => "");
  offline = cardText.includes("连接暂时中断");
  if (/已完成|失败/.test(cardText) && !offline) break;
}
await app.page.mouse.move(2, 2);
await app.page.evaluate(() => document.activeElement?.blur?.());
const toggle = app.page.locator('[data-action-ui-id="chat-design-execute-toggle"]');
if (await toggle.count()) {
  for (let i = 0; i < 2; i++) {
    if ((await toggle.first().getAttribute("aria-expanded")) === "true") break;
    await toggle.first().click();
    await app.page.waitForTimeout(800);
  }
}
const outputs = await app.page.locator('[data-testid="design-execute-outputs"]').count();
const outputCards = await app.page.locator('[data-testid="design-execute-outputs"] [data-testid], [data-testid="design-execute-outputs"] img').count();
const frames = frameLog.map((item) => ({ dir: item.dir, at: item.at, type: (() => { try { return JSON.parse(item.payload).type; } catch { return undefined; } })(), subscriptionId: (() => { try { return JSON.parse(item.payload).subscriptionId; } catch { return undefined; } })() })).filter((item) => item.type);

// T-2：卡片自己的请求 = `GET /api/v3/tasks/<id>`，或带 toolUseId 的列表请求。
const isCardTaskGet = (url) => /\/api\/v3\/tasks\/[^/?]+$/.test(new URL(url).pathname) && !/\/api\/v3\/tasks\/(queue|lookup)$/.test(new URL(url).pathname);
const isCardList = (url) => new URL(url).pathname === "/api/v3/tasks" && new URL(url).searchParams.has("toolUseId");
const readyAt = frames.find((f) => f.dir === "recv" && f.type === "task_subscription_ready")?.at;
const bucketOf = (at) => (readyAt === undefined ? "no-ready" : at < readyAt ? "before-ready" : "after-ready");
const normalize = (url) => {
  const u = new URL(url);
  const params = [...u.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("&");
  return `${u.pathname}${params ? `?${params}` : ""}`;
};
const cardRequests = requests.filter((r) => isCardTaskGet(r.url) || isCardList(r.url));
const otherRequests = requests.filter((r) => r.url.includes("/api/v3/tasks") && !(isCardTaskGet(r.url) || isCardList(r.url)));
const gapsOf = (list) => list.slice(1).map((item, index) => item.at - list[index].at);
const cardByUrl = {};
for (const request of cardRequests) {
  const name = normalize(request.url);
  (cardByUrl[name] ??= []).push(request);
}
const cardPolling = Object.entries(cardByUrl).map(([url, list]) => {
  const before = list.filter((r) => bucketOf(r.at) === "before-ready");
  const after = list.filter((r) => bucketOf(r.at) === "after-ready");
  return {
    url,
    count: list.length,
    beforeReady: { count: before.length, intervalsMs: gapsOf(before) },
    afterReady: { count: after.length, intervalsMs: gapsOf(after) },
  };
});
const otherPolling = Object.entries(otherRequests.reduce((acc, r) => { const k = normalize(r.url); (acc[k] ??= []).push(r); return acc; }, {})).map(([url, list]) => ({ url, count: list.length, intervalsMs: gapsOf(list) }));

// T-1：任务 JSON 与资源查询（卡片显示产出靠的就是这两步）。
const taskJson = [];
const resourceLookup = [];
for (const item of created) {
  if (typeof item.body !== "string") continue;
  let parsed;
  try { parsed = JSON.parse(item.body); } catch { continue; }
  const taskId = parsed?.task?.id;
  if (!taskId) continue;
  const final = await fetch(`http://127.0.0.1:${item.port}/api/v3/tasks/${taskId}`, { headers: headersOf(item) }).then((r) => r.json()).catch((error) => ({ error: String(error) }));
  taskJson.push({ port: item.port, taskId, task: final });
  const outputsList = Array.isArray(final?.outputs) ? final.outputs : [];
  for (const output of outputsList) {
    if (typeof output.resourceId !== "string" || typeof output.versionId !== "string") continue;
    const looked = await fetch(`http://127.0.0.1:${item.port}/api/project/resources/get`, { method: "POST", headers: { "Content-Type": "application/json", ...headersOf(item) }, body: JSON.stringify({ selectors: [{ resourceId: output.resourceId, versionId: output.versionId }] }) }).then((r) => r.json()).catch((error) => ({ error: String(error) }));
    resourceLookup.push({ taskId, resourceId: output.resourceId, versionId: output.versionId, result: looked });
  }
}

const result = {
  ranAt: new Date().toISOString(),
  out,
  screenshot: path.join(out, "online.png"),
  ports: ports.map((item) => item.port),
  execute: redact(created),
  cardText,
  offline,
  outputs,
  outputCards,
  taskJson: redact(taskJson),
  resourceLookup: redact(resourceLookup),
  polling: {
    readyAt,
    constants: { LIVE_POLL_MS: 3000, RETRYABLE_POLL_MS: 15000, PUSHED_POLL_MS: 15000 },
    card: cardPolling,
    other: otherPolling,
  },
  frames,
  requests: redact(requests),
};
await app.page.screenshot({ path: path.join(out, "online.png"), fullPage: true });
writeFileSync(path.join(out, "result.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(redact({ out, outputs, outputCards, cardText, polling: result.polling, taskOutputs: taskJson.map((t) => ({ id: t.taskId, status: t.task?.status, outputs: t.task?.outputs })), resourceLookup: resourceLookup.map((r) => ({ ok: r.result?.[0]?.ok, version: r.result?.[0]?.detail?.version?.versionId })) }), null, 2));
await app.close();
process.exit(0);
