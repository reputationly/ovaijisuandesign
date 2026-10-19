import { spawnSync } from "node:child_process";
import { mkdtempSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const ffmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
const ffprobe = spawnSync("ffprobe", ["-version"], { stdio: "ignore" });
const canProbe = ffmpeg.status === 0 && ffprobe.status === 0;

describe("v3 画布音频", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-audio-"));
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

  it("按版本读取音频，视频和符号链接都不当成音频", async () => {
    writeFileSync(path.join(ws, "note.txt"), "not audio");
    await http.post("/api/project/resources/commands").send({
      commandId: "aud-bad-create",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_note", payload: { name: "note.txt", kind: 4 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "aud-bad-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_note",
        payload: { kind: "new_version", versionId: "ver_note", baseVersionId: null, relativePath: "note.txt", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const rejected = await http.get("/api/v3/canvas/audios/res_note/ver_note");
    expect(rejected.status).toBe(404);
    expect(rejected.body).toEqual({ message: "Audio unavailable" });

    if (!canProbe) return;

    const wav = path.join(ws, "tone.wav");
    const generated = spawnSync("ffmpeg", ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", "0.2", "-y", wav], { stdio: "ignore" });
    expect(generated.status).toBe(0);
    await http.post("/api/project/resources/commands").send({
      commandId: "aud-create",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_tone", payload: { name: "tone.wav", kind: 4 } },
    });
    const version = await http.post("/api/project/resources/commands").send({
      commandId: "aud-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_tone",
        payload: { kind: "new_version", versionId: "ver_tone", baseVersionId: null, relativePath: "tone.wav", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    expect(version.status).toBe(200);
    const full = await http.get("/api/v3/canvas/audios/res_tone/ver_tone");
    expect(full.status).toBe(200);
    expect(full.headers["content-type"]).toBe("audio/wav");
    expect(full.headers["accept-ranges"]).toBe("bytes");
    expect(Number(full.headers["content-length"])).toBeGreaterThan(12);
    const partial = await http.get("/api/v3/canvas/audios/res_tone/ver_tone").set("Range", "bytes=0-3");
    expect(partial.status).toBe(206);
    expect(Buffer.from(partial.body).toString("ascii")).toBe("RIFF");

    renameSync(wav, path.join(ws, "tone-real.wav"));
    symlinkSync(path.join(ws, "tone-real.wav"), wav);
    const linked = await http.get("/api/v3/canvas/audios/res_tone/ver_tone");
    expect(linked.status).toBe(404);
    expect(linked.body).toEqual({ message: "Audio unavailable" });
  });
});
