import { closeSync, createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";

import { Controller, Get, HttpException, Inject, Param, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";

import { CanvasV3ImagesService } from "./images.js";

@Controller("api/v3/canvas/videos")
export class CanvasV3VideosController {
  constructor(@Inject(CanvasV3ImagesService) private readonly media: CanvasV3ImagesService) {}

  @Get(":resourceId/:versionId")
  readVideo(@Param("resourceId") resourceId: string, @Param("versionId") versionId: string, @Req() request: Request, @Res() response: Response) {
    return sendVideo(this.media, resourceId, versionId, request, response);
  }
}

/** 带 Range 才能拖动进度。不满足的区间回 416，避免把整段文件当成成功。 */
export async function sendVideo(media: CanvasV3ImagesService, resourceId: string, versionId: string, request: Request, response: Response): Promise<void> {
  let fd: number | undefined;
  try {
    const video = media.readVideo(resourceId, versionId);
    fd = video.fd;
    response.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Type": video.mimeType, "Accept-Ranges": "bytes" });
    const range = request.headers.range ? request.range(video.size) : undefined;
    if (range && (typeof range === "number" || range.type !== "bytes" || range.length !== 1)) {
      response.status(416).set("Content-Range", `bytes */${video.size}`).end();
      return;
    }
    const start = Array.isArray(range) ? range[0]?.start ?? 0 : 0;
    const end = Array.isArray(range) ? range[0]?.end ?? video.size - 1 : video.size - 1;
    response.status(range ? 206 : 200).set("Content-Length", String(end - start + 1));
    if (range) response.set("Content-Range", `bytes ${start}-${end}/${video.size}`);
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    const stream = createReadStream("", { fd, autoClose: true, start, end });
    fd = undefined;
    await pipeline(stream, response);
  } catch (error) {
    if (response.headersSent || response.destroyed) response.destroy();
    else {
      response.removeHeader("Content-Length");
      response.removeHeader("Content-Range");
      response.status(error instanceof HttpException ? error.getStatus() : 500).set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).json({ message: "Video unavailable" });
    }
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
