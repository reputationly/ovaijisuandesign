import { createHash } from "node:crypto";
import { constants, copyFileSync, createReadStream, lstatSync, mkdirSync, openSync, realpathSync, statSync } from "node:fs";
import { mkdtemp, open, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { ArgumentsHost, BadRequestException, Catch, ConflictException, Controller, ExceptionFilter, Get, Inject, Injectable, NotFoundException, Param, Post, Req, Res, UnsupportedMediaTypeException, UseFilters } from "@nestjs/common";
import type { Request, Response } from "express";
import { fileTypeFromStream } from "file-type";
import multer from "multer";

import { FfmpegService } from "../edit/ffmpeg.service.js";
import { ProjectKernelError } from "../project-kernel/errors.js";
import { projectId } from "../project-kernel/composition.service.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";
import { CanvasV3ImagesService } from "./images.js";

const IMPORT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNSAFE_NAME = /[\u0000-\u001f\u007f/\\:]/;

type Inspected = { mediaKind: "video" | "audio"; mimeType: string; extension: string; duration: number; width: number; height: number };
type ResourceRead = {
  ok?: boolean;
  error?: { code?: string };
  detail?: {
    resource: { resourceId: string; name: string; kind: number; lifecycle: string; currentVersionId?: string; metadataRevision?: number };
    version: { resourceId: string; status: string; relativePath: string; parentVersionId: string | null } | null;
    metadata?: { media?: { mimeType?: string; durationSeconds?: number; width?: number; height?: number }; provenance?: { method?: string } };
  };
};

@Catch()
export class CanvasV3MediaHttpFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (response.destroyed || response.headersSent) return;
    let status = 500;
    if (error instanceof Error && "getStatus" in error && typeof error.getStatus === "function") status = error.getStatus();
    else if (error instanceof multer.MulterError) status = 400;
    else if (error instanceof ProjectKernelError) status = 409;
    response.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).status(status).json({
      statusCode: status,
      message: status === 415 ? "Unsupported media codec or container" : "Media operation unavailable",
    });
  }
}

@Injectable()
export class CanvasV3MediaService {
  constructor(
    @Inject(CanvasV3ImagesService) private readonly images: CanvasV3ImagesService,
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
    @Inject(FfmpegService) private readonly ffmpeg: FfmpegService,
  ) {}

  admit(): string {
    return this.images.admit();
  }

  /** 上传音视频并收进 store。同一导入号配上同一内容时交回原资源和版本。 */
  async importMedia(importId: string, name: string, file: string): Promise<Record<string, unknown>> {
    this.images.admit();
    if (!IMPORT_ID.test(importId)) throw new BadRequestException("Invalid import ID");
    const normalized = importId.toLowerCase();
    if (!name || name === "." || name === ".." || Buffer.byteLength(name) > 255 || UNSAFE_NAME.test(name)) throw new BadRequestException("Invalid media filename");
    const metadata = await inspectMedia(file, this.ffmpeg);
    const digest = await hashFile(file);
    const workspace = this.images.admit();
    const identity = createHash("sha256").update(normalized).update("\0").update(digest).digest("hex");
    const resourceId = projectId("resource", ["canvas-media", identity]);
    const versionId = projectId("version", ["canvas-media", normalized]);
    const relativePath = contentPath(versionId, metadata.extension);
    const kind = metadata.mediaKind === "video" ? 3 : 4;
    const created = this.resources.execute({
      commandId: `canvas-media-import:${normalized}:create`,
      actor: "human",
      command: { type: "resource.create", resourceId, payload: { kind, name } },
    }) as { committed?: boolean; result?: { name?: string } };
    if (!created.committed || !created.result?.name) throw new ConflictException("Media import conflict");
    const result = {
      importId: normalized,
      resourceId,
      versionId,
      name: created.result.name,
      mediaKind: metadata.mediaKind,
      mimeType: metadata.mimeType,
      duration: metadata.duration,
      ...(metadata.mediaKind === "video" ? { width: metadata.width, height: metadata.height } : {}),
    };
    const [existing] = this.resources.getResources([{ resourceId, versionId }]) as ResourceRead[];
    if (existing?.ok) {
      const version = existing.detail?.version;
      if (existing.detail?.resource.lifecycle !== "active" || version?.status !== "ready" || version.resourceId !== resourceId || version.relativePath !== relativePath) throw new ConflictException("Media import unavailable");
      if (!(await matches(path.join(workspace, relativePath), digest))) throw new ConflictException("Media import unavailable");
      this.record(versionId, metadata, path.join(workspace, relativePath));
      return result;
    }
    if (existing?.error?.code !== "VERSION_NOT_FOUND") throw new ConflictException("Media import unavailable");
    await publishFile(workspace, relativePath, file, digest);
    const updated = this.resources.execute({
      commandId: `canvas-media-import:${normalized}:version`,
      actor: "human",
      command: {
        type: "resource.update",
        resourceId,
        payload: { kind: "new_version", versionId, baseVersionId: null, relativePath, source: "import", disposition: "adopted", dependencies: [] },
      },
    }) as { committed?: boolean };
    if (!updated.committed) throw new ConflictException("Media import conflict");
    this.record(versionId, metadata, path.join(this.images.admit(), relativePath));
    return result;
  }

  async readImport(importId: string): Promise<Record<string, unknown>> {
    this.images.admit();
    if (!IMPORT_ID.test(importId)) throw new BadRequestException("Invalid import ID");
    const versionId = projectId("version", ["canvas-media", importId.toLowerCase()]);
    const owner = this.resources.findVersion(versionId);
    if (!owner) throw new NotFoundException("Media import has no committed version");
    const [entry] = this.resources.getResources([{ resourceId: owner.resourceId, versionId }]) as ResourceRead[];
    const version = entry?.detail?.version;
    const resource = entry?.detail?.resource;
    if (!entry?.ok || !resource || !version || resource.lifecycle !== "active" || version.status !== "ready" || (resource.kind !== 3 && resource.kind !== 4)) {
      throw new ConflictException("Imported media is unavailable");
    }
    const workspace = this.images.admit();
    const file = path.join(workspace, version.relativePath);
    const info = statSync(file);
    if (!info.isFile() || info.size === 0) throw new ConflictException("Imported media file is unavailable");
    let media = entry.detail?.metadata?.media;
    if (!media?.mimeType) {
      const metadata = await inspectMedia(file, this.ffmpeg);
      this.record(versionId, metadata, file);
      media = { mimeType: metadata.mimeType, durationSeconds: metadata.duration, ...(metadata.mediaKind === "video" ? { width: metadata.width, height: metadata.height } : {}) };
    }
    return {
      importId: importId.toLowerCase(),
      resourceId: resource.resourceId,
      versionId,
      name: resource.name,
      mediaKind: resource.kind === 3 ? "video" : "audio",
      mimeType: media.mimeType,
      ...(media.durationSeconds !== undefined ? { duration: media.durationSeconds } : {}),
      ...(media.width !== undefined ? { width: media.width } : {}),
      ...(media.height !== undefined ? { height: media.height } : {}),
      sizeBytes: info.size,
    };
  }

  private record(versionId: string, metadata: Inspected, file: string): void {
    const now = new Date().toISOString();
    const sizeBytes = statSync(file).size;
    this.resources.recordImportedVersion({
      versionId,
      media: {
        mimeType: metadata.mimeType,
        sizeBytes,
        ...(metadata.duration > 0 ? { durationSeconds: metadata.duration } : {}),
        ...(metadata.mediaKind === "video" ? { width: metadata.width, height: metadata.height } : {}),
      },
      createdAt: now,
      updatedAt: now,
    });
  }
}

@Controller("api/v3/canvas/media")
@UseFilters(CanvasV3MediaHttpFilter)
export class CanvasV3MediaController {
  constructor(@Inject(CanvasV3MediaService) private readonly media: CanvasV3MediaService) {}

  @Get(":importId")
  async readImport(@Param("importId") importId: string, @Res() response: Response) {
    const result = await this.media.readImport(importId);
    response.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).status(200).json(result);
  }

  @Post(":importId")
  async importMedia(@Param("importId") importId: string, @Req() request: Request, @Res() response: Response) {
    this.media.admit();
    if (!IMPORT_ID.test(importId)) throw new BadRequestException("Invalid import ID");
    const directory = await mkdtemp(path.join(os.tmpdir(), "canvas-v3-media-"));
    const upload = multer({ dest: directory, limits: { files: 1, fields: 0, parts: 1, fieldNameSize: 100 } }).single("file");
    try {
      await new Promise<void>((resolve, reject) => {
        upload(request, response, (error: unknown) => {
          if (error) reject(error instanceof multer.MulterError ? error : new BadRequestException("Invalid multipart upload"));
          else resolve();
        });
      });
      const uploaded = request.file;
      if (!uploaded) throw new BadRequestException("Missing media file");
      const rawName = uploaded.originalname;
      const utf8Name = Buffer.from(rawName, "latin1").toString("utf8");
      const name = Buffer.from(utf8Name, "utf8").equals(Buffer.from(rawName, "latin1")) ? utf8Name : rawName;
      const result = await this.media.importMedia(importId, name, uploaded.path);
      response.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).status(200).json(result);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}

async function inspectMedia(file: string, ffmpeg: FfmpegService): Promise<Inspected> {
  const detected = await fileTypeOf(file);
  const info = await ffmpeg.probeMedia(file);
  const video = info.width > 0 && info.height > 0;
  const audio = info.hasAudio;
  if (!detected || (!video && !audio)) throw new UnsupportedMediaTypeException("Unsupported media codec or container");
  const mediaKind = video ? "video" : "audio";
  const extension = detected.ext.toLowerCase();
  if (!/^[a-z0-9]{1,10}$/.test(extension)) throw new UnsupportedMediaTypeException("Unsupported media codec or container");
  return { mediaKind, mimeType: detected.mime, extension, duration: info.duration, width: info.width, height: info.height };
}

async function fileTypeOf(file: string) {
  const handle = await open(file, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    if (!(await handle.stat()).isFile()) return undefined;
    return await fileTypeFromStream(Readable.toWeb(handle.createReadStream({ autoClose: false })));
  } finally {
    await handle.close();
  }
}

function contentPath(versionId: string, extension: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(versionId)) throw new ConflictException("Media import conflict");
  return path.posix.join("store", `${versionId}.${extension}`);
}

function hashFile(file: string): Promise<string> {
  const hash = createHash("sha256");
  const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  return pipeline(createReadStream("", { fd, autoClose: true }), hash).then(() => hash.digest("hex"));
}

async function matches(file: string, digest: string): Promise<boolean> {
  try {
    if (!lstatSync(file).isFile()) return false;
  } catch {
    return false;
  }
  return (await hashFile(file)) === digest;
}

async function publishFile(workspace: string, relativePath: string, source: string, digest: string): Promise<void> {
  const dir = path.join(workspace, "store");
  mkdirSync(dir, { recursive: true });
  if (realpathSync(dir) !== dir) throw new ConflictException("Unsafe media destination");
  const destination = path.join(workspace, relativePath);
  if (!lstatExists(destination)) copyFileSync(source, destination, constants.COPYFILE_EXCL);
  if (!(await matches(destination, digest))) throw new ConflictException("Media import unavailable");
}

function lstatExists(file: string): boolean {
  try {
    return lstatSync(file).isFile();
  } catch {
    return false;
  }
}
