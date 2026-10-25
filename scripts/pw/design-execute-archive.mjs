#!/usr/bin/env node
/**
 * 方案 3：先启动一次应用让 opencode 建库，再用产品归档导入接口种一条会话，
 * 随后重新启动并打开该会话。参照/我方走同一份 opencode 数据。
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { launchApp } from "./launch-app.mjs";

const repo = path.resolve(import.meta.dirname, "../..");
const Database = createRequire(path.join(repo, "app/gateway/package.json"))("better-sqlite3");
const mode = process.argv.includes("--reference") ? "reference" : "recovered";
const first = await launchApp({ mode: process.env.PW_REFERENCE === "1" ? "recovered" : "recovered" });
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
const payload = {
  format: "opencode-sessions-v1",
  exportedAt: new Date(now).toISOString(),
  sourceDirectory: oldDir,
  sessionCount: 1,
  sessions: [{ id: "ses_seed", parent_id: null, directory: oldDir, title: "PW design execute", time_created: now, time_updated: now, slug: "pw", version: "1.0" }],
  messages: [
    { id: "msg_user", session_id: "ses_seed", time_created: now, time_updated: now, data: JSON.stringify({ role: "user", sessionID: "ses_seed", time: { created: now }, agent: "general", model: { providerID: "custom", modelID: "qwen" }, modelID: "qwen", providerID: "custom", mode: "general", cost: 0, tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, path: { cwd: oldDir, root: oldDir } }) },
    { id: "msg_seed", session_id: "ses_seed", time_created: now + 1, time_updated: now + 1, data: JSON.stringify({ role: "assistant", sessionID: "ses_seed", time: { created: now + 1, completed: now + 2 }, parentID: "msg_user", agent: "general", model: { providerID: "custom", modelID: "qwen" }, modelID: "qwen", providerID: "custom", mode: "general", cost: 0, tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, path: { cwd: oldDir, root: oldDir } }) },
  ],
  parts: [{ id: "prt_seed", message_id: "msg_seed", session_id: "ses_seed", time_created: now, time_updated: now, data: JSON.stringify({ type: "tool", tool: "design_execute", callID: "tool-pw", messageID: "msg_seed", state: { status: "completed", title: "design_execute", metadata: {}, input: { capabilityId: "generate_image:qwen-image", prompt: "PW 任务卡片", output: { resources: [{ key: "primary", mode: "create", name: "PW 图" }] } }, output: JSON.stringify({ task: { id: "tsk_pw", revision: 2, status: "completed", operation: "generate_image", capabilityId: "generate_image:qwen-image", outputs: [], origin: { source: "agent", toolUseId: "tool-pw" } } }), time: { start: now, end: now } } }) }],
  todos: [],
};
const imported = await fetch(`${base}/api/projects/archive/import`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload, oldDir, newDir: ws }) });
const importedBody = await imported.text();
console.log("import", imported.status, importedBody);
gateway.kill("SIGTERM");
const db2 = new Database(path.join(xdg, "..", "opencode.db"), { readonly: true });
const seeded = db2.prepare("SELECT id, title FROM session WHERE title = ?").get("PW design execute");
db2.close();
if (!seeded) throw new Error("seeded session not found");
const second = first;
const api = `http://127.0.0.1:39737`;
await second.page.evaluate(({ ws, sid }) => {
  localStorage.setItem("hilo:storage:global.workspaceSessionTabs", JSON.stringify({ [ws]: { focusedSessionId: sid, openedTabIds: [sid] } }));
}, { ws, sid: seeded.id });
await second.page.goto(`app://./workspace?workspaceId=${encodeURIComponent(ws)}`, { waitUntil: "domcontentloaded" });
await second.page.waitForTimeout(10_000);
let card = await second.page.locator('[data-action-ui-id="chat-design-execute"]').count();
if (!card) {
  const title = second.page.getByText("PW design execute", { exact: false });
  if (await title.count()) { await title.first().click(); await second.page.waitForTimeout(6000); card = await second.page.locator('[data-action-ui-id="chat-design-execute"]').count(); }
}
const bodyText = (await second.page.locator("body").innerText()).slice(0, 400);
await second.page.screenshot({ path: path.join(xdg, "..", "seeded-card.png"), fullPage: true });
console.log(JSON.stringify({ card, session: seeded.id, body: bodyText, screenshot: path.join(xdg, "..", "seeded-card.png") }, null, 2));
await second.close();
