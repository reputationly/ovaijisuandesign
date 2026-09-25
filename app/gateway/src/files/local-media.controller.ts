import { createHash } from "node:crypto";
import { readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { BadRequestException, Controller, Get, HttpException, Logger, Query, Res } from "@nestjs/common";
import { detectFileType } from "@ov/protocol";
import type { Response } from "express";

import { MediaThumbnailer, ThumbnailBusy } from "../static/media-thumbnailer.js";

/** 缩略图宽度向上取到这几档，缓存才命中得上（和工作区内的图片缩略图同一套档位）。 */
const WIDTH_BUCKETS = [64, 128, 256, 512, 1024, 2048];
/** 工作区概况统计时跳过的目录：内部数据、缓存、依赖，都不是用户的作品。 */
const SUMMARY_IGNORED_DIRS = new Set([".git", ".hilo", "cache", "node_modules", "thumbnails", "trash"]);

type MediaKind = "image" | "video" | "audio";
const isMedia = (k: string): k is MediaKind => k === "image" || k === "video" || k === "audio";

/**
 * 按绝对路径访问本机文件：项目库卡片的预览图、首页最近作品、别的工作区里的素材。
 *
 * 这些文件不在当前 gateway 的工作区里（应用级 gateway 根本没有工作区），所以不走 `/files/*`，
 * 缩略图也不能缓存进某个工作区的 `.hilo`，放系统临时目录 —— 换工作区、删工作区都不影响。
 */
@Controller()
export class LocalMediaController {
  private readonly log = new Logger("LocalMedia");
  private readonly thumbDir = path.join(os.tmpdir(), "ov-local-thumbnails");

  constructor(private readonly thumbs: MediaThumbnailer) {}

  /**
   * 目录下（不递归）最新的几个媒体文件，给项目卡片当封面拼图。
   * 音频排最前、视频其次、图片最后，同类按修改时间倒序：卡片上优先展示信息量大的。
   */
  @Get("api/files/scan-media")
  async scanMedia(@Query("dir") dir?: string, @Query("limit") limitStr?: string) {
    await assertDirectory(dir);
    const parsed = limitStr ? Number.parseInt(limitStr, 10) : 3;
    const limit = Number.isNaN(parsed) ? 3 : parsed;
    const entries = await readdir(dir!, { withFileTypes: true }).catch(() => []);
    const media = entries.filter((e) => e.isFile() && isMedia(detectFileType(e.name))).map((e) => path.join(dir!, e.name));
    const withStats = await Promise.all(media.map(async (p) => stat(p).then((s) => ({ p, mtime: s.mtimeMs }), () => null)));
    const rank = (p: string) => ({ audio: 0, video: 1, image: 2 })[detectFileType(p) as MediaKind];
    const files = withStats
      .filter((x) => x !== null)
      .sort((a, b) => rank(a.p) - rank(b.p) || b.mtime - a.mtime)
      .slice(0, limit)
      .map(({ p }) => ({ name: path.basename(p), absolutePath: p }));
    return { files };
  }

  /** 工作区里各类作品的数量（递归，跳过隐藏和内部目录），给项目详情的统计浮层用。 */
  @Get("api/files/workspace-summary")
  async workspaceSummary(@Query("dir") dir?: string) {
    await assertDirectory(dir, "dir must be a directory");
    const counts = { image: 0, video: 0, audio: 0, text: 0 };
    const walk = async (d: string): Promise<void> => {
      const entries = await readdir(d, { withFileTypes: true }).catch(() => []);
      for (const e of entries) {
        if (e.name.startsWith(".") || SUMMARY_IGNORED_DIRS.has(e.name)) continue;
        const full = path.join(d, e.name);
        if (e.isDirectory()) await walk(full);
        else if (e.isFile()) {
          const kind = detectFileType(e.name);
          if (kind in counts) counts[kind as keyof typeof counts] += 1;
        }
      }
    };
    await walk(dir!);
    return { counts };
  }

  /**
   * 原文件，或带 `w` 时的缩略图（图片按宽度缩，视频抽帧，音频画波形）。
   * 不存在 / 不是文件回空 404；缩略图生成失败时图片回原图、视频音频回占位图，界面上不出现破图标。
   */
  @Get("api/local-file")
  async localFile(@Query("path") filePath: string | undefined, @Query("w") w: string | undefined, @Res() res: Response) {
    if (!filePath) throw new BadRequestException("path query parameter is required");
    if (!path.isAbsolute(filePath)) throw new BadRequestException("path must be an absolute path");
    const st = await stat(filePath).catch(() => undefined);
    if (!st?.isFile()) {
      res.status(404).end();
      return;
    }
    const width = Number.parseInt(w ?? "", 10);
    const kind = detectFileType(filePath);
    if (Number.isFinite(width) && width > 0 && isMedia(kind) && path.extname(filePath).toLowerCase() !== ".svg") {
      const thumb = await this.thumbnail(filePath, st.mtimeMs, kind, width).catch((err: unknown) => {
        if (err instanceof ThumbnailBusy) {
          res.setHeader("Retry-After", "2");
          throw new HttpException({ statusCode: 503, message: "Thumbnail generation is busy, please retry" }, 503);
        }
        this.log.warn(`缩略图失败 ${filePath}: ${(err as Error).message}`);
        return kind === "image" ? null : this.thumbs.placeholder(this.thumbDir);
      });
      if (thumb) {
        res.sendFile(thumb, { dotfiles: "allow" });
        return;
      }
    }
    res.sendFile(filePath, { dotfiles: "allow" });
  }

  private thumbnail(abs: string, mtimeMs: number, kind: MediaKind, width: number): Promise<string> {
    const bucket = WIDTH_BUCKETS.find((b) => b >= Math.min(Math.max(width, 16), 2048)) ?? 2048;
    const key = createHash("md5").update(`${kind}:${abs}:${mtimeMs}:${bucket}`).digest("hex").slice(0, 16);
    if (kind === "image") return this.thumbs.image(abs, path.join(this.thumbDir, key + path.extname(abs).toLowerCase()), bucket);
    return this.thumbs.media(abs, path.join(this.thumbDir, `${key}.jpg`), kind, bucket);
  }
}

async function assertDirectory(dir: string | undefined, notDirMessage = "dir is not a directory"): Promise<void> {
  if (!dir) throw new BadRequestException("dir query parameter is required");
  if (!path.isAbsolute(dir)) throw new BadRequestException("dir must be an absolute path");
  const st = await stat(dir).catch(() => undefined);
  if (!st) throw new BadRequestException(`Directory not found: ${dir}`);
  if (!st.isDirectory()) throw new BadRequestException(notDirMessage);
}
