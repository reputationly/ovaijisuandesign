import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { MediaConfigService } from "./media-config.service.js";

const CALLER_KEY = "stop-secret";

describe("停止生成任务", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let server: Server;
  let release: () => void = () => undefined;

  beforeAll(async () => {
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const platform = createServer((req, res) => {
      if (req.url === "/v1/images/generations") {
        void gate.then(() => {
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ data: [{ url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/files/out.png` }] }));
        });
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    server = platform;
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const workspace = mkdtempSync(path.join(tmpdir(), "ov-task-stop-"));
    writeFileSync(path.join(workspace, "config.json"), JSON.stringify({ platform: { base_url: `${base}/v1`, api_key: "k", chat_model: "chat" }, models: { image: "qwen-image" } }));
    process.env.WORKSPACE_DIR = workspace;
    process.env.OV_CONFIG_PATH = path.join(workspace, "config.json");
    process.env.HILO_DATA_DIR = mkdtempSync(path.join(tmpdir(), "ov-task-stop-hub-"));
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    process.env.HILO_AGENT_CALLER_KEY = CALLER_KEY;
    app = await createApp();
    app.get(MediaConfigService).clientOverrides = { sleep: async () => undefined, logger: { info() {}, warn() {} } };
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    release();
    await app.close();
    await new Promise((resolve) => server.close(resolve));
    delete process.env.WORKSPACE_DIR;
    delete process.env.OV_CONFIG_PATH;
    delete process.env.HILO_DATA_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
    delete process.env.HILO_AGENT_CALLER_KEY;
  });

  it("停止之后，晚到的平台结果不再把任务改成完成", async () => {
    const created = await http.post("/api/v3/execute").set("x-hilo-agent-caller", CALLER_KEY).set("x-session-id", "sess").set("x-tool-use-id", "tool-stop").send({
      capabilityId: "generate_image:qwen-image",
      prompt: "停",
      output: { resources: [{ mode: "create", name: "停" }], composition: { name: "停组", type: { label: "Generated" }, placements: [{ role: "image" }] } },
    });
    expect(created.status).toBe(202);
    const stopped = await http.post(`/api/v3/tasks/${created.body.task.id}/resolve`).send({ action: "stop", expectedRevision: created.body.task.revision });
    expect(stopped.body.status).toBe("cancelled");
    release();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const current = await http.get(`/api/v3/tasks/${created.body.task.id}`);
    expect(current.body.status).toBe("cancelled");
    const query = await http.get(`/api/generate/tasks/${created.body.task.id}/query`);
    expect(query.body).toMatchObject({ status: "failed", error_code: "GENERATION_CANCELLED" });
  });
});
