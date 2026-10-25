#!/usr/bin/env node
/**
 * 方案 3：先启动一次应用让 opencode 建库，再用产品归档导入接口种一条会话，
 * 随后重新启动并打开该会话。参照/我方走同一份 opencode 数据。
 */
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { launchApp } from "./launch-app.mjs";

const repo = path.resolve(import.meta.dirname, "../..");
const Database = createRequire(path.join(repo, "app/gateway/package.json"))("better-sqlite3");
const mode = process.argv.includes("--reference") ? "reference" : "recovered";
const first = await launchApp({ port: 9361 });
await first.close();
try { execFileSync("pkill", ["-9", "-f", "app/desktop"]); } catch {}
await new Promise((resolve) => setTimeout(resolve, 1500));
const xdg = first.xdg;
const ws = first.workspace;

const gateway = spawn(process.execPath, [path.join(repo, "app/gateway/dist/main.js")], {
  env: {
    ...process.env,
    PORT: "39737",
    HILO_GATEWAY_ROLE: "app",
    HILO_PROJECT_ARCHITECTURE: "resource_v3",
    XDG_DATA_HOME: xdg,
    HOME: path.join(xdg, "..", "home"),
    HILO_OPENCODE_DB: path.join(xdg, "..", "opencode.db"),
    WORKSPACE_DIR: ws,
    OV_CONFIG_PATH: path.join(repo, "scripts/ui-compare/fixture/ui-compare-config.json"),
  },
  stdio: "ignore",
});
const base = "http://127.0.0.1:39737";
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
  await new Promise((resolve) => setTimeout(resolve, 500));
}
const now = Date.now();
const oldDir = "/tmp/old-ws";
const states = ["queued", "running", "completed", "failed"];
const sessions = [];
const messages = [];
const parts = [];
for (const [index, state] of states.entries()) {
  const sid = `ses_${state}`;
  const uid = `msg_${state}_user`;
  const aid = `msg_${state}_assistant`;
  const pid = `prt_${state}`;
  const baseTask = { id: `tsk_${state}`, revision: 2, operation: "generate_image", capabilityId: "generate_image:qwen-image", outputs: [], origin: { source: "agent", toolUseId: `tool-${state}` } };
  const task = state === "queued" ? { ...baseTask, status: "accepted", progress: { phase: "queued", subtasks: [{ phase: "queued" }] } }
    : state === "running" ? { ...baseTask, status: "running", progress: { phase: "running", subtasks: [{ phase: "running" }] } }
    : state === "failed" ? { ...baseTask, status: "failed", actions: ["retry", "stop"], problem: { message: "provider exploded" } }
    : { ...baseTask, status: "completed" };
  sessions.push({ id: sid, parent_id: null, directory: oldDir, title: `PW ${state}`, time_created: now + index, time_updated: now + index, slug: state, version: "1.0" });
  messages.push(
    { id: uid, session_id: sid, time_created: now + index, time_updated: now + index, data: JSON.stringify({ role: "user", sessionID: sid, time: { created: now + index }, agent: "general", model: { providerID: "custom", modelID: "qwen" }, modelID: "qwen", providerID: "custom", mode: "general", cost: 0, tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, path: { cwd: oldDir, root: oldDir } }) },
    { id: aid, session_id: sid, time_created: now + index + 1, time_updated: now + index + 1, data: JSON.stringify({ role: "assistant", sessionID: sid, time: { created: now + index + 1, completed: now + index + 2 }, parentID: uid, agent: "general", model: { providerID: "custom", modelID: "qwen" }, modelID: "qwen", providerID: "custom", mode: "general", cost: 0, tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, path: { cwd: oldDir, root: oldDir } }) },
  );
  parts.push({ id: pid, message_id: aid, session_id: sid, time_created: now + index + 1, time_updated: now + index + 1, data: JSON.stringify({ type: "tool", tool: "design_execute", callID: `tool-${state}`, messageID: aid, state: { status: "completed", title: "design_execute", metadata: {}, input: { capabilityId: "generate_image:qwen-image", prompt: "PW 任务卡片", output: { resources: [{ key: "primary", mode: "create", name: "PW 图" }] } }, output: JSON.stringify({ task }), time: { start: now, end: now } } }) });
}
const payload = { format: "opencode-sessions-v1", exportedAt: new Date(now).toISOString(), sourceDirectory: oldDir, sessionCount: sessions.length, sessions, messages, parts, todos: [] };
const imported = await fetch(`${base}/api/projects/archive/import`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload, oldDir, newDir: ws }) });
const importedBody = await imported.text();
console.log("import", imported.status, importedBody);
gateway.kill("SIGTERM");
const db2 = new Database(path.join(xdg, "..", "opencode.db"), { readonly: true });
const seededRows = db2.prepare("SELECT id, title FROM session WHERE title LIKE 'PW %'").all();
db2.close();
if (seededRows.length !== 4) throw new Error(`seeded sessions ${seededRows.length}`);
const outDir = path.resolve(repo, `.probe/pw/design-execute/${new Date().toISOString().replace(/[:.]/g, "-")}-${mode}`);
const results = [];
for (const [index, state] of states.entries()) {
  const row = seededRows.find((item) => item.title === `PW ${state}`);
  if (!row) continue;
  const app = await launchApp({ mode, port: 9370 + index, xdg, reset: false });
  await app.page.evaluate(async ({ ws, sid }) => {
    const record = { [ws]: { focusedSessionId: sid, openedTabIds: [sid], updatedAt: Date.now() } };
    localStorage.setItem("hilo:storage:global.workspaceSessionTabs", JSON.stringify(record));
    await window.hilo.ipcRenderer.invoke("storage:global-set", "workspaceSessionTabs", record);
  }, { ws, sid: row.id });
  await app.page.goto(`app://./workspace?workspaceId=${encodeURIComponent(ws)}`, { waitUntil: "domcontentloaded" });
  await app.page.waitForTimeout(10_000);
  const card = await app.page.locator('[data-action-ui-id="chat-design-execute"]').count();
  const toggle = app.page.locator('[data-action-ui-id="chat-design-execute-toggle"]');
  if (await toggle.count()) { await toggle.first().click(); await app.page.waitForTimeout(500); }
  const text = (await app.page.locator('[data-action-ui-id="chat-design-execute"]').innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
  await app.page.mouse.move(2, 2);
  await app.page.evaluate(() => document.activeElement?.blur?.());
  await app.page.waitForTimeout(200);
  const screenshot = path.join(outDir, `${state}.png`);
  await app.page.screenshot({ path: screenshot, fullPage: true });
  results.push({ state, card, text, screenshot });
  await app.close();
  try { execFileSync("pkill", ["-9", "-f", "app/desktop"]); } catch {}
  await new Promise((resolve) => setTimeout(resolve, 1200));
}
console.log(JSON.stringify({ mode, results }, null, 2));
process.exit(0);
