import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

import { ffprobePath } from "./env.js";

/**
 * 进程内 ffprobe（`FFPROBE_PATH`）。只探测，不转码 —— ffmpeg 在 gateway 里跑。
 */

const execFileAsync = promisify(execFile);

export async function runFfprobe(args: string[], timeoutMs = 30_000): Promise<string> {
  const { stdout } = await execFileAsync(ffprobePath(), args, { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}

export const CANONICAL_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9"] as const;

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x || 1;
}

export function exactAspectRatio(width: number, height: number): string {
  const g = gcd(width, height);
  return [width, height].map((n) => Math.round(n / g)).join(":");
}

export function ratioValue(ratio: string): number {
  const parts = ratio.split(":").map(Number.parseFloat);
  const w = parts[0] ?? 0;
  const h = parts[1] ?? 0;
  return w > 0 && h > 0 ? w / h : 1;
}

export function nearestAspectRatio(width: number, height: number, candidates: readonly string[] = CANONICAL_ASPECT_RATIOS): string {
  const actual = width / height;
  let best = candidates[0] ?? "1:1";
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const c of candidates) {
    const delta = Math.abs(ratioValue(c) - actual);
    if (delta < bestDelta) {
      best = c;
      bestDelta = delta;
    }
  }
  return best;
}

/** 宽高差 2% 以内算正方形。 */
export function orientationFor(width?: number, height?: number): "square" | "landscape" | "portrait" | undefined {
  if (!width || !height) return undefined;
  const longer = Math.max(width, height);
  const skew = Math.abs(width - height) / longer;
  if (skew < 0.02) return "square";
  return width > height ? "landscape" : "portrait";
}

export interface MediaProbe {
  file_path: string;
  ok: boolean;
  error?: string;
  media_type?: "image" | "video" | "audio" | "unknown";
  width?: number;
  height?: number;
  duration_sec?: number;
  aspect_ratio?: string;
  exact_aspect_ratio?: string;
  orientation?: "square" | "landscape" | "portrait";
}

interface FfprobeJson {
  streams?: { codec_type?: string; width?: number; height?: number; duration?: string }[];
  format?: { duration?: string };
}

/**
 * 探一个文件的尺寸 / 时长。有画面且时长 > 1.1s 才算视频 ——
 * 静态图也会被 ffprobe 报成一帧的视频流。
 */
export async function probeOneMedia(filePath: string): Promise<MediaProbe> {
  if (!existsSync(filePath)) return { file_path: filePath, ok: false, error: "file not found" };
  try {
    const stdout = await runFfprobe([
      "-v",
      "error",
      "-show_entries",
      "stream=codec_type,width,height,duration:format=duration",
      "-of",
      "json",
      filePath,
    ]);
    const parsed = JSON.parse(stdout) as FfprobeJson;
    const sized = parsed.streams?.find((s) => s.width && s.height);
    const audio = parsed.streams?.find((s) => s.codec_type === "audio");
    const width = sized?.width;
    const height = sized?.height;
    const rawDuration = parsed.format?.duration ?? sized?.duration ?? audio?.duration;
    const d = rawDuration ? Number.parseFloat(rawDuration) : undefined;
    const duration = d !== undefined && Number.isFinite(d) ? d : undefined;
    const mediaType = width && height ? (duration && duration > 1.1 ? "video" : "image") : audio ? "audio" : "unknown";
    return {
      file_path: filePath,
      ok: true,
      media_type: mediaType,
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      ...(duration ? { duration_sec: Number(duration.toFixed(3)) } : {}),
      ...(width && height
        ? {
            aspect_ratio: nearestAspectRatio(width, height),
            exact_aspect_ratio: exactAspectRatio(width, height),
            orientation: orientationFor(width, height),
          }
        : {}),
    };
  } catch (err) {
    return { file_path: filePath, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
