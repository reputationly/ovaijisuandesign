import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "./bootstrap.js";
import { CanvasService } from "./canvas/canvas.service.js";
import { AssetsService } from "./common/assets.service.js";
import { GatewayEventBus } from "./common/gateway-event-bus.js";
import { crc32 } from "./export/zip.js";
import { MediaConfigService } from "./generate/media-config.service.js";
import { resolveExecutableLayers } from "./group-executor/canvas-group-executor.module.js";
import { getUserLang } from "./i18n/user-lang.js";

/** 够用的假 opencode：会话、消息（带一个子 agent）、MCP 热加载。 */
function fakeOpencode() {
  const mcp: Record<string, { status: string }> = {};
  const body = (req: IncomingMessage) =>
    new Promise<any>((res) => {
      let s = "";
      req.on("data", (c) => (s += c));
      req.on("end", () => res(s ? JSON.parse(s) : undefined));
    });
  const tool = (id: string, extra: Record<string, unknown>) => ({ id, type: "tool", callID: `call_${id}`, messageID: "m2", sessionID: "ses_root", ...extra });
  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url!, "http://x");
    const json = (v: unknown) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(v));
    };
    if (url.pathname === "/session/ses_root") return json({ id: "ses_root", title: "导出测试", time: { created: 1_700_000_000_000 } });
    if (url.pathname === "/session/ses_root/message") {
      return json([
        { info: { id: "m1", role: "user", sessionID: "ses_root", time: { created: 1 } }, parts: [{ id: "p1", type: "text", text: "画一只猫" }] },
        {
          info: { id: "m2", role: "assistant", sessionID: "ses_root", agent: "director", time: { created: 2, completed: 3 } },
          parts: [
            { id: "p2", type: "reasoning", text: "想一想" },
            tool("p3", { tool: "hub_generate_image", state: { status: "completed", input: { prompt: "cat" }, output: "ok", time: { start: 10, end: 25 } } }),
            tool("p4", { tool: "task", state: { status: "completed", input: { subagent_type: "writer" }, metadata: { sessionId: "ses_child" } } }),
            { id: "p5", type: "file", filename: "cat.png", url: "file:///cat.png", mime: "image/png" },
            { id: "p6", type: "text", text: "内部", synthetic: true },
          ],
        },
      ]);
    }
    if (url.pathname === "/session/ses_child/message") {
      return json([{ info: { id: "c1", role: "assistant", sessionID: "ses_child", time: { created: 4 } }, parts: [{ id: "cp1", type: "text", text: "子 agent 的回答" }] }]);
    }
    if (url.pathname === "/mcp" && req.method === "POST") {
      const b = await body(req);
      mcp[b.name] = { status: b.config.enabled === false ? "disabled" : b.config.url === "http://bad" ? "failed" : "connected" };
      return json(true);
    }
    if (url.pathname === "/mcp" && req.method === "GET") return json(mcp);
    res.statusCode = 404;
    res.end();
  });
  return { server };
}

describe("零散功能模块", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;
  let oc: Server;
  let ocUrl = "";
  const events: any[] = [];

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-features-"));
    oc = fakeOpencode().server;
    await new Promise<void>((r) => oc.listen(0, "127.0.0.1", r));
    ocUrl = `http://127.0.0.1:${(oc.address() as { port: number }).port}`;
    const cfg = path.join(ws, "..", `ov-features-cfg-${path.basename(ws)}.json`);
    writeFileSync(cfg, JSON.stringify({ platform: { base_url: "http://platform.invalid/v1", api_key: "k", chat_model: "local-chat" }, models: {} }));
    process.env.WORKSPACE_DIR = ws;
    process.env.OPENCODE_URL = ocUrl;
    process.env.OV_CONFIG_PATH = cfg;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    app.get(GatewayEventBus).subscribe((m) => events.push(m));
    app.get(MediaConfigService).clientOverrides = {
      sleep: async () => undefined,
      logger: { info() {}, warn() {} },
      fetch: (async () => new Response(JSON.stringify({ choices: [{ message: { content: "# 重跑的结果" }, finish_reason: "stop" }] }), { status: 200 })) as typeof fetch,
    };
  });
  afterAll(async () => {
    await app.close();
    oc.close();
    delete process.env.WORKSPACE_DIR;
    delete process.env.OPENCODE_URL;
    delete process.env.OV_CONFIG_PATH;
  });

  it("heartbeat：校验字段，没有待发指令时只回 status", async () => {
    const hb = { appVersion: "1.0.0", os: "darwin", arch: "arm64", macAddress: "aa:bb:cc:dd", releaseChannel: "prod", releaseRegion: "cn", powerState: "active", onlineStatus: "online", timestamp: Date.now() };
    const r = await http.post("/api/heartbeat").send(hb);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ status: "ok" });
    expect((await http.post("/api/heartbeat").send({ ...hb, powerState: "sleeping" })).status).toBe(400);
  });

  it("i18n：记下界面语言", async () => {
    expect((await http.post("/api/i18n/lang").send({ lang: "en-US" })).body).toEqual({ ok: true, lang: "en-US" });
    expect(getUserLang()).toBe("en-US");
    expect((await http.post("/api/i18n/lang").send({})).body).toEqual({ ok: true, lang: "" });
  });

  it("diagnostics/network：没配地址的目标一律 skipped，不连任何云端", async () => {
    const r = await http.get("/api/diagnostics/network");
    expect(r.status).toBe(200);
    expect(r.body.generatedAt).toBeTruthy();
    expect(r.body.probes.map((p: any) => [p.target, p.status])).toEqual([
      ["cloud_gateway_api", "skipped"],
      ["app_api", "skipped"],
      ["team_account_api", "skipped"],
      ["update_cdn", "skipped"],
      ["guance_rum", "skipped"],
      ["sensors", "skipped"],
    ]);
    expect(r.body.proxy).toMatchObject({ detected: expect.any(Boolean), state: expect.any(String) });
  });

  it("search/images：校验查询数量；离线时每个查询回空结果", async () => {
    expect((await http.post("/api/search/images").send({ queries: [] })).body).toEqual({ ok: false, results: [], error: "No queries provided" });
    const five = Array.from({ length: 5 }, (_, i) => ({ query: `q${i}` }));
    expect((await http.post("/api/search/images").send({ queries: five })).body.error).toBe("Maximum 4 queries per request");
    const r = await http.post("/api/search/images").send({ queries: [{ query: "sunset" }] });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ ok: true, results: [{ query: "sunset", success: true, images: [], error: "No images found" }] });
  });

  it("media/heic-preview：只收 HEIC 文件名，空文件 400，能解的转成 JPEG", async () => {
    expect((await http.post("/api/media/heic-preview?filename=a.png").set("content-type", "application/octet-stream").send(Buffer.from("x"))).status).toBe(400);
    expect((await http.post("/api/media/heic-preview?filename=a.heic").set("content-type", "application/octet-stream").send(Buffer.alloc(0))).status).toBe(400);
    // 测试环境的 sharp 不一定带 HEIC 解码：用一张 PNG 冒充，验证请求体读取和 JPEG 输出这条路。
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#f00" } }).png().toBuffer();
    const r = await http.post("/api/media/heic-preview?filename=IMG_1.HEIC").set("content-type", "application/octet-stream").send(png);
    expect(r.status).toBe(201);
    expect(r.headers["content-type"]).toMatch(/^image\/jpeg/);
    expect((r.body as Buffer).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  });

  it("asset text-preview / metadata：文本开头一段、词数和修改时间", async () => {
    writeFileSync(path.join(ws, "notes.md"), "hello world from notes");
    const id = (await app.get(AssetsService).enroll("notes.md")).id;
    const p = await http.get("/api/asset/text-preview?path=notes.md&chars=5");
    expect(p.body).toEqual({ ok: true, text: "hello", truncated: true, totalChars: 22 });
    expect((await http.get("/api/asset/text-preview?path=missing.md")).body).toEqual({ ok: false, reason: "not-found" });
    expect((await http.get("/api/asset/text-preview?path=../x.md")).body).toEqual({ ok: false, reason: "unsupported" });
    const m = await http.get(`/api/asset/${id}/metadata`);
    expect(m.body).toMatchObject({ ok: true, metadata: { wordCount: 4, mtime: expect.any(String) } });
    expect((await http.get("/api/asset/nope/metadata")).body).toEqual({ ok: false, reason: "asset-not-found" });
  });

  it("sessions/:id/export：打成 zip（manifest + conversation），子 agent 会话展开，合成消息不导出", async () => {
    expect((await http.get("/api/sessions/bad%20id/export")).status).toBe(400);
    // 新建后还没发过消息的 UI 会话：没东西可导出。
    expect((await http.get("/api/sessions/abcd1234/export")).status).toBe(400);
    const r = await http.get("/api/sessions/ses_root/export").buffer(true).parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toBe("application/zip");
    expect(r.headers["content-disposition"]).toMatch(/^attachment; filename="chat-ses_root-\d{8}-\d{6}\.zip"$/);
    const files = unzip(r.body as Buffer);
    const manifest = JSON.parse(files["manifest.json"]!);
    expect(manifest).toMatchObject({ formatVersion: "1.0.0", sessionId: "ses_root", sessionName: "导出测试", messageCount: 2, agents: ["main", "director"], assetUrls: ["file:///cat.png"] });
    const convo = JSON.parse(files["conversation.json"]!);
    expect(convo[0]).toMatchObject({ id: "m1", role: "user", agent: "main", parts: [{ type: "text", content: "画一只猫" }] });
    const parts = convo[1].parts;
    expect(parts.map((p: any) => p.type)).toEqual(["thinking", "tool_call", "sub_agent", "file"]);
    expect(parts[1]).toMatchObject({ tool: "hub_generate_image", args: '{"prompt":"cat"}', result: "ok", callID: "call_p3", durationMs: 15 });
    expect(parts[2]).toMatchObject({ agent: "writer", childSessionId: "ses_child", messages: [{ id: "c1", parts: [{ type: "text", content: "子 agent 的回答" }] }] });
  });

  it("connectors/mcp：热加载进 opencode 并核实状态；运行时地址对不上直接失败", async () => {
    const base = { name: "my-tools", config: { type: "remote", url: "http://ok" }, expectedRuntimeUrl: ocUrl, timeoutMs: 5000 };
    expect((await http.post("/api/connectors/mcp").send(base)).body).toEqual({ status: "connected" });
    expect((await http.post("/api/connectors/mcp").send({ ...base, config: { ...base.config, enabled: false } })).body).toEqual({ status: "disabled" });
    expect((await http.post("/api/connectors/mcp").send({ ...base, config: { url: "http://bad" } })).body).toEqual({ status: "failed" });
    expect((await http.post("/api/connectors/mcp").send({ ...base, expectedRuntimeUrl: "http://127.0.0.1:1" })).body).toEqual({ status: "failed" });
    expect((await http.post("/api/connectors/mcp").send({ ...base, name: "hub_generate" })).status).toBe(400);
    const auth = await http.post("/api/connectors/mcp/authenticate").send({ name: "libtv", expectedRuntimeUrl: ocUrl });
    expect(auth.status).toBe(201);
    expect(auth.body).toEqual({ status: "failed" });
    expect((await http.post("/api/connectors/mcp/authenticate").send({ name: "other", expectedRuntimeUrl: ocUrl })).status).toBe(400);
  });

  it("canvas/execute-group：分层计划；空组 / 全是上传素材回 noop；文本节点用平台对话模型原地重跑", async () => {
    expect((await http.post("/api/canvas/execute-group").send({ groupId: "nope" })).status).toBe(400);
    const canvas = app.get(CanvasService);
    const a = await canvas.writeTextNode({ content: "旧的", name: "a" });
    const b = await canvas.writeTextNode({ content: "旧的", name: "b" });
    expect((await http.post("/api/canvas/execute-group").send({ groupId: a.nodeId })).status).toBe(400);
    const g = await canvas.group({ nodeIds: [a.nodeId, b.nodeId] });
    const groupId = g.groupId!;
    const noop = await http.post("/api/canvas/execute-group").send({ groupId });
    expect(noop.status).toBe(200);
    expect(noop.body).toMatchObject({ noop: true, executableCount: 0, totalChildren: 2, skipped: { nonExecutableCount: 2 } });

    await canvas.updateTextNodeData(a.nodeId, { model_id: "local-chat", prompt: "写点东西" });
    const n = events.length;
    const r = await http.post("/api/canvas/execute-group").set("x-session-id", "ses_root").send({ groupId });
    expect(r.body).toMatchObject({ noop: false, executableCount: 1, totalLayers: 1, totalChildren: 2 });
    let done: any;
    for (let i = 0; i < 100 && !done; i++) {
      await new Promise((res) => setTimeout(res, 20));
      done = events.slice(n).find((e) => e.event === "task:completed");
    }
    expect(done.payload).toEqual({
      task_id: `group-exec-${r.body.executionId}`,
      status: "succeeded",
      outputs: { group_id: groupId, completed_count: "1", failed_count: "0", skipped_count: "1" },
      session_id: "ses_root",
    });
    expect(readFileSync(path.join(ws, "a.md"), "utf8")).toBe("# 重跑的结果");
    const marks = events.slice(n).filter((e) => e.event === "canvas:node-generating").map((e) => e.payload.action);
    expect(marks).toEqual(["mark", "clear"]);
  });

  it("分层：按组内连线的最长路径分层，不可重跑的节点不派发但照样占层", () => {
    const node = (id: string, model = true) => ({ id, type: "image", parentId: "g", positions: {}, data: model ? { model_id: "m" } : {} });
    const plan = resolveExecutableLayers(
      {
        nodes: [node("a"), node("b", false), node("c"), node("d"), { id: "x", type: "image", positions: {}, data: { model_id: "m" } }],
        edges: [
          { id: "1", source: "a", target: "b", type: "e" },
          { id: "2", source: "b", target: "c", type: "e" },
          { id: "3", source: "a", target: "c", type: "e" },
          { id: "4", source: "x", target: "d", type: "e" },
        ],
      } as never,
      "g",
    );
    expect(plan).toEqual({ groupId: "g", layers: [["a", "d"], ["c"]], executableCount: 3, layerCount: 2, totalChildren: 4, skipped: { nonExecutable: ["b"] } });
  });
});

/** 测试用的最小 zip 解包：顺着本地文件头读，校验 CRC。 */
function unzip(buf: Buffer): Record<string, string> {
  const out: Record<string, string> = {};
  let off = 0;
  while (buf.readUInt32LE(off) === 0x04034b50) {
    const crc = buf.readUInt32LE(off + 14);
    const size = buf.readUInt32LE(off + 18);
    const nameLen = buf.readUInt16LE(off + 26);
    const extraLen = buf.readUInt16LE(off + 28);
    const name = buf.subarray(off + 30, off + 30 + nameLen).toString("utf8");
    const start = off + 30 + nameLen + extraLen;
    const data = inflateRawSync(buf.subarray(start, start + size));
    expect(crc32(data)).toBe(crc);
    out[name] = data.toString("utf8");
    off = start + size;
  }
  return out;
}
