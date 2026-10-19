import { existsSync } from "node:fs";
import { copyFile, mkdir, open, rename, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import sharp from "sharp";

import { FfmpegService } from "../edit/ffmpeg.service.js";

export type WatermarkKind = "image" | "video" | "audio";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const DEFAULT_LOGO_WIDTH = 391;

/**
 * 生成结果在进入工作区之前叠上标记：图片和视频贴右下角，音频在末尾接一段提示音。
 * 失败只记日志，原来的文件照样留下，避免一次叠印失败把整次生成丢掉。
 */
@Injectable()
export class WatermarkService implements OnModuleInit {
  private readonly log = new Logger(WatermarkService.name);
  private enabled = true;
  private cachedLogoPath: string | null = null;
  private readonly logoSourcePath: string | null;
  private readonly markerPath: string | null;
  private readonly region: string | null;

  constructor(private readonly ffmpeg: FfmpegService) {
    const region = process.env.HILO_RELEASE_REGION ?? "domestic";
    this.logoSourcePath = resolveLogoPath(region);
    this.region = this.logoSourcePath ? region : null;
    const ext = this.logoSourcePath ? path.extname(this.logoSourcePath).toLowerCase() : "";
    if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") this.cachedLogoPath = this.logoSourcePath;
    this.markerPath = resolveMarkerPath();
  }

  async onModuleInit(): Promise<void> {
    if (this.logoSourcePath && !this.cachedLogoPath && path.extname(this.logoSourcePath).toLowerCase() === ".svg") {
      try {
        const cacheDir = path.join(tmpdir(), "hilo-gateway-watermark");
        await mkdir(cacheDir, { recursive: true });
        const outPath = path.join(cacheDir, `${this.region ?? "domestic"}-1024.png`);
        await sharp(this.logoSourcePath, { density: 300 }).resize({ width: 1024 }).png().toFile(outPath);
        this.cachedLogoPath = outPath;
      } catch (err) {
        this.log.warn(`watermark svg rasterise failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async applyStaged(stagedPath: string, kind: WatermarkKind): Promise<void> {
    if (!this.precheck(stagedPath, kind)) return;
    const tmpPath = `${stagedPath}.watermark-tmp${path.extname(stagedPath)}`;
    try {
      if (kind === "audio") await this.ffmpeg.appendAudioMarker(stagedPath, this.markerPath!, tmpPath);
      else await this.overlay(stagedPath, tmpPath, kind);
      await rename(tmpPath, stagedPath);
    } catch (err) {
      this.log.warn(`watermark apply failed (${kind}) for ${stagedPath}: ${err instanceof Error ? err.message : String(err)}`);
      if (existsSync(tmpPath)) await unlink(tmpPath).catch(() => undefined);
    }
  }

  /** 全景图先留一份没叠标记的副本，再给正片叠标记。副本和正片一起发布。 */
  async applyStagedWithPanoramaPreview(stagedPath: string, kind: WatermarkKind): Promise<void> {
    if (kind !== "image") {
      await this.applyStaged(stagedPath, kind);
      return;
    }
    try {
      await copyFile(stagedPath, panoramaCleanPreviewPath(stagedPath));
    } catch (err) {
      this.log.warn(`panorama clean preview copy failed for ${stagedPath}: ${err instanceof Error ? err.message : String(err)}`);
    }
    await this.applyStaged(stagedPath, kind);
  }

  private precheck(absPath: string, kind: WatermarkKind): boolean {
    if (!this.enabled || !path.isAbsolute(absPath) || !existsSync(absPath)) return false;
    if (kind === "audio") return Boolean(this.markerPath);
    return Boolean(this.cachedLogoPath);
  }

  private async overlay(input: string, output: string, kind: WatermarkKind): Promise<void> {
    const logo = this.cachedLogoPath;
    if (!logo) return;
    if (kind === "image" && (await isPng(input))) {
      try {
        await overlayPng(input, logo, output);
        return;
      } catch (err) {
        this.log.warn(`watermark sharp overlay failed for ${input}: ${err instanceof Error ? err.message : String(err)}`);
        if (existsSync(output)) await unlink(output).catch(() => undefined);
      }
    }
    await this.ffmpeg.overlayWatermark(input, logo, output, kind === "video" ? "video" : "image");
  }
}

async function isPng(file: string): Promise<boolean> {
  const handle = await open(file, "r");
  try {
    const header = Buffer.alloc(PNG_SIGNATURE.length);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    return bytesRead === header.length && header.equals(PNG_SIGNATURE);
  } finally {
    await handle.close();
  }
}

async function overlayPng(input: string, logoPath: string, output: string): Promise<void> {
  const source = sharp(input, { failOn: "error" });
  const { width, height, pages } = await source.metadata();
  if (!width || !height || (pages ?? 1) > 1) throw new Error("unsupported PNG for sharp overlay");
  const logoWidth = Math.max(Math.round(width * 0.25), Math.min(DEFAULT_LOGO_WIDTH, Math.round(width * 0.35)));
  const logo = await sharp(logoPath).resize({ width: logoWidth, kernel: "lanczos3" }).png().toBuffer({ resolveWithObject: true });
  if (logo.info.width > width || logo.info.height > height) throw new Error("watermark larger than image");
  await source
    .composite([{ input: logo.data, left: width - logo.info.width, top: height - logo.info.height }])
    .keepExif()
    .png({ compressionLevel: 4, adaptiveFiltering: true })
    .toFile(output);
}

function resolveLogoPath(region: string): string | null {
  const override = process.env.HILO_WATERMARK_LOGO_PATH;
  if (override && existsSync(override)) return override;
  const filenames = region === "domestic"
    ? ["cn.svg", "cn.png", "cn.jpg", `${region}.svg`, `${region}.png`, `${region}.jpg`]
    : ["overseas.svg", "overseas.png", "overseas.jpg", `${region}.svg`, `${region}.png`, `${region}.jpg`];
  return firstExisting(filenames);
}

function resolveMarkerPath(): string | null {
  const override = process.env.HILO_WATERMARK_AUDIO_MARKER_PATH;
  if (override && existsSync(override)) return override;
  return firstExisting(["rhythm_marker.wav", "rhythm-marker.wav"]);
}

function firstExisting(filenames: string[]): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dirs = [process.env.HILO_WATERMARK_LOGO_DIR, path.join(here, "..", "..", "assets", "watermark"), path.join(here, "..", "assets", "watermark")].filter((dir): dir is string => Boolean(dir));
  for (const dir of dirs) {
    for (const name of filenames) {
      const candidate = path.join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

export function panoramaCleanPreviewPath(stagedPath: string): string {
  const extension = path.extname(stagedPath);
  const stem = extension ? stagedPath.slice(0, -extension.length) : stagedPath;
  return `${stem}.panorama-clean-preview${extension}`;
}
