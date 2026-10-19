import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const IMPORT_ID = "11111111-1111-4111-8111-111111111111";

describe("v3 画布图片", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const ws = mkdtempSync(path.join(tmpdir(), "ov-image-"));
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

  it("导入图片后按资源版本读回像素，同一导入可以重放", async () => {
    const imported = await http.post(`/api/v3/canvas/images/${IMPORT_ID}`).attach("file", PNG, "dot.png");
    expect(imported.status).toBe(200);
    expect(imported.body).toMatchObject({ importId: IMPORT_ID, mimeType: "image/png", width: 1, height: 1, name: "dot.png" });
    expect(imported.headers["cache-control"]).toBe("no-store");
    const replay = await http.post(`/api/v3/canvas/images/${IMPORT_ID.toUpperCase()}`).attach("file", PNG, "dot.png");
    expect(replay.body).toEqual(imported.body);

    const read = await http.get(`/api/v3/canvas/images/${imported.body.resourceId}/${imported.body.versionId}`);
    expect(read.status).toBe(200);
    expect(read.headers["content-type"]).toMatch(/image\/png/);
    expect(read.headers["x-image-width"]).toBe("1");
    expect(read.headers["x-image-height"]).toBe("1");
    expect(read.headers["x-content-type-options"]).toBe("nosniff");
    expect(Buffer.from(read.body)).toEqual(PNG);
    const download = await http.get(`/api/v3/canvas/images/${imported.body.resourceId}/${imported.body.versionId}`).query({ download: "1" });
    expect(download.headers["content-disposition"]).toContain("attachment;");
    expect(download.headers["content-disposition"]).toContain("filename*=UTF-8''dot.png");

    const missing = await http.get("/api/v3/canvas/images/res_missing/ver_missing");
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ statusCode: 404, message: "Image unavailable" });
    const junk = await http.post("/api/v3/canvas/images/22222222-2222-4222-8222-222222222222").attach("file", Buffer.from("hello"), "note.png");
    expect(junk.status).toBe(400);
    expect(junk.body.message).toBe("Invalid image request");
  });
});
