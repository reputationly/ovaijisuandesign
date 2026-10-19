import { createHash } from "node:crypto";
import { lstatSync, realpathSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, Controller, ForbiddenException, Get, Inject, NotFoundException, Param, Query, Res, UseFilters } from "@nestjs/common";
import { detectFileType } from "@ov/protocol";
import type { Response } from "express";

import { WorkspacePathService } from "../common/workspace-path.service.js";
import { FfmpegService } from "../edit/ffmpeg.service.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";
import { MediaThumbnailer, ThumbnailBusy } from "../static/media-thumbnailer.js";
import { CanvasV3ImagesHttpFilter, CanvasV3ImagesService } from "./images.js";

const UNSAFE_IDENTIFIER = /[\u0000-\u001f\u007f/\\]/;
const DURATION_CACHE_MAX = 256;

type ResourceRead = {
  ok?: boolean;
  detail?: { resource: { kind: number; lifecycle: string }; version: { resourceId: string; status: string; relativePath: string } | null };
};

/** 按资源版本抽一帧。抽不出来时回共享占位图，时长头仍然给，卡片上不会变成破图标。 */
@Controller("api/v3/canvas/videos")
@UseFilters(CanvasV3ImagesHttpFilter)
export class CanvasV3VideoThumbnailsController {
  private readonly durations = new Map<string, Promise<number>>();

  constructor(
    @Inject(CanvasV3ImagesService) private readonly images: CanvasV3ImagesService,
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
    @Inject(WorkspacePathService) private readonly paths: WorkspacePathService,
    @Inject(MediaThumbnailer) private readonly thumbs: MediaThumbnailer,
    @Inject(FfmpegService) private readonly ffmpeg: FfmpegService,
  ) {}

  @Get(":resourceId/:versionId/thumbnail")
  async thumbnail(
    @Param("resourceId") resourceId: string,
    @Param("versionId") versionId: string,
    @Query("w") widthQuery: string | undefined,
    @Query("force") force: string | undefined,
    @Res() response: Response,
  ) {
    const resolved = this.resolve(resourceId, versionId);
    const absolute = path.join(resolved.workspace, resolved.relativePath);
    const safe = this.paths.resolve(resolved.relativePath);
    if (!safe || realpathSync(safe) !== absolute) throw new ForbiddenException();
    const width = widthQuery ? Math.min(Math.max(Number.parseInt(widthQuery, 10) || 1, 1), 2048) : 512;
    let thumbnail: string;
    try {
      const fileStat = await stat(absolute);
      const kind = detectFileType(absolute);
      if (kind !== "video" && kind !== "audio") throw new BadRequestException(`Unsupported file type for thumbnail: ${path.extname(absolute).toLowerCase()}`);
      const relative = path.relative(resolved.workspace, absolute);
      const key = createHash("md5").update(`${relative}${width ? `:w${width}` : ""}:${fileStat.mtimeMs}${kind === "video" ? ":p2" : ""}`).digest("hex").slice(0, 12);
      thumbnail = await this.thumbs.media(absolute, this.paths.hilo(".thumbnails", `${key}.jpg`), kind, width, force === "1");
    } catch (error) {
      if (error instanceof ThumbnailBusy) {
        response.status(503).set("Retry-After", "2").end();
        return;
      }
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      thumbnail = await this.thumbs.placeholder(this.paths.hilo(".thumbnails"));
    }
    const duration = await this.duration(absolute);
    this.resolve(resourceId, versionId);
    response.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Video-Duration": String(duration),
      "Access-Control-Expose-Headers": "X-Video-Duration",
    });
    response.type("image/jpeg").sendFile(thumbnail, { dotfiles: "allow" });
  }

  private resolve(resourceId: string, versionId: string): { workspace: string; relativePath: string } {
    this.images.admit();
    if (![resourceId, versionId].every((id) => id.length > 0 && id.length <= 256 && !UNSAFE_IDENTIFIER.test(id))) throw new BadRequestException("Invalid video identifier");
    const [result] = this.resources.getResources([{ resourceId, versionId }]) as ResourceRead[];
    const version = result?.detail?.version;
    const kind = result?.detail?.resource.kind;
    if (!result?.ok || (kind !== 3 && kind !== 4) || result.detail?.resource.lifecycle !== "active" || version?.status !== "ready" || version.resourceId !== resourceId) {
      throw new NotFoundException("Video unavailable");
    }
    const workspace = this.images.admit();
    try {
      assertStored(workspace, version.relativePath);
    } catch {
      throw new NotFoundException("Video unavailable");
    }
    return { workspace, relativePath: version.relativePath };
  }

  private duration(file: string): Promise<number> {
    let mtimeMs = 0;
    try {
      mtimeMs = lstatSync(file).mtimeMs;
    } catch {
      return Promise.resolve(0);
    }
    const key = `${file}:${mtimeMs}`;
    const hit = this.durations.get(key);
    if (hit) return hit;
    const pending = this.ffmpeg.probeMedia(file).then((info) => info.duration).catch(() => 0);
    if (this.durations.size >= DURATION_CACHE_MAX) {
      const oldest = this.durations.keys().next().value;
      if (oldest !== undefined) this.durations.delete(oldest);
    }
    this.durations.set(key, pending);
    return pending;
  }
}

function assertStored(workspace: string, relativePath: string): void {
  if (!relativePath || relativePath.includes("\0") || relativePath.includes("\\") || relativePath.includes(":") || path.posix.isAbsolute(relativePath) || relativePath.split("/").some((part) => !part || part === "." || part === "..") || relativePath.split("/")[0] === ".hilo") {
    throw new Error("Unsafe content");
  }
  let current = workspace;
  const parts = relativePath.split("/");
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index] ?? "");
    const fileStat = lstatSync(current);
    if (fileStat.isSymbolicLink()) throw new Error("Unsafe content");
    if (index === parts.length - 1 ? !fileStat.isFile() : !fileStat.isDirectory()) throw new Error("Unsafe content");
  }
}
