import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { MEDIA_EXTENSIONS } from "@ov/protocol";

import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { GatewayConfig } from "../config/gateway-config.js";
import { FfmpegService } from "../edit/ffmpeg.service.js";

/** 转码配方变了就改这个版本号，旧缓存自然失效。 */
const PLAYBACK_PROFILE_VERSION = "browser-mp4-v1";
const BROWSER_SAFE_PIXEL_FORMATS = new Set(["yuv420p", "yuvj420p"]);
const MP4_SAFE_AUDIO_CODECS = new Set(["aac", "mp3"]);

export const MIN_PEAKS_BUCKETS = 50;
export const MAX_PEAKS_BUCKETS = 4096;
/** 波形只要轮廓：解码成 8 kHz 单声道足够，数据量是 CD 音质的 1/11。 */
const PEAKS_SAMPLE_RATE = 8000;
const PCM_TIMEOUT_MS = 30_000;
const PCM_MAX_BYTES = 64 * 1024 * 1024;

type Strategy = { mode: "direct" } | { mode: "remux"; copyAudio: boolean } | { mode: "transcode" };

interface Probe {
  video?: { codec?: string; pixelFormat?: string; height?: number };
  audio?: { codec?: string };
  hasAudio: boolean;
  formatName?: string;
}

/**
 * 决定一个视频怎么给播放器：已经是 H.264 / yuv420p、高度不超标、音轨是 AAC/MP3 的 MP4 直接给原文件；
 * 画面能用但容器或音轨不行的只换封装；其余（HEVC、ProRes、10-bit、WebM…）转码。
 * Electron 的 Chromium 不带 HEVC 解码，MOV 里的 ProRes 更是放不了。
 */
export function selectPlaybackStrategy(ext: string, probe: Probe | null, maxHeight: number): Strategy {
  const codec = probe?.video?.codec?.toLowerCase();
  const pix = probe?.video?.pixelFormat?.toLowerCase();
  const height = probe?.video?.height ?? 0;
  const h264 = codec === "h264" && pix !== undefined && BROWSER_SAFE_PIXEL_FORMATS.has(pix) && height > 0 && height <= maxHeight;
  const audioCodec = probe?.audio?.codec?.toLowerCase();
  const audioOk = !probe?.hasAudio || (audioCodec !== undefined && MP4_SAFE_AUDIO_CODECS.has(audioCodec));
  const formats = new Set((probe?.formatName ?? "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean));
  const mp4 = ext === ".mp4" && (formats.size === 0 || formats.has("mp4"));
  if (mp4 && h264 && audioOk) return { mode: "direct" };
  if (h264) return { mode: "remux", copyAudio: audioOk };
  return { mode: "transcode" };
}

/** 等一个共享的生成任务，但请求方断开时自己先走（任务照跑，下次命中缓存）。 */
function waitShared<T>(task: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return task;
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    task.then(
      (v) => (signal.removeEventListener("abort", onAbort), resolve(v)),
      (e) => (signal.removeEventListener("abort", onAbort), reject(e)),
    );
  });
}

/**
 * 画布 / 资产面板上的视频播放源和音频波形。
 *
 * 播放源：浏览器放不了的视频转成限高的 H.264 MP4，缓存在 `.hilo/.video-streams/`，键里带相对路径、
 * 大小、修改时间、限高和配方版本 —— 源文件改了或配方改了都会重新生成。同一个输出同时只跑一次。
 * 波形：ffmpeg 解成 PCM 后按桶取峰值，缓存在 `.hilo/.peaks/`。大音频文件悬停时不用再等浏览器自己解码。
 */
@Injectable()
export class MediaPlaybackService {
  private readonly log = new Logger("MediaPlayback");
  private readonly inflightStreams = new Map<string, Promise<string>>();
  private readonly inflightPeaks = new Map<string, Promise<{ peaks: number[][]; duration: number }>>();

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly assets: AssetsService,
    private readonly ffmpeg: FfmpegService,
    private readonly cfg: GatewayConfig,
  ) {}

  private resolve(rel: string): string {
    const abs = this.paths.resolve(rel);
    if (!abs) throw new BadRequestException("Path traversal detected");
    return abs;
  }

  /** `source` 是渲染层手里的文件 URL（`/files/id/<id>` 或 `/files/<相对路径>`，可以带主机名和查询串）。 */
  async playbackForSource(source: string, maxHeight: number, signal?: AbortSignal): Promise<string> {
    let pathname: string;
    try {
      pathname = new URL(source, "http://local.invalid").pathname;
    } catch {
      throw new BadRequestException("Invalid video playback source");
    }
    let abs: string;
    if (pathname.startsWith("/files/id/")) {
      let id: string;
      try {
        id = decodeURIComponent(pathname.slice("/files/id/".length));
      } catch {
        throw new BadRequestException("Malformed asset id");
      }
      if (!id || id.includes("/")) throw new BadRequestException("Invalid asset id");
      const row = this.assets.byId(id);
      const resolved = row ? this.paths.resolve(row.path) : null;
      if (!resolved) throw new NotFoundException("Asset not found");
      abs = resolved;
    } else if (pathname.startsWith("/files/")) {
      let rel: string;
      try {
        rel = decodeURIComponent(pathname.slice("/files/".length));
      } catch {
        throw new BadRequestException("Malformed video path");
      }
      abs = this.resolve(rel);
    } else {
      throw new BadRequestException("Video playback source must use a local file route");
    }
    return this.playback(abs, maxHeight, signal);
  }

  /** 资产面板悬停预览：工作区相对路径。 */
  streamForPath(rel: string, maxHeight: number): Promise<string> {
    return this.playback(this.resolve(rel), maxHeight);
  }

  private async playback(abs: string, maxHeight: number, signal?: AbortSignal): Promise<string> {
    const st = await stat(abs).catch((err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") throw new NotFoundException("File not found");
      throw err;
    });
    if (!st.isFile()) throw new NotFoundException("File not found");
    const ext = path.extname(abs).toLowerCase();
    if (MEDIA_EXTENSIONS[ext] !== "video") throw new BadRequestException(`Unsupported file type for video stream: ${ext}`);
    const probe = await this.probe(abs);
    signal?.throwIfAborted();
    const strategy = selectPlaybackStrategy(ext, probe, maxHeight);
    if (strategy.mode === "direct") return abs;

    const dir = this.paths.hilo(".video-streams");
    await mkdir(dir, { recursive: true });
    const key = [path.relative(this.paths.root, abs), st.size, st.mtimeMs, `h${maxHeight}`, PLAYBACK_PROFILE_VERSION].join(":");
    const out = path.join(dir, `${createHash("md5").update(key).digest("hex").slice(0, 12)}.mp4`);
    if (await stat(out).then((s) => s.isFile(), () => false)) return out;
    let job = this.inflightStreams.get(out);
    if (!job) {
      job = this.transcode(abs, out, maxHeight, probe, strategy).finally(() => this.inflightStreams.delete(out));
      this.inflightStreams.set(out, job);
    }
    return waitShared(job, signal);
  }

  private async probe(abs: string): Promise<Probe | null> {
    const raw = await this.ffmpeg.ffprobe(abs);
    if (!raw) return null;
    const streams = (raw.streams ?? []) as (NonNullable<typeof raw.streams>[number] & { pix_fmt?: string })[];
    const v = streams.find((s) => s.codec_type === "video" && s.disposition?.attached_pic !== 1);
    const a = streams.find((s) => s.codec_type === "audio");
    return {
      ...(v ? { video: { codec: v.codec_name, pixelFormat: v.pix_fmt, height: Number(v.height) || 0 } } : {}),
      ...(a ? { audio: { codec: a.codec_name } } : {}),
      hasAudio: !!a,
      formatName: raw.format?.format_name,
    };
  }

  /** 先写临时文件再改名：转到一半被杀留下的半个文件不能被当成缓存命中。失败回 404，渲染层退回静态缩略图。 */
  private async transcode(src: string, out: string, maxHeight: number, probe: Probe | null, strategy: Strategy): Promise<string> {
    const tmp = `${out}.${randomUUID()}.tmp.mp4`;
    const audio = probe?.hasAudio === false ? ["-an"] : strategy.mode === "remux" && strategy.copyAudio ? ["-c:a", "copy"] : ["-c:a", "aac", "-b:a", "160k", "-ac", "2"];
    const even = Math.max(2, Math.floor(maxHeight / 2) * 2);
    const video =
      strategy.mode === "remux"
        ? ["-c:v", "copy"]
        : [
            "-vf",
            probe?.video?.height && probe.video.height > maxHeight ? `scale='trunc(oh*a/2)*2:${even}'` : "scale='trunc(iw/2)*2:trunc(ih/2)*2'",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "22",
            "-pix_fmt",
            "yuv420p",
          ];
    const args = ["-y", "-hide_banner", "-loglevel", "error", "-i", src, "-map", "0:v:0", "-map", "0:a:0?", ...video, ...audio, "-movflags", "+faststart", "-avoid_negative_ts", "make_zero", tmp];
    try {
      await this.ffmpeg.exec(args);
      await rename(tmp, out).catch(async (err) => {
        // 另一个进程抢先写好了同一份：用它的。
        if (!(await stat(out).then(() => true, () => false))) throw err;
      });
      return out;
    } catch (err) {
      this.log.warn(`视频播放源生成失败 ${path.basename(src)}: ${(err as Error).message}`);
      throw new NotFoundException(`Failed to generate video stream: ${(err as Error).message}`);
    } finally {
      await unlink(tmp).catch(() => undefined);
    }
  }

  // -------------------------------------------------------------------------
  // 波形
  // -------------------------------------------------------------------------

  async peaks(rel: string, buckets: number): Promise<{ peaks: number[][]; duration: number }> {
    if (!Number.isFinite(buckets) || buckets < MIN_PEAKS_BUCKETS || buckets > MAX_PEAKS_BUCKETS) {
      throw new BadRequestException(`buckets must be between ${MIN_PEAKS_BUCKETS} and ${MAX_PEAKS_BUCKETS}`);
    }
    const abs = this.resolve(rel);
    const st = await stat(abs).catch((err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") throw new NotFoundException("File not found");
      throw err;
    });
    const ext = path.extname(abs).toLowerCase();
    if (MEDIA_EXTENSIONS[ext] !== "audio") throw new BadRequestException(`Unsupported file type for audio peaks: ${ext}`);
    const dir = this.paths.hilo(".peaks");
    await mkdir(dir, { recursive: true });
    const key = `${path.relative(this.paths.root, abs)}:b${buckets}:${st.mtimeMs}`;
    const file = path.join(dir, `${createHash("md5").update(key).digest("hex").slice(0, 12)}.json`);
    try {
      const cached = JSON.parse(await readFile(file, "utf8")) as { peaks?: unknown; duration?: unknown };
      if (Array.isArray(cached.peaks) && typeof cached.duration === "number" && Number.isFinite(cached.duration)) {
        return cached as { peaks: number[][]; duration: number };
      }
    } catch {
      // 没缓存或缓存坏了：重新算
    }
    let job = this.inflightPeaks.get(file);
    if (!job) {
      job = this.computePeaks(abs, buckets, file).finally(() => this.inflightPeaks.delete(file));
      this.inflightPeaks.set(file, job);
    }
    return job;
  }

  private async computePeaks(abs: string, buckets: number, file: string) {
    const args = ["-hide_banner", "-loglevel", "error", "-i", abs, "-vn", "-ac", "1", "-ar", String(PEAKS_SAMPLE_RATE), "-map", "0:a", "-c:a", "pcm_s16le", "-f", "s16le", "-"];
    const pcm = await runPcm(this.cfg.ffmpegPath || "ffmpeg", args);
    const total = Math.floor(pcm.length / 2);
    const result = { peaks: [bucketPeaks(pcm, total, buckets)], duration: total / PEAKS_SAMPLE_RATE };
    const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
    try {
      await writeFile(tmp, JSON.stringify(result));
      await rename(tmp, file);
    } catch (err) {
      await unlink(tmp).catch(() => undefined);
      this.log.warn(`波形缓存写入失败: ${(err as Error).message}`);
    }
    return result;
  }
}

/** 每个桶取绝对值最大的那个采样（保留符号），归一到 -1..1。采样比桶少时桶数跟着减。 */
export function bucketPeaks(pcm: Buffer, total: number, buckets: number): number[] {
  if (total <= 0) return [];
  const n = Math.min(buckets, total);
  const per = total / n;
  const out = new Array<number>(n);
  for (let b = 0; b < n; b++) {
    const start = Math.floor(b * per);
    const end = b === n - 1 ? total : Math.floor((b + 1) * per);
    let peak = 0;
    let peakAbs = 0;
    for (let i = start; i < end; i++) {
      const s = pcm.readInt16LE(i * 2);
      const a = s < 0 ? -s : s;
      if (a > peakAbs) {
        peakAbs = a;
        peak = s;
      }
    }
    out[b] = peak / 32768;
  }
  return out;
}

/** ffmpeg 把 PCM 写到 stdout；超时或输出超过上限就杀掉（一小时的音频也才 57 MB）。 */
function runPcm(bin: string, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      reject(err);
      return;
    }
    const chunks: Buffer[] = [];
    let bytes = 0;
    let stderr = "";
    let done = false;
    const finish = (fn: () => void, kill = false) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (kill) child.kill("SIGKILL");
      fn();
    };
    const timer = setTimeout(() => finish(() => reject(new Error(`ffmpeg PCM decode timed out after ${PCM_TIMEOUT_MS}ms`)), true), PCM_TIMEOUT_MS);
    timer.unref();
    child.stdout.on("data", (c: Buffer) => {
      bytes += c.length;
      if (bytes > PCM_MAX_BYTES) return finish(() => reject(new Error("ffmpeg PCM output too large")), true);
      chunks.push(c);
    });
    child.stderr.on("data", (c: Buffer) => {
      if (stderr.length < 2000) stderr += c.toString("utf8");
    });
    child.on("error", (err: NodeJS.ErrnoException) =>
      finish(() => reject(err.code === "ENOENT" ? new Error(`ffmpeg not found at "${bin}". Install ffmpeg or set FFMPEG_PATH env variable.`) : err)),
    );
    child.on("close", (code) => finish(() => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(0, 2000)}`)))));
  });
}
