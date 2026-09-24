import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { RuntimeConnection } from "./runtime-connection.js";

describe("POST /api/runtime/opencode-url", () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createApp();
    await app.init();
  });
  afterAll(() => app.close());

  it("记下地址和凭据，之后发给 opencode 的请求带 basic auth", async () => {
    const r = await request(app.getHttpServer())
      .post("/api/runtime/opencode-url")
      .send({ url: "http://127.0.0.1:4567/", username: "u", password: "p" });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true, url: "http://127.0.0.1:4567" });
    const conn = app.get(RuntimeConnection);
    expect(conn.headers().authorization).toBe("Basic " + Buffer.from("u:p").toString("base64"));
  });

  it("不是 URL 的拒掉", async () => {
    const r = await request(app.getHttpServer()).post("/api/runtime/opencode-url").send({ url: "not a url" });
    expect(r.status).toBe(400);
  });
});
