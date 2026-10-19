import { mkdtempSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const MP4 = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x31]);
const ffmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
const canEncode = ffmpeg.status === 0;

describe("v3 画布视频缩略图", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-thumb-"));
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

  it("按版本回 JPEG 和时长，不是视频的资源不给图", async () => {
    writeFileSync(path.join(ws, "clip.mp4"), MP4);
    await http.post("/api/project/resources/commands").send({
      commandId: "thumb-create",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_thumb", payload: { name: "clip.mp4", kind: 3 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "thumb-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_thumb",
        payload: { kind: "new_version", versionId: "ver_thumb", baseVersionId: null, relativePath: "clip.mp4", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const thumb = await http.get("/api/v3/canvas/videos/res_thumb/ver_thumb/thumbnail").buffer(true);
    expect(thumb.status).toBe(200);
    expect(thumb.headers["content-type"]).toMatch(/image\/jpeg/);
    expect(thumb.headers["x-video-duration"]).toBe("0");
    expect(thumb.headers["cache-control"]).toBe("no-store");
    expect(Buffer.from(thumb.body).subarray(0, 2).toString("hex")).toBe("ffd8");

    writeFileSync(path.join(ws, "note.txt"), "not a video");
    await http.post("/api/project/resources/commands").send({
      commandId: "thumb-text",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_thumb_text", payload: { name: "note.txt", kind: 1 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "thumb-text-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_thumb_text",
        payload: { kind: "new_version", versionId: "ver_thumb_text", baseVersionId: null, relativePath: "note.txt", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const text = await http.get("/api/v3/canvas/videos/res_thumb_text/ver_thumb_text/thumbnail");
    expect(text.status).toBe(404);
    expect(text.body.message).toBe("Image unavailable");
    const namedWrong = await http.get("/api/v3/canvas/videos/res_thumb/missing/thumbnail");
    expect(namedWrong.status).toBe(404);
    const huge = await http.get(`/api/v3/canvas/videos/${"a".repeat(257)}/ver_thumb/thumbnail`);
    expect(huge.status).toBe(400);
    expect(huge.body.message).toBe("Invalid image request");

    renameSync(path.join(ws, "clip.mp4"), path.join(ws, "clip-real.mp4"));
    symlinkSync(path.join(ws, "clip-real.mp4"), path.join(ws, "clip.mp4"));
    const linked = await http.get("/api/v3/canvas/videos/res_thumb/ver_thumb/thumbnail");
    expect(linked.status).toBe(404);

    if (!canEncode) return;
    const real = path.join(ws, "color.mp4");
    const generated = spawnSync("ffmpeg", ["-f", "lavfi", "-i", "color=c=red:s=64x64:d=0.3", "-t", "0.3", "-y", real], { stdio: "ignore" });
    if (generated.status !== 0) return;
    await http.post("/api/project/resources/commands").send({
      commandId: "thumb-real",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_thumb_real", payload: { name: "color.mp4", kind: 3 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "thumb-real-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_thumb_real",
        payload: { kind: "new_version", versionId: "ver_thumb_real", baseVersionId: null, relativePath: "color.mp4", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const frame = await http.get("/api/v3/canvas/videos/res_thumb_real/ver_thumb_real/thumbnail?w=64").buffer(true);
    expect(frame.status).toBe(200);
    expect(Number(frame.headers["x-video-duration"])).toBeGreaterThan(0);
    expect(Buffer.from(frame.body).subarray(0, 2).toString("hex")).toBe("ffd8");
  });
});
