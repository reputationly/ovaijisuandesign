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

/**
 * 音乐的「风格描述」提升：模型常把风格写进 `params.prompt`、顶层 prompt 留空，
 * 平台就报「音乐生成缺少风格描述：需要给出流派 / 配器 / 速度 / 情绪」。
 */
import { promoteMusicStylePromptForTest } from "./execute-task.js";

describe("音乐风格描述提升", () => {
  it("顶层 prompt 为空时，用 params.prompt 顶上并从 params 删除", () => {
    const bag: Record<string, unknown> = { prompt: "K-pop trap-rap，128BPM，冷冽", mode: "song" };
    const { prompt } = promoteMusicStylePromptForTest("generate_music", undefined, bag);
    expect(prompt).toBe("K-pop trap-rap，128BPM，冷冽");
    expect(bag.prompt).toBeUndefined();
    expect(bag.mode).toBe("song");
  });

  it("顶层已有 prompt 时不覆盖，也不动 params", () => {
    const bag: Record<string, unknown> = { prompt: "ignored" };
    const { prompt } = promoteMusicStylePromptForTest("generate_music", "top-level style", bag);
    expect(prompt).toBe("top-level style");
    expect(bag.prompt).toBe("ignored");
  });

  it("生图/生视频也提升 —— 模型常把提示词写在 params.prompt，顶层空着会被平台拒", () => {
    const imageBag: Record<string, unknown> = { prompt: "cinematic portrait of Claire", size: "3:2" };
    expect(promoteMusicStylePromptForTest("generate_image", undefined, imageBag).prompt).toBe("cinematic portrait of Claire");
    expect(imageBag.prompt).toBeUndefined();
    expect(imageBag.size).toBe("3:2");

    const videoBag: Record<string, unknown> = { prompt: "red wagon on a desert road" };
    expect(promoteMusicStylePromptForTest("generate_video", "", videoBag).prompt).toBe("red wagon on a desert road");
  });
});
