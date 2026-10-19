import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const REQUEST_ID = "44444444-4444-4444-8444-444444444444";
const ffmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
const canEncode = ffmpeg.status === 0;

describe("v3 画布音视频分离", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-split-"));
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

  it("抽出音轨并记下无声版本，同一请求重放，源变了则冲突", async () => {
    const invalid = await http.post(`/api/v3/canvas/video-audio-splits/${REQUEST_ID}`).send({ resourceId: "res_split" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.message).toBe("Invalid image request");
    const missing = await http.post(`/api/v3/canvas/video-audio-splits/${REQUEST_ID}`).send({ resourceId: "res_missing", versionId: "ver_missing" });
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe("Image unavailable");
    if (!canEncode) return;

    const clip = path.join(ws, "clip.mp4");
    const generated = spawnSync("ffmpeg", ["-f", "lavfi", "-i", "color=c=red:s=64x64:d=0.4", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100:duration=0.4", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-y", clip], { stdio: "ignore" });
    if (generated.status !== 0) return;
    await http.post("/api/project/resources/commands").send({
      commandId: "split-create",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_split", payload: { name: "clip.mp4", kind: 3 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "split-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_split",
        payload: { kind: "new_version", versionId: "ver_split", baseVersionId: null, relativePath: "clip.mp4", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const split = await http.post(`/api/v3/canvas/video-audio-splits/${REQUEST_ID}`).send({ resourceId: "res_split", versionId: "ver_split" });
    expect(split.status).toBe(200);
    expect(split.body.warnings).toEqual([]);
    expect(split.body.audio).toMatchObject({ importId: REQUEST_ID, name: "clip-audio.mp3", mediaKind: "audio", mimeType: "audio/mpeg" });
    expect(split.body.audio.resourceId).not.toBe("res_split");
    expect(split.body.silentVideo).toMatchObject({ importId: REQUEST_ID, resourceId: "res_split", name: "clip-muted.mp4", mediaKind: "video", mimeType: "video/mp4", width: 64, height: 64 });
    expect(split.body.audio.duration).toBeGreaterThan(0);
    expect(readFileSync(path.join(ws, "store", `${split.body.audio.versionId}.mp3`)).subarray(0, 3).toString()).toMatch(/ID3|\xff/);
    const current = await http.post("/api/project/resources/get").send({ selectors: [{ resourceId: "res_split" }] });
    expect(current.body[0].detail.resource.currentVersionId).toBe("ver_split");
    const muted = await http.post("/api/project/resources/get").send({ selectors: [{ resourceId: "res_split", versionId: split.body.silentVideo.versionId }] });
    expect(muted.body[0].detail.version).toMatchObject({ source: "generate", status: "ready", parentVersionId: "ver_split" });
    expect(muted.body[0].detail.dependencies).toEqual([{ resourceId: "res_split", versionId: "ver_split", role: "source", inputIndex: 0 }]);
    const replay = await http.post(`/api/v3/canvas/video-audio-splits/${REQUEST_ID.toUpperCase()}`).send({ resourceId: "res_split", versionId: "ver_split" });
    expect(replay.body).toEqual(split.body);
    writeFileSync(path.join(ws, "clip-b.mp4"), readFileSync(clip));
    await http.post("/api/project/resources/commands").send({
      commandId: "split-version-b",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_split",
        payload: { kind: "new_version", versionId: "ver_split_b", baseVersionId: "ver_split", relativePath: "clip-b.mp4", source: "import", disposition: "candidate", dependencies: [] },
      },
    });
    const other = await http.post(`/api/v3/canvas/video-audio-splits/${REQUEST_ID}`).send({ resourceId: "res_split", versionId: "ver_split_b" });
    expect(other.status).toBe(409);
    expect(other.body.message).toBe("Image import conflict");
  });
});
