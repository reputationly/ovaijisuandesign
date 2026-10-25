#!/usr/bin/env node
/**
 * 方案 3：不挂产品测试钩子，直接把一条 design_execute 会话种进 opencode DB，
 * 再让参照/我方从同一 gateway/opencode 读同一会话。
 *
 * 当前实现：建 opencode schema + session/message/part，启动本仓库 Electron 验证。
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const repo = path.resolve(import.meta.dirname, "../..");
const out = path.resolve(repo, `.probe/pw/design-execute/${new Date().toISOString().replace(/[:.]/g, "-")}`);
mkdirSync(out, { recursive: true });
const requireGateway = createRequire(path.join(repo, "app/gateway/package.json"));
const Database = requireGateway("better-sqlite3");
const dbPath = path.join(out, "opencode.db");
const db = new Database(dbPath);
db.exec(`
  CREATE TABLE project (id text PRIMARY KEY, worktree text NOT NULL, vcs text, name text, time_created integer NOT NULL, time_updated integer NOT NULL, sandboxes text NOT NULL);
  CREATE TABLE session (id text PRIMARY KEY, project_id text NOT NULL, workspace_id text, parent_id text, slug text NOT NULL, directory text NOT NULL, title text NOT NULL, version text NOT NULL,
    share_url text, summary_additions integer, summary_deletions integer, summary_files integer, summary_diffs text, revert text, permission text,
    time_created integer NOT NULL, time_updated integer NOT NULL, time_compacting integer, time_archived integer);
  CREATE TABLE message (id text PRIMARY KEY, session_id text NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL);
  CREATE TABLE part (id text PRIMARY KEY, message_id text NOT NULL, session_id text NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL);
  CREATE TABLE todo (session_id text NOT NULL, content text NOT NULL, status text NOT NULL, priority text NOT NULL, position integer NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, PRIMARY KEY (session_id, position));
`);
const ws = "/tmp/ov-cmp/ws-a";
const now = Date.now();
db.prepare("INSERT INTO project VALUES ('global','/',NULL,NULL,?,?, '[]')").run(now, now);
db.prepare("INSERT INTO session (id,project_id,parent_id,slug,directory,title,version,permission,time_created,time_updated) VALUES (?,?,?,?,?,?,?,?,?,?)").run("ses_pw", "global", null, "pw", ws, "PW design execute", "1.0", null, now, now);
db.prepare("INSERT INTO message VALUES (?,?,?,?,?)").run("msg_pw", "ses_pw", now, now, JSON.stringify({ role: "assistant", sessionID: "ses_pw", path: { cwd: ws } }));
const task = { id: "tsk_pw", revision: 2, status: "completed", operation: "generate_image", capabilityId: "generate_image:qwen-image", outputs: [], origin: { source: "agent", toolUseId: "tool-pw" } };
const part = { type: "tool", tool: "design_execute", callID: "tool-pw", messageID: "msg_pw", state: { status: "completed", input: { capabilityId: "generate_image:qwen-image", prompt: "PW 任务卡片", output: { resources: [{ key: "primary", mode: "create", name: "PW 图" }] } }, output: { task }, time: { start: now, end: now } } };
db.prepare("INSERT INTO part VALUES (?,?,?,?,?,?)").run("prt_pw", "msg_pw", "ses_pw", now, now, JSON.stringify(part));
db.close();

const electron = path.join(repo, "app/desktop/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const port = 9361;
const env = { ...process.env, OV_DEV_OPEN_WORKSPACES: ws, OV_CONFIG_PATH: path.join(repo, "scripts/ui-compare/fixture/ui-compare-config.json"), HILO_DATA_DIR: path.join(out, "data"), HILO_OPENCODE_DB: dbPath, HILO_PROJECT_ARCHITECTURE: "resource_v3" };
delete env.ELECTRON_RUN_AS_NODE;
if (process.env.PW_REFERENCE === "1") env.OV_UI = "reference";
const child = spawn(electron, [path.join(repo, "app/desktop"), `--remote-debugging-port=${port}`, "--disable-renderer-backgrounding"], { env, stdio: ["ignore", "pipe", "pipe"] });
try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page = browser.contexts()[0].pages().find((p) => p.url().startsWith("app://"));
  await page.waitForTimeout(12_000);
  await page.evaluate(({ ws, sid }) => {
    localStorage.setItem("hilo:storage:global.workspaceSessionTabs", JSON.stringify({ [ws]: { focusedSessionId: sid, openedTabIds: [sid] } }));
  }, { ws, sid: "ses_pw" });
  await page.goto(`app://./workspace?workspaceId=${encodeURIComponent(ws)}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8_000);
  const count = await page.locator('[data-action-ui-id="chat-design-execute"]').count();
  const body = (await page.locator("body").innerText()).slice(0, 400);
  await page.screenshot({ path: path.join(out, "design-execute-seeded.png"), fullPage: true });
  console.log(JSON.stringify({ out, count, body }, null, 2));
  await browser.close();
} finally { child.kill("SIGTERM"); }
