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
import { ProjectTaskService } from "./tasks.js";

const CALLER_KEY = "execute-secret";
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082", "hex");

describe("v3 执行生成", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let server: Server;

  beforeAll(async () => {
    const platform = createServer((req, res) => {
      if (req.url === "/v1/images/generations") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ data: [{ url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/files/out.png` }] }));
        return;
      }
      if (req.url === "/files/out.png") {
        res.setHeader("content-type", "image/png");
        res.end(PNG);
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    server = platform;
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const workspace = mkdtempSync(path.join(tmpdir(), "ov-execute-task-"));
    const config = path.join(workspace, "config.json");
    writeFileSync(config, JSON.stringify({ platform: { base_url: `${base}/v1`, api_key: "k", chat_model: "chat" }, models: { image: "qwen-image" } }));
    process.env.WORKSPACE_DIR = workspace;
    process.env.OV_CONFIG_PATH = config;
    process.env.HILO_DATA_DIR = mkdtempSync(path.join(tmpdir(), "ov-execute-task-hub-"));
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    process.env.HILO_AGENT_CALLER_KEY = CALLER_KEY;
    app = await createApp();
    app.get(MediaConfigService).clientOverrides = { sleep: async () => undefined, logger: { info() {}, warn() {} } };
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    await new Promise((resolve) => server.close(resolve));
    delete process.env.WORKSPACE_DIR;
    delete process.env.OV_CONFIG_PATH;
    delete process.env.HILO_DATA_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
    delete process.env.HILO_AGENT_CALLER_KEY;
  });

  it("代理提交出图任务，同一工具调用再提交交回原任务，结果放进组合", async () => {
    const body = {
      capabilityId: "generate_image:qwen-image",
      prompt: "一盏灯",
      output: {
        resources: [{ mode: "create", name: "灯" }],
        composition: { name: "灯组", type: { label: "Generated" }, placements: [{ role: "image" }] },
      },
    };
    const created = await http.post("/api/v3/execute").set("x-hilo-agent-caller", CALLER_KEY).set("x-session-id", "sess-1").set("x-tool-use-id", "tool-gen").send(body);
    expect(created.status).toBe(202);
    expect(created.body.reused).toBe(false);
    expect(created.body.task).toMatchObject({ capabilityId: "generate_image:qwen-image", status: "running", prompt: "一盏灯" });
    const again = await http.post("/api/v3/execute").set("x-hilo-agent-caller", CALLER_KEY).set("x-session-id", "sess-1").set("x-tool-use-id", "tool-gen").send(body);
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ reused: true, task: { id: created.body.task.id } });

    const done = await until(async () => {
      const current = await http.get(`/api/v3/tasks/${created.body.task.id}`);
      return current.body.status === "completed" ? current.body : undefined;
    });
    const listed = await http.get("/api/v3/tasks").query({ operation: "generate_image", source: "agent", toolUseId: "tool-gen", limit: 1 });
    expect(listed.status).toBe(200);
    expect(listed.body.items.map((item: { id: string }) => item.id)).toContain(created.body.task.id);
    expect(done.outputs[0].path).toMatch(/\.png$/);
    expect(done.placements[0]).toMatchObject({ role: "image" });
    const composition = await http.post("/api/project/compositions/get").send({ compositionId: done.placements[0].compositionId });
    expect(composition.body.members).toHaveLength(1);
  });

  it("失败任务刚用 retry 恢复，未支持的动作不会落到 stop", async () => {
    const body = {
      capabilityId: "generate_image:qwen-image",
      prompt: "重试的灯",
      output: {
        resources: [{ mode: "create", name: "重试灯" }],
        composition: { name: "重试灯组", type: { label: "Generated" }, placements: [{ role: "image" }] },
      },
    };
    const created = await http.post("/api/v3/execute").set("x-hilo-agent-caller", CALLER_KEY).set("x-session-id", "sess-retry").set("x-tool-use-id", "tool-retry").send(body);
    expect(created.status).toBe(202);
    const tasks = app.get(ProjectTaskService);
    tasks.fail(created.body.task.id, "provider exploded");
    const failed = await http.get(`/api/v3/tasks/${created.body.task.id}`);
    expect(failed.body.status).toBe("failed");

    const unsupported = await http.post(`/api/v3/tasks/${created.body.task.id}/resolve`).send({ action: "pause", expectedRevision: failed.body.revision, requestId: "pause-1" });
    expect(unsupported.status).toBe(422);
    expect((await http.get(`/api/v3/tasks/${created.body.task.id}`)).body.status).toBe("failed");

    const retried = await http.post(`/api/v3/tasks/${created.body.task.id}/resolve`).send({ action: "retry", expectedRevision: failed.body.revision, requestId: "retry-1" });
    expect(retried.status).toBe(200);
    expect(retried.body.status).toBe("running");
    const done = await until(async () => {
      const current = await http.get(`/api/v3/tasks/${created.body.task.id}`);
      return current.body.status === "completed" ? current.body : undefined;
    });
    expect(done.outputs[0].path).toMatch(/\.png$/);
  });
});

async function until<T>(read: () => Promise<T | undefined>): Promise<T> {
  const end = Date.now() + 8000;
  for (;;) {
    const value = await read();
    if (value !== undefined) return value;
    if (Date.now() > end) throw new Error("timed out");
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}
