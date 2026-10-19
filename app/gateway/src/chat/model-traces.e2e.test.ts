import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const TRACE = {
  call_id: "call-1",
  session_id: "sess-1",
  request_id: "req-1",
  trace_id: "trace-main",
  agent: "media",
  model_id: "qwen-image",
  started_at: 1_700_000_000_000,
  status_code: 200,
};

describe("对话模型调用记录", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    process.env.WORKSPACE_DIR = mkdtempSync(path.join(tmpdir(), "ov-traces-"));
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
  });

  it("评分用的是这次回复里非辅助代理的 trace", async () => {
    expect((await http.post("/api/chat/model-traces").send({ ...TRACE, agent: " " })).status).toBe(400);
    expect((await http.post("/api/chat/model-traces").send(TRACE)).body).toEqual({ call_id: "call-1" });
    expect((await http.post("/api/chat/model-traces").send(TRACE)).body).toEqual({ call_id: "call-1" });
    expect((await http.post("/api/chat/model-traces").send({ ...TRACE, model_id: "other" })).status).toBe(409);
    await http.post("/api/chat/model-traces").send({ ...TRACE, call_id: "call-title", trace_id: "trace-title", agent: "title", started_at: TRACE.started_at + 1 });
    const lookup = await http.get("/api/chat/model-traces").query({ session_id: "sess-1", request_id: "req-1" });
    expect(lookup.body.trace_id).toBe("trace-main");
    expect(lookup.body.traces.map((trace: { call_id: string }) => trace.call_id)).toEqual(["call-title", "call-1"]);
  });
});
