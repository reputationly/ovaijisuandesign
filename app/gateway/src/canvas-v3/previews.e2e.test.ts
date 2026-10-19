import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const MP4 = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x31]);

describe("v3 画布预览", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-preview-"));
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

  it("图片和视频走各自的预览，普通文件不在这里打开", async () => {
    writeFileSync(path.join(ws, "dot.png"), PNG);
    writeFileSync(path.join(ws, "clip.mp4"), MP4);
    writeFileSync(path.join(ws, "note.txt"), "hello");
    for (const [commandId, resourceId, name, kind, versionId, relativePath] of [
      ["pv-img", "res_img", "dot.png", 2, "ver_img", "dot.png"],
      ["pv-vid", "res_vid", "clip.mp4", 3, "ver_vid", "clip.mp4"],
      ["pv-txt", "res_txt", "note.txt", 1, "ver_txt", "note.txt"],
    ] as const) {
      await http.post("/api/project/resources/commands").send({
        commandId: `${commandId}-c`,
        actor: "human",
        command: { type: "resource.create", resourceId, payload: { name, kind } },
      });
      const version = await http.post("/api/project/resources/commands").send({
        commandId: `${commandId}-v`,
        actor: "human",
        command: {
          type: "resource.update",
          resourceId,
          payload: { kind: "new_version", versionId, baseVersionId: null, relativePath, source: "import", disposition: "adopted", dependencies: [] },
        },
      });
      expect(version.status).toBe(200);
    }

    const image = await http.get("/api/v3/canvas/previews/res_img/ver_img");
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toMatch(/image\/png/);
    expect(image.headers["x-image-width"]).toBe("1");
    expect(Buffer.from(image.body)).toEqual(PNG);

    const video = await http.get("/api/v3/canvas/previews/res_vid/ver_vid");
    expect(video.status).toBe(200);
    expect(video.headers["content-type"]).toBe("video/mp4");
    expect(video.headers["accept-ranges"]).toBe("bytes");

    const text = await http.get("/api/v3/canvas/previews/res_txt/ver_txt");
    expect(text.status).toBe(404);
    expect(text.body.message).toBe("Image unavailable");
  });
});
