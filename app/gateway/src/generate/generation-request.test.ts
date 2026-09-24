import { video } from "@ov/maas-media";
import { describe, expect, it } from "vitest";

import { framesFor, musicInstrumental, planOf, videoFrames, videoPlan, videoReferences } from "./generation-request.js";

const P = video.VideoPlan;

describe("视频玩法", () => {
  it("first-last-frame 不会被读成只给尾帧", () => {
    // 同时含 first 和 last，先判 last 的话会变成 l2va：平台只收尾帧，开头完全不对，而且不报错。
    expect(planOf("first-last-frame", true, true, false)).toBe(P.FirstLastFrame);
    expect(planOf("last_frame", false, true, false)).toBe(P.LastFrame);
  });

  it("字段名分得出张数分不出的：只给首帧 / 只给尾帧", () => {
    expect(planOf(undefined, true, false, false)).toBe(P.ImageToVideo);
    expect(planOf(undefined, false, true, false)).toBe(P.LastFrame);
  });

  it("认不出的玩法按输入推，不当失败", () => {
    expect(planOf("cinemagraph-v9", true, true, false)).toBe(P.FirstLastFrame);
  });

  it("有参考素材时参考优先", () => {
    expect(planOf(undefined, true, false, true)).toBe(P.Reference);
  });

  it("缺帧报错而不是降级", () => {
    expect(() => framesFor(P.FirstLastFrame, "a.png", undefined)).toThrow(/尾帧/);
    expect(framesFor(P.FirstLastFrame, "a.png", "b.png")).toEqual(["a.png", "b.png"]);
    expect(framesFor(P.TextToVideo)).toEqual([]);
  });

  it("image_paths 是固定槽位：['', tail] 只有尾帧，不能把尾帧当首帧", () => {
    const req = { image_paths: ["", "tail.png"], source_tool: "hub_generate_video:MiniMax:first-last-frame" };
    expect(videoFrames(req)).toEqual({ first: undefined, last: "tail.png" });
    expect(videoPlan(req)).toBe(P.FirstLastFrame);
    expect(videoPlan({ image_paths: ["", "tail.png"] })).toBe(P.LastFrame);
  });

  it("玩法从 source_tool 第三段或 params.image_mode 读；参考玩法下 image_paths 是参考图", () => {
    const ref = { image_paths: ["a.png", "b.png"], params: { image_mode: "reference" } };
    expect(videoPlan(ref)).toBe(P.Reference);
    expect(videoFrames(ref)).toEqual({});
    expect(videoReferences(ref).images).toEqual(["a.png", "b.png"]);
    expect(videoPlan({ image_paths: ["a.png"], source_tool: "hub_generate_video:seedance:i2v" })).toBe(P.ImageToVideo);
  });

  it("扁平写法（first_frame_image / reference_*）同样认", () => {
    expect(videoPlan({ first_frame_image: "a.png", last_frame_image: "b.png" })).toBe(P.FirstLastFrame);
    expect(videoPlan({ reference_video_urls: ["v.mp4"] })).toBe(P.Reference);
  });
});

describe("音乐意图", () => {
  it("没说 ≠ 器乐：交给歌词推断", () => {
    expect(musicInstrumental({})).toBeUndefined();
    expect(musicInstrumental({ source_tool: "hub_generate_audio_music:instrumental" })).toBe(true);
    expect(musicInstrumental({ source_tool: "hub_generate_audio_music:song" })).toBe(false);
    expect(musicInstrumental({ params: { mode: "BGM" } })).toBe(true);
  });
});
