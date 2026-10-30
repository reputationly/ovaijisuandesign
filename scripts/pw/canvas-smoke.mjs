#!/usr/bin/env node
/**
 * 画布冒烟：**交付一个资源后，画布必须真的把它渲染成可交互节点。**
 *
 * 为什么需要（都是真机上发生过的）：
 *  - `design_deliver` 打错路由 → 交付 404，画布上什么都没有；
 *  - 画布把 `TooltipTrigger` 放进非根 Tooltip → Base UI #82，整棵画布子树被卸载；
 *  - `useMediaPlayback` 被还原成 store → `selector is not a function`，视频节点崩；
 *  - `NodeToolbarInner` 直接读 `items.length` → undefined 时整块画布白屏。
 *
 * 这四条的共同点是：**后端全绿、单测全绿，只有真窗口里才炸**。所以这里直接起真 App、
 * 走真网关交付、再在真渲染进程里断言"有节点、没有未捕获错误"。
 *
 * 只依赖系统能力（ps / Playwright-core / 内置 PNG），不装 ffmpeg，可在 CI 的 macOS 跑。
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { launchApp } from "./launch-app.mjs";

const PORT = Number(process.env.OV_SMOKE_PORT ?? 9388);
const ROOT = process.env.OV_SMOKE_ROOT ?? "/tmp/ov-pw";
const ARTIFACT_DIR = process.env.OV_SMOKE_ARTIFACTS ?? path.join(process.cwd(), "artifacts");
/** 1×1 透明 PNG：够小、不需要任何外部工具。 */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function gatewayProcesses(root) {
  const ps = execFileSync("ps", ["-Ao", "pid=,ppid=,command="], { encoding: "utf8" });
  const rows = [];
  for (const line of ps.split("\n")) {
    if (!line.includes("gateway/dist/main.js")) continue;
    if (!line.includes("蒜狸小助手.app") && !line.includes("ovaijisuandesign")) continue;
    const [pid, ppid] = line.trim().split(/\s+/);
    if (!pid) continue;
    let env = "";
    try {
      env = execFileSync("ps", ["eww", "-p", pid], { encoding: "utf8" });
    } catch {
      continue;
    }
    if (!env.includes("HILO_GATEWAY_ROLE=workspace")) continue;
    const pick = (key) => env.match(new RegExp(`${key}=(\\S+)`))?.[1];
    const dir = env.match(/WORKSPACE_DIR=(\S+)/)?.[1];
    if (!dir || !decodeURIComponent(dir).startsWith(root)) continue;
    rows.push({ pid: Number(pid), ppid: Number(ppid), port: pick("PORT"), claim: pick("HILO_WORKSPACE_CLAIM"), instance: pick("HILO_WORKSPACE_INSTANCE_ID"), generation: pick("HILO_WORKSPACE_GENERATION") ?? "1", agentKey: pick("HILO_AGENT_CALLER_KEY"), dir: decodeURIComponent(dir) });
  }
  return rows;
}

/** 上一次冒烟没退干净的 App 会一直占着同一批 fixture 目录 —— 交付会落到那些僵尸实例上。 */
function killStaleApps(root) {
  for (const row of gatewayProcesses(root)) {
    try {
      process.kill(row.ppid, "SIGKILL");
    } catch {}
    try {
      process.kill(row.pid, "SIGKILL");
    } catch {}
  }
}

function workspaceGateway(root, preferName) {
  const found = gatewayProcesses(root).sort((a, b) => b.pid - a.pid);
  // fixture 里 ws-a / ws-b 各有一个 workspace 网关 —— 必须挑**我们要打开的那个**，
  // 且优先用最新的那个（旧的可能是上一轮没退干净的实例）。
  return found.find((item) => path.basename(item.dir) === preferName) ?? found[0] ?? null;
}

killStaleApps(ROOT);
killStaleApps(ROOT);
const app = await launchApp({ mode: "recovered", port: PORT, root: ROOT, reset: true });
// 把渲染进程的报错收集起来写进 artifact —— 只截图看不出"哪个节点为什么崩"。
const consoleErrors = [];
app.page.on("pageerror", (error) => consoleErrors.push(`[pageerror] ${String(error).slice(0, 400)}`));
app.page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(`[console] ${message.text().slice(0, 400)}`);
});
const failures = [];
try {
  await app.page.waitForTimeout(4000);
  const target = process.env.OV_SMOKE_WORKSPACE ?? "ws-a";
  const gw = workspaceGateway(ROOT, target);
  if (!gw) throw new Error("没找到 workspace 角色的网关进程");
  if (!gw.dir) throw new Error("网关进程没有 WORKSPACE_DIR");

  // 把一张图放进工作区，然后用**真网关**交付成一个带 Composition 的资源。
  // 有 ffmpeg 就造一条真视频（画布的视频节点路径最长，最值得冒烟）；没有就退回 PNG。
  let sourceName = "smoke.png";
  let kindLabel = "静帧";
  try {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=320x180:rate=10:duration=1", "-pix_fmt", "yuv420p", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", "-shortest", path.join(gw.dir, "smoke.mp4")], { stdio: "ignore" });
    sourceName = "smoke.mp4";
    kindLabel = "视频";
  } catch {
    writeFileSync(path.join(gw.dir, "smoke.png"), PNG);
  }
  // 封面和分镜跟着成片一起交付（对应「视频交付必带封面与脚本」的规则）。
  writeFileSync(path.join(gw.dir, "smoke-cover.png"), PNG);
  writeFileSync(path.join(gw.dir, "storyboard.md"), "# 冒烟分镜\n00:00-00:01 测试画面\n");
  const res = await fetch(`http://127.0.0.1:${gw.port}/api/v3/deliveries`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hilo-workspace": gw.claim,
      "x-hilo-workspace-instance": gw.instance,
      "x-hilo-workspace-generation": gw.generation,
      // **必须带上 agent 身份**：网关按这个头把 actor 记成 agent，而画布只展示
      // `project_changelog` 里 actor=agent 的 composition（`listAgentPlacements`）。
      // 不带这个头 → 交付被记成 human → 画布永远看不到，这是第一版冒烟"0 节点"的真因。
      ...(gw.agentKey ? { "x-hilo-agent-caller": gw.agentKey } : {}),
    },
    body: JSON.stringify({
      requestId: `smoke-${Date.now()}`,
      // 三个产物一起交付：成片 + 封面 + 分镜，验收「视频交付必带封面与脚本」这条规则，
      // 同时验证一次交付多个 resource / 多个 placement 不会互相挤掉。
      sources: [
        { key: "film", path: sourceName },
        { key: "cover", path: "smoke-cover.png" },
        { key: "storyboard", path: "storyboard.md" },
      ],
      output: {
        resources: [
          { key: "film", mode: "create", name: "冒烟成片" },
          { key: "cover", mode: "create", name: "冒烟封面" },
          { key: "storyboard", mode: "create", name: "冒烟分镜" },
        ],
        composition: {
          name: "冒烟组合",
          type: { label: kindLabel },
          placements: [
            { key: "film", role: "成片" },
            { key: "cover", role: "封面" },
            { key: "storyboard", role: "分镜" },
          ],
        },
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status !== 200) throw new Error(`交付失败 HTTP ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  const placements = body?.delivery?.placements ?? [];
  const roles = placements.map((item) => item.role).sort();
  if (roles.join(",") !== ["分镜", "封面", "成片"].sort().join(",")) {
    failures.push(`交付的 placement 角色不对：${JSON.stringify(roles)}（期望 成片/封面/分镜）`);
  }

  // 打开这个工作区，等画布把节点渲染出来。
  // 一定要点**交付到的那个**工作区（fixture 里 ws-a / ws-b 同时存在，点错了就是空画布）。
  const targetName = path.basename(gw.dir);
  const pill = app.page.locator('[data-action-ui-id="home-sidebar.recent-pill"]', { hasText: targetName }).first();
  if (!(await pill.count())) throw new Error(`侧栏里找不到工作区 ${targetName}`);
  await pill.click();
  await app.page.waitForTimeout(3000);
  // 交付发生在打开工作区之前；刷新一次让画布重新拉取 composition 列表。
  await app.page.reload().catch(() => {});
  // 等画布真的连上并渲染出节点：左下角"已连接" + 节点出现（最多 30s）。
  // 直接 sleep 固定秒数会因为"工作区网关还在启动/WS 未连上"而随机读到 0 节点。
  await app.page
    .waitForFunction(
      () => document.querySelectorAll(".react-flow__node").length > 0,
      undefined,
      { timeout: 30000 },
    )
    .catch(() => {});

  const seen = await app.page.evaluate(() => ({
    nodes: document.querySelectorAll(".react-flow__node").length,
    nodeErrors: document.querySelectorAll("[data-canvas-node-render-error]").length,
    nodeErrorTexts: [...document.querySelectorAll("[data-canvas-node-render-error]")].map((el) => el.innerText.replace(/\n/g, " | ").slice(0, 300)),
    members: document.body.innerText.split("\n").filter((line) => ["成片", "封面", "分镜"].includes(line.trim())).length,
    uncaught: /Cannot read properties|is not a function|Base UI error|TypeError/.test(document.body.innerText)
      ? document.body.innerText.slice(0, 200)
      : "",
  }));

  if (seen.nodes < 1) failures.push(`画布上没有节点（nodes=${seen.nodes}）`);
  if (seen.members < 3) failures.push(`画布上只看到 ${seen.members} 个成员标签（期望 成片/封面/分镜 三个）`);
  if (seen.uncaught) failures.push(`页面出现未捕获错误：${seen.uncaught}`);

  mkdirSync(ARTIFACT_DIR, { recursive: true });
  await app.page.screenshot({ path: path.join(ARTIFACT_DIR, "canvas-smoke.png") });
  writeFileSync(
    path.join(ARTIFACT_DIR, "canvas-smoke.json"),
    JSON.stringify({ delivery: "ok", ...seen, consoleErrors: consoleErrors.slice(0, 20) }, null, 1),
  );
  console.log(JSON.stringify({ delivery: "ok", ...seen, consoleErrors: consoleErrors.slice(0, 6), artifact: path.join(ARTIFACT_DIR, "canvas-smoke.png") }, null, 1));
  if (seen.nodeErrorTexts.length) failures.push(`有 ${seen.nodeErrorTexts.length} 个节点渲染失败：${seen.nodeErrorTexts[0]}`);
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  await app.close?.();
}

if (failures.length) {
  console.error(`[canvas-smoke] 失败：\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("[canvas-smoke] 通过：交付后画布能看到节点且无未捕获错误");
