import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const IMPORT_ID = "55555555-5555-4555-8555-555555555555";
const ffmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
const canEncode = ffmpeg.status === 0;

function wav(file: string, seconds: string): boolean {
  return spawnSync("ffmpeg", ["-f", "lavfi", "-i", `sine=frequency=440:sample_rate=44100:duration=${seconds}`, "-y", file], { stdio: "ignore" }).status === 0;
}

describe("v3 画布媒体导入", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-media-"));
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

  it("导入音频后按导入号读回，换内容则冲突", async () => {
    const missing = await http.get(`/api/v3/canvas/media/${IMPORT_ID}`);
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe("Media operation unavailable");
    writeFileSync(path.join(ws, "note.txt"), "hello");
    const text = await http.post(`/api/v3/canvas/media/${IMPORT_ID}`).attach("file", path.join(ws, "note.txt"));
    expect(text.status).toBe(415);
    expect(text.body.message).toBe("Unsupported media codec or container");
    if (!canEncode) return;
    const clip = path.join(ws, "tone.wav");
    const other = path.join(ws, "tone-b.wav");
    if (!wav(clip, "0.3") || !wav(other, "0.6")) return;
    const imported = await http.post(`/api/v3/canvas/media/${IMPORT_ID}`).attach("file", clip);
    expect(imported.status).toBe(200);
    expect(imported.body).toMatchObject({ importId: IMPORT_ID, name: "tone.wav", mediaKind: "audio", mimeType: "audio/wav" });
    expect(imported.body.duration).toBeGreaterThan(0);
    expect(imported.headers["cache-control"]).toBe("no-store");
    const read = await http.get(`/api/v3/canvas/media/${IMPORT_ID.toUpperCase()}`);
    expect(read.status).toBe(200);
    expect(read.body).toMatchObject({ resourceId: imported.body.resourceId, versionId: imported.body.versionId, mediaKind: "audio", mimeType: "audio/wav" });
    expect(read.body.sizeBytes).toBeGreaterThan(0);
    const replay = await http.post(`/api/v3/canvas/media/${IMPORT_ID}`).attach("file", clip);
    expect(replay.body).toEqual(imported.body);
    const changed = await http.post(`/api/v3/canvas/media/${IMPORT_ID}`).attach("file", other);
    expect(changed.status).toBe(409);
    expect(changed.body.message).toBe("Media operation unavailable");
  });
});
