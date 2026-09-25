import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, Controller, Get, HttpException, Logger, NotFoundException, Query, Req, Res } from "@nestjs/common";
import { detectFileType } from "@ov/protocol";
import type { Request, Response } from "express";

import { WorkspacePathService } from "../common/workspace-path.service.js";
import { MediaThumbnailer, ThumbnailBusy } from "./media-thumbnailer.js";

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

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly thumbs: MediaThumbnailer,
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
    let file: string;
    try {
      file = await this.thumbs.media(abs, out, kind, w, force === "1");
    } catch (err) {
      if (err instanceof ThumbnailBusy) {
        res.setHeader("Retry-After", "2");
        throw new HttpException({ statusCode: 503, message: "Thumbnail generation is busy, please retry" }, 503);
      }
      this.log.warn(`缩略图失败 ${rel}: ${(err as Error).message}`);
      file = await this.thumbs.placeholder(this.paths.hilo(".thumbnails")).catch(() => {
        throw new NotFoundException("Failed to generate thumbnail");
      });
    }
    res.type("image/jpeg").sendFile(file, { dotfiles: "allow" });
  }
}
