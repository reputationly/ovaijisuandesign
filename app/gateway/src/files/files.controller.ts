import { stat } from "node:fs/promises";
import path from "node:path";

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request, Response } from "express";
import { memoryStorage } from "multer";

import { AssetChangeLog } from "../common/asset-change-log.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { FileOpsService } from "./file-ops.service.js";
import {
  AdoptFilesDto,
  AnchorProjectAssetDto,
  CheckConflictsDto,
  ImportUrlsDto,
  LocateAssetDto,
  MentionSearchQueryDto,
  MergeCandidateDto,
  MkdirDto,
  MoveDto,
  PatchMetadataDto,
  PathsDto,
  ProjectAssetMentionSearchQueryDto,
  ProjectAssetPropagateDto,
  RenameDto,
  TextAssetDto,
  TrackFileDto,
  WriteContentDto,
} from "./files.dto.js";
import { FilesService, type UploadedFileLike } from "./files.service.js";
import { MentionSearchService } from "./mention-search.service.js";
import { ProjectAssetAnchors } from "./project-asset-anchors.service.js";
import { UploadCommitService } from "./upload-commit.service.js";

/** 上传到云端 CDN 的单文件上限（和云端接口的限制一致）。 */
const MAX_CDN_FILE_SIZE = 50 * 1024 * 1024;

/** 请求方断开时取消的信号：扫描大工作区时用户已经换了关键词，就别再扫了。 */
function abortOnClose(req: Request): { signal: AbortSignal; done: () => void } {
  const ac = new AbortController();
  const onClose = () => ac.abort();
  req.on("close", onClose);
  return { signal: ac.signal, done: () => req.off("close", onClose) };
}

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
    private readonly ops: FileOpsService,
    private readonly commits: UploadCommitService,
    private readonly mentions: MentionSearchService,
    private readonly anchors: ProjectAssetAnchors,
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

  @Post("api/assets/reconcile")
  reconcile() {
    return this.files.reconcileAssets();
  }

  @Post("api/assets/:id/merge-candidate")
  mergeCandidate(@Param("id") id: string, @Body() body: MergeCandidateDto) {
    return this.files.mergeCandidate(id, body.candidateId);
  }

  @Post("api/assets/:id/remove-missing")
  removeMissing(@Param("id") id: string) {
    return this.files.removeMissing(id);
  }

  @Post("api/assets/:id/locate")
  locate(@Param("id") id: string, @Body() body: LocateAssetDto) {
    return this.files.locate(id, body.newPath);
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

  // -------------------------------------------------------------------------
  // 文件面板
  // -------------------------------------------------------------------------

  @Get("api/files")
  listFiles(@Query("type") type?: string, @Query("sort") sort?: string) {
    return this.ops.listFiles(type, sort);
  }

  @Get("api/files/dirs")
  listDirs() {
    return this.ops.listDirs();
  }

  @Post("api/files/check-conflicts")
  checkConflicts(@Body() body: CheckConflictsDto) {
    return this.ops.checkConflicts(body.items, body.targetDir);
  }

  @Post("api/files/mkdir")
  mkdir(@Body() body: MkdirDto) {
    return this.ops.mkdir(body.path);
  }

  @Post("api/files/rename")
  rename(@Body() body: RenameDto) {
    return this.ops.rename(body.path, body.new_name);
  }

  /** 复制大文件可能要一阵子，放宽这个请求的超时。 */
  @Post("api/files/fork-rename")
  forkRename(@Body() body: RenameDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    req.setTimeout(300_000);
    res.setTimeout(300_000);
    return this.ops.forkRename(body.path, body.new_name);
  }

  @Post("api/files/move")
  move(@Body() body: MoveDto) {
    return this.ops.move(body.paths, body.target);
  }

  @Post("api/files/copy")
  copy(@Body() body: MoveDto) {
    return this.ops.copy(body.paths, body.target);
  }

  @Post("api/files/duplicate")
  duplicate(@Body() body: PathsDto) {
    return this.ops.duplicate(body.paths);
  }

  @Post("api/files/import-external")
  importExternal(@Body() body: PathsDto) {
    return this.ops.importExternal(body.paths);
  }

  @Post("api/files/track")
  track(@Body() body: TrackFileDto) {
    return this.ops.track(body.path, body.description);
  }

  // -------------------------------------------------------------------------
  // @ 提及搜索
  // -------------------------------------------------------------------------

  @Get("api/files/mention-search")
  async mentionSearch(@Query() q: MentionSearchQueryDto, @Req() req: Request) {
    if (!q.workspace || !path.isAbsolute(q.workspace)) throw new BadRequestException("workspace must be an absolute path");
    const st = await stat(q.workspace).catch(() => undefined);
    if (!st) throw new BadRequestException(`workspace not found: ${q.workspace}`);
    if (!st.isDirectory()) throw new BadRequestException("workspace is not a directory");
    const { signal, done } = abortOnClose(req);
    try {
      return await this.mentions.search(q.workspace, q.q ?? "", q.limit, signal);
    } finally {
      done();
    }
  }

  @Get("api/files/project-asset-mention-search")
  async projectAssetMentionSearch(@Query() q: ProjectAssetMentionSearchQueryDto, @Req() req: Request) {
    const { signal, done } = abortOnClose(req);
    try {
      return await this.mentions.searchProjectAssets(this.paths.root, q.q ?? "", q.limit, signal);
    } finally {
      done();
    }
  }

  // -------------------------------------------------------------------------
  // 项目资产锚点
  // -------------------------------------------------------------------------

  /** "加到对话"：把项目资产的本地文件锚定进 `.hilo/project-assets/`，返回对话附件用的相对路径。 */
  @Post("api/files/anchor-project-asset")
  async anchorProjectAsset(@Body() body: AnchorProjectAssetDto) {
    const items = body.items ?? (body.paths ?? []).map((p) => ({ path: p }));
    const result = await this.anchors.anchor(items);
    if (result.anchored.length > 0) this.mentions.invalidateProjectAssets(this.paths.root);
    return result;
  }

  /** 主进程改了 / 删了项目资产之后通知过来，锚点跟着重新链接或删除。 */
  @Post("api/files/project-asset-propagate")
  async projectAssetPropagate(@Body() body: ProjectAssetPropagateDto) {
    const result = await this.anchors.propagate(body.events);
    if (result.removed > 0) this.mentions.invalidateProjectAssets(this.paths.root);
    return result;
  }

  // -------------------------------------------------------------------------
  // 对话附件的暂存提交 / 首页附件搬运
  // -------------------------------------------------------------------------

  /** body 不走 DTO：校验失败要回这几句固定的错误，渲染层按状态码分流。 */
  @Post("api/upload/commit")
  commitUpload(@Body() body: Record<string, unknown>) {
    return this.commits.commit(body.paths, body.operationId, body.contextPaths);
  }

  @Post("api/upload/commit/abort")
  abortUpload(@Body() body: Record<string, unknown>) {
    return this.commits.abort(body.operationId, body.paths);
  }

  @Post("api/upload/commit/finalize")
  finalizeUpload(@Body() body: Record<string, unknown>) {
    return this.commits.finalize(body.operationId);
  }

  @Post("api/upload/staging/delete")
  deleteStaged(@Body() body: Record<string, unknown>) {
    return this.commits.deleteStaged(body.paths);
  }

  /** 有一部分失败时回 207，body 里逐条给出。 */
  @Post("api/files/adopt")
  async adopt(@Body() body: AdoptFilesDto, @Res() res: Response, @Headers("idempotency-key") operationId?: string) {
    const result = await this.commits.adopt(body.paths, body.targetDir, operationId);
    res.status(result.errors.length > 0 ? HttpStatus.MULTI_STATUS : HttpStatus.OK).json(result);
  }

  /**
   * 上传到云端 CDN 换一个公网 URL（给云端工作流用）。本地版不连云：先做和云端一样的本地检查
   * （文件在不在、大小），通过了也回 `{ ok:false }` 说明拿不到公网地址，调用方按上传失败处理。
   */
  @Post("api/files/upload-cdn")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: UPLOAD_LIMITS }))
  async uploadCdn(@UploadedFile() file: UploadedFileLike | undefined, @Body() body: Record<string, unknown>) {
    const offline = { ok: false, error: "CDN upload error: cloud upload is not available in this build" };
    if (file) {
      if (file.buffer.byteLength > MAX_CDN_FILE_SIZE) return { ok: false, error: `File too large: ${file.buffer.byteLength} bytes (max ${MAX_CDN_FILE_SIZE})` };
      return offline;
    }
    if (typeof body?.file_path === "string" && body.file_path.length > 0) {
      const abs = path.isAbsolute(body.file_path) ? body.file_path : path.resolve(this.paths.root, body.file_path);
      const st = await stat(abs).catch(() => undefined);
      if (!st) return { ok: false, error: `File not found: ${body.file_path}` };
      if (st.size > MAX_CDN_FILE_SIZE) return { ok: false, error: `File too large: ${st.size} bytes (max ${MAX_CDN_FILE_SIZE})` };
      return offline;
    }
    throw new BadRequestException("Provide either multipart `file` or JSON `{ file_path }`");
  }
}
