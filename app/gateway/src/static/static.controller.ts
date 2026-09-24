import { createHash } from "node:crypto";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, Controller, Get, Logger, Param, Query, Req, Res } from "@nestjs/common";
import { detectFileType } from "@ov/protocol";
import type { Request, Response } from "express";
import sharp from "sharp";

import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";

/** 缩略图宽度向上取到这几档，缓存才命中得上（否则每个像素宽度一份）。 */
const WIDTH_BUCKETS = [64, 128, 256, 512, 1024, 2048];
/** 同时最多几张在缩：sharp 吃 CPU，画布一次滚出几十张图时不限流会把机器卡住。 */
const THUMB_CONCURRENCY = 2;

/**
 * 工作区文件的字节流：`/files/id/:assetId` 和 `/files/{*path}`。
 *
 * Range / ETag / Last-Modified / 304 全交给 `res.sendFile` —— 视频拖进度条靠 Range，
 * 自己实现一遍很容易在边界上出错（`bytes=-500` 这种后缀区间）。
 *
 * 图片带 `?w=` 时回缩略图（sharp 生成，缓存在 `.hilo/.thumbnails/img/`），缩失败或
 * 太忙时回落原图：画布上显示慢一点，比显示一个破图标好。
 */
@Controller("files")
export class StaticController {
  private readonly log = new Logger("Static");
  private active = 0;
  private readonly waiters: (() => void)[] = [];

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly assets: AssetsService,
  ) {}

  @Get("id/:assetId")
  async byId(@Param("assetId") id: string, @Query() q: ThumbQuery, @Res() res: Response) {
    const row = this.assets.byId(id);
    const abs = row ? this.paths.resolve(row.path) : null;
    if (!row || !abs || !(await isFile(abs))) {
      res.status(404).end();
      return;
    }
    await this.send(abs, row.path, q, res);
  }

  @Get("{*path}")
  async byPath(@Req() req: Request, @Query() q: ThumbQuery, @Res() res: Response) {
    let rel: string;
    try {
      rel = decodeURIComponent(req.path.replace(/^\/files\//, ""));
    } catch {
      throw new BadRequestException("Malformed URL encoding");
    }
    const abs = this.paths.resolve(rel);
    if (!abs) throw new BadRequestException("Invalid path");
    if (!(await isFile(abs))) {
      res.status(404).end();
      return;
    }
    await this.send(abs, rel, q, res);
  }

  private async send(abs: string, rel: string, q: ThumbQuery, res: Response) {
    const w = Number.parseInt(q.w ?? "", 10);
    if (Number.isFinite(w) && w > 0 && detectFileType(abs) === "image" && path.extname(abs).toLowerCase() !== ".svg") {
      const thumb = await this.thumbnail(abs, rel, w, q.thumbnail_format === "webp" ? "webp" : undefined).catch((err) => {
        this.log.warn(`缩略图失败 ${rel}: ${err}`);
        return null;
      });
      if (thumb) return res.sendFile(thumb, { dotfiles: "allow" });
    }
    res.sendFile(abs, { dotfiles: "allow" });
  }

  private async thumbnail(abs: string, rel: string, w: number, format?: "webp"): Promise<string> {
    const clamped = Math.min(Math.max(w, 16), 2048);
    const bucket = WIDTH_BUCKETS.find((b) => b >= clamped) ?? 2048;
    const st = await stat(abs);
    const ext = format === "webp" ? ".webp" : path.extname(abs).toLowerCase();
    const key = createHash("md5")
      .update(`image-v2-width-buckets-format:${rel}:${st.mtimeMs}:${bucket}:${format ?? "source"}`)
      .digest("hex")
      .slice(0, 12);
    const out = this.paths.hilo(".thumbnails", "img", key + ext);
    if (await isFile(out)) return out;
    await mkdir(path.dirname(out), { recursive: true });
    await this.acquire();
    try {
      let img = sharp(abs, { failOn: "none" }).rotate().resize({ width: bucket, withoutEnlargement: true });
      if (format === "webp") img = img.webp({ quality: 82 });
      await img.toFile(out);
    } finally {
      this.release();
    }
    return out;
  }

  private acquire(): Promise<void> {
    if (this.active < THUMB_CONCURRENCY) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((r) => this.waiters.push(() => (this.active++, r())));
  }

  private release(): void {
    this.active--;
    this.waiters.shift()?.();
  }
}

interface ThumbQuery {
  w?: string;
  thumbnail_format?: string;
  thumbnail_fallback?: string;
}

async function isFile(p: string): Promise<boolean> {
  return stat(p).then(
    (s) => s.isFile(),
    () => false,
  );
}
