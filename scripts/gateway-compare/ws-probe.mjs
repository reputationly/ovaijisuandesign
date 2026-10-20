/**
 * WS 协议探针（第 252 轮，硬规则 5 的 WS 一半）。
 *
 * 向 /ws 依次发送一组 `task_subscribe` / `task_unsubscribe` 消息，
 * 记录服务端回的每一帧（type + 关键字段），输出可对比的 JSON。
 *
 * 用法：
 *   node scripts/gateway-compare/ws-probe.mjs --target ours [--out ws-ours.json]
 *   node scripts/gateway-compare/ws-probe.mjs --target http://127.0.0.1:8001   # 参照
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const target = args[args.indexOf("--target") + 1] ?? "ours";
const outIdx = args.indexOf("--out");
const OUT = outIdx >= 0 ? args[outIdx + 1] : `scripts/gateway-compare/ws-${target === "ours" ? "ours" : "ref"}.json`;
const PORT = Number(process.env.GW_COMPARE_PORT ?? 39737);
const REPO = process.cwd();

// 覆盖参照 TaskSubscriptions 的每条校验分支
const CASES = [
  { id: "missing-id",       msg: { type: "task_subscribe" } },
  { id: "empty-id",         msg: { type: "task_subscribe", subscriptionId: "" } },
  { id: "too-long-id",      msg: { type: "task_subscribe", subscriptionId: "x".repeat(129) } },
  { id: "ok-minimal",       msg: { type: "task_subscribe", subscriptionId: "s1" } },
  { id: "ok-with-ids",      msg: { type: "task_subscribe", subscriptionId: "s2", taskIds: ["a", "b"] } },
  { id: "bad-taskIds",      msg: { type: "task_subscribe", subscriptionId: "s3", taskIds: "not-array" } },
  { id: "bad-project-chg",  msg: { type: "task_subscribe", subscriptionId: "s4", includeProjectChanges: "yes" } },
  { id: "reused-id",        msg: { type: "task_subscribe", subscriptionId: "s1", taskIds: ["z"] } },
  { id: "unsubscribe",      msg: { type: "task_unsubscribe", subscriptionId: "s1" } },
];

let child = null;
if (target === "ours") {
  child = spawn(process.execPath, ["app/gateway/dist/main.js"], {
    cwd: REPO,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined, HILO_GATEWAY_ROLE: "workspace",
      WORKSPACE_DIR: path.join(REPO, ".probe/gw-compare-ws"),
      HILO_PROJECT_ARCHITECTURE: "resource_v3",
      HILO_DATA_DIR: path.join(REPO, ".probe/gw-compare-data"),
      PORT: String(PORT), HILO_PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
}
const base = target === "ours" ? `http://127.0.0.1:${PORT}` : target;
const wsUrl = base.replace(/^http/, "ws") + "/ws";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitReady() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try { const r = await fetch(`${base}/api/v3/tasks`, { signal: AbortSignal.timeout(2000) }); if (r.status < 500) return true; } catch {}
    await sleep(400);
  }
  return false;
}

const results = [];
try {
  if (!await waitReady()) { console.error("✗ gateway 没起来"); process.exit(1); }
  const ws = new WebSocket(wsUrl);
  const frames = [];
  ws.addEventListener("message", (e) => { try { frames.push(JSON.parse(String(e.data))); } catch { frames.push({ raw: String(e.data) }); } });
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
    setTimeout(() => reject(new Error("WS 打开超时")), 10000);
  });
  for (const c of CASES) {
    const before = frames.length;
    ws.send(JSON.stringify(c.msg));
    await sleep(400);
    results.push({ id: c.id, sent: c.msg.type, replies: frames.slice(before).map((f) => f.type ?? "?") , detail: frames.slice(before) });
  }
  ws.close();
} finally {
  child?.kill("SIGKILL");
}
writeFileSync(OUT, JSON.stringify({ target, wsUrl, results }, null, 1));
console.log(`${results.length} 个用例 → ${OUT}`);
for (const r of results) console.log(`  ${r.id.padEnd(16)} → ${r.replies.join(", ") || "（无回复）"}`);
