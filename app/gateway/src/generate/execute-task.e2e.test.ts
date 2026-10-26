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

/** 渲染层 `parseTaskView` 的等价校验（字段、类型、枚举）。 */
const TASK_PROGRESS_PHASES = ["pending", "queued", "active", "paused", "retrying", "stopped", "done"];
function expectTaskView(view: Record<string, unknown>, id: string) {
  expect(view).toMatchObject({
    id,
    operation: expect.any(String),
    terminal: expect.any(Boolean),
    stage: expect.any(String),
    revision: expect.any(Number),
    actions: expect.any(Array),
    data: expect.any(Object),
  });
  expect(TASK_PROGRESS_PHASES).toContain((view.progress as { phase?: string })?.phase);
  expect(Number.isInteger(view.createdAt)).toBe(true);
  expect(Number.isInteger(view.updatedAt)).toBe(true);
}
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082", "hex");

describe("v3 执行生成", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let server: Server;

  beforeAll(async () => {
    const platform = createServer((req, res) => {
      if (req.url === "/v1/images/generations") {
        // 读一下请求体：下面那条用例要模拟"平台回 403 额度不足"，
        // 用提示词当开关比再起一个假平台省事。
        let body = "";
        req.on("data", (chunk) => { body += String(chunk); });
        req.on("end", () => {
          if (body.includes("额度不足")) {
            // 形状与 new-api 的错误信封一致（`abortWithOpenAiMessage`）。
            res.statusCode = 403;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: { code: "insufficient_user_quota", message: "quota exceeded", type: "new_api_error" } }));
            return;
          }
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ data: [{ url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/files/out.png` }] }));
        });
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
    if (created.status !== 202) console.error("execute 400 body:", JSON.stringify(created.body).slice(0, 400));
    expect(created.status).toBe(202);
    // execute 的返回也是渲染层解析的那份任务（tool part 里的快照就是它）：
    // 形状和 `GET /api/v3/tasks/:id` 一致，`progress.phase` 必须是渲染层的枚举。
    expectTaskView(created.body.task, created.body.task.id);
    expect(created.body.reused).toBe(false);
    expect(created.body.task).toMatchObject({ capabilityId: "generate_image:qwen-image", status: "running", prompt: "一盏灯" });
    // 非终态只有 stop（pause/resume/confirm_cost 我们没实现，不许列出来）。
    expect(created.body.task.actions).toEqual(["stop"]);
    const again = await http.post("/api/v3/execute").set("x-hilo-agent-caller", CALLER_KEY).set("x-session-id", "sess-1").set("x-tool-use-id", "tool-gen").send(body);
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ reused: true, task: { id: created.body.task.id } });
    // `reused` 分支同样要过这套校验。
    expectTaskView(again.body.task, created.body.task.id);

    const done = await until(async () => {
      const current = await http.get(`/api/v3/tasks/${created.body.task.id}`);
      return current.body.status === "completed" ? current.body : undefined;
    });
    // 完成的任务没有任何可执行动作（`designTaskRetryable` 也就为 false）。
    expect(done.actions).toEqual([]);
    expect(done.progress.phase).toBe("done");
    const listed = await http.get("/api/v3/tasks").query({ operation: "generate_image", source: "agent", toolUseId: "tool-gen", limit: 1 });
    expect(listed.status).toBe(200);
    expect(listed.body.items.map((item: { id: string }) => item.id)).toContain(created.body.task.id);
    // T-1：任务的产出必须带资源身份，卡片才能把图显示出来。
    // 只回 `{key,path}` 时渲染层的 designOutputs 会把每一项都过滤掉（卡上 outputs=0）。
    expect(done.outputs).toHaveLength(1);
    expect(done.outputs[0]).toMatchObject({ key: "primary", kind: "image", name: "灯", availability: "available" });
    expect(done.outputs[0].resourceId).toMatch(/^res_/);
    expect(done.outputs[0].versionId).toMatch(/^ver_/);
    expect(done.outputs[0].path).toMatch(/\.png$/);
    expect(done.placements[0]).toMatchObject({ role: "image" });
    const composition = await http.post("/api/project/compositions/get").send({ compositionId: done.placements[0].compositionId });
    expect(composition.body.members).toHaveLength(1);
    // 资源能查：卡片就是用这对 id 去换 relativePath 的，查不到就显示"读取失败"。
    const resource = await http.post("/api/project/resources/get").send({ selectors: [{ resourceId: done.outputs[0].resourceId, versionId: done.outputs[0].versionId }] });
    expect(resource.body[0]).toMatchObject({ ok: true, detail: { version: { status: "ready", versionId: done.outputs[0].versionId } } });
    expect(resource.body[0].detail.version.relativePath).toMatch(/\.png$/);
    // `createdAt` / `updatedAt` 是**渲染层资源校验的必需字段**（`canvas-v3-model` 的
    // `version()` 用 `string()` 卡它们）。少了这两个，整条响应被判非法、卡片显示
    // "预览加载失败"，而 HTTP 是 200 —— 只在界面上看得出来。
    expect(resource.body[0].detail.version.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(resource.body[0].detail.version.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(resource.body[0].detail.resource.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // 任务视图的形状是**和渲染层写死的契约**（`canvas-v3/canvas-v3-model.js` 的
  // `parseTaskView`）：少一个必需字段、时间不是整数毫秒、`problem` 只有 message，
  // 渲染层都会判 `Invalid Task response`，整条任务被丢掉 —— 卡片从此只显示推送来的状态、
  // 一次轮询都不发，界面上还看不出异常。
  it("任务视图满足渲染层契约：必需字段齐全、时间是整数毫秒", async () => {
    const body = {
      capabilityId: "generate_image:qwen-image",
      prompt: "形状契约",
      output: {
        resources: [{ mode: "create", name: "形状" }],
        composition: { name: "形状组", type: { label: "Generated" }, placements: [{ role: "image" }] },
      },
    };
    const created = await http.post("/api/v3/execute").set("x-hilo-agent-caller", CALLER_KEY).set("x-session-id", "sess-shape").set("x-tool-use-id", "tool-shape").send(body);
    expect(created.status).toBe(202);
    const id = created.body.task.id;
    const single = (await http.get(`/api/v3/tasks/${id}`)).body;
    const listed = (await http.get("/api/v3/tasks?limit=10")).body.items.find((item: { id: string }) => item.id === id);
    for (const view of [single, listed]) {
      expect(view).toMatchObject({
        id,
        operation: "generate_image",
        terminal: expect.any(Boolean),
        stage: expect.any(String),
        revision: expect.any(Number),
        actions: expect.any(Array),
        data: expect.any(Object),
        // phase/reason 是渲染层的枚举，写内部词（compute/running）会被判非法。
        progress: expect.objectContaining({
          phase: expect.stringMatching(/^(pending|queued|active|paused|retrying|stopped|done)$/),
          subtasks: expect.any(Array),
        }),
      });
      expect(Number.isInteger(view.createdAt)).toBe(true);
      expect(Number.isInteger(view.updatedAt)).toBe(true);
      if (view.problem !== null) expect(view.problem).toMatchObject({ code: expect.any(String), source: expect.any(String), message: expect.any(String) });
      for (const output of view.outputs) {
        expect(output).toMatchObject({ key: expect.any(String), name: expect.any(String), kind: expect.any(String), resourceId: expect.any(String), versionId: expect.any(String), disposition: expect.any(String), availability: expect.any(String) });
      }
      for (const placement of view.placements) {
        expect(placement).toMatchObject({ key: expect.any(String), compositionId: expect.any(String), memberId: expect.any(String), resourceId: expect.any(String), status: expect.any(String) });
      }
    }
  });

  // 任务面板的停止/重试按钮读的就是 `actions`；空数组 = 按钮不出现。
  it("actions 只列 gateway 真支持的动作：非终态 stop、failed retry、completed 空", async () => {
    const body = {
      capabilityId: "generate_image:qwen-image",
      prompt: "动作",
      output: { resources: [{ mode: "create", name: "a" }], composition: { name: "g", type: { label: "Generated" }, placements: [{ role: "image" }] } },
    };
    const created = await http.post("/api/v3/execute").set("x-hilo-agent-caller", CALLER_KEY).set("x-session-id", "sess-actions").set("x-tool-use-id", "tool-actions").send(body);
    expect(created.status).toBe(202);
    expect(created.body.task.actions).toEqual(["stop"]);
    const done = await until(async () => {
      const current = await http.get(`/api/v3/tasks/${created.body.task.id}`);
      return current.body.status === "completed" ? current.body : undefined;
    });
    expect(done.actions).toEqual([]);
  });

  it("平台回「额度不足」时，任务的 problem 是参照枚举里的码 + 中文提示", async () => {
    // L-4 的验收在这里落地：卡片读的是 `problem`（不是 `error`），而 `problem.code`
    // 必须落在参照那份枚举里，否则渲染层会拒掉整条任务、卡片直接空掉。
    // 对应的平台错误码是 new-api 的 `insufficient_user_quota`。
    const body = {
      capabilityId: "generate_image:qwen-image",
      prompt: "额度不足时会失败",
      output: {
        resources: [{ mode: "create", name: "额度" }],
        composition: { name: "额度组", type: { label: "Generated" }, placements: [{ role: "image" }] },
      },
    };
    const created = await http.post("/api/v3/execute").set("x-hilo-agent-caller", CALLER_KEY).set("x-session-id", "sess-quota").set("x-tool-use-id", "tool-quota").send(body);
    expect(created.status).toBe(202);
    const done = await until(async () => {
      const current = await http.get(`/api/v3/tasks/${created.body.task.id}`);
      return current.body.status === "failed" ? current.body : undefined;
    });
    expect(done.problem).toMatchObject({ code: "BILLING_INSUFFICIENT", source: "billing" });
    expect(done.problem.message).toMatch(/额度/);
    // 技术原文仍然留着，排障要看它。
    expect(done.error).toContain("quota exceeded");
    // `progress.reason` 不能一律写成 provider_unavailable：额度不足要报 billing。
    expect(done.progress.reason).toBe("billing");
    // 失败且存有可重新提交的请求 → 面板上要有"重试"。
    expect(done.actions).toEqual(["retry"]);
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
