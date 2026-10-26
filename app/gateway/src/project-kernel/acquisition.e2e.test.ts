import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { writeFakeTool } from "../common/__fixtures__/fake-tool.js";
import { ProjectAcquisitionService } from "./acquisition.js";

// 假 yt-dlp 是跨平台的（node 脚本 + Windows 上的 .cmd 包装，见 fake-tool.ts）。
// 完整链路只在 POSIX 跑：产品现在**拒绝** Windows 上的批处理包装（spawn-tool.ts），
// Windows 走下面独立的"拒绝"用例。
describe("v3 搜图", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
  });

  it.skipIf(process.platform === "win32")("校验查询和组合名，搜不到图时回空结果", async () => {
    app = await createApp();
    await app.init();
    const denied = await request(app.getHttpServer()).post("/api/v3/search/images").send({ queries: [{ query: "灯" }], composition: { name: "参考" } });
    expect(denied.status).toBe(403);
    await app.close();

    process.env.WORKSPACE_DIR = mkdtempSync(path.join(tmpdir(), "ov-search-"));
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    app = await createApp();
    await app.init();
    const http = request(app.getHttpServer());
    const missing = await http.post("/api/v3/search/images").send({ queries: [{ query: "灯" }] });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("INVALID_ARGUMENT");
    const found = await http.post("/api/v3/search/images").send({ queries: [{ query: "  红色台灯  ", num: 2 }], composition: { name: "参考" }, max_total_images: 4 });
    expect(found.status).toBe(200);
    expect(found.body).toEqual({ queries: [{ query: "红色台灯", images: [], error: "no images found" }] });

    const blocked = await http.post("/api/v3/web-media").send({ type: "download_thumbnail", url: "http://127.0.0.1/a.png", composition: { name: "网页" } });
    expect(blocked.status).toBe(422);
    expect(blocked.body.error.message).toContain("private-address");

    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    const acquisition = app.get(ProjectAcquisitionService);
    acquisition.lookup = async () => ({ address: "1.1.1.1" });
    acquisition.fetcher = async () => new Response(png, { status: 200, headers: { "content-type": "image/png", "content-length": String(png.length) } });
    const saved = await http.post("/api/v3/web-media").send({ type: "download_thumbnail", url: "https://images.example/a.png", composition: { name: "网页" } });
    expect(saved.status).toBe(200);
    expect(saved.body.members[0].role).toBe("image");
    expect(saved.body.members[0].resource.name).toBe("a.png");
    const composition = await http.post("/api/project/compositions/get").send({ compositionId: saved.body.compositionId });
    expect(composition.body.members.map((member: { resource: string }) => member.resource)).toContain(saved.body.members[0].resource.resourceId);

    // 跨平台的假 yt-dlp（node 脚本 + Windows 的 .cmd 包装），见 fake-tool.ts 的注释。
    const tool = writeFakeTool(process.env.WORKSPACE_DIR ?? "", "yt-dlp", `
import { writeFileSync } from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
if (args.includes("--dump-single-json")) {
  process.stdout.write(JSON.stringify({ id: "clip-1", title: "灯", webpage_url: "https://images.example/watch", duration: 3, formats: [{ format_id: "18", ext: "mp4", height: 360 }] }) + "\\n");
  process.exit(0);
}
const index = args.indexOf("--paths");
const dir = index >= 0 ? args[index + 1] : ".";
writeFileSync(path.join(dir, "灯 [clip].srt"), "1\\n00:00:00,000 --> 00:00:01,000\\n灯\\n");
`);
    process.env.YTDLP_PATH = tool;
    const inspected = await http.post("/api/v3/web-media").send({ type: "inspect", url: "https://images.example/watch" });
    expect(inspected.status).toBe(200);
    expect(inspected.body.metadata).toMatchObject({ id: "clip-1", title: "灯", duration: 3, formats: [{ id: "18", extension: "mp4", height: 360 }] });
    const subtitles = await http.post("/api/v3/web-media").send({ type: "download_subtitles", url: "https://images.example/watch", composition: { name: "字幕" }, subtitle_languages: ["zh"] });
    expect(subtitles.status).toBe(200);
    expect(subtitles.body.members[0]).toMatchObject({ role: "subtitle", resource: { kind: "subtitle", name: "灯 [clip]" } });
    const text = readFileSync(path.join(process.env.WORKSPACE_DIR ?? "", "store", `${subtitles.body.members[0].resource.versionId}.srt`), "utf8");
    expect(text).toContain("灯");
    delete process.env.YTDLP_PATH;
  });

  it.runIf(process.platform === "win32")("Windows：YTDLP_PATH 指向 .cmd 时 422 清楚报错且不执行", async () => {
    process.env.WORKSPACE_DIR = mkdtempSync(path.join(tmpdir(), "ov-acq-batch-"));
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    const dir = process.env.WORKSPACE_DIR;
    const marker = path.join(dir, "ran.txt");
    writeFileSync(path.join(dir, "yt-dlp.cmd"), `@echo off\r\necho ran> "${marker}"\r\n`);
    process.env.YTDLP_PATH = path.join(dir, "yt-dlp.cmd");
    app = await createApp();
    await app.init();
    app.get(ProjectAcquisitionService).lookup = async () => ({ address: "1.1.1.1" });
    try {
      const res = await request(app.getHttpServer()).post("/api/v3/web-media").send({ type: "inspect", url: "https://images.example/watch" });
      expect(res.status).toBe(422);
      expect(res.body.error.message).toContain("批处理");
      expect(existsSync(marker)).toBe(false);
    } finally {
      delete process.env.YTDLP_PATH;
    }
  });
});