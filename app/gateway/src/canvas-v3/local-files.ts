import { createHash, randomUUID } from "node:crypto";
import { closeSync, constants, createReadStream, createWriteStream, fstatSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, realpathSync, unlinkSync } from "node:fs";
import { copyFile, mkdtemp, open, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { BadRequestException, Body, ConflictException, Controller, Get, Inject, Injectable, NotFoundException, Param, Post, Req, Res, UseFilters } from "@nestjs/common";
import type { Request, Response } from "express";
import { fileTypeFromStream } from "file-type";
import sharp from "sharp";

import { FfmpegService } from "../edit/ffmpeg.service.js";
import { projectId } from "../project-kernel/composition.service.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";
import { CanvasV3ImagesHttpFilter, CanvasV3ImagesService } from "./images.js";

const IMPORT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS = { image: 2, video: 3, audio: 4, text: 1, file: 5 } as const;
const MEDIA_EXTENSIONS: Record<string, "image" | "video" | "audio" | "text" | "file"> = {
  ".png": "image", ".jpg": "image", ".jpeg": "image", ".webp": "image", ".gif": "image", ".bmp": "image", ".svg": "image", ".heic": "image", ".heif": "image", ".avif": "image",
  ".mp4": "video", ".mov": "video", ".avi": "video", ".mkv": "video", ".webm": "video",
  ".mp3": "audio", ".wav": "audio", ".aac": "audio", ".flac": "audio", ".ogg": "audio", ".m4a": "audio",
};
const MIME: Record<string, string> = {
  ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".aac": "audio/aac", ".ogg": "audio/ogg", ".flac": "audio/flac",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp", ".svg": "image/svg+xml", ".heic": "image/heic", ".heif": "image/heif",
};

type MediaKind = "image" | "video" | "audio" | "text" | "file";
type VersionRow = { versionId: string; resourceId: string; status: string; relativePath: string; source: string };
type ResourceDetail = {
  resource: { resourceId: string; name: string; kind: number; lifecycle: string; currentVersionId?: string; metadataRevision?: number };
  version: VersionRow | null;
  dependencies: { resourceId: string; versionId: string; role: string }[];
  metadata?: { provenance?: { method?: string } };
};
type ResourceRead = { ok?: boolean; error?: { code?: string }; detail?: ResourceDetail };

@Injectable()
export class CanvasV3LocalFilesService {
  constructor(
    @Inject(CanvasV3ImagesService) private readonly images: CanvasV3ImagesService,
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
    @Inject(FfmpegService) private readonly ffmpeg: FfmpegService,
  ) {}

  /** 先把源文件收进 store，再登记资源和版本。同一导入号配上同一内容时直接交回原结果。 */
  async importFile(importId: string, absolutePath: unknown) {
    this.images.admit();
    if (!IMPORT_ID.test(importId)) throw new BadRequestException("Invalid import ID");
    const normalized = importId.toLowerCase();
    if (typeof absolutePath !== "string" || !path.isAbsolute(absolutePath) || absolutePath.includes("\0")) throw new BadRequestException("Invalid local path");
    const name = path.basename(absolutePath);
    const mediaKind = localImportKind(name);
    const extension = contentExtension(name);
    const staging = await mkdtemp(path.join(os.tmpdir(), "canvas-v3-local-file-"));
    try {
      const fileStat = await stat(absolutePath);
      if (!fileStat.isFile()) throw new BadRequestException("Not a regular file");
      const staged = path.join(staging, `original.${extension}`);
      await copyFile(absolutePath, staged, constants.COPYFILE_EXCL);
      const digest = await hashFile(staged);
      const resourceId = projectId("resource", ["canvas-local-file", normalized, digest, name]);
      const versionId = projectId("version", ["canvas-local-file", normalized]);
      const relativePath = contentPath(versionId, extension);
      const inspected: { mimeType?: string; width?: number; height?: number; durationSeconds?: number } | undefined = mediaKind === "image" ? await probeImage(staged) : mediaKind === "video" || mediaKind === "audio" ? await this.inspectMedia(staged, mediaKind) : undefined;
      const media = inspected && (mediaKind === "video" || mediaKind === "audio") ? {
        mimeType: inspected.mimeType,
        sizeBytes: fileStat.size,
        ...(inspected.durationSeconds !== undefined ? { durationSeconds: inspected.durationSeconds } : {}),
        ...(mediaKind === "video" && inspected.width ? { width: inspected.width, height: inspected.height } : {}),
      } : undefined;
      const result = { importId: normalized, mediaKind, resourceId, versionId, name, width: inspected?.width || 350, height: inspected?.height || 350 };
      this.images.admit();
      const created = this.resources.execute({
        commandId: `canvas-local-file:${normalized}:create`,
        actor: "human",
        command: { type: "resource.create", resourceId, payload: { kind: KINDS[mediaKind], name } },
      }) as { committed?: boolean };
      if (!created.committed) throw new ConflictException("Local file conflict");
      const [resource] = this.resources.getResources([{ resourceId }]) as ResourceRead[];
      const createdResource = resource?.detail?.resource;
      const fresh = createdResource?.lifecycle === "active" || (createdResource?.lifecycle === "missing" && !createdResource.currentVersionId && createdResource.metadataRevision === 1);
      if (!resource?.ok || !fresh) throw new ConflictException("Local file unavailable");
      const [existing] = this.resources.getResources([{ resourceId, versionId }]) as ResourceRead[];
      if (existing?.ok) {
        const version = existing.detail?.version;
        if (existing.detail?.resource.lifecycle !== "active" || version?.status !== "ready" || version.relativePath !== relativePath) throw new ConflictException("Local file unavailable");
        if (await hashFile(path.join(this.images.admit(), relativePath)) !== digest) throw new ConflictException("Local file changed");
        this.record(versionId, name, media);
        return result;
      }
      if (existing?.error?.code !== "VERSION_NOT_FOUND") throw new ConflictException("Local file unavailable");
      await publishLocal(this.images.admit(), relativePath, staged, digest);
      this.images.admit();
      const updated = this.resources.execute({
        commandId: `canvas-local-file:${normalized}:version`,
        actor: "human",
        command: {
          type: "resource.update",
          resourceId,
          payload: { kind: "new_version", versionId, baseVersionId: null, relativePath, source: "import", disposition: "adopted", dependencies: [] },
        },
      }) as { committed?: boolean };
      if (!updated.committed) throw new ConflictException("Local file conflict");
      this.record(versionId, name, media);
      return result;
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  }

  openPreview(resourceId: string, versionId: string): { fd: number; name: string; attachment: boolean; size: number; mimeType: string } {
    const workspace = this.images.admit();
    const [result] = this.resources.getResources([{ resourceId, versionId }]) as ResourceRead[];
    const version = result?.detail?.version;
    if (!result?.ok || !result.detail || result.detail.resource.lifecycle !== "active" || version?.status !== "ready" || version.resourceId !== resourceId || result.detail.metadata?.provenance?.method !== "local_file") {
      throw new NotFoundException();
    }
    this.assertLineage(workspace, result.detail);
    const relativePath = version.relativePath;
    let fd: number | undefined;
    try {
      this.images.admit();
      const absolute = path.join(workspace, relativePath);
      const before = lstatSync(absolute);
      fd = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      const opened = fstatSync(fd);
      if (!opened.isFile() || before.ino !== opened.ino || before.dev !== opened.dev || realpathSync(absolute) !== absolute) throw new Error("Unsafe preview");
      return {
        fd,
        name: result.detail.resource.name,
        attachment: result.detail.resource.kind === KINDS.file,
        size: opened.size,
        mimeType: MIME[path.extname(relativePath).toLowerCase()] ?? "application/octet-stream",
      };
    } catch (error) {
      if (fd !== undefined) closeSync(fd);
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException("Local file unavailable");
    }
  }

  private record(versionId: string, originalName: string, media?: Record<string, unknown>): void {
    const now = new Date().toISOString();
    this.resources.recordImportedVersion({
      versionId,
      ...(media ? { media } : {}),
      provenance: { method: "local_file", originalName },
      createdAt: now,
      updatedAt: now,
    });
  }

  private async inspectMedia(file: string, kind: "video" | "audio"): Promise<{ mimeType: string; width?: number; height?: number; durationSeconds?: number } | undefined> {
    try {
      const handle = await open(file, constants.O_RDONLY | constants.O_NONBLOCK);
      const detected = await fileTypeFromStream(Readable.toWeb(handle.createReadStream({ autoClose: false }))).finally(() => handle.close());
      const info = await this.ffmpeg.probeMedia(file);
      if (!detected?.mime && info.duration === 0 && info.width === 0) return undefined;
      return {
        mimeType: detected?.mime ?? (kind === "video" ? "video/mp4" : "audio/mpeg"),
        ...(info.duration > 0 ? { durationSeconds: info.duration } : {}),
        ...(kind === "video" && info.width > 0 && info.height > 0 ? { width: info.width, height: info.height } : {}),
      };
    } catch {
      return undefined;
    }
  }

  /** 复制件必须是这次导入的旁路文件，不能凭文件名里带 _copy 就放行。 */
  private assertLineage(workspace: string, detail: ResourceDetail): void {
    const seen = new Set<string>();
    let current = detail;
    while (current.version?.source === "copy") {
      const version = current.version;
      if (seen.has(version.versionId)) throw new NotFoundException();
      seen.add(version.versionId);
      const [dependency] = current.dependencies;
      if (current.dependencies.length !== 1 || dependency?.role !== "source") throw new NotFoundException();
      const [source] = this.resources.getResources([{ resourceId: dependency.resourceId, versionId: dependency.versionId }]) as ResourceRead[];
      if (!source?.ok || !source.detail?.version) throw new NotFoundException();
      const sourceName = path.posix.parse(source.detail.version.relativePath).name;
      const suffix = path.posix.parse(version.relativePath).name.slice(sourceName.length);
      const match = /^_copy(?:_([2-9]|[1-9][0-9]{1,3}|10000))?$/.exec(suffix);
      const copyNumber = Number(match?.[1] ?? 1);
      const expected = path.relative(workspace, path.join(workspace, copiedRelativePath(source.detail.version.relativePath, copyNumber))).split(path.sep).join("/");
      if (!match || version.relativePath !== expected) throw new NotFoundException();
      current = source.detail;
    }
    const version = current.version;
    if (!version || version.source !== "import" || current.metadata?.provenance?.method !== "local_file") throw new NotFoundException();
    const filename = version.relativePath.startsWith("store/") ? version.relativePath.slice("store/".length) : "";
    const chatUpload = current.resource.resourceId === projectId("resource", ["chat-upload", version.relativePath]) && version.versionId === projectId("version", ["chat-upload", version.relativePath]);
    if (!chatUpload && !(filename && !filename.includes("/") && path.posix.parse(version.relativePath).name === version.versionId)) throw new NotFoundException();
  }
}

@Controller("api/v3/canvas/local-files")
@UseFilters(CanvasV3ImagesHttpFilter)
export class CanvasV3LocalFilesController {
  constructor(@Inject(CanvasV3LocalFilesService) private readonly files: CanvasV3LocalFilesService) {}

  @Post(":importId")
  importFile(@Param("importId") importId: string, @Body() body: { absolutePath?: unknown }) {
    return this.files.importFile(importId, body?.absolutePath);
  }

  @Get(":resourceId/:versionId")
  preview(@Param("resourceId") resourceId: string, @Param("versionId") versionId: string, @Req() request: Request, @Res() response: Response) {
    return sendOriginalFile(this.files, resourceId, versionId, request, response);
  }
}

export async function sendOriginalFile(files: CanvasV3LocalFilesService, resourceId: string, versionId: string, request: Request, response: Response): Promise<void> {
  let fd: number | undefined;
  try {
    const file = files.openPreview(resourceId, versionId);
    fd = file.fd;
    response.set({
      "Content-Type": file.mimeType,
      "Content-Length": String(file.size),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Accept-Ranges": "bytes",
    });
    if (file.attachment || request.query.download === "1") {
      response.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g, "%27")}`);
    }
    const range = request.headers.range ? request.range(file.size) : undefined;
    if (range && (typeof range === "number" || range.type !== "bytes" || range.length !== 1)) {
      response.status(416).set("Content-Range", `bytes */${file.size}`).removeHeader("Content-Length");
      response.end();
      return;
    }
    const start = Array.isArray(range) ? range[0]?.start ?? 0 : 0;
    const end = Array.isArray(range) ? range[0]?.end ?? file.size - 1 : file.size - 1;
    if (range) response.status(206).set({ "Content-Range": `bytes ${start}-${end}/${file.size}`, "Content-Length": String(end - start + 1) });
    if (request.method === "HEAD" || file.size === 0) {
      response.end();
      return;
    }
    const stream = createReadStream("", { fd, autoClose: true, start, end });
    fd = undefined;
    await pipeline(stream, response);
  } catch (error) {
    if (response.headersSent || response.destroyed) response.destroy();
    else throw error;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function localImportKind(name: string): MediaKind {
  const dot = name.lastIndexOf(".");
  const extension = dot >= 0 ? name.slice(dot).toLowerCase() : "";
  const classified = MEDIA_EXTENSIONS[extension];
  if (classified === "image" || classified === "video" || classified === "audio") return classified;
  return extension === ".md" || extension === ".txt" ? "text" : "file";
}

function contentExtension(fileName: string): string {
  const extension = path.posix.extname(fileName).slice(1).toLowerCase();
  return /^[a-z0-9]{1,10}$/.test(extension) ? extension : "bin";
}

function contentPath(versionId: string, extension: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(versionId) || !/^[a-z0-9]{1,10}$/.test(extension)) throw new ConflictException("Local file conflict");
  return path.posix.join("store", `${versionId}.${extension}`);
}

function copiedRelativePath(sourceRelative: string, copyNumber: number): string {
  const parsed = path.posix.parse(sourceRelative);
  const suffix = copyNumber === 1 ? "_copy" : `_copy_${copyNumber}`;
  return path.posix.join(parsed.dir, `${parsed.name}${suffix}${parsed.ext}`);
}

function hashFile(file: string): Promise<string> {
  const hash = createHash("sha256");
  const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  return pipeline(createReadStream("", { fd, autoClose: true }), hash).then(() => hash.digest("hex"));
}

async function probeImage(file: string): Promise<{ width?: number; height?: number } | undefined> {
  try {
    const metadata = await sharp(file, { limitInputPixels: 64_000_000, failOn: "warning" }).metadata();
    if (!metadata.width || !metadata.height) return undefined;
    return { width: metadata.width, height: metadata.height };
  } catch {
    return undefined;
  }
}

async function publishLocal(workspace: string, relativePath: string, source: string, digest: string): Promise<void> {
  if (!relativePath.startsWith("store/") || relativePath.split("/").some((part) => !part || part === "." || part === "..")) throw new ConflictException("Unsafe media destination");
  const dir = path.join(workspace, "store");
  mkdirSync(dir, { recursive: true });
  if (!lstatSync(dir).isDirectory() || realpathSync(dir) !== dir) throw new ConflictException("Unsafe media destination");
  const destination = path.join(workspace, relativePath);
  try {
    lstatSync(destination);
    if (await hashFile(destination) !== digest) throw new ConflictException("Media content conflict");
    return;
  } catch (error) {
    if (error instanceof ConflictException) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const temporary = path.join(dir, `.pending-${randomUUID()}`);
  const fd = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    await pipeline(createReadStream(source), createWriteStream("", { fd, autoClose: false }));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  try {
    linkSync(temporary, destination);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  } finally {
    try {
      unlinkSync(temporary);
    } catch {
      // 临时文件已经链到目标时，清掉失败不影响已发布的内容。
    }
  }
  if (await hashFile(destination) !== digest) throw new ConflictException("Media content conflict");
}
