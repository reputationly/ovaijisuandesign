import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const repo = path.resolve(import.meta.dirname, "../..");
const out = path.resolve(repo, `.probe/pw/design-execute/${new Date().toISOString().replace(/[:.]/g, "-")}`);
mkdirSync(out, { recursive: true });
const electron = path.join(repo, "app/desktop/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const port = 9361;
const env = {
  ...process.env,
  OV_DEV_OPEN_WORKSPACES: "/tmp/ov-cmp/ws-a",
  OV_CONFIG_PATH: path.join(repo, "scripts/ui-compare/fixture/ui-compare-config.json"),
  HILO_DATA_DIR: path.join(out, "data"),
  HILO_PROJECT_ARCHITECTURE: "resource_v3",
};
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, [path.join(repo, "app/desktop"), `--remote-debugging-port=${port}`, "--disable-renderer-backgrounding"], { env, stdio: ["ignore", "pipe", "pipe"] });
try {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page = browser.contexts()[0].pages().find((item) => item.url().startsWith("app://"));
  await page.waitForTimeout(12_000);
  const results = [];
  for (const state of ["queued", "running", "completed", "failed"]) {
    await page.goto(`app://./workspace?workspaceId=${encodeURIComponent("/tmp/ov-cmp/ws-a")}#__ov-test-design-execute:${state}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(`[data-testid="design-execute-fixture"][data-fixture-state="${state}"] [data-action-ui-id="chat-design-execute"]`, { timeout: 30_000 });
    const ids = await page.$$eval('[data-testid="design-execute-fixture"] [data-action-ui-id]', (nodes) => nodes.map((node) => node.getAttribute("data-action-ui-id")));
    const text = (await page.locator('[data-testid="design-execute-fixture"]').innerText()).replace(/\s+/g, " ").slice(0, 300);
    const retry = await page.locator('[data-action-ui-id="chat-design-execute-retry"]').count();
    const taskAttr = await page.locator('[data-action-ui-id="chat-design-execute"]').getAttribute("data-task-id");
    await page.screenshot({ path: path.join(out, `design-execute-card-${state}.png`), fullPage: true });
    results.push({ state, ids, retry, taskAttr, text });
  }
  console.log(JSON.stringify({ out, results }, null, 2));
  await browser.close();
} finally {
  child.kill("SIGTERM");
}
