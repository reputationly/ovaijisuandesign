import { createWriteStream } from "node:fs";
import { link, mkdir, readdir, rm } from "node:fs/promises";
import { lookup as dnsLookup } from "node:dns/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { Body, Controller, Inject, Injectable, Logger, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { AssetsService } from "../common/assets.service.js";
import { spawnTool } from "../common/spawn-tool.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { CanvasService } from "../canvas/canvas.service.js";
import { FfmpegService } from "../edit/ffmpeg.service.js";
import { sanitizeFilename } from "../generate/media-download.js";
import { mapMetadata, vetUrl } from "../project-kernel/acquisition.js";

const OPERATIONS = ["inspect", "download_video", "download_audio", "download_subtitles", "download_thumbnail"];
const VIDEO_CONTAINERS = new Set(["mp4", "mkv", "webm"]);
const AUDIO_CONTAINERS = new Set(["mp3", "m4a", "wav"]);
const BROWSER_MAX_BYTES = 2 * 1024 ** 3;
const BRIDGE_ROUTE = "/__main/browser/media";

type WebRequest = {
  type: string;
  url: string;
  quality?: string;
  format_id?: string;
  container?: string;
  subtitle_languages?: string[];
  subtitle_format?: string;
  include_auto_subtitles?: boolean;
  playlist_mode?: string;
  max_items?: number;
  filename?: string;
  add_to_canvas?: boolean;
  source_node_id?: string;
};

@Injectable()
export class WebMediaService {
  private readonly log = new Logger("WebMedia");
  lookup: (hostname: string) => Promise<{ address: string }> = (hostname) => dnsLookup(hostname);
  fetcher: typeof fetch = globalThis.fetch;

  constructor(
    @Inject(WorkspacePathService) private readonly paths: WorkspacePathService,
    @Inject(AssetsService) private readonly assets: AssetsService,
    @Inject(CanvasService) private readonly canvas: CanvasService,
    @Inject(FfmpegService) private readonly ffmpeg: FfmpegService,
  ) {}

  async execute(value: unknown) {
    const request = value as WebRequest;
    try {
      const input = validateRequest(value);
      const decision = await vetUrl(input.url, this.lookup);
      if (!decision.ok) throw new Error(`URL rejected by network safety policy: ${decision.reason}`);
      const binary = process.env.YTDLP_PATH?.trim() || "yt-dlp";
      if (input.type === "inspect") return await this.inspect(input, binary);
      return await this.download(input, binary);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.warn(`web media ${request?.type} failed: ${message}`);
      return { ok: false, type: request?.type, error: message };
    }
  }

  async executeBrowser(value: unknown) {
    const timeout = AbortSignal.timeout(10 * 60_000);
    const staging = path.join(tmpdir(), `ov-browser-${process.pid}-${Date.now()}`);
    try {
      const parsed = parseBrowserRequest(value);
      if (!parsed) throw new Error("Invalid browser media download request");
      await mkdir(staging, { recursive: true });
      const target = path.join(staging, `browser-video-${parsed.request_id}.mp4`);
      await this.pullBrowserVideo(parsed, target, timeout);
      return await this.publish([target], { type: "download_video", url: parsed.source_url, add_to_canvas: parsed.add_to_canvas }, "browser");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.warn(`browser media download failed: ${message}`);
      return { ok: false, type: "download_video", error: message };
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  }

  private async inspect(input: WebRequest, binary: string) {
    const stdout = await runProcess(binary, [...commonArgs(input), "--dump-single-json", "--skip-download", input.url]);
    return { ok: true, type: input.type, metadata: mapMetadata(JSON.parse(stdout.trim()) as Record<string, unknown>) };
  }

  private async download(input: WebRequest, binary: string) {
    const staging = path.join(tmpdir(), `ov-ytdlp-${process.pid}-${Date.now()}`);
    await mkdir(staging, { recursive: true });
    try {
      await runProcess(binary, downloadArgs(input, staging));
      const names = await readdir(staging);
      const files = names.filter((name) => !name.endsWith(".part")).flatMap((name) => {
        const kind = classify(name);
        return kind ? [path.join(staging, name)] : [];
      });
      if (!files.length) throw new Error("yt-dlp completed without a downloadable asset");
      return await this.publish(files, input, "yt-dlp");
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  }

  private async publish(files: string[], input: { type: string; url: string; filename?: string; add_to_canvas?: boolean; source_node_id?: string }, sourceTool: string) {
    const assets: { kind: string; path: string }[] = [];
    for (const [index, sourcePath] of files.entries()) {
      const kind = classify(sourcePath);
      if (!kind) continue;
      const extension = path.extname(sourcePath).toLowerCase();
      const requested = input.filename ? (files.length === 1 ? input.filename : `${input.filename}-${index + 1}`) : path.basename(sourcePath, extension);
      const base = sanitizeFilename(requested.replace(/\.(png|jpe?g|webp|gif|bmp|mp4|mov|webm|mkv|mp3|wav|m4a|aac|flac|ogg|opus|srt|vtt|ass|lrc)$/i, "")) || "download";
      const relative = await placeUnique(sourcePath, this.paths.root, base, extension);
      const row = await this.assets.enroll(relative, {
        prompt: "",
        model: kind === "video" ? "imported" : "yt-dlp",
        description: `Downloaded from ${input.url}`,
        source_tool: sourceTool,
        time: new Date().toISOString(),
      });
      if (input.add_to_canvas !== false) {
        await this.canvas.addNodeByAsset(row, input.source_node_id ? { sourceNodeId: input.source_node_id } : {});
      }
      assets.push({ kind, path: relative });
    }
    return { ok: true as const, type: input.type, assets };
  }

  private async pullBrowserVideo(request: { request_id: string; source_url: string; add_to_canvas: boolean }, target: string, signal: AbortSignal) {
    const bridge = bridgeEndpoint();
    const response = await this.fetcher(bridge.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${bridge.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(request),
      redirect: "error",
      signal,
    });
    if (response.status !== 200) throw new Error(`Desktop browser media download failed (HTTP ${response.status})`);
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (contentType !== "video/mp4" || response.headers.has("content-range") || !response.body) throw new Error("Desktop browser media bridge did not return a complete MP4 video");
    const rawLength = response.headers.get("content-length");
    const expectedBytes = rawLength === null ? undefined : Number(rawLength);
    if (expectedBytes !== undefined && (!/^\d+$/.test(rawLength ?? "") || !Number.isSafeInteger(expectedBytes) || expectedBytes <= 0 || expectedBytes > BROWSER_MAX_BYTES)) {
      throw new Error("Browser video exceeds the download size limit or has an invalid size");
    }
    const rawDuration = response.headers.get("x-hilo-video-duration");
    const expectedDuration = rawDuration === null ? undefined : Number(rawDuration);
    if (expectedDuration !== undefined && !(Number.isFinite(expectedDuration) && expectedDuration > 0)) throw new Error("Desktop browser media bridge returned an invalid video duration");
    let bytes = 0;
    const limit = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        bytes += chunk.byteLength;
        if (bytes > BROWSER_MAX_BYTES) callback(new Error("Browser video exceeds the download size limit"));
        else callback(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(response.body as import("stream/web").ReadableStream), limit, createWriteStream(target, { flags: "wx" }), { signal });
    if (bytes === 0 || (expectedBytes !== undefined && bytes !== expectedBytes)) throw new Error("Browser video download was empty or incomplete");
    const media = await this.ffmpeg.probeMedia(target);
    const duration = media.timelineDuration || media.duration;
    if (!(media.width > 0) || !(media.height > 0) || !(duration > 0)) throw new Error("Browser download does not contain a playable video");
    if (expectedDuration !== undefined && Math.abs(duration - expectedDuration) > Math.max(0.25, expectedDuration * 0.02)) throw new Error("Browser video duration does not match the selected player");
    if (response.headers.get("x-hilo-video-audio") === "required" && !media.hasAudio) throw new Error("Browser video is missing the selected player audio track");
  }
}

@Controller("api/web-media")
export class WebMediaController {
  constructor(@Inject(WebMediaService) private readonly media: WebMediaService) {}

  @Post("yt-dlp")
  execute(@Body() body: unknown) {
    return this.media.execute(body);
  }

  @Post("browser")
  executeBrowser(@Body() body: unknown, @Req() _request: Request) {
    return this.media.executeBrowser(body);
  }
}

function validateRequest(value: unknown): WebRequest {
  const request = value as WebRequest | null;
  if (request?.add_to_canvas !== undefined && typeof request.add_to_canvas !== "boolean") throw new Error("add_to_canvas must be a boolean");
  if (!request || typeof request.url !== "string" || !request.url || !OPERATIONS.includes(request.type)) throw new Error("a supported type and a non-empty url are required");
  if (request.quality && request.format_id) throw new Error("quality and format_id are mutually exclusive");
  if (request.max_items !== undefined && request.playlist_mode !== "all") throw new Error('max_items requires playlist_mode="all"');
  if (request.max_items !== undefined && (!Number.isInteger(request.max_items) || request.max_items < 1 || request.max_items > 50)) throw new Error("max_items must be an integer from 1 to 50");
  if (request.type === "download_video" && request.container && !VIDEO_CONTAINERS.has(request.container)) throw new Error("download_video container must be mp4, mkv, or webm");
  if (request.type === "download_audio" && request.container && !AUDIO_CONTAINERS.has(request.container)) throw new Error("download_audio container must be mp3, m4a, or wav");
  if (request.quality && request.type !== "download_video") throw new Error("quality only applies to download_video");
  if (!["download_video", "download_audio"].includes(request.type) && (request.format_id || request.container)) throw new Error("format_id and container only apply to video or audio downloads");
  if (request.type !== "download_subtitles" && (request.subtitle_languages || request.subtitle_format || request.include_auto_subtitles)) throw new Error("subtitle options only apply to download_subtitles");
  return request;
}

function commonArgs(input: WebRequest): string[] {
  const args = ["--ignore-config", "--no-warnings", "--no-cookies", "--no-cache-dir", "--no-remote-components", "--js-runtimes", `node:${process.execPath}`, "--max-filesize", "2G"];
  if (input.playlist_mode === "all") args.push("--yes-playlist", "--playlist-end", String(input.max_items ?? 20));
  else args.push("--no-playlist");
  if (process.env.FFMPEG_PATH) args.push("--ffmpeg-location", process.env.FFMPEG_PATH);
  return args;
}

function downloadArgs(input: WebRequest, staging: string): string[] {
  const args = [...commonArgs(input), "--paths", staging, "--output", "%(title).180B [%(id)s].%(ext)s", "--no-write-info-json", "--no-write-description", "--no-write-comments"];
  if (input.type === "download_video") {
    args.push("--match-filter", "!is_live", "-f", input.format_id ?? qualitySelector(input.quality), "--merge-output-format", input.container ?? "mp4", "--remux-video", input.container ?? "mp4");
  } else if (input.type === "download_audio") {
    args.push("-f", input.format_id ?? "bestaudio/best", "--extract-audio", "--audio-format", input.container ?? "m4a");
  } else if (input.type === "download_subtitles") {
    const format = input.subtitle_format ?? "srt";
    args.push("--skip-download", "--write-subs", "--sub-format", format, "--convert-subs", format);
    if (input.include_auto_subtitles) args.push("--write-auto-subs");
    if (input.subtitle_languages?.length) args.push("--sub-langs", input.subtitle_languages.join(","));
  } else {
    args.push("--skip-download", "--write-thumbnail", "--convert-thumbnails", "jpg");
  }
  args.push(input.url);
  return args;
}

function qualitySelector(quality?: string): string {
  if (!quality || quality === "best") return "bv*+ba/b";
  const height = Number.parseInt(quality, 10);
  return `bv*[height<=${height}]+ba/b[height<=${height}]/best[height<=${height}]`;
}

function classify(filename: string): string | undefined {
  const extension = path.extname(filename).toLowerCase();
  if ([".srt", ".vtt", ".ass", ".lrc"].includes(extension)) return "subtitle";
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) return "image";
  if ([".mp3", ".m4a", ".aac", ".wav", ".flac", ".opus", ".ogg"].includes(extension)) return "audio";
  if ([".mp4", ".mkv", ".webm", ".mov", ".avi"].includes(extension)) return "video";
  return undefined;
}

function runProcess(executable: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // 批处理（.cmd/.bat）在 Windows 上会被 spawnTool 直接拒绝——同步 throw 会转成 promise 拒绝，走下面统一的失败映射。
    const child = spawnTool(executable, args);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString("utf8")).slice(0, 4000);
    });
    child.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") reject(new Error("Web media downloader is not available"));
      else reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `yt-dlp exited ${code}`));
    });
  });
}

async function placeUnique(source: string, directory: string, base: string, extension: string): Promise<string> {
  await mkdir(directory, { recursive: true });
  for (let index = 0; index <= 1000; index += 1) {
    const name = index === 0 ? `${base}${extension}` : `${base}_${index}${extension}`;
    try {
      await link(source, path.join(directory, name));
      return name;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
      throw error;
    }
  }
  throw new Error("Could not place the downloaded file in the workspace");
}

function bridgeEndpoint(): { url: string; token: string } {
  const rawUrl = process.env.HILO_MAIN_BRIDGE_URL;
  const token = process.env.HILO_MAIN_BRIDGE_TOKEN;
  if (!rawUrl || !token) throw new Error("Desktop browser media bridge is unavailable");
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" || parsed.hostname !== "127.0.0.1" || !parsed.port || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) throw new Error("invalid");
  } catch {
    throw new Error("Invalid desktop browser media bridge address");
  }
  return { url: new URL(BRIDGE_ROUTE, parsed).toString(), token };
}

const PLATFORM_HOSTS: Record<string, string[]> = {
  youtube: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
  bilibili: ["bilibili.com", "www.bilibili.com", "m.bilibili.com"],
  douyin: ["douyin.com", "www.douyin.com"],
  tiktok: ["tiktok.com", "www.tiktok.com"],
  xiaohongshu: ["xiaohongshu.com", "www.xiaohongshu.com"],
};

function parseBrowserRequest(value: unknown): { request_id: string; source_url: string; add_to_canvas: boolean } | null {
  if (!value || typeof value !== "object") return null;
  const requestId = Reflect.get(value, "request_id");
  const sourceUrl = Reflect.get(value, "source_url");
  const addToCanvas = Reflect.get(value, "add_to_canvas");
  if (typeof requestId !== "string" || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(requestId) || typeof sourceUrl !== "string" || typeof addToCanvas !== "boolean") return null;
  const page = parseBrowserPage(sourceUrl);
  if (page?.platform === "douyin" || page?.platform === "tiktok") {
    if (page.url !== sourceUrl) return null;
  } else if (!nativePlatform(sourceUrl) || sourceUrl.length > 2048 || new URL(sourceUrl).search || new URL(sourceUrl).hash) return null;
  return { request_id: requestId, source_url: sourceUrl, add_to_canvas: addToCanvas };
}

function nativePlatform(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) return null;
    if (parsed.hostname === "www.douyin.com" || parsed.hostname === "douyin.com") return "douyin";
    if (parsed.hostname === "www.tiktok.com" || parsed.hostname === "tiktok.com") return "tiktok";
    return null;
  } catch {
    return null;
  }
}

function parseBrowserPage(value: string): { platform: string; url: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.port) return null;
  const host = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;
  const result = (platform: string, nextPath: string, keys: string[] = []) => {
    const query = new URLSearchParams();
    for (const key of keys) {
      const item = parsed.searchParams.get(key);
      if (item) query.set(key, item);
    }
    parsed.protocol = "https:";
    parsed.pathname = nextPath;
    parsed.search = query.toString();
    parsed.hash = "";
    return { platform, url: parsed.toString() };
  };
  if (PLATFORM_HOSTS.youtube?.includes(host)) {
    const id = host === "youtu.be" ? pathname.slice(1) : pathname === "/watch" ? parsed.searchParams.get("v") : /^\/(?:shorts|embed)\/([^/]+)\/?$/.exec(pathname)?.[1];
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    parsed.hostname = "www.youtube.com";
    parsed.searchParams.set("v", id);
    return result("youtube", "/watch", ["v"]);
  }
  if (PLATFORM_HOSTS.bilibili?.includes(host)) {
    const id = /^\/video\/(BV[\da-zA-Z]+|av\d+)\/?$/.exec(pathname)?.[1];
    if (!id) return null;
    const part = parsed.searchParams.get("p");
    if (part && !/^[1-9]\d{0,3}$/.test(part)) return null;
    parsed.hostname = "www.bilibili.com";
    return result("bilibili", `/video/${id}/`, ["p"]);
  }
  if (PLATFORM_HOSTS.douyin?.includes(host)) {
    const id = /^\/video\/(\d+)\/?$/.exec(pathname)?.[1] ?? parsed.searchParams.get("modal_id");
    if (!id || !/^\d{10,25}$/.test(id)) return null;
    parsed.hostname = "www.douyin.com";
    return result("douyin", `/video/${id}`);
  }
  if (PLATFORM_HOSTS.tiktok?.includes(host)) {
    const match = /^\/@([\w.-]{1,64})\/video\/(\d{10,25})\/?$/.exec(pathname);
    if (!match?.[1] || !match[2]) return null;
    parsed.hostname = "www.tiktok.com";
    return result("tiktok", `/@${match[1]}/video/${match[2]}`);
  }
  if (PLATFORM_HOSTS.xiaohongshu?.includes(host)) {
    const id = /^\/(?:explore|discovery\/item)\/([\da-f]{24})\/?$/.exec(pathname)?.[1];
    if (!id) return null;
    parsed.hostname = "www.xiaohongshu.com";
    return result("xiaohongshu", `/explore/${id}`, ["xsec_token", "xsec_source"]);
  }
  return null;
}
