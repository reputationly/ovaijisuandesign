import { mkdtempSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const MP4 = Buffer.from([
  0x00, 0x00, 0x00, 0x18,
  0x66, 0x74, 0x79, 0x70,
  0x69, 0x73, 0x6f, 0x6d,
  0x00, 0x00, 0x00, 0x00,
  0x69, 0x73, 0x6f, 0x6d,
  0x6d, 0x70, 0x34, 0x31,
]);

describe("v3 画布视频", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-video-"));
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

  it("按版本流式读取视频，并支持单段 Range", async () => {
    writeFileSync(path.join(ws, "clip.mp4"), MP4);
    await http.post("/api/project/resources/commands").send({
      commandId: "vid-create",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_clip", payload: { name: "clip.mp4", kind: 3 } },
    });
    const version = await http.post("/api/project/resources/commands").send({
      commandId: "vid-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_clip",
        payload: { kind: "new_version", versionId: "ver_clip", baseVersionId: null, relativePath: "clip.mp4", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    expect(version.status).toBe(200);

    const full = await http.get("/api/v3/canvas/videos/res_clip/ver_clip");
    expect(full.status).toBe(200);
    expect(full.headers["content-type"]).toBe("video/mp4");
    expect(full.headers["accept-ranges"]).toBe("bytes");
    expect(full.headers["cache-control"]).toBe("no-store");
    expect(Buffer.from(full.body)).toEqual(MP4);

    const partial = await http.get("/api/v3/canvas/videos/res_clip/ver_clip").set("Range", "bytes=4-7");
    expect(partial.status).toBe(206);
    expect(partial.headers["content-range"]).toBe(`bytes 4-7/${MP4.length}`);
    expect(Buffer.from(partial.body).toString("ascii")).toBe("ftyp");

    const beyond = await http.get("/api/v3/canvas/videos/res_clip/ver_clip").set("Range", "bytes=100-120");
    expect(beyond.status).toBe(416);
    expect(beyond.headers["content-range"]).toBe(`bytes */${MP4.length}`);

    writeFileSync(path.join(ws, "note.txt"), "not a video");
    await http.post("/api/project/resources/commands").send({
      commandId: "vid-bad-create",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_bad", payload: { name: "note.txt", kind: 3 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "vid-bad-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_bad",
        payload: { kind: "new_version", versionId: "ver_bad", baseVersionId: null, relativePath: "note.txt", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const rejected = await http.get("/api/v3/canvas/videos/res_bad/ver_bad");
    expect(rejected.status).toBe(404);
    expect(rejected.body).toEqual({ message: "Video unavailable" });

    renameSync(path.join(ws, "clip.mp4"), path.join(ws, "clip-real.mp4"));
    symlinkSync(path.join(ws, "clip-real.mp4"), path.join(ws, "clip.mp4"));
    const linked = await http.get("/api/v3/canvas/videos/res_clip/ver_clip");
    expect(linked.status).toBe(404);
    expect(linked.body).toEqual({ message: "Video unavailable" });
  });
});
