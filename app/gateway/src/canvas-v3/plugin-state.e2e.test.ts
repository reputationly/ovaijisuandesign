import { createHash } from "node:crypto";
import { linkSync, mkdtempSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { CanvasV3PluginStateService } from "./plugin-state.js";

describe("v3 插件状态", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-plugin-"));
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

  it("按修订号保存节点状态，渲染层不能改插件身份，硬链接文件拒绝读取", async () => {
    const missing = await http.get("/api/v3/canvas/plugin-state/missing");
    expect(missing.status).toBe(404);

    const composition = await http.post("/api/project/compositions/commands").send({
      commandId: "plugin-cmp",
      actor: "human",
      command: { type: "composition.create", compositionType: null, name: "插件" },
    });
    const compositionId = composition.body.compositionId as string;
    const base = { parentId: null, position: { x: 0, y: 0 }, size: { width: 200, height: 120 }, zIndex: 1, hidden: false };
    const placed = await http.post("/api/v3/canvas/commands").send({
      commandId: "plugin-place",
      expectedRevision: 0,
      command: {
        type: "canvas.patch",
        nodes: [
          { id: "frame-1", before: null, after: { ...base, id: "frame-1", kind: "frame", title: "一组", collapsed: false } },
          { id: "node-1", before: null, after: { ...base, id: "node-1", kind: "composition", compositionId, activeItem: null, draft: null } },
        ],
        edges: [],
      },
    });
    expect(placed.status).toBe(200);

    const created = await http.get("/api/v3/canvas/plugin-state/frame-1");
    expect(created.status).toBe(200);
    expect(created.headers["cache-control"]).toBe("no-store");
    expect(created.body).toEqual({ data: {}, storage: {}, revision: 0 });
    const again = await http.get("/api/v3/canvas/plugin-state/frame-1");
    expect(again.body.revision).toBe(0);

    const saved = await http.put("/api/v3/canvas/plugin-state/frame-1").send({ data: { note: "草稿" }, storage: { pin: true }, revision: 0 });
    expect(saved.status).toBe(200);
    expect(saved.body).toEqual({ data: { note: "草稿" }, storage: { pin: true }, revision: 1 });
    const stale = await http.put("/api/v3/canvas/plugin-state/frame-1").send({ data: { note: "另一份" }, storage: {}, revision: 0 });
    expect(stale.status).toBe(409);
    expect(stale.body.message).toBe("V3 plugin state revision changed; hydrate and retry");
    const rebound = await http.put("/api/v3/canvas/plugin-state/frame-1").send({ data: { note: "草稿", pluginId: "other" }, storage: { pin: true }, revision: 1 });
    expect(rebound.status).toBe(403);
    const reserved = await http.put("/api/v3/canvas/plugin-state/frame-1").send({ data: { pluginEntry: "x" }, storage: {}, revision: 1 });
    expect(reserved.status).toBe(400);

    const file = path.join(ws, ".hilo", "canvas-v3", "plugin-state", `${createHash("sha256").update("frame-1").digest("hex")}.json`);
    linkSync(file, `${file}.link`);
    const linked = await http.get("/api/v3/canvas/plugin-state/frame-1");
    expect(linked.status).toBe(403);
    unlinkSync(`${file}.link`);
    expect((await http.get("/api/v3/canvas/plugin-state/frame-1")).status).toBe(200);

    const state = app.get(CanvasV3PluginStateService);
    await expect(state.bindPlugin("frame-1", "comfyui")).rejects.toThrow("Plugin identity requires a content node");
    const bound = await state.bindPlugin("node-1", "comfyui", "1.2.3");
    expect(bound.data).toMatchObject({ pluginId: "comfyui", pluginVersion: "1.2.3" });
    expect(bound.revision).toBe(1);
    await expect(state.bindPlugin("node-1", "other")).rejects.toThrow("V3 node already belongs to another plugin");
    const draft = "x".repeat(300_000);
    const identity = { pluginId: "comfyui", pluginVersion: "1.2.3" };
    await expect(state.write("node-1", { data: identity, storage: { other: draft }, revision: 1 })).rejects.toThrow("Plugin storage value exceeds quota");
    const kept = await state.write("node-1", { data: identity, storage: { "comfyui.workflow-draft.v1": draft }, revision: 1 });
    expect(kept.revision).toBe(2);
  });
});
