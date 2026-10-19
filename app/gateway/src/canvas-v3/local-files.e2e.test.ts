import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const TEXT_ID = "22222222-2222-4222-8222-222222222222";
const IMAGE_ID = "33333333-3333-4333-8333-333333333333";

describe("v3 画布本地文件", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const ws = mkdtempSync(path.join(tmpdir(), "ov-local-"));
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

  it("导入文本和图片，重放同一内容，换内容则冲突", async () => {
    const ws = process.env.WORKSPACE_DIR ?? "";
    const note = path.join(ws, "note.txt");
    writeFileSync(note, "本地原文");
    const imported = await http.post(`/api/v3/canvas/local-files/${TEXT_ID}`).send({ absolutePath: note });
    expect(imported.status).toBe(201);
    expect(imported.body).toMatchObject({ importId: TEXT_ID, mediaKind: "text", name: "note.txt", width: 350, height: 350 });
    const replay = await http.post(`/api/v3/canvas/local-files/${TEXT_ID.toUpperCase()}`).send({ absolutePath: note });
    expect(replay.body).toEqual(imported.body);
    const read = await http.get(`/api/v3/canvas/local-files/${imported.body.resourceId}/${imported.body.versionId}`);
    expect(read.status).toBe(200);
    expect(read.headers["content-type"]).toMatch(/application\/octet-stream/);
    expect(read.headers["content-security-policy"]).toBe("default-src 'none'; sandbox");
    expect(Buffer.from(read.body).toString("utf8")).toBe("本地原文");
    const ranged = await http.get(`/api/v3/canvas/local-files/${imported.body.resourceId}/${imported.body.versionId}`).set("Range", "bytes=0-5").responseType("blob");
    expect(ranged.status).toBe(206);
    expect(Buffer.from(ranged.body).toString("utf8")).toBe("本地");
    const stored = readFileSync(path.join(ws, "store", `${imported.body.versionId}.txt`), "utf8");
    expect(stored).toBe("本地原文");
    const described = await http.post("/api/project/resources/get").send({ selectors: [{ resourceId: imported.body.resourceId, versionId: imported.body.versionId }] });
    expect(described.body[0].detail.metadata.provenance).toEqual({ method: "local_file", originalName: "note.txt" });
    writeFileSync(note, "另一份");
    const changed = await http.post(`/api/v3/canvas/local-files/${TEXT_ID}`).send({ absolutePath: note });
    expect(changed.status).toBe(409);
    expect(changed.body.message).toBe("Image import conflict");
    const dot = path.join(ws, "dot.png");
    writeFileSync(dot, PNG);
    const image = await http.post(`/api/v3/canvas/local-files/${IMAGE_ID}`).send({ absolutePath: dot });
    expect(image.status).toBe(201);
    expect(image.body).toMatchObject({ mediaKind: "image", width: 1, height: 1, name: "dot.png" });
    const pixels = await http.get(`/api/v3/canvas/local-files/${image.body.resourceId}/${image.body.versionId}`);
    expect(pixels.headers["content-type"]).toMatch(/image\/png/);
    expect(Buffer.from(pixels.body).equals(PNG)).toBe(true);
    const relative = await http.post(`/api/v3/canvas/local-files/${TEXT_ID}`).send({ absolutePath: "note.txt" });
    expect(relative.status).toBe(400);
    expect(relative.body.message).toBe("Invalid image request");
    await http.post("/api/project/resources/commands").send({
      commandId: "local-other",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_other", payload: { name: "other.txt", kind: 1 } },
    });
    writeFileSync(path.join(ws, "other.txt"), "other");
    await http.post("/api/project/resources/commands").send({
      commandId: "local-other-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_other",
        payload: { kind: "new_version", versionId: "ver_other", baseVersionId: null, relativePath: "other.txt", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const missing = await http.get("/api/v3/canvas/local-files/res_other/ver_other");
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe("Image unavailable");
  });
});
