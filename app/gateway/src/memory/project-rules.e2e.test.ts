import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

describe("项目规则", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-rules-"));
    process.env.WORKSPACE_DIR = ws;
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
  });

  it("没绑 v3 工作区时拒绝读写", async () => {
    delete process.env.HILO_PROJECT_ARCHITECTURE;
    const denied = await http.get("/api/project-rules");
    expect(denied.status).toBe(403);
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
  });

  it("空文档用 null revision 写入，revision 对不上回 409", async () => {
    const empty = await http.get("/api/project-rules");
    expect(empty.status).toBe(200);
    expect(empty.headers["cache-control"]).toBe("no-store");
    expect(empty.body).toEqual({ content: "", revision: null });

    const bad = await http.put("/api/project-rules").send({ content: "先读再写", expectedRevision: "a".repeat(64) });
    expect(bad.status).toBe(409);

    const saved = await http.put("/api/project-rules").send({ content: "只用暖色", expectedRevision: null });
    expect(saved.status).toBe(200);
    const revision = createHash("sha256").update("只用暖色").digest("hex");
    expect(saved.body).toEqual({ content: "只用暖色", revision });
    expect(readFileSync(path.join(ws, ".hilo", "project-rules.md"), "utf8")).toBe("只用暖色");

    const again = await http.get("/api/project-rules");
    expect(again.body.revision).toBe(revision);
  });

  it("超长、空字节和坏 revision 回 400；坏编码读文件回 500", async () => {
    expect((await http.put("/api/project-rules").send({ content: "a".repeat(16 * 1024 + 1), expectedRevision: null })).status).toBe(400);
    expect((await http.put("/api/project-rules").send({ content: "a\0b", expectedRevision: null })).status).toBe(400);
    expect((await http.put("/api/project-rules").send({ content: "ok", expectedRevision: "nope" })).status).toBe(400);

    writeFileSync(path.join(ws, ".hilo", "project-rules.md"), Buffer.from([0xff, 0xfe]));
    const broken = await http.get("/api/project-rules");
    expect(broken.status).toBe(500);
    expect(broken.body.message).toContain("Cannot read project rules");
  });
});
