import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import type { FfmpegService } from "../edit/ffmpeg.service.js";
import { downloadMediaToDir } from "../generate/media-download.js";
import { withStagedWatermark } from "../generate/staged-watermark.js";
import { WatermarkService } from "./watermark.service.js";

describe("生成水印", () => {
  const previous = process.env.HILO_WATERMARK_LOGO_PATH;
  let dir = "";
  let logo = "";
  let app: INestApplication | undefined;

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "ov-watermark-"));
    logo = path.join(dir, "logo.png");
    await sharp({ create: { width: 40, height: 16, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toFile(logo);
    process.env.HILO_WATERMARK_LOGO_PATH = logo;
    process.env.WORKSPACE_DIR = dir;
    process.env.HILO_DATA_DIR = dir;
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (previous === undefined) delete process.env.HILO_WATERMARK_LOGO_PATH;
    else process.env.HILO_WATERMARK_LOGO_PATH = previous;
    await rm(dir, { recursive: true, force: true });
  });

  it("开关关闭时不改文件，打开后在落盘前叠到右下角", async () => {
    const service = new WatermarkService({
      overlayWatermark: () => Promise.reject(new Error("png 应走 sharp")),
      appendAudioMarker: () => Promise.reject(new Error("unused")),
    } as unknown as FfmpegService);
    const plain = path.join(dir, "plain.png");
    await sharp({ create: { width: 200, height: 120, channels: 3, background: { r: 0, g: 0, b: 255 } } }).png().toFile(plain);
    const before = await readFile(plain);
    service.setEnabled(false);
    await service.applyStaged(plain, "image");
    expect(await readFile(plain)).toEqual(before);
    service.setEnabled(true);
    const saved = await withStagedWatermark((staged) => service.applyStaged(staged, "image"), () => downloadMediaToDir(pngDataUri(before), dir, "marked"));
    expect(await readFile(saved)).not.toEqual(before);
  });

  it("配置接口记住开关", async () => {
    const http = request(app!.getHttpServer());
    expect((await http.post("/api/watermark/config").send({ enabled: false })).body).toEqual({ ok: true, enabled: false });
    expect(app!.get(WatermarkService).isEnabled()).toBe(false);
    expect((await http.post("/api/watermark/config").send({})).body.enabled).toBe(true);
  });
});

function pngDataUri(bytes: Buffer): string {
  return `data:image/png;base64,${bytes.toString("base64")}`;
}
