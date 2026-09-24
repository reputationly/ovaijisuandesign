import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";

describe("plan / feedback-extractor 通知", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  const events: any[] = [];

  beforeAll(async () => {
    process.env.WORKSPACE_DIR = mkdtempSync(path.join(tmpdir(), "ov-plan-e2e-"));
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    app.get(GatewayEventBus).subscribe((m) => events.push(m));
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
  });

  it("notify-changed：广播 plan_changed，只带认识的字段", async () => {
    const r = await http
      .post("/api/plan/notify-changed")
      .send({ plan_id: " plan-1 ", revision: 3, action: "patch_stage", stage_ids: ["s1", 2, "s2"], runtime_session_id: "ses", extra: true });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
    expect(events.at(-1)).toEqual({
      event: "plan:changed",
      payload: { type: "plan_changed", plan_id: "plan-1", revision: 3, action: "patch_stage", stage_ids: ["s1", "s2"], runtime_session_id: "ses" },
    });
  });

  it("notify-changed：字段不齐或 action 不认识时静默回 ok，不广播", async () => {
    const n = events.length;
    for (const body of [{}, { plan_id: "p", revision: "3", action: "write" }, { plan_id: "p", revision: 1, action: "delete" }]) {
      const r = await http.post("/api/plan/notify-changed").send(body);
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ ok: true });
    }
    expect(events.length).toBe(n);
  });

  it("feedback-extractor：notify-manual-write 回 ok；config 回显开关", async () => {
    const r = await http.post("/api/feedback-extractor/notify-manual-write").send({ sessionId: "ses" });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
    expect((await http.post("/api/feedback-extractor/notify-manual-write").send({})).body).toEqual({ ok: true });
    expect((await http.post("/api/feedback-extractor/config").send({ enabled: 1 })).body).toEqual({ ok: true, enabled: true });
  });
});
