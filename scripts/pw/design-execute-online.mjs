#!/usr/bin/env node
/** 在线路径：归档种子 + 真实 /api/v3/execute 任务，验证卡片不在离线分支。 */
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
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
  parts: [{ id: "prt_online", message_id: "msg_online_assistant", session_id: "ses_online", time_created: now + 1, time_updated: now + 1, data: JSON.stringify({ type: "tool", tool: "design_execute", callID: "tool-online", messageID: "msg_online_assistant", state: { status: "running", title: "design_execute", metadata: {}, input: { capabilityId: "generate_image:qwen-image-pro-enhanced", prompt: "真实任务：红色苹果", output: { resources: [{ key: "primary", mode: "create", name: "苹果" }] } }, output: "{}", time: { start: now } } }) }],
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
const taskRequests = [];
app.page.on("websocket", (ws2) => {
  ws2.on("framesent", (event) => frameLog.push({ dir: "sent", at: Date.now(), payload: String(event.payload) }));
  ws2.on("framereceived", (event) => frameLog.push({ dir: "recv", at: Date.now(), payload: String(event.payload) }));
});
app.page.on("request", (request) => { if (request.url().includes("/api/v3/tasks")) taskRequests.push(Date.now()); });
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
const bodies = ports.map(async ({ port, claim, instance, generation }) => {
  const response = await fetch(`http://127.0.0.1:${port}/api/v3/execute`, { method: "POST", headers: { "Content-Type": "application/json", "x-hilo-agent-caller": "pw-caller", "x-session-id": row.id, "x-tool-use-id": "tool-online", "x-hilo-workspace": claim, "x-hilo-workspace-instance": instance, "x-hilo-workspace-generation": generation }, body: JSON.stringify({ capabilityId: "generate_image:qwen-image-pro-enhanced", prompt: "真实任务：红色苹果", output: { resources: [{ mode: "create", name: "苹果" }], composition: { name: "苹果组", type: { label: "Generated" }, placements: [{ role: "image" }] } } }) });
  const caps = await fetch(`http://127.0.0.1:${port}/api/v3/capabilities`, { headers: { "x-hilo-workspace": claim, "x-hilo-workspace-instance": instance, "x-hilo-workspace-generation": generation } }).then(async (r) => ({ status: r.status, body: (await r.text()).slice(0, 500) })).catch((error) => ({ status: 0, body: String(error) }));
  return { port, status: response.status, body: await response.text(), caps };
});
const created = await Promise.all(bodies);
console.log("execute", JSON.stringify(created, null, 2));
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
const frames = frameLog.map((item) => ({ dir: item.dir, type: (() => { try { return JSON.parse(item.payload).type; } catch { return undefined; } })(), at: item.at })).filter((item) => item.type);
const selectedFrames = frames.filter((item) => ["task_subscribe", "task_subscription_ready", "task_changed"].includes(item.type));
const polls = taskRequests.map((at, index) => (index === 0 ? 0 : at - taskRequests[index - 1]));
await app.page.screenshot({ path: path.join(out, "online.png"), fullPage: true });
console.log(JSON.stringify({ out, ports, created, cardText, offline, outputs, frames: selectedFrames, pollIntervalsMs: polls, screenshot: path.join(out, "online.png") }, null, 2));
await app.close();
process.exit(0);
