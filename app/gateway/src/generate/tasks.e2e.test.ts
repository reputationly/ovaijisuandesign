import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { ProjectTaskService } from "./tasks.js";

describe("v3 生成任务", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
  });

  // Windows CI runner 上起真的 gateway + 建库偶尔超过默认的 5s（同类 flake 见过多次）。
  it("记下进行中的任务，停止后不再留在队列里", { timeout: 30_000 }, async () => {
    process.env.WORKSPACE_DIR = mkdtempSync(path.join(tmpdir(), "ov-tasks-"));
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    app = await createApp();
    await app.init();
    const http = request(app.getHttpServer());
    app.get(ProjectTaskService).accept({ id: "gen_task_1", operation: "generate_image", prompt: "一盏灯", mediaType: "image" });
    const listed = await http.get("/api/v3/tasks");
    expect(listed.status).toBe(200);
    expect(listed.body.items[0]).toMatchObject({ id: "gen_task_1", capabilityId: "generate_image", status: "running", prompt: "一盏灯", revision: 1 });
    // 第 318 轮（验收发现）：`/api/v3/tasks/queue` 已改成**计数对象**（对齐参照实测形状），
    // 这里原来还在断言它是数组。形状见 generate/tasks.ts 的 queue() 注释。
    const queue = await http.get("/api/v3/tasks/queue");
    // 计数对象里没有 running 这个键（参照的形状就没有）；accept 写的 "running" 映射到 active。
    expect(queue.body.tasks.active).toBe(1);
    const busyQueue = ["pending", "queued", "active", "paused", "waitingUser", "reconciling"] as const;
    expect(busyQueue.reduce((n, k) => n + (queue.body.tasks[k] ?? 0), 0)).toBe(1);
    expect(Array.isArray(queue.body.subtasks)).toBe(true);
    const found = await http.get("/api/v3/tasks/lookup").query({ operation: "generate_image", requestId: "gen_task_1" });
    expect(found.body.id).toBe("gen_task_1");
    const stopped = await http.post("/api/v3/tasks/gen_task_1/resolve").send({ action: "stop", expectedRevision: 1, requestId: "stop-1" });
    expect(stopped.status).toBe(200);
    expect(stopped.body.status).toBe("cancelled");
    const after = await http.get("/api/v3/tasks/queue");
    const busy = ["pending", "queued", "active", "paused", "waitingUser", "reconciling"] as const;
    expect(busy.reduce((n, k) => n + (after.body.tasks[k] ?? 0), 0)).toBe(0);
    const stale = await http.post("/api/v3/tasks/gen_task_1/resolve").send({ action: "stop", expectedRevision: 1, requestId: "stop-2" });
    expect(stale.status).toBe(409);
  });
});