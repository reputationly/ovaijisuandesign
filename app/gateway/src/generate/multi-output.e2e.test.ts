import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const CALLER_KEY = "multi-output-caller";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AL+2wAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * `count>1` 必须**扇出成 N 个任务**并把 id 一起回给调用方（参照的 `serverTaskIds`）。
 * 之前 `count` 只校验不使用、`n` 又写死 1，所以 `count:4` 实际只生成 1 张。
 */
describe("多输出扇出", () => {
  let server: ReturnType<typeof createServer>;
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let shots = 0;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === "/v1/images/generations") {
        shots += 1;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ data: [{ url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/files/o.png` }] }));
        return;
      }
      if (req.url === "/files/o.png") {
        res.setHeader("content-type", "image/png");
        res.end(PNG);
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const workspace = mkdtempSync(path.join(tmpdir(), "ov-multi-out-"));
    const config = path.join(workspace, "config.json");
    writeFileSync(config, JSON.stringify({ platform: { base_url: `${base}/v1`, api_key: "k", chat_model: "chat" }, models: { image: "qwen-image" } }));
    process.env.WORKSPACE_DIR = workspace;
    process.env.OV_CONFIG_PATH = config;
    process.env.HILO_DATA_DIR = mkdtempSync(path.join(tmpdir(), "ov-multi-out-hub-"));
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    process.env.HILO_AGENT_CALLER_KEY = CALLER_KEY;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    await new Promise((resolve) => server.close(resolve));
    for (const key of ["WORKSPACE_DIR", "OV_CONFIG_PATH", "HILO_DATA_DIR", "HILO_GATEWAY_ROLE", "HILO_PROJECT_ARCHITECTURE", "HILO_AGENT_CALLER_KEY"]) delete process.env[key];
  });

  it("count=3 提交 3 个任务，serverTaskIds 回全部 id", async () => {
    const before = shots;
    // 每次尝试用不同的 tool id：vitest 失败重试时同 id 会命中原任务的幂等记录。
    const toolId = `tool-multi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const res = await http
      .post("/api/v3/execute")
      .set("x-hilo-agent-caller", CALLER_KEY)
      .set("x-session-id", "sess-multi")
      .set("x-tool-use-id", toolId)
      .send({
        capabilityId: "generate_image:qwen-image",
        prompt: "四张一组的第一张",
        count: 3,
        output: {
          resources: [{ mode: "create", name: "卡片组" }],
          composition: { name: "图片组", type: { label: "图片" }, placements: [{ role: "卡片" }] },
        },
      });
    expect(res.status).toBe(202);
    expect(Array.isArray(res.body.serverTaskIds)).toBe(true);
    expect(res.body.serverTaskIds).toHaveLength(3);
    expect(new Set(res.body.serverTaskIds).size).toBe(3);
    // 每个任务都真的提交给平台了。
    expect(shots - before).toBe(3);
    // 回来的是第一个任务，状态在跑。
    expect(res.body.task.id).toBe(res.body.serverTaskIds[0]);
  });

  it("count=1 不扇出：没有 serverTaskIds", async () => {
    const res = await http
      .post("/api/v3/execute")
      .set("x-hilo-agent-caller", CALLER_KEY)
      .set("x-session-id", "sess-multi")
      .set("x-tool-use-id", "tool-multi-2")
      .send({
        capabilityId: "generate_image:qwen-image",
        prompt: "单张",
        output: { resources: [{ mode: "create", name: "单张" }], composition: { name: "单张组", type: { label: "图片" }, placements: [{ role: "主图" }] } },
      });
    expect(res.status).toBe(202);
    expect(res.body.serverTaskIds).toBeUndefined();
  });
});
