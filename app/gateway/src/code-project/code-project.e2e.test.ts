import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

describe("Code Project", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;
  const sid = "ses_code_test";

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-code-"));
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
    rmSync(ws, { recursive: true, force: true });
  });

  it("open 建工作树，checkpoint 记录变更，publish 落到 Resources", async () => {
    const opened = await http.post("/api/v3/code-projects/open").set("x-session-id", sid).send({});
    expect(opened.status).toBe(200);
    expect(opened.body.created).toBe(true);
    expect(opened.body.workDir).toBe(path.join(ws, ".hilo/code", opened.body.codeProjectId, "work"));
    const workDir = opened.body.workDir as string;
    writeFileSync(path.join(workDir, "out.txt"), "hello code project");

    const status = await http.post("/api/v3/code-projects/status").set("x-session-id", sid).send({});
    expect(status.status).toBe(200);
    expect(status.body.changedFiles).toEqual([{ path: "out.txt", change: "added" }]);
    expect(status.body.head).toBeNull();

    const checkpoint = await http.post("/api/v3/code-projects/checkpoint").set("x-session-id", sid).send({ message: "first" });
    expect(checkpoint.status).toBe(200);
    expect(checkpoint.body.created).toBe(true);
    expect(checkpoint.body.checkpoint.checkpointId).toBe("ckp_0001");
    const again = await http.post("/api/v3/code-projects/checkpoint").set("x-session-id", sid).send({ message: "first" });
    expect(again.body.created).toBe(false);

    const published = await http.post("/api/v3/code-projects/publish").set("x-session-id", sid).send({
      requestId: "pub-1",
      outputs: [{ key: "out", source: { path: "out.txt" } }],
      output: { resources: [{ key: "out", mode: "create", name: "结果.txt" }] },
    });
    expect(published.status).toBe(200);
    expect(published.body.delivery.status).toBe("completed");
    expect(published.body.delivery.resources[0]).toMatchObject({ key: "out", kind: "text" });

    const binding = await http.get(`/api/v3/code-projects/binding?sessionId=${sid}`);
    expect(binding.body.binding).toMatchObject({ codeProjectId: opened.body.codeProjectId, workDir });
  });

  it("没有 open 的 session 调用 status 返回 409", async () => {
    const res = await http.post("/api/v3/code-projects/status").set("x-session-id", "ses_none").send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CODE_PROJECT_NOT_OPEN");
  });
});
