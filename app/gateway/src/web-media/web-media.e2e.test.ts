import { createServer, type Server } from "node:http";
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { WebMediaService } from "./web-media.service.js";

describe("网页媒体下载", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;
  let bridge: Server;
  let bridgeUrl = "";

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-web-media-"));
    process.env.WORKSPACE_DIR = ws;
    const tool = path.join(ws, "yt-dlp");
    writeFileSync(tool, `#!/bin/sh
for arg in "$@"; do
  if [ "$arg" = "--dump-single-json" ]; then
    printf '%s\\n' '{"id":"clip-1","title":"灯","webpage_url":"https://videos.example/watch","duration":3}'
    exit 0
  fi
done
prev=""
dir=""
for arg in "$@"; do
  if [ "$prev" = "--paths" ]; then dir="$arg"; fi
  prev="$arg"
done
printf 'mp4' > "$dir/灯 [clip].mp4"
`);
    chmodSync(tool, 0o755);
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

  it("把视频下载进工作区，聊天用的是相对路径", async () => {
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
