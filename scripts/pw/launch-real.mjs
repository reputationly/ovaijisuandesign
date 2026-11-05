/** 用真实 profile 起开发态 App（保留登录态），连上 CDP 后脱离。 */
import { spawn } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright-core";

const repo = "/Users/reputationly/Desktop/code/api/ovaijisuandesign";
const port = Number(process.env.PROBE_PORT ?? 9435);
const electron = path.join(repo, "app/desktop/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
for (const key of ["OV_USER_DATA_DIR", "HILO_DATA_DIR", "OV_CONFIG_PATH", "OV_DEV_OPEN_WORKSPACES", "HILO_PROJECT_ARCHITECTURE", "XDG_DATA_HOME"]) delete env[key];

const child = spawn(electron, [path.join(repo, "app/desktop"), `--remote-debugging-port=${port}`], { env, stdio: "ignore", detached: true });
child.unref();
console.log("pid", child.pid);
for (let i = 0; i < 120; i++) {
  try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
for (let i = 0; i < 40; i++) {
  const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).catch(() => []);
  if (list.some((t) => (t.url || "").startsWith("app://"))) { console.log("ready:", list.length, "targets"); process.exit(0); }
  await new Promise((r) => setTimeout(r, 1000));
}
console.log("no app:// target yet");
