import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

describe("本地反馈", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    process.env.HILO_DATA_DIR = mkdtempSync(path.join(tmpdir(), "ov-feedback-"));
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    delete process.env.HILO_DATA_DIR;
  });

  it("同一幂等键只开一张单，附件落在数据根", async () => {
    const uploaded = await http.post("/api/feedback/upload-attachment").attach("file", Buffer.from("log"), "note.txt");
    expect(uploaded.status).toBe(200);
    expect(uploaded.body).toMatchObject({ name: "note.txt", size: 3, mimeType: "text/plain" });
    expect(uploaded.body.url).toContain("feedback/attachments/");
    const created = await http.post("/api/feedback").send({ description: "画布打不开", idempotency_key: "same-key", source: "settings" });
    expect(created.body.ticket_id).toMatch(/^fb_/);
    const again = await http.post("/api/feedback").send({ description: "画布打不开", idempotency_key: "same-key", source: "settings" });
    expect(again.body.ticket_id).toBe(created.body.ticket_id);
    expect((await http.get(`/api/feedback/${created.body.ticket_id}`)).body.description).toBe("画布打不开");
    const updated = await http.put(`/api/feedback/${created.body.ticket_id}`).send({ classification_status: "triaged" });
    expect(updated.body.classification_status).toBe("triaged");
    expect((await http.get("/api/feedback")).body.total).toBe(1);
    expect((await http.post("/api/feedback").send({ description: "" })).status).toBe(400);
    expect((await http.post("/api/feedback/upload-attachment")).status).toBe(400);
  });
});
