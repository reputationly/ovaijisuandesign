import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { memoryStorage } from "multer";

import { AssetChangeLog } from "../common/asset-change-log.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { ImportUrlsDto, PatchMetadataDto, PathsDto, TextAssetDto, WriteContentDto } from "./files.dto.js";
import { FilesService, type UploadedFileLike } from "./files.service.js";

const UPLOAD_LIMITS = {
  fileSize: 500 * 1024 * 1024,
  fieldNestingDepth: 8,
  fields: 64,
  files: 1,
  parts: 65,
  fieldNameSize: 256,
};

@Controller()
export class FilesController {
  constructor(
    private readonly files: FilesService,
    private readonly paths: WorkspacePathService,
    private readonly changes: AssetChangeLog,
  ) {}

  @Get("api/workspace")
  workspace() {
    return { dir: this.paths.root };
  }

  @Post("api/workspace")
  @HttpCode(201)
  setWorkspace() {
    return { ok: true, dir: this.paths.root };
  }

  @Get("api/assets")
  assets(@Query("include") include?: string, @Query("path") p?: string) {
    const includeMetadata = (include ?? "").split(",").some((s) => s.trim().toLowerCase() === "metadata");
    return this.files.listAssets({ includeMetadata, path: p?.trim() || undefined });
  }

  @Get("api/assets/changes")
  changesSince(
    @Query("workspace_id") workspaceId?: string,
    @Query("event_epoch") eventEpoch?: string,
    @Query("after_seq") afterSeq?: string,
    @Query("to_seq") toSeq?: string,
    @Query("limit") limit?: string,
  ) {
    if (!workspaceId?.trim()) {
      throw new BadRequestException("workspace_id query parameter is required");
    }
    const num = (v?: string) => {
      const n = v === undefined ? NaN : Number.parseInt(v, 10);
      return Number.isNaN(n) ? undefined : n;
    };
    return this.changes.since(workspaceId.trim(), { eventEpoch, afterSeq: num(afterSeq), toSeq: num(toSeq), limit: num(limit) });
  }

  @Get("api/assets/{*folder}")
  assetsInFolder(@Param("folder") folder: string | string[] | undefined) {
    const f = Array.isArray(folder) ? folder.join("/") : (folder ?? "");
    return this.files.assetsInFolder(f);
  }

  @Patch("api/assets/:id/metadata")
  patchMetadata(@Param("id") id: string, @Body() body: PatchMetadataDto) {
    return this.files.patchMetadata(id, body.patch);
  }

  @Post("api/upload")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: UPLOAD_LIMITS }))
  upload(@UploadedFile() file: UploadedFileLike, @Req() req: Request) {
    const b = (req.body ?? {}) as Record<string, string>;
    return this.files.upload(file, {
      folder: b.folder || undefined,
      useDefaultDir: b.useDefaultDir === "true",
      staging: b.staging === "true",
    });
  }

  @Post("api/files/import-url")
  importUrl(@Body() body: ImportUrlsDto) {
    return this.files.importUrls(body.urls);
  }

  @Get("api/files/content")
  readContent(@Query("path") p?: string) {
    return this.files.readContent(p);
  }

  @Put("api/files/content")
  writeContent(@Body() body: WriteContentDto) {
    return this.files.writeContent(body);
  }

  @Post("api/files/text-asset")
  textAsset(@Body() body: TextAssetDto) {
    return this.files.createTextAsset(body.content);
  }

  @Post("api/files/delete")
  delete(@Body() body: PathsDto) {
    return this.files.deletePaths(body.paths);
  }
}
