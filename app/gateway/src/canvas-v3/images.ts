import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  createReadStream,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import {
  BadRequestException,
  Catch,
  ConflictException,
  Controller,
  ForbiddenException,
  type ArgumentsHost,
  type ExceptionFilter,
  Inject,
  Injectable,
  NotFoundException,
  Param,
  PayloadTooLargeException,
  Post,
  Get,
  Query,
  Req,
  Res,
  UseFilters,
} from "@nestjs/common";
import type { Request, Response } from "express";
import multer from "multer";
import sharp from "sharp";

import { projectId } from "../project-kernel/composition.service.js";
import { ProjectKernelError } from "../project-kernel/errors.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";
import { WorkspaceProjectArchitectureService } from "./workspace-project-architecture.service.js";

const MAX_IMAGE_BYTES = 32 * 1024 * 1024;
const MAX_SOURCE_IMAGE_BYTES = 256 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 100_000_000;
const DISPLAY_EDGE = 4096;
const DISPLAY_CACHE_SIZE = 4;
const UNSAFE_IDENTIFIER = /[\u0000-\u001f\u007f/\\]/;
const DOWNLOAD_EXTENSIONS: Record<string, string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "image/avif": ["avif"],
  "image/bmp": ["bmp"],
  "image/tiff": ["tiff", "tif"],
};

type ImageInfo = { mimeType: string; width: number; height: number; extension: string };
type DisplayImage = { bytes: Buffer; mimeType: string; width: number; height: number };
type VersionTarget = { resourceId: string; baseVersionId: string; createResource?: true };
type ResourceRead = {
  ok?: boolean;
  error?: { code?: string };
  detail?: {
    resource: { kind: number; lifecycle: string; name: string };
    version: { resourceId: string; status: string; relativePath: string; parentVersionId: string | null } | null;
  };
};

function sniffImageFormat(bytes: Buffer): "jpeg" | "png" | "gif" | "webp" {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (bytes.subarray(0, 6).toString("ascii") === "GIF87a" || bytes.subarray(0, 6).toString("ascii") === "GIF89a") return "gif";
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  throw new BadRequestException("Unsupported image content");
}

async function inspectImage(bytes: Buffer): Promise<ImageInfo> {
  if (bytes.length > MAX_IMAGE_BYTES) throw new PayloadTooLargeException("Image exceeds 32 MiB");
  if (!bytes.length) throw new BadRequestException("Invalid image size");
  const format = sniffImageFormat(bytes);
  try {
    const image = sharp(bytes, { animated: true, limitInputPixels: MAX_IMAGE_PIXELS, failOn: "warning" });
    const metadata = await image.metadata();
    const width = metadata.width;
    const height = metadata.pageHeight ?? metadata.height;
    if (metadata.format !== format || !width || !height || width * height * (metadata.pages ?? 1) > MAX_IMAGE_PIXELS) throw new Error("Invalid dimensions");
    await image.resize({ width: 1, height: 1, fit: "fill" }).raw().toBuffer();
    const rotated = metadata.orientation !== undefined && metadata.orientation >= 5;
    return { mimeType: `image/${format}`, width: rotated ? height : width, height: rotated ? width : height, extension: format === "jpeg" ? "jpg" : format };
  } catch (error) {
    if (error instanceof PayloadTooLargeException || error instanceof BadRequestException) throw error;
    throw new BadRequestException("Invalid image content");
  }
}

function assertStoredFile(workspace: string, relativePath: string): void {
  if (!relativePath || relativePath.includes("\0") || relativePath.includes("\\") || relativePath.includes(":") || path.posix.isAbsolute(relativePath) || relativePath.split("/").some((part) => !part || part === "." || part === "..") || relativePath.split("/")[0] === ".hilo") {
    throw new Error("Unsafe content");
  }
  let current = workspace;
  const parts = relativePath.split("/");
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index] ?? "");
    const stat = lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error("Unsafe content");
    if (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory()) throw new Error("Unsafe content");
  }
}

function openChecked(workspace: string, relativePath: string, maxBytes: number): number {
  assertStoredFile(workspace, relativePath);
  const absolute = path.join(workspace, relativePath);
  const before = lstatSync(absolute);
  const fd = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  const opened = fstatSync(fd);
  if (!opened.isFile() || opened.ino !== before.ino || opened.dev !== before.dev || opened.size <= 0 || opened.size > maxBytes || realpathSync(absolute) !== absolute) {
    closeSync(fd);
    throw new Error("Unsafe content");
  }
  return fd;
}

function sniffVideo(header: Buffer): "mp4" | "mov" | "webm" | undefined {
  const atom = header.subarray(4, 8).toString("ascii");
  if (atom === "ftyp") return header.subarray(8, 12).toString("ascii") === "qt  " ? "mov" : "mp4";
  if (["moov", "mdat", "wide", "free", "skip", "pnot"].includes(atom)) return "mov";
  if (header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return "webm";
  return undefined;
}

function openVideo(workspace: string, relativePath: string): { fd: number; size: number; mimeType: string } {
  let fd: number | undefined;
  try {
    assertStoredFile(workspace, relativePath);
    const absolute = path.join(workspace, relativePath);
    const before = lstatSync(absolute);
    fd = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.ino !== before.ino || opened.dev !== before.dev || !Number.isSafeInteger(opened.size) || opened.size < 12 || realpathSync(absolute) !== absolute) throw new Error("Unsafe video");
    const header = Buffer.alloc(12);
    readSync(fd, header, 0, header.length, 0);
    const container = sniffVideo(header);
    const mimeType = container === "mov" ? "video/quicktime" : container ? `video/${container}` : undefined;
    if (!mimeType) throw new Error("Unsupported video");
    const result = { fd, size: opened.size, mimeType };
    fd = undefined;
    return result;
  } catch {
    if (fd !== undefined) closeSync(fd);
    throw new NotFoundException("Video unavailable");
  }
}

function readImageFile(workspace: string, relativePath: string, maxBytes = MAX_IMAGE_BYTES): Buffer {
  let fd: number | undefined;
  try {
    fd = openChecked(workspace, relativePath, maxBytes);
    const opened = fstatSync(fd);
    const bytes = Buffer.alloc(opened.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (!count) throw new Error("Content changed");
      offset += count;
    }
    const after = fstatSync(fd);
    const absolute = path.join(workspace, relativePath);
    assertStoredFile(workspace, relativePath);
    const current = lstatSync(absolute);
    if (after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || current.ino !== opened.ino || current.dev !== opened.dev || realpathSync(absolute) !== absolute) throw new Error("Content changed");
    return bytes;
  } catch (error) {
    if (error instanceof NotFoundException) throw error;
    throw new NotFoundException("Image content unavailable");
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function syncDirectory(directory: string): void {
  if (process.platform === "win32") return;
  const fd = openSync(directory, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function ensureDirectory(workspace: string, relativeDir: string): string {
  let current = workspace;
  for (const part of relativeDir.split("/")) {
    const parent = current;
    current = path.join(current, part);
    let created = false;
    try {
      mkdirSync(current, { mode: 0o700 });
      created = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const stat = lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync(current) !== current) throw new ConflictException("Unsafe image destination");
    if (created) syncDirectory(parent);
  }
  return current;
}

/** 先写到临时文件再硬链接到目标，避免读到写了一半的图片。 */
function publishImage(workspace: string, relativePath: string, bytes: Buffer): void {
  if (!relativePath || relativePath.includes("\\") || relativePath.includes(":") || relativePath.includes("\0") || relativePath.split("/").some((part) => !part || part === "." || part === "..") || relativePath.split("/")[0] === ".hilo") {
    throw new ConflictException("Unsafe image destination");
  }
  const relativeDir = path.posix.dirname(relativePath);
  const dir = ensureDirectory(workspace, relativeDir);
  const destination = path.join(workspace, relativePath);
  const matches = () => {
    if (!readImageFile(workspace, relativePath).equals(bytes)) throw new ConflictException("Image import content conflict");
  };
  try {
    lstatSync(destination);
    matches();
    return;
  } catch (error) {
    if (error instanceof ConflictException) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const temporary = path.join(dir, `.pending-${randomUUID()}`);
  let fd: number | undefined;
  let owned: { dev: number; ino: number } | undefined;
  const cleanup = () => {
    if (!owned || realpathSync(dir) !== dir) return;
    const current = lstatSync(temporary);
    if (!current.isSymbolicLink() && current.dev === owned.dev && current.ino === owned.ino) unlinkSync(temporary);
  };
  try {
    fd = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    owned = fstatSync(fd);
    writeFileSync(fd, bytes);
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    ensureDirectory(workspace, relativeDir);
    assertStoredFile(workspace, `${relativeDir}/${path.basename(temporary)}`);
    const staged = lstatSync(temporary);
    if (staged.ino !== owned.ino || staged.dev !== owned.dev) throw new ConflictException("Image staging file changed");
    try {
      linkSync(temporary, destination);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    cleanup();
    owned = undefined;
    matches();
    syncDirectory(dir);
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (owned) cleanup();
  }
}

function contentPath(versionId: string, extension: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(versionId) || !/^[a-z0-9]{1,10}$/.test(extension)) throw new Error("Invalid Resource content identity");
  return path.posix.join("store", `${versionId}.${extension}`);
}

@Catch()
export class CanvasV3ImagesHttpFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    let status = 500;
    if (error instanceof Error && "getStatus" in error && typeof error.getStatus === "function") status = error.getStatus();
    else if (error instanceof multer.MulterError) status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    else if (error instanceof ProjectKernelError) status = 409;
    const messages: Record<number, string> = {
      400: "Invalid image request",
      403: "Canvas image API unavailable",
      404: "Image unavailable",
      409: "Image import conflict",
      413: "Image exceeds 32 MiB",
    };
    host.switchToHttp().getResponse<Response>().set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).status(status).json({
      statusCode: status,
      message: messages[status] ?? "Image operation failed",
    });
  }
}

@Injectable()
export class CanvasV3ImagesService {
  private readonly configuredWorkspace = process.env.WORKSPACE_DIR;
  private workspace?: { path: string; dev: number; ino: number };
  private readonly displayImages = new Map<string, Promise<DisplayImage>>();

  constructor(
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
    @Inject(WorkspaceProjectArchitectureService) private readonly architecture: WorkspaceProjectArchitectureService,
  ) {
    try {
      this.architecture.assertV3();
      const root = realpathSync(this.configuredWorkspace ?? "");
      const stat = statSync(root);
      if (stat.isDirectory()) this.workspace = { path: root, dev: stat.dev, ino: stat.ino };
    } catch {
      this.workspace = undefined;
    }
  }

  /** 每次读盘前再确认工作区没有被换掉，避免把字节写进另一个项目。 */
  admit(): string {
    try {
      this.architecture.assertV3();
      if (!this.configuredWorkspace || process.env.WORKSPACE_DIR !== this.configuredWorkspace) throw new Error("Workspace changed");
      const workspace = realpathSync(this.configuredWorkspace);
      const stat = statSync(workspace);
      if (!this.workspace || this.workspace.path !== workspace || !stat.isDirectory() || stat.dev !== this.workspace.dev || stat.ino !== this.workspace.ino) throw new Error("Workspace changed");
      return workspace;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new ForbiddenException("Canvas image API unavailable");
    }
  }

  async importImage(importId: string, name: string, bytes: Buffer, target?: VersionTarget) {
    this.admit();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(importId)) throw new BadRequestException("Invalid image import ID");
    const normalized = importId.toLowerCase();
    if (!name || name === "." || name === ".." || Buffer.byteLength(name, "utf8") > 255 || name.includes(":") || UNSAFE_IDENTIFIER.test(name)) throw new BadRequestException("Invalid image filename");
    const inspected = await inspectImage(bytes);
    const workspace = this.admit();
    const identity = createHash("sha256").update(normalized).update("\0").update(bytes).update(target?.createResource ? JSON.stringify(target) : "").digest("hex");
    const resourceId = target && !target.createResource ? target.resourceId : projectId("resource", ["canvas-image", identity]);
    const versionId = projectId("version", ["canvas-image", normalized]);
    const relativePath = contentPath(versionId, inspected.extension);
    let importedName = name;
    if (target) {
      const [base] = this.resources.getResources([{ resourceId: target.resourceId, versionId: target.baseVersionId }]) as ResourceRead[];
      if (!base?.ok || (!target.createResource && base.detail?.resource.kind !== 2) || base.detail?.resource.lifecycle !== "active" || base.detail.version?.status !== "ready") {
        throw new ConflictException("Image version target unavailable");
      }
    }
    if (!target || target.createResource) {
      const created = this.resources.execute({
        commandId: `canvas-image-import:${normalized}:create`,
        actor: "human",
        command: { type: "resource.create", resourceId, payload: { kind: 2, name } },
      }) as { committed?: boolean; result?: { name?: string } };
      if (!created.committed || !created.result?.name) throw new ConflictException("Image import conflict");
      importedName = created.result.name;
    }
    this.admit();
    const [existing] = this.resources.getResources([{ resourceId, versionId }]) as ResourceRead[];
    if (existing?.ok) {
      const version = existing.detail?.version;
      if (existing.detail?.resource.lifecycle !== "active" || version?.status !== "ready" || version.relativePath !== relativePath || (target && !target.createResource && version.parentVersionId !== target.baseVersionId) || !readImageFile(workspace, relativePath).equals(bytes)) {
        throw new ConflictException("Image import unavailable");
      }
      return { importId: normalized, resourceId, versionId, name: importedName, mimeType: inspected.mimeType, width: inspected.width, height: inspected.height };
    }
    if (existing?.error?.code !== "VERSION_NOT_FOUND") throw new ConflictException("Image import unavailable");
    publishImage(workspace, relativePath, bytes);
    const updated = this.resources.execute({
      commandId: `canvas-image-import:${normalized}:version`,
      actor: "human",
      command: {
        type: "resource.update",
        resourceId,
        payload: {
          kind: "new_version",
          versionId,
          ...(target && !target.createResource ? { baseVersionId: target.baseVersionId, disposition: "candidate" } : { baseVersionId: null, disposition: "adopted" }),
          relativePath,
          source: "import",
          dependencies: target ? [{ resourceId: target.resourceId, versionId: target.baseVersionId, role: "source", inputIndex: 0 }] : [],
        },
      },
    }) as { committed?: boolean };
    if (!updated.committed) throw new ConflictException("Image import conflict");
    return { importId: normalized, resourceId, versionId, name: importedName, mimeType: inspected.mimeType, width: inspected.width, height: inspected.height };
  }

  async readImage(resourceId: string, versionId: string) {
    const resolved = this.resolveImage(resourceId, versionId);
    const before = resolved.fileStat();
    let bytes: Buffer;
    let metadata: { mimeType: string; width: number; height: number };
    const rendition = before.size > MAX_IMAGE_BYTES;
    try {
      if (rendition) {
        const display = await this.displayImage(resolved.workspace, resolved.relativePath, before);
        bytes = display.bytes;
        metadata = display;
      } else {
        bytes = readImageFile(resolved.workspace, resolved.relativePath);
        metadata = await inspectImage(bytes);
      }
    } catch (error) {
      if (error instanceof PayloadTooLargeException) throw error;
      throw new NotFoundException("Image content unavailable");
    }
    this.admit();
    const after = resolved.fileStat();
    if (["dev", "ino", "size", "mtimeMs"].some((key) => before[key as "dev"] !== after[key as "dev"])) throw new NotFoundException("Image content changed");
    return { bytes, mimeType: metadata.mimeType, name: resolved.name, width: metadata.width, height: metadata.height, rendition };
  }

  openOversizedOriginal(resourceId: string, versionId: string): { fd: number; size: number; mimeType: string; name: string } | null {
    const resolved = this.resolveImage(resourceId, versionId);
    if (resolved.fileStat().size <= MAX_IMAGE_BYTES) return null;
    let fd: number | undefined;
    try {
      fd = openChecked(resolved.workspace, resolved.relativePath, MAX_SOURCE_IMAGE_BYTES);
      const opened = fstatSync(fd);
      const header = Buffer.alloc(12);
      readSync(fd, header, 0, header.length, 0);
      const format = sniffImageFormat(header);
      const result = { fd, size: opened.size, mimeType: `image/${format}`, name: resolved.name };
      fd = undefined;
      return result;
    } catch {
      throw new NotFoundException("Image content unavailable");
    } finally {
      if (fd !== undefined) closeSync(fd);
    }
  }

  /** 只按资源版本打开视频，调用方不能指定磁盘路径。容器类型看文件头，不看扩展名。 */
  readVideo(resourceId: string, versionId: string): { fd: number; size: number; mimeType: string } {
    this.admit();
    if (![resourceId, versionId].every((id) => typeof id === "string" && id.length > 0 && id.length <= 256 && !UNSAFE_IDENTIFIER.test(id))) throw new BadRequestException("Invalid video identifier");
    const [result] = this.resources.getResources([{ resourceId, versionId }]) as ResourceRead[];
    const version = result?.detail?.version;
    if (!result?.ok || result.detail?.resource.kind !== 3 || result.detail.resource.lifecycle !== "active" || version?.status !== "ready" || version.resourceId !== resourceId) {
      throw new NotFoundException("Video unavailable");
    }
    const workspace = this.admit();
    return openVideo(workspace, version.relativePath);
  }

  private resolveImage(resourceId: string, versionId: string) {
    this.admit();
    if (![resourceId, versionId].every((id) => typeof id === "string" && id.length > 0 && id.length <= 256 && !UNSAFE_IDENTIFIER.test(id))) throw new BadRequestException("Invalid image identifier");
    const [result] = this.resources.getResources([{ resourceId, versionId }]) as ResourceRead[];
    const version = result?.detail?.version;
    if (!result?.ok || result.detail?.resource.kind !== 2 || result.detail.resource.lifecycle !== "active" || version?.status !== "ready" || version.resourceId !== resourceId) {
      throw new NotFoundException("Image unavailable");
    }
    const workspace = this.admit();
    const relativePath = version.relativePath;
    const absolute = path.join(workspace, relativePath);
    const fileStat = () => {
      try {
        assertStoredFile(workspace, relativePath);
        return lstatSync(absolute);
      } catch {
        throw new NotFoundException("Image content unavailable");
      }
    };
    return { name: result.detail?.resource.name ?? "", workspace, relativePath, fileStat };
  }

  private displayImage(workspace: string, relativePath: string, stat: { dev: number; ino: number; size: number; mtimeMs: number; ctimeMs: number }): Promise<DisplayImage> {
    const key = [relativePath, stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs].join(":");
    const cached = this.displayImages.get(key);
    if (cached) {
      this.displayImages.delete(key);
      this.displayImages.set(key, cached);
      return cached;
    }
    const pending = renderDisplayImage(readImageFile(workspace, relativePath, MAX_SOURCE_IMAGE_BYTES));
    this.displayImages.set(key, pending);
    void pending.catch(() => {
      if (this.displayImages.get(key) === pending) this.displayImages.delete(key);
    });
    while (this.displayImages.size > DISPLAY_CACHE_SIZE) {
      const oldest = this.displayImages.keys().next().value;
      if (oldest === undefined) break;
      this.displayImages.delete(oldest);
    }
    return pending;
  }
}

async function renderDisplayImage(bytes: Buffer): Promise<DisplayImage> {
  if (!bytes.length || bytes.length > MAX_SOURCE_IMAGE_BYTES) throw new BadRequestException("Invalid image size");
  const format = sniffImageFormat(bytes);
  try {
    const source = sharp(bytes, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: "warning" });
    const metadata = await source.metadata();
    const width = metadata.width;
    const height = metadata.pageHeight ?? metadata.height;
    if (metadata.format !== format || !width || !height || width * height > MAX_IMAGE_PIXELS) throw new Error("Invalid dimensions");
    const output = await source.rotate().resize({ width: DISPLAY_EDGE, height: DISPLAY_EDGE, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
    if (!output.length || output.length > MAX_IMAGE_BYTES) throw new Error("Rendition too large");
    const rotated = metadata.orientation !== undefined && metadata.orientation >= 5;
    return { bytes: output, mimeType: "image/webp", width: rotated ? height : width, height: rotated ? width : height };
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException("Invalid image content");
  }
}

function encodeName(name: string): string {
  return encodeURIComponent(name.replace(/[\u0000-\u001f\u007f/\\]/g, "_")).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function downloadName(name: string, mimeType: string): { name: string; extension?: string } {
  const extensions = DOWNLOAD_EXTENSIONS[mimeType.split(";")[0]?.trim().toLowerCase() ?? ""];
  if (!extensions) return { name };
  const extension = extensions[0];
  const current = /\.([a-z0-9]{1,8})$/i.exec(name)?.[1]?.toLowerCase();
  return { name: current && extensions.includes(current) ? name : `${name}.${extension}`, extension };
}

@Controller("api/v3/canvas/images")
@UseFilters(CanvasV3ImagesHttpFilter)
export class CanvasV3ImagesController {
  private readonly multipart = multer({
    storage: multer.memoryStorage(),
    preservePath: true,
    limits: { fileSize: MAX_IMAGE_BYTES + 1, files: 1, fields: 0, parts: 1, fieldNameSize: 100 },
  }).single("file");

  constructor(@Inject(CanvasV3ImagesService) private readonly images: CanvasV3ImagesService) {}

  @Post(":importId")
  async importImage(@Param("importId") importId: string, @Query("resourceId") resourceId: string | undefined, @Query("baseVersionId") baseVersionId: string | undefined, @Query("createResource") createResource: string | undefined, @Req() request: Request, @Res() response: Response) {
    this.images.admit();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(importId)) throw new BadRequestException("Invalid image import ID");
    let target: VersionTarget | undefined;
    if (resourceId !== undefined || baseVersionId !== undefined || createResource !== undefined) {
      if (createResource !== undefined && createResource !== "true") throw new BadRequestException("Invalid image version target");
      if (!resourceId?.trim() || !baseVersionId?.trim() || resourceId.length > 256 || baseVersionId.length > 256) throw new BadRequestException("Invalid image version target");
      target = { resourceId, baseVersionId, ...(createResource === "true" ? { createResource: true as const } : {}) };
    }
    await new Promise<void>((resolve, reject) => {
      const aborted = () => reject(new BadRequestException("Upload aborted"));
      request.once("aborted", aborted);
      this.multipart(request, response, (error: unknown) => {
        request.off("aborted", aborted);
        if (error) reject(error instanceof multer.MulterError ? error : new BadRequestException("Invalid multipart upload"));
        else resolve();
      });
    });
    const uploaded = request.file;
    if (!uploaded) throw new BadRequestException("Missing image file");
    const rawName = uploaded.originalname;
    const utf8Name = Buffer.from(rawName, "latin1").toString("utf8");
    const name = Buffer.from(utf8Name, "utf8").equals(Buffer.from(rawName, "latin1")) ? utf8Name : rawName;
    const result = await this.images.importImage(importId, name, uploaded.buffer, target);
    response.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).status(200).json(result);
  }

  @Get(":resourceId/:versionId")
  readImage(@Param("resourceId") resourceId: string, @Param("versionId") versionId: string, @Query("download") download: string | undefined, @Res() response: Response) {
    return sendCanvasImage(this.images, resourceId, versionId, download, response);
  }
}

export async function sendCanvasImage(images: CanvasV3ImagesService, resourceId: string, versionId: string, download: string | undefined, response: Response) {
    if (download === "1") {
      const original = images.openOversizedOriginal(resourceId, versionId);
      if (original) {
        let fd: number | undefined = original.fd;
        try {
          response.set({
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Type": original.mimeType,
            "Content-Length": String(original.size),
            "Content-Disposition": attachment(original.name, original.mimeType),
          });
          response.status(200);
          if (response.req.method === "HEAD") {
            response.end();
            return;
          }
          const stream = createReadStream("", { fd, autoClose: true, start: 0 });
          fd = undefined;
          await pipeline(stream, response);
        } catch (error) {
          if (response.headersSent || response.destroyed) response.destroy();
          else throw error;
        } finally {
          if (fd !== undefined) closeSync(fd);
        }
        return;
      }
    }
    const image = await images.readImage(resourceId, versionId);
    if (download === "1" && image.rendition) throw new PayloadTooLargeException();
    response.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Type": image.mimeType,
      "X-Image-Width": String(image.width),
      "X-Image-Height": String(image.height),
      "Access-Control-Expose-Headers": "X-Image-Width, X-Image-Height",
      "Content-Disposition": download === "1" ? attachment(image.name, image.mimeType) : `inline; filename="image"; filename*=UTF-8''${encodeName(image.name)}`,
    }).status(200).send(image.bytes);
}

function attachment(name: string, mimeType: string): string {
  const file = downloadName(name, mimeType);
  const fallback = file.extension ? `image.${file.extension}` : "image";
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeName(file.name)}`;
}
