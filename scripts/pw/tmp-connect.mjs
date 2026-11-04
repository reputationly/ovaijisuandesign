import { launchApp } from "./launch-app.mjs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const root = "/tmp/ov-conn";
const app = await launchApp({ mode: "recovered", port: 9395, root, reset: true });
const page = app.page;
await page.waitForTimeout(4000);
const ps = execFileSync("ps", ["-Ao", "pid=,command="], { encoding: "utf8" });
let gw = null;
for (const line of ps.split("\n")) {
  if (!line.includes("gateway/dist/main.js") || (!line.includes("蒜狸小助手.app") && !line.includes("ovaijisuandesign"))) continue;
  const pid = Number(line.trim().split(/\s+/)[0]);
  let env = ""; try { env = execFileSync("ps", ["eww", "-p", String(pid)], { encoding: "utf8" }); } catch { continue; }
  if (!env.includes("HILO_GATEWAY_ROLE=workspace")) continue;
  const pick = (k) => env.match(new RegExp(`${k}=(\\S+)`))?.[1];
  const dir = env.match(/WORKSPACE_DIR=(\S+)/)?.[1];
  if (!dir || !decodeURIComponent(dir).startsWith(root)) continue;
  if (!gw || pid > gw.pid) gw = { pid, port: pick("PORT"), claim: pick("HILO_WORKSPACE_CLAIM"), inst: pick("HILO_WORKSPACE_INSTANCE_ID"), gen: pick("HILO_WORKSPACE_GENERATION") ?? "1", agent: pick("HILO_AGENT_CALLER_KEY"), dir: decodeURIComponent(dir) };
}
if (!gw) { console.log("no gw"); process.exit(1); }
// 两张图 + 一段音频
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PzWvWQAAAABJRU5ErkJggg==", "base64");
fs.writeFileSync(path.join(gw.dir, "a.png"), png);
fs.writeFileSync(path.join(gw.dir, "b.png"), png);
const rate = 8000, n = rate, data = Buffer.alloc(n * 2);
for (let i = 0; i < n; i += 1) data.writeInt16LE(Math.round(Math.sin((i / rate) * 2 * Math.PI * 300) * 8000), i * 2);
const h = Buffer.alloc(44);
h.write("RIFF",0); h.writeUInt32LE(36+data.length,4); h.write("WAVEfmt ",8); h.writeUInt32LE(16,16); h.writeUInt16LE(1,20); h.writeUInt16LE(1,22);
h.writeUInt32LE(rate,24); h.writeUInt32LE(rate*2,28); h.writeUInt16LE(2,32); h.writeUInt16LE(16,34); h.write("data",36); h.writeUInt32LE(data.length,40);
fs.writeFileSync(path.join(gw.dir, "c.wav"), Buffer.concat([h, data]));
const res = await fetch(`http://127.0.0.1:${gw.port}/api/v3/deliveries`, { method: "POST",
  headers: { "content-type": "application/json", "x-hilo-workspace": gw.claim, "x-hilo-workspace-instance": gw.inst, "x-hilo-workspace-generation": gw.gen, ...(gw.agent ? { "x-hilo-agent-caller": gw.agent } : {}) },
  body: JSON.stringify({ requestId: `conn-${Date.now()}`,
    sources: [{ key: "a", path: "a.png" }, { key: "b", path: "b.png" }, { key: "c", path: "c.wav" }],
    output: { resources: [{ key: "a", mode: "create", name: "图A" }, { key: "b", mode: "create", name: "图B" }, { key: "c", mode: "create", name: "音频C" }],
      composition: { name: "连线测试", type: { label: "画布" }, placements: [{ key: "a", role: "图A" }, { key: "b", role: "图B" }, { key: "c", role: "音频C" }] } } }) });
console.log("deliver", res.status);
const pill = page.locator('[data-action-ui-id="home-sidebar.recent-pill"]', { hasText: path.basename(gw.dir) }).first();
if (await pill.count()) await pill.click();
await page.waitForTimeout(2500);
await page.reload().catch(() => {});
await page.waitForTimeout(8000);
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
page.on("pageerror", (e) => errs.push("pageerror: " + String(e).slice(0, 200)));
await page.screenshot({ path: "/tmp/conn-before.png" });
const before = await page.evaluate(() => ({
  nodes: document.querySelectorAll(".react-flow__node").length,
  edges: document.querySelectorAll(".react-flow__edge").length,
  handles: document.querySelectorAll(".react-flow__handle").length,
}));
console.log("before", JSON.stringify(before));
// 从第一个节点的右侧 handle 拖到第二个节点
const hs = await page.locator(".react-flow__handle").all();
if (hs.length >= 2) {
  const a = await hs[0].boundingBox();
  const b = await hs[hs.length - 1].boundingBox();
  if (a && b) {
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 24 });
    await page.mouse.up();
  }
}
await page.waitForTimeout(1500);
const after = await page.evaluate(() => ({
  edges: document.querySelectorAll(".react-flow__edge").length,
  paths: document.querySelectorAll(".react-flow__edge-path").length,
}));
console.log("after", JSON.stringify(after));
await page.screenshot({ path: "/tmp/conn-after.png" });
console.log("console errors:", JSON.stringify(errs.slice(0, 6)));
await app.close?.();
