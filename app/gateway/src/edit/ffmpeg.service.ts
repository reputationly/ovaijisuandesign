import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";

import { GatewayConfig } from "../config/gateway-config.js";

/** 单次 ffmpeg 的上限。可用环境变量调：长视频转码 5 分钟不一定够。 */
const FFMPEG_TIMEOUT_MS = positiveInt(process.env.HILO_FFMPEG_TIMEOUT_MS) ?? 300_000;
const FFPROBE_TIMEOUT_MS = 10_000;
/** 同时跑的 ffmpeg 个数。转码吃满 CPU，并发多了谁都跑不完。 */
const MAX_CONCURRENT_JOBS = 2;
/** stdout / stderr 各自最多留这么多。`showinfo` 探测长视频能刷出几十 MB。 */
const OUTPUT_CAP_BYTES = 4 * 1024 * 1024;
/** 报错时带上的 stderr 尾巴长度：ffmpeg 的真正原因在最后几行。 */
const ERROR_TAIL_CHARS = 2000;

const SILENT_SAMPLE_RATE = 48_000;
const SILENT_CHANNEL_LAYOUT = "stereo";

export type ScaleMode = "first" | "max" | "min" | "custom";

export interface MediaInfo {
  width: number;
  height: number;
  hasAudio: boolean;
  /** 秒。探测失败为 0。 */
  duration: number;
  /** 画面轨时长（秒）。没有单独的值时同 duration。 */
  timelineDuration: number;
  audioDuration?: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/**
 * ffmpeg / ffprobe 的进程封装：并发限流、超时、应用退出时杀掉还在跑的子进程。
 * 二进制路径来自 `FFMPEG_PATH` / `FFPROBE_PATH`，没配就用 PATH 上的。
 */
@Injectable()
export class FfmpegService implements OnModuleDestroy {
  private readonly log = new Logger("Ffmpeg");
  private readonly children = new Set<ChildProcess>();
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly cfg: GatewayConfig) {}

  get ffmpegBin(): string {
    return this.cfg.ffmpegPath || "ffmpeg";
  }

  get ffprobeBin(): string {
    return this.cfg.ffprobePath || "ffprobe";
  }

  onModuleDestroy(): void {
    for (const c of this.children) c.kill("SIGKILL");
    this.children.clear();
  }

  /** 跑一次 ffmpeg。非零退出抛错，错误信息带 stderr 尾部。 */
  async exec(args: string[], opts: { cwd?: string; timeoutMs?: number } = {}): Promise<ExecResult> {
    await this.acquire();
    try {
      return await this.run(this.ffmpegBin, args, opts.timeoutMs ?? FFMPEG_TIMEOUT_MS, opts.cwd);
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.active < MAX_CONCURRENT_JOBS) {
      this.active++;
      return;
    }
    // 名额直接交接给排队者（release 不减计数），免得被新来的插队。
    await new Promise<void>((r) => this.waiting.push(r));
  }

  private release(): void {
    const next = this.waiting.shift();
    if (next) next();
    else this.active--;
  }

  private run(bin: string, args: string[], timeoutMs: number, cwd?: string): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      let child: ChildProcess;
      try {
        child = spawn(bin, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
      } catch (err) {
        reject(notFound(bin, err));
        return;
      }
      this.children.add(child);
      const out = new CappedBuffer();
      const errBuf = new CappedBuffer();
      child.stdout!.on("data", (b: Buffer) => out.push(b));
      child.stderr!.on("data", (b: Buffer) => errBuf.push(b));
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        settle(() => reject(new Error(`${path.basename(bin)} timed out after ${timeoutMs}ms`)));
      }, timeoutMs);
      timer.unref();
      let done = false;
      const settle = (fn: () => void) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.children.delete(child);
        fn();
      };
      child.on("error", (err) => settle(() => reject(notFound(bin, err))));
      child.on("close", (code, signal) => {
        const stdout = out.text();
        const stderr = errBuf.text();
        if (code === 0) return settle(() => resolve({ stdout, stderr }));
        const tail = stderr.trim().slice(-ERROR_TAIL_CHARS);
        settle(() => reject(new Error(`${path.basename(bin)} exited with ${code ?? signal}${tail ? `: ${tail}` : ""}`)));
      });
    });
  }

  /** ffprobe 的 JSON 输出。失败返回 null —— 调用方自己决定是当 0 处理还是报错。 */
  async ffprobe(file: string): Promise<FfprobeOutput | null> {
    try {
      const { stdout } = await this.run(this.ffprobeBin, ["-v", "quiet", "-show_streams", "-show_format", "-of", "json", file], FFPROBE_TIMEOUT_MS);
      return JSON.parse(stdout) as FfprobeOutput;
    } catch (err) {
      this.log.debug(`ffprobe failed for ${file}: ${(err as Error).message}`);
      return null;
    }
  }

  async probeMedia(file: string): Promise<MediaInfo> {
    const p = await this.ffprobe(file);
    if (!p) return { width: 0, height: 0, hasAudio: false, duration: 0, timelineDuration: 0 };
    const streams = p.streams ?? [];
    // 封面图（mp3 / m4a 里的专辑图）也是一条 video 流，不能当画面。
    const video = streams.find((s) => s.codec_type === "video" && s.disposition?.attached_pic !== 1);
    const audio = streams.find((s) => s.codec_type === "audio");
    const duration = num(p.format?.duration) ?? num(video?.duration) ?? 0;
    return {
      width: num(video?.width) ?? 0,
      height: num(video?.height) ?? 0,
      hasAudio: !!audio,
      duration,
      timelineDuration: num(video?.duration) ?? duration,
      ...(num(audio?.duration) !== undefined ? { audioDuration: num(audio?.duration) } : {}),
    };
  }

  // -------------------------------------------------------------------------
  // 拼接
  // -------------------------------------------------------------------------

  /**
   * 按顺序拼接多段视频。
   *
   * 分辨率一致、音轨齐全时走 concat demuxer（不重编码，快且无损）；否则走 concat 滤镜：
   * 统一缩放到目标分辨率（等比缩放 + 黑边），缺音轨的段补静音、音轨短于画面的段补齐。
   * 直接 demuxer 拼音轨不齐的片段，后面几段的声音会整体错位甚至丢失。
   */
  async concatenate(inputs: string[], output: string, scaleMode: ScaleMode = "first", targetW?: number, targetH?: number): Promise<void> {
    const infos = await Promise.all(inputs.map((p) => this.probeMedia(p)));
    const valid = infos.filter((m) => m.width > 0 && m.height > 0).map((m) => [m.width, m.height] as const);
    const mixedAudio = infos.some((m) => m.hasAudio) && infos.some((m) => !m.hasAudio);
    const shortAudio = infos.some((m) => {
      const timeline = roundSec(m.timelineDuration || m.duration);
      return m.hasAudio && timeline > 0 && roundSec(m.audioDuration ?? 0) + 0.1 < timeline;
    });
    const target = resolveTargetResolution(valid, scaleMode, targetW, targetH, (msg) => this.log.warn(msg));
    const sizeDiffers = !!target && valid.some(([w, h]) => w !== target[0] || h !== target[1]);
    if (target && (sizeDiffers || mixedAudio || shortAudio)) {
      await this.concatWithFilter(inputs, output, target[0], target[1], infos);
      return;
    }
    if (mixedAudio) this.log.warn("音轨不齐但分辨率探测失败，只能退回 concat demuxer");
    await this.concatWithDemuxer(inputs, output);
  }

  private async concatWithDemuxer(inputs: string[], output: string): Promise<void> {
    // 清单放系统临时目录：写在工作区里会被当成素材扫进资产库。
    const dir = await mkdtemp(path.join(tmpdir(), "ov-concat-"));
    const list = path.join(dir, "list.txt");
    const quote = (p: string) => `file '${p.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`;
    await writeFile(list, inputs.map(quote).join("\n"), "utf8");
    try {
      await this.exec(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", "-y", output]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async concatWithFilter(inputs: string[], output: string, w: number, h: number, infos: MediaInfo[]): Promise<void> {
    this.log.log(`concat 需要重编码：${inputs.length} 段统一到 ${w}x${h}`);
    const scale = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,setpts=PTS-STARTPTS`;
    const withAudio = infos.some((m) => m.hasAudio);
    const parts: string[] = [];
    const pads: string[] = [];
    inputs.forEach((_, i) => {
      parts.push(`[${i}:v]${scale}[v${i}]`);
      if (!withAudio) {
        pads.push(`[v${i}]`);
        return;
      }
      const dur = roundSec(infos[i]!.timelineDuration || infos[i]!.duration);
      if (!infos[i]!.hasAudio) {
        // 没音轨的段补一段等长静音，concat 滤镜要求每段的流数一致。
        parts.push(`anullsrc=channel_layout=${SILENT_CHANNEL_LAYOUT}:sample_rate=${SILENT_SAMPLE_RATE}${dur > 0 ? `,atrim=duration=${dur}` : ""},asetpts=N/SR/TB[a${i}]`);
      } else {
        // 音轨短于画面：apad 补静音再裁到画面长度，否则下一段的声音会提前。
        parts.push(
          `[${i}:a]aformat=sample_rates=${SILENT_SAMPLE_RATE}:channel_layouts=${SILENT_CHANNEL_LAYOUT},aresample=${SILENT_SAMPLE_RATE}${dur > 0 ? `,apad,atrim=duration=${dur}` : ""},asetpts=PTS-STARTPTS[a${i}]`,
        );
      }
      pads.push(`[v${i}][a${i}]`);
    });
    parts.push(`${pads.join("")}concat=n=${inputs.length}:v=1:a=${withAudio ? 1 : 0}[outv]${withAudio ? "[outa]" : ""}`);
    const args = [...inputs.flatMap((p) => ["-i", p]), "-filter_complex", parts.join(";"), "-map", "[outv]"];
    if (withAudio) args.push("-map", "[outa]");
    args.push("-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p");
    if (withAudio) args.push("-c:a", "aac", "-b:a", "192k");
    args.push("-movflags", "+faststart", "-y", output);
    await this.exec(args);
  }

  // -------------------------------------------------------------------------
  // 音轨
  // -------------------------------------------------------------------------

  /** 给视频配音轨。`replace` 为假且原视频有声音时混音，否则替换。 */
  async embedAudio(video: string, audio: string, output: string, replace = false): Promise<void> {
    const useReplace = replace || !(await this.probeMedia(video)).hasAudio;
    if (useReplace) {
      await this.exec([
        "-i", video, "-i", audio,
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-map", "0:v:0", "-map", "1:a:0", "-shortest",
        "-movflags", "+faststart", "-y", output,
      ]);
      return;
    }
    await this.exec([
      "-i", video, "-i", audio,
      "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=shortest[aout]",
      "-map", "0:v:0", "-map", "[aout]",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart", "-y", output,
    ]);
  }

  /** 抽出音轨存成 mp3。重编码而不是 copy：输出容器固定 .mp3，源音频什么编码都得装得下。 */
  async extractAudio(video: string, output: string, bitrateKbps = 192): Promise<void> {
    await this.exec(["-i", video, "-vn", "-c:a", "libmp3lame", "-b:a", `${bitrateKbps}k`, "-y", output]);
  }

  /** 去掉音轨。先试流拷贝（常见编码秒完）；mp4 装不下的编码（vp9 / theora）再退回 x264 重编码。 */
  async removeAudio(video: string, output: string): Promise<void> {
    try {
      await this.exec(["-i", video, "-an", "-c:v", "copy", "-movflags", "+faststart", "-y", output]);
    } catch (err) {
      this.log.warn(`removeAudio 流拷贝失败，改用 libx264 重编码：${(err as Error).message.split("\n").pop()}`);
      await this.exec(["-i", video, "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-y", output]);
    }
  }

  /** 在给定时间点各截一帧 JPEG（长边不超过 maxEdge），返回字节。 */
  async extractFrames(video: string, timestamps: number[], maxEdge = 1024): Promise<Buffer[]> {
    const dir = await mkdtemp(path.join(tmpdir(), "ov-frames-"));
    try {
      const out: Buffer[] = [];
      for (const [i, t] of timestamps.entries()) {
        const file = path.join(dir, `f${i}.jpg`);
        // -ss 放在 -i 前面是关键帧快速定位；长视频逐帧解码到目标点要几十秒。
        await this.exec([
          "-ss", t.toFixed(3), "-i", video, "-frames:v", "1",
          "-vf", `scale='if(gt(iw,ih),min(${maxEdge},iw),-2)':'if(gt(iw,ih),-2,min(${maxEdge},ih))'`,
          "-q:v", "4", "-y", file,
        ]);
        out.push(await readFile(file).catch(() => Buffer.alloc(0)));
      }
      return out.filter((b) => b.length > 0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

export interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number | string;
  height?: number | string;
  duration?: number | string;
  disposition?: { attached_pic?: number };
}

export interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: { duration?: number | string; format_name?: string };
}

/** 目标分辨率：first 取第一段，max / min 按宽高分别取极值，custom 用给定值（缺了退回 first）。 */
export function resolveTargetResolution(
  valid: ReadonlyArray<readonly [number, number]>,
  mode: ScaleMode,
  w?: number,
  h?: number,
  warn: (msg: string) => void = () => undefined,
): [number, number] | null {
  if (mode === "custom") {
    if (w && h) return [w, h];
    warn("scale_mode=custom 但缺 target_width / target_height，按 first 处理");
  }
  if (valid.length === 0) return null;
  if (mode === "max") return [Math.max(...valid.map((r) => r[0])), Math.max(...valid.map((r) => r[1]))];
  if (mode === "min") return [Math.min(...valid.map((r) => r[0])), Math.min(...valid.map((r) => r[1]))];
  return [valid[0]![0], valid[0]![1]];
}

class CappedBuffer {
  private chunks: Buffer[] = [];
  private size = 0;
  private truncated = false;

  push(b: Buffer): void {
    if (this.size >= OUTPUT_CAP_BYTES) {
      this.truncated = true;
      return;
    }
    const room = OUTPUT_CAP_BYTES - this.size;
    const part = b.length > room ? b.subarray(0, room) : b;
    if (part.length < b.length) this.truncated = true;
    this.chunks.push(part);
    this.size += part.length;
  }

  text(): string {
    const s = Buffer.concat(this.chunks).toString("utf8");
    return this.truncated ? `${s}\n... (output truncated at ${OUTPUT_CAP_BYTES} bytes)` : s;
  }
}

function notFound(bin: string, err: unknown): Error {
  if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
    return new Error(`${path.basename(bin)} not found at "${bin}". Install ffmpeg or set FFMPEG_PATH / FFPROBE_PATH.`);
  }
  return err instanceof Error ? err : new Error(String(err));
}

function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : Number.NaN;
  return Number.isFinite(n) ? n : undefined;
}

function roundSec(d: number): number {
  return d > 0 && Number.isFinite(d) ? Number(d.toFixed(3)) : 0;
}

function positiveInt(v: string | undefined): number | undefined {
  const n = Number.parseInt(v ?? "", 10);
  return n > 0 ? n : undefined;
}
