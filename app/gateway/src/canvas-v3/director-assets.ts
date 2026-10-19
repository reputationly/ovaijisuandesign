import { constants, lstatSync, realpathSync } from "node:fs";
import { copyFile, lstat, mkdir, mkdtemp, open, readFile, rename, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createGunzip } from "node:zlib";

import { ArgumentsHost, BadRequestException, Catch, ConflictException, Controller, ExceptionFilter, Get, Inject, Injectable, NotFoundException, Param, PayloadTooLargeException, Post, Req, Res, UseFilters } from "@nestjs/common";
import type { Request, Response } from "express";
import multer from "multer";

import { CanvasV3ImagesService } from "./images.js";

const IMPORT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FILE_LIMIT = 128 * 1024 * 1024;
const BODY_LIMIT = 256 * 1024 * 1024;
const ROOTS = new Set([".glb", ".gltf", ".ply", ".spz"]);
const TYPES: Record<string, string> = {
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".ply": "application/octet-stream",
  ".spz": "application/octet-stream",
  ".bin": "application/octet-stream",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ktx2": "image/ktx2",
};

type Uploaded = { path: string; size: number; originalname: string };

@Catch()
export class DirectorAssetsHttpFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent || response.destroyed) return;
    let status = 500;
    if (error instanceof Error && "getStatus" in error && typeof error.getStatus === "function") status = error.getStatus();
    else if (error instanceof multer.MulterError) status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const messages: Record<number, string> = {
      400: "Invalid director asset or bundle",
      403: "Director assets unavailable",
      404: "Director asset not found",
      409: "Director asset upload conflict",
      413: "Director asset exceeds upload limit",
    };
    response.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).status(status).json({
      statusCode: status,
      message: messages[status] ?? "Director asset operation failed",
    });
  }
}

@Injectable()
export class CanvasV3DirectorAssetsService {
  private busy = false;

  constructor(@Inject(CanvasV3ImagesService) private readonly images: CanvasV3ImagesService) {}

  /** 一次只收一套模型。重复的编号直接拒绝，避免两套文件叠在同一个目录里。 */
  async upload<T>(id: string, task: () => Promise<T>): Promise<T> {
    this.admit(id);
    if (this.busy) throw new ConflictException("Director upload in progress");
    this.busy = true;
    try {
      return await task();
    } finally {
      this.busy = false;
    }
  }

  async publish(id: string, files: Uploaded[], paths: unknown, entry: unknown) {
    const workspace = this.admit(id);
    const assetId = id.toLowerCase();
    if (!files.length || files.length > 64) invalid();
    let names = paths === undefined ? files.map((file) => fileName(file.originalname)) : parsePaths(paths, files.length);
    names = names.map(safePath);
    if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) invalid();
    const selected = safePath(entry ?? (files.length === 1 ? names[0] : undefined));
    if (!names.includes(selected) || !ROOTS.has(path.extname(selected).toLowerCase())) invalid();
    if (files.reduce((sum, file) => sum + file.size, 0) > BODY_LIMIT) throw new PayloadTooLargeException();
    const known = new Set(names);
    for (let index = 0; index < files.length; index += 1) await validateBytes(names[index] ?? "", await readFile(files[index]?.path ?? ""), known);
    const root = path.join(workspace, "director-assets");
    await mkdir(root, { recursive: true });
    const rootStat = await lstat(root);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) invalid();
    const destination = path.join(root, assetId);
    try {
      await lstat(destination);
      throw new ConflictException("Asset ID already exists");
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const staging = await mkdtemp(path.join(root, ".pending-"));
    try {
      for (let index = 0; index < files.length; index += 1) {
        const target = path.join(staging, names[index] ?? "");
        await mkdir(path.dirname(target), { recursive: true });
        await copyFile(files[index]?.path ?? "", target, constants.COPYFILE_EXCL);
      }
      this.admit(id);
      await rename(staging, destination);
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
    const url = (name: string) => `/api/v3/canvas/director-assets/${assetId}/files/${name.split("/").map(encodeURIComponent).join("/")}`;
    return { id: assetId, name: selected, url: url(selected), files: names.map((item) => ({ path: item, url: url(item) })) };
  }

  async read(id: string, name: string): Promise<{ bytes: Buffer; type: string }> {
    const workspace = this.admit(id);
    safePath(name);
    const relative = `director-assets/${id.toLowerCase()}/${name}`;
    try {
      assertStored(workspace, relative);
    } catch {
      throw new NotFoundException();
    }
    const handle = await open(path.join(workspace, relative), "r");
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > FILE_LIMIT) throw new NotFoundException();
      return { bytes: await handle.readFile(), type: TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream" };
    } finally {
      await handle.close();
    }
  }

  private admit(id: string): string {
    if (!IMPORT_ID.test(id)) throw new BadRequestException("Invalid import ID");
    return this.images.admit();
  }
}

@Controller("api/v3/canvas/director-assets")
@UseFilters(DirectorAssetsHttpFilter)
export class CanvasV3DirectorAssetsController {
  constructor(@Inject(CanvasV3DirectorAssetsService) private readonly assets: CanvasV3DirectorAssetsService) {}

  @Post(":id")
  async upload(@Param("id") id: string, @Req() request: Request, @Res() response: Response) {
    const result = await this.assets.upload(id, async () => {
      const length = Number(request.headers["content-length"]);
      if (length > BODY_LIMIT) throw new PayloadTooLargeException();
      const staging = await mkdtemp(path.join(os.tmpdir(), "director-upload-"));
      const multipart = multer({
        dest: staging,
        limits: { fileSize: FILE_LIMIT + 1, files: 64, fields: 2, parts: 66, fieldSize: 65536, fieldNameSize: 100 },
      }).array("file", 64);
      try {
        await new Promise<void>((resolve, reject) => {
          multipart(request, response, (error: unknown) => {
            if (error) reject(error instanceof multer.MulterError ? error : new BadRequestException());
            else resolve();
          });
        });
        const body = request.body as { paths?: unknown; entry?: unknown } | undefined;
        if (Object.keys(body ?? {}).some((key) => key !== "paths" && key !== "entry")) throw new BadRequestException();
        const files = (request.files ?? []) as Uploaded[];
        return await this.assets.publish(id, files, body?.paths, body?.entry);
      } finally {
        await rm(staging, { recursive: true, force: true });
      }
    });
    response.set("Cache-Control", "no-store").status(200).json(result);
  }

  @Get(":id/files/{*assetPath}")
  async read(@Param("id") id: string, @Param("assetPath") assetPath: string | string[], @Res() response: Response) {
    const name = Array.isArray(assetPath) ? assetPath.join("/") : assetPath;
    const result = await this.assets.read(id, name);
    response.set({
      "Content-Type": result.type,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, max-age=31536000, immutable",
    }).send(result.bytes);
  }
}

function invalid(): never {
  throw new BadRequestException("Invalid director asset or bundle");
}

function fileName(original: string): string {
  const utf8 = Buffer.from(original, "latin1").toString("utf8");
  return utf8.includes("\uFFFD") ? original : utf8;
}

function parsePaths(value: unknown, count: number): string[] {
  let names: unknown;
  try {
    names = JSON.parse(String(value));
  } catch {
    invalid();
  }
  if (!Array.isArray(names) || names.length !== count) invalid();
  return names as string[];
}

function safePath(value: unknown): string {
  if (typeof value !== "string" || value.length > 512 || /[\\:%?#]/.test(value) || [...value].some((character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127)) invalid();
  if (value.split("/").some((part) => !part || part === "." || part === ".." || part.startsWith(".") || part.endsWith(".") || part.endsWith(" ") || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part)) || !TYPES[path.extname(value).toLowerCase()]) invalid();
  return value;
}

function jsonModel(buffer: Buffer): unknown {
  try {
    return JSON.parse(buffer.toString("utf8").trim()) as unknown;
  } catch {
    return invalid();
  }
}

function validateGltf(value: unknown, name: string, names: Set<string>): void {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("asset" in value)) invalid();
  const asset = (value as { asset?: { version?: unknown } }).asset;
  if (!asset || typeof asset !== "object" || asset.version !== "2.0") invalid();
  const pending: unknown[] = [value];
  while (pending.length) {
    const item = pending.pop();
    if (!item || typeof item !== "object") continue;
    for (const [key, child] of Object.entries(item)) {
      if (key === "uri") {
        if (typeof child !== "string") invalid();
        if (/^data:(application\/(octet-stream|gltf-buffer)|image\/(png|jpeg|webp|ktx2));base64,[a-zA-Z0-9+/]*={0,2}$/.test(child)) continue;
        let decoded: string;
        try {
          decoded = decodeURIComponent(child);
        } catch {
          invalid();
        }
        safePath(decoded);
        const target = path.posix.join(path.posix.dirname(name), decoded);
        if (!names.has(target)) invalid();
      } else if (child && typeof child === "object") pending.push(child);
    }
  }
}

function validateSpz(bytes: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const decoder = createGunzip({ chunkSize: 1024 });
    decoder.once("error", () => reject(new BadRequestException("Invalid SPZ")));
    decoder.once("end", () => reject(new BadRequestException("Missing SPZ header")));
    decoder.once("data", (header: Buffer) => {
      decoder.destroy();
      if (header.length < 16 || header.toString("ascii", 0, 4) !== "NGSP" || header.readUInt32LE(4) < 1 || header.readUInt32LE(4) > 4) reject(new BadRequestException("Invalid SPZ header"));
      else resolve();
    });
    decoder.end(bytes);
  });
}

async function validateBytes(name: string, bytes: Buffer, names: Set<string>): Promise<void> {
  if (!bytes.length) invalid();
  if (bytes.length > FILE_LIMIT) throw new PayloadTooLargeException();
  switch (path.extname(name).toLowerCase()) {
    case ".gltf":
      validateGltf(jsonModel(bytes), name, names);
      break;
    case ".glb": {
      if (bytes.length < 20 || bytes.toString("ascii", 0, 4) !== "glTF" || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) invalid();
      let offset = 12;
      while (offset < bytes.length) {
        if (offset + 8 > bytes.length) invalid();
        const length = bytes.readUInt32LE(offset);
        if (length % 4 || offset + 8 + length > bytes.length) invalid();
        if (offset === 12) {
          if (bytes.readUInt32LE(offset + 4) !== 1313821514) invalid();
          validateGltf(jsonModel(bytes.subarray(offset + 8, offset + 8 + length)), name, names);
        }
        offset += 8 + length;
      }
      break;
    }
    case ".ply": {
      const header = bytes.subarray(0, Math.min(bytes.length, 65536)).toString("ascii");
      if (!/^ply\r?\nformat (ascii|binary_little_endian|binary_big_endian) 1\.0\r?\n/.test(header) || !/\r?\nend_header\r?\n/.test(header)) invalid();
      break;
    }
    case ".spz":
      if (bytes.length < 18 || bytes[0] !== 31 || bytes[1] !== 139 || bytes[2] !== 8) invalid();
      await validateSpz(bytes);
      break;
    case ".png":
      if (!bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) invalid();
      break;
    case ".jpg":
    case ".jpeg":
      if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) invalid();
      break;
    case ".webp":
      if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") invalid();
      break;
    case ".ktx2":
      if (!bytes.subarray(0, 12).equals(Buffer.from("ab4b5458203230bb0d0a1a0a", "hex"))) invalid();
      break;
    default:
      break;
  }
}

function assertStored(workspace: string, relativePath: string): void {
  if (!relativePath || relativePath.split("/").some((part) => !part || part === "." || part === "..") || relativePath.split("/")[0] === ".hilo") throw new Error("Unsafe content");
  let current = workspace;
  const parts = relativePath.split("/");
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index] ?? "");
    const stat = lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error("Unsafe content");
    if (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory()) throw new Error("Unsafe content");
  }
  if (realpathSync(current) !== current) throw new Error("Unsafe content");
}
