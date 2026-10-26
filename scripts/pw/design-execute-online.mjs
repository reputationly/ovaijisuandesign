#!/usr/bin/env node
/**
 * 在线路径：归档种子 + 真实 /api/v3/execute 任务，验证卡片不在离线分支。
 *
 * T-3：每次运行把证据写到 `.probe/pw/design-execute/<ts>-online/result.json`
 *      （帧、请求、任务 JSON、资源查询、卡片文案；`sk-` 串一律脱敏）。
 * T-2：轮询间隔只统计**卡片自己的**请求，并按推送就绪前/后分段；其他来源
 *      （任务面板、队列）单独列出来，不再混进同一个平均间隔。
 *
 * # 两种跑法
 *
 *   OV_PLATFORM_KEY=… node scripts/pw/design-execute-online.mjs
 *       真实平台。花钱，一个场景跑一次就够。
 *
 *   node scripts/pw/design-execute-online.mjs --self-test
 *       本地假平台，**零成本**。链路（归档种子 → /api/v3/execute → 卡片 → media 区）
 *       与真实跑法完全一样，只有平台那一侧的响应是假的 —— 所以 T-1 要的
 *       "截图里 media 区有产出"可以先用它取证，不必等 key。
 */
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./launch-app.mjs";

const repo = path.resolve(import.meta.dirname, "../..");
const req = createRequire(path.join(repo, "app/gateway/package.json"));
const Database = req("better-sqlite3");
const args = process.argv.slice(2);
const selfTest = args.includes("--self-test");
/**
 * `--real-session`：**真实会话**。对话类接口原样转发到真实平台（这里才花钱），
 * 生图/视频仍然由假平台返回（加 `--fake-delay` 让任务跑够久，才量得到轮询）。
 * 这样整轮只有对话产生费用。
 */
const realSession = args.includes("--real-session");
/** `--fake-delay <ms>`：假平台把"出图"拖慢，用来量轮询间隔（只在 --self-test 下有意义）。 */
const fakeDelayMs = (() => {
  const at = args.indexOf("--fake-delay");
  return at >= 0 ? Number(args[at + 1]) || 0 : 0;
})();
const key = selfTest ? "sk-selftest" : process.env.OV_PLATFORM_KEY;
if (!key) throw new Error("OV_PLATFORM_KEY is required（想先验证链路，用 --self-test）");

const IMAGE_MODEL = "qwen-image-pro-enhanced";
const VIDEO_MODEL = "minimax-h3-2k";
// 默认跑图片；`--capability generate_video:<model>` 可以换成视频（T-2 要测的就绪前后两段
// 间隔，得有一个跑得比轮询间隔久一点的任务才测得出来）。
const capabilityId = (() => {
  const at = args.indexOf("--capability");
  return at >= 0 && args[at + 1] ? args[at + 1] : `generate_image:${IMAGE_MODEL}`;
})();
const isVideo = capabilityId.startsWith("generate_video:");
const placementRole = isVideo ? "video" : "image";
const outputName = isVideo ? "视频" : "苹果";
const prompt = isVideo ? "一只橘猫在窗台上打哈欠" : "真实任务：红色苹果";
/** 归档种子 part 与真正那次 `/api/v3/execute` 共用同一份入参，避免两处漂移。 */
const inputPayload = {
  capabilityId,
  prompt,
  output: {
    resources: [{ key: "primary", mode: "create", name: outputName }],
    composition: { name: `${outputName}组`, type: { label: "Generated" }, placements: [{ role: placementRole }] },
  },
};

/**
 * 假平台：目录 + 同步出图 + 产物下载。**目录是真的目录形状** —— 客户端会拿它当
 * 能力来源（L-1），少了 `generate_image:qwen-image-pro-enhanced` 这条，`/api/v3/execute`
 * 会在校验那一步就 422，截图里当然也没有产出。
 */
async function startFakePlatform() {
  const png = await req("sharp")({ create: { width: 64, height: 64, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 1 } } }).png().toBuffer();
  const server = createServer((request, res) => {
    const base = `http://127.0.0.1:${server.address().port}`;
    const json = (payload) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(payload));
    };
    if (request.url === "/v1/ov/capabilities") {
      return json({
        version: "pw-selftest-v1",
        capabilities: [
          {
            id: `generate_image:${IMAGE_MODEL}`,
            operation: "generate_image",
            model: IMAGE_MODEL,
            displayName: { zh: "Qwen 增强", en: "Qwen Enhanced" },
            transport: { kind: "images" },
            paramSchema: { type: "object", properties: { aspect_ratio: { type: "string", enum: ["adaptive", "1:1"], default: "adaptive", title: "宽高比" } } },
            limits: { maxReferenceImages: 0, maxDurationSeconds: 0, maxInputBytes: 0 },
            default: true,
          },
          {
            id: `generate_video:${VIDEO_MODEL}`,
            operation: "generate_video",
            model: VIDEO_MODEL,
            transport: { kind: "videos_task" },
            taskTypes: ["t2v"],
            default: true,
          },
          { id: "chat:deepseek-v4-1-flash", operation: "chat", model: "deepseek-v4-1-flash", transport: { kind: "chat" } },
        ],
      });
    }
    // 对话类接口：原样转发到真实平台。只有这一类会花钱。
    // 流式响应要边读边写 —— 一次性 `await upstream.text()` 会把 SSE 变成一坨，
    // 客户端的流式解析直接罢工。
    const passthrough = new Set(["/v1/chat/completions", "/v1/responses", "/v1/messages", "/v1/models"]);
    if (realSession && passthrough.has(request.url.split("?")[0])) {
      const upstreamUrl = `https://maas.ovaijisuan.com${request.url}`;
      const forward = async () => {
        const init = {
          method: request.method,
          headers: {
            "content-type": request.headers["content-type"] ?? "application/json",
            accept: request.headers.accept ?? "*/*",
            authorization: `Bearer ${key}`,
          },
          ...(request.method === "GET" ? {} : { body: request, duplex: "half" }),
        };
        const upstream = await fetch(upstreamUrl, init);
        res.writeHead(upstream.status, {
          "content-type": upstream.headers.get("content-type") ?? "application/json",
          ...(upstream.headers.get("cache-control") ? { "cache-control": upstream.headers.get("cache-control") } : {}),
        });
        if (!upstream.body) return res.end();
        for await (const chunk of upstream.body) res.write(chunk);
        res.end();
      };
      forward().catch((error) => {
        res.statusCode = 502;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ error: { message: `upstream failed: ${String(error).slice(0, 200)}`, type: "upstream_error", code: "upstream_failed" } }));
      });
      return;
    }
    if (request.url === "/v1/images/generations") {
      // `--fake-delay` 让"任务"慢一点：轮询间隔要有一个跑得比间隔久的任务才测得出来。
      if (fakeDelayMs > 0) return setTimeout(() => json({ data: [{ url: `${base}/files/out.png` }] }), fakeDelayMs);
      return json({ data: [{ url: `${base}/files/out.png` }] });
    }
    if (request.url === "/files/out.png") {
      res.setHeader("content-type", "image/png");
      return res.end(png);
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server;
}

const fakePlatform = selfTest || realSession ? await startFakePlatform() : null;
const baseUrl = fakePlatform ? `http://127.0.0.1:${fakePlatform.address().port}/v1` : "https://maas.ovaijisuan.com/v1";
const config = {
  platform: { base_url: baseUrl, api_key: realSession ? "sk-proxy-local" : key, chat_model: "deepseek-v4-1-flash" },
  models: { image: IMAGE_MODEL, image_edit: null, video: VIDEO_MODEL, video_ref: null, video_upscale: null, music: null, music_edit: null, speech: null, music_engine: null, enhance_music_caption: false, voice_map: {}, image_upscale: null },
};
const mode = realSession ? "real-session" : selfTest ? "selftest" : "online";
const out = path.resolve(repo, `.probe/pw/design-execute/${new Date().toISOString().replace(/[:.]/g, "-")}-${mode}`);
mkdirSync(out, { recursive: true });

/** 落盘前先脱敏：`sk-` 开头的串只留前 3 位。 */
const redact = (value) => {
  if (typeof value === "string") return value.replace(/sk-[A-Za-z0-9_-]{6,}/g, (m) => `${m.slice(0, 3)}…redacted(${m.length})`);
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v)]));
  return value;
};

if (realSession) {
  await runRealSession();
  fakePlatform?.close();
  process.exit(0);
}

const first = await launchApp({ port: 9361, config, showWindow: true });
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
  parts: [{ id: "prt_online", message_id: "msg_online_assistant", session_id: "ses_online", time_created: now + 1, time_updated: now + 1, data: JSON.stringify({ type: "tool", tool: "design_execute", callID: "tool-online", messageID: "msg_online_assistant", state: { status: "running", title: "design_execute", metadata: {}, input: inputPayload, output: "{}", time: { start: now } } }) }],
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

const app = await launchApp({ port: 9362, xdg, reset: false, config, callerKey: "pw-caller", showWindow: true });
const frameLog = [];
const requests = [];
app.page.on("websocket", (ws2) => {
  ws2.on("framesent", (event) => frameLog.push({ dir: "sent", at: Date.now(), payload: String(event.payload) }));
  ws2.on("framereceived", (event) => frameLog.push({ dir: "recv", at: Date.now(), payload: String(event.payload) }));
});
// T-2：记完整 URL + 时间戳，事后按来源分类，不再一锅算。
app.page.on("request", (request) => requests.push({ at: Date.now(), method: request.method(), url: request.url() }));
// 页面异常必须进证据：卡片没渲染出来是"跑失败"，但**为什么**没渲染只在 pageerror / console
// 里。少了这一项，异常兜底页（"出现异常"）会被误读成"卡片没出现"。
// 卡片显示产出要两步：查资源 → 拉文件。这两步失败时界面只写"预览加载失败"，
// 不带原因，所以把它们的响应体也记下来（只记这两类路径，避免噪音）。
const probes = [];
app.page.on("response", (response) => {
  const url = response.url();
  if (!/\/api\/project\/resources\/get|\/files\/|\/api\/v3\/tasks/.test(url)) return;
  const entry = { at: Date.now(), url: url.split("?")[0], status: response.status(), body: "" };
  probes.push(entry);
  response.text().then((text) => { entry.body = text.slice(0, 900); }).catch(() => {});
});
const pageErrors = [];
app.page.on("pageerror", (error) => pageErrors.push({ kind: "pageerror", at: Date.now(), message: String(error?.message ?? error), stack: String(error?.stack ?? "").slice(0, 4000) }));
app.page.on("console", (message) => {
  if (!["error", "warning", "log"].includes(message.type())) return;
  pageErrors.push({ kind: `console.${message.type()}`, at: Date.now(), message: message.text().slice(0, 2000) });
});
const db = new Database(dbPath, { readonly: true });
const row = db.prepare("SELECT id FROM session WHERE title = 'PW online'").get();
db.close();
await app.page.evaluate(({ ws, sid }) => window.hilo.ipcRenderer.invoke("storage:global-set", "workspaceSessionTabs", { [ws]: { focusedSessionId: sid, openedTabIds: [sid], updatedAt: Date.now() } }), { ws, sid: row.id });
await app.page.goto(`app://./workspace?workspaceId=${encodeURIComponent(ws)}`, { waitUntil: "domcontentloaded" });
await app.page.waitForTimeout(8000);
// **窗口要置前**：`refetchIntervalInBackground` 默认 false，窗口在后台时 React Query 会暂停
// 轮询 —— 实测后台状态下 145 秒只发出 1 次卡片查询，看着像"轮询坏了"，其实是被节流掉。
await app.page.bringToFront().catch(() => {});
// 轮询诊断开关：task-query.js 看到它才打 [poll-debug]。
await app.page.evaluate(() => { window.__OV_POLL_DEBUG = true; }).catch(() => {});

// 从主日志解析工作区 gateway 端口；对每个端口建任务，卡片所在端口会命中。
const log = readFileSync(path.join(xdg, "..", "ud", "logs", "main.log"), "utf8");
const wsUrls = [...log.matchAll(/ws:\/\/127\.0\.0\.1:(\d+)\/ws\?hilo_workspace=([0-9a-f]+)&hilo_workspace_instance=([0-9a-f-]+)&hilo_workspace_generation=(\d+)/g)].map((m) => ({ port: m[1], claim: m[2], instance: m[3], generation: m[4] }));
const ports = wsUrls.slice(-2);
const headersOf = ({ claim, instance, generation }) => ({ "x-hilo-workspace": claim, "x-hilo-workspace-instance": instance, "x-hilo-workspace-generation": generation });
const bodies = ports.map(async (item) => {
  const response = await fetch(`http://127.0.0.1:${item.port}/api/v3/execute`, { method: "POST", headers: { "Content-Type": "application/json", "x-hilo-agent-caller": "pw-caller", "x-session-id": row.id, "x-tool-use-id": "tool-online", ...headersOf(item) }, body: JSON.stringify(inputPayload) });
  const caps = await fetch(`http://127.0.0.1:${item.port}/api/v3/capabilities`, { headers: headersOf(item) }).then(async (r) => ({ status: r.status, body: (await r.text()).slice(0, 500) })).catch((error) => ({ status: 0, body: String(error) }));
  return { ...item, status: response.status, body: await response.text(), caps };
});
const created = await Promise.all(bodies);
console.log("execute", JSON.stringify(redact(created), null, 2));

// **把真实任务写回工具 part 的输出。** 真实链路里 MCP 工具返回的就是 `{task:{…}}`，
// 卡片靠它拿到 `taskId` 才会开始轮询（`useDesignTask` 的 `enabled` 要求
// `taskId || callID`）。只种一个 `output:"{}"` 的话查询会被关掉，界面上的状态更新
// 全部来自推送 —— 那测到的是"推送"，不是"轮询"，间隔永远是 0 次。
{
  const taskBody = (() => {
    try { return JSON.parse(created[0]?.body ?? "").task ?? null; } catch { return null; }
  })();
  if (taskBody) {
    const rw = new Database(dbPath);
    // 导入会重写 id（`prt_online` 变成 `prt_<…>`），所以按"这条 part 是 design_execute
    // 工具调用"来找，不要按种子里的 id 找 —— 按 id 找会静默命中 0 行。
    const part = rw
      .prepare("SELECT id, data FROM part WHERE data LIKE '%\"tool\":\"design_execute\"%' ORDER BY rowid DESC LIMIT 1")
      .get();
    if (part) {
      const data = JSON.parse(part.data);
      data.state.output = JSON.stringify({ task: taskBody });
      data.state.time = { ...(data.state.time ?? {}), end: Date.now() };
      rw.prepare("UPDATE part SET data = ? WHERE id = ?").run(JSON.stringify(data), part.id);
    }
    rw.close();
    await app.page.reload({ waitUntil: "domcontentloaded" });
    await app.page.waitForTimeout(6000);
    await app.page.bringToFront().catch(() => {});
    await app.page.evaluate(() => { window.__OV_POLL_DEBUG = true; }).catch(() => {});
  }
}
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
// 产出区要多等一会儿：卡片先出现，资源路径查询与缩略图是随后两次请求。
// 只等卡片文案就截图，会拍到"预览加载失败"的中间态（看起来像 bug，其实是在加载）。
let outputs = 0;
let outputCards = 0;
let outputHtml = "";
for (let i = 0; i < 20; i++) {
  outputs = await app.page.locator('[data-testid="design-execute-outputs"]').count();
  if (outputs > 0) {
    outputCards = await app.page.locator('[data-testid="design-execute-outputs"] img, [data-testid="design-execute-outputs"] video, [data-testid="design-execute-outputs"] [data-action-ui-id]').count();
    if (outputCards > 0) {
      // 元素在 ≠ 画出来了。缩略图要等 `complete && naturalWidth>0`（video 同理），
      // 否则截图里是一个空框，看起来像"图没出来"。
      const painted = await app.page
        .evaluate(() => {
          const root = document.querySelector('[data-testid="design-execute-outputs"]');
          if (!root) return false;
          const media = [...root.querySelectorAll("img, video")];
          return media.length > 0 && media.every((el) => (el.tagName === "IMG" ? el.complete && el.naturalWidth > 0 : el.readyState >= 2 || el.videoWidth > 0));
        })
        .catch(() => false);
      if (painted) break;
    }
  }
  await app.page.waitForTimeout(1000);
}
outputHtml = await app.page.locator('[data-testid="design-execute-outputs"]').first().innerHTML().catch(() => "");
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
  selfTest,
  baseUrl,
  execute: redact(created),
  cardText,
  offline,
  outputs,
  outputCards,
  outputHtml: redact(outputHtml).slice(0, 1500),
  taskJson: redact(taskJson),
  resourceLookup: redact(resourceLookup),
  polling: {
    readyAt,
    constants: { LIVE_POLL_MS: 3000, RETRYABLE_POLL_MS: 15000, PUSHED_POLL_MS: 15000 },
    card: cardPolling,
    other: otherPolling,
  },
  frames,
  // 轮询测量只在"窗口在前台"时有效；把当时的可见性/焦点记下来，免得误读。
  visibility: await app.page.evaluate(() => ({ state: document.visibilityState, hasFocus: document.hasFocus() })).catch(() => null),
  pageErrors: redact(pageErrors),
  probes: redact(probes),
  requests: redact(requests),
};
await app.page.screenshot({ path: path.join(out, "online.png"), fullPage: true });
writeFileSync(path.join(out, "result.json"), JSON.stringify(result, null, 2));
if (pageErrors.length) console.log("页面异常：", JSON.stringify(redact(pageErrors).slice(0, 5), null, 2));
console.log(JSON.stringify(redact({ out, outputs, outputCards, cardText, pageErrors: pageErrors.slice(0, 3), polling: result.polling, taskOutputs: taskJson.map((t) => ({ id: t.taskId, status: t.task?.status, outputs: t.task?.outputs })), resourceLookup: resourceLookup.map((r) => ({ ok: r.result?.[0]?.ok, version: r.result?.[0]?.detail?.version?.versionId })) }), null, 2));
await app.close();
fakePlatform?.close();
process.exit(0);

/**
 * 真实会话：从对话框发一句话，让 **agent 自己** 调 `design_execute`。
 *
 * 只有对话打真实平台（假平台转发 + 注入真 key），生图/视频仍由假平台返回并延迟
 * `--fake-delay` —— 这样整轮只有对话产生费用，而任务又跑得够久，才量得到轮询。
 */
async function runRealSession() {
  const app = await launchApp({ port: 9362, config, showWindow: true });
  const requests = [];
  const frameLog = [];
  const pageErrors = [];
  const probes = [];
  app.page.on("websocket", (ws) => {
    ws.on("framesent", (event) => frameLog.push({ dir: "sent", at: Date.now(), payload: String(event.payload) }));
    ws.on("framereceived", (event) => frameLog.push({ dir: "recv", at: Date.now(), payload: String(event.payload) }));
  });
  app.page.on("request", (request) => {
    const headers = request.headers();
    requests.push({ at: Date.now(), method: request.method(), url: request.url(), toolUseId: headers["x-tool-use-id"] ?? null, caller: headers["x-hilo-agent-caller"] ?? null });
  });
  app.page.on("pageerror", (error) => pageErrors.push({ kind: "pageerror", message: String(error?.message ?? error) }));
  app.page.on("console", (message) => {
    if (message.type() !== "error") return;
    pageErrors.push({ kind: "console.error", message: message.text().slice(0, 800) });
  });
  app.page.on("response", (response) => {
    const url = response.url();
    if (!/\/api\/v3\/tasks|\/api\/v3\/execute/.test(url)) return;
    const entry = { at: Date.now(), url: url.split("?")[0], status: response.status(), body: "" };
    probes.push(entry);
    response.text().then((text) => { entry.body = text.slice(0, 900); }).catch(() => {});
  });

  await app.page.bringToFront().catch(() => {});

  // 工作区 gateway 的端口与身份头：从主日志里读（和种子流程同一套）。
  const log = readFileSync(path.join(app.xdg, "..", "ud", "logs", "main.log"), "utf8");
  const ports = [...log.matchAll(/ws:\/\/127\.0\.0\.1:(\d+)\/ws\?hilo_workspace=([0-9a-f]+)&hilo_workspace_instance=([0-9a-f-]+)&hilo_workspace_generation=(\d+)/g)]
    .slice(-2)
    .map((m) => ({ port: m[1], claim: m[2], instance: m[3], generation: m[4] }));
  const headersOf = ({ claim, instance, generation }) => ({ "x-hilo-workspace": claim, "x-hilo-workspace-instance": instance, "x-hilo-workspace-generation": generation });

  const prompt = valueOf("prompt") ?? "直接调用 design_execute 工具生成一张红苹果图片，画幅 1:1，不要再问我，直接执行";
  console.log("发送提示词：", prompt);

  // v3 工具面（`design_execute` 等 25 个）只在 `HILO_PROJECT_ARCHITECTURE=resource_v3`
  // 下注册；不设的话 agent 看到的是 hub_* 那一套，它会说"没有 design_execute 这个工具"
  // 然后走生成卡的旧路径 —— 第一次真会话就是这么跑偏的。
  if (process.env.HILO_PROJECT_ARCHITECTURE !== "resource_v3") {
    console.log("⚠ 未设置 HILO_PROJECT_ARCHITECTURE=resource_v3：agent 看不到 design_execute");
  }

  // 从首页的输入框发出去：这一步会建立会话、拉起 agent。
  await app.page.click('[data-action-ui-id="message-input"] textarea, [data-action-ui-id="message-input"] [contenteditable="true"]').catch(async () => {
    await app.page.click('[data-action-ui-id="message-input"]');
  });
  await app.page.keyboard.type(prompt);
  await app.page.click('[data-action-ui-id="message-send-btn"]');

  // 等 agent 真的调了 design_execute。
  //
  // ⚠️ **不能靠 `page.on("request")`**：MCP server 是独立进程，它调 `/api/v3/execute`
  // 在渲染层看不见（上一轮就是这么误判成"没有调用"的）。改用 opencode 库里的 part：
  // 有 `design_execute` 的 part 就说明 agent 调了，顺便拿到它的 callID。
  const started = Date.now();
  let executed = null;
  const allowButtons = ['[data-action-ui-id*="tool-confirm"] button', '[data-action-ui-id*="confirm"] button', 'button:has-text("允许")', 'button:has-text("确认")', 'button:has-text("继续")'];
  let partRow = null;
  while (Date.now() - started < 240_000) {
    try {
      const poll = new Database(path.join(app.xdg, "..", "opencode.db"), { readonly: true });
      partRow = poll.prepare("SELECT callID AS callID, data FROM part WHERE data LIKE '%\"tool\":\"design_execute\"%' ORDER BY rowid DESC LIMIT 1").get() ?? null;
      poll.close();
    } catch {}
    if (partRow) {
      executed = { at: Date.now(), toolUseId: partRow.callID ?? null };
      break;
    }
    for (const selector of allowButtons) {
      const button = app.page.locator(selector).first();
      if (await button.count().catch(() => 0)) {
        await button.click({ timeout: 2000 }).catch(() => {});
        console.log("点了确认按钮：", selector);
        break;
      }
    }
    await app.page.waitForTimeout(2000);
  }
  const result = { out, realSession: true, prompt, visibility: null, partCallID: null, executeToolUseId: executed?.toolUseId ?? null, executed: Boolean(executed), frames: [], polling: null, cardText: "", outputHtml: "", pageErrors: [] };
  if (!executed) {
    result.pageErrors = redact(pageErrors).slice(0, 5);
    writeFileSync(path.join(out, "result.json"), JSON.stringify(redact(result), null, 2));
    console.log("agent 没有调用 design_execute（240s 内）");
    await app.close();
    return;
  }

  // part 上的 callID，和网关任务里的 `origin.toolUseId`（就是 `x-tool-use-id` 头落下来的）
  // 对账 —— 两者必须相等，否则网关那头会当成"没有调用 id"。
  await app.page.waitForTimeout(4000);
  result.partCallID = partRow?.callID ?? null;
  try {
    const port = ports[0];
    const listed = await fetch(`http://127.0.0.1:${port.port}/api/v3/tasks?limit=5`, { headers: headersOf(port) }).then((response) => response.json());
    const task = (listed.items ?? []).find((item) => item.id && item.status) ?? null;
    result.taskOriginToolUseId = task?.origin?.toolUseId ?? null;
    result.taskId = task?.id ?? null;
    result.taskStatus = task?.status ?? null;
  } catch (error) {
    result.taskReadError = String(error).slice(0, 200);
  }

  // 等卡片把任务跑完（假平台延迟 60s）。
  const waitStart = Date.now();
  while (Date.now() - waitStart < 300_000) {
    const text = await app.page.locator('[data-action-ui-id="chat-design-execute"]').innerText().catch(() => "");
    if (/已完成|失败/.test(text) && !/执行中/.test(text)) break;
    await app.page.waitForTimeout(2000);
  }
  result.visibility = await app.page.evaluate(() => ({ state: document.visibilityState, hasFocus: document.hasFocus() })).catch(() => null);
  result.cardText = await app.page.locator('[data-action-ui-id="chat-design-execute"]').innerText().catch(() => "");
  result.outputHtml = (await app.page.locator('[data-testid="design-execute-outputs"]').first().innerHTML().catch(() => "")).slice(0, 1200);
  result.frames = frameLog
    .map((item) => ({ dir: item.dir, at: item.at, type: (() => { try { return JSON.parse(item.payload).type; } catch { return undefined; } })() }))
    .filter((item) => item.type);
  result.pageErrors = redact(pageErrors).slice(0, 5);

  // 卡片自己的轮询：`GET /api/v3/tasks/<id>` 或带 toolUseId 的列表，按 ready 切两段。
  const path2 = (url) => new URL(url).pathname;
  const isCardGet = (url) => /^\/api\/v3\/tasks\/[^/]+$/.test(path2(url));
  const isCardList = (url) => path2(url) === "/api/v3/tasks" && new URL(url).searchParams.has("toolUseId");
  const readyAt = result.frames.find((frame2) => frame2.dir === "recv" && frame2.type === "task_subscription_ready")?.at;
  const card = requests.filter((item) => isCardGet(item.url) || isCardList(item.url));
  const gaps = (list) => list.slice(1).map((item, index) => item.at - list[index].at);
  const before = card.filter((item) => readyAt === undefined || item.at < readyAt);
  const after = card.filter((item) => readyAt !== undefined && item.at >= readyAt);
  result.polling = {
    readyAt: readyAt ?? null,
    card: [{ scope: executed.toolUseId ?? "tool", beforeReady: { count: before.length, intervalsMs: gaps(before) }, afterReady: { count: after.length, intervalsMs: gaps(after) } }],
    other: [],
  };

  await app.page.screenshot({ path: path.join(out, "real-session.png") }).catch(() => {});
  writeFileSync(path.join(out, "result.json"), JSON.stringify(redact(result), null, 2));
  console.log(JSON.stringify(redact({ partCallID: result.partCallID, executeToolUseId: result.executeToolUseId, ready: result.polling.readyAt !== null, before: result.polling.card[0].beforeReady, after: result.polling.card[0].afterReady, cardText: result.cardText.slice(0, 40) }), null, 2));
  await app.close();
}

function valueOf(name) {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] && !args[at + 1].startsWith("--") ? args[at + 1] : undefined;
}
