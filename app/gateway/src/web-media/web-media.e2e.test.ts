import { createServer, type Server } from "node:http";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { writeFakeTool } from "../common/__fixtures__/fake-tool.js";
import { WebMediaService } from "./web-media.service.js";

// 假 yt-dlp 是跨平台的（node 脚本 + Windows 上的 .cmd 包装，见 fake-tool.ts）。
// 完整下载链只在 POSIX 跑：产品现在**拒绝** Windows 上的批处理包装（spawn-tool.ts），
// Windows 走下面独立的"拒绝"用例。
describe("网页媒体下载", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;
  let bridge: Server;
  let bridgeUrl = "";

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-web-media-"));
    process.env.WORKSPACE_DIR = ws;
    // 跨平台的假 yt-dlp：node 脚本 +（Windows 上）.cmd 包装。下面这组用例在 Windows
    // 上也真的执行 —— "Windows 上怎么找 yt-dlp、参数怎么传"正是最容易坏的地方。
    const tool = writeFakeTool(ws, "yt-dlp", `
import { writeFileSync } from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
if (args.includes("--dump-single-json")) {
  process.stdout.write(JSON.stringify({ id: "clip-1", title: "灯", webpage_url: "https://videos.example/watch", duration: 3 }) + "\\n");
  process.exit(0);
}
const index = args.indexOf("--paths");
const dir = index >= 0 ? args[index + 1] : ".";
writeFileSync(path.join(dir, "灯 [clip].mp4"), "mp4");
`);
    process.env.YTDLP_PATH = tool;
    bridge = createServer((req, res) => {
      if (req.url !== "/__main/browser/media") {
        res.statusCode = 404;
        res.end();
        return;
      }
      const bytes = Buffer.from("not-a-video");
      res.setHeader("content-type", "video/mp4");
      res.setHeader("content-length", String(bytes.length));
      res.end(bytes);
    });
    await new Promise<void>((resolve) => bridge.listen(0, "127.0.0.1", resolve));
    bridgeUrl = `http://127.0.0.1:${(bridge.address() as AddressInfo).port}/`;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    app.get(WebMediaService).lookup = async () => ({ address: "1.1.1.1" });
  });

  afterAll(async () => {
    await app.close();
    await new Promise<void>((resolve) => bridge.close(() => resolve()));
    rmSync(ws, { recursive: true, force: true });
    delete process.env.WORKSPACE_DIR;
    delete process.env.YTDLP_PATH;
    delete process.env.HILO_MAIN_BRIDGE_URL;
    delete process.env.HILO_MAIN_BRIDGE_TOKEN;
  });

  it.skipIf(process.platform === "win32")("把视频下载进工作区，聊天用的是相对路径", async () => {
    const saved = await http.post("/api/web-media/yt-dlp").send({ type: "download_video", url: "https://videos.example/watch", playlist_mode: "single", container: "mp4", add_to_canvas: true });
    expect(saved.body.ok).toBe(true);
    expect(saved.body.assets).toEqual([expect.objectContaining({ kind: "video" })]);
    expect(saved.body.assets[0].path.endsWith(".mp4")).toBe(true);
    expect(saved.body.assets[0].path.includes("..")).toBe(false);
    expect(existsSync(path.join(ws, saved.body.assets[0].path))).toBe(true);
    const canvas = await http.get("/api/canvas");
    expect(canvas.body.nodes.some((node: { data?: { path?: string } }) => node.data?.path === saved.body.assets[0].path)).toBe(true);

    const hidden = await http.post("/api/web-media/yt-dlp").send({ type: "download_video", url: "https://videos.example/watch", container: "mp4", add_to_canvas: false, filename: "only-chat" });
    expect(hidden.body.assets[0].path).toBe("only-chat.mp4");
    const after = await http.get("/api/canvas");
    expect(after.body.nodes.filter((node: { data?: { path?: string } }) => node.data?.path === "only-chat.mp4")).toHaveLength(0);

    const inspected = await http.post("/api/web-media/yt-dlp").send({ type: "inspect", url: "https://videos.example/watch" });
    expect(inspected.body.metadata).toMatchObject({ id: "clip-1", title: "灯", duration: 3 });
    const blocked = await http.post("/api/web-media/yt-dlp").send({ type: "download_video", url: "http://127.0.0.1/secret.mp4" });
    expect(blocked.body.ok).toBe(false);
    expect(blocked.body.error).toContain("private-address");
  });

  it.runIf(process.platform === "win32")("Windows：YTDLP_PATH 指向 .cmd 时清楚报错且不执行", async () => {
    // 自己造一个"一运行就留痕"的批处理，直接指向它——不借 fake-tool 的 .mjs。
    const dir = mkdtempSync(path.join(tmpdir(), "ov-wm-batch-"));
    const marker = path.join(dir, "ran.txt");
    writeFileSync(path.join(dir, "yt-dlp.cmd"), `@echo off\r\necho ran> "${marker}"\r\n`);
    process.env.YTDLP_PATH = path.join(dir, "yt-dlp.cmd");
    try {
      const res = await http.post("/api/web-media/yt-dlp").send({ type: "inspect", url: "https://videos.example/watch" });
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain("批处理");
      expect(existsSync(marker)).toBe(false);
    } finally {
      delete process.env.YTDLP_PATH;
    }
  });

  it("浏览器下载没有本机桥接时直接失败，桥接返回的内容必须是可播放视频", async () => {
    delete process.env.HILO_MAIN_BRIDGE_URL;
    delete process.env.HILO_MAIN_BRIDGE_TOKEN;
    const missing = await http.post("/api/web-media/browser").send({ request_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", source_url: "https://www.douyin.com/video/1234567890123", add_to_canvas: false });
    expect(missing.body).toMatchObject({ ok: false, error: "Desktop browser media bridge is unavailable" });
    const invalid = await http.post("/api/web-media/browser").send({ request_id: "nope", source_url: "https://example.com/a", add_to_canvas: true });
    expect(invalid.body.error).toBe("Invalid browser media download request");

    process.env.HILO_MAIN_BRIDGE_URL = bridgeUrl;
    process.env.HILO_MAIN_BRIDGE_TOKEN = "bridge-token";
    const unplayable = await http.post("/api/web-media/browser").send({ request_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", source_url: "https://www.douyin.com/video/1234567890123", add_to_canvas: false });
    expect(unplayable.body.ok).toBe(false);
    expect(unplayable.body.error).toBe("Browser download does not contain a playable video");
  });
});
