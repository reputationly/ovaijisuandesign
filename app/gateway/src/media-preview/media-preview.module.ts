import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { BadRequestException, Controller, Injectable, Module, PayloadTooLargeException, Post, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
const HEIC_EXTENSIONS = new Set([".heic", ".heif"]);
const MAX_BODY_BYTES = 64 * 1024 * 1024;

function extensionOf(filename: string): string {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? filename;
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot).toLowerCase() : "";
}

export function isHeicFilename(filename: string): boolean {
  return HEIC_EXTENSIONS.has(extensionOf(filename));
}

/**
 * HEIC / HEIF 转 JPEG 预览（渲染层的 <img> 显示不了 HEIC）。先用 sharp（带 libheif 的构建能直接解），
 * 解不了再用 macOS 自带的 sips；都不行就报错，界面退回文件卡片。
 */
@Injectable()
export class MediaPreviewService {
  async convertHeicPreview(input: Buffer, filename: string): Promise<Buffer> {
    const errors: string[] = [];
    try {
      return await sharp(input, { limitInputPixels: 12000 * 12000 }).rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    } catch (err) {
      errors.push(`sharp: ${(err as Error).message}`);
    }
    try {
      return await convertWithSips(input, extensionOf(filename));
    } catch (err) {
      errors.push(`sips: ${(err as Error).message}`);
    }
    throw new Error(`HEIC conversion failed: ${errors.join("; ")}`);
  }
}

async function convertWithSips(input: Buffer, extension: string): Promise<Buffer> {
  if (process.platform !== "darwin") throw new Error("sips fallback is only available on macOS");
  const dir = await mkdtemp(path.join(os.tmpdir(), "ov-heic-preview-"));
  const src = path.join(dir, `source${extension || ".heic"}`);
  const out = path.join(dir, "preview.jpg");
  try {
    await writeFile(src, input);
    await execFileAsync("/usr/bin/sips", ["-s", "format", "jpeg", src, "--out", out], { timeout: 15_000, maxBuffer: 1024 * 1024 });
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** 请求体是原始字节（application/octet-stream），全局只挂了 JSON 解析，这里自己读流，限 64MB。 */
function readRawBody(req: Request): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new PayloadTooLargeException("File is too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

@Controller("api/media")
export class MediaPreviewController {
  constructor(private readonly service: MediaPreviewService) {}

  @Post("heic-preview")
  async heicPreview(@Query("filename") filename: string | undefined, @Req() req: Request, @Res() res: Response) {
    if (!isHeicFilename(filename ?? "")) throw new BadRequestException("Only HEIC/HEIF files can be converted");
    const body = await readRawBody(req);
    if (body.length === 0) throw new BadRequestException("File is empty");
    const output = await this.service.convertHeicPreview(body, filename ?? "");
    res.type("image/jpeg").send(output);
  }
}

@Module({ controllers: [MediaPreviewController], providers: [MediaPreviewService], exports: [MediaPreviewService] })
export class MediaPreviewModule {}
