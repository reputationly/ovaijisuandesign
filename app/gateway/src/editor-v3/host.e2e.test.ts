import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const GENERATION = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

function node(id: string, title: string) {
  return { id, parentId: null, position: { x: 10, y: 20 }, size: { width: 480, height: 320 }, zIndex: 1, hidden: false, kind: "director-stage", title };
}

async function boot(enabled: boolean): Promise<{ app: INestApplication; http: ReturnType<typeof request> }> {
  for (const key of ["WORKSPACE_DIR", "HILO_GATEWAY_ROLE", "HILO_PROJECT_ARCHITECTURE"]) delete process.env[key];
  if (enabled) {
    process.env.WORKSPACE_DIR = mkdtempSync(path.join(tmpdir(), "ov-host-"));
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
  }
  const app = await createApp();
  await app.init();
  return { app, http: request(app.getHttpServer()) };
}

describe("v3 编辑器打开", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
  });

  it("没有工作区时拒绝，有工作区时能打开、保存并放开导演台", async () => {
    ({ app } = await boot(false));
    const denied = await request(app.getHttpServer()).post("/api/v3/editors/host").send({ action: "poll", connectionGeneration: GENERATION });
    expect(denied.status).toBe(409);
    expect(denied.body.error.code).toBe("FORBIDDEN");
    await app.close();

    ({ app } = await boot(true));
    const http = request(app.getHttpServer());
    const invalid = await http.post("/api/v3/editors/host").send({ action: "poll" });
    expect(invalid.status).toBe(409);
    expect(invalid.body.error.code).toBe("VALIDATION_FAILED");

    const empty = await http.post("/api/v3/editors/host").send({ action: "poll", connectionGeneration: GENERATION });
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({ pending: null, canvasRevision: 0 });

    const stage = node("stage-1", "开场");
    const created = await http.post("/api/v3/canvas/commands").send({
      commandId: "canvas-stage",
      expectedRevision: 0,
      command: { type: "canvas.patch", nodes: [{ id: "stage-1", before: null, after: stage }], edges: [] },
    });
    expect(created.status).toBe(200);

    const missing = await http.post("/api/v3/editors/host").send({ action: "provision", connectionGeneration: GENERATION, target: { nodeId: "missing" } });
    expect(missing.body.error.code).toBe("TARGET_NOT_FOUND");

    const opened = await http.post("/api/v3/editors/host").send({ action: "provision", connectionGeneration: GENERATION, target: { nodeId: "stage-1" } });
    expect(opened.status).toBe(200);
    expect(opened.body.scene.cameras[0].id).toBe("camera_1");
    expect(opened.body.draftRevision).toBe(0);
    const sourceId = opened.body.sourceResourceId as string;
    const versionId = opened.body.versionId as string;

    const again = await http.post("/api/v3/editors/host").send({ action: "provision", connectionGeneration: GENERATION, target: { nodeId: "stage-1" } });
    expect(again.body.sourceResourceId).toBe(sourceId);

    const bound = await http.get("/api/v3/canvas");
    expect(bound.body.nodes["stage-1"].sourceResourceId).toBe(sourceId);

    const read = await http.post("/api/v3/editors/host").send({
      action: "open",
      connectionGeneration: GENERATION,
      target: { sourceResourceId: sourceId, nodeId: "stage-1" },
    });
    expect(read.status).toBe(200);
    expect(read.body.versionId).toBe(versionId);

    const scene = structuredClone(read.body.scene);
    scene.environment.skyColor = "#112233";
    const saved = await http.post("/api/v3/editors/host").send({
      action: "save",
      connectionGeneration: GENERATION,
      commandId: "save-1",
      target: { sourceResourceId: sourceId },
      expectedDraftRevision: 0,
      baseVersionId: versionId,
      data: { scene },
    });
    expect(saved.status).toBe(200);
    expect(saved.body.draftRevision).toBe(1);
    expect(saved.body.scene.environment.skyColor).toBe("#112233");
    expect(saved.body.versionId).not.toBe(versionId);

    const replay = await http.post("/api/v3/editors/host").send({
      action: "save",
      connectionGeneration: GENERATION,
      commandId: "save-1",
      target: { sourceResourceId: sourceId },
      expectedDraftRevision: 0,
      baseVersionId: versionId,
      data: { scene },
    });
    expect(replay.body.versionId).toBe(saved.body.versionId);

    const reused = await http.post("/api/v3/editors/host").send({
      action: "save",
      connectionGeneration: GENERATION,
      commandId: "save-1",
      target: { sourceResourceId: sourceId },
      expectedDraftRevision: 0,
      baseVersionId: versionId,
      data: { scene: read.body.scene },
    });
    expect(reused.status).toBe(409);
    expect(reused.body.error.code).toBe("COMMAND_ID_REUSED");

    const conflict = await http.post("/api/v3/editors/host").send({
      action: "save",
      connectionGeneration: GENERATION,
      commandId: "save-2",
      target: { sourceResourceId: sourceId },
      expectedDraftRevision: 0,
      baseVersionId: versionId,
      data: { scene },
    });
    expect(conflict.body.error.code).toBe("REVISION_CONFLICT");

    const same = await http.post("/api/v3/editors/host").send({
      action: "save",
      connectionGeneration: GENERATION,
      commandId: "save-3",
      target: { sourceResourceId: sourceId },
      expectedDraftRevision: 1,
      baseVersionId: saved.body.versionId,
      data: { scene },
    });
    expect(same.body.versionId).toBe(saved.body.versionId);

    const released = await http.post("/api/v3/editors/host").send({ action: "release", connectionGeneration: GENERATION, target: { sourceResourceId: sourceId } });
    expect(released.body).toEqual({ status: "released" });
    const stolen = await http.post("/api/v3/editors/host").send({ action: "save", connectionGeneration: OTHER, commandId: "save-4", target: { sourceResourceId: sourceId }, expectedDraftRevision: 1, baseVersionId: saved.body.versionId, data: { scene } });
    expect(stolen.body.error.code).toBe("TARGET_CHANGED");
    const reopened = await http.post("/api/v3/editors/host").send({ action: "open", connectionGeneration: OTHER, target: { sourceResourceId: sourceId } });
    expect(reopened.status).toBe(200);

    const stageTwo = node("stage-2", "开场");
    const secondNode = await http.post("/api/v3/canvas/commands").send({
      commandId: "canvas-stage-2",
      expectedRevision: bound.body.revision,
      command: { type: "canvas.patch", nodes: [{ id: "stage-2", before: null, after: stageTwo }], edges: [] },
    });
    expect(secondNode.status).toBe(200);
    const second = await http.post("/api/v3/editors/host").send({ action: "provision", connectionGeneration: GENERATION, target: { nodeId: "stage-2" } });
    expect(second.status).toBe(200);
    const named = await http.post("/api/project/compositions/get").send({ compositionId: second.body.compositionId });
    expect(named.body.name).toBe("开场_1");

    const upload = await http.post("/api/v3/editors/video").field("request", JSON.stringify({ action: "complete", connectionGeneration: GENERATION, commandId: "video-1", target: { sourceResourceId: sourceId } })).attach("file", Buffer.from("not-video"), { filename: "clip.txt", contentType: "text/plain" });
    expect(upload.status).toBe(409);
    expect(upload.body.error.code).toBe("INVALID_VIDEO_UPLOAD");
    const absent = await http.post("/api/v3/editors/video").field("request", JSON.stringify({ action: "complete", connectionGeneration: GENERATION, commandId: "video-1", target: { sourceResourceId: sourceId }, baseVersionId: versionId })).attach("file", Buffer.from("not-video"), { filename: "clip.mp4", contentType: "video/mp4" });
    expect(absent.body.error.code).toBe("TARGET_CHANGED");
  });
});