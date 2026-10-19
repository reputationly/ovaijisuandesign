import { spawn } from "node:child_process";
import { closeSync, constants, createReadStream, fstatSync, lstatSync, openSync, readSync, realpathSync } from "node:fs";
import { open } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { BadRequestException, Controller, Get, HttpException, Inject, Injectable, NotFoundException, Param, Req, Res, UnsupportedMediaTypeException } from "@nestjs/common";
import type { Request, Response } from "express";
import { fileTypeFromStream } from "file-type";

import { FfmpegService } from "../edit/ffmpeg.service.js";
import { CanvasV3ImagesService } from "./images.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";

const UNSAFE_IDENTIFIER = /[\u0000-\u001f\u007f/\\]/;
const CONTAINER_EXTENSIONS: Record<string, string[]> = {
  mp4: ["mp4", "m4a", "m4v"],
  mov: ["mov"],
  aac: ["aac"],
  webm: ["webm"],
  wav: ["wav"],
  flac: ["flac"],
  ogg: ["ogg", "oga", "opus"],
  mp3: ["mp3"],
};
const FORMAT_NAMES: Record<string, string[]> = {
  mp4: ["mov", "mp4", "m4a"],
  mov: ["mov"],
  aac: ["aac"],
  webm: ["matroska", "webm"],
  wav: ["wav"],
  flac: ["flac"],
  ogg: ["ogg"],
  mp3: ["mp3"],
};
const AUDIO_CODECS: Record<string, string[]> = {
  mp4: ["aac", "mp3", "opus", "flac"],
  mov: ["aac", "mp3"],
  webm: ["opus", "vorbis"],
  mp3: ["mp3"],
  aac: ["aac"],
  wav: ["pcm_u8", "pcm_s16le", "pcm_s24le", "pcm_s32le", "pcm_f32le", "pcm_f64le"],
  flac: ["flac"],
  ogg: ["vorbis", "opus", "flac"],
};
const AUDIO_MIME: Record<string, string> = {
  mp4: "audio/mp4",
  aac: "audio/aac",
  webm: "audio/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  ogg: "audio/ogg",
};

type ResourceRead = {
  ok?: boolean;
  detail?: { resource: { kind: number; lifecycle: string }; version: { resourceId: string; status: string; relativePath: string } | null };
};

function sniffVideo(header: Buffer): "mp4" | "mov" | "webm" | undefined {
  const atom = header.subarray(4, 8).toString("ascii");
  if (atom === "ftyp") return header.subarray(8, 12).toString("ascii") === "qt  " ? "mov" : "mp4";
  if (["moov", "mdat", "wide", "free", "skip", "pnot"].includes(atom)) return "mov";
  if (header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return "webm";
  return undefined;
}

function sniffMedia(header: Buffer): string {
  const video = sniffVideo(header);
  if (video) return video;
  const second = header[1] ?? 0;
  if (header[0] === 255 && (second & 246) === 240) return "aac";
  if (header.subarray(0, 4).toString() === "RIFF" && header.subarray(8, 12).toString() === "WAVE") return "wav";
  if (header.subarray(0, 4).toString() === "fLaC") return "flac";
  if (header.subarray(0, 4).toString() === "OggS") return "ogg";
  if (header.subarray(0, 3).toString() === "ID3" || (header[0] === 255 && (second & 224) === 224)) return "mp3";
  throw new BadRequestException("Unsupported media content");
}

async function fileTypeFromPath(file: string) {
  const handle = await open(file, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    if (!(await handle.stat()).isFile()) return undefined;
    const stream = Readable.toWeb(handle.createReadStream({ autoClose: false }));
    return await fileTypeFromStream(stream);
  } finally {
    await handle.close();
  }
}

function assertStoredFile(workspace: string, relativePath: string): void {
  if (!relativePath || relativePath.includes("\0") || relativePath.includes("\\") || relativePath.includes(":") || path.posix.isAbsolute(relativePath) || relativePath.split("/").some((part) => !part || part === "." || part === "..") || relativePath.split("/")[0] === ".hilo") {
    throw new Error("Unsafe audio");
  }
  let current = workspace;
  const parts = relativePath.split("/");
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index] ?? "");
    const stat = lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error("Unsafe audio");
    if (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory()) throw new Error("Unsafe audio");
  }
}

async function inspectMedia(file: string, ffmpeg: FfmpegService): Promise<{ mediaKind: "audio" | "video"; mimeType: string }> {
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  let container: string;
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || !Number.isSafeInteger(stat.size) || stat.size <= 0) throw new BadRequestException("Invalid media");
    const header = Buffer.alloc(12);
    await handle.read(header, 0, 12, 0);
    container = sniffMedia(header);
  } finally {
    await handle.close();
  }
  try {
    const detected = await fileTypeFromPath(file);
    if (!detected || !CONTAINER_EXTENSIONS[container]?.includes(detected.ext)) throw new UnsupportedMediaTypeException("Unsupported media container");
    const probe = await ffmpeg.ffprobe(file);
    if (!probe) throw new Error("Invalid probe");
    const streams = probe.streams ?? [];
    const video = streams.find((stream) => stream.codec_type === "video" && !stream.disposition?.attached_pic);
    const audio = streams.find((stream) => stream.codec_type === "audio");
    const duration = Number(probe.format?.duration);
    const names = String(probe.format?.format_name ?? "").split(",");
    if (!FORMAT_NAMES[container]?.some((format) => names.includes(format)) || !(duration > 0 && Number.isFinite(duration)) || (!video && !audio)) throw new Error("Invalid probe");
    for (const stream of streams) {
      if (stream.disposition?.attached_pic) continue;
      if (stream.codec_type === "audio" && !AUDIO_CODECS[container]?.includes(stream.codec_name ?? "")) throw new UnsupportedMediaTypeException("Unsupported media codec");
    }
    if (video) {
      return { mediaKind: "video", mimeType: container === "mov" ? "video/quicktime" : `video/${container}` };
    }
    if (!audio?.codec_name) throw new Error("Invalid audio");
    if (container === "mov") throw new UnsupportedMediaTypeException("Unsupported audio container");
    const mimeType = AUDIO_MIME[container];
    if (!mimeType) throw new Error("Invalid audio");
    return { mediaKind: "audio", mimeType };
  } catch (error) {
    if (error instanceof UnsupportedMediaTypeException) throw error;
    throw new BadRequestException("Invalid or unprobeable media");
  }
}

async function openAudio(workspace: string, relativePath: string, ffmpeg: FfmpegService): Promise<{ fd: number; size: number; mimeType: string }> {
  let fd: number | undefined;
  try {
    assertStoredFile(workspace, relativePath);
    const absolute = path.join(workspace, relativePath);
    const before = lstatSync(absolute);
    fd = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.ino !== before.ino || opened.dev !== before.dev || realpathSync(absolute) !== absolute) throw new Error("Unsafe audio");
    const metadata = await inspectMedia(absolute, ffmpeg);
    assertStoredFile(workspace, relativePath);
    const after = lstatSync(absolute);
    if (metadata.mediaKind !== "audio" || (["ino", "dev", "size", "mtimeMs"] as const).some((key) => opened[key] !== after[key])) throw new Error("Audio changed");
    const result = { fd, size: opened.size, mimeType: metadata.mimeType };
    fd = undefined;
    return result;
  } catch {
    if (fd !== undefined) closeSync(fd);
    throw new NotFoundException("Audio unavailable");
  }
}

@Injectable()
export class CanvasV3AudioService {
  constructor(
    @Inject(CanvasV3ImagesService) private readonly images: CanvasV3ImagesService,
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
    @Inject(FfmpegService) private readonly ffmpeg: FfmpegService,
  ) {}

  /** 读完探测后再对一次路径，避免探测期间版本被换成另一份文件。 */
  async readAudio(resourceId: string, versionId: string): Promise<{ fd: number; size: number; mimeType: string }> {
    this.images.admit();
    if (![resourceId, versionId].every((id) => id && id.length <= 256 && !UNSAFE_IDENTIFIER.test(id))) throw new BadRequestException();
    const lookup = () => {
      const [result] = this.resources.getResources([{ resourceId, versionId }]) as ResourceRead[];
      const version = result?.detail?.version;
      if (!result?.ok || result.detail?.resource.kind !== 4 || result.detail.resource.lifecycle !== "active" || version?.status !== "ready" || version.resourceId !== resourceId) {
        throw new NotFoundException("Audio unavailable");
      }
      return version.relativePath;
    };
    const relativePath = lookup();
    const audio = await openAudio(this.images.admit(), relativePath, this.ffmpeg);
    try {
      this.images.admit();
      if (lookup() !== relativePath) throw new NotFoundException("Audio unavailable");
      return audio;
    } catch (error) {
      closeSync(audio.fd);
      throw error;
    }
  }
}

@Controller("api/v3/canvas/audios")
export class CanvasV3AudioController {
  constructor(@Inject(CanvasV3AudioService) private readonly media: CanvasV3AudioService) {}

  @Get(":resourceId/:versionId")
  readAudio(@Param("resourceId") resourceId: string, @Param("versionId") versionId: string, @Req() request: Request, @Res() response: Response) {
    return sendAudio(this.media, resourceId, versionId, request, response);
  }
}

export async function sendAudio(media: CanvasV3AudioService, resourceId: string, versionId: string, request: Request, response: Response): Promise<void> {
  let fd: number | undefined;
  try {
    const audio = await media.readAudio(resourceId, versionId);
    fd = audio.fd;
    response.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Type": audio.mimeType, "Accept-Ranges": "bytes" });
    const range = request.headers.range ? request.range(audio.size) : undefined;
    if (range && (typeof range === "number" || range.type !== "bytes" || range.length !== 1)) {
      response.status(416).set("Content-Range", `bytes */${audio.size}`).end();
      return;
    }
    const start = Array.isArray(range) ? range[0]?.start ?? 0 : 0;
    const end = Array.isArray(range) ? range[0]?.end ?? audio.size - 1 : audio.size - 1;
    response.status(range ? 206 : 200).set("Content-Length", String(end - start + 1));
    if (range) response.set("Content-Range", `bytes ${start}-${end}/${audio.size}`);
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
      response.status(error instanceof HttpException ? error.getStatus() : 500).set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).json({ message: "Audio unavailable" });
    }
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

export function ffmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("ffmpeg", ["-version"], { stdio: "ignore" });
    child.once("error", () => resolve(false));
    child.once("exit", (code) => resolve(code === 0));
  });
}
