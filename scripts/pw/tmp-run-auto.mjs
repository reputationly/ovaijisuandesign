/** 自动跑同一提示词，并**自动回答** question（选第一个选项 / 关键词优先）。 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(new URL("../../app/gateway/package.json", import.meta.url));
const { WebSocket } = require("ws");

const PROMPT = process.env.PROMPT ?? "参考画布里的产品参考图，做一条 15 秒竖屏 9:16 小红书 KOC 视频：真实手机第一视角手部拍摄、不露脸、中文画外旁白。总时长 15 秒，分 2 段（每段 7–8 秒，两段之和 15 秒）；先把分镜与逐字口播写进「分镜与口播」，再生成两段，最后拼成 15 秒成片。";
const PREFER = (process.env.PREFER ?? "倒水实测,真人,第一视角,生活化").split(",");

const out = execSync("ps -Ao pid=,command=", { encoding: "utf8" });
let best = null;
for (const line of out.split("\n")) {
  if (!line.includes("gateway/dist/main.js") || line.includes("MiniMax Design.app")) continue;
  const pid = line.trim().split(/\s+/)[0];
  let start = ""; try { start = execSync(`ps -o lstart= -p ${pid}`, { encoding: "utf8" }).trim(); } catch { continue; }
  let e = ""; try { e = execSync(`ps eww -p ${pid}`, { encoding: "utf8" }); } catch { continue; }
  if (!e.includes("HILO_GATEWAY_ROLE=workspace")) continue;
  const g = (k) => (e.match(new RegExp(`(?:^|\\s)${k}=(\\S+)`)) ?? [])[1];
  if (!g("PORT") || !g("HILO_WORKSPACE_CLAIM")) continue;
  const cur = { port: g("PORT"), claim: g("HILO_WORKSPACE_CLAIM"), inst: g("HILO_WORKSPACE_INSTANCE_ID"), gen: g("HILO_WORKSPACE_GENERATION") ?? "1", start };
  if (!best || cur.start > best.start) best = cur;
}
const qs = new URLSearchParams({ hilo_workspace: best.claim, hilo_workspace_instance: best.inst ?? "", hilo_workspace_generation: best.gen });
const ws = new WebSocket(`ws://127.0.0.1:${best.port}/ws?${qs}`, { origin: "app://./index.html" });
let sid = null, runtimeSid = null, idle = false, last = Date.now(), answered = 0;
const t0 = Date.now();
const stamp = () => `${Math.round((Date.now() - t0) / 1000)}s`;
ws.on("open", () => ws.send(JSON.stringify({ type: "create_session", request_id: "auto" })));
ws.on("message", (raw) => {
  const f = JSON.parse(String(raw));
  last = Date.now();
  if (f.type === "session_created") {
    sid = f.session_id;
    ws.send(JSON.stringify({ type: "update_model", session_id: sid, model_id: `maas/${process.env.MODEL ?? "minimax-m3.1-flash"}` }));
    setTimeout(() => ws.send(JSON.stringify({ type: "message", session_id: sid, content: PROMPT, client_message_id: "auto-1" })), 800);
  }
  if (f.type === "session_bound") runtimeSid = f.runtime_session_id;
  if (f.type === "part_updated" && f.part?.type === "tool") {
    const st = f.part.state || {};
    if (st.status === "error") console.log(`${stamp()} ✖ ${f.part.tool}`, JSON.stringify(st.error ?? "").slice(0, 120));
    else if (st.status === "completed") console.log(`${stamp()} ✓ ${f.part.tool}`, st.input?.capabilityId ?? "");
  }
  if (f.type === "question_request") {
    const q = f.questions?.[0] ?? f.question ?? f;
    const options = (q.options ?? []).map((o) => o.label ?? o.value ?? "");
    const pick = options.find((label) => PREFER.some((k) => String(label).includes(k))) ?? options[0];
    console.log(`${stamp()} ？ 问题[${q.header ?? ""}] 选项=${JSON.stringify(options).slice(0, 160)} → 选 ${JSON.stringify(pick)}`);
    ws.send(JSON.stringify({ type: "question_reply", id: f.id ?? f.request_id ?? q.id, session_id: sid, answers: [[pick]] }));
    answered += 1;
  }
  if (f.type === "session_error") console.log(`${stamp()} ✖ session_error`, String(f.content).slice(0, 140));
  if (f.type === "session_idle" && (!runtimeSid || f.session_id === runtimeSid)) idle = true;
});
const deadline = Date.now() + Number(process.env.TIMEOUT_MS ?? 2400000);
while (!idle && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 5000));
  if (Date.now() - last > 240000) { console.log("(静默 4 分钟，收尾)"); break; }
}
console.log(`结束：用 ${Math.round((Date.now() - t0) / 1000)}s，自动回答 ${answered} 个问题`);
ws.close();
