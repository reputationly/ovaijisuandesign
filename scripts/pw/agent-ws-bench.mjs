/**
 * 4 个模型同题对照（WebSocket 驱动，不点 UI）。
 * 输出每个模型的：耗时、工具序列、是否用 bash/code-agent。
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/gateway/package.json", import.meta.url));
const { WebSocket } = require("ws");

const PROMPT = "我要做一条 15 秒竖屏小红书 KOC 视频，产品是浅蓝色 RTIC 30oz 随行杯（翻盖饮口、侧把手、陶瓷内衬）。请给出执行方案：分几段、每段几秒、每段逐字口播，以及你打算用哪些工具。只输出方案，不要生成任何素材。";
const MODELS = (process.env.MODELS ?? "glm-5.3-flash-w4a8,qwen3.8-flash-fp8,deepseek-v4-1-flash,minimax-m3.1-flash").split(",");

function gatewayEnv() {
  const out = execSync('ps -Ao pid=,command=', { encoding: "utf8" });
  let best = null;
  for (const line of out.split("\n")) {
    if (!line.includes("gateway/dist/main.js")) continue;
    const pid = line.trim().split(/\s+/)[0];
    let env = "";
    try { env = execSync(`ps eww -p ${pid}`, { encoding: "utf8" }); } catch { continue; }
    if (!env.includes("HILO_GATEWAY_ROLE=workspace")) continue;
    const g = (k) => (env.match(new RegExp(`(?:^|\\s)${k}=(\\S+)`)) ?? [])[1];
    if (!g("PORT") || !g("HILO_WORKSPACE_CLAIM")) continue;
    const cur = { pid: Number(pid), port: g("PORT"), claim: g("HILO_WORKSPACE_CLAIM"), inst: g("HILO_WORKSPACE_INSTANCE_ID"), gen: g("HILO_WORKSPACE_GENERATION") ?? "1" };
    if (!best || cur.pid > best.pid) best = cur;
  }
  return best;
}

async function runModel(env, model) {
  const qs = new URLSearchParams({
    hilo_workspace: env.claim,
    ...(env.inst ? { hilo_workspace_instance: env.inst } : {}),
    hilo_workspace_generation: env.gen,
  });
  const url = `ws://127.0.0.1:${env.port}/ws?${qs}`;
  const ws = new WebSocket(url, {
    headers: {
      "x-hilo-workspace": env.claim,
      "x-hilo-workspace-instance": env.inst ?? "",
      "x-hilo-workspace-generation": env.gen,
      origin: "app://./index.html",
    },
  });
  const state = { sessionId: null, tools: [], assistantChars: 0, idle: false, errors: [], frameTypes: {}, accepted: false };
  const waiters = [];
  const notify = () => waiters.splice(0).forEach((fn) => fn());
  ws.on("close", (code, reason) => {
    state.errors.push(`WS_CLOSED ${code} ${String(reason).slice(0, 80)}`);
    state.idle = true;
    notify();
  });
  ws.on("error", (err) => {
    state.errors.push(`WS_ERROR ${String(err).slice(0, 120)}`);
    state.idle = true;
    notify();
  });
  ws.on("message", (raw) => {
    let frame;
    try { frame = JSON.parse(raw.toString()); } catch { return; }
    const type = frame.type;
    state.frameTypes[type] = (state.frameTypes[type] ?? 0) + 1;
    if (type === "message_accepted") { state.accepted = true; state.runtimeSessionId = state.runtimeSessionId ?? frame.runtime_session_id; }
    if (type === "message_failed") state.errors.push(`message_failed: ${String(frame.error ?? "").slice(0, 200)}`);
    if (type === "session_created") state.sessionId = frame.session_id;
    if (type === "session_bound") state.runtimeSessionId = frame.runtime_session_id;
    if (type === "error" || type === "session_error") state.errors.push(String(frame.message ?? frame.error ?? "").slice(0, 120));
    if (type === "part_updated") {
      const part = frame.part ?? {};
      if (part.type === "tool" && part.tool) {
        const key = `${part.tool}:${part.callID ?? part.id ?? ""}`;
        if (!state.tools.some((t) => t.key === key)) {
          const input = part.state?.input ?? {};
          state.tools.push({ key, tool: part.tool, status: part.state?.status ?? "?", capabilityId: input.capabilityId ?? null });
        }
      }
      if (part.type === "text" && typeof part.text === "string") state.textChars = Math.max(state.textChars ?? 0, part.text.length);
    }
    if (type === "part_delta" || type === "part_updated") state.lastActivity = Date.now();
    if (type === "part_delta") {
      if (frame.field === "text" && typeof frame.delta === "string") state.textChars = (state.textChars ?? 0) + frame.delta.length;
    }
    if (type === "session_idle" && (!state.runtimeSessionId || frame.session_id === state.runtimeSessionId)) state.idle = true;
    if (type === "status" && frame.status?.type === "idle" && state.runtimeSessionId && frame.session_id === state.runtimeSessionId) state.idle = true;
    notify();
  });
  const waitFor = (predicate, timeoutMs) => new Promise((resolve) => {
    const check = () => { if (predicate()) { cleanup(); resolve(true); } };
    const timer = setTimeout(() => { cleanup(); resolve(false); }, timeoutMs);
    const cleanup = () => { clearTimeout(timer); const i = waiters.indexOf(check); if (i >= 0) waiters.splice(i, 1); };
    waiters.push(check);
    check();
  });

  await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
  // 先 ping：确认这条连接真的被网关接纳（身份不符会被直接 close）
  ws.send(JSON.stringify({ type: "ping" }));
  await new Promise((r) => setTimeout(r, 400));
  if (state.errors.length) return { model, error: state.errors.join(" | ") };
  ws.send(JSON.stringify({ type: "create_session", request_id: `bench-${model}` }));
  if (!(await waitFor(() => state.sessionId, 15000))) { ws.close(); return { model, error: "session 创建超时" }; }
  ws.send(JSON.stringify({ type: "update_model", session_id: state.sessionId, model_id: `maas/${model}` }));
  await new Promise((r) => setTimeout(r, 800));
  const startedAt = Date.now();
  ws.send(JSON.stringify({ type: "message", session_id: state.sessionId, content: PROMPT, client_message_id: `bench-${model}-1` }));
  const deadline = Date.now() + Number(process.env.TIMEOUT_MS ?? 420000);
  const quietMs = Number(process.env.QUIET_MS ?? 25000);
  const finished = await waitFor(
    () => state.idle || (state.accepted && state.lastActivity && Date.now() - state.lastActivity > quietMs),
    Number(process.env.TIMEOUT_MS ?? 420000),
  );
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  ws.close();
  const tools = state.tools.map((t) => t.tool);
  const uniq = [...new Set(tools)];
  const codeHeavy = uniq.some((t) => ["bash", "edit", "write", "read", "task"].includes(t)) || uniq.some((t) => t.startsWith("design_code"));
  const askedQuestions = state.tools.filter((t) => t.tool === "question").length;
  const mergeUsed = state.tools.some((t) => String(t.capabilityId ?? "").includes("merge_videos"));
  return { model, elapsedSeconds: elapsed, finished, toolCalls: tools.length, tools: uniq, codeHeavy, askedQuestions, mergeUsed, assistantChars: state.textChars ?? 0, accepted: state.accepted, frameTypes: state.frameTypes, errors: state.errors.slice(0, 3) };
}

const env = gatewayEnv();
if (!env) { console.log("找不到 gateway"); process.exit(1); }
const results = [];
for (const model of MODELS) {
  process.stdout.write(`\n== ${model} … `);
  const result = await runModel(env, model);
  results.push(result);
  console.log(JSON.stringify(result));
}
console.log("\n=== 汇总 ===");
for (const r of results) {
  console.log(
    `${r.model.padEnd(24)} 耗时 ${String(r.elapsedSeconds ?? "-").padStart(4)}s | 工具 ${String(r.toolCalls ?? 0).padStart(2)} | 代码路线 ${r.codeHeavy ? "是" : "否"} | 反问 ${r.askedQuestions ?? 0} | merge ${r.mergeUsed ? "是" : "否"} | 回答 ${r.assistantChars ?? 0} 字 | ${(r.tools ?? []).join(",") || "-"}`,
  );
}
