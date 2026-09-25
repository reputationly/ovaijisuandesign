import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import sharp from "sharp";

import { FfmpegService } from "../edit/ffmpeg.service.js";

const CONCURRENCY = 2;
const MAX_QUEUE = 32;
const QUEUE_WAIT_MS = 30_000;
const FFMPEG_TIMEOUT_MS = 15_000;
const WAVE_COLOR = "#8b5cf6";

/** 排队排满或等太久：调用方回 503 + Retry-After，让渲染层过会儿再要。 */
export class ThumbnailBusy extends Error {}

/**
 * 缩略图的生成管线：视频抽一帧、音频画波形、图片用 sharp 缩。工作区内的 `/api/thumbnail`
 * 和任意本地路径的 `/api/local-file` 共用这一套，限流也共用 —— 两边同时刷一屏缩略图时机器只扛一份并发。
 *
 * 并发 2、排队最多 32、等 30 秒还轮不到就判忙。同一个输出文件的并发请求只跑一次。
 * 先写临时文件再改名：生成中途被杀留下的半张图不能被当成缓存命中。
 */
@Injectable()
export class MediaThumbnailer {
  private active = 0;
  private readonly queue: { grant: () => void; timer: NodeJS.Timeout }[] = [];
  private readonly inflight = new Map<string, Promise<string>>();

  constructor(private readonly ffmpeg: FfmpegService) {}

  /** 视频 / 音频缩略图（JPEG）写到 `out`。`out` 已存在且不强制刷新时直接返回。 */
  async media(abs: string, out: string, kind: "video" | "audio", w: number | undefined, force = false): Promise<string> {
    if (!force && (await isFile(out))) return out;
    return this.merged(out, () => this.limited(() => this.renderMedia(abs, out, kind, w)));
  }

  /** 图片缩略图：按宽度缩、不放大，输出格式跟着 `out` 的扩展名走（PNG / WebP 保留透明）。 */
  async image(abs: string, out: string, w: number): Promise<string> {
    if (await isFile(out)) return out;
    return this.merged(out, () =>
      this.limited(() =>
        this.atomicWrite(out, async (tmp) => {
          await sharp(abs, { failOn: "none" }).rotate().resize({ width: w, withoutEnlargement: true }).toFile(tmp);
        }),
      ),
    );
  }

  /** 生成失败时回的共享深灰占位图：节点上显示一块灰，比显示破图标好。 */
  async placeholder(dir: string): Promise<string> {
    const file = path.join(dir, "_placeholder.jpg");
    if (await isFile(file)) return file;
    await mkdir(dir, { recursive: true });
    await sharp({ create: { width: 320, height: 180, channels: 3, background: "#1a1a1a" } }).jpeg().toFile(file);
    return file;
  }

  private async renderMedia(abs: string, out: string, kind: "video" | "audio", w?: number): Promise<string> {
    return this.atomicWrite(out, async (tmp) => {
      await this.ffmpeg.exec(kind === "video" ? await this.videoArgs(abs, tmp, w) : audioArgs(abs, tmp, w), { timeoutMs: FFMPEG_TIMEOUT_MS });
    });
  }

  /** 取时长 10% 处的一帧（夹在 0.1–10 秒、且不超过一半）：第一帧常常是黑场。 */
  private async videoArgs(abs: string, out: string, w?: number): Promise<string[]> {
    const duration = (await this.ffmpeg.probeMedia(abs).catch(() => undefined))?.duration ?? 0;
    const seek = duration > 0 ? Math.min(Math.max(duration * 0.1, 0.1), 10, duration / 2) : 0.1;
    return ["-y", "-ss", seek.toFixed(3), "-i", abs, "-vframes", "1", ...(w ? ["-vf", `scale=${w}:-1`] : []), "-q:v", "2", out];
  }

  private async atomicWrite(out: string, write: (tmp: string) => Promise<void>): Promise<string> {
    await mkdir(path.dirname(out), { recursive: true });
    const ext = path.extname(out);
    const tmp = `${out.slice(0, out.length - ext.length)}.${randomUUID().slice(0, 8)}.tmp${ext}`;
    try {
      await write(tmp);
      await rename(tmp, out);
    } finally {
      await rm(tmp, { force: true });
    }
    return out;
  }

  private merged(key: string, fn: () => Promise<string>): Promise<string> {
    let p = this.inflight.get(key);
    if (!p) {
      p = fn().finally(() => this.inflight.delete(key));
      this.inflight.set(key, p);
    }
    return p;
  }

  private async limited<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
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

export async function isFile(p: string): Promise<boolean> {
  return stat(p).then(
    (s) => s.isFile(),
    () => false,
  );
}
