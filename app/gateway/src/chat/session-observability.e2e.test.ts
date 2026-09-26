import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { AssetsService } from "../common/assets.service.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";

describe("会话统计、忙碌探测、附件归属", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;
  let assetId = "";

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-session-obs-"));
    process.env.WORKSPACE_DIR = ws;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    writeFileSync(path.join(ws, "out.md"), "x");
    assetId = (await app.get(AssetsService).enroll("out.md")).id;
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
  });

  it("metrics：按发给界面的聊天帧计数，同一个 part 多次更新只算一次", async () => {
    expect((await http.get("/api/internal/sessions/ui-1/metrics")).body).toEqual({ uiSessionId: "ui-1" });
    const bus = app.get(GatewayEventBus);
    const tool = (status: string) => ({
      type: "part_updated",
      session_id: "ui-1",
      part: { id: "p1", type: "tool", tool: "task", state: { status, input: { subagent_type: "director" } } },
    });
    bus.emit("chat", tool("pending"));
    bus.emit("chat", tool("running"));
    bus.emit("chat", tool("error"));
    bus.emit("chat", tool("error"));
    bus.emit("chat", { type: "part_updated", session_id: "ui-1", part: { id: "t1", type: "text", time: { start: 1 } } });
    bus.emit("chat", { type: "part_updated", session_id: "ui-1", part: { id: "t1", type: "text", time: { start: 1, end: 2 } } });
    bus.emit("chat", { type: "part_updated", session_id: "ui-1", part: { id: "t1", type: "text", time: { start: 1, end: 2 } } });
    bus.emit("chat", { type: "session_error", session_id: "ui-1", content: "boom" });
    await http.post("/api/internal/sessions/ui-1/loop-guard-trip").send({ tool: "hub_generate_image" }).expect(200);

    const m = (await http.get("/api/internal/sessions/ui-1/metrics")).body;
    expect(m).toMatchObject({
      uiSessionId: "ui-1",
      stepCount: 1,
      toolCalls: { task: { count: 1, errorCount: 1 } },
      subAgentDispatches: { director: 1 },
      loopGuardTrips: 1,
      errorEvents: 2,
    });
    expect(m.loopGuardSettlements.byDecision).toEqual({ allow_once: 0, allow_session: 0, reject: 0 });
    const all = (await http.get("/api/internal/sessions/metrics")).body;
    expect(all.map((x: any) => x.uiSessionId)).toEqual(["ui-1"]);
  });

  it("any-busy：空闲时 false", async () => {
    expect((await http.get("/api/internal/sessions/any-busy")).body).toEqual({ busy: false });
  });

  it("open-comfyui：ComfyUI 不可用时回 unknown_plugin", async () => {
    const r = await http.post("/api/internal/sessions/ses_1/open-comfyui").send({ workflow: "x" });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ status: "unknown_plugin" });
  });

  it("attachment-outputs / observations：解析成资产库引用，去重，跳过库外和越界路径", async () => {
    const out = await http
      .post("/api/internal/sessions/ses_1/attachment-outputs")
      .send({ paths: ["out.md", path.join(ws, "out.md"), "missing.png", "../escape.md"], tool_call_id: "call_1" });
    expect(out.status).toBe(200);
    expect(out.body).toEqual({ attachment_refs: [{ attachment_source: "asset_vault", attachment_id: assetId }] });
    // 没有 tool_call_id 的工具观测不登记。
    expect((await http.post("/api/internal/sessions/ses_1/attachment-outputs").send({ paths: ["out.md"] })).body).toEqual({ attachment_refs: [] });
    // 用户消息里的输入附件：只查。
    const msg = await http.post("/api/internal/sessions/ses_1/attachment-observations").send({ paths: ["out.md"], direction: "input", scope: "message" });
    expect(msg.body.attachment_refs).toHaveLength(1);
    expect((await http.post("/api/internal/sessions/ses_1/attachment-observations").send({ paths: ["out.md"] })).body).toEqual({ attachment_refs: [] });
  });
});
