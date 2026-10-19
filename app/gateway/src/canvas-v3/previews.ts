import { Controller, Get, Inject, NotFoundException, Param, Query, Req, Res, UseFilters } from "@nestjs/common";
import type { Request, Response } from "express";

import { ProjectResourceService } from "../project-kernel/resource.service.js";
import { sendAudio } from "./audios.js";
import { CanvasV3AudioService } from "./audios.js";
import { CanvasV3ImagesHttpFilter, CanvasV3ImagesService, sendCanvasImage } from "./images.js";
import { sendVideo } from "./videos.js";

type ResourceRead = {
  ok?: boolean;
  detail?: { resource: { kind: number; lifecycle: string }; version: { resourceId: string; status: string } | null };
};

/** 预览按资源种类分流。普通图片、视频、音频走各自的读取；其它种类不在这里打开。 */
@Controller("api/v3/canvas/previews")
@UseFilters(CanvasV3ImagesHttpFilter)
export class CanvasV3PreviewsController {
  constructor(
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
    @Inject(CanvasV3ImagesService) private readonly images: CanvasV3ImagesService,
    @Inject(CanvasV3AudioService) private readonly audio: CanvasV3AudioService,
  ) {}

  @Get(":resourceId/:versionId")
  preview(@Param("resourceId") resourceId: string, @Param("versionId") versionId: string, @Query("download") download: string | undefined, @Req() request: Request, @Res() response: Response) {
    this.images.admit();
    const [read] = this.resources.getResources([{ resourceId, versionId }]) as ResourceRead[];
    const version = read?.detail?.version;
    if (!read?.ok || read.detail?.resource.lifecycle !== "active" || version?.status !== "ready" || version.resourceId !== resourceId) throw new NotFoundException();
    const kind = read.detail?.resource.kind;
    if (kind === 2) return sendCanvasImage(this.images, resourceId, versionId, download, response);
    if (kind === 3) return sendVideo(this.images, resourceId, versionId, request, response);
    if (kind === 4) return sendAudio(this.audio, resourceId, versionId, request, response);
    throw new NotFoundException();
  }
}
