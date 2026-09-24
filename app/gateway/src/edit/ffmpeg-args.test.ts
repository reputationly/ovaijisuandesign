import { describe, expect, it } from "vitest";

import { checkFfmpegCommand, hasVideoConcat, isDryRun, resolveOutputExt, stripTrailingOutput } from "./ffmpeg-args.js";
import { resolveTargetResolution } from "./ffmpeg.service.js";

describe("checkFfmpegCommand", () => {
  it("滤镜里拼视频要拒绝，纯音频 concat（v=0）放行", () => {
    expect(checkFfmpegCommand(["-i", "a.mp4", "-i", "b.mp4", "-filter_complex", "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]"]).ok).toBe(false);
    expect(checkFfmpegCommand(["-i", "a.mp3", "-i", "b.mp3", "-filter_complex", "[0:a][1:a]concat=n=2:v=0:a=1[a]"], "audio").ok).toBe(true);
    // 位置参数：n:v:a
    expect(hasVideoConcat("concat=2:1:1")).toBe(true);
    expect(hasVideoConcat("concat=2:0:1")).toBe(false);
    // 引号里的逗号不是分隔符
    expect(hasVideoConcat("drawtext=text='a,concat=n=2'")).toBe(false);
  });

  it("concat 协议 / demuxer 只在视频输出时拒绝；-f null 探测不受限", () => {
    expect(checkFfmpegCommand(["-i", "concat:a.mp4|b.mp4"]).ok).toBe(false);
    expect(checkFfmpegCommand(["-f", "concat", "-i", "list.txt"]).ok).toBe(false);
    expect(checkFfmpegCommand(["-i", "concat:a.mp3|b.mp3"], "audio").ok).toBe(true);
    expect(checkFfmpegCommand(["-i", "a.mp4", "-filter_complex", "concat=n=2", "-f", "null"]).ok).toBe(true);
  });

  it("滤镜脚本文件和 -opt=value 写法拒绝", () => {
    expect(checkFfmpegCommand(["-i", "a.mp4", "-filter_complex_script", "x.txt"])).toMatchObject({ ok: false, error: expect.stringMatching(/File-based/) });
    expect(checkFfmpegCommand(["-i", "a.mp4", "-/vf", "x.txt"]).ok).toBe(false);
    expect(checkFfmpegCommand(["-i", "a.mp4", "-vf=scale=2:2"])).toMatchObject({ ok: false, error: expect.stringMatching(/two separate argv/) });
    expect(checkFfmpegCommand(["-i", "a.mp4", "-vf"])).toMatchObject({ ok: false, error: expect.stringMatching(/Missing filter/) });
  });
});

describe("输出扩展名", () => {
  it("音频输出跟着 -c:a 走；容器装不下就报错", () => {
    expect(resolveOutputExt("audio", ["-c:a", "aac"])).toEqual({ ext: ".m4a" });
    expect(resolveOutputExt("audio", ["-acodec", "pcm_s16le"])).toEqual({ ext: ".wav" });
    expect(resolveOutputExt("audio", [])).toEqual({ ext: ".mp3" });
    expect(resolveOutputExt("video", ["-c:a", "aac"])).toEqual({ ext: ".mp4" });
    expect(resolveOutputExt("video", ["-c:a", "pcm_s16le"])).toMatchObject({ error: expect.stringMatching(/cannot hold audio codec "pcm_s16le"/) });
    expect(resolveOutputExt("image", [])).toEqual({ ext: ".png" });
  });

  it("末尾自带的输出路径去掉，但不动 -i 的值", () => {
    expect(stripTrailingOutput(["-i", "a.mp4", "-t", "1", "out.mp4"])).toEqual(["-i", "a.mp4", "-t", "1"]);
    expect(stripTrailingOutput(["-t", "1", "-i", "a.mp4"])).toEqual(["-t", "1", "-i", "a.mp4"]);
    expect(stripTrailingOutput(["-i", "a.mp4", "-c", "copy"])).toEqual(["-i", "a.mp4", "-c", "copy"]);
  });

  it("-f null 判为探测", () => {
    expect(isDryRun(["-i", "a.mp4", "-f", "null"])).toBe(true);
    expect(isDryRun(["-i", "a.mp4", "-f", "mp4"])).toBe(false);
  });
});

describe("拼接目标分辨率", () => {
  const r = [
    [640, 360],
    [320, 480],
  ] as const;
  it("first / max / min / custom", () => {
    expect(resolveTargetResolution(r, "first")).toEqual([640, 360]);
    expect(resolveTargetResolution(r, "max")).toEqual([640, 480]);
    expect(resolveTargetResolution(r, "min")).toEqual([320, 360]);
    expect(resolveTargetResolution(r, "custom", 100, 200)).toEqual([100, 200]);
    // custom 缺宽高退回 first
    expect(resolveTargetResolution(r, "custom")).toEqual([640, 360]);
    expect(resolveTargetResolution([], "first")).toBeNull();
  });
});
