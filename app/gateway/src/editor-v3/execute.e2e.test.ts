import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const CALLER_KEY = "caller-secret";
const GENERATION = "11111111-1111-4111-8111-111111111111";

function agent(call: request.Test): request.Test {
  return call.set("x-hilo-agent-caller", CALLER_KEY).set("x-session-id", "sess-1").set("x-tool-use-id", "tool-1");
}

describe("v3 编辑命令", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
    delete process.env.HILO_AGENT_CALLER_KEY;
  });

  it("代理创建导演台，宿主领走修改并交回同一条命令", async () => {
    process.env.HILO_AGENT_CALLER_KEY = CALLER_KEY;
    process.env.WORKSPACE_DIR = mkdtempSync(path.join(tmpdir(), "ov-exec-"));
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    app = await createApp();
    await app.init();
    const http = request(app.getHttpServer());

    const denied = await http.post("/api/v3/execute").send({ capabilityId: "plugin:director-stage", plugin: { method: "document.create", contractVersion: "3", target: { canvasId: "workspace" }, args: { name: "开场" } } });
    expect(denied.status).toBe(409);
    expect(denied.body.error.code).toBe("TRUSTED_TOOL_ID_REQUIRED");

    const other = await agent(http.post("/api/v3/execute")).send({ capabilityId: "generate_image:qwen-image", prompt: "一盏灯" });
    expect(other.status).toBe(422);
    expect(other.body.error.code).toBe("UNSUPPORTED_OPERATION");
    expect(other.body.error.message).toContain("not offered");

    const created = await agent(http.post("/api/v3/execute")).send({
      capabilityId: "plugin:director-stage",
      plugin: { method: "document.create", contractVersion: "3", target: { canvasId: "workspace" }, args: { name: "开场" } },
    });
    expect(created.status).toBe(200);
    expect(created.body.command.status).toBe("committed");
    expect(created.body.command.placement).toBe("placed");
    const sourceId = created.body.command.sourceResourceId as string;
    const versionId = created.body.command.versionId as string;
    const nodeId = created.body.command.nodeId as string;

    const replay = await agent(http.post("/api/v3/execute")).send({
      capabilityId: "plugin:director-stage",
      plugin: { method: "document.create", contractVersion: "3", target: { canvasId: "workspace" }, args: { name: "开场" } },
    });
    expect(replay.body.command).toEqual(created.body.command);

    const canvas = await http.get("/api/v3/canvas");
    expect(canvas.body.nodes[nodeId].sourceResourceId).toBe(sourceId);

    const looked = await agent(http.post("/api/v3/execute")).set("x-tool-use-id", "tool-get").send({
      capabilityId: "plugin:director-stage",
      plugin: { method: "scene.get", contractVersion: "3", target: { sourceResourceId: sourceId }, args: { kind: "camera" } },
    });
    expect(looked.body.result.objects.map((item: { id: string }) => item.id)).toEqual(["camera_1"]);

    const opened = await http.post("/api/v3/editors/host").send({ action: "open", connectionGeneration: GENERATION, target: { sourceResourceId: sourceId, nodeId } });
    expect(opened.status).toBe(200);
    const scene = structuredClone(opened.body.scene);
    scene.cameras[0].label = "主机位";

    let editResult: request.Response | undefined;
    const editDone = new Promise<void>((resolve) => {
      agent(http.post("/api/v3/execute")).set("x-tool-use-id", "tool-edit").send({
        capabilityId: "plugin:director-stage",
        plugin: {
          method: "scene.edit",
          contractVersion: "3",
          target: { sourceResourceId: sourceId },
          baseVersionId: versionId,
          expectedDraftRevision: 0,
          args: { changes: [{ kind: "camera", id: "camera_1", label: "主机位" }] },
        },
      }).end((_error, response) => {
        editResult = response;
        resolve();
      });
    });
    let pending: { commandId: string } | null = null;
    for (let attempt = 0; attempt < 20 && !pending; attempt += 1) {
      const claimed = await http.post("/api/v3/editors/host").send({ action: "poll", connectionGeneration: GENERATION, capabilityIds: ["plugin:director-stage"] });
      pending = claimed.body.pending;
      if (!pending) await new Promise((resolve) => setTimeout(resolve, 15));
    }
    expect(pending?.commandId).toEqual(expect.any(String));
    const saved = await http.post("/api/v3/editors/host").send({
      action: "save",
      connectionGeneration: GENERATION,
      commandId: pending?.commandId,
      target: { sourceResourceId: sourceId },
      expectedDraftRevision: 0,
      baseVersionId: versionId,
      data: { scene },
    });
    expect(saved.status).toBe(200);
    expect(saved.body.scene.cameras[0].label).toBe("主机位");
    const finished = await http.post("/api/v3/editors/host").send({
      action: "complete",
      connectionGeneration: GENERATION,
      commandId: pending?.commandId,
      target: { sourceResourceId: sourceId },
    });
    expect(finished.status).toBe(200);
    await editDone;
    expect(editResult?.body.command.status).toBe("committed");
    expect(editResult?.body.command.draftRevision).toBe(1);

    const empty = await agent(http.post("/api/v3/execute")).set("x-tool-use-id", "tool-anim").send({
      capabilityId: "plugin:director-stage",
      plugin: { method: "scene.animate", contractVersion: "3", target: { sourceResourceId: sourceId }, baseVersionId: saved.body.versionId, expectedDraftRevision: 1, args: { paths: [] } },
    });
    expect(empty.status).toBe(409);
    expect(empty.body.error.code).toBe("EMPTY_ANIMATION");
  });
});