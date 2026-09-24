import { mkdtempSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";

import { createApp } from "../bootstrap.js";

/** 一个够用的假 opencode：会话、消息、prompt_async、question、abort，外加 /global/event 流。 */
function fakeOpencode() {
  const sse = new Set<ServerResponse>();
  const prompts: any[] = [];
  const replies: any[] = [];
  const aborted: string[] = [];
  const sessions: any[] = [];
  let n = 0;
  const push = (payload: unknown) => {
    for (const r of sse) r.write(`data: ${JSON.stringify({ directory: "/x", payload })}\n\n`);
  };
  const body = (req: IncomingMessage) =>
    new Promise<any>((res) => {
      let s = "";
      req.on("data", (c) => (s += c));
      req.on("end", () => res(s ? JSON.parse(s) : undefined));
    });
  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url!, "http://x");
    const json = (v: unknown) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(v));
    };
    if (req.headers.authorization !== "Basic " + Buffer.from("u:p").toString("base64")) {
      res.statusCode = 401;
      return res.end();
    }
    if (url.pathname === "/global/event") {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(": hi\n\n");
      sse.add(res);
      req.on("close", () => sse.delete(res));
      return;
    }
    if (url.pathname === "/session" && req.method === "POST") {
      const b = await body(req);
      const s = { id: `ses_${++n}`, title: b.title, ...(b.parentID ? { parentID: b.parentID } : {}), time: { created: Date.now() } };
      sessions.push(s);
      return json(s);
    }
    if (url.pathname === "/session" && req.method === "GET") return json(sessions);
    let m = /^\/session\/([^/]+)\/prompt_async$/.exec(url.pathname);
    if (m) {
      prompts.push({ id: m[1], body: await body(req), directory: url.searchParams.get("directory") });
      res.statusCode = 204;
      return res.end();
    }
    m = /^\/session\/([^/]+)\/message$/.exec(url.pathname);
    if (m) return json([{ info: { id: "msg_1", role: "user", sessionID: m[1] }, parts: [{ type: "text", text: "你好" }, { type: "text", text: "内部", synthetic: true }] }]);
    m = /^\/session\/([^/]+)\/children$/.exec(url.pathname);
    if (m) return json([]);
    m = /^\/session\/([^/]+)\/abort$/.exec(url.pathname);
    if (m) {
      aborted.push(m[1]!);
      return json(true);
    }
    m = /^\/session\/([^/]+)$/.exec(url.pathname);
    if (m) return json(sessions.find((s) => s.id === m![1]) ?? {});
    m = /^\/question\/([^/]+)\/reply$/.exec(url.pathname);
    if (m) {
      replies.push({ id: m[1], ...(await body(req)) });
      return json(true);
    }
    res.statusCode = 404;
    res.end();
  });
  return { server, push, prompts, replies, aborted, sessions };
}

describe("聊天链路（假 opencode）", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let wsUrl = "";
  const oc = fakeOpencode();
  let ws: WebSocket;
  const frames: any[] = [];
  const waitFor = async (pred: (f: any) => boolean, ms = 3000) => {
    const start = Date.now();
    while (Date.now() - start < ms) {
      const hit = frames.find(pred);
      if (hit) return hit;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error("等不到帧：" + JSON.stringify(frames.slice(-5)));
  };

  beforeAll(async () => {
    await new Promise<void>((r) => oc.server.listen(0, "127.0.0.1", () => r()));
    process.env.WORKSPACE_DIR = mkdtempSync(path.join(tmpdir(), "ov-chat-"));
    app = await createApp();
    await app.listen(0, "127.0.0.1");
    const port = app.getHttpServer().address().port;
    http = request(app.getHttpServer());
    wsUrl = `ws://127.0.0.1:${port}/ws`;
    const ocPort = (oc.server.address() as { port: number }).port;
    await http.post("/api/runtime/opencode-url").send({ url: `http://127.0.0.1:${ocPort}`, username: "u", password: "p" });
    ws = new WebSocket(wsUrl);
    await new Promise((r) => ws.once("open", r));
    ws.on("message", (d) => frames.push(JSON.parse(String(d))));
    // 等事件泵连上 SSE。
    await new Promise((r) => setTimeout(r, 200));
  });
  afterAll(async () => {
    ws.close();
    await app.close();
    oc.server.closeAllConnections();
    oc.server.close();
    delete process.env.WORKSPACE_DIR;
  });

  let ui = "";
  let rid = "";
  it("create_session 只建 UI 会话；第一条消息才在 opencode 里建真会话", async () => {
    ws.send(JSON.stringify({ type: "create_session", request_id: "r1" }));
    ui = (await waitFor((f) => f.type === "session_created")).session_id;
    expect(oc.sessions).toHaveLength(0);
    ws.send(JSON.stringify({ type: "message", session_id: ui, content: "画一只猫", client_message_id: "c1", attachments: ["images/a.png"] }));
    const bound = await waitFor((f) => f.type === "session_bound");
    expect(bound.ui_session_id).toBe(ui);
    rid = bound.runtime_session_id;
    await waitFor((f) => f.type === "message_accepted" && f.client_message_id === "c1");
    const p = oc.prompts[0];
    expect(p.id).toBe(rid);
    expect(p.body.agent).toBe("media-agent");
    expect(p.body.parts[0].metadata.hilo_working_language.locale).toBe("zh-CN");
    // 附件写成消息开头的清单，给的是绝对路径。
    expect(p.body.parts[0].text).toMatch(/^\[User attached files:\n- \[1\] png: \/.*images\/a\.png\n\]\n画一只猫$/);
    expect(p.directory).toBe(process.env.WORKSPACE_DIR);
  });

  it("opencode 的事件转成聊天帧：part、delta、idle；用户消息回显不转发", async () => {
    oc.push({ type: "message.updated", properties: { sessionID: rid, info: { id: "msg_u", role: "user", sessionID: rid } } });
    oc.push({ type: "message.part.updated", properties: { sessionID: rid, part: { id: "prt_u", messageID: "msg_u", sessionID: rid, type: "text", text: "画一只猫" } } });
    oc.push({ type: "message.updated", properties: { sessionID: rid, info: { id: "msg_a", role: "assistant", sessionID: rid } } });
    oc.push({ type: "message.part.updated", properties: { sessionID: rid, part: { id: "prt_a", messageID: "msg_a", sessionID: rid, type: "text", text: "" } } });
    oc.push({ type: "message.part.delta", properties: { sessionID: rid, messageID: "msg_a", partID: "prt_a", field: "text", delta: "好的" } });
    oc.push({ type: "session.idle", properties: { sessionID: rid } });
    const delta = await waitFor((f) => f.type === "part_delta");
    expect(delta).toMatchObject({ session_id: ui, partId: "prt_a", delta: "好的" });
    await waitFor((f) => f.type === "session_idle" && f.session_id === ui);
    expect(frames.some((f) => f.type === "part_updated" && f.part.id === "prt_u")).toBe(false);
    expect(frames.some((f) => f.type === "user_message_id" && f.message_id === "msg_u")).toBe(true);
  });

  it("子会话的事件归到根会话，带 childSessionId", async () => {
    oc.push({ type: "session.created", properties: { info: { id: "ses_child", parentID: rid } } });
    oc.push({ type: "message.part.updated", properties: { sessionID: "ses_child", part: { id: "prt_c", messageID: "msg_c", sessionID: "ses_child", type: "tool", tool: "hub_generate_image", state: { status: "running" } } } });
    const f = await waitFor((x) => x.type === "part_updated" && x.part.id === "prt_c");
    expect(f).toMatchObject({ session_id: ui, childSessionId: "ses_child" });
    const root = await http.get("/api/internal/sessions/ses_child/root");
    expect(root.body).toEqual({ rootSessionId: rid });
  });

  it("question：opencode 问 → 界面收到 → 回答转成 /question/:id/reply", async () => {
    oc.push({ type: "question.asked", properties: { id: "que_1", sessionID: rid, questions: [{ question: "几张？", header: "数量", options: [{ label: "1", description: "" }] }] } });
    const q = await waitFor((f) => f.type === "question_request");
    expect(q).toMatchObject({ id: "que_1", session_id: ui });
    ws.send(JSON.stringify({ type: "question_reply", id: "que_1", session_id: ui, answers: [["1"]] }));
    await new Promise((r) => setTimeout(r, 100));
    expect(oc.replies).toEqual([{ id: "que_1", answers: [["1"]] }]);
  });

  it("工具确认：自动模式直接放行；询问模式要等界面回复", async () => {
    const auto = await http.post(`/api/internal/sessions/${rid}/tool-confirm/ask`).send({ tool: "hub_generate_image", args: {} });
    expect(auto.body).toEqual({ decision: "confirm" });
    ws.send(JSON.stringify({ type: "set_mode", session_id: ui, mode: "ask" }));
    await waitFor((f) => f.type === "mode_changed" && f.mode === "ask");
    const pending = http.post(`/api/internal/sessions/${rid}/tool-confirm/ask`).send({ tool: "hub_generate_image", args: { prompt: "猫" } });
    const done = pending.then((r) => r.body);
    const ask = await waitFor((f) => f.type === "tool_confirm_ask");
    expect(ask).toMatchObject({ session_id: ui, tool: "hub_generate_image" });
    ws.send(JSON.stringify({ type: "tool_confirm_reply", id: ask.id, decision: "reject" }));
    expect(await done).toEqual({ decision: "reject", reject_reason: "user_rejected" });
  });

  it("防打转：界面选「本会话都放行」后同一指纹不再问", async () => {
    const pending = http
      .post(`/api/internal/sessions/${rid}/loop-guard/ask`)
      .send({ tool: "hub_read", fingerprint: "fp1", request_id: "req1", hits: 2, window: 5 })
      .then((r) => r.body);
    const ask = await waitFor((f) => f.type === "loop_guard_ask");
    ws.send(JSON.stringify({ type: "loop_guard_reply", id: ask.id, session_id: ui, decision: "allow_session" }));
    expect(await pending).toEqual({ decision: "allow_session" });
    expect((await http.get(`/api/internal/sessions/${rid}/loop-guard/settlements/req1`)).body).toEqual({ status: "settled", decision: "allow_session" });
    const again = await http.post(`/api/internal/sessions/${rid}/loop-guard/ask`).send({ tool: "hub_read", fingerprint: "fp1", request_id: "req2" });
    expect(again.body).toEqual({ decision: "allow_once" });
  });

  it("计费分组固定回 legacy；会话列表和历史；停止会话", async () => {
    expect((await http.get(`/api/internal/sessions/${rid}/request-group`)).body).toMatchObject({ mode: "legacy" });
    expect((await http.get("/api/internal/sessions/billing-current-scope")).body).toMatchObject({ mode: "legacy" });
    ws.send(JSON.stringify({ type: "list_sessions", request_id: "l1" }));
    const list = await waitFor((f) => f.type === "session_list");
    expect(list.sessions.map((s: any) => s.id)).toContain(ui);
    ws.send(JSON.stringify({ type: "switch_session", session_id: ui, request_id: "s1" }));
    const sw = await waitFor((f) => f.type === "session_switched");
    // 合成的 part 不给界面。
    expect(sw.messages[0].parts).toEqual([{ type: "text", text: "你好" }]);
    ws.send(JSON.stringify({ type: "cancel", session_id: ui }));
    await new Promise((r) => setTimeout(r, 100));
    expect(oc.aborted).toContain(rid);
  });
});
