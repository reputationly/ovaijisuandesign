import { describe, expect, it } from "vitest";

import { referencePathsForTest } from "./execute-task.js";

/**
 * 参考素材必须按**文件类型**落槽位，不能按任务类型一刀切。
 *
 * 真机事故：给「参考生视频」传两张参考图（png/jpg），被塞进 `video_paths`，
 * 平台报「输入 video 不是有效的媒体文件(文件头校验未通过,请勿改后缀上传)」，
 * 整个视频任务失败。
 */
describe("参考素材落槽位", () => {
  it("视频任务里的参考图进 reference_image_paths", () => {
    expect(referencePathsForTest("generate_video", ["store/a.png", "store/b.jpg"]))
      .toEqual({ reference_image_paths: ["store/a.png", "store/b.jpg"] });
  });

  it("视频任务里的参考视频进 video_paths", () => {
    expect(referencePathsForTest("generate_video", ["store/c.mp4"]))
      .toEqual({ video_paths: ["store/c.mp4"] });
  });

  it("混着传时各归各的槽位", () => {
    expect(referencePathsForTest("generate_video", ["a.png", "b.mp4", "c.wav"]))
      .toEqual({ reference_image_paths: ["a.png"], video_paths: ["b.mp4"], audio_paths: ["c.wav"] });
  });

  it("图片任务里的图片进 reference_image_paths", () => {
    expect(referencePathsForTest("generate_image", ["x.webp"])).toEqual({ reference_image_paths: ["x.webp"] });
  });
});
