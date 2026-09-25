import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, Controller, Get, HttpException, Logger, NotFoundException, Query, Req, Res } from "@nestjs/common";
import { detectFileType } from "@ov/protocol";
import type { Request, Response } from "express";
import sharp from "sharp";

import { WorkspacePathService } from "../common/workspace-path.service.js";
import { FfmpegService } from "../edit/ffmpeg.service.js";

const CONCURRENCY = 2;
const MAX_QUEUE = 32;
const QUEUE_WAIT_MS = 30_000;
const FFMPEG_TIMEOUT_MS = 15_000;
const WAVE_COLOR = "#8b5cf6";

class ThumbnailBusy extends Error {}

/**
 * 视频 / 音频的缩略图：视频抽一帧，音频画波形。图片的缩略图不在这里，走 `/files/...?w=`。
 *
 * 画布一滚就是几十个视频节点同时要图，ffmpeg 又重：并发 2、排队最多 32、等 30 秒还轮不到就回 503
 * 让渲染层过会儿再要，而不是把请求一直挂着。同一个文件同一个尺寸的并发请求只跑一次。
 * 生成失败回一张共享的深灰占位图 —— 节点上显示一块灰，比显示破图标好。
 */
@Controller("api/thumbnail")
export class ThumbnailController {
  private readonly log = new Logger("Thumbnail");
  private active = 0;
  private readonly queue: { grant: () => void; timer: NodeJS.Timeout }[] = [];
  private readonly inflight = new Map<string, Promise<string>>();

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly ffmpeg: FfmpegService,
  ) {}

  @Get("{*filepath}")
  async get(@Req() req: Request, @Query("w") wq: string | undefined, @Query("force") force: string | undefined, @Res() res: Response) {
    let rel: string;
    try {
      rel = decodeURIComponent(req.path.replace(/^\/api\/thumbnail\//, ""));
    } catch {
      throw new BadRequestException("Malformed URL encoding");
    }
    const parsed = Number.parseInt(wq ?? "", 10);
    const w = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 2048) : undefined;
    const abs = this.paths.resolve(rel);
    if (!abs) throw new BadRequestException("Invalid path");
    const st = await stat(abs).catch(() => undefined);
    if (!st?.isFile()) throw new NotFoundException("File not found");
    const kind = detectFileType(abs);
    if (kind !== "video" && kind !== "audio") {
      throw new BadRequestException(`Unsupported file type for thumbnail: ${path.extname(abs).replace(/^\./, "") || "(none)"}`);
    }

    const key = createHash("md5")
      .update(`${rel}${w ? `:w${w}` : ""}:${st.mtimeMs}${kind === "video" ? ":p2" : ""}`)
      .digest("hex")
      .slice(0, 12);
    const out = this.paths.hilo(".thumbnails", `${key}.jpg`);
    let file = out;
    if (force === "1" || !(await isFile(out))) {
      try {
        file = await this.merged(key, () => this.generate(abs, out, kind, w));
      } catch (err) {
        if (err instanceof ThumbnailBusy) {
          res.setHeader("Retry-After", "2");
          throw new HttpException({ statusCode: 503, message: "Thumbnail generation is busy, please retry" }, 503);
        }
        this.log.warn(`缩略图失败 ${rel}: ${(err as Error).message}`);
        file = await this.placeholder().catch(() => {
          throw new NotFoundException("Failed to generate thumbnail");
        });
      }
    }
    res.type("image/jpeg").sendFile(file, { dotfiles: "allow" });
  }

  private merged(key: string, fn: () => Promise<string>): Promise<string> {
    let p = this.inflight.get(key);
    if (!p) {
      p = fn().finally(() => this.inflight.delete(key));
      this.inflight.set(key, p);
    }
    return p;
  }

  private async generate(abs: string, out: string, kind: "video" | "audio", w?: number): Promise<string> {
    await this.acquire();
    try {
      await mkdir(path.dirname(out), { recursive: true });
      // 先写临时文件：ffmpeg 中途被杀留下的半张图不能被当成缓存命中。
      const tmp = `${out}.${randomUUID().slice(0, 8)}.tmp.jpg`;
      try {
        await this.ffmpeg.exec(kind === "video" ? await this.videoArgs(abs, tmp, w) : audioArgs(abs, tmp, w), { timeoutMs: FFMPEG_TIMEOUT_MS });
        await rename(tmp, out);
      } finally {
        await rm(tmp, { force: true });
      }
      return out;
    } finally {
      this.release();
    }
  }

  /** 取时长 10% 处的一帧（夹在 0.1–10 秒、且不超过一半）：第一帧常常是黑场。 */
  private async videoArgs(abs: string, out: string, w?: number): Promise<string[]> {
    const duration = (await this.ffmpeg.probeMedia(abs).catch(() => undefined))?.duration ?? 0;
    const seek = duration > 0 ? Math.min(Math.max(duration * 0.1, 0.1), 10, duration / 2) : 0.1;
    return ["-y", "-ss", seek.toFixed(3), "-i", abs, "-vframes", "1", ...(w ? ["-vf", `scale=${w}:-1`] : []), "-q:v", "2", out];
  }

  private async placeholder(): Promise<string> {
    const file = this.paths.hilo(".thumbnails", "_placeholder.jpg");
    if (await isFile(file)) return file;
    await mkdir(path.dirname(file), { recursive: true });
    await sharp({ create: { width: 320, height: 180, channels: 3, background: "#1a1a1a" } }).jpeg().toFile(file);
    return file;
  }

  private acquire(): Promise<void> {
    if (this.active < CONCURRENCY) {
      this.active++;
      return Promise.resolve();
    }
    if (this.queue.length >= MAX_QUEUE) return Promise.reject(new ThumbnailBusy());
    return new Promise((resolve, reject) => {
      const entry = {
        grant: () => {
          clearTimeout(entry.timer);
          resolve();
        },
        timer: setTimeout(() => {
          this.queue.splice(this.queue.indexOf(entry), 1);
          reject(new ThumbnailBusy());
        }, QUEUE_WAIT_MS),
      };
      entry.timer.unref();
      this.queue.push(entry);
    });
  }

  /** 名额直接交给排队的下一个，不减计数，免得被新来的插队。 */
  private release(): void {
    const next = this.queue.shift();
    if (next) next.grant();
    else this.active--;
  }
}

function audioArgs(abs: string, out: string, w?: number): string[] {
  const width = w ?? 320;
  const height = Math.max(1, Math.round((width * 180) / 320));
  return ["-y", "-i", abs, "-filter_complex", `showwavespic=s=${width}x${height}:colors=${WAVE_COLOR}`, "-frames:v", "1", out];
}

async function isFile(p: string): Promise<boolean> {
  return stat(p).then(
    (s) => s.isFile(),
    () => false,
  );
}
